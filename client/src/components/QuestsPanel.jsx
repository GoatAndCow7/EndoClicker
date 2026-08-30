import { useGame, getProduction } from '../game/store';
import { fmt } from '../game/format';
import { DAILY_QUESTS } from '../game/constants';
import { fx } from '../game/fx';

const POOL_BY_TYPE = Object.fromEntries(DAILY_QUESTS.pool.map((q) => [q.type, q]));

export default function QuestsPanel() {
  const quests = useGame((s) => s.quests);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const staff = useGame((s) => s.staff);
  const renaissances = useGame((s) => s.renaissances);
  const claimQuest = useGame((s) => s.claimQuest);
  const claimQuestBonus = useGame((s) => s.claimQuestBonus);

  // Compteurs dont dépendent les progressions (recalcul live)
  const clicks = useGame((s) => s.clicks);
  const lifetime = useGame((s) => s.lifetimeEndocraft);
  const applesClicked = useGame((s) => s.applesClicked);
  const applesRained = useGame((s) => s.applesRained);
  const frenziesStarted = useGame((s) => s.frenziesStarted);

  if (!quests) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ember-500 border-t-transparent" />
      </div>
    );
  }

  const state = {
    quests,
    generators,
    upgrades,
    clicks,
    lifetimeEndocraft: lifetime,
    applesClicked,
    applesRained,
    frenziesStarted,
  };
  const start = quests.start || {};
  const delta = (type) => {
    switch (type) {
      case 'earn':
        return Math.max(0, lifetime - (start.lifetime || 0));
      case 'clicks':
        return Math.max(0, clicks - (start.clicks || 0));
      case 'generators':
        return Math.max(
          0,
          Object.values(generators || {}).reduce((a, b) => a + b, 0) -
            (start.gens || 0)
        );
      case 'upgrades':
        return Math.max(0, (upgrades || []).length - (start.upgrades || 0));
      case 'apples':
        return Math.max(0, applesClicked - (start.apples || 0));
      case 'rain':
        return Math.max(0, applesRained - (start.rain || 0));
      case 'frenzy':
        return Math.max(0, frenziesStarted - (start.frenzy || 0));
      default:
        return 0;
    }
  };

  const reward = Math.max(
    1000,
    Math.round(
      getProduction({ generators, upgrades, staff, renaissances }) *
        DAILY_QUESTS.rewardSeconds
    )
  );
  const allDone = quests.list.every((q) => q.claimed);
  const totalClaimed = quests.list.filter((q) => q.claimed).length;
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleClaim = (e, i) => {
    if (claimQuest(i)) {
      fx.burst(e.clientX, e.clientY, { count: 16, power: 1.1 });
    }
  };
  const handleBonus = (e) => {
    if (claimQuestBonus()) {
      fx.burst(e.clientX, e.clientY, { count: 30, power: 1.4 });
      fx.confetti();
    }
  };

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          📋 Quêtes du jour
        </h2>
        <p className="mt-1 text-xs text-slate-500 capitalize">
          {dateLabel} — nouvelles quêtes à minuit. Terminez-les toutes pour le
          bonus ×3 !
        </p>
      </div>

      {quests.list.map((q, i) => {
        const def = POOL_BY_TYPE[q.type];
        const progress = Math.min(q.target, delta(q.type));
        const pct = Math.min(100, (progress / q.target) * 100);
        const complete = progress >= q.target;

        return (
          <div
            key={i}
            className={`rounded-xl border p-3 transition-colors ${
              q.claimed
                ? 'border-emerald-500/40 bg-emerald-950/20 opacity-80'
                : complete
                  ? 'border-ember-400/60 bg-ember-950/25'
                  : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/40 text-xl">
                {def?.icon || '❓'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold">
                    {def?.label || q.type}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                    {fmt(progress)} / {fmt(q.target)}
                  </span>
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {def?.fmt ? def.fmt(q.target) : q.target}
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div
                    className={`h-full rounded-full transition-all ${
                      q.claimed
                        ? 'bg-emerald-500/70'
                        : 'bg-ember-500/70'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {q.claimed ? (
                <span className="shrink-0 text-xs font-bold text-emerald-400">
                  ✓ Réclamé
                </span>
              ) : (
                <button
                  onClick={(e) => handleClaim(e, i)}
                  disabled={!complete}
                  className={`btn shrink-0 px-2.5 py-1.5 text-[11px] ${
                    complete
                      ? 'btn-primary'
                      : 'cursor-not-allowed bg-white/5 text-slate-500'
                  }`}
                >
                  🪙 {fmt(reward)}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Bonus toutes quêtes */}
      <div
        className={`rounded-xl border p-3 ${
          quests.bonusClaimed
            ? 'border-emerald-500/40 bg-emerald-950/20'
            : allDone
              ? 'border-amber-400/60 bg-amber-950/25'
              : 'border-white/10 bg-black/30'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
            🏆 Journée parfaite ({totalClaimed}/{DAILY_QUESTS.perDay})
          </p>
          {quests.bonusClaimed ? (
            <span className="text-xs font-bold text-emerald-400">✕ Réclamé</span>
          ) : (
            <button
              onClick={handleBonus}
              disabled={!allDone}
              className={`btn shrink-0 px-2.5 py-1.5 text-[11px] ${
                allDone
                  ? 'btn-primary'
                  : 'cursor-not-allowed bg-white/5 text-slate-500'
              }`}
            >
              🪙 {fmt(reward * DAILY_QUESTS.bonusMult)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
