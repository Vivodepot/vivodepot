'use strict';
/* Befund FORMATMODUL-ZEILEN-STILL-VERWORFEN (HOCH, 06.10.2026).

   `baueFormatModul` warf halb ausgefüllte Zeilen still weg: eine Zuordnung mit Feld, aber ohne Ziel, einen
   Erkennungs-Eintrag mit Wert, aber ohne Pfad. Die Prüfung (`pruefeFormat`) sah nur das schon gefilterte Modul
   und meldete nichts, solange eine Zeile gültig blieb. Das Modul wird signiert und gelangt über den geprüften
   Weg ins Depot; dort fehlt dem Export- bzw. Import-Kanal die Zuordnung. Dasselbe in `baueAnfrage`: ein gewähltes
   Feld ohne Zweck fiel aus der signierten Anfrage.

   Jetzt: eine halb ausgefüllte Zeile ist ein Blocker mit Namen, vor der Signatur. Eine ganz leere Zeile fällt
   weiter still weg, sie trägt keine Angabe.

   Rot-Beweis: gegen das Studio ohne diesen Fix (d8337ffe3) fallen die vier Verhaltensproben zu Format-Modul und
   Anfrage, jede an ihrer Behauptung; die Probe zu leeren Zeilen und die beiden Inventur-Proben bleiben dort grün.

   Die Klassenprobe unten führt JEDE `.filter`-Stelle des Studios mit ihrer Art: `leer` (verwirft nur leere
   Einträge), `gemeldet` (verwirft Inhalt, die genannte Prüfstelle meldet es, eine Probe hält es),
   `kein-ausgabeweg` (Suche, Anzeige, Prüfung — nichts davon geht in eine Datei). Eine neue Stelle fällt auf. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const REPO = path.join(__dirname, '..');
const { V: G } = ladeGenerator();
const j = (x) => JSON.parse(JSON.stringify(x));

const formatState = (zusatz) => ({ format: Object.assign({
  format: 'probe-format', moduleVersion: 1, richtung: 'export', sektor: 'identity', label: 'Probe', sprache: 'de',
  erkennen: [], zuordnung: [{ feld: 'givenName', ziel: 'vn', alsListe: false }],
}, zusatz) });

test('[Format-Modul] eine Zuordnung mit Feld, aber ohne Ziel, ist ein Blocker mit dem Feldnamen', () => {
  const r = j(G.pruefeFormat(formatState({ zuordnung: [
    { feld: 'givenName', ziel: 'vn', alsListe: false },
    { feld: 'birthDate', ziel: '  ', alsListe: false }] })));
  assert.ok(r.blocker.some((b) => b.includes('birthDate')), JSON.stringify(r.blocker));
});

test('[Format-Modul] ein Ziel ohne Feld ist ein Blocker', () => {
  const r = j(G.pruefeFormat(formatState({ zuordnung: [
    { feld: 'givenName', ziel: 'vn' }, { feld: '', ziel: 'geb.datum' }] })));
  assert.ok(r.blocker.some((b) => b.includes('geb.datum')), JSON.stringify(r.blocker));
});

test('[Format-Modul] ein Erkennungs-Eintrag mit Wert, aber ohne Pfad, ist ein Blocker', () => {
  const r = j(G.pruefeFormat(formatState({ erkennen: [
    { pfad: 'resourceType', vergleich: 'gleich', gleichWert: 'Bundle' }, { pfad: '', vergleich: 'gleich', gleichWert: 'Patient' }] })));
  assert.ok(r.blocker.some((b) => b.includes('Patient')), JSON.stringify(r.blocker));
});

test('[Format-Modul] ganz leere Zeilen bleiben ohne Meldung', () => {
  const ohne = j(G.pruefeFormat(formatState({}))).blocker;
  const mit = j(G.pruefeFormat(formatState({
    erkennen: [{ pfad: '', vergleich: 'vorhanden', gleichWert: '' }],
    zuordnung: [{ feld: 'givenName', ziel: 'vn' }, { feld: '', ziel: '', alsListe: false }] }))).blocker;
  assert.deepEqual(ohne, [], 'die Grundform ist gültig');
  assert.deepEqual(mit, ohne);
});

test('[Anfrage] ein gewähltes Feld ohne Zweck ist ein Blocker mit der Kennung', () => {
  const r = j(G.pruefeAnfrage({ anfrage: { zweck: 'Probe', felder: [
    { kennung: 'identity.name', zweck: 'Vertrag', pflicht: true }, { kennung: 'identity.birthDate', zweck: '', pflicht: true }] } }));
  assert.ok(r.blocker.some((b) => b.includes('identity.birthDate')), JSON.stringify(r.blocker));
});

/* ── Klassenprobe über das ganze Studio ────────────────────────────────────────────────────── */
const STUDIO = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');
const L = 'leer', M = 'gemeldet', K = 'kein-ausgabeweg';
/* Schlüssel: „<funktion> | <prädikat>". Bei `gemeldet` nennt `stelle` die Funktion, die den Verlust meldet. */
const FILTER = {
  '_rechtsraumModulUebersetzenMirror | (z) => typeof z === \'string\'': [L, 'Zweck-Liste: nur Einträge, die keine Zeichenkette sind — das Schema kennt keine anderen'],
  '_rechtsraumModulUebersetzen | z => typeof z === \'string\'': [L, 'dasselbe, Kern-Spiegel'],
  'csvParseZeilen | (z) => z.some((x) => String(x).trim() !== \'\')': [L, 'ganz leere CSV-Zeilen'],
  'feldAbzustreifen | (k) => !Object.prototype.hasOwnProperty.call(FELD_NICHT_DURCHGEREICHT, k)': [K, 'baut eine Schlüsselliste, verwirft keine Angabe'],
  'parseCodeWerte | Boolean': [L, 'ganz leere Teile der Zelle'],
  '_codeAusText | Boolean': [L, 'leere Wortteile beim Ableiten eines Codes'],
  '_codeWerteNormalisieren | _codeWertHatInhalt': [L, 'ganz leere Options-Zeilen; fehlt nur der Code, wird er abgeleitet'],
  '_codeWerteNormalisieren | Boolean': [L, 'leere Codes beim Sammeln der vergebenen'],
  '_normalisiereFeldRein | Boolean': [L, 'leere Marken nach trim'],
  '_normalisiereFeldRein | (u) => u.feldname': [M, 'Unterfeld ohne Namen', { stelle: 'normalisiereFeldBefund' }],
  'anfrageFelderSuchen | (f) => _anfrageSuchForm(f.label).indexOf(q) >= 0': [K, 'Suche in der Palette'],
  'baueAnfrage | (f) => f && f.kennung && f.zweck': [M, 'gewähltes Feld ohne Zweck', { stelle: 'pruefeAnfrage' }],
  'baueRechtsraumModul | Boolean': [L, 'leere Teile der Zweck-Eingabe'],
  'baueFormatModul | (e) => e && e.pfad && e.pfad.trim()': [M, 'Erkennungs-Eintrag ohne Pfad', { stelle: 'pruefeFormat' }],
  'baueFormatModul | (z) => z && z.feld && z.feld.trim() && z.ziel && z.ziel.trim()': [M, 'Zuordnung ohne Feld oder Ziel', { stelle: 'pruefeFormat' }],
  '_kanonisch | (k) => x[k] !== undefined': [K, 'kanonische Form zum Vergleichen; undefined wird in JSON ohnehin nicht geschrieben'],
  'feldUebernehmen | _codeWertHatInhalt': [K, 'zählt Optionen für die Editor-Prüfung'],
  'fehlstellenAuskunft | (k) => k !== \'_typRoh\' && !KERN_TORWAECHTER.FELD_SCHLUESSEL.has(k)': [K, 'die Auskunft selbst: sammelt, was der Kern verwirft'],
  '_kennungNameSlug | Boolean': [L, 'leere Wortteile einer Kennung'],
  'wegAktualisieren | (b) => /^Feld \\d|^Es ist noch kein Feld/.test(b) && !/^Es ist noch kein Feld/.test(b)': [K, 'Anzeige der Blocker'],
  'renderefPruefung | (b) => !/^Es wurde noch kein Schlüsselpaar erzeugt\\./.test(b)': [K, 'Anzeige der Blocker in „Fertig“: der fehlende Schlüssel entsteht in derselben Ansicht; das Tor zählt ihn weiter'],
  'anfrageAssistentTrefferZeigen | (t) => !drin.has(t.kennung)': [K, 'Suche im Assistenten Anfrage: blendet schon gewählte Angaben aus der Trefferliste aus'],
  'paletteEintraege | (e) => e.kennung.indexOf(\'/\') < 0 && e.kennung.indexOf(\'[\') < 0': [K, 'Palette'],
  'paletteRendern | (e) => !q || e.label.toLowerCase().indexOf(q) >= 0': [K, 'Suche in der Palette'],
  'paletteRendern | (b) => gruppen[b]': [K, 'Palette'],
  'paletteRendern | (b) => reihenfolge.indexOf(b) < 0': [K, 'Palette'],
  'rendereFelder | Boolean': [K, 'Vorschlagsliste der Gruppen'],
  '_brandingStapelTeile | (t) => t && !/^var\\(/i.test(t)': [K, 'zerlegt den Schriftstapel des Erscheinungsbilds, um eine Schriftart zu beurteilen (Einlass-Bereich aus dem Kern)'],
};

