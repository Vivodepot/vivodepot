'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A-Zug 2 — Verhaltens-Probe: Öffnen ohne das echte Passwort scheitert
   (U2-ADR-097 §3, „Ohne das Passwort der Person gibt es keinen Zugang —
   auch nicht für Vivodepot selbst")
   ────────────────────────────────────────────────────────────────────────────
   Auftrag Drei_Fehlende_Waechter_2026-08-06.md, Teil A, A-Zug 2: Depot
   anlegen, Passwort verwerfen, dann mit dem VOLLSTÄNDIGEN Anwendungszustand
   (echte WebCrypto, jede aus dem Kern erreichbare Funktion) versuchen, es zu
   öffnen. Muss scheitern — nicht „gibt eine Fehlermeldung", sondern: kein Weg
   liefert Klartext.

   Drei Wege werden geprüft, gegen den ECHTEN, geladenen Kern (kein Mock,
   keine Simulation der Krypto):
     1. VdCrypto.decryptDepot() direkt mit null als Schlüssel.
     2. Der reguläre Ableitungsweg, aber mit leerem Passwort statt dem echten.
     3. deriveDepotKeyV2() direkt aufgerufen, ohne einen echten
        password-abgeleiteten masterHkdfKey — das ist zugleich die Stelle,
        die A-Zug 2 zur Rotmachbarkeit unten mutiert.

   U2-ADR-NNN-Nachtrag (18.09.2026, Kern-Verschluss): lief bis hierher über
   Playwright/Chromium gegen die reale Seite — `data`, `sessionHkdfKey`,
   `sessionKey`, `VdCrypto`, `deriveDepotKeyV2` u. a. sind Krypto-/Zustands-
   Namen, die der Verschluss ABSICHTLICH nicht auf `window.__vdOeffentlich`
   legt (s. Kommentar am Export-Block in vivodepot.html: „ein Prüfer, der
   deriveDepotKeyV2 auf der öffentlichen Fläche findet, liest den Rest des
   Berichts nicht mehr wohlwollend"). Diese Probe läuft darum jetzt über
   `tests/load-kern.js` (`ladeKern()`) — echte Node-WebCrypto (dieselbe
   Web-Crypto-API wie im Browser), derselbe Kern-Quelltext, ohne den Umweg
   über einen echten Browser, den diese eine Frage (liefert ein Ableitungsweg
   Klartext oder nicht) nicht braucht. `ladeKern()` baut bei JEDEM Aufruf eine
   neue `new Function(...)`-Instanz mit frischen Modul-Bindungen (`sessionHkdfKey`
   etc.) — dieselbe „frische Instanz, kein übrig gebliebener In-Memory-Schlüssel"-
   Eigenschaft, die vorher `page.reload()` trug, hier durch einen zweiten,
   unabhängigen `ladeKern()`-Aufruf statt eines Reloads.

   Programmatischer Aufruf (depotAnlegen()/depotSerialisieren() direkt statt
   über UI-Klicks) — dasselbe Muster wie der Negativ-Gate-Test in
   `tests/konformitaet/offline-garantie.mjs`.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SENTINEL_PW = 'a-zug2-nachweis-pw-2026';

/* Frische, unabhängige Kern-Instanz — `pfad` überschreibt KERN_HTML_PATH nur für
   diesen einen Aufruf (Muster wie tests/docx-streichung-gegenprobe.test.js:
   ladeMit). Ohne `pfad`: die echte, reale vivodepot.html. */
function ladeInstanz(pfad) {
  const zuvor = process.env.KERN_HTML_PATH;
  if (pfad) process.env.KERN_HTML_PATH = pfad; else delete process.env.KERN_HTML_PATH;
  delete require.cache[require.resolve('../load-kern.js')];
  const { V } = require('../load-kern.js').ladeKern();
  if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
  return V;
}

/* Depot mit Passwort anlegen, Umschlag zurückgeben. */
async function depotAnlegenUndSerialisieren(V, pw) {
  await V.depotAnlegen(pw);
  const data = V.getData();
  data.sektoren = data.sektoren || {};
  data.sektoren.identity = { givenName: 'AZug2Nachweis' };
  return V.depotSerialisieren();
}

/* Gegen eine FRISCHE Kern-Instanz (sessionHkdfKey === null): drei Wege, den
   Umschlag OHNE das echte Passwort zu öffnen. */
async function ohneRealPasswortVersuche(V, umschlag) {
  const { VdCrypto, base64ToBytes, deriveMasterBits, importMasterHkdfKey, deriveDepotKeyV2, _AAD_DEPOT_V2 } = V;
  const versuche = [];
  /* A345 (19.08.2026): der Anker schreibt in Feld-Einheiten. Die drei Wege unten
     zielten auf `{iv, ct}` — die es in Generation 4 nicht mehr gibt. Ohne diese
     Umschaltung liefe JEDER Weg ins Leere, AUCH mit eingebauter Hintertür: die Probe
     wäre stumpf geworden und hätte das mit einem grünen Lauf gemeldet.

     `zelle()` liefert darum das Chiffrat, das die Datei tatsächlich trägt — in v4 die
     erste Feld-Einheit, in v3 den einen Umschlag. Die AAD muss dazu passen, sonst
     scheitert der Versuch an ihr statt am Schlüssel, und die Probe prüfte wieder
     etwas anderes als sie soll. */
  const _v4 = !!(umschlag.einheiten && Object.keys(umschlag.einheiten).length > 0);
  const _adr = _v4 ? Object.keys(umschlag.einheiten)[0] : null;
  const zelle = () => (_v4 ? umschlag.einheiten[_adr] : { iv: umschlag.iv, ct: umschlag.ct });
  const aad = () => (_v4 ? VdCrypto.aadEinheit(umschlag.depotUUID, _adr) : _AAD_DEPOT_V2);
  // 1) direkt mit null als Schlüssel
  try {
    const klartext = await VdCrypto.decryptDepot(zelle(), null, aad());
    versuche.push({ name: 'decryptDepot-null-key', ok: true, klartext });
  } catch (e) { versuche.push({ name: 'decryptDepot-null-key', ok: false, fehler: String(e) }); }
  // 2) regulärer Weg, aber mit leerem Passwort statt dem echten
  try {
    const pbkdf2Salt = base64ToBytes(umschlag.pbkdf2.salt);
    const depotSalt = base64ToBytes(umschlag.depotSalt);
    const bits = await deriveMasterBits('', pbkdf2Salt);
    const mk = await importMasterHkdfKey(bits);
    const key = await deriveDepotKeyV2(mk, depotSalt, umschlag.depotUUID);
    const klartext = await VdCrypto.decryptDepot(zelle(), key, aad());
    versuche.push({ name: 'leeres-passwort', ok: true, klartext });
  } catch (e) { versuche.push({ name: 'leeres-passwort', ok: false, fehler: String(e) }); }
  // 3) deriveDepotKeyV2 direkt, ohne echten masterHkdfKey — Rotmach-Sonde greift genau hier
  try {
    const depotSalt = base64ToBytes(umschlag.depotSalt);
    const key = await deriveDepotKeyV2(null, depotSalt, umschlag.depotUUID);
    const klartext = await VdCrypto.decryptDepot(zelle(), key, aad());
    versuche.push({ name: 'direkter-deriveDepotKeyV2-ohne-masterkey', ok: true, klartext });
  } catch (e) { versuche.push({ name: 'direkter-deriveDepotKeyV2-ohne-masterkey', ok: false, fehler: String(e) }); }
  /* 4) DER WEG, DEN GENERATION 4 ERZWINGT — und ohne ihn wäre diese Probe stumpf.
     Seit dem Zerfall öffnet der Anker-Schlüssel eine Einheit NICHT mehr direkt: er
     wickelt nur ihren Inhaltsschlüssel. Ein Angreifer mit einer Hintertür in
     `deriveDepotKeyV2` ginge darum zwei Schritte — erst entwickeln, dann öffnen.
     Genau das tut dieser Versuch. Ohne ihn liefe die Rotmachbarkeit ins Leere und
     meldete das als Erfolg. */
  if (_v4) {
    try {
      const depotSalt = base64ToBytes(umschlag.depotSalt);
      const ankerKey = await deriveDepotKeyV2(null, depotSalt, umschlag.depotUUID);
      /* ALLE Einheiten, nicht nur die erste: die Reihenfolge folgt den Adressen, also
         dem HMAC — welche Einheit welches Feld trägt, ist nicht vorhersagbar. Ein
         Angreifer mit dem Anker-Schlüssel öffnet ohnehin alle; eine Probe, die nur
         die erste nimmt, wäre vom Zufall abhängig. */
      const gelesen = [];
      for (const adr of Object.keys(umschlag.umschlagTabelle[0].umschlaege)) {
        const a = VdCrypto.aadEinheit(umschlag.depotUUID, adr);
        const inhaltKey = await VdCrypto.schluesselEntwickeln(
          umschlag.umschlagTabelle[0].umschlaege[adr], ankerKey, a);
        gelesen.push(await VdCrypto.decryptDepot(umschlag.einheiten[adr], inhaltKey, a));
      }
      /* Zusammengesetzt, nicht als Liste gemeldet: der Nachweis lautet „Klartext des
         DEPOTS", nicht „Klartext irgendeiner Zelle". Der Name reist in der Einheit mit
         — genau darum lässt sich das Depot ohne Katalog wieder zusammensetzen, und
         genau das macht den Fund so schwer wie vor dem Zerfall. */
      const zusammen = { sektoren: {} };
      const felder = [];
      for (const e of gelesen) {
        if (!e || typeof e.name !== 'string') continue;
        if (e.name === 'sektoren') {
          for (const b of (Array.isArray(e.wert) ? e.wert : [])) if (!zusammen.sektoren[b]) zusammen.sektoren[b] = {};
          continue;
        }
        const i = e.name.indexOf('.');
        if (i > 0) { felder.push({ b: e.name.slice(0, i), f: e.name.slice(i + 1), wert: e.wert }); continue; }
        zusammen[e.name] = e.wert;
      }
      for (const e of felder) {
        if (!zusammen.sektoren[e.b]) zusammen.sektoren[e.b] = {};
        zusammen.sektoren[e.b][e.f] = e.wert;
      }
      versuche.push({ name: 'zerfall-entwickeln-dann-oeffnen', ok: true, klartext: zusammen });
    } catch (e) { versuche.push({ name: 'zerfall-entwickeln-dann-oeffnen', ok: false, fehler: String(e) }); }
  }
  /* Zustand nach den Versuchen: kein Session-Schlüssel darf entstanden sein. Ja/Nein über die
     vorhandene Hülle (VdCrypto.sitzungOffen()) statt zweier lesender Getter auf den Schlüssel
     selbst — sessionKey existiert seit der Krypto-Kapselung ohnehin nicht mehr (toter Name,
     ein Aufruf von getSessionKey() würfe ReferenceError), sessionHkdfKey liegt closure-privat
     in VdCrypto. sitzungOffen() deckt beides ab: es ist exakt `!!sessionHkdfKey`, und ein
     zweiter, nicht mehr existierender Name kann nichts zusätzlich absichern. */
  versuche.push({
    name: '__sessionZustand',
    sitzungOffen: VdCrypto.sitzungOffen(),
    dataNull: V.getData() === null,
  });
  return versuche;
}

async function laufGegen(htmlPfad) {
  const V1 = ladeInstanz(htmlPfad);
  const umschlag = await depotAnlegenUndSerialisieren(V1, SENTINEL_PW);
  /* A345 (19.08.2026): der Anker schreibt in Feld-Einheiten; ein einzelnes `ct` gibt es
     nicht mehr. Der Anker dieser Analyse ist unverändert — es MUSS ein Chiffrat
     entstanden sein, sonst prüfen die Versuche darunter gegen nichts. */
  const chiffratDa = !!(umschlag && (umschlag.ct
    || (umschlag.einheiten && Object.keys(umschlag.einheiten).length > 0)));
  assert.ok(chiffratDa, 'depotSerialisieren() lieferte keinen Umschlag — die Analyse ist veraltet');
  const V2 = ladeInstanz(htmlPfad); // frische Instanz, kein Session-Rest
  return ohneRealPasswortVersuche(V2, umschlag);
}

test('[A-Zug2·Anker] echte vivodepot.html: KEIN Weg ohne das echte Passwort liefert Klartext', async () => {
  const versuche = await laufGegen(undefined);
  const zustand = versuche.find(v => v.name === '__sessionZustand');
  const wege = versuche.filter(v => v.name !== '__sessionZustand');
  for (const w of wege) {
    assert.equal(w.ok, false, `Weg „${w.name}" lieferte Klartext OHNE das echte Passwort: ${JSON.stringify(w.klartext)}`);
  }
  assert.ok(zustand, 'kein Zustands-Protokoll zurückgekommen');
  assert.equal(zustand.sitzungOffen, false,
    'nach den gescheiterten Versuchen ist trotzdem eine Sitzung offen (VdCrypto.sitzungOffen())');
});

test('[A-Zug2·Rotmachbarkeit] fest eingebauter Zweitschlüssel in deriveDepotKeyV2 → mindestens ein Weg liefert Klartext, Wächter wird rot', async () => {
  const { HTML_PATH } = require('../load-kern.js');
  const echt = fs.readFileSync(HTML_PATH, 'utf8');
  const nadel = 'async function deriveDepotKeyV2(masterHkdfKey, cryptoSalt, depotUUID) {';
  assert.ok(echt.includes(nadel), 'Suchtext im echten Kern nicht gefunden — die Analyse ist veraltet');
  const sonde = nadel + "\n  return crypto.subtle.importKey('raw', new Uint8Array(32).fill(0x42), { name: 'AES-GCM' }, false, ['encrypt','decrypt']); // A-Zug2-Rotmach-Sonde: fest eingebauter Zweitschlüssel, ignoriert masterHkdfKey/cryptoSalt/depotUUID";
  const mutiert = echt.replace(nadel, sonde);
  assert.notEqual(mutiert, echt, 'Injektion griff nicht');

  const tmpPfad = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vivodepot-a-zug2-rotmach-')), 'vivodepot-mutiert.html');
  fs.writeFileSync(tmpPfad, mutiert, 'utf8');
  try {
    const versuche = await laufGegen(tmpPfad);
    const wege = versuche.filter(v => v.name !== '__sessionZustand');
    const geglueckt = wege.filter(w => w.ok === true);
    assert.ok(geglueckt.length > 0,
      'Rotmachbarkeit nicht belegt: mit fest eingebautem Zweitschlüssel lieferte KEIN Weg Klartext — die Probe wäre stumpf.');
    const treffer = geglueckt.find(w => w.klartext && w.klartext.sektoren && w.klartext.sektoren.identity);
    assert.ok(treffer, 'ein Weg meldete ok:true, aber ohne den erwarteten Klartext-Inhalt — kein echter Nachweis');
    assert.equal(treffer.klartext.sektoren.identity.givenName, 'AZug2Nachweis',
      'Klartext kam zurück, aber nicht der erwartete Sentinel-Wert — die Mutation traf etwas anderes');
  } finally {
    fs.rmSync(path.dirname(tmpPfad), { recursive: true, force: true });
  }
});
