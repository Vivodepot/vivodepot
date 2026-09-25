#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 8, 9 UND 10
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026). **Keine Behebung** — so
   beauftragt. Alle drei messen, was ist.

   ══ 8 · DIE GbR MIT DREI GESELLSCHAFTERN ══════════════════════════════════
   *„Wem gehört das Betriebsdepot?"*

   **GEMESSEN: genau einem.** `verwaltungsTyp` kennt drei Werte — `eigen`,
   `delegiert`, `verwaltet` — und jeder beschreibt eine Beziehung zu EINER
   Person. Ein Sub-Depot liegt VERSIEGELT im Depot der verwaltenden Person
   (`verwalteteDepots`). **Es gibt keinen Schlüssel für geteiltes Eigentum**,
   und es ist auch keiner vorgesehen.

   Das ist dieselbe Lücke wie bei P19 — kein Feldtyp für eine juristische Person
   — **aber von der Seite der Vertretung.** Drei Gesellschafter müssten sich auf
   einen einigen, in dessen Depot der Betrieb liegt; die anderen zwei haben
   keinen Zugang, der aus dem Modell folgt.

   ══ 9 · ZWEI FASSUNGEN DERSELBEN DATEI ════════════════════════════════════
   *„Merkt die Anwendung es überhaupt? Wenn nein, ist das der Befund — und dann
   die Frage, woran sie es merken könnte."*

   **GEMESSEN: NEIN, SIE MERKT ES NICHT.** Der Umschlag trägt `depotUUID`, aber
   **keine Zeitmarke, keinen Zähler, keine Fassungsnummer.** Zwei Dateien
   desselben Ursprungs mit verschiedenem Inhalt sind nicht zu unterscheiden; die
   zweite über die erste zu laden geschieht **ohne ein Wort.**

   **UND WORAN SIE ES MERKEN KÖNNTE, liegt bereits in der Datei:** `depotUUID`
   sagt „derselbe Ursprung", und `urheberschaft[bereich][feld][].zeitpunkt`
   trägt je Feld den Zeitpunkt der letzten Änderung. **Zwei Dateien mit gleicher
   UUID und auseinanderlaufenden Feld-Zeitpunkten sind genau eine erkennbare
   Gabelung** — feldweise, nicht nur als Ganzes. Gemessen, nicht vorgeschlagen:
   dieses Werkzeug rechnet die Gabelung aus, es baut sie nicht ein.

   ══ 10 · DAS MODUL, DAS SEINEN EIGENEN RECHTSRAUM ERKLÄRT ══════════════════
   Bereits am 21.08. gemessen: ein Textsatz mit `rechtsraum` wird angenommen und
   die Angabe **stillschweigend ignoriert**. Der Auftrag verlangt die
   Ausweitung: *„Gilt dasselbe für andere Angaben, die ein Modul mitbringt und
   der Kern nicht liest?"*

   **GEMESSEN ÜBER ALLE FÜNF REGISTER: vier von fünf schweigen.** Nur `format`
   benennt einen unbekannten Schlüssel (`grund: 'unbekannt'`). Bei Textsatz,
   Rechtsraum, Institutionsart und Bereich reist er unbenannt in den Slot und
   bleibt für immer in der Datei.

   **Die Klasse ist: der Prüfer wacht über die KENNUNGEN, nicht über den
   UMFANG** — dieselbe wie bei `appVersion`. **Ein Anbieter, der etwas erklärt
   und „angenommen" zurückbekommt, hat nichts erklärt.**
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

/* Ein gültiges Modul je Register — die Grundformen, an denen der Fremdschlüssel
   gemessen wird. Ohne sie misst der Block die Form und nicht den Gegenstand. */
const GRUNDFORMEN = Object.freeze({
  textsatz: { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'zz', texte: {} },
  rechtsraum: { modulTyp: 'rechtsraum', sprache: 'de', moduleVersion: 1, rechtsraum: 'AT',
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: 'Text' } } },
  institutionsArt: { modulTyp: 'institutionsArt', sprache: 'de', moduleVersion: 1, herkunft: 'h1',
    arten: { eigene: 'Eigene' } },
  format: { modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'eig', richtung: 'import',
    sektor: 'identity', label: 'L', akzeptiert: '.json,application/json', leser: 'json',
    quelle: 'n', erkennen: [{ pfad: 'd', gleich: 'x' }], zuordnung: [{ feld: 'givenName', ziel: 'vn' }] },
  bereich: { modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'h2',
    bereiche: { 'eigene-rubrik': { label: 'R' } } },
});
const SLOT = Object.freeze({ textsatz: 'textsatzModule', rechtsraum: 'rechtsraumModule',
  institutionsArt: 'institutionsArten', format: 'formatModule', bereich: 'bereichsModule' });

