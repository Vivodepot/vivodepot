#!/usr/bin/env node
'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════════
   modul-app-packen.js — „Modul-Apps automatisiert packen" (30.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Aus einem fertig SIGNIERTEN Modul-Bündel (Vor-Depot-Konfiguration, U2-ADR-182
   Weg B) eine eigene, gehostete, verpackte App machen — bisher gab es dafür nur
   ein handgebautes Beispiel (die xShare-Englisch-App), kein Werkzeug. Dieses
   Werkzeug SIGNIERT NICHTS SELBST — das Signieren ist ein separater, schon
   bestehender Schritt über die Zertifikatskette (vivodepot-vc-issuer.html,
   F-9 / Schnellweg). Es verpackt nur ein bereits fertiges Bündel.

   NACH DEM MUSTER VON `tools/testfassung-legen.js` (dieselben Konventionen:
   Vorbedingungen prüfen, EIN Commit im Zielrepo, `--push`/`--dry-run`, Vermerk-
   Datei in DIESEM Repo). `vivodepot-ios-test` ist schon ein öffentlicher,
   GitHub-Pages-gehosteter Geschwisterordner (dient heute dem Tester-Weg) —
   GitHub Pages liefert jeden Unterordner automatisch aus, darum reicht ein
   neuer Unterordner `module-apps/<slug>/` darin, kein neues Repo, kein neues
   Hosting.

   DER KURATIERTE DATEISATZ ist NUR DREI Dateien, nicht vier wie bei der
   Testfassung: `vivodepot-lesen.html` fehlt bewusst — das ist der eigenständige
   Lese-Weg für ein bestehendes Depot, eine Modul-App braucht ihn nicht.

   `--bundle <pfad>`  Pfad zu einer JSON-Datei: entweder EIN Bündel-Objekt
                       `{providerCredentialJws, modulSignaturJws}` oder ein
                       Array mehrerer solcher Objekte (`ausstellerZertifikatJws`
                       optional zusätzlich erlaubt, wie im Kern-Bundle-Vertrag).
                       Nur strukturell geprüft (drei JWS-Teile) — die kryptografische
                       Prüfung macht `modulEinlassenGeprueft` beim Import im Browser,
                       nicht dieses Werkzeug.
   `--slug <name>`    Zielordner `module-apps/<slug>/`. Kleinbuchstaben/Ziffern/
                       einzelne Bindestriche, sonst Ablehnung (Pfad-Sicherheit —
                       der Slug wird direkt zu einem Dateisystempfad).
   `--alle`            Re-Sync-Modus: iteriert über ALLE vorhandenen Ordner
                       unter `module-apps/` und kopiert NUR die drei
                       Kern-Dateien neu (nicht `vorabkonfiguration.js` — die
                       ändert sich nur, wenn ein neues Modul geliefert wird).
                       EIN Commit für den ganzen Sync-Durchlauf.
   `--ziel <pfad>`    Wie testfassung-legen: Default `../vivodepot-ios-test`.
   `--push`           Nach dem Commit auch pushen. Ohne dieses Flag bleibt der
                       Commit lokal im Zielrepo liegen.
   `--dry-run`        Nichts schreiben, nur Vorbedingungen und Plan zeigen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeIssuer } = require('../tests/load-issuer.js');
const { indexWeiterleitungInhalt } = require('./index-weiterleitung-erzeugen.js');
const { modulAusEintrag, sprachbuendelDeckung, deckungsMeldung, deckungsUrteil, moduleVersionenAusBuendel } = require('./lib/sprachbuendel-deckung.js');

const REPO = path.join(__dirname, '..');
const DATEISATZ = ['vivodepot.html', 'sw.js', 'manifest.webmanifest'];
const MODULE_APPS_UNTERPFAD = 'module-apps';
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// U2-ADR-194 (01.09.2026): dieselbe Wurzel-404-Lücke wie bei
// testfassung-legen.js — JEDE Modul-App braucht ihre EIGENE index.html, die auf ihr
// eigenes vivodepot.html zeigt (nicht eine gemeinsame an der Wurzel). Separater
// Schritt, nicht Teil von DATEISATZ — dieselbe Begründung wie dort.
function dateisatzUndIndexAblegen(zielOrdner) {
  for (const datei of DATEISATZ) fs.copyFileSync(path.join(REPO, datei), path.join(zielOrdner, datei));
  fs.writeFileSync(path.join(zielOrdner, 'index.html'), indexWeiterleitungInhalt(path.join(zielOrdner, 'vivodepot.html')));
}

