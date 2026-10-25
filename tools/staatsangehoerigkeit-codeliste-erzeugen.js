#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   staatsangehoerigkeit-codeliste-erzeugen.js — die amtliche DESTATIS-Codeliste „Staatsangehörigkeit“ im DE-Rechtsraum-Modul (04.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund PID-NATIONALITIES-FREITEXT (MITTEL): die Staatsangehörigkeit stand als Freitext im Depot und ging so in die PID
   („deutsch“). Entschieden (04.10.2026, Regel „amtliche Inhalte vor eigenen“): Mehrfachauswahl aus der
   amtlichen Liste; die Liste gehört ins Template des deutschen Rechtsraums, nicht ins Gerüst (Variante a, „Gerüst plus
   Templates, keine Länderannahme im Gerüst“). Darum NICHT unter code-listen/ — von dort bettet tools/build-code-listen.js
   jede Liste in den Kern ein. Ziel ist tools/rechtsraum-de-modul.json (das DE-Template aller vier Zusammenstellungen,
   tools/lib/vier-produkte.js): Schlüssel `codeListen` (die Liste) und `felder['identity.nationality']` (die Bindung).

   Quelle: XRepository, urn:de:bund:destatis:bevoelkerungsstatistik:schluessel:staatsangehoerigkeit, Fassung 2026-08-05
   (Genericode). Herausgeber: Statistisches Bundesamt. Nutzung laut DESTATIS-Impressum (Grundregel, weil Liste und
   Bezugsort nichts anderes ausweisen): „Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellennachweis gestattet.“
   DESTATIS schreibt keinen Wortlaut vor (darum kein Eintrag unter code-listen/wortlaut/); der Quellennachweis steht in den
   Feldern `lizenz` und `hinweis` der Liste (dieselben Namen wie in code-listen/*.json) und reist mit ihr im Produkt mit,
   dazu NOTICE.md und docs/fremdquellen.md.

   Übernommen wird nur, was die Liste trägt — kein eigener Eintrag, keine eigene Bezeichnung:
     code        DESTATIS-Schlüssel Staatsangehörigkeit (gespeichert wird dieser Schlüssel)
     anzeigeName die Staatsangehörigkeit als Adjektiv, wörtlich aus der Liste
     iso3166Alpha2  der ISO-3166-1-alpha-2-Code aus der Liste, wo vorhanden (die Liste führt auch XA, XK — ob ein Code für die
                 PID taugt, entscheidet nicht diese Datei, sondern die PID-Abbildung im Kern)
     hinweis     die Spalte „Hinweis“ der Liste (z. B. „Staat“, „eigener Pass“)
     gueltigBis  das Ende eines ehemaligen Staats, wörtlich aus der Liste (die Oberfläche kann ihn kennzeichnen)
     pidSonderwert  NUR für 997 „staatenlos“ (QS) und 998 „ungeklärt“ (QU): welcher Listeneintrag dem Sonderwert der PID
                 entspricht, ist Wissen über DIESE Liste und steht darum im Template, nicht im Kern (der Kern kennt keine
                 DESTATIS-Schlüssel). Quelle der Werte: EUDI PID-Rulebook v1.7 §2.2, Tabelle Z. 105 („QU“ unbekannt,
                 „QS“ ohne Staatsangehörigkeit). 999 „ohne Angabe“ bekommt keinen: „keine Angabe“ ist nicht „unbekannt“.

   Ohne --genericode gilt die Fixture tests/fixtures/destatis-staatsangehoerigkeit-2026-08-05.gc.xml (die gepinnte Datei,
   unverändert; Weitergabe mit Quellennachweis gestattet, s. NOTICE.md) — so prüft die Suite die Drift ohne Netz.
   Aufruf:  node tools/staatsangehoerigkeit-codeliste-erzeugen.js --genericode <pfad>   schreibt Liste und Bindung in tools/rechtsraum-de-modul.json
            node tools/staatsangehoerigkeit-codeliste-erzeugen.js --genericode <pfad> --check   meldet Drift (Exit 1), schreibt nichts
   Die Genericode-Datei wird gegen ihren Pin (SHA-256) geprüft; eine andere Fassung ist ein bewusster Schritt (Pin nachziehen).
   Bezug:   curl -sL https://www.xrepository.de/api/xrepository/urn:de:bund:destatis:bevoelkerungsstatistik:schluessel:staatsangehoerigkeit_2026-08-05:technischerBestandteilGenericode
   Probe:   tests/staatsangehoerigkeit-codeliste.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ZIEL = path.join(REPO, 'tools', 'rechtsraum-de-modul.json');
const SYSTEM_ID = 'destatis-staatsangehoerigkeit';
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'destatis-staatsangehoerigkeit-2026-08-05.gc.xml');
const KENNUNG = 'identity.nationality';
const URN = 'urn:de:bund:destatis:bevoelkerungsstatistik:schluessel:staatsangehoerigkeit';
const FASSUNG = '2026-08-05';
const ANZEIGE_OHNE_BEZEICHNUNG = 'ohne Bezeichnung';   // wörtlicher Spaltenwert der Liste, s. listeBauen
const PID_SONDERWERTE = Object.freeze({ '997': 'QS', '998': 'QU' });   // PID-Rulebook v1.7 §2.2, Z. 105
/* Lesehilfe in einem Nicht-de-Produkt (Gegenlesung, 04.10.2026): jeder Eintrag mit Buchstaben trägt eine. Für einen geltenden
   ISO-Code liefert der Kern sie aus CLDR (Intl.DisplayNames); für alle anderen nennt das Template hier den STRINGS-Schlüssel, dessen
   Text im Sprachmodul steht — ehemalige Staaten nie mit dem CLDR-Namen (CLDR führt YU als „Serbia“). Welche Einträge das sind, folgt
   aus der Liste (kein geltender ISO-Code, gueltigBis oder PID-Sonderwert); die Probe hält, dass die Tabelle genau sie deckt. */
const LESEHILFE_SCHLUESSEL = Object.freeze(Object.fromEntries(['120', '132', '133', '138', '150', '159', '162', '185', '276', '459', '997', '998', '999']
  .map((code) => [code, 'staatsangehoerigkeitLesehilfe' + code])));
const GENERICODE_SHA256 = '1903e4227400e98e6835fc9f14974ef368ff929aa9f6f3c9f4002ec9d22a32be';   // Genericode der Fassung 2026-08-05, abgerufen 04.10.2026 über XRepository

/* Genericode: <Row><Value ColumnRef="…"><SimpleValue>…</SimpleValue></Value>…</Row>. Leere Werte fehlen als Element —
   darum wird über ColumnRef zugeordnet, nie über die Reihenfolge. */
function zeilenLesen(xml) {
  const ent = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const zeilen = [];
  for (const r of xml.matchAll(/<Row>([\s\S]*?)<\/Row>/g)) {
    const z = {};
    for (const v of r[1].matchAll(/<Value\s+ColumnRef="([^"]+)"\s*>\s*<SimpleValue>([\s\S]*?)<\/SimpleValue>\s*<\/Value>/g)) z[v[1]] = ent(v[2]).trim();
    zeilen.push(z);
  }
  return zeilen;
}

function listeBauen(xml) {
  const daten = zeilenLesen(xml)
    .filter((z) => z['DESTATIS-Schluessel-Staatsangehoerigkeit'] && z.Staatsangehoerigkeit)
    .map((z) => {
      /* Angezeigt wird die Spalte „Staatsangehoerigkeit“ — mit einer Ausnahme (Entscheidung vom 20.10.2026): wo sie
         wörtlich „ohne Bezeichnung“ führt (in der Fassung 2026-08-05 nur Code 459), steht die amtliche Spalte „Staatsname-kurz“ derselben
         Zeile („Palästinensische Gebiete“). Eine Auswahl, die „ohne Bezeichnung“ zeigt, sagt der Person nichts; eine eigene Bezeichnung
         gibt es nicht. Probe: tests/staatsangehoerigkeit-codeliste.test.js. */
      const ohneBezeichnung = z.Staatsangehoerigkeit === ANZEIGE_OHNE_BEZEICHNUNG && z['Staatsname-kurz'];
      const e = { code: z['DESTATIS-Schluessel-Staatsangehoerigkeit'], anzeigeName: ohneBezeichnung ? z['Staatsname-kurz'] : z.Staatsangehoerigkeit };
      if (z['ISO-2'] && /^[A-Z]{2}$/.test(z['ISO-2'])) e.iso3166Alpha2 = z['ISO-2'];
      if (z.Hinweis && z.Hinweis !== '–') e.hinweis = z.Hinweis;
      // Ehemalige Staaten stehen in der Liste mit Existenz-bis; übernommen wird das Datum wörtlich, nicht gestrichen.
      if (z['Existenz-bis'] && /^\d{4}-\d{2}-\d{2}$/.test(z['Existenz-bis'])) e.gueltigBis = z['Existenz-bis'];
      if (PID_SONDERWERTE[e.code]) e.pidSonderwert = PID_SONDERWERTE[e.code];
      if (LESEHILFE_SCHLUESSEL[e.code]) e.lesehilfeSchluessel = LESEHILFE_SCHLUESSEL[e.code];
      return e;
    })
    .sort((a, b) => a.code.localeCompare(b.code));
  return {
    systemId: SYSTEM_ID,
    uri: URN,
    version: FASSUNG,
    kuerzel: 'Staatsangehörigkeit (DESTATIS)',
    lizenz: '© Statistisches Bundesamt (Destatis), 2026. Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellennachweis gestattet (DESTATIS-Impressum, Grundregel; die XRepository-Angabe „Lizenz“ ist leer, der Bezugsort weist nichts anderes aus).',
    status: 'aktiv',
    hinweis: 'Quelle: Statistisches Bundesamt (Destatis), Codeliste Staatsangehörigkeit der Staats- und Gebietssystematik, Fassung ' + FASSUNG + ', bezogen über XRepository (' + URN + '). Gespeichert wird der DESTATIS-Schlüssel; iso3166Alpha2 nur, wo die Liste ihn führt. Gehört ins Template des deutschen Rechtsraums.',
    daten,
  };
}

function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

function main(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--genericode');
  const quelle = i >= 0 ? argv[i + 1] : FIXTURE;
  if (!quelle || !fs.existsSync(quelle)) { console.error('Abbruch: --genericode <pfad> fehlt oder ist nicht vorhanden (Bezug siehe Kopf dieser Datei).'); return 2; }
  const roh = fs.readFileSync(quelle);
  const pin = PIN.genericodeSha256;
  if (sha256(roh) !== pin) { console.error('Abbruch: die Genericode-Datei ist nicht die gepinnte Fassung ' + FASSUNG + ' (SHA-256 ' + sha256(roh).slice(0, 12) + '…, erwartet ' + pin.slice(0, 12) + '…).'); return 1; }
  const modul = JSON.parse(fs.readFileSync(ZIEL, 'utf8'));
  const neu = JSON.stringify(modulMitListe(modul, listeBauen(roh.toString('utf8'))), null, 2) + '\n';
  const alt = fs.readFileSync(ZIEL, 'utf8');
  if (argv.includes('--check')) {
    if (alt !== neu) { console.error('Drift: tools/rechtsraum-de-modul.json trägt nicht die Staatsangehörigkeitsliste der Genericode-Fassung ' + FASSUNG + '.'); return 1; }
    console.log('tools/rechtsraum-de-modul.json trägt die Staatsangehörigkeitsliste der Genericode-Fassung ' + FASSUNG + '.');
    return 0;
  }
  fs.writeFileSync(ZIEL, neu);
  console.log('geschrieben: tools/rechtsraum-de-modul.json (codeListen ' + SYSTEM_ID + ', ' + JSON.parse(neu).codeListen.find((l) => l.systemId === SYSTEM_ID).daten.length + ' Einträge, Fassung ' + FASSUNG + '; Bindung ' + KENNUNG + ')');
  return 0;
}

/* Rein: das Modul mit genau dieser Liste in `codeListen` (ersetzt eine gleichnamige, lässt andere stehen) und der Bindung
   in `felder`. Alle übrigen Schlüssel des Moduls bleiben unverändert und in ihrer Reihenfolge. */
function modulMitListe(modul, liste) {
  const aus = Object.assign({}, modul);
  const andere = Array.isArray(modul.codeListen) ? modul.codeListen.filter((l) => l && l.systemId !== liste.systemId) : [];
  aus.codeListen = andere.concat([liste]);
  aus.felder = Object.assign({}, modul.felder || {}, { [KENNUNG]: { codeListe: liste.systemId, mehrfach: true } });
  return aus;
}

const PIN = { genericodeSha256: GENERICODE_SHA256 };

if (require.main === module) process.exit(main());
module.exports = { zeilenLesen, listeBauen, modulMitListe, main, URN, FASSUNG, PIN, SYSTEM_ID, KENNUNG, FIXTURE, PID_SONDERWERTE, LESEHILFE_SCHLUESSEL };
