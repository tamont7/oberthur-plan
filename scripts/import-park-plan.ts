import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { PARK_PLAN_BOUNDS, PARK_PLAN_SOURCE_URL } from "../src/park";
import { parseParkPlan } from "../src/plan";

const METRO_API_URL = "https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/espaces_verts";
const OSM_LICENSE_URL = "https://opendatacommons.org/licenses/odbl/1-0/";
const GEOSERVICES_URL = "https://public.sig.rennesmetropole.fr/header/geoservices";
const HOTEL_REFERENCE: Position = [-1.660617, 48.113626];
const KIOSK_REFERENCE: Position = [-1.659113, 48.111642];
const multiPolygonCoordinates = z.array(z.array(z.array(z.tuple([z.number(), z.number()])).min(4)).min(1)).min(1);
const polygonCoordinates = z.array(z.array(z.tuple([z.number(), z.number()])).min(4)).min(1);

type Position = [number, number];
type OsmWay = { id: string; coordinates: Position[]; tags: Record<string, string> };

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
      const tagAttrs = attributes(tag[1]);
      return [tagAttrs.k, tagAttrs.v];
    }).filter(([key, value]) => key && value));
    const coordinates = nodeIds.map((id) => nodes.get(id)).filter((position): position is Position => Boolean(position));
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
  const [longitude, latitude] = points.reduce<[number, number]>(([sumLongitude, sumLatitude], [nextLongitude, nextLatitude]) => [sumLongitude + nextLongitude, sumLatitude + nextLatitude], [0, 0]);
  return [longitude / points.length, latitude / points.length] as Position;
}

