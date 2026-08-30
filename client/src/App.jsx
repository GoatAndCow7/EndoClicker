import { useEffect, useRef, useState } from 'react';
import { useGame, startGameLoop } from './game/store';
import { useAuth } from './auth/useAuth';
import { fx } from './game/fx';
import { bindFirstGesture } from './game/audio';
import Header from './components/Header.jsx';
import ClickArea from './components/ClickArea.jsx';
import StatsBar from './components/StatsBar.jsx';
import TabsPanel from './components/TabsPanel.jsx';
import Toasts from './components/Toasts.jsx';
import AuthModal from './components/AuthModal.jsx';
import OfflineModal from './components/OfflineModal.jsx';
import GoldenApple from './components/GoldenApple.jsx';

// Auto : nuit entre 20h et 7h (heure locale du joueur). La préférence
// ('auto' | 'day' | 'night') prime — ?forceNight reste prioritaire pour
// prévisualiser.
function isNight(pref) {
  const force = new URLSearchParams(window.location.search).get('forceNight');
  if (force !== null) return force !== '0';
  if (pref === 'night') return true;
  if (pref === 'day') return false;
  const h = new Date().getHours();
  return h >= 20 || h < 7;
}

// NOTE PERF : ce composant ne s'abonne à AUCUN état qui change à chaque tick
// (endocraft, production...). Chaque zone s'abonne individuellement dans son
// composant, sinon toute l'app re-render 10×/s et le jeu lagge.
export default function App() {
  const canvasRef = useRef(null);
  const floatLayerRef = useRef(null);
  const initialized = useRef(false);
  const dayNightPref = useGame((s) => s.dayNightPref);
  const [night, setNight] = useState(() => isNight(dayNightPref));

  // Bascule auto au passage des heures + réaction à la préférence
  useEffect(() => {
    setNight(isNight(dayNightPref));
    const t = setInterval(() => setNight(isNight(dayNightPref)), 60_000);
    return () => clearInterval(t);
  }, [dayNightPref]);

  useEffect(() => {
    if (initialized.current) return; // StrictMode double-mount
    initialized.current = true;

    fx.init(canvasRef.current, floatLayerRef.current);
    useAuth.getState().init();
    useGame.getState().load();
    startGameLoop();
    bindFirstGesture(); // musique d'ambiance au premier clic
  }, []);

  return (
    <div
      className={`app-bg relative flex h-full flex-col overflow-hidden ${night ? 'night' : ''}`}
    >
      <Header />

      <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 overflow-y-auto p-4 lg:grid lg:grid-cols-[minmax(340px,440px)_1fr] lg:overflow-hidden">
        {/* Colonne gauche : stats + zone de clic */}
        <section className="flex w-full flex-col items-center gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <StatsBar />
          <ClickArea />
        </section>

        {/* Colonne droite : boutique / équipe / succès / classement */}
        <section className="panel flex min-h-[60vh] min-w-0 flex-col overflow-hidden lg:min-h-0">
          <TabsPanel />
        </section>
      </main>

      {/* Effets visuels */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-40"
      />
      <div
        ref={floatLayerRef}
        className="pointer-events-none fixed inset-0 z-40"
      />
      <GoldenApple />

      {/* Overlays */}
      <Toasts />
      <AuthModal />
      <OfflineModal />
    </div>
  );
}
