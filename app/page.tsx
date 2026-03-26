'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Menu, X, SlidersHorizontal, Truck, Download, Code2, Info } from 'lucide-react';
import SidePanel from '@/components/SidePanel';
import AboutModal from '@/components/AboutModal';
import DataModal from '@/components/DataModal';
import type { TollNetworkGeoJSON, NetworkStats, RouteCalculation } from '@/types/toll-network';
import { calculateNetworkStats } from '@/lib/toll-network-utils';

const TollNetworkMap = dynamic(
  () => import('@/components/TollNetworkMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-700 mx-auto mb-4" />
          <p className="text-gray-500">Kaart laden...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const [data, setData] = useState<TollNetworkGeoJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<RouteCalculation | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showData, setShowData] = useState(false);

  const stats = useMemo<NetworkStats | null>(() => {
    if (!data) return null;
    return calculateNetworkStats(data);
  }, [data]);

  useEffect(() => {
    setLoading(true);
    fetch('/data/toll-network.geojson')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d: TollNetworkGeoJSON) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSidebarOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* ─── Header ────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
        <div className="px-4 py-2.5 flex items-center justify-between">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-700 rounded-lg flex items-center justify-center">
                <Truck className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  Vrachtwagenheffing
                </h1>
                <p className="text-[10px] text-gray-400 leading-tight hidden sm:block">
                  Tolnetwerk Nederland
                </p>
              </div>
            </div>

            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-700 ml-1" />
            )}

          </div>

          {/* Right: action buttons (desktop) */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => setShowData(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Data
            </button>
            <Link
              href="/api/v1/docs"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              <Code2 className="w-3.5 h-3.5" />
              API
            </Link>
            <button
              onClick={() => setShowAbout(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              <Info className="w-3.5 h-3.5" />
              Over
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 py-2 bg-gray-50 space-y-1">
            <button
              onClick={() => { setShowData(true); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Download className="w-4 h-4" />
              Data downloaden
            </button>
            <Link
              href="/api/v1/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Code2 className="w-4 h-4" />
              API Documentatie
            </Link>
            <button
              onClick={() => { setShowAbout(true); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Info className="w-4 h-4" />
              Over
            </button>
          </div>
        )}
      </header>

      {/* ─── Error Banner ──────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex-shrink-0">
          <p className="text-red-700 text-sm">
            Data kon niet geladen worden: {error}.{' '}
            Voer eerst{' '}
            <code className="bg-red-100 px-1 rounded text-xs">npm run process-toll-data</code>{' '}
            uit.
          </p>
        </div>
      )}

      {/* ─── Main Content ──────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Desktop sidebar */}
        <aside className="w-96 border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col overflow-hidden">
          <SidePanel
            data={data}
            stats={stats}
            routeResult={routeResult}
            onRouteCalculated={setRouteResult}
            onClearRoute={() => setRouteResult(null)}
          />
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <TollNetworkMap data={data} routeResult={routeResult} />
        </div>

        {/* Mobile sidebar toggle */}
        <button
          className="md:hidden absolute bottom-6 right-4 z-[1000] bg-brand-700 text-white rounded-full p-3 shadow-lg hover:bg-brand-800 transition"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open zijpaneel"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/40 z-[1001]"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="md:hidden fixed right-0 top-0 bottom-0 w-[85vw] max-w-md bg-white z-[1002] shadow-xl flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Menu</h2>
                <button
                  className="p-1 text-gray-500 hover:text-gray-700"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Sluiten"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SidePanel
                  data={data}
                  stats={stats}
                  routeResult={routeResult}
                  onRouteCalculated={(result) => {
                    setRouteResult(result);
                    setMobileSidebarOpen(false);
                  }}
                  onClearRoute={() => setRouteResult(null)}
                />
              </div>
            </aside>
          </>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200 px-4 py-1.5 flex-shrink-0 hidden md:block">
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>
            Onafhankelijk project &middot; Niet gelieerd aan RDW of de overheid &middot;{' '}
            <a href="https://www.vrachtwagenheffing.nl" target="_blank" rel="noopener noreferrer" className="hover:underline">
              vrachtwagenheffing.nl
            </a>
            {' '}&middot; Tarieven: prijspeil 2026
          </span>
          <span>
            {stats && `~${stats.networkLengthKm.toLocaleString('nl-NL')} km netwerk`}
          </span>
        </div>
      </footer>

      {/* Modals */}
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      <DataModal open={showData} onClose={() => setShowData(false)} data={data} />
    </div>
  );
}
