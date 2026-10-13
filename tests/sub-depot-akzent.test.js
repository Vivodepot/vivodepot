'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sub-Depot-Akzentfarbe (Strang 3 Commit B; Palettentausch 04.08.2026)
   ────────────────────────────────────────────────────────────────────────
   1) Die 6 Palette-Token liegen im :root mit den freigegebenen Hex.
   2) --vm-chrome ist eine Laufzeit-Variable mit Fallback Salbei-dunkel (kein
      betretenes Depot bleibt je ohne echten Override, Zug 3).
   3) subDepotAkzentToken: Whitelist + Read-time-Fallback auf die erste Farbe der
      Palette, keine Sonderbedeutung (bis 09.10.2026 'hafer', seither 'ton').
   4) Betreten setzt --vm-chrome (+ mid/tief via color-mix) auf den Akzent des
      eingehängten Depots; Verlassen entfernt die Overrides über den EIGENEN,
      farbfreien Weg `entferneSubDepotAkzentOverride` (Zug 3 — keine Farbe trägt
      mehr die Zweitbedeutung „kein Akzent").
   Das akzent-Feld liegt in den KLARTEXT-Metadaten (verwalteteDepots), nicht
   im verschlüsselten Umschlag — VdCrypto bleibt unberührt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const { kernMitHeute } = require('./helfer/kern-mit-erscheinungsbild.js');   // v894: Werte kommen mit dem Erscheinungsbild
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('Palette: 6 Token im :root mit den freigegebenen Hex + --vm-chrome variabel', () => {
  const html = kernMitHeute(ladeKern().html);
  assert.ok(/--hafer:\s*#D9C9A3/i.test(html), '--hafer #D9C9A3');
  assert.ok(/--ton:\s*#D3A98F/i.test(html), '--ton #D3A98F');
  assert.ok(/--flieder:\s*#B8AECB/i.test(html), '--flieder #B8AECB');
  assert.ok(/--altrose:\s*#D2B3B0/i.test(html), '--altrose #D2B3B0');
  assert.ok(/--nebel:\s*#A9B8C4/i.test(html), '--nebel #A9B8C4');
  assert.ok(/--kiesel:\s*#C3B5A8/i.test(html), '--kiesel #C3B5A8');
  // --vm-chrome ist Laufzeit-Variable mit Fallback Salbei-dunkel (kein Depot bleibt ohne Farbe).
  assert.ok(/--vm-chrome:\s*var\(--salbei-dunkel\)/.test(html), '--vm-chrome Fallback var(--salbei-dunkel)');
});

test('subDepotAkzentToken: Whitelist + Read-time-Fallback auf ton', () => {
  const { V } = ladeKern();
  // Palette 05.10.2026 (U2-ADR-236 Nachtrag), im Kern seit 09.10.2026: acht Töne, klar von Salbei
  // unterschieden. Hafer, Schilf und Flieder sind keine Palettenmitglieder mehr.
  assert.deepEqual([...V.SUBDEPOT_PALETTE], ['ton', 'altrose', 'nebel', 'kiesel', 'malve', 'pfirsich', 'hellblau', 'rose']);
  assert.equal(V.subDepotAkzentToken('ton'), 'ton');
  assert.equal(V.subDepotAkzentToken('rose'), 'rose');
  // seit 09.10.2026: erster Ton der neuen Palette
  assert.equal(V.subDepotAkzentToken(undefined), 'ton');   // Bestands-Sub-Depot ohne Feld
  assert.equal(V.subDepotAkzentToken(''), 'ton');          // leerer Wert
  assert.equal(V.subDepotAkzentToken('unbekannt'), 'ton');  // unbekannter Wert (auch: alte Palette, z. B. 'schiefer')
});

test('subDepotAkzentToken: Bestandsdepots mit hafer/schilf/flieder werden nur in der Anzeige abgebildet', () => {
  const { V } = ladeKern();
  // Ein Bestandsdepot trägt seinen alten Namen in der Datei weiter; angezeigt wird der nächste Ton der neuen Palette.
  assert.deepEqual({ ...V.SUBDEPOT_ANZEIGE_ABBILDUNG }, { hafer: 'pfirsich', schilf: 'nebel', flieder: 'malve' });
  assert.equal(V.subDepotAkzentToken('hafer'), 'pfirsich');
  assert.equal(V.subDepotAkzentToken('schilf'), 'nebel');
  assert.equal(V.subDepotAkzentToken('flieder'), 'malve');
  // Rot-Beweis: die Abbildung greift nur für genau diese drei alten Namen, nicht für jeden Fremdwert.
  assert.equal(V.subDepotAkzentToken('schiefer'), 'ton', 'ein anderer alter Name fällt auf den Fallback, nicht in die Abbildung');
  for (const ziel of Object.values(V.SUBDEPOT_ANZEIGE_ABBILDUNG)) {
    assert.ok(V.SUBDEPOT_PALETTE.includes(ziel), ziel + ': Abbildungsziel ist ein Palettenton');
  }
});

test('subDepotAnlegen schreibt akzent (Default ton; gewählt: kiesel; alter Name wird abgebildet)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const e1 = await V.subDepotAnlegen({ bezeichnung: 'A', inhaberin: 'I', verwaltungsTyp: 'verwaltet' }, PW);
  assert.equal(e1.akzent, 'ton', 'Default ist ton (seit 09.10.2026: erster Ton der neuen Palette)');
  const e2 = await V.subDepotAnlegen({ bezeichnung: 'B', inhaberin: 'J', verwaltungsTyp: 'verwaltet', akzent: 'kiesel' }, PW);
  assert.equal(e2.akzent, 'kiesel', 'gewählter Akzent wird gespeichert');
  const e3 = await V.subDepotAnlegen({ bezeichnung: 'C', inhaberin: 'K', verwaltungsTyp: 'verwaltet', akzent: 'flieder' }, PW);
  assert.equal(e3.akzent, 'malve', 'ein alter Name wird beim Anlegen auf den Palettenton abgebildet gespeichert');
});

test('Betreten setzt --vm-chrome auf den Akzent; Verlassen entfernt Override', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const e = await V.subDepotAnlegen({ bezeichnung: 'B', inhaberin: 'J', verwaltungsTyp: 'verwaltet', akzent: 'ton' }, PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW);
  V.subKontextBetreten(e.depotUUID);
  const style = document.documentElement.style;
  assert.equal(style.getPropertyValue('--vm-chrome'), 'var(--ton)', 'Chrome auf Ton');
  assert.equal(style.getPropertyValue('--vm-chrome-mid'), 'color-mix(in srgb, var(--ton) 82%, white)', 'mid abgeleitet');
  assert.equal(style.getPropertyValue('--vm-chrome-tief'), 'color-mix(in srgb, var(--ton) 80%, black)', 'tief abgeleitet');
  await V.subKontextVerlassen();
  assert.equal(style.getPropertyValue('--vm-chrome'), '', 'Override entfernt → :root-Fallback (Salbei-dunkel)');
  assert.equal(style.getPropertyValue('--vm-chrome-tief'), '', 'tief-Override entfernt');
});

test('Jede der acht Farben setzt beim Betreten einen echten Override (Zug 3 — keine Ausnahme mehr)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  for (const tok of V.SUBDEPOT_PALETTE) {
    const e = await V.subDepotAnlegen({ bezeichnung: tok, inhaberin: 'K', verwaltungsTyp: 'verwaltet', akzent: tok }, PW);
    await V.subDepotVertrauenOeffnen(e.depotUUID, PW);
    V.subKontextBetreten(e.depotUUID);
    assert.equal(document.documentElement.style.getPropertyValue('--vm-chrome'), 'var(--' + tok + ')', tok + ': echter Override');
    await V.subKontextVerlassen();
  }
});

test('entferneSubDepotAkzentOverride ist der einzige farbfreie Weg zurück (Zug 3)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const e = await V.subDepotAnlegen({ bezeichnung: 'B', inhaberin: 'J', verwaltungsTyp: 'verwaltet', akzent: 'kiesel' }, PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW);
  V.subKontextBetreten(e.depotUUID);
  assert.equal(document.documentElement.style.getPropertyValue('--vm-chrome'), 'var(--kiesel)');
  V.entferneSubDepotAkzentOverride();
  assert.equal(document.documentElement.style.getPropertyValue('--vm-chrome'), '', 'Override vollständig entfernt');
  assert.equal(document.documentElement.style.getPropertyValue('--vm-akzent-stark'), '');
});

test('Bestands-Sub-Depot OHNE akzent fällt beim Betreten auf Ton (Read-time-Fallback)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  // Angelegt mit kiesel, nicht mit ton — sonst wäre der Fallback vom gespeicherten Wert nicht zu unterscheiden.
  const e = await V.subDepotAnlegen({ bezeichnung: 'Alt', inhaberin: 'L', verwaltungsTyp: 'verwaltet', akzent: 'kiesel' }, PW);
  delete e.akzent;   // simuliert ein vor Commit B angelegtes Sub-Depot ohne Feld
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW);
  V.subKontextBetreten(e.depotUUID);
  assert.equal(document.documentElement.style.getPropertyValue('--vm-chrome'), 'var(--ton)', 'Fallback Ton (seit 09.10.2026: erster Ton der neuen Palette) → echter Override, kein Default-Nichts');
});

