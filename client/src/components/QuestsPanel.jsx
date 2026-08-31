import { useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { fmt } from '../game/format';
import { DAILY_QUESTS } from '../game/constants';
import { fx } from '../game/fx';

const POOL_BY_TYPE = Object.fromEntries(DAILY_QUESTS.pool.map((q) => [q.type, q]));

function msUntilMidnight(now) {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now;
}

export default function QuestsPanel() {
  const quests = useGame((s) => s.quests);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const claimQuest = useGame((s) => s.claimQuest);
  const claimQuestBonus = useGame((s) => s.claimQuestBonus);

  // Compteurs dont dépendent les progressions (recalcul live)
  const clicks = useGame((s) => s.clicks);
  const lifetime = useGame((s) => s.lifetimeEndocraft);
  const applesClicked = useGame((s) => s.applesClicked);
  const applesRained = useGame((s) => s.applesRained);
  const frenziesStarted = useGame((s) => s.frenziesStarted);

  // Recharge à minuit local, rafraîchie toutes les 30 s
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const msLeft = Math.max(0, msUntilMidnight(now));
  const hoursLeft = Math.floor(msLeft / 3_600_000);
  const minutesLeft = Math.floor((msLeft % 3_600_000) / 60_000);

  const start = quests?.start || {};
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

  const dateLabel = new Date(now).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const malformed =
    !quests || !Array.isArray(quests.list) || quests.list.length === 0;

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="section-title">📋 Quêtes du jour</h2>
        <p className="mt-1 text-2xs text-ink-3">
          <span className="capitalize">{dateLabel}</span> — terminez-les toutes
          pour le bonus ×{DAILY_QUESTS.bonusMult} !
        </p>
        <p className="text-3xs tabular-nums text-ink-4">
          Recharge dans {hoursLeft} h {minutesLeft} min
        </p>
      </div>

      {malformed ? (
        <div className="empty-state text-2xs">
          Les quêtes arrivent dans un instant…
        </div>
      ) : (
        <>
          {quests.list.map((q, i) => {
            const def = POOL_BY_TYPE[q.type];
            const progress = Math.min(q.target, delta(q.type));
            const pct = Math.min(100, (progress / q.target) * 100);
            const complete = progress >= q.target;
            const reward = q.reward ?? 5000;

            return (
              <div
                key={i}
                className={`list-row ${
                  q.claimed
                    ? 'shop-item-locked'
                    : complete
                      ? 'border-accent/50 bg-accent-overlay/20'
                      : ''
                }`}
              >
                <span className="icon-tile">{def?.icon || '❓'}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold text-ink">
                      {def?.label || q.type}
                    </span>
                    <span className="shrink-0 text-2xs tabular-nums text-ink-3">
                      {fmt(progress)} / {fmt(q.target)}
                    </span>
                  </p>
                  <p className="truncate text-2xs text-ink-3">
                    {def?.fmt ? def.fmt(q.target) : fmt(q.target)}
                  </p>
                  <div className="progress-bar mt-1.5">
                    <div
                      className={`progress-bar-fill transition-all duration-500 ${
                        complete ? 'is-complete' : ''
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                {q.claimed ? (
                  <span className="chip chip-success shrink-0">✓ Fait</span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleClaim(e, i)}
                    disabled={!complete}
                    className={`btn-primary focus-ring h-11 shrink-0 px-3 text-2xs md:h-9 ${
                      complete ? 'animate-pulse' : ''
                    }`}
                  >
                    Réclamer · 🪙 {fmt(reward)}
                  </button>
                )}
              </div>
            );
          })}

          {/* Bonus toutes quêtes */}
          {(() => {
            const allDone = quests.list.every((q) => q.claimed);
            const totalClaimed = quests.list.filter((q) => q.claimed).length;
            const bonusReward =
              (quests.reward ?? 5000) * DAILY_QUESTS.bonusMult;

            return (
              <div
                className={`list-row ${
                  quests.bonusClaimed
                    ? 'shop-item-locked'
                    : allDone
                      ? 'border-warning/40 bg-warning/10'
                      : ''
                }`}
              >
                <p className="min-w-0 flex-1 truncate text-2xs font-bold uppercase tracking-wider text-ink-2">
                  🏆 Journée parfaite{' '}
                  <span className="tabular-nums text-ink-3">
                    · {totalClaimed}/{DAILY_QUESTS.perDay}
                  </span>
                </p>
                {quests.bonusClaimed ? (
                  <span className="chip chip-success shrink-0">✓ Fait</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleBonus}
                    disabled={!allDone}
                    className={`btn-primary focus-ring h-11 shrink-0 px-3 text-2xs md:h-9 ${
                      allDone ? 'animate-pulse' : ''
                    }`}
                  >
                    Réclamer ×{DAILY_QUESTS.bonusMult} · 🪙 {fmt(bonusReward)}
                  </button>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
