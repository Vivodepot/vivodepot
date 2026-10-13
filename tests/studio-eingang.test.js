'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Studio · Neugestaltung A+ mit Glas, Wagen S1 (08.10.2026): der Eingang „Was möchten Sie anbieten?“
   ─────────────────────────────────────────────────────────────────────────────
   Die erste Ebene des Studios fragt nach dem Ziel, nicht nach dem Werkzeug; das heutige Studio steht als Fachebene dahinter.
   Abnahme (Bauvorlage A+ mit Glas, Proben 1–4; Prüfliste Marketing 2, A1/A2/A6/A8/A9, Hängestelle 1, B5):
   (1) keine Fachbegriffe im Eingang (DE und EN), die Fachebene ausgenommen;
   (2) keine Direktübertragung in den Kacheltexten (Übergabe-Entscheidung 08.10.2026: die Person übergibt selbst);
   (3) der Satz „Vivodepot bestätigt, von wem die Vorlage kommt, nicht ob ihr Inhalt richtig ist.“ steht wörtlich, DE und EN;
   (4) Sektorstreuung: höchstens eine der sechs Kacheln spricht von Gesundheit oder Pflege;
   (5) sechs gleich gebaute Kacheln, die erste dunkel; Überschrift V2 und die Frage;
   (6) die Fachebene ist vom Eingang in einem Klick erreichbar (Kopf und „Etwas anderes“), zurück ebenso; der Eingang ist der Start.
   Rot-Beweise je Prüfung an einer veränderten Kopie.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

function eingangVon(html) {
  const a = html.indexOf('<main id="raum-eingang"');
  assert.ok(a > 0, 'kein Eingang (#raum-eingang)');
  return html.slice(a, html.indexOf('</main>', a));
}
/* Sichtbare Texte beider Sprachen: Textknoten und data-en. */
function texte(block) {
  const de = block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const en = [...block.matchAll(/data-en="([^"]*)"/g)].map((m) => m[1]).join(' ');
  return { de, en, beide: de + ' ' + en };
}
function kacheln(block) {
  return [...block.matchAll(/<button type="button" role="listitem" class="([^"]*)" id="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => ({ klasse: m[1], id: m[2], text: texte(m[3]) }));
}

/* In beiden Sprachen Fachbegriffe; „Template“ und „Submission“ nur im deutschen Text (im englischen ist „template“ das gewöhnliche Wort). */
const FACHBEGRIFFE = /\b(LOINC|ICD(-10)?|SNOMED|ATC|FHIR|JSON|VC-Issuer|code system|module version|key pair)\b/i;
const FACHBEGRIFFE_DE = /\b(Kürzel|Code-System|Modul-Version|Empfangsschlüsselpaar|Schlüsselpaar|Submission|Template)\b/;
const DIREKT = /direkt in (ihr|das) Depot|kommt direkt|automatisch (an|in)\b|directly into|arrives? directly|automatically (to|into)/i;
const GESUNDHEIT = /Gesundheit|Pflege|Patient|Arzt|Ärzt|Klinik|Kranken|Praxis|Hebamme|health|care home|patient|medical|clinic|doctor/i;
const SATZ_DE = 'Vivodepot bestätigt, von wem die Vorlage kommt, nicht ob ihr Inhalt richtig ist.';
const SATZ_EN = 'Vivodepot confirms who the template comes from, not whether its content is correct.';

const befundeFachbegriffe = (html) => { const t = texte(eingangVon(html)); return [t.beide.match(FACHBEGRIFFE), t.de.match(FACHBEGRIFFE_DE)].filter(Boolean).map((m) => m[0]); };
const befundeDirekt = (html) => kacheln(eingangVon(html)).filter((k) => DIREKT.test(k.text.beide)).map((k) => k.id);
const gesundheitsKacheln = (html) => kacheln(eingangVon(html)).filter((k) => GESUNDHEIT.test(k.text.beide)).map((k) => k.id);

test('[Eingang · 1] keine Fachbegriffe im Eingang, deutsch und englisch', () => {
  assert.deepEqual(befundeFachbegriffe(HTML), []);
});
test('[Eingang · 1 · Rot-Beweis] ein Fachbegriff an einer Kachel wird gefunden', () => {
  const kopie = HTML.replace('Für Integratoren: Bausteine, Formate und Prüfwerkzeuge.', 'Für Integratoren: FHIR, JSON und Prüfwerkzeuge.');
  assert.notEqual(kopie, HTML);
  assert.ok(befundeFachbegriffe(kopie).length);
});

