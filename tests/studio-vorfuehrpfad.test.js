'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Studio auf dem Weg einer Vorführung: was am iPad hakte, ohne Umweg (Prüfung 14.10.2026; Nachtrag U2-ADR-493)
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   (1) „Ihr Zeichen“ in der Anfrage: der Vorschlag „Anfrage-<Datum>“ ist Platzhalter, nicht Text. Getipptes ersetzt ihn,
       statt an ihn angehängt zu werden; ein leeres Feld nimmt den Vorschlag.
   (2) Eine Liste mit Unterfeldern bekommt unter „Vorschau“ einen Knopf mit Wirkung. Hier der DOM-freie Teil und die
       Bindung; das Antippen im Browser prüft tests/e2e-cross/T-CROSS-41-studio-vorfuehrpfad.spec.js.
   (3) Die Kennungen der Feldliste sind ab Werk eingeklappt und über einen Schalter erreichbar; was die Vorlage trägt, hängt
       am Schalter nicht (die Einreichung ist byte-gleich).
   (4) Beispiele der Fachebene: Gesundheit höchstens ein Drittel aller Beispiele, abgerundet; jedes Beispiel hat seine
       Kachel und besteht die Vorprüfung ohne Liste ohne Zeilen.
   (5) Erscheinungsbild ohne Signatur: ein Hinweis mit der Folge statt einer roten Fehlermeldung; die Regel (nur signiert)
       bleibt unberührt.
   Jede Prüfung mit Rot-Beweis an einer veränderten Fassung (ladeGenerator({ html })).
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));
const ersetzt = (alt, neu) => { assert.ok(HTML.includes(alt), 'Vorbedingung: die Stelle steht noch so da: ' + alt.slice(0, 60)); return HTML.replace(alt, neu); };

/* ── (1) „Ihr Zeichen“ ─────────────────────────────────────────────────────────────────────────────────────── */
/* Das Feld zeigt ANF_AS.vorgang (anfrageAssistentZeigen); wer hineintippt, hängt an das an, was dort steht. */
function tippeZeichen(V, text) { V.ANF_AS.vorgang = V.ANF_AS.vorgang + text; }
test('[Vorführpfad · Zeichen] der Vorschlag ist Platzhalter: Getipptes ersetzt ihn, ein leeres Feld nimmt ihn', () => {
  const { V } = ladeGenerator();
  V.anfrageAssistentNeu();
  assert.equal(V.ANF_AS.vorgang, '', 'das Feld ist leer');
  assert.match(V.ANF_AS.vorgangVorschlag, /^Anfrage-\d{4}-\d{2}-\d{2}$/);
  assert.equal(V.anfrageAssistentState().anfrage.vorgang, V.ANF_AS.vorgangVorschlag, 'leer gilt der Vorschlag');
  assert.deepEqual(nativ(V.anfrageAssistentLuecken(1)).filter((l) => l[0] === 'aa-vorgang'), [], 'leer ist keine Lücke');
  tippeZeichen(V, 'MA-117');
  assert.equal(V.anfrageAssistentState().anfrage.vorgang, 'MA-117');
});
test('[Vorführpfad · Zeichen · Rot-Beweis] mit dem Vorschlag als Text hängt Getipptes an', () => {
  const { V } = ladeGenerator({ html: ersetzt("vorgang: '', vorgangVorschlag: 'Anfrage-' + _aaHeute(),", "vorgang: 'Anfrage-' + _aaHeute(), vorgangVorschlag: '',") });
  V.anfrageAssistentNeu();
  tippeZeichen(V, 'MA-117');
  assert.match(V.anfrageAssistentState().anfrage.vorgang, /^Anfrage-\d{4}-\d{2}-\d{2}MA-117$/);
});

