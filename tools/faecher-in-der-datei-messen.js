'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Fächer IN der Datei — was der Umbau der Gleichheitsprüfung verliert
   ────────────────────────────────────────────────────────────────────────────
   Anhalt zu Posten 2 des Kreise-Laufzettels (21.08.2026), Ziffer 1 und 2:

     „Der Leser muss über alle Einträge probieren können. Die Gleichheitsprüfung
      wird von ‚Datei' auf ‚Eintrag' umgestellt, und das ist der Wächter gegen den
      stillen Feldverlust vom 19.08. VOR dem Umbau messen, was er verliert."

   DIESES WERKZEUG MISST GENAU DAS, und zwar am ECHTEN Lesepfad (`depotLaden`),
   nicht an einem Modell: es baut ein Depot, mutiert die Datei an je einer Stelle
   und schaut, ob der Kern die Mutation bemerkt. Danach dieselben Mutationen
   gegen das MODELL der umgebauten Prüfung, das hier mitläuft.

   Es misst zusätzlich, was die zwei Bauformen kosten, die die Belegungszahl je
   Eintrag verbergen — die zweite Auflage des Anhalts.

     node tools/faecher-in-der-datei-messen.js [--faecher N] [--json <pfad>]

   Ohne Argument gegen ein selbst erzeugtes Depot (voller Feldkatalog).
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');
const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));

const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(n); return (i >= 0 && args[i + 1]) ? args[i + 1] : f; };
const FAECHER = Math.max(2, parseInt(arg('--faecher', '6'), 10) || 6);
const JSON_ZIEL = arg('--json', null);
const PW = 'Inhaberin-2026!';

const bericht = { erzeugt: new Date().toISOString(), messungen: {} };
const bytes = (o) => Buffer.byteLength(JSON.stringify(o), 'utf8');

async function vollesDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  let gesetzt = 0;
  for (const sek of V.bereicheAlle()) {
    if (!d.sektoren[sek.id]) d.sektoren[sek.id] = {};
    for (const abschnitt of (sek.sektionen || [])) {
      for (const feld of (abschnitt.felder || [])) {
        d.sektoren[sek.id][feld.id] = feld.typ === 'datum' ? '2030-01-01'
          : feld.typ === 'liste' ? [{ bezeichnung: 'Messwert' }] : 'Messwert';
        gesetzt++;
      }
    }
  }
  V.setData(d);
  return { V, gesetzt };
}

/* ── 1 · Was die HEUTIGE Prüfung fängt, am echten `depotLaden` ─────────────── */

async function heutigePruefungMessen(V, umschlag) {
  const adressen = Object.keys(umschlag.umschlagTabelle[0].umschlaege);
  const ziel = adressen[0];
  const felderVorher = zaehleFelder(await ladenOhneMutation(umschlag));

  const probe = async (name, mut) => {
    const kopie = JSON.parse(JSON.stringify(umschlag));
    mut(kopie);
    const { V: V2 } = ladeKern();
    try {
      await V2.depotLaden(kopie, PW);
      const felder = zaehleFelder(V2.getData());
      return { name, bemerkt: false, felderNachher: felder, verloren: felderVorher - felder };
    } catch (e) {
      return { name, bemerkt: true, meldung: String(e.message || e).slice(0, 90) };
    }
  };

  return {
    einheitenGesamt: adressen.length,
    felderVorher,
    faelle: [
      await probe('Umschlag entfernt, Einheit bleibt', (k) => { delete k.umschlagTabelle[0].umschlaege[ziel]; }),
      await probe('Einheit entfernt, Umschlag bleibt', (k) => { delete k.einheiten[ziel]; }),
      /* DER FALL, DEN NIEMAND GEMESSEN HATTE: beide Hälften weg. Die Zahlen bleiben
         gleich, die Gleichheitsprüfung schweigt — und das Feld ist fort. */
      await probe('PAAR entfernt (Einheit UND Umschlag)', (k) => {
        delete k.einheiten[ziel]; delete k.umschlagTabelle[0].umschlaege[ziel];
      }),
    ],
  };
}

async function ladenOhneMutation(umschlag) {
  const { V: V2 } = ladeKern();
  await V2.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
  return V2.getData();
}
function zaehleFelder(d) {
  let n = 0;
  for (const s of Object.keys((d && d.sektoren) || {})) n += Object.keys(d.sektoren[s] || {}).length;
  return n;
}

