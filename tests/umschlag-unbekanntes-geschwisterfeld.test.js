'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Der Prüfstein zu Ziffer 5 der ADR „Wiederherstellungs-Hülle, abwählbar": eine Fassung, die ein zusätzliches, optionales Feld im
   Umschlag NICHT kennt, öffnet die Datei trotzdem. (22.09.2026)

   Die ADR nimmt an, dass die zweite Hülle ein optionales Geschwisterfeld im Umschlag sein kann, ohne die Krypto-Version zu
   springen, WEIL ältere Fassungen ein unbekanntes Feld ignorieren. Das ist eine Annahme, und ihr Prüfstein muss vor dem Bau laufen:
   stolpert eine Fassung über das Feld, ist es ein Versionssprung und ein anderer Aufwand, und der Fehler zeigte sich erst bei
   einer Bürgerin mit einer älteren Kopie.

   WAS DIESE PROBE IST: der Prüfstein für die Fassungen, die HEUTE gebaut werden — der Kern und die Lese-App dieses Stands, jeder
   mit einem Feld, das keine von beiden kennt. Ein Feld, das es nicht gibt, ist von jeder Fassung unbekannt, die es nicht gibt;
   die Probe zeigt damit, ob ein fremdes Geschwisterfeld an irgendeiner Stelle des Leseweges abgewiesen wird.
   WAS SIE NICHT IST: der Lauf gegen eine ÄLTERE Fassung. Er ist mit dem Bau der Hülle zu wiederholen, gegen eine wirklich ältere
   vivodepot.html (über den Umlenker des Kern-Laders, tests/load-kern.js), und gehört dann in die Probe der Hülle selbst.

   Gemessen wird an der geschriebenen Datei: der Umschlag kommt aus `depotSerialisieren`, das Feld wird danach eingefügt, und geöffnet
   wird über den echten Leseweg (`depotLaden` im Kern, `leseDepotUmschlag` in der Lese-App).
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');
const { depotImProduktAnlegen, depotImProduktLaden, produktHtml, kernAus } = require('./produkt-html-erzeugen.js');

const PW = 'geschwisterfeld-pw-2026!';
/* Ein Feld, das keine heutige Fassung kennt, in der Form, in der die Hülle es tragen würde: ein Objekt mit einem Verfahren und
   einem eingewickelten Schlüssel. Der Inhalt ist Platzhalter; geprüft wird nur, ob das FELD den Leseweg stört. */