/* ── (2) Liste unter „Vorschau“ ─────────────────────────────────────────────────────────────────────────── */
const LISTE = { feldname: 'Weitere Personen', feldtyp: 'liste', unterFelder: [{ feldname: 'Vorname', feldtyp: 'text' }, { feldname: 'Geburtsdatum', feldtyp: 'datum' }] };
function listenZweig(html) {
  const a = html.indexOf('function vorschauSteuer(f) {');
  return html.slice(a, html.indexOf('\n}\n', a));
}
function listeSteuerKoerper(html) {
  const a = html.indexOf('function listeSteuer(box, f) {');
  return a < 0 ? '' : html.slice(a, html.indexOf('\n}\n', a));
}
test('[Vorführpfad · Liste] eine Liste mit Unterfeldern bekommt unter „Vorschau“ einen Knopf mit Wirkung, ohne Unterfelder einen Satz', () => {
  const { V } = ladeGenerator();
  assert.deepEqual(nativ(V.listeUnterfelder(LISTE)).map((u) => u.feldname), ['Vorname', 'Geburtsdatum']);
  assert.deepEqual(nativ(V.listeUnterfelder({ feldtyp: 'liste' })), []);
  assert.match(listenZweig(HTML), /t === 'liste'\) listeSteuer\(box, f\)/, 'der Listenzweig geht über listeSteuer');
  const k = listeSteuerKoerper(HTML);
  assert.match(k, /if \(probierenAn\) knopf\.addEventListener\('click'/, 'der Knopf wirkt unter „Vorschau“');
  assert.match(k, /listeEintragAnhaengen\(/);
  assert.match(k, /keine Unterfelder/, 'ohne Unterfelder ein Satz statt eines Knopfs');
});
test('[Vorführpfad · Liste · Rot-Beweis] der frühere Knopf ohne Wirkung fällt auf', () => {
  const alt = ersetzt("  } else if (t === 'liste') listeSteuer(box, f);\n",
    "  } else if (t === 'liste') box.appendChild(el('button', { type: 'button', class: 'sekundaer mini', text: L('+ Eintrag hinzufügen', '+ Add entry') }));\n");
  assert.doesNotMatch(listenZweig(alt), /listeSteuer\(box, f\)/);
});

/* ── (3) Kennungen eingeklappt, Einreichung byte-gleich ─────────────────────────────────────────────────────── */
function templatesMit(V, zeigen) {
  V.paletteKennungenSetzen(zeigen);
  const idx = ['identity.givenName', 'identity.familyName', 'identity.birthDate'].map((k) => V.FELDKATALOG.findIndex((x) => x.kennung === k));
  assert.ok(idx.every((i) => i >= 0), 'die Katalogfelder gibt es');
  const felder = [];
  for (const i of idx) felder.push(V.feldAusBasisBauen(V.feldAusKatalog(i), felder, felder.length).feld);
  const state = { felder, anbieter: V.baueAnbieter({ anbieterName: 'Stadtbibliothek Beispielstadt', strasse: 'Am Markt 2', plz: '99999', ort: 'Beispielstadt',
    land: 'Deutschland', kontaktName: 'Ausleihe', kontaktEmail: 'ausleihe@beispielstadt.example' }), publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'a' } };
  return JSON.stringify(V.baueSubmission(state).templates);
}
test('[Vorführpfad · Kennungen] ab Werk eingeklappt, über den Schalter erreichbar; die Einreichung ist mit und ohne Schalter byte-gleich', () => {
  const { V } = ladeGenerator();
  assert.equal(V.paletteKennungenAbWerk(), false, 'ab Werk eingeklappt');
  assert.equal(V.paletteKennungKlein('identity.givenName'), null, 'eingeklappt: keine Zeile mit der Kennung');
  V.paletteKennungenSetzen(true);
  assert.notEqual(V.paletteKennungKlein('identity.givenName'), null, 'mit Schalter: die Kennung steht da');
  assert.match(HTML, /<label class="pal-kennungen"><input type="checkbox" id="pal-kennungen">/, 'der Schalter steht in der Feldliste');
  assert.match(HTML, /an\('pal-kennungen', 'change'/, 'der Schalter ist gebunden');
  assert.match(HTML, /el\('span', \{ title: e\.kennung, 'data-kennung': e\.kennung \}/, 'jede Zeile trägt die Kennung weiter');
  const aus = templatesMit(V, false), an = templatesMit(V, true);
  assert.equal(aus, an, 'byte-gleich');
  assert.doesNotMatch(aus, /identity\.|_kennung/, 'die Vorlage trägt keine Kennung, wie bisher');
});
test('[Vorführpfad · Kennungen · Rot-Beweis] eine ab Werk sichtbare Kennung fällt auf, und eine Vorlage, die vom Schalter abhängt, ist nicht byte-gleich', () => {
  const sichtbar = ladeGenerator({ html: ersetzt('let paletteKennungenZeigen = false;', 'let paletteKennungenZeigen = true;') }).V;
  assert.notEqual(sichtbar.paletteKennungKlein('identity.givenName'), null);
  const alt = '  return { feldname: katalogLabel(k), bereich:';
  const abhaengig = ladeGenerator({ html: ersetzt(alt, "  return { hilfetext: paletteKennungenZeigen ? k.kennung : '', feldname: katalogLabel(k), bereich:") }).V;
  assert.notEqual(templatesMit(abhaengig, false), templatesMit(abhaengig, true));
});

/* ── (4) Beispiele: Gesundheit höchstens ein Drittel ─────────────────────────────────────────────────────────── */
const GESUNDHEIT = /Gesundheit|Pflege|Patient|Anamnese|Arzt|Ärzt|Klinik|Kranken|Praxis|health|care home|patient|medical|clinic/i;
function istGesundheit(V, b) {
  return b.felder.some((f) => V.normBereich(f.bereich) === 'health') || GESUNDHEIT.test(b.titel + ' ' + (b.beschreibung || ''));
}
function beispielBefunde(V, html) {
  const ids = Object.keys(V.BEISPIEL_TEMPLATES);
  const raus = [];
  const gesund = ids.filter((id) => istGesundheit(V, V.BEISPIEL_TEMPLATES[id]));
  if (gesund.length > Math.floor(ids.length / 3)) raus.push('Gesundheit ' + gesund.length + ' von ' + ids.length);
  for (const id of ids) if (!html.includes('id="bsp-' + id + '"')) raus.push('ohne Kachel: ' + id);
  for (const m of html.matchAll(/id="bsp-([a-z]+)"/g)) if (!ids.includes(m[1])) raus.push('Kachel ohne Beispiel: ' + m[1]);
  return raus;
}
test('[Vorführpfad · Beispiele] Gesundheit höchstens ein Drittel aller Beispiele (abgerundet); jedes Beispiel hat seine Kachel; Verein, Kommune, Bibliothek, Arbeitgeber sind da', () => {
  const { V } = ladeGenerator();
  assert.deepEqual(beispielBefunde(V, HTML), []);
  for (const id of ['verein', 'kommune', 'bibliothek', 'arbeitgeber']) assert.ok(V.BEISPIEL_TEMPLATES[id], id);
  // Positivkontrolle: die Zählung erkennt Gesundheit überhaupt.
  assert.ok(Object.keys(V.BEISPIEL_TEMPLATES).filter((id) => istGesundheit(V, V.BEISPIEL_TEMPLATES[id])).length >= 1);
});
test('[Vorführpfad · Beispiele] jedes Beispiel besteht die Vorprüfung, und keine Liste steht ohne Unterfelder da', () => {
  const { V } = ladeGenerator();
  for (const [id, b] of Object.entries(V.BEISPIEL_TEMPLATES)) {
    const felder = nativ(V.felderAngleichungen(b.felder.map((f) => Object.assign({}, f, { bereich: V.normBereich(f.bereich) }))).felder);
    const state = { felder, anbieter: V.baueAnbieter({ anbieterName: 'Beispielstelle', strasse: 'Am Markt 2', plz: '99999', ort: 'Beispielstadt', land: 'Deutschland',
      kontaktName: 'Ansprechperson', kontaktEmail: 'kontakt@beispielstadt.example' }), publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'a' } };
    const u = V.vorabUrteilVorlage(state);
    assert.notEqual(u.urteil, 'abgewiesen', id + ': ' + JSON.stringify(u.zeilen));
    assert.deepEqual(nativ(V.fehlstellenAuskunft(state).ohneZeilen), [], id + ': Liste ohne Unterfelder');
    assert.deepEqual(nativ(V.validiereSubmission(V.baueSubmission(state))), [], id + ': Einreich-Schema');
  }
});
test('[Vorführpfad · Beispiele · Rot-Beweis] ohne die vier neuen Beispiele ist Gesundheit mehr als ein Drittel, und eine Kachel ohne Beispiel fällt auf', () => {
  const a = HTML.indexOf('  verein: {\n'), e = HTML.indexOf('  pflegeheim: {\n');
  assert.ok(a > 0 && e > a, 'Vorbedingung: die neuen Beispiele stehen vor pflegeheim');
  const ohne = HTML.slice(0, a) + HTML.slice(e);
  const { V } = ladeGenerator({ html: ohne });
  const b = beispielBefunde(V, ohne);
  assert.ok(b.some((x) => /^Gesundheit 2 von 3$/.test(x)), b.join(' | '));
  assert.ok(b.some((x) => x === 'Kachel ohne Beispiel: verein'), b.join(' | '));
});

/* ── (5) Erscheinungsbild ohne Signatur: Hinweis mit Folge ──────────────────────────────────────────────────── */
const SIGNIERT_ZWEIG = 'if (umschlag.modulSignaturJws)';
const FOLGE_DE = /erst angewendet, wenn es signiert und von Vivodepot bestätigt ist/;
const FOLGE_EN = /applied only once it is signed and confirmed by Vivodepot/;
function brandingKoerper(html) {
  const a = html.indexOf('async function brandingErzeugen(');
  return html.slice(a, html.indexOf('\n}\n', a));
}
test('[Vorführpfad · Erscheinungsbild] ohne Signatur ein Hinweis mit der Folge und dem Weg, keine rote Fehlermeldung; die Regel bleibt', () => {
  const { V } = ladeGenerator();
  V.spracheFuerProbeSetzen('de'); assert.match(V.brandingOhneSignaturSatz(), FOLGE_DE);
  V.spracheFuerProbeSetzen('en'); assert.match(V.brandingOhneSignaturSatz(), FOLGE_EN);
  V.spracheFuerProbeSetzen('de');
  const k = brandingKoerper(HTML);
  const sonst = k.slice(k.indexOf(SIGNIERT_ZWEIG));
  assert.match(sonst, /ergBox\.className = 'meldung warn';\s*\n\s*ergBox\.appendChild\(el\('strong', \{ text: brandingOhneSignaturSatz\(\) \}\)\)/);
  assert.match(sonst, /id: 'bd-angaben'/, 'der Knopf zu Angaben und Schlüssel');
  assert.doesNotMatch(sonst.slice(0, sonst.indexOf('if (pruefung.warnungen.length)')), /meldung fehler/);
  // Die Regel: ein Erscheinungsbild geht nur geprüft ein. Hier nur, dass der Einlass dasselbe Urteil fällt wie bisher.
  assert.match(k, /const einlass = einlassUrteil\('branding', baueBrandingModul\(state\)\);/);
});
test('[Vorführpfad · Erscheinungsbild · Rot-Beweis] die frühere rote Meldung ohne Folge fällt auf', () => {
  const alt = ersetzt("    ergBox.className = 'meldung warn';\n    ergBox.appendChild(el('strong', { text: brandingOhneSignaturSatz() }));",
    "    ergBox.className = 'meldung fehler';\n    ergBox.appendChild(el('strong', { text: 'Modul ohne Signatur.' }));");
  const k = brandingKoerper(alt);
  const ohneSignatur = k.slice(k.indexOf(SIGNIERT_ZWEIG));
  assert.doesNotMatch(ohneSignatur, /ergBox\.className = 'meldung warn';/);
});

/* ── (6) Bearbeiten im Editor erhält die Unterfelder einer Liste ─────────────────────────────────────────────── */
/* Gefunden beim Bau dieser Probe: feldUebernehmen baute das Feld nur aus den Eingaben des Editors und ersetzte damit das alte;
   eine Liste verlor bei jeder Eingabe ihre Unterfelder (die der Editor nicht kennt). */
function listeBearbeiten(V, document) {
  V.STATE.felder = [{ feldname: 'Weitere Personen', feldtyp: 'liste', pflicht: false, bereich: 'administration', provenienzPflichtig: true,
    unterFelder: [{ feldname: 'Vorname', feldtyp: 'text' }, { feldname: 'Nachname', feldtyp: 'text' }, { feldname: 'Geburtsdatum', feldtyp: 'datum' }] }];
  V.editorIndexSetzen(0);
  const setze = (id, w) => { const n = document.getElementById(id); assert.ok(n, 'Editor-Feld ' + id); n.value = w; };
  setze('ed-name', 'Weitere Personen im Ausweis'); setze('ed-typ', 'liste'); setze('ed-bereich', 'administration');
  setze('ed-gruppe', ''); setze('ed-hilfetext', ''); setze('ed-ziel', '');
  document.getElementById('ed-pflicht').checked = false; document.getElementById('ed-provenienz').checked = true;
  assert.equal(V.feldUebernehmen(true), true, 'der Editor übernimmt');
  return nativ(V.STATE.felder[0]);
}
test('[Vorführpfad · Editor] ein umbenanntes Listenfeld behält seine Unterfelder', () => {
  const { V, document } = ladeGenerator();
  const f = listeBearbeiten(V, document);
  assert.equal(f.feldname, 'Weitere Personen im Ausweis');
  assert.deepEqual((f.unterFelder || []).map((u) => u.feldname), ['Vorname', 'Nachname', 'Geburtsdatum']);
});
test('[Vorführpfad · Editor · Rot-Beweis] ohne die Übernahme der Unterfelder verliert die Liste sie beim Umbenennen', () => {
  const zeile = "  if (roh.feldtyp === 'liste' && vorher && Array.isArray(vorher.unterFelder)) roh.unterFelder = vorher.unterFelder.map((u) => Object.assign({}, u));\n";
  const { V, document } = ladeGenerator({ html: ersetzt(zeile, '') });
  const f = listeBearbeiten(V, document);
  assert.equal((f.unterFelder || []).length, 0);
});

test('[Vorführpfad · Raumwechsel] ein neuer Raum beginnt oben, sofort und ohne Animation', () => {
  const quelle = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
  const ab = quelle.indexOf('function raumZeigen(');
  const rumpf = quelle.slice(ab, quelle.indexOf('\n}\n', ab));
  assert.ok(/html \{ scroll-behavior: smooth; \}/.test(quelle), 'Vorbedingung: die Seite rollt sonst weich');
  assert.match(rumpf, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'instant' \}\)/, 'der Raumwechsel springt nach oben');
  assert.match(rumpf, /try \{ window\.scrollTo\(\{ top: 0, left: 0, behavior: 'instant' \}\); \} catch \(_\) \{ window\.scrollTo\(0, 0\); \}/, 'ein Browser ohne „instant“ fällt auf den alten Aufruf zurück, statt abzubrechen');
  // Am Verhalten: ein scrollTo, das das Wörterbuch ablehnt, lässt raumZeigen nicht scheitern.
  const aufrufe = [];
  const fenster = { scrollTo: (a) => { aufrufe.push(a); if (typeof a === 'object') throw new TypeError('behavior'); } };
  const raumZeigen = new Function('window', '$', rumpf + '\n}\nreturn raumZeigen;')(fenster, () => null);
  assert.doesNotThrow(() => raumZeigen('bau'));
  assert.deepEqual(aufrufe.map((a) => typeof a), ['object', 'number'], 'erst mit Wörterbuch, dann der Rückfall');
  // Rot-Beweis 1: der frühere Aufruf scrollTo(0, 0) allein folgt scroll-behavior: smooth und animiert — die Prüfung oben fiele.
  const frueher = rumpf.replace("try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (_) { window.scrollTo(0, 0); }", 'window.scrollTo(0, 0);');
  assert.doesNotMatch(frueher, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'instant' \}\)/, 'Rot-Beweis 1: ohne die Angabe animiert der Wechsel');
  // Rot-Beweis 2: ohne Rückfall bricht raumZeigen in einem Browser ab, der das Wörterbuch ablehnt.
  const ohneRueckfall = rumpf.replace("try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (_) { window.scrollTo(0, 0); }", "window.scrollTo({ top: 0, left: 0, behavior: 'instant' });");
  assert.notEqual(ohneRueckfall, rumpf, 'Kontrolle: die Zeile wurde ersetzt');
  const ohne = new Function('window', '$', ohneRueckfall + '\n}\nreturn raumZeigen;')(fenster, () => null);
  assert.throws(() => ohne('bau'), TypeError, 'Rot-Beweis 2: ohne Rückfall wirft der Raumwechsel');
});

