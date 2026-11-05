'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — der einmalige Beleg der Pod-Brücke gegen einen echten Pod (tools/pod-live-beleg.js, U2-ADR-512)
   ────────────────────────────────────────────────────────────────────────
   Ohne Netz: Das eingebaute erfundene Beispiel (beispiel() im Werkzeug) ist ein vollständiger Beleg. Jede Bedingung des Werkzeugs
   fällt einzeln, wenn ihr Teil im Protokoll oder in einer Messung kippt. Die Messung läuft gegen einen eingesetzten Abruf, der
   einen Pod nachstellt, und schreibt kein Token, kein Passwort und keinen Rumpf in die Messung.

   WAS DIESE PROBE HÄLT
     1. Das Beispiel besteht, auch über Dateien gelesen (protokollLesen); die Profilregel kommt aus der Brücke selbst (pod/solid-oidc.js), nicht aus einer Kopie.
     2. Rot-Beweise: Zugangsdaten oder ein Token im Protokoll, eine fehlende Messung, ein Profil ohne den Aussteller, eine Adresse
        außerhalb des Speichers oder über http, ein kurzer Link-Pfad, eine öffentlich lesbare Sicherung, ein Link mit anderen
        Bytes, ein Container, der die Ressource nennt, eine nicht byte-gleiche Sicherung, eine abgeholte Datei ohne die Form
        des Kerns, eine Ressource, die nach der Rücknahme noch lesbar ist oder Chiffrat trägt, und COOP same-origin.
     3. Die Messung trägt je Adresse Status, SHA-256 und ob ein Teil des Chiffrats im Rumpf steht, nie den Rumpf; sie schickt
        weder Cookies noch eine Autorisierung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const B = require('../tools/pod-live-beleg.js');

const kopie = (o) => JSON.parse(JSON.stringify(o));
const fixture = () => B.beispiel();
const mit = (aendern) => { const f = kopie(fixture()); aendern(f); return B.pruefen(f); };
const trifft = (befunde, muster) => assert.ok(befunde.some((x) => muster.test(x)), 'erwartet ' + muster + ', bekam ' + JSON.stringify(befunde));

