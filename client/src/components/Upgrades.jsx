import { UPGRADES, STAFF_BY_ID, GENERATOR_BY_ID } from '../game/constants';
import { useGame } from '../game/store';
import { useThrottledEndocraft } from '../game/hooks';
import { fmt } from '../game/format';
import { fx } from '../game/fx';
import GameIcon from './GameIcon.jsx';

export default function Upgrades() {
  // Solde throttlé : la liste ne se re-rend pas à chaque clic (auto-clicker)
  const endocraft = useThrottledEndocraft();
  const generators = useGame((s) => s.generators);
  const staff = useGame((s) => s.staff);
  const ownedUpgrades = useGame((s) => s.upgrades);
  const buyUpgrade = useGame((s) => s.buyUpgrade);

  // Message de verrouillage, ou null si l'upgrade est accessible
  const lockText = (u) => {
    if (u.staffId && !(staff || []).includes(u.staffId)) {
      return `🔒 Recrutez d’abord ${STAFF_BY_ID[u.staffId]?.pseudo} (onglet Équipe)`;
    }
    if (u.req && (generators[u.req.genId] || 0) < u.req.count) {
      return `🔒 Possédez d’abord ${u.req.count} × ${GENERATOR_BY_ID[u.req.genId]?.name}`;
    }
    return null;
  };

  const available = UPGRADES.filter((u) => {
    if (ownedUpgrades.includes(u.id)) return false;
    // Les upgrades de générateur n'apparaissent que si on possède le générateur
    if (u.req && (generators[u.req.genId] || 0) < 1) return false;
    // Les upgrades d'équipe restent VISIBLES même non recrutées (verrouillées)
    return true;
  });
  // Abordables d'abord, puis verrouillées, puis trop chères
  const rank = (u) => (lockText(u) ? 1 : endocraft >= u.cost ? 0 : 2);
  available.sort((a, b) => rank(a) - rank(b));

  const purchased = UPGRADES.filter((u) => ownedUpgrades.includes(u.id));

  const handleBuy = (e, id) => {
    if (!buyUpgrade(id)) return;
    fx.purchase(e.clientX, e.clientY);
    const row = e.currentTarget;
    row.classList.remove('is-flashing');
    void row.offsetWidth;
    row.classList.add('is-flashing');
    const tile = row.querySelector('[data-ec-icon]');
    if (tile) {
      tile.classList.remove('ec-icon-pop');
      void tile.offsetWidth;
      tile.classList.add('ec-icon-pop');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="section-title px-1">Disponibles</h3>
        {available.length === 0 && (
          <p className="empty-state text-sm">
            Aucune amélioration disponible pour l’instant.
            <br />
            Achetez des générateurs pour en débloquer davantage !
          </p>
        )}
        {available.map((u) => {
          const locked = lockText(u);
          const affordable = endocraft >= u.cost;
          return (
            <button
              key={u.id}
              onClick={(e) => handleBuy(e, u.id)}
              disabled={!affordable || !!locked}
              className={`shop-item ec-flash focus-ring w-full text-left ${
                affordable && !locked
                  ? 'shop-item-affordable'
                  : 'shop-item-locked'
              }`}
              title={u.desc}
            >
              <span data-ec-icon className="icon-tile">
                <GameIcon icon={u.icon} alt={u.name} className="h-9 w-9" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink">
                  {u.name}
                </span>
                <span className="block truncate text-2xs text-ink-3">
                  {locked ?? u.desc}
                </span>
              </span>
              <span
                className={`shrink-0 text-sm font-bold tabular-nums ${
                  affordable && !locked ? 'text-accent-soft' : 'text-ink-3'
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
          <h3 className="section-title px-1">Acquises ({purchased.length})</h3>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {purchased.map((u) => (
              <div
                key={u.id}
                role="img"
                title={`${u.name} — ${u.desc}`}
                aria-label={`${u.name} — ${u.desc}`}
                className="icon-tile h-11 w-11"
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
