'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Antwort als PDF an die Stelle, mit dem Teil zum Sterbefall (TODESFALL B, 20.11.2026; schließt ANTWORT-OHNE-PDF)
   ────────────────────────────────────────────────────────────────────────
   Das PDF entsteht aus demselben Datensatz wie die verschlüsselte Antwort. Gehalten wird:
   · Unterlagen nach § 38 PStV je Familienstand: S. 1 Nr. 1 die Urkunde der letzten Ehe oder Lebenspartnerschaft, bei aufgelöster
     Ehe dazu der Nachweis der Auflösung, bei ledig keine; Nr. 2 die Geburtsurkunde immer, mit dem Verzicht nach S. 2 („eine“
     Ehe- oder Lebenspartnerschaftsurkunde, nicht nur die letzte); Nr. 3 und Nr. 4 immer. Ist der Familienstand nicht angefragt,
     steht Nr. 1 als Bedingung da.
   · Der Wunsch zur Bestattung steht nur, wenn die Stelle danach gefragt hat; sonst fehlt er, auch wenn das Depot ihn führt.
   · „Das ergänzt der Bestatter“ steht immer im Teil zum Sterbefall; ohne die Zieldatei des Sterbefalls gibt es den Teil nicht.
   · Der Anhang trägt den Klartext der Antwort byte-gleich und die Zieldatei; der QR trägt die Zieldatei, wenn sie hineinpasst, sonst
     den Link aus „Link senden“, wenn die Person einen erzeugt hat, und ohne Link steht der Satz zum Anhang mit dem Hinweis auf „Link senden“.
   ROT-BEWEISE: ein nicht angefragter Wunsch fehlt (Wunsch-Probe), ein geänderter Anhang fällt auf (Anhang-Probe).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeMitAusgabe, warteAufDateien } = require('../ausgabe-fang.js');

const FORMAT = 'xpersonenstand-sterbefall';
const IDENTITAET = { givenName: 'Gerda', familyName: 'Beispiel', birthDate: '1941-05-17', gender: 'w', city: 'Beispielstadt', maritalStatus: 'verwitwet' };
const NAME = ['identity.givenName', 'identity.familyName', 'identity.gender'];

async function lage(identitaet, wunsch) {
  const k = ladeMitAusgabe();
  const { V } = k;
  await V.depotAnlegen('antwort-sterbefall-pdf-2026');
  V.akteurSelbstErklaeren('Inhaberin');
  for (const [f, w] of Object.entries(identitaet)) V.sektorFeldSetzen('identity', f, w);
  if (wunsch) V.sektorFeldSetzen('personal', 'typeOfFuneral', wunsch);
  return k;
}
function anfrage(kennungen, format) {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Bestattungshaus Beispiel', zweck: 'Anzeige eines Sterbefalls',
    grundlage: '§ 29 PStG', vorgang: 'TF-PDF-1', gestelltAm: '2026-11-20', gueltigBis: '2099-12-31',
    felder: kennungen.map((kn) => ({ kennung: kn, zweck: 'Anzeige beim Standesamt', pflicht: false })),
    antwort: Object.assign({ art: 'einmalpasswort', an: 'probe@beispiel.invalid' }, format ? { format } : {}) };
}
// sensibel: die Person hat in der Übersicht auch die sensiblen Angaben freigegeben (der Wunsch zur Bestattung ist sensibel).
async function modell(k, kennungen, format, sensibel = false) {
  const a = anfrage(kennungen, format === undefined ? FORMAT : format);
  const ds = await k.V.anfrageAntwortDatensatzGeprueft({ anfrage: a }, { sensibel });
  assert.ok(ds, 'die Anfrage ergibt einen Datensatz');
  return { a, ds, m: k.V.antwortPdfModell({ von: a.von, anfrage: a }, ds) };
}
function abschnitt(m, titel) { return (m.abschnitte || []).find((x) => x.titel === titel) || null; }
function texte(ab) { return ab ? ab.zeilen.map((z) => z.text) : []; }