async function messen(V, ladeKern) {
  const raus = {};

  /* ══ 8 · DIE GbR ══════════════════════════════════════════════════════════ */
  await V.depotAnlegen('gbr-anna-pw');
  V.akteurSelbstErklaeren('Anna');
  V.personHinzufuegen({ name: 'Bernd Kley', beziehung: 'Mitgesellschafter' });
  V.personHinzufuegen({ name: 'Cem Aydin', beziehung: 'Mitgesellschafter' });
  const d = V.getData();
  raus.gbr = {
    verwaltungsTyp: d.verwaltungsTyp,
    verwalteteDepots: (d.verwalteteDepots || []).length,
    verselbststaendigungMoeglich: d.verselbststaendigungMoeglich,
    inhaberPersonId: d.inhaberPersonId,
    /* Gibt es IRGENDEINEN Schlüssel für geteiltes Eigentum? */
    schluesselFuerGeteiltesEigentum: Object.keys(d)
      .filter((k) => /geteilt|gemeinsam|partner|gesellschaft|miteigen/i.test(k)),
    gesellschafter: (d.menschen || []).filter((p) => /Mitgesellschafter/.test(p.beziehung || '')).length,
  };

  /* ══ 9 · ZWEI FASSUNGEN ═══════════════════════════════════════════════════ */
  const { V: A } = ladeKern();
  await A.depotAnlegen('zwei-fassungen-pw');
  A.akteurSelbstErklaeren('Anna');
  A.sektorFeldSetzen('identity', 'givenName', 'Gemeinsamer Anfang');
  const gemeinsam = await A.depotSerialisieren();

  /* Fassung STICK: ein Feld geändert. */
  const { V: Stick } = ladeKern();
  await Stick.depotLaden(gemeinsam, 'zwei-fassungen-pw');
  Stick.akteurSelbstErklaeren('Anna');
  Stick.sektorFeldSetzen('identity', 'telephone', '0301 111');
  const aufStick = await Stick.depotSerialisieren();

  /* Fassung PLATTE: ein ANDERES Feld geändert. */
  const { V: Platte } = ladeKern();
  await Platte.depotLaden(gemeinsam, 'zwei-fassungen-pw');
  Platte.akteurSelbstErklaeren('Anna');
  Platte.sektorFeldSetzen('identity', 'email', 'anna@example.org');
  const aufPlatte = await Platte.depotSerialisieren();

  /* Merkt die Anwendung beim Öffnen der zweiten etwas? */
  const { V: W } = ladeKern();
  await W.depotLaden(aufStick, 'zwei-fassungen-pw');
  let zweiteMeldung = null;
  try { await W.depotLaden(aufPlatte, 'zwei-fassungen-pw'); zweiteMeldung = null; }
  catch (e) { zweiteMeldung = String(e.message).slice(0, 90); }

  /* Woran KÖNNTE sie es merken? Gerechnet, nicht eingebaut. */
  const zeitpunkte = (V2) => {
    const u = (V2.getData().urheberschaft || {}).identity || {};
    const raus2 = {};
    for (const feld of Object.keys(u)) {
      const eintraege = u[feld] || [];
      raus2[feld] = (eintraege[eintraege.length - 1] || {}).zeitpunkt || null;
    }
    return raus2;
  };
  const zStick = zeitpunkte(Stick), zPlatte = zeitpunkte(Platte);
  const nurStick = Object.keys(zStick).filter((f) => !(f in zPlatte));
  const nurPlatte = Object.keys(zPlatte).filter((f) => !(f in zStick));

  raus.fassungen = {
    umschlagSchluessel: Object.keys(aufStick),
    zeitmarkeImUmschlag: Object.keys(aufStick).filter((k) => /zeit|stand|datum|revision|fassung/i.test(k)),
    uuidGleich: aufStick.depotUUID === aufPlatte.depotUUID,
    zweiteUeberDieErste: zweiteMeldung === null ? 'ohne ein Wort geladen' : zweiteMeldung,
    wertNachZweitem: W.getData().sektoren.identity.email,
    /* Das Material für eine Erkennung — vorhanden, aber ungenutzt. */
    feldZeitpunkteStick: zStick,
    feldZeitpunktePlatte: zPlatte,
    gabelungFeldweiseErkennbar: nurStick.length > 0 && nurPlatte.length > 0,
    nurAufStick: nurStick,
    nurAufPlatte: nurPlatte,
  };

  /* ══ 10 · DER UMFANG EINES MODULS ═════════════════════════════════════════ */
  const { V: M } = ladeKern();
  await M.depotAnlegen('modulumfang-pw');
  M.akteurSelbstErklaeren('Prüfung');
  raus.modulumfang = {};
  for (const [typ, form] of Object.entries(GRUNDFORMEN)) {
    /* POSITIVKONTROLLE: die Grundform OHNE Fremdschlüssel muss durchgehen —
       sonst misst die Zeile die Form und nicht den Gegenstand. */
    const rein = M.modulEinlassen(JSON.stringify(form), M.leeresDepot());
    const mit = M.modulEinlassen(
      JSON.stringify(Object.assign({}, form, { erfundenerSchluessel: 'X', rechtsraum2: 'ec' })),
      M.getData());
    const slot = ((M.getData()[SLOT[typ]] || [])
      .find((x) => Object.prototype.hasOwnProperty.call(x || {}, 'erfundenerSchluessel'))) || null;
    raus.modulumfang[typ] = {
      kontrolleOhneFremdschluessel: rein.angenommen,
      angenommen: mit.angenommen,
      grund: mit.grund,
      benannt: (mit.verworfene || []).some((v) => JSON.stringify(v).includes('erfundenerSchluessel')),
      reistMit: !!slot,
    };
  }

  return raus;
}

