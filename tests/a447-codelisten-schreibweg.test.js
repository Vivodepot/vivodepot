'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A447 · Eigene Codelisten — der Schreibweg, die Meldung und der Weg aufs Blatt
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND, der den Posten trägt: `codeListen` steht seit U2-ADR-051 im
   Einreich-Schema, die Formprüfung kennt sie, der Kern liest sie — und NICHTS
   schrieb sie. Die ADR nennt es unter „Offen/Kosten" selbst: die Generator-Seite
   folge „mit dem nächsten Generator-Auftrag". Sie folgte nie.

   DREI ZÜGE, alle aus dem Ergebnisblatt vom 21.08.2026:
     Zug 2 — der Schreibweg (`baueSubmission` hängt `codeListen` an).
     Zug 2b — die Herkunft ist gekennzeichnet: sie kommt aus dem signierten
              Zertifikat, nicht aus dem Modulnamen.
     Zug 3 — die irreführende Meldung fällt mit.

   ZUG 3 IST DER EIGENTLICHE FUND, und er ist gemessen, nicht erschlossen: ein
   `auswahl`-Feld, dessen Werte in einer MITGEBRACHTEN Liste liegen, wurde
   abgewiesen mit „auswahl/mehrfachauswahl ohne codeWerte" — die Meldung zeigte
   auf das Feld, während die Werte im selben Bündel lagen. Dieselbe Fehlklasse
   wie der Feldtyp-Spiegel vor A376: zwei Hälften gebaut, das verbindende Stück
   fehlt, beide Seiten sehen für sich in Ordnung aus.

   „MITLAUFEND" WAR OHNE A446 NICHT ERFÜLLBAR — das DOCX war leer. Die Probe
   unten fährt darum alle drei Ausgaben, nicht eine stellvertretend.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');

const LISTE = {
  systemId: 'aktenart', uri: 'http://loinc.org', kuerzel: 'RAK', lizenz: 'RAK-Lizenz',
  eintraege: [{ code: 'straf', anzeige: 'Strafsache' }, { code: 'zivil', anzeige: 'Zivilsache' }],
};
const FELD = { feldname: 'Aktenart', feldtyp: 'auswahl', pflicht: false, bereich: 'verwaltung', codeSystem: 'aktenart' };

/* ══ Zug 2 · Der Schreibweg ═══════════════════════════════════════════════ */

test('[A447·Zug 2·Rot-Beweis] `baueSubmission` schreibt die mitgebrachte Liste ins Template', () => {
  const { V } = ladeGenerator();
  const sub = V.baueSubmission({ felder: [FELD], anbieter: { name: 'RAK Köln' }, codeListen: [LISTE] });
  assert.ok(Array.isArray(sub.templates[0].codeListen), 'kein `codeListen` im Template — genau der Zustand vor A447');
  assert.equal(sub.templates[0].codeListen.length, 1);
  assert.equal(sub.templates[0].codeListen[0].systemId, 'aktenart');
  assert.equal(sub.templates[0].codeListen[0].eintraege.length, 2);
});

test('[A447·Zug 2] additiv wie die anderen sechs — ohne Angabe steht der Schlüssel nicht da', () => {
  /* Dieselbe Form wie `vorlageId`, `version`, `gueltigBis`, `widerruf`, `dokument`, `wortlaut`.
     Ein leer mitgeschriebener Schlüssel wäre eine Aussage, die niemand getroffen hat. */
  const { V } = ladeGenerator();
  const ohne = V.baueSubmission({ felder: [{ feldname: 'X', feldtyp: 'text', bereich: 'verwaltung' }], anbieter: { name: 'RAK' } });
  assert.equal('codeListen' in ohne.templates[0], false);
  const leer = V.baueSubmission({ felder: [{ feldname: 'X', feldtyp: 'text', bereich: 'verwaltung' }], anbieter: { name: 'RAK' }, codeListen: [] });
  assert.equal('codeListen' in leer.templates[0], false, 'eine leere Liste ist keine Liste');
});

/* ══ Zug 3 · Die Meldung zeigt nicht mehr auf das Feld ════════════════════ */

