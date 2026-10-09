#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   format-korpus-erzeugen.js — Testkorpus für das .vivodepot-Format (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Schreibt docs/format/korpus/*.vivodepot und korpus.json. Jede GÜLTIGE Datei
   schreibt der echte Kern (tests/load-kern.js, depotSerialisieren &Co.). Jede
   UNGÜLTIGE entsteht aus einer gültigen durch einen benannten Eingriff; wo der
   Eingriff neu verschlüsseln muss, tut er es mit den Krypto-Funktionen des Kerns
   (VdCrypto), nie mit eigenem Code.

   Das ERWARTETE Urteil steht hier, von Hand, je Fall — es wird nicht aus dem
   Prüfprogramm übernommen, sonst prüfte der Korpus nichts. Das Verhalten des
   KERNS je Fall (öffnet / lehnt ab / warnt) misst der Erzeuger dagegen am Kern
   und schreibt es ins Manifest; tests/format-spezifikation-kern.test.js misst es
   bei jedem Lauf nach.

   Alle Inhalte sind erfunden. Die Passwörter sind ÖFFENTLICHE Testpasswörter
   (Präfix „korpus-test-“), absichtlich offen im Manifest; sie gehören zu keinem
   echten Depot und dürfen nie eines schützen (Probe: kein Vorkommen außerhalb
   von docs/format/korpus/).

   Die Chiffrate sind Zufall. Trägt eine Zeile zufällig eine Zeichenfolge, die ein Prüfer des Repos als internes
   Kürzel liest, wird genau dieser Fall neu erzeugt (`--nur`); das Urteil des Falls ändert sich dadurch nicht.

   Aufruf: node tools/format-korpus-erzeugen.js [--ziel <ordner>] [--nur <datei>[,<datei>…]]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('../tests/load-kern.js');

const ZIEL_STANDARD = path.join(__dirname, '..', 'docs', 'format', 'korpus');
const PW = 'korpus-test-inhaberin';
const PW_FACH = 'korpus-test-fach';
const PW_FALSCH = 'korpus-test-falsch';
const HEUTE = '2026-10-05';   // Stichtag für abgelaufene Fächer; der Korpus bleibt damit reproduzierbar beurteilbar

const KOPF = 'VIVODEPOT' + String.fromCharCode(1);
const mitKopf = (u) => KOPF + JSON.stringify(u, null, 1);
const kopie = (u) => JSON.parse(JSON.stringify(u));

async function grunddepot(V, { fach = false, giltBis = null, kreisName = 'Beispielkreis' } = {}) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Erika');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'birthDate', '1964-08-12');
  V.sektorFeldSetzen('health', 'bloodType', '0+');
  if (fach) {
    V.getData().angehoerigen_passwort_ort = 'Ordner im Bücherregal';
    await V.empfaengerkreisSetzen({ name: kreisName, bausteine: ['notfall'] });
    await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH, 'Ordner im Bücherregal', giltBis || undefined);
  }
}

// Ein frischer Kern, die Datei mit dem Inhaberinnen-Passwort geöffnet: danach liefert VdCrypto die Schlüssel dieser Datei.
async function offeneSitzung(u) {
  const { V } = ladeKern();
  await V.depotLaden(kopie(u), PW);
  const anker = await V.VdCrypto.depotSchluessel(V.base64ToBytes(u.depotSalt), u.depotUUID);
  return { V, anker };
}
// Ersetzt die Einheit an `adresse` durch `wert` (neuer Inhaltsschlüssel, im Anker-Eintrag gewickelt). Nur Dateien ohne Fach.
async function einheitErsetzen(u, adresse, wert) {
  const { V, anker } = await offeneSitzung(u);
  const aad = V.VdCrypto.aadEinheit(u.depotUUID, adresse);
  const { key, roh } = await V.VdCrypto.einheitSchluessel();
  u.einheiten[adresse] = await V.VdCrypto.encryptDepot(V._einheitAufgefuellt(wert), key, aad);   // aufgefüllt wie im Kern
  u.umschlagTabelle[0].umschlaege[adresse] = await V.VdCrypto.schluesselWickeln(roh, anker, aad);
}
async function einheitLesen(u, adresse) {
  const { V, anker } = await offeneSitzung(u);
  const aad = V.VdCrypto.aadEinheit(u.depotUUID, adresse);
  const k = await V.VdCrypto.schluesselEntwickeln(u.umschlagTabelle[0].umschlaege[adresse], anker, aad);
  return V.VdCrypto.decryptDepot(u.einheiten[adresse], k, aad);
}
async function geheimErsetzen(u, i, wert) {
  const { V, anker } = await offeneSitzung(u);
  u.umschlagTabelle[i].geheim = await V.VdCrypto.encryptDepot(wert, anker, V.VdCrypto.aadEinheit(u.depotUUID, u.umschlagTabelle[i].kennung));
}
async function adresseVon(u, name) {
  for (const a of Object.keys(u.einheiten)) if ((await einheitLesen(u, a)).name === name) return a;
  throw new Error('keine Einheit ' + name);
}