function bericht(m) {
  const z = [];
  z.push('══ 8 · DIE GbR MIT DREI GESELLSCHAFTERN');
  z.push('   verwaltungsTyp                   : ' + m.gbr.verwaltungsTyp + '   (eigen | delegiert | verwaltet)');
  z.push('   Gesellschafter als Menschen      : ' + m.gbr.gesellschafter);
  z.push('   verwaltete Sub-Depots            : ' + m.gbr.verwalteteDepots);
  z.push('   inhaberPersonId                  : ' + JSON.stringify(m.gbr.inhaberPersonId));
  z.push('   Schlüssel für geteiltes Eigentum : ' + JSON.stringify(m.gbr.schluesselFuerGeteiltesEigentum)
    + '   ← es gibt keinen');

  z.push('');
  z.push('══ 9 · ZWEI FASSUNGEN DERSELBEN DATEI');
  z.push('   Umschlag-Schlüssel      : ' + JSON.stringify(m.fassungen.umschlagSchluessel));
  z.push('   Zeitmarke im Umschlag   : ' + JSON.stringify(m.fassungen.zeitmarkeImUmschlag) + '   ← keine');
  z.push('   dieselbe depotUUID      : ' + m.fassungen.uuidGleich);
  z.push('   zweite über die erste   : ' + m.fassungen.zweiteUeberDieErste);
  z.push('   Wert danach             : ' + JSON.stringify(m.fassungen.wertNachZweitem));
  z.push('   ── woran sie es merken KÖNNTE (gerechnet, nicht eingebaut) ──');
  z.push('   Felder nur auf dem Stick: ' + JSON.stringify(m.fassungen.nurAufStick));
  z.push('   Felder nur auf der Platte: ' + JSON.stringify(m.fassungen.nurAufPlatte));
  z.push('   Gabelung feldweise erkennbar: ' + m.fassungen.gabelungFeldweiseErkennbar);

  z.push('');
  z.push('══ 10 · WAS EIN MODUL SONST NOCH MITBRINGT');
  for (const [typ, r] of Object.entries(m.modulumfang)) {
    z.push('   ' + typ.padEnd(16) + ' Kontrolle=' + String(r.kontrolleOhneFremdschluessel).padEnd(6)
      + ' angenommen=' + String(r.angenommen).padEnd(6)
      + ' benannt=' + String(r.benannt).padEnd(6) + ' reist mit=' + r.reistMit);
  }
  const stumm = Object.entries(m.modulumfang).filter(([, r]) => r.angenommen && !r.benannt).map(([t]) => t);
  z.push('   STUMM: ' + JSON.stringify(stumm) + ' von ' + Object.keys(m.modulumfang).length);
  return z.join('\n');
}

async function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V, ladeKern);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  laufen(i > -1 ? process.argv[i + 1] : null).then((m) => {
    console.log(bericht(m));
    const kontrollen = Object.values(m.modulumfang).map((r) => r.kontrolleOhneFremdschluessel);
    if (kontrollen.some((k) => k !== true) || !m.fassungen.uuidGleich) {
      console.error('\nABBRUCH: eine Positivkontrolle trägt nicht — die Messung sagt nichts.');
      process.exit(2);
    }
  }).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { messen, bericht, laufen, GRUNDFORMEN, SLOT };
