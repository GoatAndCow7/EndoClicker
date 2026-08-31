import { useEffect, useState } from 'react';

const SEEN_KEY = 'endoclicker_v2_seen';

// Notes de version affichées une seule fois (à la première ouverture de la
// V2). Le reset mondial y est expliqué franchement : tout le monde repart
// à égalité sur la nouvelle économie.
export default function ChangelogModal() {
  const [open, setOpen] = useState(
    () => !localStorage.getItem(SEEN_KEY)
  );

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  const close = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nouveautés de la V2"
        className="modal-card max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 className="modal-title">🔥 EndoClicker V2</h3>
          <button className="modal-x" onClick={close} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="modal-body space-y-4 text-sm">
          <p className="text-ink">
            Nouvelle économie, nouveau look, et un grand ménage de printemps.
          </p>

          <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
            <p className="text-2xs font-bold uppercase tracking-widest text-warning-bright">
              Reset général
            </p>
            <p className="mt-1 text-2xs leading-relaxed text-ink-2">
              Tout le monde repart de zéro — comptes conservés, progression
              remise à plat. La V2 change tellement l'équilibrage que partir
              tous à égalité était la seule façon juste de relancer la
              course. Le classement aussi repart blanc.
            </p>
          </div>

          <div>
            <p className="section-title mb-2">Nouveautés</p>
            <ul className="space-y-1.5 text-2xs leading-relaxed text-ink-2">
              <li>
                <b className="text-accent-soft">Renaissance V2</b> — bonus
                permanent bien plus costaud, et les <b>Braises du Phénix</b> :
                un pécule de départ à chaque renaissance pour ne plus
                recliquer 200 fois après le reset.
              </li>
              <li>
                <b className="text-accent-soft">Économie retunée</b> — la
                progression est fluide du bûcheron au Cœur de l'Ancien :
                fini le mur du milieu de partie.
              </li>
              <li>
                <b className="text-accent-soft">Caisses revues</b> — meilleures
                chances globales, drops « banque », et les doublons sont
                désormais <b>remboursés en cash</b> au lieu de partir en fumée.
              </li>
              <li>
                <b className="text-accent-soft">Thème nuit complet</b> — toute
                l'interface s'adapte, plus que le fond.
              </li>
              <li>
                <b className="text-accent-soft">Pleins de correctifs</b> — le
                jeu ne se fige plus pendant les tempêtes d'ombre, les
                renaissances en chaîne sont impossibles, deux onglets ne se
                marchent plus dessus, les frénésies qui se chevauchent
                prennent le meilleur des deux.
              </li>
            </ul>
          </div>

          <p className="text-2xs text-ink-4">
            Bonne chance pour la course — le premier Phénix du serveur, ce
            sera vous.
          </p>
        </div>

        <div className="modal-foot">
          <button
            className="btn-primary focus-ring h-11 w-full text-sm md:h-10"
            onClick={close}
          >
            C'est parti !
          </button>
        </div>
      </div>
    </div>
  );
}
