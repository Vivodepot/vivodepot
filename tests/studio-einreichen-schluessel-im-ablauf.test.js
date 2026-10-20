'use strict';
/* Studio: der Schlüssel geht im Ablauf auf; erst die geprüfte Sicherung, dann die Signatur (16.10.2026, v931)

   Bis heute hatte „Fertigstellen und einreichen“ einen eigenen Schritt „Signieren“ mit zwei Dateien (privat und öffentlich)
   und „Ohne Prüfung weiter“. Jetzt ist der Dialog „Einreichen“ eine Folge: ① Wer reicht ein? ② Sicherung speichern
   ③ Einreichung speichern. In ② entsteht das Paar; SCHLUESSEL_TRESOR.erzeugen öffnet dabei genau die Hülle, die gleich
   heruntergeladen wird, mit demselben Passwort (Probe-Öffnung); scheitert sie, gibt es kein Paar, keinen Download und
   keine Signatur. Erst nach Probe UND Download ist ③ frei. Die Reihenfolge ist zwingend: der Tresor verwirft beim Signieren
   Schlüssel und Hülle. „Gespeicherte Sicherung prüfen“ (die Datei vom Datenträger) steht als Angebot unter „Mehr“.
   Der öffentliche Schlüssel reist in der Einreichung. Die eigene Datei an Vivodepot ist seit dem Besitznachweis /2 die
   Antragsdatei mit Besitznachweis (EINE Schalterzeile, `STUDIO_OEFFENTLICHEN_SCHLUESSEL_EINZELN = true`, Befund
   STUDIO-EINREICHUNG-ZWEI-FORMATE): sie entsteht in ② nach der Sicherung, solange der Schlüssel im Speicher ist, und ist
   Bedingung für ③. Das nackte `.public.jwk` gibt es nicht mehr.

   Gemessen am echten Studio (tests/load-generator.js), mit echtem Tresor und echter Signatur:
     (1) „Sicherung speichern“ erzeugt das Paar, prüft die Hülle und lädt sie; ein zweiter Klick erzeugt KEIN neues Paar;
     (2) die Einreichung ist zu bis Probe, Download und Antragsdatei, auch am Knopf vorbei (submissionErzeugen); danach trägt sie den
         öffentlichen Schlüssel des Tresors, und Schlüssel und Hülle sind fort;
     (3) eine scheiternde Probe lässt nichts zurück: kein Schlüssel, keine Hülle, kein Download, Tor zu;
     (4) der Blocker „kein Schlüsselpaar“ ist in „Einreichen“ nicht angezeigt, hält das Tor aber weiter zu;
     (5) Rot-Beweise: ein Tor ohne Probe, ein Tor nur über angezeigte Blocker, eine Probe ohne Abgleich, der Schalter aus. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const PW = 'probe-passwort-im-ablauf';   // frei erfunden, nur hier
const SCHALTER_AUS = 'const STUDIO_OEFFENTLICHEN_SCHLUESSEL_EINZELN = false;';
const SCHALTER_AN = 'const STUDIO_OEFFENTLICHEN_SCHLUESSEL_EINZELN = true;';
const TOR = 'function einreichungFrei() { return SCHLUESSEL_TRESOR.vorhanden() && !!STATE.sicherungGeprueft && !!STATE.privDownloaded && oeffentlicherTeilErledigt(); }';
const PROBE = "if (!probe || probe.kty !== 'OKP' || probe.crv !== 'Ed25519' || !probe.d || _pubAusPriv(probe).x !== r.publicJwk.x) throw new Error('sicherung-probe');";
const klick = () => ({ isTrusted: true, currentTarget: { id: 'pr-submit' }, timeStamp: performance.now() });
const antragKlick = () => ({ isTrusted: true, currentTarget: { id: 'sk-antrag' }, timeStamp: performance.now() });
const ANTRAGSNUMMER = '0123456789abcdef0123456789abcdef';   // frei erfunden, Form wie im Antragsformular

/* Schritt ② wie im Browser: Passwort zweimal, „Sicherung speichern“. Die heruntergeladenen Dateien werden mitgeschrieben. */
async function sicherungGespeichert(html) {
  const gen = ladeGenerator(html ? { html } : undefined);
  const { document, sandbox } = gen;
  const el = (id) => document.getElementById(id);
  const geladen = [];
  sandbox.blobDownload = (name, text) => { geladen.push({ name, text }); };
  const lauf = (code) => vm.runInContext(code, sandbox);
  el('sk-pw1').value = PW; el('sk-pw2').value = PW;
  await lauf('ladePrivate()');
  return { ...gen, el, lauf, geladen };
}
function stammMit(V, publicKeyJwk) {
  return { anbieter: V.baueAnbieter({ anbieterName: 'Testheim e.V.', rechtsform: 'e.V.', strasse: 'Weg 1', plz: '10115', ort: 'Berlin', land: 'Deutschland',
    kontaktName: 'A B', kontaktFunktion: 'Leitung', kontaktEmail: 'a@b.example.de', kontaktTelefon: '030123', bereich: 'identity', useCase: 'x'.repeat(60) }),
  publicKeyJwk, felder: [{ feldname: 'Vorname', feldtyp: 'text', pflicht: true, bereich: 'identity', provenienzPflichtig: true }] };
}
const kopie = (x) => JSON.parse(JSON.stringify(x));
/* Die Antragsdatei in ② wie im Browser: Angaben stehen, Antragsnummer im Feld, ein echter Klick auf „Antragsdatei erstellen“. */
async function antragsdateiErstellt(g) {
  if (!g.V.STATE.anbieter) g.V.STATE.anbieter = stammMit(g.V, g.V.STATE.publicKeyJwk).anbieter;
  g.el('sk-antragsnummer').value = ANTRAGSNUMMER;
  const datei = await g.V.antragsdateiErstellen(antragKlick());
  assert.ok(datei && datei.besitznachweis, 'Vorbedingung: die Antragsdatei ist entstanden: ' + g.el('sk-antrag-meldung').textContent);
  return datei;
}

