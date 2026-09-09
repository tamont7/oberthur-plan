# Parc Oberthür — V1.2

Carte des arbres du parc à Rennes : React, TypeScript, Vite et CesiumJS, avec un extrait réel de l’inventaire de Rennes Métropole. Le brief d’origine est dans [softplan.md](softplan.md) et les évolutions sont consignées dans [CHANGELOG.md](CHANGELOG.md).

## Démarrage

Node ≥ 20.11 (Node 22 recommandé). Le GeoJSON est inclus : aucun jeton ni appel à l’API métropolitaine n’est nécessaire au démarrage.

```bash
npm ci
npm run dev
```

Ouvrir l’adresse donnée par Vite. Après changement des dépendances, arrêter l’ancien serveur ; si nécessaire, relancer avec `npm run dev -- --force`.

```bash
npm run check           # validation des données, tests et compilation
npm run preview         # servir la compilation locale
```

Le fond OpenStreetMap nécessite Internet. La liste et les fiches restent utilisables lorsque WebGL ou le fond de carte échoue. Cela ne constitue pas un mode hors ligne complet.

## Données de Rennes Métropole : comment ?

Source : [Arbres sur l’espace public sur Rennes Métropole](https://data.rennesmetropole.fr/explore/dataset/arbre/), jeu `arbre`, API Explore v2.1 publique, sans clé.

1. Lire le schéma et la licence du jeu.
2. Rechercher les points dans l’emprise `[ouest, sud, est, nord]` : `[-1.661317, 48.111249, -1.657734, 48.113921]`.
3. Paginer les résultats par lots de 100, triés par identifiant, et vérifier leur nombre.
4. Retenir les points situés dans l’emprise GPS fournie, exclure `abattu = 1`. Le rectangle n’est pas le contour officiel du parc : les limites sont donc volontairement transparentes et modifiables dans `src/park.ts`.
5. Normaliser et valider les points, propriétés et identifiants. Écrire le GeoJSON seulement lorsque l’import complet est valide.

Extrait du 9 septembre 2026 : **299 arbres non abattus** dans l’emprise GPS. Ce nombre ne constitue pas une garantie d’exhaustivité de l’inventaire physique.

```bash
npm run data:import
npm run check
```

La commande utilise [scripts/import-rennes.ts](scripts/import-rennes.ts) et remplace [public/data/arbres-rennes.geojson](public/data/arbres-rennes.geojson) après validation. En cas d’erreur réseau, de schéma ou de pagination, le fichier précédent reste intact. Vérifier la différence du GeoJSON avant publication ; aucune actualisation automatique n’a lieu pendant la visite.

Le fichier conserve l’URL de requête, la date d’extraction, la date de traitement du jeu par le portail, les compteurs d’exclusion et les attributs originaux de chaque arbre. **Date de traitement du jeu, date d’import et date de mise à jour d’un arbre sont trois informations distinctes.**

| Champ source | Champ GeoJSON / traitement |
|---|---|
| `id` | `Feature.id = rennes-arbre-{id}` et `source_id` |
| `geo_shape.geometry` | Point WGS84 `[longitude, latitude]` |
| `nom_commun` | `nom`, sinon taxon, sinon identifiant |
| `genre`, `espece`, `variete` | `nom_scientifique` |
| `hauteur` | `hauteur_m`, en mètres |
| `circonference` | `circonference_cm`, en centimètres |
| Mesure nulle, zéro ou négative | `null` dans l’affichage ; original conservé |
| `date_plantation`, `date_maj` | Valeurs sources conservées, sans inventer de date |
| Statut remarquable, photo, modèle 3D | `null` : non fournis par ce jeu |

Le `nom` est celui affiché. Le libellé publié est conservé dans `nom_source`. Une correction éditoriale est appliquée uniquement lorsque le taxon rend la traduction certaine : par exemple `Fagus sylvatica Purpurea` s’affiche comme « Hêtre pourpre », et la fiche indique « Nom publié : Hêtre commun ». Le taxon et le libellé source restent inchangés dans les données brutes.

Les mesures ≤ 0 sont considérées non exploitables, pas des dimensions physiques. Le filtre « Remarquables » reste désactivé tant qu’aucun statut explicite n’est disponible. Une grande hauteur ne permet pas d’attribuer ce statut. Les arbres non signalés abattus par la source peuvent subsister dans l’inventaire.

Les types internes React utilisent camelCase ; le contrat GeoJSON est validé par [src/treeSchema.ts](src/treeSchema.ts). L’adaptation et la recherche sont dans [src/data.ts](src/data.ts). Aucun modèle 3D n’est requis.

## Licence et attribution

Les données proviennent de Rennes Métropole, sous **ODbL 1.0**. L’extrait normalisé est diffusé sous cette même licence, indépendamment du code de l’application. Voir [DATA-LICENSE.md](DATA-LICENSE.md). Le GeoJSON est téléchargeable depuis l’interface.

Les crédits Cesium et OpenStreetMap restent visibles. Les tests remplacent les tuiles réseau par une image locale ; ils ne parcourent pas les serveurs OSM. Pas de préchargement de zone ni de téléchargement hors ligne des tuiles communautaires.

## Vérifications navigateur

```bash
npx playwright install chromium
npm run test:e2e
npm run build
E2E_PREVIEW=1 npm run test:e2e
```

Les tests couvrent le rendu WebGL, la sélection liste/carte, recherche et filtres, recentrage, clavier et panneau mobile, données indisponibles, fond de carte défaillant et absence de WebGL. Chromium simule le mobile : une vérification Safari/iOS et sur un téléphone réel reste utile.

## Choix de stabilisation

- Vite 6.4.3 corrige les avis npm tout en restant compatible avec Node 20.11.
- Cesium 1.120 et ZIP 2.7.34 sont épinglés ensemble pour éviter l’incompatibilité historique `zip-no-worker.js`. Réévaluer ces deux versions ensemble lors d’une future mise à niveau du runtime.
- Cesium est chargé dans un module différé ; pas de script global bloquant avant React.
- Le rendu à la demande évite les images inutiles à l’arrêt ; les points sont conservés entre les sélections et les filtres.
- Le panneau mobile utilise un dialogue natif, avec fermeture Échap, confinement et restitution du focus. Les couleurs sont partagées entre liste, carte et légende.

Suite logique : valider l’inventaire sur place, obtenir le contour exact et les chemins, puis choisir orthophoto et terrain avant d’ajouter des modèles 3D.
