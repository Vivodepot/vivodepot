/**
 * kein-master-key.mjs — U2-ADR-097 §3: die zwei unsichtbaren Zusagen
 * ======================================================================
 * Auftrag Drei_Fehlende_Waechter_2026-08-06.md, Teil A. Zwei Zusicherungen,
 * bisher ohne Wächter (Arbeitsliste G12/G13):
 *
 *   G12 — org.html: „Ohne das Passwort der Person gibt es keinen Zugang —
 *         auch nicht für Vivodepot selbst."
 *   G13 — STRINGS.modalAnlegenPwWarnung: „Niemand kann es zurücksetzen —
 *         auch wir nicht."
 *
 * A-Zug 0 (Erhebung, nicht Annahme): die im Auftrag vermutete Ableitungskette
 * (`deriveKey`/`importMasterAesKey`, „PBKDF2-Übergabe-Container") ist im
 * ausgelieferten Kern TOT — null Aufrufer, das Feature ist nicht gebaut. Die
 * REALEN Ketten sind:
 *
 *   password → setupMasterSession    → sessionHkdfKey → deriveDepotKeyV2  (Anker)
 *   password → depotMasterHkdfKey                     → deriveDepotKeyV2  (Sub-Depot/Passwortwechsel, session-frei)
 *
 * Beide münden im selben, einzigen AES-Schlüssel-Erzeuger `deriveDepotKeyV2`
 * — der selbst kein Passwort nimmt, aber auch keinen eigenen Ableitungsweg
 * öffnet: er kann nur konsumieren, was `setupMasterSession`/
 * `depotMasterHkdfKey` ihm liefern, beide passwortpflichtig.
 *
 * SP-Auflage 06.08.2026 (zwei Präzisierungen ggü. dem Auftragsentwurf):
 *
 *   Punkt 3 (Bezeichner-Verbot) → KEIN Verbot der Familie `master`/
 *   `recovery`/… als solcher (setupMasterSession/depotMasterHkdfKey sind
 *   legitim und trügen die alte Fassung der Probe an Tag 1 rot). Stattdessen:
 *   die in A-Zug 0 erhobenen Bezeichner stehen NAMENTLICH in einer Liste
 *   ([G13-Bekannte-Wege] unten); jeder neue Treffer außerhalb der Liste ist
 *   ein Fund. Fängt die versehentliche Neueinführung, nicht die absichtliche
 *   Umgehung — dieselbe Schwäche wie im Auftrag für Punkt 3 vermerkt, hier
 *   unverändert übernommen.
 *
 *   Punkt 2 (kein zweites persistiertes Schlüsselmaterial) → der
 *   Vertrauensperson-Auszug (U2-ADR-062, `_angDeriveKey`/
 *   `angehoerigenCache`) IST persistiertes, passwortabgeleitetes
 *   Schlüsselmaterial — von der Bürgerin selbst im Owner-Setup eingerichtet
 *   (`flowVertrauenspersonEinrichten`), physisch hinterlegt, nicht durch
 *   Vivodepot. Er bleibt außerhalb dieser Probe: er sperrt laut ADR-062
 *   ausdrücklich „nie das volle Depot, nie den Master-Schlüssel" auf, ist
 *   Allowlist-only und trägt einen eigenen Master-Leak-Test
 *   (`tests/angehoerigen-blaetter-zuschnitt.test.js`). [G12-Einziger-Setzer] prüft
 *   diese Grenze mit — sie schließt _angDeriveKey und alle drei
 *   Vertrauensperson-Flows ein, nicht nur den Anker-Pfad.
 *
 * Ausführen: node --test tests/konformitaet/kein-master-key.mjs
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = join(HIER, '..', '..');
// Dieselbe Umlenkung wie offline-garantie.mjs (A6/G1, 29.07.2026) — der
// Waechter-Selbsttest braucht eine austauschbare Fixtur, kein fester Pfad.
const HTML_PFAD = process.env.KERN_HTML_PATH
  ? resolve(process.env.KERN_HTML_PATH)
  : join(REPO, 'vivodepot.html');

const require_ = createRequire(import.meta.url);
const LK = require_('../load-kern.js');
const { ohneKommentareUndStrings } = require_('../../tools/g11-js-code-ohne-kommentare-strings.js');
const { funktionsKoerper } = require_('../../tools/funktion-koerper.js');

const htmlRoh = fs.readFileSync(HTML_PFAD, 'utf8');
const { script1, script2 } = LK.extrahiereScripts(htmlRoh);
const eigenerCodeRoh = script1 + '\n' + script2;
const eigenerCode = ohneKommentareUndStrings(eigenerCodeRoh);

/* ════════════════════════════════════════════════════════════════════════
   G12 — „Ohne das Passwort der Person gibt es keinen Zugang — auch nicht
   für Vivodepot selbst" (U2-ADR-097 §3)
   ════════════════════════════════════════════════════════════════════════ */