/* ── 2 · Dieselben Fälle gegen das MODELL der umgebauten Prüfung ───────────── */
/* Die umgebaute Prüfung fragt nicht mehr „gleich viele Umschläge wie Einheiten in
   der DATEI", sondern: „jede Adresse, die MEIN Verzeichnis nennt, hat einen
   Umschlag und eine Einheit, und beide öffnen sich". Das Verzeichnis liegt IM
   verschlüsselten Teil des Eintrags — ein Angreifer kann es nicht mitkürzen. */
function modellPruefung(datei, meinVerzeichnis, meineUmschlaege) {
  for (const a of meinVerzeichnis) {
    if (!Object.prototype.hasOwnProperty.call(meineUmschlaege, a)) {
      return { bemerkt: true, meldung: 'zu einer Adresse des Verzeichnisses fehlt der Umschlag' };
    }
    if (!datei.einheiten[a]) {
      return { bemerkt: true, meldung: 'zu einer Adresse des Verzeichnisses fehlt die Einheit' };
    }
  }
  return { bemerkt: false };
}

function modellMessen(umschlag) {
  const eintrag = umschlag.umschlagTabelle[0];
  const verzeichnis = Object.keys(eintrag.umschlaege);   // im Bau: aus dem Geheimteil
  const ziel = verzeichnis[0];
  const fall = (name, mut) => {
    const k = JSON.parse(JSON.stringify(umschlag));
    mut(k);
    const r = modellPruefung(k, verzeichnis, k.umschlagTabelle[0].umschlaege);
    return { name, bemerkt: r.bemerkt, meldung: r.meldung || null };
  };
  return [
    fall('Umschlag entfernt, Einheit bleibt', (k) => { delete k.umschlagTabelle[0].umschlaege[ziel]; }),
    fall('Einheit entfernt, Umschlag bleibt', (k) => { delete k.einheiten[ziel]; }),
    fall('PAAR entfernt (Einheit UND Umschlag)', (k) => {
      delete k.einheiten[ziel]; delete k.umschlagTabelle[0].umschlaege[ziel];
    }),
  ];
}

/* ── 3 · Was die zwei Bauformen kosten, die die Belegungszahl verbergen ────── */
/* Bauform 1 — ATTRAPPEN: jeder Eintrag trägt Umschläge für ALLE Adressen; die
   fremden sind Zufallsbytes gleicher Länge. Der Leser probiert und scheitert an
   den fremden. Die Zahl ist dann für jeden Eintrag dieselbe.

   Bauform 2 — UMSCHLÄGE IM GEHEIMTEIL: die Tabelle trägt im Klartext nur noch
   `kennung`, `kdf` und `geheim`; die gewickelten Schlüssel liegen IM Geheimteil,
   der auf eine einheitliche Länge gepolstert wird. Dann steht im Klartext gar
   keine Zuordnung mehr — auch keine Zahl. */
function bauformenRechnen(umschlag, faecher) {
  const eintrag = umschlag.umschlagTabelle[0];
  const adressen = Object.keys(eintrag.umschlaege);
  const n = adressen.length;
  const jeUmschlag = Math.round(bytes(eintrag.umschlaege) / n);
  const geheimHeute = bytes(eintrag.geheim);
  const heute = bytes(umschlag);

  // Bauform 1: (faecher) × n Umschläge im Klartext.
  const attrappen = heute + (faecher - 1) * n * jeUmschlag;

  /* Bauform 2: die Umschläge wandern in den Geheimteil. Grobmass: derselbe
     Inhalt plus GCM-Tag und Base64-Aufschlag, gepolstert auf eine einheitliche
     Länge — sie folgt der GESAMTZAHL der Einheiten, die ohnehin öffentlich ist. */
  const geheimGepolstert = Math.ceil((n * jeUmschlag * 1.37 + 512) / 512) * 512;
  const imGeheimteil = heute - bytes(eintrag.umschlaege) - geheimHeute + faecher * geheimGepolstert;

  return {
    einheiten: n, faecher, bytesJeUmschlag: jeUmschlag,
    bytesHeuteEinFach: heute,
    /* BERICHTIGT beim Nachrechnen (21.08.2026): Die erste Fassung dieses Werkzeugs schrieb
       `verbirgtDieZuordnung: false`. Das ist falsch. Trägt jeder Eintrag Umschläge für ALLE
       Adressen und sind die fremden Zufallsbytes GLEICHER Länge, dann ist die Schlüsselmenge
       jedes Eintrags identisch — welche davon echt sind, sagt erst der Schlüssel. Die Zuordnung
       ist damit ebenso verborgen wie die Zahl. Die Adressen selbst stehen ohnehin im Klartext,
       weil `einheiten` sie als Schlüssel trägt; das ist kein Zuwachs dieser Bauform. */
    bauform1Attrappen: { bytes: attrappen, faktor: +(attrappen / heute).toFixed(2),
      verbirgtDieZahl: true, verbirgtDieZuordnung: true, neueKryptoVersion: false,
      hinweis: 'Die Dateiform bleibt v4 — ein alter Leser öffnet die Datei weiter über den Anker auf Platz 0.' },
    bauform2GeheimteilTraegtDieUmschlaege: { bytes: imGeheimteil, faktor: +(imGeheimteil / heute).toFixed(2),
      verbirgtDieZahl: true, verbirgtDieZuordnung: true, neueKryptoVersion: true,
      hinweis: 'Im Klartext steht je Eintrag nur noch kennung/kdf/geheim. Verbirgt nichts, was Bauform 1 nicht auch verbirgt — die Adressen stehen ohnehin in `einheiten`. Teurer UND ein Formatbruch.' },
  };
}

