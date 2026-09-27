#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   depot-umschlag-diagnose.js — „Sub-Depot-Klick-Freeze", 31.08.2026
   ────────────────────────────────────────────────────────────────────────────
   Prüft die HÜLLE einer .vivodepot-Datei — kryptoVersion, Fach-/KDF-Struktur,
   Zahl der Felder/Fächer, Soll-Ist-Vergleich gegen das, was der heutige Kern
   (depotLaden/_zerfallLesen, vivodepot.html) zwingend verlangt. NIEMALS den
   INHALT.

   WAS DIESES WERKZEUG NICHT KANN, UND WARUM DAS KEIN VERSÄUMNIS IST:
   `schemaVersion` und `verwalteteDepots` (Sub-Depots) liegen NICHT im Klartext-
   Umschlag. Der Zerfall (kryptoVersion 4, _zerfallEinheiten) zerlegt den
   gesamten Depot-Inhalt in einzeln verschlüsselte Feld-Einheiten — jede mit
   einer HMAC-verschlüsselten Adresse (VdCrypto.feldAdresse, ADR-156/A414:
   Datenschutz-Entscheidung, damit nicht einmal die ZAHL und ART der Felder
   den Zuschnitt eines Depots verrät). Ohne Passwort ist nicht nur der Inhalt,
   sondern schon die Zuordnung "dieser Chiffrat-Block ist verwalteteDepots"
   unsichtbar. Ein Format, das seine eigene Erbauerin aussperrt, hält auch
   jedes andere Prüfwerkzeug draußen — das ist der Preis derselben Entscheidung,
   die die Bürgerin schützt. Für den Rest (Sub-Depot-Feldstruktur, Schema-
   version) siehe den Browser-Konsolen-Schnipsel, der NACH dem Entsperren in
   der eigenen Sitzung der Nutzerin läuft (separates Dokument).

   NIEMALS: entschlüsseln, nach einer Passphrase fragen, eine annehmen,
   Feldwerte ausgeben, Salze/Schlüssel/Chiffrate im Klartext zeigen, etwas
   außer stdout schreiben.

   `--depot <pfad>`   Pfad zu einer .vivodepot-JSON-Datei.
   Ohne Argument: läuft gegen die beiden Fixtures unter
                  tests/fixtures/depot-diagnose/ (v3 UND v4), damit die Suite
                  es mitprüft — auch ohne eine echte Nutzer-Datei.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const KRYPTO_VERSION_ALLOWLIST = [3, 4];   // vivodepot.html:3575 — dieselbe Zahl, hier nicht importiert (Kern läuft nicht in Node ohne Browser-Shims), von Hand synchron gehalten, s. Test.

// VD-CR-B11 (code-review-dod-stand-2026-09-16.md, MITTEL, gemessen 18.09.2026 noch offen):
// der Kern schreibt seit c56c18bb (02.07.2026) einen Magic-Kopf vor jede .vivodepot-Datei
// (dateiMitMagic()/magicStrippen(), vivodepot.html) — dieses Werkzeug rief bisher blind
// JSON.parse() auf und scheiterte an JEDER echten, seit Juli erzeugten Datei ("Unexpected
// token 'V', \"VIVODEPOT\"..."). Nur die beiden eigenen Fixtures (nacktes JSON ohne Kopf)
// blieben grün. DATEI_MAGIC/-VERSION hier von Hand synchron gehalten, dieselbe Begründung
// wie bei KRYPTO_VERSION_ALLOWLIST oben.
const DATEI_MAGIC = 'VIVODEPOT';
const DATEI_MAGIC_VERSION = 1;
const DATEI_MAGIC_PREFIX = DATEI_MAGIC + String.fromCharCode(DATEI_MAGIC_VERSION);
function magicStrippen(text) {
  const s = String(text == null ? '' : text);
  if (!s.startsWith(DATEI_MAGIC)) return { json: s, magic: false, version: 0 };   // Alt-Datei: bare JSON, verlustfrei
  return { json: s.slice(DATEI_MAGIC.length + 1), magic: true, version: s.charCodeAt(DATEI_MAGIC.length) };
}

