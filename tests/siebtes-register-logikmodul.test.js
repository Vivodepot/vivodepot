'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Siebtes Register — logikModul („Siebtes Register — deklarative
   Vorlagen-Sprache für Logik-Module", 27.08.2026, Zug 1)
   ────────────────────────────────────────────────────────────────────────
   `logikModulPruefen` ist die Sicherheitsgrenze: reines JSON, geschlossene
   typ-Enums fuer Bedingungs-/Formatierungs-/Datenlesen-Schema und fuer den
   Blocktyp selbst — ein Bundle, das etwas ausserhalb dieser Enums bringt,
   wird ZURUECKGEWIESEN, nicht still ignoriert. Kein eval/new Function,
   dieselbe Risikoklasse wie die sechs bestehenden Register (U2-ADR-181
   bleibt unveraendert zustaendig fuer die Vertrauensstufe).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function gueltigesBundle(ueberschreibung) {
  return Object.assign({
    modulTyp: 'logikModul',
    id: 'test-logik-modul',
    titel: 'Test-Logik-Modul',
    sektor: 'advanceCare',
    herkunft: 'test-anbieter',
    datenSchema: { x: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' } },
    abschnitte: [{ titel: 'Abschnitt', bloecke: [
      { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '— nicht erfasst —' },
    ] }],
    dokAusgabe: { h1: 'Test-Dokument', unterschrift: false, unterschriftErsatzHinweis: 'Ersatzhinweis.' },
  }, ueberschreibung || {});
}

/* ══ logikModulPruefen — Struktur ══════════════════════════════════════ */

test('[logikModulPruefen] ein vollstaendig gueltiges Bundle wird angenommen', async () => {
  const { V } = await ladeKern();
  const r = V.logikModulPruefen(gueltigesBundle());
  assert.equal(r.gueltig, true);
  assert.equal(r.logik.id, 'test-logik-modul');
  assert.equal(r.logik.dokAusgabe.h1, 'Test-Dokument');
});

test('[logikModulPruefen] kein Objekt wird abgewiesen', async () => {
  const { V } = await ladeKern();
  assert.equal(V.logikModulPruefen(null).gueltig, false);
  assert.equal(V.logikModulPruefen('text').gueltig, false);
});

test('[logikModulPruefen] fehlende id/titel/sektor/herkunft werden je einzeln abgewiesen', async () => {
  const { V } = await ladeKern();
  assert.equal(V.logikModulPruefen(gueltigesBundle({ id: '' })).gueltig, false);
  assert.equal(V.logikModulPruefen(gueltigesBundle({ titel: '' })).gueltig, false);
  assert.equal(V.logikModulPruefen(gueltigesBundle({ sektor: 'kein-echter-sektor' })).gueltig, false);
  assert.equal(V.logikModulPruefen(gueltigesBundle({ herkunft: '' })).gueltig, false);
});

test('[logikModulPruefen·Rot-Beweis] ein unbekannter Datenlesen-typ wird abgewiesen', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ datenSchema: { x: { typ: 'javascript-ausfuehren', code: 'alert(1)' } } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, false, 'ein erfundener/gefaehrlicher typ darf nicht durchgehen');
  assert.ok(r.verworfene.some((v) => v.schluessel === 'datenSchema.x' && v.grund === 'typ'));
});

/* ══ Sensibel-Schranke (Auftrag, 04.09.2026 — Nebenfund zur logikModul-vs-Konzept-
   Messung) ═══════════════════════════════════════════════════════════════════════════════
   Bis hierhin prueft logikModulPruefen NICHT, ob ein referenziertes Feld schema-seitig
   `sensibel: true` traegt — anders als praktisch jeder andere Export-/Anzeige-Pfad im Kern
   (`optionen.sensibel`-Gate, feldIstSensibel). Ein fremder Herausgeber konnte damit still
   jedes sensible Feld in ein generiertes, druckbares Dokument ziehen. GEMESSEN, nicht
   vermutet: der real genutzte Erbschein-Vorbereitungsauszug liest `identity.nationality`
   (sensibel: true) — ein Rueckbau auf „nie sensibel" haette die ausgelieferte Funktion
   gebrochen. Die Antwort ist ein AUSDRUECKLICHES, geprueftes Recht JE EINTRAG
   (`sensibelErlaubt: true`), kein stillschweigendes auf alle. */
