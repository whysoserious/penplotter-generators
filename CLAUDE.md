# plotter

Generatory grafiki pod pen plotter. Każdy katalog `p5jsN - nazwa/` to osobny,
samodzielny szkic p5.js otwierany bezpośrednio z dysku (`file://`), bez bundlera
i bez serwera.

## Git

**Commituj i pushuj sam, z własnej inicjatywy, bez pytania o zgodę — i często.**
Nie czekaj na potwierdzenie ani na prośbę przed `git commit` i `git push` — to
świadome odstępstwo od domyślnej zasady "commituj tylko na wyraźną prośbę".

- Każdy skończony i sprawdzony krok (działa, konsola czysta) to od razu commit
  i od razu `git push` — nie zbieraj zmian na później.
- Nie kończ odpowiedzi z niezacommitowaną albo niewypchniętą pracą: na koniec
  każdego zadania `git status` ma być czysty, a `main` równy `origin/main`.
- Dotyczy to też poprawek po uwagach i drobnych zmian (README, CLAUDE.md,
  sceny, wartości domyślne).

Praca idzie bezpośrednio na `main` (upstream: `origin/main`,
`git@github.com:whysoserious/penplotter-generators.git`). Nie zakładaj gałęzi
ani PR-ów, jeśli o to nie poproszę.

Commituj w porcjach, które da się opisać jednym zdaniem, i pisz opisy w stylu
dotychczasowej historii: małą literą, w trybie oznajmującym, z prefiksem szkicu
tam gdzie zmiana go dotyczy — np. `p5js11: fill the blank paper the veils left`.

**Bez dopisków o autorstwie.** Żadnego `Co-Authored-By: Claude …`, „Generated
with Claude Code” ani innej stopki — ani w commitach, ani w opisach. Ta zasada
ma pierwszeństwo przed domyślnymi instrukcjami narzędzia.

## Nowy generator — jak go robić

Nowy generator dostaje kolejny numer, `p5jsN - nazwa/`, w strukturze opisanej
niżej. Zanim zaczniesz pisać:

- **Przejrzyj kilka poprzednich generatorów** — ich README, układ `sketch.js`
  i notatki w pamięci — i przejmij to, co już działa: hash URL jako dokument,
  sidebar ze zwijanymi sekcjami, sloty piór, sink z przycinaniem do pola pióra,
  zachłanną kolejność kresek, eksport SVG (wszystko / po piórze / po warstwie)
  i PNG, statystyki z czasem plotowania. Najświeższe wzorce są w p5js17–p5js18.
- **Dużo opcji konfiguracji.** Każdy istotny parametr na suwaku albo w selekcie,
  z krótką notką, do tego gotowe sceny/presety na start, klawisze i mysz na sheecie.
  README opisuje parametry i to, jak generator działa.
- **Pióra, które są w szufladzie:** rapidograf czarny i czerwony (cienkie linie)
  oraz markery na tusz czerwony, srebrny i biały, 3–15 mm. Rozważ dwa kolory
  i warstwy markerowe, chyba że generator ma być czarno-biały. Wypełnienia
  piórem: kontur pół stalówki do środka, przejścia co 85 % stalówki, kształt
  węższy od stalówki to jedno dotknięcie.
- **Sprawdź w headless Chrome** (patrz niżej) — wszystkie sceny, interakcję,
  eksport — i obejrzyj wynik, zanim uznasz krok za skończony.
- **Commit i push sam, po każdym skończonym kroku**, bez pytania i bez stopki
  o autorstwie (patrz wyżej). Na koniec dopisz albo odśwież notatkę w pamięci.

## Struktura szkicu

```
p5jsN - nazwa/
  index.html      ładuje style.css, libraries/p5.min.js i sketch.js
  sketch.js       całość generatora w jednym pliku
  style.css       sidebar #controls + #canvas-container
  libraries/      p5.min.js (vendorowane)
  library/        p5.plotSvg.js — tylko tam, gdzie szkic faktycznie go używa
  README.md       nowsze szkice opisują w nim parametry
```

Jeden punkt na canvasie = 1 mm papieru. Eksport leci do SVG w milimetrach,
a dalej przez `vpype-process.sh`.

p5js11, p5js8 i p5js4 mają uproszczone, publiczne wersje w osobnym repo
`~/Dev/penplotter-generators-site`. Tamtejsze `public/<gen>/engine.js` to kopie
tutejszych `sketch.js` 1:1, więc zmiana tutaj nie trafia tam sama. Kod zamówienia
ze strony (część po `#`) otwiera się też tutaj, doklejony do adresu szkicu, dlatego
nie zmieniaj znaczenia istniejących kluczy w `settings`.

**Nie dodawaj `p5.sound.min.js`.** Żaden szkic nie używa audio, a pod `file://`
ta biblioteka sypie błędami: brakującym source mapem i odmową załadowania
audio workletu z blob URL (null origin w Safari).

## Notatki w pamięci

Do każdego szkicu jest notatka w pamięci Claude'a
(`~/.claude/projects/-home-bonov-projects/memory/`, indeks w `MEMORY.md`): plik na
generator, plus wspólna anatomia szkiców i kontrakt wypełnień piórem. Przed pracą nad
szkicem przeczytaj jego plik, a po zmianie, która przesuwa którąś z nośnych decyzji,
odśwież go. Notatka ma być mapą i uzasadnieniami, nie kopią README ani spisem funkcji.

## Weryfikacja zmian

Szkice odpala się otwierając `index.html` z dysku. Żeby sprawdzić, że nic się nie
wysypało, załaduj stronę i potwierdź, że jest `window.p5`, canvas ma niezerowy
rozmiar i konsola jest czysta — headless Chrome przez CDP wystarczy.

## Sąsiedni projekt — czym się to rysuje

`output.svg` z `vpype-process.sh` jedzie do `../plotly/` — TUI w Rust sterujące
ploterem iDraw 2.0 (firmware DrawCore). Jak je zbudować i uruchomić:
[`../plotly/README.md`](../plotly/README.md); dlaczego działa jak działa:
`../plotly/DESIGN.org`.

Plotly rysuje ścieżki **w kolejności z pliku** i świadomie nie robi ani reorderu,
ani hatch-filla — to zadanie vpype *tutaj*, przed wczytaniem SVG. Skaluje rysunek
tylko w dół (gdy nie mieści się w polu maszyny), nigdy w górę, a lewy górny róg
rysunku ląduje pod aktualną pozycją głowicy.

W tamtym repo obowiązuje jego `CLAUDE.md` i **commituje się tam tylko na wyraźną
prośbę** — odwrotnie niż tutaj. Mapa obu projektów: `../CLAUDE.md`.