/* ── (7) Anordnung nach Bereichen (15.10.2026) ──────────────────────────────────────────────────────────────────
   Ein Feld aus dem Register kommt in seinen Bereich, in Katalog-Reihenfolge; Identität & Person steht vorn. „Nach Bereichen
   ordnen“ sortiert vorhandene Felder einmal so. Die Einreichung bleibt gültig und trägt die neue Reihenfolge. */
const KAT = (V, kennung) => { const i = V.FELDKATALOG.findIndex((k) => k.kennung === kennung); assert.ok(i >= 0, kennung); return i; };
const ERSTES_FINANZFELD = (V) => { const i = V.FELDKATALOG.findIndex((k) => k.bereich === 'finance' && k.kennung.indexOf('/') < 0 && k.kennung.indexOf('[') < 0); assert.ok(i >= 0); return i; };
function vierPerPlus(V) {
  V.STATE.felder = [];
  for (const i of [KAT(V, 'identity.birthDate'), ERSTES_FINANZFELD(V), KAT(V, 'identity.givenName'), KAT(V, 'identity.familyName')]) V.feldEinfuegen(V.feldAusKatalog(i), null);
  return V.STATE.felder.map((f) => f.bereich + ':' + f.feldname);
}
test('[Vorführpfad · Feldordnung] ein Feld per + kommt in seinen Bereich, in Katalog-Reihenfolge; Personendaten stehen vorn', () => {
  const { V } = ladeGenerator();
  V.spracheFuerProbeSetzen('de');
  const reihe = vierPerPlus(V);
  assert.deepEqual(reihe.map((x) => x.split(':')[0]), ['identity', 'identity', 'identity', 'finance']);
  const namen = reihe.slice(0, 3).map((x) => x.split(':')[1]);
  const erwartet = ['identity.givenName', 'identity.familyName', 'identity.birthDate']
    .map((k) => V.FELDKATALOG[KAT(V, k)]).sort((a, b) => V.FELDKATALOG.indexOf(a) - V.FELDKATALOG.indexOf(b)).map((k) => k.label);
  assert.deepEqual(namen, erwartet);
});
test('[Vorführpfad · Feldordnung · Rot-Beweis] ohne das Einordnen stehen die Felder in der Folge des Antippens', () => {
  const zeile = '  if (pos == null && basis && basis._kennung) pos = einordnungsIndex(STATE.felder, basis);\n';
  const { V } = ladeGenerator({ html: ersetzt(zeile, '') });
  V.spracheFuerProbeSetzen('de');
  assert.equal(vierPerPlus(V)[1].split(':')[0], 'finance');
});
function gemischt(V) {
  const f = (i) => V.feldAusBasisBauen(V.feldAusKatalog(i), [], 0).feld;
  return [f(ERSTES_FINANZFELD(V)), { feldname: 'Eigene Frage', feldtyp: 'text', pflicht: false, bereich: 'identity', provenienzPflichtig: true },
    f(KAT(V, 'identity.birthDate')), f(KAT(V, 'identity.givenName'))];
}
test('[Vorführpfad · Feldordnung] „Nach Bereichen ordnen“: Bereiche in fester Folge, Katalog-Reihenfolge darin; die Einreichung ist gültig und trägt die Folge', () => {
  const { V } = ladeGenerator();
  V.spracheFuerProbeSetzen('de');
  const sortiert = nativ(V.felderNachBereichen(gemischt(V)));
  assert.deepEqual(sortiert.map((x) => x.bereich), ['identity', 'identity', 'identity', 'finance']);
  assert.equal(sortiert[2].feldname, 'Eigene Frage', 'ein eigenes Feld steht hinter den Registerfeldern seines Bereichs');
  const state = { felder: sortiert, anbieter: V.baueAnbieter({ anbieterName: 'Beispielstelle', strasse: 'Am Markt 2', plz: '99999', ort: 'Beispielstadt', land: 'Deutschland',
    kontaktName: 'Ansprechperson', kontaktEmail: 'kontakt@beispielstadt.example' }), publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'a' } };
  const paket = V.baueSubmission(state);
  assert.deepEqual(nativ(V.validiereSubmission(paket)), [], 'Einreich-Schema');
  assert.notEqual(V.vorabUrteilVorlage(state).urteil, 'abgewiesen', 'Vorprüfung gegen den Torwächter des Kerns');
  assert.deepEqual(nativ(paket.templates[0].felder).map((x) => x.feldname), sortiert.map((x) => x.feldname), 'die Einreichung trägt die neue Folge');
  // Der Knopf ist da und gebunden.
  assert.match(HTML, /<button type="button" class="sekundaer mini" id="tpl-ordnen" data-en="Sort by section">Nach Bereichen ordnen<\/button>/);
  assert.match(HTML, /an\('tpl-ordnen', 'click', felderOrdnen\);/);
  // Ziehen in die leere Fläche ordnet ein, Ziehen auf eine Karte setzt genau dorthin.
  assert.match(HTML, /feldEinfuegen\(feldAusKatalog\(d\.idx\), z\.karte \? z\.index : null\)/);
});
test('[Vorführpfad · Feldordnung · Rot-Beweis] ein Ordnen, das nichts ordnet, fällt auf', () => {
  const alt = ersetzt("  return felder.map((f, i) => ({ f, i, r: feldRang(f) })).sort((x, y) => feldRangVergleich(x.r, y.r) || x.i - y.i).map((x) => x.f);",
    '  return felder.slice();');
  const { V } = ladeGenerator({ html: alt });
  assert.equal(nativ(V.felderNachBereichen(gemischt(V)))[0].bereich, 'finance');
});

