'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund IMPORT-VERWIRFT-OHNE-ANZEIGE (11.10.2026) · Klassenprobe
   Das Anzeige-Modell für Importe: was verworfen, was abgewiesen, was „zu neu“
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND. Die Einleser des Kerns sagen in ihrem Rückgabewert, was sie
   nicht übernommen haben (`verworfene`, `defVerworfen`, `codeListenVerworfen`,
   `vorlageAbgewiesen`, `grund`). Die Oberfläche las davon nur einen Teil: ein
   Modul mit einem verworfenen Eintrag hieß „eingelesen“, eine Vorlage mit
   verworfenen Feldern ebenso, und eine Anfrage aus einer neueren Fassung bekam
   dieselbe Meldung wie etwas, das gar keine Anfrage ist. Die vorhandenen Proben
   prüften den Rückgabewert — keine prüfte, dass er bis zur Anzeige reicht.

   WAS DIESE PROBE HÄLT. Zwischen Einleser und Anzeige steht EINE reine Funktion
   ohne DOM: `importAnzeigeModell(art, ergebnis)` →
   `{ angenommen, verworfen: [{ was, grund }], abgewiesen, zuNeu }`, dazu
   `importAnzeigeText(modell)` und die Liste `IMPORT_ANZEIGE_ARTEN`. Die Probe
   hält an einer Fall-Tabelle fest:
     1. je Zeile ergibt das Modell genau das Erwartete;
     2. jede Importart der Liste hat eine Zeile, und keine Zeile nennt eine Art,
        die es nicht gibt;
     3. je Art gibt es eine Zeile „zu neu“ mit eigenem Grund — oder die Art
        steht mit Begründung in `KEIN_ZU_NEU`;
     4. nichts geht still verloren: so viele verworfene Teile das Ergebnis des
        Einlesers trägt, so viele nennt das Modell, jeden mit Grund;
     5. der Text ist nicht leer, nennt jedes `was`, und „zu neu“ liest sich
        anders als eine gewöhnliche Abweisung;
     6. eine unbekannte Art wirft nicht.

   WARUM ALS KLASSE. Der Befund ist keine einzelne vergessene Meldung, sondern
   eine Naht, die an jeder Importart gleich aussieht. Eine Probe je Fundstelle
   hielte die drei Stellen, an denen er gefunden wurde, und ließe die nächste
   Importart ohne Zeile durch. Darum hängt die Probe an der LISTE der Arten:
   kommt eine achtzehnte dazu, ist sie rot, bis jemand ihr eine Zeile schreibt.

   WIE VIEL KLASSE WIRKLICH GEDECKT IST, steht in drei benannten Mengen, und
   eine Art kann aus keiner still herausfallen:
     · ECHT — `modul`, `vorlage`, `anfrage`: das `ergebnis` der Zeile kommt aus
       dem Einleser des Kerns selbst (`modulEinlassen`, `importAnwenden`,
       `anfragePruefen`), gerufen mit einer erfundenen Eingabe. Nur diese drei
       sind in die Oberfläche verdrahtet. Dazu seit 04.11.2026 `interner-stand` und
       `wiederherstellungs-code`: ihr Weg wirft, aber der Wurf trägt den Grund als
       Kennung (`e.code`, `e.whc`); die Zeile liest sie aus dem Wurf des Kerns.
       Seit 07.11.2026 `depot-datei` und `sub-depot-selbst` (A6): ein Wurf der Migration ergibt
       `migrationFehlerErgebnis()`; die Zeile öffnet die Datei bzw. betritt das Sub über den Kern.
       Seit 07.11.2026 `datei-oeffnen-mit` (A8): `dateiOeffnenMitPruefen` gibt das Ergebnis mit Grund.
     · `OHNE_ERGEBNISOBJEKT` — Wege, die heute gar kein Ergebnis mit Grund
       zurückgeben (Wurf mit Freitext, reine Feldliste, leerer `catch`). Für sie
       gibt es KEINE erfundene Deckung; die Liste nennt Fundstelle und Lücke.
     · `NUR_ALLGEMEINE_FORM` — der Rest.
   Für alle Arten außerhalb von ECHT stehen Zeilen in der allgemeinen Form
   `{ ok|angenommen|gueltig, grund, verworfene: [...] }` in der Tabelle.
   FÜR DIESE ARTEN HÄLT DIE PROBE DAS MODELL, NICHT DIE ANZEIGE.

   WAS DIESE PROBE NICHT PRÜFT.
     · Nicht, dass die Oberfläche das Modell auch zeigt. Sie prüft die reine
       Funktion; ob ein Toast oder ein Dialog erscheint, misst sie nicht.
     · Keinen Wortlaut. Die Sätze werden noch abgestimmt; geprüft wird nur
       „nicht leer“, „nennt das Verworfene“, „zu neu ist ein anderer Text“.
     · Nicht, ob ein Einleser etwas verwirft, das er NICHT in sein Ergebnis
       schreibt. Was der Einleser verschweigt, kann das Modell nicht nennen —
       genau das sind die Einträge in `OHNE_ERGEBNISOBJEKT`.
     · Nicht die Einleser der vierzehn Arten außerhalb von ECHT. Ihre Zeilen
       sind von Hand in der allgemeinen Form geschrieben, nicht erzeugt.
     · Nicht die Zählung `angenommen` als Zahl — nur, ob etwas angenommen wurde.
     · Bei `vorlage` kein echtes „zu neu“: der Kern kennt dort heute keine
       Fassungsgrenze. Die Zeile steht in der allgemeinen Form und ist markiert.

   ROT, SOLANGE DIE FUNKTION FEHLT — und das soll so sein. Die Vorbedingung
   unten fällt mit einer Zeile; jede Tabellen-Probe fällt mit derselben Zeile,
   statt still übersprungen zu werden. Grün sind dann nur die Proben, die die
   Tabelle und die Hilfsfunktionen selbst prüfen (Rot-Beweise, Einleser-Formen).
   Beim Laden wirft die Datei nichts: kein Aufruf in den Kern steht außerhalb
   einer Probe.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');
const A6 = require('./import-a6-helfer.js');

const PW = 'zz-probe-Anzeige-Modell-Passwort-7';

const FEHLT = 'Die Funktion des Anzeige-Modells fehlt noch im Kern (oder im Export von tests/load-kern.js): '
  + 'erwartet sind V.importAnzeigeModell(art, ergebnis), V.importAnzeigeText(modell) und V.IMPORT_ANZEIGE_ARTEN. '
  + 'Solange sie fehlt, ist der Befund IMPORT-VERWIRFT-OHNE-ANZEIGE offen.';

/* Die siebzehn Arten, wie sie vereinbart sind. Die Probe misst gegen die Liste des
   Kerns (`V.IMPORT_ANZEIGE_ARTEN`); diese Abschrift dient nur dazu, dass die
   Tabelle sich auch ohne den Kern gegen ETWAS prüfen lässt. */
const ARTEN_LAUT_VERTRAG = Object.freeze([
  'depot-datei', 'interner-stand', 'datei-oeffnen-mit', 'wiederherstellungs-code',
  'sub-depot-einhaengen', 'sub-depot-selbst', 'voll-depot-json', 'bereichs-format',
  'autoritatives-dokument', 'b16-migration', 'vorlage', 'modul',
  'vor-depot-konfiguration', 'anfrage', 'vereinbarung-antwort', 'kdl', 'mappe-datei',
]);

/* ══ Annahmen, an EINER Stelle ═══════════════════════════════════════════
   Zwei Dinge legt die Vereinbarung nicht fest. Sie stehen hier, damit eine
   andere Entscheidung eine Zeile ändert und nicht vierzig.

   (1) Der Grund für „zu neu“ in der allgemeinen Form. Vorbild sind die zwei
       Gründe, die es gibt oder geben wird: `anfrage-zu-neu`, `vorlage-zu-neu`. */
function zuNeuGrund(art) { return art + '-zu-neu'; }

/* (2) Was das Modell als `was` nennt. Die Einleser benennen ihr Verworfenes
       verschieden: `name` (Vorlage), `kennung` (Modul, Anfrage-Feld),
       `schluessel` (unbekannter Schlüssel). Die Tabelle erwartet als `was` genau
       diesen Namen. Ein Eintrag OHNE Namen (Anfrage-Feld ohne Kennung) steht in
       der Tabelle mit `was: null`: dann zählt nur der Grund. */

/* ══ Erfundene Eingaben ═════════════════════════════════════════════════ */

function modulProbe(extra) {
  return Object.assign({ modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'zz-probe', moduleVersion: 1,
    arten: { zzprobeart: 'Probeart Musteramt' } }, extra || {});
}
function modulEinlass(V, modul) {
  V.setData(V.leeresDepot());
  return V.modulEinlassen(typeof modul === 'string' ? modul : JSON.stringify(modul));
}

function anfrageProbe(V, extra) {
  return Object.assign({
    modulTyp: 'anfrage', anfrageVersion: V.ANFRAGE_FORMAT_VERSION,
    von: 'Musteramt Beispielstadt', anbieterId: 'example.org/musteramt',
    zweck: 'Probe einer Anfrage', grundlage: 'erfundene Grundlage zz-probe', vorgang: 'zz-probe-0001',
    gueltigBis: '2099-12-31',
    felder: [{ kennung: 'zz-probe.vorname', zweck: 'Anrede im Bescheid', pflicht: true }],
    antwort: { art: 'einmalpasswort' },
  }, extra || {});
}

