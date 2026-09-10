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
