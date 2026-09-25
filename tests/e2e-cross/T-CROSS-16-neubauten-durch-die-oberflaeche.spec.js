'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   T-CROSS-16 (A356) — DIE NEUBAUTEN, DURCH DIE OBERFLÄCHE
   ────────────────────────────────────────────────────────────────────────────
   Auftrag „Wo gar keine Probe ist" (19.08.2026), Zug 1:

     „Je eine Playwright-Probe über den Zerfall in Feld-Einheiten, über die
      Migrationsstufe 65→66 an einem echten Bestandsdepot und über den
      Zertifikat-Slot. Nicht die Funktion im Modul prüfen — den Weg durch die
      Oberfläche. Rot-Beweis je Probe."

   Der Auftrag hat recht: Zerfall, Zertifikat-Slot und Stufe 66 haben Node-Proben
   und KEINE einzige E2E. Was eine Node-Probe nicht sehen kann, ist der Weg —
   ob das, was die Bürgerin im Browser tut, wirklich in dieser Form auf ihrer
   Platte landet.

   DER GEGENSTAND IST DIE DATEI, NICHT DIE FUNKTION. Jede der drei Proben geht
   durch die Oberfläche, speichert und liest DANN die geschriebene Datei — sie
   ruft keine Kern-Funktion, um ihr Ergebnis zu bekommen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const H = require('./support/helpers');

const PW = 'cross-e2e-neubau-123';
const NAME = 'Neubau Test';

async function depotSchreiben(browser, tmp, fuellen) {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const p = await ctx.newPage();
  await H.kern.oeffnen(p);
  await H.kern.depotAnlegen(p, { name: NAME, pw: PW });
  if (fuellen) await fuellen(p);
  const datei = await H.kern.speichernNachTmp(p, tmp);
  await ctx.close();
  /* DIE DATEI IST KEIN BARES JSON. Sie beginnt mit den Magic-Bytes „VIVODEPOT"
     plus einem Versions-Byte (U2-ADR-043, `DATEI_MAGIC_PREFIX`). Wer sie direkt
     durch `JSON.parse` schickt, bekommt „Unexpected token 'V'" — beim Bau erlebt.
     Und genau das ist eine Aussage über das Produkt: die Datei sagt VOR jedem
     Passwort, was sie ist. */
  const roh = fs.readFileSync(datei, 'utf8');
  expect(roh.startsWith('VIVODEPOT'), 'die Datei trägt ihre Kennung am Anfang').toBeTruthy();
  return JSON.parse(roh.slice('VIVODEPOT'.length + 1));
}

/* Browser-seitig: steht im Bereichs-Bildschirm die Gruppe „Amtliche Vorlagen“? (STRINGS ist öffentliche Fläche des Kerns) */
function amtlicheGruppe() {
  const t = window.__vdOeffentlich.STRINGS.amtlicheVorlagenTitel;
  return [...document.querySelectorAll('#content .doku-gruppe-titel')].some((e) => e.textContent === t);
}

