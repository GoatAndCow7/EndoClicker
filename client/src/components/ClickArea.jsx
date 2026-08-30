import { useEffect, useRef } from 'react';
import { useGame, getClickPower, getStaffMults } from '../game/store';
import { fmt } from '../game/format';
import { fx } from '../game/fx';
import { playClick } from '../game/audio';
import { COIN_SKIN_BY_ID } from '../game/constants';

export default function ClickArea() {
  const containerRef = useRef(null);
  const coinRef = useRef(null);
  const click = useGame((s) => s.click);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const boostMult = useGame((s) => s.boostMult);
  const boostEndsAt = useGame((s) => s.boostEndsAt);
  const equippedCoin = useGame((s) => s.equippedCoin);
  const staff = useGame((s) => s.staff);
  const renaissances = useGame((s) => s.renaissances);
  const skin = COIN_SKIN_BY_ID[equippedCoin] || COIN_SKIN_BY_ID.default;
  const autoPerSec = getStaffMults({ staff, upgrades }).autoClickPerSec;
  // État complet pour le calcul : équipe (Lulu ×2…), renaissances et skin
  const clickPower = getClickPower({
    generators,
    upgrades,
    staff,
    renaissances,
    equippedCoin,
  });

  // Le skin teinte les effets (chiffres, particules, halo)
  useEffect(() => {
    fx.setTheme(skin.fx || {});
  }, [skin]);

  // Auto-clicker d'Emmanuel2403 : clics fantômes VISIBLES sur la pièce
  // (chiffre flottant + mini étincelles + petite onde), sans son.
  useEffect(() => {
    if (autoPerSec <= 0) return;
    const t = setInterval(() => {
      if (document.hidden) return; // onglet en fond : aucun visuel inutile
      const coin = coinRef.current;
      if (!coin) return;
      const rect = coin.getBoundingClientRect();
      const x = rect.left + rect.width * (0.3 + Math.random() * 0.4);
      const y = rect.top + rect.height * (0.3 + Math.random() * 0.4);
      const s = useGame.getState();
      const boost = s.boostEndsAt > Date.now() ? s.boostMult : 1;
      const gain = getClickPower(s) * boost;
      fx.float(x, y, `+${fmt(gain)}`);
      fx.burst(x, y, { count: 3, power: 0.6 });
      const ripple = document.createElement('span');
      ripple.className = 'ripple ripple-auto';
      ripple.style.left = '50%';
      ripple.style.top = '50%';
      ripple.style.borderColor = fx.theme.ripple;
      coin.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    }, Math.round(1000 / autoPerSec));
    return () => clearInterval(t);
  }, [autoPerSec]);

  const handleClick = (e) => {
    const gain = click();
    const boost = boostEndsAt > Date.now() ? boostMult : 1;
    playClick();

    // Effets visuels
    fx.burst(e.clientX, e.clientY, { count: boost > 1 ? 22 : 14, power: boost > 1 ? 1.4 : 1 });
    fx.float(e.clientX, e.clientY - 20, `+${fmt(gain)}`);

    // Onde de choc sur la pièce
    const coin = coinRef.current;
    if (coin) {
      coin.classList.remove('coin-press');
      void coin.offsetWidth; // reflow pour rejouer l'animation
      coin.classList.add('coin-press');
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = '50%';
      ripple.style.top = '50%';
      ripple.style.borderColor = fx.theme.ripple; // couleur du skin
      coin.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    }
  };

  const boosted = boostEndsAt > Date.now();

  return (
    <div
      ref={containerRef}
      className="relative flex w-full flex-1 select-none items-center justify-center overflow-hidden py-6 lg:min-h-[300px]"
    >
      {/* Halo lumineux derrière le logo (couleur du skin) */}
      <div className="pointer-events-none absolute h-72 w-72 lg:h-96 lg:w-96">
        <div
          className="halo-pulse absolute inset-0 rounded-full blur-3xl"
          style={{ backgroundColor: skin.fx?.halo || 'rgba(251, 129, 19, 0.25)' }}
        />
      </div>

      <button
        ref={coinRef}
        onClick={handleClick}
        aria-label={`Cliquer pour gagner ${fmt(clickPower)} EndoCraft`}
        className={`coin relative h-60 w-60 cursor-pointer transition-transform duration-100 hover:scale-[1.03] active:scale-95 lg:h-80 lg:w-80 ${
          boosted ? 'coin-boosted' : ''
        }`}
      >
        <img
          src={skin.icon}
          alt=""
          draggable={false}
          style={skin.imgFilter ? { filter: skin.imgFilter } : undefined}
        />
      </button>

      <a
        href="https://github.com/GoatAndCow7/EndoClicker"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-0 text-[10px] font-medium text-slate-500/80 transition-colors hover:text-slate-300"
      >
        EndoClicker — basé sur le serveur EndoCraft par GoatAndCow · disponible
        sur GitHub
      </a>
    </div>
  );
}
