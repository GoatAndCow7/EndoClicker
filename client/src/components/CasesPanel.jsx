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
import { playAchievement } from '../game/audio';
import GameIcon from './GameIcon.jsx';

const UPGRADE_BY_ID = Object.fromEntries(CASE_UPGRADES.map((u) => [u.id, u]));

const CARD_W = 128;
const CARD_GAP = 10;
const STRIP_LEN = 68;
const WINNER_INDEX = 43;
const SPIN_MS = 6200;

// Représentation affichable d'un drop (carte du rouleau, révélation, modal)
function dropView(drop) {
  if (drop.type === 'upgrade') {
    const u = UPGRADE_BY_ID[drop.upgradeId];
    return {
      rarity: drop.rarity,
      icon: u?.icon,
      emoji: null,
      name: u?.name || drop.upgradeId,
      desc: u?.desc,
      reward: drop.duplicate
        ? 'Doublon — vous le possédiez déjà'
        : null,
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
        ? 'Doublon — vous le possédiez déjà'
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
      reward: drop.duplicate
        ? 'Doublon — vous le possédiez déjà'
        : 'Équipable dans l’onglet Cosmétiques.',
    };
  }
if (drop.type === 'nothing') {    return {      rarity: drop.rarity,      icon: null,      emoji: '🕳️',      name: drop.label,      desc: 'Vous avez payé pour rien. C’est la magie des caisses.',      reward: null,    };  }
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

function ReelCard({ view, small = false }) {
  const r = RARITIES[view.rarity] || RARITIES.commun;
  return (
    <div
      className="flex shrink-0 flex-col items-center justify-center rounded-xl border-2 p-2 text-center"
      style={{
        width: small ? 96 : CARD_W,
        height: small ? 112 : 150,
        borderColor: r.color,
        background: `linear-gradient(180deg, ${r.color}22 0%, rgba(0,0,0,0.5) 100%)`,
        boxShadow: `inset 0 0 24px ${r.glow}`,
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
        className={`mt-2 line-clamp-2 font-bold leading-tight text-slate-100 ${
          small ? 'text-[9px]' : 'text-[11px]'
        }`}
      >
        {view.name}
      </p>
      <p
        className={`font-semibold uppercase tracking-wider ${small ? 'text-[7px]' : 'text-[9px]'}`}
        style={{ color: r.color }}
      >
        {r.label}
      </p>
    </div>
  );
}

// Modal du contenu possible : liste cliquable avec détails au clic
function ContentsModal({ box, onClose }) {
  const [selected, setSelected] = useState(0);
  const total = box.drops.reduce((a, d) => a + d.weight, 0);
  const sel = box.drops[selected];
  const selView = dropView(sel);
  const selR = RARITIES[sel.rarity];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="panel flex h-[85vh] max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-3">
          <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-ember-300">
            <GameIcon icon={box.icon} alt="" className="h-6 w-6" />
            {box.name} — contenu
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Liste des drops */}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
            {box.drops.map((d, i) => {
              const r = RARITIES[d.rarity];
              const v = dropView(d);
              return (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    selected === i ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: r.color }}
                  />
                  {v.icon ? (
                    <GameIcon icon={v.icon} alt="" className="h-8 w-8 shrink-0" />
                  ) : (
                    <span className="w-8 shrink-0 text-center text-xl">{v.emoji}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-200">
                    {v.name}
                  </span>
                  <span
                    className="shrink-0 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: r.color }}
                  >
                    {r.label}
                  </span>
                  <span className="w-12 shrink-0 text-right text-sm tabular-nums text-slate-300">
                    {Math.round((d.weight / total) * 100)} %
                  </span>
                </button>
              );
            })}
          </div>

          {/* Détail du drop sélectionné */}
          <div
            className="hidden w-64 shrink-0 flex-col items-center justify-center border-l border-white/10 p-6 text-center sm:flex"
            style={{ background: `${selR.color}0d` }}
          >
            {selView.icon ? (
              <GameIcon
                icon={selView.icon}
                alt={selView.name}
                className="h-24 w-24"
              />
            ) : (
              <span className="text-7xl">{selView.emoji}</span>
            )}
            <p className="mt-4 text-base font-extrabold text-slate-100">
              {selView.name}
            </p>
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: selR.color }}
            >
              {selR.label} — {Math.round((sel.weight / total) * 100)} %
            </p>
            <p className="mt-3 text-sm leading-snug text-slate-300">
              {selView.desc}
            </p>
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
  const [skipped, setSkipped] = useState(false);
  const [drops, setDrops] = useState(null);
  const [detail, setDetail] = useState(null);
  const [offsets, setOffsets] = useState(Array(count).fill(0));
  const stripRefs = useRef([]);

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

  const targetsRef = useRef(Array(count).fill(0));

  useEffect(() => {
    const results = [];
    for (let i = 0; i < count; i++) results.push(openCase(box.id));
    setDrops(results);

    const newTargets = Array.from({ length: count }, (_, i) => {
      const containerW =
        stripRefs.current[i]?.parentElement?.clientWidth || 600;
      const jitter = (Math.random() - 0.5) * (CARD_W * 0.55);
      return (
        WINNER_INDEX * (CARD_W + CARD_GAP) + CARD_W / 2 - containerW / 2 + jitter
      );
    });
    targetsRef.current = newTargets;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOffsets(newTargets));
    });
    const t = setTimeout(() => finish(results), SPIN_MS + 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (results = drops) => {
    setPhase('reveal');
    if (results?.some((d) => d?.rarity === 'legendaire' || d?.rarity === 'epique')) {
      fx.confetti();
      playAchievement();
    }
  };

  const skip = () => {
    setSkipped(true);
    setOffsets(targetsRef.current);
    finish();
  };

  const bestDrop = drops
    ? drops.reduce((best, d) => {
        const order = { commun: 0, rare: 1, epique: 2, legendaire: 3 };
        return !best || (order[d?.rarity] || 0) > (order[best?.rarity] || 0)
          ? d
          : best;
      }, null)
    : null;
  const bestR = bestDrop ? RARITIES[bestDrop.rarity] || RARITIES.commun : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-2xl">
        <h3 className="mb-4 text-center text-lg font-extrabold text-slate-200">
          🎁 {box.name} ×{count}
        </h3>

        {/* Rouleaux parallèles */}
        <div className="space-y-2">
          {strips.map((strip, si) => {
            const drop = drops?.[si];
            return (
              <div
                key={si}
                className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 ${
                  count > 2 ? 'py-2' : 'py-3'
                }`}
              >
                <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-full w-0.5 -translate-x-1/2 bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.9)]" />
                <div
                  ref={(el) => (stripRefs.current[si] = el)}
                  className="flex"
                  style={{
                    gap: CARD_GAP,
                    transform: `translateX(-${offsets[si]}px)`,
                    transition:
                      phase === 'spin' && !skipped
                        ? `transform ${SPIN_MS}ms cubic-bezier(0.08, 0.65, 0.05, 1)`
                        : 'none',
                  }}
                >
                  {strip.map((d, i) => (
                    <ReelCard
                      key={i}
                      small={count > 2}
                      view={d === 'WINNER' && drop ? dropView(drop) : dropView(d)}
                    />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/80 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/80 to-transparent" />
              </div>
            );
          })}
        </div>

        {/* Révélation : résumé de tous les drops */}
        {phase === 'reveal' && drops && (
          <div className="animate-pop mt-5">
            <div className="flex flex-wrap items-start justify-center gap-2">
              {drops.map((d, i) => {
                const view = dropView(d);
                const r = RARITIES[d?.rarity] || RARITIES.commun;
                return (
                  <button
                    key={i}
                    onClick={() => setDetail({ drop: d, i })}
                    className="flex w-28 cursor-pointer flex-col items-center rounded-xl border-2 p-2 text-center transition-all hover:brightness-125 hover:ring-2 hover:ring-white/30"
                    style={{
                      borderColor: r.color,
                      background: `${r.color}12`,
                    }}
                    title="Cliquez pour les détails"
                  >
                    {view.icon ? (
                      <GameIcon
                        icon={view.icon}
                        alt={view.name}
                        className={count > 2 ? 'h-8 w-8' : 'h-10 w-10'}
                      />
                    ) : (
                      <span className={count > 2 ? 'text-2xl' : 'text-3xl'}>
                        {view.emoji}
                      </span>
                    )}
                    <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-tight text-slate-100">
                      {view.name}
                    </p>
                    <p
                      className="text-[8px] font-bold uppercase tracking-wider"
                      style={{ color: r.color }}
                    >
                      {r.label}
                    </p>
                  </button>
                );
              })}
            </div>
            {bestDrop && (
              <p
                className="mt-3 text-center text-lg font-extrabold"
                style={{ color: bestR.color, textShadow: `0 0 16px ${bestR.glow}` }}
              >
                Meilleur tirage : {dropView(bestDrop).name} ({bestR.label})
              </p>
            )}
            <p className="mt-1 text-center text-[10px] text-slate-500">
              💡 Cliquez sur un item pour voir ses détails
            </p>
            <div className="mt-3 text-center">
              <button className="btn-primary" onClick={onDone}>
                Récupérer
              </button>
            </div>
          </div>
        )}

        {/* Modal détail d'un item gagné */}
        {detail && phase === 'reveal' && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setDetail(null)}
          >
            <div
              className="panel animate-pop w-full max-w-xs p-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const view = dropView(detail.drop);
                const r = RARITIES[detail.drop?.rarity] || RARITIES.commun;
                const total = box.drops.reduce((a, d) => a + d.weight, 0);
                return (
                  <>
                    <div
                      className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2"
                      style={{
                        borderColor: r.color,
                        background: `${r.color}18`,
                        boxShadow: `0 0 24px ${r.glow}`,
                      }}
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
                    <p
                      className="mt-3 text-lg font-extrabold"
                      style={{ color: r.color }}
                    >
                      {view.name}
                    </p>
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: r.color }}
                    >
                      {r.label} — chance de{' '}
                      {Math.round((detail.drop.weight / total) * 100)} %
                    </p>
                    {view.desc && (
                      <p className="mt-2 text-sm text-slate-300">{view.desc}</p>
                    )}
                    {view.reward && (
                      <p className="mt-2 text-sm font-bold text-ember-300">
                        {view.reward}
                      </p>
                    )}
                    {detail.drop.duplicate && (
                      <p className="mt-2 text-sm font-bold text-slate-500">
                        Doublon — vous le possédiez déjà.
                      </p>
                    )}
                    <button
                      className="btn-ghost mt-4 w-full text-xs"
                      onClick={() => setDetail(null)}
                    >
                      Fermer
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Contrôles pendant le tirage */}
        {phase === 'spin' && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <p className="animate-pulse text-sm text-slate-400">
              La chance tourne…
            </p>
            <button
              onClick={skip}
              className="btn-ghost px-3 py-1.5 text-xs"
              title="Passer l'animation"
            >
              ⏭ Passer
            </button>
          </div>
        )}
      </div>
    </div>
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          🎁 Cases
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Des améliorations, skins et tags <b className="text-ember-300">EXCLUSIFS</b>{' '}
          qui ne sortent qu'ici — introuvables en boutique. Doublons convertis
          en cash.
        </p>
      </div>

      {CASES.map((box) => {
        return (
          <div
            key={box.id}
            className="flex items-center gap-4 rounded-2xl px-2 py-2 transition-colors hover:bg-white/5"
          >
            {/* La caisse en grand, sans encadré, proportions d'origine */}
            <img
              src={box.icon}
              alt={box.name}
              draggable={false}
              className="h-28 w-auto shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] lg:h-32"
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold">{box.name}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                {box.desc}
              </p>
              <button
                onClick={() => setContents(box)}
                className="mt-1.5 text-[11px] font-semibold text-ember-300 hover:text-ember-200"
              >
                🔍 Voir le contenu ({box.drops.length} prix, avec probabilités)
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
                    className={`btn px-3 py-1.5 text-xs ${
                      can
                        ? n === 1
                          ? 'btn-primary'
                          : 'btn-ghost border-ember-500/40 text-ember-200 hover:bg-ember-900/30'
                        : 'cursor-not-allowed bg-white/5 text-slate-600'
                    }`}
                    title={
                      n === 1
                        ? 'Ouvrir 1 caisse'
                        : `Ouvrir ${n} caisses d'un coup (${fmt(box.cost * n)})`
                    }
                  >
                    ×{n} <span className="opacity-70">🪙 {fmt(box.cost * n)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="px-1 text-center text-[10px] text-slate-500">
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
