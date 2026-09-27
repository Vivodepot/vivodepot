'use strict';
/* ════════════════════════════════════════════════════════════════════════
   C3 Zug 2 — der Einlassweg für ein Erscheinungs-Modul (Auftrag, 07.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Zwölftes Register in EINLASS_REGISTER, wörtlicher Spiegel von branding
   (sechstes Register, tests/a523-branding-register.test.js ist das Vorbild
   für den Aufbau dieser Datei) — OHNE `nurGeprueft`. Riegel-Matrix und
   Kennungsfrage stehen im Kopf-Kommentar an erscheinungModulPruefen im Kern
   und in U2-ADR-351 §8.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function fakeRoot() {
  return { style: { _werte: {}, setProperty(k, v) { this._werte[k] = v; }, removeProperty(k) { delete this._werte[k]; } } };
}

test('[C3-Zug2] Register existiert, zwölftes im Satz, OHNE nurGeprueft', () => {
  const { V } = ladeKern();
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'erscheinung');
  assert.ok(reg, 'erscheinung ist im EINLASS_REGISTER');
  assert.equal(reg.slot, 'erscheinungsModule');
  assert.ok(!reg.nurGeprueft, 'anders als branding — Erscheinung braucht keine Signaturhürde');
});

test('[C3-Zug2] die fünf Rollen-Felder sind einzeln optional — jedes für sich reicht', () => {
  const { V } = ladeKern();
  const nurLabel = V.erscheinungModulPruefen({ modulTyp: 'erscheinung', moduleVersion: 1, label: '16px' });
  assert.equal(nurLabel.gueltig, true);
  assert.deepEqual(nurLabel.erscheinung, { label: '16px', wert: null, gruppe: null, abschnitt: null, titel: null });

  const nurTitel = V.erscheinungModulPruefen({ modulTyp: 'erscheinung', moduleVersion: 1, titel: '2.5rem' });
  assert.equal(nurTitel.gueltig, true);
  assert.equal(nurTitel.erscheinung.titel, '2.5rem');
});

test('[C3-Zug2] alle fünf Felder gemeinsam gesetzt landen alle im Ergebnis', () => {
  const { V } = ladeKern();
  const r = V.erscheinungModulPruefen({ modulTyp: 'erscheinung', moduleVersion: 1,
    label: '16px', wert: '20px', gruppe: '1.6rem', abschnitt: '2.1rem', titel: '2.9rem' });
  assert.equal(r.gueltig, true);
  assert.deepEqual(r.erscheinung, { label: '16px', wert: '20px', gruppe: '1.6rem', abschnitt: '2.1rem', titel: '2.9rem' });
});

test('[C3-Zug2] gar nichts gesetzt — kein gültiges Modul', () => {
  const { V } = ladeKern();
  const r = V.erscheinungModulPruefen({ modulTyp: 'erscheinung', moduleVersion: 1 });
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'nichts-gueltiges-gesetzt');
});

test('[C3-Zug2·Rot-Beweis] ein ungültiges Längenmaß wird benannt verworfen, andere Felder bleiben gültig', () => {
  const { V } = ladeKern();
  const faelle = ['16', '16pt', '16 px', 'calc(16px + 1px)', '16px;color:red', '', '16px 20px'];
  for (const wert of faelle) {
    const r = V.erscheinungModulPruefen({ modulTyp: 'erscheinung', moduleVersion: 1, label: wert, titel: '2rem' });
    assert.equal(r.gueltig, true, wert + ' — titel trägt weiter');
    assert.equal(r.erscheinung.label, null, JSON.stringify(wert) + ' haette verworfen werden muessen');
    assert.ok(r.verworfene.some((v) => v.schluessel === 'label' && v.grund === 'ungueltiges-laengenmass'));
  }
});

test('[C3-Zug2] px/rem/em gehen alle durch', () => {
  const { V } = ladeKern();
  for (const [feld, wert] of [['label', '16px'], ['wert', '1.25rem'], ['gruppe', '2em']]) {
    const r = V.erscheinungModulPruefen({ modulTyp: 'erscheinung', moduleVersion: 1, [feld]: wert });
    assert.equal(r.gueltig, true);
    assert.equal(r.erscheinung[feld], wert);
  }
});

test('[C3-Zug2] unbekannter Schlüssel wird benannt verworfen, wie bei den übrigen Registern', () => {
  const { V } = ladeKern();
  const r = V.erscheinungModulPruefen({ modulTyp: 'erscheinung', moduleVersion: 1, label: '16px', erfunden: true });
  assert.equal(r.gueltig, true);
  assert.ok(r.verworfene.some((v) => v.schluessel === 'erfunden' && v.grund === 'unbekannt'));
});

test('[C3-Zug2] moduleVersion fehlt oder ungültig — kein gültiges Modul', () => {
  const { V } = ladeKern();
  assert.equal(V.erscheinungModulPruefen({ modulTyp: 'erscheinung', label: '16px' }).grund, 'moduleVersion');
  assert.equal(V.erscheinungModulPruefen({ modulTyp: 'erscheinung', moduleVersion: 0, label: '16px' }).grund, 'moduleVersion');
});

test('[C3-Zug2·DER GEGEN-ROT-BEWEIS] der unsignierte Weg ist für erscheinung OFFEN — anders als bei branding', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const modul = JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 1, label: '16px', herkunft: 'buergerin-selbst' });
  // Ohne dritten Parameter (kein geprüfter anbieterId-String) — derselbe unsignierte Weg,
  // der bei branding mit 'nur-signiert-erlaubt' abgewiesen wird.
  const r = V.modulEinlassen(modul, d);
  assert.equal(r.angenommen, true, 'Erscheinung braucht KEINE Signatur');
  assert.equal(d.erscheinungsModule[0].ungeprueft, true);
  assert.equal(d.erscheinungsModule[0].anbieterIdGeprueft, false);
});

test('[C3-Zug2·Erzwungene Gruppe] ein Modul kann sich nicht selbst als geprüft ausgeben', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const modul = JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 1, label: '16px',
    ungeprueft: false, anbieterIdGeprueft: true, beleg: { providerCredentialJws: 'x', modulSignaturJws: 'y' } });
  const r = V.modulEinlassen(modul, d);
  assert.equal(r.angenommen, true);
  assert.equal(d.erscheinungsModule[0].ungeprueft, true, 'erzwungen, trotz Selbstauskunft false');
  assert.equal(d.erscheinungsModule[0].anbieterIdGeprueft, false, 'erzwungen, trotz Selbstauskunft true');
  assert.equal(d.erscheinungsModule[0].beleg, null, 'erzwungen, trotz mitgebrachtem Beleg');
});

test('[C3-Zug2·Kennung] zwei Module derselben Herkunft: die höhere moduleVersion gewinnt', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const v1 = JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 1, label: '16px', herkunft: 'sparkasse-musterstadt' });
  const v2 = JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 2, label: '18px', herkunft: 'sparkasse-musterstadt' });
  V.modulEinlassen(v1, d);
  const r2 = V.modulEinlassen(v2, d);
  assert.equal(r2.angenommen, true);
  assert.equal(r2.fassung, 'aktualisiert');
  assert.equal(d.erscheinungsModule.length, 1, 'ersetzt, nicht verdoppelt');
  assert.equal(d.erscheinungsModule[0].label, '18px');
});

test('[C3-Zug2·Kennung] eine ältere Fassung ändert nichts, gilt nicht als angenommen', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const v2 = JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 2, label: '18px', herkunft: 'sparkasse-musterstadt' });
  const v1 = JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 1, label: '16px', herkunft: 'sparkasse-musterstadt' });
  V.modulEinlassen(v2, d);
  const r1 = V.modulEinlassen(v1, d);
  assert.equal(r1.angenommen, false);
  assert.equal(r1.grund, 'aeltere-fassung');
  assert.equal(d.erscheinungsModule[0].label, '18px', 'unveraendert');
});

/* 07.09.2026, Punkt B — der gefährliche Fall im White-Label: Sparkasse liefert Marke UND
   Erscheinung unter DERSELBEN herkunft aus, die Marke ist signiert/geprüft. Der Prüfstatus
   darf NICHT über die gemeinsame Herkunft erben — ungeprueft/anbieterIdGeprueft werden PRO
   MODUL ausgewertet (modulEinlassens dritter Parameter gilt für GENAU DIESEN Aufruf, schaut nie
   in bestehende Depot-Einträge). Heute gibt es keinen Code-Pfad, der das täte — dieser Rot-
   Beweis ist eine Ratsche GEGEN künftigen Code, der die Achsen durch die Hintertür wieder
   zusammenlegen würde. */
