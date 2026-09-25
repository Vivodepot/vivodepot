'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   VERSCHACHTELTE EXPORTZIELE — die zweite Hälfte der Format-Tür
   ────────────────────────────────────────────────────────────────────────────
   Auftrag „Verschachtelte Exportziele" (21.08.2026), beauftragt. Grundlage: „Leser statt Standards", Teil C.

   DER GEGENSTAND IN EINEM SATZ: `baueAusMapping` schrieb in EINE flache Ebene
   (`out[m.ziel] = …`). Ein Ziel konnte keinen Pfad tragen — Vivodepot konnte
   XÖV, XRechnung, UBL und alles tief Verschachtelte **lesen, aber nicht
   schreiben.** Die Format-Tür war einseitig offen.

   ZUG 0, gemessen vor dem Bau:
     · Die Abweisung stand an GENAU EINER Stelle (`export-ziel-verschachtelt`,
       nur für `richtung === 'export'`). Ein Schema für Format-Module gibt es
       nicht — in keiner der vier ausgelieferten HTML-Dateien.
     · 7 Mapping-Tabellen, 215 Ziele, **davon 0 mit Punkt**.
     · DREI der sieben Erzeuger falten die eine Ebene HEUTE VON HAND
       (`datensatz:`, `stammdaten:`, `learningAchievements:`) — der Umschlag
       liegt ausserhalb des Mappings, weil er darin nicht ausdrückbar war.
     · Der IMPORT liest längst in die Tiefe (`_formatPfadLesen`, auch für
       `erkennen[].pfad`). Die Asymmetrie war: **tief lesen, flach schreiben.**

   DER BAU IST EINE ZEILE an EINER Stelle. `_formatPfadSchreiben` steht neben
   `_formatPfadLesen` und `_formatUnterPfad` und benutzt DIESELBE Zerlegung —
   damit denselben Schutz gegen `__proto__`/`constructor`/`prototype`.

   DIE AUFLAGE, DIE ÜBER ALLEM STEHT: der Sensibel-Filter bleibt auf demselben
   EINEN Prüfpfad. An dieser Stelle bestand schon einmal ein erreichbares
   Datenleck; ein zweiter Schreibweg hätte es wieder aufgemacht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const MAPPING_TABELLEN = ['VC_IDENTITAET_MAPPING', 'XOEV_VERWALTUNG_MAPPING', 'EDCI_BILDUNG_MAPPING',
  'XMELD_IDENTITAET_MAPPING', 'B16_FELD_MAPPING', 'VC_FINANZEN_MAPPING', 'VC_SOZIALVERSICHERUNG_MAPPING'];

async function depot(V) {
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
}

/* ══ Zug 0 · was gemessen war, bleibt messbar ═════════════════════════════ */

test('[Ziele·Zug 0] alle bestehenden Ziele sind flach — 191 über sieben Tabellen', () => {
  /* Der Prüfstein für die Rückwärtskompatibilität: solange kein bestehendes Ziel einen Punkt
     trägt, kann der neue Weg an ihnen nichts ändern. Wächst die Zahl oder taucht ein Punkt auf,
     ist das ein Befund und gehört angesehen. */
  const { V } = ladeKern();
  let ziele = 0, mitPunkt = 0;
  for (const n of MAPPING_TABELLEN) {
    const m = V[n];
    assert.ok(Array.isArray(m), n + ' fehlt');
    ziele += m.length;
    mitPunkt += m.filter((x) => String(x.ziel || '').includes('.')).length;
  }
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): 215 -> 191, weil 24 Zeilen bewusst entfielen
  // (Korb-1-Felder wurden mehrwertig — 11 in den sechs Reverse-Mapping-Tabellen, s. Kommentare an
  // VC_IDENTITAET_MAPPING u.a., PLUS 13 in B16_FELD_MAPPING selbst, s. Kommentare dort).
  assert.equal(ziele, 191, 'die Zahl der Ziele hat sich verändert — ansehen, nicht nachziehen');
  assert.equal(mitPunkt, 0, 'ein eingebautes Mapping trägt jetzt einen Pfad — dann ist die '
    + 'Rückwärtskompatibilitäts-Aussage neu zu messen');
});

