'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-211: Sicherungsstand bekannt (persistierter Datei-Backup-Stand)
   ────────────────────────────────────────────────────────────────────────
   Vorher lebte der letzte Datei-Sicherungszeitpunkt in einer reinen
   Arbeitsspeicher-Variable (_letzteSicherungskopieISO) — bei jedem neuen
   Fenster/Tab/Gerätewechsel wieder auf null, unabhängig davon, ob wirklich
   frisch gesichert worden war. Die 14-Tage-Erinnerung war dadurch faktisch
   „einmal pro Sitzung fällig", nie ein echter Datei-Stand — s. Bericht
   „Interner Speicher als Zuhause, Zug 0" (Dritter Nachtrag).

   Seit diesem ADR steht der Stand in data.sicherungsStand (Teil des Depot-
   Inhalts selbst, reist im Umschlag mit) — übersteht Neuladen UND Geräte-
   wechsel, weil er in derselben verschlüsselten Datei steckt wie alles
   andere. Zwei Proben, wie beauftragt:
     Rot-Beweis:  der Stand übersteht einen echten Serialisieren→Laden-
                   Rundlauf (= neue Sitzung, neues Gerät). Mit der alten
                   Variable strukturell unmöglich — sie war nie Teil von
                   depotSerialisieren()s Ausgabe.
     Gegenprobe:  ein Depot OHNE dieses Feld (= jedes heute bestehende
                   Depot) bricht an keiner der drei Verbrauchsstellen
                   (exportErinnerungModell, markiereUngespeichert,
                   flowDepotListe/Depot-Liste), sondern liest sauber als
                   „unbekannt" — nichts erfunden, kein Wurf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'sicherungsstand-pw-211';

async function frisch() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  return V;
}

/* ── Rot-Beweis — der Stand übersteht eine neue Sitzung ─────────────────── */

test('[U2-ADR-211·Rot-Beweis] Sicherungsstand übersteht Serialisieren→Laden (= neue Sitzung/neues Gerät)', async () => {
  const V = await frisch();
  V.markiereAlsDateiGesichert();               // = erfolgreicher .vivodepot-Export, Zähler 0
  V.markiereUngespeichert(3);                  // drei Änderungen seither
  const umschlag = await V.depotSerialisieren();
  const { V: V2 } = ladeKern();                // frischer Kontext = neue Sitzung/neues Gerät
  await V2.depotLaden(umschlag, PW);
  const stand = V2.getData().sicherungsStand;
  assert.ok(stand && typeof stand === 'object', 'Sicherungsstand ist Teil des geladenen Depot-Inhalts');
  assert.equal(typeof stand.letzteDateiIso, 'string', 'Zeitpunkt ist eine ISO-Zeichenkette');
  assert.equal(stand.aenderungenDanach, 3, 'die drei Änderungen seither sind mitgereist');
  // Mit der alten Arbeitsspeicher-Variable strukturell unmöglich: sie war nie Teil von
  // depotSerialisieren()s Ausgabe — ein frischer Kontext kannte sie grundsätzlich nie.
  const m = V2.exportErinnerungModell();
  assert.equal(m.jeExportiert, true, 'die neue Sitzung KENNT den echten Stand');
  assert.equal(m.aenderungenSeither, 3);
  assert.equal(m.tageHer, 0, 'gerade eben gesichert, vor Sekunden — 0 volle Tage her');
});

test('[U2-ADR-211·Rot-Beweis] markiereUngespeichert() zählt NACH einem Datei-Save am persistierten Stand mit, nicht nur im alten Zähler', async () => {
  const V = await frisch();
  V.markiereAlsDateiGesichert();
  assert.equal(V.getData().sicherungsStand.aenderungenDanach, 0, 'Basislinie direkt nach dem Save: 0');
  V.markiereUngespeichert();
  V.markiereUngespeichert(2);
  assert.equal(V.getData().sicherungsStand.aenderungenDanach, 3, 'Default-1 + 2 = 3, im PERSISTIERTEN Feld');
});

/* ── Gegenprobe — ein Depot OHNE dieses Feld bricht nirgends ────────────── */

test('[U2-ADR-211·Gegenprobe] exportErinnerungModell() ohne sicherungsStand: kein Wurf, sauber „unbekannt"', async () => {
  const V = await frisch();
  assert.equal(V.getData().sicherungsStand, undefined,
    'Voraussetzung: ein frisches Depot hat das Feld nie gesetzt — genau die Form jedes heutigen Depots');
  const m = V.exportErinnerungModell();
  assert.equal(m.jeExportiert, false);
  assert.equal(m.tageHer, null);
  assert.equal(m.aenderungenSeither, null, '„unbekannt", nicht 0 — 0 wäre eine erfundene Behauptung');
});