test('[Einreichen·Schlüssel] eine Folge in drei Schritten; kein Schritt „Signieren“, keine Schlüssel-Stufe im Weg', () => {
  assert.equal(HTML.split(SCHALTER_AN).length - 1, 1, 'die Schalterzeile steht genau einmal da, auf true');
  assert.equal(HTML.indexOf(SCHALTER_AUS), -1);
  assert.match(HTML, /<div class="karte-innen" id="sk-antrag-karte" hidden>\s*<label for="sk-antragsnummer"[\s\S]*?<button type="button" class="sekundaer" id="sk-antrag"/,
    'die Antragsdatei steht in einer Karte, die erst mit dem Schlüssel im Speicher erscheint');
  const sichern = HTML.indexOf('id="es-sichern"'), priv = HTML.indexOf('id="sk-priv"'), karte = HTML.indexOf('id="sk-antrag-karte"'), drei = HTML.indexOf('id="fs-c"');
  assert.ok(sichern < priv && priv < karte && karte < drei, 'die Antragsdatei steht in ② hinter „Sicherung speichern“');
  for (const weg of ['id="fs-b"', 'id="sk-weiter"', 'id="sk-erzeugen"', 'id="wb-schluessel"', 'Ohne Prüfung weiter', 'id="es-pruefen"', 'id="sk-pub"', 'id="sk-pub-karte"', 'function ladePublic'])
    assert.equal(HTML.indexOf(weg), -1, weg + ' ist fort');
  assert.equal(HTML.split(TOR).length - 1, 1, 'das Tor steht genau einmal da');
  assert.equal(HTML.split(PROBE).length - 1, 1, 'die Probe-Öffnung steht genau einmal da');
  const a = HTML.indexOf('id="fs-a"'), b = HTML.indexOf('id="es-sichern"'), c = HTML.indexOf('id="fs-c"'), mehr = HTML.indexOf('id="es-mehr"');
  assert.ok(a > 0 && a < b && b < c && c < mehr, 'Wer reicht ein → Sicherung speichern → Einreichung speichern → Mehr');
  assert.ok(HTML.indexOf('id="sk-pruefen"') > mehr, '„Gespeicherte Sicherung prüfen“ steht unter „Mehr“');
});

