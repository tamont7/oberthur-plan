import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";

const METRO_API_URL = "https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/espaces_verts";
const THABOR_BOUNDS = [-1.6742, 48.1120, -1.6657, 48.1158] as const;
const ODBL_URL = "https://opendatacommons.org/licenses/odbl/1-0/";
const position = z.tuple([z.number().finite(), z.number().finite()]);
const multiPolygon = z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(position).min(4)).min(1)).min(1) });
const polygon = z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(position).min(4)).min(1) });
const lineString = z.object({ type: z.literal("LineString"), coordinates: z.array(position).min(2) });

type Position = [number, number];
type OsmWay = { id: string; coordinates: Position[]; tags: Record<string, string> };

const thaborPlanSchema = z.object({
  type: z.literal("FeatureCollection"),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  metadata: z.object({
    schema_version: z.literal(1), imported_at: z.string().datetime(),
    rennes_metropole: z.object({ source_url: z.string().url(), license: z.literal("Licence ODbL 1.0"), license_url: z.string().url() }),
    openstreetmap: z.object({ source_url: z.string().url(), license: z.literal("ODbL 1.0"), license_url: z.string().url() }),
  }),
  features: z.array(z.union([
    z.object({ type: z.literal("Feature"), id: z.literal("rennes-parc-thabor"), geometry: multiPolygon, properties: z.object({ kind: z.literal("boundary"), source: z.literal("Rennes Métropole"), source_id: z.string().min(1) }) }),
    z.object({ type: z.literal("Feature"), id: z.string().min(1), geometry: polygon, properties: z.object({ kind: z.literal("water"), source: z.literal("OpenStreetMap"), source_id: z.string().min(1) }) }),
    z.object({ type: z.literal("Feature"), id: z.string().min(1), geometry: lineString, properties: z.object({ kind: z.literal("path"), source: z.literal("OpenStreetMap"), source_id: z.string().min(1) }) }),
  ])).min(3),
}).superRefine((plan, context) => {
  if (plan.features.filter((feature) => feature.properties.kind === "boundary").length !== 1) context.addIssue({ code: "custom", message: "Le Thabor doit avoir une seule emprise officielle." });
  if (!plan.features.some((feature) => feature.properties.kind === "path")) context.addIssue({ code: "custom", message: "Le Thabor doit contenir des allées." });
});