test('[Sterbefall-PDF·§ 38] die Unterlagen folgen dem Familienstand, die Geburtsurkunde steht immer mit dem Verzicht nach S. 2', async () => {
  for (const [stand, ehe, aufl] of [['verwitwet', true, true], ['geschieden', true, true], ['verh', true, false], ['elp', true, false], ['ledig', false, false]]) {
    const k = await lage(Object.assign({}, IDENTITAET, { maritalStatus: stand }));
    const S = k.V.STRINGS;
    const { m } = await modell(k, NAME.concat('identity.maritalStatus'));
    const t = texte(abschnitt(m, S.sterbefallUnterlagenTitel));
    assert.equal(t.includes(S.sterbefallUrkundeEhe), ehe, stand + ': Urkunde der letzten Ehe');
    assert.equal(t.includes(S.sterbefallNachweisAufloesung), aufl, stand + ': Nachweis der Auflösung');
    assert.ok(!t.includes(S.sterbefallUrkundeEheFalls), stand + ': mit bekanntem Familienstand keine Bedingung');
    for (const immer of [S.sterbefallGeburtsurkunde, S.sterbefallWohnsitz, S.sterbefallAerztlich]) assert.ok(t.includes(immer), stand + ': ' + immer);
  }
  const k = await lage(IDENTITAET);
  assert.match(k.V.STRINGS.sterbefallGeburtsurkunde, /eine Ehe- oder Lebenspartnerschaftsurkunde/, 'S. 2: eine, nicht nur die letzte');
});

test('[Sterbefall-PDF·§ 38·nicht angefragt] ohne angefragten Familienstand steht Nr. 1 als Bedingung, der Familienstand selbst nicht', async () => {
  const k = await lage(IDENTITAET);
  const S = k.V.STRINGS;
  const { m } = await modell(k, NAME);
  const t = texte(abschnitt(m, S.sterbefallUnterlagenTitel));
  assert.ok(t.includes(S.sterbefallUrkundeEheFalls));
  assert.ok(!t.includes(S.sterbefallNachweisAufloesung), 'ohne Angabe keine Aussage über eine Auflösung');
});

test('[Sterbefall-PDF·Wunsch·Rot-Beweis] der Wunsch steht nur, wenn die Stelle danach gefragt hat; „ergänzt der Bestatter“ steht immer', async () => {
  const k = await lage(IDENTITAET, 'feuer');
  const S = k.V.STRINGS;
  const ohne = (await modell(k, NAME, undefined, true)).m;
  assert.equal(abschnitt(ohne, S.sterbefallWunschTitel), null, 'nicht angefragt: kein Wunsch, obwohl das Depot ihn führt');
  assert.ok(abschnitt(ohne, S.sterbefallBestatterTitel));
  const nichtFrei = (await modell(k, NAME.concat('personal.typeOfFuneral'))).m;
  assert.equal(abschnitt(nichtFrei, S.sterbefallWunschTitel), null, 'angefragt, aber nicht freigegeben (sensibel): kein Wunsch');
  const mit = (await modell(k, NAME.concat('personal.typeOfFuneral'), undefined, true)).m;
  const w = abschnitt(mit, S.sterbefallWunschTitel);
  assert.ok(w, 'angefragt und freigegeben: der Wunsch steht da');
  assert.ok(!/\{wunsch\}/.test(w.saetze[0]) && w.saetze[0].length > S.sterbefallWunschSatz.length - 9, 'der Wunsch ist eingesetzt: ' + w.saetze[0]);
  assert.ok(abschnitt(mit, S.sterbefallBestatterTitel));
});

test('[Sterbefall-PDF·ohne Zieldatei] ohne die Zieldatei des Sterbefalls gibt es keinen Teil zum Sterbefall und keinen QR', async () => {
  const k = await lage(IDENTITAET);
  const { m } = await modell(k, NAME, null);
  assert.deepEqual(m.abschnitte, []);
  assert.equal(m.qr, null);
});

test('[Sterbefall-PDF·QR] der QR trägt die Zieldatei, wenn sie byte-genau hineinpasst; sonst steht der Satz zum Anhang', async () => {
  const k = await lage(IDENTITAET);
  const { ds, m } = await modell(k, NAME.concat('identity.maritalStatus'));
  assert.ok(m.qr && m.qr.bytes === Buffer.byteLength(ds.zieldatei.inhalt, 'utf8'), 'gezählt in UTF-8-Bytes');
  assert.ok(m.qr.bytes < 2331, 'die Beispieldatei misst ' + m.qr.bytes + ' Byte');
  assert.match(String(m.qr.bild), /^data:image\/(gif|png);base64,/, 'das Bild ist da');
  assert.equal(m.qr.traegt, 'datei');
  // Eine Zieldatei, die nicht in den QR passt (Regel 14.11.2026: dann ein Link mit Abholseite).
  const zuGross = { inhalt: 'x'.repeat(3000), dateiname: 'gross.xml' };
  const ohneLink = k.V.antwortPdfQr(zuGross);
  assert.equal(ohneLink.bild, null, 'ohne Link kein Bild');
  assert.equal(ohneLink.traegt, null);
  assert.ok(ohneLink.satz.includes('gross.xml') && ohneLink.satz.includes(k.V.STRINGS.linkSendenKnopf), 'Satz zum Anhang mit Hinweis auf „Link senden“: ' + ohneLink.satz);
  const link = 'https://ablage.beispiel.invalid/abholen#v1.Probe-Schluessel';
  const mitLink = k.V.antwortPdfQr(zuGross, link);
  assert.equal(mitLink.traegt, 'link', 'mit Link aus „Link senden“ trägt der QR den Link');
  assert.match(String(mitLink.bild), /^data:image\/(gif|png);base64,/);
  assert.ok(mitLink.satz.includes('gross.xml'));
  assert.equal(mitLink.adresse, 'ablage.beispiel.invalid/abholen', 'das PDF schreibt Host und Pfad unter den Code, ohne das Fragment mit dem Schlüssel');
  assert.equal(k.V.antwortPdfQr(zuGross, 'http://unsicher.invalid/x').traegt, null, 'nur ein https-Link');
});

