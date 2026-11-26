'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Antwort trägt die Angaben zur verstorbenen Person im Standard der Standesämter (Befund UEBERNAHME-OHNE-ABTIPPEN)
   ────────────────────────────────────────────────────────────────────────
   Nennt die Anfrage `antwort.format = 'xpersonenstand-sterbefall'`, baut der Kern den Teil `verstorbener` der Nachricht
   084021 „Anzeige des Sterbefalls durch den Bestatter“ (XPersonenstand 26.11, xpersonenstand-nachrichten-portale.xsd, Typ
   Portal2StA.Sterbefall.Verstorbener.Bestatter) und, wenn die Anfrage die Kinderliste nennt, die zwei Kinderzahlen.
   Kopf, Absender und Anzeigenden setzt das Fachverfahren des Bestatters; das Depot erfindet sie nicht. Darum steht der Teil in
   einer eigenen Hülle, die sich nicht als XPersonenstand-Nachricht ausgibt.
   Gehalten wird:
   · Jede Angabe, die das Depot führt, die Anfrage nennt und der Typ kennt, geht hinaus (gezählt je Zeile der Zuordnung).
   · Die Reihenfolge folgt dem Typ; Pflicht sind familienname und geschlecht, sonst gibt es den Grund `pflichtangabe-fehlt`.
   · Die Kinderzahl geht nur als Zahl hinaus, kein Geburtsdatum (Verweis-Export-Regel D0), und nur bei eindeutiger Zuordnung.
   · Neben den eingelassenen Format-Modulen nimmt die Antwort nur die Kanäle der Liste ANTWORT_ZIELDATEI_KANAELE, jeder mit
     der Marke `antwortZieldatei: true`. Die Liste ist eine Positivliste mit Deckel (unten); der Deckel sinkt nur.
   ROT-BEWEISE (je einer gegen die vier Wege, auf denen die Sperre fallen könnte):
   (1) ein Kanal der Liste ohne Marke ergibt `format-fehlt`;
   (2) ein nicht angefragtes Feld fehlt, obwohl derselbe Kanal ohne Filter es trüge;
   (3) ein Kanal mit Anhang ergibt `format-liest-am-filter-vorbei`;
   (4) ein Format-Modul kann die Marke nicht selbst setzen und keinen Kanal der Liste ersetzen.
   Die Schemaprüfung gegen die XSD läuft nicht in der Suite: ohne schriftliche Genehmigung der KoSIT liegt keine XSD im Repo.
   Gehalten wird hier die Pinnung, gegen die eine lokale Prüfung läuft (Manifest und Registerzeile).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020').default;
const { ladeKern } = require('../load-kern.js');

const WURZEL = path.join(__dirname, '..', '..');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(WURZEL, 'docs', 'template-generator', 'antwort-schema.json'), 'utf8'));
const FORMAT = 'xpersonenstand-sterbefall';
const DECKEL_KANAELE = 1;   // sinkt nur; ein neuer Kanal braucht ein Wort der Abstimmung

const IDENTITAET = {
  givenName: 'Gerda', familyName: 'Beispiel', birthName: 'Muster', birthDate: '1941-05-17', birthPlace: 'Beispielstadt',
  gender: 'w', street: 'Probeweg', houseNumber: '3', postalCode: '12345', city: 'Beispielstadt',
  nationality: 'deutsch', maritalStatus: 'verwitwet',
};
const ALLE_KENNUNGEN = Object.keys(IDENTITAET).map((f) => 'identity.' + f);