function attributes(source: string) {
  return Object.fromEntries([...source.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

function parseOsmWays(xml: string) {
  const nodes = new Map<string, Position>();
  for (const match of xml.matchAll(/<node\b([^>]*)\/?>(?:<\/node>)?/g)) {
    const attrs = attributes(match[1]);
    if (attrs.id && attrs.lon && attrs.lat) nodes.set(attrs.id, [Number(attrs.lon), Number(attrs.lat)]);
  }
  const ways: OsmWay[] = [];
  for (const match of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
    const attrs = attributes(match[1]);
    const nodeIds = [...match[2].matchAll(/<nd\b([^>]*)\/>/g)].map((node) => attributes(node[1]).ref).filter(Boolean);
    const tags = Object.fromEntries([...match[2].matchAll(/<tag\b([^>]*)\/>/g)].map((tag) => {
      const attrs = attributes(tag[1]);
      return [attrs.k, attrs.v];
    }).filter(([key, value]) => key && value));
    const coordinates = nodeIds.map((id) => nodes.get(id)).filter((point): point is Position => Boolean(point));
    if (attrs.id && coordinates.length >= 2) ways.push({ id: attrs.id, coordinates, tags });
  }
  return ways;
}

function pointInRing([longitude, latitude]: Position, ring: Position[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    if ((y > latitude) !== (previousY > latitude) && longitude < (previousX - x) * (latitude - y) / (previousY - y) + x) inside = !inside;
  }
  return inside;
}

function pointInPark(point: Position, polygons: Position[][][]) {
  return polygons.some(([outer, ...holes]) => pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole)));
}

function isClosed(coordinates: Position[]) {
  const first = coordinates[0];
  const last = coordinates.at(-1);
  return Boolean(last && first[0] === last[0] && first[1] === last[1]);
}

async function getJson(url: URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Source Thabor : HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function getText(url: URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Source Thabor : HTTP ${response.status}`);
  return response.text();
}

export function parseThaborPlan(value: unknown) {
  return thaborPlanSchema.parse(value);
}

export async function importThaborPlan() {
  const recordsUrl = new URL(`${METRO_API_URL}/records`);
  recordsUrl.searchParams.set("where", "nom = 'Parc du Thabor'");
  recordsUrl.searchParams.set("limit", "2");
  const osmUrl = new URL("https://api.openstreetmap.org/api/0.6/map");
  osmUrl.searchParams.set("bbox", THABOR_BOUNDS.join(","));
  const [recordsValue, osmValue] = await Promise.all([getJson(recordsUrl), getText(osmUrl)]);
  const records = z.object({ results: z.array(z.object({
    gml_id: z.string().min(1), nom: z.literal("Parc du Thabor"),
    geo_shape: z.object({ geometry: multiPolygon }),
  })) }).parse(recordsValue).results;
  if (records.length !== 1) throw new Error("Emprise officielle du Parc du Thabor introuvable ou ambiguë.");
  const official = records[0];
  const ways = parseOsmWays(osmValue);
  const containsPartOfPark = (way: OsmWay) => way.coordinates.some((point) => pointInPark(point, official.geo_shape.geometry.coordinates));
  const water = ways.filter((way) => (way.tags.natural === "water" || way.tags.water === "pond") && isClosed(way.coordinates) && containsPartOfPark(way));
  const paths = ways.filter((way) => ["path", "footway", "pedestrian", "steps"].includes(way.tags.highway) && containsPartOfPark(way));
  if (!paths.length) throw new Error("Réseau d’allées du Thabor vide.");
  const plan = parseThaborPlan({
    type: "FeatureCollection", bbox: THABOR_BOUNDS,
    metadata: {
      schema_version: 1, imported_at: new Date().toISOString(),
      rennes_metropole: { source_url: "https://data.rennesmetropole.fr/explore/dataset/espaces_verts/", license: "Licence ODbL 1.0", license_url: ODBL_URL },
      openstreetmap: { source_url: osmUrl.href, license: "ODbL 1.0", license_url: ODBL_URL },
    },
    features: [
      { type: "Feature", id: "rennes-parc-thabor", geometry: official.geo_shape.geometry, properties: { kind: "boundary", source: "Rennes Métropole", source_id: official.gml_id } },
      ...water.map((way) => ({ type: "Feature" as const, id: `osm-thabor-water-${way.id}`, geometry: { type: "Polygon" as const, coordinates: [way.coordinates] }, properties: { kind: "water" as const, source: "OpenStreetMap" as const, source_id: `way/${way.id}` } })),
      ...paths.map((way) => ({ type: "Feature" as const, id: `osm-thabor-path-${way.id}`, geometry: { type: "LineString" as const, coordinates: way.coordinates }, properties: { kind: "path" as const, source: "OpenStreetMap" as const, source_id: `way/${way.id}` } })),
    ],
  });
  const folder = new URL("../public/data/", import.meta.url);
  const target = new URL("parc-thabor.geojson", folder);
  const temporary = new URL(`parc-thabor.${process.pid}.tmp`, folder);
  await mkdir(folder, { recursive: true });
  try {
    await writeFile(temporary, `${JSON.stringify(plan, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
  console.log(`Plan validé : 1 emprise officielle, ${paths.length} allées et ${water.length} plans d’eau.`);
  console.log(`GeoJSON : ${fileURLToPath(target)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importThaborPlan().catch((error: unknown) => {
    console.error("Import du plan du Thabor interrompu. Le précédent fichier reste intact.", error);
    process.exitCode = 1;
  });
}
