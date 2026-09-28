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
  // NACHTRAG 28.09.2026: maßgeblich ist die offizielle openCoDE-Vorlage für publiccode.yml (openCoDE ist der Konsument; Amtliches
  // vor Eigenem). Sie schreibt "0.4", den Ländercode klein („In Kleinbuchstaben!") und genericName je Sprache (höchstens 35 Zeichen),
  // und sie kennt keinen organisation-Block. Der Parser v5.4.3 nimmt das an und warnt nur („use '0'", „DEPRECATED").
  const v = /^publiccodeYmlVersion:\s*"?([\d.]+)"?/m.exec(text);
  if (!v) fehler.push('publiccodeYmlVersion fehlt');
  else if (v[1] !== '0.4') fehler.push('publiccodeYmlVersion ' + v[1] + ' — die openCoDE-Vorlage verlangt "0.4"');
  // Kategorien aus der Liste des Standards.
  const kat = /^categories:\n((?:\s+-\s*\S+\n)+)/m.exec(text);
  for (const k of kat ? [...kat[1].matchAll(/-\s*(\S+)/g)].map((m) => m[1]) : []) if (!KATEGORIEN.has(k)) fehler.push('Kategorie „' + k + '" gibt es im Standard nicht');
  // Kurzbeschreibung höchstens 150 Zeichen, je Sprache.
  for (const m of text.matchAll(/^    shortDescription:\s*>?\s*\n((?:      .*\n)+)/gm)) {
    const kurz = m[1].split('\n').map((z) => z.trim()).filter(Boolean).join(' ');
    if (kurz.length > 150) fehler.push('shortDescription mit ' + kurz.length + ' Zeichen (höchstens 150)');
  }
  // Ländercodes klein (Vorlage); veraltete Schlüssel entfernt, genericName ausgenommen (Vorlage).
  if (/^  countries:\n(?:\s+-\s*"?[A-Z]{2}"?\s*\n)/m.test(text)) fehler.push('Ländercode groß geschrieben — die openCoDE-Vorlage verlangt klein');
  const namen = [...text.matchAll(/^    genericName:\s*"?([^"\n]*)"?\s*$/gm)].map((m) => m[1]);
  if (namen.length < 2) fehler.push('genericName fehlt (die openCoDE-Vorlage verlangt ihn je Sprache)');
  for (const n of namen) if (n.length > 35) fehler.push('genericName „' + n + '" mit ' + n.length + ' Zeichen (höchstens 35)');
  if (/^organisation:/m.test(text)) fehler.push('organisation-Block — die openCoDE-Vorlage kennt ihn nicht');
  for (const [muster, name] of [[/^inputTypes:/m, 'inputTypes'], [/^outputTypes:/m, 'outputTypes'], [/^  repoOwner:/m, 'legal.repoOwner']]) {
    if (muster.test(text)) fehler.push('veralteter Schlüssel ' + name);
  }
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
  // Seit 28.09.2026 (openCoDE-Vorlage) sind "0.4", der kleine Ländercode und genericName KEINE Fehler mehr — die alte Fassung trug sie
  // schon; ihre übrigen Fehler fallen weiter.
  for (const erwartet of ['„healthcare" gibt es im Standard nicht', 'shortDescription mit',
    'veralteter Schlüssel inputTypes', 'veralteter Schlüssel outputTypes', 'veralteter Schlüssel legal.repoOwner',
    'url https://github.com/vivodepot/vivodepot ist kein openCoDE-Projekt']) {
    assert.ok(f.some((x) => x.includes(erwartet)), erwartet + ' fehlt in ' + JSON.stringify(f));
  }
});

