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
    <div className="rounded-xl bg-white/5 p-2.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-0.5 text-sm font-extrabold text-ember-200">{value}</p>
    </div>
  );
}

function CaseChip({ icon, name, rarity, emoji, desc, selected, onClick }) {
  const r = RARITIES[rarity] || RARITIES.commun;
  return (
    <button
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all hover:brightness-125 ${
        selected ? 'ring-2 ring-white/40' : ''
      }`}
      style={{ borderColor: r.color, background: `${r.color}15`, color: r.color }}
      title={`${name} — ${r.label} (cliquez pour détails)`}
    >
      {emoji ? (
        <span>{emoji}</span>
      ) : (
        <img src={icon} alt="" className="pixelated h-5 w-5" />
      )}
      <span className="text-slate-100">{name}</span>
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      {error && (
        <div className="panel p-6 text-center text-sm text-red-300" onClick={(e) => e.stopPropagation()}>
          {error}
          <button onClick={onClose} className="btn-ghost mt-3 block w-full text-xs">
            Fermer
          </button>
        </div>
      )}
      {!profile && !error && (
        <div className="flex items-center justify-center p-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ember-500 border-t-transparent" />
        </div>
      )}

      {profile && (
        <div
          className="panel animate-pop relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* En-tête */}
          <div className="flex items-center gap-4 border-b border-white/10 p-4">
            <img
              src={`https://mc-heads.net/avatar/${encodeURIComponent(profile.pseudo)}/64`}
              alt=""
              className="pixelated h-16 w-16 rounded-lg bg-black/40 ring-2 ring-white/15"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xl font-extrabold">
                {profile.pseudo}
                {profile.equippedTag && TAG_BY_ID[profile.equippedTag] && (
                  <span
                    className="ml-2 rounded-full px-2 py-0.5 align-middle text-xs font-extrabold"
                    style={{
                      color: RARITIES[TAG_BY_ID[profile.equippedTag].rarity].color,
                      background: `${RARITIES[TAG_BY_ID[profile.equippedTag].rarity].color}20`,
                    }}
                  >
                    {TAG_BY_ID[profile.equippedTag].label}
                  </span>
                )}
                {profile.renaissances > 0 && (
                  <span
                    className="ml-2 rounded-full bg-ember-600/25 px-2 py-0.5 align-middle text-xs font-extrabold text-ember-300"
                    title="Renaissances"
                  >
                    🔥 ×{profile.renaissances}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {profile.rank
                  ? `${profile.rank <= 3 ? MEDALS[profile.rank - 1] : `#${profile.rank}`} au classement`
                  : 'Pas encore classé'}
                {' • '}inscrit le{' '}
                {new Date(profile.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {/* Stats principales */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <ProfileStat icon="💰" label="Récolté" value={fmt(profile.totalEndocraft)} />
              <ProfileStat icon="👆" label="Clics" value={fmtInt(profile.clicks)} />
              <ProfileStat icon="⏱️" label="Jeu" value={fmtDuration(profile.playMs)} />
              <ProfileStat icon="🎁" label="Cases" value={fmtInt(profile.casesOpened)} />
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
                  <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ember-300">
                    🤝 Équipe ({profile.staff.length}/{STAFF.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {STAFF.filter((m) => profile.staff.includes(m.id)).map((m) => (
                      <img
                        key={m.id}
                        src={m.icon}
                        alt={m.pseudo}
                        title={`${m.pseudo} — ${m.role}`}
                        className="pixelated h-9 w-9 rounded-lg bg-black/40 ring-1 ring-white/10"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Butin de cases */}
              <section>
                <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ember-300">
                  🎁 Butin de cases
                </h4>
                {(() => {
                  const items = [];
                  // Upgrades exclusives possédées
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
                          onClick={() => setSelectedLoot(selectedLoot?.id === u.id ? null : { id: u.id, icon: u.icon, name: u.name, rarity: u.rarity, desc: u.desc })}
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
                          onClick={() => setSelectedLoot(selectedLoot?.id === id ? null : { id, name: sk.name, rarity: 'legendaire', emoji: '💗', desc: sk.desc })}
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
                          onClick={() => setSelectedLoot(selectedLoot?.id === id ? null : { id, name: tag.label, rarity: tag.rarity, emoji: '🏷️', desc: 'Tag de prestige affiché à côté du pseudo au classement et sur le profil.' })}
                        />
                      );
                    }
                  }
                  return items.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-1.5">{items}</div>
                      {selectedLoot && (
                        <div
                          className="animate-pop mt-2 flex items-center gap-3 rounded-xl border p-3"
                          style={{
                            borderColor: RARITIES[selectedLoot.rarity]?.color,
                            background: `${RARITIES[selectedLoot.rarity]?.color}0d`,
                          }}
                        >
                          {selectedLoot.icon ? (
                            <img
                              src={selectedLoot.icon}
                              alt=""
                              className="pixelated h-10 w-10 shrink-0"
                            />
                          ) : (
                            <span className="shrink-0 text-3xl">
                              {selectedLoot.emoji}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-slate-100">
                              {selectedLoot.name}
                              <span
                                className="ml-2 text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: RARITIES[selectedLoot.rarity]?.color }}
                              >
                                {RARITIES[selectedLoot.rarity]?.label}
                              </span>
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                              {selectedLoot.desc}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] italic text-slate-500">
                      Aucun trésor de case pour l’instant. La chance n’a pas encore tourné.
                    </p>
                  );
                })()}
              </section>
            </div>

            {/* Générateurs */}
            {Object.keys(profile.generators).length > 0 && (
              <section>
                <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ember-300">
                  🪓 Générateurs
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {GENERATORS.filter((g) => (profile.generators[g.id] || 0) > 0).map(
                    (g) => (
                      <span
                        key={g.id}
                        title={`${g.name} ×${profile.generators[g.id]}`}
                        className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-black/40 ring-1 ring-white/10"
                      >
                        <img src={g.icon} alt={g.name} className="pixelated h-8 w-8" />
                        <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-ember-600 px-1 text-[9px] font-extrabold text-white">
                          {profile.generators[g.id]}
                        </span>
                      </span>
                    )
                  )}
                </div>
              </section>
            )}

            {/* Succès */}
            <section>
              <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ember-300">
                🏅 Succès ({profile.achievements.length}/{ACHIEVEMENTS.length})
              </h4>
              <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
                {ACHIEVEMENTS.map((a) => {
                  const done = profile.achievements.includes(a.id);
                  return (
                    <span
                      key={a.id}
                      title={done ? `${a.name} — ${a.desc}` : a.desc}
                      className={`flex aspect-square items-center justify-center rounded-lg text-lg ${
                        done
                          ? 'bg-ember-950/40 ring-1 ring-ember-500/40'
                          : 'bg-black/30 opacity-40 grayscale'
                      }`}
                    >
                      {done ? a.icon : '🔒'}
                    </span>
                  );
                })}
              </div>
            </section>

            <p className="text-center text-[10px] text-slate-500">
              Dernière activité : {new Date(profile.updatedAt).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
