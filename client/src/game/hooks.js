import { useEffect, useState } from 'react';
import { useGame } from './store';

// Solde pour l'AFFICHAGE, throttlé (leading + trailing) : les listes
// denses — boutique, caisses — ne se re-rendent pas à chaque clic, ce
// qui est indispensable quand un auto-clicker envoie 30+ clics/s.
// La valeur est toujours la dernière (jamais périmée de plus de
// `intervalMs`), et un achat se répercute sous ~intervalMs.
export function useThrottledEndocraft(intervalMs = 200) {
  const [balance, setBalance] = useState(() => useGame.getState().endocraft);

  useEffect(() => {
    let lastEmit = 0;
    let timer = null;
    const read = () => setBalance(useGame.getState().endocraft);

    const unsub = useGame.subscribe(() => {
      const now = performance.now();
      if (now - lastEmit >= intervalMs) {
        lastEmit = now;
        read();
      } else if (!timer) {
        // trailing : la dernière valeur finit toujours par arriver
        timer = setTimeout(() => {
          timer = null;
          lastEmit = performance.now();
          read();
        }, intervalMs);
      }
    });

    read();
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [intervalMs]);

  return balance;
}
