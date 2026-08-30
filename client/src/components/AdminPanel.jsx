import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { fmt, fmtInt } from '../game/format';
import { useGame, getProduction } from '../game/store';
import { GENERATORS, UPGRADES, STAFF, ACHIEVEMENTS, COIN_SKINS, TAGS } from '../game/constants';
import GameIcon from './GameIcon.jsx';

// ============ Éditeur d'un joueur ============

function NumberField({ label, value, onChange, suffix }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm tabular-nums outline-none focus:border-ember-500/60"
      />
      {suffix && <span className="mt-0.5 block text-[10px] text-slate-500">{suffix}</span>}
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
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              active
                ? 'border-ember-400/60 bg-ember-600/30 text-ember-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
            title={item.name || item.desc}
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

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-red-300">{error}</div>
    );
  }
  if (!user) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ember-500 border-t-transparent" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#17130f] shadow-2xl">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ember-600/20 text-xl">
              🛠️
            </span>
            <div>
              <h3 className="font-extrabold">{user.pseudo}</h3>
              <p className="text-[11px] text-slate-500">
                ID #{user.id} • créé le{' '}
                {new Date(user.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {/* Monnaie */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ember-300">
              💰 EndoCraft
            </h4>
            <div className="grid grid-cols-3 gap-2">
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
                label="Cases ouvertes"
                value={state.casesOpened || 0}
                onChange={(v) => patchState({ casesOpened: Math.max(0, Math.floor(Number(v) || 0)) })}
              />
              <NumberField
                label="Drops légendaires"
                value={state.caseLegendaryDrops || 0}
                onChange={(v) => patchState({ caseLegendaryDrops: Math.max(0, Math.floor(Number(v) || 0)) })}
              />
            </div>
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
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          {/* Générateurs */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ember-300">
              🪓 Générateurs possédés
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GENERATORS.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
                >
                  <GameIcon icon={g.icon} alt={g.name} className="h-6 w-6" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {g.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={state.generators[g.id] || 0}
                    onChange={(e) => setGen(g.id)(e.target.value)}
                    className="w-16 rounded bg-black/40 px-1.5 py-1 text-right text-xs tabular-nums outline-none"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Améliorations */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ember-300">
              ⬆️ Améliorations ({(state.upgrades || []).length}/{UPGRADES.length})
            </h4>
            <Chips items={UPGRADES} selected={state.upgrades || []} onToggle={toggleIn('upgrades')} />
          </section>

          {/* Équipe */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ember-300">
              🤝 Équipe ({(state.staff || []).length}/{STAFF.length})
            </h4>
            <Chips items={STAFF} selected={state.staff || []} onToggle={toggleIn('staff')} />
          </section>

          {/* Succès */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ember-300">
              🏅 Succès ({(state.achievements || []).length}/{ACHIEVEMENTS.length})
            </h4>
            <Chips items={ACHIEVEMENTS} selected={state.achievements || []} onToggle={toggleIn('achievements')} />
          </section>

          {/* Cosmétiques : attribuer/retirer les skins + définir l'équipé */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ember-300">
              ✨ X
            </h4>
            <Chips
              items={COIN_SKINS.filter((s) => s.caseOnly)}
              selected={state.cosmetics || []}
              onToggle={toggleCosmetic}
            />
            <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Skin équipé
            </p>
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
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      equipped
                        ? 'border-emerald-400/60 bg-emerald-600/25 text-emerald-200'
                        : owned
                          ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          : 'cursor-not-allowed border-white/5 bg-white/5 text-slate-600'
                    }`}
                  >
                    {equipped ? '✓ ' : ''}
                    <GameIcon icon={s.icon} alt={s.name} className="h-4 w-4" /> {s.name}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tags de prestige */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ember-300">
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
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      owned
                        ? 'border-ember-500/50 bg-ember-600/25 text-ember-200'
                        : 'border-white/10 bg-white/5 text-slate-500'
                    }`}
                  >
                    {owned ? '✓ ' : ''}
                    {tag.label}
                  </button>
                );
              })}
            </div>
            <p className="mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Tag équipé
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => patchState({ equippedTag: null })}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  !state.equippedTag
                    ? 'border-emerald-400/60 bg-emerald-600/25 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                Aucun
              </button>
              {TAGS.filter((t) => (state.tags || []).includes(t.id)).map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => patchState({ equippedTag: tag.id })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    state.equippedTag === tag.id
                      ? 'border-emerald-400/60 bg-emerald-600/25 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {state.equippedTag === tag.id ? '✓ ' : ''}
                  {tag.label}
                </button>
              ))}
            </div>
          </section>

          {/* Identité */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ember-300">
              👤 Identité
            </h4>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1">
                <NumberField label="Pseudo" value={newPseudo} onChange={setNewPseudo} />
              </div>
              <button
                onClick={savePseudo}
                disabled={busy || newPseudo === user.pseudo}
                className="btn-ghost text-xs disabled:opacity-50"
              >
                Renommer
              </button>
              <div className="min-w-40 flex-1">
                <NumberField
                  label="Nouveau mot de passe"
                  value={newPassword}
                  onChange={setNewPassword}
                  suffix="6 caractères minimum"
                />
              </div>
              <button
                onClick={savePassword}
                disabled={busy || newPassword.length < 6}
                className="btn-ghost text-xs disabled:opacity-50"
              >
                Définir
              </button>
            </div>
          </section>

          {/* Effets en direct (SSE) */}
          <section className="rounded-xl border border-violet-400/30 bg-violet-950/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-violet-300">
                ⚡ Effets en direct
              </h4>
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  user.online
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-slate-500'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    user.online ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
                {user.online ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
            {user.online ? (
              <>
                <p className="mb-2 text-[11px] text-slate-400">
                  Appliqués instantanément sur son écran.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">
                    🔥 Frénésie ×7 :
                  </span>
                  {[30, 120, 300].map((d) => (
                    <button
                      key={d}
                      onClick={() => giveFrenzy(d)}
                      disabled={busy}
                      className="btn-ghost px-2.5 py-1 text-[11px]"
                    >
                      {d >= 60 ? `${d / 60} min` : `${d} s`}
                    </button>
                  ))}
                  <button
                    onClick={() => spawnApple()}
                    disabled={busy}
                    className="btn-ghost px-2.5 py-1 text-[11px]"
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
                      className="btn-ghost px-2.5 py-1 text-[11px]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-slate-500">
                Ce joueur n'est pas connecté — les effets en direct ne peuvent
                pas lui être envoyés.
              </p>
            )}
          </section>

          {/* Anti-triche */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ember-300">
                  🛡️ Anti-triche
                </h4>
                <p className="mt-0.5 text-[11px] text-slate-400">
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
                className={`btn shrink-0 text-xs ${
                  antiCheatOff
                    ? 'bg-amber-600/30 text-amber-300 hover:bg-amber-600/40 border border-amber-500/40'
                    : 'btn-ghost'
                }`}
              >
                {antiCheatOff ? 'Désactivée ⚠️' : 'Activée'}
              </button>
            </div>
          </section>

          {/* Zone dangereuse */}
          <section className="rounded-xl border border-red-500/30 bg-red-950/20 p-3">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-300">
              ⚠️ Zone dangereuse
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setConfirmDanger(confirmDanger === 'reset' ? null : 'reset')}
                className="rounded-lg border border-red-500/40 bg-red-600/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-600/20"
              >
                Réinitialiser la progression
              </button>
              <button
                onClick={() => setConfirmDanger(confirmDanger === 'delete' ? null : 'delete')}
                className="rounded-lg border border-red-500/40 bg-red-600/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-600/20"
              >
                Supprimer le compte
              </button>
            </div>
            {confirmDanger === 'reset' && (
              <div className="mt-2 rounded-lg bg-black/40 p-2 text-xs text-red-200">
                Effacer TOUTE la progression de {user.pseudo} ?
                <button onClick={resetProgress} disabled={busy} className="btn ml-2 bg-red-600 text-white hover:bg-red-500">
                  Confirmer
                </button>
              </div>
            )}
            {confirmDanger === 'delete' && (
              <div className="mt-2 rounded-lg bg-black/40 p-2 text-xs text-red-200">
                Supprimer définitivement le compte {user.pseudo} ?
                <button onClick={deleteAccount} disabled={busy} className="btn ml-2 bg-red-600 text-white hover:bg-red-500">
                  Confirmer
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Pied : enregistrer */}
        <div className="border-t border-white/10 p-3">
          <button onClick={saveState} disabled={busy} className="btn-primary w-full">
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
        <p className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="panel p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Joueurs</p>
            <p className="text-xl font-extrabold text-ember-200">{fmtInt(stats.users)}</p>
          </div>
          <div className="panel p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Économie</p>
            <p className="text-xl font-extrabold text-ember-200">{fmt(stats.economy)}</p>
          </div>
          <div className="panel p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Top</p>
            <p className="truncate text-sm font-bold text-ember-200">
              {stats.top[0] ? `🥇 ${stats.top[0].pseudo}` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Recherche */}
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          refresh(e.target.value);
        }}
        placeholder="🔍 Rechercher un joueur…"
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-ember-500/60"
      />

      {/* Liste */}
      {!users && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      )}
      {users && filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-500">
          Aucun joueur trouvé.
        </p>
      )}
      {users &&
        filtered.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/40 text-sm font-extrabold text-ember-300">
              {u.pseudo.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{u.pseudo}</p>
              <p className="text-[11px] text-slate-500">
                {fmt(u.total)} EndoCraft • 🏅 {u.achievements} • vu le{' '}
                {new Date(u.updated_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <button
              onClick={() => setEditing(u.id)}
              className="btn-ghost shrink-0 text-xs"
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
