#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   kern-lese-zwilling-pruefen.js — rund 35 handkopierte Funktionen/Konstanten
   ────────────────────────────────────────────────────────────────────────────
   ANLASS (17.09.2026, im Zuge des Sicherheitsfunds R4-1): die Lese-App
   führt rund 35 Stellen aus dem Kern als HANDKOPIE — gepflegt per Kommentar
   ("Wortgleicher/wörtlicher Spiegel des Kerns"), nicht per Werkzeug. Der
   escapeHTML-Zwilling ist innerhalb eines Tages auseinandergelaufen
   (tools/escape-drift-pruefen.js, 17.09.2026) — kein Einzelfall, sondern die
   Vorhersage für die übrigen.

   GEMESSEN, NICHT GERATEN: 20 der Fundstellen wurden einzeln nachgesehen
   (Signaturen in beiden Dateien verglichen). Drei Formen kommen wieder:

     1. KONSTANTE   — ein eingefrorener Literal, in beiden Dateien identisch
                       sein soll. Von den geprüften Kandidaten trägt HEUTE
                       keiner einen echten Kern-Zwilling (s. Fall e) — die
                       Form bleibt im Werkzeug, die Liste ist bewusst leer,
                       nicht vergessen.
     2. NULLSTELLIG  — liest global `data` (nach `setData()`), kein Argument
                       (z. B. _bankvollmachtRecords/-Lesen, _kiHatDaten/-Lesen).
     3. EINFACHER-STRING — ein String/primitiver Wert rein, ein Wert raus,
                       keine Fixture nötig (z. B. _datumDeutsch, escapeHTML —
                       Vorbild tools/escape-drift-pruefen.js).

   Diese drei Formen deckt DIESES Werkzeug generisch ab: ein Paar eintragen
   (Name in der Lese-App, Name im Kern — meist derselbe, manchmal ohne das
   "Lesen"-Suffix), fertig. Kein Test pro Zwilling, keine Fixture-Datei.

   WAS NICHT GENERISCH GEHT, gemessen an denselben 20 Fundstellen — fünf
   Fälle, keiner passt in die drei Formen oben, jeder aus einem anderen Grund:

   a) OBJEKT-ARGUMENT mit Bedeutung (identitaetAnzeigename(quelle),
      _modulHerkunftBehauptung(m), _templateSektionenPruefenLesen(bereichId,
      roh, verworfene)): das Argument ist kein Wert aus einem Korpus, sondern
      ein Depot-Auszug mit Feldern, die der Aufrufer verstehen muss, um ihn
      sinnvoll zu füllen. Ein generischer Lauf bräuchte für jede Stelle eine
      eigene, semantisch richtige Beispiel-Instanz — das IST die Handarbeit,
      nur verschoben.
   b) FRAGMENT STATT FUNKTION (_textsatzKennungEingebautLesen — Spiegel von
      "Kerns ERSTER PRÜF-BEDINGUNG in _textsatzTexteUebernehmen", nicht der
      ganzen Funktion; ebenso der crossRef-Eintrag in situationModell): der
      Zwilling ist eine Zeile oder Bedingung INNERHALB einer größeren Funktion,
      kein eigener Name zum Aufrufen. Vergleichbar nur, wenn die GANZE
      umgebende Funktion (hier: situationModell selbst) unter Nr. 3/a läuft —
      das Fragment selbst bleibt unsichtbar für jedes Werkzeug.
   c) NAMENSKONVENTION TRÜGT (_codeListeLabelLesen): im Kern NICHT ohne
      "Lesen"-Suffix zu finden (umbenannt von `_erbscheinFeldLabel`, aber der
      NEUE Name trägt "Lesen" schon im Kern selbst). Ein Werkzeug, das blind
      "Lesen" abschneidet und nachschlägt, verpasst dieses Paar (falsches
      Negativ) — nur der Kommentar ("Spiegel von `X`") nennt den echten Namen
      zuverlässig, und der steht nicht überall in Anführungszeichen.
   d) ASYMMETRISCHE KRYPTO IST KEIN ZWILLING, SONDERN EIN BEWUSSTER
      UNTERSCHIED (leseDepotUmschlag als "read-only Spiegel von depotLaden",
      depotMasterHkdfKey als Spiegel von subDepotEntsiegeln): die Lese-App
      bildet ABSICHTLICH nur den LESE-Pfad eines Kern-Vorgangs nach, der im
      Kern auch schreibt — sie kann und soll nicht schreiben. Gleichheit wäre
      nur über abgeleitete Schlüssel-Bytes bei gleichem Passwort/Salt zu
      prüfen (WebCrypto, async, Key-Export) und bräuchte einen eigenen,
      vierten Vergleichsweg. DOKUMENTIERT statt bewacht, mit Absicht: ein
      Wächter hier würde eine Grenze bewachen, die eine Entscheidung ist,
      keine Nachlässigkeit — genau der Fehler, den dieser Kopf-Kommentar
      vermeiden soll.
   e) DIE BEIDEN TEST-HARNISCHE SELBST ZIEHEN NICHT GLEICH HOCH
      (_bereichLabelTextLesen/_bereichLabelText, Form 3 nach Signatur, beim
      Bau DIESES Werkzeugs gemessen): beide lesen `textLesen(id + '.label')`
      aus dem AKTIVEN Textsatz-Modul — aber `ladeKern()` (tests/load-kern.js)
      und `ladeLesen()` (tests/load-lesen.js) initialisieren diesen Zustand
      NICHT gleich. `ladeKern()` liefert 'identity.label' sofort, `ladeLesen()`
      erst nach einer Einrichtung (vermutlich ein setData/Depot-Anlegen, s.
      dort), die dieses Werkzeug nicht selbst nachbaut. Ein blinder Lauf hätte
      hier eine Abweichung gemeldet, die keine ist — der Fund steht deshalb
      hier und nicht als PAARE-Eintrag mit falschem Alarm.

   FOLGE: dieses Werkzeug ersetzt nicht alle ~35 Einzelproben. Es macht die
   FORM-1/2/3-Paare, bei denen weder Fall a-e zuschlägt (nach Stichprobe: 6
   von 20 gemessenen sofort — der Rest der 20 braucht noch Einzelprüfung wie
   die fünf Fälle oben, und die übrigen ~15 der ~35 sind noch gar nicht
   angesehen), mit einer Zeile PAARE-Eintrag prüfbar. Das ist die Landkarte,
   die der Auftrag verlangt hat: eine ehrliche Zahl statt einer geschätzten.

   Aufruf:
     node tools/kern-lese-zwilling-pruefen.js            (Bericht, Exit 1 bei Drift)
   ════════════════════════════════════════════════════════════════════════════ */

