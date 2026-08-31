import { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { fmt } from '../game/format';
import {
  CASES,
  CASE_UPGRADES,
  RARITIES,
  COIN_SKIN_BY_ID,
  TAG_BY_ID,
} from '../game/constants';
import { fx } from '../game/fx';
import { playLand, playLegendary } from '../game/audio';
import GameIcon from './GameIcon.jsx';

const UPGRADE_BY_ID = Object.fromEntries(CASE_UPGRADES.map((u) => [u.id, u]));

const CARD_W = 128;
const CARD_GAP = 10;
const STRIP_LEN = 68;
const WINNER_INDEX = 43;
const SPIN_MS = 6400;
const SPIN_EASE = 'cubic-bezier(0.12, 0.68, 0.04, 1)';
const STAGGER_MS = 120;
const SKIP_MS = 450;
const SKIP_FINISH_MS = 500;
const SKIP_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const RARITY_ORDER = { commun: 0, rare: 1, epique: 2, legendaire: 3 };

const rarityClass = (r) => (RARITIES[r] ? `rarity-${r}` : 'rarity-commun');

// Représentation affichable d'un drop (carte du rouleau, révélation, modal)
function dropView(drop) {
  if (!drop) return { emoji: '❓', name: '—' };
  const dupText = `Doublon — vous le possédiez déjà. Remboursé : +${fmt(
    drop.duplicateCash || 0
  )} EndoCraft.`;
  if (drop.type === 'upgrade') {
    const u = UPGRADE_BY_ID[drop.upgradeId];
    return {
      rarity: drop.rarity,
      icon: u?.icon,
      emoji: null,
      name: u?.name || drop.upgradeId,
      desc: u?.desc,
      reward: drop.duplicate ? dupText : null,
    };
  }
  if (drop.type === 'skin') {
    const sk = COIN_SKIN_BY_ID[drop.skinId];
    return {
      rarity: drop.rarity,
      icon: null,
      emoji: '🪙',
      name: sk?.name || drop.skinId,
      desc: sk?.desc,
      reward: drop.duplicate
        ? dupText
        : 'Skin équipable dans l’onglet Cosmétiques — effets assortis inclus.',
    };
  }
  if (drop.type === 'tag') {
    const tag = TAG_BY_ID[drop.tagId];
    return {
      rarity: drop.rarity,
      icon: null,
      emoji: '🏷️',
      name: tag?.label || drop.tagId,
      desc: 'Tag de prestige affiché à côté de votre pseudo au classement et sur votre profil.',
      reward: drop.duplicate ? dupText : 'Équipable dans l’onglet Cosmétiques.',
    };
  }
  if (drop.type === 'nothing') {
    return {
      rarity: drop.rarity,
      icon: null,
      emoji: '🕳️',
      name: drop.label,
      desc: 'Vous avez payé pour rien. C’est la magie des caisses.',
      reward: null,
    };
  }
  if (drop.type === 'bank') {
    return {
      rarity: drop.rarity,
      icon: null,
      emoji: '🏦',
      name: drop.label,
      desc: 'Un pourcentage de votre banque actuelle, versé immédiatement.',
      reward: null,
    };
  }
  if (drop.type === 'cash') {
    return {
      rarity: drop.rarity,
      icon: null,
      emoji: '💰',
      name: drop.label,
      desc: 'Des EndoCraft versés immédiatement sur votre solde, sans condition.',
      reward: null,
    };
  }
  if (drop.type === 'frenzy') {
    return {
      rarity: drop.rarity,
      icon: null,
      emoji: '🔥',
      name: drop.label,
      desc: 'Frénésie ×7 appliquée immédiatement — cliquez comme un damné.',
      reward: null,
    };
  }
  if (drop.type === 'rain') {
    return {
      rarity: drop.rarity,
      icon: null,
      emoji: '🌧️',
      name: drop.label,
      desc: 'Une pluie de pommes déclenchée sur-le-champ : attrapez-les !',
      reward: null,
    };
  }
  return { rarity: drop.rarity, icon: null, emoji: '🪙', name: drop.label, desc: '', reward: null };
}

function bestOf(list) {
  return (list || []).filter(Boolean).reduce(
    (best, d) =>
      (RARITY_ORDER[d.rarity] || 0) > (RARITY_ORDER[best?.rarity] || 0)
        ? d
        : best,
    null
  );
}

// Carte du rouleau : la variable --ec-win-c sert au halo injecté à l'atterrissage
function ReelCard({ view, small = false }) {
  const r = RARITIES[view.rarity] || RARITIES.commun;
  return (
    <div
      className={`rarity-card ${rarityClass(view.rarity)} relative flex shrink-0 flex-col items-center justify-center p-2 text-center`}
      style={{
        width: small ? 96 : CARD_W,
        height: small ? 112 : 150,
        ['--ec-win-c']: r.color,
      }}
    >
      {view.icon ? (
        <GameIcon
          icon={view.icon}
          alt={view.name}
          className={small ? 'h-9 w-9' : 'h-14 w-14'}
        />
      ) : (
        <span className={small ? 'text-2xl' : 'text-4xl'}>
          {view.emoji || '🪙'}
        </span>
      )}
      <p
        className={`mt-2 line-clamp-2 font-bold leading-tight text-ink ${
          small ? 'text-4xs' : 'text-3xs'
        }`}
      >
        {view.name}
      </p>
      <p
        className={`rarity-text font-bold uppercase tracking-wider ${
          small ? 'text-4xs' : 'text-3xs'
        }`}
      >
        {r.label}
      </p>
    </div>
  );
}

// Modal du contenu possible : liste cliquable, détail visible aussi sur mobile
function ContentsModal({ box, onClose }) {
  const [selected, setSelected] = useState(0);
  const total = box.drops.reduce((a, d) => a + d.weight, 0);
  const sel = box.drops[selected] || box.drops[0];
  const selView = dropView(sel);
  const selR = RARITIES[sel.rarity] || RARITIES.commun;
  const selPct = Math.round((sel.weight / total) * 100);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card h-[85vh] max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 className="modal-title">
            <GameIcon icon={box.icon} alt="" className="h-5 w-5" />
            {box.name} — contenu & probabilités
          </h3>
          <button onClick={onClose} className="modal-x" aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="modal-body flex flex-col p-0 sm:flex-row">
          {/* Liste des drops */}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
            {box.drops.map((d, i) => {
              const r = RARITIES[d.rarity] || RARITIES.commun;
              const v = dropView(d);
              const pct = Math.round((d.weight / total) * 100);
              return (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`list-row focus-ring min-h-12 w-full gap-3 px-3 py-2 transition-colors ${
                    selected === i
                      ? 'border-accent/40 bg-surface/10'
                      : 'hover:bg-surface/10'
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: r.color }}
                    aria-hidden="true"
                  />
                  {v.icon ? (
                    <GameIcon icon={v.icon} alt="" className="h-8 w-8 shrink-0" />
                  ) : (
                    <span className="w-8 shrink-0 text-center text-xl">{v.emoji}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-2xs font-semibold text-ink">
                    {v.name}
                  </span>
                  <span className="w-14 shrink-0 text-right text-3xs tabular-nums text-ink-3">
                    {pct} %
                  </span>
                </button>
              );
            })}
          </div>

          {/* Détail du drop sélectionné — visible aussi sur mobile */}
          <div className="w-full shrink-0 overflow-y-auto border-t border-line/10 p-4 sm:w-72 sm:border-l sm:border-t-0">
            <div
              className={`rarity-wash ${rarityClass(sel.rarity)} flex flex-col items-center gap-1 rounded-xl p-3 text-center`}
            >
              {selView.icon ? (
                <GameIcon
                  icon={selView.icon}
                  alt={selView.name}
                  className="h-14 w-14"
                />
              ) : (
                <span className="text-5xl">{selView.emoji}</span>
              )}
              <p className="mt-2 text-sm font-extrabold text-ink">{selView.name}</p>
              <span className={`badge-rarity ${rarityClass(sel.rarity)} text-3xs`}>
                {selR.label}
              </span>
              <div className="mt-2 w-full">
                <div className="label-caps mb-1 flex items-center justify-between">
                  <span>Chance</span>
                  <span className="tabular-nums text-ink-2">{selPct} %</span>
                </div>
                <div className="progress-bar h-1.5">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${selPct}%` }}
                  />
                </div>
              </div>
            </div>
            {selView.desc && (
              <p className="mt-3 text-left text-xs leading-relaxed text-ink-2">
                {selView.desc}
              </p>
            )}
            {selView.reward && (
              <p className="mt-2 rounded-lg bg-surface/5 p-2 text-left text-2xs leading-relaxed text-accent-soft">
                {selView.reward}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal d'ouverture : un rouleau par caisse (jusqu'à 5 en parallèle)
function CaseOpeningModal({ box, count = 1, onDone }) {
  const openCase = useGame((s) => s.openCase);
  const [phase, setPhase] = useState('spin'); // spin → reveal
  const [skipFast, setSkipFast] = useState(false);
  const [drops, setDrops] = useState(null);
  const [detail, setDetail] = useState(null);
  const [offsets, setOffsets] = useState(Array(count).fill(0));
  const stripRefs = useRef([]);
  const paidRef = useRef(false);
  const finishedRef = useRef(false);
  const skipFastRef = useRef(false);
  const landedRef = useRef(new Set());
  const resultsRef = useRef(null);
  const targetsRef = useRef(Array(count).fill(0));

  // Les résultats sont tirés à l'ouverture ; les rouleaux sont construits autour
  const strips = useMemo(() => {
    const total = box.drops.reduce((a, d) => a + d.weight, 0);
    const pick = () => {
      let roll = Math.random() * total;
      for (const d of box.drops) {
        roll -= d.weight;
        if (roll <= 0) return d;
      }
      return box.drops[0];
    };
    return Array.from({ length: count }, () =>
      Array.from({ length: STRIP_LEN }, (_, i) =>
        i === WINNER_INDEX ? 'WINNER' : pick()
      )
    );
  }, [box, count]);

  // Atterrissage d'un rouleau : secousse de la ligne + halo sur la carte gagnante
  const land = (si) => {
    if (landedRef.current.has(si)) return;
    landedRef.current.add(si);
    const strip = stripRefs.current[si];
    const row = strip?.parentElement;
    if (row && !skipFastRef.current) {
      row.classList.remove('ec-reel-land');
      void row.offsetWidth;
      row.classList.add('ec-reel-land');
    }
    const card = strip?.children[WINNER_INDEX];
    if (card) {
      card.classList.add('ec-win-flash');
      const glow = document.createElement('span');
      glow.className = 'ec-win-glow is-on';
      card.appendChild(glow);
    }
    playLand();
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase('reveal');
    const best = bestOf(resultsRef.current);
    if (best?.rarity === 'legendaire') {
      fx.confetti();
      playLegendary();
      fx.burst(window.innerWidth / 2, window.innerHeight / 2, { count: 24 });
    }
  };

  // Paiement une seule fois (StrictMode rejoue les effets de montage)
  // + chorégraphie des rouleaux. Les null (solde insuffisant en cours
  // de boucle ×2/×5) restent en place pour l'alignement des rouleaux
  // et sont filtrés à l'affichage.
  useEffect(() => {
    if (!paidRef.current) {
      paidRef.current = true;
      const results = [];
      for (let i = 0; i < count; i++) results.push(openCase(box.id));
      resultsRef.current = results;
      setDrops(results);
    }

    const newTargets = Array.from({ length: count }, (_, i) => {
      const containerW =
        stripRefs.current[i]?.parentElement?.clientWidth || 600;
      const jitter = (Math.random() - 0.5) * (CARD_W * 0.55);
      return (
        WINNER_INDEX * (CARD_W + CARD_GAP) + CARD_W / 2 - containerW / 2 + jitter
      );
    });
    targetsRef.current = newTargets;

    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setOffsets(newTargets));
    });
    const t = setTimeout(
      () => {
        for (let si = 0; si < count; si++) land(si);
        finish();
      },
      SPIN_MS + 250 + (count - 1) * STAGGER_MS
    );
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skip en douceur : transition courte vers la cible, puis révélation
  const skip = () => {
    if (finishedRef.current) return;
    skipFastRef.current = true;
    setSkipFast(true);
    setOffsets(targetsRef.current);
    setTimeout(finish, SKIP_FINISH_MS);
  };

  // Escape : passe l'animation pendant le tirage, récupère à la révélation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (phase === 'spin') skip();
      else onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const wonDrops = useMemo(() => (drops || []).filter(Boolean), [drops]);
  const bestDrop = bestOf(wonDrops);
  const bestR = bestDrop ? RARITIES[bestDrop.rarity] || RARITIES.commun : null;
  const compact = count > 2;
  const flashColor = bestDrop
    ? (RARITIES[bestDrop.rarity] || RARITIES.commun).color
    : RARITIES.commun.color;

  const transition = skipFast
    ? `transform ${SKIP_MS}ms ${SKIP_EASE}`
    : `transform ${SPIN_MS}ms ${SPIN_EASE}`;

  return (
    <>
      <div
        className="modal-backdrop"
        onClick={() => (phase === 'spin' ? skip() : onDone())}
      >
        <div
          className="modal-card relative max-w-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-head">
            <h3 className="modal-title">
              <GameIcon icon={box.icon} alt="" className="h-5 w-5" />
              Ouverture… ×{count}
            </h3>
            <button
              onClick={() => (phase === 'spin' ? skip() : onDone())}
              className="modal-x"
              aria-label={phase === 'spin' ? "Passer l'animation" : 'Fermer'}
            >
              ✕
            </button>
          </div>

          <div className="modal-body space-y-3">
            {/* Rouleaux parallèles */}
            <div className="space-y-2">
              {strips.map((strip, si) => (
                <div
                  key={si}
                  className={`relative overflow-hidden rounded-xl border border-line/10 bg-void/50 ${
                    compact ? 'py-2' : 'py-3'
                  }`}
                >
                  <div
                    className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-0.5 -translate-x-1/2 bg-accent shadow-glow"
                    aria-hidden="true"
                  />
                  <div
                    ref={(el) => (stripRefs.current[si] = el)}
                    className="flex will-change-transform"
                    style={{
                      gap: CARD_GAP,
                      transform: `translateX(-${offsets[si]}px)`,
                      transition,
                      transitionDelay: skipFast ? '0ms' : `${si * STAGGER_MS}ms`,
                    }}
                    onTransitionEnd={(e) => {
                      if (
                        e.propertyName === 'transform' &&
                        e.target === e.currentTarget
                      ) {
                        land(si);
                      }
                    }}
                  >
                    {strip.map((d, i) => (
                      <ReelCard
                        key={i}
                        small={compact}
                        view={
                          d === 'WINNER' ? dropView(drops?.[si]) : dropView(d)
                        }
                      />
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-void via-void/70 to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-void via-void/70 to-transparent" />
                </div>
              ))}
            </div>

            {/* Révélation : résumé de tous les drops */}
            {phase === 'reveal' && drops && (
              <div className="ec-tab-enter">
                <div className="flex flex-wrap items-start justify-center gap-2">
                  {wonDrops.map((d, i) => {
                    const view = dropView(d);
                    const r = RARITIES[d.rarity] || RARITIES.commun;
                    return (
                      <button
                        key={i}
                        onClick={() => setDetail({ drop: d })}
                        title="Voir les détails"
                        className={`rarity-card ${rarityClass(d.rarity)} focus-ring ec-reveal-in relative flex cursor-pointer flex-col items-center p-2 text-center transition-transform hover:-translate-y-0.5`}
                        style={{
                          animationDelay: `${i * 70}ms`,
                          width: compact ? 92 : 112,
                        }}
                      >
                        {view.icon ? (
                          <GameIcon
                            icon={view.icon}
                            alt={view.name}
                            className={compact ? 'h-8 w-8' : 'h-10 w-10'}
                          />
                        ) : (
                          <span className={compact ? 'text-xl' : 'text-2xl'}>
                            {view.emoji}
                          </span>
                        )}
                        <p className="mt-1 line-clamp-2 text-3xs font-bold leading-tight text-ink">
                          {view.name}
                        </p>
                        <span
                          className={`badge-rarity ${rarityClass(d.rarity)} mt-1 text-3xs`}
                        >
                          {r.label}
                        </span>
                        {d.duplicate && (
                          <span className="mt-1 text-4xs tabular-nums text-accent-soft">
                            💸 +{fmt(d.duplicateCash || 0)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {bestDrop && (
                  <p
                    className={`rarity-glow-text ${rarityClass(bestDrop.rarity)} mt-3 text-center text-base font-extrabold`}
                  >
                    Meilleur tirage : {dropView(bestDrop).name} ({bestR.label})
                  </p>
                )}
                <p className="mt-1 text-center text-3xs text-ink-4">
                  💡 Cliquez sur un item pour voir ses détails
                </p>
              </div>
            )}
          </div>

          {phase === 'spin' ? (
            <div className="modal-foot justify-center">
              <p className="animate-pulse text-2xs text-ink-3">
                La chance tourne…
              </p>
              <button
                onClick={skip}
                className="btn btn-ghost focus-ring h-11 text-2xs md:h-10"
                title="Passer l'animation"
              >
                ⏭ Passer
              </button>
            </div>
          ) : (
            <div className="modal-foot">
              <button
                onClick={onDone}
                className="btn btn-primary focus-ring h-11 w-full md:h-10 sm:w-auto"
              >
                Récupérer
              </button>
            </div>
          )}

          {/* Flash de rareté au passage en révélation (épique/légendaire) */}
          {phase === 'reveal' &&
            bestDrop &&
            (bestDrop.rarity === 'epique' || bestDrop.rarity === 'legendaire') && (
              <span
                className="ec-rarity-flash"
                style={{ ['--ec-win-c']: flashColor }}
              />
            )}
        </div>
      </div>

      {/* Modal détail d'un item gagné */}
      {detail && phase === 'reveal' && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 60 }}
          onClick={() => setDetail(null)}
        >
          <div
            className="modal-card max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const view = dropView(detail.drop);
              const r =
                RARITIES[detail.drop?.rarity] || RARITIES.commun;
              const total = box.drops.reduce((a, d) => a + d.weight, 0);
              const pct = Math.round((detail.drop.weight / total) * 100);
              return (
                <>
                  <div className="modal-body flex flex-col items-center p-5 text-center">
                    <div
                      className={`rarity-card ${rarityClass(detail.drop?.rarity)} flex h-20 w-20 items-center justify-center`}
                      style={{ ['--ec-win-c']: r.color }}
                    >
                      {view.icon ? (
                        <GameIcon
                          icon={view.icon}
                          alt={view.name}
                          className="h-14 w-14"
                        />
                      ) : (
                        <span className="text-5xl">{view.emoji}</span>
                      )}
                    </div>
                    <p className="mt-3 text-base font-extrabold text-ink">
                      {view.name}
                    </p>
                    <span
                      className={`badge-rarity ${rarityClass(detail.drop?.rarity)} mt-1 text-3xs`}
                    >
                      {r.label} — {pct} %
                    </span>
                    {view.desc && (
                      <p className="mt-3 text-xs leading-relaxed text-ink-2">
                        {view.desc}
                      </p>
                    )}
                    {view.reward && (
                      <p className="mt-2 rounded-lg bg-surface/5 p-2 text-2xs font-semibold leading-relaxed text-accent-soft">
                        {view.reward}
                      </p>
                    )}
                  </div>
                  <div className="modal-foot">
                    <button
                      className="btn btn-ghost focus-ring h-11 w-full text-2xs md:h-10"
                      onClick={() => setDetail(null)}
                    >
                      Fermer
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

// Panneau des caisses
export default function CasesPanel() {
  const endocraft = useGame((s) => s.endocraft);
  const casesOpened = useGame((s) => s.casesOpened);
  const [opening, setOpening] = useState(null);
  const [contents, setContents] = useState(null);

  return (
    <div className="space-y-3">
      <div className="px-1">
        <h2 className="section-title">🎁 Caisses</h2>
        <p className="mt-1 text-2xs text-ink-3">
          Des améliorations, skins et tags{' '}
          <b className="text-accent-soft">EXCLUSIFS</b> qui ne sortent qu'ici —
          introuvables en boutique. Doublons remboursés en cash (15-25 % du
          prix).
        </p>
      </div>

      {CASES.map((box) => {
        const rarities = Object.keys(RARITIES).filter((r) =>
          box.drops.some((d) => d.rarity === r)
        );
        return (
          <div
            key={box.id}
            className="list-row gap-4 p-3 transition-colors hover:border-accent/30"
          >
            {/* La caisse en grand, sans encadré, proportions d'origine */}
            <img
              src={box.icon}
              alt={box.name}
              draggable={false}
              className="h-24 w-auto shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] lg:h-28"
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-ink">{box.name}</p>
              <p className="mt-0.5 text-2xs leading-snug text-ink-3">
                {box.desc}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5" aria-hidden="true">
                {rarities.map((r) => (
                  <span
                    key={r}
                    className="h-2 w-2 rounded-full"
                    style={{ background: RARITIES[r].color }}
                  />
                ))}
              </div>
              <button
                onClick={() => setContents(box)}
                className="btn btn-ghost focus-ring mt-2 h-11 text-2xs md:h-9"
              >
                Voir le contenu et les probabilités ({box.drops.length} prix)
              </button>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {[1, 2, 5].map((n) => {
                const can = endocraft >= box.cost * n;
                return (
                  <button
                    key={n}
                    onClick={() => can && setOpening({ box, count: n })}
                    disabled={!can}
                    className={`focus-ring h-11 w-24 justify-center text-2xs md:h-10 ${
                      can
                        ? n === 1
                          ? 'btn btn-primary'
                          : 'btn btn-ghost border-accent/40 text-accent-bright'
                        : 'btn cursor-not-allowed bg-surface/5 text-ink-3 opacity-60'
                    }`}
                    title={
                      n === 1
                        ? 'Ouvrir 1 caisse'
                        : `Ouvrir ${n} caisses d'un coup (${fmt(box.cost * n)})`
                    }
                  >
                    ×{n}{' '}
                    <span className="tabular-nums opacity-70">
                      🪙 {fmt(box.cost * n)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="px-1 text-center text-3xs text-ink-4">
        {casesOpened > 0
          ? `${casesOpened} caisse${casesOpened > 1 ? 's' : ''} ouverte${casesOpened > 1 ? 's' : ''} à ce jour.`
          : 'La première caisse est toujours la meilleure. C’est scientifique.'}
      </p>

      {contents && (
        <ContentsModal box={contents} onClose={() => setContents(null)} />
      )}
      {opening && (
        <CaseOpeningModal
          box={opening.box}
          count={opening.count}
          onDone={() => setOpening(null)}
        />
      )}
    </div>
  );
}
