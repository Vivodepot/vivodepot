'use strict';
/* ═════════════════════════════════════════════════════════════════
   Befund UX-INSTRUMENT-ANHANG (Usability-Durchlauf v963, 30.10.2026)
   ─────────────────────────────────────────────────────────────────
   Die unterschriebene Verfügung ließ sich seit UX-DOKUMENT-ABLEGEN in „Vorsorge
   & Recht“ ablegen, das Vorsorge-Instrument verwies aber nicht auf sie: die
   Unterfelder von provisionInstruments kannten keinen Verweis auf die Mappe.

   Abnahme (Gestaltungsleitung 31.10.2026, Nachtrag U2-ADR-013): Das Instrument
   hat das Feld „Unterschriebenes Dokument“. Leer steht „Noch keine Datei
   angehängt.“ mit „Datei anhängen“; mit Datei ihr Name und „Öffnen“ / „Entfernen“.
   Ein vorhandenes Dokument lässt sich wählen. Hochgeladen wird im offenen
   Eintrag, abgelegt im Bereich des Eintrags und als sensibel vorgeschlagen.

   Wächter gegen die Klasse: jeder Verweis auf die Mappe in einer Listenzeile
   zeichnet sich als Anhang und nicht als Auswahl mit „Dokument hinzufügen“, die
   aus dem Eintrag einen zweiten Dialog öffnen müsste (Dialoge stapeln nicht).
   Der ganze Ablauf mit Hochladen braucht einen Browser; hier geprüft sind
   Datenmodell, Zeichnung und Verdrahtung.

   Rot-Beweis: auf dem Stand vor dem Fix fehlt das Unterfeld, und ein Verweis auf
   die Mappe in einer Liste zeichnet die Auswahl mit „__upload__“.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'instrument-anhang-pw-991';

async function frischMitDepot() {
  const k = ladeKern({ zusatzBindungen: ['bereicheAlle', 'listenEintragInputsHTML', '_anhangVerdrahten', 'listenEintragZusammenfassung'] });
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  k.V.betreteApp();
  return k;
}
const instrumente = (V) => {
  const s = V.__zusatz.bereicheAlle().find((b) => b.id === 'advanceCare');
  for (const sek of s.sektionen || [{ felder: s.felder }]) {
    const f = (sek.felder || []).find((x) => x.id === 'provisionInstruments');
    if (f) return f;
  }
  return (s.felder || []).find((x) => x.id === 'provisionInstruments');
};

test('[Instrument-Anhang] provisionInstruments hat das Unterfeld „Unterschriebenes Dokument“ (Verweis auf die Mappe, sensibel)', async () => {
  const { V } = await frischMitDepot();
  const feld = instrumente(V);
  assert.ok(feld, 'die Liste der Vorsorge-Instrumente ist gelesen');
  const uf = (feld.unterFelder || []).find((u) => u.id === 'attachedDocument');
  assert.ok(uf, 'ROT ERWARTET vor dem Fix: das Unterfeld attachedDocument fehlt');
  assert.equal(uf.typ, 'ref');
  assert.equal(uf.entitaet, 'mappe');
  assert.equal(uf.sensibel, true, 'Vorsorgedokumente tragen Gesundheitsangaben');
  assert.equal(uf.label, 'Unterschriebenes Dokument');
  assert.equal(uf.sichtbarWenn, undefined, 'für jedes Instrument');
});

test('[Instrument-Anhang] Texte DE nach der Gestaltungsleitung', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.STRINGS.anhangHinzufuegen, 'Datei anhängen');
  assert.equal(V.STRINGS.anhangLeer, 'Noch keine Datei angehängt.');
  assert.equal(V.STRINGS.anhangVorhandenWaehlen, 'Vorhandenes Dokument wählen');
  assert.equal(V.STRINGS.btnOeffnen, 'Öffnen');
  assert.equal(V.STRINGS.btnEntfernen, 'Entfernen');
});

test('[Instrument-Anhang] leerer Eintrag: „Noch keine Datei angehängt.“ mit „Datei anhängen“, kein Hochladen über die Auswahl', async () => {
  const { V } = await frischMitDepot();
  const html = V.__zusatz.listenEintragInputsHTML(instrumente(V), {});
  const i = html.indexOf('data-sub-zeile="attachedDocument"');
  assert.ok(i > -1, 'die Zeile steht im Eintrag');
  const zeile = html.slice(i, html.indexOf('data-sub-zeile=', i + 10) > -1 ? html.indexOf('data-sub-zeile=', i + 10) : undefined);
  assert.ok(zeile.includes('Unterschriebenes Dokument'));
  assert.ok(zeile.includes('data-anhang="attachedDocument"'));
  assert.ok(zeile.includes('<input type="hidden" data-edit-ref="attachedDocument"'), 'der Wert steht in einem verborgenen Verweis-Element');
  assert.ok(zeile.includes(V.STRINGS.anhangLeer));
  assert.ok(zeile.includes('data-anhang-hinzufuegen>' + V.STRINGS.anhangHinzufuegen + '</button>'));
  assert.ok(!zeile.includes('__upload__'), 'die Auswahl mit „Dokument hinzufügen“ öffnete einen zweiten Dialog');
  assert.ok(!zeile.includes('data-anhang-wahl'), 'ohne Dokumente in der Mappe keine Auswahl');
});

test('[Instrument-Anhang] Eintrag mit Datei: Name, „Öffnen“, „Entfernen“, die Wahl zeigt das Dokument', async () => {
  const { V } = await frischMitDepot();
  const id = V.mappeEintragHinzufuegen({ dateiname: 'Vollmacht.pdf', beschriftung: 'Vorsorgevollmacht unterschrieben', mime: 'application/pdf', groesse: 10, inhalt: 'data:application/pdf;base64,JVBERg==', bereich: 'advanceCare', sensibel: true });
  V.mappeEintragHinzufuegen({ dateiname: 'Anderes.pdf', mime: 'application/pdf', groesse: 10, inhalt: 'data:application/pdf;base64,JVBERg==' });
  const html = V.__zusatz.listenEintragInputsHTML(instrumente(V), { instrument: 'enduring-power-of-attorney', attachedDocument: { ref: id } });
  const zeile = html.slice(html.indexOf('data-sub-zeile="attachedDocument"'));
  assert.ok(zeile.includes('value="' + id + '"'), 'der Verweis steht im verborgenen Element');
  assert.ok(zeile.includes('<strong data-anhang-name="">Vorsorgevollmacht unterschrieben</strong>'));
  assert.ok(zeile.includes('data-anhang-oeffnen>' + V.STRINGS.btnOeffnen + '</button>'));
  assert.ok(zeile.includes('data-anhang-entfernen>' + V.STRINGS.btnEntfernen + '</button>'));
  assert.ok(zeile.includes('<option value="' + id + '" selected="">'), 'die Wahl zeigt das angehängte Dokument');
  assert.ok(zeile.includes('Anderes.pdf'), 'ein anderes Dokument ist wählbar');
});

test('[Instrument-Anhang] Verdrahtung: Wahl setzt den Verweis, „Entfernen“ nimmt ihn, die Datei bleibt in der Mappe', async () => {
  const { V } = await frischMitDepot();
  const id = V.mappeEintragHinzufuegen({ dateiname: 'Patientenverfuegung.pdf', mime: 'application/pdf', groesse: 10, inhalt: 'data:application/pdf;base64,JVBERg==' });
  const el = () => ({ hidden: false, textContent: '' });
  const teile = { leer: el(), datei: el(), name: el(), oeffnen: {}, entfernen: {} };
  const zeile = {
    querySelector(sel) {
      return { '[data-anhang-leer]': teile.leer, '[data-anhang-datei]': teile.datei, '[data-anhang-name]': teile.name,
        '[data-anhang-oeffnen]': teile.oeffnen, '[data-anhang-entfernen]': teile.entfernen }[sel] || null;
    },
  };
  const wert = { value: '' };
  const wahl = { value: '', options: [{ value: '' }, { value: id }] };
  const box = {
    querySelector(sel) {
      if (sel === '[data-edit-ref]') return wert;
      if (sel === '[data-anhang-zeile]') return zeile;
      if (sel === '[data-anhang-wahl]') return wahl;
      return null;
    },
  };
  V.__zusatz._anhangVerdrahten({ querySelectorAll: (sel) => (sel === '[data-anhang]' ? [box] : []) }, '');
  assert.equal(typeof teile.entfernen.onclick, 'function', '„Entfernen“ ist verdrahtet');
  assert.equal(typeof teile.oeffnen.onclick, 'function', '„Öffnen“ ist verdrahtet');
  wahl.value = id;
  wahl.onchange();
  assert.equal(wert.value, id, 'die Wahl setzt den Verweis');
  assert.equal(teile.name.textContent, 'Patientenverfuegung.pdf', 'der Name kommt als Text, nicht als HTML');
  assert.equal(teile.datei.hidden, false);
  assert.equal(teile.leer.hidden, true);
  teile.entfernen.onclick();
  assert.equal(wert.value, '', '„Entfernen“ nimmt den Verweis');
  assert.equal(teile.leer.hidden, false, 'wieder „Noch keine Datei angehängt.“');
  assert.equal(wahl.value, '');
  assert.ok(V.mappeEintrag(id), 'die Datei bleibt in der Mappe');
});

/* Nachbesserung nach der Abnahme-Runde der Gestaltungsleitung (31.10.2026): Knöpfe als Pillen wie „Abbrechen“ und „Speichern“
   mit „Ablegen“ als Hauptknopf, der Leertext nicht kursiv, „Vertraulich: …“ mit dem Kästchen daneben, die kleine Ablage schließt
   nach „Ablegen“ (ihr `hidden` gewinnt gegen display:flex), und die gespeicherte Zeile sagt, dass ein Dokument anhängt. */