/* ── (8) Kein Doppel aus dem Register (15.10.2026) ─────────────────────────────────────────────────────────────── */
test('[Vorführpfad · Feldordnung] ein Registerfeld, das schon da ist, wird nicht noch einmal angelegt; das Studio sagt es', () => {
  const { V, document } = ladeGenerator();
  V.spracheFuerProbeSetzen('de');
  V.STATE.felder = [];
  const vor = KAT(V, 'identity.givenName');
  V.feldEinfuegen(V.feldAusKatalog(vor), null);
  V.feldEinfuegen(V.feldAusKatalog(vor), null);
  V.feldEinfuegen(V.feldAusKatalog(vor), 0);   // auch an eine bestimmte Stelle gezogen nicht
  assert.equal(V.STATE.felder.length, 1);
  assert.match(document.getElementById('tpl-csv-status').textContent, /ist schon in der Vorlage/);
  V.spracheFuerProbeSetzen('en');
  V.feldEinfuegen(V.feldAusKatalog(vor), null);
  assert.match(document.getElementById('tpl-csv-status').textContent, /is already in the template/);
});
test('[Vorführpfad · Feldordnung · Rot-Beweis] ohne die Prüfung entsteht ein zweiter „Vorname“', () => {
  const { V } = ladeGenerator({ html: ersetzt('  const da = vorhandenesRegisterfeld(basis);\n', '  const da = -1;\n') });
  V.STATE.felder = [];
  const vor = KAT(V, 'identity.givenName');
  V.feldEinfuegen(V.feldAusKatalog(vor), null); V.feldEinfuegen(V.feldAusKatalog(vor), null);
  assert.equal(V.STATE.felder.length, 2);
});