test('[Eingang · 2] kein Kacheltext verspricht eine Direktübertragung', () => {
  assert.deepEqual(befundeDirekt(HTML), []);
});
test('[Eingang · 2 · Rot-Beweis] „direkt in ihr Depot“ (der Entwurfstext vor der Übergabe-Entscheidung) wird gefunden', () => {
  const kopie = HTML.replace('Sie geben Unterlagen als Datei in offenen Formaten heraus. Die Person legt sie in ihrem Depot ab.', 'Personen erhalten Ihre Unterlagen direkt in ihr Depot.');
  assert.notEqual(kopie, HTML);
  assert.deepEqual(befundeDirekt(kopie), ['ein-bereitstellen']);
});

test('[Eingang · 3] der Herkunftssatz steht wörtlich, deutsch und englisch', () => {
  const t = texte(eingangVon(HTML));
  assert.ok(t.de.includes(SATZ_DE), 'DE fehlt');
  assert.ok(t.en.includes(SATZ_EN), 'EN fehlt');
});
test('[Eingang · 3 · Rot-Beweis] eine abgeschwächte oder verstärkte Fassung zählt nicht', () => {
  const kopie = HTML.replace(SATZ_DE, 'Vivodepot bestätigt offiziell, dass die Vorlage echt und richtig ist.');
  assert.ok(!texte(eingangVon(kopie)).de.includes(SATZ_DE));
});

test('[Eingang · 4] höchstens eine der sechs Kacheln spricht von Gesundheit oder Pflege (Hängestelle 1, B5)', () => {
  assert.ok(gesundheitsKacheln(HTML).length <= 1, gesundheitsKacheln(HTML).join(', '));
});
test('[Eingang · 4 · Rot-Beweis] zwei Gesundheitskacheln fallen auf', () => {
  const kopie = HTML.replace('Logo, Farben und Anordnung: Vivodepot im Gesicht Ihrer Einrichtung.', 'Für Ihre Praxis: Anamnese und Pflegeplan.')
    .replace('Für Integratoren: Bausteine, Formate und Prüfwerkzeuge.', 'Für Kliniken: Aufnahme ins Krankenhaus.');
  assert.ok(gesundheitsKacheln(kopie).length >= 2);
});

test('[Eingang · 5] Überschrift V2, die Frage, sechs gleich gebaute Kacheln, die erste dunkel', () => {
  const e = eingangVon(HTML);
  assert.match(e, /<h1 class="eingang-titel"[^>]*>Richten Sie Vivodepot für Ihre Einrichtung ein<\/h1>/);
  assert.match(e, /<h2 class="eingang-frage"[^>]*>Was möchten Sie anbieten\?<\/h2>/);
  const k = kacheln(e);
  assert.equal(k.length, 6);
  assert.deepEqual(k.map((x) => x.klasse), ['kachel eingang-kachel erste', 'kachel eingang-kachel', 'kachel eingang-kachel eingang-hinweis', 'kachel eingang-kachel', 'kachel eingang-kachel', 'kachel eingang-kachel']);
  for (const x of k) {
    const roh = e.slice(e.indexOf('id="' + x.id + '"'));
    assert.match(roh, /^[^]*?<span class="ek-titel" data-en="[^"]+">[^<]+<\/span>\s*<span class="ek-text" data-en="[^"]+">[^<]+<\/span>(\s*<span class="ek-hinweis"[^>]*>[^<]+<\/span>)?<\/button>/, x.id + ': Titel und Text');
  }
  assert.ok(!/<p class="lead"/.test(e), 'kein Fließtext im Eingang');
});