/* ══ Rückwärtskompatibilität — Rot-Beleg je bestehendem Ausgabeformat ═════ */

test('[Ziele·Rückwärts] jedes bestehende Mapping liefert weiterhin eine FLACHE Ebene', async () => {
  const { V } = ladeKern();
  await depot(V);
  V.sektorFeldSetzen('identity', 'givenName', 'Anna');
  V.sektorFeldSetzen('administration', 'furtherEmailAddress', 'a@b.example.de');
  V.sektorFeldSetzen('education', 'occupationRole', 'Tischlerin');
  const bereichVon = { VC_IDENTITAET_MAPPING: 'identity', XOEV_VERWALTUNG_MAPPING: 'administration',
    EDCI_BILDUNG_MAPPING: 'education', XMELD_IDENTITAET_MAPPING: 'identity',
    B16_FELD_MAPPING: 'identity', VC_FINANZEN_MAPPING: 'finance',
    VC_SOZIALVERSICHERUNG_MAPPING: 'socialInsurance' };
  for (const n of MAPPING_TABELLEN) {
    const out = V.baueAusMapping(bereichVon[n], V[n], { sensibel: true });
    for (const [k, w] of Object.entries(out)) {
      assert.ok(!k.includes('.'), n + ': ein Schlüssel trägt einen Punkt — ' + k);
      assert.ok(w === null || typeof w !== 'object' || Array.isArray(w),
        n + ': ' + k + ' ist jetzt verschachtelt, war es aber vorher nicht');
    }
  }
});

/* ══ Der Bau ═════════════════════════════════════════════════════════════ */

test('[Ziele·Rot-Beweis] ein Ziel mit Pfad baut die Struktur auf', async () => {
  const { V } = ladeKern();
  await depot(V);
  V.sektorFeldSetzen('administration', 'furtherEmailAddress', 'a@b.example.de');
  const out = V.baueAusMapping('administration',
    [{ feld: 'furtherEmailAddress', ziel: 'datensatz.person.email' }], { sensibel: true });
  assert.deepEqual(out, { datensatz: { person: { email: 'a@b.example.de' } } },
    'das Ziel bleibt flach — genau der Zustand vor diesem Zug');
});

test('[Ziele] zwei Ziele unter demselben Ast stehen NEBENEINANDER, sie ersetzen einander nicht', async () => {
  /* Der Unterschied zu `_formatUnterPfad`, das einen frischen Umschlag baut: dort hätte das
     zweite Ziel das erste weggeschrieben, und niemand hätte es gesehen. */
  const { V } = ladeKern();
  await depot(V);
  V.sektorFeldSetzen('administration', 'furtherEmailAddress', 'a@b.example.de');
  V.sektorFeldSetzen('administration', 'mainEmailAddress', 'Ordner links');
  const out = V.baueAusMapping('administration', [
    { feld: 'furtherEmailAddress', ziel: 'datensatz.person.email' },
    { feld: 'mainEmailAddress', ziel: 'datensatz.person.ablage' },
  ], { sensibel: true });
  assert.deepEqual(out, { datensatz: { person: { email: 'a@b.example.de', ablage: 'Ordner links' } } });
});

test('[Ziele] ein Ziel OHNE Punkt verhält sich genau wie vorher — auch neben einem mit', async () => {
  const { V } = ladeKern();
  await depot(V);
  V.sektorFeldSetzen('administration', 'furtherEmailAddress', 'a@b.example.de');
  V.sektorFeldSetzen('administration', 'mainEmailAddress', 'Ordner links');
  const out = V.baueAusMapping('administration', [
    { feld: 'furtherEmailAddress', ziel: 'datensatz.email' },
    { feld: 'mainEmailAddress', ziel: 'flach' },
  ], { sensibel: true });
  assert.equal(out.flach, 'Ordner links');
});

