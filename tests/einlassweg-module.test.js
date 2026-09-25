'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Glied 5 · Der Einlassweg — EIN Weg für alle Register, nicht drei
   ────────────────────────────────────────────────────────────────────────
   Gemessen (A271, hier neu bestätigt): `textsatzModulEinbetten`,
   `institutionsArtModulEinbetten` und `_rechtsraumModulEinbetten` kamen im
   ganzen Kern je genau EINMAL vor — in ihrer eigenen Definition. Keiner
   hatte einen Aufrufer. Die drei Register wurden beim Öffnen gelesen, aber
   niemand konnte je etwas hineingeben.

   Die drei Rot-Belege, die der Auftrag verlangt:
   ein eingelassenes Modul WIRKT · eines mit reservierter Kennung wird
   ABGELEHNT · der Hinweis ERSCHEINT.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function frisch() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  return V;
}

/* ══ Die Vorbedingung: der Befund, aus dem dieses Glied kommt ═══════════ */

test('[Glied 5·Vorbedingung] die drei Einbett-Funktionen hatten keinen Aufrufer — jetzt haben sie einen gemeinsamen', () => {
  const { V, src } = ladeKern();
  /* Die Zahl ist NICHT der Gegenstand — der EINE Weg ist es. Glied 7 hat das vierte
     Register (`format`, U2-ADR-146) angemeldet, ohne einen zweiten Einlassweg zu bauen;
     genau das ist die Zusage aus U2-ADR-145 Punkt 1. Darum prüft diese Zeile die FORM
     jedes Eintrags und die drei, auf die Glied 5 gebaut wurde — nicht eine Obergrenze. */
  assert.ok(V.EINLASS_REGISTER.length >= 3, 'mindestens die drei Register aus Glied 5');
  for (const t of ['textsatz', 'rechtsraum', 'institutionsArt']) {
    assert.ok(V.EINLASS_REGISTER.some(r => r.typ === t), t + ' ist angemeldet');
  }
  for (const r of V.EINLASS_REGISTER) {
    for (const k of ['typ', 'slot', 'pruefen', 'einbetten', 'kennung']) {
      assert.ok(r[k], 'jeder Registereintrag hat ' + k + ' (fehlt bei ' + r.typ + ')');
    }
  }
  // Jede der drei Einbett-Funktionen wird jetzt aus dem Register heraus gerufen.
  for (const f of ['textsatzModulEinbetten', 'institutionsArtModulEinbetten', '_rechtsraumModulEinbetten']) {
    const treffer = (src.match(new RegExp(f, 'g')) || []).length;
    assert.ok(treffer >= 2, f + ' hat jetzt mindestens einen Aufrufer neben seiner Definition (gefunden: ' + treffer + ')');
  }
});

/* ══ Rot-Beleg 1 · ein eingelassenes Modul WIRKT ════════════════════════ */

test('[Glied 5·Rot 1] ein eingelassenes Textsatz-Modul landet im Depot und wirkt', () => {
  const V = frisch();
  const kennung = Object.keys(V.TEXTSATZ_DE_QUELLE.texte)[0];
  assert.ok(kennung, 'Vorbedingung: der eingebaute Satz hat Kennungen');
  const modul = { modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1, texte: { [kennung]: 'Un texte français' } };
  const r = V.modulEinlassen(JSON.stringify(modul));
  assert.equal(r.angenommen, true, r.grund || '');
  assert.equal(r.typ, 'textsatz');
  assert.equal(r.kennung, 'fr');
  assert.equal(V.getData().textsatzModule.length, 1, 'es liegt im Depot');
  // Und es WIRKT: die Boot-Registrierung nimmt es an.
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1, 'die Registrierung zählt es');
});

test('[Glied 5·Rot 1] auch für die beiden anderen Register — EIN Weg, nicht drei', () => {
  const V = frisch();
  const inst = { modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'fr-kammer', moduleVersion: 1, arten: { notaire: 'Notaire' } };
  assert.equal(V.modulEinlassen(JSON.stringify(inst)).angenommen, true);
  assert.equal(V.getData().institutionsArten.length, 1);
  const rr = { modulTyp: 'rechtsraum', sprache: 'de', rechtsraum: 'FR', moduleVersion: 1,
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: 'Texte' } } };
  const r = V.modulEinlassen(JSON.stringify(rr));
  assert.equal(r.angenommen, true, r.grund || '');
  assert.equal(V.getData().rechtsraumModule.length, 1);
  assert.equal(V._rechtsraumModuleAusDepotAnmelden(V.getData()), 1, 'auch dieses wirkt');
});

