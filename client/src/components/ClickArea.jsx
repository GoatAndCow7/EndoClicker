import { useEffect, useRef } from 'react';
import { useGame, getClickPower, getStaffMults } from '../game/store';
import { fmt } from '../game/format';
import { fx } from '../game/fx';
import { playClick } from '../game/audio';
import { COIN_SKIN_BY_ID } from '../game/constants';

export default function ClickArea() {
  const sectionRef = useRef(null);
  const coinRef = useRef(null);
  const orbRef = useRef(null);
  const click = useGame((s) => s.click);
  const generators = useGame((s) => s.generators);
  const upgrades = useGame((s) => s.upgrades);
  const boostMult = useGame((s) => s.boostMult);
  const boostEndsAt = useGame((s) => s.boostEndsAt);
  // Tempête : booléen dérivé — l'objet change d'identité à chaque clic
  // (compteur de mini-pommes), le booléen reste stable et ne re-rend rien.
  const stormed = useGame(
    (s) => !!s.shadowStorm && s.shadowStorm.endsAt > Date.now()
  );
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

  // Lueur qui accompagne la souris : desktop uniquement (pointeur fin et
  // mouvement autorisé), déplacement en transform seul, throttlé à une
  // frame, borné à ±90 px autour du centre de la zone de clic.
  useEffect(() => {
    const section = sectionRef.current;
    const orb = orbRef.current;
    if (!section || !orb) return;
    if (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let raf = 0;
    const move = (e) => {
      if (raf) return;
      const { clientX, clientY } = e;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = section.getBoundingClientRect();
        const dx = Math.max(
          -90,
          Math.min(90, clientX - rect.left - rect.width / 2)
        );
        const dy = Math.max(
          -90,
          Math.min(90, clientY - rect.top - rect.height / 2)
        );
        orb.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      });
    };
    const enter = () => orb.classList.add('on');
    const leave = () => orb.classList.remove('on');

    section.addEventListener('pointermove', move);
    section.addEventListener('pointerenter', enter);
    section.addEventListener('pointerleave', leave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      section.removeEventListener('pointermove', move);
      section.removeEventListener('pointerenter', enter);
      section.removeEventListener('pointerleave', leave);
    };
  }, []);

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
      fx.float(x, y, `+${fmt(gain)}`, 'ec-float-mini');
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
    const boosted = boostEndsAt > Date.now();
    playClick();

    // Effets visuels
    fx.burst(e.clientX, e.clientY, {
      count: boosted ? 22 : 14,
      power: boosted ? 1.4 : 1,
    });
    fx.float(
      e.clientX,
      e.clientY - 20,
      `+${fmt(gain)}`,
      boosted ? 'ec-float-frenzy' : ''
    );

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
    <section
      ref={sectionRef}
      className={`relative flex w-full flex-1 select-none flex-col items-center justify-center overflow-hidden py-6 lg:min-h-[300px]${
        stormed ? ' ec-shadow-mode' : ''
      }`}
    >
      {/* Lueur qui suit la souris (souris fine uniquement) */}
      <span className="ec-mouse-glow" ref={orbRef} aria-hidden="true" />

      {/* Halo lumineux derrière la pièce (couleur du skin). La respiration
          anime le wrapper : le blur interne reste dans sa couche GPU. */}
      <div className="ec-halo-breathe pointer-events-none absolute h-72 w-72 lg:h-96 lg:w-96">
        <div
          className="halo-pulse absolute inset-0 rounded-full blur-3xl"
          style={{
            backgroundColor: skin.fx?.halo || 'rgba(251, 129, 19, 0.25)',
          }}
        />
      </div>

      {/* Flottement d'inactivité, frénésie et tempête se posent sur le
          wrapper : le squish du clic (sur le bouton) n'est jamais
          interrompu par une autre animation. */}
      <div
        className={`ec-coin-idle relative${boosted ? ' ec-coin-frenzy' : ''}${
          stormed ? ' ec-coin-shadow' : ''
        }`}
      >
        <button
          ref={coinRef}
          onClick={handleClick}
          aria-label={`Cliquer pour gagner ${fmt(clickPower)} EndoCraft`}
          style={{ borderRadius: 9999 }}
          className="coin focus-ring relative flex h-56 w-56 cursor-pointer items-center justify-center transition-transform duration-100 hover:scale-[1.03] sm:h-64 sm:w-64 lg:h-80 lg:w-80"
        >
          <img
            src={skin.icon}
            alt=""
            draggable={false}
            className={`h-40 w-40 sm:h-48 sm:w-48 lg:h-64 lg:w-64${
              boosted ? ' coin-boosted' : ''
            }`}
            style={skin.imgFilter ? { filter: skin.imgFilter } : undefined}
          />
          {boosted && <span className="ec-sheen" aria-hidden="true" />}
        </button>
      </div>

      {/* Pied de scène : puissance du clic et clics fantômes par seconde */}
      <p className="relative mt-2 flex items-center gap-3 rounded-full border border-line/10 bg-void/30 px-4 py-1.5 text-2xs tabular-nums text-ink-2">
        <span>👆 +{fmt(clickPower)} / clic</span>
        {autoPerSec > 0 && <span>· 👻 {autoPerSec} clics/s</span>}
      </p>

      <a
        href="https://github.com/GoatAndCow7/EndoClicker"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-1.5 text-3xs font-medium text-ink-4 transition-colors hover:text-ink-2"
      >
        EndoClicker — basé sur le serveur EndoCraft par GoatAndCow · disponible
        sur GitHub
      </a>
    </section>
  );
}