/* Ein kleiner, repräsentativer String-Korpus je Funktionsart — kein Codepoint-
   Sweep wie bei escapeHTML (das ist bereits Form 3, aber sein Korpus ist ganz
   anders als das einer Datumsfunktion). Wer eine neue Form-3-Stelle einträgt,
   liefert ihren eigenen Korpus mit — genau EINE Zeile, kein Test. */
const DATUM_KORPUS = [
  '2026-09-17', '2026-01-01', '2026-12-31', '2024-02-29', '1900-01-01',
  '', null, undefined, 'nicht-iso', '2026-13-40', '2026-09-17T10:00:00Z',
];
const STRING_KORPUS_ALLGEMEIN = [
  '', 'a', 'Ä ö ü ß', 'a"b', "a'b", 'a<b>c', 'a&b', 'a\nb', ' ', null, undefined,
];

/* PAARE: Form 1 (konstante), 2 (nullstellig), 3 (einfacher-string). Jedes
   Objekt trägt `lese` (Name in vivodepot-lesen.html) und optional `kern`
   (Name in vivodepot.html, falls abweichend vom `Lesen`-Namen). */
/* INSTRUMENT_ZEILE_OPTIONEN_LESEN gehört NICHT hierher, trotz "Wortgleicher Spiegel des Kerns"
   im Kopfkommentar an Ort und Stelle: der Kern hat keinen benannten Zwilling dazu — geprüft,
   nicht angenommen (grep über den ganzen Kern findet nur INSTRUMENT_ZEILE_PRAEFIX, keine
   ...OPTIONEN-Konstante). Der Lese-App-Kommentar selbst sagt warum: "Optionen hier statt am
   Gate" — der Kern hat ein Wizard-Gate, das denselben Wert INLINE trägt, nicht als eigene,
   nachschlagbare Konstante. Eine Positivliste-Suche nach dem Namen geht hier ins Leere, nicht
   weil die Konvention bricht (Fall c oben), sondern weil es keinen Vergleichspartner gibt.
   Aufgenommen als eigener Fund unter "was nicht generisch geht", nicht als Werkzeug-Eintrag. */
