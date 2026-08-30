import { UPGRADES, STAFF_BY_ID } from '../game/constants';
import { useGame } from '../game/store';
import { fmt } from '../game/format';
import { fx } from '../game/fx';
import GameIcon from './GameIcon.jsx';

export default function Upgrades() {
  const endocraft = useGame((s) => s.endocraft);
  const generators = useGame((s) => s.generators);
  const staff = useGame((s) => s.staff);
  const ownedUpgrades = useGame((s) => s.upgrades);
  const buyUpgrade = useGame((s) => s.buyUpgrade);

  const available = UPGRADES.filter((u) => {
    if (ownedUpgrades.includes(u.id)) return false;
    // Les upgrades de générateur n'apparaissent que si on possède le générateur
    if (u.req && (generators[u.req.genId] || 0) < 1) return false;
    // Les upgrades d'équipe restent VISIBLES même non recrutées (verrouillées)
    return true;
  });

  const purchased = UPGRADES.filter((u) => ownedUpgrades.includes(u.id));

  const handleBuy = (e, id) => {
    if (buyUpgrade(id)) fx.purchase(e.clientX, e.clientY);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-slate-400">
          Disponibles
        </h2>
        {available.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-500">
            Aucune amélioration disponible pour l’instant.
            <br />
            Achetez des générateurs pour en débloquer davantage !
          </p>
        )}
        {available.map((u) => {
          const affordable = endocraft >= u.cost;
          const staffLocked =
            u.staffId && !(staff || []).includes(u.staffId);
          const reqMet =
            (!u.req || (generators[u.req.genId] || 0) >= u.req.count) &&
            !staffLocked;
          return (
            <button
              key={u.id}
              onClick={(e) => handleBuy(e, u.id)}
              disabled={!affordable || !reqMet}
              className={`shop-item w-full text-left ${
                affordable && reqMet ? 'shop-item-affordable' : 'shop-item-locked'
              }`}
              title={u.desc}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10">
                <GameIcon icon={u.icon} alt={u.name} className="h-9 w-9" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{u.name}</span>
                <span className="block truncate text-xs text-slate-400">
                  {staffLocked
                    ? `🔒 Recrutez d’abord ${STAFF_BY_ID[u.staffId]?.pseudo} (onglet Équipe)`
                    : u.desc}
                </span>
              </span>
              <span
                className={`shrink-0 text-sm font-bold ${
                  affordable && reqMet ? 'text-ember-300' : 'text-slate-400'
                }`}
              >
                🪙 {fmt(u.cost)}
              </span>
            </button>
          );
        })}
      </div>

      {purchased.length > 0 && (
        <div className="space-y-2">
          <h2 className="px-1 text-sm font-bold uppercase tracking-wider text-slate-400">
            Acquises ({purchased.length})
          </h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {purchased.map((u) => (
              <div
                key={u.id}
                title={`${u.name} — ${u.desc}`}
                className="flex aspect-square items-center justify-center rounded-xl border border-ember-500/30 bg-ember-950/30 text-2xl"
              >
                <GameIcon icon={u.icon} alt={u.name} className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
