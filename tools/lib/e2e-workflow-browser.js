'use strict';
/* ════════════════════════════════════════════════════════════════════════
   e2e-workflow-browser.js — welche Browser die E2E-Konfiguration startet und welche der öffentliche Job installiert (17.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Von v928 bis v931 war der Job e2e-reisen öffentlich rot: er installierte nur chromium, drei Specs starten WebKit selbst
   (`webkit.launch(`). Lokal lief derselbe Baum grün, weil WebKit hier im Playwright-Cache liegt. Darum liest nicht nur die
   Probe (tests/e2e-workflow-browser.test.js) diese Erhebung, sondern auch der öffentliche Lauf (tools/oeffentlicher-lauf-beleg.js):
   ein Beleg, der Browser nutzt, die die CI nicht installiert, sagt über die CI nichts.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const JOB = 'e2e-reisen';
const WORKFLOW = path.join('.github', 'workflows', 'e2e.yml');

/* Rein: die Browser, die eine Spec selbst startet (`chromium.launch(`, `firefox.launch(`, `webkit.launch(`). */
function selbstGestartet(text) {
  return [...new Set([...String(text).matchAll(/\b(chromium|firefox|webkit)\.launch(?:PersistentContext)?\(/g)].map((m) => m[1]))];
}

/* Rein: die Browser der Installationszeile im Job `job` eines Workflows (Text); null, wenn der Job fehlt. */
function installiert(workflow, job = JOB) {
  const i = workflow.indexOf('\n  ' + job + ':');
  if (i < 0) return null;
  const rest = workflow.slice(i + 1);
  const ende = rest.slice(1).search(/\n  [a-z0-9-]+:\n/);
  const block = ende < 0 ? rest : rest.slice(0, ende + 1);
  const zeile = (block.match(/npx playwright install[^\n]*/) || [])[0];
  if (!zeile) return [];
  return zeile.replace(/npx playwright install/, '').split(/\s+/).filter((w) => w && !w.startsWith('-'));
}

/* Rein: der Runner des Jobs (`runs-on:`), oder null. */
function runner(workflow, job = JOB) {
  const i = workflow.indexOf('\n  ' + job + ':');
  if (i < 0) return null;
  const m = workflow.slice(i).match(/\n    runs-on:\s*([^\n#]+)/);
  return m ? m[1].trim() : null;
}

/* Die Browser, die die Standardkonfiguration im Repo `repo` braucht: aus ihren Projekten und aus den Specs, die einen
   Browser selbst starten. Liest playwright.config.js frisch (ohne Cache), damit ein fremder Klon nicht den eigenen sieht. */
function noetigeBrowser(repo) {
  const konfigPfad = path.join(repo, 'playwright.config.js');
  delete require.cache[require.resolve(konfigPfad)];
  const konfig = require(konfigPfad);
  const ausProjekten = (konfig.projects || [{ use: konfig.use || {} }]).map((p) => (p.use || {}).browserName || (p.use || {}).defaultBrowserType || 'chromium');
  const dir = path.resolve(repo, konfig.testDir || 'tests/e2e');
  const specs = fs.readdirSync(dir, { recursive: true }).filter((d) => /\.spec\.js$/.test(d));
  const ausSpecs = specs.flatMap((d) => selbstGestartet(fs.readFileSync(path.join(dir, d), 'utf8')));
  return { browser: [...new Set([...ausProjekten, ...ausSpecs])].sort(), specs: specs.length, ausSpecs: [...new Set(ausSpecs)].sort() };
}

/* Was die Konfiguration braucht und der Job nicht installiert. `fehlend: null` heißt: der Job steht nicht im Workflow. */
function abgleich(repo) {
  const wf = fs.readFileSync(path.join(repo, WORKFLOW), 'utf8');
  const da = installiert(wf);
  const n = noetigeBrowser(repo);
  return { ...n, installiert: da, runner: runner(wf), fehlend: da ? n.browser.filter((b) => !da.includes(b)) : null };
}

module.exports = { JOB, WORKFLOW, selbstGestartet, installiert, runner, noetigeBrowser, abgleich };
