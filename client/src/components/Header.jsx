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

// Squelette de modale partagé (stats, administration) : fermeture par
// Échap, clic sur le rideau ou croix.
function HeaderModal({ icon, title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card h-[85vh] max-w-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 className="modal-title">
            {icon} {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="modal-x"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// Bouton Stats (tout le monde) : ouvre le panneau en grand modal
function StatsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-icon focus-ring h-11 w-11 md:h-10 md:w-10"
        title="Vos statistiques"
        aria-label="Statistiques"
        aria-haspopup="dialog"
      >
        📊
      </button>
      {open && (
        <HeaderModal
          icon="📊"
          title="Statistiques"
          onClose={() => setOpen(false)}
        >
          <StatsPanel />
        </HeaderModal>
      )}
    </>
  );
}

// Menu déroulant de volume : 0 = désactivé
function VolumeMenu({ open, onClose, icon, label, volume, onChange }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      {/* ferme au clic ailleurs */}
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
        aria-label="Fermer le menu"
        tabIndex={-1}
      />
      <div className="panel absolute right-0 top-full z-50 mt-2 w-56 animate-drop-in p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="label-caps">
            {icon} {label}
          </span>
          <span className="text-xs font-extrabold tabular-nums text-accent-soft">
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
          aria-label={`Volume : ${label}`}
          className="focus-ring w-full accent-accent"
        />
        <p className="mt-1 text-3xs text-ink-4">
          {volume === 0 ? 'Désactivé' : 'Baissez à 0 pour couper'}
        </p>
      </div>
    </>
  );
}

// Menu de choix du mode d'affichage : auto (heure réelle) / jour / nuit
function DayNightMenu({ open, onClose, pref, onChange }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const options = [
    { id: 'auto', label: 'Auto', hint: 'selon votre heure' },
    { id: 'day', label: 'Jour', hint: 'forcé ensoleillé' },
    { id: 'night', label: 'Nuit', hint: 'forcé clair de lune' },
  ];
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
        aria-label="Fermer le menu"
        tabIndex={-1}
      />
      <div className="panel absolute right-0 top-full z-50 mt-2 w-56 animate-drop-in p-2">
        {options.map((o) => (
          <button
            type="button"
            key={o.id}
            onClick={() => {
              onChange(o.id);
              onClose();
            }}
            aria-pressed={pref === o.id}
            className={`focus-ring flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
              pref === o.id
                ? 'bg-accent-overlay/60 text-accent-bright'
                : 'text-ink-2 hover:bg-surface/5'
            }`}
          >
            <span>{o.label}</span>
            <span className="text-3xs font-normal text-ink-4">{o.hint}</span>
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
        type="button"
        onClick={() => setOpen(open === 'sfx' ? null : 'sfx')}
        className={`btn-icon focus-ring h-11 w-11 md:h-10 md:w-10 ${
          sfxVol === 0 ? 'is-off' : ''
        }`}
        title={`Effets sonores — ${sfxVol === 0 ? 'désactivés' : sfxVol + '%'}`}
        aria-label="Volume des effets sonores"
        aria-expanded={open === 'sfx'}
        aria-haspopup="menu"
      >
        {sfxVol > 0 ? '🔊' : '🔇'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(open === 'music' ? null : 'music')}
        className={`btn-icon focus-ring h-11 w-11 md:h-10 md:w-10 ${
          musicVol === 0 ? 'is-off' : ''
        }`}
        title={`Musique — ${musicVol === 0 ? 'désactivée' : musicVol + '%'}`}
        aria-label="Volume de la musique"
        aria-expanded={open === 'music'}
        aria-haspopup="menu"
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
        type="button"
        onClick={() => setOpen(!open)}
        className="btn-icon focus-ring h-11 w-11 md:h-10 md:w-10"
        title={`Ambiance : ${label}`}
        aria-label="Mode jour ou nuit"
        aria-expanded={open}
        aria-haspopup="menu"
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
    <header className="flex h-14 items-center justify-between gap-4 border-b border-line/10 bg-panelbg/80 px-4 lg:h-16 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src="/logo.png"
          alt="EndoCraft"
          className="h-9 w-9 shrink-0 rounded-lg object-cover lg:h-11 lg:w-11"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-wide lg:text-2xl">
              <button
                type="button"
                onClick={clickTitle}
                className="shine-text focus-ring cursor-pointer select-none"
                aria-label="EndoClicker (petit secret caché)"
                title="EndoClicker"
              >
                EndoClicker
              </button>
            </h1>
            <span className="hidden items-center rounded-full border border-accent/30 bg-accent-overlay/40 px-2 py-0.5 text-3xs font-bold uppercase tracking-widest text-accent-soft/90 sm:inline-flex">
              V2
            </span>
          </div>
          <p className="hidden text-2xs text-ink-3 lg:block">
            Cliquez, minez, régnez sur l’économie de l’End
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 lg:gap-2">
        <AudioControls />
        <DayNightControl />
        <StatsButton />
        {user ? (
          <>
            <button
              type="button"
              className="btn-ghost focus-ring h-11 text-sm md:h-10"
              onClick={logout}
              title="Se déconnecter (votre progression reste sauvegardée dans le cloud)"
            >
              Déconnexion
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdmin(true)}
                className="btn-icon focus-ring h-11 w-11 md:h-10 md:w-10"
                title="Panel d'administration"
                aria-label="Panel d'administration"
                aria-expanded={showAdmin}
                aria-haspopup="dialog"
              >
                🛠️
              </button>
            )}
            <span className="flex h-11 max-w-[40vw] items-center gap-2 rounded-full border border-accent/30 bg-accent-overlay/40 px-3 text-sm font-semibold text-accent-bright transition-colors hover:bg-accent-overlay/60 md:h-10">
              <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
              <span className="truncate">{user}</span>
            </span>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-ghost focus-ring h-11 text-sm md:h-10"
              onClick={() => openAuth('login')}
            >
              Se connecter
            </button>
            <button
              type="button"
              className="btn-primary focus-ring h-11 text-sm md:h-10"
              onClick={() => openAuth('register')}
            >
              S’inscrire
            </button>
          </>
        )}
      </div>

      {/* Panel d'administration (grand modal) */}
      {showAdmin && (
        <HeaderModal
          icon="🛠️"
          title="Administration"
          onClose={() => setShowAdmin(false)}
        >
          <AdminPanel />
        </HeaderModal>
      )}
    </header>
  );
}
