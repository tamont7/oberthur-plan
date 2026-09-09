# Changements

## V1.3 — 9 septembre 2026

### Plan vectoriel du parc

- Le fond de tuiles OpenStreetMap est remplacé par un plan vectoriel embarqué : emprise du Parc Hamelin Oberthür, les 36 allées continues et le plan d’eau. Les segments de bord RTGE ne sont pas affichés afin de préserver la continuité du réseau.
- L’emprise provient de la couche officielle « Espaces verts » de Rennes Métropole ; l’emprise de l’Hôtel Oberthür provient du RTGE officiel. Les axes, l’étang et le kiosque proviennent d’OpenStreetMap. Ces sources sont attribuées et disponibles sous ODbL 1.0.
- L’Hôtel Oberthür et le kiosque sont matérialisés par des volumes 3D cliquables ; les hauteurs sont explicitement indicatives car absentes des données. Chaque fiche propose une photo Wikimedia Commons avec auteur et licence CC BY-SA 3.0.
- Le plan est net sur les écrans à haute densité, fonctionne sans appel à un fond de carte externe et cadre le contour officiel complet du parc.
- `npm run data:plan` reproduit l’extraction, valide une emprise, un plan d’eau, le réseau d’allées, l’Hôtel, le kiosque et les deux positions de contrôle, puis produit `public/data/parc-oberthur.geojson` de manière atomique.
- Le panneau ⓘ regroupe désormais aussi les sources et le téléchargement GeoJSON du plan.
- Le plan de ville simplifié gris de Rennes Métropole apporte désormais un contexte léger autour des deux parcs, sans clé API.

### Préparation du Thabor

- Ajout d’un plan vectoriel autonome du Thabor, sans bâtiments ni inventaire d’arbres : emprise officielle, allées et plans d’eau.
- `npm run data:thabor` permet de régénérer ce fichier local de manière atomique à partir de Rennes Métropole et OpenStreetMap.

## V1.2 — 9 septembre 2026

### Données

- La sélection repose désormais sur l’emprise GPS définie pour le parc, sans dépendre du champ éditorial `localisation`.
- Les arbres signalés `abattu = 1` restent exclus ; l’extrait contient actuellement 299 arbres non abattus, dont les cèdres `arbre.135502` et `arbre.216262` dont `localisation` est absente.
- Les propriétés originales Rennes Métropole, dont `gml_id`, `id` et `code_insee`, restent conservées dans `source_properties` du GeoJSON.
- Le nom affiché peut corriger une traduction certaine tout en conservant le libellé source dans `nom_source`.

### Exploration et fiches

- Recherche par nom vernaculaire ou scientifique, avec suggestions et sélecteur d’espèces enrichis.
- Une croix dans la barre de recherche efface la recherche ou l’espèce choisie sans désactiver le filtre « Remarquables ».
- Chaque taxon affiche son nombre d’arbres ; les suggestions, le sélecteur et la liste filtrée se trient par nom usuel (ordre par défaut), taxon scientifique ou nombre d’arbres.
- Les références techniques ne sont plus affichées ni recherchées dans la liste latérale.
- Le taxon scientifique d’une fiche ouvre directement le premier résultat Wikipédia en français, avec une recherche comme solution de secours.
- Les sources, la licence, l’extrait GeoJSON, la couverture et l’attribution OpenStreetMap sont regroupés dans le panneau accessible par le bouton ⓘ.

### Carte et interactions

- Cliquer un arbre ne recentre plus la caméra ; seul « Revenir au parc » change la vue.
- La carte emploie désormais la densité de pixels native de l’écran pour rester nette sur téléphone.
- Le survol d’un point affiche son nom.
- Le survol ou la sélection d’un arbre, dans la liste ou sur la carte, met en évidence le point concerné ; les autres arbres du même taxon restent aussi en bleu, sans être agrandis.
- Les arbres correspondant à un filtre actif passent en bleu sur la carte.

### Fiabilité

- Le schéma accepte une `localisation` source absente tout en contrôlant strictement les coordonnées dans l’emprise GPS.
- Les tests couvrent la sélection GPS, la conservation des identifiants source et les priorités de mise en évidence.

## V1.1

- Première version fondée sur l’inventaire Rennes Métropole, avec carte Cesium, filtrage, fiches arbre, import validé et attribution ODbL.
