'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-339 (vorläufig, Nummer beim Landen zu bestätigen) — Design-Namensraum:
   Typprüfung statt Namensliste (06.09.2026, Auftrag)
   ────────────────────────────────────────────────────────────────────────
   Gemessen, nicht angenommen: 73 global deklarierte `:root`-Tokens (vivodepot.html
   Zeile 66ff.), davon 4 kern-berechnet (Kontrast-/Ableitungs-Zusicherung, bleiben
   trotz statischem Fallback reserviert) und 5 weitere reine Laufzeit-Tokens ohne
   `:root`-Fallback, die eine reine `:root`-Erlaubnisliste übersehen hätte. Die
   verbleibenden 69 sind nach FORM klassifiziert (Farbe/Länge/Schrift/Schatten),
   nicht nach Name — ein künftiger Token ist damit kein Gerüst-Umbau, sondern ein
   Modul. S. Kern-Kommentar über `DESIGN_TOKEN_RESERVIERT` für den vollen Befund.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function kern() { return ladeKern().V; }

function fakeRoot() {
  return { style: { _werte: {}, setProperty(k, v) { this._werte[k] = v; }, removeProperty(k) { delete this._werte[k]; } } };
}

/* ── DIE AUSBEUTE ZUERST ──────────────────────────────────────────────────
   Untergrenzen bewusst unter den heute gemessenen Zahlen (69/14) — sie fangen
   den Ausfall der Klassifizierung (z. B. ein Refactor, das die Tabelle leert),
   nicht das Wachsen des Bestandes. */
test('[ADR-339·Ausbeute] Kategorie- und Reserviert-Tabelle sind überhaupt befüllt', () => {
  const V = kern();
  const anzahlKategorisiert = Object.keys(V.DESIGN_TOKEN_KATEGORIE).length;
  const anzahlReserviert = V.DESIGN_TOKEN_RESERVIERT.length;
  assert.ok(anzahlKategorisiert >= 60, 'zu wenige klassifizierte Tokens: ' + anzahlKategorisiert);
  assert.ok(anzahlReserviert >= 10, 'zu wenige reservierte Tokens: ' + anzahlReserviert);
});

test('[ADR-339] die vier kern-berechneten Tokens stehen auf der Reserviert-Liste', () => {
  const V = kern();
  for (const name of ['--akzent', '--akzent-papier', '--vm-chrome', '--vm-chrome-text']) {
    assert.ok(V.DESIGN_TOKEN_RESERVIERT.indexOf(name) >= 0, name + ' fehlt auf der Reserviert-Liste');
    assert.ok(!V.DESIGN_TOKEN_KATEGORIE[name], name + ' darf keine Kategorie tragen (wäre ein Kandidat)');
  }
});

test('[ADR-339] die fünf reinen Laufzeit-Tokens ohne :root-Fallback sind reserviert', () => {
  const V = kern();
  for (const name of ['--vm-chrome-mid', '--vm-chrome-tief', '--vm-akzent-stark', '--vm-linie', '--vd-branding-topbar-text']) {
    assert.ok(V.DESIGN_TOKEN_RESERVIERT.indexOf(name) >= 0, name + ' fehlt auf der Reserviert-Liste');
  }
});

test('[ADR-339] die fünf Branding-eigenen CSS-Variablen sind reserviert (eigener Schreibweg)', () => {
  const V = kern();
  for (const name of ['--vd-branding-primaer', '--vd-branding-sekundaer', '--vd-branding-schriftart',
    '--vd-branding-topbar-primaer', '--vd-branding-topbar-sekundaer']) {
    assert.ok(V.DESIGN_TOKEN_RESERVIERT.indexOf(name) >= 0, name + ' fehlt auf der Reserviert-Liste');
  }
});

/* ── ROT-BEWEIS 1: reservierter Name → benannt verworfen, nicht das ganze Modul ── */
test('[ADR-339·Rot-Beweis] ein reservierter Name wird benannt verworfen, ein gültiger daneben trägt weiter', () => {
  const V = kern();
  const r = V.designModulPruefen({ tokens: { '--akzent': '#112233', '--gold': '#aabbcc' } });
  assert.equal(r.gueltig, true, 'das Modul faellt nicht wegen einer verworfenen Zelle');
  assert.equal(r.tokens['--akzent'], undefined, 'der reservierte Name wird nicht uebernommen');
  assert.equal(r.tokens['--gold'], '#aabbcc', 'der gueltige Name daneben traegt weiter');
  assert.ok(r.verworfene.some((v) => v.schluessel === '--akzent' && v.grund === 'reserviert'),
    'die Ablehnung nennt den Namen und den Grund');
});

/* ── ROT-BEWEIS 2: Farbe ohne # → benannt verworfen ── */
test('[ADR-339·Rot-Beweis] eine Farbe ohne # wird benannt verworfen', () => {
  const V = kern();
  const r = V.designModulPruefen({ tokens: { '--gold': 'gold', '--teal': '#1f6b5e' } });
  assert.equal(r.gueltig, true);
  assert.equal(r.tokens['--gold'], undefined);
  assert.equal(r.tokens['--teal'], '#1f6b5e');
  assert.ok(r.verworfene.some((v) => v.schluessel === '--gold' && v.grund === 'ungueltige-form'));
});