test('[C3-Zug2·Punkt-B·Rot-Beweis] Prüfstatus erbt NICHT über eine geteilte herkunft', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const herkunft = 'sparkasse-white-label';
  // Die Marke kommt über den GEPRÜFTEN Weg (dritter Parameter, wie modulEinlassenGeprueft ihn
  // nach erfolgreicher Signaturprüfung übergäbe) — derselbe Weg wie im branding-Rot-Beweis oben.
  const rMarke = V.modulEinlassen(
    JSON.stringify({ modulTyp: 'branding', moduleVersion: 1, name: 'Sparkasse White-Label', herkunft }),
    d, 'sparkasse-white-label-zertifikat');
  assert.equal(rMarke.angenommen, true);
  assert.equal(d.brandingModule[0].anbieterIdGeprueft, true, 'Vorbedingung: die Marke IST geprüft');
  // Dieselbe herkunft, aber die Erscheinung kommt über den GEWÖHNLICHEN, unsignierten Weg.
  const rErscheinung = V.modulEinlassen(
    JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 1, label: '16px', herkunft }), d);
  assert.equal(rErscheinung.angenommen, true);
  assert.equal(d.erscheinungsModule[0].anbieterIdGeprueft, false,
    'die Erscheinung darf den Prüfstatus der Marke NICHT über die geteilte herkunft erben');
  assert.equal(d.erscheinungsModule[0].ungeprueft, true, 'bleibt ungeprüft, trotz geprüfter Marke derselben Herkunft');
});

