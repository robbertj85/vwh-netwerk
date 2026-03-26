'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  MapIcon,
  Route,
  Truck,
  Calculator,
  Info,
  BarChart3,
  ExternalLink,
  XCircle,
  Loader2,
  Link2,
  Euro,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import AddressInput from '@/components/AddressInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type {
  TollNetworkGeoJSON,
  NetworkStats,
  RouteCalculation,
  CO2Class,
  EuroClass,
  WeightClass,
} from '@/types/toll-network';
import {
  WEIGHT_CLASS_LABELS,
  CO2_CLASS_LABELS,
  EURO_CLASS_LABELS,
  ROAD_TYPE_LABELS,
  ROAD_TYPE_COLORS,
} from '@/types/toll-network';
import { getTariffRate } from '@/lib/tariffs';

interface SidePanelProps {
  data: TollNetworkGeoJSON | null;
  stats: NetworkStats | null;
  routeResult: RouteCalculation | null;
  onRouteCalculated: (result: RouteCalculation) => void;
  onClearRoute: () => void;
}

type Tab = 'info' | 'route' | 'tariffs';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'info', label: 'Netwerk', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: 'route', label: 'Route', icon: <Route className="w-3.5 h-3.5" /> },
  { id: 'tariffs', label: 'Tarieven', icon: <Euro className="w-3.5 h-3.5" /> },
];

