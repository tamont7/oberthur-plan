import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { extractParkEntrances } from "./park-entrances";
import { parseParkPlan } from "../src/plan";

const METRO_API_URL = "https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/espaces_verts";
const THABOR_BOUNDS = [-1.6742, 48.1120, -1.6657, 48.1158] as const;
const ODBL_URL = "https://opendatacommons.org/licenses/odbl/1-0/";
const CHURCH_REFERENCE: Position = [-1.6736, 48.1146];
const KIOSK_REFERENCE: Position = [-1.6704, 48.11505];
const ORANGERY_REFERENCE: Position = [-1.66906, 48.11526];
const position = z.tuple([z.number().finite(), z.number().finite()]);
const multiPolygon = z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(position).min(4)).min(1)).min(1) });
const polygon = z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(position).min(4)).min(1) });
const lineString = z.object({ type: z.literal("LineString"), coordinates: z.array(position).min(2) });

type Position = [number, number];
type OsmWay = { id: string; coordinates: Position[]; tags: Record<string, string> };

function attributes(source: string) {
  return Object.fromEntries([...source.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

export function parseOsmWays(xml: string) {
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

function centre(coordinates: Position[]) {
  const points = isClosed(coordinates) ? coordinates.slice(0, -1) : coordinates;
  const [longitude, latitude] = points.reduce<Position>(([sumLongitude, sumLatitude], [nextLongitude, nextLatitude]) => [sumLongitude + nextLongitude, sumLatitude + nextLatitude], [0, 0]);
  return [longitude / points.length, latitude / points.length] as Position;
}

function distanceMetres([fromLongitude, fromLatitude]: Position, [toLongitude, toLatitude]: Position) {
  const radians = Math.PI / 180;
  const deltaLatitude = (toLatitude - fromLatitude) * radians;
  const deltaLongitude = (toLongitude - fromLongitude) * radians;
  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(fromLatitude * radians) * Math.cos(toLatitude * radians) * Math.sin(deltaLongitude / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function within(position: Position, reference: Position, label: string) {
  const distance = distanceMetres(position, reference);
  if (distance > 45) throw new Error(`${label} est à ${Math.round(distance)} m du repère de contrôle : import interrompu.`);
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
  return parseParkPlan(value);
}

/** Keep the mapped walking approaches around Saint-Melaine as context for the park. */
export function isThaborPath(way: OsmWay, boundary: Position[][][]) {
  if (!["path", "footway", "pedestrian", "steps"].includes(way.tags.highway)) return false;
  if (["private", "no"].includes(way.tags.foot ?? way.tags.access)) return false;
  if (way.coordinates.some((point) => pointInPark(point, boundary))) return true;
  // Deliberately bounded context: church and its adjoining gardens, not city-wide streets.
  return way.coordinates.every(([longitude, latitude]) =>
    longitude >= -1.67355 && longitude <= -1.6722
    && latitude >= 48.11472 && latitude <= 48.11525,
  );
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
  const paths = ways.filter((way) => isThaborPath(way, official.geo_shape.geometry.coordinates));
  const church = ways.find((way) => way.tags.name === "Notre-Dame-en-Saint-Melaine" && way.tags.building === "church" && isClosed(way.coordinates));
  const kiosk = ways.find((way) => way.tags.name === "Kiosque" && isClosed(way.coordinates));
  const orangery = ways.find((way) => way.tags.name === "Orangerie du Thabor" && isClosed(way.coordinates));
  if (!paths.length) throw new Error("Réseau d’allées du Thabor vide.");
  if (!church || !kiosk || !orangery) throw new Error("L’église, le kiosque ou l’Orangerie du Thabor n’ont pas été trouvés dans OpenStreetMap.");
  within(centre(church.coordinates), CHURCH_REFERENCE, "Église Notre-Dame-en-Saint-Melaine");
  within(centre(kiosk.coordinates), KIOSK_REFERENCE, "Kiosque");
  within(centre(orangery.coordinates), ORANGERY_REFERENCE, "Orangerie du Thabor");
  const plan = parseThaborPlan({
    type: "FeatureCollection", bbox: THABOR_BOUNDS,
    metadata: {
      schema_version: 1, imported_at: new Date().toISOString(),
      rennes_metropole: { source_url: "https://data.rennesmetropole.fr/explore/dataset/espaces_verts/", license: "Licence ODbL 1.0", license_url: ODBL_URL },
      openstreetmap: { source_url: osmUrl.href, license: "ODbL 1.0", license_url: ODBL_URL },
    },
    features: [
      ...extractParkEntrances(osmValue, "Q942434"),
      { type: "Feature", id: "rennes-parc-thabor", geometry: official.geo_shape.geometry, properties: { kind: "boundary", source: "Rennes Métropole", source_id: official.gml_id } },
      ...water.map((way) => ({ type: "Feature" as const, id: `osm-thabor-water-${way.id}`, geometry: { type: "Polygon" as const, coordinates: [way.coordinates] }, properties: { kind: "water" as const, source: "OpenStreetMap" as const, source_id: `way/${way.id}` } })),
      ...paths.map((way) => ({ type: "Feature" as const, id: `osm-thabor-path-${way.id}`, geometry: { type: "LineString" as const, coordinates: way.coordinates }, properties: { kind: "path" as const, source: "OpenStreetMap" as const, source_id: `way/${way.id}` } })),
      {
        type: "Feature" as const, id: `osm-thabor-church-${church.id}`, geometry: { type: "Polygon" as const, coordinates: [church.coordinates] },
        // Repère volumétrique : OSM ne publie pas une hauteur exploitable pour l’église.
        properties: { kind: "building" as const, source: "OpenStreetMap" as const, source_id: `way/${church.id}`, label: "Église Notre-Dame-en-Saint-Melaine", height_m: 25, photo: {
          url: "https://commons.wikimedia.org/wiki/Special:FilePath/%C3%89glise%20Notre-Dame-en-Saint-Melaine%20depuis%20le%20carr%C3%A9%20Duguesclin%2C%20Rennes%2C%20France.jpg?width=960",
          page_url: "https://commons.wikimedia.org/wiki/File:%C3%89glise_Notre-Dame-en-Saint-Melaine_depuis_le_carr%C3%A9_Duguesclin,_Rennes,_France.jpg",
          author: "Édouard Hue", license: "CC BY-SA 3.0", license_url: "https://creativecommons.org/licenses/by-sa/3.0/",
        } },
      },
      {
        type: "Feature" as const, id: `osm-thabor-kiosk-${kiosk.id}`, geometry: { type: "Polygon" as const, coordinates: [kiosk.coordinates] },
        // Repère volumétrique : OSM ne publie pas de hauteur pour le kiosque.
        properties: { kind: "landmark" as const, source: "OpenStreetMap" as const, source_id: `way/${kiosk.id}`, label: "Kiosque à musique", height_m: 7, photo: {
          url: "https://commons.wikimedia.org/wiki/Special:FilePath/Rennes%20-%20Le%20Thabor%20-%20Kiosque%20sous%20la%20neige.jpg?width=960",
          page_url: "https://commons.wikimedia.org/wiki/File:Rennes_-_Le_Thabor_-_Kiosque_sous_la_neige.jpg",
          author: "S. Plaine", license: "CC BY-SA 4.0", license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
        } },
      },
      {
        type: "Feature" as const, id: `osm-thabor-orangery-${orangery.id}`, geometry: { type: "Polygon" as const, coordinates: [orangery.coordinates] },
        // Repère volumétrique : OSM ne publie pas de hauteur pour l’Orangerie.
        properties: { kind: "building" as const, source: "OpenStreetMap" as const, source_id: `way/${orangery.id}`, label: "Orangerie du Thabor", height_m: 6, photo: {
          url: "https://commons.wikimedia.org/wiki/Special:FilePath/Rennes%20%2835%29%20Le%20Thabor%20Orangerie%2001.JPG?width=960",
          page_url: "https://commons.wikimedia.org/wiki/File:Rennes_(35)_Le_Thabor_Orangerie_01.JPG",
          author: "GO69", license: "CC BY-SA 3.0", license_url: "https://creativecommons.org/licenses/by-sa/3.0/",
        } },
      },
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
  console.log(`Plan validé : 1 emprise officielle, ${paths.length} allées, ${water.length} plans d’eau et 3 repères en volume.`);
  console.log(`GeoJSON : ${fileURLToPath(target)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importThaborPlan().catch((error: unknown) => {
    console.error("Import du plan du Thabor interrompu. Le précédent fichier reste intact.", error);
    process.exitCode = 1;
  });
}
