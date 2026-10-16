#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   x509-limbo-umfang-erzeugen.js — Umfang der x509-limbo-Probe, aus den Metadaten, VOR jedem Lauf des Lesers (15.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   WARUM. Der X.509-Leser des Kerns (Spanne X509-LESER in vivodepot.html) ist selbst gebaut. Die Entscheidung dafür trägt nur
   mit Fremdvektoren: x509-limbo (C2SP, Apache-2.0). Schwelle und Umfang sind VOR dem Lauf festgelegt: ein angenommener
   FAILURE-Fall im Umfang ist sofort ein Befund; mehr als drei abgewiesene SUCCESS-Fälle im Umfang heißen Umkehr zu pkijs.
   Dieses Werkzeug teilt JEDEN Fall ein — mit openssl, nie mit dem zu prüfenden Leser — und schreibt eine kleine, gepinnte
   Auswahl nach tests/konformitaet/vectors/x509-limbo/. Gefahren wird sie von tests/x509-limbo.test.js.

   UMFANG (alle Bedingungen; die Regel steht im RbB vom 15.10.2026):
     1. Gruppe ∈ {rfc5280, webpki, pathlen, pathological, cve, invalid}
     2. validation_kind SERVER
     3. jedes Zertifikat EC P-256/P-384/P-521, signiert mit ecdsa-with-SHA256/384/512 (gemessen mit openssl)
     4. kein Merkmal has-crl, has-mldsa, name-constraint-dn, has-policy-constraints, rfc5280-incompatible-with-webpki
     5. höchstens drei Zwischenzertifikate im Angebot
     6. der verlangte Name ist ein DNS-Name ohne Platzhalter; bei SUCCESS steht er zeichengleich als dNSName im Blatt
     dazu: keine max_chain_depth als Parameter; bei fehlender validation_time gilt ZEIT_ERSATZ, und jedes Zertifikat muss
     dann gültig sein.
   PRODUKTREGEL (außerhalb, aber jeder solche Fall MUSS abgewiesen werden — die Probe fällt sonst), am Blatt oder an einem
     Anker (beide liest der Leser sicher): nameConstraints, policyConstraints/policyMappings/inhibitAnyPolicy/kritische
     certificatePolicies, jede unbekannte kritische Erweiterung, kein X.509 v3; am Blatt: keyUsage fehlt bzw. ohne
     digitalSignature und nonRepudiation, eine EKU ohne erlaubte OID, eine kritische EKU, eine Seriennummer über 20 Oktette (auch
     am Anker); an JEDEM Anker: kein CA:TRUE bzw. keyCertSign, ein leerer Inhaber-Name, irgendeine EKU (anker-eku, vorläufig). Dieselben Funde an einem Zwischenzertifikat sind nur ein Grund „außerhalb".
   Die Pflicht-certificatePolicies am Blatt (_x509StellePruefen) gehört nicht hierher: limbo misst die Pfadprüfung
     _x509KettePruefen; limbo-Blätter tragen keine Richtlinie.
   EKU-ABHÄNGIG (im Umfang, markiert): das Blatt oder eine CA trägt eine EKU, oder der Fall verlangt eine, oder er trägt das
     Merkmal pedantic-webpki-eku. Der Leser prüft die EKU nur am Blatt gegen die erlaubte Menge (vorläufig, Entscheidung offen).

   ABRUF (nicht im Werkzeug; das Werkzeug lädt nichts):
     curl -fsSL -o limbo.json https://raw.githubusercontent.com/C2SP/x509-limbo/554528a9b0c0d95e071f55de018326f0b65a8364/limbo.json
     shasum -a 256 limbo.json   →  611e337b9fb477b927bae65434650692cb9d2070ff5b05f975d0403510acd4de
     curl -fsSL -o LICENSE https://raw.githubusercontent.com/C2SP/x509-limbo/554528a9b0c0d95e071f55de018326f0b65a8364/LICENSE

   Aufruf: node tools/x509-limbo-umfang-erzeugen.js --limbo <limbo.json> [--lizenz <LICENSE>] [--openssl <pfad>] [--ausgabe <ordner>]
           Vorgabe Ausgabe: tests/konformitaet/vectors/x509-limbo/   Vorgabe openssl: $OPENSSL, sonst `openssl` im PATH
   Die Ausgabe ist eingefroren (Datenstand am Commit oben); ein zweiter Lauf mit derselben Eingabe ergibt dieselben Bytes.
   Probe: tests/x509-limbo.test.js (pinnt Zahlen und sha256 der Ausgabe).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const LIMBO_COMMIT = '554528a9b0c0d95e071f55de018326f0b65a8364';