export default function SidePanel({
  data,
  stats,
  routeResult,
  onRouteCalculated,
  onClearRoute,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const [originAddress, setOriginAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [co2Class, setCo2Class] = useState<CO2Class>(1);
  const [euroClass, setEuroClass] = useState<EuroClass>(6);
  const [weightClass, setWeightClass] = useState<WeightClass>('32000+');
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const currentRate = useMemo(
    () => getTariffRate({ co2Class, euroClass, weightClass }),
    [co2Class, euroClass, weightClass]
  );

  const handleCalculate = async () => {
    if (!originCoords || !destCoords) return;
    setCalculating(true);
    setCalcError(null);

    try {
      const res = await fetch('/api/v1/toll-network/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: { ...originCoords, address: originAddress },
          destination: { ...destCoords, address: destAddress },
          tariffParams: { co2Class, euroClass, weightClass },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Berekening mislukt');
      }

      const result: RouteCalculation = await res.json();
      onRouteCalculated(result);
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setCalculating(false);
    }
  };

  const handleClear = () => {
    setOriginAddress('');
    setDestAddress('');
    setOriginCoords(null);
    setDestCoords(null);
    setCalcError(null);
    onClearRoute();
  };

  return (
    <div className="flex flex-col h-full bg-white text-[13px]">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-brand-700 border-b-2 border-brand-700 bg-red-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {activeTab === 'info' && <InfoTab stats={stats} />}
        {activeTab === 'route' && (
          <RouteTab
            originAddress={originAddress}
            destAddress={destAddress}
            originCoords={originCoords}
            destCoords={destCoords}
            co2Class={co2Class}
            euroClass={euroClass}
            weightClass={weightClass}
            currentRate={currentRate}
            calculating={calculating}
            calcError={calcError}
            routeResult={routeResult}
            onOriginChange={setOriginAddress}
            onDestChange={setDestAddress}
            onOriginSelect={(s) => setOriginCoords({ lat: s.lat, lng: s.lng })}
            onDestSelect={(s) => setDestCoords({ lat: s.lat, lng: s.lng })}
            onCo2ClassChange={setCo2Class}
            onEuroClassChange={setEuroClass}
            onWeightClassChange={setWeightClass}
            onCalculate={handleCalculate}
            onClear={handleClear}
          />
        )}
        {activeTab === 'tariffs' && <TariffsTab />}
      </div>
    </div>
  );
}

// ─── Info Tab ───────────────────────────────────────────────

function InfoTab({ stats }: { stats: NetworkStats | null }) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <Card>
        <CardContent className="p-2.5 space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-gray-500">Netwerklengte</span><span className="font-semibold text-gray-700">{stats.networkLengthKm.toLocaleString('nl-NL')} km</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Secties (enkelbaans)</span><span className="font-semibold text-gray-700">{stats.totalSections.toLocaleString('nl-NL')}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Unieke wegen</span><span className="font-semibold text-gray-700">{stats.uniqueRoads}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Data datum</span><span className="font-semibold text-gray-700">{stats.dataDate.replace(/(\d{4})(\d{2})(\d{2})/, '$3-$2-$1')}</span></div>
        </CardContent>
      </Card>

      {/* Road type breakdown */}
      <Card>
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <MapIcon className="w-3.5 h-3.5" />
            Verdeling wegtype
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1.5">
          <div className="space-y-2.5">
            {(Object.entries(stats.roadTypes) as [string, { count: number; distanceKm: number }][]).map(
              ([type, data]) => {
                const pct = stats.totalDistanceKm > 0
                  ? (data.distanceKm / stats.totalDistanceKm) * 100
                  : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: ROAD_TYPE_COLORS[type as keyof typeof ROAD_TYPE_COLORS] }}
                        />
                        <span className="text-gray-600">
                          {ROAD_TYPE_LABELS[type as keyof typeof ROAD_TYPE_LABELS]}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[10px]">
                        ~{Math.round(data.distanceKm / 2).toLocaleString('nl-NL')} km
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: ROAD_TYPE_COLORS[type as keyof typeof ROAD_TYPE_COLORS],
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top roads */}
      <Card>
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            Langste wegen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1.5">
          <div className="space-y-1.5">
            {stats.topRoads.slice(0, 10).map((road) => (
              <div key={road.name} className="flex items-center justify-between text-xs">
                <Badge
                  variant={
                    road.roadType === 'highway'
                      ? 'highway'
                      : road.roadType === 'national'
                      ? 'national'
                      : 'local'
                  }
                  className="text-[10px] px-2 py-0"
                >
                  {road.name}
                </Badge>
                <span className="text-gray-400 tabular-nums text-[11px]">
                  ~{Math.round(road.distanceKm / 2)} km
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sources */}
      <Card>
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <Link2 className="w-3.5 h-3.5" />
            Bronnen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1.5 space-y-1">
          <SourceLink href="https://www.vrachtwagenheffing.nl" label="Vrachtwagenheffing.nl" />
          <SourceLink href="https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen" label="Tarieven 2026" />
          <SourceLink href="https://maps.ndw.nu/api/v1/hgvChargeTollCollectionNetwork/" label="NDW Data Register" />
          <SourceLink href="https://www.rijksoverheid.nl/onderwerpen/goederenvervoer/vrachtwagenheffing" label="Rijksoverheid.nl" />
        </CardContent>
      </Card>
    </div>
  );
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-brand-700 transition"
    >
      <ExternalLink className="w-3 h-3 shrink-0" />
      {label}
    </a>
  );
}

// ─── Route Tab ──────────────────────────────────────────────

interface RouteTabProps {
  originAddress: string;
  destAddress: string;
  originCoords: { lat: number; lng: number } | null;
  destCoords: { lat: number; lng: number } | null;
  co2Class: CO2Class;
  euroClass: EuroClass;
  weightClass: WeightClass;
  currentRate: number;
  calculating: boolean;
  calcError: string | null;
  routeResult: RouteCalculation | null;
  onOriginChange: (v: string) => void;
  onDestChange: (v: string) => void;
  onOriginSelect: (s: { name: string; lat: number; lng: number }) => void;
  onDestSelect: (s: { name: string; lat: number; lng: number }) => void;
  onCo2ClassChange: (v: CO2Class) => void;
  onEuroClassChange: (v: EuroClass) => void;
  onWeightClassChange: (v: WeightClass) => void;
  onCalculate: () => void;
  onClear: () => void;
}

function RouteTab(props: RouteTabProps) {
  const {
    originAddress, destAddress,
    originCoords, destCoords,
    co2Class, euroClass, weightClass, currentRate,
    calculating, calcError, routeResult,
    onOriginChange, onDestChange,
    onOriginSelect, onDestSelect,
    onCo2ClassChange, onEuroClassChange, onWeightClassChange,
    onCalculate, onClear,
  } = props;

  return (
    <div className="space-y-3">
      {/* Origin / Destination */}
      <Card>
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <Route className="w-3.5 h-3.5" />
            Route berekenen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1.5 space-y-2.5">
          <AddressInput
            value={originAddress}
            onChange={onOriginChange}
            onSelect={onOriginSelect}
            placeholder="Vertrekpunt..."
            label="Van"
          />
          <AddressInput
            value={destAddress}
            onChange={onDestChange}
            onSelect={onDestSelect}
            placeholder="Bestemming..."
            label="Naar"
          />
        </CardContent>
      </Card>

      {/* Vehicle */}
      <VehicleCard
        weightClass={weightClass}
        co2Class={co2Class}
        euroClass={euroClass}
        currentRate={currentRate}
        onWeightClassChange={onWeightClassChange}
        onCo2ClassChange={onCo2ClassChange}
        onEuroClassChange={onEuroClassChange}
      />

      {/* Calculate */}
      <div className="flex gap-2">
        <Button
          onClick={onCalculate}
          disabled={!originCoords || !destCoords || calculating}
          className="flex-1"
          size="sm"
        >
          {calculating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Berekenen...
            </>
          ) : (
            <>
              <Calculator className="w-3.5 h-3.5 mr-1.5" />
              Bereken kosten
            </>
          )}
        </Button>
        {routeResult && (
          <Button variant="outline" size="sm" onClick={onClear}>
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {calcError && (
        <div className="bg-red-50 text-red-700 rounded-lg px-2.5 py-1.5 text-xs">{calcError}</div>
      )}

      {/* Results */}
      {routeResult && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="p-3 pb-1.5">
            <CardTitle className="flex items-center gap-1.5 text-xs text-green-800">
              <Info className="w-3.5 h-3.5" />
              Resultaat
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1.5">
            <div className="space-y-1.5 text-xs">
              <Row label="Totale afstand" value={`${routeResult.totalRouteDistanceKm.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} km`} />
              <Row label="Heffingsafstand" value={`${routeResult.tollDistanceKm.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} km`} valueClass="text-green-700" />
              <Row label="% op heffingsnetwerk" value={`${routeResult.tollPercentage.toFixed(1)}%`} />
              <hr className="border-green-200" />
              <Row label="Tarief" value={`€ ${routeResult.tariff.ratePerKm.toFixed(3)} /km`} />
              <div className="flex justify-between text-sm pt-1">
                <span className="font-semibold text-gray-800">Totale kosten</span>
                <span className="font-bold text-green-700">
                  € {routeResult.tariff.totalCost.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Matched roads */}
              {routeResult.methods?.orsSteps.matchedRoads.length ? (
                <div className="mt-2 pt-2 border-t border-green-100">
                  <div className="text-[10px] text-gray-400">
                    Heffingswegen: {routeResult.methods.orsSteps.matchedRoads.join(', ')}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch routing link */}
      <div className="bg-gray-50 rounded-lg p-2.5">
        <p className="text-[11px] text-gray-500 mb-1.5">
          Meerdere routes berekenen? Gebruik Davisi voor batch-berekeningen:
        </p>
        <a
          href="https://www.davisi.nl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          www.davisi.nl
        </a>
      </div>

      {/* Footnotes */}
      <div className="text-[10px] text-gray-400 space-y-0.5">
        <p>Route via ORS (driving-hgv). Heffingsafstand o.b.v. ORS-wegnamen + NDW-register.</p>
        <p>
          Tarieven: prijspeil 2026 (
          <a href="https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
            bron
          </a>
          ).
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${valueClass || ''}`}>{value}</span>
    </div>
  );
}

// ─── Vehicle Card with RDW Lookup ───────────────────────────

interface VehicleCardProps {
  weightClass: WeightClass;
  co2Class: CO2Class;
  euroClass: EuroClass;
  currentRate: number;
  onWeightClassChange: (v: WeightClass) => void;
  onCo2ClassChange: (v: CO2Class) => void;
  onEuroClassChange: (v: EuroClass) => void;
}

interface RdwResult {
  kenteken: string;
  merk: string;
  handelsbenaming: string;
  voertuigsoort: string;
  europeseVoertuigcategorie: string;
  inrichting: string;
  technischeMaxMassa: number;
  toegestaneMaxMassa: number;
  maximumMassaSamenstelling: number;
  heffingsgewicht: number;
  heffingsgewichtToelichting: string;
  weightClass: WeightClass;
  brandstof: string;
  uitlaatemissieniveau: string;
  euroClass: EuroClass;
  co2Class: CO2Class;
  isHeffingsplichtig: boolean;
  heffingsplichtReden: string;
}

function VehicleCard({
  weightClass, co2Class, euroClass, currentRate,
  onWeightClassChange, onCo2ClassChange, onEuroClassChange,
}: VehicleCardProps) {
  const [kenteken, setKenteken] = useState('');
  const [looking, setLooking] = useState(false);
  const [rdw, setRdw] = useState<RdwResult | null>(null);
  const [rdwError, setRdwError] = useState<string | null>(null);

  const lookupKenteken = useCallback(async () => {
    if (!kenteken.trim()) return;
    setLooking(true);
    setRdwError(null);
    setRdw(null);

    try {
      const res = await fetch(`/api/v1/rdw/${encodeURIComponent(kenteken.trim())}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Fout ${res.status}`);
      }
      const data: RdwResult = await res.json();
      setRdw(data);

      // Auto-fill vehicle config
      onWeightClassChange(data.weightClass);
      onCo2ClassChange(data.co2Class);
      onEuroClassChange(data.euroClass);
    } catch (e) {
      setRdwError(e instanceof Error ? e.message : 'Opzoeking mislukt');
    } finally {
      setLooking(false);
    }
  }, [kenteken, onWeightClassChange, onCo2ClassChange, onEuroClassChange]);

  return (
    <Card>
      <CardHeader className="p-3 pb-1.5">
        <CardTitle className="flex items-center gap-1.5 text-xs">
          <Truck className="w-3.5 h-3.5" />
          Voertuig
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1.5 space-y-2">
        {/* Kenteken lookup */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">
            Kenteken <span className="text-gray-400 font-normal">(optioneel)</span>
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={kenteken}
              onChange={(e) => setKenteken(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') lookupKenteken(); }}
              placeholder="XX-999-X"
              className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono tracking-wider"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={lookupKenteken}
              disabled={!kenteken.trim() || looking}
              className="px-2"
            >
              {looking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {rdwError && (
          <div className="bg-red-50 text-red-700 rounded px-2 py-1.5 text-[11px]">{rdwError}</div>
        )}

        {/* RDW result */}
        {rdw && (
          <div className={`rounded-lg px-2.5 py-2 text-[11px] space-y-1 ${rdw.isHeffingsplichtig ? 'bg-green-50' : 'bg-amber-50'}`}>
            <div className="flex items-center gap-1.5 font-medium text-gray-700">
              {rdw.isHeffingsplichtig ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              )}
              {rdw.merk} {rdw.handelsbenaming}
            </div>
            <div className="text-gray-500 space-y-0.5">
              <div>{rdw.voertuigsoort} &middot; {rdw.europeseVoertuigcategorie} &middot; {rdw.brandstof}</div>
              <div>{rdw.heffingsgewichtToelichting}</div>
              <div>Emissie: {rdw.uitlaatemissieniveau || 'onbekend'} → Euro {rdw.euroClass}, CO₂ klasse {rdw.co2Class}</div>
              <div className={rdw.isHeffingsplichtig ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
                {rdw.isHeffingsplichtig ? 'Heffingsplichtig' : 'Niet heffingsplichtig'}: {rdw.heffingsplichtReden}
              </div>
            </div>
          </div>
        )}

        {/* Manual selectors */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">Gewichtsklasse</label>
          <select
            value={weightClass}
            onChange={(e) => onWeightClassChange(e.target.value as WeightClass)}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            {Object.entries(WEIGHT_CLASS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-0.5">CO₂-emissieklasse</label>
          <select
            value={co2Class}
            onChange={(e) => onCo2ClassChange(Number(e.target.value) as CO2Class)}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            {Object.entries(CO2_CLASS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {co2Class === 1 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-0.5">Euro-emissieklasse</label>
            <select
              value={euroClass}
              onChange={(e) => onEuroClassChange(Number(e.target.value) as EuroClass)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              {Object.entries(EURO_CLASS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between bg-red-50 rounded-lg px-2.5 py-1.5">
          <span className="text-xs text-gray-600">Tarief per km</span>
          <span className="text-xs font-semibold text-brand-700">€ {currentRate.toFixed(3)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tariffs Tab ────────────────────────────────────────────

function TariffsTab() {
  const euroHeaders = ['Euro 0', 'Euro I', 'Euro II', 'Euro III', 'Euro IV', 'Euro V', 'Euro VI'];
  const co2Headers = ['Kl. 2 (≥5%)', 'Kl. 3 (≥8%)', 'Kl. 4 (≥50%)', 'Kl. 5 (ZE)'];
  const weights = [
    { label: '> 3.500 - 12.000 kg', co1: [0.272, 0.221, 0.211, 0.184, 0.162, 0.131, 0.113], co2_5: [0.103, 0.092, 0.063, 0.025] },
    { label: '12.000 - 18.000 kg',  co1: [0.392, 0.315, 0.300, 0.266, 0.229, 0.186, 0.160], co2_5: [0.145, 0.129, 0.088, 0.035] },
    { label: '18.000 - 32.000 kg',  co1: [0.432, 0.364, 0.347, 0.308, 0.264, 0.212, 0.182], co2_5: [0.165, 0.148, 0.100, 0.037] },
    { label: '> 32.000 kg',         co1: [0.487, 0.409, 0.392, 0.349, 0.298, 0.236, 0.201], co2_5: [0.183, 0.165, 0.111, 0.038] },
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">
        Tarieven in <strong>€ per km</strong> &middot; Prijspeil 2026
      </div>

      {/* CO2 Class 1 table */}
      <Card>
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="text-xs">CO₂-emissieklasse 1 (conventioneel)</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 pr-2 font-medium text-gray-500">Gewicht</th>
                {euroHeaders.map(h => (
                  <th key={h} className="text-right py-1 px-1 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weights.map(row => (
                <tr key={row.label} className="border-b border-gray-50">
                  <td className="py-1.5 pr-2 text-gray-600 whitespace-nowrap">{row.label}</td>
                  {row.co1.map((v, i) => (
                    <td key={i} className="text-right py-1.5 px-1 tabular-nums text-gray-700">
                      {v.toFixed(3)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* CO2 Class 2-5 table */}
      <Card>
        <CardHeader className="p-3 pb-1.5">
          <CardTitle className="text-xs">CO₂-emissieklasse 2-5 (schoner / zero-emissie)</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 pr-2 font-medium text-gray-500">Gewicht</th>
                {co2Headers.map(h => (
                  <th key={h} className="text-right py-1 px-1 font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weights.map(row => (
                <tr key={row.label} className="border-b border-gray-50">
                  <td className="py-1.5 pr-2 text-gray-600 whitespace-nowrap">{row.label}</td>
                  {row.co2_5.map((v, i) => (
                    <td key={i} className="text-right py-1.5 px-1 tabular-nums text-gray-700">
                      {v.toFixed(3)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2 text-[10px] text-gray-400">
        <p>
          <strong className="text-gray-500">Zero-emissie voertuigen ≤ 4.250 kg</strong> zijn volledig vrijgesteld.
        </p>
        <p>
          <strong className="text-gray-500">Gemiddeld tarief:</strong> ca. € 0,191 /km over het hele wagenpark.
        </p>
        <p>
          Tarieven worden jaarlijks aangepast aan de inflatie (per 1 januari).
        </p>
        <p>
          Bron:{' '}
          <a
            href="https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:underline"
          >
            vrachtwagenheffing.nl/dit-gaat-u-betalen
          </a>
        </p>
      </div>
    </div>
  );
}
