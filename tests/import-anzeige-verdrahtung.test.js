'use strict';
/* Das Anzeige-Modell ist an die Oberfläche angeschlossen, und der Leser der Vorlage kennt ihre Formatfassung (v929, 12.10.2026).
   Die Klassenprobe hält das Modell; diese Datei hält, was sie ausdrücklich nicht prüft:
     · dass die drei verdrahteten Stellen (Modul-Einlass, Vorlage nach dem Übernehmen, Anfrage-Empfang) den Satz wirklich bilden,
     · dass eine Anfrage aus einer neueren Fassung ihren eigenen Grund behält,
     · die Leseregel der Vorlage: Formatfassung und Typfeld, in dieser Reihenfolge, ohne das geprüfte Objekt zu verändern,
     · dass eine eingebackene Vorlage, die nicht eingelassen wird, gemerkt wird.
   Befunde: IMPORT-VERWIRFT-OHNE-ANZEIGE, VORLAGE-FASSUNGSUNABHAENGIG-UNGEPRUEFT. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const funktion = (name, quelle = KERN) => {
  const i = quelle.search(new RegExp('\\n(?:async )?function ' + name + '\\('));
  assert.ok(i >= 0, 'Vorbedingung: ' + name + ' steht im Kern');
  const ende = quelle.indexOf('\n}\n', i);
  return quelle.slice(i, ende);
};
const STELLEN = [
  ['_moduleEinlassWirken', "importAnzeigeModell('modul', r)"],
  ['flowImportVorschau', "importAnzeigeModell('vorlage', ergebnis)"],
  ['flowAnfrageEmpfangen', "importAnzeigeModell('anfrage', anfragePruefen(umschlag.anfrage))"],
  ['flowAnfrageEmpfangen', "importAnzeigeModell('anfrage', _abl)"],
];
const stellenOhneAnzeige = (quelle) => STELLEN.filter(([fn, aufruf]) => {
  const koerper = funktion(fn, quelle);
  return !(koerper.includes('importAnzeigeText(' + aufruf + ')') && /importAnzeigeZeigen\(/.test(koerper));
}).map(([fn, aufruf]) => fn + ' · ' + aufruf);

test('[Import-Anzeige·Verdrahtung] Modul-Einlass, Vorlage nach dem Übernehmen und Anfrage-Empfang bilden den Satz aus dem Modell und zeigen ihn', () => {
  assert.deepEqual(stellenOhneAnzeige(KERN), []);
});
test('[Import-Anzeige·Verdrahtung·Rot-Beweis] eine Stelle, die das Modell nicht mehr liest, wird benannt', () => {
  const ohne = KERN.replace("importAnzeigeText(importAnzeigeModell('modul', r))", "''");
  assert.deepEqual(stellenOhneAnzeige(ohne), ["_moduleEinlassWirken · importAnzeigeModell('modul', r)"]);
});

/* Was nicht übernommen wurde, bleibt stehen, bis die Person schließt (v929, Lesung der Gegenlesung): eine Liste mit mehreren
   Namen ist in den 3,2 s eines gewöhnlichen Hinweises nicht zu lesen, und was zurückblieb, wäre für die Person verloren. */
const zeigenBleibt = (quelle) => {
  const zeigen = funktion('importAnzeigeZeigen', quelle);
  const i = quelle.indexOf('  toast(text, art, aktion) {');
  const toast = quelle.slice(i, quelle.indexOf('\n  },', i));
  return /bleibt: true/.test(zeigen) && /STRINGS\.btnSchliessen/.test(zeigen) && /aktion && aktion\.bleibt\) \? null/.test(toast);
};
test('[Import-Anzeige·bleibt] die Meldung, was nicht übernommen wurde, bleibt mit Knopf „Schließen“ stehen, ohne Zeitablauf', () => {
  assert.ok(zeigenBleibt(KERN));
});
test('[Import-Anzeige·bleibt·Rot-Beweis] ein Toast, der trotz „bleibt“ nach Zeit verschwindet, fällt auf', () => {
  assert.equal(zeigenBleibt(KERN.replace('(aktion && aktion.bleibt) ? null : ', '')), false);
});
test('[Import-Anzeige·bleibt] im Kern: importAnzeigeZeigen ruft den Hinweis mit Knopf und „bleibt“, ein leerer Text zeigt nichts', () => {
  const { V } = ladeKern();
  assert.equal(typeof V.importAnzeigeZeigen, 'function', 'Vorbedingung: importAnzeigeZeigen steht im Kern');
  const echt = V.ui.toast;
  const gesehen = [];
  V.ui.toast = (text, art, aktion) => { gesehen.push({ text, art, aktion }); };
  try {
    V.importAnzeigeZeigen('');
    V.importAnzeigeZeigen('Nicht übernommen: A, B, C.');
  } finally { V.ui.toast = echt; }
  assert.equal(gesehen.length, 1, 'nur der nicht leere Text wird gezeigt');
  assert.equal(gesehen[0].art, 'warn');
  assert.equal(gesehen[0].aktion && gesehen[0].aktion.bleibt, true);
  assert.ok(String(gesehen[0].aktion.label || '').length > 0, 'der Knopf hat eine Beschriftung');
});

