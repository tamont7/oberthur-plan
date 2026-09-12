type FruitKind = "beech" | "acorn" | "cedar" | "redwood" | "cypress" | "ginkgo" | "maple" | "linden" | "plane" | "hornbeam" | "horsechestnut" | "yew" | "holly" | "magnolia" | "palm" | "hackberry" | "fir" | "sassafras" | "bay" | "plum" | "pod" | "ash" | "scaleCone" | "hovenia" | "thuja" | "sweetgum" | "willow" | "cherryLaurel" | "catalpa";
type Fruit = { kind: FruitKind; label: string; taxon: string };

// Called only after the scientific name has matched the curated foliage catalogue.
export function fruitForTaxon(scientificName: string): Fruit | null {
  if (scientificName === "Acer negundo 'Flamingo'") return null;
  // Preserve the epithet after an explicit hybrid marker.
  const parts = scientificName.replace(/×/g, "x").split(" ");
  const taxon = parts.slice(0, parts[1] === "x" ? 3 : 2).join(" ");
  if (taxon === "Hovenia dulcis") return { kind: "hovenia", label: "Fruits du raisinier et pédoncules charnus", taxon };
  if (taxon === "Thuja plicata") return { kind: "thuja", label: "Cônes du thuya", taxon };
  if (taxon === "Abies pinsapo") return { kind: "fir", label: "Cône dressé du sapin d’Espagne", taxon };
  if (taxon === "Albizia julibrissin") return { kind: "pod", label: "Gousses de l’arbre à soie", taxon };
  if (taxon === "Liquidambar styraciflua") return { kind: "sweetgum", label: "Boule de capsules du copalme", taxon };
  if (taxon === "Aesculus sylvatica") return { kind: "horsechestnut", label: "Capsule lisse et graine du marronnier des bois", taxon };
  if (taxon === "Salix caprea") return { kind: "willow", label: "Capsules et graines cotonneuses du saule marsault (pied femelle)", taxon };
  if (taxon === "Prunus laurocerasus") return { kind: "cherryLaurel", label: "Drupes du laurier-palme", taxon };
  if (taxon === "Catalpa bignonioides") return { kind: "catalpa", label: "Longues capsules du catalpa", taxon };
  if (taxon === "Sassafras albidum") return { kind: "sassafras", label: "Drupe de sassafras sur son réceptacle rouge (arbre femelle)", taxon };
  if (taxon === "Laurus nobilis") return { kind: "bay", label: "Drupes du laurier-sauce (arbre femelle)", taxon };
  if (taxon === "Prunus cerasifera") return { kind: "plum", label: "Prune du prunus pourpre", taxon };
  if (taxon === "Cercis siliquastrum") return { kind: "pod", label: "Gousses de l’arbre de Judée", taxon };
  if (taxon === "Fraxinus ornus") return { kind: "ash", label: "Samares du frêne à fleurs", taxon };
  if (taxon === "Cupressus sempervirens" || taxon === "Chamaecyparis lawsoniana") return { kind: "scaleCone", label: taxon === "Cupressus sempervirens" ? "Cône du cyprès d’Italie" : "Cônes du cyprès de Lawson", taxon };
  if (taxon === "Aesculus hippocastanum") return { kind: "horsechestnut", label: "Capsule épineuse et marron", taxon };
  if (taxon === "Taxus baccata") return { kind: "yew", label: "Graine d’if dans son arille rouge (arbre femelle)", taxon };
  if (taxon === "Ilex aquifolium") return { kind: "holly", label: "Fruits rouges du houx (arbre femelle)", taxon };
  if (taxon === "Magnolia grandiflora" || taxon === "Magnolia x soulangeana") return { kind: "magnolia", label: "Fruit composé du magnolia et graines rouges", taxon };
  if (taxon === "Trachycarpus fortunei") return { kind: "palm", label: "Drupes du palmier de Chine (pied femelle)", taxon };
  if (taxon === "Celtis australis") return { kind: "hackberry", label: "Drupes du micocoulier", taxon };
  if (taxon === "Abies nordmanniana") return { kind: "fir", label: "Cône dressé du sapin de Nordmann", taxon };
  if (["Acer ginnala", "Acer japonicum", "Acer monspessulanum", "Acer palmatum", "Acer pensylvanicum", "Acer platanoides", "Acer pseudoplatanus", "Acer rubrum"].includes(taxon)) return { kind: "maple", label: "Samares d’érable", taxon };
  if (taxon === "Tilia platyphyllos" || taxon === "Tilia tomentosa" || taxon === "Tilia x euchlora") return { kind: "linden", label: "Fruits de tilleul et bractée", taxon };
  if (taxon === "Platanus acerifolia" || taxon === "Platanus orientalis") return { kind: "plane", label: "Boules de fruits du platane", taxon };
  if (taxon === "Carpinus betulus") return { kind: "hornbeam", label: "Fruit du charme et bractée", taxon };
  if (taxon === "Fagus sylvatica") return { kind: "beech", label: "Faînes et cupule ouverte", taxon };
  if (["Quercus rubra", "Quercus robur", "Quercus cerris", "Quercus palustris", "Quercus ilex", "Quercus suber"].includes(taxon)) return { kind: "acorn", label: "Gland et cupule", taxon };
  if (taxon === "Cedrus libani" || taxon === "Cedrus atlantica") return { kind: "cedar", label: "Cône dressé de cèdre", taxon };
  if (taxon === "Sequoia sempervirens" || taxon === "Sequoiadendron giganteum") return { kind: "redwood", label: "Cône de séquoia", taxon };
  if (taxon === "Taxodium distichum") return { kind: "cypress", label: "Cône globuleux de cyprès chauve", taxon };
  if (taxon === "Ginkgo biloba") return { kind: "ginkgo", label: "Graine de ginkgo à enveloppe charnue (arbre femelle)", taxon };
  return null;
}

