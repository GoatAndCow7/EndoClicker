import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { fmt, fmtInt } from '../game/format';
import {
  RENAISSANCE,
  GENERATORS,
  STAFF,
  getRenaissanceMult,
  getRenaissanceThreshold,
} from '../game/constants';
import { fx } from '../game/fx';
import { playRenaissance } from '../game/audio';

const KEEP_LINES = [
  { icon: '🏅', label: 'Tous vos succès débloqués' },
  { icon: '✨', label: 'Vos cosmétiques et skins de pièce' },
  { icon: '🏷️', label: 'Vos tags de prestige' },
  { icon: '🎁', label: 'Vos exclusives de caisses' },
  { icon: '📊', label: 'Vos statistiques à vie' },
];

// Compteur du multiplicateur : de ×1,00 à la cible en 900 ms en
// easeOutCubic, piloté en requestAnimationFrame (zéro re-render).
function MultCounter({ target }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = `×${target.toFixed(2)}`;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `×${(1 + (target - 1) * eased).toFixed(2)}`;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <p
      ref={ref}
      className="ec-mult-pop stat-value text-center text-5xl tabular-nums"
    >
      ×1.00
    </p>
  );
}

export default function RenaissanceModal({ onClose }) {
  const endocraft = useGame((s) => s.endocraft);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const staff = useGame((s) => s.staff);
  const renaissances = useGame((s) => s.renaissances);
  const lifetime = useGame((s) => s.lifetimeEndocraft);
  const lastRenaissanceLifetime = useGame((s) => s.lastRenaissanceLifetime);
  const doRenaissance = useGame((s) => s.doRenaissance);

  const [renouncing, setRenouncing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [reveal, setReveal] = useState(false);
  // Une fois la renaissance consommée, le store est déjà remis à zéro :
  // on fige les valeurs du clic pour l'écran de confirmation et la fête.
  const [snap, setSnap] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    const h = (e) => {
      // Pendant la séquence, la modale se referme toute seule.
      if (e.key === 'Escape' && !renouncing) onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, renouncing]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    []
  );

  const ownedGens = GENERATORS.filter((g) => (generators[g.id] || 0) > 0);
  const before = {
    count: renaissances + 1,
    mult: getRenaissanceMult(renaissances + 1),
    embers: (renaissances + 1) * RENAISSANCE.emberBankPerRenaissance,
    balance: endocraft,
    genCount: Object.values(generators).reduce((a, b) => a + b, 0),
    genNames: ownedGens.slice(0, 4).map((g) => g.name),
    genMore: ownedGens.length > 4,
    upgradeCount: upgrades.length,
    staffNames: STAFF.filter((m) => staff.includes(m.id)).map(
      (m) => m.pseudo
    ),
    threshold: getRenaissanceThreshold(renaissances),
    progressBase:
      renaissances === 0
        ? lifetime
        : Math.max(0, lifetime - (lastRenaissanceLifetime || 0)),
  };
  before.progress = Math.min(
    100,
    (before.progressBase / before.threshold) * 100
  );

  const d = snap || before;

  const confirm = () => {
    if (renouncing) return;
    // Le store consomme la renaissance immédiatement ; la séquence
    // qui suit n'est que de la célébration.
    const ok = doRenaissance();
    if (!ok) {
      onClose();
      return;
    }
    setSnap(before);
    setRenouncing(true);
    playRenaissance();

    const after = (ms, fn) => timers.current.push(setTimeout(fn, ms));
    const reduced = window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .matches;

    after(50, () => setFlash(true));
    after(300, () => setCelebrate(true));
    after(450, () => setReveal(true));
    if (reduced) {
      after(600, onClose);
    } else {
      after(100, () => fx.confetti());
      after(700, () => fx.confetti());
      after(2000, onClose);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={renouncing ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Renaissance"
        className="modal-card relative max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span className="icon-tile ec-icon-pulse" aria-hidden="true">
            🔥
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="modal-title">Renaissance</h3>
            <p className="mt-0.5 text-3xs text-ink-4">
              Recommencez à zéro en gardant l'essentiel
            </p>
          </div>
          <span className="chip chip-accent shrink-0">n°{d.count}</span>
          <button
            type="button"
            onClick={onClose}
            disabled={renouncing}
            className="modal-x"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {celebrate ? (
          <div className="modal-body">
            <div className="flex flex-col items-center py-4 text-center">
              <MultCounter target={d.mult} />
              <p className="label-caps mt-3">Bonus de production permanent</p>
              <p className="mt-2 text-2xs font-semibold text-accent-soft">
                🐦 Braises du Phénix : +{fmt(d.embers)} EndoCraft
              </p>

              {reveal && (
                <ul className="mt-6 w-full space-y-1.5">
                  {KEEP_LINES.map((l, i) => (
                    <li
                      key={l.label}
                      className="ec-reveal-in text-2xs text-ink-2"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {l.icon} {l.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="modal-body space-y-3">
            <div className="space-y-2">
              <p className="label-caps text-success-bright">✅ Vous gagnez</p>
              <div className="rounded-xl border border-success/40 bg-success-deep/30 p-3">
                <p className="text-2xs font-semibold text-ink-3">
                  🔥 Bonus de production permanent
                </p>
                <p className="stat-value mt-1 text-2xl tabular-nums">
                  ×{d.mult.toFixed(2)}
                </p>
                <p className="mt-0.5 text-3xs text-ink-4">
                  Sur toute votre production, pour toujours
                </p>
              </div>
              <div className="rounded-xl border border-success/40 bg-success-deep/30 p-3">
                <p className="text-2xs font-semibold text-ink-3">
                  🐦 Braises du Phénix
                </p>
                <p className="stat-value mt-1 text-2xl tabular-nums">
                  +{fmt(d.embers)}
                </p>
                <p className="mt-0.5 text-3xs text-ink-4">
                  EndoCraft de départ pour relancer la machine
                </p>
              </div>
              <p className="text-3xs text-ink-4">
                🏅 Renaissance n°{d.count} affichée au classement et sur votre
                profil
              </p>
            </div>

            <section className="rounded-xl border border-line/10 bg-surface/5 p-3">
              <p className="label-caps mb-2">🎒 Vous gardez</p>
              <ul className="space-y-1 text-2xs text-ink-2">
                {KEEP_LINES.map((l) => (
                  <li key={l.label}>
                    {l.icon} {l.label}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-danger/40 bg-danger-deep/20 p-3">
              <p className="label-caps mb-2 text-danger-bright">
                ⚠️ Vous perdez
              </p>
              <ul className="space-y-1 text-2xs text-ink-2">
                <li>
                  💰 Votre solde :{' '}
                  <b className="text-ink">{fmt(d.balance)}</b> EndoCraft
                </li>
                <li>
                  🪓 <b className="text-ink">{fmtInt(d.genCount)}</b>{' '}
                  générateurs
                  {d.genNames.length > 0 && (
                    <span className="text-ink-4">
                      {' '}
                      ({d.genNames.join(', ')}
                      {d.genMore ? '…' : ''})
                    </span>
                  )}
                </li>
                <li>
                  ⬆️ <b className="text-ink">{d.upgradeCount}</b> améliorations
                  achetées
                </li>
                {d.staffNames.length > 0 && (
                  <li>
                    🤝 L'équipe :{' '}
                    <b className="text-ink">{d.staffNames.join(', ')}</b> (à
                    recruter)
                  </li>
                )}
              </ul>
            </section>

            <section>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="label-caps">Farmés ce cycle</span>
                <span className="text-3xs tabular-nums text-ink-3">
                  {fmt(d.progressBase)} / {fmt(d.threshold)}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-bar-fill ${d.progress >= 100 ? 'is-complete' : ''}`}
                  style={{ width: `${Math.max(2, d.progress)}%` }}
                />
              </div>
            </section>
          </div>
        )}

        {flash && <div className="ec-ren-flash" aria-hidden="true" />}

        <div className="modal-foot">
          <button
            type="button"
            onClick={onClose}
            disabled={renouncing}
            className="btn btn-ghost focus-ring h-11 text-sm md:h-10"
          >
            Pas encore
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={renouncing}
            className="btn btn-primary focus-ring h-11 flex-1 text-sm md:h-10"
          >
            {renouncing ? 'Renaissance…' : '🔥 Renaître'}
          </button>
        </div>
      </div>
    </div>
  );
}
