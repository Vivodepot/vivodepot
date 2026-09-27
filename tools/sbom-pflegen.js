'use strict';
/* ════════════════════════════════════════════════════════════════════════
   sbom-pflegen.js — die SBOM wird erzeugt, nicht geschrieben (A2026-07-30, „A2/SBOM";
   erweitert „SBOM-Pflichtfelder" 12.08.2026, BSI TR-03183 Teil 2)
   ────────────────────────────────────────────────────────────────────────
   QUELLEN DER WAHRHEIT: die `@vd-lib`-Marker in `vivodepot.html` (jspdf/qrcode-generator),
   die Font-Face-Blöcke dort (font-inter), die JSON-Quellen unter `code-listen/*.json`
   (die vier Code-Listen) — plus eine kleine, im Code dokumentierte Referenztabelle für
   Ersteller/Dateiname/Klassifikation, wo keine Quelle im Repo diese Angabe trägt.

   SECHS TR-03183-Teil-2-PFLICHTFELDER, vorher fehlend, jetzt erzeugt (nicht von Hand
   eingetragen — wer sie in die JSON-Datei tippt, hat sie beim nächsten Lauf wieder
   verloren):
     1. Ersteller der SBOM            → metadata.authors / metadata.supplier
     2. Ersteller je Komponente        → component.author / component.supplier
     3. Dateiname der Komponente       → component.properties["bsi:component:filename"]
     4. dependencies auf oberster Ebene → das SBOM-weite dependencies-Array
     5. SHA-512 zusätzlich zu SHA-256  → component.hashes
     6. Executable/Archive/Structured  → component.properties["bsi:component:executable
                                          /archive/structured"] (BSI-Property-Taxonomie,
                                          github.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy)

   GEPRÜFT, NICHT NUR ANGENOMMEN (Regel 18): eine erste, per Hand mit `sed`/Zeilennummern
   gezogene Stichprobe schien zu zeigen, die vorhandenen SHA-256-Werte für jspdf und
   qrcode-generator stimmten nicht mehr mit dem eingebetteten Inhalt überein — das war ein
   eigener Messfehler (falsche Zeilengrenze), nicht ein Produktfehler: die hier gebaute,
   indexbasierte Grenzziehung (Inhalt zwischen dem öffnenden `<script`-Tag und dem
   nächsten `</script>`, exakt) reproduziert für BEIDE Komponenten exakt die schon
   vorhandenen SHA-256-Werte — kein Drift. Echter, bestätigter Fund bleibt: `font-inter`
   (vier Base64-WOFF2-Nutzlasten, dekodiert und einzeln gehasht — die naheliegende, korrekte
   Deutung von „Datei-Hash" für eine Schriftdatei) reproduziert die vorhandenen Werte NICHT;
   woher die alten vier Werte stammen, ließ sich nicht feststellen — vermutlich ein früherer
   Einbettungs-Stand. Die vier Code-Listen-Komponenten trugen bislang GAR KEINEN Hash. Alle
   sieben Komponenten tragen jetzt frisch berechnete, aus der jeweiligen Quelle
   reproduzierbare SHA-256- UND SHA-512-Werte.

   `--check` schreibt nichts, meldet Drift (Exit 1) — für Hook/CI.
   Ohne `--check` wird die Drift behoben UND — nur bei tatsächlicher Änderung — der
   Zeitstempel auf heute gesetzt.

   ARGUMENTE STATT FEST VERDRAHTETER PFADE (stehende Schreibregel):
     node tools/sbom-pflegen.js --check
     node tools/sbom-pflegen.js
     node tools/sbom-pflegen.js --check --html <pfad> --sbom <pfad> --codelisten <pfad>
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : s; };
const HTML = arg('html', path.join(REPO, 'vivodepot.html'));
const SBOM = arg('sbom', path.join(REPO, 'vivodepot.sbom.cdx.json'));
const CODELISTEN = arg('codelisten', path.join(REPO, 'code-listen'));
const CHECK = argv.includes('--check');

/* ── @vd-lib-Marker lesen (unverändert aus der Vorfassung) ──────────────────
   Bewusst NICHT auf `<!-- @vd-lib ... -->` als EIN Kommentar gematcht: der
   docx-Marker (status="pending-inline") steht als Dokumentations-Zeile
   INNERHALB eines anderen, viel längeren Kommentarblocks — ein Match bis zum
   nächsten `-->` griffe über hunderte Zeilen. Gematcht wird nur das
   Attribut-Cluster direkt hinter `@vd-lib`, unabhängig von der Kommentarform
   drumherum. */
