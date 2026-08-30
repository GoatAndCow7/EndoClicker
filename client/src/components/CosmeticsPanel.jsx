import { COIN_SKINS, TAGS, TAG_BY_ID, RARITIES } from '../game/constants';
import { useGame } from '../game/store';
import { fmt } from '../game/format';
import { fx } from '../game/fx';

export default function CosmeticsPanel() {
  const endocraft = useGame((s) => s.endocraft);
  const cosmetics = useGame((s) => s.cosmetics);
  const equippedCoin = useGame((s) => s.equippedCoin);
  const buyCosmetic = useGame((s) => s.buyCosmetic);
  const equipCoin = useGame((s) => s.equipCoin);
  const tags = useGame((s) => s.tags);
  const equippedTag = useGame((s) => s.equippedTag);
  const equipTag = useGame((s) => s.equipTag);

  const handleBuy = (e, id) => {
    if (buyCosmetic(id)) {
      fx.burst(e.clientX, e.clientY, { count: 24, power: 1.3 });
      fx.confetti();
    }
  };

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Cosmétiques
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Chaque skin apporte son <b>pouvoir unique</b> quand il est équipé — en
          plus de teinter tous les effets de vos clics.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {COIN_SKINS.map((skin) => {
          const owned = skin.cost === 0 || cosmetics.includes(skin.id);
          const equipped = equippedCoin === skin.id;
          const affordable = endocraft >= skin.cost;

          return (
            <div
              key={skin.id}
              className={`rounded-xl border p-4 text-center transition-colors ${
                equipped
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : owned
                    ? 'border-white/10 bg-white/5'
                    : affordable
                      ? 'border-ember-500/40 bg-ember-950/20'
                      : 'border-white/10 bg-black/30 opacity-70'
              }`}
            >
              {/* Aperçu du skin */}
              <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
                <div
                  className={`absolute inset-0 rounded-full blur-2xl ${
                    equipped || affordable
                      ? 'bg-ember-500/25'
                      : 'bg-white/5'
                  }`}
                />
                <img
                  src={skin.icon}
                  alt={skin.name}
                  draggable={false}
                  className={`relative h-24 w-24 object-contain ${
                    !owned ? 'grayscale-[0.5]' : ''
                  }`}
                  style={skin.imgFilter ? { filter: skin.imgFilter } : undefined}
                />
              </div>

              <p className="mt-2 font-bold">{skin.name}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                {skin.desc}
              </p>
              {skin.perk && (
                <p
                  className={`mt-1.5 text-[11px] font-semibold leading-snug ${
                    skin.perk.id
                      ? 'text-ember-300'
                      : 'text-slate-500'
                  }`}
                >
                  {skin.perk.id ? '⚡ ' : ''}
                  {skin.perk.label}
                </p>
              )}

              <div className="mt-3">
                {equipped ? (
                  <span className="inline-block rounded-lg border border-emerald-500/40 bg-emerald-600/15 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    ✓ Équipé
                  </span>
                ) : owned ? (
                  <button
                    onClick={() => equipCoin(skin.id)}
                    className="btn-ghost text-xs"
                  >
                    Équiper
                  </button>
                ) : skin.caseOnly ? (
                  <span className="inline-block rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-300">
                    🎁 Exclusif caisse
                  </span>
                ) : (
                  <button
                    onClick={(e) => handleBuy(e, skin.id)}
                    disabled={!affordable}
                    className={`btn text-xs ${
                      affordable
                        ? 'btn-primary'
                        : 'cursor-not-allowed bg-white/5 text-slate-400 opacity-60'
                    }`}
                  >
                    🪙 {fmt(skin.cost)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Tags de prestige (exclusifs cases) ---- */}
      <div className="px-1 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          🏷️ Tags de prestige
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Titres affichés à côté de votre pseudo au classement. Exclusifs des
          caisses 🎁.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => {
          const owned = (tags || []).includes(tag.id);
          const equipped = equippedTag === tag.id;
          const r = RARITIES[tag.rarity];
          return (
            <button
              key={tag.id}
              onClick={() => owned && equipTag(tag.id)}
              disabled={!owned}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                equipped
                  ? 'border-emerald-400/60 bg-emerald-600/20 text-emerald-200'
                  : owned
                    ? 'cursor-pointer text-slate-200 hover:bg-white/10'
                    : 'cursor-not-allowed text-slate-600'
              }`}
              style={{
                borderColor: owned ? r.color : undefined,
                background: owned ? `${r.color}18` : undefined,
                boxShadow: owned ? `0 0 10px ${r.glow}` : undefined,
              }}
            >
              {equipped ? '✓ ' : owned ? '' : '🔒 '}
              {tag.label}
              <span
                className="ml-1.5 text-[9px] uppercase tracking-wider"
                style={{ color: r.color }}
              >
                {r.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
