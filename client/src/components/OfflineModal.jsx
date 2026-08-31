import { useEffect } from 'react';
import { useGame } from '../game/store';
import { fmt, fmtDuration } from '../game/format';

export default function OfflineModal() {
  const report = useGame((s) => s.offlineReport);

  const close = () => useGame.setState({ offlineReport: null });

  useEffect(() => {
    if (!report) return;
    const h = (e) => {
      // Échap = récupérer : même action que le bouton.
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [report]);

  if (!report) return null;

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gains hors ligne"
        className="modal-card max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="icon-tile" aria-hidden="true">
            🌙
          </span>
          <h3 className="modal-title flex-1">Bon retour !</h3>
          <button
            type="button"
            onClick={close}
            className="modal-x"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="modal-body space-y-4 text-center">
          <p className="text-2xs text-ink-3">
            Vos générateurs ont travaillé pendant votre absence.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="stat-tile">
              <p className="text-3xs uppercase tracking-wider text-ink-4">
                Absence
              </p>
              <p className="stat-tile-value mt-0.5 text-sm font-bold">
                {fmtDuration(report.durationMs)}
              </p>
            </div>
            <div className="stat-tile">
              <p className="text-3xs uppercase tracking-wider text-ink-4">
                Efficacité
              </p>
              <p className="stat-tile-value mt-0.5 text-sm font-bold">
                {Math.round((report.eff ?? 0.5) * 100)} %
              </p>
            </div>
          </div>

          <div>
            <p className="ec-count-bump stat-value text-3xl">
              +{fmt(report.gains)}
            </p>
            <p className="mt-1 text-2xs text-ink-4">
              EndoCraft récoltés en votre absence
            </p>
          </div>
        </div>

        <div className="modal-foot">
          <button
            type="button"
            onClick={close}
            className="btn btn-primary focus-ring h-11 w-full text-sm md:h-10"
          >
            Récupérer
          </button>
        </div>
      </div>
    </div>
  );
}