function vdLibsInline(text) {
  const out = [];
  const re = /@vd-lib\s+((?:[\w-]+="[^"]*"\s*)+)/g;
  let m;
  while ((m = re.exec(text))) {
    const attrs = {};
    const are = /([\w-]+)="([^"]*)"/g;
    let am;
    while ((am = are.exec(m[1]))) attrs[am[1]] = am[2];
    if (attrs.status === 'inline' && attrs.name) out.push(attrs);
  }
  return out;
}

/* Ersetzt NUR, wenn die Fundstelle im ganzen Text eindeutig ist — sonst Abbruch
   statt einer Ersetzung an der falschen Stelle. Nur noch für kleine, gezielte
   Text-Patches außerhalb der SBOM selbst genutzt (die SBOM wird jetzt komplett
   neu erzeugt, nicht mehr per Textersetzung gepflegt) — als Baustein weiter
   exportiert, weil der Selbsttest ihn prüft. */
function ersetzeEindeutig(text, alt, neu, beschreibung) {
  if (alt === neu) return text;
  const teile = text.split(alt);
  if (teile.length - 1 === 0) throw new Error(`„${alt}" (${beschreibung}) nicht gefunden.`);
  if (teile.length - 1 > 1) throw new Error(`„${alt}" (${beschreibung}) ${teile.length - 1}-mal gefunden — nicht eindeutig.`);
  return teile.join(neu);
}

function ersetzeAlle(text, alt, neu, beschreibung) {
  if (alt === neu) return text;
  if (!text.includes(alt)) throw new Error(`„${alt}" (${beschreibung}) nicht gefunden.`);
  return text.split(alt).join(neu);
}

/* ── Inline-Skriptblock-Inhalt extrahieren ───────────────────────────────────
   Grenze: der Inhalt ZWISCHEN dem öffnenden `<script...>`-Tag (exklusive) und
   dem NÄCHSTEN `</script>` (exklusive) — die erste Zeile nach dem Marker-
   Kommentar. Verifiziert (12.08.2026): für jsPDF ist der so extrahierte
   SHA-256 byte-identisch mit dem offiziellen `jspdf.umd.min.js` aus dem
   npm-Release — die Grenzziehung ist damit belegt, nicht nur angenommen. */
function skriptInhaltNachMarker(html, markerEndeIndex) {
  const scriptStart = html.indexOf('<script', markerEndeIndex);
  if (scriptStart < 0) throw new Error('Kein <script>-Tag nach dem Marker gefunden.');
  const tagEnde = html.indexOf('>', scriptStart);
  const inhaltStart = tagEnde + 1;
  const inhaltEnde = html.indexOf('</script>', inhaltStart);
  if (inhaltEnde < 0) throw new Error('Kein schließendes </script> gefunden.');
  return html.slice(inhaltStart, inhaltEnde);
}

function hashes(inhalt) {
  return [
    { alg: 'SHA-256', content: crypto.createHash('sha256').update(inhalt, 'utf8').digest('hex') },
    { alg: 'SHA-512', content: crypto.createHash('sha512').update(inhalt, 'utf8').digest('hex') },
  ];
}

function hashesVonBuffer(buf) {
  return [
    { alg: 'SHA-256', content: crypto.createHash('sha256').update(buf).digest('hex') },
    { alg: 'SHA-512', content: crypto.createHash('sha512').update(buf).digest('hex') },
  ];
}

/* ── font-inter: die vier @font-face-Blöcke, decodiert, gehasht ──────────── */
function fontInterHashesUndDateien(html) {
  const start = html.indexOf('@font-face {');
  const ende = html.indexOf(':root {', start);
  if (start < 0 || ende < 0) throw new Error('font-face-Region nicht gefunden.');
  const region = html.slice(start, ende);
  const treffer = [...region.matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)"/g)];
  if (treffer.length !== 4) throw new Error(`Erwartet vier @font-face-Blöcke, gefunden: ${treffer.length}.`);
  const NAMEN = ['InterDisplay-Regular.woff2 (weight 400)', 'Inter-Medium.woff2 (weight 500)',
    'Inter-SemiBold.woff2 (weight 600)', 'Inter-Bold.woff2 (weight 700)'];
  const alleHashes = [];
  for (const m of treffer) {
    const buf = Buffer.from(m[1], 'base64');
    alleHashes.push(...hashesVonBuffer(buf));
  }
  return { hashes: alleHashes, dateinamen: NAMEN };
}