/* ── (9) „Vorschau“ statt „Ausprobieren“ (15.10.2026) ─────────────────────────────────────────────────────────── */
const OHNE_KOMMENTARE = (h) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PROBIER_WORT = /Ausprobier|Probieren Sie|Try it|Try out|Try things/i;
test('[Vorführpfad · Vorschau] der Knopf heißt „Vorschau“ / „Preview“, und kein Studio-Text sagt mehr „Ausprobieren“ oder „Try out“', () => {
  assert.match(HTML, /<button type="button" id="ansicht-probieren" aria-pressed="false" data-en="Preview">Vorschau<\/button>/);
  assert.match(HTML, /<button type="button" id="ansicht-bauen" aria-pressed="true" data-en="Edit">Bearbeiten<\/button>/);
  assert.doesNotMatch(OHNE_KOMMENTARE(HTML), PROBIER_WORT);
});
test('[Vorführpfad · Vorschau · Rot-Beweis] der alte Knopftext fällt auf, deutsch und englisch', () => {
  const alt = ersetzt('data-en="Preview">Vorschau</button>', 'data-en="Try it">Ausprobieren</button>');
  assert.match(OHNE_KOMMENTARE(alt), PROBIER_WORT);
  assert.match(OHNE_KOMMENTARE(HTML.replace('data-en="Preview">Vorschau</button>', 'data-en="Try it out">Vorschau</button>')), PROBIER_WORT);
});

