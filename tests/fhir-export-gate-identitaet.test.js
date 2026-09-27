'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-107 — das Export-Gate deckt BEIDE IPS-Pflichtfelder der Identität
   ────────────────────────────────────────────────────────────────────────
   BEFUND (26.07.2026): `Patient.name` und `Patient.birthDate` sind beide min=1 in
   `Patient-uv-ips`. Für das Geburtsdatum gab es ein Export-Gate — die Bürgerin bekam
   eine Erklärung und die Möglichkeit zu ergänzen. Für den Namen gab es keins: sie bekam
   eine ungültige Datei und kein Wort. `depotHatNamen()` existierte, aber sein einziger
   Aufruf war das D37-Einmal-Banner „Depot ohne Namen".

   Zwei Pflichtfelder derselben Klasse, zwei völlig verschiedene Regeln — dieselbe
   Signatur wie die anderen Funde dieses Tages.

   Ein Depot OHNE Namen ist dabei kein Sonderfall, sondern ein vorgesehener Zustand:
   das Passwort-Modal hat kein Namensfeld, und das D37-Banner existiert genau deswegen.

   NIEDRIGSCHWELLIGKEIT BLEIBT: geprüft wird am EXPORT, nicht am Eintritt. Ein Depot
   ohne Namen lässt sich weiterhin anlegen und benutzen.

   Am offiziellen HL7-Validator 6.9.12 gemessen: Bundle mit Geburtsdatum und ohne Namen
   → UNGÜLTIG; dasselbe Depot mit Namen → gültig (Positivkontrolle). Der Registry-Fall
   `mit-geburtsdatum-ohne-namen` in tests/konformitaet/externe-validatoren.mjs hält das
   am echten Validator fest.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-107';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'u2-107-export-gate-deckt-name-und-geburtsdatum',
  'u2-107-vollstaendige-identitaet-wird-nicht-gegated',
  'u2-107-bei-zwei-luecken-nur-ein-hinweis',
];

/* Ein Depot in einen der vier Identitäts-Zustände bringen und den ECHTEN Bürgerinnen-Weg fahren.
   Kein Aufruf des Builders: gemessen wird der Weg, den ein Mensch geht — genau das war der Fehler
   im ersten Befund zu diesem Thema (der Builder wurde gemessen, nicht der Weg).

   GEMESSEN WIRD AM `ui.modal`-AUFRUF, nicht am DOM. Erste Fassung prüfte
   `#modal-rueck.classList.contains('an')` — im node-Harness setzt `ui.modal` diese Klasse nicht
   und schreibt auch keinen Text in den Host (der Primärknopf wird sehr wohl verdrahtet). Alle
   sechs Proben waren rot, obwohl der Bau stimmte: die Sonde war falsch, nicht der Code. Was der
   Flow ANFORDERT, ist ohnehin die tragfähigere Aussage — sie hängt nicht am Render-Verhalten. */
async function exportVersuch({ name, geburtsdatum }) {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  // `depotAnlegen(pw)` legt KEINEN Namen an — das ist der vorgesehene niedrigschwellige Zustand.
  const id = V.getData().sektoren.identity || (V.getData().sektoren.identity = {});
  if (name) { id.givenName = 'Maria'; id.familyName = 'Mustermann'; }
  else { delete id.givenName; delete id.familyName; }
  if (geburtsdatum) id.birthDate = '1950-03-14'; else delete id.birthDate;

  const rufe = [];
  V.ui.modal = (o) => { rufe.push(o); };
  V.flowSektorExport('fhir-ips');
  const text = rufe.map(r => String(r.titel || '') + ' ' + String(r.koerperHTML || '').replace(/<[^>]+>/g, ' '))
    .join(' ').replace(/\s+/g, ' ').trim();
  return { offen: rufe.length > 0, rufe: rufe.length, text, V };
}

/* ── Probe 1 · jede fehlende Pflicht wird abgefangen ──────────────────────── */
// Diskriminante: welcher Identitäts-Zustand lässt einen ungültigen Export durch?
function ungegateteLuecken(ergebnisse) {
  const durch = [];
  for (const e of ergebnisse) {
    if (e.mussGegated && !e.gegated) durch.push(e.name + ': Export lief OHNE Hinweis — ungültiges Bundle');
  }
  return durch;
}