test('akzent liegt in Klartext-Metadaten, NICHT im verschlüsselten Umschlag', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const e = await V.subDepotAnlegen({ bezeichnung: 'B', inhaberin: 'J', verwaltungsTyp: 'verwaltet', akzent: 'malve' }, PW);
  assert.equal(e.akzent, 'malve');
  assert.ok(!('akzent' in e.umschlag), 'akzent darf nicht im Umschlag liegen');
});

/* ── White-Label-Akzent (12.09.2026) ─────────────────────────────────────────────────────────
   Nutzer-Rückmeldung: "das Branding des sub-depots wird hoffentlich im Gerüst gemacht, so dass es
   die white labels auch abdeckt?" — GEMESSEN vorher: nein, ein freier Hex fiel still auf
   'hafer' zurück. Auftrag: Vokabular öffnen (Form prüfen, nicht Zugehörigkeit — ein
   gültiger Hex ist erlaubt), Tor geschlossen halten (alles andere bleibt 'hafer'). Die acht
   benannten Farben bleiben unverändert die Vorauswahl im Bürger-Dialog (farbwahlAuswahlHTML) —
   diese Tests decken ausschließlich den GERÜST-Weg (subDepotAnlegen mit einem Hex direkt). */
test('[White-Label] subDepotAkzentIstHex: Form prüfen, nicht Zugehörigkeit', () => {
  const { V } = ladeKern();
  assert.equal(V.subDepotAkzentIstHex('#3355aa'), true, '6-stelliger Hex gültig');
  assert.equal(V.subDepotAkzentIstHex('#35a'), true, '3-stelliger Hex gültig');
  assert.equal(V.subDepotAkzentIstHex('#ABCDEF'), true, 'Großschreibung gültig');
  assert.equal(V.subDepotAkzentIstHex('3355aa'), false, 'fehlendes # ungültig');
  assert.equal(V.subDepotAkzentIstHex('#3355a'), false, '5 Stellen ungültig');
  assert.equal(V.subDepotAkzentIstHex('#gggggg'), false, 'kein Hex-Zeichen ungültig');
  assert.equal(V.subDepotAkzentIstHex('ton'), false, 'ein Palette-Name ist kein Hex');
  assert.equal(V.subDepotAkzentIstHex(''), false, 'leerer String ungültig');
  assert.equal(V.subDepotAkzentIstHex(null), false, 'null ungültig — wirft nicht');
  assert.equal(V.subDepotAkzentIstHex(undefined), false, 'undefined ungültig — wirft nicht');
  assert.equal(V.subDepotAkzentIstHex(42), false, 'kein String ungültig — wirft nicht');
});