test('[Einreichen·Schlüssel] (1) „Sicherung speichern“ erzeugt das Paar, prüft die Hülle und lädt sie; ein zweiter Klick ersetzt es nicht', async () => {
  const { V, el, lauf, geladen } = await sicherungGespeichert();
  assert.ok(V.STATE.publicKeyJwk && V.STATE.publicKeyJwk.crv === 'Ed25519', 'das Paar ist erstellt (Ed25519)');
  assert.equal(V.STATE.sicherungGeprueft, true, 'die Probe-Öffnung ist bestanden');
  assert.equal(V.SCHLUESSEL_TRESOR.vorhanden(), true);
  assert.deepEqual(geladen.map((d) => d.name.replace(/^.*\./, '.')), ['.vdkey'], 'genau eine Datei, die Sicherung');
  assert.equal(V.istGeschuetzteSchluesseldatei(JSON.parse(geladen[0].text)), true, 'die Sicherung ist verschlüsselt');
  assert.equal(await V.SCHLUESSEL_TRESOR.sicherungPruefen(JSON.parse(geladen[0].text), PW, V.STATE.publicKeyJwk), true,
    'die heruntergeladene Datei trägt genau diesen Schlüssel');
  assert.equal(el('sk-pw1').value, '', 'das Passwortfeld ist geleert');
  assert.equal(el('sk-passwort').hidden, true, 'nach dem Paar gehen die Passwortfelder');
  assert.equal(el('sk-antrag-karte').hidden, false, 'mit dem Schlüssel im Speicher steht die Antragsdatei da');
  const x = V.STATE.publicKeyJwk.x;
  await lauf('ladePrivate()');
  assert.equal(V.STATE.publicKeyJwk.x, x, 'ein zweiter Klick erzeugt kein neues Paar');
  assert.equal(geladen.length, 2);
  assert.equal(geladen[1].text, geladen[0].text, 'dieselbe Hülle noch einmal');
});

test('[Einreichen·Schlüssel] (2) die Einreichung ist zu bis Probe und Download, auch am Knopf vorbei; danach signiert sie mit dem Tresor', async () => {
  // Schlüssel im Speicher, aber ohne Schritt ② (kein Probe-Stand, nichts heruntergeladen): zu, auch am Knopf vorbei.
  const roh = ladeGenerator();
  const lauf0 = (code) => vm.runInContext(code, roh.sandbox);
  lauf0("ladeBeispiel('pflegeheim')");
  roh.V.STATE.publicKeyJwk = (await roh.V.SCHLUESSEL_TRESOR.erzeugen({ passwort: PW })).publicJwk;
  roh.V.STATE.anbieter = stammMit(roh.V, roh.V.STATE.publicKeyJwk).anbieter;
  assert.deepEqual(kopie(lauf0('pruefeKonformitaet(aktuellerState()).blocker')), [], 'Vorbedingung: nur das Tor hält auf');
  assert.equal(roh.V.einreichungFrei(), false, 'ohne Probe-Stand und Download zu');
  await lauf0('submissionErzeugen')(klick());
  assert.equal(roh.V.STATE.letzteSubmission == null, true, 'kein Paket');
  assert.equal(roh.V.SCHLUESSEL_TRESOR.vorhanden(), true, 'der Schlüssel ist nicht verbraucht');

  const g = await sicherungGespeichert();
  const { V, lauf } = g;
  assert.equal(V.einreichungFrei(), false, 'nach Probe und Download allein noch zu: die Antragsdatei fehlt');
  lauf("ladeBeispiel('pflegeheim')");
  V.STATE.anbieter = stammMit(V, V.STATE.publicKeyJwk).anbieter;
  await lauf('submissionErzeugen')(klick());
  assert.equal(V.STATE.letzteSubmission == null, true, 'ohne Antragsdatei kein Paket, auch am Knopf vorbei');
  assert.equal(V.SCHLUESSEL_TRESOR.vorhanden(), true, 'der Schlüssel ist nicht verbraucht');
  await antragsdateiErstellt(g);
  assert.equal(V.einreichungFrei(), true, 'nach Probe, Download und Antragsdatei frei');
  assert.deepEqual(kopie(lauf('pruefeKonformitaet(aktuellerState()).blocker')), [], 'Vorbedingung: nichts hält auf');
  await lauf('submissionErzeugen')(klick());
  const paket = V.STATE.letzteSubmission;
  assert.ok(paket, 'das Paket ist entstanden');
  assert.equal(V.validiereSubmission(paket).length, 0, 'das Paket entspricht dem Schema');
  for (const k of ['kty', 'crv', 'x']) assert.equal(paket.publicKeyJwk[k], V.STATE.publicKeyJwk[k], 'publicKeyJwk.' + k + ' ist der des Tresors');
  assert.equal(paket.publicKeyJwk.d, undefined, 'kein privater Teil in der Einreichung');
  assert.ok(paket.templatesJws.length >= 1, 'signiert');
  assert.equal(V.SCHLUESSEL_TRESOR.vorhanden(), false, 'der Schlüssel ist nach dem Signieren fort');
  assert.equal(V.SCHLUESSEL_TRESOR.zustand().huelleDa, false, 'die Hülle auch: darum kommt die Sicherung vorher');
});

