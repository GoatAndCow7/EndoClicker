import { STAFF } from '../game/constants';
import { useGame } from '../game/store';
import { fmt } from '../game/format';
import { fx } from '../game/fx';

export default function Staff() {
  const endocraft = useGame((s) => s.endocraft);
  const staff = useGame((s) => s.staff);
  const buyStaff = useGame((s) => s.buyStaff);

  const handleBuy = (e, id) => {
    if (buyStaff(id)) {
      fx.burst(e.clientX, e.clientY, { count: 18, power: 1.2 });
    }
  };

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          L’Équipe — améliorations spéciales
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Recrutez le staff du serveur : chaque membre apporte son bonus (ou son
          malus) définitivement.
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
            className={`shop-item w-full text-left ${
              owned
                ? 'border-emerald-500/40 bg-emerald-950/20'
                : affordable
                  ? 'shop-item-affordable'
                  : 'shop-item-locked'
            }`}
          >
            {/* Tête du joueur */}
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/40 ring-2 ${
                m.malus ? 'ring-slate-600/60' : 'ring-white/15'
              }`}
            >
              <img
                src={m.icon}
                alt={m.pseudo}
                draggable={false}
                className={`pixelated h-full w-full object-cover ${
                  m.malus && !owned ? 'grayscale-[0.4]' : ''
                }`}
              />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-bold">{m.pseudo}</span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.roleClass}`}
                >
                  {m.role}
                </span>
              </span>
              <span className="block truncate text-xs text-slate-400">{m.desc}</span>
              <span
                className={`block text-xs font-semibold ${
                  m.malus ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {m.effectLabel}
              </span>
            </span>

            <span className="shrink-0 text-right">
              {owned ? (
                <span className="text-xs font-bold text-emerald-400">
                  ✓ Recruté
                </span>
              ) : (
                <span
                  className={`text-sm font-bold ${
                    affordable ? 'text-ember-300' : 'text-slate-400'
                  }`}
                >
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