/* ══ DIE GRÖSSENKURVE (Posten 2b.1 des Kreise-Laufzettels) ════════════════════════════
   Zu messen ist nicht die Zahl, sondern ihr WACHSTUM: die Kosten steigen mit Fächern MAL
   Einheiten. Vier Punkte (3, 6, 10, 15 Empfänger), dazu ein Depot in Vollgröße — und die
   Öffnungszeit am ECHTEN Browser, nicht nur in Node. */

// Ein Depot, wie es eine Bürgerin nach Jahren wirklich hat: jedes Katalogfeld gefüllt,
// Listen mit mehreren Zeilen, Menschen, Dokumente. Nicht die leere Obergrenze der Feldzahl.
async function vollgroessenDepot() {
  const { V } = await vollesDepot();
  const d = V.getData();
  for (const sek of V.bereicheAlle()) {
    for (const abschnitt of (sek.sektionen || [])) {
      for (const feld of (abschnitt.felder || [])) {
        if (feld.typ !== 'liste') continue;
        // Fünf Zeilen je Listenfeld, jede mit allen Unterfeldern — das ist der Volumen-Treiber.
        d.sektoren[sek.id][feld.id] = Array.from({ length: 5 }, (_, i) => {
          const zeile = { zeilenId: 'z' + i };
          for (const uf of (feld.unterFelder || [])) zeile[uf.id] = 'Messwert ' + i;
          return zeile;
        });
      }
    }
  }
  d.menschen = Array.from({ length: 25 }, (_, i) => ({ id: 'm' + i, name: 'Mensch ' + i,
    rolle: 'kontakt', telefon: '0151 000' + i, email: 'm' + i + '@beispiel.de',
    strasse: 'Lindenweg ' + i, plz_ort: '12345 Musterstadt' }));
  d.dokumente = Array.from({ length: 30 }, (_, i) => ({ id: 'dok' + i, typ: 'nachweis',
    name: 'Dokument ' + i, stand: '2026-01-0' + (i % 9 + 1), notiz: 'Messwert'.repeat(10) }));
  for (const sitId of Object.keys(d.situationen || {})) d.situationen[sitId] = d.situationen[sitId] || {};
  V.setData(d);
  return V;
}

async function kreiseAnlegen(V, n) {
  for (let i = 1; i <= n; i++) {
    await V.empfaengerkreisSetzen({ name: 'Empfänger ' + i,
      bausteine: (i % 3 === 0) ? ['erbe'] : ['notfall', 'bestattung'] });
  }
  const liste = V.empfaengerkreiseListe();
  for (let i = 0; i < liste.length; i++) await V.empfaengerkreisFachEinrichten(liste[i], 'Empfaenger-' + (i + 1) + '-2026!');
  return liste;
}

