'use strict';
/* Code-Review 16.09.2026, A5: tools/lese-antwort-reichweite-pruefen.js trug alte (deutsche)
   Kennungen (identitaet.vorname, gesundheit.kv_nummer, sozialversicherung.pflegegrad) in seiner
   Fixture. Inert, nicht falsch (renderAntwort löst die Kennung nicht auf) — aber unrealistisch:
   kein heutiger Anbieter fragt Kennungen ab, die es im Modell nicht mehr gibt. Auf
   identity.givenName/familyName, health.insuranceNumber, socialInsurance.careLevel gezogen. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');

test('[A5·lese-antwort-reichweite-pruefen] läuft grün gegen die heutigen (englischen) Kennungen', () => {
  const ausgabe = execFileSync('node', [path.join(REPO, 'tools', 'lese-antwort-reichweite-pruefen.js')],
    { cwd: REPO, encoding: 'utf8' });
  assert.match(ausgabe, /OK — \d+ Zusicherungen erfüllt/, 'das Werkzeug muss seine eigenen Zusicherungen bestehen');
});

/* [Rot-Beweis] Der Aufruf oben prüft nur den GESUNDEN Ist-Stand — er würde auch dann grün
   bleiben, wenn das Werkzeug gar nichts mehr prüfte. Dieser Rot-Beweis nutzt den eigens dafür
   gebauten `--lesen <pfad>`-Weg (s. Kopf-Kommentar des Werkzeugs: „Rot-Beleg, ohne die
   Auslieferungsdatei zu verbiegen") gegen eine WEGWERF-KOPIE von vivodepot-lesen.html, in der
   die TEILANTWORT-Beschriftung entfernt ist — genau der MUSS-Eintrag „TEILANTWORT" (Kopf des
   Werkzeugs) darf dann nicht mehr auf dem Blatt stehen. */
test('[A5·lese-antwort-reichweite-pruefen·Rot-Beweis] eine fehlende TEILANTWORT-Beschriftung lässt das Werkzeug DRIFT melden', () => {
  const original = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
  const ANKER = "antwortTeilantwort: 'Dies ist eine TEILANTWORT. Nicht alle Angaben, nach denen Sie gefragt haben, sind enthalten.',";
  assert.equal(original.split(ANKER).length, 2, 'Anker für den Rot-Beweis trifft nicht genau einmal');
  const mutiert = original.replace(ANKER, "antwortTeilantwort: 'Alles vollstaendig.',");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lese-antwort-rotbeweis-'));
  const ziel = path.join(tmp, 'vivodepot-lesen.html');
  fs.writeFileSync(ziel, mutiert);
  try {
    let warf = false;
    try {
      execFileSync('node', [path.join(REPO, 'tools', 'lese-antwort-reichweite-pruefen.js'), '--lesen', ziel],
        { cwd: REPO, encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      warf = true;
      assert.match(e.stderr || '', /FEHLT auf dem Blatt/);
      assert.match(e.stderr || '', /DRIFT/);
    }
    assert.equal(warf, true, 'ohne die TEILANTWORT-Beschriftung MUSS das Werkzeug scheitern — sonst prüft es sie nicht wirklich');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
