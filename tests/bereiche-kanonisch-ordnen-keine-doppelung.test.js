'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   `_bereicheKanonischOrdnen` — die Probe, die neun Tage lang fehlte
   ────────────────────────────────────────────────────────────────────────────
   HERKUNFT (18.09.2026, Auftrag): seit Commit c124525d (09.09.2026,
   „die Ab-Werk-Saat läuft beim Booten") können `basis` (SEKTOREN, seither ein
   Spiegel von `bereicheAlle()`) und `registry` (`_BEREICHS_MODUL_REGISTRY`)
   dieselbe ID tragen — vorher galten sie als disjunkt. Zwei unabhängige Funde
   dieses Jahrgangs haben das für je EINEN Zweig von `_bereicheKanonischOrdnen`
   geschlossen: den nativen (Commit d0317fb6, „26 statt 13") und den fremden
   (Patch `vdm1-pro-identity-und-dublettensperre-2026-09-18`, „12 statt 6" an Pro).

   KEINER DER BEIDEN FUNDE HINTERLIESS EINE PROBE AM FERTIGEN PRODUKT. Die
   einzige bestehende Messung an echten, konfektionierten Produkten
   (`tests/vier-produkte-vermessen.test.js`, `[produktVermessen]`) prüft nur
   `bereicheAnzahl > 0` und die Selbst-Konsistenz der Feldsumme — nie
   Dublettenfreiheit, nie eine erwartete ID-Menge. Deshalb stand die Verdopplung
   neun Tage, ohne dass eine einzige der bestehenden Proben es meldete.

   DIESE PROBE HÄLT DREI DINGE, STRUKTURELL, NICHT AUF EINE ZAHL FESTGENAGELT:
   1. Alle vier echten, über `konfektionieren()` gebauten Produkte: `bereicheAlle()`
      deckungsgleich mit `SEKTOREN`, keine ID doppelt.
   2. Ein Rot-Beweis je Zweig (nativ UND fremd) — derselbe Dublettenwächter
      probeweise deaktiviert, die Verdopplung muss zurückkommen.
   3. Der Zusatztemplate-Weg (ein selbst geladenes Bereichs-Modul über
      `_bereichsModuleAusDepotAnmelden`, derselbe `fremd`-Zweig wie ein
      fremdes Produkt) — kein Sonderfall, dieselbe Probe muss auch dort halten,
      selbst wenn dasselbe Modul zweimal angemeldet wird (z. B. Datei erneut
      geöffnet).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const LOAD_KERN = require.resolve('./load-kern.js');

function ladeGebautesKern(htmlQuelle, slug) {
  const p = PRODUKTE.find((x) => x.slug === slug);
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-dedup-' + slug + '-'));
  try {
    const r = konfektionieren({
      ziel, slug, modulauswahl: [], kernQuelle: htmlQuelle,
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    const vorher = process.env.KERN_HTML_PATH;
    process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
    delete require.cache[require.resolve(LOAD_KERN)];
    try {
      return require(LOAD_KERN).ladeKern();
    } finally {
      if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
      delete require.cache[require.resolve(LOAD_KERN)];
    }
  } finally {
    fs.rmSync(ziel, { recursive: true, force: true });
  }
}

function keineDubletten(alle) {
  return alle.filter((id, i) => alle.indexOf(id) !== i);
}

/* ══ Teil 1 · alle vier echten Produkte, keine Dublette ══════════════════ */

for (const p of PRODUKTE) {
  test('[Dedup·' + p.slug + '] bereicheAlle() liefert jede ID genau einmal, deckungsgleich mit SEKTOREN', () => {
    const { V } = ladeGebautesKern(undefined, p.slug);
    const alle = V.bereicheAlle().map((s) => s.id);
    assert.deepEqual(keineDubletten(alle), [],
      'ROT ERWARTET, wenn falsch: mindestens eine ID steht zweimal');
    assert.equal(alle.length, V.SEKTOREN.length,
      p.slug + ': SEKTOREN ist die ANZEIGE-Obergrenze — jede Abweichung nach oben ist eine Duplizierung, nach unten ein Verlust');
  });
}

/* ══ Teil 2 · Rot-Beweis je Zweig — der Wächter deaktiviert, die Dublette muss zurückkommen ══ */

const NATIVER_WAECHTER = 'if (liste.some((x) => x.id === s.id)) continue;';
const FREMDER_WAECHTER = 'if (liste.some((x) => x.id === s.id) || fremd.some((x) => x.id === s.id)) continue;';

test('[Rot-Beweis·nativer Zweig] Wächter deaktiviert → identity dupliziert wieder', () => {
  const html = fs.readFileSync(KERN_PFAD, 'utf8');
  const treffer = html.split(NATIVER_WAECHTER).length - 1;
  assert.equal(treffer, 1, 'der native Wächter-Text muss genau einmal im Kern stehen — sonst prüft dieser Rot-Beweis den falschen Text');
  const kaputt = html.replace(NATIVER_WAECHTER, 'if (false) continue; /* [ROT-BEWEIS-TEMP] */');
  const { V } = ladeGebautesKern(kaputt, 'privat-de');
  const alle = V.bereicheAlle().map((s) => s.id);
  assert.ok(keineDubletten(alle).length > 0,
    'mit deaktiviertem nativen Wächter MUSS mindestens eine native ID doppelt erscheinen — sonst hält der Wächter nicht das, was er zu halten behauptet');
});

test('[Rot-Beweis·fremder Zweig] Wächter deaktiviert → eine Pro-ID dupliziert wieder', () => {
  const html = fs.readFileSync(KERN_PFAD, 'utf8');
  const treffer = html.split(FREMDER_WAECHTER).length - 1;
  assert.equal(treffer, 1, 'der fremde Wächter-Text muss genau einmal im Kern stehen — sonst prüft dieser Rot-Beweis den falschen Text');
  const kaputt = html.replace(FREMDER_WAECHTER, 'if (false) continue; /* [ROT-BEWEIS-TEMP] */');
  const { V } = ladeGebautesKern(kaputt, 'pro-de');
  const alle = V.bereicheAlle().map((s) => s.id);
  assert.ok(keineDubletten(alle).length > 0,
    'mit deaktiviertem fremden Wächter MUSS mindestens eine Pro-ID doppelt erscheinen — sonst hält der Wächter nicht das, was er zu halten behauptet');
});

/* ══ Teil 3 · Zusatztemplates sind kein Sonderfall — derselbe fremd-Zweig über die Anmeldung ══ */

test('[Zusatztemplate] ein selbst geladenes Bereichs-Modul erscheint genau einmal, auch nach zweiter Anmeldung', () => {
  const { V } = ladeGebautesKern(undefined, 'privat-de');
  const modul = {
    modulTyp: 'bereich', sprache: 'de', moduleVersion: 1,
    herkunft: 'buergerin-eigenes-hochgeladenes-template',
    bereiche: { 'zz-eigenes-hobby-archiv': { label: 'Mein Hobby-Archiv', icon: 'folder' } },
  };
  const d = V.leeresDepot();
  d.bereichsModule = [modul];
  V.setData(d);
  V._bereichsModuleAusDepotAnmelden(d);
  let alle = V.bereicheAlle().map((s) => s.id);
  assert.equal(alle.filter((id) => id === 'zz-eigenes-hobby-archiv').length, 1,
    'ein frisch angemeldetes Zusatztemplate muss genau einmal erscheinen');

  // Zweite Anmeldung DESSELBEN Moduls — realistisch beim erneuten Öffnen derselben Datei.
  V._bereichsModuleAusDepotAnmelden(d);
  alle = V.bereicheAlle().map((s) => s.id);
  assert.equal(alle.filter((id) => id === 'zz-eigenes-hobby-archiv').length, 1,
    'ROT ERWARTET, wenn falsch: eine zweite Anmeldung desselben Zusatztemplates darf keine zweite ID erzeugen — derselbe fremd-Zweig, den der Pro-Fund betraf');
  assert.deepEqual(keineDubletten(alle), [], 'auch der Rest des Katalogs bleibt dublettenfrei nach der zweiten Anmeldung');
});