test('[publiccode·openCoDE·Rot-Beweis] Fassung 0.3 und ein fehlendes Pflichtfeld fallen', () => {
  const echt = fs.readFileSync(DATEI, 'utf8');
  // Die Vorlagen-Punkte, je einzeln verletzt: "0", DE groß, genericName fehlt oder zu lang, organisation-Block.
  assert.ok(pruefen(echt.replace(/^publiccodeYmlVersion:.*$/m, 'publiccodeYmlVersion: "0"')).some((f) => f.includes('verlangt "0.4"')));
  assert.ok(pruefen(echt.replace(/^    - "de"$/m, '    - DE')).some((f) => f.includes('Ländercode groß')));
  assert.ok(pruefen(echt.replace(/^    genericName:.*\n/gm, '')).some((f) => f.includes('genericName fehlt')));
  assert.ok(pruefen(echt.replace(/^    genericName:.*$/m, '    genericName: "' + 'x'.repeat(36) + '"')).some((f) => f.includes('36 Zeichen')));
  assert.ok(pruefen(echt + '\norganisation:\n  uri: "https://vivodepot.de"\n').some((f) => f.includes('organisation-Block')));
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

/* Logo (Entscheidung vom 28.09.2026): openCoDE zeigt ein Logo aus dem obersten Ordner (.svg, .svgz, .png; guide.opencode.de,
   „Customizing the display in the openCode software directory"). Das Logo ist Kennzeichen, nicht Code: NOTICE.md und TRADEMARK.md
   tragen den Satz wörtlich, damit niemand es für EUPL-lizenziert hält.
   Als PNG, nicht als SVG: der openCoDE-Server liefert SVG als text/plain aus, dann bleibt das Logo leer (discourse.opencode.de/t/4670);
   das Logo muss im obersten Ordner liegen (discourse.opencode.de/t/5836). */
const WURZEL = path.join(__dirname, '..');
const LOGO_SATZ = 'Das Logo ist Kennzeichen der Vivodepot GmbH und nicht von der EUPL erfasst.';
function logoPruefen(publiccode, wurzel) {
  const f = [];
  const m = publiccode.match(/^logo:\s*["']?([^"'\s#]+)/m);
  if (!m) return ['kein logo-Eintrag'];
  const datei = m[1];
  if (datei.includes('/')) f.push('logo nicht im obersten Ordner: ' + datei);
  if (!/\.png$/.test(datei)) f.push('logo nicht als PNG: ' + datei);
  if (!fs.existsSync(path.join(wurzel, datei))) f.push('logo-Datei fehlt: ' + datei);
  else if (!fs.readFileSync(path.join(wurzel, datei)).subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) f.push('logo ist kein PNG');
  for (const d of ['NOTICE.md', 'TRADEMARK.md']) {
    if (!fs.readFileSync(path.join(wurzel, d), 'utf8').includes(LOGO_SATZ)) f.push(d + ' ohne den Lizenzsatz zum Logo');
  }
  return f;
}

test('[publiccode·openCoDE·Logo] ein PNG-Logo im obersten Ordner, und der Lizenzsatz steht in NOTICE und TRADEMARK', () => {
  assert.deepEqual(logoPruefen(fs.readFileSync(DATEI, 'utf8'), WURZEL), []);
});

test('[publiccode·openCoDE·Logo·Rot-Beweis] ohne Eintrag, mit Pfad, als SVG, mit falschem Inhalt oder ohne Lizenzsatz fällt es', () => {
  const echt = fs.readFileSync(DATEI, 'utf8');
  assert.deepEqual(logoPruefen(echt.replace(/^logo:.*$/m, ''), WURZEL), ['kein logo-Eintrag']);
  assert.ok(logoPruefen(echt.replace(/^logo:.*$/m, 'logo: docs/logo.gif'), WURZEL).length >= 2);
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publiccode-logo-'));
  try {
    fs.writeFileSync(path.join(dir, 'logo.png'), '<svg xmlns="http://www.w3.org/2000/svg"/>');   // ein SVG unter PNG-Namen
    fs.writeFileSync(path.join(dir, 'NOTICE.md'), 'ohne Satz');
    fs.writeFileSync(path.join(dir, 'TRADEMARK.md'), LOGO_SATZ);
    assert.deepEqual(logoPruefen('logo: logo.png\n', dir), ['logo ist kein PNG', 'NOTICE.md ohne den Lizenzsatz zum Logo']);
    assert.ok(logoPruefen('logo: logo.svg\n', dir).includes('logo nicht als PNG: logo.svg'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Stolpersteine aus dem openCoDE-Forum (28.09.2026): softwareVersion ist Pflicht, sonst funktioniert der Verzeichniseintrag nicht, und
   die Vorlage schreibt sie ohne „v" (discourse.opencode.de/t/3240); categories und platforms nur aus den Listen des Editors
   (discourse.opencode.de/t/5836) — die Plattformen nennt die openCoDE-Vorlage: web, windows, mac, linux, ios, android. */
const PLATTFORMEN = new Set(['web', 'windows', 'mac', 'linux', 'ios', 'android']);
function forumPruefen(text) {
  const f = [];
  const sv = /^softwareVersion:\s*"?([^"\s]+)"?/m.exec(text);
  if (!sv) f.push('softwareVersion fehlt');
  else if (!/^\d+\.\d+\.\d+$/.test(sv[1])) f.push('softwareVersion „' + sv[1] + '" nicht in der Form 1.0.818 (ohne v)');
  const pl = /^platforms:\n((?:\s+-\s*\S+\n)+)/m.exec(text);
  if (!pl) f.push('platforms fehlt');
  for (const p of pl ? [...pl[1].matchAll(/-\s*"?([^"\s]+)"?/g)].map((m) => m[1]) : []) if (!PLATTFORMEN.has(p)) f.push('Plattform „' + p + '" nicht in der Liste des Editors');
  return f;
}

test('[publiccode·openCoDE·Forum] softwareVersion ohne v, Plattformen und Kategorien nur aus den Editor-Listen', () => {
  const text = fs.readFileSync(DATEI, 'utf8');
  assert.deepEqual(forumPruefen(text), []);
  assert.deepEqual(pruefen(text).filter((x) => x.includes('Kategorie')), []);
});

test('[publiccode·openCoDE·Forum·Rot-Beweis] "v1.0", eine fehlende Version und eine unbekannte Plattform fallen', () => {
  const echt = fs.readFileSync(DATEI, 'utf8');
  assert.ok(forumPruefen(echt.replace(/^softwareVersion:.*$/m, 'softwareVersion: "v1.0"')).some((x) => x.includes('v1.0')));
  assert.ok(forumPruefen(echt.replace(/^softwareVersion:.*$/m, '')).includes('softwareVersion fehlt'));
  assert.ok(forumPruefen(echt.replace(/^  - web$/m, '  - browser')).some((x) => x.includes('browser')));
});