function filterStellen(quelle) {
  const raus = [];
  const re = /\.filter\(/g;
  let m;
  while ((m = re.exec(quelle))) {
    let tiefe = 1, k = m.index + m[0].length;
    while (k < quelle.length && tiefe) { if (quelle[k] === '(') tiefe++; else if (quelle[k] === ')') tiefe--; k++; }
    const praedikat = quelle.slice(m.index + m[0].length, k - 1).replace(/\s+/g, ' ').trim();
    const vor = quelle.slice(0, m.index);
    const fn = [...vor.matchAll(/\n(?:async )?function (\w+)\(/g)].pop();
    raus.push({ fn: fn ? fn[1] : '?', praedikat, zeile: vor.split('\n').length });
  }
  return raus;
}
// Lange Prädikate werden am Listenschlüssel gekürzt: der Schlüssel muss ein Anfang des Prädikats sein.
function schluesselFuer(s) {
  return Object.keys(FILTER).find((k) => { const [fn, p] = k.split(' | '); return fn === s.fn && s.praedikat.startsWith(p); });
}

test('[Klassenprobe] jede .filter-Stelle im Studio steht mit ihrer Art in der Liste', () => {
  const stellen = filterStellen(STUDIO);
  const fehlend = stellen.filter((s) => !schluesselFuer(s));
  assert.deepEqual(fehlend.map((s) => 'Z. ' + s.zeile + ' ' + s.fn + ' | ' + s.praedikat), [],
    'neue .filter-Stelle: verwirft sie Inhalt, braucht sie eine Meldung in der Prüfstelle und eine Probe; dann hier eintragen');
  const benutzt = new Set(stellen.map(schluesselFuer));
  assert.deepEqual(Object.keys(FILTER).filter((k) => !benutzt.has(k)), [], 'Eintrag ohne Stelle im Code — Liste nachziehen');
});

test('[Klassenprobe] jede verwerfende Stelle nennt eine Prüfstelle, die es gibt', () => {
  for (const [k, [art, , zusatz]] of Object.entries(FILTER)) {
    assert.ok([L, M, K].includes(art), k);
    if (art !== M) continue;
    assert.ok(zusatz && zusatz.stelle && new RegExp('\\nfunction ' + zusatz.stelle + '\\(').test(STUDIO), k + ': Prüfstelle fehlt');
  }
});

/* Art K für die Stellen des Einlass-Bereichs (EINLASS-REGELN, aus dem Kern erzeugt), etwa _brandingStapelTeile: ihr Ergebnis fließt in
   kein Modul und keine Datei. Das Studio liest die Urteile des Bereichs an genau einer Stelle, einlassUrteil, und nimmt davon
   gueltig, grund und verworfene für die Anzeige der Vorprüfung — vom geprüften Inhalt nie mehr als für die Anzeige nötig.
   Branding v2 (U2-ADR-473 W2, 21.10.2026): einlassUrteil liest zusätzlich r.branding.name und r.branding.domain und gibt sie als
   `marke` zurück, damit die Vorprüfung Name und Marke des Partners zeigt. Geprüft, nicht nur die Erwartung erweitert: `marke` liest
   allein einlassUrteilZeigen als Text (u.marke), und das Urteil (`einlass`) nutzen die Aufrufer nur über .urteil und
   einlassUrteilZeigen — die Datei bauen sie aus dem State (baue…Signiert), nie aus dem Urteil. Beides hält die Probe fest; ein
   weiteres Feld des geprüften Inhalts (etwa r.branding.logo) oder ein anderer Weg des Urteils fällt auf. */
function einlassLeser(quelle) {
  const stellen = [...quelle.matchAll(/STUDIO_EINLASS_PRUEFEN/g)].length;
  const a = quelle.indexOf('function einlassUrteil(');
  const e = quelle.indexOf('\nfunction ', a + 1);
  const koerper = a >= 0 ? quelle.slice(a, e) : '';
  const gelesen = [];
  for (const m of koerper.matchAll(/\br\.([A-Za-z_$][\w$]*)(?:\.([A-Za-z_$][\w$]*))?/g)) { gelesen.push(m[1]); if (m[2]) gelesen.push(m[1] + '.' + m[2]); }
  // Wohin `marke` geht: jede Lesestelle mit ihrer Funktion.
  const marke = [];
  for (const m of quelle.matchAll(/\b(\w+)\.marke\b/g)) {
    const fn = [...quelle.slice(0, m.index).matchAll(/\n(?:async )?function (\w+)\(/g)].pop();
    marke.push((fn ? fn[1] : '?') + ':' + m[1]);
  }
  // Wie die Aufrufer das Urteil nutzen: außer der Zuweisung nur .urteil und einlassUrteilZeigen(…, einlass).
  const nutzung = [...quelle.matchAll(/(?<![\w'])einlass(?![\w'])(\.\w+)?/g)]
    .map((m) => { const vor = quelle.slice(Math.max(0, m.index - 40), m.index); return /const $/.test(vor) ? 'const' : /einlassUrteilZeigen\(\w+, $/.test(vor) ? 'zeigen' : (m[1] || '(roh)'); });
  return { stellen, gelesen: [...new Set(gelesen)].sort(), marke: [...new Set(marke)].sort(), nutzung: [...new Set(nutzung)].sort() };
}
test('[Klassenprobe·Art K] die Urteile des Einlass-Bereichs fließen nur als Anzeige ins Studio, nie in ein Modul oder eine Datei', () => {
  const l = einlassLeser(STUDIO);
  assert.equal(l.stellen, 3, 'genau: Definition, typeof-Prüfung und Aufruf in einlassUrteil');
  assert.deepEqual(l.gelesen, ['branding', 'branding.domain', 'branding.name', 'grund', 'gueltig', 'verworfene']);
  assert.deepEqual(l.marke, ['einlassUrteil:aus', 'einlassUrteilZeigen:u'], 'marke entsteht in einlassUrteil und wird nur angezeigt');
  assert.deepEqual(l.nutzung, ['.urteil', 'const', 'zeigen'], 'das Urteil geht nur in die Anzeige');
});
test('[Klassenprobe·Art K·Rot-Beweis] liest einlassUrteil mehr vom geprüften Inhalt oder geht das Urteil in eine Datei, fällt die Probe', () => {
  const mehr = STUDIO.replace('aus.marke = { name: r.branding.name,', 'aus.marke = { logo: r.branding.logo, name: r.branding.name,');
  assert.notEqual(mehr, STUDIO, 'Vorbedingung: die Stelle steht im Studio');
  assert.ok(einlassLeser(mehr).gelesen.includes('branding.logo'));
  const datei = STUDIO.replace('(k) => baueBrandingSigniert(state, k)', '(k) => baueBrandingSigniert(Object.assign({}, state, einlass.marke), k)');
  assert.notEqual(datei, STUDIO, 'Vorbedingung: der Signierweg steht im Studio');
  assert.ok(einlassLeser(datei).nutzung.includes('.marke'));
  const alt = STUDIO.replace('if (!r.gueltig) zeilen.push(', 'if (r.typen) zeilen.push(r.typen); if (!r.gueltig) zeilen.push(');
  assert.notEqual(alt, STUDIO, 'Vorbedingung: die Stelle steht im Studio');
  assert.ok(einlassLeser(alt).gelesen.includes('typen'));
});
