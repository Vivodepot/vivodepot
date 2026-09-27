'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A527 — Lese-App "Meine Menschen" zeigt das Personen-Register nie
   ────────────────────────────────────────────────────────────────────────
   Sicherheitsrelevanter Fund (Nachtlauf, 27.08.2026, aus einer frischen
   Lese-App-Prüfung mit echtem Export): ein zugesandtes Depot mit "zwei
   Personen inkl. Kind" zeigte in der Lese-App "Meine Menschen" trotzdem
   "nicht hinterlegt".

   URSACHE (im Kern selbst dokumentiert, vivodepot.html:10567, U2-ADR-022,
   also SCHON MONATE ALT — keine neue Regression): "Das Sektor-Listenfeld
   'menschen' ist entfallen. Bereich 2 rendert direkt das Register
   data.menschen[] ... (EIN Topf; s. menschenRegisterHTML)." Der Kern hat
   das Sektor-Feld `sektoren['people'].menschen` bei der Personen-
   Vereinheitlichung abgeschafft und rendert seither `data.menschen[]`
   direkt. Die Lese-App zog diesen Umbau nie mit — ihr Feldkatalog
   (SEKTOREN['meine-menschen']) fragt weiterhin das seit U2-ADR-022 tote
   Sektor-Feld ab, das der Kern nie mehr befüllt.

   Reproduziert (echter Browser-Durchlauf, 27.08.2026): Testperson im
   Register angelegt, echter vollExportJSON-Export, Lese-App zeigt
   trotzdem "nicht hinterlegt".

   GEGENPROBE ZUR SELBEN PRÜFUNG (Gesundheit): "Blutgruppe"/"Allergien"
   fehlten im selben Test — das ist KEIN Bug, sondern die dokumentierte
   Sensibel-Zurückhaltung (Befund 2, 12./13.08.2026, s.
   tests/lese-app-sensibel-zurueckhaltung.test.js) — mit gesetztem
   `sensibelFelder`-Override zeigten sie sich korrekt. Nicht Teil dieser
   Datei.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const SEKTOR = 'people';

function lese(menschen, extra) {
  const { V } = ladeLesen();
  V.setData(Object.assign({ schemaVersion: 75, menschen, urheberschaft: {}, mappe: [],
    sektoren: {}, feldDefinitionen: [], sensibelFelder: {} }, extra || {}));
  return { V, html: V.sektorHTML(SEKTOR) };
}

test('[A527·Rot-Beweis] eine echte Person im Register erscheint in der Lese-App "Meine Menschen"', () => {
  const { html } = lese([{ id: 'p1', name: 'Anna Schmidt', beziehung: 'Schwester' }]);
  assert.match(html, /Anna Schmidt/, 'die Person aus data.menschen[] muss in der Lese-Sicht auftauchen');
  assert.doesNotMatch(html, /nicht hinterlegt/, 'darf nicht als leer gelten, wenn eine Person im Register steht');
});

test('[A527] mehrere Personen mit Kontaktfeldern erscheinen vollständig (Name, Beziehung, Telefon)', () => {
  const { html } = lese([
    { id: 'p1', name: 'Anna Schmidt', beziehung: 'Schwester', tel: '0151 12345678' },
    { id: 'p2', name: 'Tochter Test', beziehung: 'Kind', yearOfBirthIfTheExactDayIs: '2015' },
  ]);
  assert.match(html, /Anna Schmidt/);
  assert.match(html, /0151 12345678/);
  assert.match(html, /Tochter Test/);
  assert.match(html, /2015/);
});

test('[A527·Sicherheit] eine Person mit nichtMitgeben:true wird NICHT angezeigt — dieselbe Zurückhaltung wie beim Sensibel-Feld', () => {
  // vollExportJSON filtert data.menschen NICHT nach nichtMitgeben (geprüft, keine Fundstelle) —
  // die Lese-App muss das selbst tun, sonst würde ausgerechnet die "nicht weitergeben"-Markierung
  // durch diesen Fix zum ersten Mal überhaupt sichtbar (bisher verhinderte der andere Bug es
  // zufällig mit).
  const { html } = lese([
    { id: 'p1', name: 'Anna Schmidt', beziehung: 'Schwester' },
    { id: 'p2', name: 'Geheime Kontaktperson', beziehung: 'Freundin', nichtMitgeben: true },
  ]);
  assert.match(html, /Anna Schmidt/);
  assert.doesNotMatch(html, /Geheime Kontaktperson/, 'nichtMitgeben:true muss die Person vollständig zurückhalten');
});

test('[A527·Gegenprobe] kein Eintrag im Register → echtes "nicht hinterlegt", kein stiller Absturz', () => {
  const { html } = lese([]);
  assert.match(html, /nicht hinterlegt/);
});

test('[A527·Gegenprobe] alle Personen nichtMitgeben:true → "nicht hinterlegt" (nicht "eine leere Liste zeigen")', () => {
  const { html } = lese([{ id: 'p1', name: 'Geheim', nichtMitgeben: true }]);
  assert.match(html, /nicht hinterlegt/);
  assert.doesNotMatch(html, /Geheim/);
});

/* ══ Nachtrag (Nachtlauf, 27.08.2026, 8-Finder-Code-Review): der erste A527-Fix verdrahtete
   _sektorDatenFuerLesen NUR in sektorHTML — situationModell (Situationsblätter, z. B. "Einfach
   so") liest data.sektoren['people'].menschen weiterhin DIREKT (Zeile ~3768), am toten
   Sektor-Feld vorbei am eigentlichen Fix vorbei. Dieselbe Ursache, zweite Fundstelle. ══ */

test('[A527·Nachtrag·Rot-Beweis] situationModell("einfach-so") zeigt eine echte Person aus dem Register, nicht "nicht hinterlegt"', () => {
  const { V } = ladeLesen();
  V.setData({ schemaVersion: 75, menschen: [{ id: 'p1', name: 'Anna Schmidt', beziehung: 'Schwester' }],
    urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {} });
  const modell = V.situationModell('einfach-so');
  const alleZeilen = modell.bloecke.flatMap((b) => b.zeilen);
  assert.ok(alleZeilen.some((z) => /Anna Schmidt/.test(z.wert)),
    'situationModell muss dieselbe Register-Quelle wie sektorHTML lesen (_sektorDatenFuerLesen), nicht direkt sektoren["people"]');
});

test('[A527·Nachtrag] situationModell respektiert nichtMitgeben:true ebenso wie sektorHTML', () => {
  const { V } = ladeLesen();
  V.setData({ schemaVersion: 75, menschen: [{ id: 'p1', name: 'Geheime Person', nichtMitgeben: true }],
    urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {} });
  const modell = V.situationModell('einfach-so');
  const alleZeilen = modell.bloecke.flatMap((b) => b.zeilen);
  assert.ok(!alleZeilen.some((z) => /Geheime Person/.test(z.wert)),
    'nichtMitgeben:true muss auch über den Situationsblatt-Weg zurückgehalten werden');
});