async function kurvePunkt(bauen, n, etikett) {
  const gebaut = await bauen();
  const V = gebaut && gebaut.V ? gebaut.V : gebaut;   // `vollesDepot` liefert {V, gesetzt}
  if (n > 0) await kreiseAnlegen(V, n);
  const t = process.hrtime.bigint();
  const umschlag = await V.depotSerialisierenV4();
  const msSchreiben = Number(process.hrtime.bigint() - t) / 1e6;
  return { etikett, faecher: n, einheiten: Object.keys(umschlag.einheiten).length,
    eintraege: umschlag.umschlagTabelle.length,
    bytes: bytes(umschlag), kb: Math.round(bytes(umschlag) / 1024),
    msSchreibenNode: Math.round(msSchreiben), umschlag };
}

/* Die Öffnungszeit im ECHTEN Browser: die Datei geht in die echte `vivodepot.html`, und dort
   läuft die echte `depotLaden`. Kein Nachbau — der Anhalt verlangt den Browser, weil die
   Bürgerin dort sitzt. Gemessen wird der schlechteste Fall (das LETZTE Fach: der Leser
   probiert alle davor durch) und der Weg der Inhaberin. */
async function browserOeffnungszeit(punkte) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const seite = await browser.newPage();
  await seite.goto('file://' + path.join(__dirname, '..', 'vivodepot.html'));
  const raus = [];
  for (const p of punkte) {
    const datei = JSON.parse(JSON.stringify(p.umschlag));
    const messung = await seite.evaluate(async ({ datei, pwInhaberin, pwLetzter }) => {
      const einmal = async (pw) => {
        const t = performance.now();
        try { await window.__vdOeffentlich.depotLaden(JSON.parse(JSON.stringify(datei)), pw); }
        catch (e) { return { ms: performance.now() - t, fehler: String(e.message || e).slice(0, 60) }; }
        return { ms: performance.now() - t, fehler: null };
      };
      return { inhaberin: await einmal(pwInhaberin), letztesFach: pwLetzter ? await einmal(pwLetzter) : null };
    }, { datei, pwInhaberin: PW, pwLetzter: p.faecher > 0 ? 'Empfaenger-' + p.faecher + '-2026!' : null });
    raus.push({ etikett: p.etikett, faecher: p.faecher, kb: p.kb,
      msInhaberin: Math.round(messung.inhaberin.ms), fehlerInhaberin: messung.inhaberin.fehler,
      msLetztesFach: messung.letztesFach ? Math.round(messung.letztesFach.ms) : null,
      fehlerLetztesFach: messung.letztesFach ? messung.letztesFach.fehler : null });
  }
  await browser.close();
  return raus;
}

async function kurveMessen() {
  const punkte = [];
  for (const n of [0, 3, 6, 10, 15]) punkte.push(await kurvePunkt(vollesDepot, n, 'Katalog gefüllt'));
  punkte.push(await kurvePunkt(vollgroessenDepot, 6, 'Vollgröße'));
  punkte.push(await kurvePunkt(vollgroessenDepot, 15, 'Vollgröße'));
  const imBrowser = await browserOeffnungszeit(punkte);
  const ohne = punkte.find((p) => p.faecher === 0);
  return {
    punkte: punkte.map((p) => ({ etikett: p.etikett, faecher: p.faecher, einheiten: p.einheiten,
      eintraege: p.eintraege, kb: p.kb, msSchreibenNode: p.msSchreibenNode,
      faktorGegenOhneFach: ohne ? +(p.bytes / ohne.bytes).toFixed(2) : null })),
    imBrowser,
    /* Die Kurve ist LINEAR in den Fächern — jedes Fach kostet einmal alle Adressen. Der
       Anstieg je Fach ist damit die eine Zahl, die man weitertragen kann. */
    kbJeZusatzfach: (() => {
      const a = punkte.find((p) => p.faecher === 3 && p.etikett === 'Katalog gefüllt');
      const b = punkte.find((p) => p.faecher === 15 && p.etikett === 'Katalog gefüllt');
      return (a && b) ? Math.round((b.kb - a.kb) / 12) : null;
    })(),
  };
}

/* ══ ZWEI MODELLE, EINES ZU VIEL — die Messung zu Posten 2a ═══════════════════════════
   Die Frage des Anhalts, wörtlich: „Zu messen ist, was ein Empfänger mit dieser Datei anfangen
   kann, wenn er das Passwort der Bürgerin eines Tages doch erfährt — und ob das gegenüber dem
   Ausschnitt eine echte Verschlechterung ist oder nur eine gefühlte."

   GEMESSEN WIRD DAS EREIGNIS, nicht die Vermutung: dasselbe Depot, beide Wege, und dann in
   beiden Fällen der Versuch, die Datei mit dem Passwort der INHABERIN zu öffnen. */
