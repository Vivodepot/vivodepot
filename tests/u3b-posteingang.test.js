'use strict';
/* ═════════════════════════════════════════════════════════════════
   U-3b Posteingang für eingelesene Dateien (U2-ADR-529, 17.11.2026; Desktop-Dummy D29, D72).

   Eine Datei, die der Kern auf der Seite „Einlesen“ nicht erkennt, ging mit einer Meldung verloren; von mehreren Dateien nahm er
   nur die erste. Jetzt wartet sie im Register data.posteingang[], bis die Person sie zuordnet: „Erkannt“ auf der Seite Einlesen mit
   der Marke „N zuzuordnen“ (D72), eine Zeile in „Wartet auf Sie“ der Übersicht mit „Zuordnen“ (D29).

   Proben:
   [U-3b·Register]   aufnehmen mit Name, Art, Größe, Inhalt, Zeitpunkt, Quelle; Grenze; entfernen.
   [U-3b·Einlesen]   eine nicht erkannte Datei wartet statt verloren zu gehen; mehrere Dateien warten alle.
   [U-3b·D72]        „Erkannt“ mit Marke und je Datei dem passenden Knopf; ohne wartende Datei nichts.
   [U-3b·D29]        Zeile in „Wartet auf Sie“ mit Zahl, Namen und „Zuordnen“; ohne wartende Datei nichts.
   [U-3b·Übernehmen] eine Unterlage geht mit Bereich in die Mappe und verlässt den Posteingang.
   [U-3b·Sackgasse]  jede andere Datei kann ebenso als Unterlage in die Mappe (POSTEINGANG-SACKGASSE, 23.11.2026); Rot-Beweis.
   [U-3b·Wörter]     „Als Dokument ablegen“, „Übernehmen“ nur bei lesbarem Inhalt, „Eingelesene Dateien“ (Produktentscheidung 23.11.2026); Rot-Beweis.
   [U-3b·Rückmeldung] nach „Ablegen“ springt die App in die Mappe wie beim PDF (POSTEINGANG-ABLEGEN-RUECKMELDUNG, 23.11.2026); Rot-Beweis.
   [U-3b·Ausgaben]   zurückgehalten, beim Umzug dabei, nie beim Empfänger.
   [U-3b·Migration]  Stufe 103 legt das leere Register an und ändert keinen Wert.
   [U-3b·Rundreise]  im gespeicherten Umschlag nicht lesbar, nach dem Öffnen wieder da (Vorschlag der Krypto-Gegenlesung).
   [U-3b·Einlesen · Rot-Beweis] ein Kern ohne Posteingang-Weg verliert die nicht erkannte Datei.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const { istOeffentlich } = require('./helfer/nur-privat.js');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'posteingang-u3b-2026!';
async function imDepot(opts) {
  const k = ladeKern(Object.assign({ backen: true }, opts || {}));
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Testerin');
  return k;
}
const textDatei = (name, inhalt) => new File([inhalt], name, { type: 'text/plain' });
// Eine Datei, deren Inhalt der Kern liest (FHIR-Sammlung), ohne Endung, die sie als Unterlage ausweist.
const fhirDatei = (name) => new File([JSON.stringify({ resourceType: 'Bundle', type: 'collection', entry: [] })], name, { type: 'application/json' });
const pdfDatei = (name) => new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A])], name, { type: 'application/pdf' });

test('[U-3b·Register] aufnehmen, Grenze, entfernen', async () => {
  const { V } = await imDepot();
  assert.deepEqual(V.getData().posteingang, [], 'ein neues Depot trägt das leere Register');
  const id = V.posteingangAufnehmen({ dateiname: 'brief.pdf', mime: 'application/pdf', groesse: 9, inhalt: 'data:application/pdf;base64,JVBERi0=', quelle: 'einlesen' });
  const e = V.posteingangListe()[0];
  assert.equal(e.id, id);
  assert.equal(e.dateiname, 'brief.pdf');
  assert.equal(e.mime, 'application/pdf');
  assert.equal(e.quelle, 'einlesen');
  assert.match(e.eingelesenAm, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(V.posteingangIstUnterlage(e), true);
  assert.throws(() => V.posteingangAufnehmen({ dateiname: 'gross.bin', groesse: 6 * 1024 * 1024, inhalt: '' }), (err) => err.vdMappeZuGross === true);
  assert.equal(V.posteingangListe().length, 1, 'über der Grenze wird nichts aufgenommen');
  assert.equal(V.posteingangEntfernen(id), true);
  assert.equal(V.posteingangListe().length, 0);
});

test('[U-3b·Einlesen] nicht erkannte Datei wartet statt verloren zu gehen', async () => {
  const { V } = await imDepot();
  await V.einlesenDateienAnnehmen([textDatei('notiz-vom-amt.txt', 'Ein Schreiben ohne Format, das der Kern nicht kennt.')]);
  const liste = V.posteingangListe();
  assert.equal(liste.length, 1, 'die Datei wartet im Posteingang');
  assert.equal(liste[0].dateiname, 'notiz-vom-amt.txt');
  assert.match(liste[0].inhalt, /^data:text\/plain;base64,/);
});

test('[U-3b·Einlesen] mehrere Dateien warten alle', async () => {
  const { V } = await imDepot();
  await V.einlesenDateienAnnehmen([pdfDatei('impfnachweis.pdf'), pdfDatei('geburtsurkunde.pdf'), textDatei('rest.txt', 'x')]);
  assert.deepEqual(V.posteingangListe().map((e) => e.dateiname), ['impfnachweis.pdf', 'geburtsurkunde.pdf', 'rest.txt']);
  assert.equal(V.posteingangListe()[0].mime, 'application/pdf', 'ein PDF wird am Inhalt erkannt');
});

test('[U-3b·D72] Erkannt mit Marke und Knöpfen', async () => {
  const { V } = await imDepot();
  const S = V.STRINGS;
  assert.equal(V._einlesenPosteingangHTML(), '', 'ohne wartende Datei kein Abschnitt');
  await V.einlesenDateienAnnehmen([pdfDatei('impfnachweis.pdf'), fhirDatei('befund.json')]);
  const h = V._einlesenPosteingangHTML();
  assert.ok(h.includes('data-einlesen-posteingang="1"'));
  assert.ok(h.includes('<h2>' + S.einlesenErkanntTitel + '</h2>'), 'Überschrift „Eingelesene Dateien“ (bis 23.11.2026 „Erkannt“)');
  assert.ok(h.includes('data-posteingang-marke="1">' + S.einlesenZuzuordnen.replace('{anzahl}', '2') + '<'), 'Marke „2 zuzuordnen“');
  assert.ok(h.includes('>' + S.posteingangAlsUnterlage + '<'), 'PDF: „Als Dokument ablegen“');
  assert.ok(h.includes('>' + S.posteingangUebernehmen + '<'), 'Datei mit lesbarem Inhalt: „Übernehmen“');
  assert.equal((h.match(/data-posteingang-entfernen=/g) || []).length, 2, 'je Datei „Entfernen“');
  assert.equal(S.einlesenZuzuordnen.replace('{anzahl}', '2'), '2 zuzuordnen', 'Wortlaut des Dummys D72');
});

test('[U-3b·D29] Zeile in Wartet auf Sie mit Zuordnen', async () => {
  const { V } = await imDepot();
  const S = V.STRINGS;
  assert.ok(!V._uebersichtHTML().includes('data-uebersicht-posteingang'), 'ohne wartende Datei keine Zeile');
  await V.einlesenDateienAnnehmen([pdfDatei('Impfnachweis.pdf'), pdfDatei('Geburtsurkunde.pdf')]);
  const h = V._uebersichtHTML();
  assert.ok(h.includes('data-uebersicht-wartet="1"'), '„Wartet auf Sie“ steht auch ohne Anfrage');
  assert.ok(h.includes('<span class="uebersicht-marke warten">1</span>'), 'die Marke zählt die Zeile');
  assert.ok(h.includes('data-uebersicht-posteingang="1"'));
  assert.ok(h.includes('<b>' + S.uebersichtPosteingangMehr.replace('{anzahl}', '2') + '</b> ' + S.uebersichtPosteingangMehrRest), 'Zahl und Satz');
  assert.ok(h.includes('<div class="uebersicht-leise">Impfnachweis, Geburtsurkunde</div>'), 'Namen ohne Endung wie im Dummy');
  assert.ok(h.includes('data-uebersicht-zuordnen="1">' + S.uebersichtZuordnen + '<'), '„Zuordnen“');
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8')
    .includes("c.querySelectorAll('[data-uebersicht-zuordnen]').forEach((b) => { b.onclick = () => oeffneEinlesen(); });"), '„Zuordnen“ führt zur Seite Einlesen');
});

test('[U-3b·Übernehmen] eine Unterlage geht mit Bereich in die Mappe und verlässt den Posteingang', async () => {
  const k = await imDepot();
  const { V } = k;
  await V.einlesenDateienAnnehmen([pdfDatei('impfnachweis.pdf'), pdfDatei('zweites.pdf')]);
  const id = V.posteingangListe()[0].id;
  let dialog = null;
  const echt = V.ui.modal;
  V.ui.modal = (opt) => { dialog = opt; return () => {}; };
  try { V.posteingangUebernehmen(id); } finally { V.ui.modal = echt; }
  assert.ok(dialog && typeof dialog.onPrimaer === 'function', 'der Dialog der Mappe fragt nach Bereich und Beschriftung');
  const mappeVorher = (V.getData().mappe || []).length;
  dialog.onPrimaer(() => {});
  assert.equal((V.getData().mappe || []).length, mappeVorher + 1, 'die Datei steht in der Mappe');
  assert.equal(V.getData().mappe[mappeVorher].dateiname, 'impfnachweis.pdf');
  assert.deepEqual(V.posteingangListe().map((e) => e.dateiname), ['zweites.pdf'], 'nur die übernommene Datei verlässt den Posteingang');
});

/* POSTEINGANG-SACKGASSE (23.11.2026): eine Datei, die der Kern nicht als Unterlage erkennt (Text, Bild ohne Format), hatte nur
   „Übernehmen“, das sie wieder in die Erkennung gab und dort mit „nicht erkannt“ endete. Jetzt trägt jede solche Datei zusätzlich
   den Weg in die Mappe (heute „Als Dokument ablegen“). */
