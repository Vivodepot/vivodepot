'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Nachtragen je Feldtyp — in der Anfrage-Antwort UND im Zusammenstellen
   (19.10.2026, Befund ANFRAGE-NACHTRAGEN-CODELISTE, HOCH — mit dem Fix)
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND. Beide Ansichten boten für jedes fehlende Feld EIN Textfeld an
   und gaben dessen rohen Text über `anfrageFeldNachtragen` →
   `zusammenstellungFeldFuellen` an `sektorFeldSetzen`. Code-Liste (A44),
   Verweis (A43/U2-ADR-116) und Liste (U2-ADR-104) warfen dort: eine Klinik
   fragt nach Allergien, und „Penicillin“ ließ sich im Antwortweg nicht
   nachtragen ({ok:false, grund:'schreiben'}). Mehrfach-Verweis,
   Mehrfachauswahl, Auswahl (Label statt Wert), Kästchen und eine
   Listen-Unterfeld-Kennung kamen mit ok:true in einer Form an, die kein Leser
   als eingetragen las.

   DER FIX. Jede Ansicht zeigt den Editor des Feldtyps (`feldInputHTML`, wie
   im Bereich und im Assistenten), liest ihn mit demselben Leser wie der
   Assistent (`_feldWertAusEditor`), und der gemeinsame Weg legt den Wert in
   der Form des Feldtyps ab (Text über `_wertAusText`, Prüfung über
   `feldValidieren`, Listen über die listenEintrag-Wege).

   DER WÄCHTER ist die Klassenprobe: JEDES Katalogfeld (abgeleitet aus
   `bereicheAlle()`, nicht abgeschrieben), beide Ansichten, mit dem Wert, den
   der Editor liefert, und — wo ein Mensch tippt — mit dem getippten Text:
   ok:true, die Form des Typs, und die Ansicht liest das Feld danach als
   gefüllt. Ein Feldtyp ohne Regel in dieser Probe fällt mit Namen durch.

   Der DOM-Stub von load-kern verdrahtet keine Ereignisse
   (`querySelectorAll` → []). Darum hält die Bindungsprobe fest, DASS die
   Ansichten genau diesen Editor und genau diesen Weg nutzen; die übrigen
   Proben fahren den Weg selbst. Die Rot-Beweise laufen an einer Kopie des
   Kerns mit dem alten Weg (roher Text) und am alten Quelltext der Ansichten.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const PW = 'nachtragen-feldtyp-pw';
const V0 = ladeKern().V;   // nur zum Lesen der Texte

/* Echte Kennungen aus dem Register, in den Tests als Vorbedingung geprüft. */
const ALLERGIE = 'health.allergiesMedicationFoodOther';      // typ text + codeListe
const HAUSARZT = 'health.generalPractitioner';               // typ ref
/* Kennungsform, kein Feldtyp: ein Listen-Unterfeld, wie es eine Anfrage nennen darf (Prüfstoff der Heimaufnahme). */
const LISTEN_UNTERFELD = 'advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation';

async function depot(opts) {
  const { V, document } = ladeKern(opts);
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.zusammenstellungZuruecksetzen();
  return { V, document };
}
function anfrageMit(kennungen) {
  return {
    modulTyp: 'anfrage', anfrageVersion: 1,
    von: 'Klinik am Probenweg', zweck: 'Stationäre Aufnahme', grundlage: 'Behandlungsvertrag',
    vorgang: 'NACHTRAG-1', gestelltAm: '2026-10-19', gueltigBis: '2099-12-31',
    felder: kennungen.map((k) => ({ kennung: k, zweck: 'Aufnahme', pflicht: true })),
    antwort: { art: 'einmalpasswort', an: 'aufnahme@klinik.example.invalid' },
  };
}
function anfrageAnnehmen(V, kennungen) {
  const anfrage = anfrageMit(kennungen);
  const m = V.anfrageMerken(V.anfrageAusText(JSON.stringify(anfrage)), null);
  assert.equal(m.ok, true, 'Vorbedingung: die Anfrage ist angenommen');
  return { anfrage, eintrag: m.eintrag };
}

/* Die Klasse eines Felds: `codeListe` ist ein Attribut neben `typ` (s. Kommentar an `_wertAusText`), kein eigener Typ. */
const klasseVon = (def) => (def && def.codeListe) ? 'codeListe' : ((def && def.typ) || 'text');
const optionWahl = (def) => {
  const o = (def.optionen || []);
  return o.find((x) => x.label && x.label !== x.wert) || o[0];
};
const DATUM = (def) => String(Math.max(2020, Number(def.datumJahrMin) || 0)) + '-06-15';

