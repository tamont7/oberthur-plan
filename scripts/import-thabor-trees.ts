import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { normalizeRecord } from "./import-rennes";
import { isPointInParkGeometry, type PlanPosition } from "../src/plan";
import { createTreeCollectionSchema } from "../src/treeSchema";

const TREE_API_URL = "https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/arbre";
const PARK_API_URL = "https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/espaces_verts";
const TREE_SOURCE_URL = "https://data.rennesmetropole.fr/explore/dataset/arbre/";
// Rectangle de collecte : le filtrage de publication est ensuite fait point par point contre l’emprise officielle.
const THABOR_CANDIDATE_BOUNDS = [-1.6742, 48.1120, -1.6657, 48.1158] as const;

const positionRecord = z.object({
  geo_shape: z.object({ geometry: z.object({ type: z.literal("Point"), coordinates: z.tuple([z.number().finite(), z.number().finite()]) }) }),
});

const parkRecord = z.object({
  gml_id: z.string().min(1),
  nom: z.literal("Parc du Thabor"),
  geo_shape: z.object({ geometry: z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])).min(4)).min(1)).min(1) }) }),
});

function candidateWhere([west, south, east, north]: readonly number[]) {
  return `within(geo_shape, geom'POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))')`;
}

async function getJson(url: URL | string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Source Rennes : HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function fetchAllRecords(query: URL) {
  const records: unknown[] = [];
  let total: number | undefined;
  do {
    query.searchParams.set("offset", String(records.length));
    const page = z.object({ total_count: z.number().int().nonnegative(), results: z.array(z.unknown()) }).parse(await getJson(query));
    if (total !== undefined && page.total_count !== total) throw new Error("La source a changé pendant l’import, relancer.");
    total = page.total_count;
    if (total > 5_000) throw new Error("Volume inattendu pour cette emprise : import interrompu.");
    if (records.length < total && !page.results.length) throw new Error("Pagination incomplète.");
    records.push(...page.results);
  } while (records.length < (total ?? 0));
  return records;
}

async function fetchOfficialThabor() {
  const url = new URL(`${PARK_API_URL}/records`);
  url.searchParams.set("where", "nom = 'Parc du Thabor'");
  url.searchParams.set("limit", "2");
  const records = z.object({ results: z.array(parkRecord) }).parse(await getJson(url)).results;
  if (records.length !== 1) throw new Error("Emprise officielle du Parc du Thabor introuvable ou ambiguë.");
  return records[0];
}

export async function importThaborTrees() {
  const [sourceMetadata, boundary] = await Promise.all([
    getJson(TREE_API_URL),
    fetchOfficialThabor(),
  ]);
  const metadata = z.object({ metas: z.object({ default: z.object({ license: z.literal("Licence ODbL 1.0"), license_url: z.string().url(), data_processed: z.string().datetime({ offset: true }).nullable() }) }) }).parse(sourceMetadata).metas.default;
  const containsPoint = (longitude: number, latitude: number) => isPointInParkGeometry(boundary.geo_shape.geometry.coordinates, [longitude, latitude] as PlanPosition);

  const query = new URL(`${TREE_API_URL}/records`);
  query.searchParams.set("where", candidateWhere(THABOR_CANDIDATE_BOUNDS));
  query.searchParams.set("order_by", "id");
  query.searchParams.set("limit", "100");
  const queryUrl = query.href;
  const candidates = await fetchAllRecords(query);
  const inside = candidates.filter((record) => {
    const [longitude, latitude] = positionRecord.parse(record).geo_shape.geometry.coordinates;
    return containsPoint(longitude, latitude);
  });
  const normalized = inside.map((record) => normalizeRecord(record, containsPoint));
  const features = normalized.flatMap((item) => item.feature ? [item.feature] : []);
  const collection = createTreeCollectionSchema(containsPoint).parse({
    type: "FeatureCollection",
    bbox: THABOR_CANDIDATE_BOUNDS,
    metadata: {
      schema_version: 1, publisher: "Rennes Métropole", dataset: "arbre", source_url: TREE_SOURCE_URL,
      license: metadata.license, license_url: metadata.license_url.replace(/^http:/, "https:"), imported_at: new Date().toISOString(),
      source_processed_at: metadata.data_processed,
      selection: "Points GPS situés dans l’emprise officielle du Parc du Thabor ; abattu=1 exclu.",
      query_url: queryUrl, bbox_records: candidates.length,
      excluded_felled: normalized.filter((item) => item.reason === "felled").length,
      excluded_outside_park: candidates.length - inside.length,
      boundary_source_url: "https://data.rennesmetropole.fr/explore/dataset/espaces_verts/",
      boundary_source_id: boundary.gml_id,
      imported_records: features.length,
    },
    features,
  });
  const folder = new URL("../public/data/", import.meta.url);
  const target = new URL("arbres-thabor.geojson", folder);
  const temporary = new URL(`arbres-thabor.${process.pid}.tmp`, folder);
  await mkdir(folder, { recursive: true });
  try {
    await writeFile(temporary, `${JSON.stringify(collection, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
  console.log(`${features.length} arbres publiés ; ${candidates.length - inside.length} points GPS hors emprise exclus.`);
  console.log(`GeoJSON validé : ${fileURLToPath(target)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importThaborTrees().catch((error: unknown) => {
    console.error("Import des arbres du Thabor interrompu. Le précédent fichier reste intact.", error);
    process.exitCode = 1;
  });
}
