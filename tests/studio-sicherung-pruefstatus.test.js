'use strict';
/* Studio: „heruntergeladen“ ist keine Sicherung, und „geprüft“ heißt Form, nicht Inhalt (12.10.2026)

   Zwei Befunde aus der Durchsicht vom 11.10.2026, eine Klasse: ein Statuswort, das mehr behauptet, als das Studio weiß.
     · Schlüssel: der Schritt meldete „✓ gesichert“, sobald zwei Downloads ausgelöst waren, und die Erfolgskarte
       „gespeichert“. Jetzt steht „heruntergeladen“; „✓ Sicherung geprüft“ steht erst, wenn die eben gespeicherte
       Schlüsseldatei mit ihrem Passwort wieder geöffnet wurde und zu diesem Schlüsselpaar gehört.
     · Prüfstatus: wo das Studio ein Prüfergebnis oder ein Zertifikat nennt, steht daneben, dass der Inhalt nicht geprüft ist.

   ROT-BEWEIS: dieselbe Messung läuft gegen die echte Fassung (leer) und gegen je eine absichtlich verschlechterte;
   jede muss ihre Kennung melden. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
const PW = 'probe-passwort-sicherung';   // frei erfunden, nur hier
const SATZ = 'Vivodepot bestätigt, von wem die Vorlage kommt, nicht ob ihr Inhalt richtig ist.';

function funktion(html, kopf) {
  const a = html.indexOf(kopf);
  if (a < 0) return '';
  const e = html.indexOf('\n}\n', a);
  return html.slice(a, e < 0 ? a + 4000 : e);
}

/* Die Messung am Quelltext: Kennungen der Stellen, an denen ein Statuswort mehr behauptet, als bekannt ist. */
function wortlautVerletzungen(html) {
  const v = [];
  // Klasse 1: kein Zustand, der nur aus einem ausgelösten Download folgt, heißt „gesichert“ oder „gespeichert“.
  // Seit 16.10.2026 steht der Zustand in der Zeile des Schritts „Sicherung speichern“ (einreichenStufen) und in #sk-priv-status:
  // „✓ Sicherung geprüft, heruntergeladen“. GEPRÜFT ist die Hülle im Speicher (Probe-Öffnung), HERUNTERGELADEN die Datei;
  // „gespeichert“ oder „gesichert“ behauptete, was ein ausgelöster Download nicht belegt.
  const stand = [(/if \(privSt\) privSt\.textContent = [^;]*;/.exec(funktion(html, 'function aktualisiereSchluesselWeiter(')) || [''])[0],
    (/b \? \(STATE\.schluesselGeladen \? [^\n]*/.exec(funktion(html, 'function einreichenStufen(')) || [''])[0]].join('\n');
  if (/L\('[^']*(gesichert|gespeichert)[^']*', '[^']*'\)/.test(stand.replace(/L\('Schlüsseldatei geladen'[^)]*\)/, ''))) v.push('schritt-kopf-sagt-gesichert');
  if ((stand.match(/L\('Sicherung geprüft, heruntergeladen', 'Backup checked, downloaded'\)/g) || []).length !== 2) v.push('schritt-kopf-ohne-heruntergeladen');
  if (/Beide Dateien gesichert/.test(html)) v.push('knopf-sagt-gesichert');
  const karte = funktion(html, 'function fertigKarteZeigen(');
  if (!karte) v.push('erfolgskarte-nicht-gefunden');
  if (/Einreichungs-Datei' \+ mehr \+ '[^']*gespeichert'/.test(karte)) v.push('erfolgskarte-sagt-gespeichert');
  if (/submission file' \+ mehr \+ '[^']*saved'/.test(karte)) v.push('erfolgskarte-sagt-saved');
  // Klasse 2: wo ein Prüfergebnis oder ein Zertifikat genannt wird, steht daneben, was nicht geprüft ist.
  if (!/Es bestätigt nicht, ob ihr Inhalt richtig ist\./.test(karte)) v.push('erfolgskarte-ohne-inhaltssatz');
  if (!/It does not confirm whether its content is correct\./.test(karte)) v.push('erfolgskarte-ohne-inhaltssatz-en');
  const pruefung = funktion(html, 'function renderefPruefung(');
  if (!pruefung) v.push('pruefung-nicht-gefunden');
  if (/Alle blockierenden Prüfungen bestanden/.test(html)) v.push('schritt3-sagt-alle-pruefungen-bestanden');
  if (!/Ob der Inhalt fachlich und rechtlich stimmt, prüft das Studio nicht\./.test(pruefung)) v.push('schritt3-ohne-inhaltssatz');
  const probier = (/<p class="herkunft-satz probier-satz" id="probier-herkunft">(.*?)<\/p>/s.exec(html) || [])[1] || '';
  if (probier.indexOf(SATZ) < 0) v.push('ausprobieren-ohne-herkunftssatz');
  if (probier.indexOf('data-en="Vivodepot confirms who the template comes from, not whether its content is correct."') < 0) v.push('ausprobieren-ohne-herkunftssatz-en');
  if (html.indexOf('<div id="tpl-felder"') < 0 || html.indexOf('id="probier-herkunft"') < html.indexOf('<div id="tpl-felder"')) v.push('herkunftssatz-nicht-unter-der-vorschau');
  // Der Satz hat überall denselben Wortlaut: jede Stelle, die mit „Vivodepot bestätigt, von wem“ anfängt, sagt den ganzen Satz.
  const saetze = html.match(/Vivodepot bestätigt, von wem[^.<]*\./g) || [];
  if (saetze.length < 3 || saetze.some((s) => s !== SATZ)) v.push('herkunftssatz-in-abweichendem-wortlaut');
  return v;
}

/* Der freigegebene Wortlaut (Vorlage vom 11.10.2026, zweite Fassung; die Folge „Einreichen“ aus der Gestaltungsvorlage
   „ohne Prüfschritt“, freigegeben 16.10.2026), deutsch und englisch. Der frühere Satz „Diese Datei bleibt bei Ihnen …“ ist
   mit dieser Vorlage durch den Satz zur Sicherungsdatei ersetzt. */
const WORTLAUT = [
  '>Gespeicherte Sicherung prüfen</summary>', 'data-en="Check saved backup"',
  '>Wählen Sie die heruntergeladene Datei aus und geben Sie ihr Passwort ein. So sehen Sie, dass die gespeicherte Datei aufgeht.</p>',
  '>Sicherungsdatei</label>', 'id="sk-pruefen-knopf" class="sekundaer" data-en="Check saved backup">Gespeicherte Sicherung prüfen</button>',
  '>Die Sicherungsdatei bleibt bei Ihnen. Bewahren Sie sie an zwei Orten auf, zum Beispiel auf einem USB-Stick und in einem verschlüsselten Speicher.</p>',
  'data-en="The backup file stays with you. Keep it in two places, for example on a USB stick and in encrypted storage."',
  '>Frei, sobald Ihre Schlüsselsicherung geprüft und bestätigt ist.</p>',
  'data-en="Available as soon as your key backup is checked and confirmed."',
  'data-en="Save backup">Sicherung speichern</button>', '>Passwort (mindestens 8 Zeichen)</label>', '>Passwort wiederholen</label>',
  "L('Die Datei lässt sich mit Ihrem Passwort öffnen.'",
  "L('Sie gehört zu diesem Schlüsselpaar. Legen Sie sie an zwei Orten ab. Vivodepot hat keine Kopie.'",
  "L('Die Datei ließ sich nicht öffnen.'",
  "L('Das Passwort passt nicht, oder es ist eine andere Datei. Sie können es noch einmal versuchen oder den privaten Schlüssel erneut herunterladen.'",
  "L('Noch einmal prüfen', 'Check again')", 'data-en="Download again">Erneut herunterladen</button>',
  "'✓ ' + L('Sicherung geprüft, heruntergeladen', 'Backup checked, downloaded')",
  "' signiert und heruntergeladen', '✓ Done: submission file' + mehr + ' signed and downloaded')",
  "L('✓ Aufbau und Vollständigkeit geprüft.', '✓ Structure and completeness checked.')",
];

test('[Studio·Sicherung] der freigegebene Wortlaut steht im Studio, deutsch und englisch', () => {
  const fehlt = WORTLAUT.filter((w) => HTML.indexOf(w) < 0);
  assert.deepEqual(fehlt, []);
});

test('[Studio·Sicherung·Klasse] kein Statuswort behauptet mehr, als das Studio weiß', () => {
  assert.deepEqual(wortlautVerletzungen(HTML), []);
});

test('[Studio·Sicherung·Rot-Beweis] die Messung meldet jede verschlechterte Fassung', () => {
  const faelle = [
    ['schritt-kopf-sagt-gesichert', (h) => h.replace("'✓ ' + L('Sicherung geprüft, heruntergeladen', 'Backup checked, downloaded')", "'✓ ' + L('Sicherung gespeichert', 'Backup saved')")],
    ['schritt-kopf-ohne-heruntergeladen', (h) => h.replace("L('Schlüsseldatei geladen', 'Key file loaded') : L('Sicherung geprüft, heruntergeladen', 'Backup checked, downloaded')", "L('Schlüsseldatei geladen', 'Key file loaded') : L('Sicherung geprüft', 'Backup checked')")],
    ['knopf-sagt-gesichert', (h) => h.replace('>Sicherung speichern</button>', '>Beide Dateien gesichert: weiter →</button>')],
    ['erfolgskarte-sagt-gespeichert', (h) => h.replace("' signiert und heruntergeladen'", "' signiert und gespeichert'")],
    ['erfolgskarte-ohne-inhaltssatz', (h) => h.replace(' Es bestätigt nicht, ob ihr Inhalt richtig ist.', '')],
    ['schritt3-sagt-alle-pruefungen-bestanden', (h) => h.replace('✓ Aufbau und Vollständigkeit geprüft.', '✓ Alle blockierenden Prüfungen bestanden.')],
    ['schritt3-ohne-inhaltssatz', (h) => h.replace('Ob der Inhalt fachlich und rechtlich stimmt, prüft das Studio nicht.', 'Fertig.')],
    ['ausprobieren-ohne-herkunftssatz', (h) => h.replace(/<p class="herkunft-satz probier-satz" id="probier-herkunft">.*?<\/p>/s, '')],
    ['herkunftssatz-in-abweichendem-wortlaut', (h) => h.replace(/(id="probier-herkunft">.*?)nicht ob ihr Inhalt richtig ist\./s, '$1nicht ob ihr Inhalt stimmt.')],
  ];
  for (const [kennung, verschlechtern] of faelle) {
    const schlecht = verschlechtern(HTML);
    assert.notEqual(schlecht, HTML, kennung + ': die Verschlechterung hat nichts geändert');
    assert.ok(wortlautVerletzungen(schlecht).includes(kennung), kennung + ' wird nicht gemeldet: ' + wortlautVerletzungen(schlecht).join());
  }
});

/* ── Der Tresor: prüfen, ohne zu halten ── */
async function paar(V) {
  const T = V.SCHLUESSEL_TRESOR;
  const pub = await T.erzeugen({ passwort: PW });
  let text = '';
  T.privatHerunterladen((t) => { text = t; });
  return { T, pub: pub.publicJwk, datei: JSON.parse(text) };
}

test('[Studio·Sicherung·Tresor] die eben gespeicherte Datei mit ihrem Passwort gilt, alles andere nicht', async () => {
  const { V } = ladeGenerator();
  const { T, pub, datei } = await paar(V);
  assert.equal(typeof pub.x, 'string', 'Vorbedingung: der öffentliche Schlüssel des Paars liegt vor');
  const vorher = JSON.stringify(T.zustand());
  const huelle = () => { let t = ''; T.privatHerunterladen((x) => { t = x; }); return t; };
  const huelleVorher = huelle();

  assert.equal(await T.sicherungPruefen(datei, PW, pub), true, 'richtige Datei, richtiges Passwort');
  assert.equal(await T.sicherungPruefen(datei, PW + 'x', pub), false, 'falsches Passwort');
  assert.equal(await T.sicherungPruefen(datei, '', pub), false, 'leeres Passwort');
  assert.equal(await T.sicherungPruefen(datei, PW, null), false, 'ohne erwarteten Schlüssel gibt es kein Ja');
  assert.equal(await T.sicherungPruefen(datei, PW, {}), false, 'ein leerer erwarteter Schlüssel ist kein Ja');
  assert.equal(await T.sicherungPruefen(null, PW, pub), false);
  assert.equal(await T.sicherungPruefen({ irgend: 'etwas' }, PW, pub), false, 'eine fremde Datei');

  // Eine Klartext-Schlüsseldatei ist keine Sicherung, auch wenn sie zum Paar gehört.
  const klar = await V.entschluesseleSchluesselJwk(datei, PW);
  assert.equal(await T.sicherungPruefen(klar, PW, pub), false, 'Klartext-JWK');

  // Die Datei eines ANDEREN Paars mit demselben Passwort gehört nicht zu diesem Schlüsselpaar.
  const fremd = await V.schuetzeSchluesselJwk((await V.erzeugeSchluesselpaarRoh()).privateJwk, PW);
  assert.equal(V.istGeschuetzteSchluesseldatei(fremd), true, 'Vorbedingung: die fremde Datei ist eine geschützte Schlüsseldatei');
  assert.equal(await V.entschluesseleSchluesselJwk(fremd, PW).then((j) => !!j.d), true, 'Vorbedingung: sie öffnet sich mit dem Passwort');
  assert.equal(await T.sicherungPruefen(fremd, PW, pub), false, 'fremdes Schlüsselpaar');

  // Gleiches x, andere Kurve: kein Ja, in beiden Richtungen.
  assert.equal(await T.sicherungPruefen(datei, PW, Object.assign({}, pub, { crv: 'X25519' })), false, 'erwarteter Schlüssel mit anderem crv');
  assert.equal(await T.sicherungPruefen(datei, PW, Object.assign({}, pub, { kty: 'EC' })), false, 'erwarteter Schlüssel mit anderem kty');
  const andereKurve = await V.schuetzeSchluesselJwk(Object.assign({}, klar, { crv: 'X25519' }), PW);
  assert.equal(await T.sicherungPruefen(andereKurve, PW, pub), false, 'Datei mit gleichem x und anderem crv');

  // Die Antwort ist streng boolean, auch wenn das Öffnen wirft (eine Hülle in unbekannter Fassung).
  const unbekannt = JSON.parse(JSON.stringify(datei));
  unbekannt.kdf = 'gibt-es-nicht'; unbekannt.iterationen = 1;
  assert.equal(V.istGeschuetzteSchluesseldatei(unbekannt), true, 'Vorbedingung: sie gilt noch als Schlüsseldatei, das Öffnen scheitert erst dahinter');
  await assert.rejects(() => V.entschluesseleSchluesselJwk(unbekannt, PW), 'Vorbedingung: das Öffnen dieser Hülle wirft');
  const antworten = [
    await T.sicherungPruefen(datei, PW, pub), await T.sicherungPruefen(datei, PW + 'x', pub), await T.sicherungPruefen(unbekannt, PW, pub),
    await T.sicherungPruefen(undefined, undefined, undefined), await T.sicherungPruefen('kein objekt', PW, pub),
  ];
  for (const a of antworten) assert.equal(typeof a, 'boolean');
  assert.equal(antworten[2], false, 'unbekannte Fassung der Hülle');
  await assert.rejects(() => V.entschluesseleSchluesselJwk(datei, PW + 'x'), 'Vorbedingung: das Öffnen selbst wirft bei falschem Passwort');

  // Die Prüfung hält, ersetzt und verwirft nichts: Zustand und Hülle sind Byte für Byte gleich.
  assert.equal(JSON.stringify(T.zustand()), vorher);
  assert.equal(huelle(), huelleVorher);
  assert.ok(huelleVorher.length > 0);
});

test('[Studio·Sicherung·Rot-Beweis] ein Tresor, der die Kurve nicht bindet, fällt auf', async () => {
  const schlecht = HTML.replace("jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519') return false;", "jwk.kty !== 'OKP') return false;");
  assert.notEqual(schlecht, HTML);
  const { V } = ladeGenerator({ html: schlecht });
  const { T, pub, datei } = await paar(V);
  const klar = await V.entschluesseleSchluesselJwk(datei, PW);
  const andereKurve = await V.schuetzeSchluesselJwk(Object.assign({}, klar, { crv: 'X25519' }), PW);
  assert.equal(await T.sicherungPruefen(andereKurve, PW, pub), true, 'die verschlechterte Fassung nimmt die andere Kurve an');
});

test('[Studio·Sicherung·Rot-Beweis] ein Tresor, der nicht mit dem Schlüsselpaar vergleicht, fällt auf', async () => {
  const schlecht = HTML.replace('return _pubAusPriv(jwk).x === erwartetPublicJwk.x;', 'return true;');
  assert.notEqual(schlecht, HTML);
  const { V } = ladeGenerator({ html: schlecht });
  const { T, pub } = await paar(V);
  const fremd = await V.schuetzeSchluesselJwk((await V.erzeugeSchluesselpaarRoh()).privateJwk, PW);
  assert.equal(await T.sicherungPruefen(fremd, PW, pub), true, 'die verschlechterte Fassung nimmt das fremde Paar an');
});

/* ── Der Schritt „Sicherung speichern“ und das Angebot „Gespeicherte Sicherung prüfen“ (16.10.2026) ── */
test('[Studio·Sicherung·Schritt] „✓ Sicherung geprüft, heruntergeladen“ nach Probe und Download; die freiwillige Prüfung der Datei bleibt', async () => {
  const { V, document, sandbox } = ladeGenerator();
  const el = (id) => document.getElementById(id);
  for (const id of ['sk-pruefen', 'sk-pruef-datei', 'sk-pruef-pw', 'sk-pruef-ergebnis', 'sk-pruefen-knopf', 'sk-erneut-laden', 'pr-submit', 'pr-sperre-hinweis'])
    assert.ok(el(id), 'das Element #' + id + ' steht im Studio');
  let datei = null;
  sandbox.blobDownload = (name, text) => { if (/\.vdkey$/.test(name)) datei = text; };
  el('sk-pw1').value = PW; el('sk-pw2').value = PW;
  assert.equal(el('sk-priv-status').textContent, '', 'vor dem Speichern kein Stand');
  await require('node:vm').runInContext('ladePrivate()', sandbox);
  assert.ok(datei, 'die Sicherung ist heruntergeladen');
  assert.equal(el('sk-priv-status').textContent, '✓ Sicherung geprüft, heruntergeladen');
  assert.equal(V.einreichungFrei(), true, 'nach Probe und Download ist die Einreichung frei');
  assert.equal(el('pr-sperre-hinweis').hidden, true);

  // Die freiwillige Prüfung der gespeicherten Datei: falsches Passwort meldet, ändert das Tor nicht; richtiges bestätigt.
  el('sk-pruef-datei').files = [{ text: async () => datei }];
  el('sk-pruef-pw').value = PW + 'x';
  assert.equal(await V.sicherungPruefen(), false);
  assert.equal(el('sk-pruef-pw').value, '', 'das Passwortfeld ist nach der Prüfung leer');
  assert.equal(el('sk-erneut-laden').hidden, false, 'nach dem Fehlschlag steht „Erneut herunterladen“ da');
  el('sk-pruef-pw').value = PW;
  assert.equal(await V.sicherungPruefen(), true);
  assert.equal(el('sk-pruef-pw').value, '');
});