test('[Einreichen·Schlüssel] (2, Gegenprobe) mit einem fremden öffentlichen Schlüssel entsteht kein Paket', async () => {
  const { V } = await sicherungGespeichert();
  const fremd = await V.erzeugeSchluesselpaarRoh();
  assert.notEqual(fremd.publicJwk.x, V.STATE.publicKeyJwk.x);
  const stamm = stammMit(V, fremd.publicJwk);
  await assert.rejects(() => V.SCHLUESSEL_TRESOR.signiereEinmal(klick(), (k) => V.baueSammelSubmissionSigniert([stamm], stamm, k)), /passt nicht/);
});

/* (3) Die Probe scheitert: die Hülle wird nach dem Verpacken durch die eines anderen Paars ersetzt. */
const VERDORBEN = HTML.replace("        huelleText = JSON.stringify(huelle, null, 2);\n",
  "        huelleText = JSON.stringify(await schuetzeSchluesselJwk((await erzeugeSchluesselpaarRoh()).privateJwk, passwort), null, 2);\n");
test('[Einreichen·Schlüssel] (3) eine scheiternde Probe lässt nichts zurück: kein Schlüssel, keine Hülle, kein Download, Tor zu', async () => {
  assert.notEqual(VERDORBEN, HTML, 'Vorbedingung: die Stelle der Hülle steht da');
  const { V, el, geladen } = await sicherungGespeichert(VERDORBEN);
  assert.equal(V.SCHLUESSEL_TRESOR.vorhanden(), false);
  assert.equal(V.SCHLUESSEL_TRESOR.zustand().huelleDa, false);
  assert.deepEqual(geladen, [], 'nichts heruntergeladen');
  assert.equal(V.einreichungFrei(), false);
  assert.match(el('sk-pw-meldung').textContent, /nicht wieder öffnen\. Es wurde nichts heruntergeladen und nichts signiert/);
});
test('[Einreichen·Schlüssel] (5) Rot-Beweis: eine Probe ohne Abgleich lässt die verdorbene Hülle durch', async () => {
  const ohneAbgleich = VERDORBEN.replace(PROBE, "if (!probe) throw new Error('sicherung-probe');");
  assert.notEqual(ohneAbgleich, VERDORBEN);
  const g = await sicherungGespeichert(ohneAbgleich);
  const { V, geladen } = g;
  assert.equal(geladen.length, 1, 'die verschlechterte Fassung lädt eine Hülle, die nicht zu diesem Schlüssel gehört');
  await antragsdateiErstellt(g);
  assert.equal(V.einreichungFrei(), true);
});