/* ── ROT-BEWEIS 3, der wichtigste: gültiger neuer Name in gültiger Form → ANGENOMMEN und WIRKSAM ──
   Ohne diesen Beweis wäre eine Sperre gebaut, keine Andockfläche. */
test('[ADR-339·Rot-Beweis] ein gültiger Name in gültiger Form wird angenommen und wirkt als CSS-Custom-Property', () => {
  const V = kern();
  const r = V.designModulPruefen({ tokens: { '--gold': '#0a0b0c', '--fs-xl': '1.4rem', '--font-inter': 'Source Sans Pro' } });
  assert.equal(r.gueltig, true);
  assert.deepEqual(r.verworfene, [], 'nichts wird hier verworfen — alle drei Formen sind gültig');
  const root = fakeRoot();
  V.designTokenAnwenden(r.tokens, root);
  assert.equal(root.style._werte['--gold'], '#0a0b0c');
  assert.equal(root.style._werte['--fs-xl'], '1.4rem');
  assert.equal(root.style._werte['--font-inter'], 'Source Sans Pro');
});

test('[ADR-339] unbekannter Name (existiert nicht im Kern) wird benannt verworfen', () => {
  const V = kern();
  const r = V.designModulPruefen({ tokens: { '--frei-erfunden': '#112233', '--teal': '#1f6b5e' } });
  assert.equal(r.gueltig, true);
  assert.equal(r.tokens['--frei-erfunden'], undefined);
  assert.ok(r.verworfene.some((v) => v.schluessel === '--frei-erfunden' && v.grund === 'unbekannt'));
});

test('[ADR-339] jede der vier Kategorien prüft ihre eigene Form', () => {
  const V = kern();
  assert.equal(V.designTokenWertGueltig('farbe', '#aabbcc'), true);
  assert.equal(V.designTokenWertGueltig('farbe', '#abc'), false, 'dreistellige Kurzform ist nicht die Kern-Form');
  assert.equal(V.designTokenWertGueltig('laenge', '1.5rem'), true);
  assert.equal(V.designTokenWertGueltig('laenge', '12px'), true);
  assert.equal(V.designTokenWertGueltig('laenge', '12'), false, 'Zahl ohne Einheit ist keine Laenge');
  assert.equal(V.designTokenWertGueltig('zahl', '1.5'), true);
  assert.equal(V.designTokenWertGueltig('zahl', '1.5rem'), false);
  assert.equal(V.designTokenWertGueltig('schrift', 'Source Sans Pro'), true);
  assert.equal(V.designTokenWertGueltig('schrift', '   '), false, 'nur Leerraum nach Trim ist kein Wortlaut');
  assert.equal(V.designTokenWertGueltig('schatten', '0 2px 8px rgba(0,0,0,0.2)'), true);
  assert.equal(V.designTokenWertGueltig('schatten', 'url(evil.css)'), false);
});

/* Positivkontrolle: die drei eingebauten `--shadow-*`-Werte selbst müssen das Schatten-Muster
   bestehen — sonst prüft die Kategorie eine engere Form als der Kern tatsächlich benutzt
   (genau dieser Fehler schlug beim ersten Lauf dieser Datei fehl: `0` ohne Einheit). */
test('[ADR-339·Positivkontrolle] die drei eingebauten Schatten-Werte bestehen ihre eigene Formprüfung', () => {
  const V = kern();
  for (const wert of ['0 1px 2px rgba(33,38,31,0.06)', '0 2px 8px rgba(33,38,31,0.08)', '0 6px 20px rgba(33,38,31,0.10)']) {
    assert.equal(V.designTokenWertGueltig('schatten', wert), true, wert + ' sollte gültig sein');
  }
});

test('[ADR-339] tokens ohne gültigen Eintrag macht das Modul ungültig, kein leeres Objekt', () => {
  const V = kern();
  const r = V.designModulPruefen({ tokens: { '--akzent': '#112233', '--frei-erfunden': 'x' } });
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'nichts-gueltiges-gesetzt');
});

test('[ADR-339] designTokenAnwenden setzt nur bekannte Tokens und räumt vorherige beim Wechsel ab', () => {
  const V = kern();
  const root = fakeRoot();
  V.designTokenAnwenden({ '--gold': '#0a0b0c' }, root);
  assert.equal(root.style._werte['--gold'], '#0a0b0c');
  V.designTokenAnwenden({ '--teal': '#111111' }, root);
  assert.equal(root.style._werte['--gold'], undefined, 'ein nicht mehr genannter Token wird zurückgenommen');
  assert.equal(root.style._werte['--teal'], '#111111');
});

test('[ADR-339] designModulPruefen/designTokenAnwenden werfen nicht bei ungültigem Aufruf (defensiv)', () => {
  const V = kern();
  assert.doesNotThrow(() => V.designModulPruefen(null));
  assert.doesNotThrow(() => V.designModulPruefen({}));
  assert.equal(V.designModulPruefen(null).gueltig, false);
  assert.equal(V.designModulPruefen({ tokens: 'nicht-objekt' }).gueltig, false);
  const root = fakeRoot();
  assert.doesNotThrow(() => V.designTokenAnwenden(null, root));
  assert.doesNotThrow(() => V.designTokenAnwenden(undefined, root));
});