test('[logikModulPruefen·Rot-Beweis] ein sensibles Feld OHNE sensibelErlaubt wird abgewiesen', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ datenSchema: { x: { typ: 'feld', sektor: 'identity', feld: 'nationality' } } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, false, '`nationality` traegt `sensibel: true` — ein Bundle darf es nicht stillschweigend lesen');
  assert.ok(r.verworfene.some((v) => v.schluessel === 'datenSchema.x' && v.grund === 'sensibel-ohne-erlaubnis'));
});

test('[logikModulPruefen·Gegenprobe] dasselbe sensible Feld MIT sensibelErlaubt:true geht durch', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ datenSchema: { x: { typ: 'feld', sektor: 'identity', feld: 'nationality', sensibelErlaubt: true } } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, true, 'ein ausdruecklich erlaubtes sensibles Feld darf nicht dieselbe Bindung wie eine unbenannte durchrutschen');
});

test('[logikModulPruefen·Gegenprobe] ein NICHT-sensibles Feld braucht kein sensibelErlaubt (Bestandsverhalten unveraendert)', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ datenSchema: { x: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' } } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, true, 'die neue Schranke darf harmlose, nicht-sensible Felder nicht mit betreffen');
});

test('[logikModulPruefen·Rot-Beweis] sensibel via `verbinden` (eines von mehreren Teilen) wird ebenfalls erkannt', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ datenSchema: { x: { typ: 'verbinden',
    teile: [{ sektor: 'identity', feld: 'streetAddress' }, { sektor: 'identity', feld: 'nationality' }] } } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, false, 'ein einziges sensibles Teil in `verbinden` darf die Schranke nicht umgehen');
});

test('[logikModulPruefen·Gegenprobe] `verbinden` MIT sensibelErlaubt:true geht durch', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ datenSchema: { x: { typ: 'verbinden', sensibelErlaubt: true,
    teile: [{ sektor: 'identity', feld: 'streetAddress' }, { sektor: 'identity', feld: 'nationality' }] } } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, true);
});

test('[logikModulPruefen] personenNamen bleibt aussen vor — Namen gelten nicht als sensibel, dieselbe Grenze wie im uebrigen Kern', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ datenSchema: { x: { typ: 'personenNamen', sektor: 'identity', feld: 'childrenAndDependants', unterfeld: 'person' } } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, true, 'personenNamen loest Personen-Verweise zu Namen auf, keine Sachwerte');
});

test('[logikModulPruefen] die echte Erbschein-Fixture traegt sensibelErlaubt an genau der einen Stelle, die es braucht', async () => {
  const fs = require('node:fs'); const path = require('node:path');
  const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8'));
  const { V } = await ladeKern();
  const r = V.logikModulPruefen(bundle);
  assert.equal(r.gueltig, true, 'die ausgelieferte Fixture muss nach der Schranke weiterhin angenommen werden');
  assert.equal(bundle.datenSchema.staatsangehoerigkeit.sensibelErlaubt, true);
});

test('[logikModulPruefen·Rot-Beweis] dieselbe Erbschein-Fixture OHNE das Flag waere abgewiesen (belegt, dass das Flag traegt, nicht nur mitlaeuft)', async () => {
  const fs = require('node:fs'); const path = require('node:path');
  const bundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8'));
  delete bundle.datenSchema.staatsangehoerigkeit.sensibelErlaubt;
  const { V } = await ladeKern();
  const r = V.logikModulPruefen(bundle);
  assert.equal(r.gueltig, false, 'ohne das Flag muss dieselbe Fixture an der neuen Schranke scheitern — sonst waere Rot nie erreichbar gewesen');
});

test('[logikModulPruefen·Rot-Beweis] ein unbekannter Blocktyp wird abgewiesen', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ abschnitte: [{ titel: 'x', bloecke: [{ typ: 'noch-nicht-erfundener-blocktyp' }] }] });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, false);
});

