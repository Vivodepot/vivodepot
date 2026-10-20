'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   studio-tresor-nachweis-zeichnen.test.js — der zweite, benannte Griff des Schlüssel-Tresors (16.10.2026, Nachtrag U2-ADR-436)
   ───────────────────────────────────────────────────────────────────────────
   SCHLUESSEL_TRESOR.nachweisZeichnen zeichnet den Besitznachweis der Antragsdatei:
     · genau ein sign, höchstens einmal je geladenem Schlüssel (der zweite Aufruf wirft und zeichnet nicht);
     · nur auf einen echten, frischen Klick am Knopf sk-antrag (unechter Klick, alter Klick, Paket-Knopf: abgewiesen);
     · Zeile 1 (Kennung) und Zeile 3 (Fingerabdruck des gehaltenen Schlüssels) setzt der Tresor selbst; ein Text mit anderer
       Zeile 1, ein vom Aufrufer mitgegebenes Kennungs- oder Fingerabdruck-Feld und eine andere Art kommen nicht zum sign;
     · danach bleibt der Schlüssel für genau ein Paket; neu geladen gibt es wieder genau einen Nachweis.
   Gezählt wird jeder crypto.subtle.sign, den das Studio auslöst. Die Angaben sind erfunden.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeGenerator } = require('./load-generator.js');

const PW = 'probe-passwort-nachweis';   // frei erfunden, nur hier
const ANTRAG_ID = '0123456789abcdef0123456789abcdef';
const klick = (extra) => Object.assign({ isTrusted: true, currentTarget: { id: 'sk-antrag' }, timeStamp: performance.now() }, extra || {});

async function aufbau() {
  const gen = ladeGenerator();
  const zaehler = { sign: 0 };
  const echt = gen.sandbox.crypto;
  gen.sandbox.crypto = {
    getRandomValues: (a) => echt.getRandomValues(a),
    randomUUID: () => echt.randomUUID(),
    subtle: new Proxy(echt.subtle, { get(t, p) { const f = t[p]; if (typeof f !== 'function') return f; return p === 'sign' ? (...x) => { zaehler.sign++; return f.apply(t, x); } : f.bind(t); } }),
  };
  const V = gen.V;
  const r = await V.SCHLUESSEL_TRESOR.erzeugen({ passwort: PW });
  let huelle = null;
  V.SCHLUESSEL_TRESOR.privatHerunterladen((t) => { huelle = t; });
  const anbieter = V.baueAnbieter({ anbieterName: 'Stadtwerke Musterstadt', rechtsform: 'GmbH', strasse: 'Am Markt 1', plz: '12345', ort: 'Musterstadt',
    land: 'Deutschland', kontaktName: 'Erika Beispiel', kontaktEmail: 'register@beispiel-einrichtung.example' });
  const gebaut = await V.baueAntragsdatei({ anbieter, publicJwk: r.publicJwk, antragId: ANTRAG_ID, ausstelltag: '2026-10-16' });
  return { V, T: V.SCHLUESSEL_TRESOR, publicJwk: r.publicJwk, huelle, gebaut, zaehler };
}

async function prueftGegen(V, publicJwk, eingabe, besitznachweis) {
  const zeilen = V.nachweisZeilen({ art: 'zertifikat', antragId: eingabe.antragId, schluesselFingerabdruck: await V._jwkThumbprint(publicJwk),
    angabenFingerabdruck: eingabe.angabenFingerabdruck, konto: eingabe.konto, ausstelltag: eingabe.ausstelltag });
  assert.equal(zeilen.split('\n')[0], 'vivodepot-herausgeber-besitznachweis/2');
  const pub = await webcrypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: publicJwk.x }, { name: 'Ed25519' }, false, ['verify']);
  return webcrypto.subtle.verify({ name: 'Ed25519' }, pub, Buffer.from(besitznachweis, 'base64url'), new TextEncoder().encode(zeilen));
}

/* Die Diskriminante beider Proben (PROBEN unten, U2-ADR-099 B-1): zeichnet ein weiterer Aufruf nach dem ersten Nachweis? */
async function zweiterAufrufZeichnet(T, eingabe) {
  try { await T.nachweisZeichnen(klick(), eingabe); return true; } catch (_) { return false; }
}

