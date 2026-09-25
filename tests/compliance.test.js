'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Compliance-Härtung (Teil 6, Schnitt 6.2)
   ────────────────────────────────────────────────────────────────────────
   EUPL-1.2-Header, @vd-lib-Annotationen, SBOM (CycloneDX 1.4) und
   THIRD_PARTY_LICENSES müssen den TATSÄCHLICHEN Stand abbilden: jsPDF 4.2.1 und
   qrcode-generator 1.4.4 sind inline; docx ist NICHT eingebettet (status=pending-inline).
   Es darf nichts als eingebettet geführt werden, was nicht im Code steht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
/* UMLENKBAR wie überall im Haus (`KERN_HTML_PATH`) — die stehende Regel „ein Prüfwerkzeug
   nimmt den zu prüfenden Gegenstand als Argument". Ohne die Umlenkung liesse sich der
   Rot-Beweis der DOCX-Streichung nur führen, indem man die echte Datei anfasst. */
const HTML = fs.readFileSync(process.env.KERN_HTML_PATH || path.join(REPO, 'vivodepot.html'), 'utf8');
const SBOM = JSON.parse(fs.readFileSync(path.join(REPO, 'vivodepot.sbom.cdx.json'), 'utf8'));
const TPL = fs.readFileSync(path.join(REPO, 'THIRD_PARTY_LICENSES'), 'utf8');

test('1) EUPL-1.2-Header steht im Datei-Kopf', () => {
  assert.ok(HTML.includes('SPDX-License-Identifier: EUPL-1.2'), 'SPDX-Kennung');
  assert.ok(HTML.includes('European Union Public Licence v1.2') || HTML.includes('EUPL-1.2'), 'EUPL benannt');
});

test('2) @vd-lib-Annotationen: jsPDF + qrcode inline, KEINE pending-Bibliothek mehr', () => {
  assert.ok(/@vd-lib[^>]*name="jspdf"[^>]*status="inline"/s.test(HTML), 'jsPDF inline annotiert');
  assert.ok(/@vd-lib[^>]*name="qrcode-generator"[^>]*status="inline"/s.test(HTML), 'qrcode inline annotiert');
  /* Bis zum 21.08.2026 verlangte diese Zeile `name="docx" status="pending-inline"` — eine
     Bibliothek, die seit dem 16.06. als „kommt noch" geführt und nie eingebettet wurde
     (Blocker C-4 vom 26.07.). Die Produktentscheidung hat den WEG gestrichen statt die Bibliothek
     nachzuliefern. Die Probe wird umgedreht: es darf GAR KEINE pending-Annotation mehr geben.
     Eine gelöschte Zeile hätte offengelassen, ob wieder eine dazukommt. */
  assert.ok(!/@vd-lib[^>]*status="pending-inline"/s.test(HTML),
    'es steht wieder eine pending-inline-Bibliothek in der Datei — dann ist eine Zusage offen, '
    + 'die niemand eingelöst hat');
  // KEINE widersprüchliche pending-Annotation für qrcode mehr (Drift bereinigt).
  assert.ok(!/@vd-lib[^>]*name="qrcode-generator"[^>]*status="pending-inline"/s.test(HTML), 'keine stale qrcode-pending-Annotation');
});