/* (4) Bedingung zur Zeile renderefPruefung (Art K) in der Klassenprobe der .filter-Stellen. */
async function torMitFehlendemPublicKey(html) {
  const g = await sicherungGespeichert(html);
  const { V, el, lauf } = g;
  lauf("ladeBeispiel('pflegeheim')");
  V.STATE.anbieter = stammMit(V, V.STATE.publicKeyJwk).anbieter;
  await antragsdateiErstellt(g);
  V.STATE.publicKeyJwk = null;   // der Blocker „kein Schlüsselpaar“ steht
  const blocker = kopie(lauf('pruefeKonformitaet(aktuellerState()).blocker'));
  assert.ok(blocker.some((b) => /^Es wurde noch kein Schlüsselpaar erzeugt\./.test(b)), 'Vorbedingung: der Blocker steht in der Prüfung');
  assert.equal(V.einreichungFrei(), true, 'Vorbedingung: das Tor der Sicherung allein wäre offen');
  lauf('renderefPruefung()');
  return { el };
}
test('[Einreichen·Schlüssel] (4) der Blocker „kein Schlüsselpaar“ ist nicht angezeigt, hält aber die Einreichung zu', async () => {
  const { el } = await torMitFehlendemPublicKey();
  assert.equal(el('pr-submit').disabled, true, 'ohne Schlüsselpaar keine Einreichung');
  assert.equal(String(el('pr-blocker').textContent || '').indexOf('Es wurde noch kein Schlüsselpaar erzeugt') < 0, true, 'nicht angezeigt');
});
test('[Einreichen·Schlüssel] (5) Rot-Beweis: ein Tor, das nur die angezeigten Blocker zählt, gibt die Einreichung frei', async () => {
  const alt = "  $('pr-submit').disabled = res.blocker.length > 0 || !einreichungFrei();";
  assert.equal(HTML.split(alt).length - 1, 1, 'die Torzeile steht genau einmal da');
  const { el } = await torMitFehlendemPublicKey(HTML.replace(alt, "  $('pr-submit').disabled = gezeigt.length > 0 || !einreichungFrei();"));
  assert.equal(el('pr-submit').disabled, false, 'die verschlechterte Fassung gibt frei');
});
test('[Einreichen·Schlüssel] (5) Rot-Beweis: ein Tor ohne Probe und Download wird gemeldet', async () => {
  const schlecht = HTML.replace(TOR, 'function einreichungFrei() { return SCHLUESSEL_TRESOR.vorhanden(); }');
  assert.notEqual(schlecht, HTML);
  const { V, sandbox } = ladeGenerator({ html: schlecht });
  await V.SCHLUESSEL_TRESOR.erzeugen({ passwort: PW });
  assert.equal(vm.runInContext('einreichungFrei()', sandbox), true, 'die verschlechterte Fassung gibt ohne Download frei');
});
test('[Einreichen·Schlüssel] die Antragsdatei ist Bedingung: zu ohne sie, frei mit ihr; ohne Schlüssel im Speicher keine Karte', async () => {
  const g = await sicherungGespeichert();
  assert.equal(g.V.einreichungFrei(), false, 'ohne Antragsdatei keine Einreichung');
  assert.equal(g.el('sk-antrag-karte').hidden, false);
  const datei = await antragsdateiErstellt(g);
  assert.equal(datei.format, 'vivodepot-herausgeber-antragsdatei/1');
  assert.equal(datei.jwk.x, g.V.STATE.publicKeyJwk.x, 'die Antragsdatei trägt den Schlüssel des Tresors');
  assert.deepEqual(g.geladen.map((d) => d.name.replace(/^.*?\.(?=antrag|private)/, '')), ['private.vdkey', 'antrag-zertifikat.json'],
    'zwei Dateien: die Sicherung und die Antragsdatei, kein .public.jwk');
  assert.equal(g.V.einreichungFrei(), true, 'nach der Antragsdatei frei');
  // Ohne Schlüssel im Speicher steht die Karte nicht da (antragsdateiErstellen könnte nichts zeichnen).
  g.V.SCHLUESSEL_TRESOR.verwerfen('manuell');
  g.V.aktualisiereSchluesselWeiter();   // im Browser über beimVerwerfen; der Harnisch fährt boot nicht
  assert.equal(g.el('sk-antrag-karte').hidden, true, 'ohne Schlüssel keine Karte');
});
test('[Einreichen·Schlüssel] (5) Rot-Beweis: Schalter aus, die Einreichung geht ohne Antragsdatei durch', async () => {
  const aus = HTML.replace(SCHALTER_AN, SCHALTER_AUS);
  assert.notEqual(aus, HTML, 'die Umstellung hat nichts geändert');
  const { V, el } = await sicherungGespeichert(aus);
  assert.equal(el('sk-antrag-karte').hidden, true, 'die verschlechterte Fassung zeigt die Antragsdatei nicht');
  assert.equal(V.einreichungFrei(), true, 'die verschlechterte Fassung gibt ohne Antragsdatei frei');
});

/* Das Angehörigen-Blatt (Blatt-Modus) geht an die eigenen Leute, nicht an Vivodepot: das Tor der Antragsdatei gilt dort nicht.
   Nach „Sicherung speichern“ (Probe und Download) entsteht das Blatt, ohne dass eine Antragsdatei erstellt wurde. */