/* Die Fälle. `erwartet` ist von Hand gesetzt. `strenger` nennt, warum das Prüfprogramm hier strenger urteilt als der
   Kern, der zugunsten alter Dateien mehr öffnet, als das Format verlangt. */
const FAELLE = [
  { datei: 'g01-v4-mit-kopf.vivodepot', beschreibung: 'Gültig: kryptoVersion 4 mit Dateikopf, wie die Anwendung heute schreibt.',
    passwort: PW, erwartet: { urteil: 'gueltig', codes: [] },
    bauen: async (V) => { await grunddepot(V); return mitKopf(await V.depotSerialisieren()); } },
  { datei: 'g02-v4-ohne-kopf.vivodepot', beschreibung: 'Gültig mit Hinweis: Altdatei ohne Dateikopf (vor U2-ADR-043).',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-OHNE-KOPF'] },
    bauen: async (V) => { await grunddepot(V); return JSON.stringify(await V.depotSerialisieren(), null, 1); } },
  { datei: 'g03-v3.vivodepot', beschreibung: 'Gültig: kryptoVersion 3, ein einzelner verschlüsselter Block.',
    passwort: PW, erwartet: { urteil: 'gueltig', codes: [] },
    bauen: async (V) => { await grunddepot(V); return mitKopf(await V.depotSerialisierenV3()); } },
  { datei: 'g04-fach-inhaberin.vivodepot', beschreibung: 'Gültig: Datei mit einem Fach, geöffnet mit dem Passwort der Inhaberin.',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-ATTRAPPE'] },
    bauen: async (V) => { await grunddepot(V, { fach: true }); return mitKopf(await V.depotSerialisieren()); } },
  { datei: 'g05-fach-empfaenger.vivodepot', beschreibung: 'Gültig: dieselbe Form, geöffnet mit dem Passwort des Fachs (nur dessen Ausschnitt).',
    passwort: PW_FACH, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-ATTRAPPE'] },
    bauen: async (V) => { await grunddepot(V, { fach: true }); return mitKopf(await V.depotSerialisieren()); } },
  { datei: 'g06-wiederherstellung.vivodepot', beschreibung: 'Gültig: mit Hülle für den Wiederherstellungs-Code (U2-ADR-430). Der Code selbst ist nicht beigelegt; die Hülle wird nur auf Form geprüft.',
    passwort: PW, erwartet: { urteil: 'gueltig', codes: [] },
    bauen: async (V) => { await grunddepot(V); await V.whcHuelleWickeln(PW, V.whcCodeErzeugen().slice(0, V.WHC_STELLEN)); return mitKopf(await V.depotSerialisieren()); } },
  { datei: 'g07-blackbox.vivodepot', beschreibung: 'Gültig mit Hinweisen: Blackbox-Hülle um den Umschlag (U2-ADR-124), ohne Dateikopf, wie die Anwendung sie beim Herausgeben eines Teil-Depots schreibt.',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-BLACKBOX-HUELLE', 'VDF-OHNE-KOPF'] },
    bauen: async (V) => { await grunddepot(V); return JSON.stringify(V.blackboxDateiAusUmschlag(await V.depotSerialisieren()), null, 1); } },
  { datei: 'g08-schema-neuer.vivodepot', beschreibung: 'Gültig mit Hinweis: Inhalt einer neueren Schemastufe, nur lesbar.',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-SCHEMA-NEUER'] },
    bauen: async (V) => { await grunddepot(V); V.getData().schemaVersion = V.SCHEMA_VERSION_AKTUELL + 1; return mitKopf(await V.depotSerialisieren()); } },
  { datei: 'g09-feld-unbekannt.vivodepot', beschreibung: 'Gültig mit Hinweis: eine Feldkennung, die nicht im Feldregister steht.',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-FELD-UNBEKANNT'] },
    bauen: async (V) => { await grunddepot(V); V.getData().sektoren.identity.korpusBeispielFeld = 'frei erfunden'; return mitKopf(await V.depotSerialisieren()); } },
  { datei: 'g10-fremdfeld.vivodepot', beschreibung: 'Gültig mit Hinweisen: nachträglich eingefügtes Klartextfeld außerhalb der Basismenge; die Bindung meldet es.',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-FREMDFELD', 'VDF-BINDUNG-FREMD'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); u.korpusZusatz = 'eingefügt'; return mitKopf(u); } },
  { datei: 'g11-ort-veraendert.vivodepot', beschreibung: 'Gültig mit Hinweis: der Ort-Hinweis im Klartext wurde verändert.',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-ATTRAPPE', 'VDF-BINDUNG-ORT'] },
    bauen: async (V) => { await grunddepot(V, { fach: true }); const u = await V.depotSerialisieren(); u.angehoerigenOrt = 'Schublade im Keller'; return mitKopf(u); } },
  { datei: 'g12-adresse-name.vivodepot', beschreibung: 'Gültig mit Hinweis: eine Einheit trägt einen anderen Namen als ihre Adresse.',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-ADRESSE-NAME'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); const a = await adresseVon(u, 'identity.birthDate');
      await einheitErsetzen(u, a, { name: 'identity.familyName', wert: 'Beispiel' }); return mitKopf(u); } },
  { datei: 'g13-polster-ungleich.vivodepot', beschreibung: 'Gültig mit Hinweis: der Geheimteil des Ankers ist kürzer als der des Fachs.',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-ATTRAPPE', 'VDF-POLSTER'] },
    bauen: async (V) => { await grunddepot(V, { fach: true }); const u = await V.depotSerialisieren();
      const { V: V2, anker } = await offeneSitzung(u);
      const g = await V2.VdCrypto.decryptDepot(u.umschlagTabelle[0].geheim, anker, V2.VdCrypto.aadEinheit(u.depotUUID, u.umschlagTabelle[0].kennung));
      delete g.polster; await geheimErsetzen(u, 0, g); return mitKopf(u); } },

  { datei: 'g14-kreisname-umlaut.vivodepot', beschreibung: 'Gültig mit Hinweisen: ein Fach, dessen Kreisname einen Umlaut trägt; der Geheimteil des Fachs ist länger als der des Ankers.',
    passwort: PW, erwartet: { urteil: 'gueltig-mit-hinweisen', codes: ['VDF-ATTRAPPE', 'VDF-POLSTER'] },
    bauen: async (V) => { await grunddepot(V, { fach: true, kreisName: 'Tante B\u00e4rbel' }); return mitKopf(await V.depotSerialisieren()); } },

  { datei: 'n01-ohne-passwort.vivodepot', beschreibung: 'Nicht vollständig geprüft: ohne Passwort endet die Prüfung nach Stufe 1.',
    passwort: null, erwartet: { urteil: 'nicht-geprueft', codes: [] },
    bauen: async (V) => { await grunddepot(V); return mitKopf(await V.depotSerialisieren()); } },
  { datei: 'n02-falsches-passwort.vivodepot', beschreibung: 'Nicht vollständig geprüft: das Passwort passt nicht. Das ist kein Urteil über die Datei.',
    passwort: PW_FALSCH, erwartet: { urteil: 'nicht-geprueft', codes: ['VDF-PASSWORT'] },
    bauen: async (V) => { await grunddepot(V); return mitKopf(await V.depotSerialisieren()); } },
  { datei: 'n03-fach-abgelaufen.vivodepot', beschreibung: 'Nicht vollständig geprüft: das Fach ist abgelaufen (U2-ADR-452).',
    passwort: PW_FACH, erwartet: { urteil: 'nicht-geprueft', codes: ['VDF-ATTRAPPE', 'VDF-FACH-ABGELAUFEN'] },
    bauen: async (V) => { await grunddepot(V, { fach: true, giltBis: '2026-01-31' }); return mitKopf(await V.depotSerialisieren()); } },

  { datei: 'u01-kein-json.vivodepot', beschreibung: 'Ungültig: nach dem Kopf folgt abgeschnittenes JSON.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-KEIN-JSON'] },
    bauen: async (V) => { await grunddepot(V); const t = mitKopf(await V.depotSerialisieren()); return t.slice(0, Math.floor(t.length / 2)); } },
  { datei: 'u02-kein-objekt.vivodepot', beschreibung: 'Ungültig: das JSON ist eine Liste.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-KEIN-OBJEKT'] },
    bauen: async () => KOPF + '[]' },
  { datei: 'u03-kopf-version.vivodepot', beschreibung: 'Ungültig: unbekannte Kopf-Version 2.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-KOPF-VERSION'] }, strenger: 'Befund KOPF-VERSION (05.10.2026): die Anwendung prüft das Versions-Byte beim Lesen nicht und öffnet die Datei als Fassung 1. Fix folgt im selben Wagen.',
    bauen: async (V) => { await grunddepot(V); return 'VIVODEPOT' + String.fromCharCode(2) + JSON.stringify(await V.depotSerialisieren(), null, 1); } },
  { datei: 'u04-kryptoversion.vivodepot', beschreibung: 'Ungültig: kryptoVersion 5 ist nicht beschrieben.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-KRYPTOVERSION'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); u.kryptoVersion = 5; return mitKopf(u); } },
  { datei: 'u05-pflichtfeld.vivodepot', beschreibung: 'Ungültig: depotUUID fehlt.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-PFLICHTFELD'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); delete u.depotUUID; return mitKopf(u); } },
  { datei: 'u06-salz-laenge.vivodepot', beschreibung: 'Ungültig: depotSalt hat 16 statt 32 Byte.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-SALZ-LAENGE'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); u.depotSalt = Buffer.alloc(16, 7).toString('base64'); return mitKopf(u); } },
  { datei: 'u07-form-beide.vivodepot', beschreibung: 'Ungültig: trägt iv/ct UND einheiten/umschlagTabelle.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-FORM'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); u.iv = Buffer.alloc(12).toString('base64'); u.ct = Buffer.alloc(32).toString('base64'); return mitKopf(u); } },
  { datei: 'u08-tabelle-leer.vivodepot', beschreibung: 'Ungültig: die Umschlagstabelle ist leer.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-TABELLE'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); u.umschlagTabelle = []; return mitKopf(u); } },
  { datei: 'u09-eintrag-kennung.vivodepot', beschreibung: 'Ungültig: der erste Eintrag heißt nicht „Fach 1“.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-EINTRAG'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); u.umschlagTabelle[0].kennung = 'Anker'; return mitKopf(u); } },
  { datei: 'u10-kdf-iterationen.vivodepot', beschreibung: 'Ungültig: kdf.iterationen nennt 100000 statt der verlangten Rundenzahl.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-KDF-PARAMETER'] }, strenger: 'Der Kern liest kdf.iterationen bewusst nicht (U2-ADR-230) und leitet immer mit der festen Rundenzahl ab. Eine Datei, die eine andere Zahl nennt, ist trotzdem nicht in diesem Format geschrieben.',
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); u.umschlagTabelle[0].kdf.iterationen = 100000; return mitKopf(u); } },
  { datei: 'u11-iv-laenge.vivodepot', beschreibung: 'Ungültig: der IV einer Einheit hat 16 statt 12 Byte.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-IV-LAENGE'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); const a = Object.keys(u.einheiten)[0]; u.einheiten[a].iv = Buffer.alloc(16, 1).toString('base64'); return mitKopf(u); } },
  { datei: 'u12-einheit-ohne-umschlag.vivodepot', beschreibung: 'Ungültig: zu einer Einheit fehlt im Anker-Eintrag der Umschlag.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-PAARE'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); delete u.umschlagTabelle[0].umschlaege[Object.keys(u.einheiten)[0]]; return mitKopf(u); } },
  { datei: 'u13-umschlag-ohne-einheit.vivodepot', beschreibung: 'Ungültig: zu einem Umschlag fehlt die Einheit.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-PAARE'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); delete u.einheiten[Object.keys(u.einheiten)[0]]; return mitKopf(u); } },
  { datei: 'u14-whc-form.vivodepot', beschreibung: 'Ungültig: das Feld „wiederherstellung“ trägt eine unbekannte Form.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-WHC-FORM'] }, strenger: 'Der Kern übergeht eine Hülle fremder Form und öffnet die Datei mit dem Passwort (_whcFeldGueltig); nach dem Format ist das Feld falsch.',
    bauen: async (V) => { await grunddepot(V); await V.whcHuelleWickeln(PW, V.whcCodeErzeugen().slice(0, V.WHC_STELLEN)); const u = await V.depotSerialisieren(); u.wiederherstellung.form = 2; return mitKopf(u); } },
  { datei: 'u15-paar-entfernt.vivodepot', beschreibung: 'Ungültig: eine Einheit samt allen Umschlägen entfernt. Nur das Verzeichnis im Geheimteil fängt das.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-VERZEICHNIS'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); const a = Object.keys(u.einheiten)[0]; delete u.einheiten[a]; for (const e of u.umschlagTabelle) delete e.umschlaege[a]; return mitKopf(u); } },
  { datei: 'u16-einheiten-vertauscht.vivodepot', beschreibung: 'Ungültig: zwei Einheiten samt Umschlägen gegeneinander vertauscht; die AAD bindet jede an ihre Adresse.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-EINHEIT'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); const [a, b] = Object.keys(u.einheiten);
      [u.einheiten[a], u.einheiten[b]] = [u.einheiten[b], u.einheiten[a]];
      const um = u.umschlagTabelle[0].umschlaege; [um[a], um[b]] = [um[b], um[a]]; return mitKopf(u); } },
  { datei: 'u17-chiffrat-gekippt.vivodepot', beschreibung: 'Ungültig: ein Byte im Chiffrat einer Einheit gekippt.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-EINHEIT'] },
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); const a = Object.keys(u.einheiten)[0];
      const ct = Buffer.from(u.einheiten[a].ct, 'base64'); ct[5] ^= 0x01; u.einheiten[a].ct = ct.toString('base64'); return mitKopf(u); } },
  { datei: 'u18-geheimteil.vivodepot', beschreibung: 'Ungültig: der Geheimteil des Ankers entschlüsselt zu einem Text statt einem Objekt.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-GEHEIMTEIL'] }, strenger: 'Der Kern fällt bei einem Geheimteil ohne Verzeichnis auf den Vergleich für Dateien vor dem 21.08.2026 zurück und öffnet.',
    bauen: async (V) => { await grunddepot(V); const u = await V.depotSerialisieren(); await geheimErsetzen(u, 0, 'kein Objekt'); return mitKopf(u); } },
  { datei: 'u19-inhalt.vivodepot', beschreibung: 'Ungültig: kryptoVersion 3, im Inhalt ist ein Bereich kein Objekt.',
    passwort: PW, erwartet: { urteil: 'ungueltig', codes: ['VDF-INHALT'] }, strenger: 'Der Kern normalisiert den Inhalt beim Öffnen (depotNormalisieren) und repariert, was er kann.',
    bauen: async (V) => { await grunddepot(V); V.getData().sektoren.identity = 'kein Objekt'; return mitKopf(await V.depotSerialisierenV3()); } },
];