test('3) Tatsächlicher Inline-Stand: qrcode-generator eingebettet, docx nur unter Guard', () => {
  // qrcode-generator ist tatsächlich inline (Lib-Code + window.qrcode zur Laufzeit); der Code
  // nutzt es defensiv unter Guard. docx ist NICHT eingebettet — nur als window.docx-Guard
  // referenziert (degradiert sauber). Kein „inline"-Claim ohne Code-Grundlage.
  assert.ok(/var qrcode\s*=\s*function/.test(HTML), 'qrcode-Lib inline (var qrcode = function)');
  assert.ok(HTML.includes('Kazuhiko Arase'), 'qrcode-Lizenzkopf inline');
  /* Bis zum 21.08.2026 stand hier: „docx nur unter Guard (!window.docx) — nicht eingebettet".
     Der Guard ist fort, weil der ganze Weg fort ist. Die Probe wird UMGEDREHT statt gelöscht:
     sie hält jetzt fest, dass NIRGENDS mehr `window.docx` gelesen wird — eine gelöschte Probe
     ließe einen Rückbau schweigend zu. */
  assert.ok(!/window\.docx/.test(HTML.replace(/\/\*[\s\S]*?\*\//g, '')),
    'es wird wieder window.docx gelesen — der gestrichene Weg ist zurück');
});

/* Strukturelle Prüfung statt Namensliste: der Versions-String einer Code-Liste muss sagen,
   welchen Stand die ausgelieferte Liste hat — Platzhalter/Auszug (SEED/STUB) ODER amtliche
   Fassung mit Jahresangabe. Ein leerer, fehlender oder inhaltsloser String fällt durch.
   (U2-Befund 2026-09-16: Commit 801869ec stellte den ATC-Lizenztext auf die amtliche Fassung
   2026 um; eine reine SEED/STUB-Namensliste hätte das zu Unrecht abgelehnt.) */
function hatZulaessigenListenstand(component) {
  const version = component && component.version;
  if (!version || typeof version !== 'string') return false;
  if (/\b(SEED|STUB)\b/.test(version)) return true;
  return /\bamtlich\b/i.test(version) && /\b(19|20)\d{2}\b/.test(version);
}

test('4) SBOM ist CycloneDX 1.4; jsPDF + qrcode-generator als Libraries; Code-Listen als file-Komponenten', () => {
  assert.equal(SBOM.bomFormat, 'CycloneDX');
  assert.equal(SBOM.specVersion, '1.4');
  const libs = (SBOM.components || []).filter(c => c.type === 'library').map(c => c.name);
  assert.deepEqual(libs.slice().sort(), ['jspdf', 'qrcode-generator'], 'jsPDF + qrcode-generator als eingebettete Libraries');
  const jspdf = SBOM.components.find(c => c.name === 'jspdf');
  assert.equal(jspdf.version, '4.2.1');
  assert.equal(jspdf.licenses[0].license.id, 'MIT');
  assert.ok(jspdf.hashes.some(h => h.alg === 'SHA-256' && /^[0-9a-f]{64}$/.test(h.content)), 'SHA-256 gesetzt');
  const qr = SBOM.components.find(c => c.name === 'qrcode-generator');
  assert.equal(qr.version, '1.4.4');
  assert.equal(qr.licenses[0].license.id, 'MIT');
  assert.ok(qr.hashes.some(h => h.alg === 'SHA-256' && /^[0-9a-f]{64}$/.test(h.content)), 'qrcode SHA-256 gesetzt');
  // App-Lizenz EUPL-1.2.
  assert.equal(SBOM.metadata.component.licenses[0].license.id, 'EUPL-1.2');
  // Paket 3 — Code-Listen sind als file-Komponenten mit Versions-String geführt.
  const codeListen = (SBOM.components || []).filter(c => c.type === 'file' && /code-liste/.test(c.name));
  assert.ok(codeListen.length >= 4, 'mindestens vier Code-Listen-Komponenten (atc/icd10/loinc/snomed)');
  for (const c of codeListen) {
    assert.ok(hatZulaessigenListenstand(c), 'Versions-String trägt Platzhalter- oder amtlichen Stand: ' + c.name);
    assert.ok(c.licenses && c.licenses[0], 'Lizenz pro Code-Liste: ' + c.name);
  }
});

/* Eigene Probe statt Zusatz-Zusicherung in Test 4: die Lockerung von „SEED oder STUB" auf „auch
   eine amtliche Fassung mit Jahresangabe" darf nicht zu „irgendein nichtleerer String" werden.
   Fällt diese Probe weg oder wird sie grün, ohne dass die drei Fälle scheitern, bewacht Test 4
   nichts mehr. */
test('4b·Rot-Beweis) ein leerer, fehlender oder inhaltsloser Versions-String fällt weiter durch', () => {
  assert.ok(!hatZulaessigenListenstand({ name: 'code-liste-probe-leer', version: '' }),
    'leerer Versions-String darf nicht durchgehen');
  assert.ok(!hatZulaessigenListenstand({ name: 'code-liste-probe-fehlend' }),
    'fehlender Versions-String darf nicht durchgehen');
  assert.ok(!hatZulaessigenListenstand({ name: 'code-liste-probe-unsinn', version: 'Version-Zwei-Punkt-Null' }),
    'ein String ohne SEED/STUB und ohne amtliche Fassung mit Jahr darf nicht durchgehen');
  assert.ok(!hatZulaessigenListenstand({ name: 'code-liste-probe-ohne-jahr', version: 'amtliche Fassung' }),
    '„amtlich" ohne Jahresangabe sagt nicht, WELCHEN Stand die Liste hat');
  // Gegenprobe: die beiden zulässigen Formen gehen durch — sonst prüfte die Probe oben nichts.
  assert.ok(hatZulaessigenListenstand({ name: 'code-liste-probe-seed', version: 'SEED-2026-05' }));
  assert.ok(hatZulaessigenListenstand({ name: 'code-liste-probe-amtlich', version: 'ATC-GM-2026-amtlich' }));
});

test('5) SBOM: qrcode-generator als Komponente; docx als ausstehend (nicht Komponente)', () => {
  const text = JSON.stringify(SBOM);
  const namen = (SBOM.components || []).map(c => c.name);
  assert.ok(namen.includes('qrcode-generator'), 'qrcode-generator IST eingebettete Komponente');
  assert.ok(!namen.includes('docx'), 'docx NICHT als Komponente (noch nicht eingebettet)');
  assert.ok(/docx[\s\S]{0,80}(nicht inline|nicht eingebettet|pending-inline)/i.test(text), 'docx als ausstehend benannt');
});

test('6) THIRD_PARTY_LICENSES: jsPDF + qrcode inline mit MIT-Volltext; docx pending', () => {
  assert.ok(/jsPDF 4\.2\.1/.test(TPL), 'jsPDF 4.2.1 benannt');
  assert.ok(/Permission is hereby granted, free of charge/.test(TPL), 'MIT-Volltext (jsPDF)');
  assert.ok(/qrcode-generator 1\.4\.4[\s\S]{0,120}STATUS: inline/i.test(TPL), 'qrcode inline');
  assert.ok(/Kazuhiko Arase/.test(TPL), 'qrcode Copyright (MIT-Volltext)');
  assert.ok(/docx 8\.5\.0[\s\S]*pending-inline/i.test(TPL), 'docx pending');
});
