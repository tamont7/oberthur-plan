import type { ParkEntrance } from "../src/plan";

const attributes = (xml: string): Record<string, string> => Object.fromEntries(
  [...xml.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
);
const tags = (xml: string) => Object.fromEntries(
  [...xml.matchAll(/<tag\b([^>]*)\/>/g)].map((match) => {
    const tag = attributes(match[1]);
    return [tag.k, tag.v];
  }),
);

/** Tagged access nodes on the OSM park perimeter, excluding buildings and restricted access. */
export function extractParkEntrances(xml: string, wikidata: string): ParkEntrance[] {
  const ways = new Map([...xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)].map((match) =>
    [attributes(match[1]).id, { body: match[2], tags: tags(match[2]) }],
  ));
  const nodeIds = (body: string) => [...body.matchAll(/<nd\b([^>]*)\/>/g)].map((match) => attributes(match[1]).ref);
  const perimeter = new Set<string>();
  const excluded = new Set<string>();
  const connected = new Set<string>();
  for (const way of ways.values()) {
    if (way.tags.wikidata === wikidata && way.tags.leisure === "park") nodeIds(way.body).forEach((id) => perimeter.add(id));
    if (way.tags.building || way.tags.amenity === "school") nodeIds(way.body).forEach((id) => excluded.add(id));
    if (["footway", "path", "pedestrian", "steps", "service"].includes(way.tags.highway)
      && !["no", "private"].includes(way.tags.foot ?? way.tags.access)) {
      nodeIds(way.body).forEach((id) => connected.add(id));
    }
  }
  for (const relation of xml.matchAll(/<relation\b[^>]*>([\s\S]*?)<\/relation>/g)) {
    if (tags(relation[1]).wikidata !== wikidata) continue;
    for (const match of relation[1].matchAll(/<member\b([^>]*)\/>/g)) {
      const member = attributes(match[1]);
      if (member.type !== "way" || member.role !== "outer") continue;
      const way = ways.get(member.ref);
      if (way) nodeIds(way.body).forEach((id) => perimeter.add(id));
    }
  }
  const entrances: ParkEntrance[] = [];
  for (const match of xml.matchAll(/<node\b([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g)) {
    const node = attributes(match[1]);
    const properties = tags(match[2] ?? "");
    if (!perimeter.has(node.id) || excluded.has(node.id) || !connected.has(node.id)) continue;
    if (!["gate", "entrance", "kissing_gate", "cycle_barrier"].includes(properties.barrier)
      && (!properties.entrance || properties.entrance === "no")) continue;
    if (["no", "private"].includes(properties.foot ?? properties.access) || properties.locked === "yes") continue;
    entrances.push({
      type: "Feature", id: `osm-entrance-${node.id}`,
      geometry: { type: "Point", coordinates: [Number(node.lon), Number(node.lat)] },
      properties: { kind: "entrance", label: "Entrée", source: "OpenStreetMap", source_id: `node/${node.id}` },
    });
  }
  return entrances;
}