/* Das Verhalten des Kerns je Fall, am Kern gemessen: öffnet / lehnt ab / öffnet mit Warnung der Klartext-Bindung. */
async function kernVerhalten(text, passwort) {
  const { V } = ladeKern();
  let u;
  try { u = V.umschlagEntpacken(JSON.parse(V.magicStrippen(text).json)); } catch (e) { return { ergebnis: 'lehnt-ab' }; }
  if (!V.istGueltigerUmschlag(u)) return { ergebnis: 'lehnt-ab' };
  if (passwort == null) return { ergebnis: 'nicht-versucht' };
  try { await V.depotLaden(u, passwort); } catch (e) { return { ergebnis: 'lehnt-ab' }; }
  return { ergebnis: V._klartextBindungBefund() ? 'oeffnet-mit-warnung' : 'oeffnet' };
}

async function erzeugen(ziel = ZIEL_STANDARD, nur = null) {
  fs.mkdirSync(ziel, { recursive: true });
  const faelle = [];
  for (const f of FAELLE) {
    if (nur && !nur.includes(f.datei)) continue;
    const { V } = ladeKern();
    const text = await f.bauen(V);
    fs.writeFileSync(path.join(ziel, f.datei), text, 'utf8');
    const kern = await kernVerhalten(text, f.passwort);
    const zeile = { datei: f.datei, beschreibung: f.beschreibung, passwort: f.passwort, erwartet: f.erwartet, kern };
    if (f.strenger) zeile.strenger = f.strenger;
    faelle.push(zeile);
    process.stdout.write(f.datei + '  Kern: ' + kern.ergebnis + '\n');
  }
  const manifest = {
    hinweis: 'Testkorpus für das .vivodepot-Format, erzeugt von tools/format-korpus-erzeugen.js. Alle Inhalte sind erfunden. Die Passwörter sind absichtlich offen: Es sind öffentliche Testpasswörter für genau diese Dateien. Sie gehören zu keinem echten Depot. Weder die Dateien noch die Passwörter dürfen als Vorlage für ein echtes Depot dienen.',
    spezifikation: 'docs/format/SPEZIFIKATION.md',
    pruefprogramm: 'node tools/format-pruefen.js',
    heute: HEUTE,
    felder: { erwartet: 'Urteil und Codes des Prüfprogramms, von Hand gesetzt.', kern: 'Verhalten der Anwendung beim Öffnen, am Kern gemessen.', strenger: 'Warum das Prüfprogramm strenger urteilt als die Anwendung.' },
    faelle,
  };
  if (nur) {   // nur einzelne Fälle neu: die übrigen Zeilen des bestehenden Manifests bleiben, in der Reihenfolge von FAELLE
    const alt = JSON.parse(fs.readFileSync(path.join(ziel, 'korpus.json'), 'utf8')).faelle;
    const neu = new Map(faelle.map((f) => [f.datei, f]));
    manifest.faelle = FAELLE.map((f) => neu.get(f.datei) || alt.find((a) => a.datei === f.datei)).filter(Boolean);
  }
  fs.writeFileSync(path.join(ziel, 'korpus.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return manifest;
}

if (require.main === module) {
  const i = process.argv.indexOf('--ziel');
  const n = process.argv.indexOf('--nur');
  erzeugen(i >= 0 ? process.argv[i + 1] : ZIEL_STANDARD, n >= 0 ? process.argv[n + 1].split(',') : null).then((m) => console.log(m.faelle.length + ' Fälle geschrieben.'),
    (e) => { console.error('FEHLER:', e); process.exitCode = 1; });
}

module.exports = { erzeugen, kernVerhalten, FAELLE, PW, PW_FACH, PW_FALSCH, HEUTE };
