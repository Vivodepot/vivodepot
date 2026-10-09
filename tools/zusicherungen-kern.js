'use strict';
/* Geteilte Pruef-Logik fuer die Pruefung der Zusicherungen UND ihre Negativproben.
   Eigene Datei, damit beide Skripte sie ohne zirkulaeren require() teilen koennen — pruefen.js
   ruft die Proben aus negativproben.js auf (Nachtrag der Produktverantwortung: Kopplung statt zweier getrennter,
   potenziell auseinanderlaufender Werkzeuge), und negativproben.js braucht dieselbe pruefeRegel()-
   Funktion wie der echte Lauf, sonst prueft sie nicht dasselbe, was sie zu pruefen vorgibt. */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');

function commitStand() {
  try { return execSync('git rev-parse --short HEAD', { cwd: REPO }).toString().trim(); }
  catch (_) { return 'unbekannt (kein Git-Stand ermittelbar)'; }
}

function ladeDatei(datei) {
  const p = path.join(REPO, datei);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

// Vendorte Bereiche: <!-- @vd-lib … status="inline" … --> (der Marker-Kommentar selbst kann
// mehrzeilig sein) bis zum naechsten </script>. Strukturelle, globale Ausnahme fuer ALLE
// Zusicherungen (SBOM-belegte Drittanbieter-Bibliothek), nicht pro Muster in der Regeldatei
// gefuehrt — siehe Z1-Kommentar dort.
function vendorZeilen(inhalt) {
  const zeilen = inhalt.split('\n');
  const markiert = new Set();
  let inMarker = false, markerText = '';
  let inVendorBlock = false;
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (!inVendorBlock) {
      if (!inMarker && /<!--\s*@vd-lib\b/.test(z)) { inMarker = true; markerText = ''; }
      if (inMarker) {
        markerText += z + '\n';
        if (/-->/.test(z)) {
          inMarker = false;
          if (/status="inline"/.test(markerText)) inVendorBlock = true;
        }
      }
      continue;
    }
    markiert.add(i + 1); // 1-indexiert
    if (/<\/script>/.test(z)) inVendorBlock = false;
  }
  return markiert;
}

// Kommentarzeilen — allgemeine Ausnahme fuer Treffer, die nur in Dokumentations-/Erklaertext stehen,
// nicht in buerger-sichtbarem oder ausgefuehrtem Code (z. B. "kein fetch()" als Selbstauskunft im
// CSP-Kommentarblock, oder "inhaltlich richtig" als Begruendung einer Code-Platzierung). Drei
// Kommentar-Formen, EINE Klasse:
//   • HTML-Kommentar     <!-- … -->    (mehrzeilig, contains-basiert wie bisher)
//   • JS-Zeilenkommentar   // …        (nur wenn die getrimmte Zeile mit // beginnt)
//   • JS-Blockkommentar   /* … */      (nur wenn die getrimmte Zeile mit /* oeffnet)
// GRENZE (kritisch, Auflage der Produktverantwortung): nur ECHTE Kommentar-Syntax am Zeilenanfang. Ein // oder /*
// INNERHALB eines String-Literals (z. B. "https://…" oder ein dem Buerger angezeigter Text) beginnt
// die Zeile nicht und wird NICHT ausgeschlossen — echte Verstoesse in Strings bleiben sichtbar.
// Bewusst konservativ: ein nachgestellter `code(); // …`-Kommentar wird NICHT ausgeschlossen (die
// Code-Haelfte davor koennte einen echten Verstoss tragen) — lieber ein Rest-Falsch-Positiv im
// nachgestellten Kommentar als ein verdeckter Verstoss im Code/String davor. Getrennt von
// vendorZeilen gezaehlt und ausgewiesen.
function kommentarZeilen(inhalt) {
  const zeilen = inhalt.split('\n');
  const markiert = new Set();
  let htmlOffen = false;   // <!-- … -->
  let blockOffen = false;  // /* … */ (am Zeilenanfang geoeffnet)
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    // laufender JS-Blockkommentar
    if (blockOffen) {
      markiert.add(i + 1);
      if (z.includes('*/')) blockOffen = false;
      continue;
    }
    // HTML-Kommentar (unveraendert: contains-basiert, mehrzeilig)
    if (!htmlOffen && z.includes('<!--')) htmlOffen = true;
    if (htmlOffen) {
      markiert.add(i + 1);
      if (z.includes('-->')) htmlOffen = false;
      continue;
    }
    // JS-Kommentar-Klasse — nur echte Kommentar-Syntax am Zeilenanfang
    const t = z.trimStart();
    if (t.startsWith('//')) { markiert.add(i + 1); continue; }
    if (t.startsWith('/*')) {
      markiert.add(i + 1);
      if (!z.includes('*/')) blockOffen = true;   // sonst einzeiliger /* … */
    }
  }
  return markiert;
}

function treffer(inhalt, muster) {
  const zeilen = inhalt.split('\n');
  const funde = [];
  zeilen.forEach((zeile, idx) => {
    const re = new RegExp(muster.source, muster.flags.includes('g') ? muster.flags : muster.flags + 'g');
    let m;
    while ((m = re.exec(zeile)) !== null) {
      funde.push({ zeile: idx + 1, fundstelle: m[0], text: zeile.trim().slice(0, 160) });
      if (m[0] === '') re.lastIndex++; // Endlosschleife bei Null-Breite-Treffern vermeiden
    }
  });
  return funde;
}

