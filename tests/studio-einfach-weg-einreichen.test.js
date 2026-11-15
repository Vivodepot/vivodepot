'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Studio · Einfach-Weg „Vorlage einreichen“ (Studio-Umbau, Wagen 1.5, 09.11.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Der Weg einer Person ohne Fachwissen von der Kachel bis zur eingereichten Vorlage: wenige Handgriffe, Unklarheiten mit
   einem Muster gelöst (Kopfzeile, Haken, Schrittzeichen), nicht mit einem weiteren Satz. Gehalten wird, ohne Browser:
     1 · Kopfzeile je Kachel: „Aufnahmebogen“ und „Vorlage erstellen“ öffnen denselben Assistenten, die Kopfzeile trägt den
         Titel der gewählten Kachel (DE und EN wortgleich mit der Kachel).
     2 · Unter einer Frage steht kein „Standardfeld“.
     3 · Vorname, Nachname und E-Mail stehen als „Muss ausgefüllt werden“ vorbelegt da und lassen sich abwählen.
     4 · Anschrift und Ansprechperson stehen im ersten Schritt des Assistenten; das Land ist eine Eingabe mit Vorschlägen
         aus den Rechtsraum-Modulen, ohne Vorbelegung (U2-ADR-495).
     5 · „Weiter: Einreichen“ übernimmt vollständige Angaben in die Einreichung: der Dialog beginnt bei der Sicherung.
         Unvollständige Angaben öffnen den Dialog wie bisher bei „Wer reicht ein?“.
     6 · Die Einfach-Sicht des Dialogs nennt keine Fachwörter (Anbieter-Stammdaten, Template, Pflichtfelder, Rechtsraum,
         USt-ID, .vdkey/.jwk); die Expertensicht behält sie.
     7 · „Sicherung speichern“ zeigt in der Einfach-Sicht Schrittzeichen statt des Satzes.
     8 · Die ausgeblendete Zeile zu den Angaben ist nur Anzeige: das Tor (res.blocker) sperrt weiter.
   Teil 2 (09.11.2026):
     9 · Einrichtung und Bogen stehen auf einer Seite: kein Knopf „Weiter: Bogen gestalten“; mit der Art erscheint das Beispiel,
         außer die Person hat an den Fragen schon etwas geändert.
    10 · Das Land bleibt leer (U2-ADR-495 Nr. 4); aus der Region der ersten Browser-Sprache schlägt das Studio es als Chip vor,
         der Klick trägt den Namen aus dem Rechtsraum-Modul ein. Kein Ländername steht im Code.
    11 · Das Mailprogramm öffnet im selben Zug wie die Einreichung, wenn der Klick noch als Nutzeraktivierung gilt, sonst bleibt der Knopf.
   Den Klickpfad und den Dialog über dem Assistenten zählt und sieht tests/e2e-cross/T-CROSS-42-studio-einfach-weg.spec.js.
   ROT-BEWEIS: `git show dbf1c70b4:vivodepot-studio.html > <kopie>; GENERATOR_HTML_PATH=<kopie> node --test
   tests/studio-einfach-weg-einreichen.test.js` → jede Probe rot.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const PFAD = process.env.GENERATOR_HTML_PATH ? path.resolve(process.env.GENERATOR_HTML_PATH) : path.join(__dirname, '..', 'vivodepot-studio.html');
const HTML = fs.readFileSync(PFAD, 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));

function block(html, anfang, ende) {
  const a = html.indexOf(anfang);
  assert.ok(a >= 0, 'nicht gefunden: ' + anfang);
  return html.slice(a, html.indexOf(ende, a));
}
function rumpf(html, name) {
  const a = html.indexOf('function ' + name + '(');
  assert.ok(a >= 0, 'keine Funktion ' + name);
  const b = html.indexOf('\nfunction ', a + 10);
  return html.slice(a, b);
}
function kachelTitel(html, id) {
  const k = block(html, 'id="' + id + '"', '</button>');
  const m = k.match(/<span class="ek-titel" data-en="([^"]*)">([^<]*)<\/span>/);
  assert.ok(m, 'Kachel ' + id + ' ohne Titel');
  return [m[2], m[1]];
}
const FACHWORT = /Anbieter-Stammdaten|Template|Pflichtfeld|Rechtsraum|USt-ID|\.vdkey|\.jwk|Stammdaten/;

