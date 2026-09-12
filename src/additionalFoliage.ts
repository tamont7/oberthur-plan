import type { Foliage } from "./TreeFoliage";

type Point = [number, number];
// Small teeth along a hand-defined contour; geometry is computed once at import.
function serrated(points: Point[], depth = 1.2): string {
  const area = points.reduce((sum, [x, y], i) => { const next = points[(i + 1) % points.length]; return sum + x * next[1] - next[0] * y; }, 0);
  const vertices: Point[] = [];
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    const dx = nx - x, dy = ny - y, length = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(length / 5));
    for (let j = 0; j < steps; j++) {
      const t = j / steps, peak = (j + 0.55) / steps;
      vertices.push([x + dx * t, y + dy * t]);
      const offset = (j % 2 ? depth * 0.55 : depth) * Math.sign(area);
      vertices.push([x + dx * peak + dy / length * offset, y + dy * peak - dx / length * offset]);
    }
  });
  return `M${vertices.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
}
function palmate(lobes: number, valley: number) {
  const points: Point[] = [[60, 96]];
  const tips: Point[] = [];
  for (let i = 0; i < lobes * 2 - 1; i++) {
    const angle = (-142 + i * 284 / (lobes * 2 - 2)) * Math.PI / 180;
    const radius = i % 2 ? valley : 47;
    const point: Point = [60 + Math.sin(angle) * radius, 61 - Math.cos(angle) * radius];
    points.push(point);
    if (!(i % 2)) tips.push(point);
  }
  return { outline: serrated(points, 0.8), veins: `M60 118V61${tips.map(([x, y]) => `M60 61 ${x.toFixed(1)} ${y.toFixed(1)}`).join("")}` };
}
const green = { fill: "#5d803d", stroke: "#35552b", veinStroke: "#9aae6e", veinWidth: 0.9 };
const maple = { ...green, label: "Feuille d’érable", description: "Feuille palmée." };
const japaneseMaple: Foliage = { ...maple, ...palmate(7, 16), label: "Feuille d’érable japonais" };
const linden: Foliage = {
  ...green, label: "Feuille de tilleul", description: "Feuille dentée, en cœur, à base dissymétrique.",
  outline: serrated([[58,90],[44,98],[29,96],[18,86],[12,69],[16,52],[28,37],[46,27],[60,9],[73,28],[91,37],[102,53],[105,69],[97,87],[81,98],[66,96]], 1.2),
  veins: "M53 117 58 90 60 17M58 90Q34 88 18 74M58 90Q34 67 20 50M59 73 31 38M60 52 46 28M58 90Q80 87 100 73M58 90Q78 66 98 47M59 72 89 37M60 52 74 29",
};
const osu = "https://landscapeplants.oregonstate.edu/plants/";
function source(taxon: string, drawing: Foliage, slug = taxon.toLowerCase().replace(/ /g, "-")): Foliage {
  return { ...drawing, sourceTaxon: taxon, sourceUrl: `${osu}${slug}` };
}
export const additionalFoliage: Record<string, Foliage> = {
  "chamaecyparis lawsoniana allumii": source("Chamaecyparis lawsoniana 'Alumii'", { ...green, kind: "lawsonSpray", fill: "#719397", stroke: "#4f7277", label: "Rameau de cyprès de Lawson ‘Alumii’", description: "Ramules aplaties bleu-vert à gris-bleu ; cultivar produisant peu de cônes." }, "chamaecyparis-lawsoniana-alumii"),
  "hovenia dulcis": source("Hovenia dulcis", {
    ...green, label: "Feuille de raisinier de Chine", description: "Feuille largement ovale dentée, à pointe effilée et base légèrement en cœur.",
    outline: serrated([[59,98],[42,104],[24,92],[15,72],[21,51],[38,32],[57,17],[64,7],[73,29],[92,47],[104,71],[98,91],[79,102],[65,98]], 1.2),
    veins: "M58 119 60 98 64 17M60 98Q31 79 30 42M60 98Q91 76 87 42M61 76 23 54M62 55 40 33M61 76 98 56M62 55 80 34",
  }),
  "thuja plicata zebrina": source("Thuja plicata 'Zebrina'", { ...green, kind: "zebrina", fill: "#547b4d", label: "Rameau de thuya ‘Zebrina’", description: "Écailles en ramules aplaties, panachées de bandes jaunes à crème." }, "thuja-plicata-zebrina"),
  "abies pinsapo": source("Abies pinsapo", { ...green, kind: "pinsapo", fill: "#5c8075", label: "Rameau de sapin d’Espagne", description: "Aiguilles courtes, épaisses, rigides et disposées autour du rameau." }),
  "albizzia julibrissin": source("Albizia julibrissin", { ...green, kind: "bipinnate", label: "Feuille d’arbre à soie", description: "Feuille deux fois composée, avec de nombreuses petites folioles oblongues." }),
  "liquidambar styraciflua": source("Liquidambar styraciflua", { ...green, ...palmate(5, 23), label: "Feuille de copalme d’Amérique", description: "Feuille étoilée à cinq lobes pointus finement dentés, verte en été." }),
  "aesculus sylvatica": source("Aesculus sylvatica", { ...green, kind: "woodlandBuckeye", label: "Feuille de marronnier des bois", description: "Feuille composée palmée à cinq folioles dentées." }),
  "salix caprea": {
    ...green, fill: "#64816a", label: "Feuille de saule marsault", description: "Feuille largement ovale à pointe courte, légèrement dentée ; face supérieure verte.",
    outline: serrated([[60,105],[41,100],[28,85],[25,67],[30,47],[43,32],[58,24],[65,12],[73,30],[88,44],[96,64],[90,85],[77,101]], .6),
    veins: "M60 119 63 25M61 96 35 83M61 80 30 65M62 63 35 48M62 46 46 33M61 96 83 83M61 80 90 65M62 63 85 48M62 46 75 33",
    sourceTaxon: "Salix caprea", sourceUrl: "https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/goat-willow/",
  },
  "prunus laurocerasus": source("Prunus laurocerasus", {
    ...green, fill: "#3d6644", label: "Feuille de laurier-palme", description: "Feuille persistante oblongue, brillante, à denture discrète.",
    outline: serrated([[60,106],[43,95],[34,79],[31,57],[35,36],[46,22],[61,12],[76,23],[85,39],[88,59],[84,80],[74,98]], .4),
    veins: "M60 119V20M60 95 39 81M60 80 35 62M60 64 35 43M60 47 43 28M60 95 80 81M60 80 85 62M60 64 84 43M60 47 77 28",
  }),
  "catalpa bignonioides": source("Catalpa bignonioides", {
    ...green, fill: "#75924e", label: "Feuille de catalpa", description: "Grande feuille ovale en cœur, à bord entier et pointe brusquement effilée.",
    outline: "M60 95C37 115 15 94 15 72Q14 45 42 32Q56 29 62 10Q69 30 82 32Q108 46 108 72C108 99 80 114 60 95Z",
    veins: "M58 119 60 95 62 21M60 95Q31 88 20 66M60 95Q37 60 39 37M60 95Q91 89 103 66M60 95Q87 61 84 38M61 63 46 37M61 63 77 36",
  }),

  "sassafras albidum": source("Sassafras albidum", {
    ...green, label: "Feuille trilobée de sassafras", description: "Exemple à trois lobes arrondis ; le même arbre porte aussi des feuilles entières ou en moufle.",
    outline: "M60 106Q34 98 22 78Q9 52 22 45Q32 41 42 64Q46 69 44 49Q36 15 58 10Q82 12 76 44Q72 66 79 60Q94 38 105 50Q117 67 95 89Q79 104 60 106Z",
    veins: "M60 119V20M60 96Q40 78 23 53M60 96Q80 78 101 56M60 75 47 48M60 75 75 47",
  }),
  "cupressus sempervirens": source("Cupressus sempervirens", { ...green, kind: "cypressSpray", fill: "#3e624d", label: "Rameau de cyprès d’Italie", description: "Petites feuilles en écailles appliquées sur des rameaux cylindriques." }),
  "chamaecyparis lawsoniana": source("Chamaecyparis lawsoniana", { ...green, kind: "lawsonSpray", fill: "#507866", label: "Rameau de cyprès de Lawson", description: "Ramules aplaties en éventail portant des écailles opposées." }),
  "laurus nobilis": source("Laurus nobilis", {
    ...green, fill: "#416443", label: "Feuille de laurier-sauce", description: "Feuille persistante elliptique allongée, coriace, à bord ondulé entier.",
    outline: "M60 106Q40 98 39 85Q32 74 36 63Q33 49 43 39Q47 24 62 11Q73 25 79 39Q88 49 84 63Q89 76 81 85Q78 101 60 106Z",
    veins: "M59 119 62 18M60 94 42 82M60 78 38 63M61 60 45 41M61 94 78 82M61 78 82 63M62 60 78 41",
  }),
  "prunus cerasifera pissardii": {
    ...green, fill: "#784653", stroke: "#512f3e", veinStroke: "#b5828d", label: "Feuille de prunus pourpre ‘Pissardii’", description: "Feuille ovale finement dentée, pourpre, à pointe effilée.",
    outline: serrated([[60,105],[40,95],[29,78],[29,57],[37,40],[49,27],[62,11],[74,29],[86,44],[93,65],[87,85],[74,99]], .9),
    veins: "M60 119 62 19M60 93 35 77M61 76 32 58M61 59 41 40M62 43 51 28M60 93 85 78M61 76 89 59M61 59 81 41M62 43 73 29",
    sourceTaxon: "Prunus cerasifera 'Pissardii'", sourceUrl: "https://www.rhs.org.uk/plants/99810/prunus-cerasifera-pissardii/details",
  },
  "ilex aquifolium j.c van tol": {
    ...green, fill: "#345e43", label: "Feuille de houx ‘J.C. van Tol’", description: "Feuille ovale vert sombre, presque dépourvue d’épines.",
    outline: "M60 105Q34 98 31 78Q26 60 35 45Q40 28 61 13Q82 29 85 46Q94 65 87 80Q82 100 60 105Z",
    veins: "M60 119V22M60 93 36 79M60 75 32 61M60 56 42 37M60 93 84 79M60 75 88 61M60 56 79 37",
    sourceTaxon: "Ilex aquifolium 'J.C. van Tol'", sourceUrl: "https://www.rhs.org.uk/plants/75559/ilex-aquifolium-j-c-van-tol-f/details",
  },
  "taxus baccata fastigiata": source("Taxus baccata 'Fastigiata'", { ...green, kind: "irishYew", fill: "#345c3f", label: "Rameau d’if ‘Fastigiata’", description: "Aiguilles sombres autour d’un rameau dressé." }, "taxus-baccata-fastigiata"),
  "cercis siliquastrum": source("Cercis siliquastrum", {
    ...green, fill: "#668775", label: "Feuille d’arbre de Judée", description: "Feuille arrondie, à base en cœur, bord entier et sommet arrondi.",
    outline: "M60 91C41 114 14 95 12 68C8 38 30 20 59 20C89 17 112 39 109 68C108 97 81 115 60 91Z",
    veins: "M58 119 60 91 60 27M60 91Q28 80 17 61M60 91Q34 57 33 29M60 91Q91 80 104 61M60 91Q87 57 87 30",
  }),
  "fraxinus ornus": source("Fraxinus ornus", { ...green, kind: "ash", label: "Feuille de frêne à fleurs", description: "Feuille composée pennée, représentée avec sept folioles dentées." }),
  "platanus orientalis": {
    ...green, label: "Feuille de platane d’Orient", description: "Feuille palmée à lobes profondément découpés.",
    outline: "M60 99 36 103 29 92 11 97 25 76 10 62 41 72 33 53 20 24 38 33 43 51 51 67 50 36 60 9 69 34 69 67 80 49 85 32 103 23 88 57 80 72 111 60 97 80 109 96 88 91 80 103Z",
    veins: "M60 120V96L60 18M60 96 27 31M60 96 97 31M60 96 17 91M60 96 102 91",
    sourceTaxon: "Platanus orientalis", sourceUrl: "https://www.rhs.org.uk/plants/details?plantid=1487",
  },

  "aesculus hippocastanum": source("Aesculus hippocastanum", {
    ...green, kind: "horsechestnut", label: "Feuille de marronnier", description: "Feuille composée palmée à sept folioles dentées.",
  }),
  "taxus baccata": source("Taxus baccata", {
    ...green, kind: "yew", fill: "#345c3f", label: "Rameau d’if", description: "Aiguilles plates, vert sombre, à extrémité pointue.",
  }),
  "abies nordmanniana": source("Abies nordmanniana", {
    ...green, kind: "fir", fill: "#365e45", label: "Rameau de sapin de Nordmann", description: "Aiguilles dirigées vers l’avant, à bout arrondi et échancré.",
  }),
  "ilex aquifolium": source("Ilex aquifolium", {
    ...green, fill: "#345e43", label: "Feuille de houx", description: "Feuille coriace à bord ondulé et épineux ; les feuilles adultes peuvent être moins épineuses.",
    outline: "M60 105Q49 93 36 100Q41 82 23 84Q35 66 20 60Q37 52 27 36Q45 40 43 23Q56 27 60 10Q66 28 78 22Q75 40 95 36Q85 51 101 59Q87 67 98 82Q80 81 86 100Q70 94 60 105Z",
    veins: "M60 118V19M60 92 38 91M60 76 31 77M60 59 30 58M60 42 38 38M60 92 82 92M60 76 91 76M60 59 92 58M60 42 84 38",
  }),
  "magnolia grandiflora": source("Magnolia grandiflora", {
    ...green, fill: "#3e6445", label: "Feuille de magnolia à grandes fleurs", description: "Feuille persistante, elliptique, épaisse, à bord entier ; face supérieure verte.",
    outline: "M60 106C36 94 27 68 34 45Q42 25 63 11Q84 27 89 48C96 74 80 98 60 106Z",
    veins: "M59 118Q63 69 63 17M61 93 39 77M62 79 35 58M63 62 40 41M63 44 49 28M61 93 83 78M62 79 89 59M63 62 84 42M63 44 76 28",
  }),
  "magnolia x soulangeana": source("Magnolia x soulangeana", {
    ...green, fill: "#64884a", label: "Feuille de magnolia de Soulange", description: "Feuille caduque, obovale, à bord entier et pointe courte.",
    outline: "M60 106C39 91 23 62 28 42Q33 20 53 22L61 12 69 22Q93 21 95 45C98 70 78 99 60 106Z",
    veins: "M60 118V23M60 93 36 73M60 77 30 54M60 59 34 35M60 42 48 26M60 93 85 73M60 77 93 54M60 59 87 35M60 42 73 26",
  }, "magnolia-soulangiana"),
  "quercus rubra": source("Quercus rubra", {
    ...green, label: "Feuille de chêne rouge", description: "Feuille verte en été, à lobes pointus et sinus modérément profonds.",
    outline: "M60 105 40 95 27 82 41 83 37 71 17 66 22 54 12 44 36 49 39 40 26 26 43 29 47 19 54 24 60 9 68 24 75 18 78 30 97 24 84 42 87 50 108 43 99 57 106 68 83 73 80 84 95 82 80 98Z",
    veins: "M60 119V19M60 94 33 85M60 77 24 61M60 59 32 32M60 94 89 86M60 77 100 61M60 59 92 31",
  }),
  "tilia x euchlora": source("Tilia x euchlora", { ...linden, fill: "#3e683c", label: "Feuille de tilleul de Crimée" }, "tilia-euchlora"),
  "trachycarpus fortunei": {
    ...green, kind: "palm", label: "Palme de palmier de Chine", description: "Feuille en éventail, divisée en segments étroits et plissés.",
    sourceTaxon: "Trachycarpus fortunei", sourceUrl: "https://plants.ces.ncsu.edu/plants/trachycarpus-fortunei/",
  },
  "celtis australis": {
    ...green, label: "Feuille de micocoulier de Provence", description: "Feuille dentée, à pointe allongée et base dissymétrique.",
    outline: serrated([[57,103],[39,100],[27,85],[26,65],[35,45],[47,30],[63,9],[68,31],[83,46],[91,64],[87,82],[77,96],[64,98]], 1.3),
    veins: "M55 118Q61 72 63 17M58 98Q35 81 35 52M58 98Q81 83 83 53M60 81 29 69M61 64 38 45M62 47 49 30M60 81 88 68M61 64 81 45M62 47 70 33",
    sourceTaxon: "Celtis australis", sourceUrl: "https://www.rhs.org.uk/plants/28947/celtis-australis/details",
  },

  "tilia platyphyllos": { ...linden, label: "Feuille de tilleul à grandes feuilles", sourceTaxon: "Tilia platyphyllos", sourceUrl: "https://plants.ces.ncsu.edu/plants/tilia-platyphyllos/" },
  "tilia tomentosa": source("Tilia tomentosa", { ...linden, fill: "#456d45", label: "Feuille de tilleul argenté", description: "Face supérieure verte ; revers argenté." }),
  "carpinus betulus": source("Carpinus betulus", {
    ...green, label: "Feuille de charme", description: "Feuille ovale à double denture et nervures latérales parallèles.",
    outline: serrated([[60,104],[44,99],[32,86],[27,70],[29,52],[36,38],[46,27],[60,11],[71,26],[81,40],[87,56],[90,71],[85,87],[74,100]], 1.4),
    veins: "M60 117V17" + Array.from({ length: 11 }, (_, i) => {
      const y = 31 + i * 6;
      const width = 28 * Math.sqrt(Math.max(0, 1 - ((y - 67) / 43) ** 2));
      return `M60 ${y + 10} ${60 - width} ${y}M60 ${y + 10} ${60 + width} ${y}`;
    }).join(""),
  }),
  "platanus x hispanica": source("Platanus acerifolia", {
    ...green, fill: "#6c8749", label: "Feuille de platane", description: "Feuille large à trois à cinq lobes triangulaires.",
    outline: "M60 99Q44 105 30 94L14 98 21 82 6 66 28 67 15 32 43 47 47 31 61 9 74 35 74 48 105 30 94 65 113 66 97 84 104 99 86 95Q71 106 60 99Z",
    veins: "M60 119V94L61 17M60 94 20 37M60 94 100 36M60 94 15 71M60 94 106 71M60 68 48 39M61 64 72 39",
  }),
  "acer japonicum": source("Acer japonicum", { ...maple, ...palmate(9, 31), label: "Feuille d’érable du Japon" }),
  "acer palmatum": source("Acer palmatum", japaneseMaple),
  "acer palmatum polymorphum": source("Acer palmatum", japaneseMaple),
  "acer palmatum atropurpurea": {
    ...japaneseMaple, label: "Feuille d’érable japonais pourpre", fill: "#803c4b", stroke: "#532b39", veinStroke: "#b97d83",
    sourceTaxon: "Acer palmatum 'Atropurpureum'", sourceUrl: "https://plants.ces.ncsu.edu/plants/acer-palmatum-atropurpureum/",
  },
  "acer monspessulanum": source("Acer monspessulanum", {
    ...maple, fill: "#4d733b", label: "Feuille d’érable de Montpellier",
    outline: "M60 98Q42 108 27 93Q14 77 11 54Q29 50 42 63Q40 43 60 18Q80 42 78 63Q91 49 109 54Q105 79 93 93Q77 108 60 98Z",
    veins: "M60 120V96L60 25M60 96 18 58M60 96 102 58",
  }),
  "acer ginnala": source("Acer ginnala", {
    ...maple, label: "Feuille d’érable du fleuve d’Amour",
    outline: serrated([[60,101],[35,93],[20,75],[12,55],[37,66],[40,39],[60,8],[80,39],[83,66],[109,55],[99,76],[83,95]], 1.2),
    veins: "M60 119V15M60 99 18 60M60 99 103 60M60 77 41 47M60 77 79 47",
  }, "acer-tataricum-subsp-ginnala"),
  "acer pensylvanicum": source("Acer pensylvanicum", {
    ...maple, fill: "#739747", label: "Feuille d’érable de Pennsylvanie",
    outline: serrated([[60,95],[43,105],[24,96],[14,76],[12,57],[27,28],[43,46],[60,13],[78,46],[96,29],[108,60],[105,80],[92,98],[76,105]], 0.9),
    veins: "M60 118V95L60 20M60 95 29 34M60 95 95 35M60 95 18 69M60 95 102 71",
  }),
  "acer platanoides": source("Acer platanoides", {
    ...maple, label: "Feuille d’érable plane",
    outline: "M60 98 39 104 31 92 13 97 20 79 6 63 29 65 17 35 32 40 29 22 47 41 51 25 60 8 69 25 74 41 93 22 89 40 105 35 92 65 114 63 100 79 108 97 90 92 81 104Z",
    veins: "M60 119V95L60 16M60 95 33 29M60 95 89 29M60 95 14 68M60 95 106 68",
  }),
  "acer pseudoplatanus": source("Acer pseudoplatanus", {
    ...maple, fill: "#4c733d", label: "Feuille d’érable sycomore",
    outline: serrated([[60,98],[40,105],[28,94],[15,92],[20,77],[8,59],[33,65],[22,32],[43,47],[45,27],[60,12],[74,29],[77,48],[101,33],[88,65],[112,59],[101,78],[105,93],[87,95],[80,105]], 1.2),
    veins: "M60 119V95L60 18M60 95 26 37M60 95 96 38M60 95 14 64M60 95 105 64",
  }),
  "acer rubrum": source("Acer rubrum", {
    ...maple, label: "Feuille d’érable rouge",
    outline: serrated([[60,98],[39,101],[25,89],[15,73],[10,47],[36,57],[40,33],[60,10],[79,32],[83,57],[109,47],[103,76],[87,93],[75,102]], 1.5),
    veins: "M60 120V96L60 17M60 96 16 53M60 96 103 53M60 74 43 36M60 74 78 37",
  }),
  "acer negundo flamingo": source("Acer negundo 'Flamingo'", {
    ...green, kind: "compound", fill: "#88a968", label: "Feuille d’érable Flamingo", description: "Feuille composée panachée de crème et de rose ; cultivar mâle sans fruits.",
  }, "acer-negundo-flamingo"),
};