function planProbe(extra) {
  return Object.assign({ signiert: true, zeilen: [], listen: [], register: [], verworfeneFelder: [] }, extra || {});
}
async function vorlageAnwenden(V, plaene) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Probe');
  let r = null;
  for (const p of plaene) r = V.importAnwenden(p, {});
  return r;   // das Ergebnis des LETZTEN Plans
}
/* Zwei Wege werfen statt zurückzugeben, und ihr Wurf trägt den Grund als Kennung: der interne Stand (`e.code`, A7) und
   das Öffnen mit dem Wiederherstellungs-Code (`e.whc`). Die echte Zeile ruft den Kern und liest die Kennung aus dem Wurf.
   Ein Wurf ohne Kennung ergibt KEIN Ergebnisobjekt; dann fällt die Probe „die echten Zeilen tragen …“. */
async function wurfMitKennung(fn, feld) {
  try { await fn(); } catch (e) {
    const k = e && e[feld];
    return typeof k === 'string' && k ? { ok: false, grund: k, verworfene: [] } : null;
  }
  return null;
}
/* Node hat keinen FileReader; die Datei-Aufnahme der Mappe liest damit eine Data-URL. Nur für die Dauer des Aufrufs. */
async function mitDateiLeser(fn) {
  const vorher = globalThis.FileReader;
  globalThis.FileReader = class {
    readAsDataURL(blob) {
      blob.arrayBuffer().then((b) => { this.result = 'data:' + (blob.type || '') + ';base64,' + Buffer.from(b).toString('base64'); this.onload(); },
        (e) => { this.error = e; this.onerror(); });
    }
  };
  try { return await fn(); } finally { if (vorher === undefined) delete globalThis.FileReader; else globalThis.FileReader = vorher; }
}
const HOSTED = Object.freeze({ protocol: 'https:', href: 'https://vivodepot.example/app' });
async function internerStandOeffnen(cipherBlob, kernOpts) {
  const { V } = ladeKern(Object.assign({ indexedDB: createIdbMock(), location: HOSTED }, kernOpts || {}));
  await V.VdStore.setzen({ id: 'zz-probe-stand', gespeichert_am: '2026-01-01T00:00:00.000Z', cipherBlob });
  return wurfMitKennung(() => V.depotAusIdbLaden(PW), 'code');
}
async function codeOeffnen(V, aendern) {
  await V.depotAnlegen(PW);
  const code = V.whcCodeErzeugen();
  await V.whcHuelleWickeln(PW, code.slice(0, V.WHC_STELLEN));
  const datei = JSON.parse(JSON.stringify(await V.depotSerialisieren()));
  const { umschlag, eingabe } = aendern(V, datei, V.whcCodeGruppiert(code));
  return wurfMitKennung(() => ladeKern().V.depotMitCodeLaden(umschlag, eingabe, PW + '-neu'), 'whc');
}

const VORLAGE_KOPF = Object.freeze({ wortlautQuelle: { behoerde: 'Musteramt', titel: 'ZZ-Probe Bogen', lizenz: 'frei' },
  vorlageId: 'zz-probe-bogen', anbieterId: 'example.org/musteramt', feldDefinitionen: [] });

/* Die allgemeine Form, von Hand. `feld` wechselt zwischen `ok`, `angenommen` und
   `gueltig`, damit alle drei Erfolgsfelder der Form gelesen werden. */
function allgVerworfen(art, feld, was, grund) {
  return { art, form: 'allgemein', name: 'ein Teil verworfen (allgemeine Form, ' + feld + ')',
    ergebnis: { [feld]: true, grund: null, verworfene: [{ name: was, grund }] },
    erwartet: { angenommen: true, verworfen: [{ was, grund }], abgewiesen: null, zuNeu: false } };
}
function allgZuNeu(art, feld) {
  return { art, form: 'allgemein', name: 'zu neu (allgemeine Form, ' + feld + ')',
    ergebnis: { [feld]: false, grund: zuNeuGrund(art), verworfene: [] },
    erwartet: { angenommen: false, verworfen: [], abgewiesen: zuNeuGrund(art), zuNeu: true } };
}
function allgAbgewiesen(art, feld, grund) {
  return { art, form: 'allgemein', name: 'abgewiesen (allgemeine Form, ' + feld + ')',
    ergebnis: { [feld]: false, grund, verworfene: [] },
    erwartet: { angenommen: false, verworfen: [], abgewiesen: grund, zuNeu: false } };
}

/* ══ A · DIE FALL-TABELLE ════════════════════════════════════════════════
   Eine Zeile je Fall: { art, form, name, ergebnis, erwartet }.
   `form: 'echt'`      — `ergebnis` ist eine Funktion, die den Einleser des Kerns
                         ruft; sie läuft erst in der Probe, nie beim Laden.
   `form: 'allgemein'` — `ergebnis` ist von Hand in der allgemeinen Form
                         geschrieben. Für diese Zeilen hält die Probe das Modell,
                         nicht die Anzeige.
   `erwartet.angenommen` ist ein Wahrheitswert („wurde etwas angenommen“); wo er
   fehlt, wird er nicht geprüft. */
