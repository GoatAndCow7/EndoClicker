import { useGame } from '../game/store';

export default function Toasts() {
  const toasts = useGame((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in flex items-start gap-3 rounded-xl border border-ember-500/40 bg-[#1a1208] p-3 shadow-xl shadow-black/50"
        >
          <span className="text-2xl">{t.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ember-200">{t.title}</p>
            <p className="text-xs leading-snug text-slate-300">{t.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