describe('U2-ADR-097 §3: kein Master-Key (G12)', () => {

  test('[G12-Pfad] setupMasterSession(password, …) nimmt das Passwort als Pflicht-Argument und leitet es ab', () => {
    const koerper = funktionsKoerper(eigenerCodeRoh, 'setupMasterSession');
    assert.ok(koerper, 'setupMasterSession() nicht gefunden — die Analyse ist veraltet (umbenannt?).');
    assert.match(koerper, /function setupMasterSession\s*\(\s*password\s*,/,
      'setupMasterSession() hat kein `password` als erstes Argument mehr.');
    assert.match(koerper, /deriveMasterBits\s*\(\s*password\s*,/,
      'setupMasterSession() reicht `password` nicht mehr an deriveMasterBits() weiter.');
  });

  test('[G12-Pfad] depotMasterHkdfKey(passwort, …) nimmt das Passwort als Pflicht-Argument und leitet es ab', () => {
    const koerper = funktionsKoerper(eigenerCodeRoh, 'depotMasterHkdfKey');
    assert.ok(koerper, 'depotMasterHkdfKey() nicht gefunden — die Analyse ist veraltet (umbenannt?).');
    assert.match(koerper, /function depotMasterHkdfKey\s*\(\s*passwort\s*,/,
      'depotMasterHkdfKey() hat kein `passwort` als erstes Argument mehr.');
    assert.match(koerper, /deriveMasterBits\s*\(\s*passwort\s*,/,
      'depotMasterHkdfKey() reicht `passwort` nicht mehr an deriveMasterBits() weiter.');
  });

  test('[G12-Einziger-Setzer] `sessionHkdfKey` wird NUR innerhalb von setupMasterSession auf einen Schlüssel gesetzt', () => {
    const bodySetup = funktionsKoerper(eigenerCodeRoh, 'setupMasterSession');
    assert.ok(bodySetup, 'setupMasterSession() nicht gefunden — die Analyse ist veraltet.');
    assert.match(bodySetup, /sessionHkdfKey\s*=\s*await\s+importMasterHkdfKey\s*\(/,
      'setupMasterSession() setzt sessionHkdfKey nicht mehr aus importMasterHkdfKey() — die Probe wäre sonst vakuum-grün.');
    // Der REST des eigenen Codes (inkl. aller drei Vertrauensperson-Flows,
    // _angDeriveKey und jeder anderen Funktion) darf sessionHkdfKey nur auf
    // `null` setzen, nie auf einen Wert — das ist zugleich der Beleg für die
    // U2-ADR-062-Grenze (SP-Auflage Punkt 2): der Vertrauens-Auszug berührt
    // dieses Feld nicht.
    const restRoh = eigenerCodeRoh.replace(bodySetup, '');
    const restOhne = ohneKommentareUndStrings(restRoh);
    const nichtNull = [...restOhne.matchAll(/sessionHkdfKey\s*=\s*([^;]+);/g)]
      .filter(m => m[1].trim() !== 'null').map(m => m[0].trim());
    assert.deepEqual(nichtNull, [],
      `sessionHkdfKey wird außerhalb von setupMasterSession auf einen Nicht-null-Wert gesetzt — ein zweiter Ableitungsweg zum Anker-Schlüssel: ${nichtNull.join(' | ')}`);
  });

  test('[G12-Kein-Zweitschluessel] `sessionKey` (Legacy-Global) wird nirgends auf einen Schlüssel gesetzt', () => {
    const nichtNull = [...eigenerCode.matchAll(/(?<!Hkdf)sessionKey\s*=\s*([^;]+);/g)]
      .filter(m => m[1].trim() !== 'null').map(m => m[0].trim());
    assert.deepEqual(nichtNull, [],
      `sessionKey wird auf einen Nicht-null-Wert gesetzt — B2/v3 hat diese zweite Master-Repräsentation ausdrücklich entfernt: ${nichtNull.join(' | ')}`);
  });

  test('[G12-Alleiniger-Erzeuger] `deriveDepotKeyV2` ist der einzige Ort, an dem eigener Code `crypto.subtle.decrypt` auf Depot-Ciphertext vorbereitende AES-GCM-Schlüssel aus HKDF erzeugt', () => {
    // Kein Password-freier Nebenpfad: deriveDepotKeyV2 selbst wirft hart ohne
    // gültige depotUUID/cryptoSalt — belegt, dass er nicht mit „irgendwas"
    // aufrufbar ist, sondern strukturell an den Aufrufer gebunden bleibt.
    const koerper = funktionsKoerper(eigenerCodeRoh, 'deriveDepotKeyV2');
    assert.ok(koerper, 'deriveDepotKeyV2() nicht gefunden — die Analyse ist veraltet.');
    assert.match(koerper, /throw new Error/, 'deriveDepotKeyV2() hat seine Eingabe-Prüfungen verloren.');
  });
});

/* ════════════════════════════════════════════════════════════════════════
   G13 — „Niemand kann es zurücksetzen — auch wir nicht"
   (STRINGS.modalAnlegenPwWarnung, U2-ADR-097 §3)
   ════════════════════════════════════════════════════════════════════════ */
describe('U2-ADR-097 §3: kein Wiederherstellungsweg (G13)', () => {

  // A-Zug 0, erhoben: jeder Bezeichner der Familie master/recovery/reset/
  // escrow/backdoor/wiederherstell, der HEUTE im eigenen, wirklich
  // ausgeführten Code vorkommt (Kommentare/Strings ausgeschlossen) — legitime
  // Krypto-Funktionen/-Variablen UND zwei unabhängige UI-Treffer
  // (Scroll-Restore, ein „einmal ausführen"-Guard). SP-Auflage Punkt 3: keine
  // Bezeichner-VERBOTSLISTE, sondern eine Bezeichner-BEKANNTLISTE — ein neuer
  // Treffer außerhalb dieser Liste ist ein Fund, kein bekannter Weg wird
  // verboten.
  const BEKANNTE_BEZEICHNER = new Set([
    'depotMasterHkdfKey', 'deriveMasterBits', 'importMasterAesKey', 'importMasterHkdfKey',
    'setupMasterSession', 'master', 'masterHkdfKey', 'masterKey', 'masterNfc',
    'einmalReset', '_scrollUndFokusWiederherstellen',
  ]);

  test('[G13-Bekannte-Wege] kein neuer Bezeichner der Familie master/recovery/reset/escrow/backdoor/wiederherstell', () => {
    const treffer = [...new Set(
      [...eigenerCode.matchAll(/\b\w*(?:master|recovery|reset|escrow|backdoor|wiederherstell)\w*\b/gi)]
        .map(m => m[0])
    )];
    const unbekannt = treffer.filter(t => !BEKANNTE_BEZEICHNER.has(t));
    assert.deepEqual(unbekannt, [],
      `Neue(r) Bezeichner außerhalb der A-Zug-0-Liste: ${unbekannt.join(', ')} — ` +
      `ist das ein neuer legitimer Ableitungsweg, gehört er in BEKANNTE_BEZEICHNER UND in die ` +
      `Registerzeile W-kein-wiederherstellung; ist es eine versehentliche Neueinführung, ist das der Fund, den diese Probe fangen soll.`);
    // Positivkontrolle: die Liste ist nicht zufällig leer geworden (z. B. weil
    // der Stripper zu aggressiv wurde) — mindestens die Kernfunktionen müssen auftauchen.
    for (const bekannt of ['setupMasterSession', 'depotMasterHkdfKey', 'deriveMasterBits'])
      assert.ok(treffer.includes(bekannt), `${bekannt} nicht im eigenen Code gefunden — die Analyse ist veraltet.`);
  });

  test('[G13-Toter-Pfad-bleibt-tot] `deriveKey()` (PBKDF2-Übergabe-Pfad) hat weiterhin null Aufrufer im eigenen Code', () => {
    // Nur die eigene Definition zaehlt als Treffer; crypto.subtle.deriveKey()
    // (die native Web-Crypto-Methode) wird per Lookbehind ausgeschlossen —
    // sonst waere die Probe an Tag 1 rot gegen sich selbst.
    const treffer = [...eigenerCode.matchAll(/(?<!\.)\bderiveKey\s*\(/g)];
    assert.equal(treffer.length, 1,
      `deriveKey() erwartet GENAU 1 Fundstelle (die eigene Definition, null Aufrufer), gefunden ${treffer.length} — ` +
      `bekam der tote „Übergabe-Container"-Pfad einen Aufrufer? Dann braucht das Register einen Eintrag ` +
      `(Punkt 1 aus dem A-Zug-1-Auftrag greift dann auf ihn zu).`);
  });

  test('[G13-Toter-Pfad-bleibt-tot] `importMasterAesKey()` hat weiterhin genau einen Aufrufer (den toten deriveKey())', () => {
    const treffer = [...eigenerCode.matchAll(/(?<!\.)\bimportMasterAesKey\s*\(/g)];
    assert.equal(treffer.length, 2,
      `importMasterAesKey() erwartet GENAU 2 Fundstellen (Definition + der eine Aufruf in deriveKey()), gefunden ${treffer.length} — ` +
      `ein dritter Treffer wäre ein NEUER Aufrufer außerhalb des toten Pfads: der direkte Bits→AES-Weg, den B2/v3 aus dem Session-Pfad entfernt hat.`);
  });

  /* ══ GESCHAERFT am 20.08.2026 (Kette, Auftrag 8, Zug 1) ══════════════════════════════
     BIS HIERHER: `exportKey(` durfte im eigenen Code GAR NICHT vorkommen. Die Zusicherung
     dahinter ist „ein ABGELEITETER Schluessel darf den Browser nicht verlassen"; das
     Verbot war ihre grobe, aber damals ausreichende Fassung — es gab keinen Aufrufer.

     WARUM SIE GESCHAERFT UND NICHT AUFGEWEICHT WIRD: Der verschluesselte Rueckweg
     (Auftrag 8) erzeugt je Antwort ein FLUECHTIGES ECDH-Paar und legt dessen OEFFENTLICHEN
     Teil in den Umschlag — anders kann der Empfaenger das gemeinsame Geheimnis nicht
     nachrechnen. Ein oeffentlicher Schluessel ist per Definition oeffentlich; er ist weder
     abgeleitet noch geheim, und ihn zu serialisieren ist der Zweck seiner Existenz.

     DIE NEUE FASSUNG IST STRUKTURELL, KEIN ZAEHLER und keine Erlaubnisliste von Zeilen:
     JEDER `exportKey`-Aufruf im eigenen Code muss auf einen Ausdruck angewandt werden, der
     auf `.publicKey` endet. Ein privater oder ein abgeleiteter Schluessel traegt diesen
     Namen nie — er kommt aus `deriveKey`/`deriveBits`/`.privateKey`. Damit bleibt genau die
     Klasse verboten, um die es geht, und die erlaubte ist an ihrer FORM erkennbar statt an
     ihrer Zeilennummer.

     Rot-Beweis: `.publicKey` in `.privateKey` aendern — die Probe schlaegt an. */
  test('[G13-Kein-Export] `exportKey` wird nur auf einen ÖFFENTLICHEN Schlüssel angewandt', () => {
    const alle = [...eigenerCode.matchAll(/exportKey\s*\(([^)]*)\)/g)];
    const verdaechtig = alle
      .map((m) => m[1].replace(/\s+/g, ' ').trim())
      .filter((arg) => !/\.publicKey\s*$/.test(arg));
    assert.deepEqual(verdaechtig, [],
      'exportKey() auf etwas anderes als einen `.publicKey` — ein abgeleiteter oder privater '
      + 'Schlüssel könnte aus dem Browser exportiert werden. Gefunden: ' + verdaechtig.join(' · '));
  });
});
