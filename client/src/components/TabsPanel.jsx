import { useEffect, useRef, useState } from 'react';
import Shop from './Shop.jsx';
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
  { id: 'shop', label: 'Boutique', icon: '🛒' },
  { id: 'upgrades', label: 'Améliorations', icon: '⬆️' },
  { id: 'staff', label: 'Équipe', icon: '🤝' },
  { id: 'cosmetics', label: 'Cosmétiques', icon: '✨' },
  { id: 'quests', label: 'Quêtes', icon: '📋' },
  { id: 'cases', label: 'Cases', icon: '🎁' },
  { id: 'achievements', label: 'Succès', icon: '🏅' },
  { id: 'leaderboard', label: 'Classement', icon: '🏆' },
];

export default function TabsPanel() {
  const [tab, setTab] = useState('shop');
  const achievementsCount = useGame((s) => s.achievements.length);
  const scrollRef = useRef(null);

  // L'onglet Équipe s'ouvre en BAS de la liste (les recrues les moins
  // chères d'abord) ; les autres onglets repartent du haut.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = tab === 'staff' ? el.scrollHeight : 0;
  }, [tab]);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <nav className="mb-3 flex gap-1 rounded-xl bg-black/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-btn ${tab === t.id ? 'tab-btn-active' : ''}`}
          >
            <span className="mr-1">{t.icon}</span>
            <span className="hidden xl:inline">{t.label}</span>
            {t.id === 'achievements' && (
              <span className="ml-1 rounded-full bg-black/30 px-1.5 text-xs tabular-nums">
                {achievementsCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        {tab === 'shop' && <Shop />}
        {tab === 'upgrades' && <Upgrades />}
        {tab === 'staff' && <Staff />}
        {tab === 'cosmetics' && <CosmeticsPanel />}
        {tab === 'quests' && <QuestsPanel />}
        {tab === 'cases' && <CasesPanel />}
        {tab === 'achievements' && <Achievements />}
        {tab === 'leaderboard' && <Leaderboard />}
      </div>
    </div>
  );
}