const FREMD = Object.freeze({ verfahren: 'platzhalter-v1', salt: 'AAAAAAAAAAAAAAAAAAAAAA==', eingewickelt: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' });

async function dateiMitFremdemFeld(slug) {
  const { umschlag } = await depotImProduktAnlegen(slug, PW, async (V) => {
    V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
    V.sektorFeldSetzen('health', 'bloodType', 'A+');
  });
  const mit = JSON.parse(JSON.stringify(umschlag));
  mit.wiederherstellungshuelle = FREMD;
  return { ohne: JSON.parse(JSON.stringify(umschlag)), mit };
}

test('[Prüfstein·Positivkontrolle] die Datei ohne das Feld öffnet — sonst beweist der Rest nichts', async () => {
  const { ohne } = await dateiMitFremdemFeld('privat-de');
  const { d } = await depotImProduktLaden('privat-de', ohne, PW);
  assert.equal(d.sektoren.health.bloodType, 'A+');
});

test('[Prüfstein·Kern] der Kern öffnet eine Datei mit einem unbekannten Geschwisterfeld im Umschlag, und der Inhalt ist derselbe', async () => {
  const { mit } = await dateiMitFremdemFeld('privat-de');
  assert.ok('wiederherstellungshuelle' in mit, 'Vorbedingung: das fremde Feld steht im Umschlag');
  const { d } = await depotImProduktLaden('privat-de', mit, PW);
  assert.equal(d.sektoren.health.bloodType, 'A+', 'der Inhalt kommt an, das Feld hat den Leseweg nicht gestört');
});

test('[Prüfstein·Lese-App] die Lese-App öffnet dieselbe Datei, und der Inhalt ist derselbe', async () => {
  const { mit } = await dateiMitFremdemFeld('privat-de');
  const { V } = ladeLesen();
  const obj = await V.leseDepotUmschlag(JSON.parse(JSON.stringify(mit)), PW);
  assert.equal(obj.sektoren.health.bloodType, 'A+');
});

test('[Prüfstein·Grenze] ein FALSCHES Passwort öffnet auch mit dem fremden Feld nicht — das Feld ist kein Weg hinein', async () => {
  const { mit } = await dateiMitFremdemFeld('privat-de');
  const { V } = ladeLesen();
  await assert.rejects(() => V.leseDepotUmschlag(JSON.parse(JSON.stringify(mit)), 'falsches-passwort'), 'ohne das richtige Geheimnis geht nichts auf');
});

/* ── Der Rot-Beweis: die Probe KANN rot werden ────────────────────────────────────────────────────────────
   Eine Prüfung, die nie anschlagen kann, beweist nichts. Hier bekommt die Lese-App einen Eingriff, der ein unbekanntes Umschlag-Feld
   abweist (die Fassung, vor der die ADR warnt: „stolpert sie darüber, ist es ein Versionssprung"): dieselbe Datei öffnet dann NICHT
   mehr, und dieselbe Aussage der Probe schlägt an. Die Datei OHNE das Feld öffnet auch mit dem Eingriff — er trifft nur das Feld. */
test('[Prüfstein·Rot-Beweis] eine Lese-App, die unbekannte Umschlag-Felder abweist, macht die Probe rot — und nur wegen des Felds', async () => {
  const { ohne, mit } = await dateiMitFremdemFeld('privat-de');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  const anker = 'function _versionsGate(umschlag) {';
  assert.equal(quelle.split(anker).length - 1, 1, 'Vorbedingung: der Eingriff findet seine Stelle genau einmal');
  const bekannt = "['kryptoVersion','depotUUID','pbkdf2','depotSalt','iv','ct','einheiten','umschlagTabelle','angehoerigenOrt']";
  const mutiert = quelle.replace(anker, anker + "\n  for (const k of Object.keys(umschlag || {})) if (" + bekannt + ".indexOf(k) < 0) throw new Error('Umschlag-Feld unbekannt: ' + k);");
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'geschwisterfeld-rot-')), 'vivodepot-lesen.html');
  fs.writeFileSync(tmp, mutiert);
  const zuvor = process.env.LESEN_HTML_PATH;
  process.env.LESEN_HTML_PATH = tmp;
  const lader = require.resolve('./load-lesen.js');
  delete require.cache[lader];
  let V;
  try { V = require('./load-lesen.js').ladeLesen().V; } finally {
    if (zuvor === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = zuvor;
    delete require.cache[lader];
  }
  await assert.rejects(() => V.leseDepotUmschlag(JSON.parse(JSON.stringify(mit)), PW), /Umschlag-Feld unbekannt: wiederherstellungshuelle/,
    'mit dem Eingriff öffnet die Datei mit dem fremden Feld nicht mehr: die Probe schlüge an');
  const obj = await V.leseDepotUmschlag(JSON.parse(JSON.stringify(ohne)), PW);
  assert.equal(obj.sektoren.health.bloodType, 'A+', 'die Datei ohne das Feld öffnet auch mit dem Eingriff: er trifft nur das Feld');
});

/* ── Der Befund, der offen war: das Feld überlebte das SPEICHERN nicht — behoben (22.09.2026) ────────────────────
   Gemessen am 22.09.2026: eine Fassung, die das Feld nicht kennt, öffnete die Datei und schrieb sie ohne das Feld zurück. Die Bürgerin
   sah nichts; die Hülle war nach dem Speichern still weg, und sie erfuhr es, wenn sie sie brauchte. Eine Einbahnstraße: nach dem
   Speichern ist nichts zu korrigieren, und am Ergebnis ist nicht zu sehen, dass etwas fehlt.
   Diese Probe stand als `todo` (der Befund wurde bei jedem Lauf mitgezählt); sie ist jetzt ein gewöhnlicher Test. Der Kern merkt beim
   Öffnen jedes Feld auf oberster Ebene des Umschlags, das er nicht selbst schreibt (UMSCHLAG_FELDER_BEKANNT), und schreibt es beim
   Speichern unverändert zurück — gebunden an die Depot-UUID, nie ein bekanntes Feld überschreibend. */
test('[Prüfstein·Speichern] eine Datei mit einem unbekannten Umschlag-Feld trägt es nach dem Öffnen und Speichern noch', async () => {
  const { mit } = await dateiMitFremdemFeld('privat-de');
  const { V } = await depotImProduktLaden('privat-de', mit, PW);
  const geschrieben = await V.depotSerialisieren();
  assert.ok('wiederherstellungshuelle' in geschrieben,
    'das Feld ist nach Öffnen und Speichern nicht mehr im Umschlag (Schlüssel: ' + Object.keys(geschrieben).join(', ') + ')');
  assert.deepEqual(geschrieben.wiederherstellungshuelle, FREMD, 'unverändert, nicht umgeformt');
});