test('[White-Label] subDepotAkzentToken: ein gültiger Hex geht durch (normalisiert), alles andere fällt auf ton', () => {
  const { V } = ladeKern();
  assert.equal(V.subDepotAkzentToken('#3355AA'), '#3355aa', 'Großschreibung wird normalisiert');
  assert.equal(V.subDepotAkzentToken('#35a'), '#3355aa', '3-stellig wird auf 6-stellig verdoppelt');
  // Tor bleibt geschlossen — dieselbe Read-time-Fallback-Garantie wie vorher, jetzt auch gegen
  // Werte, die wie eine Farbe AUSSEHEN, es aber nicht sind (kein Schmuggelweg über die Form).
  // Fallback seit 09.10.2026: erster Ton der neuen Palette (ton, vorher hafer).
  assert.equal(V.subDepotAkzentToken('javascript:alert(1)'), 'ton', 'kein Hex, kein Palette-Name → ton');
  assert.equal(V.subDepotAkzentToken('#3355aaff'), 'ton', '8-stellig (mit Alpha) nicht unterstützt → ton');
  assert.equal(V.subDepotAkzentToken({ toString: () => '#3355aa' }), 'ton', 'kein String → ton, kein stilles toString()');
});

test('[White-Label] subDepotAnlegen mit freiem Hex speichert ihn normalisiert in akzent', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const e = await V.subDepotAnlegen({ bezeichnung: 'WL', inhaberin: 'Institution', verwaltungsTyp: 'verwaltet', akzent: '#2244AA' }, PW);
  assert.equal(e.akzent, '#2244aa');
  assert.ok(!('akzent' in e.umschlag), 'auch der freie Hex bleibt Klartext-Metadatum, nicht im Umschlag');
});