/* ── (10) Anfrage: Ergebnis in der Reihenfolge Brief, Passwort, Link; jeder Knopf sagt, für wen; Hinweis zur Signatur ─ */
function ergebnisKoerper(html) {
  const a = html.indexOf('async function anfrageAssistentErzeugen');
  return html.slice(a, html.indexOf('\n}\n', a));
}
test('[Vorführpfad · Anfrage] das Ergebnis zeigt zuerst den Brief, dann das Passwort, dann den Link; jeder Knopf sagt, für wen die Datei ist', () => {
  const k = ergebnisKoerper(HTML);
  const i = ["'1. Der Brief für die Person'", "'2. Das Passwort (für Sie und die Person)'", "'3. Der Link allein"].map((t) => k.indexOf(t));
  assert.ok(i.every((x) => x > 0) && i[0] < i[1] && i[1] < i[2], JSON.stringify(i));
  for (const t of ['Brief speichern (Text, für die Person)', 'Save letter (text, for the person)', 'Anfrage als Datei speichern (für die Person, zum Anhängen)',
    'Save request as a file (for the person, to attach)', 'Passwort-Zettel speichern (für die Person, getrennt vom Brief)', 'Save password note (for the person, separate from the letter)']) assert.ok(k.includes(t), t);
  assert.ok(!/herunterladen'|'Download /.test(k), 'kein Knopf ohne Empfänger');
  assert.match(HTML, /Die Person sieht „Nicht geprüft“, weil Ihre Anfrage nicht signiert ist\. Fragen können Sie trotzdem\. .*den brauchen Sie jetzt nicht\./);
  assert.match(HTML, /data-en="The person sees “Not verified” because your request is not signed\. You can still ask\. .*you do not need one now\."/);
  assert.match(HTML, /data-en="Attach the submission file that was just saved \(not the key file\)\.">Hängen Sie die Einreichungs-Datei an, die gerade gespeichert wurde \(nicht die Schlüsseldatei\)\.<\/li>/);
});
test('[Vorführpfad · Anfrage · Rot-Beweis] die frühere Reihenfolge und ein Knopf ohne Empfänger fallen auf', () => {
  const alt = ersetzt("[L('Brief speichern (Text, für die Person)', 'Save letter (text, for the person)')]", "[L('Brieftext herunterladen', 'Download letter')]");
  assert.ok(/herunterladen'|'Download /.test(ergebnisKoerper(alt)));
  const k = ergebnisKoerper(HTML.replace("'1. Der Brief für die Person'", "'9. Der Brief für die Person'"));
  assert.equal(k.indexOf("'1. Der Brief für die Person'"), -1);
});

