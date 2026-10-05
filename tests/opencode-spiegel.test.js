'use strict';
/* opencode-spiegel.test.js — der Spiegel trägt das signierte Tag unverändert und legt das Release an (02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Beim Release v1.0.857 kam das Tag flach auf openCoDE an; Tag, Release und Pakete wurden danach von Hand nachgeschoben.
   tools/opencode-spiegel.js und der Workflow holen die Tags annotiert, schieben nur das auslösende Tag, prüfen vorher
   Annotation und Signatur und legen danach das Release an, mit Zurücklesen.
   ROT-BEWEISE: ein leichtgewichtiges Tag fällt; ein unsigniertes Tag ab v1.0.857 fällt; ein Tag-Lauf schiebt nie mehr als
   sein Tag; ein abweichend zurückgelesenes Paket bricht ab; ein abgelaufenes Token bricht ab; der Workflow schiebt nicht
   mehr pauschal alle v*-Tags. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../tools/opencode-spiegel.js');
const R = require('../tools/opencode-release-vorbereiten.js');

const REPO = path.join(__dirname, '..');

test('[Spiegel] ein Tag-Lauf schiebt genau sein Tag, ein main-Lauf nur main', () => {
  assert.deepEqual(S.spiegelPlan({ refTyp: 'tag', refName: 'v1.0.857', ereignis: 'push' }).refspecs, ['refs/tags/v1.0.857:refs/tags/v1.0.857']);
  assert.deepEqual(S.spiegelPlan({ refTyp: 'branch', refName: 'main', ereignis: 'push' }).refspecs, ['refs/remotes/origin/main:refs/heads/main']);
  assert.deepEqual(S.spiegelPlan({ refTyp: 'branch', refName: 'x', ereignis: 'workflow_dispatch' }).refspecs, ['refs/remotes/origin/main:refs/heads/main']);
  assert.match(S.spiegelPlan({ refTyp: 'tag', refName: 'quelle-v1.0.857', ereignis: 'push' }).fehler, /kein Fassungs-Tag/);
});

test('[Spiegel·Rot-Beweis] leichtgewichtig fällt; unsigniert ab v1.0.857 fällt; ältere Tags brauchen keine Signatur', () => {
  const annotiert = { art: () => 'tag', signaturGut: () => true };
  assert.equal(S.tagPruefen('v1.0.857', annotiert).ok, true);
  assert.match(S.tagPruefen('v1.0.857', { art: () => 'commit', signaturGut: () => true }).grund, /leichtgewichtig/);
  assert.match(S.tagPruefen('v1.0.858', { art: () => 'tag', signaturGut: () => false }).grund, /keine gute Signatur/);
  assert.equal(S.tagPruefen('v1.0.843', { art: () => 'tag', signaturGut: () => false }).ok, true);
  assert.equal(S.ERSTE_SIGNIERTE, 857);
});

test('[Spiegel·Rot-Beweis] Token: unter 14 Tagen Warnung, abgelaufen Abbruch, ohne Ablauf still', () => {
  const heute = new Date(Date.UTC(2026, 9, 2));
  assert.deepEqual(S.tokenFrist('2026-10-15', heute), { tage: 13, warnen: true, abgelaufen: false });
  assert.deepEqual(S.tokenFrist('2026-10-30', heute), { tage: 28, warnen: false, abgelaufen: false });
  assert.equal(S.tokenFrist('2026-10-02', heute).abgelaufen, true);
  assert.deepEqual(S.tokenFrist(null, heute), { tage: null, warnen: false, abgelaufen: false });
});

test('[Spiegel·Rot-Beweis] ein persönliches Token fällt, ein ungemessenes auch; ein Projekt-Token geht', () => {
  assert.equal(S.tokenArt({ bot: true, username: 'project_10391_bot' }).ok, true);
  assert.match(S.tokenArt({ bot: false, username: 'jemand' }).grund, /gehört einer Person/);
  assert.match(S.tokenArt({ username: 'x' }).grund, /ungemessen/);
  assert.match(S.tokenArt(null).grund, /ungemessen/);
});

function falscheAblage({ releaseBesteht = false, verfaelschen = null } = {}) {
  const pakete = new Map();
  let release = null;
  const aufrufe = [];
  const api = async (methode, pfad, { body, datei, binaer } = {}) => {
    aufrufe.push(methode + ' ' + pfad);
    if (pfad.startsWith('/releases/')) {
      if (releaseBesteht || release) return { status: 200, text: JSON.stringify(release || { assets: { links: new Array(7).fill({}) } }) };
      return { status: 404, text: '' };
    }
    if (methode === 'POST' && pfad === '/releases') { release = JSON.parse(body); return { status: 201, text: '' }; }
    const name = pfad.split('/').pop();
    if (methode === 'PUT') { pakete.set(name, fs.readFileSync(datei)); return { status: 201, text: '' }; }
    if (methode === 'GET' && binaer) {
      if (releaseBesteht && !pakete.has(name)) pakete.set(name, fs.readFileSync(path.join(R.FIXTURE, name === 'SHA256SUMS' ? 'vivodepot.html' : name)));
      const b = pakete.get(name);
      return { status: b ? 200 : 404, buffer: name === verfaelschen ? Buffer.from('anders') : b };
    }
    return { status: 400, text: '' };
  };
  return { api, aufrufe };
}

test('[Spiegel] Release anlegen: sieben Pakete, ein Release, alles zurückgelesen', async () => {
  const { api, aufrufe } = falscheAblage();
  const r = await S.veroeffentlichen({ tag: 'v1.0.1', quelle: R.FIXTURE, api });
  assert.equal(r.dateien, 7);
  assert.equal(aufrufe.filter((a) => a.startsWith('PUT ')).length, 7);
  assert.equal(aufrufe.filter((a) => a === 'POST /releases').length, 1);
});

test('[Spiegel·Rot-Beweis] ein abweichend zurückgelesenes Paket bricht ab; ein bestehendes Release wird nicht neu beladen', async () => {
  await assert.rejects(() => S.veroeffentlichen({ tag: 'v1.0.1', quelle: R.FIXTURE, api: falscheAblage({ verfaelschen: 'vivodepot-lesen.html' }).api }),
    /vivodepot-lesen\.html auf openCoDE weicht ab/);
  const { api, aufrufe } = falscheAblage({ releaseBesteht: true, verfaelschen: 'SHA256SUMS' });
  await assert.rejects(() => S.veroeffentlichen({ tag: 'v1.0.1', quelle: R.FIXTURE, api }), /SHA256SUMS auf openCoDE weicht ab/);
  assert.equal(aufrufe.filter((a) => a.startsWith('PUT ') || a.startsWith('POST ')).length, 0, 'nichts hochgeladen');
});

test('[Spiegel·Wächter] der Workflow holt die Tags annotiert, prüft vor dem Schieben und schiebt nur nach Plan', () => {
  const wf = fs.readFileSync(path.join(REPO, '.github', 'workflows', 'mirror-to-opencode.yml'), 'utf8');
  const holen = wf.indexOf("git fetch --force --no-tags origin '+refs/tags/*:refs/tags/*'");
  const pruefen = wf.indexOf('node tools/opencode-spiegel.js --pruefen');
  const schieben = wf.indexOf('node tools/opencode-spiegel.js --plan');
  const release = wf.indexOf('node tools/opencode-spiegel.js --release');
  assert.ok(holen > 0 && holen < pruefen && pruefen < schieben && schieben < release, 'Reihenfolge holen → prüfen → schieben → Release');
  assert.ok(!wf.includes("'refs/tags/v*:refs/tags/v*'"), 'kein pauschales Schieben aller Tags');
  assert.ok(!/--force[^\n]*gitlab|push[^\n]*--force/.test(wf), 'kein Überschreiben auf openCoDE');
  assert.match(wf, /vivodepot\.de\/\.well-known\/vivodepot-allowed-signers/);
  assert.match(wf, /environment: \$\{\{ github\.ref_type == 'tag' && 'opencode-spiegel-release' \|\| 'opencode-spiegel' \}\}/, 'Job im Environment, Tags mit eigener Freigabe');
  assert.match(wf, /^permissions:\n  contents: read$/m);
  assert.match(wf, /persist-credentials: false/);
});