/* ── Code-Listen: derselbe Generator wie build-code-listen.js, wiederverwendet ──
   Damit ist der gehashte Text GARANTIERT derselbe, den build-code-listen.js auch
   inline schreibt — kein zweiter, abweichender Nachbau der Blockform. */
function codeListenBlockText(liste) {
  const j = (v) => JSON.stringify(v);
  const eintraege = (liste.daten || []).map((e) => '    ' + j(e)).join(',\n');
  const datenJs = (liste.daten && liste.daten.length) ? '[\n' + eintraege + '\n  ]' : '[]';
  return [
    `<!-- @vd-codeliste systemId="${liste.systemId}" — ${liste.hinweis || ''} -->`,
    '<script>',
    `/* @vd-codeliste ${liste.systemId} — ${liste.hinweis || ''} */`,
    `codeListeAnmelden(${j(liste.systemId)}, {`,
    `  uri: ${j(liste.uri || '')}, version: ${j(liste.version || '')}, kuerzel: ${j(liste.kuerzel || liste.systemId)},`,
    ...(liste.teilliste ? ['  teilliste: true,'] : []),
    `  lizenz: ${j(liste.lizenz || '')},`,
    `  daten: ${datenJs}`,
    '});',
    '</script>',
  ].join('\n');
}

function ladeCodeListenQuellen() {
  if (!fs.existsSync(CODELISTEN)) return [];
  return fs.readdirSync(CODELISTEN).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(CODELISTEN, f), 'utf8')));
}

/* ── Referenztabelle: Ersteller/Dateiname/Klassifikation für Komponenten, für
   die keine Quelle im Repo diese Angabe trägt (npm hat keinen author-Eintrag
   für jspdf, code-listen/*.json keinen Ersteller-Namen). Jede Zeile ist belegt
   — Beleg in der jeweiligen Zeile, damit eine spätere Prüfung nicht neu
   recherchieren muss. Klassifikation nach der BSI-Property-Taxonomie
   (github.com/BSI-Bund/tr-03183-cyclonedx-property-taxonomy):
   bsi:component:executable ∈ {executable, non-executable}
   bsi:component:archive    ∈ {archive, no archive}
   bsi:component:structured ∈ {structured, unstructured} */
function pakoAusJspdf(inhalt) {
  const m = /\/\*! pako (\d+\.\d+\.\d+) (https:\/\/github\.com\/nodeca\/pako) @license \(([^)]+)\) \*\//.exec(inhalt);
  if (!m) return null;
  return {
    'bom-ref': 'pako',
    type: 'library',
    name: 'pako',
    version: m[1],
    description: 'Bestandteil des jsPDF-Bundles (Kompression), mit ihm im selben Skriptblock eingebettet; kein eigener Hash, die Bytes deckt der Hash von jspdf.',
    purl: `pkg:npm/pako@${m[1]}`,
    author: REFERENZ.pako.author,
    supplier: REFERENZ.pako.supplier,
    licenses: [{ expression: m[3] }],
  };
}

function xshareZeichenHashes(html) {
  const start = html.indexOf('const YB_ZEICHEN = Object.freeze({');
  if (start < 0) return null;
  const ende = html.indexOf('});', start);
  const treffer = [...html.slice(start, ende).matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)'/g)];
  if (treffer.length !== 3) throw new Error(`Erwartet drei xShare-Zeichen, gefunden: ${treffer.length}.`);
  const alle = [];
  for (const m of treffer) alle.push(...hashesVonBuffer(Buffer.from(m[1], 'base64')));
  return alle;
}