test('[Instrument-Anhang] Gestaltung: Pillen, Leertext, Vertraulich, die Ablage schließt, die Zeile nennt das Dokument', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.STRINGS.anhangVertraulich, 'Vertraulich: nur auf dem Bildschirm zeigen, nicht drucken');
  assert.equal(V.STRINGS.anhangMitDokument, 'mit unterschriebenem Dokument');
  const html = V.__zusatz.listenEintragInputsHTML(instrumente(V), {});
  const zeile = html.slice(html.indexOf('data-sub-zeile="attachedDocument"'));
  assert.ok(zeile.includes('<button type="button" class="btn" data-anhang-ablegen>'), '„Ablegen“ ist der Hauptknopf');
  assert.ok(zeile.includes('<button type="button" class="btn btn-sek" data-anhang-verwerfen>'));
  assert.ok(zeile.includes('<button type="button" class="btn btn-sek" data-anhang-hinzufuegen>'));
  assert.ok(zeile.includes('<span data-anhang-leer="">'), 'der Leertext trägt nicht die kursive Klasse „leer“');
  assert.ok(zeile.includes('data-anhang-sensibel-wahl=""> ' + V.STRINGS.anhangVertraulich + '</label>'), 'das Kästchen steht vor dem Text in derselben Zeile');
  const kern = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.match(kern, /\.inline-neu\[hidden\] \{ display: none; \}/, 'nach „Ablegen“ und „Verwerfen“ ist die Ablage wirklich weg');
  const id = V.mappeEintragHinzufuegen({ dateiname: 'PV.pdf', mime: 'application/pdf', groesse: 10, inhalt: 'data:application/pdf;base64,JVBERg==' });
  const text = V.__zusatz.listenEintragZusammenfassung(instrumente(V), { instrument: 'living-will', attachedDocument: { ref: id } });
  assert.ok(text.endsWith(' · ' + V.STRINGS.anhangMitDokument), 'die gespeicherte Zeile nennt das Dokument: ' + text);
  assert.ok(!text.includes('PV.pdf'), 'nicht den Dateinamen, nur dass eines anhängt');
});