test('[Speichern·Rundlauf] öffnen → speichern → öffnen → speichern: das Feld bleibt, der Inhalt bleibt, die Datei öffnet', async () => {
  const { mit } = await dateiMitFremdemFeld('privat-de');
  const a = await depotImProduktLaden('privat-de', mit, PW);
  const zweite = JSON.parse(JSON.stringify(await a.V.depotSerialisieren()));
  const b = await depotImProduktLaden('privat-de', zweite, PW);
  assert.equal(b.d.sektoren.health.bloodType, 'A+');
  const dritte = await b.V.depotSerialisieren();
  assert.deepEqual(dritte.wiederherstellungshuelle, FREMD);
});

test('[Speichern·Gegenprobe] bekannte Felder kommen frisch aus dem Kern: ein geänderter Inhalt steht in der neuen Datei, eine Datei ohne das Feld bekommt keines', async () => {
  const { ohne } = await dateiMitFremdemFeld('privat-de');
  const { V } = await depotImProduktLaden('privat-de', ohne, PW);
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  V.sektorFeldSetzen('health', 'bloodType', 'B-');
  const geschrieben = JSON.parse(JSON.stringify(await V.depotSerialisieren()));
  assert.ok(!('wiederherstellungshuelle' in geschrieben), 'eine Datei ohne das Feld bekommt keines');
  const wieder = await depotImProduktLaden('privat-de', geschrieben, PW);
  assert.equal(wieder.d.sektoren.health.bloodType, 'B-', 'der geänderte Inhalt steht in der neuen Datei: bekannte Felder sind frisch geschrieben');
});

test('[Speichern·Grenze·Datentrennung] kein Übertrag auf ein anderes Depot: nach dem Öffnen einer Datei mit Feld trägt ein NEU angelegtes Depot es nicht — die Bindung an die Depot-UUID ist der einzige Riegel', async () => {
  const { mit } = await dateiMitFremdemFeld('privat-de');
  const { V } = await depotImProduktLaden('privat-de', mit, PW);
  await V.depotAnlegen('ein-anderes-passwort-2026!');
  const neu = await V.depotSerialisieren();
  assert.ok(!('wiederherstellungshuelle' in neu), 'das Feld gehört zum geöffneten Depot, nicht zur Sitzung');
});

test('[Speichern·Grenze] dasselbe Depot, danach eine ältere Kopie OHNE das Feld geöffnet: die Kopie bekommt keines dazu', async () => {
  const { ohne, mit } = await dateiMitFremdemFeld('privat-de');
  const { V } = await depotImProduktLaden('privat-de', mit, PW);
  await V.depotLaden(JSON.parse(JSON.stringify(ohne)), PW);
  const geschrieben = await V.depotSerialisieren();
  assert.ok(!('wiederherstellungshuelle' in geschrieben), 'was die geöffnete Datei nicht trug, wird nicht aus einer früheren ergänzt');
});

test('[Speichern·Grenze] ein Feld namens __proto__ wird nicht zum Prototyp: es wird nicht zurückgeschrieben und richtet nichts an', async () => {
  const { mit } = await dateiMitFremdemFeld('privat-de');
  const roh = JSON.stringify(mit).replace(/}$/, ',"__proto__":{"eingeschleust":true}}');
  const { V } = await depotImProduktLaden('privat-de', JSON.parse(roh), PW);
  const geschrieben = await V.depotSerialisieren();
  assert.equal(Object.getPrototypeOf(geschrieben), Object.prototype);
  assert.equal(geschrieben.eingeschleust, undefined);
  assert.deepEqual(geschrieben.wiederherstellungshuelle, FREMD, 'das harmlose fremde Feld daneben bleibt');
});

/* Der zweite Riegel, gegen ein Auseinanderlaufen der Feldliste: wäre `UMSCHLAG_FELDER_BEKANNT` unvollständig (der Kern schriebe ein Feld, das dort fehlt),
   würde beim Öffnen dessen ALTER Wert gemerkt — und beim Speichern nie über den frisch geschriebenen gelegt. Ohne diesen Riegel stünde ein veraltetes
   `einheiten`/`ct` in der neuen Datei: stille Beschädigung. Der Wächter der Liste (unten) fängt das Auseinanderlaufen zur Entwicklungszeit; diese Probe
   hält den Riegel selbst, indem sie die Liste im geladenen Kern absichtlich um ein Feld kürzt. */