test('[A447·Zug 3·Rot-Beweis] ein auswahl-Feld darf seine Werte aus der mitgebrachten Liste nehmen', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate({ felder: [FELD], codeListen: [LISTE] }), null,
    'die Vorlage wird als Ganzes verworfen, obwohl die Werte im selben Bündel liegen — der Zustand vor A447');
});

test('[A447·Zug 3] bleibt die Liste aus, benennt die Meldung den SCHREIBWEG statt das Feld', () => {
  const { V } = ladeKern();
  const grund = V.validateTemplate({ felder: [FELD] });
  assert.ok(grund, 'ein Verweis ins Leere bleibt ein Fehler — die Prüfung wird nicht weich');
  assert.ok(grund.includes('template.codeListen'), 'die Meldung nennt den Ort, an den die Liste gehört: ' + grund);
  assert.ok(grund.includes('Aktenart'), 'und sie nennt das betroffene Feld: ' + grund);
});

test('[A447·Zug 3] der Weg über `codeWerte` am Feld bleibt unangetastet', () => {
  /* BEIDE WEGE GELTEN. Wer die Werte am Feld führt, merkt von diesem Zug nichts — und eine
     fehlgeformte `codeWerte`-Liste fällt weiterhin durch. */
  const { V } = ladeKern();
  const amFeld = { feldname: 'Aktenart', feldtyp: 'auswahl', bereich: 'verwaltung',
    codeWerte: [{ code: 'straf', anzeige: 'Strafsache' }] };
  assert.equal(V.validateTemplate({ felder: [amFeld] }), null);
  assert.ok(V.validateTemplate({ felder: [Object.assign({}, amFeld, { codeWerte: [{ code: 'straf' }] })] }),
    'unvollständige codeWerte fallen weiterhin durch');
  assert.ok(V.validateTemplate({ felder: [{ feldname: 'Aktenart', feldtyp: 'auswahl', bereich: 'verwaltung' }] }),
    'weder Werte noch Verweis bleibt ein Fehler');
});

/* ══ Zug 2b · Die Herkunft, und wo sie gestempelt wird ════════════════════ */

test('[A447·Zug 2b] die Herkunft kommt aus dem signierten Zertifikat, nicht aus dem Bündel', () => {
  /* GEMESSEN: der Schreibweg trägt KEIN Herausgeber-Feld — er könnte auch keins tragen, das
     Schema lässt an einer Liste nur systemId/uri/version/kuerzel/lizenz/eintraege zu. Gestempelt
     wird beim Empfänger, aus derselben Quelle wie der Schlüssel. Ein Herausgeber-Feld am Bündel
     wäre ein zweiter, unsignierter Kanal für dieselbe Aussage. */
  const { V } = ladeKern();
  const cl = V._templateCodeListenUebersetzen({ codeListen: [LISTE] }, 'rak-koeln-anwaltsdepot');
  assert.equal(cl.codeListen[0].anbieterId, 'rak-koeln-anwaltsdepot');
  const ohne = V._templateCodeListenUebersetzen({ codeListen: [LISTE] }, null);
  assert.equal(ohne.codeListen[0].anbieterId, null,
    'ohne Zertifikat KEIN Herausgeber — lieber gar keine Angabe als eine aus dem Modulnamen geratene');
  const { V: G } = ladeGenerator();
  const sub = G.baueSubmission({ felder: [FELD], anbieter: { name: 'RAK Köln' }, codeListen: [LISTE] });
  assert.equal('herausgeber' in sub.templates[0].codeListen[0], false, 'kein zweiter Kanal im Bündel');
});

/* ══ Der Weg aufs Blatt — alle drei Ausgaben ══════════════════════════════ */

