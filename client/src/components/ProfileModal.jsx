import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { fmt, fmtInt, fmtDuration } from '../game/format';
import {
  ACHIEVEMENTS,
  STAFF,
  GENERATORS,
  TAG_BY_ID,
  RARITIES,
  CASE_UPGRADES,
  COIN_SKIN_BY_ID,
} from '../game/constants';

const MEDALS = ['🥇', '🥈', '🥉'];

function ProfileStat({ icon, label, value }) {
  return (
    <div className="stat-tile text-center">
      <p className="text-3xs uppercase tracking-wider text-ink-4">
        {icon} {label}
      </p>
      <p className="stat-tile-value mt-0.5 text-sm font-extrabold">{value}</p>
    </div>
  );
}

function CaseChip({ icon, name, rarity, emoji, desc, selected, onClick }) {
  const r = RARITIES[rarity] || RARITIES.commun;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`badge-rarity rarity-${rarity} focus-ring cursor-pointer transition-transform hover:brightness-125 ${
        selected ? 'ring-2 ring-accent/60' : ''
      }`}
      title={`${name} — ${r.label} (cliquez pour détails)`}
    >
      {emoji ? (
        <span aria-hidden="true">{emoji}</span>
      ) : (
        <img src={icon} alt="" className="pixelated h-4 w-4" />
      )}
      <span className="normal-case tracking-normal text-ink-2">{name}</span>
    </button>
  );
}