async function kern(identitaet, menschen, kinder) {
  const { V } = ladeKern();
  await V.depotAnlegen('antwort-sterbefall-pw-2026');
  V.akteurSelbstErklaeren('Inhaberin');   // ohne Sitzungs-Akteur stempelt der Kern nichts (Nachweis-Proben)
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, identitaet);
  if (menschen) d.menschen = menschen;
  if (kinder) d.sektoren.people = Object.assign({}, d.sektoren.people, { childrenAndDependants: kinder });
  V.setData(d);
  return V;
}
function anfrage(kennungen, format) {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Bestattungshaus Beispiel', zweck: 'Anzeige eines Sterbefalls',
    grundlage: '§ 29 PStG', vorgang: 'TF-1', gestelltAm: '2026-11-20', gueltigBis: '2099-12-31',
    felder: kennungen.map((k) => ({ kennung: k, zweck: 'Anzeige beim Standesamt', pflicht: false })),
    antwort: { art: 'einmalpasswort', an: 'probe@beispiel.invalid', format } };
}
// sensibel: true heißt, die Person hat in der Übersicht auch die sensiblen Angaben freigegeben (Geburtsname, Staatsangehörigkeit).
async function antwort(V, a, sensibel = false) {
  const ds = await V.anfrageAntwortDatensatzGeprueft({ anfrage: a }, { sensibel });
  assert.ok(ds, 'die Anfrage ist gültig und ergibt einen Datensatz');
  return JSON.parse(JSON.stringify(ds));
}
function schemaFehler(ds) {
  const pruefe = new Ajv2020({ allErrors: true, strict: false, validateFormats: false }).compile(SCHEMA);
  return pruefe(ds) ? [] : pruefe.errors.map((e) => (e.instancePath || '/') + ' ' + e.message);
}
function element(xml, name) {
  const m = new RegExp('<xps:' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</xps:' + name + '>').exec(xml);
  return m ? m[1] : null;
}

test('[Sterbefall·Hülle] eigener Namensraum, Verweis auf 084021 und 26.11, kein Kopf, kein Absender', async () => {
  const V = await kern(IDENTITAET);
  const ds = await antwort(V, anfrage(ALLE_KENNUNGEN, FORMAT));
  assert.deepEqual(schemaFehler(ds), []);
  const z = ds.zieldatei;
  assert.ok(z && typeof z.inhalt === 'string', 'eine Datei ist eingebettet: ' + JSON.stringify(z));
  assert.equal(z.mime, 'application/xml');
  assert.equal(z.dateiname, 'Sterbefall_Angaben_XPersonenstand.xml');
  assert.match(z.inhalt, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<sterbefallAngaben xmlns="urn:vivodepot:antwort:xpersonenstand-sterbefall:v1" xmlns:xps="http:\/\/xpsw\.domap\.de\/xpsw2611" nachricht="084021" fassung="26\.11"/);
  for (const nein of ['nachrichtenkopf', 'anschrift.autor', 'anzeigender', 'autor', 'leser', 'portal2StA']) {
    assert.doesNotMatch(z.inhalt, new RegExp('<(xps:)?' + nein.replace('.', '\\.') + '[\\s>]'), 'kein ' + nein);
  }
});

test('[Sterbefall·je Feld] jede geführte, angefragte Angabe geht hinaus, in der Reihenfolge des Typs', async () => {
  const V = await kern(IDENTITAET);
  const z = (await antwort(V, anfrage(ALLE_KENNUNGEN, FORMAT), true)).zieldatei;
  const verstorbener = element(z.inhalt, 'verstorbener');
  assert.ok(verstorbener, 'Teil verstorbener vorhanden');
  // Gegenprobe: ohne Freigabe der sensiblen Angaben fehlen genau diese, alles andere geht hinaus.
  const ohne = element((await antwort(V, anfrage(ALLE_KENNUNGEN, FORMAT))).zieldatei.inhalt, 'verstorbener');
  assert.equal(element(ohne, 'geburtsname'), null, 'Geburtsname ist sensibel');
  assert.equal(element(ohne, 'staatsangehoerigkeit'), null, 'Staatsangehörigkeit ist sensibel');
  assert.equal(element(ohne, 'familienname'), 'Beispiel');
  const erwartet = [
    ['vorname', 'Gerda'], ['familienname', 'Beispiel'], ['geburtsname', 'Muster'], ['geburtstag', '1941-05-17'],
    ['geburtsort', '<xps:ort>Beispielstadt</xps:ort>'], ['geschlecht', '<code xmlns="">w</code>'],
    ['letzterWohnsitz', '<xps:strasse>Probeweg 3</xps:strasse><xps:plz>12345</xps:plz><xps:ort>Beispielstadt</xps:ort>'],
  ];
  for (const [name, wert] of erwartet) assert.equal(element(verstorbener, name), wert, name);
  assert.ok(element(verstorbener, 'staatsangehoerigkeit'), 'staatsangehoerigkeit geht hinaus');
  assert.match(element(verstorbener, 'staatsangehoerigkeit'), /^<xps:nichtGelisteterWert>[^<]+<\/xps:nichtGelisteterWert>$/);
  assert.ok(element(verstorbener, 'familienstand'), 'familienstand geht hinaus');
  assert.match(element(verstorbener, 'familienstand'), /^<xps:nichtGelisteterWert>[^<]+<\/xps:nichtGelisteterWert>$/);
  // Gezählt je Zeile der Zuordnung: jede Zeile landet in genau einem Element des Typs.
  const ziele = new Set(V.XPS_STERBEFALL_ZUORDNUNG.map((m) => m.ziel));
  const inDatei = { vorname: 'vorname', familienname: 'familienname', geburtsname: 'geburtsname', geburtstag: 'geburtstag',
    geburtsort: 'geburtsort', geschlecht: 'geschlecht', strasse: 'letzterWohnsitz', hausnummer: 'letzterWohnsitz', plz: 'letzterWohnsitz',
    ort: 'letzterWohnsitz', staatsangehoerigkeit: 'staatsangehoerigkeit', familienstand: 'familienstand' };
  assert.deepEqual([...ziele].sort(), Object.keys(inDatei).sort(), 'die Zuordnung deckt genau diese Ziele');
  for (const ziel of ziele) assert.ok(element(verstorbener, inDatei[ziel]), 'Ziel ' + ziel + ' steht in der Datei');
  const reihe = ['vorname', 'familienname', 'geburtsname', 'geburtstag', 'geburtsort', 'geschlecht', 'letzterWohnsitz', 'staatsangehoerigkeit', 'familienstand'];
  const stellen = reihe.map((n) => verstorbener.search(new RegExp('<xps:' + n + '[\\s>]')));
  assert.deepEqual(stellen, [...stellen].sort((a, b) => a - b), 'Reihenfolge des Typs');
});

test('[Sterbefall·Pflicht] ohne familienname oder geschlecht keine Datei, sondern ein Grund', async () => {
  for (const fehlt of ['familyName', 'gender']) {
    const id = Object.assign({}, IDENTITAET); delete id[fehlt];
    const V = await kern(id);
    const ds = await antwort(V, anfrage(ALLE_KENNUNGEN.filter((k) => k !== 'identity.' + fehlt), FORMAT));
    assert.deepEqual(ds.zieldatei, { format: FORMAT, grund: 'pflichtangabe-fehlt' }, fehlt);
    assert.deepEqual(schemaFehler(ds), []);
  }
  const V = await kern(IDENTITAET);
  const nichtAngefragt = await antwort(V, anfrage(['identity.givenName', 'identity.familyName'], FORMAT));
  assert.deepEqual(nichtAngefragt.zieldatei, { format: FORMAT, grund: 'pflichtangabe-fehlt' }, 'geschlecht nicht angefragt');
});

// Ein Wert aus dem Depot steht in der Datei nur maskiert: kein rohes <, & oder " aus der Angabe.
const ROH = 'Oh<b>ne & "Gänse"füße';
const MASKIERT = 'Oh&lt;b&gt;ne &amp; &quot;Gänse&quot;füße';
function rohImText(xml) {
  // Alles, was nicht Markup des Kanals ist: der Text zwischen den Tags. Ein rohes < aus dem Wert bräche die Tag-Folge auf.
  return xml.includes(ROH) || /<b>/.test(xml) || /& "/.test(xml);
}

test('[Sterbefall·Maskierung] ein Wert mit <, & und Anführungszeichen steht in jedem Textfeld der Zieldatei nur maskiert', async () => {
  const TEXTFELDER = ['givenName', 'familyName', 'birthName', 'birthPlace', 'street', 'houseNumber', 'postalCode', 'city', 'nationality'];
  const V = await kern(Object.assign({}, IDENTITAET, Object.fromEntries(TEXTFELDER.map((f) => [f, ROH]))));
  const z = (await antwort(V, anfrage(ALLE_KENNUNGEN, FORMAT), true)).zieldatei;
  assert.equal(typeof z.inhalt, 'string', JSON.stringify(z));
  for (const n of ['vorname', 'familienname', 'geburtsname']) assert.equal(element(z.inhalt, n), MASKIERT, n);
  assert.equal(element(z.inhalt, 'geburtsort'), '<xps:ort>' + MASKIERT + '</xps:ort>');
  assert.equal(element(z.inhalt, 'letzterWohnsitz'), '<xps:strasse>' + MASKIERT + ' ' + MASKIERT + '</xps:strasse><xps:plz>' + MASKIERT
    + '</xps:plz><xps:ort>' + MASKIERT + '</xps:ort>');
  assert.equal(element(z.inhalt, 'staatsangehoerigkeit'), '<xps:nichtGelisteterWert>' + MASKIERT + '</xps:nichtGelisteterWert>');
  assert.equal(rohImText(z.inhalt), false, 'kein roher Wert in der Datei');
});

test('[Sterbefall·Maskierung·Rot-Beweis] ohne _xpsText stünde der Wert roh in der Datei, und die Probe sähe es', async () => {
  const V = await kern(IDENTITAET);
  assert.equal(V._xpsText('familienname', ROH), '<xps:familienname>' + MASKIERT + '</xps:familienname>');
  const ohneMaske = V._xpsEl('familienname', ROH);
  assert.equal(ohneMaske, '<xps:familienname>' + ROH + '</xps:familienname>', 'Vorbedingung: _xpsEl allein maskiert nicht');
  assert.equal(rohImText(ohneMaske), true, 'die Prüfung erkennt den rohen Wert');
});

test('[Sterbefall·Nachweis] ein Familienname aus einem signierten Nachweis geht hinaus; der Wahrheits-Filter bleibt für andere Wege', async () => {
  const V = await kern(IDENTITAET);
  V.urheberschaftAnhaengen('identity', 'familyName', { verifiziert: true });
  assert.equal(V._feldVerifiziertStaemmig('identity', 'familyName'), true, 'Vorbedingung: der Familienname ist verifiziert-stämmig');
  const z = (await antwort(V, anfrage(ALLE_KENNUNGEN, FORMAT))).zieldatei;
  assert.equal(typeof z.inhalt, 'string', 'eine Datei, kein Grund: ' + JSON.stringify(z));
  assert.equal(element(z.inhalt, 'familienname'), 'Beispiel');
  // Rot-Beweis: ohne die ausdrückliche Wahl hält derselbe Aufruf den Namen zurück (Selbstauskunft-Exporte unverändert).
  const zurueck = [];
  const mitFilter = V.baueAusMapping('identity', V.XPS_STERBEFALL_ZUORDNUNG, { _zurueck: zurueck });
  assert.equal('familienname' in mitFilter, false, 'der Wahrheits-Filter greift ohne die Wahl');
  assert.ok(zurueck.some((r) => r.feld === 'familyName'), 'und meldet den Namen als zurückgehalten');
  assert.equal(V.baueAusMapping('identity', V.XPS_STERBEFALL_ZUORDNUNG, { ohneWahrheitsFilter: true }).familienname, 'Beispiel');
});

test('[Sterbefall·Rot-Beweis 2] ein nicht angefragtes Feld fehlt; derselbe Kanal ohne Filter trüge es', async () => {
  const V = await kern(IDENTITAET);
  const kanal = V.ANTWORT_ZIELDATEI_KANAELE.find((k) => k.id === FORMAT);
  assert.match(kanal.baue({}), /<xps:geburtsort>/, 'Vorbedingung: ohne Filter steht der Geburtsort in der Datei');
  const z = (await antwort(V, anfrage(['identity.familyName', 'identity.gender'], FORMAT))).zieldatei;
  assert.equal(element(z.inhalt, 'verstorbener'), '<xps:familienname>Beispiel</xps:familienname><xps:geschlecht listVersionID="1"><code xmlns="">w</code></xps:geschlecht>');
  assert.doesNotMatch(z.inhalt, /Beispielstadt|Gerda|1941/);
});

test('[Sterbefall·Rot-Beweis 1 und 3] Kanal ohne Marke und Kanal mit Anhang: ein Grund statt eines Kanals', () => {
  const { V } = ladeKern();
  const baue = () => '<x/>';
  assert.deepEqual(V._antwortZieldateiKanal('probe-ohne-marke', [{ id: 'probe-ohne-marke', baue }]), { grund: 'format-fehlt' });
  assert.deepEqual(V._antwortZieldateiKanal('probe-ohne-marke', [{ id: 'probe-ohne-marke', antwortZieldatei: 'ja', baue }]), { grund: 'format-fehlt' });
  assert.deepEqual(V._antwortZieldateiKanal('probe-anhang', [{ id: 'probe-anhang', antwortZieldatei: true, anhaenge: [{ feld: 'x' }], baue }]),
    { grund: 'format-liest-am-filter-vorbei' });
  assert.deepEqual(V._antwortZieldateiKanal('probe-vertreter', [{ id: 'probe-vertreter', antwortZieldatei: true, vertreter: true, baue }]),
    { grund: 'format-liest-am-filter-vorbei' });
  const mitMarke = { id: 'probe-mit-marke', antwortZieldatei: true, baue };
  assert.equal(V._antwortZieldateiKanal('probe-mit-marke', [mitMarke]).kanal, mitMarke, 'Gegenprobe: mit Marke wird der Kanal genommen');
});

test('[Sterbefall·Rot-Beweis 4] ein Format-Modul setzt die Marke nicht selbst und ersetzt keinen Kanal der Liste', async () => {
  const modul = { modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'probe-modul-marke', richtung: 'export',
    sektor: 'identity', label: 'Probe', quelle: 'antrag', zuordnung: [{ feld: 'familyName', ziel: 'person.nachname' }] };
  const { V } = ladeKern();
  const geprueft = V.formatModulPruefen(Object.assign({}, modul, { antwortZieldatei: true }));
  assert.ok(geprueft.verworfene.some((v) => v.schluessel === 'antwortZieldatei' && v.grund === 'unbekannt'),
    'die Marke ist kein Schlüssel der Modulbeschreibung und wird verworfen: ' + JSON.stringify(geprueft.verworfene));
  assert.equal(geprueft.kanal && geprueft.kanal.antwortZieldatei, undefined, 'der geprüfte Kanal trägt sie nicht');
  const V2 = await kern(IDENTITAET);
  const d = V2.getData();
  d.formatModule = (d.formatModule || []).concat([Object.assign({}, modul, { antwortZieldatei: true }),
    Object.assign({}, modul, { format: FORMAT, schreiber: 'xml@1' })]);
  V2.setData(d);
  const kanalModul = V2.exportFormatFuerId('probe-modul-marke');
  assert.ok(kanalModul && kanalModul.eingelassen, 'Vorbedingung: das Modul ist eingelassen');
  assert.equal(kanalModul.antwortZieldatei, undefined, 'der Kanal aus dem Modul trägt keine Marke');
  const z = (await antwort(V2, anfrage(ALLE_KENNUNGEN, FORMAT))).zieldatei;
  assert.match(z.inhalt, /^<\?xml[^>]*>\n<sterbefallAngaben xmlns="urn:vivodepot:antwort:xpersonenstand-sterbefall:v1"/, 'der Kanal der Liste gewinnt vor dem gleichnamigen Modul');
});

test('[Sterbefall·Kinderzahl] nur Zahlen, nur bei eindeutiger Zuordnung, nur wenn die Kinderliste angefragt ist', async () => {
  const jahr = new Date().getFullYear();
  const menschen = [
    { id: 'k1', name: 'Kind Eins', birthDate: (jahr - 40) + '-01-15' },
    { id: 'k2', name: 'Kind Zwei', birthDate: (jahr - 10) + '-06-01' },
    { id: 'k3', name: 'Kind Drei', yearOfBirthIfTheExactDayIs: String(jahr - 30) },
  ];
  const kinder = [{ person: { ref: 'k1' } }, { person: { ref: 'k2' } }, { person: { ref: 'k3' } }];
  const V = await kern(IDENTITAET, menschen, kinder);
  const mit = (await antwort(V, anfrage(ALLE_KENNUNGEN.concat(['people.childrenAndDependants']), FORMAT))).zieldatei.inhalt;
  assert.equal(element(mit, 'anzahlKinderVolljaehrig'), '2');
  assert.equal(element(mit, 'anzahlKinderMinderjaehrig'), '1');
  assert.match(mit, / stichtagKinderzahl="\d{4}-\d{2}-\d{2}"/);
  assert.doesNotMatch(mit, new RegExp('Kind (Eins|Zwei|Drei)|' + (jahr - 40) + '-01-15|' + (jahr - 10) + '-06-01'), 'kein Name, kein Geburtsdatum eines Kindes');
  const ohne = (await antwort(V, anfrage(ALLE_KENNUNGEN, FORMAT))).zieldatei.inhalt;
  assert.equal(element(ohne, 'anzahlKinderVolljaehrig'), null, 'ohne Anfrage der Kinderliste keine Zahl');
  assert.doesNotMatch(ohne, /stichtagKinderzahl/);
  const unklar = await kern(IDENTITAET, menschen.concat([{ id: 'k4', name: 'Kind Vier', yearOfBirthIfTheExactDayIs: String(jahr - 18) }]),
    kinder.concat([{ person: { ref: 'k4' } }]));
  const teil = (await antwort(unklar, anfrage(ALLE_KENNUNGEN.concat(['people.childrenAndDependants']), FORMAT))).zieldatei.inhalt;
  assert.equal(element(teil, 'anzahlKinderVolljaehrig'), null, 'ein nicht zuzuordnendes Kind: keine halbe Zählung');
  assert.equal(element(teil, 'anzahlKinderMinderjaehrig'), null);
});

test('[Sterbefall·Deckel] die Liste der eingebauten Antwort-Kanäle hat genau diesen einen Eintrag mit Marke', () => {
  const { V } = ladeKern();
  const liste = V.ANTWORT_ZIELDATEI_KANAELE;
  assert.ok(Object.isFrozen(liste), 'die Liste ist eingefroren');
  assert.ok(liste.length <= DECKEL_KANAELE, 'Deckel ' + DECKEL_KANAELE + ': ' + liste.map((k) => k.id).join(', '));
  assert.deepEqual(liste.map((k) => k.id), [FORMAT]);
  for (const k of liste) assert.equal(k.antwortZieldatei, true, k.id + ' trägt die Marke');
});

test('[Sterbefall·Pinnung] die Nachrichten der Portale sind mit Adresse und Prüfsumme gepinnt und in der Registerzeile genannt', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', 'standards-artefakte.json'), 'utf8'));
  const text = JSON.stringify(manifest);
  const id = 'xoev-xpersonenstand-26.11-xpersonenstand-nachrichten-portale';
  assert.ok(text.includes('"' + id + '"'), 'Manifest nennt ' + id);
  const eintraege = Array.isArray(manifest) ? manifest : (manifest.artefakte || manifest.eintraege || Object.values(manifest).find(Array.isArray) || []);
  const e = eintraege.find((x) => x && x.id === id);
  assert.ok(e, 'Manifest-Eintrag ' + id);
  assert.match(JSON.stringify(e), /[0-9a-f]{64}/, 'mit sha256');
  assert.match(JSON.stringify(e), /https:\/\//, 'mit Adresse');
  const register = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', 'standards-register', 'xml-xsd.json'), 'utf8'));
  assert.ok(JSON.stringify(register).includes('"' + id + '"'), 'die Registerzeile nennt das Artefakt');
});

/* Wächter zur Wahl ohneWahrheitsFilter (U2-ADR-030, Nachtrag 20.11.2026). Die Wahl ist ein gewöhnlicher Optionsschlüssel.
   Ein Aufrufer, der Optionen durchreicht, darf damit kein Selbstauskunft-Credential vom Filter befreien. Darum steht sie im
   Kern an genau diesen Stellen: gelesen in baueAusMapping, auf true gesetzt nur am Sterbefall-Kanal, ausdrücklich false in den
   drei Selbstauskunft-Erzeugern. Eine weitere Stelle ist rot, bis sie hier eingetragen und begründet ist. */
const WAHL_STELLEN = Object.freeze({
  baueAusMapping: 'lesen', sdJwtVcIdentitaet: 'false', sdJwtVcFinanzen: 'false', sdJwtVcSozialversicherung: 'false',
  xpsSterbefallVerstorbenerXml: 'true',
});
function wahlStellen(kernText) {
  const funde = [];
  const re = /ohneWahrheitsFilter(\s*:\s*(true|false)|\s*===\s*true)/g;
  let m;
  while ((m = re.exec(kernText))) {
    const vorher = kernText.slice(0, m.index);
    const kopf = Math.max(vorher.lastIndexOf('\nfunction '), vorher.lastIndexOf('\nasync function '));
    const f = /^\n(?:async )?function ([A-Za-z_$][\w$]*)\(/.exec(vorher.slice(kopf));
    funde.push({ funktion: f ? f[1] : '?', art: m[2] || 'lesen' });
  }
  const roh = (kernText.match(/ohneWahrheitsFilter/g) || []).length;
  return { funde, roh };
}
function wahlBefunde(kernText) {
  const { funde, roh } = wahlStellen(kernText);
  const befunde = [];
  if (roh !== funde.length) befunde.push('ohneWahrheitsFilter steht ' + roh + '×, davon ' + funde.length + '× in erkannter Form');
  const gesehen = {};
  for (const f of funde) {
    if (WAHL_STELLEN[f.funktion] !== f.art) befunde.push(f.funktion + ': ' + f.art + ' (erwartet ' + (WAHL_STELLEN[f.funktion] || 'keine Stelle') + ')');
    gesehen[f.funktion] = (gesehen[f.funktion] || 0) + 1;
  }
  for (const name of Object.keys(WAHL_STELLEN)) if (gesehen[name] !== 1) befunde.push(name + ': ' + (gesehen[name] || 0) + '× statt 1×');
  return befunde;
}
const KERN_TEXT = () => fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');

test('[Sterbefall·Wahl·Wächter] ohneWahrheitsFilter steht im Kern genau an den benannten Stellen', () => {
  assert.deepEqual(wahlBefunde(KERN_TEXT()), []);
});

test('[Sterbefall·Wahl·Wächter·Rot-Beweis] eine dritte Stelle mit true ist rot, ebenso ein Erzeuger ohne die ausdrückliche Wahl', () => {
  const kern = KERN_TEXT();
  const anker = 'function sdJwtVcFinanzen(optionen) {';
  assert.ok(kern.includes(anker));
  const mitDritter = kern.replace('function sdJwtVcFinanzen(optionen) {\n', 'function _durchreicher(o) { return baueAusMapping(\'finance\', [], Object.assign({}, o, { ohneWahrheitsFilter: true })); }\nfunction sdJwtVcFinanzen(optionen) {\n');
  assert.ok(wahlBefunde(mitDritter).some((b) => b.startsWith('_durchreicher: true')), wahlBefunde(mitDritter).join(' | '));
  const ohneWahl = kern.replace("Object.assign({}, optionen || {}, { ohneWahrheitsFilter: false }));   // Selbstauskunft, s. sdJwtVcIdentitaet", 'optionen);');
  assert.notEqual(ohneWahl, kern, 'Vorbedingung: die Wahl in sdJwtVcFinanzen gefunden');
  assert.ok(wahlBefunde(ohneWahl).some((b) => b.startsWith('sdJwtVcFinanzen: 0×')), wahlBefunde(ohneWahl).join(' | '));
});

test('[Sterbefall·Wahl] die drei Selbstauskunft-Erzeuger filtern weiter, auch wenn ein Aufrufer ohneWahrheitsFilter durchreicht', async () => {
  const faelle = [
    { erzeuger: 'sdJwtVcIdentitaet', sektor: 'identity', feld: 'familyName', ziel: 'family_name', wert: 'Beispiel' },
    { erzeuger: 'sdJwtVcFinanzen', sektor: 'finance', feld: 'privatePensionProvision', ziel: 'pension_provider', wert: 'Vorsorgekasse Beispiel' },
    { erzeuger: 'sdJwtVcSozialversicherung', sektor: 'socialInsurance', feld: 'longTermCareFund', ziel: 'care_insurance_fund', wert: 'Pflegekasse Beispiel' },
  ];
  for (const f of faelle) {
    const V = await kern(IDENTITAET);
    const d = V.getData();
    d.sektoren[f.sektor] = Object.assign({}, d.sektoren[f.sektor], { [f.feld]: f.wert });
    V.setData(d);
    const opt = { sensibel: true, ohneWahrheitsFilter: true };
    // Rot-Beweis: ohne Nachweis-Stempel steht der Wert im Credential; die Probe sähe ein Fehlen also.
    assert.ok(f.ziel in V[f.erzeuger](opt).claims, f.erzeuger + ': Vorbedingung, der Wert geht ohne Stempel hinaus');
    V.urheberschaftAnhaengen(f.sektor, f.feld, { verifiziert: true });
    assert.equal(f.ziel in V[f.erzeuger](opt).claims, false, f.erzeuger + ': verifiziert-stämmig bleibt draußen, trotz durchgereichter Wahl');
  }
});