const ERLEDIGT = "function oeffentlicherTeilErledigt() { return !STUDIO_OEFFENTLICHEN_SCHLUESSEL_EINZELN || STATE.art === 'blatt' || !!STATE.pubDownloaded; }";
async function blattOhneAntragsdatei(html) {
  const g = await sicherungGespeichert(html);
  const { V } = g;
  V.STATE.anbieter = stammMit(V, V.STATE.publicKeyJwk).anbieter;
  V.STATE.art = 'blatt';
  V.STATE.blatt = { herkunft: V.STATE.anbieter.anbieterId, sprache: 'de', rechtsraum: 'DE', rechtsraumName: 'Deutschland', berufsstand: '', berufsstandName: '', bereich: '',
    situationen: [{ titel: 'Krankenhaus', icon: 'heartPulse', einfuehrung: 'Aufnahme und Aufenthalt.', bloecke: [
      { id: 'aus-gesundheit', titel: 'Aus Gesundheit', eintraege: [{ quelle: 'health', feld: 'bloodType' }] }] }] };
  assert.equal(V.pruefeBlatt(g.lauf('blattStateFuerBauen()')).blocker.length, 0, 'Vorbedingung: das Blatt selbst hält nichts auf');
  assert.equal(V.STATE.pubDownloaded, false, 'Vorbedingung: keine Antragsdatei erstellt');
  await V.blattErzeugen({ isTrusted: true, currentTarget: { id: 'ab-erzeugen' }, timeStamp: performance.now() });
  return { ...g, blaetter: g.geladen.filter((d) => /^vivodepot-angehoerigenvorlage-/.test(d.name)) };
}
test('[Einreichen·Schlüssel·Blatt] das Angehörigen-Blatt entsteht nach der Sicherung ohne Antragsdatei; die Karte steht dort nicht', async () => {
  assert.equal(HTML.split(ERLEDIGT).length - 1, 1, 'die Zeile des öffentlichen Teils steht genau einmal da');
  const { V, el, blaetter } = await blattOhneAntragsdatei();
  assert.equal(blaetter.length, 1, 'das Blatt ist heruntergeladen');
  assert.ok(JSON.parse(blaetter[0].text).modulSignaturJws, 'signiert');
  assert.equal(V.SCHLUESSEL_TRESOR.vorhanden(), false, 'der Schlüssel ist nach dem Signieren fort');
  V.aktualisiereSchluesselWeiter();
  assert.equal(el('sk-antrag-karte').hidden, true, 'im Blatt-Modus keine Antragsdatei-Karte');
});
test('[Einreichen·Schlüssel·Blatt] (5) Rot-Beweis: gilt das Tor der Antragsdatei auch im Blatt-Modus, entsteht kein Blatt', async () => {
  const schlecht = HTML.replace(ERLEDIGT, 'function oeffentlicherTeilErledigt() { return !STUDIO_OEFFENTLICHEN_SCHLUESSEL_EINZELN || !!STATE.pubDownloaded; }');
  assert.notEqual(schlecht, HTML, 'die Umstellung hat nichts geändert');
  const { V, blaetter } = await blattOhneAntragsdatei(schlecht);
  assert.equal(blaetter.length, 0, 'die verschlechterte Fassung gibt das Blatt nicht frei');
  assert.equal(V.SCHLUESSEL_TRESOR.vorhanden(), true, 'und der Schlüssel ist nicht verbraucht');
});

test('[Einreichen·Schlüssel] Wortlaut der Folge, deutsch und englisch', () => {
  const da = [
    '>Die Sicherungsdatei bleibt bei Ihnen. Bewahren Sie sie an zwei Orten auf, zum Beispiel auf einem USB-Stick und in einem verschlüsselten Speicher.</p>',
    '>Diese Datei geht mit dem Antragsformular an Vivodepot. Sie enthält Ihren öffentlichen Schlüssel und einen Nachweis, dass Sie den privaten Schlüssel besitzen.',
    '<p class="hint" data-en="Your public key goes to Vivodepot with the submission.">Ihr öffentlicher Schlüssel geht mit der Einreichung an Vivodepot.</p>',
    'data-en="Save submission">Einreichung speichern</button>',
    '>Die Einreichung wird mit Ihrem Schlüssel unterschrieben und als eine Datei gespeichert.</p>',
    "L('Sicherung geprüft, heruntergeladen', 'Backup checked, downloaded')",
  ];
  assert.deepEqual(da.filter((w) => HTML.indexOf(w) < 0), [], 'der neue Wortlaut steht im Studio');
  const weg = ['Sie erhalten zwei Dateien', 'You get two files', '<strong>beide</strong> Dateien', '<strong>both</strong> files', 'Weiter zum Schlüssel', 'class="hint rot" data-en="This file stays'];
  assert.deepEqual(weg.filter((w) => HTML.indexOf(w) >= 0), [], 'kein alter Satz, kein Rot in der Folge');
  // Der Satz zur nackten öffentlichen Datei ist mit ihr gegangen.
  assert.equal(HTML.indexOf('Diese Datei geht an Vivodepot zur Zertifizierung.'), -1, 'kein Satz zur nackten öffentlichen Datei');
  assert.equal(HTML.indexOf('This file goes to Vivodepot for certification.'), -1);
});