const sackgasse = (h, S) => h.includes('data-posteingang-unterlage=') && h.includes('>' + S.posteingangAlsUnterlage + '<');

test('[U-3b·Sackgasse] eine Textdatei kann als Unterlage in die Mappe', async () => {
  const { V } = await imDepot();
  await V.einlesenDateienAnnehmen([textDatei('notiz-termin.txt', 'Termin am Dienstag')]);
  const h = V._einlesenPosteingangHTML();
  assert.ok(sackgasse(h, V.STRINGS), 'die Textdatei trägt „Als Dokument ablegen“');
  assert.ok(!h.includes('data-posteingang-uebernehmen='), 'kein „Übernehmen“: der Kern liest den Inhalt nicht, es führte in die Sackgasse');
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8')
    .includes("posteingangUebernehmen(b.getAttribute('data-posteingang-unterlage'), { alsUnterlage: true })"), 'der Knopf ist verdrahtet');
  const id = V.posteingangListe()[0].id;
  let dialog = null;
  const echt = V.ui.modal;
  V.ui.modal = (opt) => { dialog = opt; return () => {}; };
  try { V.posteingangUebernehmen(id, { alsUnterlage: true }); } finally { V.ui.modal = echt; }
  assert.ok(dialog && typeof dialog.onPrimaer === 'function', 'der Dialog der Mappe fragt nach Bereich und Beschriftung');
  const vorher = (V.getData().mappe || []).length;
  dialog.onPrimaer(() => {});
  assert.equal((V.getData().mappe || []).length, vorher + 1, 'die Textdatei steht in der Mappe');
  assert.equal(V.getData().mappe[vorher].dateiname, 'notiz-termin.txt');
  assert.equal(V.posteingangListe().length, 0, 'und verlässt den Posteingang');
});

