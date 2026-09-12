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


## Dix taxons fréquents supplémentaires — 12 septembre 2026

Sélection parmi les noms scientifiques précis encore sans schéma, par effectif cumulé dans les fichiers Oberthür et Thabor. Les dix taxons couvrent 400 arbres supplémentaires ; les genres seuls et les cultivars non documentés ne sont pas extrapolés. À égalité de dix arbres, le sapin de Nordmann a été retenu.

| Taxon dans les données | Effectif | Référence consultée | Caractères représentés |
| --- | ---: | --- | --- |
| Aesculus hippocastanum | 126 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/aesculus-hippocastanum) | Sept folioles palmées et dentées ; capsule épineuse ouverte et graine brune à cicatrice claire. |
| Taxus baccata | 93 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/taxus-baccata) | Aiguilles plates pointues ; graine dans une arille rouge ouverte au sommet, sur les arbres femelles. |
| Ilex aquifolium | 50 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/ilex-aquifolium) | Feuille vert sombre à marge ondulée épineuse ; fruits rouges sur les arbres femelles. |
| Magnolia grandiflora | 30 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/magnolia-grandiflora) | Feuille elliptique entière persistante ; fruit composé de follicules avec graines rouges. |
| Magnolia x soulangeana | 24 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/magnolia-soulangiana) | Feuille obovale caduque à pointe courte ; fruit composé irrégulier, graines rouges. La source présente les graphies soulangeana et soulangiana. |
| Quercus rubra | 19 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/quercus-rubra) | Feuille à lobes pointus, verte en été ; gland avec cupule très peu profonde. |
| Tilia x euchlora | 18 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/tilia-euchlora) | Feuille cordiforme dentée vert sombre ; petits fruits avec bractée. |
| Trachycarpus fortunei | 16 | [NC State University](https://plants.ces.ncsu.edu/plants/trachycarpus-fortunei/) | Palme divisée en dix-neuf segments plissés ; drupes bleu-noir sur une portion de l’infrutescence femelle. |
| Celtis australis | 14 | [RHS](https://www.rhs.org.uk/plants/28947/celtis-australis/details) | Feuille dentée à pointe allongée ; petites drupes sombres pédonculées. |
| Abies nordmanniana | 10 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/abies-nordmanniana) | Aiguilles orientées vers l’avant, extrémité arrondie échancrée ; cône cylindrique dressé. |

Les marqueurs d’hybride `x` et `×` sont acceptés ; l’épithète est conservée lors de la sélection du fruit. Les dessins restent des SVG originaux simplifiés, sans échelle commune ni garantie de fructification de chaque individu. Les feuilles sont représentées de dessus. L’arille de l’if et le cône du sapin sont légendés comme tels. Le lien RHS du micocoulier documente à la fois la feuille et le fruit.


## Deuxième série de dix taxons fréquents — 12 septembre 2026

Sélection par effectif cumulé encore sans schéma. À égalité de huit arbres, les cinq entrées retenues sont le houx ‘J.C. van Tol’, l’if ‘Fastigiata’, l’arbre de Judée, le frêne à fleurs et le platane d’Orient. Les noms limités au genre restent sans schéma. Cette série ajoute 87 arbres.

| Nom dans les données | Effectif | Source consultée | Caractères représentés |
| --- | ---: | --- | --- |
| Sassafras albidum | 10 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/sassafras-albidum) | Exemple de feuille trilobée entière ; drupe bleu-noir sur réceptacle et pédoncule rouges. L’espèce porte aussi des feuilles non lobées ou en moufle. |
| Cupressus sempervirens | 10 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/cupressus-sempervirens) | Écailles sur rameaux cylindriques ; cône subglobuleux à ellipsoïde, ligneux et brun à maturité. |
| Chamaecyparis lawsoniana | 9 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/chamaecyparis-lawsoniana) | Ramules aplaties ramifiées avec écailles opposées ; petits cônes globuleux. |
| Laurus nobilis | 9 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/laurus-nobilis) | Feuille elliptique allongée à bord entier ondulé ; drupe ovoïde noire, sur pied femelle. |
| Prunus cerasifera Pissardii | 9 | [RHS](https://www.rhs.org.uk/plants/99810/prunus-cerasifera-pissardii/details), [NC State University](https://plants.ces.ncsu.edu/plants/prunus-cerasifera/) | Feuille ovale dentée pourpre ; prune rouge sombre. La fructification peut être peu abondante. |
| Ilex aquifolium J.C Van Tol | 8 | [RHS](https://www.rhs.org.uk/plants/75559/ilex-aquifolium-j-c-van-tol-f/details) | Feuille ovale presque sans épines ; fruits rouges. Ponctuation municipale explicitement rapprochée de ‘J.C. van Tol’, cultivar femelle autofertile. |
| Taxus baccata Fastigiata | 8 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/taxus-baccata-fastigiata) et [fiche de l’espèce](https://landscapeplants.oregonstate.edu/plants/taxus-baccata) | Rameau dressé à aiguilles sombres ; graine dans son arille rouge. Cultivar généralement femelle, avec parfois des fleurs mâles sur certaines branches. |
| Cercis siliquastrum | 8 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/cercis-siliquastrum) | Feuille arrondie à base cordiforme, sans dents ni pointe aiguë ; gousses plates brunes. |
| Fraxinus ornus | 8 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/fraxinus-ornus) | Feuille pennée à sept folioles ; samares simples allongées en groupe. |
| Platanus orientalis | 8 | [RHS](https://www.rhs.org.uk/plants/details?plantid=1487) | Feuille palmée profondément découpée ; plusieurs boules de fruits sur un pédoncule. |

Les silhouettes sont des SVG originaux simplifiés, sans échelle commune entre espèces. Le dessin du cyprès de Lawson représente le feuillage adulte de dessus, sans les marques blanches du revers. Aucun cultivar supplémentaire n’est déduit automatiquement de son espèce.


## Dix taxons prioritaires à Oberthür — 12 septembre 2026

Sélection sur les effectifs du seul parc Oberthür encore sans schéma. À égalité de deux arbres, le laurier-palme et le catalpa sont retenus. Cette série couvre 31 arbres supplémentaires à Oberthür.

| Nom dans les données | Effectif Oberthür | Source consultée | Caractères représentés |
| --- | ---: | --- | --- |
| Chamaecyparis lawsoniana Allumii | 4 | [Oregon State University, cultivar](https://landscapeplants.oregonstate.edu/plants/chamaecyparis-lawsoniana-alumii) et [espèce](https://landscapeplants.oregonstate.edu/plants/chamaecyparis-lawsoniana) | Ramules aplaties bleu-gris ; petits cônes globuleux, peu abondants chez ce cultivar. Allumii est donné comme synonyme d’Alumii. |
| Hovenia dulcis | 4 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/hovenia-dulcis) | Feuille ovale dentée ; petits fruits brun-gris à l’extrémité de pédoncules épaissis, représentés séparément des fruits. |
| Thuja plicata Zebrina | 4 | [Oregon State University, cultivar](https://landscapeplants.oregonstate.edu/plants/thuja-plicata-zebrina) et [espèce](https://landscapeplants.oregonstate.edu/plants/thuja-plicata) | Ramules en écailles panachées de bandes jaunes ; petits cônes elliptiques dressés. |
| Abies pinsapo | 3 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/abies-pinsapo) | Aiguilles courtes, épaisses et radiales ; cône cylindrique dressé. |
| Albizzia julibrissin | 3 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/albizia-julibrissin) | Graphie municipale rapprochée explicitement d’Albizia julibrissin ; feuille bipennée à petites folioles oblongues ; gousses plates, légèrement courbées. |
| Liquidambar styraciflua | 3 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/liquidambar-styraciflua) | Feuille verte étoilée à cinq lobes dentés ; boule ligneuse de capsules, ouvertures et pointes visibles. |
| Aesculus sylvatica | 3 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/aesculus-sylvatica) | Cinq folioles palmées ; capsule lisse ouverte et graine brune, sans les épines du marronnier commun. |
| Salix caprea | 3 | [Woodland Trust](https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/goat-willow/) | Feuille ovale à pointe décentrée, vue de dessus ; infrutescence femelle portant des graines cotonneuses. Le dessin ne représente pas les chatons mâles à pollen. |
| Prunus laurocerasus | 2 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/prunus-laurocerasus) | Feuille oblongue vert sombre à denture discrète ; drupes noir-pourpre sur une grappe. |
| Catalpa bignonioides | 2 | [Oregon State University](https://landscapeplants.oregonstate.edu/plants/catalpa-bignonioides) | Feuille cordiforme entière à pointe effilée ; longues capsules étroites pendantes, brunes à maturité. |

Dessins SVG originaux simplifiés, sans échelle commune. Les liens des deux cultivars de conifères sont complétés dans la fenêtre agrandie par la fiche d’espèce décrivant les cônes. Les données municipales ne sont pas modifiées ; les correspondances de graphie restent explicites, sans extrapolation à d’autres cultivars.

### Révision de la feuille d’Albizia

La première version laissait dépasser les axes et superposait des folioles trop larges. La révision termine l’axe principal au niveau de la paire apicale, affine et espace les folioles, et réduit leur taille aux extrémités. La feuille reste bipennée, sans foliole terminale simple ajoutée artificiellement. Le SVG révisé a été rendu localement et inspecté visuellement, avec une marge conservée dans le cadre.

## Revue du cadrage et des extrémités — 12 septembre 2026

Les 61 entrées illustrées présentes dans les deux jeux de données ont été rendues localement en planches et inspectées : 61 feuillages et 60 fruits ou organes reproducteurs. Les samares largement ouvertes des érables dépassaient du cadre ; elles sont maintenant réduites uniformément autour du centre, sans changer leur angle. Les sommets des rameaux d’if commun et de sapin de Nordmann reçoivent de petites aiguilles apicales et un bourgeon schématique ; les extrémités des séquoias à feuilles plates et du cyprès chauve sont complétées. Les rameaux de cyprès d’Italie, de Lawson et de thuya ‘Zebrina’ portent des écailles jusqu’à une extrémité effilée. L’if ‘Fastigiata’ ne présentait pas de troncature et conserve son dessin.

Un rendu avec un cadre élargi a servi à rechercher les tracés sortant du viewBox normal, y compris les contours : aucun débordement résiduel détecté sur les 121 SVG. Cette revue porte sur le dessin et son cadrage ; elle ne constitue pas une validation scientifique des planches.
