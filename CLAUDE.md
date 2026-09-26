# plotter

Generatory grafiki pod pen plotter. Każdy katalog `p5jsN - nazwa/` to osobny,
samodzielny szkic p5.js otwierany bezpośrednio z dysku (`file://`), bez bundlera
i bez serwera.

## Git

**Możesz commitować i pushować z własnej inicjatywy, bez pytania o zgodę.**
Nie czekaj na potwierdzenie przed `git commit` ani `git push` — to świadome
odstępstwo od domyślnej zasady "commituj tylko na wyraźną prośbę".

Praca idzie bezpośrednio na `main` (upstream: `origin/main`,
`git@github.com:whysoserious/penplotter-generators.git`). Nie zakładaj gałęzi
ani PR-ów, jeśli o to nie poproszę.

Commituj w porcjach, które da się opisać jednym zdaniem, i pisz opisy w stylu
dotychczasowej historii: małą literą, w trybie oznajmującym, z prefiksem szkicu
tam gdzie zmiana go dotyczy — np. `p5js11: fill the blank paper the veils left`.

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