/* ── 1 · Kopfzeile je Kachel ───────────────────────────────────────────────── */
test('[Einfach-Weg · Kopfzeile] beide Kacheln öffnen denselben Assistenten, die Kopfzeile trägt den Titel der gewählten Kachel', () => {
  const g = ladeGenerator();
  assert.equal(typeof g.sandbox.assistentKopf, 'function', 'keine Kopfzeile je Kachel (assistentKopf)');
  for (const [kachel, id] of [['aufnahme', 'ein-aufnahme'], ['vorlage', 'ein-vorlage']]) {
    assert.ok(HTML.includes("an('" + id + "', 'click', () => { assistentEintreten('" + kachel + "'); zeigeSchritt('assistent'); });"), id + ': Bindung ohne Kachel');
    assert.deepEqual(nativ(g.sandbox.assistentKopf(kachel)), kachelTitel(HTML, id));
  }
  assert.match(block(HTML, '<main id="raum-assistent"', '</main>'), /<p class="eingang-aug" id="as-aug"/);
});

/* ── 2 · kein „Standardfeld“ ───────────────────────────────────────────────── */
test('[Einfach-Weg · Standardfeld] unter einer Frage steht kein „Standardfeld“', () => {
  assert.doesNotMatch(rumpf(HTML, 'assistentZeigen'), /Standardfeld|Standard field/);
});

/* ── 3 · Muss vorbelegt ────────────────────────────────────────────────────── */
test('[Einfach-Weg · Muss] Vorname, Nachname und E-Mail stehen als „Muss ausgefüllt werden“ da, abwählbar; andere Fragen nicht', () => {
  const { V } = ladeGenerator();
  V.ASSISTENT.sprache = 'de';
  V.assistentBeispielLaden('behoerde');
  const pflicht = {};
  V.ASSISTENT.fragen.forEach((f) => { if (f.reg) pflicht[f.reg] = !!f.pflicht; });
  assert.deepEqual(pflicht, { vorname: true, nachname: true, strasse: false, hausnummer: false, plz: false, ort: false, email: true });
  const felder = nativ(V.assistentFelder());
  assert.equal(felder.filter((f) => f.pflicht).length, 4, 'Vorname, Nachname, E-Mail und „Anliegen“');
  V.ASSISTENT.fragen.forEach((f) => { f.pflicht = false; });   // der Haken ist abwählbar: ohne ihn ist die Frage frei
  assert.equal(nativ(V.assistentFelder()).filter((f) => f.pflicht).length, 0);
  V.ASSISTENT.fragen.length = 0;
  V.assistentHinzu('email'); V.assistentHinzu('telefon');
  assert.deepEqual(nativ(V.ASSISTENT.fragen.map((f) => !!f.pflicht)), [true, false], 'auch „Frage hinzufügen“ belegt E-Mail vor');
});

/* ── 4 · Anschrift und Ansprechperson im Assistenten ──────────────────────── */
const AS_KONTAKT = ['as-strasse', 'as-plz', 'as-ort', 'as-land', 'as-rechtsform', 'as-k-name', 'as-k-email'];
test('[Einfach-Weg · Angaben] Anschrift und Ansprechperson stehen im ersten Schritt, jede mit Beschriftung DE/EN; das Land ohne Vorbelegung', () => {
  const s1 = block(HTML, '<div id="as-schritt-1">', '<div id="as-schritt-2"');
  for (const id of AS_KONTAKT) {
    assert.match(s1, new RegExp('<input [^>]*id="' + id + '"'), id + ' fehlt im ersten Schritt');
    assert.match(s1, new RegExp('<label class="as-feld" for="' + id + '"><span(?: class="muss")? data-en="[^"]+">[^<]+</span></label>'), id + ' ohne Beschriftung');
  }
  const land = s1.match(/<input [^>]*id="as-land"[^>]*>/)[0];
  assert.match(land, /list="as-land-liste"/, 'das Land bekommt Vorschläge');
  assert.doesNotMatch(land, /value=/, 'kein Land vorbelegt (U2-ADR-495)');
});

/* ── 9 · Einrichtung und Bogen auf einer Seite (K3) ─────────────────────────
   ROT-BEWEIS: `git show dbf1c70b4:vivodepot-studio.html` → „kein Knopf Weiter: Bogen gestalten“ und „Schritt 2 sichtbar“ rot. */