const KONSTANTEN = [];

const NULLSTELLIG = [
  { lese: '_bankvollmachtRecordsLesen', kern: '_bankvollmachtRecords' },
  { lese: '_kiHatDatenLesen', kern: '_kiHatDaten' },
  { lese: '_markeDomain', kern: '_markeDomain' },
  { lese: 'textsatzRegeln', kern: 'textsatzRegeln' },
];

const EINFACHER_STRING = [
  { lese: '_datumDeutsch', kern: '_datumDeutsch', korpus: DATUM_KORPUS },
  { lese: 'feldSensibelUeberschreibung', kern: 'feldSensibelUeberschreibung',
    // zwei Argumente (sektorId, feldId) — Korpus als Paare, kein Fixture-Depot nötig,
    // weil die Funktion nur auf der FELD-DEFINITION prüft, nicht auf eingetragenen Daten.
    korpusPaare: [['identity', 'givenName'], ['finance', 'accounts'], ['nichtvorhanden', 'nichtvorhanden'], [null, null]] },
  /* _bereichLabelTextLesen/_bereichLabelText ABSICHTLICH NICHT eingetragen — gemessen, nicht
     übersehen: beide lesen `textLesen(bereichId + '.label')` aus dem AKTIVEN Textsatz-Modul,
     aber `ladeKern()` und `ladeLesen()` (die beiden Test-Harnische) initialisieren diesen
     Zustand NICHT gleich — `ladeKern()` liefert 'identity.label' sofort, `ladeLesen()` erst
     nach einer Einrichtung, die diesem Werkzeug fehlt. Ein Lauf ohne diese Einrichtung meldet
     einen Unterschied, der keiner ist (Fund am 17.09. beim Bau dieses Werkzeugs selbst). EIN
     FÜNFTER FALL für "was nicht generisch geht": Funktionsform passt (Form 3), aber der
     GETEILTE Testaufbau selbst zieht die beiden Seiten nicht gleich hoch. */
];

function ladenPaar(K, L, eintrag) {
  const kernName = eintrag.kern || eintrag.lese;
  return { kernFn: K[kernName], leseFn: L[eintrag.lese], kernName };
}

function vergleicheKonstante(K, L, eintrag, fehler) {
  const { kernFn: kernWert, leseFn: leseWert, kernName } = ladenPaar(K, L, eintrag);
  if (kernWert === undefined || leseWert === undefined) {
    fehler.push(eintrag.lese + ': fehlt in ' + (kernWert === undefined ? 'Kern (' + kernName + ')' : 'Lese-App') + ' — kann nicht vergleichen.');
    return;
  }
  const k = JSON.stringify(kernWert), l = JSON.stringify(leseWert);
  if (k !== l) fehler.push(eintrag.lese + ': Konstante weicht ab.\n  Kern:     ' + k + '\n  Lese-App: ' + l);
}

