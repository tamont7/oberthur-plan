# Licence des données

L’extrait [public/data/arbres-rennes.geojson](public/data/arbres-rennes.geojson) est adapté du jeu **Arbres sur l’espace public sur Rennes Métropole**, publié par Rennes Métropole :

https://data.rennesmetropole.fr/explore/dataset/arbre/

La base source et cet extrait normalisé sont disponibles sous l’[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/).

Attribution proposée : « Données : Rennes Métropole — Arbres sur l’espace public, ODbL 1.0 ; extrait et normalisation pour les parcs Oberthür et du Thabor. »

Les transformations sont documentées dans le README et reproduites par `npm run data:import`. La date d’extraction et les propriétés originales sont conservées dans le GeoJSON, librement téléchargeable depuis l’interface.

## Plan vectoriel

Le fichier [public/data/parc-oberthur.geojson](public/data/parc-oberthur.geojson) combine :

- l’emprise du Parc Hamelin Oberthür, issue de la couche [Espaces verts sur Rennes Métropole](https://data.rennesmetropole.fr/explore/dataset/espaces_verts/) ;
- l’emprise de l’Hôtel Oberthür, issue des [géoservices RTGE de Rennes Métropole](https://public.sig.rennesmetropole.fr/header/geoservices) ;
- les axes, le plan d’eau et le kiosque, issus d’[OpenStreetMap contributors](https://www.openstreetmap.org/copyright).

Les deux sources et l’extrait dérivé sont sous **ODbL 1.0**. Attribution proposée : « Plan : Rennes Métropole — Espaces verts ; © OpenStreetMap contributors, ODbL 1.0 ». L’extraction est reproduite par `npm run data:plan`.

Le fond de contexte est le « Plan de ville simplifié gris » de Rennes Métropole, distribué publiquement par ses [géoservices](https://public.sig.rennesmetropole.fr/header/geoservices) ; son attribution reste visible sur la carte.


## Photos des repères

Les photos ne sont chargées qu’au clic sur le repère. Elles ne font pas partie de l’extrait ODbL :

- Hôtel Oberthür : [Sémhur, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Rennes_-_Parc_Oberth%C3%BCr_-_Demeure_des_Oberth%C3%BCr_-_20080706.jpg) ;
- kiosque / chalet : [Pymouss, CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Rennes_ParcOberthur_chalet.jpg).

## Plan du Thabor

Le fichier [public/data/parc-thabor.geojson](public/data/parc-thabor.geojson) combine l’emprise officielle « Parc du Thabor » de [Rennes Métropole](https://data.rennesmetropole.fr/explore/dataset/espaces_verts/), les allées/plans d’eau et les emprises de repères issus d’[OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Il est sous **ODbL 1.0**.

Le fichier [public/data/arbres-thabor.geojson](public/data/arbres-thabor.geojson) est un extrait du même inventaire municipal. Les points sont retenus exclusivement si leurs coordonnées GPS sont dans l’emprise officielle du parc ; les attributs descriptifs ne participent pas à cette sélection. La reproduction de l’extraction est `npm run data:thabor:trees`.

Ce document n’attribue pas de licence au code applicatif.