/* U2-ADR-232, hier besonders: dieses Werkzeug COMMITTET und PUSHT in ein FREMDES Repo
   (ios-test). Läuft es aus einem Hook heraus oder in einer Sitzung, die GIT_DIR/GIT_INDEX_FILE
   gesetzt hat, erbt jeder git-Kindprozess diese Variablen — `cwd` allein schützt nicht, und ein
   `git commit`/`git push` schriebe dann in den falschen Baum. Darum bekommt JEDER git-Aufruf in
   dieser Datei eine von GIT_* bereinigte Umgebung. (Gefunden 16.09.2026; das Werkzeug stand
   namentlich in der Ratsche, der Fix ist eine Zeile je Aufrufstelle.) */
function ohneGitEnv() {
  const rein = {};
  for (const k of Object.keys(process.env)) if (!k.startsWith('GIT_')) rein[k] = process.env[k];
  return rein;
}

function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', env: ohneGitEnv() }).trim();
}
function shOk(cmd, args, cwd) {
  try { return { ok: true, out: sh(cmd, args, cwd) }; }
  catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || e.message) }; }
}

function slugGueltig(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

// Nur STRUKTUR (JWS = drei Punkt-getrennte Teile) — keine kryptografische Prüfung.
// Die macht modulEinlassenGeprueft beim Import im Browser; dieses Werkzeug signiert
// und verifiziert nichts, es verpackt nur.
function _istJwsForm(x) { return typeof x === 'string' && x.split('.').length === 3; }

function buendelListeAusDatei(bundlePfad) {
  let text;
  try { text = fs.readFileSync(bundlePfad, 'utf8'); }
  catch (e) { return { ok: false, fehler: 'Bündel-Datei nicht lesbar: ' + e.message }; }
  let roh;
  try { roh = JSON.parse(text); }
  catch (e) { return { ok: false, fehler: 'Bündel-Datei ist kein gültiges JSON: ' + e.message }; }
  const liste = Array.isArray(roh) ? roh : [roh];
  if (!liste.length) return { ok: false, fehler: 'Bündel-Liste ist leer.' };
  for (let i = 0; i < liste.length; i++) {
    const b = liste[i];
    if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, fehler: 'Eintrag ' + i + ' ist kein Objekt.' };
    if (!_istJwsForm(b.providerCredentialJws)) return { ok: false, fehler: 'Eintrag ' + i + ': providerCredentialJws fehlt oder ist keine gültige JWS (drei Teile erwartet).' };
    if (!_istJwsForm(b.modulSignaturJws)) return { ok: false, fehler: 'Eintrag ' + i + ': modulSignaturJws fehlt oder ist keine gültige JWS (drei Teile erwartet).' };
    if (b.ausstellerZertifikatJws != null && !_istJwsForm(b.ausstellerZertifikatJws)) {
      return { ok: false, fehler: 'Eintrag ' + i + ': ausstellerZertifikatJws ist gesetzt, aber keine gültige JWS.' };
    }
  }
  return { ok: true, liste };
}

function vermerkInhalt({ slug, zielPfad, zielCommit, quellCommit, anzahlBuendel, gepusht }) {
  return '# Modul-App-Stand — ' + slug + ' — zuletzt gepackt\n\n'
    + 'Maschinell erzeugt von `tools/modul-app-packen.js` — nicht von Hand pflegen.\n\n'
    + '- **Gepackt am:** ' + new Date().toISOString() + '\n'
    + '- **Slug:** `' + slug + '`\n'
    + '- **Ziel-Pfad:** `' + zielPfad + '`\n'
    + '- **Quelle:** vivodepot-cleanslate/u2-kanon @ `' + quellCommit + '`\n'
    + '- **Ziel:** vivodepot-ios-test/main @ `' + zielCommit + '`' + (gepusht ? ' (gepusht)' : ' (LOKAL, noch nicht gepusht)') + '\n'
    + '- **Bündel:** ' + anzahlBuendel + (anzahlBuendel === 1 ? ' Modul' : ' Module') + ' in `vorabkonfiguration.js`\n';
}