const FAELLE = [
  /* ── modul · ECHT (modulEinlassen) ─────────────────────────────────── */
  { art: 'modul', form: 'echt', name: 'sauber: nichts verworfen',
    ergebnis: (V) => modulEinlass(V, modulProbe()),
    erwartet: { angenommen: true, verworfen: [], abgewiesen: null, zuNeu: false } },
  { art: 'modul', form: 'echt', name: 'eine reservierte Art und ein unbekannter Schlüssel werden verworfen, das Modul gilt',
    ergebnis: (V) => modulEinlass(V, modulProbe({ zzProbeSchluessel: 1,
      arten: { [V.INSTITUTION_ART_EINGEBAUT[0]]: 'Neuer Name', zzprobeart: 'Probeart Musteramt' } })),
    erwartet: (V) => ({ angenommen: true, abgewiesen: null, zuNeu: false,
      verworfen: [{ was: V.INSTITUTION_ART_EINGEBAUT[0], grund: 'reserviert' }, { was: 'zzProbeSchluessel', grund: 'unbekannt' }] }) },
  { art: 'modul', form: 'echt', name: 'abgewiesen: unbekannter Typ',
    ergebnis: (V) => modulEinlass(V, '{"modulTyp":"zz-probe-phantasie"}'),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'unbekannter-typ', zuNeu: false } },
  { art: 'modul', form: 'echt', name: 'zu neu: das Modul verlangt eine neuere Anwendung',
    ergebnis: (V) => modulEinlass(V, modulProbe({ appVersion: 999999 })),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'app-zu-alt', zuNeu: true } },

  /* ── anfrage · ECHT (anfragePruefen) ───────────────────────────────── */
  { art: 'anfrage', form: 'echt', name: 'sauber: nichts verworfen',
    ergebnis: (V) => V.anfragePruefen(anfrageProbe(V)),
    erwartet: { angenommen: true, verworfen: [], abgewiesen: null, zuNeu: false } },
  { art: 'anfrage', form: 'echt', name: 'vier Felder und ein Schlüssel werden verworfen, die Anfrage gilt',
    ergebnis: (V) => V.anfragePruefen(anfrageProbe(V, { zzProbeSchluessel: 'x', felder: [
      { kennung: 'zz-probe.vorname', zweck: 'Anrede im Bescheid' },
      { kennung: 'zz-probe.geburtsdatum' },                                           // ohne Zweck
      { zweck: 'ohne Kennung' },                                                      // ohne Kennung: kein Name
      { kennung: 'zz-probe.vorname', zweck: 'noch einmal' },                          // doppelt
      { kennung: 'zz-probe.ort', zweck: 'Zustellung', zzProbeFeldschluessel: 1 },     // unbekannter Feld-Schlüssel
    ] })),
    erwartet: { angenommen: true, abgewiesen: null, zuNeu: false, verworfen: [
      { was: 'zzProbeSchluessel', grund: 'unbekannt' },
      { was: 'zz-probe.geburtsdatum', grund: 'feld-zweck' },
      { was: null, grund: 'feld-kennung' },
      { was: 'zz-probe.vorname', grund: 'feld-doppelt' },
      { was: 'zzProbeFeldschluessel', grund: 'feld-schluessel' },
    ] } },
  { art: 'anfrage', form: 'echt', name: 'abgewiesen: ohne Absender',
    ergebnis: (V) => { const a = anfrageProbe(V); delete a.von; return V.anfragePruefen(a); },
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'von', zuNeu: false } },
  { art: 'anfrage', form: 'echt', name: 'zu neu: anfrageVersion über der bekannten Fassung',
    ergebnis: (V) => V.anfragePruefen(anfrageProbe(V, { anfrageVersion: V.ANFRAGE_FORMAT_VERSION + 1 })),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'anfrage-zu-neu', zuNeu: true } },

  /* ── vorlage · ECHT (importAnwenden) ───────────────────────────────── */
  { art: 'vorlage', form: 'echt', name: 'sauber: nichts verworfen',
    ergebnis: (V) => vorlageAnwenden(V, [planProbe({ feldDefinitionen: [
      { sektorId: 'housing', feldId: 'tpl_zzprobe_zaehlpunkt', typ: 'text', label: 'ZZ-Probe Zählpunkt', schemaVersion: 23 }] })]),
    erwartet: { verworfen: [], abgewiesen: null, zuNeu: false } },
  { art: 'vorlage', form: 'echt', name: 'drei Felder und eine Codeliste werden verworfen, ein Feld gilt',
    ergebnis: (V) => vorlageAnwenden(V, [planProbe({
      verworfeneFelder: [{ name: 'ZZ-Probe Luftfahrt', grund: 'bereich' }],
      feldDefinitionen: [
        { sektorId: 'housing', feldId: 'tpl_zzprobe_zaehlpunkt', typ: 'text', label: 'ZZ-Probe Zählpunkt', schemaVersion: 23 },
        { sektorId: 'identity', feldId: 'givenName', typ: 'text', label: 'ZZ-Probe Vorname', schemaVersion: 23 },
        { sektorId: 'housing', feldId: 'zzprobe_ohne_praefix', typ: 'text', label: 'ZZ-Probe ohne Präfix', schemaVersion: 23 }],
      codeListen: [{ systemId: 'zzprobe-liste', eintraege: [{ code: 'a', display: 'A' }] }],
    })]),
    erwartet: { abgewiesen: null, zuNeu: false, verworfen: [
      { was: 'ZZ-Probe Luftfahrt', grund: 'bereich' },
      { was: 'ZZ-Probe Vorname', grund: 'kern-kollision' },
      { was: 'ZZ-Probe ohne Präfix', grund: 'praefix' },
      { was: 'zzprobe-liste', grund: 'praefix' },
    ] } },
  { art: 'vorlage', form: 'echt', name: 'abgewiesen: hier liegt schon eine neuere Fassung dieser Vorlage',
    ergebnis: (V) => vorlageAnwenden(V, [
      planProbe(Object.assign({}, VORLAGE_KOPF, { wortlaut: 'ZZ-Probe Fassung 3', vorlageVersion: 3 })),
      planProbe(Object.assign({}, VORLAGE_KOPF, { wortlaut: 'ZZ-Probe Fassung 2', vorlageVersion: 2 })),
    ]),
    erwartet: { verworfen: [], abgewiesen: 'aeltere-fassung', zuNeu: false } },
  /* KERN KENNT HIER HEUTE KEIN ZU-NEU: `validateTemplate` liest keine Fassung der Vorlage,
     und `importAnwenden` gibt für einen ungültigen Plan eine Kurzform ohne Grund zurück.
     Die Zeile steht darum in der allgemeinen Form und wird zur echten, sobald der Leser
     die Fassung prüft. */
  { art: 'vorlage', form: 'allgemein', name: 'zu neu (allgemeine Form; Kern kennt hier heute kein zu-neu)',
    ergebnis: { angenommen: false, grund: 'vorlage-zu-neu', verworfene: [] },
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'vorlage-zu-neu', zuNeu: true } },

  /* ── interner-stand · ECHT (depotAusIdbLaden, Wurf mit Kennung e.code) ── */
  { art: 'interner-stand', form: 'echt', name: 'abgewiesen: Stand einer anderen Krypto-Fassung',
    ergebnis: () => internerStandOeffnen(JSON.stringify({ kryptoVersion: 2, depotUUID: 'zz-probe', pbkdf2: { salt: 'AA' }, depotSalt: 'BB', iv: 'CC', ct: 'DD' })),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'krypto-fassung', zuNeu: false } },
  { art: 'interner-stand', form: 'echt', name: 'abgewiesen: beschädigter Stand',
    ergebnis: () => internerStandOeffnen('{ zz-probe kein Umschlag'),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'datei-defekt', zuNeu: false } },

  /* ── depot-datei und sub-depot-selbst · ECHT (depotLaden, subKontextBetreten; A6: migrationFehlerErgebnis) ── */
  { art: 'depot-datei', form: 'echt', name: 'abgewiesen: die Migration warf, der Stand davor gilt nur lesend',
    ergebnis: () => A6.ankerOeffnen().then(({ V }) => V.migrationFehlerErgebnis()),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'migration-fehler', zuNeu: false } },
  { art: 'sub-depot-selbst', form: 'echt', name: 'abgewiesen: die Migration des Subs warf, der Stand davor gilt nur lesend',
    ergebnis: () => A6.subBetreten().then(({ V }) => V.migrationFehlerErgebnis()),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'migration-fehler', zuNeu: false } },

  /* ── datei-oeffnen-mit · ECHT (dateiOeffnenMitPruefen, A8: Ziehen und „Öffnen mit“) ── */
  { art: 'datei-oeffnen-mit', form: 'echt', name: 'abgewiesen: eine Datei mit anderer Endung wird genannt',
    ergebnis: (V) => V.dateiOeffnenMitPruefen({ name: 'zz-probe-foto.jpg' }),
    erwartet: { angenommen: false, verworfen: [{ was: 'zz-probe-foto.jpg', grund: 'endung-unbekannt' }], abgewiesen: 'endung-unbekannt', zuNeu: false } },
  { art: 'datei-oeffnen-mit', form: 'echt', name: 'abgewiesen: eine Datei, die sich nicht lesen ließ, wird genannt',
    ergebnis: (V) => V.dateiOeffnenMitPruefen({ name: 'zz-probe.vivodepot' }, new Error('zz-probe nicht lesbar')),
    erwartet: { angenommen: false, verworfen: [{ was: 'zz-probe.vivodepot', grund: 'datei-nicht-lesbar' }], abgewiesen: 'datei-nicht-lesbar', zuNeu: false } },
  { art: 'datei-oeffnen-mit', form: 'echt', name: 'angenommen: eine .vivodepot-Datei',
    ergebnis: (V) => V.dateiOeffnenMitPruefen({ name: 'zz-probe.vivodepot' }),
    erwartet: { angenommen: true, verworfen: [], abgewiesen: null, zuNeu: false } },

  { art: 'depot-datei', form: 'echt', name: 'abgewiesen: Datei einer anderen Krypto-Fassung',
    ergebnis: (V) => wurfMitKennung(() => V.depotLaden({ kryptoVersion: 2, depotUUID: 'zz-probe', pbkdf2: { salt: 'AA' }, depotSalt: 'BB', iv: 'CC', ct: 'DD' }, PW), 'code'),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'krypto-fassung', zuNeu: false } },

  /* ── wiederherstellungs-code · ECHT (depotMitCodeLaden, Wurf mit Kennung e.whc) ── */
  { art: 'wiederherstellungs-code', form: 'echt', name: 'abgewiesen: die Datei trägt keine Hülle',
    ergebnis: (V) => codeOeffnen(V, (W, d, c) => { delete d[W.WHC_FELD]; return { umschlag: d, eingabe: c }; }),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'keine-huelle', zuNeu: false } },
  { art: 'wiederherstellungs-code', form: 'echt', name: 'abgewiesen: der Code ist falsch abgeschrieben',
    ergebnis: (V) => codeOeffnen(V, (W, d, c) => ({ umschlag: d, eingabe: c.slice(0, -1) + (c.endsWith('0') ? '1' : '0') })),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'abgeschrieben', zuNeu: false } },
  { art: 'wiederherstellungs-code', form: 'echt', name: 'abgewiesen: ein anderer gültiger Code',
    ergebnis: (V) => codeOeffnen(V, (W, d) => ({ umschlag: d, eingabe: W.whcCodeGruppiert(W.whcCodeErzeugen()) })),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'passt-nicht', zuNeu: false } },

  /* ── voll-depot-json · ECHT (importPlan('json') über _vollDepotParsen). A4: ein Depot aus einer neueren Fassung wird mit
     `depot-zu-neu` abgewiesen, ohne Felder. Damit fällt auch, was die neuere Fassung an Bereichen und Feldern mitbrachte, nicht
     still weg: sie wird gar nicht gelesen. Ein Depot derselben Fassung kennt nur Bereiche, die _vollDepotFelder kennt. ── */
  { art: 'voll-depot-json', form: 'echt', name: 'abgewiesen: Depot aus einer neueren Fassung',
    ergebnis: (V) => V.importPlan('json', JSON.stringify({ _typ: 'vivodepot-klartext-export',
      depot: { schemaVersion: V.SCHEMA_VERSION_AKTUELL + 1, sektoren: { identity: { givenName: 'ZZ-Probe' } }, menschen: [] } })),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'depot-zu-neu', zuNeu: true } },

  /* ── bereichs-format · ECHT (FHIR-IPS-Einleser, A5): was nicht übernommen wird, steht mit Grund im Ergebnis. ── */
  { art: 'bereichs-format', form: 'echt', name: 'angenommen, eine Ressource nicht gelesen',
    ergebnis: (V) => V.IMPORT_FORMAT_BY_ID['fhir-ips'].parse(JSON.stringify({ resourceType: 'Bundle', type: 'document', entry: [
      { resource: { resourceType: 'Patient', name: [{ family: 'Probe', given: ['Zora'] }] } }, { resource: { resourceType: 'Device' } }] })),
    erwartet: { angenommen: true, verworfen: [{ was: 'Device', grund: 'ressource-nicht-gelesen' }], abgewiesen: null, zuNeu: false } },

  /* ── sub-depot-einhaengen · ECHT (subDepotEinhaengen, Wurf mit Kennung e.code). ── */
  { art: 'sub-depot-einhaengen', form: 'echt', name: 'abgewiesen: keine Depot-Datei',
    ergebnis: async (V) => { await V.depotAnlegen(PW); V.akteurSelbstErklaeren('ZZ Probe');
      return wurfMitKennung(() => V.subDepotEinhaengen({ zz: 'probe' }, { bezeichnung: 'X', inhaberin: 'X' }), 'code'); },
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'keine-depot-datei', zuNeu: false } },

  /* ── autoritatives-dokument · ECHT (importAutoritativDokument: Kennung des Mappe-Eintrags oder null). ── */
  { art: 'autoritatives-dokument', form: 'echt', rueckgabe: 'kennung-oder-null', name: 'angenommen: die Eigenprobe wird abgelegt',
    ergebnis: async (V) => { await V.depotAnlegen(PW);
      return V.importAutoritativDokument(fs.readFileSync(path.join(__dirname, 'fixtures', 'eigenprobe-eu-hdr.json'), 'utf8')); },
    erwartet: { angenommen: true, verworfen: [], abgewiesen: null, zuNeu: false } },
  { art: 'autoritatives-dokument', form: 'echt', rueckgabe: 'kennung-oder-null', name: 'abgewiesen: kein erkanntes Original',
    ergebnis: async (V) => { await V.depotAnlegen(PW); return V.importAutoritativDokument('{ zz-probe kein json'); },
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'nicht-erkannt', zuNeu: false } },

  /* ── b16-migration · ECHT (importPlan('vivodepot-beta'), importAnwenden) ── */
  { art: 'b16-migration', form: 'echt', rueckgabe: 'plan-oder-anwenden', name: 'angenommen: das Anwenden übernimmt eine Beta-Datei',
    ergebnis: async (V) => { await V.depotAnlegen(PW); V.akteurSelbstErklaeren('Probe');
      return V.importAnwenden(V.importPlan('vivodepot-beta', JSON.stringify({ __fokus__: 1, bundid_email: 'zz-probe@example.org', typeOfFuneral: 'Erdbestattung' })), {}); },
    erwartet: { angenommen: true, verworfen: [], abgewiesen: null, zuNeu: false } },
  { art: 'b16-migration', form: 'echt', rueckgabe: 'plan-oder-anwenden', name: 'abgewiesen: eine unlesbare Beta-Datei',
    ergebnis: async (V) => { await V.depotAnlegen(PW); return V.importPlan('vivodepot-beta', '{ zz-probe kein json'); },
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'datei-defekt', zuNeu: false } },

  /* ── mappe-datei · ECHT (mappeDateiAufnehmen: der Eintrag, oder ein Wurf mit Kennung e.code). ── */
  { art: 'mappe-datei', form: 'echt', name: 'angenommen: ein PDF wird aufgenommen',
    ergebnis: (V) => mitDateiLeser(() => V.mappeDateiAufnehmen(new Blob(['%PDF-1.4 zz-probe'], { type: 'application/pdf' }))),
    erwartet: { angenommen: true, verworfen: [], abgewiesen: null, zuNeu: false } },
  { art: 'mappe-datei', form: 'echt', name: 'abgewiesen: die Datei ist zu groß für die Mappe',
    ergebnis: (V) => mitDateiLeser(() => wurfMitKennung(() => V.mappeDateiAufnehmen(new Blob([new Uint8Array(V.MAPPE_MAX_BYTES + 1)], { type: 'application/pdf' })), 'code')),
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'datei-zu-gross', zuNeu: false } },

  /* ── kdl · ECHT (kdlEinlesen) ─────────────────────────────────────── */
  { art: 'kdl', form: 'echt', name: 'abgewiesen: CodeSystem ohne Fassung',
    ergebnis: (V) => { V.setData(V.leeresDepot());
      return V.kdlEinlesen('zz-probe-kdl.json', new TextEncoder().encode(JSON.stringify({ resourceType: 'CodeSystem', url: V.KDL_SYSTEM }))); },
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'kdl-ohne-version', zuNeu: false } },

  /* ── vereinbarung-antwort · ECHT (vereinbarungAntwortAnwenden) ────────── */
  { art: 'vereinbarung-antwort', form: 'echt', name: 'abgewiesen: keine Antwort im Umschlag',
    ergebnis: async (V) => { await V.depotAnlegen(PW); return V.vereinbarungAntwortAnwenden({ antwort: { art: 'zz-probe-keine-antwort' } }); },
    erwartet: { angenommen: false, verworfen: [], abgewiesen: 'keine-antwort', zuNeu: false } },

  /* ── vor-depot-konfiguration · ECHT (vorDepotKonfigurationAnwenden) ──────
     Das Ergebnis steht in der Modulvariable der verworfenen Vorlagen; die Oberfläche baut daraus
     { ok: true, verworfene } und gibt es an das Modell. Die Zeile baut es genauso. Der Name der
     verworfenen Vorlage ist ein Text des Textsatzes, darum zählt hier nur der Grund (was: null). */
  { art: 'vor-depot-konfiguration', form: 'echt', name: 'ein Vorlagen-Zertifikat, das nicht trägt, wird mit Grund verworfen',
    ergebnis: async (V) => { await V.vorDepotKonfigurationAnwenden(['eyJhbGciOiJFUzI1NiJ9.eyJ6eiI6MX0.c2ln']);
      return { ok: true, verworfene: V.vorDepotVorlagenVerworfen() }; },
    erwartet: { angenommen: true, verworfen: [{ was: null, grund: 'anker-alg' }], abgewiesen: null, zuNeu: false } },

  /* ── Die vierzehn übrigen Arten · NUR ALLGEMEINE FORM ──────────────────
     Für diese Arten hält die Probe das Modell, nicht die Anzeige. Keine dieser
     Zeilen kommt aus einem Einleser. */
  allgVerworfen('depot-datei', 'ok', 'ZZ-Probe-Teil A', 'zz-probe-grund'),
  allgZuNeu('depot-datei', 'ok'),
  allgVerworfen('interner-stand', 'ok', 'ZZ-Probe-Teil B', 'zz-probe-grund'),
  allgZuNeu('interner-stand', 'ok'),
  allgVerworfen('datei-oeffnen-mit', 'ok', 'ZZ-Probe-Teil C', 'zz-probe-grund'),
  allgZuNeu('datei-oeffnen-mit', 'ok'),
  allgVerworfen('wiederherstellungs-code', 'ok', 'ZZ-Probe-Teil D', 'zz-probe-grund'),
  allgZuNeu('wiederherstellungs-code', 'ok'),
  allgVerworfen('sub-depot-einhaengen', 'angenommen', 'ZZ-Probe-Teil E', 'zz-probe-grund'),
  allgZuNeu('sub-depot-einhaengen', 'angenommen'),
  allgVerworfen('sub-depot-selbst', 'angenommen', 'ZZ-Probe-Teil F', 'zz-probe-grund'),
  allgZuNeu('sub-depot-selbst', 'angenommen'),
  allgVerworfen('voll-depot-json', 'angenommen', 'zzProbeBereich', 'zz-probe-grund'),
  allgZuNeu('voll-depot-json', 'angenommen'),
  allgVerworfen('bereichs-format', 'angenommen', 'ZZ-Probe-Ressource', 'zz-probe-grund'),
  allgZuNeu('bereichs-format', 'angenommen'),
  allgVerworfen('autoritatives-dokument', 'gueltig', 'ZZ-Probe-Teil I', 'zz-probe-grund'),
  allgZuNeu('autoritatives-dokument', 'gueltig'),
  allgVerworfen('b16-migration', 'gueltig', 'ZZ-Probe-Teil J', 'zz-probe-grund'),
  allgZuNeu('b16-migration', 'gueltig'),
  allgVerworfen('vor-depot-konfiguration', 'gueltig', 'ZZ-Probe-Bündel', 'zz-probe-grund'),
  allgZuNeu('vor-depot-konfiguration', 'gueltig'),
  allgVerworfen('vereinbarung-antwort', 'gueltig', 'ZZ-Probe-Teil O', 'zz-probe-grund'),
  allgZuNeu('vereinbarung-antwort', 'gueltig'),
  /* kdl und mappe-datei stehen in KEIN_ZU_NEU: statt „zu neu“ eine gewöhnliche Abweisung. */
  allgVerworfen('kdl', 'ok', 'ZZ-Probe-Begriff', 'zz-probe-grund'),
  allgAbgewiesen('kdl', 'ok', 'kdl-ohne-version'),
  allgVerworfen('mappe-datei', 'ok', 'zz-probe.pdf', 'zz-probe-grund'),
  allgAbgewiesen('mappe-datei', 'ok', 'zz-probe-abweisung'),
];