test('[White-Label] subDepotAkzentFarbe: literaler Hex für einen freien Wert, var(--token) für die acht benannten', () => {
  const { V } = ladeKern();
  assert.equal(V.subDepotAkzentFarbe('#2244aa'), '#2244aa');
  assert.equal(V.subDepotAkzentFarbe('kiesel'), 'var(--kiesel)');
  // seit 09.10.2026: erster Ton der neuen Palette
  assert.equal(V.subDepotAkzentFarbe('unbekannt'), 'var(--ton)', 'Fallback ist var(--ton), kein var(--#…)');
});

test('[White-Label] subDepotTextFarbe: ein sehr dunkler Hex bekommt Weiß, ein sehr heller bekommt Ink — beide AA-geprüft', () => {
  const { V } = ladeKern();
  const aufDunkel = V.subDepotTextFarbe('#111111');
  assert.equal(aufDunkel, '#ffffff');
  assert.ok(V._brandingKontrastVerhaeltnisHex(aufDunkel, '#111111') >= 4.5, 'Weiß auf #111111 hält AA');
  const aufHell = V.subDepotTextFarbe('#ffee00');
  assert.equal(aufHell, '#1c2a1e');
  assert.ok(V._brandingKontrastVerhaeltnisHex(aufHell, '#ffee00') >= 4.5, 'Ink auf #ffee00 hält AA');
  // Positivkontrolle: die acht benannten Farben bleiben beim var()-Nachschlagewerk (Rot-Beweis,
  // dass der Hex-Zweig den Namens-Zweig nicht versehentlich mitreißt).
  assert.equal(V.subDepotTextFarbe('ton'), 'var(--ton-text)');
});