test('[Einfach-Weg · eine Seite] Schritt 2 steht neben Schritt 1, ohne eigenen Weiter-Knopf; „Zurück zur Auswahl“ steht unten', () => {
  const raum = block(HTML, '<main id="raum-assistent"', '</main>');
  assert.doesNotMatch(raum, /id="as-weiter-1"/, 'kein Knopf „Weiter: Bogen gestalten“');
  assert.doesNotMatch(raum, /id="as-zurueck-2"/);
  assert.match(raum, /<div id="as-schritt-2">/, 'Schritt 2 ist nicht versteckt');
  assert.equal(raum.split('id="as-zurueck-1"').length - 1, 1, 'ein „Zurück zur Auswahl“');
  assert.ok(raum.indexOf('id="as-zurueck-1"') > raum.indexOf('id="as-weiter-2"'), '„Zurück zur Auswahl“ steht beim letzten Knopf');
  assert.doesNotMatch(rumpf(HTML, 'assistentZeigen'), /ASSISTENT\.schritt/, 'kein Schritt mehr, den die Seite verstecken müsste');
  assert.doesNotMatch(HTML, /ASSISTENT\.schritt\b/);
});
test('[Einfach-Weg · eine Seite] mit der Art erscheint das Beispiel sofort; eine geänderte Frageliste bleibt beim Wechsel der Art', () => {
  const { V, sandbox } = ladeGenerator();
  V.spracheFuerProbeSetzen('de');
  V.ASSISTENT.sprache = 'de';
  sandbox.assistentArtWaehlen('verein');
  assert.equal(V.ASSISTENT.art, 'verein');
  const verein = nativ(V.ASSISTENT.fragen.map((f) => f.reg || f.frage));
  assert.ok(verein.length >= 3, 'das Beispiel steht da');
  sandbox.assistentArtWaehlen('kanzlei');   // nichts geändert: das andere Beispiel ersetzt es
  assert.notDeepEqual(nativ(V.ASSISTENT.fragen.map((f) => f.reg || f.frage)), verein);
  V.assistentHinzu('geburtsdatum');   // die Person ändert die Fragen (das Beispiel „Kanzlei“ hat es nicht)
  const geaendert = nativ(V.ASSISTENT.fragen);
  sandbox.assistentArtWaehlen('schule');
  assert.equal(V.ASSISTENT.art, 'schule');
  assert.deepEqual(nativ(V.ASSISTENT.fragen), geaendert, 'ihre Fragen bleiben');
});

/* ── 10 · Land: Vorschlag als Chip, kein Voreintrag (U2-ADR-495 Nr. 4) ─────── */
test('[Einfach-Weg · Land] der Chip schlägt aus der Region der Browser-Sprache das Land eines Rechtsraum-Moduls vor; das Feld bleibt leer, bis geklickt wird', () => {
  const g = ladeGenerator();
  const { V, sandbox, document } = g;
  V.spracheFuerProbeSetzen('de');
  const nav = (languages) => { sandbox.navigator = { languages, language: languages[0] }; };
  nav(['de-DE', 'en']);
  const de = nativ(sandbox.assistentLandVorschlag());
  assert.ok(de && de.rechtsraum === 'DE', 'de-DE → das DE-Modul');
  nav(['de']);         assert.equal(sandbox.assistentLandVorschlag(), null, 'eine Sprache ohne Region schlägt nichts vor');
  nav(['xx-ZZ']);      assert.equal(sandbox.assistentLandVorschlag(), null, 'eine Region ohne Modul schlägt nichts vor');
  nav(['xx-ZZ', 'de-DE']); assert.equal(sandbox.assistentLandVorschlag(), null, 'nur die erste Sprache mit Region zählt');
  sandbox.navigator = undefined; assert.equal(sandbox.assistentLandVorschlag(), null, 'ohne Browser-Angabe nichts');
  nav(['de-DE']);
  const land = document.getElementById('as-land'), box = document.getElementById('as-land-vorschlag'), chip = document.getElementById('as-land-chip');
  land.value = '';
  sandbox.assistentZeigen();
  assert.equal(land.value, '', 'kein Land vorbelegt');
  assert.equal(box.hidden, false, 'der Chip steht neben dem leeren Feld');
  assert.equal(chip.textContent, V.rechtsraumAnzeige('DE') + '?');
  const form = document.getElementById('as-rechtsform');
  V.ASSISTENT.art = 'verein';
  sandbox.assistentLandUebernehmen();
  assert.equal(land.value, V.rechtsraumAnzeige('DE'), 'der Klick trägt den Namen aus dem Modul ein');
  assert.equal(form.value, V.rechtsformFuerArt('DE', 'verein'), 'die Rechtsform folgt aus Land und Art');
  assert.equal(box.hidden, true, 'mit eingetragenem Land verschwindet der Chip');
  land.value = ''; sandbox.assistentZeigen();
  assert.equal(box.hidden, false);
  land.value = 'Österreich'; sandbox.assistentLandVorschlagZeigen();
  assert.equal(box.hidden, true, 'ein getipptes Land bleibt, der Chip geht');
  // Der Studio-Code nennt kein Land: der Name kommt aus dem Modul
  const code = rumpf(HTML, 'assistentLandVorschlag') + rumpf(HTML, 'assistentLandVorschlagZeigen') + rumpf(HTML, 'assistentLandUebernehmen');
  assert.doesNotMatch(code, /Deutschland|Germany|Österreich|Austria|Schweiz|Switzerland|'DE'|"DE"/);
});
test('[Einfach-Weg · Land] ohne Land meldet die Prüfung weiter das fehlende Land (der Vorschlag ersetzt die Pflicht nicht)', () => {
  const { V } = assistentMitAngaben({ ...VOLLSTAENDIG, 'as-land': '' });
  assert.equal(V.STATE.anbieter, null, 'Angaben unvollständig');
});

