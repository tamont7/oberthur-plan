import assert from "node:assert/strict";
import test from "node:test";
import { buildPathNetwork, simplifyPath } from "../src/pathGeometry";
import type { PlanPosition } from "../src/plan";

test("reconnecte les fragments même inversés et élimine les arêtes dupliquées", () => {
  assert.deepEqual(buildPathNetwork([
    [[0, 0], [1, 0]], [[2, 0], [1, 0]], [[0, 0], [0, 0], [1, 0]],
  ]), [[[0, 0], [1, 0], [2, 0]]]);
});

test("conserve les trois branches et leur jonction exacte", () => {
  const lines: PlanPosition[][] = [
    [[0, 0], [1, 0], [2, 0]], [[1, 0], [1, 1]],
  ];
  const paths = buildPathNetwork(lines);
  assert.equal(paths.length, 3);
  for (const path of paths) {
    const rounded = simplifyPath(path);
    assert(rounded.some(([x, y]) => x === 1 && y === 0));
  }
});

test("conserve une boucle fermée et ignore les lignes dégénérées", () => {
  const ring: PlanPosition[] = [[0, 0], [1, 0], [1, 1], [0, 0]];
  assert.deepEqual(buildPathNetwork([ring, [[2, 2], [2, 2]]]), [ring]);
});

test("préserve les chemins courts et les virages significatifs", () => {
  const tiny: PlanPosition[] = [[-1.66, 48.11], [-1.66000001, 48.11]];
  assert.deepEqual(simplifyPath(tiny), tiny);
  const corner: PlanPosition[] = [[0, 0], [0.0001, 0], [0.0001, 0.0001]];
  const rounded = simplifyPath(corner);
  assert.deepEqual(rounded[0], corner[0]);
  assert.deepEqual(rounded.at(-1), corner.at(-1));
  assert.deepEqual(rounded, corner);
  assert(rounded.every(([x, y]) => Number.isFinite(x + y) && x >= 0 && x <= 0.0001 && y >= 0 && y <= 0.0001));
});

test("simplifie le bruit inférieur à 20 cm, conserve une déviation supérieure", () => {
  assert.deepEqual(simplifyPath([[0, 0], [0.00001, 0.000001], [0.00002, 0]]), [[0, 0], [0.00002, 0]]);
  const bend: PlanPosition[] = [[0, 0], [0.00001, 0.000003], [0.00002, 0]];
  assert.deepEqual(simplifyPath(bend), bend);
});