test('u2-107-export-gate-deckt-name-und-geburtsdatum', async () => {
  const faelle = [
    { name: 'ohne Namen, mit Geburtsdatum', opt: { name: false, geburtsdatum: true },  mussGegated: true },
    { name: 'mit Namen, ohne Geburtsdatum', opt: { name: true,  geburtsdatum: false }, mussGegated: true },
    { name: 'ohne beides',                  opt: { name: false, geburtsdatum: false }, mussGegated: true },
  ];
  const ergebnisse = [];
  for (const f of faelle) {
    const r = await exportVersuch(f.opt);
    // Der Feld-Auswahl-Dialog ist KEIN Gate — er ist der normale Export-Weg. Unterschieden wird
    // am Titel: nur ein Identitäts-Hinweis zählt als abgefangen.
    const gegated = r.offen && /benötigt/.test(r.text);
    ergebnisse.push({ name: f.name, mussGegated: f.mussGegated, gegated, text: r.text.slice(0, 80) });
  }
  assert.equal(ergebnisse.length, 3, 'Positivkontrolle: alle drei Lücken-Zustände geprüft');
  assert.deepEqual(ungegateteLuecken(ergebnisse), [],
    'Jede fehlende IPS-Pflicht MUSS am Export abgefangen werden — sonst geht ein ungültiges '
    + 'Bundle hinaus, und die Bürgerin erfährt kein Wort davon');
});

test('[Negativprobe] u2-107-Probe-1: ohne Namens-Prüfung liefe der Export durch', async () => {
  // Der Zustand VOR dem 26.07. nachgestellt: nur das Geburtsdatum entscheidet.
  const r = await exportVersuch({ name: false, geburtsdatum: true });
  const nurGebDat = !r.V.depotHatGeburtsdatum();          // die alte, alleinige Bedingung
  assert.equal(nurGebDat, false,
    'die alte Bedingung war hier FALSCH-negativ: Geburtsdatum da, also hätte sie durchgelassen');
  assert.ok(r.offen && /benötigt/.test(r.text),
    'die NEUE Bedingung faengt denselben Fall ab — genau das ist der Unterschied');
});

/* ── Probe 2 · kein Über-Gaten ────────────────────────────────────────────── */
function ueberGatet(ergebnis) {
  const fehler = [];
  if (ergebnis.gegated) fehler.push('vollständige Identität wurde trotzdem abgefangen');
  return fehler;
}

test('u2-107-vollstaendige-identitaet-wird-nicht-gegated', async () => {
  const r = await exportVersuch({ name: true, geburtsdatum: true });
  const gegated = r.offen && /benötigt/.test(r.text);
  // Positivkontrolle des Messpunkts: die LUECKEN-Faelle loesen sehr wohl einen Hinweis aus —
  // sonst koennte „kein Hinweis" auch heissen, dass die Sonde nichts sieht.
  const lueckenfall = await exportVersuch({ name: false, geburtsdatum: true });
  assert.ok(lueckenfall.offen, 'Positivkontrolle: die Sonde sieht einen Hinweis, wenn es einen gibt');
  assert.deepEqual(ueberGatet({ gegated }), [],
    'sind beide Pflichtfelder da, darf NICHTS abgefangen werden — ein Gate, das immer feuert, '
    + 'ist eine Blockade');
});

/* ── Probe 3 · ein Hinweis, nicht zwei ────────────────────────────────────── */
/* Fehlen beide, wäre eine Absage nach der anderen zwei Absagen für eine Handlung.
   ZWEI Dinge, die auseinandergehalten gehören — die erste Fassung vermengte sie und war rot,
   obwohl der Bau stimmte: sie zählte das Wort „benötigt" und fand es zweimal, weil es im TITEL
   und im TEXT desselben Dialogs steht. Die Anzahl der Dialoge ist `rufe`, nicht die Wortzahl. */
function hinweisMaengel({ text, rufe }) {
  const fehler = [];
  if (rufe !== 1) fehler.push(rufe + ' Dialoge statt einem — zwei Absagen fuer eine Handlung');
  if (!/Name und Geburtsdatum/.test(text)) fehler.push('der EINE Hinweis benennt nicht beide Lücken');
  return fehler;
}

test('u2-107-bei-zwei-luecken-nur-ein-hinweis', async () => {
  const r = await exportVersuch({ name: false, geburtsdatum: false });
  assert.ok(r.offen, 'Positivkontrolle: ein Hinweis erscheint ueberhaupt');
  assert.deepEqual(hinweisMaengel(r), [],
    'fehlen beide Pflichtfelder, kommt EIN Hinweis, der beide benennt — nicht zwei hintereinander');
});

