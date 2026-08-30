import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import {
  getSfxVolume,
  getMusicVolume,
  setSfxVolume,
  setMusicVolume,
} from '../game/audio';
import { useGame } from '../game/store';
import AdminPanel from './AdminPanel.jsx';
import StatsPanel from './StatsPanel.jsx';

const ADMIN_PSEUDO = 'goatandcow';
const clickTitle = () => useGame.getState().clickTitle?.();

// Bouton Stats (tout le monde) : ouvre le panneau en grand modal
function StatsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-white/5 p-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
        title="Vos statistiques"
        aria-label="Statistiques"
      >
        📊
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="panel flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-ember-300">
                📊 Statistiques
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <StatsPanel />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Menu déroulant de volume : 0 = désactivé
function VolumeMenu({ open, onClose, icon, label, volume, onChange }) {
  if (!open) return null;
  return (
    <>
      {/* ferme au clic ailleurs */}
      <button
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
        aria-label="Fermer le menu"
        tabIndex={-1}
      />
      <div className="panel absolute right-0 top-full z-50 mt-2 w-52 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {icon} {label}
          </span>
          <span className="text-xs font-extrabold tabular-nums text-ember-300">
            {volume === 0 ? 'OFF' : `${volume}%`}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={volume}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-ember-500"
        />
        <p className="mt-1 text-[10px] text-slate-500">
          {volume === 0 ? 'Désactivé' : 'Baissez à 0 pour couper'}
        </p>
      </div>
    </>
  );
}

// Menu de choix du mode d'affichage : auto (heure réelle) / jour / nuit
function DayNightMenu({ open, onClose, pref, onChange }) {
  if (!open) return null;
  const options = [
    { id: 'auto', label: 'Auto', hint: 'selon votre heure' },
    { id: 'day', label: 'Jour', hint: 'forcé ensoleillé' },
    { id: 'night', label: 'Nuit', hint: 'forcé clair de lune' },
  ];
  return (
    <>
      <button
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
        aria-label="Fermer le menu"
        tabIndex={-1}
      />
      <div className="panel absolute right-0 top-full z-50 mt-2 w-48 p-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              onChange(o.id);
              onClose();
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
              pref === o.id
                ? 'bg-ember-600/25 text-ember-200'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span>{o.label}</span>
            <span className="text-[10px] font-normal text-slate-500">
              {o.hint}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function AudioControls() {
  const [sfxVol, setSfxVol] = useState(getSfxVolume());
  const [musicVol, setMusicVol] = useState(getMusicVolume());
  const [open, setOpen] = useState(null); // 'sfx' | 'music' | null
  const wrapRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(null);
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  return (
    <div ref={wrapRef} className="relative flex items-center gap-1">
      <button
        onClick={() => setOpen(open === 'sfx' ? null : 'sfx')}
        className={`rounded-lg p-2 text-sm transition-colors ${
          sfxVol > 0
            ? 'bg-white/5 text-slate-200 hover:bg-white/10'
            : 'bg-white/5 text-slate-500 hover:bg-white/10'
        }`}
        title={`Effets sonores — ${sfxVol === 0 ? 'désactivés' : sfxVol + '%'}`}
        aria-label="Volume des effets sonores"
      >
        {sfxVol > 0 ? '🔊' : '🔇'}
      </button>
      <button
        onClick={() => setOpen(open === 'music' ? null : 'music')}
        className={`rounded-lg p-2 text-sm transition-colors ${
          musicVol > 0
            ? 'bg-white/5 text-slate-200 hover:bg-white/10'
            : 'bg-white/5 text-slate-500 opacity-60 hover:bg-white/10'
        }`}
        title={`Musique — ${musicVol === 0 ? 'désactivée' : musicVol + '%'}`}
        aria-label="Volume de la musique"
      >
        {musicVol > 0 ? '🎵' : '🔕'}
      </button>

      <VolumeMenu
        open={open === 'sfx'}
        onClose={() => setOpen(null)}
        icon="🔊"
        label="Effets"
        volume={sfxVol}
        onChange={(v) => {
          setSfxVol(v);
          setSfxVolume(v);
        }}
      />
      <VolumeMenu
        open={open === 'music'}
        onClose={() => setOpen(null)}
        icon="🎵"
        label="Musique"
        volume={musicVol}
        onChange={(v) => {
          setMusicVol(v);
          setMusicVolume(v);
        }}
      />
    </div>
  );
}

// Bouton + menu du mode jour/nuit
function DayNightControl() {
  const pref = useGame((s) => s.dayNightPref);
  const setDayNight = useGame((s) => s.setDayNight);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const icon = pref === 'night' ? '🌙' : pref === 'day' ? '☀️' : '🌗';
  const label =
    pref === 'night'
      ? 'Nuit forcée'
      : pref === 'day'
        ? 'Jour forcé'
        : 'Auto (heure réelle)';

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg bg-white/5 p-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
        title={`Ambiance : ${label}`}
        aria-label="Mode jour ou nuit"
      >
        {icon}
      </button>
      <DayNightMenu
        open={open}
        onClose={() => setOpen(false)}
        pref={pref}
        onChange={setDayNight}
      />
    </div>
  );
}

export default function Header() {
  const user = useAuth((s) => s.user);
  const openAuth = useAuth((s) => s.openAuth);
  const logout = useAuth((s) => s.logout);
  const [showAdmin, setShowAdmin] = useState(false);
  const isAdmin = user && user.toLowerCase() === ADMIN_PSEUDO;

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="EndoCraft"
          className="h-10 w-10 rounded-lg object-cover lg:h-12 lg:w-12"
        />
        <div>
          <h1
            onClick={clickTitle}
            className="shine-text cursor-pointer select-none text-xl font-extrabold tracking-wide lg:text-2xl"
            title="EndoClicker"
          >
            EndoClicker
          </h1>
          <p className="hidden text-xs text-slate-400 sm:block">
            Cliquez, minez, régnez sur l’économie de l’End
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AudioControls />
        <DayNightControl />
        <StatsButton />
        {user ? (
          <>
            <button
              className="btn-ghost text-sm"
              onClick={logout}
              title="Se déconnecter (votre progression reste sauvegardée dans le cloud)"
            >
              Déconnexion
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAdmin(true)}
                className="rounded-lg bg-white/5 p-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
                title="Panel d'administration"
                aria-label="Panel d'administration"
              >
                🛠️
              </button>
            )}
            <span className="hidden items-center gap-2 rounded-full border border-ember-500/30 bg-ember-950/40 px-3 py-1.5 text-sm font-semibold text-ember-200 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {user}
            </span>
          </>
        ) : (
          <>
            <button className="btn-ghost text-sm" onClick={() => openAuth('login')}>
              Se connecter
            </button>
            <button className="btn-primary text-sm" onClick={() => openAuth('register')}>
              S’inscrire
            </button>
          </>
        )}
      </div>

      {/* Panel d'administration (grand modal) */}
      {showAdmin && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setShowAdmin(false)}
        >
          <div
            className="panel flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-ember-300">
                🛠️ Administration
              </h3>
              <button
                onClick={() => setShowAdmin(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AdminPanel />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
