import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { filterTrees, parseTreeData, treeColor, treeHighlight, TREE_COLORS } from "../src/data";
import { isParkLandmark, parseParkPlan } from "../src/plan";
import { treeCollectionSchema } from "../src/treeSchema";
import { isInsideParkBounds } from "../src/park";
import { importRennes, normalizeRecord } from "../scripts/import-rennes";
import { parseThaborPlan } from "../scripts/import-thabor-plan";

const snapshot = JSON.parse(readFileSync(new URL("../public/data/arbres-rennes.geojson", import.meta.url), "utf8"));
const planSnapshot = JSON.parse(readFileSync(new URL("../public/data/parc-oberthur.geojson", import.meta.url), "utf8"));
const thaborPlanSnapshot = JSON.parse(readFileSync(new URL("../public/data/parc-thabor.geojson", import.meta.url), "utf8"));
const { trees, metadata } = parseTreeData(snapshot);
const plan = parseParkPlan(planSnapshot);
const first = snapshot.features[0];
const record = { ...first.properties.source_properties, geo_shape: { geometry: first.geometry } };

test("l’extrait embarqué est valide, traçable et limité à l’emprise GPS du parc", () => {
  assert(trees.length > 0);
  assert.equal(new Set(trees.map((tree) => tree.id)).size, trees.length);
  assert.equal(metadata.imported_records, trees.length);
  assert.equal(metadata.bbox_records, trees.length + metadata.excluded_felled);
  assert(trees.every((tree) => isInsideParkBounds(tree.longitude, tree.latitude)));
  assert(snapshot.features.every((feature: typeof first) => feature.properties.source_properties.abattu !== 1));
  assert.equal(metadata.license, "Licence ODbL 1.0");
});

test("un arbre dans l’emprise GPS est retenu même si sa localisation éditoriale est absente", () => {
  const cèdre = trees.find((tree) => tree.sourceId === 135502);
  const feature = snapshot.features.find((item: typeof first) => item.properties.source_id === 135502);
  assert(cèdre && feature);
  assert.equal(cèdre.name, "Cèdre de l'Atlas");
  assert.equal(cèdre.location, null);
  assert.equal(feature.properties.source_properties.gml_id, "arbre.135502");
  assert.equal(feature.properties.source_properties.code_insee, "35238");
});

test("le plan vectoriel embarque l’emprise officielle, les axes, l’étang et les repères", () => {
  const boundaries = plan.features.filter((feature) => feature.properties.kind === "boundary");
  const water = plan.features.filter((feature) => feature.properties.kind === "water");
  const paths = plan.features.filter((feature) => feature.properties.kind === "path");
  const landmarks = plan.features.filter(isParkLandmark);
  const hotel = landmarks.find((feature) => feature.properties.kind === "building");
  const kiosque = landmarks.find((feature) => feature.properties.kind === "landmark");
  assert.equal(boundaries.length, 1);
  assert.equal(boundaries[0].properties.source, "Rennes Métropole");
  assert.equal(water.length, 1);
  assert.equal(paths.length, 36);
  assert.equal(hotel?.properties.label, "Hôtel Oberthür");
  assert.equal(kiosque?.properties.label, "Kiosque");
  assert.equal(hotel?.properties.photo.license, "CC BY-SA 3.0");
  assert.equal(kiosque?.properties.photo.license, "CC BY-SA 3.0");
  assert.equal(plan.metadata.rennes_metropole.license, "Licence ODbL 1.0");
  assert(plan.metadata.buildings);
  assert.equal(plan.metadata.buildings.license, "Licence ODbL 1.0");
  assert.equal(plan.metadata.openstreetmap.license, "ODbL 1.0");
});

test("le plan du Thabor est autonome et ne contient aucun bâtiment", () => {
  const thabor = parseThaborPlan(thaborPlanSnapshot);
  const kinds = thabor.features.map((feature) => feature.properties.kind);
  assert.equal(kinds.filter((kind) => kind === "boundary").length, 1);
  assert(kinds.filter((kind) => kind === "path").length > 100);
  assert(kinds.filter((kind) => kind === "water").length > 0);
  assert(!thabor.features.some((feature) => "height_m" in feature.properties));
  assert.equal(thabor.metadata.rennes_metropole.license, "Licence ODbL 1.0");
  assert.equal(thabor.metadata.openstreetmap.license, "ODbL 1.0");
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

test("un nom français corrigé reste traçable au libellé publié", () => {
  const hêtrePourpre = normalizeRecord({
    ...record,
    nom_commun: "Hêtre commun",
    genre: "Fagus",
    espece: "sylvatica",
    variete: "Purpurea",
  });
  assert.equal(hêtrePourpre.feature?.properties.nom, "Hêtre pourpre");
  assert.equal(hêtrePourpre.feature?.properties.nom_source, "Hêtre commun");
  assert.equal(hêtrePourpre.feature?.properties.nom_scientifique, "Fagus sylvatica Purpurea");
});

test("les arbres dans l’emprise GPS sont publiés, sauf s’ils sont signalés abattus", () => {
  assert(normalizeRecord({ ...record, localisation: null }).feature);
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

test("la recherche ignore les accents, accepte les suggestions composées et combine texte, taxon et statut explicite", () => {
  const accent = filterTrees(trees, "érable", "", false);
  assert(accent.length > 0);
  assert.deepEqual(accent, filterTrees(trees, "ERABLE", "", false));
  assert.equal(filterTrees(trees, `${trees[0].name} · ${trees[0].species}`, "", false)[0].id, trees[0].id);
  assert.equal(filterTrees(trees, String(trees[0].sourceId), "", false).length, 0);
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

test("la mise en évidence privilégie le survol, puis la sélection, puis le même taxon", () => {
  const hovered = trees.find((tree) => trees.some((other) => other.id !== tree.id && other.species === tree.species));
  assert(hovered);
  const sameSpecies = trees.find((tree) => tree.id !== hovered.id && tree.species === hovered.species);
  const otherSpecies = trees.find((tree) => tree.species !== hovered.species);
  assert(sameSpecies && otherSpecies);
  assert.equal(treeHighlight(hovered, null, hovered), "hovered");
  assert.equal(treeHighlight(sameSpecies, null, hovered), "same_species");
  assert.equal(treeHighlight(sameSpecies, hovered.id, hovered), "same_species");
  assert.equal(treeHighlight(sameSpecies, sameSpecies.id, hovered), "selected");
  assert.equal(treeHighlight(otherSpecies, null, hovered), "normal");
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
