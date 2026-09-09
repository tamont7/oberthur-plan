Bien sûr. Voici le contenu prêt à copier dans `parc-oberthur-projet.md` :

````md
# Parc Oberthür — Projet de jumeau numérique

## 1. Vision du projet

Créer une application web autour du **Parc Oberthür** qui commence comme une carte interactive des arbres, puis évolue progressivement vers un **jumeau numérique 3D du parc**.

L'objectif à terme est de pouvoir explorer le parc en 3D et d'y associer différentes données du site :

- arbres
- végétation
- chemins
- bâtiments
- mobilier
- terrain
- orthophotographie
- modèles 3D
- données historiques
- éventuellement données temps réel / capteurs

---

## 2. Stack technique retenue

### Frontend

- React
- TypeScript
- Vite
- CesiumJS

**CesiumJS est le moteur 3D principal du projet.**

Il est particulièrement adapté à :

- la cartographie 3D géospatiale
- les coordonnées GPS
- le terrain 3D
- les bâtiments
- les modèles 3D
- les 3D Tiles
- la photogrammétrie
- les données LiDAR
- les environnements de type digital twin

### Backend — à introduire progressivement

- Node.js
- TypeScript
- API REST ou équivalent

### Base de données — à introduire progressivement

- PostgreSQL
- PostGIS

PostGIS deviendra à terme la **source de vérité** pour les données géographiques.

### Formats de données

- GeoJSON : échange/import/export de données géographiques
- GeoPackage : éventuellement pour les imports SIG
- GLB / glTF : modèles 3D ponctuels
- 3D Tiles : gros volumes de données 3D

### Déploiement envisagé

- Vercel pour le frontend
- PostgreSQL managé pour la base de données

---

# 3. Pourquoi Cesium ?

Trois solutions ont été comparées :

## CesiumJS

Choix retenu.

Très adapté à :

- cartographie 3D
- géospatial
- terrain
- coordonnées réelles
- bâtiments
- 3D Tiles
- photogrammétrie
- LiDAR
- exploration immersive
- digital twins

## deck.gl

Excellent pour :

- visualisation de données
- gros volumes de points
- lignes
- polygones
- heatmaps
- dashboards cartographiques

Mais moins orienté vers l'exploration d'un environnement 3D complet.

## Hexagon

Très puissant pour :

- GIS professionnel
- smart city
- digital twins industriels
- infrastructures
- environnements d'entreprise

Mais beaucoup plus lourd pour commencer un projet web indépendant.

**Décision : CesiumJS.**

---

# 4. V1 — objectif immédiat

La V1 doit rester simple et rapide à développer.

Il ne faut pas commencer directement avec :

- PostGIS
- LiDAR
- photogrammétrie
- centaines de GLB
- 3D Tiles complexes

La priorité est d'obtenir rapidement une première application fonctionnelle.

## V1 cible

Application React + TypeScript + CesiumJS avec :

- carte du Parc Oberthür
- affichage des arbres
- coordonnées GPS
- clic sur un arbre
- fiche détaillée
- recherche
- filtres
- filtre "arbres remarquables"
- interface responsive desktop + mobile
- quelques arbres fictifs de démonstration

---

# 5. Données V1

Pour commencer rapidement :

