import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { filterTrees, parseTreeData, treeColor, TREE_COLORS } from "../src/data";
import { treeCollectionSchema } from "../src/treeSchema";
import { PARK_LOCALISATION, isInsideParkBounds } from "../src/park";
import { importRennes, normalizeRecord } from "../scripts/import-rennes";

const snapshot = JSON.parse(readFileSync(new URL("../public/data/arbres-rennes.geojson", import.meta.url), "utf8"));
const { trees, metadata } = parseTreeData(snapshot);
const first = snapshot.features[0];
const record = { ...first.properties.source_properties, geo_shape: { geometry: first.geometry } };

test("l’extrait embarqué est valide, traçable et limité aux arbres attribués au parc", () => {
  assert(trees.length > 0);
  assert.equal(new Set(trees.map((tree) => tree.id)).size, trees.length);
  assert.equal(metadata.imported_records, trees.length);
  assert.equal(metadata.bbox_records, trees.length + metadata.excluded_other_locations + metadata.excluded_felled);
  assert(trees.every((tree) => tree.location === PARK_LOCALISATION && isInsideParkBounds(tree.longitude, tree.latitude)));
  assert(snapshot.features.every((feature: typeof first) => feature.properties.source_properties.abattu !== 1));
  assert.equal(metadata.license, "Licence ODbL 1.0");
});

test("l’import conserve l’identité et les unités, sans inventer de statut ni de mesure", () => {
  const result = normalizeRecord({ ...record, hauteur: 0, circonference: null, complement: "Non renseigné" });
  assert(result.feature);
  assert.equal(result.feature.id, `rennes-arbre-${record.id}`);
  assert.equal(result.feature.properties.hauteur_m, null);
  assert.equal(result.feature.properties.circonference_cm, null);
  assert.equal(result.feature.properties.remarquable, null);
  assert.equal(result.feature.properties.model_3d_url, null);
  assert.equal(result.feature.properties.description, null);
  assert.equal(result.feature.properties.source_properties.hauteur, 0);
  const measured = normalizeRecord({ ...record, hauteur: 12, circonference: 150 });
  assert.equal(measured.feature?.properties.hauteur_m, 12);
  assert.equal(measured.feature?.properties.circonference_cm, 150);
});

test("les arbres voisins et abattus ne sont pas publiés dans l’inventaire du parc", () => {
  assert.equal(normalizeRecord({ ...record, localisation: "Rue de Paris, Rennes" }).reason, "other_location");
  assert.equal(normalizeRecord({ ...record, abattu: 1 }).reason, "felled");
});

test("des coordonnées inversées, identifiants dupliqués ou champs manquants sont rejetés", () => {
  const invalid = structuredClone(snapshot);
  invalid.features[0].geometry.coordinates.reverse();
  assert.equal(treeCollectionSchema.safeParse(invalid).success, false);
  const duplicate = structuredClone(snapshot);
  duplicate.features[1].id = duplicate.features[0].id;
  assert.equal(treeCollectionSchema.safeParse(duplicate).success, false);
  assert.throws(() => normalizeRecord({ id: 1 }));
});

test("la recherche ignore les accents et combine texte, taxon et statut explicite", () => {
  const accent = filterTrees(trees, "érable", "", false);
  assert(accent.length > 0);
  assert.deepEqual(accent, filterTrees(trees, "ERABLE", "", false));
  assert.equal(filterTrees(trees, String(trees[0].sourceId), trees[0].species, false)[0].id, trees[0].id);
  assert.equal(filterTrees(trees, "zzzintrouvable", "", false).length, 0);
  assert.equal(filterTrees(trees, "", "", true).length, 0);
  const marked = [{ ...trees[0], remarkable: true }, { ...trees[1], remarkable: false }, trees[2]];
  assert.deepEqual(filterTrees(marked, "", "", true), [marked[0]]);
});

test("les symboles distinguent sélection, remarquable et arbre ordinaire", () => {
  assert.equal(treeColor({ remarkable: null }, false), TREE_COLORS.normal);
  assert.equal(treeColor({ remarkable: true }, false), TREE_COLORS.remarkable);
  assert.equal(treeColor({ remarkable: true }, true), TREE_COLORS.selected);
});

test("une pagination interrompue ne remplace jamais l’extrait utilisable", async () => {
  const path = new URL("../public/data/arbres-rennes.geojson", import.meta.url);
  const before = readFileSync(path, "utf8");
  const originalFetch = globalThis.fetch;
  let request = 0;
  globalThis.fetch = async () => {
    const responses = [
      { metas: { default: { license: "Licence ODbL 1.0", license_url: "https://opendatacommons.org/licenses/odbl/", data_processed: null } } },
      { total_count: 2, results: [record] },
      { total_count: 2, results: [] },
    ];
    return new Response(JSON.stringify(responses[request++]), { status: 200 });
  };
  try {
    await assert.rejects(importRennes, /Pagination incomplète/);
    assert.equal(readFileSync(path, "utf8"), before);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