/* ══ Rot-Beleg 2 · reservierte Kennung wird abgelehnt ═══════════════════ */

test('[Glied 5·Rot 2] ein Modul mit RESERVIERTER Kennung wird abgelehnt — je Register', () => {
  const V = frisch();
  const kennung = Object.keys(V.TEXTSATZ_DE_QUELLE.texte)[0];
  const t = V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', sprache: V.TEXTSATZ_SPRACHE_EINGEBAUT,
    moduleVersion: 1, texte: { [kennung]: 'x' } }));
  assert.equal(t.angenommen, false);
  assert.equal(t.grund, 'reserviert', 'die eingebaute Sprache ist nicht überschreibbar');
  const r = V.modulEinlassen(JSON.stringify({ modulTyp: 'rechtsraum', sprache: 'de', rechtsraum: 'DE', moduleVersion: 1,
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1 } } }));
  assert.equal(r.grund, 'reserviert', 'der eingebaute Rechtsraum ebenso');
  // Und: ein abgelehntes Modul hinterlässt KEINE Spur.
  assert.deepEqual(V.getData().textsatzModule, []);
  assert.deepEqual(V.getData().rechtsraumModule, []);
});

test('[Glied 5·Rot 2] eine reservierte Institutions-Art wird namentlich verworfen, nicht das Modul', () => {
  const V = frisch();
  const eingebaut = V.INSTITUTION_ART_EINGEBAUT[0];
  const r = V.modulEinlassen(JSON.stringify({ modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'x', moduleVersion: 1,
    arten: { [eingebaut]: 'Neuer Name', eigene: 'Eigene Art' } }));
  assert.equal(r.angenommen, true, 'das Modul selbst gilt');
  assert.ok(r.verworfene.some(v => v.kennung === eingebaut && v.grund === 'reserviert'),
    'die reservierte Kennung wird BENANNT verworfen — nicht das ganze Modul');
});

/* ══ Rot-Beleg 3 · der Hinweis erscheint ════════════════════════════════ */

test('[Glied 5·Rot 3] der Hinweis erscheint — und nur, wenn es etwas zu sagen gibt', () => {
  const V = frisch();
  // Der WEG steht immer da (ein Register ohne Tür ist kein Register), der HINWEIS nur bei Bestand.
  assert.ok(V.einstellungenHTML().includes('einst-modul-einlassen'), 'die Tür steht immer offen');
  assert.ok(!V.einstellungenHTML().includes(V.STRINGS.moduleUngeprueftHinweis),
    'ohne eingelassenes Modul schweigt der Hinweis — eine Warnung ohne Anlass ist Rauschen');
  V.modulEinlassen(JSON.stringify({ modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'fr-kammer', moduleVersion: 1,
    arten: { notaire: 'Notaire' } }));
  const html = V.einstellungenHTML();
  assert.ok(html.includes(V.STRINGS.einstAbschnittModule), 'der Abschnitt steht da');
  assert.ok(html.includes('Niemand hat sie geprüft'), 'und der Hinweis sagt, was der Unterschied ist');
  assert.ok(html.includes('fr-kammer'), 'das Modul wird beim Namen genannt');
});

test('[Glied 5] die Marke reist AM MODUL mit — sie überlebt Export und Re-Import', () => {
  const V = frisch();
  V.modulEinlassen(JSON.stringify({ modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'fr-kammer', moduleVersion: 1,
    arten: { notaire: 'Notaire' } }));
  const m = V.getData().institutionsArten[0];
  assert.equal(m.ungeprueft, true, 'die Marke steht am Modul, nicht in einer Liste daneben');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(m.eingelassenAm), 'mit dem Tag, an dem es hereinkam');
  // Ein zweites Register über dieselbe Sache liefe auseinander — belegt: nach einem
  // JSON-Rundlauf (wie beim Export) ist die Marke noch da.
  const wieder = JSON.parse(JSON.stringify(V.getData().institutionsArten))[0];
  assert.equal(wieder.ungeprueft, true);
});

/* ══ Was der Weg NICHT tut ═════════════════════════════════════════════ */

test('[Glied 5] ein kaputtes Modul ist ein Befund, kein Absturz', () => {
  const V = frisch();
  for (const [eingabe, grund] of [
    ['{kaputt', 'kein-json'],
    ['[]', 'kein-objekt'],
    ['{"modulTyp":"phantasie"}', 'unbekannter-typ'],
    ['{"modulTyp":"textsatz"}', 'sprache'],
    ['{"modulTyp":"rechtsraum","rechtsraum":"FR"}', 'moduleVersion'],
  ]) {
    const r = V.modulEinlassen(eingabe);
    assert.equal(r.angenommen, false, eingabe);
    assert.equal(r.grund, grund, eingabe + ' → ' + r.grund);
  }
  assert.deepEqual(V.getData().textsatzModule, [], 'kein Halbes im Depot');
  assert.deepEqual(V.getData().rechtsraumModule, []);
  assert.deepEqual(V.getData().institutionsArten, []);
});

