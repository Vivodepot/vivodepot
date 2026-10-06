'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter — ein Kalendertag für Menschen ist LOKAL, nicht UTC
   ────────────────────────────────────────────────────────────────────────
   DIE REGEL. `new Date().toISOString().slice(0,10)` liefert den Kalendertag
   in UTC. Berlin liegt auf UTC+2 — zwischen 00:00 und 02:00 Ortszeit ist das
   der VORTAG. Wandert dieser Wert in ein gespeichertes Feld, trägt das Depot
   ein falsches Datum, und niemand merkt es je.

   ZWEI ZEUGEN, also eine Klasse:
     · Geräterunde v76: die Datums-Validierung rechnete die „heute"-Grenze in
       UTC; nachts 0–2 Uhr galt der heutige Tag als Zukunft und wurde beim
       Speichern abgelehnt.
     · 26.07.: der frisch gebaute BUILD_DATUM-Wächter verglich ein lokales
       Kalenderdatum gegen einen UTC-Zeitpunkt und hätte einen korrekten Wert
       als „in der Zukunft" verworfen.

   WAS ERLAUBT BLEIBT — und warum die Ausnahmen BENANNT und GEZÄHLT sind:
   `toISOString()` ist nicht falsch, es ist nur für den falschen Zweck falsch.
   Reine Kalender-Arithmetik in UTC (Date.UTC hinein, toISOString heraus) ist
   symmetrisch und gegen Sommerzeit immun — dort wäre die lokale Fassung der
   Fehler. Jede Ausnahme steht darum mit ihrer Begründung in ERLAUBT, und die
   Liste wird auf Gleichheit geprüft: sie kann nur bewusst wachsen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { verortungOderWirf } = require('../tools/lib/verortung.js');

const REPO = path.join(__dirname, '..');
const KERN_ROH = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

const MUSTER = /toISOString\(\)\s*\.\s*slice\(0,\s*10\)/g;

/* Kommentare ausblenden, LÄNGE erhalten — sonst verschieben sich alle Zeilennummern
   und jede Meldung zeigt auf die falsche Stelle.
   Der Grund: ein Wächter, der Prosa mitliest, meldet den Kommentar, der ihn erklärt.
   Genau das ist beim ersten Lauf passiert (`setupMasterSession() bei :2744` — in
   Wahrheit der Kommentarblock über heuteLokal). Dieselbe Zu-breit-Klasse, die der
   Zusicherungs-Scanner am 25.07. mit dem Z8-Falsch-Positiv hatte.
   Bewusst konservativ: Vorkommen in String-Literalen werden WEITER geprüft — lieber
   ein Falsch-Positiv, das jemand ansieht, als ein Falsch-Negativ, das niemand sieht. */
// ⚠ Zeilenumbrüche MÜSSEN erhalten bleiben. Die erste Fassung ersetzte jeden
// Kommentar durch gleich viele Leerzeichen — Zeichenzahl stimmte, Zeilenzahl nicht,
// und jede gemeldete Zeilennummer zeigte auf unbeteiligten Code. Der Wächter meldete
// damit einen Fund, den er nie angesehen hatte (§3.5c: eine Messung, die etwas
// findet, wonach sie nicht gesehen hat). Aufgefallen erst beim Nachschlagen der
// gemeldeten Stelle — nicht am Diff.
const leerBis = (s) => s.replace(/[^\n]/g, ' ');
function ohneKommentare(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, leerBis)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + leerBis(m.slice(p1.length)))
    .replace(/<!--[\s\S]*?-->/g, leerBis);
}