test('[Eingang · 6] der Eingang ist der Start; die Fachebene liegt einen Klick dahinter, zurück ebenso', () => {
  assert.match(HTML, /<main id="raum-start" class="raum" hidden>/, 'die Fachebene ist beim Laden verborgen');
  assert.match(HTML, /if \(id === 'willkommen'\) \{ dlgZu\('dlg-fertig'\); raumZeigen\('eingang'\); \}/);
  for (const [id, ziel] of [['kopf-fachebene', 'fachebene'], ['ein-anderes', 'fachebene'], ['fachebene-zurueck', 'willkommen']]) {
    assert.ok(HTML.includes("an('" + id + "', 'click', () => zeigeSchritt('" + ziel + "'));"), id + ' → ' + ziel);
  }
  assert.match(HTML, /if \(e\) e\.hidden = \(welcher !== 'eingang'\);/);
});
test('[Eingang · 6] „Dokumente empfangen“ ist ein wahrer Hinweis ohne Studio-Ziel (erwartet bis „Unterlagen in der Antwort“): kein Modul, kein Raum; ⓘ statt Pfeil, aria-expanded', () => {
  const i = HTML.indexOf("an('ein-empfangen', 'click'");
  const z = HTML.slice(i, HTML.indexOf('});', i) + 3);
  assert.doesNotMatch(z, /modulOeffnen|zeigeSchritt/, 'keine Studio-Funktion trägt „Unterlagen empfangen“ (Anfrage = nur Angaben, Datei-Kanal = Gegenrichtung)');
  assert.match(z, /aria-expanded/);
  const e = eingangVon(HTML);
  assert.match(e, /id="ein-empfangen" aria-expanded="false" aria-controls="ein-empfangen-hinweis"><span class="ek-glyph" aria-hidden="true"><\/span><span class="ek-pfeil ek-info" aria-hidden="true">i<\/span>/);
  assert.match(e, /id="ein-empfangen-hinweis" hidden data-en="[^"]+">Dafür richten Sie nichts ein: /);
});
test('[Eingang · 6 · Rot-Beweis] ein Studio-Ziel an „Dokumente empfangen“ fiele auf', () => {
  const kopie = HTML.replace("an('ein-empfangen', 'click', () => {", "an('ein-empfangen', 'click', () => { modulOeffnen('fm');");
  const i = kopie.indexOf("an('ein-empfangen', 'click'");
  assert.match(kopie.slice(i, kopie.indexOf('});', i) + 3), /modulOeffnen/);
});
test('[Eingang · 6 · Rot-Beweis] ohne Bindung von „Etwas anderes“ fiele die Prüfung', () => {
  const kopie = HTML.replace("an('ein-anderes', 'click', () => zeigeSchritt('fachebene'));", '');
  assert.ok(!kopie.includes("an('ein-anderes', 'click', () => zeigeSchritt('fachebene'));"));
});

