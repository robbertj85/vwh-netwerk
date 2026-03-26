'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { TollNetworkGeoJSON, TollNetworkFeature, RouteCalculation } from '@/types/toll-network';
import { ROAD_TYPE_COLORS, ROAD_TYPE_LABELS } from '@/types/toll-network';

interface TollNetworkMapProps {
  data: TollNetworkGeoJSON | null;
  routeResult: RouteCalculation | null;
}

const NL_BOUNDS: L.LatLngBoundsExpression = [
  [50.75, 3.37],
  [53.47, 7.21],
];

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function MapController({
  data,
  routeResult,
}: {
  data: TollNetworkGeoJSON | null;
  routeResult: RouteCalculation | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeResult?.routeGeometry?.length) {
      const bounds = L.latLngBounds(
        routeResult.routeGeometry.map(
          ([lng, lat]) => [lat, lng] as L.LatLngTuple
        )
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (data) {
      map.fitBounds(NL_BOUNDS);
    }
  }, [map, data, routeResult]);

  return null;
}

function Legend() {
  return (
    <div className="absolute bottom-6 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-3 text-sm border border-gray-200">
      <div className="font-semibold mb-2 text-gray-800">Wegtype</div>
      {(Object.entries(ROAD_TYPE_COLORS) as [string, string][]).map(
        ([type, color]) => (
          <div key={type} className="flex items-center gap-2 mb-1 last:mb-0">
            <div
              className="w-6 h-[3px] rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-600 text-xs">
              {ROAD_TYPE_LABELS[type as keyof typeof ROAD_TYPE_LABELS]}
            </span>
          </div>
        )
      )}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        <div className="w-6 h-1 rounded-full bg-brand-700" />
        <span className="text-gray-600 text-xs">Berekende route</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-1 rounded-full bg-emerald-500" />
        <span className="text-gray-600 text-xs">Heffingstraject</span>
      </div>
    </div>
  );
}

export default function TollNetworkMap({ data, routeResult }: TollNetworkMapProps) {
  const geoJsonData = useMemo(() => {
    if (!data) return null;
    return { type: 'FeatureCollection' as const, features: data.features };
  }, [data]);

  const style = useMemo(() => {
    return (feature?: GeoJSON.Feature): L.PathOptions => {
      if (!feature) return {};
      const props = feature.properties as TollNetworkFeature['properties'];
      return {
        color: ROAD_TYPE_COLORS[props.roadType] || '#6b7280',
        weight: props.roadType === 'highway' ? 3.5 : 2,
        opacity: routeResult ? 0.25 : 0.7,
      };
    };
  }, [routeResult]);

  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    const props = feature.properties as TollNetworkFeature['properties'];
    const distLabel =
      props.distance >= 1000
        ? `${(props.distance / 1000).toFixed(1)} km`
        : `${props.distance} m`;

    (layer as L.Path).bindPopup(
      `<div style="min-width:160px">
        <div style="font-weight:600;font-size:14px;margin-bottom:2px">${props.roadName}</div>
        <div style="color:#6b7280;font-size:12px;margin-bottom:8px">${ROAD_TYPE_LABELS[props.roadType]}</div>
        <table style="width:100%;font-size:12px">
          <tr><td style="color:#6b7280">Lengte</td><td style="text-align:right;font-weight:500">${distLabel}</td></tr>
          <tr><td style="color:#6b7280">Sectie-ID</td><td style="text-align:right;font-weight:500;font-family:monospace">${props.id}</td></tr>
        </table>
      </div>`
    );
  };

  const routeLatLngs = useMemo(() => {
    if (!routeResult?.routeGeometry) return null;
    return routeResult.routeGeometry.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );
  }, [routeResult]);

  const matchedData = useMemo(() => {
    if (!routeResult?.matchedSections?.length) return null;
    return {
      type: 'FeatureCollection' as const,
      features: routeResult.matchedSections,
    };
  }, [routeResult]);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[52.1, 5.3]}
        zoom={8}
        className="w-full h-full"
        preferCanvas={true}
        zoomControl={true}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {geoJsonData && (
          <GeoJSON
            key={routeResult ? 'dimmed' : 'full'}
            data={geoJsonData as GeoJSON.FeatureCollection}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}

        {matchedData && (
          <GeoJSON
            key="matched"
            data={matchedData as GeoJSON.FeatureCollection}
            style={() => ({ color: '#10b981', weight: 7, opacity: 0.95 })}
            onEachFeature={onEachFeature}
          />
        )}

        {routeLatLngs && (
          <Polyline
            positions={routeLatLngs}
            pathOptions={{
              color: '#b91c1c',
              weight: 6,
              opacity: 0.9,
            }}
          />
        )}

        <MapController data={data} routeResult={routeResult} />
      </MapContainer>
      <Legend />
    </div>
  );
}