/* ══ Wege, die heute KEIN Ergebnisobjekt liefern ═════════════════════════
   Für sie gibt es keine echte Zeile und es wird keine erfunden. `teil` ist der
   Teil des Befunds (A4 bis A8); ohne `teil` ist der Weg nur als „Wurf mit
   Freitext“ gelesen. Fundstellen sind Funktionsnamen im Kern.
   BEHOBEN UND HERAUSGENOMMEN (04.11.2026): A7 an depot-datei und interner-stand — der Wurf trägt seine Kennung
   (krypto-fassung, datei-defekt), und oeffnenAbweisungText nennt den Grund statt eines falschen Passworts; der
   Wiederherstellungs-Code wirft mit e.whc. interner-stand und wiederherstellungs-code haben dafür echte Zeilen;
   depot-datei bleibt wegen A6 hier, sein A7 hält tests/oeffnen-abweisung-nennt-grund.test.js.
   BEHOBEN UND HERAUSGENOMMEN (07.11.2026): A6 an voll-depot-json, depot-datei und sub-depot-selbst — ein Wurf der Migration
   holt den Stand davor zurück und gibt ein Ergebnis mit Grund (migration-fehler); Datei und Sub sind dann nur lesend,
   „Ganzes Depot“ weist ab (tests/import-a6-migrationswurf.test.js). depot-datei und sub-depot-selbst haben dafür echte
   Zeilen; voll-depot-json bleibt wegen A4 hier.
   BEHOBEN UND HERAUSGENOMMEN (07.11.2026): A8 an datei-oeffnen-mit — Ziehen und „Öffnen mit“ prüfen die Datei mit
   dateiOeffnenMitPruefen; eine andere Endung oder eine unlesbare Datei ergibt ein Ergebnis mit Grund, und die Anzeige nennt
   sie (tests/e2e/import-a8-oeffnen-mit.spec.js). datei-oeffnen-mit hat dafür echte Zeilen. */