function b64Laenge(b64) {
  if (typeof b64 !== 'string' || !b64) return null;
  try { return Buffer.from(b64, 'base64').length; } catch (e) { return null; }
}

function pruefeFeld(obj, feld, typErwartet) {
  const vorhanden = obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, feld);
  if (!vorhanden) return { feld, vorhanden: false, typOk: false };
  const wert = obj[feld];
  let typOk;
  if (typErwartet === 'string') typOk = typeof wert === 'string' && wert.length > 0;
  else if (typErwartet === 'number') typOk = typeof wert === 'number' && Number.isFinite(wert);
  else if (typErwartet === 'object') typOk = wert !== null && typeof wert === 'object' && !Array.isArray(wert);
  else if (typErwartet === 'array') typOk = Array.isArray(wert);
  else typOk = true;
  return { feld, vorhanden: true, typOk };
}

// Der Soll-Ist-Vergleich gegen depotLaden()/_zerfallLesen() (vivodepot.html:16576-16600,
// 16389-16420). NUR Struktur, keine Werte außer unkritischen (kryptoVersion, depotUUID,
// Iterationszahl, Byte-Längen).
function diagnostiziereUmschlag(umschlagOderText) {
  const out = { dateiValide: false };

  let umschlag;
  if (typeof umschlagOderText === 'string') {
    const { json } = magicStrippen(umschlagOderText);
    try { umschlag = JSON.parse(json); }
    catch (e) { out.fehler = 'Datei ist kein gültiges JSON: ' + e.message; return out; }
  } else {
    umschlag = umschlagOderText;
  }
  if (!umschlag || typeof umschlag !== 'object' || Array.isArray(umschlag)) {
    out.fehler = 'Datei-Inhalt ist kein JSON-Objekt.';
    return out;
  }
  out.dateiValide = true;

  const topLevelSchluessel = Object.keys(umschlag).sort();
  out.topLevelSchluessel = topLevelSchluessel;

  const kv = pruefeFeld(umschlag, 'kryptoVersion', 'number');
  out.kryptoVersion = umschlag.kryptoVersion;
  out.kryptoVersionInAllowlist = kv.vorhanden && kv.typOk && KRYPTO_VERSION_ALLOWLIST.includes(umschlag.kryptoVersion);

  const fehlendePflichtfelder = [];
  const check = (feld, typ) => {
    const r = pruefeFeld(umschlag, feld, typ);
    if (!r.vorhanden) fehlendePflichtfelder.push(feld + ' (fehlt)');
    else if (!r.typOk) fehlendePflichtfelder.push(feld + ' (falscher Typ)');
    return r;
  };

  // Von BEIDEN Versionen verlangt (depotLaden liest umschlag.pbkdf2.salt/depotSalt/depotUUID
  // VOR der Versionsverzweigung, vivodepot.html:16583-16585).
  check('depotUUID', 'string');
  check('depotSalt', 'string');
  const pbkdf2Check = pruefeFeld(umschlag, 'pbkdf2', 'object');
  if (!pbkdf2Check.vorhanden) fehlendePflichtfelder.push('pbkdf2 (fehlt)');
  else if (!pbkdf2Check.typOk) fehlendePflichtfelder.push('pbkdf2 (falscher Typ)');
  else {
    const saltCheck = pruefeFeld(umschlag.pbkdf2, 'salt', 'string');
    if (!saltCheck.vorhanden) fehlendePflichtfelder.push('pbkdf2.salt (fehlt)');
    else if (!saltCheck.typOk) fehlendePflichtfelder.push('pbkdf2.salt (falscher Typ)');
  }

  out.pbkdf2SaltByteLaenge = pbkdf2Check.vorhanden ? b64Laenge(umschlag.pbkdf2 && umschlag.pbkdf2.salt) : null;
  out.depotSaltByteLaenge = b64Laenge(umschlag.depotSalt);

  if (umschlag.kryptoVersion === 4) {
    out.format = 'v4 (Zerfall — Feld-Einheiten)';
    check('einheiten', 'object');
    check('umschlagTabelle', 'array');

    if (Array.isArray(umschlag.umschlagTabelle)) {
      out.faecherZahl = umschlag.umschlagTabelle.length;
      if (umschlag.umschlagTabelle.length === 0) fehlendePflichtfelder.push('umschlagTabelle (leer — _zerfallLesen verlangt mindestens ein Fach)');
      out.faecher = umschlag.umschlagTabelle.map((eintrag, i) => {
        const f = { index: i };
        f.kennungVorhanden = !!(eintrag && typeof eintrag.kennung === 'string' && eintrag.kennung);
        const kdf = eintrag && eintrag.kdf;
        f.kdfSaltVorhanden = !!(kdf && typeof kdf.salt === 'string' && kdf.salt);
        f.kdfIterationen = kdf && typeof kdf.iterationen === 'number' ? kdf.iterationen : null;
        // tuerSalt fehlt bei einem Fach, das vor dem 21.08.2026 angelegt wurde (Nachtrag,
        // vivodepot.html:16196-16198/16416-16418) — depotLaden faellt dann auf depotSalt
        // zurueck (funktioniert weiter), ist aber ein Signal fuer "altes Fach-Format".
        f.kdfTuerSaltVorhanden = !!(kdf && typeof kdf.tuerSalt === 'string' && kdf.tuerSalt);
        f.umschlaegeZahl = (eintrag && eintrag.umschlaege && typeof eintrag.umschlaege === 'object')
          ? Object.keys(eintrag.umschlaege).length : null;
        f.geheimVorhanden = !!(eintrag && eintrag.geheim && typeof eintrag.geheim === 'object');
        if (i === 0) {
          if (!f.kennungVorhanden) fehlendePflichtfelder.push('umschlagTabelle[0].kennung (fehlt)');
          if (!eintrag || !eintrag.umschlaege || typeof eintrag.umschlaege !== 'object') {
            fehlendePflichtfelder.push('umschlagTabelle[0].umschlaege (fehlt oder falscher Typ — _zerfallLesen bricht hier hart ab)');
          }
        }
        return f;
      });
    }
    if (umschlag.einheiten && typeof umschlag.einheiten === 'object') {
      out.einheitenZahl = Object.keys(umschlag.einheiten).length;
    }
  } else if (umschlag.kryptoVersion === 3) {
    out.format = 'v3 (ein Chiffrat-Block)';
    check('iv', 'string');
    check('ct', 'string');
  } else {
    out.format = 'unbekannt (kryptoVersion ' + JSON.stringify(umschlag.kryptoVersion) + ')';
    fehlendePflichtfelder.push('kryptoVersion (Wert ' + JSON.stringify(umschlag.kryptoVersion) + ' nicht in der Allowlist [' + KRYPTO_VERSION_ALLOWLIST.join(', ') + '] — depotLaden lehnt diese Datei sofort ab, VOR jeder Ableitung)');
  }

  out.angehoerigenOrtVorhanden = Object.prototype.hasOwnProperty.call(umschlag, 'angehoerigenOrt');
  out.fehlendePflichtfelder = fehlendePflichtfelder;
  out.heutigerKernWuerdeLesen = fehlendePflichtfelder.length === 0 && out.kryptoVersionInAllowlist;

  return out;
}