/* Was der EDITOR des Feldtyps (`feldInputHTML`, gelesen mit `_feldWertAusEditor`) an den Weg gibt. */
const EDITOR = {
  text: () => 'Penicillin',
  textarea: () => 'Penicillin',
  datum: DATUM,
  auswahl: (def) => optionWahl(def).wert,
  mehrfachauswahl: (def) => [optionWahl(def).wert],
  checkbox: () => true,
  ref: () => ({ ref: '', override: 'Dr. Erika Muster' }),
  refMehrfach: () => [{ ref: '', override: 'Tochter Reiter' }],
  codeListe: () => [{ text: 'Penicillin' }],
  liste: (def, V) => listenEintrag(def, V),
};
/* Was ein Mensch TIPPT, wo der Editor getippten Text annimmt. Kästchen und ganze Liste haben keinen Text-Weg (s. Grenzen). */
const TEXT = {
  text: () => 'Penicillin',
  textarea: () => 'Penicillin',
  datum: DATUM,
  auswahl: (def) => optionWahl(def).label,
  mehrfachauswahl: (def) => optionWahl(def).label,
  ref: () => 'Dr. Erika Muster',
  refMehrfach: () => 'Tochter Reiter',
  codeListe: () => 'Penicillin',
};
/* Ein Eintrag, wie ihn der Listen-Editor liefert: das erste Unterfeld mit Eingabe, dazu jedes sichtbare Pflicht-Unterfeld. */
function listenEintrag(def, V) {
  const eintrag = {};
  const fuellen = (uf) => {
    const k = klasseVon(uf);
    if (EDITOR[k] && k !== 'liste') eintrag[uf.id] = EDITOR[k](uf, V);
  };
  const ufs = (def.unterFelder || []).filter((uf) => V.feldInputHTML(uf, undefined) !== '');
  if (ufs[0]) fuellen(ufs[0]);
  for (const uf of ufs) if (uf.pflicht && V.feldSichtbar(uf, eintrag) && eintrag[uf.id] === undefined) fuellen(uf);
  return eintrag;
}

const istVerweis = (e) => !!e && typeof e === 'object' &&
  ((typeof e.ref === 'string' && e.ref !== '') || (typeof e.override === 'string' && e.override.trim() !== ''));
/* Die Form des Feldtyps — was die Leser des Kerns als Wert dieses Typs lesen. */
const FORM = {
  text: (w) => typeof w === 'string' && w.trim() !== '',
  textarea: (w) => typeof w === 'string' && w.trim() !== '',
  datum: (w) => typeof w === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w),
  auswahl: (w, def) => (def.optionen || []).some((o) => o.wert === w),
  mehrfachauswahl: (w, def) => Array.isArray(w) && w.length > 0 && w.every((x) => (def.optionen || []).some((o) => o.wert === x)),
  checkbox: (w) => typeof w === 'boolean',
  ref: (w) => istVerweis(w),
  refMehrfach: (w) => Array.isArray(w) && w.length > 0 && w.every(istVerweis),
  liste: (w) => Array.isArray(w) && w.length > 0 && w.every((e) => e && typeof e === 'object' && typeof e.id === 'string'),
  codeListe: (w) => Array.isArray(w) && w.length > 0 && w.every((c) => c && typeof c.text === 'string' && c.text.trim() !== ''),
};

/* Das Register: JEDES Katalogfeld mit Kennung, das einen Editor hat und leer etwas zu tragen hätte. */
function registerFelder(V) {
  const raus = [];
  for (const s of V.bereicheAlle()) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
    const kennung = V.kennungAusSelektor(s.id, f.id);
    if (!kennung || !V.kennungPruefen(kennung).ok) continue;
    if (V.feldEingetragen(f, undefined) || V.feldInputHTML(f, undefined, undefined, s.id) === '') continue;
    raus.push({ klasse: klasseVon(f), kennung, sektorId: s.id, feldId: f.id, def: f });
  }
  return raus;
}
const gespeichert = (V, r) => V.feldRohwert(r.sektorId, r.feldId, (V.getData().sektoren || {})[r.sektorId] || {});