const OHNE_ERGEBNISOBJEKT = Object.freeze([
]);

/* Arten, für die nur die allgemeine Form in der Tabelle steht, obwohl nichts dagegen
   spricht, ihr Ergebnis später echt zu erzeugen. */
const NUR_ALLGEMEINE_FORM = Object.freeze([
]);

/* Arten ohne Zeile „zu neu“, je mit dem Grund aus dem Kern. */
const KEIN_ZU_NEU = Object.freeze({
  'kdl': 'kdlPruefen vergleicht die Fassung mit KDL_FASSUNGEN (sonst kdl-fassung-unbekannt): eine neuere Fassung ist nicht „zu neu“, sondern nicht zugelassen, bis ihre zwei Codes gemessen sind',
  'mappe-datei': 'mappeDateiAufnehmen nimmt Bild oder PDF als Ganzes auf und liest keine Fassung; geprüft wird nur die Größe',
});

/* ══ Reine Hilfsfunktionen (ohne Kern) ═══════════════════════════════════ */

const VERWORFEN_FELDER = Object.freeze(['verworfene', 'defVerworfen', 'codeListenVerworfen']);

/* Wie viele verworfene Teile das ERGEBNIS des Einlesers selbst trägt. */
function zahlVerworfenImErgebnis(ergebnis) {
  if (!ergebnis || typeof ergebnis !== 'object') return 0;
  let n = 0;
  for (const k of VERWORFEN_FELDER) if (Array.isArray(ergebnis[k])) n += ergebnis[k].length;
  return n;
}
function grundImErgebnis(ergebnis) {
  if (!ergebnis || typeof ergebnis !== 'object') return null;
  if (ergebnis.grund != null) return ergebnis.grund;
  if (ergebnis.vorlageAbgewiesen && ergebnis.vorlageAbgewiesen.grund != null) return ergebnis.vorlageAbgewiesen.grund;
  return null;
}

/* Probe 1: Modell gegen Erwartung. `verworfen` als Menge, Reihenfolge egal. */
function modellAbweichungen(modell, erwartet) {
  if (!modell || typeof modell !== 'object') return ['kein Modell-Objekt: ' + JSON.stringify(modell)];
  const aus = [];
  if (!Array.isArray(modell.verworfen)) {
    aus.push('verworfen ist keine Liste: ' + JSON.stringify(modell.verworfen));
  } else {
    const ist = modell.verworfen.slice();
    const soll = erwartet.verworfen.slice().sort((a, b) => Number(a.was === null) - Number(b.was === null));
    for (const s of soll) {
      const i = ist.findIndex((x) => x && x.grund === s.grund && (s.was === null || x.was === s.was));
      if (i < 0) aus.push('fehlt in verworfen: ' + JSON.stringify(s));
      else ist.splice(i, 1);
    }
    for (const x of ist) aus.push('zu viel in verworfen: ' + JSON.stringify(x));
  }
  const abgewiesen = modell.abgewiesen == null ? null : modell.abgewiesen;
  if (abgewiesen !== erwartet.abgewiesen) aus.push('abgewiesen ist ' + JSON.stringify(abgewiesen) + ', erwartet ' + JSON.stringify(erwartet.abgewiesen));
  if (modell.zuNeu !== erwartet.zuNeu) aus.push('zuNeu ist ' + JSON.stringify(modell.zuNeu) + ', erwartet ' + JSON.stringify(erwartet.zuNeu));
  if ('angenommen' in erwartet && !!modell.angenommen !== erwartet.angenommen) {
    aus.push('angenommen ist ' + JSON.stringify(modell.angenommen) + ', erwartet ' + (erwartet.angenommen ? 'etwas' : 'nichts'));
  }
  return aus;
}

/* Probe 2: jede Art hat eine Zeile, jede Zeile eine Art. */
function klassenLuecken(arten, tabelle) {
  const inTabelle = new Set(tabelle.map((z) => z.art));
  return {
    ohneZeile: arten.filter((a) => !inTabelle.has(a)),
    nichtInListe: Array.from(inTabelle).filter((a) => arten.indexOf(a) < 0),
  };
}

/* Probe 3: je Art eine Zeile „zu neu“, oder eine begründete Ausnahme. */
function zuNeuLuecken(arten, tabelle, ausnahmen) {
  const mit = new Set(tabelle.filter((z) => {
    const e = typeof z.erwartet === 'function' ? null : z.erwartet;
    return !!e && e.zuNeu === true && typeof e.abgewiesen === 'string' && e.abgewiesen.length > 0;
  }).map((z) => z.art));
  return {
    ohneZuNeu: arten.filter((a) => !mit.has(a) && !(a in ausnahmen)),
    ausnahmeOhneGrund: Object.keys(ausnahmen).filter((a) => typeof ausnahmen[a] !== 'string' || !ausnahmen[a].trim()),
    ausnahmeUeberholt: Object.keys(ausnahmen).filter((a) => mit.has(a)),
  };
}

/* Probe 4: nichts geht still verloren. */
function stilleVerluste(ergebnis, modell) {
  const aus = [];
  const soll = zahlVerworfenImErgebnis(ergebnis);
  const liste = (modell && Array.isArray(modell.verworfen)) ? modell.verworfen : [];
  if (liste.length !== soll) aus.push('das Ergebnis trägt ' + soll + ' verworfene Teile, das Modell nennt ' + liste.length);
  liste.forEach((x, i) => {
    if (!x || typeof x.grund !== 'string' || !x.grund.trim()) aus.push('Eintrag ' + i + ' ohne grund: ' + JSON.stringify(x));
  });
  return aus;
}

/* Deckung: jede Art steht in genau EINER der drei Mengen. */
function deckungLuecken(arten, tabelle, ohneErgebnis, nurAllgemein) {
  const echt = new Set(tabelle.filter((z) => z.form === 'echt').map((z) => z.art));
  const ohne = new Set(ohneErgebnis.map((e) => e.art));
  const allg = new Set(nurAllgemein.map((e) => e.art));
  const inKeiner = [], inMehreren = [];
  for (const a of arten) {
    const n = Number(echt.has(a)) + Number(ohne.has(a)) + Number(allg.has(a));
    if (n === 0) inKeiner.push(a);
    if (n > 1) inMehreren.push(a);
  }
  return { inKeiner, inMehreren };
}

/* Die Liste des Kerns als art-Schlüssel — ob sie als Liste von Zeichenketten, als Liste
   von Einträgen mit `art` oder als Tabelle je Art gebaut ist. */
function artSchluessel(x) {
  if (Array.isArray(x)) return x.map((e) => (typeof e === 'string' ? e : (e && e.art)));
  if (x && typeof x === 'object') return Object.keys(x);
  return null;
}

/* ══ Kern und aufgelöste Fälle — erst in der Probe, nie beim Laden ════════ */

let _kern = null;
function kern() {
  if (!_kern) _kern = ladeKern().V;
  return _kern;
}
/* Fällt mit EINER Zeile, solange die Funktion fehlt. Jede Tabellen-Probe ruft das zuerst. */
function kernMitModell() {
  const V = kern();
  assert.equal(typeof V.importAnzeigeModell, 'function', FEHLT);
  return V;
}