test('[Glied 5] der Einlassweg ändert den Depot-Umschlag NICHT — das war die Abbruchbedingung', () => {
  const V = frisch();
  const vorher = Object.keys(V.leeresDepot()).sort();
  V.modulEinlassen(JSON.stringify({ modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'x', moduleVersion: 1, arten: { a: 'A' } }));
  const nachher = Object.keys(V.getData()).sort();
  assert.deepEqual(nachher, vorher,
    'kein neuer Schlüssel im Grundgerüst — ein zusätzlicher Eintrag in einem bestehenden Array ist kein Formatwechsel');
});

test('[Glied 5] ein eingelassenes Modul zertifiziert niemanden — die Signatur-Architektur bleibt unberührt', () => {
  const V = frisch();
  V.modulEinlassen(JSON.stringify({ modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'x', moduleVersion: 1, arten: { a: 'A' } }));
  const m = V.getData().institutionsArten[0];
  assert.equal(m.templateJws, undefined, 'es trägt keine Signatur');
  assert.equal(m.anbieterCert, undefined, 'und kein Anbieter-Zertifikat');
  assert.equal(m.ungeprueft, true, 'es sagt „ich habe es selbst hineingelassen", nicht „jemand steht dafür ein"');
});

/* ══ A355, Zug 4 — ZWEI MODULE NEBENEINANDER ═══════════════════════════════
   Der Auftrag „Wo gar keine Probe ist" (19.08.2026) nennt vier Fälle des
   Einlasswegs. Drei waren gedeckt; dieser nicht — und er ist der, der in der
   Pro-Fassung zuerst eintritt: eine Kammer dockt ihren Feldsatz an, ein
   Rechtsraum-Modul liegt daneben, und irgendwann ein zweites derselben Art.

   DER VIERTE FALL — „ein Modul mit falscher Signatur" — ist GEGENSTANDSLOS und
   das ist belegt, nicht behauptet: die Probe „ein eingelassenes Modul
   zertifiziert niemanden" oben hält fest, dass ein Modul GAR KEINE Signatur
   trägt (`templateJws === undefined`). Ein Modul ist Struktur, kein Zeugnis;
   die Signatur-Architektur liegt auf den Anbieter-Vorlagen, nicht hier. Eine
   Probe „falsche Signatur wird abgewiesen" prüfte einen Weg, den es nicht gibt. */

test('[A355·Zug4] zwei Textsatz-Module verschiedener Sprachen liegen nebeneinander', () => {
  const V = frisch();
  const d = V.getData();
  d.textsprache = 'xx';
  d.textsatzModule = [
    { id: 'a', sprache: 'xx', moduleVersion: 1, texte: { 'identity.givenName.label': 'XX-VORNAME' } },
    { id: 'b', sprache: 'yy', moduleVersion: 1, texte: { 'identity.givenName.label': 'YY-VORNAME' } },
  ];
  V.setData(d);
  const n = V._textsatzModuleAusDepotAnmelden(V.getData());
  assert.equal(n, 2, 'beide Module müssen angemeldet werden — sonst misst die Probe nichts');
  if (V.textsatzNeuAnwenden) V.textsatzNeuAnwenden();
  const label = () => V.SEKTOR_BY_ID.identity.sektionen
    .flatMap((s) => s.felder || []).find((f) => f.id === 'givenName').label;
  assert.equal(label(), 'XX-VORNAME', 'die aktive Sprache gewinnt');

  /* Und das andere ist nicht verschwunden, sondern wartet: die Sprache umschalten
     zeigt es. Ohne diese Zeile hiesse „nebeneinander" nur „das zweite stört nicht". */
  const d2 = V.getData(); d2.textsprache = 'yy'; V.setData(d2);
  if (V.textsatzNeuAnwenden) V.textsatzNeuAnwenden();
  assert.equal(label(), 'YY-VORNAME', 'das zweite Modul liegt bereit und greift nach dem Wechsel');
});