```text
arbres.json
````

ou :

```text
arbres.geojson
```

Exemple de propriétés :

```text
id
nom
nom_scientifique
latitude
longitude
hauteur
circonference
remarquable
description
photo_url
model_3d_url
```

Le champ :

```text
model_3d_url
```

doit être **nullable**.

Les modèles 3D ne doivent pas être obligatoires pour afficher un arbre.

---

# 6. GLB / modèles 3D

Le GLB est **optionnel**.

Il ne doit surtout pas bloquer la V1.

Trois niveaux sont envisagés.

## Niveau 1 — représentation légère

La majorité des arbres peuvent simplement être représentés par :

* un point
* une icône
* éventuellement un symbole 3D simple
* les données de l'arbre

Avantage :

* très léger
* rapide
* facile à maintenir

## Niveau 2 — modèle générique par espèce

Utiliser un GLB générique pour certaines espèces :

* chêne
* platane
* hêtre
* etc.

Un même modèle peut être utilisé pour plusieurs arbres.

## Niveau 3 — modèle individuel

Pour certains arbres remarquables :

* modèle GLB individuel
* éventuellement issu de photogrammétrie
* niveau de détail élevé

L'idée est de réserver les modèles lourds aux arbres qui le justifient.

---

# 7. Exemple de stratégie pour beaucoup d'arbres

Pour environ 1000 arbres, stratégie indicative :

* majorité : représentation légère
* environ 45 arbres : modèles génériques détaillés
* environ 5 arbres : modèles individuels / photogrammétrie

Ces chiffres sont indicatifs et devront être adaptés aux données réelles.

Le principe important est :

> Ne pas modéliser chaque arbre individuellement dès le début.

---

# 8. Architecture de données future

À terme, une table PostgreSQL/PostGIS pourrait ressembler à :

```text
arbres
-----
id
nom
nom_scientifique
geom
hauteur
circonference
diametre
etat_sanitaire
remarquable
description
photo_url
model_3d_url
date_observation
```

`geom` contiendra la géométrie spatiale PostGIS.

Cela permettra ensuite :

* recherche spatiale
* arbres à proximité
* arbres dans une zone
* calcul de distances
* filtres géographiques
* analyses SIG
* requêtes spatiales
* connexion avec d'autres objets du parc

---

# 9. Évolution vers le jumeau numérique

Le projet doit évoluer progressivement.

## V1 — Carte interactive

* arbres
* recherche
* filtres
* fiches arbres

## V2 — Parc en 3D

Ajouter :

* CesiumJS
* terrain
* relief
* orthophoto
* arbres positionnés dans l'espace

## V3 — Environnement du parc

Ajouter :

* chemins
* massifs
* pelouses
* bâtiments
* mobilier
* autres éléments du parc

## V4 — 3D avancée

Ajouter progressivement :

* GLB / glTF
* photogrammétrie
* LiDAR
* modèles détaillés
* 3D Tiles

## V5 — Jumeau numérique complet

Le parc devient un véritable modèle numérique exploitable avec :

* données géographiques
* données botaniques
* modèles 3D
* historique
* évolution des arbres
* observations
* éventuellement capteurs
* données temps réel
* exploration immersive

---

# 10. Mobile

L'application doit être pensée **mobile-first**.

Il ne faut pas simplement prendre l'interface desktop et la réduire.

## UX mobile envisagée

* carte presque plein écran
* liste des arbres sous forme de bottom sheet
* fiche arbre depuis le bas de l'écran
* boutons suffisamment grands pour le tactile
* recherche simplifiée
* filtres accessibles rapidement
* pinch-to-zoom
* interactions tactiles Cesium

## Fonctionnalités futures possibles

### Géolocalisation

Bouton :

```text
Me localiser
```

Puis :

* position de l'utilisateur
* arbres proches
* distance jusqu'à un arbre
* navigation vers un arbre

### Promenade

Possibilité de créer :

* parcours dans le parc
* promenade thématique
* parcours des arbres remarquables
* parcours botanique

### Identification

À terme :

* prise de photo d'un arbre
* identification de l'espèce
* affichage de la fiche correspondante

Une évolution encore plus ambitieuse pourrait être la réalité augmentée.

---

# 11. Architecture initiale

Ne pas sur-architecturer la V1.

## V1

```text
React
  ↓
TypeScript
  ↓
CesiumJS
  ↓
arbres.json / GeoJSON
```

## Architecture future

```text
React + TypeScript
        ↓
     CesiumJS
        ↓
     API Node.js
        ↓
 PostgreSQL + PostGIS
        ↓
Données SIG / GeoJSON
        ↓
GLB / 3D Tiles / terrain
        ↓
Photogrammétrie / LiDAR
```

---

# 12. Structure de projet V1 envisagée

```text
parc-oberthur/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── README.md
├── data/
│   └── arbres-demo.geojson
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── data.ts
    └── styles.css