function FruitDrawing({ fruit }: { fruit: Fruit }) {
  if (fruit.kind === "hovenia") return <g stroke="#8b5d47">
    <path d="M58 15 58 40" fill="none" strokeWidth="3" />
    <path d="M58 40Q36 43 39 62Q17 69 30 88M58 40Q79 41 77 62Q96 69 87 91M39 62Q58 65 55 90M77 62Q66 78 72 103" fill="none" stroke="#a87b59" strokeWidth="9" />
    {[[30,96],[55,99],[88,99],[72,112]].map(([x,y]) => <g key={x}>
      <path d={`M${x} ${y-12}v7`} fill="none" />
      <circle cx={x} cy={y} r="6" fill="#a89a80" /><path d={`M${x} ${y-5}q-3 5 0 10`} fill="none" strokeWidth=".7" />
    </g>)}
  </g>;
  if (fruit.kind === "thuja") return <g stroke="#7c5b3e">
    <path d="M22 111Q59 99 98 110M40 106 38 90M78 105 81 81" fill="none" strokeWidth="2" />
    {[{x:38,y:66,a:-12},{x:82,y:55,a:13}].map(({x,y,a}) => <g key={x} transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d="M0 29Q-19 18-16-9L-11-25-4-15 0-32 5-15 12-24 17-8Q19 19 0 29Z" fill="#b2956c" />
      <path d="M0 29Q-13 9-11-20M0 29Q12 8 12-19M0 26V-26M-14 2-5 10M15 0 5 9" fill="none" />
    </g>)}
  </g>;
  if (fruit.kind === "sweetgum") return <g stroke="#785a3e">
    <path d="M60 12Q72 30 61 40" fill="none" strokeWidth="2" />
    <circle cx="60" cy="77" r="31" fill="#aa8658" />
    {Array.from({length:18},(_,i) => {const a=i*Math.PI/9;return <path key={i} d={`M${60+28*Math.cos(a)} ${77+28*Math.sin(a)}l${12*Math.cos(a-.09)} ${12*Math.sin(a-.09)}l${-5*Math.cos(a+.15)} ${-5*Math.sin(a+.15)}`} fill="none" />;})}
    {Array.from({length:16},(_,i) => {const a=i*2.4,r=5+Math.sqrt(i)*5;const x=60+r*Math.cos(a),y=77+r*Math.sin(a);return <g key={i}><ellipse cx={x} cy={y} rx="3" ry="4" fill="#594735" /><path d={`M${x-3} ${y-3}l-3-6m9 6 3-6`} fill="none" strokeWidth="1" /></g>;})}
  </g>;
  if (fruit.kind === "cherryLaurel") return <g stroke="#5f6144">
    <path d="M60 12V109" fill="none" strokeWidth="2" />
    {[[44,32],[77,43],[37,57],[83,70],[44,86],[71,100]].map(([x,y]) => <g key={y}>
      <path d={`M60 ${y-11} ${x} ${y-6}`} fill="none" />
      <ellipse cx={x} cy={y} rx="9" ry="11" fill="#363442" stroke="#292733" /><path d={`M${x-4} ${y-4}l2-3`} stroke="#87808e" strokeWidth="2" />
    </g>)}
  </g>;
  if (fruit.kind === "catalpa") return <g stroke="#76553a">
    <path d="M60 10 38 25M60 10 78 26" fill="none" strokeWidth="2" />
    <path d="M37 23Q29 65 41 118Q43 89 42 64Q39 42 42 25ZM77 24Q89 72 75 119Q80 82  70 49L72 26Z" fill="#aa8758" />
    <path d="M39 29Q35 66 41 108M75 30Q84  70 76 110" fill="none" strokeWidth=".8" />
  </g>;
  if (fruit.kind === "willow") return <g stroke="#7d8056">
    <path d="M60 118V19" fill="none" strokeWidth="2" />
    {Array.from({length:7},(_,i) => [-1,1].map(side => <g key={`${i}-${side}`} transform={`translate(60 ${33+i*10}) rotate(${side*48})`}>
      <path d="M0 0Q-9-9 0-24Q9-9 0 0Z" fill="#a8a97a" strokeWidth="1" />
      <path d="M0-2V-20" fill="none" stroke="#665f3e" />
      {i>3 && <path d="M0-18Q-12-38-18-27M0-18Q-5-43 1-39M0-18Q11-40 16-29M0-18Q19-30 21-19" fill="none" stroke="#c8c6b8" strokeWidth="1.2" />}
    </g>))}
  </g>;

  if (fruit.kind === "sassafras") return <g stroke="#873e3a">
    <path d="M60 115Q56 86 64 73" fill="none" stroke="#b44c42" strokeWidth="5" />
    <ellipse cx="63" cy="51" rx="22" ry="29" fill="#354251" stroke="#26303d" />
    <path d="M38 66Q63 79 88 65Q82 86 63 85Q45 85 38 66Z" fill="#c95748" />
    <path d="M49 37Q44 45 47 53" fill="none" stroke="#7d8fa0" strokeWidth="3" />
  </g>;
  if (fruit.kind === "bay" || fruit.kind === "plum") {
    const plum = fruit.kind === "plum";
    return <g stroke={plum ? "#663c48" : "#30383a"}>
      <path d="M61 13Q73 27 60 44" fill="none" stroke="#7e7252" strokeWidth="2" />
      <path d={plum ? "M60 43C23 29 16 73 31 95Q59 119 87 95C105 73 98 31 60 43Z" : "M60 42C33 39 26 67 34 89Q43 112 65 108C91 106 95 70 84 53Z"} fill={plum ? "#9a5260" : "#354049"} />
      {plum && <path d="M60 44Q45 69 59 105" fill="none" />}
      <path d="M42 57Q34 70 39 80" fill="none" stroke={plum ? "#c88b92" : "#74838a"} strokeWidth="3" />
    </g>;
  }
  if (fruit.kind === "pod") return <g stroke="#76513d">
    <path d="M64 11 58 29M64 11 82 35" fill="none" strokeWidth="2" />
    {[{x:57,y:27,a:18},{x:82,y:34,a:-5}].map(({x,y,a}) => <g key={x} transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d={fruit.taxon === "Albizia julibrissin" ? "M0 0Q-9 16-6 39Q-2  60-9 83L4 83Q13  60 7 38Q4 16 7 2Z" : "M0 0Q-13 15-11 43Q-9 73 2 84Q13 63 12 37Q13 12 0 0Z"} fill="#aa7954" />
      <path d="M0 5Q9 44 2 79" fill="none" />
      {[17,30,43,56,68].map(y => <ellipse key={y} cx="-1" cy={y} rx="4" ry="5" fill="#b78b65" strokeWidth=".7" />)}
    </g>)}
  </g>;
  if (fruit.kind === "ash") return <g stroke="#877247">
    <path d="M60 10V40" fill="none" strokeWidth="2" />
    {[-34,-12,13,36].map((angle,i) => <g key={angle} transform={`translate(60 ${29+i*5}) rotate(${angle})`}>
      <path d="M0 0V12" fill="none" />
      <path d="M0 12Q-7 22-6 48Q-9 67 0 77Q10 69 7 49Q7 25 0 12Z" fill="#bfad7c" />
      <path d="M0 18V70" strokeWidth=".7" />
      <path d="M0 15Q-4 29 0 40Q4 28 0 15Z" fill="#94804e" />
    </g>)}
  </g>;
  if (fruit.kind === "scaleCone") {
    const lawson = fruit.taxon === "Chamaecyparis lawsoniana";
    return <g stroke="#72583e">
      <path d={lawson ? "M60 12 40 50M60 12 80 79" : "M60 12V32"} fill="none" strokeWidth="2" />
      {(lawson ? [{x:39,y:52,s:.6},{x:81,y:88,s:.55}] : [{x:60,y:69,s:1}]).map(({x,y,s}) => <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse rx="33" ry={lawson ? 33 : 39} fill="#a38b65" />
        <path d="M0-37-10-20-29-17M-10-20 13-19 30-13M-10-20-16 4-31 12M13-19 21 5 32 10M-16 4 0 18 21 5M0 18-4 37M-16 4-32-1M21 5 27 24" fill="none" />
        <path d="m-4-7 5 2m-21-4 4 1m33-3 4 1m-13 33 4 1m-24-2 4 1" strokeWidth="3" />
      </g>)}
    </g>;
  }

  if (fruit.kind === "horsechestnut") return <g stroke="#6f6238">
    <path d="M47 18 49 29" strokeWidth="3" />
    <path d="M49 29C16 25 8 55 18 77Q29 100 54 90L72 65 70 40Z" fill="#8c9851" />
    <path d="M51 33Q70 55 54 90Q82 91 90 65Q93 38 70 31Z" fill="#c2b785" />
    {fruit.taxon !== "Aesculus sylvatica" && <path d="m22 42-7-6m3 24-8 1m15 18-6 6m15-53-2-7m8 19-4-5m-8 17-6-1m14 17-5 3m18 10-1 7" />}
    <path d="M73 64C47 64 40 92 52 105Q68 119 91 107C111 93 99 64 73 64Z" fill="#8d4929" stroke="#643a24" />
    <ellipse cx="72" cy="76" rx="15" ry="9" fill="#d7bc89" />
    <path d="M56 89Q52 96 60 101" fill="none" stroke="#c68d59" strokeWidth="3" />
  </g>;
  if (fruit.kind === "yew") return <g stroke="#874237">
    <path d="M60 113V94" stroke="#796342" strokeWidth="3" />
    <path d="M31 51C20 77 30 103 60 104C89 104 99 78 88 51Z" fill="#c54438" />
    <ellipse cx="60" cy="51" rx="29" ry="18" fill="#e2664d" />
    <ellipse cx="60" cy="51" rx="17" ry="11" fill="#632f26" />
    <path d="M48 53Q44 34 60 29Q76 35 72 53Q60 62 48 53Z" fill="#665b35" stroke="#4c482d" />
    <path d="M37 68Q32 83 43 91" fill="none" stroke="#ec8265" strokeWidth="3" />
  </g>;
  if (fruit.kind === "holly" || fruit.kind === "hackberry" || fruit.kind === "palm") {
    const holly = fruit.kind === "holly", palm = fruit.kind === "palm";
    const points = palm ? [[31,54],[51,65],[81,47],[91,76],[68,89],[40,100],[84,108]] : holly ? [[34,66],[61,83],[85,58],[84,96]] : [[34,91],[84,79]];
    return <g stroke="#796447">
      <path d="M58 14Q66 40 59 56" fill="none" strokeWidth="2" />
      {points.map(([x,y]) => <g key={`${x}-${y}`}>
        <path d={`M60 ${palm ? y - 25 : 37}Q${x} ${y-30} ${x} ${y-8}`} fill="none" />
        {palm ? <path d={`M${x-8} ${y-4}c-3-9 9-12 14-4s-1 18-9 15c-6-2-2-7-5-11Z`} fill="#43465a" stroke="#313443" /> : <circle cx={x} cy={y} r={holly ? 12 : 11} fill={holly ? "#c44032" : "#42384b"} stroke={holly ? "#8d352b" : "#302d3a"} />}
        <path d={`M${x-5} ${y-5}l2-2`} stroke={holly ? "#ec8a68" : "#888091"} strokeWidth="2" />
        {holly && <path d={`m${x+3} ${y+6} 3 2m-3 0 3-2`} stroke="#64372c" />}
      </g>)}
    </g>;
  }
  if (fruit.kind === "magnolia") {
    const hybrid = fruit.taxon === "Magnolia x soulangeana";
    return <g stroke="#85574c">
      <path d="M60 118V101" stroke="#7f6847" strokeWidth="3" />
      <path d={hybrid ? "M53 104Q33 85 42 68Q29 49 48 34Q43 15 63 14Q87 18 79 41Q97 60 82 78Q86 99 53 104Z" : "M60 12C85 14 98 55 89 82Q79 108 59 106Q33 103 29 79C22 52 37 16 60 12Z"} fill="#b07c70" />
      {[29,46,63,80,95].map((y,i) => <g key={y}>
        <path d={`M${i === 0 ? 48 : 38} ${y}q10 13 22 0q12 13 23 0m-24 0 2-9`} fill="none" />
        {i % 2 === 0 && <><path d={`M73 ${y+4}q12 6 13 17`} stroke="#c9aa8b" fill="none" /><ellipse cx="87" cy={y+19} rx="5" ry="8" fill="#c44730" stroke="#8d382c" /></>}
      </g>)}
    </g>;
  }
  if (fruit.kind === "fir") return <g stroke="#6c523e">
    <path d="M24 115H97M60 115V104" fill="none" strokeWidth="3" />
    <path d="M43 103Q37 77 41 34Q43 12 60 10Q77 12 79 34Q83 77 77 103Q60 112 43 103Z" fill="#947754" />
    {Array.from({length: 9}, (_, i) => <path key={i} d={`M42 ${25+i*9}q9 8 18 0q9 8 18 0m-18 0 4 7-5-2`} fill="none" />)}
  </g>;

  if (fruit.kind === "maple") {
    const angle = fruit.taxon === "Acer monspessulanum" || fruit.taxon === "Acer ginnala" ? 8
      : fruit.taxon === "Acer pseudoplatanus" || fruit.taxon === "Acer rubrum" ? 30
      : fruit.taxon === "Acer platanoides" ? 80 : 65;
    const red = fruit.taxon === "Acer rubrum";
    return <g stroke={red ? "#8b4c42" : "#827142"} transform={angle >= 65 ? "translate(60 62) scale(.72) translate(-60 -62)" : undefined}>
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
  if (fruit.kind === "plane") return <g stroke="#826545" transform={fruit.taxon === "Platanus orientalis" ? "translate(17 3) scale(.75)" : undefined}>
    <path d="M56 8Q35 25 43 48Q48 68 73 78" fill="none" strokeWidth="2" />
    {fruit.taxon === "Platanus orientalis" && <path d="M75 88Q85 111 59 132" fill="none" strokeWidth="2" />}
    {(fruit.taxon === "Platanus orientalis" ? [{x:43,y:47},{x:75,y:88},{x:59,y:132}] : [{x:43,y:47},{x:75,y:88}]).map(({x,y}) => <g key={x}>
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
    const capBottom = small || fruit.taxon === "Quercus rubra" ? 56 : hairy || fruit.taxon === "Quercus ilex" ? 72 : 64;
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
