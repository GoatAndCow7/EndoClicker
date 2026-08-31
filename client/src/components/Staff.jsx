import { STAFF } from '../game/constants';
import { useGame } from '../game/store';
import { useThrottledEndocraft } from '../game/hooks';
import { fmt } from '../game/format';
import { fx } from '../game/fx';

// Relance une animation CSS (remove → reflow → add), après le
// re-rendu React déclenché par l'achat.
const replay = (el, cls) => {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
};

export default function Staff() {
  // Solde throttlé : la liste ne se re-rend pas à chaque clic (auto-clicker)
  const endocraft = useThrottledEndocraft();
  const staff = useGame((s) => s.staff);
  const buyStaff = useGame((s) => s.buyStaff);

  const handleBuy = (e, id) => {
    const row = e.currentTarget;
    if (!buyStaff(id)) return;
    fx.burst(e.clientX, e.clientY, { count: 18, power: 1.2 });
    requestAnimationFrame(() => {
      replay(row, 'is-flashing');
      const head = row.querySelector('[data-ec-icon]');
      if (head) replay(head, 'ec-icon-pop');
    });
  };

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="section-title">L’Équipe — améliorations spéciales</h2>
        <p className="mt-1 text-2xs text-ink-3">
          Recrutez le staff du serveur : chaque membre apporte son bonus (ou
          son malus) définitivement.
        </p>
        <p className="mt-0.5 text-2xs text-ink-4">
          Du moins cher au plus cher — même KendiiX à 1 EndoCraft.
        </p>
      </div>

      {STAFF.map((m) => {
        const owned = staff.includes(m.id);
        const affordable = endocraft >= m.cost;

        return (
          <button
            key={m.id}
            onClick={(e) => handleBuy(e, m.id)}
            disabled={owned || !affordable}
            className={`shop-item focus-ring ec-flash w-full text-left ${
              owned
                ? 'shop-item-owned'
                : affordable
                  ? 'shop-item-affordable'
                  : 'shop-item-locked'
            }`}
          >
            {/* Tête du joueur */}
            <img
              src={m.icon}
              alt={m.pseudo}
              draggable={false}
              data-ec-icon
              className={`pixelated h-14 w-14 shrink-0 rounded-lg object-cover ring-2 ${
                m.malus ? 'ring-danger/30' : owned ? 'ring-line/10' : 'ring-line/5'
              } ${owned ? '' : 'grayscale-[0.4]'}`}
            />

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate font-bold text-ink">{m.pseudo}</span>
                <span className={`${m.roleClass} shrink-0`}>{m.role}</span>
              </span>
              <span className="mt-0.5 block text-2xs leading-snug text-ink-3">
                {m.desc}
              </span>
              <span
                className={`mt-0.5 block text-2xs font-semibold ${
                  m.malus ? 'text-danger' : 'text-success'
                }`}
              >
                {m.effectLabel}
              </span>
            </span>

            <span className="shrink-0 text-right">
              {owned ? (
                <span className="chip chip-success">✓ Recruté</span>
              ) : (
                <span className="text-sm font-semibold tabular-nums text-accent-soft">
                  🪙 {fmt(m.cost)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