function resyncVermerkInhalt({ slugs, zielCommit, quellCommit, gepusht }) {
  return '# Modul-Apps — Kern-Dateien zuletzt synchronisiert\n\n'
    + 'Maschinell erzeugt von `tools/modul-app-packen.js --alle` — nicht von Hand pflegen.\n\n'
    + '- **Synchronisiert am:** ' + new Date().toISOString() + '\n'
    + '- **Betroffene Slugs:** ' + (slugs.length ? slugs.map((s) => '`' + s + '`').join(', ') : '(keine — kein module-apps/*/-Ordner vorhanden)') + '\n'
    + '- **Quelle:** vivodepot-cleanslate/u2-kanon @ `' + quellCommit + '`\n'
    + '- **Ziel:** vivodepot-ios-test/main @ `' + zielCommit + '`' + (gepusht ? ' (gepusht)' : ' (LOKAL, noch nicht gepusht)') + '\n'
    + '- **`vorabkonfiguration.js` je Slug:** UNANGETASTET — ändert sich nur, wenn ein Herausgeber ein neues Modul liefert.\n';
}

function eigenerBaumUndHeadOk(funde) {
  const status = sh('git', ['status', '--porcelain']);
  if (status) funde.push('Arbeitsbaum nicht sauber (' + REPO + '):\n' + status);

  const lokal = sh('git', ['rev-parse', 'HEAD']);
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const remote = shOk('git', ['ls-remote', 'origin', 'refs/heads/' + branch]);
  const remoteSha = remote.ok ? (remote.out.split(/\s+/)[0] || null) : null;
  if (!remote.ok) funde.push('`git ls-remote origin` fehlgeschlagen — kein Netz oder kein Zugriff:\n' + remote.out);
  else if (remoteSha !== lokal) {
    funde.push('Lokaler HEAD (' + lokal.slice(0, 7) + ') weicht vom gepushten origin/' + branch
      + ' (' + String(remoteSha).slice(0, 7) + ') ab — ungepushte Änderungen liegen nicht unter Suite/E2E-Gate.');
  }
  return lokal;
}

function zielRepoOk(ziel, funde) {
  if (!fs.existsSync(path.join(ziel, '.git'))) { funde.push('Zielpfad ist kein Git-Repo: ' + ziel); return; }
  const zStatus = sh('git', ['status', '--porcelain'], ziel);
  if (zStatus) funde.push('Zielrepo nicht sauber (' + ziel + '):\n' + zStatus);
  const zBranch = shOk('git', ['rev-parse', '--abbrev-ref', 'HEAD'], ziel);
  if (zBranch.ok && zBranch.out !== 'main') funde.push('Zielrepo steht nicht auf main, sondern auf: ' + zBranch.out);
}

/* KEIN VERALTETES SPRACHBÜNDEL PACKEN (16.09.2026, U2-ADR-416 Entscheidung 3). Ein
   signiertes Sprachbündel friert den Textstand ein; ein Kern, der danach Texte hinzufügt, zeigt dort
   rohe Kennungen. Beide Wege verweigern: `--slug` mit dem neuen Bündel und `--alle` mit dem Bündel,
   das schon im Ziel liegt — der zweite ist genau der Weg, auf dem Kern und Bündel bisher still
   auseinanderliefen (nur die Kern-Dateien neu, `vorabkonfiguration.js` unangetastet). Geprüft gegen
   den Kern, der gepackt wird (`KERN_HTML_PATH` für Proben), über tools/lib/sprachbuendel-deckung.js. */
function sprachdeckungPruefen(eintraege, funde, wo) {
  const hatTextsatz = eintraege.some((e) => { const m = modulAusEintrag(e); return m && m.modulTyp === 'textsatz'; });
  if (!hatTextsatz) return;
  const lader = path.join(REPO, 'tests', 'load-kern.js');
  const { V } = require(lader).ladeKern();
  for (const fach of sprachbuendelDeckung(V, eintraege)) {
    const u = deckungsUrteil(fach, process.argv.includes('--unvollstaendig-bestaetigt'));
    for (const m of u.hart) funde.push((wo ? wo + ': ' : '') + m);
    for (const m of u.warnung) process.stderr.write('WARNUNG: ' + (wo ? wo + ': ' : '') + m + '\n');
  }
}

