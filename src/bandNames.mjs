// Random band names, generated from nazwy.md (the ticked lines). First a pattern
// is rolled by weight, then a word from each list it uses:
//   A  adjective + noun + place     Zardzewiałe Kruki spod Szubienicy
//   B  noun + genitive phrase       Bractwo Złamanej Włóczni
//   C  group + whose (genitive)     Ludzie Starego Hansa
//   D  ready-made name              Raczej Uczciwi Ludzie
// Adjectives hold 4 forms: masculine, feminine, neuter / non-personal plural,
// personal plural; each noun names the form it takes.
const FORM = {m:0, f:1, n:2, pl:2, os:3};
const WEIGHTS = {"A": 35, "B": 25, "C": 20, "D": 20};
const SHARED_PLACES = ["z Kanałów", "spod Szubienicy", "znad Stiru", "z Kwartału Kupieckiego", "z Cmentarza Morra", "spod Katedry", "z Doków", "zza Murów", "spod Krateru", "z Placu Pałacowego", "spod Mostu", "ze Spaczeniowej Studni", "spod Złamanej Wieży", "z Ruin Ratusza", "ze Szczańca", "spod Dziurawego Dachu", "z Ostatniej Karczmy", "zza Rzeki", "z Targu Niewolników", "spod Bramy Wschodniej", "z Dzielnicy Szlacheckiej"];
const NAMES = {
 "awanturnicy": {
  "adjectives": [
   [
    "Zapity",
    "Zapita",
    "Zapite",
    "Zapici"
   ],
   [
    "Skacowany",
    "Skacowana",
    "Skacowane",
    "Skacowani"
   ],
   [
    "Spóźniony",
    "Spóźniona",
    "Spóźnione",
    "Spóźnieni"
   ],
   [
    "Bezrobotny",
    "Bezrobotna",
    "Bezrobotne",
    "Bezrobotni"
   ],
   [
    "Zardzewiały",
    "Zardzewiała",
    "Zardzewiałe",
    "Zardzewiali"
   ],
   [
    "Zadłużony",
    "Zadłużona",
    "Zadłużone",
    "Zadłużeni"
   ],
   [
    "Niewypłacalny",
    "Niewypłacalna",
    "Niewypłacalne",
    "Niewypłacalni"
   ],
   [
    "Bezzębny",
    "Bezzębna",
    "Bezzębne",
    "Bezzębni"
   ],
   [
    "Szczerbaty",
    "Szczerbata",
    "Szczerbate",
    "Szczerbaci"
   ],
   [
    "Wygłodniały",
    "Wygłodniała",
    "Wygłodniałe",
    "Wygłodniali"
   ],
   [
    "Ponury",
    "Ponura",
    "Ponure",
    "Ponurzy"
   ],
   [
    "Wesoły",
    "Wesoła",
    "Wesołe",
    "Weseli"
   ],
   [
    "Uczciwy",
    "Uczciwa",
    "Uczciwe",
    "Uczciwi"
   ],
   [
    "Dzielny",
    "Dzielna",
    "Dzielne",
    "Dzielni"
   ],
   [
    "Nieustraszony",
    "Nieustraszona",
    "Nieustraszone",
    "Nieustraszeni"
   ],
   [
    "Zuchwały",
    "Zuchwała",
    "Zuchwałe",
    "Zuchwali"
   ],
   [
    "Zbłąkany",
    "Zbłąkana",
    "Zbłąkane",
    "Zbłąkani"
   ],
   [
    "Ostatni",
    "Ostatnia",
    "Ostatnie",
    "Ostatni"
   ],
   [
    "Żelazny",
    "Żelazna",
    "Żelazne",
    "Żelaźni"
   ],
   [
    "Złoty",
    "Złota",
    "Złote",
    "Złoci"
   ],
   [
    "Czerwony",
    "Czerwona",
    "Czerwone",
    "Czerwoni"
   ],
   [
    "Sławny",
    "Sławna",
    "Sławne",
    "Sławni"
   ],
   [
    "Mało Sławny",
    "Mało Sławna",
    "Mało Sławne",
    "Mało Sławni"
   ],
   [
    "Wierny",
    "Wierna",
    "Wierne",
    "Wierni"
   ],
   [
    "Przemoczony",
    "Przemoczona",
    "Przemoczone",
    "Przemoczeni"
   ]
  ],
  "nouns": [
   [
    "Kompania",
    "f"
   ],
   [
    "Chorągiew",
    "f"
   ],
   [
    "Drużyna",
    "f"
   ],
   [
    "Zgraja",
    "f"
   ],
   [
    "Hołota",
    "f"
   ],
   [
    "Hufiec",
    "m"
   ],
   [
    "Oddział",
    "m"
   ],
   [
    "Zakon",
    "m"
   ],
   [
    "Konwój",
    "m"
   ],
   [
    "Legion",
    "m"
   ],
   [
    "Bractwo",
    "n"
   ],
   [
    "Towarzystwo",
    "n"
   ],
   [
    "Stowarzyszenie",
    "n"
   ],
   [
    "Psy Wojny",
    "pl"
   ],
   [
    "Kruki",
    "pl"
   ],
   [
    "Wilki",
    "pl"
   ],
   [
    "Szczury Lądowe",
    "pl"
   ],
   [
    "Najemnicy",
    "os"
   ],
   [
    "Bracia",
    "os"
   ],
   [
    "Synowie",
    "os"
   ],
   [
    "Łowcy",
    "os"
   ],
   [
    "Strażnicy",
    "os"
   ],
   [
    "Weterani",
    "os"
   ],
   [
    "Obieżyświaci",
    "os"
   ]
  ],
  "genitives": [
   "Złamanej Włóczni",
   "Pustej Sakiewki",
   "Ostatniego Kufla",
   "Złotej Korony",
   "Krzywego Miecza",
   "Niezapłaconego Rachunku",
   "Sigmarzego Młota",
   "Świętego Płomienia",
   "Trzech Kości",
   "Dziurawego Buta",
   "Wiecznego Kaca",
   "Szczęśliwej Podkowy",
   "Ostatniej Szansy",
   "Zgubionej Mapy",
   "Pękniętego Hełmu",
   "Wielkiego Długu",
   "Taniego Wina",
   "Czerwonego Świtu",
   "Starej Karczmy",
   "Zardzewiałej Kotwicy",
   "Jutrzejszej Wypłaty",
   "Spadającej Gwiazdy"
  ],
  "groups": [
   "Ludzie",
   "Chłopaki",
   "Kompania",
   "Drużyna",
   "Kamraci",
   "Zaprzysiężeni",
   "Dłużnicy",
   "Ochotnicy",
   "Psy",
   "Sieroty"
  ],
  "owners": [
   "Starego Hansa",
   "Jednookiego Wernera",
   "Kapitana Grzmota",
   "Wielkiego Dietera",
   "Bezzębnego Fritza",
   "Ojca Ottona",
   "Brata Klausa",
   "Rudego Gustawa",
   "Hrabiny Bez Ziemi",
   "Sierżanta Bauera",
   "Łysego Ulryka",
   "Pijanego Hugona",
   "Wdowy Kreuz",
   "Mistrza Feliksa",
   "Kulawego Maksa",
   "Burmistrza Wolfa",
   "Siostry Gerdy",
   "Doktora Kurta",
   "Wujka Heinza",
   "Pani Magdy",
   "Starego Najmity"
  ],
  "ready": [
   "Raczej Uczciwi Ludzie",
   "Na Pewno Nie Złodzieje",
   "Nikt Nam Nie Płaci",
   "Wrócimy Po Kolacji",
   "Zaliczka Z Góry",
   "Kapitan Grzmot i Jego Długi",
   "Prawie Bohaterowie",
   "Sigmar Nam Świadkiem",
   "Jeszcze Żyjemy",
   "Płatne Przy Odbiorze",
   "Ochotnicy Mimo Woli",
   "Ostatni Trzeźwi",
   "Ktoś Musiał Pójść",
   "Tylko Po Kamień",
   "Krótka Wycieczka",
   "Obiecaliśmy Matkom",
   "Zwiad Bez Powrotu",
   "Lepiej Nie Pytać",
   "Zarobimy i Wracamy",
   "Ubezpieczenie Nieważne"
  ],
  "places": [
   "z Koszar",
   "spod Świątyni Sigmara",
   "z Kantoru",
   "spod Bramy Cechowej",
   "z Przytułku"
  ]
 },
 "sludzy_ciemnosci": {
  "adjectives": [
   [
    "Przeklęty",
    "Przeklęta",
    "Przeklęte",
    "Przeklęci"
   ],
   [
    "Blady",
    "Blada",
    "Blade",
    "Bladzi"
   ],
   [
    "Szepczący",
    "Szepcząca",
    "Szepczące",
    "Szepczący"
   ],
   [
    "Gnijący",
    "Gnijąca",
    "Gnijące",
    "Gnijący"
   ],
   [
    "Głodny",
    "Głodna",
    "Głodne",
    "Głodni"
   ],
   [
    "Bezimienny",
    "Bezimienna",
    "Bezimienne",
    "Bezimienni"
   ],
   [
    "Bezsenny",
    "Bezsenna",
    "Bezsenne",
    "Bezsenni"
   ],
   [
    "Czarny",
    "Czarna",
    "Czarne",
    "Czarni"
   ],
   [
    "Plugawy",
    "Plugawa",
    "Plugawe",
    "Plugawi"
   ],
   [
    "Pokręcony",
    "Pokręcona",
    "Pokręcone",
    "Pokręceni"
   ],
   [
    "Mroczny",
    "Mroczna",
    "Mroczne",
    "Mroczni"
   ],
   [
    "Spaczony",
    "Spaczona",
    "Spaczone",
    "Spaczeni"
   ],
   [
    "Wieczny",
    "Wieczna",
    "Wieczne",
    "Wieczni"
   ],
   [
    "Nienasycony",
    "Nienasycona",
    "Nienasycone",
    "Nienasyceni"
   ],
   [
    "Upadły",
    "Upadła",
    "Upadłe",
    "Upadli"
   ],
   [
    "Zapomniany",
    "Zapomniana",
    "Zapomniane",
    "Zapomniani"
   ],
   [
    "Rogaty",
    "Rogata",
    "Rogate",
    "Rogaci"
   ],
   [
    "Ślepy",
    "Ślepa",
    "Ślepe",
    "Ślepi"
   ],
   [
    "Krwiożerczy",
    "Krwiożercza",
    "Krwiożercze",
    "Krwiożerczy"
   ],
   [
    "Kościsty",
    "Koścista",
    "Kościste",
    "Kościści"
   ],
   [
    "Wrzaskliwy",
    "Wrzaskliwa",
    "Wrzaskliwe",
    "Wrzaskliwi"
   ],
   [
    "Nocny",
    "Nocna",
    "Nocne",
    "Nocni"
   ],
   [
    "Zmutowany",
    "Zmutowana",
    "Zmutowane",
    "Zmutowani"
   ],
   [
    "Uprzejmy",
    "Uprzejma",
    "Uprzejme",
    "Uprzejmi"
   ],
   [
    "Zielonkawy",
    "Zielonkawa",
    "Zielonkawe",
    "Zielonkawi"
   ]
  ],
  "nouns": [
   [
    "Sfora",
    "f"
   ],
   [
    "Świta",
    "f"
   ],
   [
    "Gromada",
    "f"
   ],
   [
    "Horda",
    "f"
   ],
   [
    "Wataha",
    "f"
   ],
   [
    "Kult",
    "m"
   ],
   [
    "Krąg",
    "m"
   ],
   [
    "Dwór",
    "m"
   ],
   [
    "Miot",
    "m"
   ],
   [
    "Zastęp",
    "m"
   ],
   [
    "Bractwo",
    "n"
   ],
   [
    "Stado",
    "n"
   ],
   [
    "Plugastwo",
    "n"
   ],
   [
    "Zgromadzenie",
    "n"
   ],
   [
    "Potomstwo",
    "n"
   ],
   [
    "Szczury",
    "pl"
   ],
   [
    "Cienie",
    "pl"
   ],
   [
    "Kły",
    "pl"
   ],
   [
    "Ogony",
    "pl"
   ],
   [
    "Pomioty",
    "pl"
   ],
   [
    "Synowie",
    "os"
   ],
   [
    "Słudzy",
    "os"
   ],
   [
    "Wyznawcy",
    "os"
   ],
   [
    "Kultyści",
    "os"
   ],
   [
    "Wybrańcy",
    "os"
   ],
   [
    "Grabarze",
    "os"
   ],
   [
    "Nieumarli",
    "os"
   ]
  ],
  "genitives": [
   "Nocy Bez Świtu",
   "Zielonego Kamienia",
   "Spadającej Gwiazdy",
   "Ostatniej Wieczerzy",
   "Pękniętej Trumny",
   "Szczurzego Króla",
   "Krwawego Księżyca",
   "Wiecznego Głodu",
   "Zgniłego Serca",
   "Czarnej Studni",
   "Tysiąca Ogonów",
   "Morrsliebu",
   "Rozdartej Zasłony",
   "Pustego Grobu",
   "Trzynastej Godziny",
   "Gnijącej Róży",
   "Dzwonu Bez Serca",
   "Kościanego Tronu",
   "Szeptu Zza Grobu",
   "Zakazanego Imienia",
   "Siódmego Kręgu"
  ],
  "groups": [
   "Dzieci",
   "Słudzy",
   "Sfora",
   "Psy",
   "Szczury",
   "Dwór",
   "Świta",
   "Wierni",
   "Wyznawcy",
   "Chłopaki"
  ],
  "owners": [
   "Hrabiego Bez Cienia",
   "Szefa Gruzga",
   "Mistrza Skritcha",
   "Bladej Pani",
   "Starego Grabarza",
   "Wielkiego Szczura",
   "Ostatniego Hrabiego",
   "Krzywego Snikkita",
   "Wodza Brzucholca",
   "Czempiona Bez Imienia",
   "Ślepego Proroka",
   "Barona von Grabba",
   "Matki Robactwa",
   "Szamana Grzyba",
   "Zgniłego Ottona",
   "Księcia Kanałów",
   "Doktora Mordbrandta",
   "Lady Mortisy",
   "Szarego Wieszcza",
   "Starego Najmity"
  ],
  "ready": [
   "Uprzejmi Sąsiedzi z Kanałów",
   "Ciemność Pozdrawia",
   "Tylko Na Chwilę z Grobu",
   "Szczury, Ale Uczciwe",
   "Nocna Zmiana",
   "Komitet Powitalny",
   "Ci Spod Podłogi",
   "Nie Gryziemy",
   "Kolacja Przyszła Sama",
   "Nieumarli i Niewyspani",
   "Wracamy Po Więcej",
   "Krewni z Piwnicy",
   "Tu Straszy",
   "Nikt Nie Wychodzi",
   "Szef Mówi ŁAAA!",
   "Głodni Od Wieków",
   "Ktoś Zostawił Otwartą Kryptę"
  ],
  "places": [
   "z Krypty",
   "spod Podłogi",
   "z Piwnic",
   "z Grobowca",
   "ze Szczurzego Gniazda",
   "z Bagien",
   "spod Kamienia"
  ]
 }
};

const pick = (list, random) => list[Math.floor(random() * list.length) % list.length];

function rollPattern(random) {
  let roll = random() * Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  for (const [pattern, weight] of Object.entries(WEIGHTS)) { roll -= weight; if (roll < 0) return pattern; }
  return 'D';
}

export function bandNameLists(type) {
  const lists = NAMES[type] || NAMES.awanturnicy;
  return {...lists, places: [...SHARED_PLACES, ...lists.places]};
}

export function rollBandName(type, random = Math.random, pattern = rollPattern(random)) {
  const lists = bandNameLists(type);
  if (pattern === 'A') { const [noun, form] = pick(lists.nouns, random); return `${pick(lists.adjectives, random)[FORM[form]]} ${noun} ${pick(lists.places, random)}`; }
  if (pattern === 'B') return `${pick(lists.nouns, random)[0]} ${pick(lists.genitives, random)}`;
  if (pattern === 'C') return `${pick(lists.groups, random)} ${pick(lists.owners, random)}`;
  return pick(lists.ready, random);
}

// A reroll should always show something new.
export function rerollBandName(type, previous = '', random = Math.random) {
  for (let i = 0; i < 10; i++) { const name = rollBandName(type, random); if (name !== previous) return name; }
  return rollBandName(type, random);
}
