'use strict';
/* U2-ADR-501 Abschnitt B (Punkte 9 und 10) — die Kennung der Stelle entsteht an EINER Stelle: `stellenKennung` im STELLENKENNUNG-BLOCK.
   Der Block steht in Kern (vivodepot.html; genutzt erst mit der Ableitung je Stelle und dem Signieren) und Lese-App (vivodepot-lesen.html;
   liest damit `aud`) zeichengleich. Liefen die zwei Kopien auseinander, signierte der Kern für eine Kennung, die die Lese-App anders
   schreibt — jede Antwort fiele als „für eine andere Stelle signiert“ durch, oder schlimmer: zwei Stellen fielen zusammen.
   Gehalten wird: beide Kopien genau einmal und zeichengleich; beide liefern auf der Vektorliste (Schreibweisen, Domänen, Präfixe)
   dasselbe und das Erwartete. Rot-Beweis: eine geänderte Kopie fällt an beiden Prüfungen auf.
   GERÜST-TEST: liest den Quelltext beider Dateien und führt den Block je für sich aus. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const WURZEL = path.join(__dirname, '..');
const ANFANG = '/* ══ STELLENKENNUNG-BLOCK (U2-ADR-501';
const ENDE = '/* ══ ENDE STELLENKENNUNG-BLOCK ══ */';
// Seit V3b (U2-ADR-501) auch im Studio: es liest signierte Antworten mit demselben Block.
const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html'];

function block(text) {
  const a = text.indexOf(ANFANG), e = text.indexOf(ENDE);
  if (a < 0 || e < a || text.indexOf(ANFANG, a + 1) >= 0) return null;
  return text.slice(a, e + ENDE.length);
}
function ausfuehren(quelle) {
  const kontext = { TextEncoder };
  vm.createContext(kontext);
  vm.runInContext(quelle + '\n;globalThis.__SK__ = { stellenKennung, stellenKennungTeile };', kontext);
  return kontext.__SK__;
}

// [Eingabe, erwartete Kennung]
const VEKTOREN = [
  [{ ausZertifikat: true, art: 'anbieter', kennung: 'heim/sonnenhof' }, 'signiert:anbieter:0014:heim/sonnenhof'],
  [{ ausZertifikat: true, art: 'anbieter', kennung: '  Heim/Sonnenhof ' }, 'signiert:anbieter:0014:heim/sonnenhof'],
  [{ ausZertifikat: false, kennung: 'heim/sonnenhof' }, 'unsigniert:0014:heim/sonnenhof'],
  [{ ausZertifikat: false, kennung: 'HEIM/Sonnenhof' }, 'unsigniert:0014:heim/sonnenhof'],
  [{ ausZertifikat: true, art: 'dns', kennung: 'Verifier.Example.ORG.' }, 'signiert:dns:0020:verifier.example.org'],
  [{ ausZertifikat: true, art: 'dns', kennung: 'verifier.example.org' }, 'signiert:dns:0020:verifier.example.org'],
  [{ ausZertifikat: true, art: 'org', kennung: ' VATDE-123456789 ' }, 'signiert:org:0015:VATDE-123456789'],
  [{ ausZertifikat: true, art: 'org', kennung: 'vatde-123456789' }, 'signiert:org:0015:vatde-123456789'],
  [{ ausZertifikat: true, art: 'anbieter', kennung: 'praxis/müller' }, 'signiert:anbieter:0014:praxis/müller'],
  // Eine Kennung, die selbst wie eine Domäne aussieht, bleibt Teil der Kennung — das Längenpräfix trennt.
  [{ ausZertifikat: false, kennung: 'signiert:anbieter:0004:heim' }, 'unsigniert:0027:signiert:anbieter:0004:heim'],
  // Ungültig: ohne Kennung, leer, Steuerzeichen, unbekannte Art, Art in der Domäne unsigniert:, DNS mit fremden Zeichen, ohne Domäne.
  [{ ausZertifikat: true, art: 'anbieter' }, null],
  [{ ausZertifikat: true, art: 'anbieter', kennung: '   ' }, null],
  [{ ausZertifikat: true, art: 'anbieter', kennung: 'heim\nsonnenhof' }, null],
  [{ ausZertifikat: true, art: 'x509', kennung: 'heim' }, null],
  [{ ausZertifikat: false, art: 'anbieter', kennung: 'heim' }, null],
  [{ ausZertifikat: true, art: 'dns', kennung: 'verifier..example.org' }, null],
  [{ ausZertifikat: true, art: 'dns', kennung: 'verifier example.org' }, null],
  [{ art: 'anbieter', kennung: 'heim' }, null],
  [null, null],
];