let _aufgeloest = null;
function faelleAufgeloest() {
  if (!_aufgeloest) {
    _aufgeloest = (async () => {
      const aus = [];
      for (const z of FAELLE) {
        const eintrag = { zeile: z, ergebnis: null, erwartet: null, fehler: null };
        try {
          const braucht = typeof z.ergebnis === 'function' || typeof z.erwartet === 'function';
          const V = braucht ? ladeKern().V : null;   // je echte Zeile ein frischer Kern
          eintrag.ergebnis = typeof z.ergebnis === 'function' ? await z.ergebnis(V) : z.ergebnis;
          eintrag.erwartet = typeof z.erwartet === 'function' ? z.erwartet(V) : z.erwartet;
        } catch (e) {
          eintrag.fehler = String((e && e.stack) || e);
        }
        aus.push(eintrag);
      }
      return aus;
    })();
  }
  return _aufgeloest;
}
const titel = (z) => z.art + ' · ' + z.name;

function modellVon(V, f) {
  try { return { modell: V.importAnzeigeModell(f.zeile.art, f.ergebnis), wurf: null }; }
  catch (e) { return { modell: null, wurf: String((e && e.message) || e) }; }
}

/* ══ B · DIE PROBEN ══════════════════════════════════════════════════════ */

/* 7 · Vorbedingung. HEUTE ROT, und das soll so sein. */
test('[Import-Anzeige·Vorbedingung] der Kern trägt das Anzeige-Modell für Importe', () => {
  const V = kern();
  assert.equal(typeof V.importAnzeigeModell, 'function', FEHLT);
  assert.equal(typeof V.importAnzeigeText, 'function', FEHLT);
  assert.ok(Array.isArray(artSchluessel(V.IMPORT_ANZEIGE_ARTEN)), FEHLT);
});

/* Die Tabelle selbst — ohne die Funktion prüfbar. */
test('[Import-Anzeige·Tabelle] die echten Zeilen tragen wirklich, was der Einleser des Kerns zurückgibt', async () => {
  /* Hält die erfundenen Eingaben fest: der Einleser verwirft genau so viele Teile und nennt
     genau den Grund, den die Zeile erwartet. Stimmt das nicht, misst Probe 1 eine Eingabe,
     die es nicht gibt. */
  const schief = [];
  for (const f of await faelleAufgeloest()) {
    if (f.zeile.form !== 'echt') continue;
    if (f.fehler) { schief.push(titel(f.zeile) + ': der Einleser wirft: ' + f.fehler); continue; }
    if (f.zeile.rueckgabe === 'kennung-oder-null') {
      /* Vertrag des Einlesers: die Kennung des abgelegten Eintrags oder null (nicht erkannt). */
      const form = (typeof f.ergebnis === 'string' && f.ergebnis) ? 'kennung' : (f.ergebnis === null ? 'null' : 'anderes');
      const soll = f.erwartet.angenommen ? 'kennung' : 'null';
      if (form !== soll) schief.push(titel(f.zeile) + ': der Einleser liefert ' + form + ', die Zeile erwartet ' + soll);
      continue;
    }
    if (f.zeile.rueckgabe === 'plan-oder-anwenden') {
      /* Vertrag der Übernahme aus Beta 16: ein Plan (ungueltig, zeilen) oder das Ergebnis des Anwendens (gesetzt). */
      const e = f.ergebnis || {};
      const form = typeof e.gesetzt === 'number' ? (e.gesetzt > 0 ? 'uebernommen' : 'nichts-uebernommen')
        : (Array.isArray(e.zeilen) && typeof e.ungueltig === 'boolean') ? (e.ungueltig ? 'ungueltiger-plan' : 'gueltiger-plan') : 'anderes';
      const passt = f.erwartet.angenommen ? (form === 'uebernommen' || form === 'gueltiger-plan') : form === 'ungueltiger-plan';
      if (!passt) schief.push(titel(f.zeile) + ': der Einleser liefert ' + form);
      continue;
    }
    if (!f.ergebnis || typeof f.ergebnis !== 'object') { schief.push(titel(f.zeile) + ': kein Ergebnisobjekt'); continue; }
    const n = zahlVerworfenImErgebnis(f.ergebnis);
    if (n !== f.erwartet.verworfen.length) schief.push(titel(f.zeile) + ': der Einleser verwirft ' + n + ', die Zeile erwartet ' + f.erwartet.verworfen.length);
    const g = grundImErgebnis(f.ergebnis);
    if (g !== f.erwartet.abgewiesen) schief.push(titel(f.zeile) + ': Grund des Einlesers ' + JSON.stringify(g) + ', die Zeile erwartet ' + JSON.stringify(f.erwartet.abgewiesen));
  }
  assert.deepEqual(schief, []);
});

test('[Import-Anzeige·Tabelle] jede Zeile ist vollständig und trägt ihre Form', () => {
  const schief = [];
  for (const z of FAELLE) {
    if (typeof z.art !== 'string' || !z.art || typeof z.name !== 'string' || !z.name) schief.push('Zeile ohne art oder name: ' + JSON.stringify(z));
    if (z.form !== 'echt' && z.form !== 'allgemein') schief.push(titel(z) + ': form fehlt');
    if (z.form === 'echt' && typeof z.ergebnis !== 'function') schief.push(titel(z) + ': eine echte Zeile erzeugt ihr Ergebnis aus dem Einleser, nicht von Hand');
    if (z.form === 'allgemein' && (typeof z.ergebnis !== 'object' || !z.ergebnis)) schief.push(titel(z) + ': die allgemeine Form steht als Objekt da');
    if (z.erwartet == null) schief.push(titel(z) + ': erwartet fehlt');
  }
  assert.deepEqual(schief, []);
});

test('[Import-Anzeige·Deckung] jede Art ist echt gedeckt ODER steht ohne Ergebnisobjekt da ODER ist als nur allgemeine Form markiert', () => {
  const V = kern();
  const vomKern = artSchluessel(V.IMPORT_ANZEIGE_ARTEN) || [];
  const arten = Array.from(new Set(ARTEN_LAUT_VERTRAG.concat(vomKern)));
  assert.deepEqual(deckungLuecken(arten, FAELLE, OHNE_ERGEBNISOBJEKT, NUR_ALLGEMEINE_FORM), { inKeiner: [], inMehreren: [] });
  /* Außerhalb von ECHT: je Art mindestens zwei Zeilen, eine davon mit verworfenem Teil. */
  const duenn = [];
  const echt = new Set(FAELLE.filter((z) => z.form === 'echt').map((z) => z.art));
  for (const a of arten) {
    if (echt.has(a)) continue;
    const zeilen = FAELLE.filter((z) => z.art === a);
    if (zeilen.length < 2) duenn.push(a + ': weniger als zwei Zeilen');
    if (!zeilen.some((z) => typeof z.erwartet === 'object' && z.erwartet.verworfen.length > 0)) duenn.push(a + ': keine Zeile mit verworfenem Teil');
  }
  assert.deepEqual(duenn, []);
  for (const e of OHNE_ERGEBNISOBJEKT) {
    assert.ok(e.fundstelle && e.fehlt, 'ein Eintrag ohne Ergebnisobjekt nennt Fundstelle und Lücke: ' + e.art);
  }
});

test('[Import-Anzeige·Deckung·Rot-Beweis] eine Art, die in keiner der drei Mengen steht, wird genannt', () => {
  // Eine Art, deren echte Zeilen fehlen und die in keiner Liste steht, wird genannt (seit alle Arten echt gedeckt sind,
  // nimmt die Probe einer Art ihre echten Zeilen).
  const weg = 'mappe-datei';
  const ohneEcht = FAELLE.filter((z) => !(z.art === weg && z.form === 'echt'));
  assert.deepEqual(deckungLuecken(ARTEN_LAUT_VERTRAG, ohneEcht, OHNE_ERGEBNISOBJEKT, NUR_ALLGEMEINE_FORM).inKeiner, [weg]);
  const doppelt = NUR_ALLGEMEINE_FORM.concat([{ art: 'modul', vermerk: 'gepflanzt' }]);
  assert.deepEqual(deckungLuecken(ARTEN_LAUT_VERTRAG, FAELLE, OHNE_ERGEBNISOBJEKT, doppelt).inMehreren, ['modul'],
    'und eine echte Art darf nicht zugleich als nur allgemeine Form geführt werden');
});