async function modelleMessen() {
  const { V } = await vollesDepot();
  const d = V.getData();
  d.sektoren.finance = Object.assign(d.sektoren.finance || {}, { taxId: 'NUR-IM-VOLLDEPOT' });
  V.setData(d);
  await V.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: ['notfall'] });
  const kreis = V.empfaengerkreiseListe()[0];
  const PW_TANTE = 'Renate-2026!';
  await V.empfaengerkreisFachEinrichten(kreis, PW_TANTE);

  // Weg A — das Fach in der Datei: die Tante bekommt die GANZE Datei der Bürgerin.
  const ganzeDatei = await V.depotSerialisierenV4();
  // Weg B — der Ausschnitt: eine eigene, zugeschnittene Datei.
  const ausschnitt = (await V.empfaengerDateiErzeugen(kreis, PW_TANTE)).umschlag;

  const oeffnen = async (datei, pw) => {
    const { V: Vx } = ladeKern();
    try {
      await Vx.depotLaden(JSON.parse(JSON.stringify(datei)), pw);
      const dd = Vx.getData();
      /* GEZÄHLT WERDEN FELDER MIT WERT, nicht Schlüssel. Der erste Anlauf zählte Schlüssel und
         meldete für das Fach-Modell VIER Felder mehr als sein Verzeichnis kennt — nachgesehen
         waren es leere Strings, die `depotNormalisieren` beim Laden anlegt. Kein Leck, ein
         Zählfehler; er hätte als Unterschied zwischen den zwei Modellen im Bericht gestanden. */
      let felder = 0;
      for (const sek of Object.keys(dd.sektoren || {})) {
        for (const f of Object.keys(dd.sektoren[sek] || {})) {
          const w = dd.sektoren[sek][f];
          if (w === '' || w === null || typeof w === 'undefined') continue;
          if (Array.isArray(w) && !w.length) continue;
          felder++;
        }
      }
      return { geoeffnet: true, felder, traegtDasGeheimfeld: !!((dd.sektoren.finance || {}).taxId) };
    } catch (e) { return { geoeffnet: false, fehler: String(e.message || e).slice(0, 70) }; }
  };

  /* Was ohne JEDES Passwort aus der Datei zu lesen ist — die Zahl der Einheiten steht in beiden
     Fällen offen, aber sie ist eine ganz andere Zahl. */
  const ohnePasswort = (datei) => ({
    bytes: bytes(datei),
    einheiten: Object.keys(datei.einheiten || {}).length,
    eintraege: (datei.umschlagTabelle || []).length,
  });

  return {
    wegA_FachInDerDatei: {
      ohnePasswort: ohnePasswort(ganzeDatei),
      mitEigenemPasswort: await oeffnen(ganzeDatei, PW_TANTE),
      mitDemPasswortDerInhaberin: await oeffnen(ganzeDatei, PW),
    },
    wegB_Ausschnitt: {
      ohnePasswort: ohnePasswort(ausschnitt),
      mitEigenemPasswort: await oeffnen(ausschnitt, PW_TANTE),
      mitDemPasswortDerInhaberin: await oeffnen(ausschnitt, PW),
    },
  };
}

async function main() {
  const { V, gesetzt } = await vollesDepot();
  const umschlag = await V.depotSerialisierenV4();
  bericht.messungen.ausgangspunkt = { gefuellteFelder: gesetzt, bytes: bytes(umschlag) };
  bericht.messungen.heutigePruefung = await heutigePruefungMessen(V, umschlag);
  bericht.messungen.umgebautePruefungModell = modellMessen(umschlag);
  bericht.messungen.bauformen = bauformenRechnen(umschlag, FAECHER);
  if (args.includes('--kurve')) bericht.messungen.groessenkurve = await kurveMessen();
  if (args.includes('--modelle')) bericht.messungen.zweiModelle = await modelleMessen();

  const j = JSON.stringify(bericht, null, 2);
  if (JSON_ZIEL) { fs.writeFileSync(JSON_ZIEL, j); console.log('geschrieben: ' + JSON_ZIEL); }
  console.log(j);
}
main().catch((e) => { console.error(e); process.exit(1); });
