'use strict';
/* Ein Laufverzeichnis mit einem Ordner unter „deny delete“ wird ganz geräumt (21.10.2026): tools/lib/temp-aufraeumen.js.
   Auf macOS bekommt das leere Home des Firefox-Starts (tools/lib/netz-sperre.js) beim ersten Start Library/ mit der ACL
   „group:everyone deny delete“. Es liegt im Laufverzeichnis, und globalTeardown räumte das vor dem Prozessende mit rmSync:
   ENOTEMPTY, jede lokale E2E unter macOS rot.
   1. Nach laufVerzeichnisRaeumen bleibt nichts, auch kein Ordner mit „deny delete“.
   2. Rot-Beweis auf darwin: derselbe Ordner widersteht einem bloßen rmSync — die ACL ist echt, ohne chmod -RN fiele 1.
   Auf anderen Plattformen gibt es die ACL nicht; dort prüft 1. das Räumen ohne sie. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const T = require('../tools/lib/temp-aufraeumen.js');

const DARWIN = process.platform === 'darwin';

// Ein Laufverzeichnis mit Library/ wie im leeren Home; auf darwin mit der ACL.
function mitGesperrtemOrdner(f) {
  const basis = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-lauf-acl-'));
  try {
    const dir = T.laufVerzeichnis(basis);
    const lib = path.join(dir, 'vd-browser-home-x', 'Library');
    fs.mkdirSync(path.join(lib, 'Caches'), { recursive: true });
    if (DARWIN) {
      const r = spawnSync('/bin/chmod', ['+a', 'group:everyone deny delete', lib], { encoding: 'utf8' });
      assert.equal(r.status, 0, 'ACL gesetzt: ' + r.stderr);
    }
    return f(dir);
  } finally {
    if (DARWIN) spawnSync('/bin/chmod', ['-RN', basis], { stdio: 'ignore' });
    fs.rmSync(basis, { recursive: true, force: true });
  }
}

test('[Laufverzeichnis·ACL] laufVerzeichnisRaeumen räumt auch einen Ordner mit „deny delete“', () => mitGesperrtemOrdner((dir) => {
  T.laufVerzeichnisRaeumen(dir);
  assert.equal(fs.existsSync(dir), false, 'nach dem Teardown ist das Laufverzeichnis weg');
}));

test('[Laufverzeichnis·ACL·Rot-Beweis] auf darwin widersteht der Ordner einem bloßen rmSync', () => mitGesperrtemOrdner((dir) => {
  let fehler = null;
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { fehler = e.code; }
  if (DARWIN) {
    assert.equal(fehler, 'ENOTEMPTY', 'die ACL ist echt: ohne chmod -RN bliebe der Ordner');
    assert.equal(fs.existsSync(dir), true);
  } else {
    assert.equal(fehler, null, 'ohne ACL räumt rmSync allein');
  }
}));