const REFERENZ = {
  jspdf: {
    author: 'James Hall', // npm-Maintainer mrjameshall (james@parall.ax), Repo github.com/parallax/jsPDF
    supplier: { name: 'parallax', url: ['https://github.com/parallax/jsPDF'] },
    dateinamen: ['jspdf.umd.min.js'], // verifiziert: eingebetteter Inhalt = byte-identisch mit diesem npm-4.2.1-Release-Artefakt
    klasse: { executable: 'executable', archive: 'no archive', structured: 'unstructured' },
  },
  'qrcode-generator': {
    author: 'Kazuhiko Arase', // npm package.json author-Feld, Copyright-Zeile im Quelltext
    supplier: { name: 'Kazuhiko Arase', url: ['https://github.com/kazuhikoarase/qrcode-generator'] },
    dateinamen: ['qrcode.js'], // Kopfzeilen-Vergleich: eingebetteter Block deckt sich mit dieser (Nicht-UTF8-)Variante
    klasse: { executable: 'executable', archive: 'no archive', structured: 'unstructured' },
  },
  'font-inter': {
    author: 'The Inter Project Authors', // OFL.txt-Lizenzkopf, github.com/rsms/inter
    supplier: { name: 'The Inter Project Authors', url: ['https://github.com/rsms/inter'] },
    klasse: { executable: 'non-executable', archive: 'no archive', structured: 'unstructured' },
  },
  // 23.09.2026: pako steckt im jsPDF-Bundle (Kopfzeile `/*! pako … @license (MIT AND Zlib) */` im
  // jsPDF-Skriptblock). Unterkomponente von jspdf, ohne eigenen Hash: ihre Bytes sind im
  // minifizierten Bundle nicht abgrenzbar, der Hash von jspdf deckt sie.
  pako: {
    author: 'Vitaly Puzrin, Andrei Tuputcyn', // LICENSE des Tags 2.1.0, github.com/nodeca/pako
    supplier: { name: 'nodeca', url: ['https://github.com/nodeca/pako'] },
  },
  // 23.09.2026: die drei Zeichen des xShare Yellow Button (YB_ZEICHEN in vivodepot.html), je als
  // data:-URI eingebettetes PNG. Gehasht wird das dekodierte PNG, wie bei font-inter.
  'xshare-yellow-button': {
    supplier: { name: 'xShare (Horizon Europe, Grant Agreement No. 101136734)', url: ['https://xshare-project.eu'] },
    dateinamen: ['yb-download.png', 'yb-upload.png', 'yb-share.png'],
    klasse: { executable: 'non-executable', archive: 'no archive', structured: 'unstructured' },
  },
  'code-liste-atc': {
    // Quelle ist die amtliche deutsche Fassung (BfArM, erstellt vom WIdO), nicht der WHOCC-Index.
    supplier: { name: 'Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM)', url: ['https://www.bfarm.de/DE/Kodiersysteme/Klassifikationen/ATC/_node.html'] },
    dateinamen: ['code-listen/atc.json'],
    klasse: { executable: 'non-executable', archive: 'no archive', structured: 'structured' },
  },
  'code-liste-icd10gm': {
    supplier: { name: 'Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM)', url: ['https://www.bfarm.de'] },
    dateinamen: ['code-listen/icd10.json'],
    klasse: { executable: 'non-executable', archive: 'no archive', structured: 'structured' },
  },
  'code-liste-loinc': {
    supplier: { name: 'Regenstrief Institute', url: ['https://loinc.org'] },
    dateinamen: ['code-listen/loinc.json'],
    klasse: { executable: 'non-executable', archive: 'no archive', structured: 'structured' },
  },
  'code-liste-snomed-allergen': {
    supplier: { name: 'SNOMED International', url: ['https://www.snomed.org'] },
    dateinamen: ['code-listen/snomedAllergen.json'],
    klasse: { executable: 'non-executable', archive: 'no archive', structured: 'structured' },
  },
};

function eigenschaften(name) {
  const r = REFERENZ[name];
  const props = [];
  for (const dn of r.dateinamen || []) props.push({ name: 'bsi:component:filename', value: dn });
  props.push({ name: 'bsi:component:executable', value: r.klasse.executable });
  props.push({ name: 'bsi:component:archive', value: r.klasse.archive });
  props.push({ name: 'bsi:component:structured', value: r.klasse.structured });
  return props;
}

