import { useEffect, useRef, useState } from 'react';
import Shop, { BUY_AMOUNTS } from './Shop.jsx';
import Upgrades from './Upgrades.jsx';
import Staff from './Staff.jsx';
import CosmeticsPanel from './CosmeticsPanel.jsx';
import QuestsPanel from './QuestsPanel.jsx';
import CasesPanel from './CasesPanel.jsx';
import Achievements from './Achievements.jsx';
import Leaderboard from './Leaderboard.jsx';
import { useGame } from '../game/store';

// Le panel admin est accessible via le bouton 🛠️ du header (compte GoatAndCow)
const TABS = [
  {
    id: 'shop',
    label: 'Boutique',
    icon: '🛒',
    sub: 'Plus vous en achetez, plus c’est cher. Classique.',
  },
  {
    id: 'upgrades',
    label: 'Upgrades',
    icon: '⬆️',
    sub: 'Des bonus permanents — contrairement à votre banque.',
  },
  {
    id: 'staff',
    label: 'Équipe',
    icon: '🤝',
    sub: 'Ils bossent pendant que vous cliquez.',
  },
  {
    id: 'cosmetics',
    label: 'Cosmétiques',
    icon: '✨',
    sub: 'La production, c’est bien. Le style, c’est mieux.',
  },
  {
    id: 'quests',
    label: 'Quêtes',
    icon: '📋',
    sub: 'Trois objectifs par jour, remise à zéro à minuit.',
  },
  {
    id: 'cases',
    label: 'Caisses',
    icon: '🎁',
    sub: 'L’espoir fait vivre. Parfois, il rapporte.',
  },
  {
    id: 'achievements',
    label: 'Succès',
    icon: '🏅',
    sub: 'À débloquer sans modération.',
  },
  {
    id: 'leaderboard',
    label: 'Classement',
    icon: '🏆',
    sub: 'Les légendes d’EndoCraft, en direct.',
  },
];

const CONTENT = {
  shop: Shop,
  upgrades: Upgrades,
  staff: Staff,
  cosmetics: CosmeticsPanel,
  quests: QuestsPanel,
  cases: CasesPanel,
  achievements: Achievements,
  leaderboard: Leaderboard,
};

export default function TabsPanel() {
  const [tab, setTab] = useState('shop');
  const [buyAmount, setBuyAmount] = useState(1);
  const achievementsCount = useGame((s) => s.achievements.length);
  const scrollRef = useRef(null);

  // L'onglet Équipe s'ouvre en BAS de la liste (les recrues les moins
  // chères d'abord) ; les autres onglets repartent du haut.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (tab === 'staff') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTo({ top: 0 });
    }
  }, [tab]);

  const current = TABS.find((t) => t.id === tab);
  const Active = CONTENT[tab];

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <nav
        role="tablist"
        aria-label="Sections du jeu"
        className="tab-nav flex flex-wrap gap-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-label={t.label}
            onClick={() => setTab(t.id)}
            className={`tab-btn focus-ring flex h-11 md:h-10 items-center gap-1.5 px-3 ${
              tab === t.id ? 'tab-btn-active' : ''
            }`}
          >
            <span aria-hidden="true">{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            {t.id === 'achievements' && (
              <span className="rounded-full bg-void/30 px-1.5 text-3xs font-bold tabular-nums text-ink-3">
                {achievementsCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <h2 className="section-title">{current.label}</h2>
          <p className="text-2xs text-ink-4">{current.sub}</p>
        </div>
        {tab === 'shop' && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline label-caps text-ink-4">
              Achat groupé
            </span>
            <div
              className="flex gap-0.5 rounded-lg bg-void/30 p-0.5"
              role="group"
              aria-label="Quantité d’achat par ligne"
            >
              {BUY_AMOUNTS.map((a) => {
                const active = buyAmount === a;
                return (
                  <button
                    key={String(a)}
                    type="button"
                    onClick={() => setBuyAmount(a)}
                    aria-pressed={active}
                    className={`focus-ring h-11 md:h-9 min-w-11 rounded-md px-2 text-2xs font-bold transition-colors ${
                      active
                        ? 'bg-accent text-white'
                        : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    {a === 'max' ? '×Max' : `×${a}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div key={tab} className="ec-tab-enter">
          <Active {...(tab === 'shop' ? { amount: buyAmount } : {})} />
        </div>
      </div>
    </div>
  );
}
