#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   build-textsatz-eingebaut-lesen.js — die Lese-App erkennt ihre EIGENEN
   Beschriftungen als übersetzbar (55s Fund, Auftrag, 07.09.2026).
   ────────────────────────────────────────────────────────────────────────
   GEMESSEN (Peer 55, im Browser, nicht vermutet): ein Depot mit aktivem
   englischem Textsatz-Modul zeigt in der Lese-App weiterhin deutsche Sektor-
   und Feld-Beschriftungen. Zwei Ursachen, beide nötig für den vollen Fix:

   URSACHE 1 — DER FILTER: `_textsatzKennungBekannt()` in vivodepot-lesen.html
   akzeptierte bislang nur zwei Kennung-Formen: `<dockedBereichId>.label`
   (U2-ADR-334) und `strings:<schluessel>.text` (die eigene, kleine
   `_STRINGS_EINGEBAUT`-Tabelle). Jede Kennung der Form `<sektorId>.label`,
   `<sektorId>#<sektionId>.label` oder `<sektorId>.<feldId>.label` — also
   praktisch jede reale Sektor-/Feld-Beschriftung — fiel durch: nicht weil
   sie verboten wäre, sondern weil die Lese-App KEINEN Tisch führt, an dem
   sie als „bekannt" erkannt werden könnte. Der Kern führt diesen Tisch
   (`AB_WERK_TEXTSATZ_DE.texte`) und akzeptiert eine Modul-Kennung, wenn sie DORT
   bereits als Schlüssel steht (vivodepot.html, `_textsatzTexteUebernehmen`,
   `Object.prototype.hasOwnProperty.call(AB_WERK_TEXTSATZ_DE.texte, kennung)`) — DAS
   fehlte hier vollständig.

   U2-ADR-334s RIEGEL IST KEIN WIDERSPRUCH, SONDERN EINE ANDERE FRAGE: der
   Riegel („ein Modul beschriftet nur den Bereich, den es selbst mitgebracht
   hat — niemals identitaet, gesundheit, vorsorge") verhindert, dass ein
   Modul eine NEUE `<eingebaute-id>.label`-Kennung ERFINDET (einen fremden
   Bereichsnamen kapert). Er verhindert NICHT, eine BEREITS BEKANNTE Kennung
   zu ÜBERSETZEN — genau das ist der erste, im Kern längst bestehende Zweig
   der Prüfung. Diese Tabelle hier ist die Lese-App-Entsprechung von
   `AB_WERK_TEXTSATZ_DE.texte` — sie ÖFFNET keinen neuen Namensraum, sie macht nur
   sichtbar, welche Kennungen die Lese-App selbst schon als „ihre eigenen"
   führt (dieselben, die vorher als Rohtext im Code standen). Der Riegel
   (`_istBereichLabelKennungLesen`, U2-ADR-334) bleibt unverändert bestehen
   und wird von diesem Zug nicht berührt.

   URSACHE 2 — DIE RENDERING-FUNKTIONEN: `sektorHTML()`/`feldZeileHTML()`
   lasen `sek.label`/`sektion.label`/`feld.label` ROH aus `SEKTOR_BY_ID`,
   ohne je `textLesen()` aufzurufen — selbst ein korrekt registriertes Modul
   hätte am Bildschirm nichts geändert. Behoben in vivodepot-lesen.html
   direkt an den beiden Stellen (nicht Teil dieses Werkzeugs).

   BEANTWORTET U2-ADR-141 (17.08.2026), OFFENE FRAGE 3: „Ob die Lese-App aus
   demselben Satz lesen soll. Heute trägt sie eine eigene Kopie. Die Frage
   ist eine Architekturfrage über zwei Anwendungen, keine Textfrage." Antwort:
   NEIN, keine gemeinsame Laufzeit-Quelle (die Lese-App hat kein ladeKern()),
   aber JA zum wörtlichen Spiegel — derselbe Kennungsraum, ERZEUGT statt
   getippt, damit ein Modul, das der Kern versteht, auch die Lese-App
   versteht. Dasselbe Muster wie U2-ADR-166 („Spiegel statt Umbau der
   bestehenden Struktur").

   WARUM ERZEUGT UND NICHT VON HAND (07.09.2026): 310 Kennungen (13
   Sektoren + 27 Sektionen + 270 Felder) von Hand abzutippen ist exakt die
   Bauform, die die 41 zurückgehaltenen sensiblen Felder aus U2-ADR-347
   erzeugt hat — eine Kopie, bei der eine Markierung nicht mitkommt. Der
   Aufwand eines Erzeugers wächst nicht mit der Zahl der Kennungen; eine
   Handtabelle würde es lautlos tun.

   NUR LABEL, KEINE HINTS: die Lese-App fragt (heute) nur `label`-Kennungen
   ab (`sektorHTML`, `feldZeileHTML`, `situationModell` via Sektor-Referenzen)
   — kein Konsument liest je einen `.hint` an dieser Stelle. Eine `.hint`-Zeile
   wäre angenommen und wirkungslos (dieselbe Zurückhaltung wie bei
   `_istModulfeldKennung`s Rollen-Liste im Kern). Kommt ein Konsument dazu,
   wird die Art hier ergänzt — nicht vorsorglich.

   Aufruf:
     node tools/build-textsatz-eingebaut-lesen.js            → schreibt die Region
     node tools/build-textsatz-eingebaut-lesen.js --check    → schreibt nichts, meldet Drift (Exit 1)
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const LESEN = path.join(REPO, 'vivodepot-lesen.html');
const BEGIN = '/* TEXTSATZ_EINGEBAUT_LESEN:BEGIN — generierter Bereich (tools/build-textsatz-eingebaut-lesen.js); Quelle: vivodepot.html SEKTOREN (ladeKern) */';
const ENDE = '/* TEXTSATZ_EINGEBAUT_LESEN:END */';

/* Die drei Kennung-Formen, die die Lese-App tatsächlich rendert — wörtlich dieselbe Form wie
   im Kern (AB_WERK_TEXTSATZ_DE.texte), nur die LABEL-Zeilen daraus. `kennungAusSelektor` ist derselbe
   Kern-Helfer, den auch tools/build-feldkatalog.js schon verwendet — kein zweiter Kennungs-Bauer. */
function kennungenAusKern() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  /* Kampagne „eine Leseart statt dreiundvierzig", Zug 1 (09.09.2026) — `bereicheAlle()`
     statt der Bündel-Liste. Ein AB WERK gesäter Bereich steht nicht im Bündel; wer es liest,
     lässt seine Rubriken, Sektionen und Felder aus dieser Tabelle fallen. Die Lese-App kennt
     sie dann nicht als übersetzbar und zeigt für genau diesen einen Bereich weiter Deutsch —
     still, ohne Fehler. `bereicheAlle()` führt Bündel und Registry zusammen. */
  const bereiche = V.bereicheAlle();
  if (!Array.isArray(bereiche) || !bereiche.length) {
    throw new Error('bereicheAlle() im Kern nicht gefunden oder leer — Form geändert? Nicht raten, nachsehen.');
  }
  const raus = {};
  for (const s of bereiche) {
    if (!s || !s.id) throw new Error('Bereichs-Eintrag ohne id im Kern-Bestand — Form geändert? Nicht raten, nachsehen.');
    raus[s.id + '.label'] = s.label;
    for (const sek of (s.sektionen || [])) {
      if (!sek || !sek.id) throw new Error('Sektion ohne id in Sektor "' + s.id + '" — Form geändert? Nicht raten, nachsehen.');
      raus[s.id + '#' + sek.id + '.label'] = sek.label;
      for (const f of (sek.felder || [])) {
        const kennung = V.kennungAusSelektor(s.id, f.id);
        if (!kennung) continue;   // abgeleitete Zeilen tragen keine Kennung, wie build-feldkatalog.js
        raus[kennung + '.label'] = f.label;
        /* Optionen und Listen-Unterfelder (Lese-App zeigt Auswahlwerte als Klartext-Label, `_optionLabelLesen`).
           Sensibilität entscheidet die Lese-App zur Laufzeit (Nutzer-Markierung), darum steht jede Option hier;
           die Beschriftung eines Unterfelds nur, wenn sie angezeigt wird: bei ja/nein-Optionen. */
        for (const o of (f.optionen || [])) {
          if (o && typeof o.wert === 'string') raus[s.id + '.' + f.id + '/' + o.wert + '.label'] = o.label;
        }
        for (const u of (f.unterFelder || [])) {
          if (!u || typeof u.id !== 'string') continue;
          const optionen = (u.optionen || []).filter((o) => o && typeof o.wert === 'string');
          if (optionen.some((o) => /^(ja|nein)$/i.test(String(o.label)))) raus[s.id + '.' + f.id + '/' + u.id + '.label'] = u.label;
          for (const o of optionen) raus[s.id + '.' + f.id + '/' + u.id + '/' + o.wert + '.label'] = o.label;
        }
      }
    }
    if (typeof s.einfuehrungstext === 'string' && s.einfuehrungstext.trim()) raus[s.id + '.einfuehrungstext'] = s.einfuehrungstext;
  }
  return raus;
}

function region(kennungen) {
  return [
    BEGIN,
    '/* Wörtlicher Auszug aus AB_WERK_TEXTSATZ_DE.texte im Kern — nur die Kennung-Formen, die die',
    '   Lese-App rendert: Sektor-Label (<id>.label), Sektions-Label (<sektorId>#<sektionId>.label),',
    '   Feld-Label (<sektorId>.<feldId>.label), Optionen (<sektorId>.<feldId>[/<unterfeld>]/<wert>.label),',
    '   ja/nein-Unterfeld-Label (<sektorId>.<feldId>/<unterfeld>.label), Einführungstext (<id>.einfuehrungstext).',
    '   Der SCHLÜSSELRAUM ist der Zweck dieser Tabelle —',
    "   `_textsatzKennungBekannt()` fragt nur `hasOwnProperty`, die Werte sind das deutsche",
    '   Original als Beleg, nicht als eigener Konsument. */',
    'const TEXTSATZ_EINGEBAUT_LESEN = Object.freeze(' + JSON.stringify(kennungen, null, 2) + ');',
    ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('TEXTSATZ_EINGEBAUT_LESEN-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function main() {
  const check = process.argv.includes('--check');
  const kennungen = kennungenAusKern();
  console.log('build-textsatz-eingebaut-lesen: ' + Object.keys(kennungen).length + ' Kennungen aus dem Kern gelesen.');
  const neuRegion = region(kennungen);
  const q = fs.readFileSync(LESEN, 'utf8');
  const neu = regionErsetzen(q, neuRegion, path.basename(LESEN));
  if (neu === q) {
    console.log('build-textsatz-eingebaut-lesen: kein Drift — die Lese-App kennt dieselben Kennungen wie der Kern.');
    return;
  }
  if (check) {
    console.error('build-textsatz-eingebaut-lesen: DRIFT — vivodepot-lesen.html (TEXTSATZ_EINGEBAUT_LESEN-Region)');
    console.error('  Abhilfe: node tools/build-textsatz-eingebaut-lesen.js');
    process.exit(1);
  }
  fs.writeFileSync(LESEN, neu);
  console.log('build-textsatz-eingebaut-lesen: Region geschrieben.');
}

if (require.main === module) main();
module.exports = { kennungenAusKern, region, regionErsetzen, BEGIN, ENDE, KERN, LESEN };