test('[Negativprobe] u2-107-Probe-3: der Einzel-Text wuerde die zweite Luecke verschweigen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  // Positivkontrolle des Messpunkts: der kombinierte Text besteht, die Einzeltexte nicht.
  const alsFall = (t) => ({ text: t, rufe: 1 });
  assert.deepEqual(hinweisMaengel(alsFall(V.STRINGS.fhirIdentitaetTitel + ' ' + V.STRINGS.fhirIdentitaetText)), [],
    'Positivkontrolle: der kombinierte Text besteht');
  assert.ok(hinweisMaengel(alsFall(V.STRINGS.fhirNameTitel + ' ' + V.STRINGS.fhirNameText)).length > 0,
    'der reine Namens-Text darf den Zwei-Luecken-Fall NICHT bestehen — sonst prueft Probe 3 nichts');
  assert.ok(hinweisMaengel(alsFall(V.STRINGS.fhirGeburtsdatumTitel + ' ' + V.STRINGS.fhirGeburtsdatumText)).length > 0);
  // Und die Dialog-Zahl allein muss ebenfalls greifen.
  assert.ok(hinweisMaengel({ text: V.STRINGS.fhirIdentitaetText, rufe: 2 }).length > 0,
    'zwei Dialoge muessen auffallen, auch wenn der Text stimmt');
});

/* ── Nachzug (U2-ADR-111): kein Buergerinnen-Weg erreicht den Builder am Gate vorbei ──
   Gemessen am 26.07.: `fhirIpsBundle` hat drei Aufrufer, aber nur EIN Weg ist fuer eine
   Buergerin erreichbar — der Herausgeben-Chooser ueber `flowSektorExport`, und der Dispatcher
   leitet `fhir-ips` AUSDRUECKLICH am generischen Registry-Weg vorbei ins Gate.
   Der Registry-Eintrag selbst (`def.baue`) erreicht den Builder UNGEGATET; heute geht dort kein
   Buergerinnen-Weg entlang. Diese Probe haelt genau das fest — haengt jemand spaeter eine
   Oberflaeche an `kernAPI.exportiere('fhir-ips')`, wird sie rot. Solange niemand das tut, ist es
   harmlos; und genau deshalb ist es billig, es JETZT festzunageln statt es spaeter zu entdecken. */
test('u2-111-kein-buergerinnen-weg-erreicht-den-builder-am-gate-vorbei', () => {
  const fs = require('node:fs'), path = require('node:path');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  // Der Dispatcher MUSS fhir-ips vom generischen Registry-Weg ausnehmen.
  // Glied 7 (18.08.2026): der Punkt-Zugriff wurde zu `exportFormatFuerId(format)`, damit auch
  // eingelassene Format-Kanäle (U2-ADR-146) über EINE Auflösung laufen. Die Ausnahme für
  // `fhir-ips` ist unverändert — sie ist der Gegenstand dieser Probe, nicht die Schreibweise.
  assert.match(quelle, /exportFormatFuerId\(format\) && format !== 'fhir-ips'/,
    'flowSektorExport nimmt `fhir-ips` vom generischen Registry-Weg aus — sonst liefe der '
    + 'Buergerinnen-Weg am Gate vorbei');
  assert.match(quelle, /if \(format === 'fhir-ips'\) return flowGesundheitFhirExport\(\)/,
    'und leitet ihn in den gegateten Flow');
  // Und die DOM-Griffe fuer einen FHIR-Export gehen ueber genau diesen Dispatcher.
  assert.match(quelle, /data-h-format/, 'der Chooser-Griff existiert');
  assert.match(quelle, /flowSektorExport\(b\.getAttribute\('data-h-format'\)\)/,
    'und ist an den Dispatcher verdrahtet — es gibt keinen zweiten Griff daneben');
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-107 nennt diese drei Pruefungen', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099) ─────────────────────────────────────── */
module.exports = {
  PROBEN: [
    { fuer: 'u2-107-export-gate-deckt-name-und-geburtsdatum',      diskriminante: ungegateteLuecken },
    { fuer: 'u2-107-vollstaendige-identitaet-wird-nicht-gegated',  diskriminante: ueberGatet },
    { fuer: 'u2-107-bei-zwei-luecken-nur-ein-hinweis',             diskriminante: hinweisMaengel },
  ],
};
