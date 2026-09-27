#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Werkzeug — YBOC „xShare Yellow Button One-Time Share WF": Belegstrecke.

   Fährt die Schritte des Gazelle-Tests am ECHTEN Kern (file://, Playwright)
   und legt je Schritt einen Screenshot ab:

     10  Anmeldung als natürliche Person  (Depot offen, Persona sichtbar)
     20  Dokument gewählt                 (autoritativer Eintrag, Detail offen)
     30  Freigabe-Link erzeugt            (shlink:/-URI sichtbar, kopierbar)

   Danach spielt es den EMPFÄNGER (Monarch) nach, so wie er es täte:
   shlink:/-Payload dekodieren → url + key → HTTP GET → JWE entschlüsseln →
   gegen das Original vergleichen. Das ist der Beleg für Schritt 50.

   Schritt 40 (REQUEST_MANIFEST) kann dieses Werkzeug NICHT belegen: der Kern
   setzt flag:'U' (Direkt-GET, U2-ADR-047), es existiert kein Manifest.

   VOR DEM AUSLIEFERN: DAS DOKUMENT PRUEFEN LASSEN, VON JEMANDEM DER NICHT WIR SIND.
   Am 18.09.2026 ging aus diesem Werkzeug ein Beleg an ein EU-Projekt, dessen Dokument
   FHIR-Pflichtfelder nicht hatte — `Composition.status`, `.type`, `.date`,
   `Narrative.status`, `Observation.status`. Aufgefallen ist es erst, als ein FREMDER
   SHL-Viewer daran abstuerzte. Der offizielle HL7-Validator, den dieses Haus besitzt
   (`tests/konformitaet/externe-validatoren.mjs`, `validator_cli.jar` 6.9.12), war nie
   darauf gezeigt worden. Nachtraeglich gefahren fand er **12 Fehler in 11 Sekunden.**
   Ein Lauf haette gereicht.
   Also: bevor ein Ergebnis dieses Werkzeugs nach aussen geht, den Validator ueber das
   Dokument fahren — `FHIR_VALIDATOR_JAR` setzen (JAR: `node tools/hl7-validator-beschaffen.js`,
   Java 21 liegt unter /opt/homebrew/opt/openjdk@21, `/usr/bin/java` ist nur der
   macOS-Platzhalter und taeuscht "kein Java" vor).
   Der Schritt gehoert NICHT hier hinein, sondern eine Ebene hoeher: dieses Werkzeug ist
   einer von mehreren Wegen nach draussen (PDF, vCard, ICS, Datei-Ausgabe), und ein Pruefer,
   der nur an einem Weg haengt, deckt nur diesen. Offener Posten, hergeleitet aus einer
   internen Befund-Notiz vom 18.09.2026.

   Aufruf:
     node tools/shl-belegstrecke.js --ziel <ordner> --hochladen
        volle Strecke inkl. echtem Upload auf share.vivodepot.de
        ACHTUNG: verbraucht eine Ablage (One-Time) und einen Rate-Limit-Platz.

     node tools/shl-belegstrecke.js --ziel <ordner>
        Strecke ohne Netz: Platzhalter-URL, Schritte 10-30 werden belegt,
        der Empfänger-Teil entfällt.

     node tools/shl-belegstrecke.js --dokument <pfad> …
        Fährt die Strecke mit EINEM BESTIMMTEN Bündel statt der Fixture.
        Nötig, sobald der Lauf einen KONFORMITÄTS-Beleg erzeugt: die Fixture
        ist profil-agnostisch (s. Kommentar an FIXTURE) und trägt bewusst
        keinen echten Inhalt. Ohne dieses Argument läuft alles wie bisher
        gegen die Fixture, damit die Suite das Werkzeug ohne interne Belegdaten prüfen
        kann. (--probe <pfad>: eine andere selbst erzeugte Probe, z. B. englisch.)

     --weg direkt|manifest
        Welcher Freigabeweg belegt wird: direkt = U-Flag (Voreinstellung),
        manifest = Regelweg der Spezifikation, kein Flag im Link.
     --kern <pfad>
        Anderes Produkt als das gebackene privat-de, z. B. privat-en.
     --kein-abruf
        Empfänger-Nachspiel auslassen: der Link bleibt für die Gegenstelle offen.

   Der Kern macht dabei zu keinem Zeitpunkt einen Netzaufruf — hochgeladen und
   abgerufen wird von HIER, außerhalb der Seite (connect-src 'none' bleibt).
   ════════════════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');
const nodeCrypto = require('node:crypto');
const { chromium } = require('playwright');
// Dieselben Helfer, die die e2e-Suite benutzt — inklusive der FSA-Attrappe, ohne die der
// Anlege-Weg im Kopflos-Browser am Dateiziel hängen bleibt (tests/e2e/helpers.js).
const { oeffneApp, depotAnlegen, einmalDialogeSchliessen, setzeFeld } = require('../tests/e2e/helpers.js');

const REPO = path.resolve(__dirname, '..');
// Der Kern, gegen den gefahren wird. Vorgabe ist das GEBACKENE Produkt privat-de, dasselbe, gegen
// das die E2E-Suite fährt (tests/e2e/global-setup.js): die rohe vivodepot.html ist seit dem
// Produktschnitt ein Gerüst ohne Bereiche, und die Strecke hing daran schon beim Anlegen (gemessen
// 26.09.2026). --kern zeigt auf ein anderes Produkt, etwa privat-en für einen Beleg, der nach außen
// geht. ACHTUNG: ein Produkt, das älter ist als die Wahl des Freigabewegs, kennt --weg nicht —
// dagegen stehen der Anker-Check in wegEinsetzen() und der Wächter weiter unten, der den fertigen
// Link gegen den verlangten Weg hält.
function kernVorgabe() {
  const g = require('../tests/e2e/global-setup.js');
  g.gebackeneProdukteSicherstellen();
  return g.GEBACKENE_PRODUKT_PFADE['privat-de'];
}
// Selbst erzeugt seit 12.09.2026 (Produktentscheidung: kein Fremdmaterial in tests/fixtures/) —
// die Belegstrecke prüft den SHL-Weg (byte-verbatim, profil-agnostisch), nicht den Bündel-Inhalt.
//
// REICHWEITE DIESES SATZES (21.09.2026): er gilt für den SHL-Weg-Beleg, NICHT für einen
// Konformitäts-Beleg. Am 18.09.2026 ist die Fixture über dieses Werkzeug in Gazelle TI-727
// gelandet und damit an eine fremde Gegenstelle gegangen. Gemessen: sie trägt keinen
// DiagnosticReport (Bundle-eu-lab verlangt ihn, min=1 max=1 in den Fassungen 0.1.1 und 2.0.0)
// und nennt das Profil unter einer Adresse, die in keiner Fassung existiert
// (https://fhir.hl7.eu/… statt http://hl7.eu/fhir/…). Für den Byte-verbatim-Nachweis ist das
// gleichgültig, für einen Konformitäts-Beleg nicht. Wer einen solchen erzeugt, gibt das
// Dokument über --dokument mit; der echte, von Gazelle bestätigte Datensatz liegt
// bauartbedingt AUSSERHALB des Repos (tests/fixtures/README.md).
const FIXTURE_VORGABE = path.join(REPO, 'tests', 'fixtures', 'eigenprobe-eu-lab.json');
// --probe: eine andere selbst erzeugte Probe. Der Beleg für ein Projekt, das kein Deutsch liest,
// braucht auch das DOKUMENT englisch — Vivodepot übersetzt autoritative Dokumente nicht, es gibt
// sie wörtlich wieder. Also muß die Probe selbst englisch sein. (--dokument unten ist derselbe
// Schalter für ein beliebiges, nicht selbst erzeugtes Bündel und hat Vorrang.)
const FIXTURE = (() => {
  const i = process.argv.indexOf('--probe');
  return i === -1 ? FIXTURE_VORGABE : path.resolve(process.argv[i + 1]);
})();
const HOST_UPLOAD = 'https://share.vivodepot.de/hochladen.php';
const PLATZHALTER_URL = 'https://beispiel.invalid/shl/belegstrecke';

// Persona und Benennung folgen dem Belegweg von TI-568 (Tests/ti568-neulauf-2026-09-01):
// synthetische Testperson, Dateien `<Praefix>_Step<NN><a|b>_<Sache>.png`. Über Argumente
// änderbar, damit derselbe Lauf für eine andere Instanz nichts umschreiben muss.
const PERSONA = { vorname: 'Marta', nachname: 'Villa', email: 'marta.villa@example.org' };
const PW = 'belegstrecke-passwort-123';
const PRAEFIX_STANDARD = 'YBOC';

function b64uToBuf(s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }

// Genau das, was ein SHL-Empfänger tut: JWE compact (alg:dir, enc:A256GCM) mit dem
// Schlüssel aus dem shlink:/-Payload entschlüsseln.
function jweDirEntschluesseln(jwe, keyB64u) {
  const [prot, , iv, ct, tag] = String(jwe).split('.');
  const d = nodeCrypto.createDecipheriv('aes-256-gcm', b64uToBuf(keyB64u), b64uToBuf(iv));
  d.setAAD(Buffer.from(prot, 'ascii'));
  d.setAuthTag(b64uToBuf(tag));
  return Buffer.concat([d.update(b64uToBuf(ct)), d.final()]).toString('utf8');
}

/* Den Freigabeweg im Produkt wählen, ohne es von außen umzubiegen. Die Oberfläche hat dafür noch
   keinen Knopf (bewusst zurückgestellt); ein Knopf täte nichts anderes, als die Option `weg` an
   shlProviderPayload zu geben. Ein Ersetzen über window.__vdOeffentlich erreicht den internen
   Aufruf in flowShlVorbereiten nicht (lexikalische Bindung) — also geschieht es so, wie der Kern
   es für genau diesen Fall vorsieht: im QUELLTEXT einer KOPIE des gebackenen Produkts, an genau
   einer Stelle. Die App rechnet weiter selbst; weder die JWE noch shlUriBauen werden angefasst.
   Findet sich der Anker nicht genau einmal, ist das Produkt älter oder umgebaut: dann bricht die
   Strecke ab, statt still den Direkt-Weg zu belegen. */
const WEG_ANKER = 'shlProviderPayload(id, { label: e.beschriftung })';
function wegEinsetzen(kernPfad, weg, ziel) {
  if (weg === 'direkt') return kernPfad;
  const text = fs.readFileSync(kernPfad, 'utf8');
  const treffer = text.split(WEG_ANKER).length - 1;
  if (treffer !== 1) {
    throw new Error('--weg ' + weg + ': der Aufruf ' + WEG_ANKER + ' steht ' + treffer + '× im Produkt, erwartet 1× — '
      + 'das Produkt kennt die Wahl des Freigabewegs nicht oder ist umgebaut.');
  }
  const kopie = path.join(ziel, 'kern-weg-' + weg + '.html');
  fs.writeFileSync(kopie, text.replace(WEG_ANKER, 'shlProviderPayload(id, { label: e.beschriftung, weg: ' + JSON.stringify(weg) + ' })'));
  return kopie;
}

async function hochladen(jwe) {
  const form = new FormData();
  form.append('datei', new Blob([jwe], { type: 'application/jose' }), 'belegstrecke.jwe');
  const antwort = await fetch(HOST_UPLOAD, { method: 'POST', body: form });
  const daten = await antwort.json().catch(() => null);
  if (!antwort.ok || !daten || !daten.url) {
    throw new Error('Upload fehlgeschlagen: HTTP ' + antwort.status + ' ' + JSON.stringify(daten));
  }
  // Der Host liefert ZWEI Adressen zu derselben Ablage: `url` für den Direkt-GET (U-Flag)
  // und `manifest_url` für den Manifest-Weg. Welche in den Link wandert, entscheidet --weg.
  return daten;
}

// Offene Einmal-/Hinweis-Dialoge schließen. Der Anlege-Weg öffnet je nach Stand mehrere
// nacheinander; solange einer offen ist, fängt seine Rückwand jeden Klick dahinter ab.
async function modaleSchliessen(seite) {
  for (let i = 0; i < 8; i++) {
    const offen = await seite.locator('#modal-rueck.an').isVisible().catch(() => false);
    if (!offen) return;
    const ok = seite.locator('#m-ok');
    if (await ok.isVisible().catch(() => false)) await ok.click().catch(() => {});
    else await seite.keyboard.press('Escape').catch(() => {});
    await seite.waitForTimeout(200);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const zielIdx = argv.indexOf('--ziel');
  const ziel = zielIdx === -1 ? path.join(REPO, 'belegstrecke-ausgabe') : argv[zielIdx + 1];
  const echterUpload = argv.includes('--hochladen');
  // --hochladen schreibt gegen den Live-Host: nicht aus einer Agentensitzung, nicht aus einem Test (ohne --hochladen offline, frei).
  if (echterUpload) require('./lib/live-sperre.js').liveSperreDurchsetzen('shl-belegstrecke --hochladen');
  /* Das Empfänger-Nachspiel VERBRAUCHT die Freigabe — sie gilt für genau einen Abruf. Für
     einen Beleg, dessen Link anschließend an eine Gegenstelle geht, muss es unterbleiben,
     sonst ist der Link tot, bevor sie ihn holt. Ohne diesen Schalter läuft das Nachspiel wie
     bisher; dann ist der Lauf eine Eigenprobe und der Link danach verbraucht. */
  const keinAbruf = argv.includes('--kein-abruf');
  const wert = (name, fallback) => { const i = argv.indexOf(name); return i === -1 ? fallback : argv[i + 1]; };
  const persona = {
    vorname: wert('--vorname', PERSONA.vorname),
    nachname: wert('--nachname', PERSONA.nachname),
    email: wert('--email', PERSONA.email),
  };
  const praefix = wert('--praefix', PRAEFIX_STANDARD);
  /* Welcher der beiden Freigabewege belegt wird. 'direkt' = U-Flag (der bisherige Stand,
     Voreinstellung), 'manifest' = der Regelweg der Spezifikation. Beim Manifest-Weg wandert
     nicht die Direkt-Adresse in den Link, sondern die Manifest-Adresse, die der Ablage-Host
     beim Hochladen mitliefert. */
  const weg = wert('--weg', 'direkt');
  if (weg !== 'direkt' && weg !== 'manifest') throw new Error('--weg: nur "direkt" oder "manifest"');
  const kernArg = wert('--kern', null);
  const kernPfad = kernArg ? path.resolve(kernArg.replace(/^file:\/\//, '')) : kernVorgabe();
  if (!fs.existsSync(kernPfad)) throw new Error('--kern zeigt auf nichts: ' + kernPfad);
  fs.mkdirSync(ziel, { recursive: true });
  const KERN = 'file://' + wegEinsetzen(kernPfad, weg, ziel);

  const protokoll = [];
  const merke = (zeile) => { protokoll.push(zeile); console.log(zeile); };
  // Ohne --dokument die Fixture (oder --probe): dann läuft das Werkzeug auch ohne interne Belegdaten.
  // Mit --dokument das mitgegebene Bündel — der Weg für Konformitäts-Belege.
  const dokument = wert('--dokument', FIXTURE);
  if (!fs.existsSync(dokument)) throw new Error('Dokument nicht gefunden: ' + dokument);
  const original = fs.readFileSync(dokument, 'utf8');
  merke('Kern: ' + kernPfad + (weg === 'direkt' ? '' : '  (Kopie mit Freigabeweg ' + weg + ', s. wegEinsetzen)'));
  merke('Dokument: ' + dokument + (dokument === FIXTURE_VORGABE ? '  (Fixture — profil-agnostisch, KEIN Konformitäts-Beleg)' : ''));

  const browser = await chromium.launch();
  /* Hohes Fenster, aber HERUNTERSKALIERT statt vergrößert: der Beleg für Schritt 10 muss
     Vorname, Nachname UND E-Mail in EINEM Bild zeigen — der Schritt-10-Kommentar sagt das
     ausdrücklich zu. Bei 900 Pixel Höhe fiel die E-Mail-Zeile unter den Rand (gemessen
     21.09.2026). Ein größeres Bild löst es nicht: es wird nur größer, nicht vollständiger.
     Deshalb mehr Seite ins Bild holen und die Auflösung senken — das Bild bleibt handlich,
     der Inhalt wird vollständig. --hoehe setzt die Fensterhöhe anders. */
  const hoehe = Number(wert('--hoehe', '1600')) || 1600;
  const seite = await browser.newPage({
    viewport: { width: 1280, height: hoehe },
    deviceScaleFactor: 0.75,
  });
  const schuss = async (name) => {
    const p = path.join(ziel, praefix + '_' + name + '.png');
    await seite.screenshot({ path: p, fullPage: false });
    merke('  Screenshot: ' + p);
  };

  try {
    /* ── Schritt 10: Anmeldung als natürliche Person ───────────────────── */
    merke('\n── Schritt 10 · Anmeldung als natürliche Person ──');
    await oeffneApp(seite, { url: KERN });
    merke('  Kern: ' + KERN);
    await depotAnlegen(seite, { name: persona.vorname + ' ' + persona.nachname, pw: PW });
    await einmalDialogeSchliessen(seite).catch(() => {});
    await modaleSchliessen(seite);
    // Die E-Mail gehört zum Nachweis: der Step-10-Kommentar von TI-568 nennt ausdrücklich
    // „First Name, Last Name, email" als das, was die Identitätsansicht zeigt.
    await setzeFeld(seite, 'email', persona.email).catch(() => merke('  HINWEIS: E-Mail-Feld nicht gesetzt'));
    await modaleSchliessen(seite);
    merke('  angemeldet als: ' + persona.vorname + ' ' + persona.nachname + '  <' + persona.email + '>');
    // ZWEI Aufnahmen wie im TI-568-Belegsatz: der Step-10-Kommentar nennt „First Name, Last
    // Name, email", und beides paßt nicht auf einen Bildschirm. 10a trägt den Namen, 10b die
    // Kontaktangaben — zusammen sind sie der Nachweis, nicht einzeln.
    // Passen Name und E-Mail zusammen ins Bild, reicht EINE Aufnahme. Gemessen, nicht geraten:
    // die Lage des E-Mail-Feldes gegen die Bildschirmhöhe.
    const mailFeld = seite.locator('[data-edit="email"]').first();
    let mailSichtbar = false;
    if (await mailFeld.count()) {
      const box = await mailFeld.boundingBox().catch(() => null);
      mailSichtbar = !!box && box.y + box.height <= hoehe;
      merke('  E-Mail-Feld bei y=' + (box ? Math.round(box.y) : '?') + ', Bildschirm ' + hoehe +
            ' → ' + (mailSichtbar ? 'paßt ins Bild' : 'liegt darunter'));
    }
    if (mailSichtbar) {
      await schuss('Step10_Identitaet');
    } else {
      await schuss('Step10a_Identitaet');
      if (await mailFeld.count()) {
        await mailFeld.scrollIntoViewIfNeeded().catch(() => {});
        await seite.waitForTimeout(250);
        await schuss('Step10b_Kontakt');
      }
    }

    /* ── Schritt 20: Dokument wählen ───────────────────────────────────── */
    merke('\n── Schritt 20 · Dokument suchen und wählen ──');
    const id = await seite.evaluate((text) => {
      if (typeof window.__vdOeffentlich.importAutoritativDokument !== 'function') throw new Error('importAutoritativDokument fehlt in diesem Stand');
      const neu = window.__vdOeffentlich.importAutoritativDokument(text);
      if (!neu) throw new Error('Fixture nicht als autoritatives Dokument erkannt');
      window.__vdOeffentlich.oeffneMappe();
      return neu;
    }, original);
    merke('  autoritativer Eintrag angelegt: ' + id);
    await modaleSchliessen(seite);
    await seite.waitForSelector('[data-mappe-id="' + id + '"]', { state: 'visible' });
    await seite.click('[data-mappe-id="' + id + '"]');
    await seite.waitForSelector('[data-mappe-shl]', { state: 'visible' });
    await schuss('Step20_Auswahl');

    /* ── Schritt 30: Freigabe-Link erzeugen ────────────────────────────── */
    merke('\n── Schritt 30 · Freigabe-Link (SHL) erzeugen ──');
    /* Die verschlüsselte Datei abfangen, wo sie das Programm verlässt: am DOWNLOAD. Auf dem
       Desktop gibt dateiAusgeben sie als klassischen Download aus (<a download>). Ein Ersetzen
       von window.__vdOeffentlich.dateiAusgeben erreicht den internen Aufruf nicht: die Fläche
       hält nur eine Kopie der Referenz, der Kern bindet lexikalisch (Kopfkommentar an
       window.__vdOeffentlich in vivodepot.html). Genau daran hing die Strecke am 26.09.2026 in
       Schritt 30. Der Download-Ereignis des Browsers ist die Stelle, an der auch eine Bürgerin
       die Datei bekommt; die App selbst (shlProviderPayload/shlUriBauen/die JWE) bleibt unangetastet. */
    await seite.click('[data-mappe-shl]');
    await seite.waitForSelector('#shl-datei', { state: 'visible' });
    await schuss('Step30a_Dialog');
    const [herunter] = await Promise.all([seite.waitForEvent('download'), seite.click('#shl-datei')]);
    const jwe = fs.readFileSync(await herunter.path(), 'utf8');
    merke('  verschlüsselte Datei erzeugt: ' + Buffer.byteLength(jwe) + ' Bytes, ' + String(jwe).split('.').length + ' JWE-Teile');
    fs.writeFileSync(path.join(ziel, 'freigabe.jwe'), jwe, 'utf8');

    let ablageUrl = PLATZHALTER_URL;
    if (echterUpload) {
      const antwort = await hochladen(jwe);
      ablageUrl = (weg === 'manifest') ? antwort.manifest_url : antwort.url;
      if (!ablageUrl) {
        throw new Error('Der Ablage-Host lieferte keine Adresse für den Weg "' + weg + '". '
          + 'Bei "manifest" heißt das: der Host ist noch nicht auf dem Stand mit manifest.php. '
          + 'Antwort war: ' + JSON.stringify(antwort));
      }
      merke('  Freigabeweg: ' + weg + (weg === 'manifest' ? '  (Regelweg der Spec, kein Flag im Link)' : '  (U-Flag, Direkt-GET)'));
      merke('  hochgeladen auf share.vivodepot.de → ' + ablageUrl);
      merke('  Adresslänge: ' + ablageUrl.length + ' Zeichen (SHL-Grenze: 128)');
    } else {
      merke('  KEIN Upload (--hochladen nicht gesetzt) — Platzhalter-Adresse verwendet');
    }

    await seite.fill('#shl-url', ablageUrl);
    await seite.click('#shl-bauen');
    await seite.waitForSelector('#shl-uri', { state: 'visible' });
    const uri = await seite.inputValue('#shl-uri');

    /* WÄCHTER: trägt der Link wirklich den Weg, der verlangt wurde? Der Grund ist konkret —
       ein Kern, der die Weiche noch nicht kennt (etwa ein älteres konfektioniertes Produkt),
       ignoriert die eingesetzte Option STILL und liefert einen tadellosen U-Link. Der Beleg
       sähe richtig aus und wäre der falsche. Lieber hier abbrechen als das nach außen geben. */
    const gebaut = JSON.parse(b64uToBuf(uri.slice(uri.indexOf(':/') + 2)).toString('utf8'));
    const erwartetesFlag = (weg === 'manifest') ? undefined : 'U';
    if (gebaut.flag !== erwartetesFlag) {
      throw new Error('Der erzeugte Link passt nicht zum verlangten Weg "' + weg + '": erwartet '
        + (erwartetesFlag === undefined ? 'KEIN flag-Feld' : 'flag=' + erwartetesFlag)
        + ', erzeugt wurde ' + (gebaut.flag === undefined ? 'KEIN flag-Feld' : 'flag=' + gebaut.flag)
        + '. Wahrscheinlichste Ursache: dieser Kern (' + KERN + ') kennt die Wahl des Freigabewegs '
        + 'noch nicht. Ein älteres Produkt ignoriert die Option stillschweigend.');
    }
    merke('  Wächter: der Link trägt den verlangten Weg (' + weg + ').');
    merke('  Freigabe-Link: ' + uri.slice(0, 60) + '… (' + uri.length + ' Zeichen)');
    fs.writeFileSync(path.join(ziel, 'freigabe-link.txt'), uri, 'utf8');
    // Das Feld steht nach dem Erzeugen am ENDE des Links (Auswahl + Fokus). Für den Beleg
    // muss der Anfang sichtbar sein — sonst zeigt der Screenshot base64 ohne das shlink:/-Präfix.
    await seite.evaluate(() => { const t = document.getElementById('shl-uri'); if (t) { t.scrollTop = 0; t.setSelectionRange(0, 0); } });
    await schuss('Step30b_Freigabe-Link');

    /* ── Empfänger-Seite (Monarch): Schritt 40/50 nachgespielt ─────────── */
    if (echterUpload && keinAbruf) {
      merke('\n── Empfänger-Nachspiel ÜBERSPRUNGEN (--kein-abruf) ──');
      merke('  Die Freigabe ist UNBERÜHRT: der eine Abruf ist noch offen, die Gegenstelle kann sie holen.');
      merke('  Damit ist Schritt ' + (weg === 'manifest' ? '40/50' : '50') + ' hier NICHT belegt — das tut die Gegenstelle im Test.');
    } else if (echterUpload) {
      merke('\n── Empfänger (Monarch) · Schritt 50 nachgespielt ──');
      const payload = JSON.parse(b64uToBuf(uri.slice(uri.indexOf(':/') + 2)).toString('utf8'));
      merke('  Payload aus dem Link: flag=' + (payload.flag === undefined ? '(keines)' : payload.flag) +
            '  label=' + JSON.stringify(payload.label) +
            '  exp=' + new Date(payload.exp * 1000).toISOString());
      let chiffre, antwort;
      if (payload.flag === 'U') {
        merke('  flag=U bedeutet: Direkt-GET, KEIN Manifest — Schritt 40 hat hier keinen Endpunkt.');
        antwort = await fetch(payload.url);
        chiffre = await antwort.text();
        merke('  GET ' + payload.url);
      } else {
        /* KEIN Flag = der Regelweg. Genau das, was Monarchs Empfänger tut: Schritt 40 holt
           das Manifest per POST (recipient ist Pflicht), Schritt 50 nimmt die Datei daraus. */
        merke('  kein Flag bedeutet: Manifest-Weg — Schritt 40 und Schritt 50 haben beide einen Gegenstand.');
        merke('  Schritt 40 · POST ' + payload.url);
        antwort = await fetch(payload.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ recipient: 'Vivodepot Belegstrecke (Eigenprobe)' }),
        });
        const manifest = await antwort.json();
        fs.writeFileSync(path.join(ziel, 'manifest.json'),
          JSON.stringify(manifest, null, 2) + '\n', 'utf8');
        const datei = (manifest.files || [])[0] || {};
        merke('  Manifest: status=' + manifest.status + '  Dateien=' + (manifest.files || []).length +
              '  contentType=' + datei.contentType);
        merke('  Schritt 50 · Datei aus dem Manifest: ' + (datei.embedded ? 'embedded' : 'location'));
        chiffre = datei.embedded ? datei.embedded : await (await fetch(datei.location)).text();
      }
      merke('  HTTP ' + antwort.status + '  content-type: ' + antwort.headers.get('content-type'));
      fs.writeFileSync(path.join(ziel, 'abgerufen.jwe'), chiffre, 'utf8');
      const klar = jweDirEntschluesseln(chiffre, payload.key);
      const gleich = klar === original;
      merke('  entschlüsselt: ' + Buffer.byteLength(klar) + ' Bytes');
      merke('  BELEG: Klartext ' + (gleich ? 'IST' : 'IST NICHT') + ' byte-genau das Original-Bündel');
      if (!gleich) throw new Error('Empfänger-Beleg gebrochen: Klartext weicht vom Original ab');
    }

    fs.writeFileSync(path.join(ziel, 'protokoll.txt'), protokoll.join('\n') + '\n', 'utf8');
    merke('\nProtokoll: ' + path.join(ziel, 'protokoll.txt'));
    return 0;
  } finally {
    await browser.close();
  }
}

// Für die Probe (tests/shl-belegstrecke-schalter.test.js): die reine Wahl des Freigabewegs.
module.exports = { wegEinsetzen, WEG_ANKER };

// Nur als Programm laufen. Wird die Datei `require`d (Test, anderes Werkzeug), darf sie
// nichts tun — sonst startet ein Import den ganzen Lauf.
if (require.main === module) {
  main().then((c) => { process.exitCode = c; }, (e) => { console.error('\nFEHLER: ' + String((e && e.stack) || e)); process.exitCode = 1; });
}