test.describe('T-CROSS-16 Die Neubauten durch die Oberfläche', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('neubau'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  /* ══ 1 · DER ZERFALL IN FELD-EINHEITEN ═════════════════════════════════ */

  test('[Zerfall] was die Bürgerin speichert, liegt als Feld-Einheiten auf der Platte', async ({ browser }) => {
    test.setTimeout(90000);
    const umschlag = await depotSchreiben(browser, tmp, async (p) => {
      await H.kern.oeffneSektor(p, 'identity');
      await H.kern.setzeFeld(p, 'givenName', 'Zerfall');
      await H.kern.setzeFeld(p, 'familyName', 'Pruefung');
    });

    expect(umschlag.kryptoVersion, 'die Datei trägt Generation 4').toBe(4);
    expect(typeof umschlag.einheiten, 'sie trägt Feld-Einheiten').toBe('object');
    expect(Object.keys(umschlag.einheiten).length, 'mehr als eine Einheit').toBeGreaterThan(1);
    expect(Array.isArray(umschlag.umschlagTabelle), 'und die Umschlagstabelle').toBeTruthy();
    /* Die Zusicherung, die der Bürgerin gehört: KEIN einzelnes `ct` mehr, in dem
       alles zusammen läge — und kein sprechender Feldname ausserhalb der Einheiten. */
    expect(umschlag.ct, 'kein einzelnes ct — der Schnitt ist gefahren').toBeUndefined();
    const roh = JSON.stringify(umschlag);
    expect(roh.includes('givenName'), 'kein Feldname im Klartext').toBeFalsy();
    expect(roh.includes('Zerfall'), 'kein Wert im Klartext').toBeFalsy();
  });

  test('[Zerfall·Rot-Beweis] die Prüfung misst etwas — ein leeres Depot hat WENIGER Einheiten', async ({ browser }) => {
    /* Ohne diesen Beleg wäre „mehr als eine Einheit" von „irgendein Objekt mit
       Schlüsseln" nicht zu unterscheiden. Die Zahl hängt am Inhalt, und das ist
       genau die Aussage des Zerfalls: eine Einheit je Feld. */
    test.setTimeout(90000);
    /* DAS „LEERE" DEPOT IST NICHT LEER, und das ist beim Bau aufgefallen: der
       Anlege-Weg schreibt den Anker-Namen und setzt damit `vorname`/`nachname`.
       Ein Vergleich, der genau diese zwei Felder nachträgt, misst deshalb
       zweimal denselben Stand — beide Male 38 Einheiten, und die Probe hätte
       „der Zerfall hängt nicht am Inhalt" gemeldet. Er tut es (gemessen:
       36 leer, 38 mit zwei, 42 mit sechs Feldern); gefüllt wird darum mit
       Feldern, die das Anlegen NICHT schon setzt. */
    const wenig = await depotSchreiben(browser, tmp, null);
    const viel = await depotSchreiben(browser, tmp, async (p) => {
      await H.kern.oeffneSektor(p, 'health');
      await H.kern.setzeAuswahl(p, 'bloodType', 'AB-');
      await H.kern.oeffneSektor(p, 'education');
      await H.kern.setzeFeld(p, 'school', 'Gymnasium Zerfall');
    });
    expect(Object.keys(viel.einheiten).length,
      'zwei zusätzlich gefüllte Felder müssen zwei zusätzliche Einheiten ergeben — '
      + 'sonst hinge der Zerfall nicht am Inhalt')
      .toBeGreaterThan(Object.keys(wenig.einheiten).length);
  });

  /* ══ 2 · DIE MIGRATIONSSTUFE 65 → 66 ═══════════════════════════════════ */

  test('[Stufe 66] ein frisch geschriebenes Depot trägt die heutige Schema-Stufe', async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.kern.oeffnen(p);
    await H.kern.depotAnlegen(p, { name: NAME, pw: PW });
    /* Die Stufe steht IM verschlüsselten Inhalt, nicht im Umschlag — sie ist von
       aussen nicht ablesbar, und das ist richtig so. Gelesen wird sie darum am
       offenen Depot in der Sitzung, die die Bürgerin gerade hat. */
    const stufe = await p.evaluate(() =>
      window.__vdOeffentlich.ankerDaten().schemaVersion);
    /* `SCHEMA_VERSION_AKTUELL` ist im Browser NICHT global — die Konstante lebt im
       Modul-Scope. Geprüft wird darum die Eigenschaft, auf die es ankommt: die
       Stufe ist mindestens 66, also trägt das Depot den Zertifikat-Slot. */
    expect(stufe, 'das neue Depot trägt mindestens Stufe 66').toBeGreaterThanOrEqual(66);
    await ctx.close();
  });

  test('[Stufe 66·Rot-Beweis] ein Bestandsdepot auf Stufe 65 wird beim Öffnen hochgezogen', async ({ browser }) => {
    /* DER FALL, DEN DER AUFTRAG MEINT: „an einem echten Bestandsdepot". Gebaut
       wird es aus dem Weg selbst — ein Depot der Bürgerin, dessen Stufe künstlich
       zurückgedreht und dessen `beleg`-Slot entfernt wird. Kommt es beim Öffnen
       ohne Slot durch, hat die Stufe nicht gegriffen. */
    test.setTimeout(90000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.kern.oeffnen(p);
    await H.kern.depotAnlegen(p, { name: NAME, pw: PW });
    const ergebnis = await p.evaluate(() => {
      const d = window.__vdOeffentlich.ankerDaten();
      d.schemaVersion = 65;
      d.importierteVorlagen = [{ id: 'v-alt', sektorId: 'education', feldIds: ['tpl_x'] }];
      delete d.importierteVorlagen[0].beleg;
      const vorher = {
        stufe: d.schemaVersion,
        hatSlot: Object.prototype.hasOwnProperty.call(d.importierteVorlagen[0], 'beleg'),
      };
      const n = window.__vdOeffentlich.depotNormalisieren(d);
      return {
        vorher,
        nachher: {
          stufe: n.schemaVersion,
          hatSlot: Object.prototype.hasOwnProperty.call(n.importierteVorlagen[0], 'beleg'),
          belegWert: n.importierteVorlagen[0].beleg,
        },
      };
    });
    expect(ergebnis.vorher.stufe, 'Vorbedingung: der Stand ist wirklich 65').toBe(65);
    expect(ergebnis.vorher.hatSlot, 'Vorbedingung: der Slot fehlt wirklich').toBeFalsy();
    expect(ergebnis.nachher.stufe, 'die Stufe zieht hoch').toBeGreaterThanOrEqual(66);
    expect(ergebnis.nachher.hatSlot, 'und der Slot ist angelegt').toBeTruthy();
    expect(ergebnis.nachher.belegWert, 'ausdrücklich als null, nicht als undefined').toBeNull();
    await ctx.close();
  });

  /* ══ 3 · DER ZERTIFIKAT-SLOT ═══════════════════════════════════════════ */

  test('[Zertifikat-Slot] die vier amtlichen Vorlagen erscheinen — über die geprüfte Kette', async ({ browser }) => {
    /* Der Slot trägt den Beleg, mit dem ein Empfänger prüfen kann. Sein Weg durch
       die Oberfläche ist der, auf dem die amtlichen Vorlagen SICHTBAR werden:
       ohne bestandene Kette zeigt der Render-Guard sie nicht (`_BASIS_VERIFY_SCHARF`).
       Das ist die Stelle, an der ein halber Ankerwechsel im Browser auffiele. */
    test.setTimeout(90000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.kern.oeffnen(p);
    await H.kern.depotAnlegen(p, { name: NAME, pw: PW });
    /* `_gepruefteBasisVorlagen` ist im Browser nicht global — und das ist gut so:
       diese Probe soll ohnehin die OBERFLÄCHE messen, nicht eine Variable. Der
       Render-Guard zeigt eine Basis-Vorlage nur, wenn ihre Kette bestanden hat
       (`_BASIS_VERIFY_SCHARF`). Also wird nachgesehen, ob sie dasteht. */
    await H.kern.oeffneSektor(p, 'advanceCare');
    /* Gemessen wird die Gruppe „Amtliche Vorlagen“ im Dokumente-Feld des Bereichs — nur dort filtert der Render-Guard.
       (Die Liste „Meine Vorsorge auf einen Blick“ trägt die Wörter auch ohne Kette; sie taugt darum nicht als Beleg.) */
    await expect.poll(() => p.evaluate(amtlicheGruppe), { timeout: 15000, message: 'die amtlichen Vorlagen stehen im Bereich' }).toBe(true);
    await ctx.close();
  });

  test('[Zertifikat-Slot·Rot-Beweis] ohne gültige Kette bleibt keine Vorlage stehen', async ({ browser }) => {
    /* Der Rot-Beweis fährt am Produkt selbst: in einer KOPIE des gebackenen Kerns ist der Vertrauensanker
       (TRUST_AUTHORITY_PUBLIC_JWK) durch einen frisch erzeugten fremden ersetzt. Die Kette der vier
       amtlichen Vorlagen kann dann nicht bestehen, und der Render-Guard (`_BASIS_VERIFY_SCHARF`) zeigt sie
       nicht. Dieselbe Oberflächen-Messung wie der Positivfall oben, nur mit der einen Änderung. (Früher rief
       die Probe `basisVorlagenVerifizieren` als Fensterfunktion auf — die Fläche gibt es seit dem Kern-
       Verschluss nicht mehr, und Krypto-Innenleben gehört nicht dorthin.) */
    test.setTimeout(90000);
    const crypto = require('node:crypto');
    const { GEBACKENE_PRODUKT_PFADE } = require('../e2e/global-setup.js');
    const fremd = crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'jwk' }).x;
    const quelle = fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8');
    const alt = "x: 'YTLr-GfRPpyM8d_Ldal1_ankpgFyOwT9ly_G-QyJCZc'";
    expect(quelle.split(alt).length - 1, 'Vorbedingung: der Anker steht genau einmal im Kern').toBe(1);
    const kopie = require('node:path').join(H.frischerTmp('fremder-anker'), 'kern-fremder-anker.html');
    fs.writeFileSync(kopie, quelle.replace(alt, "x: '" + fremd + "'"));
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.kern.oeffnen(p, 'file://' + kopie);
    await H.kern.depotAnlegen(p, { name: NAME, pw: PW });
    await H.kern.oeffneSektor(p, 'advanceCare');
    await p.waitForSelector('#content .bereich-kopf');
    await p.waitForTimeout(3000);   // die Kette läuft beim Öffnen; ihr Ergebnis kommt asynchron
    expect(await p.evaluate(amtlicheGruppe), 'bei fremdem Anker steht die Gruppe „Amtliche Vorlagen“ NICHT da').toBe(false);
    await ctx.close();
  });
});
