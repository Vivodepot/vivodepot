'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio · von der gesicherten Vorlage zu den Antworten (Benutzbarkeitsprüfung 22.11.2026, H2)
   ─────────────────────────────────────────────────────────────────
   Nach dem Sichern steht unter „Vorlage an Personen geben“ die Zeile „Antworten empfangen“. Sie und „Anfrage veröffentlichen ▸“
   öffnen die Anfrage mit den Datenfeldern der Vorlage (Kennung aus dem Katalog, Pflicht wie in der Vorlage), ihrem Zweck und der
   Stelle; eigene Felder gehen in der internen Form `bereich.tpl_<slug>` mit (Weg A, tests/studio-anfrage-eigene-felder.test.js),
   und die Seite nennt sie.
   ROT-BEWEIS: der letzte Fall nimmt die Übernahme zurück (Anfrage beginnt leer) und erwartet rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const HTML = fs.readFileSync(GEN_PATH, 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));

function befunde(html) {
  const f = [];
  const g = ladeGenerator(html ? { html } : undefined);
  const V = g.V, S = g.sandbox;
  const b = V.BEISPIEL_TEMPLATES.praxis;
  const felder = nativ(V.felderAngleichungen(b.felder.map((x) => Object.assign({}, x, { bereich: V.normBereich(x.bereich) }))).felder);
  felder.push({ feldname: 'Lieblingsfarbe', feldtyp: 'text', pflicht: false, bereich: 'identity', gruppe: 'Eigene Felder' });
  Object.assign(V.STATE, { felder, vorlageName: 'Anmeldung in der Praxis', vorlageZweck: 'Aufnahme in die Praxis' });
  let schritt = null;
  S.zeigeSchritt = (id) => { schritt = id; };
  if (typeof S.anfrageAusVorlageOeffnen !== 'function') return ['H2: kein Weg von der Vorlage zur Anfrage'];
  S.anfrageAusVorlageOeffnen();
  const anf = nativ(V.ANF_AS);
  const kennungen = anf.felder.map((x) => x.kennung);
  const kennungVon = (x) => (S.feldKatalogIndex(x) >= 0 ? V.FELDKATALOG[S.feldKatalogIndex(x)].kennung : S.anfrageVorlagenKennungIntern(x));
  const ausKatalog = felder.filter((x) => kennungVon(x));
  const soll = ausKatalog.map(kennungVon);
  if (felder.filter((x) => S.feldKatalogIndex(x) >= 0).length < 5) f.push('H2: Vorbedingung, zu wenige Katalogfelder im Beispiel');
  if (!soll.includes('identity.tpl_lieblingsfarbe')) f.push('H2: eigenes Feld nicht in der internen Form');
  if (JSON.stringify(kennungen) !== JSON.stringify(soll)) f.push('H2: Felder nicht übernommen: ' + kennungen.join(', '));
  if (anf.zweck !== 'Aufnahme in die Praxis') f.push('H2: Zweck nicht übernommen');
  const pflichtSoll = ausKatalog.map((x) => x.pflicht !== false);
  if (JSON.stringify(anf.felder.map((x) => x.pflicht)) !== JSON.stringify(pflichtSoll)) f.push('H2: Pflicht nicht wie in der Vorlage');
  if (schritt !== 'anfrage') f.push('H2: die Anfrage öffnet nicht');
  const h = g.document.getElementById('aa-aus-vorlage');
  if (h.hidden !== false || !/Lieblingsfarbe/.test(String(h.textContent))) f.push('H2: eigene Felder nicht genannt');
  const q = html || HTML;
  if (!/an\('ns-veroeffentlichen', 'click', anfrageAusVorlageOeffnen\);/.test(q)) f.push('H2: „Anfrage veröffentlichen“ übernimmt nicht');
  if (!/id: 'ns-weg-antworten', titel: L\('Antworten empfangen'/.test(q)) f.push('H2: keine Zeile „Antworten empfangen“ nach dem Sichern');
  return f;
}

test('[Studio · H2] Vorlage → Anfrage mit ihren Feldern, Zweck und Pflicht; eigene Felder genannt; Zeile „Antworten empfangen“', () => {
  assert.deepEqual(befunde(), []);
});

test('[Studio · H2 · Rot-Beweis] beginnt die Anfrage leer, wird es rot', () => {
  const a = "  (STATE.felder || []).forEach((f) => {\n    const i = feldKatalogIndex(f);";
  assert.ok(HTML.includes(a), 'Vorbedingung');
  const b = befunde(HTML.replace(a, "  ([]).forEach((f) => {\n    const i = feldKatalogIndex(f);"));
  assert.ok(b.some((x) => x.startsWith('H2: Felder nicht übernommen')), b.join(' | '));
});
