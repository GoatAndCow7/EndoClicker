// ============================================================
// Connexion SSE : reçoit les événements du serveur en direct
// (frénésie admin, pommes, mises à jour d'état). Reconnexion
// automatique gérée par le navigateur.
// ============================================================

import { useGame } from './store';
import { api, getToken } from '../api/client';

let es = null;

export function connectEvents() {
  const token = getToken();
  if (!token || es) return;

  es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);

  es.addEventListener('frenzy', (e) => {
    const { mult, durationMs } = JSON.parse(e.data);
    useGame.getState().adminFrenzy(mult, durationMs);
  });

  es.addEventListener('spawnApple', (e) => {
    const { type } = JSON.parse(e.data);
    useGame.getState().adminSpawnApple(type);
  });

  es.addEventListener('stateUpdate', () => {
    useGame.getState().refreshFromServer();
  });

  // onerror : EventSource retente tout seul (retry: 3 s côté serveur)
}

export function disconnectEvents() {
  if (es) {
    es.close();
    es = null;
  }
}