test('[Speichern·Riegel] fehlt dem Kern ein Feld in der Liste, überschreibt der gemerkte alte Wert das frisch geschriebene NICHT', async () => {
  const quelle = fs.readFileSync(produktHtml('privat-de'), 'utf8');
  const kurz = quelle.replace(", 'umschlagTabelle', 'angehoerigenOrt']", ", 'umschlagTabelle']");
  assert.notEqual(kurz, quelle, 'Vorbedingung: der Eingriff findet die Liste');
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'feldliste-kurz-')), 'vivodepot.html');
  fs.writeFileSync(tmp, kurz);
  const { ohne } = await dateiMitFremdemFeld('privat-de');
  const alt = JSON.parse(JSON.stringify(ohne));
  alt.angehoerigenOrt = { veraltet: true };
  const { V } = kernAus(tmp);
  await V.depotLaden(alt, PW);
  assert.ok(V._umschlagFremdfelder() && 'angehoerigenOrt' in V._umschlagFremdfelder().felder, 'Vorbedingung: mit der gekürzten Liste wird das Feld gemerkt');
  const geschrieben = await V.depotSerialisieren();
  assert.notDeepEqual(geschrieben.angehoerigenOrt, { veraltet: true }, 'der frisch geschriebene Wert gewinnt, nicht der gemerkte alte');
});

/* ── Die Sub-Depot-Wege: gemessen (22.09.2026), festgehalten, NICHT entschieden ─────────────────────────────────────────────
   Drei Wege bauen einen Umschlag aus einem geöffneten neu auf: Blackbox-Export, Einhängen und das Umschlüsseln eines eingehängten Sub-Depots. Keiner
   überschreibt die EINZIGE Kopie — es sind Kopien für eine andere Person (Export) oder eine Aufnahme in eine fremde Verwaltung (Einhängen); die Datei der
   Inhaberin behält ihr Feld. Darum ist das kein Fall der Einbahnstraße des Speicherwegs. Was sie tun, steht hier fest, damit jede Änderung — in
   die eine oder andere Richtung — auffällt. OB die Hülle mit einer Kopie reisen soll (ein Wiederherstellungsweg gehört der Inhaberin, vielleicht nicht der
   Empfängerin), ist eine Entscheidung mit dem Bau der Hülle: offene Klausel in U2-ADR-430, Frist 2026-11-30.
     Export           lässt das Feld STILL weg (kein Fehler).
     Einhängen, Depot-Datei     lässt das Feld STILL weg.
     Einhängen, Export-Datei mit dem Feld     WIRFT laut (genau sechs bzw. genau die V3-Felder): eine Fassung nach diesem Stand nähme sie nicht auf.
     Umschlüsseln     ist nicht erreichbar: der Eintrag trägt nach dem Einhängen genau die festen Felder, es gibt nichts zu verlieren. */
async function subUmschlagMitFeld() {
  const { V } = kernAus(produktHtml('privat-de'));
  await V.depotAnlegen(PW);
  V.setzeSitzungsAkteur({ personId: 'ich', eigenschaft: 'selbst' });
  const umschlag = JSON.parse(JSON.stringify(await V.subDepotVersiegeln({ schemaVersion: 19, verwaltungsTyp: 'verwaltet', sektoren: { gesundheit: { blutgruppe: 'X' } } }, 'sub-passwort-2026-abc')));
  return { V, ohne: umschlag, mit: { ...umschlag, wiederherstellungshuelle: FREMD } };
}

test('[Sub-Depot-Wege·Export] der Blackbox-Export lässt ein unbekanntes Umschlag-Feld weg — still, ohne Fehler', async () => {
  const { V, ohne, mit } = await subUmschlagMitFeld();
  const export_ = V.blackboxDateiAusUmschlag(JSON.parse(JSON.stringify(mit)));
  assert.ok(!('wiederherstellungshuelle' in export_.umschlag));
  // U2-ADR-002 (Entscheidung 23.09.2026): die Blackbox IST die Depot-Datei des Subs — sie trägt den Ortshinweis wie jede
  // Depot-Datei (Rundlauf: tests/sub-depot-ortshinweis.test.js); unbekannte Felder bleiben weiter draußen.
  assert.ok('angehoerigenOrt' in export_.umschlag, 'der Ortshinweis reist mit, wie in jeder Depot-Datei');
  assert.deepEqual(Object.keys(export_.umschlag).sort(), Object.keys(ohne).sort(), 'der Export trägt genau die festen Felder');
});

