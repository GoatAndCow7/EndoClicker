import { useEffect, useState } from 'react';
import { useGame } from '../game/store';

export default function Toasts() {
  const storeToasts = useGame((s) => s.toasts);

  // Rendu local : les toasts du store + ceux en cours de sortie (le
  // store les retire d'un coup, on les garde 220 ms le temps de
  // l'animation ec-toast-out, le tas se compacte dessous).
  const [items, setItems] = useState([]);
  // Fermeture manuelle : ids masqués localement, filtrés au rendu.
  const [hidden, setHidden] = useState(() => new Set());

  useEffect(() => {
    const current = new Set(storeToasts.map((t) => t.id));

    setItems((prev) => {
      let changed = false;
      const next = [];
      for (const it of prev) {
        if (current.has(it.id) || it.leaving) {
          next.push(it);
        } else {
          changed = true;
          next.push({ ...it, leaving: true });
        }
      }
      for (const t of storeToasts) {
        if (!next.some((x) => x.id === t.id)) {
          changed = true;
          next.push({ ...t, leaving: false });
        }
      }
      return changed ? next : prev;
    });

    const timer = setTimeout(() => {
      setItems((prev) => {
        const next = prev.filter((it) => !it.leaving || current.has(it.id));
        return next.length === prev.length ? prev : next;
      });
      setHidden((prev) => {
        if (prev.size === 0) return prev;
        let changed = false;
        const next = new Set(prev);
        for (const id of prev) {
          if (!current.has(id)) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [storeToasts]);

  const dismiss = (id) => {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-3 top-16 z-50 flex w-72 flex-col gap-2 lg:right-4"
    >
      {items
        .filter((t) => !hidden.has(t.id))
        .map((t) => (
          <div
            key={t.id}
            className={`toast pointer-events-auto ${t.leaving ? 'ec-toast-out' : ''}`}
          >
            <span className="text-2xl" aria-hidden="true">
              {t.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="toast-title">{t.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-ink-3">
                {t.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="focus-ring -mr-1 -mt-1 shrink-0 self-start rounded-lg p-1 text-ink-4 transition-colors hover:text-ink"
              aria-label="Fermer la notification"
            >
              ✕
            </button>
          </div>
        ))}
    </div>
  );
}
