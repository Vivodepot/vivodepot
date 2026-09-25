'use strict';
/* ════════════════════════════════════════════════════════════════════════
   subDepotNeuVersiegeln — die Station ohne Probe
   ────────────────────────────────────────────────────────────────────────
   DER ANLASS (Zug 0, 03.09.2026). Über alle Testdateien der Suite gemessen,
   Aufrufform nicht bloße Erwähnung: `subDepotNeuVersiegeln` hatte NULL
   Aufrufe. Jede andere Station des Sub-Depot-Bogens hatte mindestens zwei.

   WARUM AUSGERECHNET DIESE. Sie ist die Stelle, an der eine Bearbeitung im
   Sub-Kontext in den Anker-Umschlag zurückgeschrieben wird — `sess.inhalt`
   wird mit dem SUB-Schlüssel frisch verschlüsselt und ersetzt `iv`/`ct` des
   bestehenden Umschlags. Drei Aufrufer im Kern, darunter
   `subKontextVerlassen` und der Speichern-Weg.

   Fällt sie aus, wirft nichts, meldet nichts, und jede Einzelstation bleibt
   grün: die Bearbeitung steht weiter im RAM, der Umschlag trägt den alten
   Stand. Bemerkt wird es erst, wenn jemand die Datei später öffnet und eine
   Änderung fehlt — dann ist die Sitzung längst vorbei. Von allen Funden des
   Tages ist das der, bei dem ein Fehler am längsten unbemerkt bliebe.

   DIE ZUSICHERUNG IST WIRKUNG, NICHT ANWESENHEIT. Nicht „die Funktion gibt
   es" und nicht „sie wirft nicht", sondern: der Umschlag trägt hinterher,
   was vorher nur im RAM stand. Die Positivkontrolle steht im selben Test
   und VOR der Zusicherung — sie zeigt am selben Umschlag, dass er den neuen
   Stand ohne den Aufruf NICHT trägt. Ohne sie wäre nicht zu unterscheiden,
   ob die Zusicherung wirkt oder ob der Wert ohnehin überall stünde.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ANKER_PW = 'Anker-NeuVers-2026!';
const SUB_PW   = 'Sub-NeuVers-2026!';

const MARKE_FELD = 'furtherDetails';
const MARKE_WERT = 'Erst im RAM, dann im Umschlag (Neu-Versiegeln-Marke)';

async function ankerMitOffenemSub() {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Verwalterin');
  const e = await V.subDepotAnlegen(
    { bezeichnung: 'Depot Kind', inhaberin: 'Kind', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  return { V, uuid: e.depotUUID };
}

/* Den Umschlag holen, wie der Kern ihn führt: am Eintrag in verwalteteDepots,
   nicht aus einer Export-Hülle. Der Export hätte eigene Felder und eigene
   Zeitpunkte — gemessen werden soll, was PERSISTIERT wird. */
function umschlagAmAnker(V, uuid) {
  const liste = (V.ankerDaten() && V.ankerDaten().verwalteteDepots) || [];
  const e = liste.find((x) => x.depotUUID === uuid);
  assert.ok(e, 'der Eintrag steht am Anker');
  return e.umschlag;
}

