import { useEffect, useRef, useState } from 'react';
import { fmt } from '../game/format';
import { useGame, getTotalRate, getClickPower } from '../game/store';
import { useAuth } from '../auth/useAuth';
import { getRenaissanceThreshold, getRenaissanceMult } from '../game/constants';
import RenaissanceModal from './RenaissanceModal.jsx';

// Solde : seul ce petit bloc re-render à chaque tick. Le flash ne se
// déclenche que pour un gain significatif entre deux rendus (frénésie,
// pomme chanceuse, quête réclamée…) — jamais pour la production passive.
function Balance() {
  const endocraft = useGame((s) => s.endocraft);
  const prevRef = useRef(endocraft);
  const valueRef = useRef(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = endocraft;
    const delta = endocraft - prev;
    if (delta < Math.max(50, prev * 0.02)) return;
    const el = valueRef.current;
    if (!el) return;
    el.classList.remove('ec-balance-flash');
    void el.offsetWidth; // reflow : l'animation repart de zéro
    el.classList.add('ec-balance-flash');
  }, [endocraft]);

  return (
    <div className="px-4 pb-3 pt-4 text-center">
      <p className="text-3xs font-bold uppercase tracking-[0.25em] text-ink-3">
        EndoCraft
      </p>
      <p
        ref={valueRef}
        className="stat-value mt-1 text-3xl leading-none lg:text-4xl xl:text-5xl"
      >
        {fmt(endocraft)}
      </p>
    </div>
  );
}

// Trois métriques vitales sur une seule ligne, séparées par des filets.
// « Cycle en cours » suit totalEndocraft (remis à zéro à chaque Renaissance).
function Metrics() {
  const totalEndocraft = useGame((s) => s.totalEndocraft);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const staff = useGame((s) => s.staff);
  const renaissances = useGame((s) => s.renaissances);
  const equippedCoin = useGame((s) => s.equippedCoin);

  const base = { generators, upgrades, staff, renaissances, equippedCoin };
  const production = getTotalRate(base);
  const clickPower = getClickPower(base);

  return (
    <div className="grid grid-cols-3 divide-x divide-line/5 border-y border-line/10 bg-void/20">
      <div className="metric">
        <span className="metric-label">Par seconde</span>
        <span className="metric-value text-accent-soft">{fmt(production)}</span>
      </div>
      <div className="metric">
        <span className="metric-label">Par clic</span>
        <span className="metric-value text-accent-soft">{fmt(clickPower)}</span>
      </div>
      <div className="metric">
        <span className="metric-label">Cycle en cours</span>
        <span className="metric-value">{fmt(totalEndocraft)}</span>
      </div>
    </div>
  );
}

// Circonférence de l'anneau chronomètre (cercle r = 12 en viewBox 32)
const RING = 75.4;

// Chips des bonus actifs : frénésie (anneau qui se vide) + tempête d'ombre.
// Rafrîchi à ~4 Hz par un interval local — jamais via la boucle de jeu.
function Boosts() {
  const boostMult = useGame((s) => s.boostMult);
  const boostEndsAt = useGame((s) => s.boostEndsAt);
  // endsAt seul (nombre stable) : l'objet shadowStorm change d'identité à
  // chaque clic pendant la tempête (compteur de mini-pommes).
  const stormEndsAt = useGame((s) => s.shadowStorm?.endsAt || 0);
  const [, force] = useState(0);

  const boosted = boostEndsAt > Date.now();
  const stormed = stormEndsAt > Date.now();
  const active = boosted || stormed;

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [active]);

  // Durée de référence du boost en cours : la première valeur vue depuis
  // son déclenchement (une extension — max des deux — l'actualise), 30 s
  // par défaut si le composant arrive en cours de frénésie.
  const totalMsRef = useRef(0);
  if (boosted) {
    totalMsRef.current = Math.max(totalMsRef.current, boostEndsAt - Date.now());
  } else {
    totalMsRef.current = 0;
  }

  if (!active) return null;
  const now = Date.now();
  const ratio = Math.min(
    1,
    (boostEndsAt - now) / Math.max(1000, totalMsRef.current || 30000)
  );

  return (
    <div className="flex flex-wrap gap-2 px-4 pt-3 empty:hidden">
      {boosted && (
        <span className="chip chip-accent">
          <svg
            className="h-7 w-7 -rotate-90"
            viewBox="0 0 32 32"
            aria-hidden="true"
          >
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              strokeWidth="3"
              stroke="rgb(var(--line) / 0.25)"
            />
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              stroke="rgb(var(--accent))"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - ratio)}
            />
          </svg>
          🔥 Frénésie ×{boostMult} · {Math.ceil((boostEndsAt - now) / 1000)} s
        </span>
      )}
      {stormed && (
        <span className="chip chip-storm">
          🌑 Tempête · {Math.ceil((stormEndsAt - now) / 1000)} s
        </span>
      )}
    </div>
  );
}