/* Rot-Beweis: ein Kern ohne den Knopf für andere Dateien (Stand vor dem Fix) fällt durch [U-3b·Sackgasse]. */
test('[U-3b·Sackgasse · Rot-Beweis] ohne den Knopf bleibt die Textdatei in der Sackgasse', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const knopf = "(unterlage ? '' : (lesbar ? '<button type=\"button\" class=\"btn btn-sek btn-klein\" data-posteingang-unterlage=\"' : '<button type=\"button\" class=\"btn btn-klein\" data-posteingang-unterlage=\"') + escapeAttr(String(e.id || '')) + '\">' + esc(STRINGS.posteingangAlsUnterlage) + '</button>') +";
  assert.equal(quelle.split(knopf).length, 2, 'Vorbedingung: der Anker steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u3b-sackgasse-rot-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, quelle.replace(knopf, ''));
  try {
    const { V } = await imDepot({ htmlPfad: datei });
    await V.einlesenDateienAnnehmen([textDatei('notiz-termin.txt', 'Termin am Dienstag')]);
    assert.equal(sackgasse(V._einlesenPosteingangHTML(), V.STRINGS), false, 'ohne den Knopf fehlt der Weg in die Mappe');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* POSTEINGANG-ABLEGEN-RUECKMELDUNG (23.11.2026): nach „Ablegen“ eines Bildes blieb die Person auf der leeren Seite Einlesen ohne
   Rückmeldung; beim PDF springt die App in die Mappe („Was hier liegt“). Jetzt beide gleich. */
async function ablegenUndAnsicht(k) {
  const { V } = k;
  await V.einlesenDateienAnnehmen([pdfDatei('befund.pdf'), textDatei('notiz.txt', 'Termin')]);   // zwei Dateien: beide warten
  let dialog = null;
  const echt = V.ui.modal;
  V.ui.modal = (opt) => { dialog = opt; return () => {}; };
  try { V.posteingangUebernehmen(V.posteingangListe()[0].id); } finally { V.ui.modal = echt; }
  dialog.onPrimaer(() => {});
  return V.getViewState().aktiveAnsicht;
}

test('[U-3b·Rückmeldung] nach „Ablegen“ zeigt die App die Mappe', async () => {
  const k = await imDepot();
  assert.equal(await ablegenUndAnsicht(k), 'mappe', 'derselbe Sprung wie beim PDF');
  assert.deepEqual(k.V.posteingangListe().map((e) => e.dateiname), ['notiz.txt'], 'die abgelegte Datei hat den Posteingang verlassen');
});

/* Rot-Beweis: mit dem Rückweg von vorher (nur neu zeichnen) bleibt die Seite Einlesen stehen. */
test('[U-3b·Rückmeldung · Rot-Beweis] mit dem Rückweg von vorher springt die App nicht', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const neu = `groesse: e.groesse, inhalt: e.inhalt }, null, () => {
      if (posteingangEntfernen(id)) markiereUngespeichert(1);
      oeffneMappe();
    });`;
  assert.equal(quelle.split(neu).length, 2, 'Vorbedingung: der Anker steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u3b-rueckmeldung-rot-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, quelle.replace(neu, 'groesse: e.groesse, inhalt: e.inhalt }, null, () => fertig());'));
  try {
    assert.notEqual(await ablegenUndAnsicht(await imDepot({ htmlPfad: datei })), 'mappe', 'ohne den Sprung bleibt die Seite stehen');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* POSTEINGANG-WOERTER (Produktentscheidung 23.11.2026, Abweichung vom Dummy D72): Datei in einen Bereich legen heißt überall „Als Dokument
   ablegen“; „Übernehmen“ heißt Angaben in Felder und steht nur, wo der Kern den Inhalt liest; die Überschrift heißt „Eingelesene Dateien“. */
const knoepfe = (h) => Array.from(h.matchAll(/data-posteingang-(unterlage|uebernehmen)="[^"]*">([^<]*)</g)).map((m) => m[2]);

test('[U-3b·Wörter] ein Wort je Sache, de und en', async () => {
  const { V } = await imDepot();
  const S = V.STRINGS;
  assert.equal(S.posteingangAlsUnterlage, 'Als Dokument ablegen');
  assert.equal(S.posteingangAlsUnterlage, S.importPdfAblegenKnopf, 'dasselbe Wort wie beim PDF');
  assert.equal(S.importXpsAlsUnterlage, S.importPdfAblegenKnopf, 'dasselbe Wort bei der Urkunde einer anderen Person');
  assert.equal(S.einlesenErkanntTitel, 'Eingelesene Dateien');
  // Die Meldungen nach dem Einlesen nennen die Überschrift, unter der die Dateien warten (Rot-Beweis: der alte Wortlaut „Erkannt“)
  for (const k of ['posteingangAufgenommen', 'posteingangNichtErkannt']) {
    assert.ok(S[k].includes('„' + S.einlesenErkanntTitel + '“'), k + ' nennt die Überschrift');
    assert.ok(!S[k].includes('„Erkannt“'), k + ' ohne alte Überschrift');
  }
  // Öffentlich (Kennzeichen „läuft nur im privaten Repo“, tests/helfer/nur-privat.js) fehlen die Pro-Textsätze; privat bleiben alle vier Pflicht.
  for (const d of (istOeffentlich() ? ['en'] : ['en', 'en-pro'])) {
    const t = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-' + d + '-modul.json'), 'utf8')).texte;
    assert.equal(t['strings:posteingangAlsUnterlage.text'], t['strings:importPdfAblegenKnopf.text'], d);
    assert.equal(t['strings:importXpsAlsUnterlage.text'], t['strings:importPdfAblegenKnopf.text'], d);
    assert.equal(t['strings:einlesenErkanntTitel.text'], 'Imported files', d);
    for (const k of ['posteingangAufgenommen', 'posteingangNichtErkannt']) {
      // Die Überschrift wird über den Platzhalter aus dem echten Titel eingesetzt, nicht abgeschrieben (tools/zitierte-beschriftung-pruefen.js)
      assert.ok(t['strings:' + k + '.text'].includes('“{beschriftung:einlesenErkanntTitel}”'), d + ' ' + k + ' nennt die Überschrift über den Platzhalter');
    }
  }
  await V.einlesenDateienAnnehmen([pdfDatei('impfnachweis.pdf'), fhirDatei('befund.json'), textDatei('notiz.txt', 'Termin am Dienstag')]);
  const zeilen = V._einlesenPosteingangHTML().split('data-posteingang-eintrag=').slice(1);
  assert.deepEqual(zeilen.map(knoepfe), [[S.posteingangAlsUnterlage], [S.posteingangAlsUnterlage, S.posteingangUebernehmen], [S.posteingangAlsUnterlage]],
    'PDF: ablegen · lesbarer Inhalt: ablegen und übernehmen · Text ohne Format: ablegen');
});

/* Rot-Beweis: ein Kern, der „Übernehmen“ auch ohne lesbaren Inhalt zeigt (Stand vor dem Wort), fällt bei der Textdatei durch. */
test('[U-3b·Wörter · Rot-Beweis] „Übernehmen“ ohne lesbaren Inhalt fällt durch', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const neu = '    const lesbar = !unterlage && posteingangInhaltLesbar(e);';
  assert.equal(quelle.split(neu).length, 2, 'Vorbedingung: der Anker steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u3b-woerter-rot-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, quelle.replace(neu, '    const lesbar = !unterlage;'));
  try {
    const { V } = await imDepot({ htmlPfad: datei });
    await V.einlesenDateienAnnehmen([textDatei('notiz.txt', 'Termin am Dienstag'), pdfDatei('x.pdf')]);
    const zeilen = V._einlesenPosteingangHTML().split('data-posteingang-eintrag=').slice(1);
    assert.ok(knoepfe(zeilen[0]).includes(V.STRINGS.posteingangUebernehmen), 'ohne die Prüfung steht „Übernehmen“ bei der Textdatei');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[U-3b·Ausgaben] zurückgehalten, beim Umzug dabei, nie beim Empfänger', async () => {
  const { V } = await imDepot();
  assert.ok(V.VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL.includes('posteingang'), 'in beiläufigen Ausgaben zurückgehalten');
  assert.ok(V.VOLLIMPORT_MITNEHMEN_SCHLUESSEL.includes('posteingang'), 'beim Umzug dabei');
  assert.ok(V.EMPFAENGER_NIE.has('posteingang'), 'nie im Ausschnitt eines Empfängers');
});

test('[U-3b·Migration] Stufe 103 legt das leere Register an und ändert keinen Wert', async () => {
  const { V } = await imDepot();
  assert.ok(V.SCHEMA_VERSION_AKTUELL >= 103);
  const { STUFEN } = require('./fixtures/migrations-stufen.js');
  const st = STUFEN.find((x) => x.nach === 103);
  assert.ok(st, 'die Stufe 103 steht in den Stufen-Fixtures');
  const d = st.baue();
  assert.ok(st.vorher(d));
  V.depotNormalisieren(d);
  assert.ok(st.nachher(d), 'nach der Stufe: leeres Register, Stufe 103');
});

/* Rot-Beweis: ein Kern, dessen Seite Einlesen die Datei ohne Posteingang-Weg in die Erkennung gibt (Stand vor U-3b), verliert die
   nicht erkannte Datei; [U-3b·Einlesen] fällt. */
test('[U-3b·Einlesen · Rot-Beweis] ein Kern ohne Posteingang-Weg verliert die nicht erkannte Datei', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const alt = "await importAutoDatei(dateien[0], null, () => {}, { posteingang: true });";
  assert.equal(quelle.split(alt).length, 2, 'Vorbedingung: der Anker steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u3b-rot-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, quelle.replace(alt, 'await importAutoDatei(dateien[0], null, () => {});'));
  try {
    const { V } = await imDepot({ htmlPfad: datei });
    await V.einlesenDateienAnnehmen([textDatei('notiz-vom-amt.txt', 'kein Format')]);
    assert.equal(V.posteingangListe().length, 0, 'ohne den Weg geht die Datei verloren');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[U-3b·Rundreise] die wartende Datei steht im gespeicherten Umschlag nicht lesbar und ist nach dem Öffnen wieder da', async () => {
  const { V } = await imDepot();
  const marke = 'U3B-POSTEINGANG-KLARTEXT-MARKE';
  const b64 = Buffer.from(marke, 'utf8').toString('base64');
  const id = V.posteingangAufnehmen({ dateiname: 'notiz-' + marke + '.txt', mime: 'text/plain', groesse: marke.length,
    inhalt: 'data:text/plain;base64,' + b64, quelle: 'einlesen' });
  // Positivkontrolle: im offenen Depot stehen Name und Inhalt, die Suche unten sähe sie also.
  const offen = JSON.stringify(V.getData());
  assert.ok(offen.includes(marke) && offen.includes(b64), 'Positivkontrolle: Name und Inhalt stehen im offenen Depot');
  const umschlag = await V.depotSerialisieren();
  const gespeichert = typeof umschlag === 'string' ? umschlag : JSON.stringify(umschlag);
  assert.ok(!gespeichert.includes(marke), 'der Dateiname steht nicht lesbar im gespeicherten Umschlag');
  assert.ok(!gespeichert.includes(b64), 'der Inhalt steht nicht lesbar im gespeicherten Umschlag');
  await V.depotLaden(umschlag, PW);
  const e = V.posteingangListe().find((x) => x.id === id);
  assert.ok(e, 'nach dem Öffnen wartet die Datei wieder');
  assert.equal(e.dateiname, 'notiz-' + marke + '.txt');
  assert.equal(e.inhalt, 'data:text/plain;base64,' + b64);
});