/* ── (11) Wörter für Laien, Runde 2 (15.10.2026) ──────────────────────────────────────────────────────────────── */
const RUNDE2 = [
  ['Für IT-Fachleute: Bausteine, Formate und Prüfwerkzeuge.', 'For IT specialists: building blocks, formats and checking tools.'],
  ['Ihr Aktenzeichen (freiwillig)', 'Your file reference (optional)'],
  ['In welchem Land gilt das Recht, nach dem Sie fragen? (freiwillig; leer lassen, wenn Sie es nicht wissen)', 'In which country does the law apply that you are asking under? (optional; leave empty if you do not know)'],
  ['An welche E-Mail-Adresse soll die Person ihre Antwort schicken?', 'To which e-mail address should the person send the reply?'],
  ['Für Fortgeschrittene: mit eigenem Schlüsselpaar (Fachebene)', 'For advanced users: with your own key pair (expert view)'],
  ['Alle Felder ansehen (Register)', 'See all fields (register)'],
  ['Technische Namen (Kennungen) zeigen', 'Show technical names (identifiers)'],
  ['Die Dateien liegen danach auf Ihrem Gerät im Ordner „Downloads“.', 'After saving, the files are in your device’s “Downloads” folder.'],
];
const RUNDE2_ALT = ['Für Integratoren:', 'For integrators:', 'Ihr Zeichen für diesen Vorgang', 'Nach welchem Recht fragen Sie?', 'Wohin schickt die Person die Datei?',
  'Stattdessen mit eigenem Schlüsselpaar', 'Register ansehen', '>Kennungen zeigen<'];
const runde2Befunde = (h) => RUNDE2.flat().filter((t) => !h.includes(t)).concat(RUNDE2_ALT.filter((t) => h.includes(t)));
test('[Vorführpfad · Wörter] die Laien-Wörter stehen deutsch und englisch, die alten sind fort', () => {
  assert.deepEqual(runde2Befunde(HTML), []);
});
test('[Vorführpfad · Wörter · Rot-Beweis] ein altes Wort zurück fällt auf', () => {
  const alt = ersetzt('Ihr Aktenzeichen (freiwillig)', 'Ihr Zeichen für diesen Vorgang');
  assert.deepEqual(runde2Befunde(alt), ['Ihr Aktenzeichen (freiwillig)', 'Ihr Zeichen für diesen Vorgang']);
});