const LIMBO_SHA256 = '611e337b9fb477b927bae65434650692cb9d2070ff5b05f975d0403510acd4de';
const ZEIT_ERSATZ = '2026-10-15T00:00:00Z';   // für Fälle ohne validation_time („jetzt"), fest, damit der Lauf wiederholbar ist
const GRUPPEN_IM_UMFANG = new Set(['rfc5280', 'webpki', 'pathlen', 'pathological', 'cve', 'invalid']);
const MERKMALE_AUSSERHALB = new Set(['has-crl', 'has-mldsa', 'name-constraint-dn', 'has-policy-constraints', 'rfc5280-incompatible-with-webpki']);
const KURVEN = { prime256v1: 'P-256', secp384r1: 'P-384', secp521r1: 'P-521' };
const SIGNATUREN = new Set(['ecdsa-with-SHA256', 'ecdsa-with-SHA384', 'ecdsa-with-SHA512']);
// Die Erweiterungen, die der Leser versteht (Namen, wie openssl sie druckt).
const BEKANNT = new Set(['X509v3 Basic Constraints', 'X509v3 Key Usage', 'X509v3 Subject Alternative Name', 'X509v3 Extended Key Usage']);
const RICHTLINIE = new Set(['X509v3 Policy Constraints', 'X509v3 Policy Mappings', 'X509v3 Inhibit Any Policy']);
/* Die erlaubten EKU-Zwecke kommen aus dem Kern selbst (_X509_EKU_ERLAUBT, eine Zeile), nicht aus einer zweiten Liste hier;
   übersetzt in den Text, den openssl druckt (eine OID ohne Namen druckt openssl als OID). */
const OPENSSL_EKU_NAME = Object.freeze({
  '1.3.6.1.5.5.7.3.1': 'TLS Web Server Authentication', '1.3.6.1.5.5.7.3.2': 'TLS Web Client Authentication', '2.5.29.37.0': 'Any Extended Key Usage',
});
function ekuAusKern(kernPfad = path.join(REPO, 'vivodepot.html')) {
  const m = /^const _X509_EKU_ERLAUBT = Object\.freeze\(\[([^\]]*)\]\);/m.exec(fs.readFileSync(kernPfad, 'utf8'));
  if (!m) throw new Error('_X509_EKU_ERLAUBT nicht im Kern gefunden');
  return [...m[1].matchAll(/'([0-9.]+)'/g)].map((x) => OPENSSL_EKU_NAME[x[1]] || x[1]);
}
const EKU_AUS_KERN = new Set(ekuAusKern());
const GROESSE_GRENZE = 5 * 1024 * 1024;
const STICHPROBE = 50;

function argumente(argv) {
  const a = { limbo: null, lizenz: null, openssl: process.env.OPENSSL || 'openssl', ausgabe: path.join(REPO, 'tests', 'konformitaet', 'vectors', 'x509-limbo') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limbo') a.limbo = argv[++i];
    else if (argv[i] === '--lizenz') a.lizenz = argv[++i];
    else if (argv[i] === '--openssl') a.openssl = argv[++i];
    else if (argv[i] === '--ausgabe') a.ausgabe = path.resolve(argv[++i]);
    else throw new Error('unbekanntes Argument: ' + argv[i]);
  }
  if (!a.limbo) throw new Error('--limbo <pfad zu limbo.json> fehlt (Abrufweg im Kopf dieses Werkzeugs)');
  return a;
}

const pemZuDer = (pem) => Buffer.from(String(pem).replace(/-----[A-Z0-9 ]+-----/g, '').replace(/\s+/g, ''), 'base64');
const zertId = (der) => crypto.createHash('sha256').update(der).digest('hex').slice(0, 20);

