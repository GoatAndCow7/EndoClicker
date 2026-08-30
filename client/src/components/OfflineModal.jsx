import { useGame } from '../game/store';
import { fmt, fmtDuration } from '../game/format';

export default function OfflineModal() {
  const report = useGame((s) => s.offlineReport);

  if (!report) return null;

  const close = () => useGame.setState({ offlineReport: null });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={close}
    >
      <div
        className="panel animate-pop w-full max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-ember-600/20 text-4xl ring-2 ring-ember-500/40">
          🌙
        </div>
        <h2 className="text-xl font-extrabold">Bon retour !</h2>
        <p className="mt-2 text-sm text-slate-300">
          Vos générateurs ont travaillé pendant{' '}
          <span className="font-bold text-ember-300">{fmtDuration(report.durationMs)}</span>{' '}
          (à {Math.round((report.eff ?? 0.5) * 100)} % d’efficacité).
        </p>
        <p className="text-glow mt-3 text-3xl font-extrabold text-ember-200 tabular-nums">
          +{fmt(report.gains)}
        </p>
        <p className="text-xs text-slate-400">EndoCraft récoltés en votre absence</p>
        <button className="btn-primary mt-5 w-full" onClick={close}>
          Récupérer
        </button>
      </div>
    </div>
  );
}