/* ── VON HAND GEPFLEGTE KOMPONENTEN (15.09.2026) ──────────────────────────────
   Nicht jede Komponente hat eine Quelle, aus der dieses Werkzeug sie erzeugt: `font-inter-pdf`
   (PDF-Schrift als base64-TrueType, U2-ADR-263-Nachtrag, gebaut von
   tools/build-pdf-inter-einbetten.js) wurde von Hand in die SBOM eingetragen. Bis heute warf
   `erzeugeSBOM` jede solche Komponente beim Neuschreiben still hinaus, und `--check` merkte es nicht,
   weil es nur die ERZEUGTEN Komponenten gegen die bisherigen hielt.
   Jetzt: jede nicht erzeugte Komponente der bisherigen SBOM bleibt an ihrer Stelle erhalten. Wer
   hier eingetragen ist, MUSS in der SBOM stehen — fehlt sie, meldet `--check` das, und der Lauf
   ohne `--check` schreibt nicht, denn den Inhalt kann er nicht wiederherstellen. Die Hashes werden
   gegen die Dateien aus `bsi:component:filename` gehalten (je Datei SHA-256, dann SHA-512). */
const HANDGEPFLEGT = Object.freeze(['font-inter-pdf']);

function dateinamenAus(komponente) {
  return (komponente.properties || []).filter((p) => p.name === 'bsi:component:filename').map((p) => p.value);
}

function hashesAusDateien(dateinamen, repo) {
  const out = [];
  for (const dn of dateinamen) {
    const abs = path.join(repo, dn);
    if (!fs.existsSync(abs)) return null;
    const buf = fs.readFileSync(abs);
    out.push({ alg: 'SHA-256', content: crypto.createHash('sha256').update(buf).digest('hex') });
    out.push({ alg: 'SHA-512', content: crypto.createHash('sha512').update(buf).digest('hex') });
  }
  return out;
}