test('[Import-Anzeige·Anfrage] eine Anfrage aus einer neueren Fassung behält ihren Grund und bekommt ihren eigenen Satz; kein JSON ist keine Anfrage', () => {
  const { V } = ladeKern();
  const anfrage = { modulTyp: 'anfrage', anfrageVersion: V.ANFRAGE_FORMAT_VERSION + 1, von: 'Erfundene Stelle', zweck: 'Probe', grundlage: 'Probe',
    vorgang: 'P-1', gueltigBis: '2099-01-01', felder: [{ kennung: 'identity.givenName', zweck: 'Probe' }], antwort: { art: 'einmalpasswort' } };
  assert.equal(V.anfrageAusText(JSON.stringify(anfrage)), null, 'Vorbedingung: der Leser gibt bei jeder Ablehnung null');
  const g = V.anfrageAblehnungsGrund(JSON.stringify(anfrage));
  assert.equal(g && g.grund, 'anfrage-zu-neu');
  const zuNeu = V.importAnzeigeText(V.importAnzeigeModell('anfrage', g));
  const gewoehnlich = V.importAnzeigeText(V.importAnzeigeModell('anfrage', { gueltig: false, grund: 'von', verworfene: [] }));
  assert.ok(zuNeu && gewoehnlich && zuNeu !== gewoehnlich, '„zu neu“ liest sich anders als eine gewöhnliche Abweisung');
  assert.equal(V.anfrageAblehnungsGrund('das ist kein JSON'), null);
  assert.equal(V.anfrageAblehnungsGrund(JSON.stringify(Object.assign({}, anfrage, { anfrageVersion: V.ANFRAGE_FORMAT_VERSION }))), null, 'eine gültige Anfrage hat keinen Ablehnungsgrund');
});

