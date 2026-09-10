# Parc Oberthür — V1.4

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

La carte utilise un plan vectoriel embarqué, sur un fond gris officiel de Rennes Métropole. La liste et les fiches restent utilisables lorsque WebGL est indisponible.

## Données de Rennes Métropole : comment ?

Source : [Arbres sur l’espace public sur Rennes Métropole](https://data.rennesmetropole.fr/explore/dataset/arbre/), jeu `arbre`, API Explore v2.1 publique, sans clé.

1. Lire le schéma et la licence du jeu.
2. Rechercher les points dans le rectangle englobant du plan : `[-1.6613, 48.1112, -1.6582, 48.1141]`.
3. Télécharger l’emprise officielle « Parc Hamelin Oberthür », puis retenir uniquement les points GPS contenus dans son MultiPolygon (hors éventuels trous).
4. Paginer les résultats par lots de 100, triés par identifiant, et exclure `abattu = 1` après le test spatial.
5. Normaliser et valider les points, propriétés et identifiants. Écrire le GeoJSON seulement lorsque l’import complet est valide.

Extrait du 10 septembre 2026 : **279 arbres non abattus** dans l’emprise officielle. Les 20 autres points du rectangle de collecte sont exclus géométriquement. Ce nombre ne constitue pas une garantie d’exhaustivité de l’inventaire physique.

```bash
npm run data:import
npm run check
```

La commande utilise [scripts/import-rennes.ts](scripts/import-rennes.ts) et remplace [public/data/arbres-rennes.geojson](public/data/arbres-rennes.geojson) après validation. En cas d’erreur réseau, de schéma ou de pagination, le fichier précédent reste intact. Vérifier la différence du GeoJSON avant publication ; aucune actualisation automatique n’a lieu pendant la visite.

Le fichier conserve l’URL de requête, la date d’extraction, la date de traitement du jeu par le portail, les compteurs d’exclusion, la référence de l’emprise officielle et les attributs originaux de chaque arbre. **Date de traitement du jeu, date d’import et date de mise à jour d’un arbre sont trois informations distinctes.**

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

Un diamètre de houppier supérieur à 40 m est également traité comme non exploitable à l’affichage : il est remplacé par `null`, sans conversion ni estimation, tandis que la valeur source est conservée dans `source_properties`. Cette règle évite notamment d’interpréter les valeurs répétées de 80 m associées à certains tilleuls du Thabor comme des couronnes individuelles.

Les types internes React utilisent camelCase ; le contrat GeoJSON est validé par [src/treeSchema.ts](src/treeSchema.ts). L’adaptation et la recherche sont dans [src/data.ts](src/data.ts). Aucun modèle 3D n’est requis.

## Plan vectoriel du parc

Le fond est un plan local, dessiné par Cesium sous les points des arbres : emprise végétale, contour, 36 allées continues et étang. Le [plan de ville simplifié gris](https://public.sig.rennesmetropole.fr/header/geoservices) de Rennes Métropole apporte le contexte autour du parc, via ses tuiles TMS publiques ; le plan vectoriel reste au premier plan.

- L’emprise officielle « Parc Hamelin Oberthür » vient de la couche [Espaces verts de Rennes Métropole](https://data.rennesmetropole.fr/explore/dataset/espaces_verts/), sous ODbL 1.0.
- L’emprise de l’Hôtel Oberthür est téléchargée depuis les géoservices [RTGE de Rennes Métropole](https://public.sig.rennesmetropole.fr/header/geoservices), sous ODbL 1.0.
- Les axes, le plan d’eau et le kiosque viennent d’[OpenStreetMap](https://www.openstreetmap.org/copyright), sous ODbL 1.0.
- L’Hôtel et le kiosque sont des volumes 3D de repérage : leur emprise est géographique, mais leurs hauteurs (15 m et 4,5 m) sont illustratives car les jeux consultés ne publient pas ces altitudes. Leur fiche affiche une photo [Wikimedia Commons](https://commons.wikimedia.org/) au clic, attribuée CC BY-SA 3.0.
- L’extrait validé est [public/data/parc-oberthur.geojson](public/data/parc-oberthur.geojson). Il est affiché et téléchargeable depuis le bouton ⓘ.

```bash
npm run data:plan
npm run check
```

La commande [scripts/import-park-plan.ts](scripts/import-park-plan.ts) télécharge les trois couches, contrôle les deux coordonnées de repère fournies, une emprise officielle, un étang et le réseau continu d’allées, puis remplace le GeoJSON seulement en cas de succès. Les données de plan étant modifiées, l’extrait résultant reste sous ODbL ; consulter [DATA-LICENSE.md](DATA-LICENSE.md).

## Parc du Thabor

Le plan autonome [public/data/parc-thabor.geojson](public/data/parc-thabor.geojson) comprend l’emprise officielle, les allées, les plans d’eau et trois repères 3D indicatifs : l’église Notre-Dame-en-Saint-Melaine, le kiosque à musique et l’Orangerie.

```bash
npm run data:thabor
```

La commande [scripts/import-thabor-plan.ts](scripts/import-thabor-plan.ts) télécharge l’emprise « Parc du Thabor » depuis [Espaces verts de Rennes Métropole](https://data.rennesmetropole.fr/explore/dataset/espaces_verts/) et les allées/plans d’eau depuis [OpenStreetMap](https://www.openstreetmap.org/copyright), valide le résultat puis l’écrit de manière atomique.

L’inventaire [public/data/arbres-thabor.geojson](public/data/arbres-thabor.geojson) est importé séparément :

```bash
npm run data:thabor:trees
```

La commande récupère les points candidats dans un rectangle englobant, télécharge l’emprise officielle actuelle, puis conserve **seulement** les coordonnées GPS contenues dans le MultiPolygon (en excluant ses éventuels trous). Aucun champ tel que `localisation`, `complement` ou le nom de l’arbre ne sert à sélectionner les points. `abattu = 1` est exclu après ce test spatial. L’extrait du 10 septembre 2026 contient **1 081 arbres** ; 149 points candidats hors emprise ont été rejetés. Les compteurs, l’identifiant de l’emprise et les URLs de requête restent dans les métadonnées du GeoJSON.

## Licence et attribution

Les données proviennent de Rennes Métropole et d’OpenStreetMap, sous **ODbL 1.0**. Les extraits normalisés sont diffusés sous cette même licence, indépendamment du code de l’application. Voir [DATA-LICENSE.md](DATA-LICENSE.md). Les GeoJSON sont téléchargeables depuis l’interface.

Les attributions Rennes Métropole et OpenStreetMap sont accessibles dans le panneau ⓘ. Les GeoJSON sont extraits à la demande de développement, puis servis localement : l’application ne précharge ni ne contacte de service cartographique pendant une visite.

## Vérifications navigateur

```bash
npx playwright install chromium
npm run test:e2e
npm run build
E2E_PREVIEW=1 npm run test:e2e
```

Les tests couvrent le rendu WebGL, le plan vectoriel local, la sélection liste/carte, recherche et filtres, recentrage, clavier et panneau mobile, données indisponibles et absence de WebGL. Chromium simule le mobile : une vérification Safari/iOS et sur un téléphone réel reste utile.

## Choix de stabilisation

- Vite 6.4.3 corrige les avis npm tout en restant compatible avec Node 20.11.
- Cesium 1.120 et ZIP 2.7.34 sont épinglés ensemble pour éviter l’incompatibilité historique `zip-no-worker.js`. Réévaluer ces deux versions ensemble lors d’une future mise à niveau du runtime.
- Cesium est chargé dans un module différé ; pas de script global bloquant avant React.
- Le rendu à la demande évite les images inutiles à l’arrêt ; les points sont conservés entre les sélections et les filtres. Le fond est vectoriel et embarqué, plutôt qu’un flux de tuiles raster.
- Le panneau mobile utilise un dialogue natif, avec fermeture Échap, confinement et restitution du focus. Les couleurs sont partagées entre liste, carte et légende.

Suite logique : vérifier le tracé des allées sur place, enrichir le plan avec bancs, entrées et massifs, puis éventuellement proposer une orthophoto comme couche de contrôle activable (pas comme fond par défaut).
