'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   pages-erzeugnis.js — was die Pages-Auslieferung als vivodepot.html legt (v894, 02.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Vor v894 kopierten tools/testfassung-legen.js (WEG_ROH) und tools/modul-app-packen.js (WEG_B) die rohe
   vivodepot.html nach vivodepot-ios-test (GitHub Pages; Landkarte tools/lib/auslieferungsorte-register.js). Seit v894
   ist die rohe Datei das nackte Gerüst — ohne Erscheinungsbild (und seit S8 ohne Sprachsatz). Ein Nutzerweg darf das
   Gerüst nicht ausliefern (Auflage vom 02.10.2026: „Pages wird vor v894 auf den Konfektionierungsweg umgestellt").

   ZWEI ERZEUGNISSE, je nach Weg:
     produktFuerPages(slug)        WEG_ROH (die Wurzel, buerger-de): das konfektionierte Produkt, wie
                                   tools/vier-produkte-erzeugen.js es baut — derselbe produktTextErzeugen, dieselben
                                   Zutaten (modulDateienFuer), mit Service Worker, weil Pages sw.js mitliefert.
     geruestMitErscheinungsbild()  WEG_B (module-apps/*): das Gerüst plus NUR das Erscheinungsbild. Weg B trägt sein
                                   Produkt zur Laufzeit in vorabkonfiguration.js (U2-ADR-182) — Sprache und Module
                                   kommen von dort, nicht eingebacken. Das Erscheinungsbild aber muss vor dem ersten
                                   Bild stehen und kann nicht nachgeladen werden; es wird darum mit DERSELBEN Prüfung
                                   gebacken, die produktTextErzeugen fährt (Regeln aus dem Kern, Verstoß wirft).
   Probe: die Probe der Auslieferungswege (Erzeugnis statt Gerüst).
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const P = require('./produkt-text-erzeugen.js');
const { PRODUKTE, modulDateienFuer, ERSCHEINUNGSBILD_HEUTE_PFAD } = require('./vier-produkte.js');

const REPO = path.join(__dirname, '..', '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');

function _modulLesen(pfad) {
  return { roh: JSON.parse(fs.readFileSync(pfad, 'utf8')), basisname: path.basename(pfad) };
}

function produktFuerPages(slug = 'privat-de', { kernText = fs.readFileSync(KERN_PFAD, 'utf8') } = {}) {
  const p = PRODUKTE.find((x) => x.slug === slug);
  if (!p) throw new Error('pages-erzeugnis: unbekanntes Produkt ' + slug);
  const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));
  const { text } = P.produktTextErzeugen(kernText, {
    modulauswahl: [],
    vorDepotKonfigurationInhaltFn: ladeIssuer().V.vorDepotKonfigurationDateiInhalt,
    unsignierteModule: modulDateienFuer(p).map(_modulLesen),
    serviceWorkerVorhanden: true,
  });
  return text;
}

function geruestMitErscheinungsbild({ kernText = fs.readFileSync(KERN_PFAD, 'utf8'), modulPfad = ERSCHEINUNGSBILD_HEUTE_PFAD } = {}) {
  const modul = _modulLesen(modulPfad);
  const klassifiziert = [P._unsigniertesModulKlassifizieren(modul.roh, modul.basisname)];
  P._erscheinungsbildVorBacken(kernText, klassifiziert, 'vivodepot.html');
  const region = P.AB_WERK_REGIONEN.find((r) => r.modulTyp === 'erscheinungsbild');
  return P._regionNutzlastSetzen(kernText, region, modul.roh, 'vivodepot.html');
}

module.exports = { produktFuerPages, geruestMitErscheinungsbild };
