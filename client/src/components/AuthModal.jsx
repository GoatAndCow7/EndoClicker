import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useGame } from '../game/store';

function Form({ mode, onSwitch }) {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const pseudoRef = useRef(null);

  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const hasLocalSave = !!useGame.getState().loadLocal();

  useEffect(() => {
    const el = pseudoRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(pseudo.trim(), password);
      else await register(pseudo.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-center text-2xs leading-relaxed text-ink-3">
        {isRegister
          ? hasLocalSave
            ? 'Votre progression actuelle sera transférée vers votre nouveau compte. Vous ne perdrez rien, même en changeant d’appareil !'
            : 'Sauvegardez votre progression dans le cloud et figez au classement. Jouable partout, sur n’importe quel appareil.'
          : 'Récupérez votre progression cloud et votre place au classement.'}
      </p>

      <label className="block">
        <span className="label-caps mb-1.5 block">Pseudo</span>
        <input
          ref={pseudoRef}
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Steve_123"
          autoComplete="username"
          minLength={3}
          maxLength={16}
          required
          className="input focus-ring h-11 md:h-10"
        />
      </label>

      <label className="block">
        <span className="label-caps mb-1.5 block">Mot de passe</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6 caractères minimum"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={6}
          required
          className="input focus-ring h-11 md:h-10"
        />
      </label>

      {error && (
        <p className="text-2xs font-semibold text-danger-bright">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn btn-primary focus-ring h-11 w-full text-sm md:h-10"
      >
        {busy ? 'Un instant…' : isRegister ? 'Créer mon compte' : 'Se connecter'}
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSwitch('login')}
          aria-pressed={mode === 'login'}
          className={`btn btn-ghost focus-ring h-11 flex-1 text-sm md:h-10 ${
            mode === 'login' ? 'border-accent/40 text-accent-soft' : ''
          }`}
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => onSwitch('register')}
          aria-pressed={isRegister}
          className={`btn btn-ghost focus-ring h-11 flex-1 text-sm md:h-10 ${
            isRegister ? 'border-accent/40 text-accent-soft' : ''
          }`}
        >
          Créer un compte
        </button>
      </div>
    </form>
  );
}

export default function AuthModal() {
  const authModal = useAuth((s) => s.authModal);
  const closeAuth = useAuth((s) => s.closeAuth);
  const setAuthMode = useAuth((s) => s.setAuthMode);

  useEffect(() => {
    if (!authModal) return;
    const h = (e) => {
      if (e.key === 'Escape') closeAuth();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [authModal, closeAuth]);

  if (!authModal) return null;

  const isRegister = authModal.mode === 'register';

  return (
    <div className="modal-backdrop" onClick={closeAuth}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isRegister ? 'Créer un compte' : 'Connexion'}
        className="modal-card max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 className="modal-title">
            {isRegister ? '👤 Créer un compte' : '🔐 Connexion'}
          </h3>
          <button
            type="button"
            onClick={closeAuth}
            className="modal-x"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <Form mode={authModal.mode} onSwitch={setAuthMode} />
        </div>
      </div>
    </div>
  );
}
