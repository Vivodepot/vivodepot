'use strict';
/* ════════════════════════════════════════════════════════════════════════
   hl7-validator-beschaffen.js — gepinnte Beschaffung von validator_cli.jar
   ────────────────────────────────────────────────────────────────────────
   A108 (Z21, G3-Abweichung), Entscheidung der Produktverantwortung 06.08.2026:
   „weder Option A [im Repo vendoren] noch Option B [eigener Ablageort] — der
   Validator wird weiterhin beim Hersteller geladen, aber mit fester
   Versionsangabe und SHA-256-Prüfsumme. Kein Re-Hosting, keine Kopie im Repo."

   Der Fix liegt in der FEHLERKLASSE, nicht im Ablageort:
     - Netz/Beschaffung scheitert  → UNGEMESSEN (Exit 0, kein FHIR_VALIDATOR_JAR
       gesetzt — tests/konformitaet/externe-validatoren.mjs überspringt dann
       selbst, siehe dortiger UMGEBUNGEN/ALLE_DA-Mechanismus, der das bereits
       exakt so behandelt).
     - Datei geladen, aber SHA-256 stimmt NICHT → ROT (Exit 1). Das ist kein
       Netzfehler, sondern ein Integritäts-/Versions-Widerspruch — etwas
       anderes wurde geladen als gepinnt, das darf nie still durchgehen.

   Version + Prüfsumme sind hier FEST codiert, nicht aus einer externen Quelle
   gelesen — genau das ist der Anker. Der SHA-256 stammt aus dem GitHub-
   Release-API-Feld `digest` (gemessen 06.08.2026, `gh api
   repos/hapifhir/org.hl7.fhir.core/releases/tags/6.9.12`), NICHT durch eigenes
   Herunterladen+Hashen — GitHub liefert den Digest ohne den 178-MB-Download.
   ════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const VERSION = '6.9.12';
const SHA256 = '0e53ab1d1a6f1e35f505255c0b8ce10a35fcf27e6e96b503640f784cd07e5ad6';
const URL = `https://github.com/hapifhir/org.hl7.fhir.core/releases/download/${VERSION}/validator_cli.jar`;

/** Reiner Vergleich, unabhängig vom Download — der einzig sicherheitsrelevante Schritt. */
function checksummeStimmt(buffer, erwarteterHash = SHA256) {
  const ist = crypto.createHash('sha256').update(buffer).digest('hex');
  return ist === erwarteterHash;
}

/** Reine Entscheidung: aus einem Beschaffungs-Ausgang wird ein Status-Objekt (testbar ohne Netz). */
function statusAus(ausgang) {
  const datum = ausgang.datum;
  if (ausgang.art === 'erfolg') return { datum, version: VERSION, ergebnis: 'gemessen' };
  if (ausgang.art === 'netzfehler') return { datum, version: VERSION, ergebnis: 'ungemessen', grund: ausgang.grund };
  if (ausgang.art === 'checksummen-mismatch') return { datum, version: VERSION, ergebnis: 'integritaetsfehler', grund: ausgang.grund };
  throw new Error('unbekannte Ausgangs-Art: ' + ausgang.art);
}

async function beschaffen({ zielVerzeichnis = fs.mkdtempSync(path.join(os.tmpdir(), 'hl7-validator-')), datum, url = URL, erwarteteSumme = SHA256 } = {}) {
  const jarPfad = path.join(zielVerzeichnis, `validator_cli-${VERSION}.jar`);
  // Wiederverwendbarer Cache (19.09.2026, A1b): ein persistentes zielVerzeichnis (z. B. aus
  // einem Hook, der bei jedem Push läuft) muss den 178-MB-Download nicht bei jedem Aufruf
  // wiederholen — nur wenn die vorhandene Datei GENAU die gepinnte Prüfsumme trägt, sonst
  // bleibt der Netzweg unten die einzige Quelle der Wahrheit.
  if (fs.existsSync(jarPfad)) {
    const vorhanden = fs.readFileSync(jarPfad);
    if (checksummeStimmt(vorhanden, erwarteteSumme)) {
      return { status: statusAus({ art: 'erfolg', datum }), jarPfad };
    }
  }
  let antwort;
  try {
    antwort = await fetch(url, { redirect: 'follow' });
  } catch (e) {
    return { status: statusAus({ art: 'netzfehler', datum, grund: 'Netzfehler: ' + e.message }), jarPfad: null };
  }
  if (!antwort.ok) {
    return { status: statusAus({ art: 'netzfehler', datum, grund: `HTTP ${antwort.status} von ${url}` }), jarPfad: null };
  }
  const buffer = Buffer.from(await antwort.arrayBuffer());
  if (!checksummeStimmt(buffer, erwarteteSumme)) {
    return { status: statusAus({ art: 'checksummen-mismatch', datum, grund: 'SHA-256 weicht vom gepinnten Wert ab — geladene Datei ≠ erwartete Version ' + VERSION }), jarPfad: null };
  }
  fs.writeFileSync(jarPfad, buffer);
  return { status: statusAus({ art: 'erfolg', datum }), jarPfad };
}

module.exports = { VERSION, SHA256, URL, checksummeStimmt, statusAus, beschaffen };

if (require.main === module) {
  (async () => {
    const datum = process.env.HL7_STATUS_LAUF_ID || new Date().toISOString().slice(0, 10);
    const statusZielArg = process.argv.find(a => a.startsWith('--status-datei='));
    const statusDatei = statusZielArg ? statusZielArg.split('=')[1] : path.join(__dirname, '..', '.hl7-validator-status', `status-${datum}.json`);
    // --cache-dir (19.09.2026, A1b): ein Aufrufer, der bei jedem Push läuft (der Push-Hook),
    // braucht ein STABILES Zielverzeichnis statt eines frischen mkdtemp je Lauf — sonst lädt
    // jeder Push 178 MB neu. CI (ohne dieses Flag) bleibt beim bisherigen mkdtemp-Verhalten.
    const cacheDirArg = process.argv.find(a => a.startsWith('--cache-dir='));
    const zielVerzeichnis = cacheDirArg ? cacheDirArg.split('=')[1] : undefined;
    if (zielVerzeichnis) fs.mkdirSync(zielVerzeichnis, { recursive: true });

    const { status, jarPfad } = await beschaffen(zielVerzeichnis ? { datum, zielVerzeichnis } : { datum });

    fs.mkdirSync(path.dirname(statusDatei), { recursive: true });
    fs.writeFileSync(statusDatei, JSON.stringify(status, null, 2) + '\n');

    if (status.ergebnis === 'integritaetsfehler') {
      console.error('✖ ' + status.grund);
      process.exit(1);
    }
    if (status.ergebnis === 'ungemessen') {
      console.log('⚠ UNGEMESSEN — ' + status.grund);
      console.log('  tests/konformitaet/externe-validatoren.mjs überspringt sich selbst (kein FHIR_VALIDATOR_JAR gesetzt).');
      process.exit(0);
    }
    console.log('✔ validator_cli.jar ' + VERSION + ' geladen und Checksumme bestätigt: ' + jarPfad);
    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, `FHIR_VALIDATOR_JAR=${jarPfad}\n`);
    } else {
      console.log('FHIR_VALIDATOR_JAR=' + jarPfad);
    }
    process.exit(0);
  })().catch(e => { console.error('✖ unerwarteter Fehler: ' + e.stack); process.exit(1); });
}
