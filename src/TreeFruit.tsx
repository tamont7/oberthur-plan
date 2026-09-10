type FruitKind = "beech" | "acorn" | "cedar" | "redwood" | "cypress" | "ginkgo" | "maple" | "linden" | "plane" | "hornbeam";
type Fruit = { kind: FruitKind; label: string; taxon: string };

// Called only after the scientific name has matched the curated foliage catalogue.
export function fruitForTaxon(scientificName: string): Fruit | null {
  if (scientificName === "Acer negundo 'Flamingo'") return null;
  const taxon = scientificName.split(" ").slice(0, 2).join(" ");
  if (["Acer ginnala", "Acer japonicum", "Acer monspessulanum", "Acer palmatum", "Acer pensylvanicum", "Acer platanoides", "Acer pseudoplatanus", "Acer rubrum"].includes(taxon)) return { kind: "maple", label: "Samares d’érable", taxon };
  if (taxon === "Tilia platyphyllos" || taxon === "Tilia tomentosa") return { kind: "linden", label: "Fruits de tilleul et bractée", taxon };
  if (taxon === "Platanus acerifolia") return { kind: "plane", label: "Boules de fruits du platane", taxon };
  if (taxon === "Carpinus betulus") return { kind: "hornbeam", label: "Fruit du charme et bractée", taxon };
  if (taxon === "Fagus sylvatica") return { kind: "beech", label: "Faînes et cupule ouverte", taxon };
  if (["Quercus robur", "Quercus cerris", "Quercus palustris", "Quercus ilex", "Quercus suber"].includes(taxon)) return { kind: "acorn", label: "Gland et cupule", taxon };
  if (taxon === "Cedrus libani" || taxon === "Cedrus atlantica") return { kind: "cedar", label: "Cône dressé de cèdre", taxon };
  if (taxon === "Sequoia sempervirens" || taxon === "Sequoiadendron giganteum") return { kind: "redwood", label: "Cône de séquoia", taxon };
  if (taxon === "Taxodium distichum") return { kind: "cypress", label: "Cône globuleux de cyprès chauve", taxon };
  if (taxon === "Ginkgo biloba") return { kind: "ginkgo", label: "Graine de ginkgo à enveloppe charnue (arbre femelle)", taxon };
  return null;
}

