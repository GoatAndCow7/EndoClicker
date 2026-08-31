import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { fmt } from '../game/format';
import { useAuth } from '../auth/useAuth';
import { TAG_BY_ID, RARITIES } from '../game/constants';
import ProfileModal from './ProfileModal.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [viewing, setViewing] = useState(null);
  const user = useAuth((s) => s.user);
  const openAuth = useAuth((s) => s.openAuth);

  useEffect(() => {
    let alive = true;
    const fetchLb = async () => {
      try {
        const { leaderboard } = await api('/api/leaderboard');
        if (alive) {
          setEntries(leaderboard);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    fetchLb();
    const t = setInterval(fetchLb, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (error) {
    return (
      <div className="empty-state text-2xs">
        Impossible de charger le classement : {error}
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="empty-state h-[60px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.length === 0 && (
        <div className="empty-state p-6">
          <p className="text-2xs text-ink-3">
            Le classement est vide pour l’instant.
          </p>
          {user ? (
            <p className="mt-1 text-3xs text-ink-4">
              Jouez et votre score apparaîtra automatiquement !
            </p>
          ) : (
            <button
              type="button"
              className="btn-primary focus-ring mt-3 h-11 text-2xs md:h-10"
              onClick={() => openAuth('register')}
            >
              Créer un compte pour figurer au classement
            </button>
          )}
        </div>
      )}

      {entries.map((e, i) => {
        const isMe = user && e.pseudo.toLowerCase() === user.toLowerCase();
        const tag = e.equippedTag && TAG_BY_ID[e.equippedTag];
        const rarity = tag && RARITIES[tag.rarity];
        return (
          <button
            key={e.pseudo}
            type="button"
            onClick={() => setViewing(e.pseudo)}
            aria-current={isMe ? 'true' : undefined}
            className={`list-row focus-ring min-h-[60px] cursor-pointer ${
              isMe
                ? 'border-accent/50 bg-accent-overlay/20'
                : 'hover:border-line/25 hover:bg-surface/10'
            }`}
            title={`Voir le profil de ${e.pseudo}`}
          >
            <span className="w-7 shrink-0 text-center text-base font-extrabold tabular-nums text-ink-2">
              {i < 3 ? MEDALS[i] : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight text-ink">
                {e.pseudo}
                {tag && rarity && (
                  <span
                    className="chip ml-1.5 align-middle"
                    style={{ borderColor: rarity.color, color: rarity.color }}
                  >
                    {tag.label}
                  </span>
                )}
                {e.renaissances > 0 && (
                  <span
                    className="chip chip-accent ml-1 align-middle"
                    title={`${e.renaissances} renaissance${
                      e.renaissances > 1 ? 's' : ''
                    }`}
                  >
                    🔥 ×{e.renaissances}
                  </span>
                )}
                {isMe && (
                  <span className="ml-1.5 align-middle text-2xs font-semibold text-accent-soft">
                    (vous)
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-2xs leading-tight text-ink-3">
                🏅 {e.achievements} succès
              </p>
            </div>
            <span className="shrink-0 text-right text-sm font-extrabold tabular-nums text-accent-soft">
              {fmt(e.totalEndocraft)}
            </span>
          </button>
        );
      })}

      {viewing &&
        createPortal(
          <ProfileModal pseudo={viewing} onClose={() => setViewing(null)} />,
          document.body
        )}

      {!user && entries.length > 0 && (
        <button
          type="button"
          className="btn-primary focus-ring h-11 w-full text-sm md:h-10"
          onClick={() => openAuth('register')}
        >
          👆 Créez un compte pour figurer au classement
        </button>
      )}
    </div>
  );
}