```

## Dépendances principales

* React
* React DOM
* TypeScript
* Vite
* Cesium
* vite-plugin-cesium

L'intégration Cesium doit être configurée de manière à pouvoir démarrer la V1 sans dépendre immédiatement d'une infrastructure complexe.

---

# 13. Démonstration V1

Prévoir quelques arbres fictifs.

Les arbres de démonstration doivent permettre de tester :

* plusieurs positions
* plusieurs espèces
* différentes hauteurs
* différentes circonférences
* arbres remarquables
* descriptions
* sélection sur la carte
* recherche
* filtres

Les coordonnées de démonstration doivent être clairement indiquées comme **fictives** tant que les vraies données du Parc Oberthür ne sont pas intégrées.

---

# 14. UX générale

L'expérience cible :

1. L'utilisateur arrive sur le Parc Oberthür.
2. Il voit immédiatement les arbres.
3. Il peut zoomer et se déplacer.
4. Il clique sur un arbre.
5. Une fiche apparaît.
6. Il peut rechercher une espèce ou un arbre.
7. Il peut filtrer les arbres remarquables.
8. Plus tard, il peut passer à une véritable exploration 3D.

L'interface doit rester :

* claire
* légère
* moderne
* agréable
* rapide
* responsive

Il ne faut pas transformer la V1 en application SIG complexe.

---

# 15. Principes importants pour Codex

Lors de l'implémentation :

* privilégier une architecture simple et évolutive
* utiliser TypeScript
* garder le code propre et lisible
* séparer les données de démonstration de la logique d'affichage
* prévoir dès le départ `model_3d_url` comme champ nullable
* ne pas rendre les GLB obligatoires
* ne pas introduire PostGIS tant que la V1 n'en a pas besoin
* conserver GeoJSON comme format simple d'import/export
* préparer l'architecture pour une future API
* penser responsive/mobile dès la V1
* utiliser CesiumJS comme moteur 3D principal
* éviter de verrouiller le projet dans une architecture trop complexe
* garder une trajectoire claire vers le jumeau numérique
* privilégier les performances, notamment sur mobile
* prévoir une évolution progressive du niveau de détail 3D

---

# 16. Philosophie du projet

Le projet doit suivre une logique :

```text
Simple
  ↓
Fonctionnel
  ↓
Géospatial
  ↓
3D
  ↓
3D détaillée
  ↓
Jumeau numérique
```

Il ne faut pas chercher à construire le jumeau numérique complet dès la première version.

La V1 doit être une **fondation propre** permettant d'ajouter progressivement les couches de données et de 3D.

---

# 17. Résumé technique

### Aujourd'hui

```text
React
+
TypeScript
+
Vite
+
CesiumJS
+
GeoJSON
```

### Ensuite

```text
React
+
CesiumJS
+
Node.js
+
PostgreSQL/PostGIS
```

### Puis

```text
Terrain
+
Orthophoto
+
Arbres
+
Chemins
+
Bâtiments
+
Mobilier
```

### Puis

```text
GLB / glTF
+
Photogrammétrie
+
LiDAR
+
3D Tiles
```

### Objectif final

```text
                 PARC OBERTHÜR
                       │
              JUMEAU NUMÉRIQUE
                       │
       ┌───────────────┼───────────────┐
       │               │               │
     Terrain         Arbres        Bâtiments
       │               │               │
    Relief         Botanique       Architecture
       │               │               │
  Orthophoto       Historique      Modèles 3D
       │               │               │
       └───────────────┼───────────────┘
                       │
                  CesiumJS
                       │
                 Application Web
                       │
                Desktop + Mobile
```

---

# 18. Phrase de référence pour Codex

> Construire d'abord une application web mobile et desktop des arbres du Parc Oberthür avec React + TypeScript + CesiumJS, en utilisant du GeoJSON pour les données initiales, puis faire évoluer progressivement cette base vers un jumeau numérique 3D complet du parc avec PostgreSQL/PostGIS, terrain, bâtiments, végétation, GLB, photogrammétrie, LiDAR et 3D Tiles.

## Priorité absolue

**Faire fonctionner une V1 simple, propre et agréable avant d'ajouter de la complexité.**

```

Tu peux donner ce fichier tel quel à Codex comme **contexte/brief initial du projet**.
```