test('[White-Label] subDepotAkzentStark: ein freier Hex wird zur LAUFZEIT bis AA (≥4,5:1 auf #f6f5f1) abgedunkelt', () => {
  const { V } = ladeKern();
  // Ein helles, wenig gesättigtes Blau — hält ohne Abdunklung KEINE 4,5:1 gegen #f6f5f1 (beide hell).
  const hell = '#7fa8e0';
  assert.ok(V._brandingKontrastVerhaeltnisHex(hell, '#f6f5f1') < 4.5, 'Vorbedingung: der rohe Wert selbst besteht die Probe nicht');
  const stark = V.subDepotAkzentStark(hell);
  assert.match(stark, /^#[0-9a-f]{6}$/, 'liefert einen literalen Hex, keine CSS-Funktion');
  assert.ok(V._brandingKontrastVerhaeltnisHex(stark, '#f6f5f1') >= 4.5,
    'die Zusicherung wird HERGESTELLT, nicht nur behauptet: ' + stark + ' gegen #f6f5f1');
  // Ein Hex, der die Schwelle schon roh erreicht, bleibt unverändert (keine unnötige Abdunklung).
  const schonDunkel = '#1a2a5a';
  assert.ok(V._brandingKontrastVerhaeltnisHex(schonDunkel, '#f6f5f1') >= 4.5, 'Vorbedingung: schon AA-tauglich');
  assert.equal(V.subDepotAkzentStark(schonDunkel), schonDunkel, 'ein bereits AA-tauglicher Wert wird nicht angerührt');
});

test('[White-Label] subDepotAkzentLinie/subDepotAkzentPapierLinie: freier Hex erreicht ≥3:1 gegen Weiß bzw. Papier', () => {
  const { V } = ladeKern();
  const hell = '#a8c8f0';
  const linie = V.subDepotAkzentLinie(hell);
  assert.match(linie, /^#[0-9a-f]{6}$/);
  assert.ok(V._brandingKontrastVerhaeltnisHex(linie, '#ffffff') >= 3.0, linie + ' gegen Weiß hält 3:1');
  const papierLinie = V.subDepotAkzentPapierLinie(hell);
  assert.match(papierLinie, /^#[0-9a-f]{6}$/);
  assert.ok(V._brandingKontrastVerhaeltnisHex(papierLinie, '#fdfbf7') >= 3.0, papierLinie + ' gegen Papier hält 3:1');
  // Positivkontrolle: die acht benannten Farben bleiben beim var()-Nachschlagewerk.
  assert.equal(V.subDepotAkzentLinie('ton'), 'var(--ton-linie)');
  assert.equal(V.subDepotAkzentPapierLinie('ton'), 'var(--ton-papier-linie)');
});

test('[White-Label] setzeSubDepotAkzent mit freiem Hex setzt literale Werte, kein var(--#…)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const e = await V.subDepotAnlegen({ bezeichnung: 'WL', inhaberin: 'Institution', verwaltungsTyp: 'verwaltet', akzent: '#334477' }, PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW);
  V.subKontextBetreten(e.depotUUID);
  const style = document.documentElement.style;
  assert.equal(style.getPropertyValue('--vm-chrome'), '#334477');
  assert.doesNotMatch(style.getPropertyValue('--vm-chrome-text'), /var\(--#/, 'kein var(--#…) — ungültige Custom-Property');
  assert.match(style.getPropertyValue('--vm-chrome-text'), /^#[0-9a-f]{6}$/);
  assert.match(style.getPropertyValue('--vm-akzent-stark'), /^#[0-9a-f]{6}$/);
  assert.match(style.getPropertyValue('--vm-linie'), /^#[0-9a-f]{6}$/);
  assert.match(style.getPropertyValue('--akzent-papier'), /^#[0-9a-f]{6}$/);
  assert.equal(style.getPropertyValue('--vm-chrome-mid'), 'color-mix(in srgb, #334477 82%, white)');
});

test('[White-Label·Rot-Beweis] ein Wert, der wie eine Farbe aussieht, es aber nicht ist, kommt nirgends als literale Farbe an', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const e = await V.subDepotAnlegen({ bezeichnung: 'Sch', inhaberin: 'X', verwaltungsTyp: 'verwaltet', akzent: '#zzzzzz' }, PW);
  // seit 09.10.2026: erster Ton der neuen Palette
  assert.equal(e.akzent, 'ton', 'ungültige Form fällt auf ton, kein Schmuggelweg über akzent');
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW);
  V.subKontextBetreten(e.depotUUID);
  assert.equal(document.documentElement.style.getPropertyValue('--vm-chrome'), 'var(--ton)');
});