const FELD = { feldname: 'Mitgliedsnummer', feldtyp: 'text' };
test('[Vorlage·Formatfassung] ohne Feld und mit der bekannten Fassung wird gelesen; darüber heißt es „zu neu“, auch wenn die Felder unter anderem Namen stehen', () => {
  const { V } = ladeKern();
  const N = V.VORLAGE_FORMAT_FASSUNG_BEKANNT;
  assert.equal(V.validateTemplate({ felder: [FELD] }), null, 'eine Vorlage ohne formatFassung gilt als Fassung 1');
  assert.equal(V.validateTemplate({ formatFassung: N, felder: [FELD] }), null);
  assert.equal(V.validateTemplate({ formatFassung: N + 1, nutzlastTyp: V.VORLAGE_NUTZLAST_TYP, felder: [FELD] }), 'vorlage-zu-neu');
  assert.equal(V.validateTemplate({ formatFassung: N + 1, nutzlastTyp: V.VORLAGE_NUTZLAST_TYP, felderNeu: [FELD] }), 'vorlage-zu-neu',
    'eine brechende Fassung ohne `felder` wird als zu neu benannt, nicht als „felder fehlt“');
  for (const falsch of ['2', 0, 1.5, null, -1]) {
    assert.match(String(V.validateTemplate({ formatFassung: falsch, felder: [FELD] })), /^formatfassung-ungueltig$/, 'keine ganze Zahl ab 1: ' + JSON.stringify(falsch));
  }
});
test('[Vorlage·Formatfassung·Regel 4] der Standardwert wird nie in das geprüfte Objekt geschrieben', () => {
  const { V } = ladeKern();
  const tpl = { felder: [Object.assign({}, FELD)] };
  const vorher = JSON.stringify(tpl);
  assert.equal(V.validateTemplate(tpl), null);
  assert.equal(Object.prototype.hasOwnProperty.call(tpl, 'formatFassung'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(tpl, 'nutzlastTyp'), false);
  assert.equal(JSON.stringify(tpl), vorher, 'das Objekt ist nach der Prüfung zeichengleich');
});
test('[Vorlage·Typfeld] der Wert muss genau stimmen, ein Modul ist keine Vorlage, und ab Fassung 2 ist das Typfeld Pflicht', () => {
  const { V } = ladeKern();
  const T = V.VORLAGE_NUTZLAST_TYP;
  assert.equal(V.validateTemplate({ nutzlastTyp: T, felder: [FELD] }), null);
  assert.match(V.validateTemplate({ nutzlastTyp: 'Vivodepot-Vorlage', felder: [FELD] }), /^nutzlasttyp-widerspruch$/, 'andere Schreibweise');
  assert.match(V.validateTemplate({ nutzlastTyp: T, modulTyp: 'textsatz', felder: [FELD] }), /^nutzlasttyp-widerspruch$/, 'Typfeld zusammen mit modulTyp');
  assert.match(V.validateTemplate({ modulTyp: 'textsatz', felder: [FELD] }), /^modul-keine-vorlage$/, 'ein Modul, das als Vorlage eingereicht wird');
});
test('[Vorlage·Formatfassung·Rot-Beweis] ohne die Prüfung ginge eine neuere Fassung still durch', () => {
  const ohne = KERN.replace("if (_fassung > VORLAGE_FORMAT_FASSUNG_BEKANNT) return 'vorlage-zu-neu';", '');
  assert.notEqual(ohne, KERN, 'Vorbedingung: der Anker steht im Kern');
  const os = require('node:os');
  const tmp = path.join(os.tmpdir(), 'vorlage-formatfassung-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, ohne);
  try {
    const { V } = ladeKern({ htmlPfad: tmp, backen: true });
    assert.equal(V.validateTemplate({ formatFassung: 99, nutzlastTyp: 'vivodepot-vorlage', felder: [FELD] }), null, 'der Kern ohne die Zeile nimmt Fassung 99 an');
  } finally { fs.rmSync(tmp, { force: true }); }
});

test('[Vor-Depot] eine eingebackene Vorlage, die nicht eingelassen wird, wird mit Grund gemerkt und ergibt einen Satz', async () => {
  const { V } = ladeKern();
  assert.equal(typeof V.vorDepotVorlagenVerworfen, 'function');
  const modell = V.importAnzeigeModell('vor-depot-konfiguration', { ok: true, verworfene: [{ name: 'Erfundene Vorlage', grund: 'vorlage-zu-neu' }] });
  assert.deepEqual(modell.verworfen, [{ was: 'Erfundene Vorlage', grund: 'vorlage-zu-neu' }]);
  assert.ok(V.importAnzeigeText(modell).includes('Erfundene Vorlage'));
  assert.equal(V.importAnzeigeText(V.importAnzeigeModell('vor-depot-konfiguration', { ok: true, verworfene: [] })), '', 'ohne Verworfenes wird nichts gesagt');
});

/* ══ DER OFFENE TEIL DES BEFUNDS ZUR VORLAGE, ALS ERWARTETE RÖTE ════════════════════════════════════════════════════════════
   Mit v929 ist der Leser gebaut; die Proben oben sind dafür grün. Was noch fehlt, steht hier als Probe, die mitläuft und
   grün wird, sobald es gebaut ist. Dann fällt das `todo` und seine Zeile in der Liste der ausgesetzten Proben. Die offenen
   Teile der beiden anderen Befunde stehen je in ihrer eigenen Datei. */
const STUDIO = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

/* Der Schreiber im Studio steht seit v929 (tests/studio-vorlage-formatfassung-typfeld.test.js prüft ihn am Ergebnis);
   hier bleibt die Gegenprobe aus Sicht des Lesers. */
test('[Vorlage·Schreiber] das Studio schreibt Formatfassung und Typfeld in jede neue Vorlage',
  () => {
    /* Der aus dem Kern übertragene Leser steht wörtlich im Studio und nennt beide Felder; er schreibt keine Vorlage. Gesucht
       wird deshalb außerhalb seiner Region. */
    const a = STUDIO.indexOf('/* TORWAECHTER:BEGIN');
    const e = STUDIO.indexOf('/* TORWAECHTER:END */');
    assert.ok(a >= 0 && e > a, 'Vorbedingung: die Region des übertragenen Lesers steht im Studio');
    const ohneLeser = STUDIO.slice(0, a) + STUDIO.slice(e);
    assert.ok(/formatFassung/.test(ohneLeser), 'das Studio schreibt formatFassung');
    assert.ok(/nutzlastTyp/.test(ohneLeser), 'das Studio schreibt das Typfeld der Vorlage');
  });

/* Offen bleibt die Messung über Paare von Fassungen: eine im Studio der Fassung A erstellte Vorlage, gelesen von der App der
   Fassung B, älter und neuer. Grün, sobald die Probe dafür im Repo steht und läuft. */
test('[Vorlage·offen] die Kreuzfassungs-Probe misst Vorlagen über Paare von Fassungen (Studio gegen App, älter und neuer)',
  { todo: 'Befund VORLAGE-FASSUNGSUNABHAENGIG-UNGEPRUEFT (HOCH): die Messung über Paare von Fassungen fehlt' },
  () => {
    assert.ok(fs.existsSync(path.join(__dirname, 'vorlage-kreuzfassung-paare.test.js')), 'die Kreuzfassungs-Probe steht in tests/');
  });

/* Jede ab Werk mitgelieferte Vorlage besteht den neuen Leser: sie sind signiert, wie sie sind, ohne Formatfassung und ohne
   Typfeld, und dürfen daran nicht scheitern. */
const AB_WERK_VORLAGEN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'template-generator', 'basistemplate-inhalte.json'), 'utf8'));
test('[Vorlage·ab Werk] jede mitgelieferte Vorlage besteht den Leser, ohne Formatfassung und ohne Typfeld', () => {
  const { V } = ladeKern();
  assert.ok(Array.isArray(AB_WERK_VORLAGEN) && AB_WERK_VORLAGEN.length >= 1, 'Vorbedingung: es gibt mitgelieferte Vorlagen');
  for (const v of AB_WERK_VORLAGEN) {
    assert.equal(Object.prototype.hasOwnProperty.call(v, 'formatFassung') || Object.prototype.hasOwnProperty.call(v, 'nutzlastTyp'), false, v.id + ': trägt keines der neuen Felder');
    assert.equal(V.validateTemplate(v), null, v.id + ' wird gelesen');
  }
});
test('[Vorlage·ab Werk·Rot-Beweis] ein Leser, der das Typfeld immer verlangt, weist jede mitgelieferte Vorlage ab', () => {
  const anker = '  } else if (_fassung >= 2) {\n    return \'nutzlasttyp-fehlt\';';
  assert.equal(KERN.split(anker).length - 1, 1, 'Vorbedingung: der Anker kommt genau einmal vor');
  const os = require('node:os');
  const tmp = path.join(os.tmpdir(), 'vorlage-typfeld-immer-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, KERN.replace(anker, '  } else if (true) {\n    return \'nutzlasttyp-fehlt\';'));
  try {
    const { V } = ladeKern({ htmlPfad: tmp, backen: true });
    for (const v of AB_WERK_VORLAGEN) assert.equal(V.validateTemplate(v), 'nutzlasttyp-fehlt', v.id);
  } finally { fs.rmSync(tmp, { force: true }); }
});

test('[Vorlage·Formatfassung·Anzeige] eine zu neue Vorlage bekommt ihren eigenen Satz, deutsch und englisch aus dem Textsatz', () => {
  const { V } = ladeKern();
  const satz = V.importAnzeigeText(V.importAnzeigeModell('vorlage', { angenommen: false, grund: V.validateTemplate({ formatFassung: V.VORLAGE_FORMAT_FASSUNG_BEKANNT + 1 }), verworfene: [] }));
  assert.match(satz, /neueren Fassung/);
  assert.equal(satz.includes('vorlage-zu-neu'), false, 'das Kürzel des Grunds steht nie im Satz');
  for (const sprache of ['de', 'en']) {
    const texte = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-' + sprache + '-modul.json'), 'utf8')).texte;
    assert.ok(String(texte['strings:vorlageZuNeu.text'] || '').length > 20, sprache + ': der Satz steht im Textsatz');
  }
  assert.ok(funktion('flowImportVorschau').includes('id="import-vorlage-zu-neu"'), 'die Vorschau zeigt den Satz');
});
