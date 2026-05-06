// نظام بث رسائل في الذاكرة لاستخدام SSE.
// نخزّن في globalThis عشان نضمن أن actions و route handlers يتشاركون نفس الـ Map
// (مهم في dev مع HMR وفي بعض إعدادات الإنتاج).

type Listener<T> = (data: T) => void;
type Channels = Map<string, Set<Listener<unknown>>>;

const KEY = Symbol.for("baloot.events.channels");
const g = globalThis as unknown as { [k: symbol]: Channels | undefined };

if (!g[KEY]) g[KEY] = new Map();
const channels: Channels = g[KEY]!;

export function subscribe<T = unknown>(
  channel: string,
  listener: Listener<T>,
): () => void {
  if (!channels.has(channel)) channels.set(channel, new Set());
  const set = channels.get(channel)!;
  set.add(listener as Listener<unknown>);
  return () => {
    set.delete(listener as Listener<unknown>);
    if (set.size === 0) channels.delete(channel);
  };
}

export function publish<T = unknown>(channel: string, data: T): void {
  const set = channels.get(channel);
  if (!set) return;
  set.forEach((l) => {
    try {
      l(data);
    } catch {
      // ignore listener errors
    }
  });
}
