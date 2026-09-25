'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — D34: Entschlüsselungs-Fehlermeldung trennen (Datei kaputt vs. Passwort falsch)
   ────────────────────────────────────────────────────────────────────────
   Vorher fing EIN catch Parse- UND GCM-Fehler ab → eine vage Meldung. Jetzt:
   - Struktur-/Parse-/Format-Fehler → „… kann nicht gelesen werden … beschädigt oder keine
     Vivodepot-Datei." (dateiNichtLesbar)
   - GCM-Tag-Fehler (falsches Passwort) → „Das Passwort stimmt nicht." (entsperrPasswortFalsch)
   Konsistent in BEIDEN Anker-Aufrufern + Sub-Entsiegeln (gemeinsamer Wortlaut). Reine
   Fehler-Behandlung außerhalb des Krypto-Blocks — VdCrypto unberührt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw-12345678';

test('[D34] istGueltigerUmschlag: gültige Pflichtfelder → true, fehlende → false', () => {
  const { V } = ladeKern();
  const gut = { pbkdf2: { salt: 'x' }, depotSalt: 'y', depotUUID: 'u', iv: 'i', ct: 'c' };
  assert.equal(V.istGueltigerUmschlag(gut), true);
  assert.equal(V.istGueltigerUmschlag(null), false);
  assert.equal(V.istGueltigerUmschlag({}), false);
  assert.equal(V.istGueltigerUmschlag({ pbkdf2: {}, depotSalt: 'y', depotUUID: 'u', iv: 'i', ct: 'c' }), false, 'fehlendes pbkdf2.salt');
  assert.equal(V.istGueltigerUmschlag(Object.assign({}, gut, { ct: undefined })), false, 'fehlendes ct');
});

test('[D34] echter Umschlag aus depotSerialisieren ist gültig; falsches PW ≠ Struktur-Fehler', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();
  assert.equal(V.istGueltigerUmschlag(umschlag), true, 'echter Umschlag besteht die Struktur-Prüfung');
  // Falsches Passwort: Struktur ok (→ NICHT „kaputt"), aber depotLaden wirft (→ „Passwort falsch").
  const { V: V2 } = ladeKern();
  await assert.rejects(() => V2.depotLaden(umschlag, 'falsch-falsch-1'), 'GCM-Fehler bei falschem PW');
});

test('[D34] der Anker-Aufrufer trennt Parse vs. GCM; Sub-Entsiegeln nutzt denselben Wortlaut', () => {
  const { src, html } = ladeKern();
  // Zwei klare Wortlaute existieren.
  /* NACHGEZOGEN 19.08.2026 (A360): die Wortlaute liegen seit dem Heben im Textsatz. Geprüft
     wird der aufgelöste Wert — die Aussage ist dieselbe, die Quelle eine Ebene weiter. */
  const { V: VW } = ladeKern();
  assert.match(VW.STRINGS.dateiNichtLesbar, /^Diese Datei kann nicht gelesen werden/, 'Format-Fehler-Wortlaut');
  assert.equal(VW.STRINGS.entsperrPasswortFalsch, 'Das Passwort stimmt nicht.', 'Passwort-Wortlaut');
  // Vollerhebung Posten 12 (02.08.2026): der zweite, tote Anker-Aufrufer (flowDepotOeffnen, toast-Form)
  // ist entfernt — er war nie verdrahtet. Der einzige echte Weg (Crypto-Overlay) trennt Parse-/
  // Struktur-Fehler → dateiNichtLesbar von depotLaden-Fehler → entsperrPasswortFalsch, per zeigeFehler.
  /* Nachtrag 27.08.2026 (Vor-Depot-Sprachschalter, Strang 4): der echte Crypto-Overlay-Weg ruft
     seither `zeigeFehler(vorDepotText('…'))` — derselbe Wortlaut, nur mit Vor-Depot-Ersatz für den
     Fall, dass noch kein Depot existiert. `vorDepotText` fällt intern auf `STRINGS[…]` zurück, die
     Aussage dieser Probe (welcher Wortlaut zu welchem Fehler gehört) bleibt unverändert. Der tote
     Sub-Depot-Selbstbedienungs-Weg (flowSubDepotSelbstbedienung) trägt weiterhin den reinen
     STRINGS.-Aufruf — beide Formen zählen. */
  const dateiNichtLesbarMuster = /catch \(e\) \{ zeigeFehler\((?:STRINGS\.dateiNichtLesbar|vorDepotText\('dateiNichtLesbar'\))\); return; \}/g;
  assert.equal((src.match(dateiNichtLesbarMuster) || []).length >= 1, true, 'Parse→dateiNichtLesbar (zeigeFehler-Aufrufer)');
  assert.ok(/zeigeFehler\((?:STRINGS\.entsperrPasswortFalsch|vorDepotText\('entsperrPasswortFalsch'\))\)/.test(src), 'GCM→entsperrPasswortFalsch (zeigeFehler-Aufrufer)');
  assert.ok(/!istGueltigerUmschlag\(umschlag\)/.test(src), 'Struktur-Check vor dem Entschlüsseln');
  // Sub-Entsiegeln teilt den „Das Passwort stimmt nicht"-Wortlaut.
  assert.match(VW.STRINGS.subFalsch, /^Das Passwort stimmt nicht/, 'Sub-Entsiegeln: gemeinsamer Wortlaut');
});
