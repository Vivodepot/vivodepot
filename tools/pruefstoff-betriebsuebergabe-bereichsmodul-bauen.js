#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   pruefstoff-betriebsuebergabe-bereichsmodul-bauen.js — das AUSLIEFERBARE
   Bereichs-Modul „Betriebsübergabe", wie es eine Kammer an ihre Mitglieder gäbe.
   ────────────────────────────────────────────────────────────────────────
   „Ein Pro-Modul zum Ansehen, Einlassen und Ausprobieren"
   (23.08.2026), Zug 2.

   GEMESSENE KORREKTUR AM AUFTRAGSWORTLAUT (dieselbe wie in Zug 1, hier ein
   zweites Mal bestätigt): Zug 0 desselben Auftrags schließt den SIGNIERTEN Weg
   ausdrücklich aus („CC rührt kein Schlüsselmaterial an, der Anker ist mitten
   im Wechsel") und legt sich auf den unsignierten Einlassweg (U2-ADR-145) fest.
   Dieser Weg — `modulTyp:'bereich'`, geprüft von `bereichsModulPruefen` gegen
   `BEREICH_MODUL_SCHLUESSEL` — kennt STRUKTURELL keinen Feld-Schlüssel: er
   trägt Bereichs-Label und -Icon, keine Feld-Definitionen. Der in Zug 2
   verlangte 36-Felder-Prüfstoff (`pruefstoff-betriebsuebergabe-messen.js`)
   kommt nur über die SIGNIERTE Feld-Vorlage in ein Depot — also über genau den
   Weg, den Zug 0 desselben Auftrags ausschließt. Ein Test-Sentinel-Schlüssel
   existiert im Kern (`TEST_SENTINEL_PUBLIC_JWK`, vivodepot.html), aber
   AUSDRÜCKLICH NUR für Test-Injektion (`opts.ankerJwk`) — die echte, im
   Browser laufende Anwendung verifiziert gegen den produktiven
   `TRUST_AUTHORITY_PUBLIC_JWK` und würde eine mit dem Sentinel signierte
   Vorlage als nicht vertrauenswürdig ablehnen. Ein damit „signiertes" Modul
   wäre im echten Browser nutzlos — kein Umweg, sondern dieselbe
   Ausgeschlossenheit wie der produktive Schlüssel selbst.

   AUSGELIEFERT WIRD DARUM DER BEREICHS-CONTAINER ALLEIN — ehrlich benannt, mit
   der Anleitung, die genau das sagt: kein Feld erscheint, weil keines im
   heute gangbaren Weg reisen kann. Das ist keine Verkleinerung des Auftrags,
   sondern dieselbe Grenze, die Zug 1 bereits gemessen und Zug 0 selbst gezogen
   hat.

   Diese Datei MISST und ändert keine Zeile Produktcode.

   Aufruf:
     node tools/pruefstoff-betriebsuebergabe-bereichsmodul-bauen.js [--out <pfad>]
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
const {
  BEREICH_1_ID, BEREICH_2_ID, BEREICH_3_ID, BEREICH_4_ID, BEREICH_5_ID, BEREICH_6_ID,
  BEREICHE_LABEL_DE,
} = require(path.join(REPO, 'tools', 'betriebssatz-inhalte.js'));

// U2-ADR-243 (03.09.2026): sechs Bereiche statt eines einzigen, in EINER Registrierung — die
// `bereiche`-Eigenschaft nimmt seit A484 ein Objekt mit mehreren Schlüsseln entgegen,
// kein sechsfaches Andocken nötig. Icon je Bereich aus der echten ICONS-Registry
// (vivodepot.html:6236) gewählt — Symbol, nicht Feld-Inhalt, keine neue Bauform.
const BEREICH_ID = BEREICH_1_ID;   // Rückwärtskompatibler Einzel-Export, s. betriebssatz-inhalte.js
const MODUL = Object.freeze({
  modulTyp: 'bereich',
  moduleVersion: 2,
  herkunft: 'urn:betriebsuebergabe:v0',
  sprache: 'de',
  bereiche: {
    [BEREICH_1_ID]: { label: BEREICHE_LABEL_DE[BEREICH_1_ID], icon: 'scale' },
    [BEREICH_2_ID]: { label: BEREICHE_LABEL_DE[BEREICH_2_ID], icon: 'landmark' },
    [BEREICH_3_ID]: { label: BEREICHE_LABEL_DE[BEREICH_3_ID], icon: 'wallet' },
    [BEREICH_4_ID]: { label: BEREICHE_LABEL_DE[BEREICH_4_ID], icon: 'settings' },
    [BEREICH_5_ID]: { label: BEREICHE_LABEL_DE[BEREICH_5_ID], icon: 'folder' },
    [BEREICH_6_ID]: { label: BEREICHE_LABEL_DE[BEREICH_6_ID], icon: 'users' },
  },
});

function zielpfad() {
  const i = process.argv.indexOf('--out');
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return path.join(REPO, 'betriebsuebergabe-modul.json');
}

function pruefen() {
  const { V } = ladeKern();
  const r = V.bereichsModulPruefen(MODUL);
  if (!r.gueltig) throw new Error('Selbstprobe fehlgeschlagen: ' + r.grund);
  if (r.verworfene.length) throw new Error('Unerwartete verworfene Schlüssel: ' + JSON.stringify(r.verworfene));
  return r;
}

/* Posten 2 („Modulprüfung schließen", 23.08.2026) — „Anzeige im Erzeuger, sichtbar beim Bauen,
   mit dem Stand gegen die Grenze". Es gibt keinen Erzeuger für die fünf unsignierten
   Einlass-Register (anders als für Feld-Vorlagen, wo vivodepot-template-generator.html diese
   Rolle trägt) — Module dieser Art entstehen heute handgeschrieben oder, wie hier, per
   Node-Werkzeug. Die Anzeige lebt darum HIER, am einzigen Ort, an dem eines tatsächlich gebaut
   wird — und liest die Zahl aus derselben Kern-Funktion, die auch beim Einlassen entscheidet
   (`_modulGroesseTiefePruefen`), statt sie ein zweites Mal zu berechnen. */
function groesseTiefeAnzeige() {
  const { V } = ladeKern();
  const r = V._modulGroesseTiefePruefen(MODUL, { maxBytes: V._MODUL_EINLASS_MAX_BYTES, maxTiefe: V._MODUL_EINLASS_MAX_TIEFE });
  return { bytes: r.bytes, maxBytes: V._MODUL_EINLASS_MAX_BYTES, tiefe: r.tiefe, maxTiefe: V._MODUL_EINLASS_MAX_TIEFE };
}

function main() {
  const r = pruefen();
  const ziel = zielpfad();
  fs.writeFileSync(ziel, JSON.stringify(MODUL, null, 2) + '\n', 'utf8');
  console.log('Selbstprobe: gültig, ' + r.bereiche.length + ' Bereiche erkannt: '
    + r.bereiche.map((b) => b.id).join(', '));
  console.log('Geschrieben: ' + ziel);
  console.log('Größe: ' + fs.statSync(ziel).size + ' Byte');
  const g = groesseTiefeAnzeige();
  console.log('Stand gegen die Grenze: ' + g.bytes + ' / ' + g.maxBytes + ' Byte · Tiefe ' + g.tiefe + ' / ' + g.maxTiefe);
}

if (require.main === module) main();
module.exports = { MODUL, BEREICH_ID, pruefen };
