import { useGame, getProduction, getClickPower, getTotalRate } from '../game/store';
import { fmt, fmtInt, fmtDuration } from '../game/format';
import {
  GENERATORS,
  UPGRADES,
  STAFF,
  ACHIEVEMENTS,
  COIN_SKIN_BY_ID,
  RENAISSANCE,
  getRenaissanceThreshold,
} from '../game/constants';
import GameIcon from './GameIcon.jsx';

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="panel p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-ember-200 tabular-nums">
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}

export default function StatsPanel() {
  const clicks = useGame((s) => s.clicks);
  const applesClicked = useGame((s) => s.applesClicked);
  const applesByType = useGame((s) => s.applesByType) || {};
  const shadowMinisCaught = useGame((s) => s.shadowMinisCaught);
  const applesRained = useGame((s) => s.applesRained);
  const playMs = useGame((s) => s.playMs);
  const totalEndocraft = useGame((s) => s.totalEndocraft);
  const lifetime = useGame((s) => s.lifetimeEndocraft);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const staff = useGame((s) => s.staff);
  const achievements = useGame((s) => s.achievements);
  const equippedCoin = useGame((s) => s.equippedCoin);
  const renaissances = useGame((s) => s.renaissances);

  const state = { generators, upgrades, staff, renaissances };
  const production = getProduction(state);
  const clickPower = getClickPower(state);
  const totalRate = getTotalRate(state);

  // Moyennes
  const avgPerClick = clicks > 0 ? totalEndocraft / clicks : 0;
  const avgPerSecond = playMs > 0 ? lifetime / (playMs / 1000) : 0;

  // Répartition de production par générateur (hors bonus globaux)
  const genMult = {};
  for (const u of UPGRADES) {
    if (u.kind === 'gen' && upgrades.includes(u.id)) {
      genMult[u.genId] = (genMult[u.genId] || 1) * u.mult;
    }
  }
  const ownedGens = GENERATORS.filter((g) => (generators[g.id] || 0) > 0)
    .map((g) => ({
      ...g,
      count: generators[g.id],
      rate: generators[g.id] * g.baseRate * (genMult[g.id] || 1),
    }))
    .sort((a, b) => b.rate - a.rate);
  const rawSum = ownedGens.reduce((a, g) => a + g.rate, 0) || 1;

  const skin = COIN_SKIN_BY_ID[equippedCoin] || COIN_SKIN_BY_ID.default;
  const totalGens = ownedGens.reduce((a, g) => a + g.count, 0);
  const distGens = ownedGens.length;

  return (
    <div className="space-y-4">
      {/* Pommes & clics */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon="🍎"
          label="Pommes dorées"
          value={fmtInt(applesClicked)}
          sub="tous types confondus"
        />
        <StatCard
          icon="🌧️"
          label="Pommes de pluie"
          value={fmtInt(applesRained)}
          sub="attrapées"
        />
        <StatCard icon="👆" label="Clics" value={fmtInt(clicks)} sub="à la pièce" />
      </div>

      {/* Répartition par type de pomme */}
      {Object.keys(applesByType).length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-sm font-bold uppercase tracking-wider text-slate-400">
            🧺 Pommes attrapées par type
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {[
              ['doree', '🍎 Dorée'],
              ['orage', '🌧️ Orage'],
              ['ombre', '🌑 Ombre'],
              ['cristal', '💎 Cristal'],
              ['maudite', '💀 Maudite'],
            ].map(([type, label]) => (
              <div
                key={type}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-center"
              >
                <p className="text-sm font-extrabold tabular-nums text-ember-200">
                  {fmtInt(applesByType[type] || 0)}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
          {shadowMinisCaught > 0 && (
            <p className="mt-1.5 px-1 text-[10px] text-slate-500">
              🌑 {fmtInt(shadowMinisCaught)} mini-pommes attrapées pendant les
              tempêtes de clics
            </p>
          )}
        </section>
      )}

      {/* Production */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon="⚙️"
          label="Production"
          value={`${fmt(production)}/s`}
          sub="générateurs"
        />
        <StatCard
          icon="⚡"
          label="Par clic"
          value={fmt(clickPower)}
          sub="puissance actuelle"
        />
        <StatCard
          icon="📈"
          label="Débit total"
          value={`${fmt(totalRate)}/s`}
          sub="auto-clicker inclus"
        />
      </div>

      {/* Richesse */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon="💰"
          label="Total (run)"
          value={fmt(totalEndocraft)}
          sub="récolté cette run"
        />
        <StatCard
          icon="🏛️"
          label="Total à vie"
          value={fmt(lifetime)}
          sub="jamais remis à zéro"
        />
        <StatCard
          icon="🔥"
          label="Renaissances"
          value={fmtInt(renaissances)}
          sub={
            renaissances > 0
              ? `+${Math.round(renaissances * RENAISSANCE.multPerRenaissance * 100)} % permanent`
              : `seuil à ${fmt(getRenaissanceThreshold(0))} à vie`
          }
        />
      </div>

      {/* Moyennes */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon="🎯"
          label="Moy. / clic"
          value={fmt(avgPerClick)}
          sub="sur cette run"
        />
        <StatCard
          icon="⏱️"
          label="Temps de jeu"
          value={fmtDuration(playMs)}
          sub={`≈ ${fmt(avgPerSecond)}/s en moyenne à vie`}
        />
        <StatCard
          icon="✨"
          label="Skin équipé"
          value={skin.name}
          sub={skin.perk ? skin.perk.label : undefined}
        />
      </div>

      {/* Collection */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard
          icon="🪓"
          label="Générateurs"
          value={`${totalGens}`}
          sub={`${distGens}/${GENERATORS.length} types`}
        />
        <StatCard
          icon="⬆️"
          label="Améliorations"
          value={`${upgrades.length}/${UPGRADES.length}`}
        />
        <StatCard icon="🤝" label="Équipe" value={`${staff.length}/${STAFF.length}`} />
        <StatCard
          icon="🏅"
          label="Succès"
          value={`${achievements.length}/${ACHIEVEMENTS.length}`}
        />
      </div>

      {/* Répartition par générateur */}
      {ownedGens.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-sm font-bold uppercase tracking-wider text-slate-400">
            🏭 Répartition de la production
          </h3>
          <div className="space-y-1.5">
            {ownedGens.map((g) => {
              const share = (g.rate / rawSum) * 100;
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5"
                >
                  <GameIcon icon={g.icon} alt={g.name} className="h-6 w-6" />
                  <span className="w-28 shrink-0 truncate text-xs font-semibold">
                    {g.name}
                  </span>
                  <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-slate-400">
                    ×{g.count}
                  </span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-ember-500/70"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[11px] tabular-nums">
                    <b className="text-ember-300">{fmt(g.rate)}/s</b>{' '}
                    <span className="text-slate-500">{Math.round(share)} %</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