test('[A447] ein Wert aus der mitgebrachten Liste läuft mit — Export, PDF UND DOCX', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
  const tpl = { felder: [FELD], codeListen: [LISTE] };
  assert.equal(V.validateTemplate(tpl), null, 'Vorbedingung: die Vorlage ist gültig');
  const cl = V._templateCodeListenUebersetzen(tpl, 'rak-koeln');
  V.importAnwenden({
    zeilen: [], listen: [], register: [], verworfeneFelder: [], verworfeneCodeListen: [],
    quelleLabel: 'RAK Köln', codeListen: cl.codeListen,
    feldDefinitionen: [{ sektorId: 'administration', feldId: 'tpl_aktenart', label: 'Aktenart',
      typ: 'auswahl', codeSystemId: cl.map.aktenart, abschnitt: 'Kanzlei' }],
  });
  const d = V.getData();
  const codiert = V.codeWertAus(cl.map.aktenart, 'Strafsache');
  assert.equal(codiert.code, 'straf', 'Vorbedingung: der Wert dockt an die Liste an');
  d.sektoren.administration = Object.assign({}, d.sektoren.administration || {}, { tpl_aktenart: codiert });
  V.setData(d);

  const pdf = V.vollDepotModell({ sensibel: false }).bereiche.find((b) => b.id === 'administration');
  assert.ok(pdf.sektionen.flatMap((s) => s.zeilen).some((z) => z.label === 'Aktenart' && z.wert === 'Strafsache'),
    'der Anzeigename steht auf dem Blatt, nicht der Code');
  const docx = V.docxBereichModell('administration', { sensibel: false });
  assert.ok(docx.zeilen.some((z) => z.label === 'Aktenart' && z.wert === 'Strafsache'),
    'und im Word-Dokument — DIESER Teil war vor A446 unerfüllbar, das DOCX war leer');
  const txt = JSON.stringify(V.vollExportJSON({ sensibel: false }));
  assert.ok(txt.includes('Strafsache') && txt.includes('straf'),
    'im Export reisen Anzeigename UND Code — ein codierter Wert ist selbsttragend (U2-ADR-051)');
});

/* ══ Die Grenze, die BLEIBT — und die niemand still verschieben soll ══════ */

test('[A447·Grenze] eine Liste mit EIGENER Herkunfts-URI wird heute abgelehnt — Vorlage, nicht Bau', () => {
  /* GEMESSEN am 21.08.2026 und ausdrücklich NICHT geändert. Die Prüfung verlangt seit A110/Z14
     (06.08.2026), dass die `uri` einer mitgebrachten Liste auf eine der sechs GEFÜHRTEN
     Terminologien zeigt. Eine Kammer kann damit einen AUSSCHNITT einer geführten Terminologie
     ausliefern — ihr eigenes Vokabular nicht.

     DAS KOLLIDIERT mit U2-ADR-051, deren Begründung ausdrücklich lautet, nicht-antizipierte
     Code-Systeme sollten KEINE App-Änderung erzwingen. Sichtbar wird die Kollision erst jetzt,
     weil vor A447 überhaupt niemand eine Liste schreiben konnte.

     WAS DARAN ENTSCHIEDEN IST: dass die Liste beim Herausgeber bleibt und es KEINE siebte
     geführte Terminologie gibt. WAS NICHT ENTSCHIEDEN IST: ob eine selbst vergebene Herkunfts-
     URI zugelassen wird. Das ist eine Produktentscheidung und ist eine Produktentscheidung.

     Diese Probe friert die Grenze nicht ein, sie macht sie LAUT: wer sie verschiebt, verschiebt
     sie sehenden Auges. */
  const { V } = ladeKern();
  const eigene = Object.assign({}, LISTE, { uri: 'urn:rak-koeln:aktenart' });
  const grund = V.validateTemplate({ felder: [FELD], codeListen: [eigene] });
  assert.ok(grund && grund.includes('Herkunft unbekannt'),
    'die Grenze steht nicht mehr — wenn das gewollt ist, gehört die Entscheidung in eine ADR: ' + String(grund));
  const ohneUri = Object.assign({}, LISTE); delete ohneUri.uri;
  assert.ok(V.validateTemplate({ felder: [FELD], codeListen: [ohneUri] }),
    'auch eine Liste ganz ohne `uri` fällt durch — der Ersatz-Namensraum im Übersetzer '
    + '(`urn:vivodepot:tpl-codeliste:…`) ist damit heute unerreichbar');
});
