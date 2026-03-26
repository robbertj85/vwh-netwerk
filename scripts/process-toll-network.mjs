#!/usr/bin/env node

/**
 * Vrachtwagenheffing Toll Network Data Processor
 *
 * Downloads the NDW toll collection network XML, converts to GeoJSON
 * and GeoPackage, and saves to public/data/.
 *
 * Usage: node scripts/process-toll-network.mjs [YYYYMMDD]
 * Default date: 20260301
 */

import { writeFileSync, mkdirSync } from 'fs';
import { gunzipSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../public/data');
const DATA_DATE = process.argv[2] || '20260301';

const XML_URL = `https://maps.ndw.nu/api/v1/hgvChargeTollCollectionNetwork/${DATA_DATE}/xml/${DATA_DATE}-tollCollectionNetwork.xml.gz`;

// ─── Road Type Classification ───────────────────────────────

function classifyRoadType(name) {
  if (/^A\d+/.test(name)) return 'highway';
  if (/^N\d+/.test(name)) return 'national';
  return 'local';
}

// ─── Download & Decompress ──────────────────────────────────

async function downloadAndDecompress(url) {
  console.log(`Downloading: ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB compressed`);

  console.log('Decompressing...');
  const xml = gunzipSync(buffer).toString('utf-8');
  console.log(`Decompressed to ${(xml.length / 1024 / 1024).toFixed(1)} MB`);

  return xml;
}

// ─── Parse XML ──────────────────────────────────────────────

function parseXML(xml) {
  console.log('Parsing XML...');

  const parser = new XMLParser({
    removeNSPrefix: true,
    isArray: (name) => ['Section', 'Point'].includes(name),
    ignoreAttributes: true,
    parseTagValue: true,
  });

  const result = parser.parse(xml);
  const sections =
    result?.sectionLayoutDescription?.sections?.Section || [];

  console.log(`Found ${sections.length} sections`);
  return sections;
}

// ─── Convert to GeoJSON ─────────────────────────────────────

function round5(n) {
  return Math.round(n * 1e5) / 1e5;
}

function convertToGeoJSON(sections) {
  console.log('Converting to GeoJSON...');

  const features = [];
  let skipped = 0;

  for (const section of sections) {
    try {
      const id = String(
        section.chargeObjectId?.chargeObjectDesignation ?? ''
      );
      const roadName = section.chargeObjectName ?? 'Onbekend';
      const distance = section.chargeDistance?.distanceValue ?? 0;
      const tollPath = section.tollPath;

      if (!tollPath?.startPoint || !tollPath?.endPoint) {
        skipped++;
        continue;
      }

      const coordinates = [];

      // Start point
      const sp = tollPath.startPoint.absolutePointCoordinates;
      if (sp) coordinates.push([round5(sp.longitude / 1e6), round5(sp.latitude / 1e6)]);

      // Intermediate points
      if (tollPath.intermediatePoints?.Point) {
        for (const point of tollPath.intermediatePoints.Point) {
          const c = point?.absolutePointCoordinates;
          if (c) coordinates.push([round5(c.longitude / 1e6), round5(c.latitude / 1e6)]);
        }
      }

      // End point
      const ep = tollPath.endPoint.absolutePointCoordinates;
      if (ep) coordinates.push([round5(ep.longitude / 1e6), round5(ep.latitude / 1e6)]);

      if (coordinates.length < 2) {
        skipped++;
        continue;
      }

      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: {
          id,
          roadName,
          distance,
          roadType: classifyRoadType(roadName),
        },
      });
    } catch (e) {
      skipped++;
    }
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} sections due to missing data`);
  }

  const totalDistanceKm =
    Math.round(features.reduce((s, f) => s + f.properties.distance, 0) / 100) / 10;

  const geojson = {
    type: 'FeatureCollection',
    features,
    metadata: {
      totalSections: features.length,
      totalDistanceKm,
      dataDate: DATA_DATE,
      uniqueRoads: new Set(features.map((f) => f.properties.roadName)).size,
      source: 'NDW Vrachtwagenheffing Register',
    },
  };

  console.log(
    `Created GeoJSON: ${features.length} features, ${totalDistanceKm} km total`
  );
  return geojson;
}

// ─── GeoPackage Generation ──────────────────────────────────

function createGPB(coordinates) {
  const numPoints = coordinates.length;
  const totalSize = 8 + 32 + 9 + numPoints * 16;
  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  // GP magic
  buf[offset++] = 0x47;
  buf[offset++] = 0x50;
  // Version
  buf[offset++] = 0x00;
  // Flags: little-endian + xy envelope
  buf[offset++] = 0x03;
  // SRS ID = 4326
  buf.writeInt32LE(4326, offset);
  offset += 4;

  // Envelope (minX, maxX, minY, maxY)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of coordinates) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  buf.writeDoubleLE(minX, offset); offset += 8;
  buf.writeDoubleLE(maxX, offset); offset += 8;
  buf.writeDoubleLE(minY, offset); offset += 8;
  buf.writeDoubleLE(maxY, offset); offset += 8;

  // WKB: byte order
  buf[offset++] = 0x01;
  // WKB: LineString type = 2
  buf.writeUInt32LE(2, offset); offset += 4;
  // WKB: num points
  buf.writeUInt32LE(numPoints, offset); offset += 4;
  // WKB: coordinates
  for (const [x, y] of coordinates) {
    buf.writeDoubleLE(x, offset); offset += 8;
    buf.writeDoubleLE(y, offset); offset += 8;
  }

  return buf;
}

async function createGeoPackage(features) {
  console.log('Creating GeoPackage...');

  let initSqlJs;
  try {
    initSqlJs = (await import('sql.js')).default;
  } catch {
    console.warn('sql.js not available — skipping GeoPackage generation');
    return null;
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // gpkg_spatial_ref_sys
  db.run(`CREATE TABLE gpkg_spatial_ref_sys (
    srs_name TEXT NOT NULL,
    srs_id INTEGER NOT NULL PRIMARY KEY,
    organization TEXT NOT NULL,
    organization_coordsys_id INTEGER NOT NULL,
    definition TEXT NOT NULL,
    description TEXT
  )`);
  db.run(
    `INSERT INTO gpkg_spatial_ref_sys VALUES (?, ?, ?, ?, ?, ?)`,
    ['Undefined cartesian SRS', -1, 'NONE', -1, 'undefined', 'undefined cartesian coordinate reference system']
  );
  db.run(
    `INSERT INTO gpkg_spatial_ref_sys VALUES (?, ?, ?, ?, ?, ?)`,
    ['Undefined geographic SRS', 0, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system']
  );
  db.run(
    `INSERT INTO gpkg_spatial_ref_sys VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'WGS 84 geodetic', 4326, 'EPSG', 4326,
      'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]',
      'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid',
    ]
  );

  // gpkg_contents
  db.run(`CREATE TABLE gpkg_contents (
    table_name TEXT NOT NULL PRIMARY KEY,
    data_type TEXT NOT NULL DEFAULT 'features',
    identifier TEXT UNIQUE,
    description TEXT DEFAULT '',
    last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE,
    srs_id INTEGER,
    CONSTRAINT fk_gc_r_srs_id FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
  )`);

  // gpkg_geometry_columns
  db.run(`CREATE TABLE gpkg_geometry_columns (
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    geometry_type_name TEXT NOT NULL,
    srs_id INTEGER NOT NULL,
    z TINYINT NOT NULL,
    m TINYINT NOT NULL,
    CONSTRAINT pk_gc PRIMARY KEY (table_name, column_name),
    CONSTRAINT fk_gc_tn FOREIGN KEY (table_name) REFERENCES gpkg_contents(table_name),
    CONSTRAINT fk_gc_srs FOREIGN KEY (srs_id) REFERENCES gpkg_spatial_ref_sys(srs_id)
  )`);

  // Feature table
  db.run(`CREATE TABLE toll_network (
    fid INTEGER PRIMARY KEY AUTOINCREMENT,
    geom BLOB,
    id TEXT,
    road_name TEXT,
    distance_m REAL,
    road_type TEXT
  )`);

  // Bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const f of features) {
    for (const [x, y] of f.geometry.coordinates) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  db.run(
    `INSERT INTO gpkg_contents VALUES ('toll_network','features','VWH Toll Network','Vrachtwagenheffing tolnetwerk Nederland',strftime('%Y-%m-%dT%H:%M:%fZ','now'),?,?,?,?,4326)`,
    [minX, minY, maxX, maxY]
  );
  db.run(
    `INSERT INTO gpkg_geometry_columns VALUES ('toll_network','geom','LINESTRING',4326,0,0)`
  );

  // Insert features in a transaction
  db.run('BEGIN TRANSACTION');
  for (const f of features) {
    const gpb = createGPB(f.geometry.coordinates);
    db.run(
      `INSERT INTO toll_network (geom, id, road_name, distance_m, road_type) VALUES (?, ?, ?, ?, ?)`,
      [gpb, f.properties.id, f.properties.roadName, f.properties.distance, f.properties.roadType]
    );
  }
  db.run('COMMIT');

  const data = Buffer.from(db.export());
  db.close();

  console.log(`Created GeoPackage: ${(data.length / 1024 / 1024).toFixed(1)} MB`);
  return data;
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log(`\n=== VWH Toll Network Processor ===`);
  console.log(`Data date: ${DATA_DATE}\n`);

  mkdirSync(DATA_DIR, { recursive: true });

  // Download and parse
  const xml = await downloadAndDecompress(XML_URL);
  const sections = parseXML(xml);
  const geojson = convertToGeoJSON(sections);

  // Save full GeoJSON (for downloads/API)
  const geojsonPath = join(DATA_DIR, 'toll-network.geojson');
  writeFileSync(geojsonPath, JSON.stringify(geojson));
  const geojsonSize = (Buffer.byteLength(JSON.stringify(geojson)) / 1024 / 1024).toFixed(1);
  console.log(`Saved: ${geojsonPath} (${geojsonSize} MB)`);

  // Save simplified GeoJSON (for map rendering - ~60% smaller)
  const r4 = (n) => Math.round(n * 1e4) / 1e4;
  const simplified = {
    ...geojson,
    features: geojson.features.map((f) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates:
          f.geometry.coordinates.length <= 3
            ? f.geometry.coordinates.map((c) => [r4(c[0]), r4(c[1])])
            : [
                [r4(f.geometry.coordinates[0][0]), r4(f.geometry.coordinates[0][1])],
                [r4(f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)][0]), r4(f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)][1])],
                [r4(f.geometry.coordinates.at(-1)[0]), r4(f.geometry.coordinates.at(-1)[1])],
              ],
      },
      properties: f.properties,
    })),
  };
  const mapPath = join(DATA_DIR, 'toll-network-map.geojson');
  writeFileSync(mapPath, JSON.stringify(simplified));
  const mapSize = (Buffer.byteLength(JSON.stringify(simplified)) / 1024 / 1024).toFixed(1);
  console.log(`Saved: ${mapPath} (${mapSize} MB - simplified for map)`);

  // Save GeoPackage
  const gpkgData = await createGeoPackage(geojson.features);
  if (gpkgData) {
    const gpkgPath = join(DATA_DIR, 'toll-network.gpkg');
    writeFileSync(gpkgPath, gpkgData);
    console.log(`Saved: ${gpkgPath} (${(gpkgData.length / 1024 / 1024).toFixed(1)} MB)`);
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
