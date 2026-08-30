import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { useGame } from '../game/store';

function Form({ mode, onSwitch }) {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const hasLocalSave = !!useGame.getState().loadLocal();

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
      <div className="text-center">
        <h2 className="text-xl font-extrabold">
          {isRegister ? 'Créer un compte' : 'Se connecter'}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          {isRegister
            ? hasLocalSave
              ? 'Votre progression actuelle sera transférée vers votre nouveau compte. Vous ne perdrez rien, même en changeant d’appareil !'
              : 'Sauvegardez votre progression dans le cloud et figez au classement. Jouable partout, sur n’importe quel appareil.'
            : 'Récupérez votre progression cloud et votre place au classement.'}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Pseudo
        </span>
        <input
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Steve_123"
          autoComplete="username"
          minLength={3}
          maxLength={16}
          required
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 outline-none transition-colors focus:border-ember-500/60"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Mot de passe
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6 caractères minimum"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={6}
          required
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 outline-none transition-colors focus:border-ember-500/60"
        />
      </label>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
        {busy ? 'Un instant…' : isRegister ? 'Créer mon compte' : 'Se connecter'}
      </button>

      <p className="text-center text-xs text-slate-400">
        {isRegister ? (
          <>
            Déjà un compte ?{' '}
            <button type="button" className="font-semibold text-ember-300 hover:underline" onClick={() => onSwitch('login')}>
              Se connecter
            </button>
          </>
        ) : (
          <>
            Pas encore de compte ?{' '}
            <button type="button" className="font-semibold text-ember-300 hover:underline" onClick={() => onSwitch('register')}>
              S’inscrire
            </button>
          </>
        )}
      </p>
    </form>
  );
}

export default function AuthModal() {
  const authModal = useAuth((s) => s.authModal);
  const closeAuth = useAuth((s) => s.closeAuth);
  const setAuthMode = useAuth((s) => s.setAuthMode);

  if (!authModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={closeAuth}
    >
      <div
        className="panel animate-pop relative w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <Form mode={authModal.mode} onSwitch={setAuthMode} />
        <button
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          onClick={closeAuth}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
