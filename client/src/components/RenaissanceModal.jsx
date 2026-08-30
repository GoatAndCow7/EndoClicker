import { useGame } from '../game/store';
import { fmt, fmtInt } from '../game/format';
import { RENAISSANCE, GENERATORS, STAFF } from '../game/constants';
import { fx } from '../game/fx';
import { playAchievement } from '../game/audio';

export default function RenaissanceModal({ onClose }) {
  const endocraft = useGame((s) => s.endocraft);
  const totalEndocraft = useGame((s) => s.totalEndocraft);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const staff = useGame((s) => s.staff);
  const renaissances = useGame((s) => s.renaissances);
  const doRenaissance = useGame((s) => s.doRenaissance);

  const genCount = Object.values(generators).reduce((a, b) => a + b, 0);
  const nextCount = renaissances + 1;
  const nextBonus = Math.round(nextCount * RENAISSANCE.multPerRenaissance * 100);
  const staffNames = STAFF.filter((m) => staff.includes(m.id)).map(
    (m) => m.pseudo
  );
  const ownedGens = GENERATORS.filter((g) => (generators[g.id] || 0) > 0);

  const confirm = () => {
    if (doRenaissance()) {
      playAchievement();
      fx.confetti();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="panel animate-pop relative w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="border-b border-white/10 bg-ember-950/40 p-4 text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-ember-600/25 text-3xl ring-2 ring-ember-500/50">
            🔥
          </div>
          <h2 className="text-xl font-extrabold">Renaissance n°{nextCount}</h2>
          <p className="mt-1 text-xs text-slate-400">
            Recommencez à zéro en gardant l'essentiel.
          </p>
        </div>

        <div className="max-h-[55vh] space-y-4 overflow-y-auto p-4">
          {/* Gains */}
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
              ✅ Vous gagnez
            </h3>
            <ul className="space-y-1 text-xs text-slate-200">
              <li>
                🔥 Production permanente{' '}
                <b className="text-emerald-300">+15 %</b> — total après
                renaissance :{' '}
                <b className="text-emerald-300">+{nextBonus} %</b>
              </li>
              <li>🏅 Renaissance n°{nextCount} affichée au classement et sur votre profil</li>
              <li>⚡ Chaque run suivant ira plus vite que le précédent</li>
            </ul>
          </section>

          {/* Conservé */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              🎒 Vous gardez
            </h3>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>🏅 Tous vos succès débloqués</li>
              <li>✨ Vos skins de pièce (EndoSage, EndoBlaze, EndoRoi…)</li>
              <li>🎁 Vos exclusives de cases, skins et tags obtenus</li>
              <li>📊 Vos stats de clics et de pommes attrapées</li>
            </ul>
          </section>

          {/* Pertes */}
          <section className="rounded-xl border border-red-500/30 bg-red-950/20 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-red-300">
              ⚠️ Vous perdez
            </h3>
            <ul className="space-y-1 text-xs text-slate-300">
              <li>
                💰 Solde : <b>{fmt(endocraft)}</b> EndoCraft
              </li>
              <li>
                🪓 <b>{fmtInt(genCount)}</b> générateurs
                {ownedGens.length > 0 && (
                  <span className="ml-1 text-slate-500">
                    ({ownedGens.map((g) => g.name).slice(0, 4).join(', ')}
                    {ownedGens.length > 4 ? '…' : ''})
                  </span>
                )}
              </li>
              <li>
                ⬆️ <b>{upgrades.length}</b> améliorations
              </li>
              {staffNames.length > 0 && (
                <li>
                  🤝 L'équipe : <b>{staffNames.join(', ')}</b> (à recruter)
                </li>
              )}
            </ul>
          </section>

          <p className="text-center text-[10px] text-slate-500">
            Total récolté cette run : {fmt(totalEndocraft)} — le compteur repart
            à zéro.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-white/10 p-3">
          <button className="btn-ghost flex-1 text-sm" onClick={onClose}>
            Pas encore
          </button>
          <button
            className="btn flex-1 bg-ember-600 text-sm text-white hover:bg-ember-500"
            onClick={confirm}
          >
            🔥 Renaître (+15 %)
          </button>
        </div>
      </div>
    </div>
  );
}
