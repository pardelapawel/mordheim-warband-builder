# Mordheim — Księga bandy

Polska rozpiska bandy dla zasad Drachenfels. Interfejs odtwarza układ wpisów z dołączonego pustego arkusza: jeden wojownik to jeden szeroki wiersz, z profilem, umiejętnościami, ekwipunkiem, obrażeniami i torem doświadczenia. Skróty statystyk pozostają angielskie.

Uruchom `npm start`, następnie otwórz http://127.0.0.1:4173. Nie otwieraj aplikacji przez `file://` — moduły i katalogi wymagają serwera HTTP. Wystarczy Node.js 20 lub nowszy; instalowanie zależności nie jest konieczne.

`npm test` uruchamia testy modelu, migracji, reguł i pakowania. `npm run prepare:pages` tworzy katalog `dist-pages` przeznaczony na GitHub Pages. Archiwum `old/`, testy, dokumenty i wzorcowy PDF nie trafiają do publikowanej aplikacji. Istniejące workflow GitHub Pages korzystają z tych samych poleceń.

Opcjonalne testy przeglądarkowe: przy uruchomionym serwerze wykonaj `node scripts/check-browser.mjs` w środowisku z pakietem `playwright` i przeglądarką Chrome. Możesz podać ścieżkę do pakietu jako pierwszy argument. Testy używają oddzielnego profilu i zapisują podglądy w `tmp/browser/`.

`node scripts/check-progression-browser.mjs [ścieżka-do-playwright]` sprawdza dodatkowo automatyczne maksima, wyjątki ręczne, ceny mutacji, przeliczanie po usunięciu oraz aktualizację starych zapisów.

## Obsługa

- Dodaj wojownika z katalogu i edytuj jego profil w panelu. Zmiany zapisują się lokalnie. Wojowników można powielać; usunięcie i zastąpienie szablonu można cofnąć.
- Zachowane są dwa typy band: Awanturnicy i Słudzy Ciemności. Każda nowa banda otrzymuje osobny identyfikator; identyczne nazwy nie nadpisują zapisów.
- Eksport JSON służy jako przenośna kopia zapasowa. Import i otwieranie linku tworzą osobny zapis i ładują właściwy katalog. Eksport tekstowy pobiera plik bez opuszczania aplikacji.
- „Drukuj / PDF” używa drukowania przeglądarki w formacie A4. Opisy zasad można dołączyć do wydruku. Długie wpisy rosną wraz z treścią; wpis wojownika nie jest dzielony między strony, o ile mieści się na jednej stronie.
- Profil zawiera dziewięć charakterystyk: M, WS, BS, S, T, W, I, A i Ld. Program nie zmienia profilu automatycznie po dodaniu ekwipunku lub umiejętności.
- Maksima rasowe uzupełniają się automatycznie według tabeli Drachenfels ze str. 34, również dla istniejących zapisów. Można zachować ręczne wyjątki i przywrócić wartości z tabeli. Zwierzaki bez własnego profilu w tej tabeli pozostają bez automatycznych limitów; ghoul ma własny profil. Zwierzoczłek ma M 4 zgodnie z Drachenfels (Mordheimer podaje M 5).
- Ceny mutacji pochodzą ze str. 31 Drachenfels: pierwsza ma cenę podstawową, każda następna dwukrotność swojej ceny, w kolejności dodawania. Usunięcie mutacji przelicza pozostałe koszty. Wczytanie starego zapisu aktualizuje ceny mutacji, zachowując ich kolejność. Mutacje są dostępne dla Mutanta i Opętanego, nie dla Wulfena; zgodnie z podręcznikiem kupuje się je podczas rekrutacji. Mutant musi wybrać co najmniej jedną; u Opętanego są opcjonalne.
- Biblioteka jest przechowywana pod kluczem `mordheim_rosters_v2`. Stare zapisy Drachenfels (`mordheim_current`, `mordheim_saves`) są migrowane przy pierwszym uruchomieniu; stare klucze pozostają bez zmian. Zapisy innych zestawów zasad są pomijane z komunikatem. Migracja wymaga tego samego adresu strony i przeglądarki, w których zapisano poprzednią wersję.
- Link udostępnienia zawiera pełną migawkę bandy. Odbiorca otrzymuje niezależną kopię.

## Struktura

`src/model.mjs` — model, obliczenia, normalizacja i eksport tekstowy.

`src/catalog.mjs` — ładowanie katalogów Drachenfels.

`src/rules.mjs` — czyste funkcje walidacji.

`src/storage.mjs` — biblioteka, migracja i linki.

`src/skills.mjs` — zachowane i przekształcone na moduł funkcje umiejętności.

`src/progression.mjs` — dobór maksimum rasowego, ręczne wyjątki i ceny mutacji. Dane i źródła: `data/drachenfels/progression.json`.

`src/app.mjs` — interakcje i renderowanie interfejsu.

`old/` — poprzednia implementacja wraz z istniejącą lokalną poprawką eksportu tekstowego, dawnymi testami i katalogami. Archiwum służy jako odniesienie; korzysta z dawnych kluczy przeglądarki, więc nie używaj go do edytowania bieżących zapisów.
