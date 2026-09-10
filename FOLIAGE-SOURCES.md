# Sources des schémas de feuillage

Les SVG de `src/TreeFoliage.tsx` sont des dessins originaux simplifiés à partir des caractères morphologiques décrits dans les fiches ci-dessous. Ce ne sont ni des planches scientifiques reproduites ni des dessins validés par leurs institutions. Aucune photographie source n’est copiée. Un clic sur les vignettes du résumé ouvre une fenêtre avec les deux schémas en grand et leurs liens vers les sources botaniques.

La sélection utilise une liste explicite de noms scientifiques (espèce et, le cas échéant, cultivar). Les noms français ne servent pas à deviner l’espèce. `Quercus` seul, même nommé « Chêne à feuilles de saule », ne déclenche aucun schéma. La graphie municipale `Cedrus libanii` est rapprochée explicitement de `Cedrus libani`, sans modifier la donnée publiée.

Références consultées le 10 septembre 2026 :

| Taxon | Référence morphologique |
| --- | --- |
| Fagus sylvatica | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/fagus-sylvatica) |
| Fagus sylvatica Pendula | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/fagus-sylvatica-f-pendula) |
| Fagus sylvatica Purpurea | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/fagus-sylvatica-purpurea) |
| Fagus sylvatica Laciniata | [Royal Horticultural Society](https://www.rhs.org.uk/plants/32829/fagus-sylvatica-laciniata/details) ; un exemple découpé est représenté, les bords pouvant être presque lisses à profondément divisés. |
| Quercus robur | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/quercus-robur) |
| Quercus palustris | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/quercus-palustris) |
| Quercus cerris | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/quercus-cerris) |
| Quercus ilex | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/quercus-ilex) ; exemple ovale à lancéolé, à base arrondie, pointe aiguë et bord entier. Les feuilles peuvent aussi être dentées, notamment sur les jeunes arbres. Le premier dessin avait des dents excessivement accentuées ; il a été remplacé par un contour propre à cette espèce. |
| Quercus suber | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/quercus-suber) |
| Ginkgo biloba | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/ginkgo-biloba) |
| Cedrus atlantica | [NC State University](https://plants.ces.ncsu.edu/plants/cedrus-atlantica/) et [Oregon State University](https://landscapeplants.oregonstate.edu/plants/cedrus-atlantica) |
| Cedrus atlantica Glauca | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/cedrus-atlantica-glauca) |
| Cedrus libani | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/cedrus-libani) |
| Taxodium distichum | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/taxodium-distichum) ; exemple de rameau à feuilles linéaires. |
| Sequoia sempervirens | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/sequoia-sempervirens) ; exemple à feuilles plates, l’espèce porte aussi des feuilles en écailles. |
| Sequoiadendron giganteum | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/sequoiadendron-giganteum) |

Les couleurs sont des choix graphiques représentatifs de la face supérieure en saison végétative, et non des mesures colorimétriques : hêtre vert `#668b3e`, hêtre pourpre `#784453`, chêne pédonculé `#52763c`, chênes à lobes pointus `#4e7339`, chêne liège `#3f6040`, chêne vert `#4e6d69`, ginkgo `#82a94d`, cèdre vert `#597858`, cèdre Glauca `#71999c`, cyprès chauve `#80a14e`, séquoia toujours vert `#47734b`, séquoia géant `#668d7e`. Le hêtre pourpre peut verdir dans la saison. La palette ne représente pas les couleurs automnales ni le revers des feuilles.

L’affichage est local, sans dépendance ni requête réseau supplémentaire ; la source n’est visitée que si l’utilisateur clique sur son lien dans la fenêtre agrandie.

Les fruits et organes reproducteurs de `src/TreeFruit.tsx` utilisent les descriptions des mêmes fiches d’espèce : faînes triangulaires avec cupule ouverte à quatre valves ; glands et cupules (pédoncule long pour Q. robur, cupule chevelue pour Q. cerris, peu profonde pour Q. palustris) ; cônes dressés en tonneau du cèdre, ovoïdes des séquoias, globuleux du cyprès chauve ; graine à enveloppe charnue jaune du ginkgo femelle. Le lien du fruit des cultivars mène à la fiche de leur espèce. Les teintes brunes ou dorées représentent un stade mûr indicatif. Les cônes et graines du ginkgo ne sont pas étiquetés comme des fruits botaniques ; le dessin ne garantit pas leur présence sur l’arbre sélectionné.

