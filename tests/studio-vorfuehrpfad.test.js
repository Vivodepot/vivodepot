'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Studio auf dem Weg einer Vorführung: was am iPad hakte, ohne Umweg (Prüfung 14.10.2026; Nachtrag U2-ADR-493)
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   (1) „Ihr Zeichen“ in der Anfrage: der Vorschlag „Anfrage-<Datum>“ ist Platzhalter, nicht Text. Getipptes ersetzt ihn,
       statt an ihn angehängt zu werden; ein leeres Feld nimmt den Vorschlag.
   (2) Eine Liste mit Unterfeldern bekommt unter „Ausprobieren“ einen Knopf mit Wirkung. Hier der DOM-freie Teil und die
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

/* ── (2) Liste unter „Ausprobieren“ ─────────────────────────────────────────────────────────────────────────── */
const LISTE = { feldname: 'Weitere Personen', feldtyp: 'liste', unterFelder: [{ feldname: 'Vorname', feldtyp: 'text' }, { feldname: 'Geburtsdatum', feldtyp: 'datum' }] };
function listenZweig(html) {
  const a = html.indexOf('function vorschauSteuer(f) {');
  return html.slice(a, html.indexOf('\n}\n', a));
}
function listeSteuerKoerper(html) {
  const a = html.indexOf('function listeSteuer(box, f) {');
  return a < 0 ? '' : html.slice(a, html.indexOf('\n}\n', a));
}
test('[Vorführpfad · Liste] eine Liste mit Unterfeldern bekommt unter „Ausprobieren“ einen Knopf mit Wirkung, ohne Unterfelder einen Satz', () => {
  const { V } = ladeGenerator();
  assert.deepEqual(nativ(V.listeUnterfelder(LISTE)).map((u) => u.feldname), ['Vorname', 'Geburtsdatum']);
  assert.deepEqual(nativ(V.listeUnterfelder({ feldtyp: 'liste' })), []);
  assert.match(listenZweig(HTML), /t === 'liste'\) listeSteuer\(box, f\)/, 'der Listenzweig geht über listeSteuer');
  const k = listeSteuerKoerper(HTML);
  assert.match(k, /if \(probierenAn\) knopf\.addEventListener\('click'/, 'der Knopf wirkt unter „Ausprobieren“');
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
