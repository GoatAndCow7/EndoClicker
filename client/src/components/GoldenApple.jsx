import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { fx } from '../game/fx';
import { fmt } from '../game/format';
import { playApple } from '../game/audio';
import { APPLE_TYPES } from '../game/constants';

export default function GoldenApple() {
  const apple = useGame((s) => s.apple);
  const clickApple = useGame((s) => s.clickApple);
  const rainApples = useGame((s) => s.rainApples);
  const clickRainApple = useGame((s) => s.clickRainApple);

  // Fantôme de capture : la pomme éclate sur place pendant 320 ms.
  const [ghost, setGhost] = useState(null);
  const ghostTimer = useRef(0);

  useEffect(() => () => clearTimeout(ghostTimer.current), []);

  const handleRainClick = (e, id) => {
    e.stopPropagation();
    const wasMini = !!rainApples.find((a) => a.id === id)?.mini;
    const gain = clickRainApple(id);
    if (gain !== null && gain !== undefined) {
      playApple();
      fx.burst(e.clientX, e.clientY, { count: 10, power: 0.9 });
      fx.float(
        e.clientX,
        e.clientY - 16,
        `+${fmt(gain)}`,
        wasMini ? 'ec-float-mini ec-float-shadow' : 'ec-float-mini'
      );
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    // Posé avant clickApple() : le store vide la pomme immédiatement.
    const captured = apple
      ? {
          x: apple.x,
          y: apple.y,
          type: apple.type || 'doree',
          key: `${apple.id}-${Date.now()}`,
        }
      : null;
    const wasThere = !!apple;
    const reward = clickApple();
    if (!wasThere) return;
    if (captured) {
      setGhost(captured);
      clearTimeout(ghostTimer.current);
      ghostTimer.current = setTimeout(() => setGhost(null), 320);
    }
    fx.burst(e.clientX, e.clientY, { count: 30, power: 1.5 });
    fx.confetti();
    if (reward?.type === 'lucky' || reward?.gain) {
      fx.float(e.clientX, e.clientY - 20, `+${fmt(reward.gain ?? '')}`);
    }
    if (reward?.type === 'maudite') {
      fx.float(e.clientX, e.clientY - 20, '…');
    }
  };

  const def = apple ? APPLE_TYPES[apple.type || 'doree'] : null;
  const ghostDef = ghost ? APPLE_TYPES[ghost.type] : null;

  return (
    <>
      {apple && def && (
        <button
          type="button"
          onClick={handleClick}
          className="focus-ring fixed z-40 flex h-16 w-16 cursor-pointer items-center justify-center"
          style={{
            left: `${apple.x}%`,
            top: `${apple.y}%`,
            touchAction: 'manipulation',
            filter: `drop-shadow(0 0 18px rgba(255, 200, 80, 0.95)) drop-shadow(0 0 40px rgba(251, 129, 19, 0.6)) ${def.filter}`,
          }}
          title={def.title}
          aria-label={def.name}
        >
          {/* Spawn et flottement sur deux éléments : les keyframes
              ne se marchent pas dessus */}
          <div className="ec-apple-spawn flex h-full w-full items-center justify-center">
            <img
              src="/textures/golden_apple.png"
              alt={def.name}
              draggable={false}
              className="pixelated h-14 w-14 animate-apple-bob"
            />
          </div>
        </button>
      )}

      {ghost && ghostDef && (
        <div
          key={ghost.key}
          aria-hidden="true"
          className="ec-apple-pop pointer-events-none fixed z-40 flex h-16 w-16 items-center justify-center"
          style={{
            left: `${ghost.x}%`,
            top: `${ghost.y}%`,
            filter: `drop-shadow(0 0 18px rgba(255, 200, 80, 0.95)) drop-shadow(0 0 40px rgba(251, 129, 19, 0.6)) ${ghostDef.filter}`,
          }}
        >
          <span className="ec-apple-ring" />
          <img
            src="/textures/golden_apple.png"
            alt=""
            draggable={false}
            className="pixelated h-14 w-14"
          />
        </div>
      )}

      {/* Pommes de pluie et mini-pommes de tempête : tombent, cliquables */}
      {rainApples.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={(e) => handleRainClick(e, a.id)}
          className="rain-apple"
          style={{
            left: `${a.x}%`,
            animationDuration: `${a.fallMs}ms`,
            filter: a.mini
              ? 'hue-rotate(270deg) brightness(0.6) drop-shadow(0 0 10px rgba(160, 100, 255, 0.8))'
              : 'drop-shadow(0 0 12px rgba(255, 200, 80, 0.85))',
          }}
          title="Attrapez-la !"
          aria-label="Pomme de pluie"
        >
          <img
            src="/textures/golden_apple.png"
            alt=""
            draggable={false}
            className={`pixelated ${a.mini ? 'h-7 w-7' : 'h-10 w-10'}`}
          />
        </button>
      ))}
    </>
  );
}