/* ── 11 · Mail im selben Zug (K8) ───────────────────────────────────────────── */
function mailProbe(navigatorWert, einfach) {
  const g = ladeGenerator();
  const { sandbox, document } = g;
  const a = document.getElementById('fs-fertig-mail');
  let klicks = 0;
  a.getAttribute = () => 'mailto:register@beispiel.example?subject=x';
  a.click = () => { klicks++; };
  sandbox.navigator = navigatorWert;
  sandbox.ebeneIstEinfach = () => einfach;
  return { erg: sandbox.mailNachSpeichernOeffnen(), klicks: () => klicks };
}
test('[Einfach-Weg · Mail] im Einfach-Weg öffnet das Mailprogramm im selben Zug, solange die Nutzeraktivierung gilt; sonst geschieht nichts', () => {
  const an = mailProbe({ userActivation: { isActive: true } }, true);
  assert.equal(an.erg, true); assert.equal(an.klicks(), 1, 'ein Klick der Seite auf den Link');
  const abgelaufen = mailProbe({ userActivation: { isActive: false } }, true);
  assert.equal(abgelaufen.erg, false); assert.equal(abgelaufen.klicks(), 0, 'abgelaufen: der Knopf bleibt der Weg');
  const ohne = mailProbe({}, true);
  assert.equal(ohne.klicks(), 0, 'ein Browser ohne userActivation: der Knopf bleibt der Weg');
  const fach = mailProbe({ userActivation: { isActive: true } }, false);
  assert.equal(fach.klicks(), 0, 'in der Expertensicht bleibt es beim Knopf');
  assert.match(HTML, /fertigKarteZeigen\(paket\);\s*mailNachSpeichernOeffnen\(\);/, 'die Mail öffnet nach der Erfolgskarte, im selben Lauf wie der Download');
});

test('[Einfach-Weg · Rechtsform] die Rechtsform kommt aus dem Modul des eingetragenen Landes und der Art; ohne Land keine, eine eigene Eingabe bleibt', () => {
  const g = ladeGenerator();
  const { V, sandbox, document } = g;
  assert.equal(typeof sandbox.assistentRechtsformVorschlagen, 'function', 'kein Vorschlag der Rechtsform im Assistenten');
  V.spracheFuerProbeSetzen('de');
  const land = document.getElementById('as-land'), form = document.getElementById('as-rechtsform');
  V.ASSISTENT.art = 'verein';
  land.value = ''; sandbox.assistentRechtsformVorschlagen();
  assert.equal(form.value, '', 'ohne Land keine Rechtsform (U2-ADR-495)');
  land.value = 'Deutschland'; sandbox.assistentRechtsformVorschlagen();
  assert.equal(form.value, V.rechtsformFuerArt('DE', 'verein'));
  assert.ok(form.value, 'Vorbedingung: das DE-Modul ordnet dem Verein eine Rechtsform zu');
  land.value = 'Atlantis'; sandbox.assistentRechtsformVorschlagen();
  assert.equal(form.value, '', 'ein Land ohne Modul: kein Vorschlag');
});

