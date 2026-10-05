'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   enclave-signierer.js — signiert eine ganze Liste mit EINER Touch-ID-Bestätigung (03.10.2026, Signaturkette Option A)
   ────────────────────────────────────────────────────────────────────────────
   Der Schlüssel liegt in der Secure Enclave dieses Macs (tools/signatur/enclave-signieren.swift); kein Werkzeug und
   keine Sitzung sieht ihn. Dieses Modul baut den Helfer je Signierer frisch aus der Repo-Quelle (swiftc, Wegwerf-
   Verzeichnis, kein Cache), reicht ihm die Liste der Signatur-Eingaben samt Anzeigetext und nimmt die Signaturen zurück.

   ES256 IN JWS IST r‖s, 64 BYTE (RFC 7518 §3.4). Viele Schnittstellen liefern DER; eine DER-Signatur würde der
   Worker abweisen. `rohSignaturPruefen` lässt nur genau 64 Byte durch, und rezepte-signieren prüft jede Signatur
   danach selbst gegen den öffentlichen Schlüssel des Zertifikats.

   Die Anzeige baut der Helfer selbst aus den Eingaben (typ, slug, Prüfsumme je Eintrag, dazu die Gesamtprüfsumme);
   der Aufrufer prüft, dass die zurückgegebene Gesamtprüfsumme zu seiner Liste passt. Die Bestätigung gilt nur für genau
   diese Liste: der Helfer signiert in einem Prozess und verwirft den Kontext danach.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const QUELLE = path.join(__dirname, '..', 'signatur', 'enclave-signieren.swift');
const KENNUNG = /^[a-z0-9][a-z0-9-]{0,62}$/;

function b64uZuBytes(s) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_-]+$/.test(s)) throw new Error('Signatur ist kein base64url');
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/* Genau 64 Byte (r‖s). Eine DER-Signatur (0x30 …, 70–72 Byte) fällt mit Namen. */
function rohSignaturPruefen(b64u) {
  const b = b64uZuBytes(b64u);
  if (b.length === 64) return b64u;
  if (b[0] === 0x30) throw new Error('ES256-Signatur ist DER-kodiert (' + b.length + ' Byte), JWS verlangt r‖s mit 64 Byte');
  throw new Error('ES256-Signatur hat ' + b.length + ' statt 64 Byte');
}

/* Die Gesamtprüfsumme, die der Helfer in der Touch-ID-Abfrage zeigt und zurückgibt: SHA-256 über die Eingaben, je mit \n
   getrennt. Den Anzeigetext baut der Helfer selbst aus den Eingaben (Gegenlesung S1); der Aufrufer gibt keinen vor. */
function gesamtPruefsumme(eingaben) {
  return crypto.createHash('sha256').update(eingaben.join('\n'), 'utf8').digest('hex');
}

/* KEIN CACHE (03.10.2026): ein nach Quell-Prüfsumme benannter Ablageort nähme jede Datei an,
   die dort liegt. Darum wird der Helfer für jeden Signierer frisch aus der Repo-Quelle in ein neues, nur dem Aufrufer
   gehörendes Wegwerf-Verzeichnis gebaut und danach gelöscht. Eine vorgefundene Datei wird nie benutzt. */
function helferBauen({ quelle = QUELLE, swiftc = 'swiftc' } = {}) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-enclave-'));
  fs.chmodSync(ordner, 0o700);
  const ziel = path.join(ordner, 'enclave-signieren');
  const r = spawnSync(swiftc, ['-O', quelle, '-o', ziel], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(ziel)) {
    fs.rmSync(ordner, { recursive: true, force: true });
    throw new Error('Helfer nicht gebaut (swiftc): ' + ((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-3).join(' | '));
  }
  return { pfad: ziel, aufraeumen: () => fs.rmSync(ordner, { recursive: true, force: true }) };
}

/* Ein Signierer: async ({ eintraege: [{ name, pruefsumme?, eingabe }] }) → [base64url r‖s].
   `ausfuehren(befehl, kennung, stdin)` → { status, stdout, stderr } ist für Proben austauschbar. */
function enclaveSignierer({ kennung, ausfuehren }) {
  if (!KENNUNG.test(kennung || '')) throw new Error('ungültige Kennung: ' + kennung);
  let bau = null;
  const lauf = ausfuehren || ((befehl, k, stdin) => {
    if (!bau) { bau = helferBauen(); process.once('exit', () => bau && bau.aufraeumen()); }
    return spawnSync(bau.pfad, [befehl, k], { input: stdin, encoding: 'utf8' });
  });
  return {
    kennung,
    aufraeumen() { if (bau) { bau.aufraeumen(); bau = null; } },
    async oeffentlich() {
      const r = lauf('oeffentlich', kennung, '');
      if (r.status !== 0) throw new Error((r.stderr || '').trim() || 'Helfer: oeffentlich fehlgeschlagen');
      const { jwk } = JSON.parse(r.stdout);
      if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256') throw new Error('Helfer lieferte keinen P-256-Schlüssel');
      return jwk;
    },
    async signieren({ eintraege }) {
      if (!eintraege.length) throw new Error('nichts zu signieren');
      const eingaben = eintraege.map((e) => e.eingabe);
      const r = lauf('signieren', kennung, JSON.stringify({ eingaben }));
      if (r.status !== 0) throw new Error((r.stderr || '').trim() || 'Helfer: signieren fehlgeschlagen');
      const { signaturen, gesamt } = JSON.parse(r.stdout);
      if (gesamt !== gesamtPruefsumme(eingaben)) throw new Error('Helfer hat eine andere Liste bestätigt (Gesamtprüfsumme weicht ab)');
      if (!Array.isArray(signaturen) || signaturen.length !== eintraege.length) throw new Error('Helfer lieferte ' + (signaturen || []).length + ' statt ' + eintraege.length + ' Signaturen');
      return signaturen.map(rohSignaturPruefen);
    },
  };
}

module.exports = { enclaveSignierer, rohSignaturPruefen, gesamtPruefsumme, helferBauen, QUELLE };
