'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-213: PBKDF2 statt Argon2id — gemessen, nicht nur vermutet
   ────────────────────────────────────────────────────────────────────────
   Schließt einen seit 23.05.2026 offenen Punkt eines externen Krypto-
   Gutachtens (Befund 1.3, „PBKDF2 statt Argon2id"). Zwei testbare Aussagen
   aus dem ADR, keine erfundene Probe für die Kernaussagen selbst (Testvektor-
   Umfang, Implementierungs-Pflegezustand, GPU-Benchmarks, Gerätekosten —
   Tatsachen über die Außenwelt zum Messzeitpunkt, keine Eigenschaft des
   eigenen Codes, s. ADR und der referenzierte interne Messbericht).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ohneKommentareUndStrings } = require('../tools/g11-js-code-ohne-kommentare-strings.js');

test('[U2-ADR-213] keine mitgelieferte Argon2/Argon2id-Fremdimplementierung im Kern', () => {
  const { html } = ladeKern();
  // Kommentare/Strings ausgeschlossen (wie beim G11-Netzcode-Muster): ein Code-Kommentar oder
  // ADR-Verweis, der „Argon2id" nennt, ist keine Implementierung — nur echter Code zählt.
  const code = ohneKommentareUndStrings(html);
  assert.doesNotMatch(code, /argon2/i,
    'ADR-213 Grund 2: keine der geprüften Browser-Implementierungen vereint Pflege, echte ' +
    'RFC-9106-Vektoren im eigenen Test und ein unabhängiges Audit — solange das so bleibt, ' +
    'bleibt PBKDF2 die Wahl. Findet dieser Wächter „argon2" im ausführbaren Code, wurde diese ' +
    'Entscheidung stillschweigend unterlaufen.');
});

test('[U2-ADR-213] KRYPTO_VERSION_ALLOWLIST trägt schon heute mehr als eine Generation', () => {
  const { html } = ladeKern();
  const m = html.match(/const KRYPTO_VERSION_ALLOWLIST\s*=\s*\[([^\]]*)\]/);
  assert.ok(m, 'KRYPTO_VERSION_ALLOWLIST-Deklaration gefunden (sonst umbenannt — ADR-213 Grund 5 nachziehen)');
  const anzahl = m[1].split(',').map((s) => s.trim()).filter(Boolean).length;
  assert.ok(anzahl >= 2,
    'ADR-213 Grund 5: die Allowlist-Mechanik trägt schon heute mehr als eine aktive ' +
    'kryptoVersion-Generation nebeneinander (harte Freigabeliste statt stillem Fallback) — das ' +
    'ist ein erprobtes, kein hypothetisches Muster. Gefunden: ' + anzahl);
});

/* ── Rot-Beweis (A348 Zug 4) — die erste Probe fängt eine gepflanzte Verletzung wirklich,
   nicht nur dem Namen nach. Lief NIE gegen den echten Kern-Text, nur gegen einen erfundenen
   Ausschnitt — ein Rot-Beweis, der den echten Bestand mutiert, mäße den Bestand, nicht sich
   selbst (dieselbe Regel wie beim A348-Werkzeug selbst, s. tools/rot-beweis-pflicht-pruefen.js). */
test('[U2-ADR-213·Rot-Beweis] eine gepflanzte Argon2-Verwendung im Kern-Code wird gefunden', () => {
  const gepflanzterAusschnitt = "const schluessel = await hashwasm.argon2id({ password, salt });";
  const code = ohneKommentareUndStrings(gepflanzterAusschnitt);
  assert.match(code, /argon2/i,
    'Gate-Nachweis: eine echte Argon2id-Verwendung in Code (nicht in Kommentar/String) muss die ' +
    'erste Probe oben zum Anschlagen bringen — sonst prüft sie nichts.');
});

test('[U2-ADR-213·Gegenprobe] eine bloße Kommentar-Erwähnung von Argon2id schlägt NICHT an', () => {
  const nurKommentar = "// U2-ADR-213: PBKDF2 statt Argon2id.\nconst x = 1;";
  const code = ohneKommentareUndStrings(nurKommentar);
  assert.doesNotMatch(code, /argon2/i,
    'ein ADR-Verweis im Kommentar ist keine Implementierung — sonst könnte dieses ADR sich selbst ' +
    'nie im Kern-Code zitieren, ohne die eigene Probe auszulösen.');
});