test('[NeuVersiegeln] eine Bearbeitung im Sub-Kontext erreicht den Anker-Umschlag — und ohne den Aufruf nicht', async () => {
  const { V, uuid } = await ankerMitOffenemSub();
  V.subKontextBetreten(uuid);
  const sid = (V.SEKTOREN[0] && V.SEKTOREN[0].id) || null;
  assert.ok(sid, 'es gibt einen Sektor, in den die Marke kann');
  V.sektorFeldSetzen(sid, MARKE_FELD, MARKE_WERT);

  /* ── POSITIVKONTROLLE, vor der Zusicherung (§3.5b) ────────────────────
     Der Eintrag ist gesetzt, aber noch NICHT versiegelt. Trüge der Umschlag
     die Marke schon hier, prüfte die Zusicherung unten nichts. */
  const vorher = await V.subDepotEntsiegeln(umschlagAmAnker(V, uuid), SUB_PW);
  // Der frische Umschlag kann den Sektor noch gar nicht führen — darum lesen, nicht indizieren.
  const markeVorher = ((vorher.inhalt.sektoren || {})[sid] || {})[MARKE_FELD];
  assert.notEqual(markeVorher, MARKE_WERT,
    'OHNE subDepotNeuVersiegeln trägt der Umschlag die Bearbeitung NICHT — steht sie hier\n' +
    'schon drin, versiegelt eine andere Stelle mit, und die Zusicherung unten wäre leer.');

  const alt = umschlagAmAnker(V, uuid);
  // U2-ADR-002 (23.09.2026, S1): ein Sub-Depot ist V4 wie jedes Depot — frisch heißt je Einheit frisches iv und ct.
  const altEinheiten = JSON.parse(JSON.stringify(alt.einheiten)), altUuid = alt.depotUUID;
  assert.equal(alt.kryptoVersion, 4, 'Vorbedingung: das Sub-Depot ist V4');

  /* ── DIE ZUSICHERUNG ──────────────────────────────────────────────────── */
  await V.subDepotNeuVersiegeln(uuid);

  const nachher = await V.subDepotEntsiegeln(umschlagAmAnker(V, uuid), SUB_PW);
  // Auch hier lesen statt indizieren: fällt das Neu-Versiegeln aus, fehlt der Sektor
  // ganz — ein TypeError statt der Meldung unten sagt dem Leser nichts über den Defekt.
  const markeNachher = ((nachher.inhalt.sektoren || {})[sid] || {})[MARKE_FELD];
  assert.equal(markeNachher, MARKE_WERT,
    'Was im Sub-Kontext bearbeitet wurde, MUSS nach dem Neu-Versiegeln im Anker-Umschlag\n' +
    'stehen. Bricht diese Zeile, geht jede Sub-Bearbeitung lautlos verloren: nichts wirft,\n' +
    'nichts meldet, und bemerkt wird es erst beim nächsten Öffnen der Datei.');

  const neu = umschlagAmAnker(V, uuid);
  const gemeinsam = Object.keys(neu.einheiten).filter((k) => altEinheiten[k]);
  assert.ok(gemeinsam.length > 0, 'Vorbedingung: dieselben Einheiten-Adressen vorher und nachher');
  for (const k of gemeinsam) {
    assert.notEqual(neu.einheiten[k].ct, altEinheiten[k].ct, 'frischer Ciphertext — sonst wurde gar nicht neu verschlüsselt');
    assert.notEqual(neu.einheiten[k].iv, altEinheiten[k].iv, 'frisches IV: ein wiederverwendetes IV bei gleichem Schlüssel ist ein Krypto-Fehler');
  }
  assert.equal(neu.depotUUID, altUuid,
    'GLEICHE IDENTITÄT. Der Umschlag wird neu gefüllt, nicht ersetzt — eine neue UUID würde\n' +
    'den Eintrag am Anker von seinem eigenen Inhalt trennen.');
});

test('[NeuVersiegeln] ein NICHT offenes Sub-Depot wird abgewiesen, nicht stillschweigend übergangen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Verwalterin');
  const e = await V.subDepotAnlegen(
    { bezeichnung: 'Zu', inhaberin: 'Kind', verwaltungsTyp: 'verwaltet' }, SUB_PW);

  // Angelegt, aber nie entsiegelt: es gibt keinen Sub-Schlüssel in der Sitzung.
  await assert.rejects(() => V.subDepotNeuVersiegeln(e.depotUUID), /nicht offen/i,
    'Ohne Sub-Schlüssel kann nicht versiegelt werden. Ein stiller No-op wäre hier das\n' +
    'Gefährlichste: der Aufrufer hielte die Bearbeitung für gesichert.');

  await assert.rejects(() => V.subDepotNeuVersiegeln('gibt-es-nicht'), /nicht offen/i,
    'dasselbe für eine unbekannte UUID — kein Unterschied in der Behandlung');
});