test('[C3-Zug2·Kennung] zwei verschiedene Herkünfte koexistieren, wie bei branding', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.modulEinlassen(JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 1, label: '16px', herkunft: 'sparkasse-a' }), d);
  V.modulEinlassen(JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 1, label: '20px', herkunft: 'sparkasse-b' }), d);
  assert.equal(d.erscheinungsModule.length, 2);
});

/* ── Verdrahtung — der zweite Teil des Einlasswegs: was hereinkommt, muss auch wirken ── */
test('[C3-Zug2·Verdrahtung] _moduleEinlassWirken wendet das eingelassene Modul tatsächlich als CSS an', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('c3-zug2-verdrahtung-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const modul = JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 1,
    label: '17px', titel: '3rem', herkunft: 'selbst' });
  const r = V.modulEinlassen(modul);   // kein ziel — schreibt ins globale `data`
  assert.equal(r.angenommen, true);
  V._moduleEinlassWirken(r);
  const root = document.documentElement;
  assert.equal(root.style.getPropertyValue('--fs-role-label'), '17px');
  assert.equal(root.style.getPropertyValue('--fs-role-titel'), '3rem');
});

test('[C3-Zug2·Verdrahtung] _depotSpeicherZuruecksetzen räumt die Erscheinung weg — kein Durchbluten ins nächste Depot', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('c3-zug2-reset-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const modul = JSON.stringify({ modulTyp: 'erscheinung', moduleVersion: 1, label: '17px', herkunft: 'selbst' });
  const r = V.modulEinlassen(modul);
  V._moduleEinlassWirken(r);
  assert.equal(document.documentElement.style.getPropertyValue('--fs-role-label'), '17px', 'Vorbedingung: gesetzt');
  V._depotSpeicherZuruecksetzen();
  assert.equal(document.documentElement.style.getPropertyValue('--fs-role-label'), '', 'nach dem Schliessen wieder leer');
});

/* ── Der strukturelle Riegel gegen die pruefmodul-boesartig-Angriffsklasse ──────────────
   07.09.2026: "eine Sicherheit, die aus der Bauform folgt, ist mehr wert als eine,
   die geprüft wird — aber nur, wenn eine Probe sie festnagelt". Zwei Proben, zwei Schichten:
   die PRÜFUNG lässt nie mehr als die fünf bekannten Felder durch (auch bei einem maximal
   feindseligen Rohobjekt), und die ANWENDUNG selbst kennt nur fünf Custom-Property-Namen,
   nie eine Selektor- oder rohe-CSS-Eingabe — ein Erscheinungs-Modul hat schlicht keinen
   Kanal, der .klartext-warn/herkunft-marke/stand-marke/vorlage-marke erreichen könnte. */
test('[C3-Zug2·Struktur-Riegel] erscheinungModulPruefen lässt NIE mehr als die fünf bekannten Felder durch', () => {
  const { V } = ladeKern();
  const boesartig = {
    modulTyp: 'erscheinung', moduleVersion: 1, label: '16px',
    selector: '.klartext-warn', css: '.klartext-warn{display:none}',
    style: 'display:none', display: 'none', __proto__: { display: 'none' },
    'herkunft-marke': 'display:none',
  };
  const r = V.erscheinungModulPruefen(boesartig);
  assert.equal(r.gueltig, true, 'label allein traegt');
  assert.deepEqual(Object.keys(r.erscheinung).sort(), ['abschnitt', 'gruppe', 'label', 'titel', 'wert']);
  for (const k of ['selector', 'css', 'style', 'display', 'herkunft-marke']) {
    assert.ok(r.verworfene.some((v) => v.schluessel === k), k + ' muss benannt verworfen werden');
  }
});

test('[C3-Zug2·Struktur-Riegel] erscheinungAnwenden setzt AUSSCHLIESSLICH die fünf bekannten Custom Properties, egal was das Objekt sonst trägt', () => {
  const { V } = ladeKern();
  const root = fakeRoot();
  // Worst Case: erscheinungAnwenden direkt mit einem feindseligen Objekt aufgerufen (nicht
  // über erscheinungModulPruefen gefiltert) — die Funktion selbst muss die Grenze halten.
  V.erscheinungAnwenden({
    label: '16px', wert: '20px', gruppe: '1.6rem', abschnitt: '2.1rem', titel: '2.9rem',
    selector: '.klartext-warn', css: 'display:none', display: 'none', 'herkunft-marke': 'x',
  }, root);
  assert.deepEqual(Object.keys(root.style._werte).sort(),
    ['--fs-role-abschnitt', '--fs-role-gruppe', '--fs-role-label', '--fs-role-titel', '--fs-role-wert'],
    'kein anderer Schluessel darf je bei setProperty ankommen');
});

test('[C3-Zug2·Struktur-Riegel·Gegenprobe] ein Depot ohne eingelassenes Erscheinungs-Modul bleibt beim Standard', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('c3-zug2-standard-2026!');
  V.akteurSelbstErklaeren('Testerin');
  assert.equal(document.documentElement.style.getPropertyValue('--fs-role-label'), '', 'kein Modul, keine Abweichung vom Standard');
});