/* openssl-Text eines Zertifikats → die Merkmale, die die Einteilung braucht. */
function textLesen(text) {
  const i = { lesbar: true, version: null, schluessel: null, kurve: null, signatur: null, nichtVor: null, nichtNach: null, erw: {} };
  const v = /Version: (\d+)/.exec(text); i.version = v ? Number(v[1]) : null;
  const s = /Signature Algorithm: (\S+)/.exec(text); i.signatur = s ? s[1] : null;
  const k = /Public Key Algorithm: (\S+)/.exec(text); i.schluessel = k ? k[1] : null;
  const c = /ASN1 OID: (\S+)/.exec(text); i.kurve = c ? (KURVEN[c[1]] || c[1]) : null;
  const nv = /Not Before: (.+)/.exec(text), nn = /Not After : (.+)/.exec(text);
  i.nichtVor = nv ? Date.parse(nv[1].trim()) : null; i.nichtNach = nn ? Date.parse(nn[1].trim()) : null;
  const zeilen = text.split('\n');
  let im = false, akt = null;
  for (const z of zeilen) {
    if (/^ {8}X509v3 extensions:/.test(z)) { im = true; continue; }
    if (!im) continue;
    if (/^ {0,8}\S/.test(z)) { im = false; akt = null; continue; }
    const kopf = /^ {12}(\S.*?):\s*(critical)?\s*$/.exec(z);
    if (kopf) { akt = kopf[1]; i.erw[akt] = { kritisch: !!kopf[2], wert: '' }; continue; }
    if (akt && /^ {16}/.test(z)) i.erw[akt].wert += (i.erw[akt].wert ? '\n' : '') + z.trim();
  }
  const ku = i.erw['X509v3 Key Usage'];
  i.ku = ku ? ku.wert.split(/,\s*/).map((t) => t.trim()) : null;
  const eku = i.erw['X509v3 Extended Key Usage'];
  i.eku = eku ? eku.wert.split(/,\s*/).map((t) => t.trim()) : null;
  i.inhaberLeer = /^ {8}Subject:\s*$/m.test(text);
  // Seriennummer in Oktetten ohne Vorzeichen-Nullbyte: openssl druckt kleine Zahlen als „N (0x…)", große als Hex-Bytes.
  const sn = /Serial Number:\s*([^\n]*)\n((?: {12}[0-9a-f:]+\n)*)/.exec(text);
  if (sn) {
    const klein = /^(\d+) \(0x([0-9a-f]+)\)/.exec(sn[1].trim());
    const bytes = klein ? Math.ceil(klein[2].length / 2) : (sn[1].trim() + sn[2]).replace(/\s+/g, '').split(':').filter(Boolean);
    const n = Array.isArray(bytes) ? bytes.length - (bytes.length > 1 && bytes[0] === '00' ? 1 : 0) : bytes;
    i.seriennummerOktette = n;
  }
  const bc = i.erw['X509v3 Basic Constraints'];
  i.ca = !!(bc && /CA:TRUE/.test(bc.wert));
  const san = i.erw['X509v3 Subject Alternative Name'];
  i.dns = san ? [...san.wert.matchAll(/DNS:([^,\s]*)/g)].map((m) => m[1]) : [];
  return i;
}

