'use strict';
/* Befund LUCIDE-LIZENZHINWEIS (02.10.2026, MITTEL): die Icons des Kerns (`const ICONS`) sind
   Lucide-Pfaddaten (ISC, Feather-Anteil MIT) und standen weder in NOTICE.md noch in
   THIRD_PARTY_LICENSES noch in der SBOM. ISC und MIT verlangen den Hinweis in jeder Kopie.

   Diese Probe hält: Trägt der Kern Lucide-Icons, dann tragen alle drei Träger den Hinweis — NOTICE.md
   den Namen und beide Copyright-Zeilen, THIRD_PARTY_LICENSES beide Wortlaute, die SBOM die Komponente
   mit „ISC AND MIT". Ob der Hash der SBOM zum Block passt, hält schon `sbom:check`
   (tests/sbom-pflegen.test.js). Die Klasse „weitere ungenannte Fremdbestandteile" gehört der Lizenz- und Veröffentlichungspflege. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { lucideIconsBlock } = require('../tools/sbom-pflegen.js');

const REPO = path.join(__dirname, '..');
const lies = (d) => fs.readFileSync(path.join(REPO, d), 'utf8');

const ISC_SATZ = 'Permission to use, copy, modify, and/or distribute this software for any';
const MIT_SATZ = 'Permission is hereby granted, free of charge, to any person obtaining a copy';

function lucideAbschnitt(thirdParty) {
  const start = thirdParty.search(/^\d+[a-z]?\) Lucide-Icons/m);
  if (start < 0) return null;
  const rest = thirdParty.slice(start);
  const ende = rest.search(/\n-{70,}\n/);
  return ende < 0 ? rest : rest.slice(0, ende);
}

function lucideHinweisMaengel({ kernHtml, notice, thirdParty, sbom }) {
  if (!lucideIconsBlock(kernHtml)) return [];
  const m = [];
  if (!/Lucide/.test(notice)) m.push('NOTICE.md nennt Lucide nicht');
  if (!/Lucide Contributors/.test(notice) || !/Cole Bemis/.test(notice)) m.push('NOTICE.md: Copyright-Zeilen fehlen');
  const abschnitt = lucideAbschnitt(thirdParty);
  if (!abschnitt) m.push('THIRD_PARTY_LICENSES: kein Abschnitt Lucide-Icons');
  else {
    if (!abschnitt.includes(ISC_SATZ)) m.push('THIRD_PARTY_LICENSES: ISC-Wortlaut fehlt');
    if (!abschnitt.includes(MIT_SATZ) || !/Cole Bemis/.test(abschnitt)) m.push('THIRD_PARTY_LICENSES: MIT-Wortlaut (Feather) fehlt');
  }
  const k = (sbom.components || []).find((c) => c.name === 'lucide-icons');
  if (!k) m.push('SBOM: Komponente lucide-icons fehlt');
  else if (!(k.licenses || []).some((l) => l.expression === 'ISC AND MIT')) m.push('SBOM: Lizenz nicht „ISC AND MIT"');
  return m;
}

const ECHT = () => ({
  kernHtml: lies('vivodepot.html'),
  notice: lies('NOTICE.md'),
  thirdParty: lies('THIRD_PARTY_LICENSES'),
  sbom: JSON.parse(lies('vivodepot.sbom.cdx.json')),
});

test('[LUCIDE-LIZENZHINWEIS] der Kern trägt Lucide-Icons, und alle drei Träger tragen den Hinweis', () => {
  const e = ECHT();
  assert.ok(lucideIconsBlock(e.kernHtml), 'Voraussetzung: der Kern trägt const ICONS — sonst prüft die Probe nichts');
  assert.deepEqual(lucideHinweisMaengel(e), []);
});

test('[LUCIDE-LIZENZHINWEIS·Rot-Beweis] fehlt der Hinweis in einem Träger, fällt die Probe', () => {
  const e = ECHT();
  assert.ok(lucideHinweisMaengel({ ...e, notice: e.notice.replace(/Lucide/g, 'X') }).some((x) => /NOTICE/.test(x)));
  assert.ok(lucideHinweisMaengel({ ...e, thirdParty: e.thirdParty.split(ISC_SATZ).join('') }).some((x) => /ISC/.test(x)));
  assert.ok(lucideHinweisMaengel({ ...e, thirdParty: e.thirdParty.split(MIT_SATZ).join('') }).some((x) => /MIT/.test(x)));
  const ohne = { ...e.sbom, components: e.sbom.components.filter((c) => c.name !== 'lucide-icons') };
  assert.ok(lucideHinweisMaengel({ ...e, sbom: ohne }).some((x) => /SBOM/.test(x)));
});

test('[LUCIDE-LIZENZHINWEIS] ohne Icons im Kern verlangt die Probe nichts (Icons wandern ins Branding-Modul)', () => {
  const e = ECHT();
  assert.deepEqual(lucideHinweisMaengel({ ...e, kernHtml: '<html></html>', notice: '', thirdParty: '', sbom: { components: [] } }), []);
});
