// ---------- Formatage des grands nombres ----------

const UNITS = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];

export function fmt(n) {
  if (Number.isNaN(n)) return '—';
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    return n < 10 && n % 1 !== 0 ? n.toFixed(1) : String(Math.floor(n));
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= UNITS.length) return n.toExponential(2);
  const scaled = n / Math.pow(10, tier * 3);
  const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return scaled.toFixed(decimals) + ' ' + UNITS[tier];
}

export function fmtInt(n) {
  if (Number.isNaN(n)) return '—';
  return Math.floor(n).toLocaleString('fr-FR');
}

export function fmtDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h} h ${min} min`;
  if (min > 0) return `${min} min ${s} s`;
  return `${s} s`;
}
