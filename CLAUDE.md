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

**Nie dodawaj `p5.sound.min.js`.** Żaden szkic nie używa audio, a pod `file://`
ta biblioteka sypie błędami: brakującym source mapem i odmową załadowania
audio workletu z blob URL (null origin w Safari).

## Weryfikacja zmian

Szkice odpala się otwierając `index.html` z dysku. Żeby sprawdzić, że nic się nie
wysypało, załaduj stronę i potwierdź, że jest `window.p5`, canvas ma niezerowy
rozmiar i konsola jest czysta — headless Chrome przez CDP wystarczy.