function formatiereBericht(diag, quelle) {
  const z = [];
  z.push('── Depot-Umschlag-Diagnose: ' + quelle + ' ──');
  if (!diag.dateiValide) {
    z.push('  NICHT LESBAR: ' + (diag.fehler || 'unbekannter Fehler'));
    return z.join('\n');
  }
  z.push('  Top-Level-Schlüssel: ' + diag.topLevelSchluessel.join(', '));
  z.push('  kryptoVersion: ' + diag.kryptoVersion + (diag.kryptoVersionInAllowlist ? ' (bekannt)' : ' (NICHT in der Allowlist [3, 4] — der heutige Kern lehnt diese Datei ab)'));
  z.push('  Format: ' + diag.format);
  z.push('  pbkdf2.salt: ' + (diag.pbkdf2SaltByteLaenge != null ? diag.pbkdf2SaltByteLaenge + ' Bytes' : 'fehlt/ungültig'));
  z.push('  depotSalt: ' + (diag.depotSaltByteLaenge != null ? diag.depotSaltByteLaenge + ' Bytes' : 'fehlt/ungültig'));
  z.push('  angehoerigenOrt vorhanden: ' + (diag.angehoerigenOrtVorhanden ? 'ja' : 'nein'));
  if (diag.kryptoVersion === 4) {
    z.push('  Zahl der Fächer (umschlagTabelle): ' + diag.faecherZahl);
    (diag.faecher || []).forEach((f) => {
      z.push('    Fach ' + f.index + (f.index === 0 ? ' (Eigentümerin)' : ' (Empfängerkreis)')
        + ': kennung=' + (f.kennungVorhanden ? 'ja' : 'FEHLT')
        + ', kdf.salt=' + (f.kdfSaltVorhanden ? 'ja' : 'FEHLT')
        + ', kdf.iterationen=' + (f.kdfIterationen != null ? f.kdfIterationen : 'FEHLT')
        + ', kdf.tuerSalt=' + (f.kdfTuerSaltVorhanden ? 'ja (neues Fach-Format)' : 'nein (Fach von vor 21.08.2026 ODER Eigentümer-Fach ohne Tür — kein Fehler für sich)')
        + ', Umschläge=' + (f.umschlaegeZahl != null ? f.umschlaegeZahl : 'FEHLT')
        + ', geheim=' + (f.geheimVorhanden ? 'ja' : 'FEHLT'));
    });
    z.push('  Zahl verschlüsselter Feld-Einheiten (einheiten): ' + diag.einheitenZahl);
  }
  if (diag.fehlendePflichtfelder.length) {
    z.push('  FEHLT gegenüber dem, was der heutige Kern verlangt:');
    diag.fehlendePflichtfelder.forEach((f) => z.push('    · ' + f));
  } else {
    z.push('  Alle Pflichtfelder, die der heutige Kern (depotLaden/_zerfallLesen) vor jeder Entschlüsselung prüft, sind vorhanden.');
  }
  z.push('  Ergebnis: ' + (diag.heutigerKernWuerdeLesen
    ? 'Der heutige Kern würde diese Datei strukturell akzeptieren und mit dem richtigen Passwort versuchen zu lesen.'
    : 'Der heutige Kern würde diese Datei ABLEHNEN, BEVOR ein Passwort geprüft wird.'));
  z.push('  NICHT geprüft (liegt verschlüsselt, ohne Passwort unsichtbar — Absicht, ADR-156/A414): schemaVersion, verwalteteDepots (Sub-Depots: Anzahl/Struktur), jeder Feldwert.');
  return z.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--depot');
  const depotPfad = (i >= 0 && argv[i + 1]) ? argv[i + 1] : null;

  if (depotPfad) {
    let text;
    try { text = fs.readFileSync(path.resolve(depotPfad), 'utf8'); }
    catch (e) { process.stderr.write('Datei nicht lesbar: ' + e.message + '\n'); process.exit(1); }
    const diag = diagnostiziereUmschlag(text);
    process.stdout.write(formatiereBericht(diag, depotPfad) + '\n');
    process.exit(diag.dateiValide ? 0 : 1);
    return;
  }

  // Ohne Argument: gegen beide Fixtures, fuer die Suite.
  const fixturePfade = [
    path.join(__dirname, '..', 'tests', 'fixtures', 'depot-diagnose', 'beispiel-anker-v3.vivodepot'),
    path.join(__dirname, '..', 'tests', 'fixtures', 'depot-diagnose', 'beispiel-anker-v4.vivodepot'),
  ];
  for (const p of fixturePfade) {
    const text = fs.readFileSync(p, 'utf8');
    const diag = diagnostiziereUmschlag(text);
    process.stdout.write(formatiereBericht(diag, path.relative(process.cwd(), p)) + '\n\n');
  }
}

if (require.main === module) main();
module.exports = { diagnostiziereUmschlag, formatiereBericht, KRYPTO_VERSION_ALLOWLIST };
