'use strict';
/* erscheinungsbild-zustand.js — ist eine vivodepot.html das Gerüst oder ein Erzeugnis? (v894, 02.10.2026)
   Seit v894 ist die rohe vivodepot.html das nackte Gerüst: die Region AB_WERK_ERSCHEINUNGSBILD_PRODUKT steht dort auf
   `null`. Ein Erzeugnis (Produkt, Pages-Fassung, Demo) trägt sie gefüllt. Ein Kern VOR v894 hat die Region nicht und trägt
   seine Werte selbst. Wer eine Datei ausliefert, fragt hier, statt sich auf einen Dateinamen zu verlassen.
   Benutzt von den Demo- und Vorführungswerkzeugen und der Probe der Auslieferungswege. */
const BEGIN = '/* AB_WERK_ERSCHEINUNGSBILD_PRODUKT:BEGIN */';
const ENDE = '/* AB_WERK_ERSCHEINUNGSBILD_PRODUKT:END */';

/* 'erzeugnis' | 'geruest' | 'ohne-region' */
function erscheinungsbildZustand(text) {
  const a = text.indexOf(BEGIN);
  if (a < 0) return 'ohne-region';
  const innen = text.slice(a + BEGIN.length, text.indexOf(ENDE, a));
  return /=\s*null\s*;/.test(innen) ? 'geruest' : 'erzeugnis';
}

function keinGeruest(text, wer) {
  if (erscheinungsbildZustand(text) === 'geruest') {
    throw new Error(wer + ': die übergebene Datei ist der blanke Kern, das nackte Gerüst (AB_WERK_ERSCHEINUNGSBILD_PRODUKT = null) — ausgeliefert wird '
      + 'nur ein Erzeugnis. Erst bauen: node tools/vier-produkte-erzeugen.js --ziel <ordner>, dann <ordner>/<slug>/vivodepot.html.');
  }
}

module.exports = { erscheinungsbildZustand, keinGeruest, BEGIN, ENDE };
