import { create } from 'zustand';
import { api, getToken, setToken, clearToken, decodePseudo } from '../api/client';
import { useGame } from '../game/store';
import { connectEvents, disconnectEvents } from '../game/events';

export const useAuth = create((set, get) => ({
  user: null, // pseudo ou null (invité)
  authModal: null, // null | { mode: 'login' | 'register' }

  // Au démarrage : si un token existe, on est connecté → le cloud est la
  // référence. On le récupère et on l'applique, SAUF si cet appareil est
  // devant (auquel cas la sync de 60 s le remontera automatiquement).
  async init() {
    const token = getToken();
    if (!token) {
      // Invité : pas de cloud à récupérer, rien à attendre
      useGame.setState({ cloudReady: true });
      return;
    }
    const pseudo = decodePseudo(token);
    if (!pseudo) {
      clearToken();
      useGame.setState({ cloudReady: true });
      return;
    }
    set({ user: pseudo });
    connectEvents(); // événements en direct (frénésie admin, pommes…)
    try {
      const { state: cloud } = await api('/api/state');
      if (cloud) {
        const local = useGame.getState().loadLocal();
        if (!local || cloud.totalEndocraft >= local.totalEndocraft) {
          useGame.getState().applyState(cloud);
        }
        // Si l'appareil est devant (synchros précédentes échouées, retour
        // de connexion), on garde le local : l'anti-triche permissif laisse
        // le rattrapage légitime passer au prochain cycle.
      }
      // Cloud récupéré (ou inexistant) : les syncs montantes sont autorisées,
      // et on envoie une première mise à jour tout de suite.
      useGame.setState({ cloudReady: true });
      useGame.getState().cloudSync();
    } catch (e) {
      useGame.setState({ cloudReady: true });
      if (e.status === 401) {
        // Token expiré ou compte supprimé : retour en mode invité
        clearToken();
        disconnectEvents();
        set({ user: null });
      }
      // Hors-ligne : on garde le local, la sync retentera
    }
  },

  openAuth(mode) {
    set({ authModal: { mode } });
  },

  closeAuth() {
    set({ authModal: null });
  },

  setAuthMode(mode) {
    set({ authModal: { mode } });
  },

  async register(pseudo, password) {
    const { token } = await api('/api/auth/register', {
      method: 'POST',
      body: { pseudo, password },
    });
    setToken(token);
    set({ user: pseudo, authModal: null });
    connectEvents();

    // Migration : la progression locale de cet appareil part dans le cloud
    // (flag migration : acceptée sans contrôle dans la fenêtre post-login)
    const game = useGame.getState();
    useGame.setState({ cloudReady: true });
    await game.cloudSync({ migration: true });
    game.addToast(
      '☁️',
      'Compte créé !',
      'Votre progression est maintenant sauvegardée dans le cloud.'
    );
  },

  // Connexion = fusion automatique, sans question :
  // - l'appareil est devant → sa progression remplace le cloud
  // - le cloud est devant (ou pas de locale) → il est appliqué
  // Dans tous les cas, ensuite, on continue uniquement en cloud.
  async login(pseudo, password) {
    const { token } = await api('/api/auth/login', {
      method: 'POST',
      body: { pseudo, password },
    });
    setToken(token);
    set({ user: pseudo });
    connectEvents();

    const game = useGame.getState();
    const { state: cloud } = await api('/api/state');
    const local = game.loadLocal();

    // Le cloud est désormais la référence : les syncs sont autorisées
    useGame.setState({ cloudReady: true });

    if (local && (!cloud || local.totalEndocraft > cloud.totalEndocraft)) {
      // Le farm local de cet appareil part dans le cloud (migration)
      game.applyState(local);
      await game.cloudSync({ migration: true });
      game.addToast(
        '☁️',
        'Progression fusionnée',
        'Votre progression locale a été envoyée dans le cloud.'
      );
    } else if (cloud) {
      game.applyState(cloud);
      game.addToast('☁️', 'Connecté', 'Progression cloud récupérée.');
    } else {
      await game.cloudSync();
      game.addToast('☁️', 'Connecté', 'Progression locale synchronisée.');
    }

    set({ user: pseudo, authModal: null });
  },

  logout() {
    useGame.getState().saveLocal();
    disconnectEvents();
    clearToken();
    set({ user: null });
  },
}));
