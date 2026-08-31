import { ACHIEVEMENTS } from '../game/constants';
import { useGame } from '../game/store';

export default function Achievements() {
  const unlocked = useGame((s) => s.achievements);
  const unlockedSet = new Set(unlocked);
  const progress = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);

  // Débloqués d'abord, verrouillés dans l'ordre du tableau
  const sorted = [...ACHIEVEMENTS].sort(
    (a, b) => unlockedSet.has(b.id) - unlockedSet.has(a.id)
  );

  return (
    <div className="space-y-3">
      <div className="list-row">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            <span className="tabular-nums">
              {unlocked.length}/{ACHIEVEMENTS.length}
            </span>{' '}
            succès
          </p>
          <p className="mt-0.5 text-2xs text-ink-3">
            Continuez à cliquer pour tous les découvrir !
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-accent/50 text-sm font-extrabold tabular-nums text-accent-soft">
          {progress}%
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sorted.map((a) => {
          const done = unlockedSet.has(a.id);
          return (
            <div
              key={a.id}
              className={`flex h-full flex-col rounded-xl border p-3 transition-colors ${
                done
                  ? 'border-accent/40 bg-accent-overlay/20'
                  : 'border-line/5 bg-void/30 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${done ? '' : 'grayscale'}`}>
                  {done ? a.icon : '🔒'}
                </span>
                <p className="flex min-h-[2.5rem] items-center text-sm font-bold leading-tight text-ink">
                  {a.name}
                </p>
              </div>
              <p className="mt-1 text-2xs leading-snug text-ink-3">{a.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