function pruefeKonstante(inhalt, konstante) {
  const m = konstante.muster.exec(inhalt);
  konstante.muster.lastIndex = 0;
  if (!m) return { gefunden: false, fremd: [] };
  const werte = m[1].split(',').map(s => s.trim().replace(/^['"`]|['"`]$/g, '')).filter(Boolean);
  const fremd = werte.filter(w => !konstante.erlaubteWerte.includes(w));
  return { gefunden: true, werte, fremd };
}

// Eigenes Feld statt `dateien` (Auflage der Produktverantwortung, 03.08.2026): `dateien` bedeutet ueberall sonst
// in dieser Datei „wird von treffer()/pruefeKonstante() nach Mustern durchsucht" — fuer eine
// `nur_durch_test`-Regel gibt es kein Muster, nur die Existenz einer Beleg-Datei. Ein
// Regex-Scanner, der auf einer leeren `verboten`-Liste laeuft, waere immer gruen — das
// verwechselte „nichts verboten gefunden" mit „der Beleg steht". `belegDurchTests` wird darum
// NUR auf Existenz geprueft (fs.existsSync), nie inhaltlich gescannt.
//
// Nachtrag (Produktverantwortung, 03.08.2026 spaeter): reine Existenz reisst nicht, wenn der PASSENDE Test in
// einer sonst unveraenderten Datei verschwindet (umbenannt/geloescht, Datei bleibt). Jede
// Beleg-Datei traegt darum eine Marke `Zusicherung: <ID>` (Konvention, kein neues Datenfeld auf
// der Regel — die Marke ist reiner Dateiinhalt) — verschwindet sie, geht die Regel rot. Das
// beweist WEITERHIN NICHT, dass die Zusage tatsaechlich geprueft wird (nur, dass ein Test mit
// diesem Bezug existiert) — aber deutlich naeher an einem echten Beleg als reine Existenz.
function pruefeNurDurchTest(regel) {
  const rotFunde = [];
  const marke = 'Zusicherung: ' + regel.id;
  for (const datei of regel.belegDurchTests || []) {
    const voller = path.join(REPO, datei);
    if (!fs.existsSync(voller)) {
      rotFunde.push({ datei, zeile: 0, fundstelle: '(Datei fehlt)', beschreibung: 'Beleg-Testdatei nicht gefunden oder umbenannt' });
      continue;
    }
    const inhalt = fs.readFileSync(voller, 'utf8');
    if (!inhalt.includes(marke)) {
      rotFunde.push({ datei, zeile: 0, fundstelle: '(Marke fehlt)', beschreibung: `Datei traegt die Marke „${marke}" nicht mehr — Beleg-Bindung verloren` });
    }
  }
  return {
    id: regel.id, titel: regel.titel, status: rotFunde.length ? 'rot' : 'gruen',
    hinweis: regel.hinweis, nurDurchTest: true,
    funde: rotFunde, erlaubtGezaehlt: [], vendorAusgeschlossen: 0, kommentarAusgeschlossen: 0,
  };
}

function pruefeRegel(regel) {
  if (regel.status === 'nur_durch_test') return pruefeNurDurchTest(regel);
  if (regel.status === 'nicht_pruefbar' || regel.status === 'ausgesetzt') {
    return { id: regel.id, titel: regel.titel, status: regel.status, hinweis: regel.hinweis, funde: [] };
  }

  const rotFunde = [];
  const erlaubtGezaehlt = [];
  let vendorAusgeschlossen = 0;
  let kommentarAusgeschlossen = 0;

  for (const datei of regel.dateien) {
    const inhalt = ladeDatei(datei);
    if (inhalt === null) {
      rotFunde.push({ datei, zeile: 0, fundstelle: '(Datei fehlt)', beschreibung: 'Datei nicht gefunden' });
      continue;
    }
    const vendor = vendorZeilen(inhalt);
    const kommentar = kommentarZeilen(inhalt);

    for (const v of regel.verboten) {
      const dateiScope = v.dateien || regel.dateien;
      if (!dateiScope.includes(datei)) continue;
      const funde = treffer(inhalt, v.muster);
      for (const f of funde) {
        if (vendor.has(f.zeile)) { vendorAusgeschlossen++; continue; }
        if (kommentar.has(f.zeile)) { kommentarAusgeschlossen++; continue; }
        const erlaubtEintrag = (regel.erlaubt || []).find(e =>
          e.muster && (!e.dateien || e.dateien.includes(datei)) &&
          new RegExp(e.muster.source, e.muster.flags).test(f.text));
        if (erlaubtEintrag) { erlaubtGezaehlt.push({ datei, zeile: f.zeile, beschreibung: erlaubtEintrag.beschreibung }); continue; }
        rotFunde.push({ datei, zeile: f.zeile, fundstelle: f.fundstelle, beschreibung: v.beschreibung });
      }
    }

    if (regel.konstante) {
      const k = pruefeKonstante(inhalt, regel.konstante);
      if (k.fremd.length) {
        rotFunde.push({
          datei, zeile: 0,
          fundstelle: k.fremd.join(', '),
          beschreibung: `${regel.konstante.beschreibung}: Wert(e) ausserhalb der Allowlist`,
        });
      }
    }
  }

  return {
    id: regel.id, titel: regel.titel, status: rotFunde.length ? 'rot' : 'gruen',
    funde: rotFunde, erlaubtGezaehlt, vendorAusgeschlossen, kommentarAusgeschlossen,
  };
}

module.exports = { REPO, commitStand, ladeDatei, vendorZeilen, kommentarZeilen, treffer, pruefeKonstante, pruefeRegel, pruefeNurDurchTest };