/* ── 5 · Übergabe ──────────────────────────────────────────────────────────── */
function assistentMitAngaben(werte) {
  const g = ladeGenerator();
  const { V, sandbox } = g;
  V.spracheFuerProbeSetzen('de');
  V.ASSISTENT.sprache = 'de';
  V.ASSISTENT.name = 'Sportverein Beispielstadt';
  V.ASSISTENT.art = 'verein';
  V.assistentBeispielLaden('verein');
  for (const [id, wert] of Object.entries(werte)) { const e = g.document.getElementById(id); assert.ok(e, id + ' gibt es nicht'); e.value = wert; }
  sandbox.assistentEinreichen();
  return g;
}
const VOLLSTAENDIG = { 'as-strasse': 'Am Sportplatz 3', 'as-plz': '12345', 'as-ort': 'Beispielstadt', 'as-land': 'Deutschland', 'as-rechtsform': 'e.V.', 'as-k-name': 'Erika Beispiel', 'as-k-email': 'verein@beispiel.example' };
test('[Einfach-Weg · Übergabe] vollständige Angaben gehen in die Einreichung: der Dialog beginnt bei der Sicherung', () => {
  const { V, sandbox, document } = assistentMitAngaben(VOLLSTAENDIG);
  assert.ok(V.STATE.anbieter, 'die Angaben stehen nicht in der Einreichung');
  assert.equal(V.STATE.anbieter.anbieterName, 'Sportverein Beispielstadt');
  assert.equal(V.STATE.anbieter.adresse.ort, 'Beispielstadt');
  assert.equal(V.STATE.anbieter.kontakt.email, 'verein@beispiel.example');
  assert.equal(V.STATE.anbieter.rechtsform, 'e.V.', 'die Rechtsform braucht die Antragsdatei');
  assert.deepEqual(nativ(V.validiereStammdaten(V.STATE.anbieter)), []);
  assert.equal(sandbox.naechsterFertigSchritt(), 'pruefung');
  assert.equal(document.getElementById('sd-strasse').value, 'Am Sportplatz 3', 'die Angaben stehen auch in „Wer reicht ein?“ zum Ändern');
  assert.equal(sandbox.ebeneIstEinfach(), true);
});
test('[Einfach-Weg · Übergabe] unvollständige Angaben öffnen „Wer reicht ein?“ mit dem, was schon steht', () => {
  const { V, document } = assistentMitAngaben({ 'as-strasse': 'Am Sportplatz 3' });
  assert.equal(V.STATE.anbieter, null);
  assert.equal(document.getElementById('sd-strasse').value, 'Am Sportplatz 3');
  assert.equal(document.getElementById('sd-name').value, 'Sportverein Beispielstadt');
});

/* ── 5b · Anzeige ist nicht Tor ─────────────────────────────────────────────
   Aus dem Assistenten blendet renderefPruefung die Zeile „Anbieter-Stammdaten unvollständig“ aus, solange „Wer reicht
   ein?“ offen ist. Das ist nur die Anzeige: res.blocker bleibt unverändert, der Knopf „Einreichung speichern“ bleibt
   gesperrt und submissionErzeugen gibt nichts hinaus, auch wenn der Schlüssel bereit wäre.
   ROT-BEWEIS: in einer Kopie `$('pr-submit').disabled = res.blocker.length > 0` → `gezeigt.length > 0` (renderefPruefung)
   bzw. in submissionErzeugen `res.blocker.length` → `0` setzen: diese Probe wird rot. */
test('[Einfach-Weg · Tor] die ausgeblendete Zeile zu den Angaben sperrt weiter: Knopf gesperrt, keine Einreichung', async () => {
  const g = assistentMitAngaben({ 'as-strasse': 'Am Sportplatz 3' });
  const { V, sandbox, document } = g;
  assert.equal(V.STATE.anbieter, null, 'Vorbedingung: Angaben unvollständig');
  assert.equal(require('node:vm').runInContext('fertigAusAssistent', sandbox), true, 'Vorbedingung: aus dem Assistenten');
  sandbox.einreichungFrei = () => true;                      // der Schlüssel wäre bereit: nur die Angaben fehlen
  const res = sandbox.pruefeKonformitaet(sandbox.aktuellerState());
  assert.ok(res.blocker.some((b) => /^Anbieter-Stammdaten unvollständig: /.test(b)), 'res.blocker trägt die fehlenden Angaben');
  const knopf = document.getElementById('pr-submit');
  knopf.disabled = false;
  sandbox.renderefPruefung();
  assert.equal(knopf.disabled, true, 'der Knopf „Einreichung speichern“ bleibt gesperrt');
  const hinaus = [];
  sandbox.blobDownload = (name) => { hinaus.push(name); };
  const erg = document.getElementById('pr-ergebnis'); erg.hidden = true;
  await sandbox.submissionErzeugen({ isTrusted: true, currentTarget: knopf, timeStamp: 0 });
  assert.deepEqual(hinaus, [], 'nichts geht hinaus');
  assert.equal(erg.hidden, true, 'kein Ergebnis');
});