function vorabkonfigurationLesen(datei) {
  const text = fs.readFileSync(datei, 'utf8');
  const a = text.indexOf('['), e = text.lastIndexOf(']');
  if (a < 0 || e < a) return [];
  try { const liste = JSON.parse(text.slice(a, e + 1)); return Array.isArray(liste) ? liste : []; } catch (_) { return []; }
}

/* V-2 (Code-Review vom 16.09.2026, NIEDRIG): sprachdeckungPruefen() allein
   hätte ein erneut gepacktes, älteres Bündel nie gefangen — jede Kennung ist ja noch da, nur die
   Texte sind es nicht mehr. `moduleVersion` steigt bei jedem `--vorbereiten`-Lauf (s.
   tools/sprachmodule-ausliefern.js) gegenüber dem, was schon im Ziel liegt; dieser Wächter liest
   GENAU DAS beim Packen nach: das eingehende Bündel darf für kein Fach (Typ/Sprache/Rechtsraum)
   eine NIEDRIGERE moduleVersion tragen als das, was am Zielpfad bereits liegt. Kein Ziel-Bündel
   (erstes Packen) → nichts zu vergleichen, kein Fund. */
function moduleVersionRegressionPruefen(eintraege, ziel, slug, funde) {
  const zielDatei = path.join(ziel, MODULE_APPS_UNTERPFAD, slug, 'vorabkonfiguration.js');
  if (!fs.existsSync(zielDatei)) return;
  const liveVersionen = moduleVersionenAusBuendel(vorabkonfigurationLesen(zielDatei));
  const neueVersionen = moduleVersionenAusBuendel(eintraege);
  for (const [fach, neu] of neueVersionen) {
    const live = liveVersionen.get(fach);
    if (live !== undefined && neu < live) {
      funde.push('Veraltetes Bündel: „' + fach + '" trägt moduleVersion ' + neu + ', im Ziel liegt bereits ' + live
        + ' (' + zielDatei + ') — ein älteres, erneut gepacktes Bündel würde Texte zurückdrehen.');
    }
  }
}

function vorbedingungenEinzeln(ziel, slug, bundlePfad) {
  const funde = [];
  if (!slugGueltig(slug)) funde.push('Ungültiger Slug „' + slug + '" — nur Kleinbuchstaben/Ziffern, einzelne Bindestriche, kein führender/schließender/doppelter Bindestrich.');
  let buendel = null;
  if (!bundlePfad) funde.push('--bundle fehlt.');
  else {
    const r = buendelListeAusDatei(path.resolve(bundlePfad));
    if (!r.ok) funde.push('Bündel-Datei: ' + r.fehler);
    else {
      buendel = r.liste;
      sprachdeckungPruefen(buendel, funde, null);
      if (slugGueltig(slug)) moduleVersionRegressionPruefen(buendel, ziel, slug, funde);
    }
  }
  const quellCommit = eigenerBaumUndHeadOk(funde);
  zielRepoOk(ziel, funde);
  return { funde, quellCommit, buendel };
}

function vorbedingungenAlle(ziel) {
  const funde = [];
  for (const slug of vorhandeneSlugs(ziel)) {
    const datei = path.join(ziel, MODULE_APPS_UNTERPFAD, slug, 'vorabkonfiguration.js');
    if (fs.existsSync(datei)) sprachdeckungPruefen(vorabkonfigurationLesen(datei), funde, slug);
  }
  const quellCommit = eigenerBaumUndHeadOk(funde);
  zielRepoOk(ziel, funde);
  return { funde, quellCommit };
}

