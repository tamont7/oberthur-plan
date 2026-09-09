export const PARK_BOUNDS = [-1.661317, 48.111249, -1.657734, 48.113921] as const;
// Emprise du plan : elle couvre le contour officiel complet, légèrement plus large que l’extrait d’arbres.
export const PARK_PLAN_BOUNDS = [-1.6613, 48.1112, -1.6582, 48.1141] as const;
export const SOURCE_URL = "https://data.rennesmetropole.fr/explore/dataset/arbre/";
export const API_URL = "https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/arbre";
export const PARK_PLAN_SOURCE_URL = "https://data.rennesmetropole.fr/explore/dataset/espaces_verts/";

export function isInsideParkBounds(longitude: number, latitude: number) {
  const [west, south, east, north] = PARK_BOUNDS;
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}
