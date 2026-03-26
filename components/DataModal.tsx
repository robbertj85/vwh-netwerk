'use client';

import { useEffect, useRef } from 'react';
import {
  X,
  Download,
  FileJson,
  FileSpreadsheet,
  Database,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TollNetworkGeoJSON } from '@/types/toll-network';

interface DataModalProps {
  open: boolean;
  onClose: () => void;
  data: TollNetworkGeoJSON | null;
}

export default function DataModal({ open, onClose, data }: DataModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleDownload = (format: 'geojson' | 'gpkg') => {
    const a = document.createElement('a');
    a.href = `/api/v1/toll-network/export?format=${format}`;
    a.download = `vwh-tolnetwerk.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 bg-white rounded-xl shadow-2xl max-w-md w-[90vw] p-0"
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-brand-700" />
              Data
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Download het tolnetwerk</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Sluiten">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Downloads */}
        <div className="space-y-2 mb-5">
          <button
            onClick={() => handleDownload('geojson')}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left"
          >
            <div className="flex-shrink-0 w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileJson className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">GeoJSON</div>
              <div className="text-[11px] text-gray-400">Open standaard &middot; QGIS, Mapbox, Leaflet</div>
            </div>
          </button>

          <button
            onClick={() => handleDownload('gpkg')}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left"
          >
            <div className="flex-shrink-0 w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <Database className="w-4.5 h-4.5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">GeoPackage</div>
              <div className="text-[11px] text-gray-400">OGC standaard &middot; QGIS, ArcGIS</div>
            </div>
          </button>

          <a
            href="https://maps.ndw.nu/api/v1/hgvChargeTollCollectionNetwork/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left"
          >
            <div className="flex-shrink-0 w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-4.5 h-4.5 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">NDW Brondata (XML)</div>
              <div className="text-[11px] text-gray-400">DATEX II formaat &middot; Originele bron</div>
            </div>
          </a>

          <a
            href={`https://maps.ndw.nu/api/v1/hgvChargeTollCollectionNetwork/${data?.metadata.dataDate ?? '20260301'}/csv/${data?.metadata.dataDate ?? '20260301'}-mutationAndStatusReport.csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left"
          >
            <div className="flex-shrink-0 w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-4.5 h-4.5 text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">NDW Mutaties (CSV)</div>
              <div className="text-[11px] text-gray-400">Wijzigingsrapport &middot; Originele bron</div>
            </div>
          </a>
        </div>

        {/* Data info */}
        {data && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-600">Dataset</span>
              <span>{data.metadata.dataDate.replace(/(\d{4})(\d{2})(\d{2})/, '$3-$2-$1')}</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span>Secties (richtingsgebonden)</span>
              <span>{data.features.length.toLocaleString('nl-NL')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Geschatte netwerklengte</span>
              <span>~{Math.round(data.metadata.totalDistanceKm / 2).toLocaleString('nl-NL')} km</span>
            </div>
          </div>
        )}

        {/* API quick links */}
        <div>
          <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
            <Code2 className="w-3.5 h-3.5" />
            REST API
          </h3>
          <div className="space-y-1 mb-3">
            <ApiRow method="GET" path="/api/v1/toll-network" />
            <ApiRow method="GET" path="/api/v1/toll-network/stats" />
            <ApiRow method="GET" path="/api/v1/toll-network/export" />
            <ApiRow method="POST" path="/api/v1/toll-network/calculate" />
          </div>
          <a
            href="/api/v1/docs"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Volledige API documentatie (Swagger)
          </a>
        </div>
      </div>
    </dialog>
  );
}

function ApiRow({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0 shrink-0">{method}</Badge>
      <code className="text-gray-500 truncate">{path}</code>
    </div>
  );
}