test('[logikModulPruefen·Rot-Beweis] eine unbekannte Bedingung im crossRef-Block wird abgewiesen', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ abschnitte: [{ titel: 'x', bloecke: [
    { typ: 'crossRef', text: 'y', bedingung: { typ: 'erfundene-bedingung' } },
  ] }] });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, false);
});

test('[logikModulPruefen·Rot-Beweis] eine unbekannte Formatierung im frageAntwortOderLuecke-Block wird abgewiesen', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ abschnitte: [{ titel: 'x', bloecke: [
    { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'f', format: { typ: 'erfundenes-format' } },
  ] }] });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, false);
});

test('[logikModulPruefen·Rot-Beweis] extraHTML in dokAusgabe wird verworfen, nicht durchgereicht', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ dokAusgabe: { h1: 'x', unterschrift: false, unterschriftErsatzHinweis: 'y', extraHTML: 'boese-nicht-funktion' } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, true, 'das Bundle selbst bleibt gueltig — extraHTML wird nur verworfen, nicht das ganze Modul');
  assert.equal(r.logik.dokAusgabe.extraHTML, null, 'extraHTML aus dem Bundle darf NIE in die echte dokAusgabe wandern (Absturz-Risiko: da.extraHTML() auf einem String)');
  assert.ok(r.verworfene.some((v) => v.schluessel === 'dokAusgabe.extraHTML'));
});

test('[logikModulPruefen] unterschrift:false OHNE unterschriftErsatzHinweis wird abgewiesen', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ dokAusgabe: { h1: 'x', unterschrift: false } });
  assert.equal(V.logikModulPruefen(b).gueltig, false);
});

test('[logikModulPruefen] knopfAttr/dateiBasis ohne Bundle-Angabe fallen auf modul.id zurueck (Baukasten-Default)', async () => {
  const { V } = await ladeKern();
  const r = V.logikModulPruefen(gueltigesBundle());
  assert.equal(r.logik.dokAusgabe.knopfAttr, 'test-logik-modul-dokument');
  assert.equal(r.logik.dokAusgabe.dateiBasis, 'test-logik-modul');
});

test('[logikModulPruefen] ein Bundle kann knopfAttr/dateiBasis explizit setzen (fuer den Abgleich mit bestehender bespoke-HTML)', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ dokAusgabe: { h1: 'x', unterschrift: false, unterschriftErsatzHinweis: 'y', knopfAttr: 'erbschein-dokument', dateiBasis: 'Erbschein-Vorbereitung' } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, true);
  assert.equal(r.logik.dokAusgabe.knopfAttr, 'erbschein-dokument');
  assert.equal(r.logik.dokAusgabe.dateiBasis, 'Erbschein-Vorbereitung');
});

test('[logikModulPruefen·Rot-Beweis] ein knopfAttr ausserhalb des sicheren Zeichensatzes faellt auf den Default zurueck, statt in den CSS-Selektor zu wandern', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ dokAusgabe: { h1: 'x', unterschrift: false, unterschriftErsatzHinweis: 'y', knopfAttr: '"]<script>alert(1)</script>' } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, true);
  assert.equal(r.logik.dokAusgabe.knopfAttr, 'test-logik-modul-dokument', 'unsicherer knopfAttr wird verworfen, nicht durchgereicht — er landet ungeprueft in einem querySelectorAll-Attributselektor');
});

test('[logikModulPruefen] toolbarHinweis (Klartext) wird escaped in ein <p> gewickelt — KEIN toolbarHinweisHTML vom Bundle', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ dokAusgabe: { h1: 'x', unterschrift: false, unterschriftErsatzHinweis: 'y', toolbarHinweis: 'Hinweis mit <script>alert(1)</script> Zeichen' } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, true);
  assert.equal(r.logik.dokAusgabe.toolbarHinweisHTML, '<p class="pv-dok-hinweis">Hinweis mit &lt;script&gt;alert(1)&lt;/script&gt; Zeichen</p>', 'Klartext escaped, kein rohes HTML aus dem Bundle in innerHTML');
});

