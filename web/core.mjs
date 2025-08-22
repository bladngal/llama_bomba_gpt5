// Core mechanics for Llama Bomba (browser + Node-friendly)

export const ORB_RADIUS = 14;
export const ORB_SPACING = ORB_RADIUS * 2 - 2; // slight overlap tolerance

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));

export function buildPath(points) {
  const segs = [];
  let lenSum = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const l = dist(x1, y1, x2, y2);
    segs.push({ x1, y1, x2, y2, l, a: lenSum, b: lenSum + l });
    lenSum += l;
  }
  return {
    length: lenSum,
    sample(s) {
      s = clamp(s, 0, lenSum);
      let seg = segs[0];
      for (let i = 0; i < segs.length; i++) {
        if (s <= segs[i].b) { seg = segs[i]; break; }
      }
      const t = seg.l ? (s - seg.a) / seg.l : 0;
      const x = seg.x1 + (seg.x2 - seg.x1) * t;
      const y = seg.y1 + (seg.y2 - seg.y1) * t;
      return { x, y };
    },
  };
}

// Keep chain ordered by s descending (lead first) and spaced
export function enforceOrderAndSpacing(state) {
  const { orbs, leadS } = state;
  orbs.sort((a, b) => b.s - a.s);
  if (orbs.length > 0) {
    orbs[0].s = leadS;
    for (let i = 1; i < orbs.length; i++) {
      orbs[i].s = Math.min(orbs[i].s, orbs[i - 1].s - ORB_SPACING);
    }
  }
}

// Decide to insert before or after a base s by comparing proximity
export function chooseInsertionS(path, baseS, projectilePoint) {
  const sBefore = baseS - ORB_SPACING;
  const sAfter = baseS + ORB_SPACING;
  const posBefore = path.sample(sBefore);
  const posAfter = path.sample(sAfter);
  const dBefore = dist2(projectilePoint.x, projectilePoint.y, posBefore.x, posBefore.y);
  const dAfter = dist2(projectilePoint.x, projectilePoint.y, posAfter.x, posAfter.y);
  return dAfter < dBefore ? sAfter : sBefore;
}

// Remove matches >=3 around index and apply scoring + contraction + chain reactions
export function handleMatches(state, index) {
  const { orbs } = state;
  if (orbs.length === 0 || index < 0 || index >= orbs.length) return 0;
  const color = orbs[index].color;
  let L = index;
  while (L - 1 >= 0 && orbs[L - 1].color === color && Math.abs(orbs[L - 1].s - orbs[L].s) <= ORB_SPACING * 1.5) L--;
  let R = index;
  while (R + 1 < orbs.length && orbs[R + 1].color === color && Math.abs(orbs[R + 1].s - orbs[R].s) <= ORB_SPACING * 1.5) R++;

  const count = R - L + 1;
  if (count >= 3) {
    orbs.splice(L, count);
    const delta = ORB_SPACING * count * 0.9;
    for (let i = 0; i < Math.min(L, orbs.length); i++) {
      orbs[i].s -= delta;
    }
    if (typeof state.leadS === 'number') {
      state.leadS -= delta;
      if (state.leadS < 0) state.leadS = 0;
    }
    if (state.eventBus && typeof state.eventBus.emit === 'function') {
      state.eventBus.emit({ type: 'match_cleared', payload: { color, count }, timestamp: performance?.now?.() ?? Date.now() });
    }
    let total = count;
    if (L > 0 && L < orbs.length) {
      total += handleMatches(state, L - 1);
    }
    return total;
  }
  return 0;
}

export class EventBus {
  constructor() { this.handlers = new Map(); }
  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
  }
  off(type, fn) {
    this.handlers.get(type)?.delete(fn);
  }
  emit(evt) {
    const set = this.handlers.get(evt.type);
    if (!set) return;
    for (const fn of set) fn(evt);
  }
}
