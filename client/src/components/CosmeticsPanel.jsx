import { COIN_SKINS, TAGS, RARITIES } from '../game/constants';
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

export default function CosmeticsPanel() {
  // Solde throttlé : la liste ne se re-rend pas à chaque clic (auto-clicker)
  const endocraft = useThrottledEndocraft();
  const cosmetics = useGame((s) => s.cosmetics);
  const equippedCoin = useGame((s) => s.equippedCoin);
  const buyCosmetic = useGame((s) => s.buyCosmetic);
  const equipCoin = useGame((s) => s.equipCoin);
  const tags = useGame((s) => s.tags);
  const equippedTag = useGame((s) => s.equippedTag);
  const equipTag = useGame((s) => s.equipTag);

  const handleBuy = (e, id) => {
    const card = e.currentTarget.closest('[data-ec-card]');
    if (!buyCosmetic(id)) return;
    fx.burst(e.clientX, e.clientY, { count: 24, power: 1.3 });
    fx.confetti();
    if (card) requestAnimationFrame(() => replay(card, 'is-flashing'));
  };

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="section-title">Cosmétiques</h2>
        <p className="mt-1 text-2xs text-ink-3">
          Chaque skin apporte son <b>pouvoir unique</b> quand il est équipé —
          en plus de teinter tous les effets de vos clics.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {COIN_SKINS.map((skin) => {
          const owned = skin.id === 'default' || cosmetics.includes(skin.id);
          const equipped = equippedCoin === skin.id;
          const affordable = !skin.caseOnly && endocraft >= skin.cost;

          return (
            <div
              key={skin.id}
              data-ec-card
              className={`relative flex flex-col rounded-xl border p-4 text-center transition-colors ec-flash ${
                equipped
                  ? 'border-success/50 bg-success-deep/30'
                  : owned
                    ? 'border-line/15 bg-surface/5'
                    : affordable
                      ? 'border-accent/40 bg-accent-overlay/20'
                      : 'shop-item-locked border-line/10 bg-void/30'
              }`}
            >
              {/* Aperçu du skin */}
              <div
                className={`relative mx-auto flex h-28 w-28 items-center justify-center ${
                  equipped ? 'rounded-full ring-2 ring-success/50' : ''
                }`}
              >
                <div
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{
                    backgroundColor:
                      skin.fx?.halo || 'rgb(var(--accent) / 0.25)',
                  }}
                />
                <img
                  src={skin.icon}
                  alt={skin.name}
                  draggable={false}
                  className={`relative h-28 w-28 object-contain drop-shadow-lg ${
                    owned ? '' : 'grayscale-[0.4]'
                  }`}
                  style={
                    skin.imgFilter ? { filter: skin.imgFilter } : undefined
                  }
                />
              </div>

              <p className="mt-2 font-bold text-ink">{skin.name}</p>
              <p className="mt-0.5 text-2xs leading-snug text-ink-3">
                {skin.desc}
              </p>
              {skin.perk && (
                <p className="mt-2 flex justify-center">
                  <span className="chip chip-warning max-w-full text-center leading-snug">
                    {skin.perk.id ? '⚡ ' : ''}
                    {skin.perk.label}
                  </span>
                </p>
              )}

              <div className="mt-3 flex flex-1 flex-col justify-end">
                {equipped ? (
                  <span className="chip chip-success mx-auto">✓ Équipé</span>
                ) : owned ? (
                  <button
                    onClick={() => equipCoin(skin.id)}
                    className="btn btn-primary focus-ring h-11 w-full text-2xs md:h-9"
                  >
                    Équiper
                  </button>
                ) : skin.caseOnly ? (
                  <p className="empty-state py-2 text-2xs">
                    🎁 Exclusif caisse de l’End
                  </p>
                ) : affordable ? (
                  <button
                    onClick={(e) => handleBuy(e, skin.id)}
                    className="btn btn-primary focus-ring h-11 w-full text-2xs md:h-9"
                  >
                    Acheter — 🪙 {fmt(skin.cost)}
                  </button>
                ) : (
                  <p className="text-2xs font-semibold tabular-nums text-accent-soft">
                    🪙 {fmt(skin.cost)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Tags de prestige (exclusifs cases) ---- */}
      <div className="px-1 pt-2">
        <h2 className="section-title">Tags de prestige</h2>
        <p className="mt-1 text-2xs text-ink-3">
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
              className={`focus-ring rarity-${tag.rarity} h-11 md:h-9 rounded-full border px-3 text-2xs font-bold transition-colors ${
                owned ? 'rarity-text' : 'border-line/15 text-ink-4'
              }`}
              style={
                owned
                  ? {
                      borderColor: 'rgb(var(--rc) / 0.55)',
                      background: 'rgb(var(--rc) / 0.1)',
                      ...(equipped
                        ? { boxShadow: '0 0 10px rgb(var(--rc) / 0.4)' }
                        : {}),
                    }
                  : undefined
              }
            >
              {equipped && (
                <span className="chip chip-accent -ml-1 mr-1 px-1.5">✓</span>
              )}
              {owned ? '' : '🔒 '}
              {tag.label}
              <span
                className="ml-1.5 text-3xs font-semibold uppercase tracking-wider opacity-80"
                style={{ color: owned ? 'rgb(var(--rc))' : undefined }}
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
