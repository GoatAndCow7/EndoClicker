import { useEffect, useState } from 'react';
import { fmt, fmtInt } from '../game/format';
import { useGame, getTotalRate, getClickPower } from '../game/store';
import { useAuth } from '../auth/useAuth';
import { RENAISSANCE, getRenaissanceThreshold } from '../game/constants';
import RenaissanceModal from './RenaissanceModal.jsx';

// Carte Renaissance : progression vers le déblocage, puis bouton de reset.
// Le seuil compte le total À VIE (jamais remis à zéro, même par un reset)
// et monte à chaque renaissance (500 B, 2 T, 8 T…).
function RenaissanceCard() {
  const lifetime = useGame((s) => s.lifetimeEndocraft);
  const renaissances = useGame((s) => s.renaissances);
  const lastRenaissanceLifetime = useGame((s) => s.lastRenaissanceLifetime);
  const [showModal, setShowModal] = useState(false);

  const threshold = getRenaissanceThreshold(renaissances);
  // Vrai déblocage : le seuil doit être atteint DEPUIS la dernière renaissance
  const sinceLast = lifetime - (lastRenaissanceLifetime || 0);
  const unlocked =
    lifetime >= threshold &&
    (renaissances === 0 || sinceLast >= threshold);
  const progressBase = renaissances === 0 ? lifetime : sinceLast;
  const progress = Math.min(100, (progressBase / threshold) * 100);
  const nextBonus = Math.round(
    (renaissances + 1) * RENAISSANCE.multPerRenaissance * 100
  );

  if (renaissances === 0 && !unlocked) {
    return (
      <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          🔥 Renaissance
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-ember-500/70 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          {fmt(progressBase)} / {fmt(threshold)} farmés ce cycle — {progress < 1 ? progress.toFixed(2) : Math.floor(progress)} %
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-ember-500/30 bg-ember-950/25 px-3 py-2 text-left">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ember-300">
          🔥 Renaissance
          {renaissances > 0 && (
            <span className="ml-1 text-slate-300">
              ×{renaissances} (+{Math.round(renaissances * RENAISSANCE.multPerRenaissance * 100)} %)
            </span>
          )}
        </p>
        {unlocked && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary px-2.5 py-1 text-[11px]"
          >
            Renaître ?
          </button>
        )}
      </div>
      {!unlocked && (
        <p className="mt-1 text-[10px] text-slate-500">
          {fmt(progressBase)} / {fmt(threshold)} farmés ce cycle — {progress < 1 ? progress.toFixed(2) : Math.floor(progress)} %
        </p>
      )}
      {showModal && <RenaissanceModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

// État de la sauvegarde : cloud / invité / refusée — visible en direct
function SyncStatus() {
  const user = useAuth((s) => s.user);
  const lastSyncAt = useGame((s) => s.lastSyncAt);
  const cloudSyncError = useGame((s) => s.cloudSyncError);
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!user) {
    return (
      <p className="mt-2 text-[11px] font-semibold text-slate-400">
        💾 Invité — progression locale uniquement
      </p>
    );
  }
  if (cloudSyncError) {
    return (
      <p className="mt-2 text-[11px] font-semibold text-amber-400">
        ⚠️ Synchro cloud refusée — nouvelle tentative en cours…
      </p>
    );
  }
  if (!lastSyncAt) {
    return (
      <p className="mt-2 text-[11px] font-semibold text-slate-400">
        ☁️ Synchronisation cloud en cours…
      </p>
    );
  }
  const s = Math.max(0, Math.round((Date.now() - lastSyncAt) / 1000));
  return (
    <p className="mt-2 text-[11px] font-semibold text-emerald-400">
      ☁️ Cloud synchronisé il y a {s} s
    </p>
  );
}

function BoostIndicator() {
  const boostMult = useGame((s) => s.boostMult);
  const boostEndsAt = useGame((s) => s.boostEndsAt);
  const [, force] = useState(0);

  useEffect(() => {
    if (!boostEndsAt) return;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [boostEndsAt]);

  if (!boostEndsAt || boostEndsAt <= Date.now()) return null;
  const remaining = Math.ceil((boostEndsAt - Date.now()) / 1000);

  return (
    <div className="animate-pop mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-ember-400/50 bg-ember-500/15 px-4 py-2 text-sm font-bold text-ember-200">
      🔥 Frénésie ×{boostMult} — {remaining} s
    </div>
  );
}

// Indicateur de tempête de clics (pomme d'ombre)
function ShadowStormIndicator() {
  const shadowStorm = useGame((s) => s.shadowStorm);
  const [, force] = useState(0);

  useEffect(() => {
    if (!shadowStorm) return;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [shadowStorm]);

  if (!shadowStorm || shadowStorm.endsAt <= Date.now()) return null;
  const remaining = Math.ceil((shadowStorm.endsAt - Date.now()) / 1000);

  return (
    <div className="animate-pop mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/50 bg-violet-500/15 px-4 py-2 text-sm font-bold text-violet-200">
      🌑 Tempête de clics — {remaining} s
    </div>
  );
}

// S'abonne directement à ce dont il a besoin : seul ce petit composant
// re-render à chaque tick (10×/s), pas toute l'application.
export default function StatsBar() {
  const endocraft = useGame((s) => s.endocraft);
  const totalEndocraft = useGame((s) => s.totalEndocraft);
  const clicks = useGame((s) => s.clicks);
  const renaissances = useGame((s) => s.renaissances);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const staff = useGame((s) => s.staff);
  const equippedCoin = useGame((s) => s.equippedCoin);

  const production = getTotalRate({ generators, upgrades, staff, renaissances, equippedCoin });
  const clickPower = getClickPower({ generators, upgrades, staff, renaissances, equippedCoin });

  return (
    <div className="panel w-full p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        EndoCraft
      </p>
      <p className="text-glow mt-1 text-4xl font-extrabold tabular-nums text-ember-100 lg:text-5xl">
        {fmt(endocraft)}
      </p>
      <p className="mt-1 text-sm text-slate-300">
        <span className="font-bold text-ember-300">{fmt(production)}</span> /s
        <span className="mx-2 text-slate-600">•</span>
        <span className="font-bold text-ember-300">{fmt(clickPower)}</span> /clic
      </p>

      <BoostIndicator />

      <ShadowStormIndicator />

      <SyncStatus />

      <RenaissanceCard />

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
        <div className="rounded-lg bg-white/5 px-2 py-1.5">
          Total : <span className="font-semibold text-slate-200">{fmt(totalEndocraft)}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1.5">
          Clics : <span className="font-semibold text-slate-200">{fmtInt(clicks)}</span>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1.5">
          Renaissances : <span className="font-semibold text-ember-200">{fmtInt(renaissances)}</span>
        </div>
      </div>
    </div>
  );
}
