'use strict';
/* Konformitätsweg und Nachbau in den öffentlichen Texten (22.10.2026, Befund NACHBAU-PRODUKTE-AUS-OEFFENTLICHEM-QUELLTEXT-ENTFALLEN).
   Entschieden ist: aus dem öffentlichen Quelltext ist der Kern nachrechenbar, die Produkte sind es nicht (Vivodepots eigene
   Vorlagen liegen nicht im öffentlichen Repository). Nach dem Cyber Resilience Act ist Klasse I der Maßstab, geprüft wird nach
   Modul A mit harmonisierten Normen, sonst durch eine notifizierte Stelle; der Weg über Art. 32 Abs. 5 wird nicht genannt,
   ebenso keine Nummer aus Anhang III. Diese Probe verlangt die tragenden Sätze und verbietet die Sätze, die bis v1.0.943 mehr
   versprachen. Sie liest nur Dateien, die im öffentlichen Repository liegen, und läuft darum auch dort. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ADR_067 = path.join('docs', 'adr', 'vivodepot-B16-ADR-067-ci-cd-haertung-2026-05-04.md');
const DATEIEN = ['SECURITY.md', 'FAQ.md', 'README.md', 'README_en.md', 'SOVEREIGNTY.md', 'DEVELOPING.md', 'publiccode.yml',
  'CHANGELOG.md', ADR_067];

/* Leerraum und Zeilenumbruch zählen nicht: ein Satz über zwei Zeilen ist derselbe Satz. */
const eben = (t) => t.replace(/\s+/g, ' ');

/* Der CHANGELOG behält seine Geschichte: Einträge zu Fassungen vor v1.0.933 dürfen den damaligen Nachbau-Satz tragen. */
function changelogAktuell(t) {
  const m = /^## \[v1\.0\.(\d+)\]/gm;
  let h;
  while ((h = m.exec(t))) if (Number(h[1]) < 933) return t.slice(0, h.index);
  return t;
}

const VERLANGT = [
  { datei: 'SECURITY.md', satz: 'Aus dem Quelltext nachrechnen lässt sich die Zeile „kern“' },
  { datei: 'SECURITY.md', satz: 'Die Produkte selbst lassen sich aus dem öffentlichen Repository nicht byte-gleich nachbauen' },
  { datei: 'SECURITY.md', satz: 'Als Maßstab legen wir die Pflichten eines wichtigen Produkts der Klasse I an' },
  { datei: 'SECURITY.md', satz: 'Konformitätsbewertung nach Modul A, sofern harmonisierte Normen' },
  { datei: 'FAQ.md', satz: 'im öffentlichen Repository liegt der Kern, Vivodepots eigene Vorlagen liegen dort nicht' },
  { datei: 'CHANGELOG.md', satz: 'Aus dem öffentlichen Quelltext lässt sich der Kern nachrechnen' },
  { datei: ADR_067, satz: 'Seit v1.0.933 gilt die Verifikation gegen den Repository-Stand für den Kern' },
];

const VERBOTEN = [
  { grund: 'Art. 32 Abs. 5 als Weg', muster: /Art\.\s*32\s*Abs\.\s*5/ },
  { grund: 'Nummer aus Anhang III', muster: /Anhang\s+III\s+Nr\.|Annex\s+III\s+(No\.|point)/ },
  { grund: 'Klasse I als Einstufung statt als Maßstab', muster: /Wir behandeln Vivodepot als|We treat Vivodepot as/ },
  { grund: 'Produkte byte-gleich aus dem Quelltext', muster: /ausgelieferten Dateien lassen sich aus dem Quelltext byte-gleich nachbauen/ },
  { grund: 'Nachrechnen der Produkte aus dem Quelltext', muster: /wie man sie aus dem Quelltext nachrechnet/ },
  { grund: 'die gesamte Software offen', muster: /Der gesamte Software steht unter EUPL/ },
];

function befunde(texte) {
  const b = [];
  for (const v of VERLANGT) if (!eben(texte[v.datei]).includes(v.satz)) b.push(`${v.datei}: verlangter Satz fehlt: „${v.satz}“`);
  for (const datei of DATEIEN) {
    const t = eben(datei === 'CHANGELOG.md' ? changelogAktuell(texte[datei]) : texte[datei]);
    // Die ADR erzählt ihre Geschichte vor dem Nachtrag; verlangt ist dort nur der Nachtrag, verboten bleibt Art. 32 Abs. 5.
    for (const v of VERBOTEN) if ((datei !== ADR_067 || v.grund === 'Art. 32 Abs. 5 als Weg') && v.muster.test(t)) b.push(`${datei}: ${v.grund}`);
  }
  return b;
}

function lesen() {
  const t = {};
  for (const d of DATEIEN) t[d] = fs.readFileSync(path.join(REPO, d), 'utf8');
  return t;
}

test('[Konformitätsweg] die öffentlichen Texte sagen „Kern nachrechenbar, Produkte nicht“ und Klasse I als Maßstab', () => {
  assert.deepEqual(befunde(lesen()), []);
});

test('[Konformitätsweg·Rot-Beweis] die Sätze bis v1.0.943 fallen, der historische CHANGELOG-Eintrag nicht', () => {
  const t = lesen();
  // SECURITY.md bis v1.0.943 (Kanon a8243ba7e, Z. 138–144), gekürzt auf die tragenden Wörter.
  const alt = { ...t, 'SECURITY.md': t['SECURITY.md'].replace(/Als Maßstab legen wir[\s\S]*?Art\. 32 Abs\. 2\)\./,
    'Wir behandeln Vivodepot als wichtiges Produkt der Klasse I (CRA Anhang III Nr. 1). Vorgesehen ist die Konformitätsbewertung nach Modul A über Art. 32 Abs. 5.') };
  const b = befunde(alt);
  for (const g of ['Art. 32 Abs. 5 als Weg', 'Nummer aus Anhang III', 'Klasse I als Einstufung statt als Maßstab']) {
    assert.ok(b.some((x) => x === 'SECURITY.md: ' + g), g + '\n' + b.join('\n'));
  }
  assert.ok(b.some((x) => x.includes('Als Maßstab legen wir')), 'der verlangte Satz fehlt dann');
  // FAQ.md bis v1.0.943.
  const faq = { ...t, 'FAQ.md': 'Der gesamte Software steht unter EUPL-1.2, ist also offen und darf weiterentwickelt werden.' };
  assert.deepEqual(befunde(faq).sort(), ['FAQ.md: die gesamte Software offen',
    'FAQ.md: verlangter Satz fehlt: „im öffentlichen Repository liegt der Kern, Vivodepots eigene Vorlagen liegen dort nicht“']);
  // Der Satz von v1.0.843 im aktuellen Teil des CHANGELOG fällt, im historischen Eintrag nicht.
  assert.match(t['CHANGELOG.md'], /## \[v1\.0\.843\][\s\S]*byte-gleich nachbauen/, 'Vorbedingung: der historische Eintrag trägt ihn');
  const neu = { ...t, 'CHANGELOG.md': '- Nachbau: Die ausgelieferten Dateien lassen sich aus dem Quelltext byte-gleich nachbauen.\n' + t['CHANGELOG.md'] };
  assert.deepEqual(befunde(neu), ['CHANGELOG.md: Produkte byte-gleich aus dem Quelltext']);
});