/* ── Die vollständige SBOM aus den Quellen erzeugen ──────────────────────── */
function erzeugeSBOM(html, bisherigesSbom, repo = REPO) {
  const libs = new Map(vdLibsInline(html).map((l) => [l.name, l]));
  const kompNamen = [];
  const komponenten = [];

  // jspdf, qrcode-generator — Version/purl/Lizenz aus dem @vd-lib-Marker, Hash aus dem
  // tatsächlichen Skriptblock (nicht aus dem Marker — der trägt keinen verlässlichen Hash).
  for (const name of ['jspdf', 'qrcode-generator']) {
    const lib = libs.get(name);
    if (!lib) throw new Error(`Kein @vd-lib status="inline"-Marker für „${name}" gefunden.`);
    const markerIdx = html.indexOf(`@vd-lib name="${name}"`);
    const markerEnde = html.indexOf('-->', markerIdx);
    const inhalt = skriptInhaltNachMarker(html, markerEnde);
    komponenten.push({
      'bom-ref': name,
      type: 'library',
      name,
      version: lib.version,
      description: (bisherigesSbom.components.find((c) => c.name === name) || {}).description || '',
      purl: lib.purl,
      author: REFERENZ[name].author,
      supplier: REFERENZ[name].supplier,
      licenses: [{ license: { id: lib.license } }],
      hashes: hashes(inhalt),
      properties: eigenschaften(name),
    });
    if (name === 'jspdf') {
      const pako = pakoAusJspdf(inhalt);
      if (pako) komponenten[komponenten.length - 1].components = [pako];
    }
    kompNamen.push(name);
  }

  // xShare Yellow Button — drei eingebettete PNG, ein Komponenten-Eintrag (wie font-inter).
  {
    const yb = xshareZeichenHashes(html);
    if (yb) {
      const alt = bisherigesSbom.components.find((c) => c.name === 'xshare-yellow-button') || {};
      komponenten.push({
        'bom-ref': 'xshare-yellow-button',
        type: 'file',
        name: 'xshare-yellow-button',
        version: 'visual-identity-kit-2026-07-22',
        description: alt.description || 'Programmzeichen am Knopf der Funktion (Herunterladen, Hochladen, einmaliges Teilen), '
          + 'Variante „Full – light background", verkleinert, sonst unverändert. Nachweis: NOTICE.md, docs/fremdquellen.md.',
        supplier: REFERENZ['xshare-yellow-button'].supplier,
        licenses: [{ license: { name: 'xShare Yellow Button Visual Identity Kit, zur Verwendung in Yellow-Button-Implementierungen bereitgestellt; ohne eigene Nutzungsbedingungen' } }],
        hashes: yb,
        properties: eigenschaften('xshare-yellow-button'),
      });
      kompNamen.push('xshare-yellow-button');
    }
  }

  // font-inter — vier Dateien, ein Komponenten-Eintrag (bestehende Modellierung beibehalten).
  {
    const { hashes: fh, dateinamen } = fontInterHashesUndDateien(html);
    const alt = bisherigesSbom.components.find((c) => c.name === 'font-inter') || {};
    komponenten.push({
      'bom-ref': 'font-inter',
      type: 'file',
      name: 'font-inter',
      version: alt.version || 'bundled-woff2',
      description: alt.description || '',
      author: REFERENZ['font-inter'].author,
      supplier: REFERENZ['font-inter'].supplier,
      licenses: alt.licenses || [{ license: { id: 'OFL-1.1' } }],
      hashes: fh,
      properties: [
        ...dateinamen.map((dn) => ({ name: 'bsi:component:filename', value: dn })),
        { name: 'bsi:component:executable', value: REFERENZ['font-inter'].klasse.executable },
        { name: 'bsi:component:archive', value: REFERENZ['font-inter'].klasse.archive },
        { name: 'bsi:component:structured', value: REFERENZ['font-inter'].klasse.structured },
      ],
    });
    kompNamen.push('font-inter');
  }

  // Code-Listen — Version/Lizenz aus der JSON-Quelle, Hash aus demselben generierten
  // Blocktext, den build-code-listen.js auch inline schreibt.
  const CODE_KOMPONENTEN = {
    atc: 'code-liste-atc', icd10: 'code-liste-icd10gm', loinc: 'code-liste-loinc', snomedAllergen: 'code-liste-snomed-allergen',
  };
  const quellen = new Map(ladeCodeListenQuellen().map((l) => [l.systemId, l]));
  for (const [systemId, kompName] of Object.entries(CODE_KOMPONENTEN)) {
    const liste = quellen.get(systemId);
    if (!liste) throw new Error(`Keine Quelle code-listen/${systemId}.json gefunden für „${kompName}".`);
    const alt = bisherigesSbom.components.find((c) => c.name === kompName) || {};
    const blockText = codeListenBlockText(liste);
    komponenten.push({
      'bom-ref': kompName,
      type: 'file',
      name: kompName,
      version: liste.version,
      description: alt.description || '',
      supplier: REFERENZ[kompName].supplier,
      licenses: [{ license: { name: liste.lizenz } }],
      hashes: hashes(blockText),
      properties: eigenschaften(kompName),
    });
    kompNamen.push(kompName);
  }

  // Erzeugte Komponenten ersetzen ihre bisherigen an derselben Stelle; jede NICHT erzeugte
  // bisherige Komponente bleibt erhalten (von Hand gepflegt, s. HANDGEPFLEGT). Neue erzeugte
  // Komponenten kommen ans Ende.
  const erzeugt = new Map(komponenten.map((k) => [k.name, k]));
  const alle = [];
  for (const alt of bisherigesSbom.components || []) {
    if (erzeugt.has(alt.name)) { alle.push(erzeugt.get(alt.name)); erzeugt.delete(alt.name); continue; }
    const frischeHashes = HANDGEPFLEGT.includes(alt.name) ? hashesAusDateien(dateinamenAus(alt), repo) : null;
    alle.push(frischeHashes && frischeHashes.length ? { ...alt, hashes: frischeHashes } : alt);
  }
  for (const k of erzeugt.values()) alle.push(k);
  const alleNamen = alle.map((k) => k.name);

  const unter = (k) => (k.components || []).map((u) => u['bom-ref']);
  const dependencies = [
    { ref: 'vivodepot', dependsOn: alleNamen },
    ...alle.map((k) => ({ ref: k.name, dependsOn: unter(k) })),
    ...alle.flatMap((k) => unter(k).map((r) => ({ ref: r, dependsOn: [] }))),
  ];

  return {
    bomFormat: bisherigesSbom.bomFormat,
    specVersion: bisherigesSbom.specVersion,
    version: bisherigesSbom.version,
    metadata: {
      timestamp: bisherigesSbom.metadata.timestamp,
      authors: [{ name: 'Vivodepot GmbH' }], // Erstellerin dieser SBOM (tools/sbom-pflegen.js läuft in ihrem Auftrag)
      supplier: { name: 'Vivodepot GmbH', url: ['https://vivodepot.de'] }, // Lieferantin der App selbst
      component: { 'bom-ref': 'vivodepot', ...bisherigesSbom.metadata.component },
    },
    components: alle,
    dependencies,
    annotations: bisherigesSbom.annotations,
  };
}