test('[logikModulPruefen·Rot-Beweis] toolbarHinweisHTML (roh) vom Bundle selbst wird verworfen, nicht durchgereicht', async () => {
  const { V } = await ladeKern();
  const b = gueltigesBundle({ dokAusgabe: { h1: 'x', unterschrift: false, unterschriftErsatzHinweis: 'y', toolbarHinweisHTML: '<img src=x onerror=alert(1)>' } });
  const r = V.logikModulPruefen(b);
  assert.equal(r.gueltig, true);
  assert.equal(r.logik.dokAusgabe.toolbarHinweisHTML, '', 'ein Bundle darf niemals rohes HTML fuer innerHTML liefern — nur der Klartext-Schluessel toolbarHinweis ist erlaubt');
  assert.ok(r.verworfene.some((v) => v.schluessel === 'dokAusgabe.toolbarHinweisHTML'));
});

test('[logikModulPruefen] verschachtelte Bedingungen (und/oder/nicht) werden rekursiv geprueft', async () => {
  const { V } = await ladeKern();
  const gueltig = gueltigesBundle({ abschnitte: [{ titel: 'x', bloecke: [
    { typ: 'crossRef', text: 'y', bedingung: { typ: 'und', bedingungen: [
      { typ: 'feldGleich', feld: 'a', wert: 'ja' },
      { typ: 'oder', bedingungen: [{ typ: 'feldGleich', feld: 'b', wert: 'ja' }, { typ: 'nicht', bedingung: { typ: 'feldGleich', feld: 'c', wert: 'ja' } }] },
    ] } },
  ] }] });
  assert.equal(V.logikModulPruefen(gueltig).gueltig, true);

  const ungueltig = gueltigesBundle({ abschnitte: [{ titel: 'x', bloecke: [
    { typ: 'crossRef', text: 'y', bedingung: { typ: 'und', bedingungen: [{ typ: 'feldGleich', feld: 'a', wert: 'ja' }, { typ: 'erfunden' }] } },
  ] }] });
  assert.equal(V.logikModulPruefen(ungueltig).gueltig, false, 'eine erfundene Bedingung TIEF in der Verschachtelung darf nicht durchrutschen');
});

test('[logikModulPruefen] unbekannte Top-Level-Schluessel werden benannt verworfen, machen das Bundle aber nicht ungueltig', async () => {
  const { V } = await ladeKern();
  const r = V.logikModulPruefen(gueltigesBundle({ unbekannterSchluessel: 'x' }));
  assert.equal(r.gueltig, true);
  assert.ok(r.verworfene.some((v) => v.schluessel === 'unbekannterSchluessel'));
});

test('[logikModulPruefen·Rot-Beweis] moduleVersion ist ein bekannter Schluessel — kein Fund gegen ein Bundle, das es setzt', async () => {
  /* Realer Fund (27.08.2026): die erste Fassung der Schluesselliste vergass moduleVersion —
     jedes echte Bundle (das eine Fassungszahl traegt, wie alle sechs Bestandsregister) waere
     mit einem falschen "unbekannt"-Fund gemeldet worden. Gefangen vom Byte-Gleichheit-Test
     gegen das echte Erbschein-Bundle, nicht von einer erdachten Fixture. */
  const { V } = await ladeKern();
  const r = V.logikModulPruefen(gueltigesBundle({ moduleVersion: 1 }));
  assert.equal(r.gueltig, true);
  assert.deepEqual(r.verworfene, []);
});

/* ══ logikModulEinbetten — Fassung/Update ═══════════════════════════════ */

test('[logikModulEinbetten] neues Modul wird angehaengt', async () => {
  const { V } = await ladeKern();
  const liste = V.logikModulEinbetten([], { id: 'a', eingelassenAm: '2026-08-27' });
  assert.equal(liste.length, 1);
});