test('[Studio·Tresor·Nachweis] einmal je Schlüssel, nur echter frischer Klick an sk-antrag, nie fremde Zeile 1; danach genau ein Paket', async () => {
  const { V, T, publicJwk, huelle, gebaut, zaehler } = await aufbau();
  assert.equal(V.SCHLUESSEL_NACHWEIS_KNOPF, 'sk-antrag');
  const abweisungen = [
    ['unechter Klick', klick({ isTrusted: false }), gebaut.eingabe],
    ['falscher Knopf (Paket)', klick({ currentTarget: { id: 'pr-submit' } }), gebaut.eingabe],
    ['alter Klick', klick({ timeStamp: performance.now() - 5000 }), gebaut.eingabe],
    ['Text mit anderer Zeile 1', klick(), ['vivodepot-anderer-zweck/1', ANTRAG_ID].join('\n')],
    ['Kennung vom Aufrufer', klick(), { ...gebaut.eingabe, kennung: 'vivodepot-anderer-zweck/1' }],
    ['Fingerabdruck vom Aufrufer', klick(), { ...gebaut.eingabe, schluesselFingerabdruck: 'A'.repeat(43) }],
    ['art vorlage', klick(), { ...gebaut.eingabe, art: 'vorlage' }],
  ];
  for (const [was, ev, eingabe] of abweisungen) {
    await assert.rejects(() => T.nachweisZeichnen(ev, eingabe), was);
    assert.equal(zaehler.sign, 0, was + ': kein sign');
    assert.equal(T.zustand().vorhanden, true, was + ': die Abweisung verbraucht den Schlüssel nicht');
  }
  const g = await T.nachweisZeichnen(klick(), gebaut.eingabe);
  assert.equal(zaehler.sign, 1);
  assert.match(g.besitznachweis, /^[A-Za-z0-9_-]{86}$/);
  assert.equal(g.schluesselFingerabdruck, await V._jwkThumbprint(publicJwk));
  assert.ok(await prueftGegen(V, publicJwk, gebaut.eingabe, g.besitznachweis), 'der Nachweis prüft gegen den öffentlichen Schlüssel');
  assert.equal(await zweiterAufrufZeichnet(T, gebaut.eingabe), false, 'zweiter Aufruf');
  assert.equal(zaehler.sign, 1, 'der zweite Aufruf zeichnet nicht');
  // Der Schlüssel bleibt für genau ein Paket, dann ist er fort.
  assert.equal(T.zustand().vorhanden, true);
  let paket = false;
  await T.signiereEinmal(klick({ currentTarget: { id: 'pr-submit' } }), async (k) => { paket = !!k; });
  assert.ok(paket);
  assert.equal(T.zustand().vorhanden, false);
  await assert.rejects(() => T.nachweisZeichnen(klick(), gebaut.eingabe), 'ohne Schlüssel');
  // Neu geladen: wieder genau ein Nachweis, derselbe (Ed25519 ist deterministisch).
  await T.ausDatei(JSON.parse(huelle), PW);
  const g2 = await T.nachweisZeichnen(klick(), gebaut.eingabe);
  assert.equal(g2.besitznachweis, g.besitznachweis);
  assert.equal(await zweiterAufrufZeichnet(T, gebaut.eingabe), false, 'zweiter Aufruf nach dem Laden');
});

test('[Studio·Tresor·Nachweis·Rot-Beweis] eine Fassung ohne Sperre gegen den zweiten Aufruf zeichnet zweimal und fällt auf', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
  const sperre = "      if (nachweisGezeichnet) throw new Error(";
  assert.equal(html.split(sperre).length, 2, 'die Sperre steht genau einmal');
  const ohne = html.replace(sperre, '      if (false) throw new Error(');
  const gen = ladeGenerator({ html: ohne });
  const T = gen.V.SCHLUESSEL_TRESOR;
  const r = await T.erzeugen({ passwort: PW });
  const anbieter = gen.V.baueAnbieter({ anbieterName: 'Stadtwerke Musterstadt', rechtsform: 'GmbH', strasse: 'Am Markt 1', plz: '12345', ort: 'Musterstadt',
    land: 'Deutschland', kontaktName: 'Erika Beispiel', kontaktEmail: 'register@beispiel-einrichtung.example' });
  const gebaut = await gen.V.baueAntragsdatei({ anbieter, publicJwk: r.publicJwk, antragId: ANTRAG_ID, ausstelltag: '2026-10-16' });
  await T.nachweisZeichnen(klick(), gebaut.eingabe);
  assert.equal(await zweiterAufrufZeichnet(T, gebaut.eingabe), true, 'ohne Sperre geht der zweite Aufruf durch — die Probe oben sähe das');
});

module.exports = {
  PROBEN: [
    { fuer: '[Studio·Tresor·Nachweis] einmal je Schlüssel, nur echter frischer Klick an sk-antrag, nie fremde Zeile 1; danach genau ein Paket', diskriminante: zweiterAufrufZeichnet },
    { fuer: '[Studio·Tresor·Nachweis·Rot-Beweis] eine Fassung ohne Sperre gegen den zweiten Aufruf zeichnet zweimal und fällt auf', diskriminante: zweiterAufrufZeichnet },
  ],
};