function drifteListe(alt, neu) {
  const drift = [];
  const altKomp = new Map(alt.components.map((c) => [c.name, c]));
  for (const k of neu.components) {
    const a = altKomp.get(k.name);
    if (!a) { drift.push(`${k.name}: neue Komponente`); continue; }
    if (a.version !== k.version) drift.push(`${k.name}: Version ${a.version} → ${k.version}`);
    if (JSON.stringify(a.hashes) !== JSON.stringify(k.hashes)) drift.push(`${k.name}: Hashes weichen ab (SHA-256${k.hashes.length > 1 ? '/SHA-512' : ''} neu berechnet)`);
    if (!a.author && k.author) drift.push(`${k.name}: Ersteller ergänzt (${k.author})`);
    if (!a.supplier && k.supplier) drift.push(`${k.name}: Lieferant ergänzt (${k.supplier.name})`);
    if (!a.properties && k.properties) drift.push(`${k.name}: Eigenschaften ergänzt (Dateiname, Executable/Archive/Structured)`);
    if (JSON.stringify(a.components || []) !== JSON.stringify(k.components || [])) drift.push(`${k.name}: Unterkomponenten weichen ab`);
  }
  const neuNamen = new Set(neu.components.map((c) => c.name));
  for (const a of alt.components) if (!neuNamen.has(a.name)) drift.push(`${a.name}: Komponente entfiele beim Neuschreiben`);
  for (const name of HANDGEPFLEGT) {
    if (!altKomp.has(name)) drift.push(`${name}: von Hand gepflegte Komponente FEHLT in der SBOM — von Hand wiederherstellen`);
  }
  if (!alt.metadata.authors) drift.push('metadata.authors ergänzt (Vivodepot GmbH)');
  if (!alt.metadata.supplier) drift.push('metadata.supplier ergänzt (Vivodepot GmbH)');
  if (!alt.dependencies) drift.push('dependencies (oberste Ebene) ergänzt');
  return drift;
}

function pruefeUndPflege() {
  const htmlText = fs.readFileSync(HTML, 'utf8');
  const sbomText = fs.readFileSync(SBOM, 'utf8');
  const bisherig = JSON.parse(sbomText);
  const neu = erzeugeSBOM(htmlText, bisherig);
  const drift = drifteListe(bisherig, neu);
  const neuerText = JSON.stringify(neu, null, 2) + '\n';
  return { drift, sbomText, neuerText, altTimestamp: bisherig.metadata && bisherig.metadata.timestamp, neuesObjekt: neu };
}

function main() {
  let ergebnis;
  try {
    ergebnis = pruefeUndPflege();
  } catch (e) {
    console.error('SBOM-PFLEGE FEHLGESCHLAGEN: ' + e.message);
    process.exit(2);
  }
  const { drift, sbomText, neuerText, altTimestamp } = ergebnis;

  if (!drift.length) {
    console.log('sbom-pflegen: kein Drift — SBOM deckt Marker/Quellen/Pflichtfelder vollständig.');
    process.exit(0);
  }

  console.log('sbom-pflegen: Drift gefunden —');
  for (const d of drift) console.log('  · ' + d);

  if (CHECK) {
    console.error('\nABBRUCH: SBOM weicht vom erzeugten Stand ab. Beheben mit: npm run sbom:build');
    process.exit(1);
  }
  if (drift.some((d) => /FEHLT in der SBOM/.test(d))) {
    console.error('\nABBRUCH: eine von Hand gepflegte Komponente fehlt — dieses Werkzeug kann sie nicht erzeugen, nichts geschrieben.');
    process.exit(1);
  }

  const heute = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
  const mitZeitstempel = neuerText.replace(`"timestamp": "${altTimestamp}"`, `"timestamp": "${heute}"`);
  JSON.parse(mitZeitstempel); // Selbstprüfung: das Ergebnis muss gültiges JSON bleiben, bevor es geschrieben wird
  fs.writeFileSync(SBOM, mitZeitstempel);
  console.log(`sbom-pflegen: behoben, Zeitstempel ${altTimestamp} → ${heute}.`);
}

if (require.main === module) main();
module.exports = { HANDGEPFLEGT, hashesAusDateien, vdLibsInline, ersetzeEindeutig, ersetzeAlle, pruefeUndPflege, erzeugeSBOM, skriptInhaltNachMarker, fontInterHashesUndDateien, codeListenBlockText };