/** Name der Funktion, in der eine Fundstelle sitzt (nächste `function X(` davor). */
function funktionUm(text, pos) {
  const davor = text.slice(0, pos);
  const treffer = [...davor.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  return treffer.length ? treffer[treffer.length - 1][1] : '(oberste Ebene)';
}

// Der gescannte Text: Code ohne Kommentar-Prosa, Laengen und damit Zeilennummern intakt.
const KERN = ohneKommentare(KERN_ROH);

/* Benannte, gezählte Ausnahmen — je Funktion EIN Grund. */
const ERLAUBT = {
  _erDatumPlusMonate:
    'reine Kalender-Arithmetik: Date.UTC hinein, toISOString heraus. Symmetrisch und ' +
    'sommerzeitfest — eine lokale Fassung waere hier der Fehler.',
  _basisAblaufFaellig:
    'Rueckgabe eines GESPEICHERTEN ISO-Datums: `new Date(ablaufISO)` verankert auf ' +
    'UTC-Mitternacht, toISOString gibt exakt denselben Tag zurueck. Kein „heute" im Spiel.',
  notvertretungAblaufText:
    'dito: `new Date(roh + "T00:00:00Z")` plus setUTCMonth(+6). Der Tag stammt aus dem ' +
    'Depot, nicht aus der Systemzeit; der Rundgang ist verlustfrei.',
  // W-7, Zug 3 („W-7 und W-12", 09.08.2026) — dieselbe Begruendung wie
  // notvertretungAblaufText: reine Kalender-Arithmetik auf einem GESPEICHERTEN Bezugsdatum
  // (Sterbedatum/Kenntnisdatum/Geburtsdatum/Bescheiddatum), kein „jetzt" im Ein- oder Ausgang.
  _fristPlusWochen:
    'dito: `new Date(roh + "T00:00:00Z")` plus setUTCDate(+n*7). Der Tag stammt aus dem ' +
    'Depot, nicht aus der Systemzeit; der Rundgang ist verlustfrei.',
  _fristPlusMonate:
    'dito: `new Date(roh + "T00:00:00Z")` plus setUTCMonth(+n). Der Tag stammt aus dem ' +
    'Depot, nicht aus der Systemzeit; der Rundgang ist verlustfrei.',
  _fristPlusWerktage:
    'dito: `new Date(roh + "T00:00:00Z")` plus taegliches setUTCDate(+1) mit Sa/So-Ueberspringen. ' +
    'Der Tag stammt aus dem Depot, nicht aus der Systemzeit; der Rundgang ist verlustfrei.',
};

/* ── 1 · DER WÄCHTER ──────────────────────────────────────────────────── */
test('[Kalendertag] kein toISOString().slice(0,10) ausserhalb der benannten Ausnahmen', () => {
  // Jeder Fund fuehrt seine VERORTUNG mit und laesst sie pruefen: die gemeldete
  // Zeile muss das gemeldete Muster wirklich tragen. Am 27.07. tat sie das nicht —
  // das Kommentar-Ausblenden fraß Zeilenumbrueche, und jede Meldung zeigte auf
  // unbeteiligten Code, waehrend alle Kontrollen gruen liefen.
  const funde = [];
  for (const m of KERN.matchAll(MUSTER)) {
    const fn = funktionUm(KERN, m.index);
    if (ERLAUBT[fn]) continue;
    funde.push({ datei: 'vivodepot.html', zeile: KERN.slice(0, m.index).split('\n').length,
                 muster: 'toISOString', fn });
  }
  verortungOderWirf(funde, { wurzel: REPO });
  const verstoesse = funde.map(f => `${f.fn}() bei :${f.zeile}`);
  assert.deepEqual(verstoesse, [],
    'Ein Kalendertag fuer Menschen ist LOKAL. Diese Stellen nehmen UTC und liegen zwischen ' +
    '00:00 und 02:00 Ortszeit einen Tag daneben:\n  ' + verstoesse.join('\n  ') +
    '\nEntweder auf heuteLokal() umstellen, oder mit Begruendung in ERLAUBT aufnehmen.');
});

test('[Kalendertag] die Ausnahmeliste ist vollstaendig belegt — kein toter Eintrag', () => {
  // Eine Ausnahme, die es im Code nicht mehr gibt, ist eine Erlaubnis ohne Fall:
  // sie waechst still weiter und deckt beim naechsten Umbau etwas Fremdes.
  const vorhanden = new Set([...KERN.matchAll(MUSTER)].map(m => funktionUm(KERN, m.index)));
  const tot = Object.keys(ERLAUBT).filter(fn => !vorhanden.has(fn));
  assert.deepEqual(tot, [], 'Ausnahme(n) ohne Fundstelle im Code — streichen: ' + tot.join(', '));
});

/* ── 2 · POSITIVKONTROLLE (§3.5b) ─────────────────────────────────────── */
test('[Kalendertag·Positivkontrolle] eine eingebaute Stelle macht den Waechter rot', () => {
  // Der Fehler wird AN DER GRENZE eingebaut, an der der Waechter arbeitet: eine
  // neue Fundstelle in einer Funktion, die nicht in ERLAUBT steht.
  const kaputt = KERN.replace(
    'function _erDatumPlusMonate(',
    'function _erfundeneStelle() { return new Date().toISOString().slice(0, 10); }\n  function _erDatumPlusMonate('
  );
  assert.notEqual(kaputt, KERN, 'die Mutation muss greifen — sonst prueft die Kontrolle nichts');

  // Gegen die BASIS vergleichen, nicht absolut: solange der Bestand noch eigene
  // Verstoesse traegt, faerbte ein absoluter Vergleich die Kontrolle rot, ohne dass
  // sie etwas ueber die Mutation aussagt — und nach dem Aufraeumen waere sie gruen,
  // ohne dass sich am Mechanismus etwas geaendert haette. Gezaehlt wird nur, was
  // DIESE Mutation neu erzeugt.
  const unerlaubte = (text) => [...text.matchAll(MUSTER)]
    .map(m => funktionUm(text, m.index)).filter(fn => !ERLAUBT[fn]);
  const basis = unerlaubte(KERN);
  const neue = unerlaubte(kaputt).filter(fn => !basis.includes(fn));
  assert.deepEqual(neue, ['_erfundeneStelle'],
    'Der Waechter muss GENAU die eingebaute Stelle melden — nicht keine, und nicht irgendeine andere.');
});

test('[Kalendertag·Negativkontrolle] eine erlaubte Stelle macht ihn NICHT rot', () => {
  const harmlos = KERN.replace(
    'function _erDatumPlusMonate(',
    'function _basisAblaufFaellig_zweit() { return new Date().toISOString().slice(0, 10); }\n  function _erDatumPlusMonate('
  );
  const gefunden = [...harmlos.matchAll(MUSTER)]
    .map(m => funktionUm(harmlos, m.index)).filter(fn => !ERLAUBT[fn]);
  // Die neue Funktion heisst ANDERS als die Ausnahme — sie MUSS gefangen werden.
  // Das belegt, dass die Liste auf exakte Namen greift und nicht auf Praefixe.
  assert.ok(gefunden.includes('_basisAblaufFaellig_zweit'),
    'Die Ausnahmeliste darf nicht auf Praefixe greifen — sonst deckt ein aehnlicher Name still mit.');
});

/* ── 3 · DIE KOPIE GLEICH HALTEN ──────────────────────────────────────── */
test('[Kalendertag] heuteLokal() in vivodepot.html ist die BENANNTE Kopie aus dem Kern', () => {
  // vivodepot.html ist eine Single-File-App ohne Bauschritt — sie kann
  // scripts/build-datum-kern.js nicht importieren. Die Kopie ist unvermeidbar;
  // was vermeidbar ist, ist ihr Auseinanderlaufen. Dieselbe Lage wie bei
  // CRYPTO_VERSION_AKTUELL, das in sechs Dateien als eigenes Literal liegt.
  const kernQuelle = fs.readFileSync(path.join(REPO, 'scripts/build-datum-kern.js'), 'utf8');
  const rumpf = (text) => {
    const m = /function heuteLokal\(d = new Date\(\)\) \{([\s\S]*?)\n\}/.exec(text);
    return m ? m[1].replace(/\s+/g, ' ').trim() : null;
  };
  const a = rumpf(kernQuelle), b = rumpf(KERN_ROH);
  assert.ok(a, 'heuteLokal() in scripts/build-datum-kern.js gefunden');
  assert.ok(b, 'heuteLokal() in vivodepot.html gefunden — die Kopie fehlt');
  assert.equal(b, a,
    'Die zwei Fassungen von heuteLokal() sind auseinandergelaufen. Sie muessen zeichengleich ' +
    'bleiben; wer eine aendert, aendert beide.');
});

/* ── 4 · DAS FENSTER, an dem es sich entscheidet ──────────────────────── */
test('[Kalendertag·Fenster] 22:30Z ist in Berlin bereits der Folgetag', () => {
  const heuteLokal = (d) => [d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')].join('-');

  const nachts = new Date('2026-07-27T22:30:00Z');
  assert.equal(nachts.toISOString().slice(0, 10), '2026-07-27', 'UTC sagt: der 27.');
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Berlin') {
    assert.equal(heuteLokal(nachts), '2026-07-28', 'lokal ist es der 28. — genau die Divergenz');
  }
  // Negativkontrolle: ein Helfer, der einfach einen Tag addiert, waere hier auch
  // „richtig" — mittags entlarvt ihn der Vergleich.
  const mittags = new Date('2026-07-27T12:00:00Z');
  assert.equal(heuteLokal(mittags), '2026-07-27',
    'Mittags stimmen lokal und UTC ueberein — ein „plus ein Tag"-Helfer faellt hier durch.');
});

/* ════════════════════════════════════════════════════════════════════════
   5 · DIE LESESEITE — der zweite Verbotssatz
   ────────────────────────────────────────────────────────────────────────
   Die Schreibseite (oben) verbietet, einen Kalendertag über UTC aus der
   Systemzeit abzuleiten. Sie deckt den Fund vom 27.07. NICHT — und richtig
   so: dort steht ein voller `toISOString()` OHNE `slice`, und als
   gespeicherter Zeitpunkt ist der korrekt.

   Der Fehler sitzt eine Ebene weiter, beim RENDERN: `datumKurz` schnitt mit
   einem Präfix-Muster den UTC-Tag aus dem Zeitstempel. Um 00:30 Ortszeit
   zeigte die Notfall-Sicht damit den Vortag — der Vertrauensperson im
   Ernstfall, für die das Feld genau eine Frage beantwortet: wie frisch ist
   das hier.

   REGEL: Ein voller Zeitstempel wird GEPARST und lokal formatiert, nie
   geschnitten. Verboten sind darum die Zeichen-Operationen auf ISO-Strings —
   `split('T')[0]`, `substring(0,10)`, und das Zusammensetzen aus Captures
   eines ISO-Präfix-Musters.

   Die Verhaltensprobe darunter ist der eigentliche Wächter; das Formverbot
   ist die Stolperdraht davor.
   ════════════════════════════════════════════════════════════════════════ */

const LESE_MUSTER = [
  { name: "split('T')[0]", re: /\.split\(\s*['"]T['"]\s*\)\s*\[\s*0\s*\]/g },
  { name: 'substring(0,10)', re: /\.substring\(\s*0\s*,\s*10\s*\)/g },
  { name: 'Captures eines ISO-Musters zusammengesetzt',
    // Bewusst NICHT an den Variablennamen gebunden: sonst weicht man dem Verbot
    // durch Umbenennen aus, und der Waechter waere ein Hoeflichkeitsabkommen.
    re: /\w+\[3\]\s*\+\s*['"]\.['"]\s*\+\s*\w+\[2\]/g },
];

/* Je Datei eine benannte, gezählte Ausnahmeliste. Leer heisst: hier ist nichts
   erlaubt, und das ist eine gemessene Aussage, keine Lücke. */
const DATUMKURZ_GRUND =
  'Der Zusammenbau steht AUSSCHLIESSLICH im Zweig fuer einen bereits gespeicherten ' +
  'Kalendertag (`^\\d{4}-\\d{2}-\\d{2}$`, mit Anker). Dort ist er richtig: ein Tag ohne ' +
  'Uhrzeit darf keine Zone sehen. Der Zeitstempel-Zweig parst und formatiert lokal. ' +
  'Belegt durch die Verhaltensprobe darunter — die Form-Ausnahme ist der Stolperdraht, ' +
  'die Probe ist der Waechter.';

const LESE_ERLAUBT = {
  'vivodepot.html':       { datumKurz: DATUMKURZ_GRUND, _datumDeutsch: DATUMKURZ_GRUND },
  'vivodepot-lesen.html': { datumKurz: DATUMKURZ_GRUND, _datumDeutsch: DATUMKURZ_GRUND },
  'vivodepot-studio.html': {},
  'vivodepot-vc-issuer.html': {},
  /* `vivodepot-STARTSEITE.html` stand hier bis 17.08.2026 und ist mit der Datei entfallen
     („Die abgeloeste Farbe", Zug 1b). Der Eintrag musste ZUERST weg und die Datei
     danach: eine Probe, die eine geloeschte Datei liest, wirft beim Lesen — das Entfernen in
     der anderen Reihenfolge waere ein Eingriff in die Pruefebene gewesen, kein Aufraeumen.
     Die Liste deckt seither die VIER ausgelieferten Anwendungen; eine fuenfte gibt es nicht. */
};

test('[Kalendertag·Leseseite] kein Kalendertag per Zeichen-Operation aus einer ISO-Zeichenkette', () => {
  const funde = [];
  for (const datei of Object.keys(LESE_ERLAUBT)) {
    const roh = fs.readFileSync(path.join(REPO, datei), 'utf8');
    const text = ohneKommentare(roh);
    for (const mus of LESE_MUSTER) {
      mus.re.lastIndex = 0;
      for (const t of text.matchAll(mus.re)) {
        const fn = funktionUm(text, t.index);
        if (LESE_ERLAUBT[datei][fn]) continue;
        funde.push({ datei, zeile: text.slice(0, t.index).split('\n').length,
                     muster: /\[3\]|split|substring/, fn, art: mus.name });
      }
    }
  }
  verortungOderWirf(funde, { wurzel: REPO });
  const verstoesse = funde.map(f => `${f.datei}:${f.zeile} ${f.fn}() — ${f.art}`);
  assert.deepEqual(verstoesse, [],
    'Ein voller Zeitstempel wird GEPARST und lokal formatiert, nicht geschnitten:\n  ' +
    verstoesse.join('\n  '));
});

/* ── Die Verhaltensprobe: sie muss den Fund vom 27.07. fangen ──────────── */
function ladeFunktion(datei, name) {
  const src = fs.readFileSync(path.join(REPO, datei), 'utf8');
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}', 'm');
  const m = re.exec(src);
  assert.ok(m, `${name}() in ${datei} gefunden`);
  return new Function(m[0] + '; return ' + name + ';')();
}

for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
  test(`[Kalendertag·Leseseite] datumKurz in ${datei} formatiert einen Zeitstempel LOKAL`, () => {
    const datumKurz = ladeFunktion(datei, 'datumKurz');

    // Negativkontrolle: ein GESPEICHERTER Kalendertag bleibt unveraendert.
    // Ihn durch new Date() zu schicken waere der Fehler — westlich von Greenwich
    // schoebe das den Tag zurueck.
    assert.equal(datumKurz('2026-07-27'), '27.07.26',
      'Ein gespeicherter Kalendertag darf NICHT durch eine Zeitzone laufen.');

    // Positivkontrolle: DER FUND. 22:30Z ist in Berlin bereits der Folgetag.
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Berlin') {
      assert.equal(datumKurz('2026-07-27T22:30:00.000Z'), '28.07.26',
        'Ein Zeitstempel muss LOKAL gelesen werden. Geschnitten ergaebe er den 27. — ' +
        'genau der Fund vom 27.07.: die Notfall-Sicht zeigte der Vertrauensperson ' +
        'ein Stand-Datum, das einen Tag alt war.');
    }
  });
}

test('[Kalendertag·Leseseite] keine tote Ausnahme in den Leseseiten-Listen', () => {
  // Eine Erlaubnis ohne Fall waechst still weiter und deckt beim naechsten Umbau
  // etwas Fremdes. Dieselbe Pruefung wie fuer die Schreibseite.
  const tot = [];
  for (const datei of Object.keys(LESE_ERLAUBT)) {
    const text = ohneKommentare(fs.readFileSync(path.join(REPO, datei), 'utf8'));
    const vorhanden = new Set();
    for (const mus of LESE_MUSTER) {
      mus.re.lastIndex = 0;
      for (const t of text.matchAll(mus.re)) vorhanden.add(funktionUm(text, t.index));
    }
    for (const fn of Object.keys(LESE_ERLAUBT[datei])) {
      if (!vorhanden.has(fn)) tot.push(`${datei}: ${fn}`);
    }
  }
  assert.deepEqual(tot, [], 'Ausnahme(n) ohne Fundstelle — streichen: ' + tot.join(', '));
});

/* ── Die Falle vom 27.07., als stehende Probe ──────────────────────────────
   Nicht die Reparatur wird gepinnt, sondern dass die Verortungs-Prüfung sie
   FÄNGT. Ohne diese Probe bliebe „wir haben es gefixt" eine Behauptung: die
   Positiv- und Negativkontrollen liefen an dem Tag alle grün, während jede
   gemeldete Zeile auf unbeteiligten Code zeigte. */
test('[Kalendertag·Verortung] das Umbruch-fressende Ausblenden wird als WERKZEUG-Fehler gefangen', () => {
  const { pruefeVerortung } = require('../tools/lib/verortung.js');
  const roh = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const funde = (text) => [...text.matchAll(/toISOString\(\)/g)].slice(0, 5).map(m => ({
    datei: 'vivodepot.html', zeile: text.slice(0, m.index).split('\n').length, muster: 'toISOString',
  }));

  // POSITIVKONTROLLE — die kaputte Fassung: gleiche Zeichenzahl, weniger Zeilen.
  const kaputt = roh.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  const fehler = pruefeVerortung(funde(kaputt), { wurzel: REPO });
  assert.equal(fehler.length, 5, 'jede der fünf Verortungen muss als falsch auffallen');
  assert.match(fehler[0], /Muster steht dort NICHT/);

  // NEGATIVKONTROLLE — die heile Fassung: Umbrüche erhalten.
  assert.deepEqual(pruefeVerortung(funde(ohneKommentare(roh)), { wurzel: REPO }), [],
    'die richtige Fassung darf KEINEN Verortungs-Fehler erzeugen — sonst prüft die Kontrolle ihre Umgebung');
});
