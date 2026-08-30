import { useState } from 'react';
import { GENERATORS, UPGRADES } from '../game/constants';
import { useGame, generatorsCost, getStaffMults } from '../game/store';
import { fmt } from '../game/format';
import { fx } from '../game/fx';
import GameIcon from './GameIcon.jsx';

const BUY_AMOUNTS = [1, 10, 100];

export default function Shop() {
  const [amount, setAmount] = useState(1);
  const endocraft = useGame((s) => s.endocraft);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const staff = useGame((s) => s.staff);
  const buyGenerator = useGame((s) => s.buyGenerator);

  const discount = getStaffMults({ staff }).genCost;

  // Multiplicateurs par générateur (pour l'affichage du taux réel)
  const genMult = {};
  for (const u of UPGRADES) {
    if (u.kind === 'gen' && upgrades.includes(u.id)) {
      genMult[u.genId] = (genMult[u.genId] || 1) * u.mult;
    }
  }

  const handleBuy = (e, gen) => {
    const owned = generators[gen.id] || 0;
    if (buyGenerator(gen.id, amount)) {
      fx.purchase(e.clientX, e.clientY);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Générateurs
        </h2>
        <div className="flex gap-1 rounded-lg bg-black/30 p-0.5">
          {BUY_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(a)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                amount === a
                  ? 'bg-ember-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ×{a}
            </button>
          ))}
        </div>
      </div>

      {GENERATORS.map((gen) => {
        const owned = generators[gen.id] || 0;
        const cost = generatorsCost(gen, owned, amount, discount);
        const affordable = endocraft >= cost;
        const realRate = gen.baseRate * (genMult[gen.id] || 1);
        // Un générateur jamais acheté et trop cher reste mystérieux
        const hidden = owned === 0 && gen.baseCost > endocraft * 20 && gen.baseCost > 100;

        return (
          <button
            key={gen.id}
            onClick={(e) => handleBuy(e, gen)}
            disabled={!affordable}
            className={`shop-item w-full text-left ${
              affordable ? 'shop-item-affordable' : 'shop-item-locked'
            }`}
            title={gen.desc}
          >
            {/* Texture de l'item (ou emoji) */}
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/40 text-2xl ring-1 ring-white/10">
              {hidden ? '❓' : <GameIcon icon={gen.icon} alt={gen.name} className="h-9 w-9" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate font-bold">
                  {hidden ? '???' : gen.name}
                </span>
                {owned > 0 && (
                  <span className="shrink-0 rounded-full bg-ember-600/25 px-2 py-0.5 text-xs font-bold text-ember-200">
                    ×{owned}
                    <span
                      className="ml-1 font-semibold text-ember-300/90"
                      title="Production totale de vos exemplaires"
                    >
                      · {fmt(owned * realRate)}/s
                    </span>
                  </span>
                )}
              </span>
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className={affordable ? 'font-semibold text-ember-300' : 'text-slate-400'}>
                  🪙 {fmt(cost)}
                </span>
                <span className="text-xs text-slate-400">
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