test('[Eingang · Glas] die Kacheln sind Glasflächen (Region STUDIO-ERSCHEINUNG), hinter ihnen liegen die drei Farbflächen', () => {
  const e = eingangVon(HTML);
  assert.equal((e.match(/<span class="ef ef-\d"><\/span>/g) || []).length, 3);
  const region = HTML.slice(HTML.indexOf('/* STUDIO-ERSCHEINUNG:BEGIN'), HTML.indexOf('/* STUDIO-ERSCHEINUNG:END */'));
  assert.match(region, /\n\.kachel, [^{]*\{ background: rgba\(255,255,255,\.62\); -webkit-backdrop-filter: blur\(10px\); backdrop-filter: blur\(10px\); \}/);
});

/* ── (7) Schmale Bildschirme: die Kacheln bleiben kompakt (10.10.2026) ─────────────────────────────────────────────────
   Der Fall: ein Commit nahm die Regeln für schmale Bildschirme (bis 760 px) heraus, weil die kompakte Grundregel sie ersetzen
   sollte; die Grundregel kam erst mit einem späteren Commit. Dazwischen waren die Kacheln auf dem Telefon wieder 196 px hoch,
   der Titel stand 44 px tiefer. Keine Probe sah das.
   Die Probe rechnet darum nicht mit einer bestimmten Regel, sondern mit dem, was bei einer Breite gilt: Grundregeln und die
   passenden @media-Regeln in Quellreihenfolge, die letzte Angabe gewinnt. Wer eine Regel entfernt, bevor ihr Ersatz da ist,
   macht sie rot, gleich auf welchem der beiden Wege die Angabe vorher kam. */
function stilRegeln(html) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const raus = [];
  const lies = (text, medium) => {
    let i = 0;
    while (i < text.length) {
      const auf = text.indexOf('{', i);
      if (auf < 0) break;
      let tiefe = 1, k = auf + 1;
      while (k < text.length && tiefe) { if (text[k] === '{') tiefe++; else if (text[k] === '}') tiefe--; k++; }
      const kopf = text.slice(i, auf).trim(), rumpf = text.slice(auf + 1, k - 1);
      if (kopf.startsWith('@media')) lies(rumpf, medium === null ? kopf.slice(6).trim() : false);
      else if (!kopf.startsWith('@')) raus.push({ medium, selektoren: kopf.split(',').map((s) => s.replace(/\s+/g, ' ').trim()), rumpf });
      i = k;
    }
  };
  lies(css, null);
  return raus;
}
// Gilt die Regel bei dieser Breite? Gerechnet wird nur mit reinen Breiten-Bedingungen; alles andere (Druck, Kontrast) gilt hier nicht.
function mediumGilt(medium, breite) {
  if (medium === null) return true;
  if (medium === false) return false;
  const m = /^\((max|min)-width:\s*(\d+)px\)$/.exec(medium);
  if (!m) return false;
  return m[1] === 'max' ? breite <= Number(m[2]) : breite >= Number(m[2]);
}
function angabe(html, selektor, eigenschaft, breite) {
  let wert = null;
  for (const r of stilRegeln(html)) {
    if (!mediumGilt(r.medium, breite) || !r.selektoren.includes(selektor)) continue;
    for (const d of r.rumpf.split(';')) {
      const p = d.indexOf(':');
      if (p > 0 && d.slice(0, p).trim() === eigenschaft) wert = d.slice(p + 1).trim();
    }
  }
  return wert;
}
const px = (w) => (w === null ? NaN : parseFloat(w));
// padding und margin in Kurzschreibweise: oben, rechts, unten, links
function seiten(w) {
  const t = String(w || '').split(/\s+/).map(parseFloat);
  return { oben: t[0], rechts: t[1] ?? t[0], unten: t[2] ?? t[0], links: t[3] ?? t[1] ?? t[0] };
}
function kachelSchmalBefunde(html, breite) {
  const raus = [];
  const hoehe = angabe(html, '.eingang-kachel', 'min-height', breite);
  if (px(hoehe) !== 0) raus.push('.eingang-kachel min-height ist ' + hoehe + ', nicht 0');
  const titel = seiten(angabe(html, '.eingang-kachel .ek-titel', 'margin', breite));
  if (titel.oben !== 0) raus.push('.ek-titel hat oben ' + titel.oben + ' px Abstand, nicht 0');
  const innen = seiten(angabe(html, '.eingang-kachel', 'padding', breite));
  const zeichen = px(angabe(html, '.eingang-kachel .ek-glyph', 'left', breite)) + px(angabe(html, '.eingang-kachel .ek-glyph', 'width', breite));
  if (!(innen.links >= zeichen)) raus.push('das Zeichen (bis ' + zeichen + ' px) steht nicht neben dem Titel (Text beginnt bei ' + innen.links + ' px)');
  return raus;
}
const KACHEL_VOR_KOMPAKT = HTML
  .replace(/(\.eingang-kachel \{[^}]*?)padding: [^;]+; min-height: 0;/, '$1padding: 28px 28px 26px; min-height: 196px;')
  .replace(/(\.eingang-kachel \.ek-titel \{[^}]*?)margin: [^;]+;/, '$1margin: 44px 0 8px;');

test('[Eingang · 7] bis 760 px bleiben die Kacheln kompakt: keine Mindesthöhe, Titel oben, Zeichen neben dem Titel', () => {
  for (const breite of [375, 760]) assert.deepEqual(kachelSchmalBefunde(HTML, breite), [], 'bei ' + breite + ' px');
});
test('[Eingang · 7 · Rot-Beweis] die hohe Grundregel ohne Regel für schmale Bildschirme fällt auf, dreifach', () => {
  assert.notEqual(KACHEL_VOR_KOMPAKT, HTML, 'Vorbedingung: die Grundregel wurde in der Kopie zurückgestellt');
  assert.equal(kachelSchmalBefunde(KACHEL_VOR_KOMPAKT, 375).length, 3, kachelSchmalBefunde(KACHEL_VOR_KOMPAKT, 375).join(' · '));
});
test('[Eingang · 7 · Gegenprobe] dieselbe hohe Grundregel mit Regeln für schmale Bildschirme ist grün; bei 1280 px gelten sie nicht', () => {
  // hinter die Grundregel, also vor das letzte </style>: in Quellreihenfolge gewinnt die spätere Angabe
  const ende = KACHEL_VOR_KOMPAKT.lastIndexOf('</style>');
  const mitSchmal = KACHEL_VOR_KOMPAKT.slice(0, ende) + '@media (max-width: 760px) {\n  .eingang-kachel { min-height: 0; padding: 20px 56px 20px 64px; }\n'
    + '  .eingang-kachel .ek-titel { margin: 0 0 4px; font-size: 18px; }\n}\n' + KACHEL_VOR_KOMPAKT.slice(ende);
  assert.deepEqual(kachelSchmalBefunde(mitSchmal, 375), []);
  assert.equal(angabe(mitSchmal, '.eingang-kachel', 'min-height', 1280), '196px');
});