## Référence photographique du chêne vert

Le schéma de Quercus ilex a été ajusté à la [photo quilex910.jpg d’Oregon State University](https://landscapeplants.oregonstate.edu/sites/plantid7/files/styles/medium/public/plantimage/quilex910.jpg?itok=AEIhqSA0), jointe directement par l’utilisateur : proportions allongées, base arrondie, bord faiblement ondulé, pointe effilée, nervure centrale claire et nervures secondaires discrètes. La teinte vert grisâtre est une interprétation de cette photo, sans calibration colorimétrique. Le SVG représente un exemple de feuille, pas toute la variabilité de l’espèce. La photographie n’est pas redistribuée.

## Tilleuls, érables, platane et charme

Les formes supplémentaires sont définies dans `src/additionalFoliage.ts`. Les liens figurent une seule fois au bas de la fenêtre agrandie, avec le nom de l’institution correspondant au domaine.

| Nom dans les données | Source | Caractères représentés |
| --- | --- | --- |
| Tilia platyphyllos | [NC State University](https://plants.ces.ncsu.edu/plants/tilia-platyphyllos/) | Feuille verte cordiforme dentée ; petits fruits côtelés avec bractée. |
| Tilia tomentosa | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/tilia-tomentosa) | Feuille cordiforme, face supérieure verte (le revers est argenté) ; fruits avec bractée. |
| Carpinus betulus | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/carpinus-betulus) | Feuille ovale à double denture, nervures rapprochées ; petit fruit côtelé à bractée trilobée. |
| Platanus x hispanica | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/platanus-acerifolia) | Synonyme explicitement indiqué par la source ; feuille palmée à lobes larges ; deux boules d’akènes. |
| Acer ginnala | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/acer-tataricum-subsp-ginnala) | Synonyme indiqué par la source ; trois lobes dont un central allongé ; samares presque parallèles. |
| Acer japonicum | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/acer-japonicum) | Feuille arrondie à neuf lobes, découpes environ à mi-limbe ; samares. |
| Acer monspessulanum | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/acer-monspessulanum) | Trois lobes à bords entiers ; samares pendantes presque parallèles. |
| Acer negundo Flamingo | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/acer-negundo-flamingo) et [NC State University, espèce](https://plants.ces.ncsu.edu/plants/acer-negundo/) | Feuille composée représentée avec cinq folioles panachées de crème, vert et rose. Pas de fruit affiché : la description du cultivar indique un clone mâle sans graines, malgré une légende de photo contradictoire. |
| Acer palmatum | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/acer-palmatum) | Sept lobes étroits profondément découpés et dentés ; samares à angle obtus. |
| Acer palmatum Polymorphum | [RHS, Acer polymorphum](https://www.rhs.org.uk/plants/185120/acer-polymorphum/details) ; [Oregon State University, Acer palmatum](https://landscapeplants.oregonstate.edu/plants/acer-palmatum) | Rapprochement éditorial explicite avec Acer palmatum ; RHS mentionne Acer palmatum f. polymorphum parmi les synonymes. Schéma de l’espèce, pas d’un cultivar distinct. |
| Acer palmatum Atropurpurea | [NC State University, Atropurpureum](https://plants.ces.ncsu.edu/plants/acer-palmatum-atropurpureum/) | Graphie municipale rapprochée du cultivar Atropurpureum ; feuille palmée pourpre, pas de forme dissectum. |
| Acer pensylvanicum | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/acer-pensylvanicum) | Trois lobes peu profonds orientés vers l’avant ; samares écartées. |
| Acer platanoides | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/acer-platanoides) | Cinq lobes pointus, dents espacées ; samares largement ouvertes. |
| Acer pseudoplatanus | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/acer-pseudoplatanus) | Cinq lobes larges dentés ; samares formant environ 60°. |
| Acer rubrum | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/acer-rubrum) | Exemple à trois lobes dentés, vert en saison végétative ; samares rouge brun à environ 60°. |

Ces schémas supplémentaires interprètent les descriptions morphologiques des sources ; ils ne sont pas des décalques photographiques. Les formes et les teintes restent schématiques. Aucun nouveau téléchargement, paquet ou appel réseau à l’affichage.
