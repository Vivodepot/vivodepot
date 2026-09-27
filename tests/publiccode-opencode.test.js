'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   publiccode.yml trägt, was openCoDE für die Aufnahme ins Softwareverzeichnis braucht (25.09.2026).

   Vivodepot fehlte im openCoDE-Softwareverzeichnis (und damit im EU-Katalog). Die eigentliche Prüfung macht der
   offizielle Parser in der CI (.github/workflows/publiccode-pruefen.yml). Diese Probe fängt die Klasse früher, statisch,
   ohne Netz und ohne YAML-Bibliothek: die Regeln, an denen der Parser am 25.09.2026 scheiterte oder warnte,
   die Pflichtfelder vorhanden, und `url` zeigt auf das openCoDE-Projekt: openCoDE erwartet „the direct link to your
   openCode repository", ein Projekt, keine Gruppe. Entschieden 25.09.2026: die openCoDE-Adresse, dort liegt das Repo
   spiegelgleich; GitHub bleibt als Ursprung in README und CITATION genannt.
   Rot-Beweis: eine gepflanzte Fassung 0.3, ein fehlendes Pflichtfeld und eine GitHub- oder Gruppen-url fallen.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DATEI = path.join(__dirname, '..', 'publiccode.yml');
/* Die Kategorien des Standards, Stand 25.09.2026 (publiccodeyml/publiccode.yml, docs/standard/categories-list.rst).
   Eine neue Kategorie im Standard kommt hierher, bevor die Datei sie benutzt. */
const KATEGORIEN = new Set([
  'accounting', 'agile-project-management', 'applicant-tracking', 'application-development', 'appointment-scheduling', 'backup', 'billing-and-invoicing', 'blog',
  'budgeting', 'business-intelligence', 'business-process-management', 'cad', 'call-center-management', 'cloud-management', 'collaboration', 'communications',
  'compliance-management', 'contact-management', 'content-management', 'crm', 'customer-service-and-support', 'data-analytics', 'data-collection', 'data-visualization',
  'design', 'design-system', 'digital-asset-management', 'digital-citizenship', 'document-management', 'donor-management', 'e-commerce', 'e-signature',
  'educational-content', 'email-management', 'email-marketing', 'employee-management', 'enterprise-project-management', 'enterprise-social-networking', 'erp', 'event-management',
  'facility-management', 'feedback-and-reviews-management', 'financial-reporting', 'fleet-management', 'fundraising', 'gamification', 'geographic-information-systems', 'grant-management',
  'graphic-design', 'help-desk', 'hr', 'ide', 'identity-management', 'instant-messaging', 'integrated-library-system', 'inventory-management',
  'it-asset-management', 'it-development', 'it-management', 'it-security', 'it-service-management', 'knowledge-management', 'learning-management-system', 'marketing',
  'mind-mapping', 'mobile-marketing', 'mobile-payment', 'network-management', 'office', 'online-booking', 'online-community', 'payment-gateway',
  'payroll', 'predictive-analysis', 'procurement', 'productivity-suite', 'project-collaboration', 'project-management', 'property-management', 'real-estate-management',
  'regulations-and-directives', 'remote-support', 'resource-management', 'sales-management', 'seo', 'service-desk', 'social-media-management', 'survey',
  'talent-management', 'task-management', 'taxes-management', 'test-management', 'time-management', 'time-tracking', 'translation', 'video-conferencing',
  'video-editing', 'visitor-management', 'voip', 'warehouse-management', 'web-collaboration', 'web-conferencing', 'website-builder', 'whistleblowing',
  'workflow-management', 'other',
]);

