import { GENERATORS, UPGRADES } from '../game/constants';
import { useGame, generatorsCost, getStaffMults } from '../game/store';
import { fmt } from '../game/format';
import { fx } from '../game/fx';
import GameIcon from './GameIcon.jsx';

export const BUY_AMOUNTS = [1, 10, 100, 'max'];

const MAX_BUY = 1000;

// Plus gros lot achetable avec `balance` : on double puis on affine en
// dichotomie — une vingtaine d'évaluations de coût au lieu de 1000.
function maxBuyable(gen, owned, balance, discount) {
  const cost = (n) => generatorsCost(gen, owned, n, discount);
  if (cost(1) > balance) return 0;
  let lo = 1;
  let hi = 2;
  while (hi < MAX_BUY && cost(hi) <= balance) {
    lo = hi;
    hi *= 2;
  }
  hi = Math.min(hi, MAX_BUY);
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (cost(mid) <= balance) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export default function Shop({ amount = 1 }) {
  const endocraft = useGame((s) => s.endocraft);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const staff = useGame((s) => s.staff);
  const buyGenerator = useGame((s) => s.buyGenerator);

  // La remise (Zoxxio & co) vit dans getStaffMults : il lui faut le state
  // complet, staff ET upgrades.
  const discount = getStaffMults({ staff, upgrades }).genCost;

  // Multiplicateurs par générateur (pour l'affichage du taux réel)
  const genMult = {};
  for (const u of UPGRADES) {
    if (u.kind === 'gen' && upgrades.includes(u.id)) {
      genMult[u.genId] = (genMult[u.genId] || 1) * u.mult;
    }
  }

  const handleBuy = (e, gen) => {
    // ×Max se recalcule PAR générateur au moment du clic : la banque bouge vite
    const s = useGame.getState();
    const owned = s.generators[gen.id] || 0;
    const disc = getStaffMults({ staff: s.staff, upgrades: s.upgrades }).genCost;
    const n =
      amount === 'max' ? maxBuyable(gen, owned, s.endocraft, disc) : amount;
    if (n < 1 || !buyGenerator(gen.id, n)) return;
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
    <div className="space-y-2">
      {GENERATORS.map((gen) => {
        const owned = generators[gen.id] || 0;
        const count =
          amount === 'max'
            ? maxBuyable(gen, owned, endocraft, discount)
            : amount;
        // Le prix affiché est le coût TOTAL du lot (au moins 1 pour l'affichage)
        const cost = generatorsCost(gen, owned, Math.max(1, count), discount);
        const affordable = amount === 'max' ? count >= 1 : endocraft >= cost;
        const realRate = gen.baseRate * (genMult[gen.id] || 1);
        // Un générateur jamais acheté et trop cher reste mystérieux
        const hidden =
          owned === 0 && gen.baseCost > endocraft * 20 && gen.baseCost > 100;

        return (
          <button
            key={gen.id}
            onClick={(e) => handleBuy(e, gen)}
            disabled={!affordable}
            className={`shop-item ec-flash focus-ring w-full text-left ${
              affordable ? 'shop-item-affordable' : 'shop-item-locked'
            }`}
            title={gen.desc}
          >
            <span data-ec-icon className="icon-tile">
              {hidden ? (
                '❓'
              ) : (
                <GameIcon icon={gen.icon} alt={gen.name} className="h-9 w-9" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-bold text-ink">
                  {hidden ? '???' : gen.name}
                </span>
                {owned > 0 && (
                  <span
                    className="chip chip-accent shrink-0 tabular-nums"
                    title={`${owned} possédés — ${fmt(owned * realRate)} EndoCraft/s au total`}
                  >
                    <span key={owned} className="ec-count-bump">
                      ×{owned}
                    </span>
                  </span>
                )}
              </span>
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={`font-semibold tabular-nums ${
                    affordable ? 'text-accent-soft' : 'text-ink-3'
                  }`}
                >
                  🪙 {fmt(cost)}
                </span>
                <span className="text-2xs text-ink-3">
                  +{fmt(realRate)}/s chacun
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