test('[A355·Zug4] zwei Module DERSELBEN Sprache: das spätere gewinnt, und das ist kein Verlust', () => {
  /* `_textsatzModuleAusDepotAnmelden` schreibt `registry[m.sprache] = …` — bei
     gleicher Sprache überschreibt der spätere Eintrag den früheren. Das ist eine
     Eigenschaft, keine Panne, aber sie stand nirgends geprüft: eine Kammer, die
     zwei deutsche Sätze anliefert, bekommt den zweiten, nicht die Vereinigung. */
  const V = frisch();
  const d = V.getData();
  d.textsprache = 'xx';
  d.textsatzModule = [
    { id: 'a', sprache: 'xx', moduleVersion: 1, texte: { 'identity.givenName.label': 'ERSTER' } },
    { id: 'b', sprache: 'xx', moduleVersion: 1, texte: { 'identity.familyName.label': 'ZWEITER' } },
  ];
  V.setData(d);
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 2, 'beide gelten als angemeldet');
  if (V.textsatzNeuAnwenden) V.textsatzNeuAnwenden();
  const feld = (id) => V.SEKTOR_BY_ID.identity.sektionen
    .flatMap((s) => s.felder || []).find((f) => f.id === id).label;
  assert.equal(feld('familyName'), 'ZWEITER', 'der spätere Satz gilt');
  assert.notEqual(feld('givenName'), 'ERSTER',
    'der frühere ist ERSETZT, nicht ergänzt — wer zwei deutsche Sätze anliefert, bekommt den '
    + 'zweiten und nicht ihre Vereinigung. Ändert sich das, gehört diese Zeile umgeschrieben.');
});

test('[A355·Zug4·Rot-Beweis] ein zweites Modul mit UNGÜLTIGER Form zählt nicht mit', () => {
  /* Ohne diesen Beleg wäre „2 angemeldet" von „zwei Objekte in der Liste" nicht zu
     unterscheiden — die Zahl kommt aus der Prüfung, nicht aus der Länge. */
  const V = frisch();
  const d = V.getData();
  d.textsprache = 'xx';
  d.textsatzModule = [
    { id: 'a', sprache: 'xx', moduleVersion: 1, texte: { 'identity.givenName.label': 'GUT' } },
    { id: 'b', sprache: 'yy', texte: { 'identity.givenName.label': 'OHNE VERSION' } },
  ];
  V.setData(d);
  assert.equal(V._textsatzModuleAusDepotAnmelden(V.getData()), 1,
    'das Modul ohne `moduleVersion` darf nicht mitzählen');
});

test('[A355·Zug4] zwei Rechtsraum-Module verschiedener Räume liegen nebeneinander', () => {
  const V = frisch();
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'rechtsraum');
  assert.ok(reg, 'das Rechtsraum-Register ist angemeldet');
  const modul = (raum, code) => ({
    rechtsraum: raum, moduleVersion: 1, sprache: 'de',
    /* `katalogVersion` ist eine ZAHL, keine Zeichenkette — der Vertrag weist
       '1' mit `grund: 'katalogVersion'` ab. Beim ersten Bau dieser Probe stand
       hier ein String, und die Probe meldete „AT-Modul gültig: typen": ein
       Fehlschlag der Probe, kein Befund am Register. */
    typen: { [code]: { katalogVersion: 1 } },
  });
  const mAT = modul('AT', 'tpl_at_typ');
  const mCH = modul('CH', 'tpl_ch_typ');
  assert.ok(reg.pruefen(mAT).gueltig, 'AT-Modul gültig: ' + (reg.pruefen(mAT).grund || ''));
  assert.ok(reg.pruefen(mCH).gueltig, 'CH-Modul gültig: ' + (reg.pruefen(mCH).grund || ''));
  const d = V.getData();
  /* ZWEI Stolperstellen an derselben Zeile, beide beim Bau erlebt und beide dieselbe
     Klasse — eine Messung, die am Gegenstand vorbeigeht und trotzdem eine Zahl liefert:
       (1) `einbetten` nimmt das MODUL, nicht das Prüfergebnis. `{gueltig, grund,
           verworfene}` ist ein Befund ÜBER ein Modul, nicht das Modul.
       (2) `einbetten(bestehende, neu)` nimmt die LISTE, nicht das Depot, und ist REIN
           — sie gibt eine neue Liste zurück und schreibt nichts. Wer sie wie einen
           Setzer aufruft, bekommt „Gefunden: []" und hält es für einen Befund. */
  d[reg.slot] = reg.einbetten(reg.einbetten(d[reg.slot], mAT), mCH);
  V.setData(d);
  const drin = JSON.stringify(V.getData()[reg.slot] || []);
  assert.ok(drin.includes('AT') && drin.includes('CH'),
    'beide Räume müssen nebeneinander im Depot liegen — sie beschreiben verschiedene Gegenstände '
    + 'und dürfen einander nicht verdrängen. Gefunden: ' + drin.slice(0, 200));
});