function pruefen(text) {
  const fehler = [];
  const oben = (k) => new RegExp('^' + k + ':', 'm').test(text);
  // Der offizielle Parser verlangt „0" (die jeweils neueste Fassung); jede feste Fassung ergibt eine Warnung.
  const v = /^publiccodeYmlVersion:\s*"?([\d.]+)"?/m.exec(text);
  if (!v) fehler.push('publiccodeYmlVersion fehlt');
  else if (v[1] !== '0') fehler.push('publiccodeYmlVersion ' + v[1] + ' — der Parser verlangt "0"');
  // Kategorien aus der Liste des Standards.
  const kat = /^categories:\n((?:\s+-\s*\S+\n)+)/m.exec(text);
  for (const k of kat ? [...kat[1].matchAll(/-\s*(\S+)/g)].map((m) => m[1]) : []) if (!KATEGORIEN.has(k)) fehler.push('Kategorie „' + k + '" gibt es im Standard nicht');
  // Kurzbeschreibung höchstens 150 Zeichen, je Sprache.
  for (const m of text.matchAll(/^    shortDescription:\s*>?\s*\n((?:      .*\n)+)/gm)) {
    const kurz = m[1].split('\n').map((z) => z.trim()).filter(Boolean).join(' ');
    if (kurz.length > 150) fehler.push('shortDescription mit ' + kurz.length + ' Zeichen (höchstens 150)');
  }
  // Ländercodes groß; veraltete Schlüssel entfernt.
  if (/^  countries:\n(?:\s+-\s*[a-z]{2}\s*\n)/m.test(text)) fehler.push('Ländercode klein geschrieben');
  for (const [muster, name] of [[/^inputTypes:/m, 'inputTypes'], [/^outputTypes:/m, 'outputTypes'], [/^    genericName:/m, 'genericName'], [/^  repoOwner:/m, 'legal.repoOwner']]) {
    if (muster.test(text)) fehler.push('veralteter Schlüssel ' + name);
  }
  if (/^organisation:/m.test(text) && !/^  uri:\s*\S/m.test(text)) fehler.push('organisation.uri fehlt');
  // url: das Projekt auf openCoDE (Gruppe/Projekt), nicht der Ursprung anderswo und nicht nur die Gruppe.
  const url = /^url:\s*"?([^"\s]+)"?\s*$/m.exec(text);
  if (url && !/^https:\/\/gitlab\.opencode\.de\/[\w.-]+\/[\w.-]+$/.test(url[1])) fehler.push('url ' + url[1] + ' ist kein openCoDE-Projekt');
  for (const k of ['name', 'url', 'releaseDate', 'platforms', 'categories', 'developmentStatus', 'softwareType', 'description', 'legal', 'maintenance', 'localisation']) {
    if (!oben(k)) fehler.push('Pflichtfeld fehlt: ' + k);
  }
  for (const k of ['shortDescription', 'longDescription', 'features']) {
    if (!new RegExp('^    ' + k + ':', 'm').test(text)) fehler.push('description.<sprache>.' + k + ' fehlt');
  }
  if (!/^  license:\s*\S/m.test(text)) fehler.push('legal.license fehlt');
  if (!/^  type:\s*(internal|contract|community|none)\b/m.test(text)) fehler.push('maintenance.type fehlt');
  if (/^  type:\s*(internal|contract)\b/m.test(text) && !/^  contacts:/m.test(text)) fehler.push('maintenance.contacts fehlt');
  if (!/^  localisationReady:/m.test(text) || !/^  availableLanguages:/m.test(text)) fehler.push('localisation unvollständig');
  return fehler;
}

test('[publiccode·openCoDE] Fassung ab 0.4 und alle Pflichtfelder', () => {
  assert.deepEqual(pruefen(fs.readFileSync(DATEI, 'utf8')), []);
});

test('[publiccode·Parser·Rot-Beweis] die Fassung, an der der offizielle Parser am 25.09.2026 scheiterte, fällt an jeder seiner Regeln', () => {
  const alt = fs.readFileSync(path.join(__dirname, 'fixtures', 'publiccode', 'publiccode-81feab8.yml'), 'utf8');
  const f = pruefen(alt);
  for (const erwartet of ['der Parser verlangt "0"', '„healthcare" gibt es im Standard nicht', 'shortDescription mit', 'Ländercode klein',
    'veralteter Schlüssel inputTypes', 'veralteter Schlüssel outputTypes', 'veralteter Schlüssel genericName', 'veralteter Schlüssel legal.repoOwner',
    'url https://github.com/vivodepot/vivodepot ist kein openCoDE-Projekt']) {
    assert.ok(f.some((x) => x.includes(erwartet)), erwartet + ' fehlt in ' + JSON.stringify(f));
  }
});

test('[publiccode·openCoDE·Rot-Beweis] Fassung 0.3 und ein fehlendes Pflichtfeld fallen', () => {
  const echt = fs.readFileSync(DATEI, 'utf8');
  assert.ok(pruefen(echt.replace(/^publiccodeYmlVersion:.*$/m, 'publiccodeYmlVersion: "0.3"')).some((f) => f.includes('0.3')));
  assert.ok(pruefen(echt.replace(/^releaseDate:.*$/m, '')).some((f) => f.includes('releaseDate')));
});

test('[publiccode·openCoDE] url zeigt auf das openCoDE-Projekt vivodepot/vivodepot', () => {
  assert.match(fs.readFileSync(DATEI, 'utf8'), /^url:\s*"?https:\/\/gitlab\.opencode\.de\/vivodepot\/vivodepot"?\s*$/m);
});

test('[publiccode·openCoDE·Rot-Beweis] eine url auf GitHub oder nur auf die openCoDE-Gruppe fällt', () => {
  const echt = fs.readFileSync(DATEI, 'utf8');
  // Die Gruppe aus der echten url abgeleitet: so steht keine zweite openCoDE-Adresse im Baum (tools/repo-adresse-pruefen.js).
  const gruppe = /^url:\s*"?([^"\s]+)"?\s*$/m.exec(echt)[1].replace(/\/[^/]+$/, '');
  for (const falsch of ['https://github.com/vivodepot/vivodepot', gruppe]) {
    assert.ok(pruefen(echt.replace(/^url:.*$/m, 'url: "' + falsch + '"')).some((f) => f.startsWith('url ' + falsch + ' ')), falsch);
  }
});