/* ── 6 · Fachwörter ────────────────────────────────────────────────────────── */
function dialog(html) { return block(html, '<dialog id="dlg-fertig"', '</dialog>'); }
test('[Einfach-Weg · Fachwörter] Rechtsraum, USt-ID und .vdkey/.jwk haben im Dialog ein Alltagswort für die Einfach-Sicht; die Expertensicht behält ihr Wort', () => {
  const d = dialog(HTML);
  for (const id of ['sd-rechtsraum', 'sd-ustid', 'pr-privkey']) {
    const m = d.match(new RegExp('<label for="' + id + '">(.*?)</label>'));
    assert.ok(m, id + ': keine Beschriftung mit zwei Fassungen');
    const fach = m[1].match(/<span class="nur-fach" data-en="([^"]*)">([^<]*)<\/span>/), einfach = m[1].match(/<span class="nur-einfach" data-en="([^"]*)">([^<]*)<\/span>/);
    assert.ok(fach && einfach, id + ': nur-fach und nur-einfach fehlen');
    assert.match(fach[2], FACHWORT, id + ': die Expertensicht behält ihr Wort');
    assert.doesNotMatch(einfach[2] + ' ' + einfach[1], /Rechtsraum|jurisdiction|USt|VAT|\.vdkey|\.jwk/, id + ': Fachwort in der Einfach-Sicht');
  }
  assert.match(HTML, /#dlg-fertig\.einfach \.nur-fach\s*\{\s*display:\s*none/);
  assert.match(HTML, /#dlg-fertig:not\(\.einfach\) \.nur-einfach\s*\{\s*display:\s*none/);
});
test('[Einfach-Weg · Fachwörter] Meldungen im Dialog nennen in der Einfach-Sicht keine Fachwörter (DE und EN)', () => {
  const { V, sandbox } = ladeGenerator();
  assert.equal(typeof sandbox.einfachWorte, 'function', 'keine Einfach-Fassung der Meldungen (einfachWorte)');
  const meldungen = ['Anbieter-Stammdaten unvollständig: Bitte geben Sie das Land an.', 'Das Template hat keine Pflichtfelder — das ist ungewöhnlich. Bitte prüfen Sie, ob das beabsichtigt ist.',
    'Das Template hat mehr als 50 Felder — eventuell zu detailliert für die ausfüllende Person.'];
  for (const sprache of ['de', 'en']) {
    V.spracheFuerProbeSetzen(sprache);
    for (const m of meldungen) {
      const einfach = sandbox.einfachWorte(V.meldungL(m));
      assert.doesNotMatch(einfach, /Anbieter-Stammdaten|Template|Pflichtfeld|Provider details|required fields/, sprache + ': ' + einfach);
    }
  }
  V.spracheFuerProbeSetzen('de');
  assert.match(rumpf(HTML, 'pruefZeile'), /einfachWorte\(/, 'die Zeilen im Dialog benutzen die Einfach-Fassung');
});

/* ── 7 · Schrittzeichen ────────────────────────────────────────────────────── */
test('[Einfach-Weg · Schrittzeichen] „Sicherung speichern“ zeigt in der Einfach-Sicht Schrittzeichen statt des Satzes', () => {
  const r = block(HTML, '<div class="fs-rumpf" id="es-sichern-rumpf"', '<div id="sk-passwort">');
  const ol = r.match(/<ol class="sk-zeichen nur-einfach"[^>]*>([^]*?)<\/ol>/);
  assert.ok(ol, 'keine Schrittzeichen');
  const schritte = [...ol[1].matchAll(/<li[^>]*><span class="sk-z-symbol" aria-hidden="true">[^<]+<\/span><span data-en="([^"]+)">([^<]+)<\/span><\/li>/g)];
  assert.ok(schritte.length >= 3, 'mindestens drei Schrittzeichen');
  for (const s of schritte) assert.ok(s[2].split(/\s+/).length <= 3, 'ein Schrittzeichen ist ein Wort oder zwei, kein Satz: ' + s[2]);
  assert.match(r, /<details class="sk-wofuer nur-fach"><summary data-en="What for\?">Wofür\?<\/summary><p class="hint" data-en="The backup file stays with you\./, 'die Expertensicht behält den Satz, als Aufklapper „Wofür?“ (S-B)');
});
