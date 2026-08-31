import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { fmt, fmtInt } from '../game/format';
import { useGame, getProduction } from '../game/store';
import { GENERATORS, UPGRADES, STAFF, ACHIEVEMENTS, COIN_SKINS, TAGS } from '../game/constants';
import GameIcon from './GameIcon.jsx';

// ============ Éditeur d'un joueur ============

function NumberField({ label, value, onChange, suffix, type = 'number' }) {
  return (
    <label className="block">
      <span className="label-caps mb-1 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input focus-ring tabular-nums text-sm"
      />
      {suffix && <span className="mt-0.5 block text-3xs text-ink-4">{suffix}</span>}
    </label>
  );
}

function Chips({ items, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            aria-pressed={active}
            title={item.name || item.desc}
            className={active ? 'chip chip-accent' : 'chip text-ink-3 hover:text-ink'}
          >
            {active ? '✓ ' : ''}
            <GameIcon icon={item.icon} alt={item.name} className="mr-1 h-4 w-4" />{' '}
            {item.name}
          </button>
        );
      })}
    </div>
  );
}

function UserEditor({ userId, onClose, onSaved }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPseudo, setNewPseudo] = useState('');
  const [antiCheatOff, setAntiCheatOff] = useState(false);
  const [confirmDanger, setConfirmDanger] = useState(null); // 'reset' | 'delete' | null
  const addToast = useGame((s) => s.addToast);

  useEffect(() => {
    api(`/api/admin/users/${userId}`)
      .then(({ user }) => {
        setUser(user);
        setNewPseudo(user.pseudo);
        setAntiCheatOff(user.antiCheatDisabled);
      })
      .catch((e) => setError(e.message));
  }, [userId]);

  if (error && !user) {
    return (
      <div className="p-6 text-center text-sm text-danger-bright">{error}</div>
    );
  }
  if (!user) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="spinner" />
      </div>
    );
  }

  const state = user.state || {
    endocraft: 0,
    totalEndocraft: 0,
    clicks: 0,
    generators: {},
    upgrades: [],
    staff: [],
    achievements: [],
  };

  const patchState = (patch) => setUser({ ...user, state: { ...state, ...patch } });
  const setNumber = (key) => (v) => patchState({ [key]: Math.max(0, Number(v) || 0) });
  const toggleIn = (key) => (id) => {
    const list = state[key] || [];
    patchState({
      [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    });
  };
  // Retirer un skin équipé ramène la pièce au skin classique
  const toggleCosmetic = (id) => {
    const list = state.cosmetics || [];
    const removing = list.includes(id);
    patchState({
      cosmetics: removing ? list.filter((x) => x !== id) : [...list, id],
      ...(removing && state.equippedCoin === id ? { equippedCoin: 'default' } : {}),
    });
  };
  const setGen = (genId) => (v) =>
    patchState({ generators: { ...state.generators, [genId]: Math.max(0, Math.floor(Number(v) || 0)) } });

  const run = async (fn, successMsg) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (successMsg) addToast('⚙️', 'Administration', successMsg);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveState = () =>
    run(
      () =>
        api(`/api/admin/users/${user.id}/state`, {
          method: 'PUT',
          // productionRate recalculé : sert de nouvelle référence anti-triche
          body: { state, productionRate: getProduction(state) },
        }),
      `Progression de ${user.pseudo} enregistrée`
    );
  const savePassword = () =>
    run(
      () =>
        api(`/api/admin/users/${user.id}/password`, {
          method: 'PUT',
          body: { password: newPassword },
        }),
      `Mot de passe de ${user.pseudo} modifié`
    );
  const savePseudo = () =>
    run(
      () =>
        api(`/api/admin/users/${user.id}/pseudo`, {
          method: 'PUT',
          body: { pseudo: newPseudo },
        }),
      `Joueur renommé en ${newPseudo}`
    );
  const resetProgress = () =>
    run(
      () => api(`/api/admin/users/${user.id}/reset`, { method: 'POST' }),
      `Progression de ${user.pseudo} réinitialisée`
    );
  const deleteAccount = () =>
    run(
      () => api(`/api/admin/users/${user.id}`, { method: 'DELETE' }),
      `Compte ${user.pseudo} supprimé`
    );
  const toggleAntiCheat = () =>
    run(
      () =>
        api(`/api/admin/users/${user.id}/anticheat`, {
          method: 'PUT',
          body: { disabled: !antiCheatOff },
        }),
      antiCheatOff
        ? 'Anti-triche réactivée'
        : 'Anti-triche désactivée pour ce joueur'
    );
  const giveFrenzy = (durationSec) =>
    run(
      () =>
        api(`/api/admin/users/${user.id}/frenzy`, {
          method: 'POST',
          body: { durationSec },
        }),
      `⚡ Frénésie ×7 envoyée (${
        durationSec >= 60 ? `${durationSec / 60} min` : `${durationSec} s`
      }) !`
    );
  const spawnApple = (type) =>
    run(
      () =>
        api(`/api/admin/users/${user.id}/spawn-apple`, {
          method: 'POST',
          body: { type },
        }),
      '🍎 Pomme envoyée sur son écran !'
    );

  return (
    <div className="modal-backdrop">
      <div className="modal-card w-full max-w-2xl">
        {/* En-tête */}
        <div className="modal-head">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="icon-tile">🛠️</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-base font-extrabold text-ink">{user.pseudo}</h3>
                <span className={user.online ? 'chip chip-success' : 'chip chip-info'}>
                  ● {user.online ? 'En ligne' : 'Hors ligne'}
                </span>
                {antiCheatOff && (
                  <span className="chip chip-warning">Anti-triche OFF</span>
                )}
              </div>
              <p className="mt-0.5 text-2xs text-ink-4">
                ID #{user.id} • créé le{' '}
                {new Date(user.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-x"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="modal-body space-y-3">
          {error && (
            <p className="rounded-xl border border-danger/40 bg-danger-deep/40 px-3 py-2 text-sm text-danger-bright">
              {error}
            </p>
          )}

          {/* Monnaie */}
          <section className="panel-flat rounded-xl p-3">
            <h4 className="section-title mb-2">💰 EndoCraft</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <NumberField label="Solde actuel" value={state.endocraft} onChange={setNumber('endocraft')} />
              <NumberField label="Total récolté" value={state.totalEndocraft} onChange={setNumber('totalEndocraft')} />
              <NumberField label="Clics" value={state.clicks} onChange={setNumber('clicks')} />
              <NumberField
                label="Total à vie (Renaissance)"
                value={state.lifetimeEndocraft || 0}
                onChange={(v) => patchState({ lifetimeEndocraft: Math.max(0, Number(v) || 0) })}
                suffix="Seuil Renaissance : 1 T à vie"
              />
              <NumberField
                label="Renaissances"
                value={state.renaissances || 0}
                onChange={(v) => patchState({ renaissances: Math.max(0, Math.floor(Number(v) || 0)) })}
                suffix="×15 % de production chacune"
              />
              <NumberField
                label="Caisses ouvertes"
                value={state.casesOpened || 0}
                onChange={(v) => patchState({ casesOpened: Math.max(0, Math.floor(Number(v) || 0)) })}
              />
              <NumberField
                label="Drops légendaires"
                value={state.caseLegendaryDrops || 0}
                onChange={(v) => patchState({ caseLegendaryDrops: Math.max(0, Math.floor(Number(v) || 0)) })}
              />
            </div>
            {state.lastRenaissanceLifetime != null && (
              <p className="mt-2 text-2xs text-ink-3">
                Dernier seuil :{' '}
                <span className="font-bold tabular-nums text-ink-2">
                  {fmt(state.lastRenaissanceLifetime)}
                </span>
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { label: '+1k', fn: () => patchState({ endocraft: state.endocraft + 1e3 }) },
                { label: '+1M', fn: () => patchState({ endocraft: state.endocraft + 1e6 }) },
                { label: '+1B', fn: () => patchState({ endocraft: state.endocraft + 1e9 }) },
                { label: '×2', fn: () => patchState({ endocraft: state.endocraft * 2 }) },
                { label: 'Vider', fn: () => patchState({ endocraft: 0 }) },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={b.fn}
                  className="btn-ghost focus-ring h-9 px-2.5 text-2xs"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          {/* Générateurs */}
          <section className="panel-flat rounded-xl p-3">
            <h4 className="section-title mb-2">🪓 Générateurs possédés</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GENERATORS.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 rounded-lg border border-line/10 bg-void/30 px-2 py-1.5"
                >
                  <GameIcon icon={g.icon} alt={g.name} className="h-6 w-6 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-2">
                    {g.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={state.generators[g.id] || 0}
                    onChange={(e) => setGen(g.id)(e.target.value)}
                    className="input focus-ring tabular-nums w-16 px-1.5 py-1 text-right text-xs"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Améliorations */}
          <section className="panel-flat rounded-xl p-3">
            <h4 className="section-title mb-2">
              ⬆️ Améliorations ({(state.upgrades || []).length}/{UPGRADES.length})
            </h4>
            <Chips items={UPGRADES} selected={state.upgrades || []} onToggle={toggleIn('upgrades')} />
          </section>

          {/* Équipe */}
          <section className="panel-flat rounded-xl p-3">
            <h4 className="section-title mb-2">
              🤝 Équipe ({(state.staff || []).length}/{STAFF.length})
            </h4>
            <Chips items={STAFF} selected={state.staff || []} onToggle={toggleIn('staff')} />
          </section>

          {/* Succès */}
          <section className="panel-flat rounded-xl p-3">
            <h4 className="section-title mb-2">
              🏅 Succès ({(state.achievements || []).length}/{ACHIEVEMENTS.length})
            </h4>
            <Chips items={ACHIEVEMENTS} selected={state.achievements || []} onToggle={toggleIn('achievements')} />
          </section>

          {/* Cosmétiques : attribuer/retirer les skins + définir l'équipé */}
          <section className="panel-flat rounded-xl p-3">
            <h4 className="section-title mb-2">
              ✨ Cosmétiques ({(state.cosmetics || []).length}/
              {COIN_SKINS.filter((s) => s.caseOnly).length})
            </h4>
            <Chips
              items={COIN_SKINS.filter((s) => s.caseOnly)}
              selected={state.cosmetics || []}
              onToggle={toggleCosmetic}
            />
            <p className="label-caps mb-1.5 mt-3">Skin équipé</p>
            <div className="flex flex-wrap gap-1.5">
              {COIN_SKINS.map((s) => {
                const owned = s.cost === 0 || (state.cosmetics || []).includes(s.id);
                const equipped = (state.equippedCoin || 'default') === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!owned}
                    onClick={() => patchState({ equippedCoin: s.id })}
                    className={
                      equipped
                        ? 'chip chip-success'
                        : owned
                          ? 'chip text-ink-2 hover:text-ink'
                          : 'chip cursor-not-allowed text-ink-4 opacity-60'
                    }
                  >
                    {equipped ? '✓ ' : ''}
                    <GameIcon icon={s.icon} alt={s.name} className="h-4 w-4" /> {s.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tags de prestige */}
          <section className="panel-flat rounded-xl p-3">
            <h4 className="section-title mb-2">
              🏷️ Tags possédés ({(state.tags || []).length}/{TAGS.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((tag) => {
                const owned = (state.tags || []).includes(tag.id);
                const equipped = state.equippedTag === tag.id;
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const list = state.tags || [];
                      patchState({
                        tags: owned
                          ? list.filter((x) => x !== tag.id)
                          : [...list, tag.id],
                        ...(equipped ? { equippedTag: null } : {}),
                      });
                    }}
                    className={owned ? 'chip chip-accent' : 'chip text-ink-4'}
                  >
                    {owned ? '✓ ' : ''}
                    {tag.label}
                  </button>
                );
              })}
            </div>
            <p className="label-caps mb-1.5 mt-3">Tag équipé</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => patchState({ equippedTag: null })}
                className={!state.equippedTag ? 'chip chip-success' : 'chip text-ink-3 hover:text-ink'}
              >
                Aucun
              </button>
              {TAGS.filter((t) => (state.tags || []).includes(t.id)).map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => patchState({ equippedTag: tag.id })}
                  className={
                    state.equippedTag === tag.id
                      ? 'chip chip-success'
                      : 'chip text-ink-2 hover:text-ink'
                  }
                >
                  {state.equippedTag === tag.id ? '✓ ' : ''}
                  {tag.label}
                </button>
              ))}
            </div>
          </section>

          {/* Identité */}
          <section className="panel-flat rounded-xl p-3">
            <h4 className="section-title mb-2">👤 Identité</h4>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1">
                <NumberField type="text" label="Pseudo" value={newPseudo} onChange={setNewPseudo} />
              </div>
              <button
                onClick={savePseudo}
                disabled={busy || newPseudo === user.pseudo}
                className="btn-ghost focus-ring h-11 text-2xs disabled:opacity-50 md:h-10"
              >
                Renommer
              </button>
              <div className="min-w-40 flex-1">
                <NumberField
                  type="text"
                  label="Nouveau mot de passe"
                  value={newPassword}
                  onChange={setNewPassword}
                  suffix="6 caractères minimum"
                />
              </div>
              <button
                onClick={savePassword}
                disabled={busy || newPassword.length < 6}
                className="btn-ghost focus-ring h-11 text-2xs disabled:opacity-50 md:h-10"
              >
                Définir
              </button>
            </div>
          </section>

          {/* Effets en direct (SSE) */}
          <section className="panel-flat rounded-xl p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="section-title">⚡ Effets en direct</h4>
              <span className={user.online ? 'chip chip-success' : 'chip chip-info'}>
                ● {user.online ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
            {user.online ? (
              <>
                <p className="mb-2 text-2xs text-ink-3">
                  Appliqués instantanément sur son écran.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xs font-semibold text-ink-3">
                    🔥 Frénésie ×7 :
                  </span>
                  {[30, 120, 300].map((d) => (
                    <button
                      key={d}
                      onClick={() => giveFrenzy(d)}
                      disabled={busy}
                      className="btn-ghost focus-ring h-9 px-2.5 text-2xs"
                    >
                      {d >= 60 ? `${d / 60} min` : `${d} s`}
                    </button>
                  ))}
                  <button
                    onClick={() => spawnApple()}
                    disabled={busy}
                    className="btn-ghost focus-ring h-9 px-2.5 text-2xs"
                  >
                    🎲 Pomme aléatoire
                  </button>
                  {[
                    ['doree', '🍎 Dorée'],
                    ['orage', '🌧️ Orage'],
                    ['ombre', '🌑 Ombre'],
                    ['cristal', '💎 Cristal'],
                    ['maudite', '💀 Maudite'],
                  ].map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => spawnApple(type)}
                      disabled={busy}
                      className="btn-ghost focus-ring h-9 px-2.5 text-2xs"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-2xs text-ink-4">
                Ce joueur n'est pas connecté — les effets en direct ne peuvent
                pas lui être envoyés.
              </p>
            )}
          </section>

          {/* Anti-triche */}
          <section className="panel-flat rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="section-title">🛡️ Anti-triche</h4>
                <p className="mt-0.5 text-2xs text-ink-3">
                  {antiCheatOff
                    ? 'Désactivée : les synchros de ce joueur ne sont plus contrôlées.'
                    : 'Activée : les synchros aux gains impossibles sont refusées.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setAntiCheatOff(!antiCheatOff);
                  toggleAntiCheat();
                }}
                disabled={busy}
                className={`focus-ring h-11 shrink-0 text-2xs md:h-10 ${
                  antiCheatOff
                    ? 'btn border border-warning/45 bg-warning/10 text-warning-bright hover:bg-warning/20'
                    : 'btn-ghost'
                }`}
              >
                {antiCheatOff ? 'Désactivée ⚠️' : 'Activée'}
              </button>
            </div>
          </section>

          {/* Zone dangereuse */}
          <section className="panel-flat rounded-xl border-danger/40 bg-danger-deep/30 p-3">
            <h4 className="section-title mb-2 text-danger-bright">
              ⚠️ Zone dangereuse
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setConfirmDanger(confirmDanger === 'reset' ? null : 'reset')}
                className="btn-danger focus-ring h-11 text-2xs md:h-10"
              >
                Réinitialiser la progression
              </button>
              <button
                onClick={() => setConfirmDanger(confirmDanger === 'delete' ? null : 'delete')}
                className="btn-danger focus-ring h-11 text-2xs md:h-10"
              >
                Supprimer le compte
              </button>
            </div>
            {confirmDanger === 'reset' && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-void/40 p-2 text-xs text-danger-bright">
                Effacer TOUTE la progression de {user.pseudo} ?
                <button onClick={resetProgress} disabled={busy} className="btn-danger focus-ring h-9 px-3 text-2xs">
                  Confirmer
                </button>
              </div>
            )}
            {confirmDanger === 'delete' && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-void/40 p-2 text-xs text-danger-bright">
                Supprimer définitivement le compte {user.pseudo} ?
                <button onClick={deleteAccount} disabled={busy} className="btn-danger focus-ring h-9 px-3 text-2xs">
                  Confirmer
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Pied : enregistrer */}
        <div className="modal-foot">
          <button onClick={saveState} disabled={busy} className="btn-primary focus-ring h-11 w-full text-2xs md:h-10">
            {busy ? 'Enregistrement…' : '💾 Enregistrer la progression'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Panneau principal ============

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const refresh = async (q = search) => {
    try {
      const [s, u] = await Promise.all([
        api('/api/admin/stats'),
        api(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
      ]);
      setStats(s);
      setUsers(u.users);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(() => refresh(), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => users || [], [users]);

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl border border-danger/40 bg-danger-deep/40 p-3 text-sm text-danger-bright">
          {error}
        </p>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="stat-tile text-center">
            <p className="text-3xs font-bold uppercase tracking-widest text-ink-3">Joueurs</p>
            <p className="stat-tile-value text-base">{fmtInt(stats.users)}</p>
          </div>
          <div className="stat-tile text-center">
            <p className="text-3xs font-bold uppercase tracking-widest text-ink-3">Économie</p>
            <p className="stat-tile-value text-base">{fmt(stats.economy)}</p>
          </div>
          <div className="stat-tile text-center">
            <p className="text-3xs font-bold uppercase tracking-widest text-ink-3">Top</p>
            <p className="stat-tile-value truncate">
              {stats.top[0] ? `🥇 ${stats.top[0].pseudo}` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            refresh(e.target.value);
          }}
          placeholder="Rechercher un joueur…"
          className="input focus-ring min-w-0 flex-1 text-sm"
        />
        <button
          type="button"
          onClick={() => refresh()}
          className="btn-primary focus-ring h-11 shrink-0 text-2xs md:h-10"
        >
          Rechercher
        </button>
      </div>

      {/* Liste */}
      {!users && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface/5" />
          ))}
        </div>
      )}
      {users && filtered.length === 0 && (
        <p className="empty-state text-sm">Aucun joueur trouvé.</p>
      )}
      {users &&
        filtered.map((u) => (
          <div key={u.id} className="list-row p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-void/40 text-sm font-extrabold text-accent-soft">
              {u.pseudo.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{u.pseudo}</p>
              <p className="truncate text-2xs tabular-nums text-ink-4">
                {fmt(u.total)} EndoCraft • 🏅 {u.achievements} • vu le{' '}
                {new Date(u.updated_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <button
              onClick={() => setEditing(u.id)}
              className="btn-ghost focus-ring h-11 shrink-0 text-2xs md:h-10"
            >
              Éditer
            </button>
          </div>
        ))}

      {editing !== null && (
        <UserEditor
          userId={editing}
          onClose={() => setEditing(null)}
          onSaved={() => refresh()}
        />
      )}
    </div>
  );
}