test('[Instrument-Anhang] Wächter: jeder Verweis auf die Mappe in einer Listenzeile zeichnet sich als Anhang', async () => {
  const { V } = await frischMitDepot();
  let gefunden = 0;
  for (const s of V.__zusatz.bereicheAlle()) {
    const felder = [].concat(...(s.sektionen || []).map((x) => x.felder || []), s.felder || []);
    for (const f of felder) {
      if (f.typ !== 'liste') continue;
      for (const uf of f.unterFelder || []) {
        if (uf.typ !== 'ref' || uf.entitaet !== 'mappe') continue;
        gefunden++;
        const html = V.__zusatz.listenEintragInputsHTML(f, {});
        const zeile = html.slice(html.indexOf('data-sub-zeile="' + uf.id + '"'));
        assert.ok(zeile.includes('data-anhang="' + uf.id + '"'), s.id + '.' + f.id + '/' + uf.id + ': als Anhang gezeichnet');
        assert.ok(!zeile.slice(0, zeile.indexOf('</div></div>')).includes('__upload__'), s.id + '.' + f.id + '/' + uf.id + ': kein zweiter Dialog aus dem Eintrag');
      }
    }
  }
  assert.ok(gefunden >= 1, 'mindestens das unterschriebene Dokument der Vorsorge-Instrumente');
});