function pdfText(bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sterbefall-pdf-'));
  const p = path.join(dir, 'a.pdf');
  fs.writeFileSync(p, bytes);
  try { return execFileSync('pdftotext', ['-layout', p, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { if (e.code === 'ENOENT') assert.fail('poppler fehlt (`pdftotext`) — `brew install poppler`'); throw e; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[Sterbefall-PDF·Anhang·Rot-Beweis] der Klartext liegt byte-gleich bei, die Zieldatei daneben; ein geänderter Anhang fällt auf', async () => {
  const k = await lage(IDENTITAET);
  const { a, ds } = await modell(k, NAME.concat('identity.maritalStatus'));
  const klartext = JSON.stringify(Object.assign({}, ds, { anfrage: Object.assign({}, ds.anfrage, { kennung: 'Kennung-Probe' }) }));
  await k.V.antwortPdfAusgeben({ von: a.von, anfrage: a }, ds, klartext, 'Vivodepot_Antwort_2026-11-20_abcdef.jwe');
  await warteAufDateien(k, 1, 5000);
  assert.equal(k.gefangen.length, 1, 'eine Datei');
  assert.equal(k.gefangen[0].name, 'Vivodepot_Antwort_2026-11-20_abcdef.pdf', 'derselbe Stamm wie die .jwe, ohne Aktenzeichen');
  const pdf = await k.bytes(0);
  const anh = await k.V.pdfAnhaengeLesen(new Uint8Array(pdf));
  const json = anh.find((x) => /\.json$/.test(x.dateiname));
  const xml = anh.find((x) => x.dateiname === ds.zieldatei.dateiname);
  assert.ok(json && xml, 'zwei Anhänge: ' + anh.map((x) => x.dateiname).join(', '));
  assert.equal(Buffer.from(json.bytes).toString('utf8'), klartext, 'byte-gleich zum Klartext der Antwort');
  assert.notEqual(Buffer.from(json.bytes).toString('utf8'), klartext.replace('Kennung-Probe', 'Kennung-Probf'), 'ein geänderter Anhang fällt auf');
  assert.equal(Buffer.from(xml.bytes).toString('utf8'), ds.zieldatei.inhalt);
  const text = pdfText(pdf);
  for (const w of ['Bestattungshaus Beispiel', 'TF-PDF-1', 'Gerda', '§ 38 PStV', k.V.STRINGS.sterbefallBestatterTitel]) assert.ok(text.includes(w), '„' + w + '“ fehlt im PDF');
});

test('[Sterbefall-PDF·erst Link] passt die Zieldatei nicht in den QR, sagt die Wahl vor dem Erzeugen, dass das PDF zuerst einen Link erzeugt', async () => {
  const k = await lage(IDENTITAET);
  const { V } = k;
  const rufe = [];
  V.ui.modal = (opt) => { rufe.push(opt); return () => {}; };
  const pdf = () => {};
  pdf.hinweis = V.STRINGS.antwortPdfErstLink;
  V._ausgabeWegWaehlen('Antworten', 'antwort.jwe', () => {}, () => {}, () => {}, pdf);
  assert.match(rufe[0].koerperHTML, /id="ausgabe-pdf-link-zuerst"/);
  assert.ok(rufe[0].koerperHTML.includes(V.escapeHTML(V.STRINGS.antwortPdfErstLink)));
  V._ausgabeWegWaehlen('Antworten', 'antwort.jwe', () => {}, () => {}, () => {}, () => {});
  assert.doesNotMatch(rufe[1].koerperHTML, /ausgabe-pdf-link-zuerst/, 'passt die Datei, steht kein Hinweis');
  // Die Antwort setzt den Hinweis aus der Größe der Zieldatei und öffnet dann zuerst „Link senden“.
  const kernText = fs.readFileSync(path.join(__dirname, '..', '..', 'vivodepot.html'), 'utf8');
  const a = kernText.indexOf('function _anfrageAntwortSchreiben(');
  const rumpf = kernText.slice(a, kernText.indexOf('\n}\n', a));
  assert.match(rumpf, /if \(zuGross\) pdfAusgeben\.hinweis = linkSendenGeht\(\) \? STRINGS\.antwortPdfErstLink : STRINGS\.antwortPdfQrOhneLink;/);
  assert.match(rumpf, /\(zuGross && !antwortLink && linkSenden\) \? linkSenden\(\{ nachDemLink:/);
});

/* Abstand unter dem QR-Code (21.11.2026): die Seite mit dem Code wird bei 72 dpi gerendert (1 Pixel = 1 pt). In der Spalte des Codes
   (x 56 bis 196 pt, dunkel heißt Grauwert unter 230, damit auch die grauen Kanten der Schrift zählen) folgt auf den Block des Codes (höchstens 142 Zeilen hoch) eine Lücke von mindestens 6 Zeilen vor der Zeile darunter.
   ROT-BEWEIS: vor dem Fix lagen zwischen der letzten Modulreihe und der Zeile darunter 2 Pixel (gemessen 21.11.2026), danach 14. */
function seiteAlsGrau(bytes, seite) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sterbefall-qr-'));
  const p = path.join(dir, 'a.pdf');
  fs.writeFileSync(p, bytes);
  try {
    execFileSync('pdftoppm', ['-f', String(seite), '-l', String(seite), '-r', '72', '-gray', p, path.join(dir, 's')], { stdio: 'ignore' });
    const datei = fs.readdirSync(dir).find((n) => /\.pgm$/.test(n));
    const b = fs.readFileSync(path.join(dir, datei));
    const kopf = b.toString('latin1', 0, 64).split(/\s+/);   // P5 breite hoehe max
    const breite = Number(kopf[1]), hoehe = Number(kopf[2]);
    let pos = 0; for (let felder = 0; felder < 4; pos++) if (/\s/.test(String.fromCharCode(b[pos])) && !/\s/.test(String.fromCharCode(b[pos - 1]))) felder++;
    return { breite, hoehe, px: b.subarray(pos) };
  } catch (e) { if (e.code === 'ENOENT') assert.fail('poppler fehlt (`pdftoppm`) — `brew install poppler`'); throw e; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('[Sterbefall-PDF·QR-Abstand·Rot-Beweis] unter dem QR-Code steht die Zeile mit Abstand, nicht am Code', async () => {
  const k = await lage(IDENTITAET);
  const { a, ds } = await modell(k, NAME.concat('identity.maritalStatus'));
  await k.V.antwortPdfAusgeben({ von: a.von, anfrage: a }, ds, JSON.stringify(ds), 'Vivodepot_Antwort_2026-11-21_qrabst.jwe');
  await warteAufDateien(k, 1, 5000);
  const pdf = await k.bytes(0);
  const seiten = Number((String(pdf.toString('latin1')).match(/\/Type \/Pages[^>]*\/Count (\d+)/) || [])[1] || 1);
  const { breite, hoehe, px } = seiteAlsGrau(pdf, seiten);
  const zeileDunkel = (y) => { for (let x = 56; x < 196 && x < breite; x++) if (px[y * breite + x] < 230) return true; return false; };
  const bloecke = []; let start = -1;
  for (let y = 0; y < hoehe; y++) {
    const d = zeileDunkel(y);
    if (d && start < 0) start = y;
    if (!d && start >= 0) { bloecke.push([start, y - 1]); start = -1; }
  }
  const qr = bloecke.findIndex(([o, u]) => u - o >= 120);
  assert.ok(qr >= 0, 'kein Block in Größe des QR-Codes auf der letzten Seite: ' + JSON.stringify(bloecke));
  const [o, u] = bloecke[qr];
  assert.ok(u - o <= 142, 'der Block des Codes ist ' + (u - o + 1) + ' Zeilen hoch: die Zeile darunter klebt am Code');
  const naechster = bloecke[qr + 1];
  assert.ok(naechster, 'unter dem Code steht keine Zeile');
  assert.ok(naechster[0] - u - 1 >= 6, 'Lücke unter dem Code nur ' + (naechster[0] - u - 1) + ' Zeilen');
});