function befunde(texte) {
  const f = [];
  const b = texte.map(block);
  texte.forEach((_, i) => { if (!b[i]) f.push(DATEIEN[i] + ': Block fehlt oder steht mehrfach'); });
  if (f.length) return f;
  if (b.some((x) => x !== b[0])) f.push('die Kopien sind nicht zeichengleich');
  const sk = b.map(ausfuehren);
  for (const [ein, soll] of VEKTOREN) {
    const ist = sk.map((x) => x.stellenKennung(ein));
    if (ist.some((v) => v !== ist[0])) f.push('verschieden für ' + JSON.stringify(ein) + ': ' + JSON.stringify(ist));
    else if (ist[0] !== soll) f.push('unerwartet für ' + JSON.stringify(ein) + ': ' + JSON.stringify(ist[0]) + ' statt ' + JSON.stringify(soll));
    if (soll !== null) {
      for (const x of sk) {
        const t = x.stellenKennungTeile(soll);
        if (!t || x.stellenKennung(t) !== soll) f.push('Umkehrung trägt nicht für ' + soll);
      }
    }
  }
  // Eine nicht normalisierte oder falsch lange Kennung ist keine.
  for (const x of sk) {
    if (x.stellenKennungTeile('signiert:anbieter:0014:Heim/Sonnenhof') !== null) f.push('Umkehrung nimmt eine nicht normalisierte Kennung');
    if (x.stellenKennungTeile('signiert:anbieter:0013:heim/sonnenhof') !== null) f.push('Umkehrung nimmt eine falsche Länge');
  }
  return f;
}
const lesen = () => DATEIEN.map((d) => fs.readFileSync(path.join(WURZEL, d), 'utf8'));

test('[Stellenkennung·Spiegel] Kern und Lese-App tragen den Block genau einmal, zeichengleich, mit denselben Ergebnissen', () => {
  assert.deepEqual(befunde(lesen()), []);
});
test('[Stellenkennung·Spiegel·Rot-Beweis] eine Kopie ohne Kleinschreibung der DNS-Namen fällt auf — am Text und am Ergebnis', () => {
  const texte = lesen();
  const alt = "      k = k.replace(/[A-Z]/g, (c) => c.toLowerCase()).replace(/\\.$/, '');";
  assert.equal(texte[1].split(alt).length, 2, 'Vorbedingung: die Zeile steht in der Lese-App genau einmal');
  texte[1] = texte[1].replace(alt, "      k = k.replace(/\\.$/, '');");
  const f = befunde(texte);
  assert.ok(f.includes('die Kopien sind nicht zeichengleich'), f.join('\n'));
  assert.ok(f.some((z) => z.startsWith('verschieden für')), 'auch das Ergebnis weicht ab: ' + f.join('\n'));
});
test('[Stellenkennung·Domänen] eine unsignierte Kennung ergibt nie die Kennung einer geprüften Stelle', () => {
  const sk = ausfuehren(block(lesen()[1]));
  for (const k of ['heim/sonnenhof', 'Heim/Sonnenhof', 'verifier.example.org']) {
    const u = sk.stellenKennung({ ausZertifikat: false, kennung: k });
    for (const art of ['anbieter', 'dns', 'org']) assert.notEqual(u, sk.stellenKennung({ ausZertifikat: true, art, kennung: k }));
  }
});