test('[Import-Anzeige·Mappe·Rot-Beweis am Kern] ohne die Lesart des Eintrags hieße eine aufgenommene Datei abgewiesen', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const LESART = "  } else if (art === 'mappe-datei' && typeof e.inhalt === 'string' && typeof e.groesse === 'number') {\n";
  assert.equal(quelle.split(LESART).length, 2, 'die Lesart steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-anzeige-mappe-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, quelle.replace(LESART, "  } else if (false) {\n"));
    const { V } = ladeKern({ htmlPfad: pfad, backen: true });
    const eintrag = await mitDateiLeser(() => V.mappeDateiAufnehmen(new Blob(['%PDF-1.4 zz-probe'], { type: 'application/pdf' })));
    assert.equal(V.importAnzeigeModell('mappe-datei', eintrag).abgewiesen, 'abgewiesen');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* A7 · Die Kennungen des internen Stands heißen nicht „falsches Passwort“ (die Zeile in der Oberfläche setzt
   oeffnenAbweisungText). Depot-Datei: tests/oeffnen-abweisung-nennt-grund.test.js. */
const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const a7Kennungen = () => FAELLE.filter((z) => z.art === 'interner-stand' && z.form === 'echt').map((z) => z.erwartet.abgewiesen);
const kennungenMitPasswortSatz = (V, kennungen) => kennungen.filter((code) => V.oeffnenAbweisungText({ code }) === V.STRINGS.entsperrPasswortFalsch);

test('[Import-Anzeige·A7] die Kennungen der echten Zeilen von interner-stand führen zu einem eigenen Satz', () => {
  const V = kern();
  assert.deepEqual(a7Kennungen(), ['krypto-fassung', 'datei-defekt']);
  assert.deepEqual(kennungenMitPasswortSatz(V, a7Kennungen()), []);
});

test('[Import-Anzeige·A7·Rot-Beweis] eine auf den Passwort-Satz umgelenkte Kennung fällt auf; ein Wurf ohne Kennung ergibt kein Ergebnis', async (t) => {
  const quelle = fs.readFileSync(KERN_PFAD, 'utf8');
  const umlenken = "if (code === 'krypto-fassung') return vorDepotText('dateiFassungUnbekannt');";
  const kennung = "beschädigt (kein gültiger Umschlag).'), { code: 'datei-defekt' })";
  assert.ok(quelle.includes(umlenken) && quelle.includes(kennung), 'die Stellen stehen im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-anzeige-a7-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const umgelenkt = path.join(dir, 'umgelenkt.html');
  fs.writeFileSync(umgelenkt, quelle.replace(umlenken, "if (code === 'krypto-fassung') return vorDepotText('entsperrPasswortFalsch');"));
  assert.deepEqual(kennungenMitPasswortSatz(ladeKern({ htmlPfad: umgelenkt, backen: true }).V, a7Kennungen()), ['krypto-fassung']);
  const ohne = path.join(dir, 'ohne-kennung.html');
  fs.writeFileSync(ohne, quelle.replace(kennung, "beschädigt (kein gültiger Umschlag).'), { zzProbe: 'datei-defekt' })"));
  assert.equal(await internerStandOeffnen('{ zz-probe kein Umschlag', { htmlPfad: ohne, backen: true }), null);
  assert.deepEqual(await internerStandOeffnen('{ zz-probe kein Umschlag'), { ok: false, grund: 'datei-defekt', verworfene: [] }, 'Gegenprobe am echten Kern');
  assert.equal(await wurfMitKennung(() => { throw new Error('whc:passt-nicht'); }, 'whc'), null, 'ein Wurf nur mit Freitext');
  assert.equal(await wurfMitKennung(() => 'geöffnet', 'whc'), null, 'ein Weg, der aufgeht, ist keine Abweisung');
});

/* 1 · Je Zeile ergibt das Modell das Erwartete. */
test('[Import-Anzeige·1] je Zeile der Tabelle ergibt importAnzeigeModell genau das Erwartete', async () => {
  const V = kernMitModell();
  const schief = [];
  for (const f of await faelleAufgeloest()) {
    if (f.fehler) { schief.push(titel(f.zeile) + ': die Zeile ließ sich nicht erzeugen: ' + f.fehler); continue; }
    const { modell, wurf } = modellVon(V, f);
    if (wurf) { schief.push(titel(f.zeile) + ': importAnzeigeModell wirft: ' + wurf); continue; }
    for (const a of modellAbweichungen(modell, f.erwartet)) schief.push(titel(f.zeile) + ': ' + a);
  }
  assert.deepEqual(schief, []);
});

test('[Import-Anzeige·1·Rot-Beweis] ein Modell, das einen verworfenen Teil auslässt oder den Grund vertauscht, fällt auf', () => {
  const erwartet = { angenommen: true, abgewiesen: null, zuNeu: false,
    verworfen: [{ was: 'ZZ-Probe-Teil', grund: 'zz-probe-grund' }, { was: null, grund: 'feld-kennung' }] };
  const richtig = { angenommen: 1, abgewiesen: null, zuNeu: false,
    verworfen: [{ was: '', grund: 'feld-kennung' }, { was: 'ZZ-Probe-Teil', grund: 'zz-probe-grund' }] };
  assert.deepEqual(modellAbweichungen(richtig, erwartet), [], 'die Reihenfolge ist gleichgültig, ein Eintrag ohne Namen zählt über den Grund');
  const gekuerzt = Object.assign({}, richtig, { verworfen: [richtig.verworfen[0]] });
  assert.equal(modellAbweichungen(gekuerzt, erwartet).length, 1, 'der ausgelassene Teil wird genannt');
  const vertauscht = Object.assign({}, richtig, { verworfen: [richtig.verworfen[0], { was: 'ZZ-Probe-Teil', grund: 'anderer-grund' }] });
  assert.equal(modellAbweichungen(vertauscht, erwartet).length, 2, 'ein falscher Grund fehlt einmal und ist einmal zu viel');
  assert.ok(modellAbweichungen(Object.assign({}, richtig, { zuNeu: true }), erwartet).length > 0);
  assert.ok(modellAbweichungen(Object.assign({}, richtig, { abgewiesen: 'irgendwas' }), erwartet).length > 0);
  assert.ok(modellAbweichungen(Object.assign({}, richtig, { angenommen: 0 }), erwartet).length > 0);
  assert.ok(modellAbweichungen(null, erwartet).length > 0);
});

/* 2 · Klasse. */
test('[Import-Anzeige·2·Klasse] jede Art aus IMPORT_ANZEIGE_ARTEN hat eine Zeile, und jede Art der Tabelle steht in der Liste', () => {
  const V = kernMitModell();
  const arten = artSchluessel(V.IMPORT_ANZEIGE_ARTEN);
  assert.ok(Array.isArray(arten) && arten.length > 0, FEHLT);
  assert.ok(Object.isFrozen(V.IMPORT_ANZEIGE_ARTEN), 'die Liste der Arten ist eingefroren');
  assert.deepEqual(klassenLuecken(arten, FAELLE), { ohneZeile: [], nichtInListe: [] },
    'ohneZeile: diese Importart hat keine Zeile in der Fall-Tabelle — sie braucht eine, bevor sie als gedeckt gilt. '
    + 'nichtInListe: die Tabelle nennt eine Art, die der Kern nicht kennt.');
});

test('[Import-Anzeige·2·Klasse·Rot-Beweis] eine Art ohne Zeile und eine achtzehnte Art werden genau benannt', () => {
  assert.deepEqual(klassenLuecken(ARTEN_LAUT_VERTRAG, FAELLE), { ohneZeile: [], nichtInListe: [] },
    'gegen die vereinbarten Arten ist die Tabelle vollständig');
  const ohneKdl = FAELLE.filter((z) => z.art !== 'kdl');
  assert.deepEqual(klassenLuecken(ARTEN_LAUT_VERTRAG, ohneKdl), { ohneZeile: ['kdl'], nichtInListe: [] },
    'nimmt man einer Art alle Zeilen weg, meldet die Prüfung genau diese Art');
  const achtzehn = ARTEN_LAUT_VERTRAG.concat(['zz-probe-achtzehnte-art']);
  assert.deepEqual(klassenLuecken(achtzehn, FAELLE), { ohneZeile: ['zz-probe-achtzehnte-art'], nichtInListe: [] },
    'eine neue Art in der Liste ist rot, bis sie eine Zeile hat');
  const fremd = FAELLE.concat([allgZuNeu('zz-probe-fremde-art', 'ok')]);
  assert.deepEqual(klassenLuecken(ARTEN_LAUT_VERTRAG, fremd).nichtInListe, ['zz-probe-fremde-art']);
});

/* 3 · „Zu neu“ je Art. */
test('[Import-Anzeige·3] je Art gibt es eine Zeile „zu neu“ mit eigenem Grund, oder die Art steht begründet in KEIN_ZU_NEU', async () => {
  const V = kernMitModell();
  const arten = artSchluessel(V.IMPORT_ANZEIGE_ARTEN) || [];
  assert.deepEqual(zuNeuLuecken(arten, FAELLE, KEIN_ZU_NEU), { ohneZuNeu: [], ausnahmeOhneGrund: [], ausnahmeUeberholt: [] });
  /* Eigener Grund: innerhalb einer Art ist der Grund für „zu neu“ keiner, mit dem eine
     gewöhnliche Abweisung derselben Art in der Tabelle steht. */
  const schief = [];
  const alle = await faelleAufgeloest();
  for (const f of alle) {
    if (!f.erwartet || f.erwartet.zuNeu !== true) continue;
    const gleich = alle.filter((g) => g.erwartet && g.zeile.art === f.zeile.art && g.erwartet.zuNeu === false
      && g.erwartet.abgewiesen === f.erwartet.abgewiesen);
    if (gleich.length) schief.push(titel(f.zeile) + ': der Grund ' + f.erwartet.abgewiesen + ' steht auch an einer gewöhnlichen Abweisung');
  }
  assert.deepEqual(schief, []);
});

test('[Import-Anzeige·3·Rot-Beweis] eine Art ohne Zeile „zu neu“ wird benannt; eine Ausnahme ohne Grund ebenso', () => {
  assert.deepEqual(zuNeuLuecken(ARTEN_LAUT_VERTRAG, FAELLE, KEIN_ZU_NEU), { ohneZuNeu: [], ausnahmeOhneGrund: [], ausnahmeUeberholt: [] });
  assert.deepEqual(zuNeuLuecken(ARTEN_LAUT_VERTRAG, FAELLE, {}).ohneZuNeu.slice().sort(), ['kdl', 'mappe-datei'],
    'ohne die Ausnahmen fehlen genau die zwei Arten, die dort stehen');
  const ohneAnfrageZuNeu = FAELLE.filter((z) => !(z.art === 'anfrage' && typeof z.erwartet === 'object' && z.erwartet.zuNeu));
  assert.deepEqual(zuNeuLuecken(ARTEN_LAUT_VERTRAG, ohneAnfrageZuNeu, KEIN_ZU_NEU).ohneZuNeu, ['anfrage']);
  assert.deepEqual(zuNeuLuecken(ARTEN_LAUT_VERTRAG, FAELLE, Object.assign({}, KEIN_ZU_NEU, { 'b16-migration': '' })).ausnahmeOhneGrund, ['b16-migration']);
  assert.deepEqual(zuNeuLuecken(ARTEN_LAUT_VERTRAG, FAELLE, Object.assign({}, KEIN_ZU_NEU, { modul: 'gepflanzt' })).ausnahmeUeberholt, ['modul'],
    'eine Ausnahme für eine Art, die eine Zeile „zu neu“ hat, ist überholt');
});

/* 4 · Nichts geht still verloren. */
test('[Import-Anzeige·4] das Modell nennt genau so viele verworfene Teile, wie das Ergebnis des Einlesers trägt, jeden mit Grund', async () => {
  const V = kernMitModell();
  const schief = [];
  let gemessen = 0;
  for (const f of await faelleAufgeloest()) {
    if (f.fehler) { schief.push(titel(f.zeile) + ': die Zeile ließ sich nicht erzeugen: ' + f.fehler); continue; }
    if (zahlVerworfenImErgebnis(f.ergebnis) === 0) continue;
    gemessen++;
    const { modell, wurf } = modellVon(V, f);
    if (wurf) { schief.push(titel(f.zeile) + ': importAnzeigeModell wirft: ' + wurf); continue; }
    for (const a of stilleVerluste(f.ergebnis, modell)) schief.push(titel(f.zeile) + ': ' + a);
  }
  assert.ok(gemessen >= ARTEN_LAUT_VERTRAG.length, 'die Probe hat je Art mindestens eine Zeile mit verworfenem Teil gemessen: ' + gemessen);
  assert.deepEqual(schief, []);
});

test('[Import-Anzeige·4·Rot-Beweis] ein von Hand gekürztes Modell und ein Eintrag ohne Grund fallen auf', () => {
  const ergebnis = { angenommen: true, grund: null, verworfene: [{ name: 'ZZ-Probe eins', grund: 'zz-probe-grund' }],
    defVerworfen: [{ name: 'ZZ-Probe zwei', grund: 'praefix' }], codeListenVerworfen: [{ name: 'zz-probe-drei', grund: 'doppelt' }] };
  assert.equal(zahlVerworfenImErgebnis(ergebnis), 3, 'gezählt wird über alle Felder, in denen ein Einleser Verworfenes nennt');
  const voll = { verworfen: [{ was: 'ZZ-Probe eins', grund: 'zz-probe-grund' }, { was: 'ZZ-Probe zwei', grund: 'praefix' }, { was: 'zz-probe-drei', grund: 'doppelt' }] };
  assert.deepEqual(stilleVerluste(ergebnis, voll), []);
  const gekuerzt = { verworfen: voll.verworfen.slice(0, 2) };
  assert.equal(stilleVerluste(ergebnis, gekuerzt).length, 1, 'ein fehlender Eintrag ist ein stiller Verlust');
  const ohneGrund = { verworfen: [voll.verworfen[0], voll.verworfen[1], { was: 'zz-probe-drei' }] };
  assert.equal(stilleVerluste(ergebnis, ohneGrund).length, 1, 'ein Eintrag ohne grund sagt nicht, warum');
  assert.equal(stilleVerluste(ergebnis, { verworfen: [] }).length, 1);
  assert.equal(stilleVerluste(ergebnis, null).length, 1);
});

/* 5 · Der Text. Kein Wortlaut wird festgehalten. */
test('[Import-Anzeige·5] der Text ist nicht leer, nennt jedes Verworfene, und „zu neu“ liest sich anders als eine gewöhnliche Abweisung', async () => {
  const V = kernMitModell();
  assert.equal(typeof V.importAnzeigeText, 'function', FEHLT);
  const schief = [];
  for (const f of await faelleAufgeloest()) {
    if (f.fehler) { schief.push(titel(f.zeile) + ': die Zeile ließ sich nicht erzeugen: ' + f.fehler); continue; }
    if (!f.erwartet.verworfen.length && f.erwartet.abgewiesen === null) continue;
    const { modell, wurf } = modellVon(V, f);
    if (wurf || !modell) { schief.push(titel(f.zeile) + ': kein Modell' + (wurf ? ' (' + wurf + ')' : '')); continue; }
    let text;
    try { text = V.importAnzeigeText(modell); }
    catch (e) { schief.push(titel(f.zeile) + ': importAnzeigeText wirft: ' + String((e && e.message) || e)); continue; }
    if (typeof text !== 'string' || !text.trim()) { schief.push(titel(f.zeile) + ': der Text ist leer'); continue; }
    for (const v of (Array.isArray(modell.verworfen) ? modell.verworfen : [])) {
      if (v && typeof v.was === 'string' && v.was.trim() && !text.includes(v.was)) {
        schief.push(titel(f.zeile) + ': der Text nennt das Verworfene nicht: ' + v.was);
      }
    }
    if (f.erwartet.zuNeu === true) {
      /* Dasselbe Modell als gewöhnliche Abweisung: nur `zuNeu` und der Grund sind anders. */
      const gewoehnlich = Object.assign({}, modell, { zuNeu: false, abgewiesen: 'zz-probe-anderer-grund' });
      let anders;
      try { anders = V.importAnzeigeText(gewoehnlich); }
      catch (e) { schief.push(titel(f.zeile) + ': importAnzeigeText wirft bei einem unbekannten Grund: ' + String((e && e.message) || e)); continue; }
      if (typeof anders !== 'string' || !anders.trim()) schief.push(titel(f.zeile) + ': eine Abweisung mit unbekanntem Grund ergibt keinen Text');
      if (anders === text) schief.push(titel(f.zeile) + ': „zu neu“ ergibt denselben Text wie eine gewöhnliche Abweisung');
    }
  }
  assert.deepEqual(schief, []);
});

/* 6 · Unbekannte Art. */
test('[Import-Anzeige·6] eine unbekannte Art wirft nicht und wird als art-unbekannt abgewiesen', () => {
  const V = kernMitModell();
  let m;
  assert.doesNotThrow(() => { m = V.importAnzeigeModell('zz-probe-keine-art', { ok: true, grund: null, verworfene: [] }); });
  assert.ok(m && typeof m === 'object', 'auch dann ein Modell-Objekt');
  assert.equal(m.abgewiesen, 'art-unbekannt');
  assert.doesNotThrow(() => { m = V.importAnzeigeModell(undefined, undefined); });
  assert.equal(m && m.abgewiesen, 'art-unbekannt', 'auch ganz ohne Angaben');
});

/* White Label (08.11.2026): der Satz zu einer fremden Endung nennt die Endung der Depot-Datei. Der Text im Textsatz trägt sie als
   `{endung}`, der Kern setzt sie ein; so steht die Wortmarke in keinem Text, den eine fremde Marke zeigt
   (tests/white-label-greift.test.js). Rot-Beweis: der frühere Wortlaut mit der Endung im Text fiele als Stelle außerhalb auf. */
test('[Import·Endung·White Label] der Text trägt keine Wortmarke, der Satz nennt die Endung trotzdem', () => {
  const W = require('../tools/white-label-greift-messen.js');
  const { V } = ladeKern();
  const k = 'strings:importGrundEndungUnbekannt.text';
  assert.ok(!/vivodepot/i.test(V.TEXTSATZ_DE_QUELLE.texte[k]), 'der deutsche Text trägt die Wortmarke nicht');
  assert.deepEqual(W.wortmarkeEinordnen([k]).ausserhalb, [k], 'Rot-Beweis: eine Wortmarke an dieser Kennung gälte als außerhalb');
  const ergebnis = V.dateiOeffnenMitPruefen({ name: 'zz-probe-foto.jpg' });
  const text = V.importAnzeigeText(V.importAnzeigeModell('datei-oeffnen-mit', ergebnis));
  assert.ok(text.includes('zz-probe-foto.jpg') && text.includes('.vivodepot') && !text.includes('{endung}'), 'der Satz: ' + text);
});
