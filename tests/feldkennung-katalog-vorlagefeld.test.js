'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Register-Katalog-Plan §6 Schritt 8 (15.09.2026)
   „FELDKATALOG in baueTemplateObjekt/_normalisiereFeldRein nachziehen"
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND (gemessen, vor dem Bau): der eigentliche Vorlage-Feld-Bauweg
   (`_normalisiereFeldRein`/`baueTemplateObjekt`) kannte gar keine Kennung —
   `feldname` war reiner Freitext, ohne jeden Katalog-Bezug. Die einzige
   bestehende FELDKATALOG-Prüfung (`anfrageFeldkatalogKennt`) lief NUR im
   separaten „Anfrage"-Modus (Institution fragt Bürgerin-Daten an), einer
   ganz anderen State-Struktur (`state.anfrage.felder[].kennung`).

   DER BAU: `kennung` ist jetzt ein optionales, drittes Feld am Vorlage-Feld
   selbst (`felder[].kennung`), NEBEN `feldname` (der bleibt Freitext, die
   Kennung ist ein zusätzlicher, MASCHINELLER Bezug). Dieselbe Arbeitsteilung
   wie überall in `_normalisiereFeldRein`: nur die FORM/Katalog-Zugehörigkeit
   wird geprüft, eine unbekannte Kennung wird nicht übernommen und über die
   Angleichungen gemeldet (angleichen, nicht validieren) — kein Bündel wird
   deswegen abgewiesen. KEINE ZWEITE PRÜFUNG: dieselbe `anfrageFeldkatalogKennt`,
   die der Anfrage-Weg schon benutzt.

   Die Drei-Fassungen-Parität des Schemas selbst (Datei/Erzeuger/Aussteller)
   ist bereits durch eine eigene Probe abgedeckt —
   hier NICHT noch einmal geprüft, um keine zweite, potenziell abweichende
   Fassung derselben Zusicherung zu erzeugen.

   NACHTRAG 16.09.2026 (Entscheidung): Der Kern hat für `kennung` keinen Verbraucher und
   verwarf ein Feld, das sie trug, GANZ („unbekannte-eigenschaft"). Sie meint ein natives Katalog-
   feld; die Kennung eines angedockten Felds ist nach U2-ADR-282 immer eine eigene (`tpl_`) —
   also keine Abbildung. Der Erzeuger streift `kennung` darum ab und meldet es laut
   (FELD_OHNE_KERN_VERBRAUCHER). Schema und Katalog-Prüfung bleiben; die Proben unten sind danach
   umgedreht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ladeGenerator } = require('./load-generator.js');

const REPO = path.join(__dirname, '..');
const { V } = ladeGenerator();

/* ══ Schema kennt die neue Eigenschaft ═══════════════════════════════════ */

test('[Feldkennung] das Einreich-Schema kennt "kennung" am Vorlage-Feld, optional, als String', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'template-generator', 'submission-schema.json'), 'utf8'));
  const feld = schema.properties.templates.items.properties.felder.items;
  assert.ok(feld.properties.kennung, 'kennung fehlt im Schema');
  assert.equal(feld.properties.kennung.type, 'string');
  assert.ok(!feld.required.includes('kennung'), 'kennung muss optional bleiben — bestehende Vorlagen ohne Kennung bleiben gültig');
});

/* ══ _normalisiereFeldRein: nur eine ECHTE Katalog-Kennung reist mit ═══════ */

test('[Feldkennung] eine bekannte FELDKATALOG-Kennung wird abgestreift und laut gemeldet (Nachtrag 16.09.2026)', () => {
  const b = V.normalisiereFeldBefund({ feldname: 'Vorname', feldtyp: 'text', bereich: 'identity', kennung: 'identity.givenName' });
  assert.equal(b.feld.kennung, undefined, 'der Kern verwürfe sonst das ganze Feld');
  assert.equal(b.angeglichen.length, 1);
  assert.equal(b.angeglichen[0].was, 'kennung');
  assert.match(b.angeglichen[0].klartext, /^ACHTUNG/);
});

test('[Feldkennung·Rot-Beweis] auch eine unbekannte Kennung wird abgestreift — genau EINE Meldung, nicht zwei (Nachtrag 16.09.2026)', () => {
  const b = V.normalisiereFeldBefund({ feldname: 'Frei', feldtyp: 'text', bereich: 'identity', kennung: 'erfunden.gibtsnicht' });
  assert.equal(b.feld.kennung, undefined, 'eine Kennung darf nicht ins Bündel gelangen');
  assert.equal(b.angeglichen.length, 1);
  assert.equal(b.angeglichen[0].was, 'kennung');
  assert.equal(b.angeglichen[0].von, 'erfunden.gibtsnicht');
  assert.match(b.angeglichen[0].folge, /abgestreift/);
});

test('[Feldkennung·Rückwärts-Kompatibilität] ein Feld OHNE kennung verhält sich exakt wie vor diesem Schritt — kein feld.kennung, keine Angleichung', () => {
  const b = V.normalisiereFeldBefund({ feldname: 'Ohne Kennung', feldtyp: 'text', bereich: 'identity' });
  assert.equal(Object.prototype.hasOwnProperty.call(b.feld, 'kennung'), false);
  assert.equal(b.angeglichen.length, 0);
});

test('[Feldkennung] "kennung" ist jetzt in FELD_BEKANNTE_SCHLUESSEL — die generische Unbekannt-Meldung greift für den Schlüssel selbst nicht mehr', () => {
  assert.ok(V.FELD_BEKANNTE_SCHLUESSEL.has('kennung'));
});

/* ══ Ende-zu-Ende: baueTemplateObjekt trägt die Kennung ins gebaute Template ══ */

test('[Feldkennung·Ende-zu-Ende] baueTemplateObjekt() trägt keine Kennung ins fertige Template, das Feld aber schon (Nachtrag 16.09.2026)', () => {
  const { template } = V.baueTemplateObjekt({ felder: [
    { feldname: 'Vorname', feldtyp: 'text', bereich: 'identity', kennung: 'identity.givenName' },
    { feldname: 'Frei erfundenes Feld', feldtyp: 'text', bereich: 'identity' },
  ] });
  assert.equal(template.felder.length, 2);
  assert.equal(template.felder[0].kennung, undefined);
  assert.equal(template.felder[1].kennung, undefined);
});

test('[Feldkennung·Rot-Beweis] der echte Kern-Torwächter (validateTemplate) weist ein Feld mit gültiger Kennung NICHT ab — kein additionalProperties-Bruch', () => {
  const { ladeKern } = require('./load-kern.js');
  const { V: KERN } = ladeKern();
  // Nachtrag 16.09.2026: der Erzeuger streift kennung ab — das Template hier trägt sie von Hand,
  // damit die Probe weiter prüft, was ihr Titel sagt.
  const { template } = V.baueTemplateObjekt({ felder: [{ feldname: 'Vorname', feldtyp: 'text', bereich: 'identity' }] });
  template.felder[0].kennung = 'identity.givenName';
  const grund = KERN.validateTemplate(template);
  assert.equal(grund, null, 'ein sonst gültiges Template mit kennung muss den Kern-Torwächter unverändert passieren; Grund: ' + grund);
});