function vergleicheNullstellig(K, L, eintrag, fehler) {
  const { kernFn, leseFn, kernName } = ladenPaar(K, L, eintrag);
  if (typeof kernFn !== 'function' || typeof leseFn !== 'function') {
    fehler.push(eintrag.lese + ': fehlt in ' + (typeof kernFn !== 'function' ? 'Kern (' + kernName + ')' : 'Lese-App') + ' — kann nicht vergleichen.');
    return;
  }
  if (kernFn.length !== leseFn.length) {
    fehler.push(eintrag.lese + ': Stelligkeit weicht ab — Kern ' + kernFn.length + ', Lese-App ' + leseFn.length + '.');
  }
  let kernAus, leseAus, kernWirft = false, leseWirft = false;
  try { kernAus = kernFn(); } catch (e) { kernWirft = true; kernAus = '<wurf: ' + e.message + '>'; }
  try { leseAus = leseFn(); } catch (e) { leseWirft = true; leseAus = '<wurf: ' + e.message + '>'; }
  const kJson = JSON.stringify(kernAus), lJson = JSON.stringify(leseAus);
  if (kernWirft !== leseWirft || kJson !== lJson) {
    fehler.push(eintrag.lese + '(): Ausgabe weicht ab.\n  Kern:     ' + kJson + '\n  Lese-App: ' + lJson);
  }
}

function vergleicheEinfacherString(K, L, eintrag, fehler) {
  const { kernFn, leseFn, kernName } = ladenPaar(K, L, eintrag);
  if (typeof kernFn !== 'function' || typeof leseFn !== 'function') {
    fehler.push(eintrag.lese + ': fehlt in ' + (typeof kernFn !== 'function' ? 'Kern (' + kernName + ')' : 'Lese-App') + ' — kann nicht vergleichen.');
    return;
  }
  const proben = eintrag.korpusPaare
    ? eintrag.korpusPaare.map((p) => ({ args: p }))
    : (eintrag.korpus || STRING_KORPUS_ALLGEMEIN).map((s) => ({ args: [s] }));
  const abweichungen = [];
  for (const { args } of proben) {
    let kernAus, leseAus, kernWirft = false, leseWirft = false;
    try { kernAus = kernFn(...args); } catch (e) { kernWirft = true; kernAus = '<wurf: ' + e.message + '>'; }
    try { leseAus = leseFn(...args); } catch (e) { leseWirft = true; leseAus = '<wurf: ' + e.message + '>'; }
    const kJson = JSON.stringify(kernAus), lJson = JSON.stringify(leseAus);
    if (kernWirft !== leseWirft || kJson !== lJson) {
      abweichungen.push('  Eingabe ' + JSON.stringify(args) + ' — Kern: ' + kJson + ', Lese-App: ' + lJson);
    }
  }
  if (abweichungen.length) {
    fehler.push(eintrag.lese + '(): ' + abweichungen.length + ' von ' + proben.length + ' Proben weichen ab:\n' + abweichungen.join('\n'));
  }
}

function main() {
  const { ladeKern } = require('../tests/load-kern.js');
  const { ladeLesen } = require('../tests/load-lesen.js');
  const { V: K } = ladeKern();
  const { V: L } = ladeLesen();

  const fehler = [];
  for (const e of KONSTANTEN) vergleicheKonstante(K, L, e, fehler);
  for (const e of NULLSTELLIG) vergleicheNullstellig(K, L, e, fehler);
  for (const e of EINFACHER_STRING) vergleicheEinfacherString(K, L, e, fehler);

  const gesamt = KONSTANTEN.length + NULLSTELLIG.length + EINFACHER_STRING.length;
  if (fehler.length) {
    console.error('kern-lese-zwilling-pruefen: ' + fehler.length + ' von ' + gesamt + ' geprüften Paaren weichen ab:');
    for (const f of fehler) console.error('  ' + f.split('\n').join('\n  '));
    return 1;
  }
  console.log('kern-lese-zwilling-pruefen: ' + gesamt + ' Paare geprüft (Form 1/2/3), keine Abweichung.');
  return 0;
}

module.exports = { KONSTANTEN, NULLSTELLIG, EINFACHER_STRING, vergleicheKonstante, vergleicheNullstellig, vergleicheEinfacherString };
if (require.main === module) process.exit(main());
