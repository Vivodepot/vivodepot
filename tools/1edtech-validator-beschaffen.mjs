#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
   1edtech-validator-beschaffen.mjs — den offiziellen Open-Badges-Prüfer bauen (U2-ADR-445)
   ────────────────────────────────────────────────────────────────────────────
   1EdTech verteilt den Digital Credentials Public Validator weder als Image noch als Release-JAR
   (gemessen 28.09.2026). Dieses Werkzeug baut ihn mit Docker aus tools/1edtech-validator/Dockerfile:
   Quellarchiv am Commit des Tags v1.11.3 (SHA-256 im Dockerfile, ADD --checksum), Basis-Images per
   Digest. Im Register heißt das „aus offizieller Quelle gebaut", nicht „offizielles Artefakt".
   Braucht einmal Netz (Quellarchiv, Maven-Server von 1EdTech); danach urteilt der Prüfer ohne Netz.
   Die Suite baut nie selbst: ohne diesen Schritt ist der Prüferlauf „ungemessen" (todo).
   Aufruf: node tools/1edtech-validator-beschaffen.mjs
   ════════════════════════════════════════════════════════════════════════════ */
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WERKZEUG } from '../tests/konformitaet/adapter/1edtech-validator.mjs';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const kandidaten = ['docker', path.join(os.homedir(), '.docker', 'bin', 'docker'), '/usr/local/bin/docker'];
const docker = kandidaten.find((k) => { try { execFileSync(k, ['version'], { stdio: 'ignore' }); return true; } catch (_) { return false; } });
if (!docker) { console.error('[1edtech-validator-beschaffen] Docker fehlt oder läuft nicht'); process.exit(1); }
try {
  execFileSync(docker, ['build', '-t', WERKZEUG.image, path.join(REPO, path.dirname(WERKZEUG.dockerfile))], { stdio: 'inherit' });
  console.log('[1edtech-validator-beschaffen] fertig — ' + WERKZEUG.image + ' (aus ' + WERKZEUG.quelle.repo + ' @ ' + WERKZEUG.quelle.commit + ')');
} catch (e) {
  console.error('[1edtech-validator-beschaffen] Bau gescheitert: ' + e.message);
  process.exit(1);
}