test('[Sub-Depot-Wege·Einhängen] eine Depot-Datei mit dem Feld wird eingehängt und verliert es dabei still; die eingehängte Kopie trägt genau die festen Felder', async () => {
  const { V, ohne, mit } = await subUmschlagMitFeld();
  const eintrag = V.subDepotEinhaengen(JSON.parse(JSON.stringify(mit)), { bezeichnung: 'B', inhaberin: 'B' });
  const abgelegt = V.getData().verwalteteDepots.find((e) => e.depotUUID === eintrag.depotUUID).umschlag;
  assert.ok(!('wiederherstellungshuelle' in abgelegt));
  // U2-ADR-002 (Entscheidung 23.09.2026): wie beim Export — der Ortshinweis wird beim Einhängen übernommen.
  assert.ok('angehoerigenOrt' in abgelegt, 'der Ortshinweis wird übernommen');
  assert.deepEqual(Object.keys(abgelegt).sort(), Object.keys(ohne).sort(), 'Umschlüsseln findet danach nichts zu verlieren: nur die festen Felder stehen im Eintrag');
});

test('[Sub-Depot-Wege·Einhängen] eine Export-Datei, deren Umschlag das Feld trägt, wird laut abgewiesen — der Weg nimmt sie nicht auf', async () => {
  const { V, mit } = await subUmschlagMitFeld();
  assert.throws(() => V.subDepotEinhaengen({ dateiTyp: 'vivodepot-blackbox-export', formatVersion: 1, umschlag: JSON.parse(JSON.stringify(mit)) }, { bezeichnung: 'B', inhaberin: 'B' }),
    /genau die sechs Felder|genau die/);
});

/* Das Wischen der Sitzung: die gemerkten Felder stehen nach dem Sperren nicht mehr im Arbeitsspeicher. Kein Tester merkt es an einer Datei — darum
   über den Zugriff `_umschlagFremdfelder` (tests/load-kern.js) an BEIDEN Stellen, die die Sitzung leeren. */
test('[Speichern·Wischen] die Reset-Funktion der Sitzung (_depotSpeicherZuruecksetzen) räumt die gemerkten Felder', async () => {
  const { mit } = await dateiMitFremdemFeld('privat-de');
  const { V } = await depotImProduktLaden('privat-de', mit, PW);
  assert.ok(V._umschlagFremdfelder(), 'Vorbedingung: nach dem Öffnen sind Felder gemerkt');
  V._depotSpeicherZuruecksetzen();
  assert.equal(V._umschlagFremdfelder(), null, 'nach dem Wischen ist nichts mehr gemerkt');
});

test('[Speichern·Wischen] die Vorschau (vorschauDepotErzeugen) räumt die gemerkten Felder', async () => {
  const { mit } = await dateiMitFremdemFeld('privat-de');
  const { V } = await depotImProduktLaden('privat-de', mit, PW);
  assert.ok(V._umschlagFremdfelder(), 'Vorbedingung: nach dem Öffnen sind Felder gemerkt');
  V.vorschauDepotErzeugen();
  assert.equal(V._umschlagFremdfelder(), null, 'die Vorschau hat keine Sitzung und trägt keine Felder eines früheren Depots');
});

/* Der Wächter gegen die Klasse: `UMSCHLAG_FELDER_BEKANNT` muss jedes Feld enthalten, das der Kern selbst auf oberster Ebene schreibt —
   fehlte eines, wäre es beim nächsten Speichern ein „Fremdfeld", das eine gemerkte, veraltete Kopie zurückbrächte. */
test('[Speichern·Wächter] die Liste der bekannten Umschlag-Felder deckt alles, was der Kern selbst schreibt (V3 und V4)', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const m = /const UMSCHLAG_FELDER_BEKANNT = \[([^\]]*)\]/.exec(quelle);
  assert.ok(m, 'die Liste steht im Kern');
  const bekannt = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  const { V } = await depotImProduktLaden('privat-de', (await dateiMitFremdemFeld('privat-de')).ohne, PW);
  const v4 = await V.depotSerialisieren();
  const v3 = await V.depotSerialisierenV3();
  for (const [name, umschlag] of [['V4', v4], ['V3', v3]]) {
    for (const k of Object.keys(umschlag)) assert.ok(bekannt.includes(k), name + ' schreibt `' + k + '`, das nicht in UMSCHLAG_FELDER_BEKANNT steht');
  }
  assert.ok(Object.keys(v4).length >= 6 && Object.keys(v3).length >= 6, 'Vorbedingung: beide Formen tragen ihre Felder');
});