test('[Ziele] eine Liste landet als Liste am verschachtelten Ziel', async () => {
  /* „Listen in verschachtelten Zielen inbegriffen — sonst ist die Hälfte wieder nur halb."
     Auf dem Export-Weg kommt die Liste über `transform` (`alsListe` → `_formatAlsListe`); der
     Schreibweg legt sie unverändert am Pfad ab. */
  const { V } = ladeKern();
  await depot(V);
  V.sektorFeldSetzen('administration', 'furtherEmailAddress', 'a@b.example.de');
  const out = V.baueAusMapping('administration',
    [{ feld: 'furtherEmailAddress', ziel: 'a.b.liste', transform: (w) => [w, w] }], { sensibel: true });
  assert.deepEqual(out, { a: { b: { liste: ['a@b.example.de', 'a@b.example.de'] } } });
});

test('[Ziele] ein Ast, der schon ein Blatt ist, wird NICHT still überschrieben', async () => {
  /* Ein Mapping mit `a` und `a.b` ist ein Widerspruch in sich. Ihn aufzulösen hiesse, einen der
     beiden Werte zu verlieren, ohne dass es jemand sieht. */
  const { V } = ladeKern();
  await depot(V);
  V.sektorFeldSetzen('administration', 'furtherEmailAddress', 'a@b.example.de');
  V.sektorFeldSetzen('administration', 'mainEmailAddress', 'Ordner links');
  const out = V.baueAusMapping('administration', [
    { feld: 'furtherEmailAddress', ziel: 'a' },
    { feld: 'mainEmailAddress', ziel: 'a.b' },
  ], { sensibel: true });
  assert.equal(out.a, 'a@b.example.de', 'das Blatt bleibt stehen');
});

test('[Ziele·Sicherheit] ein Pfad läuft die Prototypenkette nicht hoch', async () => {
  const { V } = ladeKern();
  await depot(V);
  V.sektorFeldSetzen('administration', 'furtherEmailAddress', 'a@b.example.de');
  const out = V.baueAusMapping('administration',
    [{ feld: 'furtherEmailAddress', ziel: '__proto__.geerbt' }], { sensibel: true });
  assert.deepEqual(out, {}, 'der verbotene Pfad schreibt nichts');
  assert.equal({}.geerbt, undefined, 'und er hat nichts an Object.prototype gehängt');
});

/* ══ Die Auflage, die über allem steht ════════════════════════════════════ */

test('[Ziele·DIE AUFLAGE] ein sensibles Feld erscheint auch mit verschachteltem Ziel NICHT', async () => {
  /* An dieser Stelle bestand schon einmal ein erreichbares Datenleck: ein Wert ging über
     SD-JWT-VC, XÖV und EDCI hinaus, während derselbe Wert im JSON-, DOCX- und PDF-Export längst
     zurückgehalten war. Der neue Schreibweg läuft UNTER derselben einen Prüfung. */
  const { V } = ladeKern();
  await depot(V);
  V.sektorFeldSetzen('finance', 'companyPensionPolicyNumber', '12 345 678 901');
  assert.equal(V.feldIstSensibel(V.feldDefFuer('finance', 'companyPensionPolicyNumber'), 'finance'), true,
    'Vorbedingung: `bav_nr` ist sensibel — sonst prüft diese Probe nichts');   // Schnitt Glied 3: steuerid ist jetzt Liste

  const mapping = [{ feld: 'companyPensionPolicyNumber', ziel: 'tief.geheim.nummer' }];
  const ohne = V.baueAusMapping('finance', mapping, { sensibel: false });
  assert.deepEqual(ohne, {}, 'der sensible Wert erscheint im verschachtelten Ziel');
  assert.ok(!JSON.stringify(ohne).includes('12 345'), 'der Wert steht irgendwo in der Struktur');

  const mit = V.baueAusMapping('finance', mapping, { sensibel: true });
  assert.deepEqual(mit, { tief: { geheim: { nummer: '12 345 678 901' } } },
    'mit Opt-in muss er sehr wohl kommen — sonst misst die Probe oben einen Ausfall statt der Zurückhaltung');
});