test('[Pod-Live] das erfundene Beispiel ist ein vollständiger Beleg, auch aus Dateien gelesen', () => {
  assert.deepEqual(B.pruefen(fixture()), []);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pod-live-beleg-'));
  try {
    const f = fixture(); const dateien = {};
    for (const [k, v] of Object.entries(f.inhalte)) { fs.writeFileSync(path.join(dir, k + '.txt'), v); dateien[k] = k + '.txt'; }
    fs.writeFileSync(path.join(dir, 'protokoll.json'), JSON.stringify({ ...f.protokoll, dateien }));
    const g = B.protokollLesen(path.join(dir, 'protokoll.json'));
    assert.deepEqual(g.hashes, f.hashes);
    assert.deepEqual(B.pruefen({ ...g, messungen: f.messungen }), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Pod-Live] die Profilregel ist die der Brücke: Kommentar und Literal zählen nicht, das Präfix muss stimmen', () => {
  const r = B.profilRegelDerBruecke();
  assert.deepEqual(r('@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n<#me> solid:oidcIssuer <https://a.test/>.'), ['https://a.test']);
  assert.deepEqual(r('# solid:oidcIssuer <https://a.test/>\n<#me> <http://x> "solid:oidcIssuer <https://b.test/>".'), []);
  assert.deepEqual(r('@prefix solid: <http://anders.test/#>.\n<#me> solid:oidcIssuer <https://a.test/>.'), []);
  assert.throws(() => B.profilRegelDerBruecke('function andere() {}'), /ausstellerDerWebid|turtleOhneKommentarUndLiteral/);
});

test('[Pod-Live] der Speicher gilt mit jedem Präfix auf den pim-Namensraum (der Community Solid Server schreibt space:), mit einem fremden nicht', () => {
  const w = 'https://a.test/p/profile/card#me';
  assert.equal(B.speicherAusProfil('@prefix space: <http://www.w3.org/ns/pim/space#>.\n<#me> space:storage </p/>.', w), 'https://a.test/p/');
  assert.equal(B.speicherAusProfil('@prefix pim: <http://www.w3.org/ns/pim/space#>.\n<#me> pim:storage </q/>.', w), 'https://a.test/q/');
  assert.equal(B.speicherAusProfil('<#me> <http://www.w3.org/ns/pim/space#storage> </r/>.', w), 'https://a.test/r/');
  assert.equal(B.speicherAusProfil('@prefix space: <http://anders.test/#>.\n<#me> space:storage </s/>.', w), null);
});

test('[Pod-Live·Rot-Beweis] Zugangsdaten, ein Token und Chiffrat im Protokoll werden abgewiesen', () => {
  trifft(mit((f) => { f.protokoll.zugangsToken = 'x'; }), /Zugangsdaten.*zugangsToken/);
  trifft(mit((f) => { f.protokoll.passwort = 'x'; }), /Zugangsdaten.*passwort/);
  trifft(mit((f) => { f.protokoll.notiz = 'eyJhbGciOiJkaXIifQ..aXY.Y3Q.dGFn'; }), /Token- oder JWE-Form/);
  assert.deepEqual(B.geheimesImProtokoll(fixture().protokoll), []);
});

test('[Pod-Live·Rot-Beweis] eine fehlende Messung, Adresse oder Datei verhindert den Beleg', () => {
  trifft(mit((f) => { f.messungen = f.messungen.filter((m) => m.phase !== 'zurueckgenommen'); }), /Messung „zurueckgenommen“ fehlt/);
  trifft(mit((f) => { delete f.protokoll.adressen.stelle; }), /Adresse stelle fehlt/);
  trifft(mit((f) => { delete f.hashes.eigenAbgeholt; }), /Datei eigenAbgeholt fehlt/);
});

test('[Pod-Live·Rot-Beweis] Profil, Speicher und Adressen', () => {
  trifft(mit((f) => { f.messungen[0].profil = f.messungen[0].profil.replace('solid:oidcIssuer <https://pod.beispiel.test/>', 'solid:oidcIssuer <https://fremd.test/>'); }), /Aussteller steht nicht/);
  trifft(mit((f) => { f.messungen[0].profil = f.messungen[0].profil.replace(/space:storage[^.]*\./, '.'); }), /kein pim:storage/);
  trifft(mit((f) => { f.protokoll.adressen.eigen = 'https://pod.beispiel.test/andere/sicherung.vivodepot'; }), /eigen: nicht im Speicher/);
  trifft(mit((f) => { f.protokoll.adressen.stelle = f.protokoll.adressen.stelle.replace('https:', 'http:'); }), /stelle: nicht https/);
  trifft(mit((f) => { f.protokoll.adressen.link = f.protokoll.adressen.link.replace('https://', 'https://u:p@'); }), /Zugangsdaten in der Adresse/);
  trifft(mit((f) => { f.protokoll.adressen.link = f.protokoll.adressen.link.replace(/[^/]+$/, 'kurz'); }), /128 Bit Zufall/);
});

test('[Pod-Live·Rot-Beweis] abgelegt: offene Sicherung, Link mit anderen Bytes, Container nennt die Ressource', () => {
  trifft(mit((f) => { f.messungen[0].adressen.eigen.status = 200; }), /abgelegt: eigen ohne Anmeldung 200/);
  trifft(mit((f) => { f.messungen[0].adressen.stelle.status = 200; }), /abgelegt: stelle ohne Anmeldung 200/);
  trifft(mit((f) => { f.messungen[0].adressen.link.status = 401; }), /Freigabe-Link ohne Anmeldung 401/);
  trifft(mit((f) => { f.messungen[0].adressen.link.sha256 = '0'.repeat(64); }), /andere Bytes/);
  trifft(mit((f) => { f.messungen[0].container = { status: 200, nenntRessource: true }; }), /Container/);
  trifft(mit((f) => { delete f.messungen[0].container; }), /Container/);
});

test('[Pod-Live·Rot-Beweis] Sicherung nicht byte-gleich, abgeholte Datei ohne die Form des Kerns', () => {
  trifft(mit((f) => { f.hashes.eigenAbgeholt = '1'.repeat(64); }), /nicht byte-gleich/);
  trifft(mit((f) => { f.inhalte.stelleAbgeholt = 'Name: Erna Beispiel, geboren 1940'; }), /stelleAbgeholt: besteht die Tür/);
  trifft(mit((f) => { f.inhalte.linkAbgeholt = f.inhalte.eigenAbgeholt; }), /linkAbgeholt: besteht die Tür/);
});

test('[Pod-Live·Rot-Beweis] zurückgenommen: noch lesbar oder Chiffrat im Rumpf; COOP same-origin', () => {
  trifft(mit((f) => { f.messungen[1].adressen.link.status = 200; }), /zurückgenommen: link ohne Anmeldung 200/);
  trifft(mit((f) => { f.messungen[1].adressen.eigen.traegtChiffrat = true; }), /Rumpf von eigen/);
  trifft(mit((f) => { delete f.messungen[1].adressen.stelle.traegtChiffrat; }), /Rumpf von stelle/);
  trifft(mit((f) => { f.messungen[0].coop = 'same-origin'; }), /same-origin/);
  trifft(mit((f) => { delete f.messungen[0].coop; }), /ungemessen/);
  assert.deepEqual(mit((f) => { f.messungen[0].coop = 'same-origin-allow-popups'; }), []);
});

test('[Pod-Live] die Messung trägt nie einen Rumpf und schickt weder Cookies noch Autorisierung', async () => {
  const g = B.beispiel();
  const fixMessung = g.messungen[0];
  const anfragen = [];
  const antwort = (status, text, kopf = {}) => ({ status, text: async () => text, headers: { get: (k) => kopf[k.toLowerCase()] || null } });
  const abruf = async (url, opt) => {
    anfragen.push({ url, opt });
    if (url === g.protokoll.adressen.link) return antwort(200, g.inhalte.linkAbgeholt);
    if (url.startsWith(g.protokoll.webid.split('#')[0])) return antwort(200, fixMessung.profil);
    if (url.endsWith('/.well-known/openid-configuration')) return antwort(200, JSON.stringify({ authorization_endpoint: 'https://pod.beispiel.test/.oidc/auth' }));
    if (url === 'https://pod.beispiel.test/.oidc/auth') return antwort(200, '', { 'cross-origin-opener-policy': 'unsafe-none' });
    return antwort(401, 'Unauthorized');
  };
  const m = await B.messen({ ...g, phase: 'abgelegt', abruf });
  assert.equal(m.adressen.link.status, 200);
  assert.equal(m.adressen.link.sha256, g.hashes.linkAbgeholt);
  assert.equal(m.adressen.eigen.status, 401);
  assert.equal(m.coop, 'unsafe-none');
  assert.equal(m.container.nenntRessource, false);
  for (const a of anfragen) {
    assert.equal(a.opt.credentials, 'omit');
    assert.equal(a.opt.redirect, 'manual');
    assert.ok(!Object.keys(a.opt.headers || {}).some((k) => /authorization|dpop|cookie/i.test(k)), a.url);
  }
  const ohneProfil = JSON.stringify({ ...m, profil: undefined });
  assert.ok(!ohneProfil.includes(g.inhalte.linkAbgeholt.slice(40, 80)), 'kein Rumpf in der Messung');
  const zu = await B.messen({ ...g, phase: 'zurueckgenommen', abruf: async (u, o) => { anfragen.push({ url: u, opt: o }); return antwort(401, 'Unauthorized'); } });
  assert.deepEqual(B.pruefen({ ...g, messungen: [{ ...m, profil: fixMessung.profil }, zu] }), []);
});