test('[U2-ADR-211·Gegenprobe] markiereUngespeichert() ohne sicherungsStand: kein Wurf, der alte Dirty-Zähler bleibt richtig', async () => {
  const V = await frisch();
  delete V.getData().sicherungsStand;          // explizit die alte Form
  assert.doesNotThrow(() => V.markiereUngespeichert(4));
  assert.equal(V.ungespeichertAnzahl(), 4, 'der bestehende Dirty-Zähler ist vom fehlenden neuen Feld unberührt');
});

test('[U2-ADR-211·Gegenprobe] exportErinnerungVielleichtZeigen() ohne sicherungsStand: alter Wortlaut, kein unersetzter Platzhalter', async () => {
  const { V } = ladeKern({ indexedDB: {} });    // interner Speicher-Modus, damit „fällig" überhaupt erreichbar ist
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  assert.equal(V.getData().sicherungsStand, undefined, 'Voraussetzung: kein Stand bekannt');
  const erfasst = [];
  V.ui.toast = (text, art) => erfasst.push({ text, art });
  const gezeigt = V.exportErinnerungVielleichtZeigen();
  assert.equal(gezeigt, true, 'ohne bekannten Stand bleibt die alte, unbedingte Erinnerung fällig');
  assert.equal(erfasst.length, 1, 'genau ein Toast');
  const txt = erfasst[0].text;
  assert.ok(!/\{tage\}|\{aenderungen\}/.test(txt), 'kein unersetzter Platzhalter — der Zustands-Wortlaut darf hier NICHT greifen');
  // Welche der beiden bestehenden Fassungen (Basis/Risiko) greift, hängt von erhoehtesVerlustRisiko()
  // ab (hier nicht gezielt gesetzt) — geprüft wird nur: eine der beiden ALTEN, nicht die neue Zustands-Fassung.
  assert.ok(txt === V.STRINGS.exportErinnerung || txt === V.STRINGS.exportErinnerungRisiko,
    'ohne Stand greift eine der beiden bestehenden Fassungen, nie der neue Zustands-Wortlaut');
});

test('[U2-ADR-211·Gegenprobe] Depot-Liste: Dateiname bekannt, sicherungsStand fehlt → Zeitpunkt-Zeile bleibt schlicht weg, nichts erfunden', async () => {
  const fakeHandle = { name: 'alt.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) };
  const { V, document } = ladeKern({ showSaveFilePicker: async () => fakeHandle, indexedDB: {} });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  await V.depotInDateiSichern();                // setzt _dateiName UND sicherungsStand zusammen
  delete V.getData().sicherungsStand;            // simuliert: Datei predates dieses ADR, Name aber bekannt
  assert.doesNotThrow(() => V.flowDepotListe());
  const html = document.getElementById('modal-inhalt').innerHTML || '';
  assert.ok(html.includes('alt.vivodepot'), 'Dateiname bleibt sichtbar — unabhängig vom neuen Feld');
  assert.ok(!html.includes(V.STRINGS.depotListeZuletztGespeichertLabel), 'Zeitpunkt-Zeile fehlt sauber, statt etwas zu erfinden');
});

/* ── Wortlaut-Mechanik — der {Platzhalter}-Ersatz selbst arbeitet korrekt ── */

test('[U2-ADR-211] mit bekanntem Stand ersetzt der Zustands-Wortlaut BEIDE Platzhalter mit echten Zahlen', async () => {
  const { V } = ladeKern({ indexedDB: {} });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.markiereAlsDateiGesichert();
  const vor20 = new Date(Date.now() - 20 * 86400000).toISOString();
  V.getData().sicherungsStand.letzteDateiIso = vor20;   // Schwelle 14 Tage überschritten → fällig
  V.getData().sicherungsStand.aenderungenDanach = 7;
  const erfasst = [];
  V.ui.toast = (text) => erfasst.push(text);
  const gezeigt = V.exportErinnerungVielleichtZeigen();
  assert.equal(gezeigt, true, 'über der Schwelle → fällig');
  assert.equal(erfasst.length, 1);
  assert.ok(!/\{tage\}|\{aenderungen\}/.test(erfasst[0]), 'beide Platzhalter ersetzt');
  assert.ok(/\b(19|20|21)\b/.test(erfasst[0]), 'die Tage-Zahl steht im Text (~20, Toleranz für Rundung)');
  assert.ok(erfasst[0].includes('7'), 'die Änderungen-Zahl (7) steht im Text');
});