function FruitDrawing({ fruit }: { fruit: Fruit }) {
  if (fruit.kind === "maple") {
    const angle = fruit.taxon === "Acer monspessulanum" || fruit.taxon === "Acer ginnala" ? 8
      : fruit.taxon === "Acer pseudoplatanus" || fruit.taxon === "Acer rubrum" ? 30
      : fruit.taxon === "Acer platanoides" ? 80 : 65;
    const red = fruit.taxon === "Acer rubrum";
    return <g stroke={red ? "#8b4c42" : "#827142"}>
      <path d="M60 12V36" fill="none" strokeWidth="2" />
      {[-1, 1].map((side) => <g key={side} transform={`translate(${60 + side * 5} 42) rotate(${-side * angle})`}>
        <path d="M-4 -4Q-15 12 -13 39Q-11 70 2 66Q10 56 7 39L5 2Z" fill={red ? "#b77964" : "#b8a472"} />
        <path d="M0 8Q-7 37-2 58M4 12Q0 36 1 49" fill="none" strokeWidth=".7" />
        <ellipse cx="0" cy="0" rx="6" ry="9" fill={red ? "#975946" : "#938054"} />
      </g>)}
    </g>;
  }
  if (fruit.kind === "linden") {
    const nuts = fruit.taxon === "Tilia platyphyllos" ? [[38,94],[63,108],[84,90]] : [[31,86],[44,108],[58,91],[76,106],[91,86]];
    return <g stroke="#817b50">
      <path d="M52 77Q26 49 36 14Q48 1 61 20Q73 47 52 77Z" fill="#bdb67a" />
      <path d="M45 13Q50 43 54 64L60 80" fill="none" />
      {nuts.map(([x,y]) => <g key={x}>
        <path d={`M60 80 ${x} ${y-5}`} fill="none" />
        <ellipse cx={x} cy={y} rx="6" ry="7" fill="#a8a08b" />
        <path d={`M${x} ${y-6}q-3 6 0 12m2-11q3 5 0 10`} fill="none" strokeWidth={fruit.taxon === "Tilia platyphyllos" ? 1 : .5} />
      </g>)}
    </g>;
  }
  if (fruit.kind === "hornbeam") return <g stroke="#867740">
    <path d="M60 12V37" fill="none" strokeWidth="2" />
    <path d="M59 34Q40 35 25 57L20 72Q38 77 47 63Q41 89 57 115Q76 89 70 63Q82 78 101 68L90 53Q72 35 59 34Z" fill="#bcad70" />
    <path d="M60 41 58 105M60 43 28 66M60 43 94 65" fill="none" />
    <ellipse cx="60" cy="40" rx="8" ry="10" fill="#99834e" />
    <path d="M58 31Q54 40 58 49M62 31Q65 40 62 49" fill="none" />
  </g>;
  if (fruit.kind === "plane") return <g stroke="#826545">
    <path d="M56 8Q35 25 43 48Q48 68 73 78" fill="none" strokeWidth="2" />
    {[{x:43,y:47},{x:75,y:88}].map(({x,y}) => <g key={x}>
      <circle cx={x} cy={y} r="20" fill="#a38a60" />
      {Array.from({length:22},(_,i)=> {
        const a=i*Math.PI/11;
        return <path key={i} d={`M${x+18*Math.cos(a)} ${y+18*Math.sin(a)}l${5*Math.cos(a)} ${5*Math.sin(a)}`} strokeWidth="1" />;
      })}
      {Array.from({length:19},(_,i)=> {
        const a=i*2.4, r=3+Math.sqrt(i)*3;
        return <circle key={i} cx={x+r*Math.cos(a)} cy={y+r*Math.sin(a)} r="1.2" fill="#705b3e" stroke="none" />;
      })}
    </g>)}
  </g>;
  if (fruit.kind === "ginkgo") return <g stroke="#8b6a24">
    <path d="M53 14Q70 33 61 51" fill="none" strokeWidth="3" />
    <path d="M61 48C29 41 20 67 30 91C38 114 77 118 91 92C106 65 85 43 61 48Z" fill="#d9ad46" />
    <path d="M43 59Q32 68 37 82" stroke="#edce7a" strokeWidth="4" fill="none" />
  </g>;
  if (fruit.kind === "beech") return <g stroke="#75503a">
    <path d="M60 112V91" strokeWidth="3" />
    <path d="M60 94Q21 84 19 48Q48 46 60 73Q71 44 101 48Q97 86 60 94Z" fill="#a78150" />
    <path d="M60 92Q29 73 38 34Q55 37 60 68Q63 39 81 32Q92 68 60 92Z" fill="#bd9b68" />
    <path d="m19 53-7-5m11 15-8 1m13 10-7 4m17 7-3 7m60-31 9-3m-12 15 8 3m-16 9 5 6M39 39l-4-7m43 5 5-10" fill="none" />
    <path d="M48 44 39 80 59 89 61 76Z" fill="#865335" />
    <path d="M73 43 60 76 63 91 83 79Z" fill="#a06b3f" />
    <path d="M48 44 50 82 59 89M73 43 72 83 63 91" fill="none" />
  </g>;
  if (fruit.kind === "acorn") {
    const small = fruit.taxon === "Quercus palustris";
    const hairy = fruit.taxon === "Quercus cerris";
    const longStalk = fruit.taxon === "Quercus robur";
    const capBottom = small ? 56 : hairy || fruit.taxon === "Quercus ilex" ? 72 : 64;
    return <g stroke="#705437">
      <path d={longStalk ? "M60 44Q74 22 95 13" : "M60 44 65 29"} fill="none" strokeWidth="3" />
      <path d={small ? "M32 52Q26 94 60 99Q94 94 88 52Z" : "M35 52Q29 98 60 112Q90 99 85 52Z"} fill="#a78045" />
      <path d={`M31 53Q35 36 60 40Q85 36 89 53Q88 ${capBottom} 60 ${capBottom}Q32 ${capBottom} 31 53Z`} fill="#928467" />
      <path d="m39 49 7 6 7-6 7 6 7-6 7 6 7-6M47 43l6 6 7-6 7 6 7-6" fill="none" />
      {hairy && <path d="m32 50-9-8m10 17-12-1m15 8-11 7m18-6-5 12m15-10-1 11m10-11 3 12m7-14 6 10m3-15 11 6m-4-17 12-2m-16-6 8-10" fill="none" />}
      <path d={small ? "M43 64Q39 81 52 90" : "M45 76Q44 96 56 103"} fill="none" stroke="#c8a467" strokeWidth="3" />
    </g>;
  }
  if (fruit.kind === "cypress") return <g stroke="#6c543c">
    <path d="M60 14V33" strokeWidth="3" />
    <circle cx="60" cy="69" r="38" fill="#a58a59" />
    <path d="m60 31 8 16 21 6 8 21M68 47 49 60 27 51M49 60l5 24-19 12M54 84l25-2 9-29M79 82l-2 21" fill="none" />
    <path d="m37 67 5 3m20-6 6 3m14-4 5 2m-26 29 5 2" fill="none" strokeWidth="3" />
  </g>;
  const cedar = fruit.kind === "cedar";
  const giant = fruit.taxon === "Sequoiadendron giganteum";
  return <g stroke="#705139">
    <path d={cedar ? "M22 111H100M60 111V100" : "M60 13V30"} strokeWidth="3" fill="none" />
    <path d={cedar ? "M32 94Q23 65 35 29Q59 12 85 29Q97 64 88 94Q62 111 32 94Z" : giant ? "M60 27C96 26 103 67 86 96Q61 121 35 96C16 66 25 28 60 27Z" : "M60 28C91 28 100 61 86 88Q60 109 35 88C20 61 29 29 60 28Z"} fill={cedar ? "#a38962" : "#986d44"} />
    {cedar ? <path d="M33 37Q60 47 88 37M30 49Q60 60 91 49M29 63Q60 74 92 63M30 77Q60 88 91 77M32 90Q60 100 88 90" fill="none" /> : <path d="m39 38 11 10 12-9 14 9 8-7M50 48l-4 17-17-7m17 7 17 7 16-8-3-16M63 72l-2-33M79 64l14-6M46 65 40 86 58 94 78 86 79 64M58 94l5-22" fill="none" />}
  </g>;
}

export function TreeFruit({ scientificName }: { scientificName: string }) {
  const fruit = fruitForTaxon(scientificName);
  if (!fruit) return null;
  return <svg viewBox="0 0 120 125" aria-hidden="true" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><FruitDrawing fruit={fruit} /></svg>;
}
