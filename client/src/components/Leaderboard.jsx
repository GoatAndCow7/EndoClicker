import { useEffect, useState } from 'react';
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
      <div className="p-6 text-center text-sm text-slate-400">
        Impossible de charger le classement : {error}
      </div>
    );
  }

  if (!entries) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
          <p className="text-sm text-slate-400">
            Le classement est vide pour l’instant.
          </p>
          {user ? (
            <p className="mt-1 text-xs text-slate-500">
              Jouez et votre score apparaîtra automatiquement !
            </p>
          ) : (
            <button className="btn-primary mt-3 text-sm" onClick={() => openAuth('register')}>
              Créer un compte pour figer au classement
            </button>
          )}
        </div>
      )}

      {entries.map((e, i) => {
        const isMe = user && e.pseudo.toLowerCase() === user.toLowerCase();
        return (
          <button
            key={e.pseudo}
            onClick={() => setViewing(e.pseudo)}
            className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
              isMe
                ? 'border-ember-400/60 bg-ember-600/15'
                : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
            }`}
            title={`Voir le profil de ${e.pseudo}`}
          >
            <span className="w-7 shrink-0 text-center text-base font-extrabold tabular-nums">
              {i < 3 ? MEDALS[i] : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight">
                {e.pseudo}
                {e.equippedTag && TAG_BY_ID[e.equippedTag] && (
                  <span
                    className="ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-extrabold"
                    style={{
                      color: RARITIES[TAG_BY_ID[e.equippedTag].rarity].color,
                      background: `${RARITIES[TAG_BY_ID[e.equippedTag].rarity].color}20`,
                    }}
                  >
                    {TAG_BY_ID[e.equippedTag].label}
                  </span>
                )}
                {e.renaissances > 0 && (
                  <span
                    className="ml-1 rounded-full bg-ember-600/25 px-1.5 py-0.5 text-[10px] font-extrabold text-ember-300"
                    title={`${e.renaissances} renaissance${e.renaissances > 1 ? 's' : ''}`}
                  >
                    🔥×{e.renaissances}
                  </span>
                )}
                {isMe && <span className="ml-1 text-[11px] text-ember-300">(vous)</span>}
              </p>
              <p className="whitespace-nowrap text-[11px] leading-tight text-slate-400">
                🏅 {e.achievements} succès
              </p>
            </div>
            <span className="shrink-0 text-right text-sm font-extrabold tabular-nums text-ember-300">
              {fmt(e.totalEndocraft)}
            </span>
          </button>
        );
      })}

      {viewing && (
        <ProfileModal pseudo={viewing} onClose={() => setViewing(null)} />
      )}

      {!user && entries.length > 0 && (
        <button
          className="btn-ghost w-full text-sm"
          onClick={() => openAuth('register')}
        >
          👆 Créez un compte pour figer au classement
        </button>
      )}
    </div>
  );
}