// Renaissance : progression vers le déblocage, puis bouton de reset.
// Le seuil compte le total À VIE (jamais remis à zéro) et monte à chaque
// renaissance — mais il doit être re-farmé DEPUIS la dernière.
function Renaissance() {
  const lifetime = useGame((s) => s.lifetimeEndocraft);
  const renaissances = useGame((s) => s.renaissances);
  const lastRenaissanceLifetime = useGame((s) => s.lastRenaissanceLifetime);
  const [showModal, setShowModal] = useState(false);

  const threshold = getRenaissanceThreshold(renaissances);
  const sinceLast = lifetime - (lastRenaissanceLifetime || 0);
  const unlocked =
    lifetime >= threshold &&
    (renaissances === 0 || sinceLast >= threshold);
  const progressBase = renaissances === 0 ? lifetime : sinceLast;
  const progress = Math.min(100, (progressBase / threshold) * 100);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="label-caps">🔥 Renaissance</p>
          {renaissances > 0 && (
            <span className="chip chip-accent whitespace-nowrap">
              ×{getRenaissanceMult(renaissances).toFixed(2)} permanent
            </span>
          )}
        </div>
        {unlocked ? (
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary focus-ring h-11 animate-pulse px-3 text-2xs md:h-9"
          >
            Renaître
          </button>
        ) : (
          <span className="text-3xs tabular-nums text-ink-3">
            {progress < 1 ? progress.toFixed(2) : Math.floor(progress)} %
          </span>
        )}
      </div>
      <div className="progress-bar mt-2">
        <div
          className={`progress-bar-fill${unlocked ? ' is-shiny' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1.5 text-3xs tabular-nums text-ink-4">
        {fmt(progressBase)} / {fmt(threshold)} farmés ce cycle
      </p>
      {showModal && <RenaissanceModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// État de la sauvegarde : cloud / invité / refusée — visible en direct
function SyncStatus() {
  const user = useAuth((s) => s.user);
  const lastSyncAt = useGame((s) => s.lastSyncAt);
  const cloudSyncError = useGame((s) => s.cloudSyncError);
  const cloudBannedUntil = useGame((s) => s.cloudBannedUntil);
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!user) {
    return (
      <p className="text-3xs font-semibold text-ink-4">
        💾 Invité — progression locale uniquement
      </p>
    );
  }
  if (cloudBannedUntil > Date.now()) {
    return (
      <p className="text-3xs font-semibold text-danger-bright">
        🚫 Triche détectée — progression remise à zéro, accès bloqué jusqu'
        {new Date(cloudBannedUntil).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    );
  }
  if (cloudSyncError) {
    return (
      <p className="text-3xs font-semibold text-warning-bright">
        ⚠️ Synchro cloud refusée — progression non classée, nouvelle tentative…
      </p>
    );
  }
  if (!lastSyncAt) {
    return (
      <p className="text-3xs font-semibold text-ink-4">
        ☁️ Synchronisation cloud en cours…
      </p>
    );
  }
  const s = Math.max(0, Math.round((Date.now() - lastSyncAt) / 1000));
  return (
    <p className="text-3xs font-semibold text-success">
      ☁️ Cloud synchronisé il y a {s} s
    </p>
  );
}

// Le cockpit : un seul panneau cohérent, solde → métriques → boosts →
// renaissance → synchro. Collé sous l'en-tête sur mobile pour garder le
// solde à l'écran pendant le scroll de l'atelier.
export default function StatsBar() {
  return (
    <section className="panel max-lg:sticky max-lg:top-14 max-lg:z-20 w-full overflow-hidden">
      <Balance />
      <Metrics />
      <Boosts />
      <Renaissance />
      <footer className="border-t border-line/5 px-4 py-1.5">
        <SyncStatus />
      </footer>
    </section>
  );
}
