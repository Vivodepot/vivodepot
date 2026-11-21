'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio wie der freigegebene Dummy vom 14.11.2026: Start und Seite nach dem Sichern
   ─────────────────────────────────────────────────────────────────
   (1) Der Start heißt „Vorlage erstellen“, darunter „Legt fest, welche Daten Ihre Stelle erhält.“ (17.11.2026) und trägt keinen Block „So läuft es ab“ mehr. Der Block steht mit
       unverändertem Wortlaut als „Ablauf“ nach dem Sichern beim Knopf „Einreichen“, mit Schritt 4 „Freigabe“: so wird die Vorlage Teil des Produkts.
   (2) Nach „Vorlage sichern“ stehen die Wege in zwei Gruppen wie im Dummy: „Teilen“ (Link kopieren, QR-Code)
       und „Speichern“ (Als Datei, Als PDF); die Überschriften nach der üblichen Benennung (18.11.2026). „Link kopieren“ trägt den Dummy-Wortlaut und kopiert den bestehenden Link.
       „Einreichen“ ist Nebenknopf, kein Hauptknopf.
   (3) Die Kachel „Eigenes Erscheinungsbild · in Arbeit“ steht nicht auf dem Start, bis sie fertig ist.
   (4) Die drei Beispiel-Kacheln nennen ihre Felder wortgleich wie der Dummy.
   (5) Die Meldung beim Sichern ohne Namen spricht vom Namen Ihrer Stelle, wie das Feld.
   Gelesen wird der Quelltext; STUDIO_HTML nennt für den Rot-Beweis eine andere Fassung der Datei.
   ROT-BEWEIS: STUDIO_HTML=<Fassung vor diesem Wagen> node --test tests/studio-wie-dummy-start-und-sichern.test.js → alle fünf rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const HTML = fs.readFileSync(process.env.STUDIO_HTML || path.join(REPO, 'vivodepot-studio.html'), 'utf8');

const knopf = (id) => { const m = HTML.match(new RegExp('<button[^>]*\\bid="' + id + '"[^>]*>')); return m ? m[0] : null; };
function funktion(name) {
  const i = HTML.search(new RegExp('(?:async )?function ' + name + '\\('));
  if (i < 0) return '';
  const k = HTML.indexOf('\n}\n', i);
  return HTML.slice(i, k < 0 ? i + 4000 : k + 2);
}
function kachelText(id) {
  const i = HTML.indexOf('id="' + id + '"');
  if (i < 0) return null;
  const m = /<span class="kachel-text"[^>]*>([^<]*)<\/span>/.exec(HTML.slice(i, i + 1500));
  return m ? m[1] : null;
}

function abschnitt(tag, id) {
  const i = HTML.search(new RegExp('<' + tag + '[^>]*\\bid="' + id + '"'));
  if (i < 0) return '';
  const k = HTML.indexOf('</' + tag + '>\n\n', i);
  return HTML.slice(i, k < 0 ? i + 20000 : k);
}
test('[Wie Dummy · 1] Start „Vorlage erstellen“ ohne „So läuft es ab“; der Block steht unverändert nach dem Sichern bei „Einreichen“', () => {
  const start = abschnitt('main', 'raum-start'), ns = abschnitt('section', 'nach-sichern');
  assert.match(start, /<h1 data-en="Create a template">Vorlage erstellen<\/h1>/, 'die Überschrift heißt nicht „Vorlage erstellen“');
  assert.match(start, />Legt fest, welche Daten Ihre Stelle erhält\. Kein Konto, keine Installation\./, 'der Satz unter der Überschrift ist nicht der freigegebene Wortlaut');
  assert.ok(start && !/So läuft es ab/.test(start), 'der Block „So läuft es ab“ steht noch auf dem Start');
  assert.ok(/id="ns-einreichen"/.test(ns) && !/haupt-knopf/.test(knopf('ns-einreichen') || 'haupt-knopf'), 'Einreichen fehlt oder ist Hauptknopf');
  for (const satz of ['>Ablauf<', 'Felder wählen, anordnen, Vorschau ansehen. Nehmen Sie sich Zeit; es wird noch nichts von Ihnen verlangt.',
    'Erst wenn Sie fertig sind: wer Sie sind und ein digitaler Schlüssel, der die Vorlage Ihnen zuordnet.',
    'Sie erhalten eine Datei. Schicken Sie sie per E-Mail an Vivodepot; die Prüfung dauert einige Werktage.',
    '>Freigabe<', 'Die geprüfte Vorlage wird Teil von Vivodepot.']) {
    assert.ok(ns.includes(satz), 'nach dem Sichern fehlt: ' + satz);
  }
});

test('[Wie Dummy · 2] nach dem Sichern: oben Personen, dann andere Stellen, dann Speichern; Einreichen als Nebenknopf', () => {
  const f = funktion('vorlageErgebnisZeigen');
  assert.ok(f, 'vorlageErgebnisZeigen fehlt');
  const a = f.indexOf("L('Teilen mit Personen'"), m = f.indexOf("L('Weitergeben an andere Stellen'"), b = f.indexOf("L('Speichern', 'Save')");
  assert.ok(a > 0 && m > a && b > m, 'die Gruppen „Teilen mit Personen“, „Weitergeben an andere Stellen“ und „Speichern“ fehlen oder stehen verkehrt');
  const link = f.indexOf("L('Link kopieren'"), datei = f.indexOf("L('Als Datei speichern'"), pdf = f.indexOf("L('Als PDF'");
  assert.ok(link > a && link < m, '„Link kopieren“ der Anfrage steht nicht oben');
  assert.ok(datei > b && pdf > b, 'Als Datei / Als PDF stehen nicht unter „Speichern“');
  assert.match(f, /kopieren\(anfrageAlsLink\(anfrage\)\)/, '„Link kopieren“ kopiert nicht den Link der Anfrage');
  assert.ok(knopf('ns-einreichen') && !/haupt-knopf/.test(knopf('ns-einreichen')), 'Einreichen ist noch Hauptknopf');
});

test('[Wie Dummy · 3] die Kachel „Eigenes Erscheinungsbild · in Arbeit“ steht nicht auf dem Start', () => {
  assert.ok(!/id="ein-erscheinung"/.test(HTML), 'die Kachel ein-erscheinung steht noch da');
});

test('[Wie Dummy · 4] die Beispiel-Kacheln nennen ihre Felder wie der Dummy', () => {
  assert.equal(kachelText('bsp-bibliothek'), 'Name, Geburtsdatum, Anschrift, Nachweis für die Ermäßigung');
  assert.equal(kachelText('bsp-verein'), 'Name, Anschrift, E-Mail, Bankverbindung');
  assert.equal(kachelText('bsp-anamnese'), 'Name, Geburtsdatum, Krankenversicherung, Medikamente');
});

test('[Wie Dummy · 5] die Meldung beim Sichern ohne Namen spricht vom Namen Ihrer Stelle', () => {
  const f = funktion('vorlageSichern');
  assert.match(f, /Bitte tragen Sie zuerst den Namen Ihrer Stelle ein\./, 'die Meldung nennt nicht den Namen Ihrer Stelle');
  assert.doesNotMatch(f, /Namen der Einrichtung/, 'die Meldung nennt noch die Einrichtung');
});