/* Bewusst eine eigene, getestete Funktion statt Inline-`.map()` an der Aufrufstelle: ein
   Rot-Beweis (30.08.2026, erster echter Testlauf) — `['add', ...DATEISATZ].map(pfad)` mappt
   auch über das Literal `'add'` selbst und übergibt `git` einen kaputten ersten Dateinamen
   statt des Unterbefehls. Dry-Run allein hätte das NIE gefangen (dieser Codepfad läuft erst
   nach dem Dry-Run-Ausstieg) — genau der Grund, warum ein echter Testlauf zählt. */
function _addPfadeFuerSlug(slug, dateien) {
  return dateien.map((d) => path.join(MODULE_APPS_UNTERPFAD, slug, d));
}

function vorhandeneSlugs(ziel) {
  const basis = path.join(ziel, MODULE_APPS_UNTERPFAD);
  if (!fs.existsSync(basis)) return [];
  return fs.readdirSync(basis, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter(slugGueltig)
    .sort();
}

function packeEinzeln(ziel, slug, buendel, quellCommit, push, dryRun) {
  const zielOrdner = path.join(ziel, MODULE_APPS_UNTERPFAD, slug);
  const zielPfadRelativ = MODULE_APPS_UNTERPFAD + '/' + slug;

  process.stdout.write('modul-app-packen: Vorbedingungen erfüllt.\n');
  process.stdout.write('  Quelle: vivodepot-cleanslate/u2-kanon @ ' + quellCommit + '\n');
  process.stdout.write('  Ziel:   ' + zielOrdner + ' (' + (fs.existsSync(zielOrdner) ? 'bestehend, wird aktualisiert' : 'neu') + ')\n');
  process.stdout.write('  Bündel: ' + buendel.length + (buendel.length === 1 ? ' Modul' : ' Module') + '\n');
  process.stdout.write('  Dateien: ' + DATEISATZ.join(', ') + ', vorabkonfiguration.js\n');

  if (dryRun) { process.stdout.write('\n--dry-run: nichts geschrieben, nichts committet.\n'); return; }

  fs.mkdirSync(zielOrdner, { recursive: true });
  dateisatzUndIndexAblegen(zielOrdner);

  const ISSUER = ladeIssuer().V;
  fs.writeFileSync(path.join(zielOrdner, 'vorabkonfiguration.js'), ISSUER.vorDepotKonfigurationDateiInhalt(buendel), 'utf8');

  const nachricht = 'modul-app: ' + slug + ' gepackt (cleanslate ' + quellCommit + ')\n\n'
    + 'Kuratierter Dateisatz (' + DATEISATZ.join(', ') + ') + vorabkonfiguration.js mit '
    + buendel.length + (buendel.length === 1 ? ' signiertem Modul-Bündel' : ' signierten Modul-Bündeln') + '.\n\n'
    + 'Quelle: vivodepot-cleanslate/u2-kanon @ ' + quellCommit + '.';

  execFileSync('git', ['add', ..._addPfadeFuerSlug(slug, [...DATEISATZ, 'vorabkonfiguration.js', 'index.html'])], { cwd: ziel, env: ohneGitEnv() });
  execFileSync('git', ['commit', '-m', nachricht], { cwd: ziel, env: ohneGitEnv() });
  const zielCommit = sh('git', ['rev-parse', '--short', 'HEAD'], ziel);

  const vermerkPfad = path.join(REPO, 'docs', 'modul-app-' + slug + '-stand.md');
  fs.writeFileSync(vermerkPfad, vermerkInhalt({
    slug, zielPfad: zielPfadRelativ, zielCommit, quellCommit, anzahlBuendel: buendel.length, gepusht: push,
  }));

  process.stdout.write('\nGepackt: ' + zielPfadRelativ + ' @ ' + zielCommit + '\n');
  if (push) { execFileSync('git', ['push'], { cwd: ziel, stdio: 'inherit', env: ohneGitEnv() }); process.stdout.write('Gepusht.\n'); }
  else process.stdout.write('NICHT gepusht (--push fehlt) — Commit liegt lokal in ' + ziel + '.\n');
}

function packeAlle(ziel, quellCommit, push, dryRun) {
  const slugs = vorhandeneSlugs(ziel);
  process.stdout.write('modul-app-packen --alle: Vorbedingungen erfüllt.\n');
  process.stdout.write('  Quelle: vivodepot-cleanslate/u2-kanon @ ' + quellCommit + '\n');
  process.stdout.write('  Gefundene module-apps/*/: ' + (slugs.length ? slugs.join(', ') : '(keine)') + '\n');
  process.stdout.write('  Kopiert werden NUR: ' + DATEISATZ.join(', ') + ' — vorabkonfiguration.js bleibt unangetastet.\n');

  if (!slugs.length) { process.stdout.write('\nNichts zu tun — kein module-apps/*/-Ordner vorhanden.\n'); return; }
  if (dryRun) { process.stdout.write('\n--dry-run: nichts geschrieben, nichts committet.\n'); return; }

  const addPfade = [];
  for (const slug of slugs) {
    const zielOrdner = path.join(ziel, MODULE_APPS_UNTERPFAD, slug);
    dateisatzUndIndexAblegen(zielOrdner);
    addPfade.push(..._addPfadeFuerSlug(slug, [...DATEISATZ, 'index.html']));
  }

  const nachricht = 'modul-apps: Kern-Dateien synchronisiert (' + slugs.length + (slugs.length === 1 ? ' App' : ' Apps')
    + ') auf cleanslate ' + quellCommit + '\n\n'
    + 'Betroffen: ' + slugs.join(', ') + '. vorabkonfiguration.js je Slug unangetastet.';

  execFileSync('git', ['add', ...addPfade], { cwd: ziel, env: ohneGitEnv() });
  execFileSync('git', ['commit', '-m', nachricht], { cwd: ziel, env: ohneGitEnv() });
  const zielCommit = sh('git', ['rev-parse', '--short', 'HEAD'], ziel);

  fs.writeFileSync(path.join(REPO, 'docs', 'modul-app-resync-stand.md'),
    resyncVermerkInhalt({ slugs, zielCommit, quellCommit, gepusht: push }));

  process.stdout.write('\nSynchronisiert: ' + slugs.length + ' App(s) @ ' + zielCommit + '\n');
  if (push) { execFileSync('git', ['push'], { cwd: ziel, stdio: 'inherit', env: ohneGitEnv() }); process.stdout.write('Gepusht.\n'); }
  else process.stdout.write('NICHT gepusht (--push fehlt) — Commit liegt lokal in ' + ziel + '.\n');
}

function main() {
  const argv = process.argv.slice(2);
  const argWert = (name) => { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  const ziel = path.resolve(argWert('--ziel') || path.join(REPO, '..', 'vivodepot-ios-test'));
  const push = argv.includes('--push');
  const dryRun = argv.includes('--dry-run');
  const alle = argv.includes('--alle');
  const slug = argWert('--slug');
  const bundlePfad = argWert('--bundle');

  if (alle) {
    const { funde, quellCommit } = vorbedingungenAlle(ziel);
    if (funde.length) {
      process.stderr.write('modul-app-packen --alle: VORBEDINGUNG NICHT ERFÜLLT — es wird NICHTS synchronisiert.\n\n');
      funde.forEach((f) => process.stderr.write('  · ' + f + '\n'));
      process.exit(1);
    }
    packeAlle(ziel, quellCommit, push, dryRun);
    return;
  }

  const { funde, quellCommit, buendel } = vorbedingungenEinzeln(ziel, slug, bundlePfad);
  if (funde.length) {
    process.stderr.write('modul-app-packen: VORBEDINGUNG NICHT ERFÜLLT — es wird NICHTS gepackt.\n\n');
    funde.forEach((f) => process.stderr.write('  · ' + f + '\n'));
    process.exit(1);
  }
  packeEinzeln(ziel, slug, buendel, quellCommit, push, dryRun);
}

if (require.main === module) main();
module.exports = {
  ohneGitEnv,
  DATEISATZ, MODULE_APPS_UNTERPFAD, slugGueltig, buendelListeAusDatei,
  vermerkInhalt, resyncVermerkInhalt, vorhandeneSlugs, packeEinzeln, packeAlle, _addPfadeFuerSlug,
  vorbedingungenEinzeln, vorbedingungenAlle, sprachdeckungPruefen, vorabkonfigurationLesen,
  moduleVersionRegressionPruefen,
  dateisatzUndIndexAblegen,
};