/* Ein Nachtrag je Feld über den Weg der Ansicht; liefert die Mängel als Sätze (leer = in Ordnung). Sammelnd, nicht werfend:
   ein werfender Prüfer bricht beim ersten Fund ab und verdeckt die folgenden (Lehre aus A44). */
function nachtragMaengel(V, weg, r, art) {
  const quelle = art === 'Text' ? TEXT : EDITOR;
  if (!quelle[r.klasse] && art === 'Text') return [];
  if (!quelle[r.klasse]) return [r.klasse + ' (' + r.kennung + '): Feldtyp ohne Regel in dieser Probe'];
  const erg = weg(r.kennung, quelle[r.klasse](r.def, V));
  if (!erg || !erg.ok) return [art + ' · ' + r.klasse + ' (' + r.kennung + '): ' + (erg && erg.grund) + (erg && erg.meldung ? ' — ' + erg.meldung : '')];
  if (!FORM[r.klasse]) return [r.klasse + ' (' + r.kennung + '): Feldtyp ohne Formregel in dieser Probe'];
  const w = gespeichert(V, r);
  return FORM[r.klasse](w, r.def) ? [] : [art + ' · ' + r.klasse + ' (' + r.kennung + '): ok:true, aber abgelegt als ' + JSON.stringify(w)];
}
/* DISKRIMINANTE der Klassenprobe, Zusammenstellen: jedes Feld, danach liest die Ansicht jedes als gefüllt. */
function maengelKlasseZusammenstellen(V, art) {
  const felder = registerFelder(V);
  const maengel = [];
  for (const r of felder) maengel.push(...nachtragMaengel(V, V.zusammenstellungFeldFuellen, r, art));
  const leer = new Set(V.zusammenstellenTreffer('').filter((t) => !t.gefuellt).map((t) => t.kennung));
  for (const r of felder) if ((art === 'Editor' || TEXT[r.klasse]) && leer.has(r.kennung)) maengel.push(art + ' · ' + r.klasse + ' (' + r.kennung + '): das Zusammenstellen zeigt das Feld danach leer');
  return maengel;
}
/* DISKRIMINANTE der Klassenprobe, Anfrage: eine Anfrage nach jedem Feld (und dem Listen-Unterfeld), jedes nachgetragen über
   die `fuellKennung`, danach führt die Anfrage keines mehr als fehlend. */
function maengelKlasseAnfrage(V, art) {
  const felder = registerFelder(V);
  const { anfrage } = anfrageAnnehmen(V, [...felder.map((r) => r.kennung), LISTEN_UNTERFELD]);
  const vorher = V.anfrageAbgleich(anfrage);
  const fuell = new Map(vorher.fehlend.map((f) => [f.kennung, f.fuellKennung || f.kennung]));
  const maengel = [];
  for (const r of felder) {
    if (!fuell.has(r.kennung)) { maengel.push(r.klasse + ' (' + r.kennung + '): Vorbedingung — die Anfrage führt das Feld nicht als fehlend'); continue; }
    maengel.push(...nachtragMaengel(V, (k, w) => V.anfrageFeldNachtragen(fuell.get(k), w), r, art));
  }
  const lu = V.anfrageFeldNachtragen(LISTEN_UNTERFELD, 'Ordner im Wohnzimmer');
  if (!lu.ok) maengel.push('Listen-Unterfeld (' + LISTEN_UNTERFELD + '): ' + lu.grund + (lu.meldung ? ' — ' + lu.meldung : ''));
  const nachher = new Set(V.anfrageAbgleich(anfrage).fehlend.map((f) => f.kennung));
  for (const r of felder) if ((art === 'Editor' || TEXT[r.klasse]) && nachher.has(r.kennung)) maengel.push(art + ' · ' + r.klasse + ' (' + r.kennung + '): die Anfrage führt das Feld danach weiter als fehlend');
  if (nachher.has(LISTEN_UNTERFELD)) maengel.push('Listen-Unterfeld (' + LISTEN_UNTERFELD + '): die Anfrage führt es danach weiter als fehlend');
  return maengel;
}