export default function ProfileModal({ pseudo, onClose }) {
  const [profile, setProfile] = useState(null);
  const [selectedLoot, setSelectedLoot] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api(`/api/profile/${encodeURIComponent(pseudo)}`)
      .then(({ profile }) => alive && setProfile(profile))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [pseudo]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const equippedTag =
    profile?.equippedTag && TAG_BY_ID[profile.equippedTag]
      ? TAG_BY_ID[profile.equippedTag]
      : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {error && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Erreur du profil"
          className="modal-card max-w-sm p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-danger-bright">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost focus-ring mt-4 h-11 w-full text-sm md:h-10"
          >
            Fermer
          </button>
        </div>
      )}
      {!profile && !error && <div className="spinner" />}

      {profile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Profil de ${profile.pseudo}`}
          className="modal-card max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* En-tête : avatar, pseudo, tag équipé, rang */}
          <div className="modal-head">
            <img
              src={`https://mc-heads.net/avatar/${encodeURIComponent(profile.pseudo)}/64`}
              alt=""
              className="pixelated h-16 w-16 rounded-lg bg-void/40 ring-2 ring-line/15"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-base font-extrabold text-ink">
                  {profile.pseudo}
                </span>
                {equippedTag && (
                  <span className={`badge-rarity rarity-${equippedTag.rarity}`}>
                    {equippedTag.label}
                  </span>
                )}
                {profile.renaissances > 0 && (
                  <span
                    className="chip chip-accent"
                    title="Renaissances"
                  >
                    🔥 ×{profile.renaissances}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {profile.rank ? (
                  <span className="chip chip-accent">
                    {profile.rank <= 3
                      ? MEDALS[profile.rank - 1]
                      : `#${profile.rank}`}{' '}
                    au classement
                  </span>
                ) : (
                  <span className="chip">Pas encore classé</span>
                )}
                <span className="text-3xs text-ink-4">
                  inscrit le{' '}
                  {new Date(profile.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="modal-x"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="modal-body space-y-4">
            {/* Stats principales */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <ProfileStat
                icon="💰"
                label="Récolté"
                value={fmt(profile.totalEndocraft)}
              />
              <ProfileStat
                icon="👆"
                label="Clics"
                value={fmtInt(profile.clicks)}
              />
              <ProfileStat
                icon="⏱️"
                label="Jeu"
                value={fmtDuration(profile.playMs)}
              />
              <ProfileStat
                icon="🎁"
                label="Caisses"
                value={fmtInt(profile.casesOpened)}
              />
              <ProfileStat
                icon="🌟"
                label="Légend."
                value={fmtInt(profile.caseLegendaryDrops)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Équipe recrutée */}
              {profile.staff.length > 0 && (
                <section>
                  <h4 className="section-title mb-2">
                    🤝 Équipe ({profile.staff.length}/{STAFF.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {STAFF.filter((m) => profile.staff.includes(m.id)).map(
                      (m) => (
                        <img
                          key={m.id}
                          src={m.icon}
                          alt={m.pseudo}
                          title={`${m.pseudo} — ${m.role}`}
                          className="pixelated h-10 w-10 rounded-lg bg-void/40 ring-1 ring-line/10"
                        />
                      )
                    )}
                  </div>
                </section>
              )}

              {/* Butin de caisses */}
              <section>
                <h4 className="section-title mb-2">🎁 Butin de caisses</h4>
                {(() => {
                  const items = [];
                  // Exclusives possédées
                  for (const u of CASE_UPGRADES) {
                    if (profile.upgrades.includes(u.id)) {
                      items.push(
                        <CaseChip
                          key={u.id}
                          icon={u.icon}
                          name={u.name}
                          rarity={u.rarity}
                          desc={u.desc}
                          selected={selectedLoot?.id === u.id}
                          onClick={() =>
                            setSelectedLoot(
                              selectedLoot?.id === u.id
                                ? null
                                : {
                                    id: u.id,
                                    icon: u.icon,
                                    name: u.name,
                                    rarity: u.rarity,
                                    desc: u.desc,
                                  }
                            )
                          }
                        />
                      );
                    }
                  }
                  // Skins exclusifs possédés
                  for (const id of profile.cosmetics || []) {
                    const sk = COIN_SKIN_BY_ID[id];
                    if (sk?.caseOnly) {
                      items.push(
                        <CaseChip
                          key={id}
                          name={sk.name}
                          rarity="legendaire"
                          emoji="💗"
                          desc={sk.desc}
                          selected={selectedLoot?.id === id}
                          onClick={() =>
                            setSelectedLoot(
                              selectedLoot?.id === id
                                ? null
                                : {
                                    id,
                                    name: sk.name,
                                    rarity: 'legendaire',
                                    emoji: '💗',
                                    desc: sk.desc,
                                  }
                            )
                          }
                        />
                      );
                    }
                  }
                  // Tags possédés (non équipés inclus)
                  for (const id of profile.tags || []) {
                    const tag = TAG_BY_ID[id];
                    if (tag) {
                      items.push(
                        <CaseChip
                          key={id}
                          name={tag.label}
                          rarity={tag.rarity}
                          emoji="🏷️"
                          desc="Tag de prestige affiché à côté du pseudo au classement et sur le profil."
                          selected={selectedLoot?.id === id}
                          onClick={() =>
                            setSelectedLoot(
                              selectedLoot?.id === id
                                ? null
                                : {
                                    id,
                                    name: tag.label,
                                    rarity: tag.rarity,
                                    emoji: '🏷️',
                                    desc: 'Tag de prestige affiché à côté du pseudo au classement et sur le profil.',
                                  }
                            )
                          }
                        />
                      );
                    }
                  }
                  return items.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-1.5">{items}</div>
                      {selectedLoot && (
                        <div
                          className={`rarity-card rarity-${selectedLoot.rarity} ec-reveal-in mt-2 flex items-center gap-3 p-3`}
                        >
                          {selectedLoot.icon ? (
                            <img
                              src={selectedLoot.icon}
                              alt=""
                              className="pixelated h-10 w-10 shrink-0"
                            />
                          ) : (
                            <span className="shrink-0 text-3xl" aria-hidden="true">
                              {selectedLoot.emoji}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-ink">
                              {selectedLoot.name}
                              <span
                                className={`rarity-text rarity-${selectedLoot.rarity} ml-2 text-3xs font-bold uppercase tracking-widest`}
                              >
                                {RARITIES[selectedLoot.rarity]?.label}
                              </span>
                            </p>
                            <p className="mt-0.5 text-2xs leading-snug text-ink-2">
                              {selectedLoot.desc}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty-state text-3xs">
                      Aucun trésor de caisse pour l’instant. La chance n’a pas
                      encore tourné.
                    </div>
                  );
                })()}
              </section>
            </div>

            {/* Générateurs */}
            {Object.keys(profile.generators).length > 0 && (
              <section>
                <h4 className="section-title mb-2">🪓 Générateurs</h4>
                <div className="flex flex-wrap gap-1.5">
                  {GENERATORS.filter(
                    (g) => (profile.generators[g.id] || 0) > 0
                  ).map((g) => (
                    <span
                      key={g.id}
                      title={`${g.name} ×${profile.generators[g.id]}`}
                      className="chip chip-accent"
                    >
                      <img
                        src={g.icon}
                        alt={g.name}
                        className="pixelated h-6 w-6"
                      />
                      <b>×{profile.generators[g.id]}</b>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Succès */}
            <section>
              <h4 className="section-title mb-2">
                🏅 Succès ({profile.achievements.length}/{ACHIEVEMENTS.length})
              </h4>
              <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
                {ACHIEVEMENTS.map((a) => {
                  const done = profile.achievements.includes(a.id);
                  return (
                    <span
                      key={a.id}
                      title={done ? `${a.name} — ${a.desc}` : a.desc}
                      aria-label={done ? a.name : 'Succès verrouillé'}
                      className={`flex aspect-square items-center justify-center rounded-lg text-lg ${
                        done
                          ? 'bg-accent-overlay/40 ring-1 ring-accent/40'
                          : 'bg-void/30 opacity-40 grayscale'
                      }`}
                    >
                      <span aria-hidden="true">{done ? a.icon : '🔒'}</span>
                    </span>
                  );
                })}
              </div>
            </section>

            <p className="text-center text-3xs text-ink-4">
              Dernière activité :{' '}
              {new Date(profile.updatedAt).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
