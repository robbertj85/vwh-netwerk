'use client';

import { useEffect, useRef } from 'react';
import { X, ExternalLink, Scale, Database, FileText } from 'lucide-react';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
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

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 bg-white rounded-xl shadow-2xl max-w-2xl w-[90vw] p-0 open:animate-in"
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Over deze website</h2>
            <p className="text-xs text-gray-400 mt-0.5">Vrachtwagenheffing Netwerk Viewer</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-600">
          {/* Description */}
          <p>
            Deze website biedt een interactieve kaart van het Nederlandse vrachtwagenheffing
            tolnetwerk. Je kunt het netwerk verkennen, routes berekenen met bijbehorende
            kosten, en de data downloaden in verschillende formaten.
          </p>

          {/* Policy */}
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-1.5 mb-1">
              <Scale className="w-4 h-4" />
              Beleid
            </h3>
            <p className="text-xs leading-relaxed">
              De vrachtwagenheffing is een kilometerafhankelijke heffing voor vrachtwagens
              zwaarder dan 3.500 kg op aangewezen Nederlandse wegen. Het tarief is afhankelijk
              van de CO₂-emissieklasse, Euro-emissieklasse en gewichtsklasse van het voertuig.
              De heffing treedt in werking op 1 juli 2026 (prijspeil 2026).
            </p>
          </div>

          {/* Data sources */}
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
              <Database className="w-4 h-4" />
              Bronnen
            </h3>
            <div className="space-y-2">
              <SourceLink
                href="https://www.vrachtwagenheffing.nl"
                title="Vrachtwagenheffing.nl"
                desc="Officieel informatiepunt over de vrachtwagenheffing"
              />
              <SourceLink
                href="https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen"
                title="Tarieven 2026"
                desc="Officiële tarieftabellen per gewichts- en emissieklasse"
              />
              <SourceLink
                href="https://maps.ndw.nu/api/v1/hgvChargeTollCollectionNetwork/"
                title="NDW Data Register"
                desc="Brondata van het heffingsnetwerk (DATEX II XML)"
              />
              <SourceLink
                href="https://www.rijksoverheid.nl/onderwerpen/goederenvervoer/vrachtwagenheffing"
                title="Rijksoverheid.nl"
                desc="Overheidsinformatie over de vrachtwagenheffing"
              />
              <SourceLink
                href="https://www.rdw.nl/over-rdw/actueel/dossiers/vrachtwagenheffing"
                title="RDW"
                desc="Rol van de RDW bij de vrachtwagenheffing"
              />
            </div>
          </div>

          {/* License */}
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-1.5 mb-1">
              <FileText className="w-4 h-4" />
              Licentie
            </h3>
            <p className="text-xs">
              Open source onder de{' '}
              <strong>MIT-licentie</strong>. De broncode is vrij beschikbaar.
              De netwerkdata is afkomstig van het NDW en valt onder de daarbij
              geldende gebruiksvoorwaarden.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            <p className="font-medium text-gray-600 mb-1">Disclaimer</p>
            <p>
              Dit is een onafhankelijk project en is niet gelieerd aan de RDW, het Ministerie
              van Infrastructuur en Waterstaat of de Nederlandse overheid. De weergegeven
              informatie is indicatief en kan afwijken van de daadwerkelijke heffing.
              Gebruik de officiële kanalen voor bindende informatie.
            </p>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function SourceLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition group"
    >
      <ExternalLink className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0 group-hover:text-brand-600" />
      <div>
        <div className="text-xs font-medium text-gray-700 group-hover:text-brand-700">{title}</div>
        <div className="text-[11px] text-gray-400">{desc}</div>
      </div>
    </a>
  );
}
