import type { PlanPosition } from "./plan";

export const pathVertexKey = (point: PlanPosition) => `${point[0]},${point[1]}`;

/** Rebuild continuous axes across OSM feature boundaries, stopping at real junctions. */
export function buildPathNetwork(lines: PlanPosition[][]): PlanPosition[][] {
  const vertices = new Map<string, { point: PlanPosition; neighbours: Set<string> }>();
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const a = pathVertexKey(line[i - 1]);
      const b = pathVertexKey(line[i]);
      if (a === b) continue;
      if (!vertices.has(a)) vertices.set(a, { point: line[i - 1], neighbours: new Set() });
      if (!vertices.has(b)) vertices.set(b, { point: line[i], neighbours: new Set() });
      vertices.get(a)!.neighbours.add(b);
      vertices.get(b)!.neighbours.add(a);
    }
  }
  const edgeKey = (a: string, b: string) => JSON.stringify([a, b].sort());
  const visited = new Set<string>();
  const paths: PlanPosition[][] = [];
  function trace(start: string, next: string) {
    const path = [vertices.get(start)!.point];
    let previous = start;
    let current = next;
    while (!visited.has(edgeKey(previous, current))) {
      visited.add(edgeKey(previous, current));
      const vertex = vertices.get(current)!;
      path.push(vertex.point);
      if (current === start || vertex.neighbours.size !== 2) break;
      const following = [...vertex.neighbours].find((key) => key !== previous)!;
      previous = current;
      current = following;
    }
    if (path.length > 1) paths.push(path);
  }
  for (const [key, vertex] of vertices) {
    if (vertex.neighbours.size === 2) continue;
    for (const neighbour of vertex.neighbours) trace(key, neighbour);
  }
  // Remaining edges belong to closed loops with no junction.
  for (const [key, vertex] of vertices) {
    for (const neighbour of vertex.neighbours) trace(key, neighbour);
  }
  return paths;
}

/** Metric Douglas–Peucker simplification after splitting at all network junctions. */
export function simplifyPath(points: PlanPosition[], toleranceMetres = 0.2): PlanPosition[] {
  if (points.length < 3) return points.slice();
  const longitudeScale = 111_320 * Math.cos(points[0][1] * Math.PI / 180);
  const local = points.map(([longitude, latitude]) => [
    (longitude - points[0][0]) * longitudeScale,
    (latitude - points[0][1]) * 111_320,
  ]);
  const keep = new Set([0, points.length - 1]);
  const pending = [[0, points.length - 1]];
  while (pending.length) {
    const [start, end] = pending.pop()!;
    const [ax, ay] = local[start];
    const dx = local[end][0] - ax;
    const dy = local[end][1] - ay;
    const lengthSquared = dx * dx + dy * dy;
    let maxDistance = toleranceMetres * toleranceMetres;
    let furthest = -1;
    for (let i = start + 1; i < end; i++) {
      const px = local[i][0] - ax;
      const py = local[i][1] - ay;
      const t = lengthSquared ? Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared)) : 0;
      const distanceSquared = (px - t * dx) ** 2 + (py - t * dy) ** 2;
      if (distanceSquared > maxDistance) {
        maxDistance = distanceSquared;
        furthest = i;
      }
    }
    if (furthest !== -1) {
      keep.add(furthest);
      pending.push([start, furthest], [furthest, end]);
    }
  }
  const result = points.filter((_, i) => keep.has(i));
  // Never collapse a small closed loop into a degenerate corridor.
  if (pathVertexKey(points[0]) === pathVertexKey(points[points.length - 1]) && result.length < 4) {
    return points.slice();
  }
  return result;
}