function ossl(bin, args, input) {
  return spawnSync(bin, args, { input, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
}
/* Alle Zertifikate einmal durch openssl: stapelweise (crl2pkcs7 | pkcs7 -print_certs -text), bei einem Fehler im Stapel
   einzeln (x509 -text). Was openssl nicht liest, ist { lesbar: false }. */
function alleLesen(openssl, ders) {
  const info = new Map();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'x509-limbo-umfang-'));
  try {
    const liste = [...ders.entries()];
    const einzeln = (id, der) => {
      const f = path.join(tmp, 'e.der');
      fs.writeFileSync(f, der);
      const r = ossl(openssl, ['x509', '-inform', 'DER', '-in', f, '-noout', '-text']);
      info.set(id, r.status === 0 ? textLesen(r.stdout) : { lesbar: false, erw: {} });
    };
    for (let a = 0; a < liste.length; a += 200) {
      const stapel = liste.slice(a, a + 200);
      const pem = stapel.map(([, der]) => '-----BEGIN CERTIFICATE-----\n' + der.toString('base64').replace(/(.{64})/g, '$1\n').replace(/\n?$/, '\n') + '-----END CERTIFICATE-----\n').join('');
      const f = path.join(tmp, 'stapel.pem');
      fs.writeFileSync(f, pem);
      const p7 = ossl(openssl, ['crl2pkcs7', '-nocrl', '-certfile', f]);
      const txt = p7.status === 0 ? ossl(openssl, ['pkcs7', '-print_certs', '-text', '-noout'], p7.stdout) : null;
      const teile = txt && txt.status === 0 ? txt.stdout.split(/^Certificate:$/m).slice(1) : [];
      if (teile.length === stapel.length) stapel.forEach(([id], k) => info.set(id, textLesen(teile[k])));
      else for (const [id, der] of stapel) einzeln(id, der);
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return info;
}

/* Ein Fall → { art: 'im-umfang' | 'ausserhalb', gruende, produktregel, ekuAbhaengig, ec }. */
function einteilen(t, info, ids) {
  const gruende = [], regel = [];
  const gruppe = t.id.split('::')[0];
  const alle = [...ids.anker, ...ids.zwischen, ids.blatt].map((id) => info.get(id));
  const blatt = info.get(ids.blatt);
  const cas = [...ids.anker, ...ids.zwischen].map((id) => info.get(id));
  if (!GRUPPEN_IM_UMFANG.has(gruppe)) gruende.push('Gruppe ' + gruppe + ' außerhalb');
  if (t.validation_kind !== 'SERVER') gruende.push('validation_kind ' + t.validation_kind);
  const ec = alle.every((z) => z.lesbar && z.schluessel === 'id-ecPublicKey' && ['P-256', 'P-384', 'P-521'].includes(z.kurve));
  const sig = alle.every((z) => z.lesbar && SIGNATUREN.has(z.signatur));
  if (alle.some((z) => !z.lesbar)) gruende.push('openssl liest ein Zertifikat nicht');
  else {
    if (!ec) gruende.push('Schlüsselart außerhalb (' + [...new Set(alle.map((z) => z.schluessel + (z.kurve ? '/' + z.kurve : '')))].join(', ') + ')');
    if (!sig) gruende.push('Signaturart außerhalb (' + [...new Set(alle.map((z) => z.signatur))].join(', ') + ')');
  }
  for (const m of t.features || []) if (MERKMALE_AUSSERHALB.has(m)) gruende.push('Merkmal ' + m);
  if (t.untrusted_intermediates.length > 3) gruende.push('mehr als drei Zwischenzertifikate (' + t.untrusted_intermediates.length + ')');
  const pn = t.expected_peer_name;
  if (!pn || pn.kind !== 'DNS') gruende.push('verlangter Name kein DNS-Name (' + (pn ? pn.kind : 'keiner') + ')');
  else if (pn.value.includes('*')) gruende.push('verlangter Name mit Platzhalter');
  else if (t.expected_result === 'SUCCESS' && blatt.lesbar && !blatt.dns.includes(pn.value)) gruende.push('verlangter Name steht nicht zeichengleich im SAN (Platzhalter oder Schreibung)');
  if (t.max_chain_depth !== null && t.max_chain_depth !== undefined) gruende.push('max_chain_depth ' + t.max_chain_depth + ' als Parameter');
  if (t.key_usage && t.key_usage.length) gruende.push('verlangter keyUsage als Parameter');
  if (!t.validation_time) {
    const ms = Date.parse(ZEIT_ERSATZ);
    if (alle.some((z) => z.lesbar && (!(z.nichtVor <= ms) || !(ms <= z.nichtNach)))) gruende.push('ohne validation_time, Ersatzzeit außerhalb der Gültigkeit');
  }
  /* Produktregeln: der Leser weist ab, und das muss er auch. Durchgesetzt (Probe fällt, wenn angenommen) nur, wo der Leser das
     Zertifikat SICHER liest: das Blatt und jeden Anker (er liest alle Anker vorab). Ein Zwischenzertifikat aus dem Vorrat liest
     er nur, wenn es in x5c steht — dort ist der Fund ein Grund „außerhalb", aber keine durchgesetzte Regel. */
  const leseRegel = (z) => {
    const r = [];
    if (!z.lesbar) return r;
    if (z.version !== 3) r.push('kein X.509 v3');
    if (z.erw['X509v3 Extended Key Usage'] && z.erw['X509v3 Extended Key Usage'].kritisch) r.push('EKU kritisch');
    if (z.seriennummerOktette > 20) r.push('Seriennummer über 20 Oktette');
    for (const [n, e] of Object.entries(z.erw)) {
      if (n === 'X509v3 Name Constraints') r.push('nameConstraints nicht prüfbar');
      else if (RICHTLINIE.has(n) || (n === 'X509v3 Certificate Policies' && e.kritisch)) r.push('Richtlinie nicht prüfbar');
      else if (e.kritisch && !BEKANNT.has(n)) r.push('unbekannte kritische Erweiterung (' + n + ')');
    }
    return r;
  };
  for (const z of [blatt, ...ids.anker.map((id) => info.get(id))]) regel.push(...leseRegel(z));
  for (const id of ids.zwischen) for (const r of leseRegel(info.get(id))) gruende.push('Zwischenzertifikat: ' + r);
  if (blatt.lesbar) {
    if (!blatt.ku) regel.push('Blatt ohne keyUsage');
    else if (!blatt.ku.includes('Digital Signature') && !blatt.ku.includes('Non Repudiation')) regel.push('Blatt-keyUsage ohne digitalSignature/nonRepudiation');
    if (blatt.eku && !blatt.eku.some((o) => EKU_AUS_KERN.has(o))) regel.push('Blatt-EKU ohne erlaubte OID');
  }
  /* Regeln für jedes ausstellende Zertifikat: CA:TRUE und keyCertSign, Inhaber nicht leer, eine EKU nur aus der erlaubten Menge.
     Durchgesetzt, wenn JEDER Anker sie verletzt (jede tragende Kette endet an einem Anker); an einem Zwischenzertifikat aus dem
     Vorrat nur ein Grund „außerhalb". */
  const caRegeln = [
    ['CA ohne CA:TRUE oder keyCertSign', (z) => !z.ca || !z.ku || !z.ku.includes('Certificate Sign'), true],
    ['CA mit leerem Inhaber-Namen', (z) => z.inhaberLeer, true],
    ['CA-EKU ohne erlaubte OID', (z) => !!z.eku && !z.eku.some((o) => EKU_AUS_KERN.has(o)), false],
    // Anker mit irgendeiner EKU: vorläufig abgewiesen (anker-eku), Lesung offen 15.10.
    ['Anker mit EKU', (z) => !!z.eku, 'nurAnker'],
  ];
  const anker = ids.anker.map((id) => info.get(id));
  const zwischen = ids.zwischen.map((id) => info.get(id));
  for (const [name, verletzt, gilt] of caRegeln) {
    const v = (z) => z.lesbar && verletzt(z);
    const ankerGilt = gilt === true || gilt === 'nurAnker';
    if (ankerGilt && anker.length && anker.every(v)) regel.push(name);
    else if ((ankerGilt && anker.some(v)) || (gilt !== 'nurAnker' && zwischen.some(v))) gruende.push('im Angebot: ' + name);
  }
  const produktregel = [...new Set(regel)];
  const ekuAbhaengig = !!((blatt.lesbar && blatt.eku) || cas.some((z) => z.lesbar && z.eku) || (t.extended_key_usage && t.extended_key_usage.length)
    || (t.features || []).includes('pedantic-webpki-eku'));
  const alleGruende = [...new Set(gruende), ...produktregel.map((r) => 'Produktregel: ' + r)];
  return { art: alleGruende.length ? 'ausserhalb' : 'im-umfang', gruende: alleGruende, produktregel: produktregel.length > 0, ekuAbhaengig, ec: ec && sig };
}

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
function jsonSchreiben(datei, wert) {
  const text = JSON.stringify(wert, null, 1) + '\n';
  fs.writeFileSync(datei, text);
  return { datei: path.basename(datei), bytes: Buffer.byteLength(text), sha256: sha(text) };
}

/* Die nur gelisteten Fälle knapp: je Zeile [id, erwartet, Grund-Nummer], die Gründe einmal oben. */
function listeSchreiben(datei, kopf, liste) {
  const gruende = [...new Set(liste.map((z) => z.gelistet))];
  const zeilen = liste.map((z) => JSON.stringify([z.t.id, z.t.expected_result, gruende.indexOf(z.gelistet)]));
  const text = '{\n' + Object.entries(Object.assign({}, kopf, {
    hinweis: 'Daten nicht übernommen: mit ihnen läge die Auswahl über 5 MB. Je Zeile [id, erwartet, Nummer des Grunds]; der Grund sagt, warum der Leser den Fall abweist.',
    gruende,
  })).map(([k, v]) => ' ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',\n').join('') + ' "faelle": [\n' + zeilen.join(',\n') + '\n ]\n}\n';
  fs.writeFileSync(datei, text);
  return { datei: path.basename(datei), bytes: Buffer.byteLength(text), sha256: sha(text) };
}

function main() {
  const a = argumente(process.argv.slice(2));
  const roh = fs.readFileSync(a.limbo);
  const s = sha(roh);
  if (s !== LIMBO_SHA256) throw new Error('limbo.json hat sha256 ' + s + ', gepinnt ist ' + LIMBO_SHA256 + ' (Commit ' + LIMBO_COMMIT + ')');
  const limbo = JSON.parse(roh.toString('utf8'));
  const ders = new Map();
  const merke = (pem) => { const d = pemZuDer(pem); const id = zertId(d); ders.set(id, d); return id; };
  const faelle = limbo.testcases.map((t) => ({ t, ids: { anker: t.trusted_certs.map(merke), zwischen: t.untrusted_intermediates.map(merke), blatt: merke(t.peer_certificate) } }));
  const version = ossl(a.openssl, ['version']).stdout.trim();
  const info = alleLesen(a.openssl, ders);

  const zeilen = faelle.map(({ t, ids }) => ({ t, ids, e: einteilen(t, info, ids) }));
  const fall = ({ t, ids, e }, mitDaten) => Object.assign({
    id: t.id, gruppe: t.id.split('::')[0], erwartet: t.expected_result, art: e.art, gruende: e.gruende, produktregel: e.produktregel,
    ekuAbhaengig: e.ekuAbhaengig,
  }, mitDaten ? {
    zeit: t.validation_time || ZEIT_ERSATZ, zeitErsatz: !t.validation_time, name: t.expected_peer_name ? t.expected_peer_name.value : null,
    namensArt: t.expected_peer_name ? t.expected_peer_name.kind : null, anker: ids.anker, zwischen: ids.zwischen, blatt: ids.blatt,
  } : {});
  const zertTabelle = (liste) => {
    const tab = {};
    for (const z of liste) for (const id of [...z.ids.anker, ...z.ids.zwischen, z.ids.blatt]) tab[id] = ders.get(id).toString('base64');
    return Object.fromEntries(Object.entries(tab).sort(([x], [y]) => (x < y ? -1 : 1)));
  };
  const imUmfang = zeilen.filter((z) => z.e.art === 'im-umfang');
  let ausserhalbMitDaten = zeilen.filter((z) => z.e.art === 'ausserhalb');
  let nurGelistet = [];
  const groesse = (liste) => Buffer.byteLength(JSON.stringify(zertTabelle(liste))) + liste.length * 400;
  if (groesse(ausserhalbMitDaten) > GROESSE_GRENZE) {
    // Zu groß, Stufe 1 (Auftrag): bettertls-Fälle mit einem Zertifikat außerhalb EC P-256/384/521 nur listen.
    for (const z of ausserhalbMitDaten) if (!z.e.ec && z.t.id.startsWith('bettertls::')) { z.gelistet = 'Schlüsselart außerhalb, Leser weist ab'; nurGelistet.push(z); }
    ausserhalbMitDaten = ausserhalbMitDaten.filter((z) => !z.gelistet);
  }
  if (groesse(ausserhalbMitDaten) > GROESSE_GRENZE) {
    /* Stufe 2 (gemessen 15.10.2026: bettertls ist fast ganz EC, nach Stufe 1 blieben ~29 MB, und keiner der Anker trägt
       nameConstraints — sie stehen in den Zwischenzertifikaten): von den bettertls-Fällen mit nameConstraints bleiben die Daten
       nur für jeden STICHPROBE-ten (nach der Reihenfolge in limbo.json); die übrigen werden mit Grund gelistet. Der Leser weist
       jedes Zertifikat mit nameConstraints beim Lesen ab (nicht-pruefbar; eigene Probe in tests/x509-leser.test.js). */
    let k = 0;
    for (const z of ausserhalbMitDaten) {
      if (!z.t.id.startsWith('bettertls::') || !z.e.gruende.some((g) => /nameConstraints nicht prüfbar/.test(g))) continue;
      if (k++ % STICHPROBE !== 0) { z.gelistet = 'nameConstraints in einem Zertifikat (der Leser weist es beim Lesen ab); Daten nur als Stichprobe jedes ' + STICHPROBE + '. Falls'; nurGelistet.push(z); }
    }
    ausserhalbMitDaten = ausserhalbMitDaten.filter((z) => !z.gelistet);
  }
  fs.mkdirSync(a.ausgabe, { recursive: true });
  const kopf = { quelle: 'https://github.com/C2SP/x509-limbo', commit: LIMBO_COMMIT, limboSha256: LIMBO_SHA256, lizenz: 'Apache-2.0', openssl: version, zeitErsatz: ZEIT_ERSATZ };
  const dateien = [
    jsonSchreiben(path.join(a.ausgabe, 'umfang.json'), Object.assign({}, kopf, { zertifikate: zertTabelle(imUmfang), faelle: imUmfang.map((z) => fall(z, true)) })),
    jsonSchreiben(path.join(a.ausgabe, 'ausserhalb.json'), Object.assign({}, kopf, { zertifikate: zertTabelle(ausserhalbMitDaten), faelle: ausserhalbMitDaten.map((z) => fall(z, true)) })),
    listeSchreiben(path.join(a.ausgabe, 'nur-gelistet.json'), kopf, nurGelistet),
  ];
  if (a.lizenz) {
    const lz = fs.readFileSync(a.lizenz);
    fs.writeFileSync(path.join(a.ausgabe, 'LICENSE'), lz);
    dateien.push({ datei: 'LICENSE', bytes: lz.length, sha256: sha(lz) });
  }
  // Zählung je Gruppe für den Bericht und die README.
  const zaehl = {};
  for (const z of zeilen) {
    const g = z.t.id.split('::')[0];
    const r = zaehl[g] = zaehl[g] || { gesamt: 0, imUmfangSuccess: 0, imUmfangFailure: 0, ekuAbhaengigImUmfang: 0, ausserhalbSuccess: 0, ausserhalbFailure: 0, produktregel: 0, nurGelistet: 0 };
    r.gesamt++;
    if (z.e.art === 'im-umfang') { r[z.t.expected_result === 'SUCCESS' ? 'imUmfangSuccess' : 'imUmfangFailure']++; if (z.e.ekuAbhaengig) r.ekuAbhaengigImUmfang++; }
    else r[z.t.expected_result === 'SUCCESS' ? 'ausserhalbSuccess' : 'ausserhalbFailure']++;
    if (z.e.produktregel) r.produktregel++;
    if (nurGelistet.includes(z)) r.nurGelistet++;
  }
  const bericht = { kopf, faelle: zeilen.length, zertifikate: ders.size, unlesbar: [...info.values()].filter((i) => !i.lesbar).length, gruppen: zaehl, dateien };
  process.stdout.write(JSON.stringify(bericht, null, 1) + '\n');
}

if (require.main === module) main();
module.exports = { textLesen, einteilen, LIMBO_COMMIT, LIMBO_SHA256, ZEIT_ERSATZ };