test('[logikModulEinbetten] dieselbe id MIT hoeherer moduleVersion ersetzt den bestehenden Eintrag, andere id haengt an', async () => {
  // Fassung wird ueber moduleVersion entschieden (modulFassungEntscheiden), nicht ueber
  // eingelassenAm — dieselbe Regel wie bei allen sechs bestehenden Registern.
  const { V } = await ladeKern();
  const eins = [{ id: 'a', titel: 'Alt', moduleVersion: 1, eingelassenAm: '2026-08-20' }];
  const aktualisiert = V.logikModulEinbetten(eins, { id: 'a', titel: 'Neu', moduleVersion: 2, eingelassenAm: '2026-08-27' });
  assert.equal(aktualisiert.length, 1);
  assert.equal(aktualisiert[0].titel, 'Neu');
  const angehaengt = V.logikModulEinbetten(eins, { id: 'b', titel: 'Zweites', moduleVersion: 1, eingelassenAm: '2026-08-27' });
  assert.equal(angehaengt.length, 2);
});

test('[logikModulEinbetten·Gegenprobe] dieselbe id mit GLEICHER/niedrigerer moduleVersion bleibt unveraendert (aeltere Fassung gewinnt nicht)', async () => {
  const { V } = await ladeKern();
  const eins = [{ id: 'a', titel: 'Alt', moduleVersion: 2 }];
  const versucht = V.logikModulEinbetten(eins, { id: 'a', titel: 'Neu-aber-aelter', moduleVersion: 1 });
  assert.equal(versucht[0].titel, 'Alt', 'eine niedrigere moduleVersion darf die bestehende Fassung nicht verdraengen');
});

/* ══ EINLASS_REGISTER — das siebte Register steht ═══════════════════════ */

test('[EINLASS_REGISTER] logikModul ist das siebte Register, mit dem richtigen Slot/Kennung', async () => {
  const { V } = await ladeKern();
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'logikModul');
  assert.ok(reg, 'das Register existiert');
  assert.equal(reg.slot, 'logikModule');
  assert.equal(reg.kennung({ id: 'x' }), 'x');
});

test('[modulEinlassen] ein gueltiges logikModul-Bundle wird ueber den regulaeren Einlassweg angenommen', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('siebtes-register-pw');
  const d = V.getData();
  // U2-ADR-288: depotAnlegen() seedet seither den Erbschein-Auszug ab Werk — geleert, damit diese
  // Probe weiterhin genau EIN Bundle (das eigene) zaehlt.
  d.logikModule = [];
  const ergebnis = V.modulEinlassen(JSON.stringify(gueltigesBundle()), d, null, null);
  assert.equal(ergebnis.angenommen, true);
  assert.equal(ergebnis.typ, 'logikModul');
  assert.equal(ergebnis.kennung, 'test-logik-modul');
  assert.equal(d.logikModule.length, 1);
  assert.equal(d.logikModule[0].ungeprueft, true, 'unsigniert eingelassen — Selbstauskunft, kein Zertifikat');
});

test('[modulEinlassen·Rot-Beweis] ein ungueltiges logikModul-Bundle wird ueber denselben Weg abgewiesen', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('siebtes-register-pw2');
  const d = V.getData();
  // U2-ADR-288: s. Kommentar oben — derselbe Grund.
  d.logikModule = [];
  const kaputt = gueltigesBundle({ abschnitte: [{ titel: 'x', bloecke: [{ typ: 'boesartiger-typ' }] }] });
  const ergebnis = V.modulEinlassen(JSON.stringify(kaputt), d, null, null);
  assert.equal(ergebnis.angenommen, false);
  assert.equal((d.logikModule || []).length, 0);
});

test('[modulEinlassen → dokumentHTML] ein ueber den echten Einlassweg eingelassenes Bundle rendert korrekt', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('siebtes-register-pw3');
  const d = V.getData();
  d.sektoren.identity = { maritalStatus: 'verh' };
  V.setData(d);
  V.modulEinlassen(JSON.stringify(gueltigesBundle()), V.getData(), null, null);
  const html = V.dokumentHTML('test-logik-modul');
  assert.match(html, /Test-Dokument/);
  assert.match(html, /Frage\? verh/, 'ohne format-Schema bleibt der Rohwert stehen (String(w)), wie bei internen Modulen auch');
});
