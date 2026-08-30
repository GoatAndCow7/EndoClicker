import { ACHIEVEMENTS } from '../game/constants';
import { useGame } from '../game/store';

export default function Achievements() {
  const unlocked = useGame((s) => s.achievements);
  const unlockedSet = new Set(unlocked);
  const progress = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);

  return (
    <div className="space-y-3">
      <div className="panel flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-bold">
            {unlocked.length} / {ACHIEVEMENTS.length} succès débloqués
          </p>
          <p className="text-xs text-slate-400">Continuez à cliquer pour tous les découvrir !</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ember-500/50 text-sm font-extrabold text-ember-300">
          {progress}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const done = unlockedSet.has(a.id);
          return (
            <div
              key={a.id}
              className={`rounded-xl border p-3 transition-colors ${
                done
                  ? 'border-ember-500/40 bg-ember-950/30'
                  : 'border-white/5 bg-black/30 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${done ? '' : 'grayscale'}`}>
                  {done ? a.icon : '🔒'}
                </span>
                <p className="text-sm font-bold leading-tight">{a.name}</p>
              </div>
              <p className="mt-1 text-xs leading-snug text-slate-400">{a.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