function distanceMetres([fromLongitude, fromLatitude]: Position, [toLongitude, toLatitude]: Position) {
  const radians = Math.PI / 180;
  const deltaLatitude = (toLatitude - fromLatitude) * radians;
  const deltaLongitude = (toLongitude - fromLongitude) * radians;
  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(fromLatitude * radians) * Math.cos(toLatitude * radians) * Math.sin(deltaLongitude / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function within(position: Position, reference: Position, name: string) {
  const distance = distanceMetres(position, reference);
  if (distance > 35) throw new Error(`${name} est à ${Math.round(distance)} m du repère de contrôle : import interrompu.`);
}

function wfsUrl(workspace: string, typeName: string, bounds: readonly number[]) {
  const url = new URL(`https://public.sig.rennesmetropole.fr/geoserver/${workspace}/ows`);
  url.search = new URLSearchParams({
    service: "WFS", version: "2.0.0", request: "GetFeature", typeNames: typeName,
    outputFormat: "application/json", srsName: "EPSG:4326", bbox: `${bounds.join(",")},EPSG:4326`,
  }).toString();
  return url;
}

async function getJson(url: URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Source de plan : HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function getText(url: URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Source de plan : HTTP ${response.status}`);
  return response.text();
}

export async function importParkPlan() {
  const [west, south, east, north] = PARK_PLAN_BOUNDS;
  const recordsUrl = new URL(`${METRO_API_URL}/records`);
  recordsUrl.searchParams.set("where", "nom = 'Parc Hamelin Oberthür'");
  recordsUrl.searchParams.set("limit", "2");
  const osmUrl = new URL("https://api.openstreetmap.org/api/0.6/map");
  osmUrl.searchParams.set("bbox", `${west},${south},${east},${north}`);
  const buildingsUrl = wfsUrl("ref_autres", "ref_autres:v_batiment", PARK_PLAN_BOUNDS);
  const [recordsValue, osmValue, buildingsValue] = await Promise.all([getJson(recordsUrl), getText(osmUrl), getJson(buildingsUrl)]);
  const records = z.object({ results: z.array(z.object({
    gml_id: z.string().min(1), nom: z.literal("Parc Hamelin Oberthür"),
    geo_shape: z.object({ geometry: z.object({ type: z.literal("MultiPolygon"), coordinates: multiPolygonCoordinates }) }),
  })) }).parse(recordsValue).results;
  if (records.length !== 1) throw new Error("Emprise officielle du Parc Hamelin Oberthür introuvable ou ambiguë.");
  const official = records[0];
  const ways = parseOsmWays(osmValue);
  const polygons = official.geo_shape.geometry.coordinates;
  const inPark = (way: OsmWay) => pointInPark(way.coordinates[Math.floor(way.coordinates.length / 2)], polygons);
  const water = ways.filter((way) => (way.tags.natural === "water" || way.tags.water === "pond") && isClosed(way.coordinates) && inPark(way));
  const paths = ways.filter((way) => ["path", "footway", "pedestrian", "steps"].includes(way.tags.highway) && inPark(way));
  const officialBuildings = z.object({ features: z.array(z.object({
    id: z.string().min(1), geometry: z.object({ type: z.literal("Polygon"), coordinates: polygonCoordinates }),
    properties: z.object({ id_bati: z.string().min(1) }),
  })) }).parse(buildingsValue).features;
  const hotelOsm = ways.find((way) => way.tags.name === "Hôtel Oberthür" && isClosed(way.coordinates));
  const kiosque = ways.find((way) => way.tags.amenity === "shelter" && way.tags.bench === "yes" && isClosed(way.coordinates) && inPark(way));
  if (!hotelOsm || !kiosque) throw new Error("L’Hôtel Oberthür ou le kiosque n’ont pas été trouvés dans OpenStreetMap.");
  const hotelCentre = centre(hotelOsm.coordinates);
  const hotel = officialBuildings
    .filter((feature) => pointInPark(centre(feature.geometry.coordinates[0] as Position[]), polygons))
    .map((feature) => ({ feature, distance: distanceMetres(centre(feature.geometry.coordinates[0] as Position[]), hotelCentre) }))
    .sort((a, b) => a.distance - b.distance)[0];
  if (water.length !== 1) throw new Error(`Plan d’eau OSM ambigu : ${water.length} géométries trouvées.`);
  if (paths.length < 8) throw new Error(`Réseau d’allées incomplet : ${paths.length} géométries trouvées.`);
  if (!hotel || hotel.distance > 35) throw new Error("L’emprise officielle de l’Hôtel Oberthür n’a pas pu être rapprochée du bâtiment nommé.");
  within(centre(hotel.feature.geometry.coordinates[0] as Position[]), HOTEL_REFERENCE, "Hôtel Oberthür");
  within(centre(kiosque.coordinates), KIOSK_REFERENCE, "Kiosque");
  const plan = parseParkPlan({
    type: "FeatureCollection", bbox: PARK_PLAN_BOUNDS,
    metadata: {
      schema_version: 1, imported_at: new Date().toISOString(),
      rennes_metropole: { source_url: PARK_PLAN_SOURCE_URL, license: "Licence ODbL 1.0", license_url: OSM_LICENSE_URL },
      buildings: { source_url: GEOSERVICES_URL, license: "Licence ODbL 1.0", license_url: OSM_LICENSE_URL },
      openstreetmap: { source_url: osmUrl.href, license: "ODbL 1.0", license_url: OSM_LICENSE_URL },
    },
    features: [
      { type: "Feature", id: "rennes-parc-oberthur", geometry: official.geo_shape.geometry, properties: { kind: "boundary", source: "Rennes Métropole", source_id: official.gml_id } },
      ...water.map((way) => ({ type: "Feature" as const, id: `osm-water-${way.id}`, geometry: { type: "Polygon" as const, coordinates: [way.coordinates] }, properties: { kind: "water" as const, source: "OpenStreetMap" as const, source_id: `way/${way.id}` } })),
      ...paths.map((way) => ({ type: "Feature" as const, id: `osm-path-${way.id}`, geometry: { type: "LineString" as const, coordinates: way.coordinates }, properties: { kind: "path" as const, source: "OpenStreetMap" as const, source_id: `way/${way.id}` } })),
      {
        type: "Feature" as const, id: "rennes-hotel-oberthur" as const, geometry: hotel.feature.geometry,
        // La base ne publie pas les altitudes de ces bâtiments : hauteur illustrative, non métrique.
        properties: { kind: "building" as const, source: "Rennes Métropole" as const, source_id: hotel.feature.properties.id_bati, label: "Hôtel Oberthür" as const, height_m: 15, photo: {
          url: "https://commons.wikimedia.org/wiki/Special:FilePath/Rennes%20-%20Parc%20Oberth%C3%BCr%20-%20Demeure%20des%20Oberth%C3%BCr%20-%2020080706.jpg?width=960",
          page_url: "https://commons.wikimedia.org/wiki/File:Rennes_-_Parc_Oberth%C3%BCr_-_Demeure_des_Oberth%C3%BCr_-_20080706.jpg",
          author: "Sémhur", license: "CC BY-SA 3.0" as const, license_url: "https://creativecommons.org/licenses/by-sa/3.0/",
        } },
      },
      {
        type: "Feature" as const, id: "osm-kiosque-oberthur" as const, geometry: { type: "Polygon" as const, coordinates: [kiosque.coordinates] },
        // Volume de repérage seulement ; OpenStreetMap ne renseigne pas la hauteur du kiosque.
        properties: { kind: "landmark" as const, source: "OpenStreetMap" as const, source_id: `way/${kiosque.id}`, label: "Kiosque" as const, height_m: 4.5, photo: {
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Rennes_ParcOberthur_chalet.jpg/960px-Rennes_ParcOberthur_chalet.jpg",
          page_url: "https://commons.wikimedia.org/wiki/File:Rennes_ParcOberthur_chalet.jpg",
          author: "Pymouss", license: "CC BY-SA 3.0" as const, license_url: "https://creativecommons.org/licenses/by-sa/3.0/",
        } },
      },
    ],
  });
  const folder = new URL("../public/data/", import.meta.url);
  const target = new URL("parc-oberthur.geojson", folder);
  const temporary = new URL(`parc-oberthur.${process.pid}.tmp`, folder);
  await mkdir(folder, { recursive: true });
  try {
    await writeFile(temporary, `${JSON.stringify(plan, null, 2)}\n`, { flag: "wx" });
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
  console.log(`Plan validé : 1 emprise officielle, ${paths.length} allées OSM, ${water.length} plan d’eau et 2 repères en volume.`);
  console.log(`GeoJSON : ${fileURLToPath(target)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importParkPlan().catch((error: unknown) => {
    console.error("Import du plan interrompu. Le précédent fichier reste intact.", error);
    process.exitCode = 1;
  });
}