/* DISKRIMINANTE der Bindung: welche Stellen im Quelltext NICHT den Editor des Feldtyps und den gemeinsamen Weg nutzen. */
function bindungsMaengel(src) {
  const fn = (kopf) => {
    const a = src.indexOf(kopf);
    if (a < 0) return null;
    return src.slice(a, src.indexOf('\n}\n', a));
  };
  const maengel = [];
  const anfrage = fn('function renderAnfrage() {');
  const zus = fn('function renderZusammenstellen() {');
  const editor = fn('function _nachtragEditorHTML(');
  const verdrahten = fn('function _nachtragVerdrahten(');
  const wizard = fn('function _wizardAktuellerWert() {');
  if (!anfrage || !/_nachtragEditorHTML\(f\.fuellKennung \|\| f\.kennung, 'anfrage-fuellen'/.test(anfrage)) maengel.push('renderAnfrage zeigt nicht den Editor des Feldtyps');
  if (!anfrage || !/_nachtragVerdrahten\(c, 'anfrage-fuellen', \(k, wert\) => \{\s*const r = anfrageFeldNachtragen\(k, wert\)/.test(anfrage)) maengel.push('renderAnfrage schreibt nicht über anfrageFeldNachtragen mit dem Wert des Editors');
  if (!zus || !/_nachtragEditorHTML\(t\.kennung, 'zus-fuellen'/.test(zus)) maengel.push('renderZusammenstellen zeigt nicht den Editor des Feldtyps');
  if (!zus || !/_nachtragVerdrahten\(c, 'zus-fuellen', \(k, wert\) => \{\s*const r = zusammenstellungFeldFuellen\(k, wert\)/.test(zus)) maengel.push('renderZusammenstellen schreibt nicht über zusammenstellungFeldFuellen mit dem Wert des Editors');
  if (/type="text" class="feld-input zus-fuellen"/.test(src)) maengel.push('ein Nachtrage-Textfeld für alle Typen steht noch im Kern');
  if (!editor || !/feldInputHTML\(def, undefined, undefined, sel\.sektorId\)/.test(editor)) maengel.push('_nachtragEditorHTML nutzt nicht feldInputHTML');
  if (!verdrahten || !/_feldWertAusEditor\(box, def\)/.test(verdrahten)) maengel.push('_nachtragVerdrahten liest nicht mit _feldWertAusEditor');
  if (!verdrahten || !/flowListenEintragHinzufuegen\(sel\.sektorId, def, \{\}, \(eintrag\) => schreiben\(k, eintrag\)\)/.test(verdrahten)) maengel.push('_nachtragVerdrahten trägt Listen nicht über den Listen-Editor nach');
  if (!wizard || !/return _feldWertAusEditor\(c, /.test(wizard)) maengel.push('der Assistent liest nicht mit demselben _feldWertAusEditor');
  if (!/function anfrageFeldNachtragen\(kennung, wert\) \{ return zusammenstellungFeldFuellen\(kennung, wert\); \}/.test(src)) maengel.push('anfrageFeldNachtragen ist nicht derselbe Weg');
  return maengel;
}

/* Der alte Weg (bis 19.10.2026), wörtlich — für die Rot-Beweise an einer Kopie des Kerns. */
const ALTER_WEG = [
  'function zusammenstellungFeldFuellen(kennung, wert) {',
  '  const p = kennungPruefen(kennung);',
  '  if (!p.ok) return { ok: false, grund: p.grund };',
  '  const sel = kennungZuSelektor(kennung);',
  '  try { sektorFeldSetzen(sel.sektorId, sel.feldId, wert); }',
  "  catch (e) { return { ok: false, grund: 'schreiben', meldung: String(e && e.message || e) }; }",
  '  return { ok: true, kennung, bereich: sel.sektorId, feld: sel.feldId };',
  '}',
].join('\n');
function kernMitAltemWeg() {
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  const kopf = 'function zusammenstellungFeldFuellen(kennung, wert) {';
  const a = src.indexOf(kopf);
  assert.ok(a >= 0, 'Vorbedingung: der Weg steht im Kern');
  const e = src.indexOf('\n}\n', a) + 2;
  const ziel = path.join(os.tmpdir(), 'vd-nachtragen-alt-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(ziel, src.slice(0, a) + ALTER_WEG + src.slice(e), 'utf8');
  return ziel;
}

/* ══ Bindung ═══════════════════════════════════════════════════════════════ */

test('[Nachtragen·Bindung] beide Ansichten zeigen den Editor des Feldtyps und schreiben über den gemeinsamen Weg', () => {
  assert.deepEqual(bindungsMaengel(fs.readFileSync(HTML_PATH, 'utf8')), []);
});
test('[Nachtragen·Bindung·Rot-Beweis] der alte Quelltext der Ansichten (ein Textfeld, roher Text) schlägt an', () => {
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  const alt = src
    .replace("_nachtragEditorHTML(f.fuellKennung || f.kennung, 'anfrage-fuellen', f.label)",
      "'<input type=\"text\" class=\"feld-input zus-fuellen\" data-anfrage-fuellen=\"' + escapeHTML(f.kennung) + '\">'")
    .replace("const r = zusammenstellungFeldFuellen(k, wert)", 'const r = zusammenstellungFeldFuellen(k, inp.value)');
  assert.notEqual(alt, src, 'Vorbedingung: die Anker stehen im Kern');
  const m = bindungsMaengel(alt);
  assert.ok(m.includes('renderAnfrage zeigt nicht den Editor des Feldtyps'), m.join(' | '));
  assert.ok(m.includes('renderZusammenstellen schreibt nicht über zusammenstellungFeldFuellen mit dem Wert des Editors'), m.join(' | '));
  assert.ok(m.includes('ein Nachtrage-Textfeld für alle Typen steht noch im Kern'), m.join(' | '));
});

/* ══ Die Ansichten zeigen genau den Editor des Feldtyps ═════════════════════ */

test('[Nachtragen·Editor] Anfrage und Zusammenstellen zeigen für Allergie und Hausarzt den Editor aus feldInputHTML', async () => {
  const { V, document } = await depot();
  const { eintrag } = anfrageAnnehmen(V, [ALLERGIE, HAUSARZT]);
  V.oeffneAnfrage(eintrag.id);
  const htmlAnfrage = document.getElementById('content').innerHTML;
  V.renderZusammenstellen();
  const htmlZus = document.getElementById('content').innerHTML;
  for (const k of [ALLERGIE, HAUSARZT]) {
    const sel = V.kennungZuSelektor(k);
    const editor = V.feldInputHTML(V.kennungFeldDef(k), undefined, undefined, sel.sektorId);
    assert.ok(editor.length > 0, 'Vorbedingung: ' + k + ' hat einen Editor');
    assert.ok(htmlAnfrage.includes('data-anfrage-fuellen="' + k + '"') && htmlAnfrage.includes(editor), 'die Anfrage zeigt den Editor für ' + k);
    assert.ok(htmlZus.includes('data-zus-fuellen="' + k + '"') && htmlZus.includes(editor), 'das Zusammenstellen zeigt den Editor für ' + k);
  }
  assert.match(htmlAnfrage, /data-chip-liste="allergiesMedicationFoodOther"/, 'Chips für die Allergie');
  assert.match(htmlAnfrage, /data-edit-ref="generalPractitioner"/, 'Verweis-Auswahl für den Hausarzt');
  assert.doesNotMatch(htmlAnfrage + htmlZus, /type="text" class="feld-input zus-fuellen"/, 'kein Textfeld für alle Typen mehr');
});

/* ══ Abnahme (1): Code-Liste und Verweis über beide Ansichten ══════════════ */

test('[Nachtragen·Codeliste·Anfrage] eine Klinik fragt nach Allergien — „Penicillin“ lässt sich im Antwortweg nachtragen', async () => {
  const { V } = await depot();
  const { anfrage } = anfrageAnnehmen(V, [ALLERGIE]);
  assert.ok(V.anfrageAbgleich(anfrage).fehlend.some((f) => f.kennung === ALLERGIE), 'Vorbedingung: die Allergie fehlt');
  const r = V.anfrageFeldNachtragen(ALLERGIE, 'Penicillin');
  assert.equal(r.ok, true, JSON.stringify(r));
  const chips = V.getData().sektoren.health.allergiesMedicationFoodOther;
  assert.ok(FORM.codeListe(chips), 'als Chips abgelegt: ' + JSON.stringify(chips));
  assert.equal(chips.length, 1);
  assert.match(chips[0].text, /Penicillin/);
  assert.equal(V.anfrageAbgleich(anfrage).fehlend.length, 0, 'die Anfrage führt die Allergie nicht mehr als fehlend');
});

test('[Nachtragen·Codeliste·Zusammenstellen] „Penicillin“ lässt sich beim Zusammenstellen nachtragen — getippt und als Chip', async () => {
  const { V } = await depot();
  assert.equal(V.zusammenstellungFeldFuellen(ALLERGIE, 'Penicillin').ok, true);
  assert.ok(FORM.codeListe(V.getData().sektoren.health.allergiesMedicationFoodOther));
  const { V: V2 } = await depot();
  assert.equal(V2.zusammenstellungFeldFuellen(ALLERGIE, [{ text: 'Penicillin' }]).ok, true);
  assert.deepEqual(V2.getData().sektoren.health.allergiesMedicationFoodOther.map((c) => c.text), ['Penicillin']);
  assert.equal(V2.zusammenstellenTreffer('').find((t) => t.kennung === ALLERGIE).gefuellt, true);
});

test('[Nachtragen·Verweis·Anfrage] der Hausarzt lässt sich im Antwortweg nachtragen — getippt und aus der Auswahl', async () => {
  const { V } = await depot();
  const { anfrage } = anfrageAnnehmen(V, [HAUSARZT]);
  const r = V.anfrageFeldNachtragen(HAUSARZT, 'Dr. Erika Muster');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(V.getData().sektoren.health.generalPractitioner, { override: 'Dr. Erika Muster' });
  assert.equal(V.anfrageAbgleich(anfrage).fehlend.length, 0);
  const { V: V2 } = await depot();
  const p = V2.personSicherstellen('Dr. Erika Muster');
  const id = (p && p.id) || p;
  assert.equal(V2.anfrageFeldNachtragen(HAUSARZT, { ref: id, override: '' }).ok, true);
  assert.equal(V2.getData().sektoren.health.generalPractitioner.ref, id, 'die Auswahl legt den Verweis ins Register ab');
});

test('[Nachtragen·Verweis·Zusammenstellen] der Hausarzt lässt sich beim Zusammenstellen nachtragen', async () => {
  const { V } = await depot();
  const r = V.zusammenstellungFeldFuellen(HAUSARZT, 'Dr. Erika Muster');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(FORM.ref(V.getData().sektoren.health.generalPractitioner));
  assert.equal(V.zusammenstellenTreffer('').find((t) => t.kennung === HAUSARZT).gefuellt, true);
});

/* ══ Listen-Unterfeld aus einer Anfrage: DIE Zeile des Typs ════════════════ */

test('[Nachtragen·Listen-Unterfeld] der Ablageort der Vorsorgevollmacht landet in DER Zeile des Typs, nicht daneben', async () => {
  const { V } = await depot();
  assert.ok(V.kennungPruefen(LISTEN_UNTERFELD).ok, 'Vorbedingung: die Kennung ist gültig');
  const { anfrage } = anfrageAnnehmen(V, [LISTEN_UNTERFELD]);
  assert.equal(V.anfrageFeldNachtragen(LISTEN_UNTERFELD, 'Ordner im Wohnzimmer').ok, true);
  let zeilen = V.getData().sektoren.advanceCare.provisionInstruments;
  assert.equal(zeilen.length, 1, 'eine Zeile angelegt');
  assert.equal(zeilen[0].instrument, 'enduring-power-of-attorney');
  assert.equal(zeilen[0].storageLocation, 'Ordner im Wohnzimmer');
  assert.ok(!Object.keys(V.getData().sektoren.advanceCare).some((k) => k.startsWith('liste:')), 'kein Schlüssel neben den Feldern');
  assert.equal(V.anfrageAbgleich(anfrage).fehlend.length, 0);
  assert.equal(V.anfrageFeldNachtragen(LISTEN_UNTERFELD, 'Tresor').ok, true);
  zeilen = V.getData().sektoren.advanceCare.provisionInstruments;
  assert.equal(zeilen.length, 1, 'ein zweiter Nachtrag aktualisiert dieselbe Zeile');
  assert.equal(zeilen[0].storageLocation, 'Tresor');
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank' });
  const r = V.anfrageFeldNachtragen(LISTEN_UNTERFELD, 'Schublade');
  assert.deepEqual([r.ok, r.grund], [false, 'mehrdeutig'], 'zwei Zeilen des Typs: es wird nicht geraten');
  assert.equal(V.getData().sektoren.advanceCare.provisionInstruments[0].storageLocation, 'Tresor', 'und nichts geschrieben');
});

/* Mehrere Zeilen des Typs: nicht raten, sondern sagen, wo zu ergänzen ist — mit dem Weg dorthin. DISKRIMINANTE: die Mängel der
   Anfrage-Ansicht bei zwei Vorsorgevollmachten (leer = Satz und Knopf stehen da, kein Editor, nichts geschrieben). */
async function mehrdeutigMaengel(opts) {
  const { V, document } = await depot(opts);
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank' });
  const vorher = JSON.stringify(V.getData().sektoren.advanceCare);
  const { eintrag } = anfrageAnnehmen(V, [LISTEN_UNTERFELD]);
  V.oeffneAnfrage(eintrag.id);
  const html = document.getElementById('content').innerHTML;
  const bereich = V.SEKTOR_BY_ID.advanceCare.label;
  const maengel = [];
  const satz = V.STRINGS.anfrageNachtragMehrdeutig.replace('{bereich}', bereich);
  const knopf = V.STRINGS.anfrageNachtragBereichOeffnen.replace('{bereich}', bereich);
  if (!bereich) maengel.push('Vorbedingung: der Bereich hat im Register einen Namen');
  if (!html.includes('data-nachtrag-mehrdeutig="' + LISTEN_UNTERFELD + '"')) maengel.push('die Zeile ist nicht als mehrdeutig gekennzeichnet');
  if (!html.includes(V.escapeHTML(satz))) maengel.push('der Satz mit dem Bereichsnamen fehlt');
  if (!html.includes('data-nachtrag-bereich="advanceCare" data-nachtrag-liste="provisionInstruments">' + V.escapeHTML(knopf) + '</button>')) maengel.push('der Knopf zum Bereich fehlt');
  if (html.includes('data-anfrage-fuellen-ok="' + LISTEN_UNTERFELD + '"')) maengel.push('ein Editor wird angeboten, der nur scheitern kann');
  const r = V.anfrageFeldNachtragen(LISTEN_UNTERFELD, 'Schublade');
  if (r.ok || r.grund !== 'mehrdeutig') maengel.push('der Weg meldet nicht „mehrdeutig“: ' + JSON.stringify(r));
  if (JSON.stringify(V.getData().sektoren.advanceCare) !== vorher) maengel.push('es wurde geschrieben');
  return maengel;
}
test('[Nachtragen·Mehrdeutig] bei mehreren Zeilen des Typs stehen Satz und Knopf zum Bereich da, und nichts wird geschrieben', async () => {
  assert.ok(/[.!]$/.test(V0.STRINGS.anfrageNachtragMehrdeutig) && !/!/.test(V0.STRINGS.anfrageNachtragMehrdeutig), 'ruhig formuliert, ohne Ausrufezeichen');
  assert.deepEqual(await mehrdeutigMaengel(), []);
});
test('[Nachtragen·Mehrdeutig·Rot-Beweis] ohne den Zweig steht dort wieder ein Editor ohne Satz', async () => {
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  const anker = 'if (lsel && _nachtragListenZeilen(sel.sektorId, lsel).length > 1) {';
  assert.equal(src.split(anker).length - 1, 1, 'Vorbedingung: der Zweig steht genau einmal im Kern');
  const pfad = path.join(os.tmpdir(), 'vd-nachtragen-mehrdeutig-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(pfad, src.replace(anker, 'if (false) {'), 'utf8');
  try {
    const m = await mehrdeutigMaengel({ htmlPfad: pfad, backen: true });
    assert.ok(m.includes('der Satz mit dem Bereichsnamen fehlt'), m.join(' | '));
    assert.ok(m.includes('ein Editor wird angeboten, der nur scheitern kann'), m.join(' | '));
    assert.ok(!m.includes('es wurde geschrieben'), 'der Schreibweg rät auch ohne den Zweig nicht');
  } finally {
    fs.rmSync(pfad, { force: true });
  }
});

/* ══ Grenzen: was der Weg nicht aus Text macht ═════════════════════════════ */

test('[Nachtragen·Grenzen] Label wird Wert; Kästchen und ganze Liste nehmen keinen Text; ein unmögliches Datum wird abgewiesen', async () => {
  const { V } = await depot();
  assert.equal(V.zusammenstellungFeldFuellen('identity.gender', 'männlich').ok, true);
  assert.equal(V.getData().sektoren.identity.gender, 'm', 'das Label wird zum Wert der Auswahl');
  for (const [k, grund] of [['identity.displayFamilyNameFirst', 'form'], ['identity.idDocuments', 'form'], ['identity.birthDate', 'datum']]) {
    const r = V.zusammenstellungFeldFuellen(k, 'Penicillin');
    assert.deepEqual([r.ok, r.grund], [false, grund], k);
  }
  assert.equal(V.getData().sektoren.identity.displayFamilyNameFirst, undefined, 'nichts geschrieben');
  assert.equal(V.zusammenstellungFeldFuellen('identity.displayFamilyNameFirst', true).ok, true, 'das Kästchen nimmt den Wahrheitswert');
});

/* ══ Abnahme (3): der Klassenwächter über alle Katalogfelder ═══════════════ */

test('[Nachtragen·Register] die Felder des Registers sind abgeleitet und tragen alle Typen, um die es geht', async () => {
  const { V } = await depot();
  const felder = registerFelder(V);
  assert.ok(felder.length >= 300, 'das Register nennt Felder: ' + felder.length);
  const klassen = new Set(felder.map((r) => r.klasse));
  for (const k of ['text', 'textarea', 'datum', 'auswahl', 'mehrfachauswahl', 'checkbox', 'ref', 'refMehrfach', 'liste', 'codeListe']) {
    assert.ok(klassen.has(k), 'das Register kennt ' + k);
  }
  for (const k of klassen) assert.ok(EDITOR[k] && FORM[k], 'die Probe hat für ' + k + ' eine Editor- und eine Formregel');
});

test('[Nachtragen·Klasse·Zusammenstellen] jedes Katalogfeld lässt sich beim Zusammenstellen nachtragen, mit dem Wert des Editors', async () => {
  const { V } = await depot();
  assert.deepEqual(maengelKlasseZusammenstellen(V, 'Editor'), []);
});
test('[Nachtragen·Klasse·Zusammenstellen·Text] jedes Katalogfeld mit Text-Eingabe nimmt beim Zusammenstellen den getippten Text', async () => {
  const { V } = await depot();
  assert.deepEqual(maengelKlasseZusammenstellen(V, 'Text'), []);
});
test('[Nachtragen·Klasse·Anfrage] jedes Katalogfeld lässt sich im Antwortweg einer Anfrage nachtragen, mit dem Wert des Editors', async () => {
  const { V } = await depot();
  assert.deepEqual(maengelKlasseAnfrage(V, 'Editor'), []);
});
test('[Nachtragen·Klasse·Anfrage·Text] jedes Katalogfeld mit Text-Eingabe nimmt im Antwortweg den getippten Text', async () => {
  const { V } = await depot();
  assert.deepEqual(maengelKlasseAnfrage(V, 'Text'), []);
});

/* ══ Rot-Beweis am alten Weg (roher Text an sektorFeldSetzen) ══════════════ */

test('[Nachtragen·Rot-Beweis] mit dem alten Weg schlagen Codeliste, Verweis, Liste und Listen-Unterfeld an', async () => {
  const pfad = kernMitAltemWeg();
  try {
    const { V } = await depot({ htmlPfad: pfad, backen: true });
    const r = V.zusammenstellungFeldFuellen(ALLERGIE, 'Penicillin');
    assert.deepEqual([r.ok, r.grund], [false, 'schreiben'], 'der Befund, wie gemessen');
    const zus = maengelKlasseZusammenstellen(V, 'Text');
    for (const k of ['codeListe', 'ref', 'refMehrfach', 'auswahl']) {
      assert.ok(zus.some((s) => s.includes(' · ' + k + ' (')), 'Zusammenstellen/Text schlägt an für ' + k);
    }
    const { V: V2 } = await depot({ htmlPfad: pfad, backen: true });
    const anf = maengelKlasseAnfrage(V2, 'Editor');
    assert.ok(anf.some((s) => s.includes(' · liste (')), 'Anfrage/Editor schlägt an für liste');
    assert.ok(anf.some((s) => s.startsWith('Listen-Unterfeld')), 'und für das Listen-Unterfeld');
  } finally {
    fs.rmSync(pfad, { force: true });
  }
});

module.exports = {
  PROBEN: [
    { fuer: '[Nachtragen·Bindung] beide Ansichten zeigen den Editor des Feldtyps und schreiben über den gemeinsamen Weg', diskriminante: bindungsMaengel },
    { fuer: '[Nachtragen·Klasse·Zusammenstellen] jedes Katalogfeld lässt sich beim Zusammenstellen nachtragen, mit dem Wert des Editors', diskriminante: maengelKlasseZusammenstellen },
    { fuer: '[Nachtragen·Klasse·Anfrage] jedes Katalogfeld lässt sich im Antwortweg einer Anfrage nachtragen, mit dem Wert des Editors', diskriminante: maengelKlasseAnfrage },
  ],
};
