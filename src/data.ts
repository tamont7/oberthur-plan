import { treeCollectionSchema, type TreeCollection } from "./treeSchema";

export type Tree = {
  id: string;
  sourceId: number;
  managementId: string | null;
  name: string;
  scientificName: string | null;
  species: string;
  latitude: number;
  longitude: number;
  height: number | null;
  circumference: number | null;
  remarkable: boolean | null;
  description: string | null;
  plantedAt: string | null;
  updatedAt: string | null;
  photoUrl: string | null;
  model3dUrl: string | null;
  pruning: string | null;
  location: string;
};

export function parseTreeData(value: unknown) {
  const collection = treeCollectionSchema.parse(value);
  const trees: Tree[] = collection.features.map(({ id, geometry, properties: p }) => ({
    id, sourceId: p.source_id, managementId: p.id_gestion,
    name: p.nom, scientificName: p.nom_scientifique,
    species: p.nom_scientifique ?? p.nom,
    longitude: geometry.coordinates[0], latitude: geometry.coordinates[1],
    height: p.hauteur_m, circumference: p.circonference_cm,
    remarkable: p.remarquable, description: p.description,
    plantedAt: p.date_plantation, updatedAt: p.date_maj,
    photoUrl: p.photo_url, model3dUrl: p.model_3d_url,
    pruning: p.type_taille, location: p.localisation,
  }));
  return { trees, metadata: collection.metadata };
}

export type TreeData = { trees: Tree[]; metadata: TreeCollection["metadata"] };

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr").trim();
}

export function filterTrees(trees: Tree[], query: string, species: string, remarkableOnly: boolean) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return trees.filter((tree) => {
    const text = normalizeSearch([tree.name, tree.scientificName, tree.managementId, tree.sourceId].join(" "));
    return terms.every((term) => text.includes(term))
      && (!species || tree.species === species)
      && (!remarkableOnly || tree.remarkable === true);
  });
}

export const TREE_COLORS = { normal: "#2f8b62", remarkable: "#d99020", selected: "#255bca" };
export function treeColor(tree: Pick<Tree, "remarkable">, selected: boolean) {
  return selected ? TREE_COLORS.selected : tree.remarkable === true ? TREE_COLORS.remarkable : TREE_COLORS.normal;
}
