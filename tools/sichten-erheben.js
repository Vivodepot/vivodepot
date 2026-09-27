#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   sichten-erheben.js — Auftragskette „Drei Bereichs-Eigenschaften"
   (18.08.2026), Glied 1. **Rein messend. Dieses Werkzeug baut nichts.**
   ────────────────────────────────────────────────────────────────────────────
   DIE FRAGE: Eine REDUZIERTE SICHT zeigt nicht das ganze Depot, sondern eine
   Teilmenge — Notfallkarte, Angehörigenblatt, Situationsblatt, QR-Bereich.
   Jede dieser Sichten wird heute von Hand aufgezählt, und jede Aufzählung nennt
   Bereichs-IDs WÖRTLICH. **Ein von aussen eingebrachter Bereich kann darum in
   keiner reduzierten Sicht erscheinen, ohne dass jemand den Kern anfasst.**

   DER ZÄHLGEGENSTAND (§7):

     SICHT       eine Aufzählung, die eine Teilmenge des Depots festlegt, und
                 die von mindestens einem Renderer gelesen wird. Die Tabelle
                 unten ist ein URTEIL — jede Zeile nennt ihren Grund. Was sie
                 behauptet, wird mechanisch geprüft: fehlt ein Bezeichner in
                 seiner Datei, ist das ein FUND und kein stiller Wegfall.
     BEREICHS-ID die zwölf IDs aus `bereiche/bereiche.json`, wörtlich als
                 Zeichenkette. Gezählt wird IM DEFINITIONSBLOCK der Sicht,
                 nicht in der ganzen Datei.
     KONSUMENT   eine Fundstelle des Bezeichners ausserhalb seiner eigenen
                 Definition.

   GELESEN WIRD MIT `readFileSync`, NICHT MIT `grep`: `vivodepot-template-
   generator.html` trägt an einer Stelle ein NUL-Byte, und `grep` hält die Datei
   damit für binär und gibt SCHWEIGEND nichts aus (A272). Jede grep-Messung
   dieser Datei liefert seit jeher null Treffer, unabhängig vom Inhalt.

   AUFRUFE
     node tools/sichten-erheben.js            Tabellen
     node tools/sichten-erheben.js --json     maschinenlesbar
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ANWENDUNGEN = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-vc-issuer.html', 'vivodepot-template-generator.html'];

// Die zwölf Bereichs-IDs kommen aus der EINEN Quelle (U2-ADR-143), nicht aus einer Kopie hier.
function bereichsIds() {
  const roh = JSON.parse(fs.readFileSync(path.join(REPO, 'bereiche', 'bereiche.json'), 'utf8'));
  const liste = Array.isArray(roh) ? roh : (roh.bereiche || []);
  return liste.map((b) => (typeof b === 'string' ? b : b.id)).filter(Boolean);
}

/* Die Sichten. JEDE ZEILE IST EIN URTEIL und nennt ihren Grund — was hier steht, ist nicht
   gemessen, sondern behauptet; gemessen wird, ob es die genannte Stelle gibt und was in ihr
   steht. Eine Sicht, die fehlt, faellt damit auf, statt zu verschwinden. */
const SICHTEN = Object.freeze([
  { name: 'Notfallkarte / Notfall-QR', datei: 'vivodepot.html', symbol: 'NOTFALL_KERN_FELDER',
    granularitaet: 'Feld (und Listen-Unterfeld über Selektor)',
    renderer: 'notfallKernModell → zeichneNotfallkarte / Notfall-QR',
    betreten: 'Bürgerin in der Kern-App (Notfall-Stelle)',
    grund: 'Aufzählung von {sektor, feld}-Paaren; legt fest, was im KLARTEXT auf Papier und in den QR geht.' },
  { name: 'Notfallkarte (Empfänger)', datei: 'vivodepot-lesen.html', symbol: 'NOTFALL_KERN_FELDER',
    granularitaet: 'Feld',
    renderer: 'notfallKernModell (Lese-App)',
    betreten: 'Empfänger über QR-Text oder Datei',
    grund: 'Eigene Kopie derselben Aufzählung in der zweiten Anwendung — der dritte Weg aus dem Auftrag.' },
  // (Die Angehörigen-Situationsblätter stehen seit ANG1 nicht mehr hier: sie sind ein Template —
  // tools/angehoerigen-vorlagen/, ab Werk eingebacken, von der Datei mitgebracht — und kein Gerüst-Bestand.
  // Was ein Angehöriger OHNE Depot-Passwort sehen darf, legt weiter die Kern-feste `_ANG_CACHE_ERLAUBT` fest;
  // sie bewacht tools/geruest-inhalt-pruefen.js.)
  { name: 'Situationsblätter (Bürgerin)', datei: 'vivodepot.html', symbol: 'SITUATIONEN',
    granularitaet: 'Situation → Block → Eintrag (Bereich + Feld)',
    renderer: 'SITUATION_BY_ID → situationContentHTML',
    betreten: 'Bürgerin in der Kern-App',
    grund: 'Dieselbe Bauart, andere Adressatin — und die Vorlage, aus der die Angehörigenblätter entstanden.' },
  // (Die Situationsblätter der Lese-App stehen seit SIT2a nicht mehr hier: sie kommen aus der Datei — Mitschrift des
  // Produkts und Module der Datei — und sind kein Gerüst-Bestand mehr; tools/geruest-inhalt-pruefen.js bewacht das.)
]);

/* Manche Bestände sind seit ihrer Bündel-Migration nur noch im eingebetteten
   BUERGERMODUL_BUENDEL-JSON vollständig — der native Anker bleibt als leere, EINZEILIGE Hülle
   stehen (der Boot-Pfad bleibt unverändert: U2-ADR-319/320 für SEKTOREN, U2-ADR-341b für
   SITUATIONEN). Ein Anker, der weiter am nativen Literal hängt, misst dort ab sofort nichts
   mehr — er muss wissen, wohin der Bestand gezogen ist. Eintrag hier je Datei+Symbol → Schlüssel
   im Bündel. Symbol+Datei ohne Eintrag hier UND ohne echten Blockkörper sind kein bekannter
   Umzug — dafür wirft `bloeckeMessen` unten, statt still eine leere Sicht zu melden. */
const BUENDEL_SCHLUESSEL = Object.freeze({
  'vivodepot.html::SITUATIONEN': 'situationen',
});

// Wörtlicher Zwilling von `_buendelAusQuelle` in tools/bereichs-ids-erheben.js (U2-ADR-319/320)
// — bewusst eine eigene Kopie, keine geteilte Funktion (dieselbe Bauart wie die SICHTEN-Zeilen
// selbst, die je Anwendung eine eigene Aufzählung sind statt einer geteilten Quelle).
function _buendelAusQuelle(quelle) {
  const m = /(?:const|let)\s+BUERGERMODUL_BUENDEL = JSON\.parse\('/.exec(quelle);
  if (!m) return null;
  const auf = m.index + m[0].length;
  const zu = quelle.indexOf("');", auf);
  if (zu < 0) throw new Error('BUERGERMODUL_BUENDEL: Ende des Literals nicht gefunden');
  const roh = quelle.slice(auf, zu);
  if (roh === 'null' || roh === '') return null;
  try {
    return JSON.parse(roh.replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
  } catch (e) {
    throw new Error('BUERGERMODUL_BUENDEL laesst sich nicht lesen: ' + e.message);
  }
}

function bloeckeMessen(quelle, symbol) {
  const zeilen = quelle.split('\n');
  const start = zeilen.findIndex((z) => new RegExp('^\\s*(const|let|var)\\s+' + symbol + '\\s*=').test(z));
  if (start < 0) return null;
  // Eine Deklaration, die auf DERSELBEN Zeile schon schliesst (`= Object.freeze(…([]));`), hat
  // keinen Blockkörper mehr zu durchsuchen — das ist genau die Hülle, die eine Bündel-Migration
  // zurücklässt. Weiterscannen hiesse, auf der nächsten zufällig passenden `]);`-Zeile zu landen,
  // und das war der tatsächliche Fehler: SITUATIONEN landete so auf SITUATION_IDS_EINGEBAUT.
  if (/[\]\}]\)*;\s*$/.test(zeilen[start])) {
    return { start: start + 1, ende: start + 1, text: zeilen[start], leer: true };
  }
  // Bis zur ersten Zeile, die auf Spalte 0 schliesst (`]);`, `]));`, `});`). Alle hier gemessenen
  // Aufzählungen sind so geschrieben; trifft das nicht zu, meldet das Werkzeug `ende: null`
  // statt zu raten — eine Blockgrenze, die man errät, ist keine Messung.
  let ende = -1;
  for (let i = start + 1; i < zeilen.length; i++) {
    if (/^[\]\}]\)*;/.test(zeilen[i])) { ende = i; break; }
  }
  return { start: start + 1, ende: ende < 0 ? null : ende + 1,
    text: ende < 0 ? '' : zeilen.slice(start, ende + 1).join('\n') };
}

/* Umzug der Quelle (Schnitt-Reparatur, 18.09.2026), kein neuer Mechanismus — derselbe Weg wie
   bei tests/textsatz-mechanismus.test.js: wo der Bestand nicht mehr im Quelltext-Block UND
   nicht mehr im (jetzt abgeschafften) BUERGERMODUL_BUENDEL steht, entsteht er erst zur
   Depot-Laufzeit (`_situationModulAbWerkSeed`/`_situationAusBuendelErzeugen`). Anders als beim
   Pro-Bereichsersatz reicht hier der PLAIN, unkonfektionierte Kern — `depotAnlegen()` seedet
   SITUATIONEN produktunabhängig (gemessen: 10 Situationen, ohne jedes Konfektionieren). Einmal
   gebaut, gecacht — mehrere Sichten dürfen denselben Kern-Boot teilen. */
let _liveKernCache = null;
async function _liveBestandLaden(symbol) {
  if (!_liveKernCache) {
    const { ladeKern } = require('../tests/load-kern.js');
    const { V } = ladeKern();
    await V.depotAnlegen('sichten-erheben-pw');
    V.akteurSelbstErklaeren('Sichten-Erhebung');
    _liveKernCache = V;
  }
  const wert = _liveKernCache[symbol];
  return wert === undefined ? undefined : wert;
}

/* Herausgelöst aus messen()s Schleifenkörper (Schnitt-Reparatur, 18.09.2026) — derselbe
   Auswertungsschritt gilt jetzt für DREI Quellen des Blocktexts (Quelltext-Block, Bündel,
   live gebooteter Kern), nicht mehr nur für zwei. */
function _fundAusBlock(s, block, ids, q) {
  const fund = { name: s.name, datei: s.datei, symbol: s.symbol, granularitaet: s.granularitaet,
    renderer: s.renderer, betreten: s.betreten, grund: s.grund,
    gefunden: !!block, zeile: block ? block.start : null, bisZeile: block ? block.ende : null };
  if (!block || !block.text) { fund.bereichsIds = null; fund.konsumenten = null; return fund; }
  const genannt = ids.filter((id) => new RegExp("['\"]" + id + "['\"]").test(block.text));
  fund.bereichsIds = genannt;
  fund.bereichsIdTreffer = genannt.reduce((n, id) =>
    n + (block.text.match(new RegExp("['\"]" + id + "['\"]", 'g')) || []).length, 0);
  const alle = (q.match(new RegExp('\\b' + s.symbol + '\\b', 'g')) || []).length;
  const imBlock = (block.text.match(new RegExp('\\b' + s.symbol + '\\b', 'g')) || []).length;
  fund.konsumenten = alle - imBlock;
  return fund;
}

async function messen() {
  const ids = bereichsIds();
  const quellen = Object.create(null);
  for (const a of ANWENDUNGEN) quellen[a] = fs.readFileSync(path.join(REPO, a), 'utf8');

  const sichten = await Promise.all(SICHTEN.map(async (s) => {
    const q = quellen[s.datei];
    let block = bloeckeMessen(q, s.symbol);
    if (block && block.leer) {
      const buendelKey = BUENDEL_SCHLUESSEL[s.datei + '::' + s.symbol];
      if (!buendelKey) {
        throw new Error('[Sichten] „' + s.name + '“: `' + s.symbol + '` in ' + s.datei +
          ' ist eine leere, einzeilige Hülle ohne Bündel-Eintrag in BUENDEL_SCHLUESSEL — ' +
          'entweder ist der Bestand umgezogen und der Eintrag fehlt hier, oder die Sicht ' +
          'ist echt leer und gehört aus SICHTEN entfernt. Eine leere Sicht still zu melden ' +
          'wäre der Fehler, den dieses Werfen verhindert.');
      }
      const buendel = _buendelAusQuelle(q);
      /* LAUT STATT STILL (Schnitt-Reparatur, 18.09.2026): `_buendelAusQuelle` liefert `null`
         in ZWEI verschiedenen Fällen, und bis hierher wurden sie nicht unterschieden —
         `buendel && buendel[buendelKey]` wertet in BEIDEN zu `null` aus, und `null === undefined`
         ist falsch, also lief die Probe weiter. Fall 1: `BUERGERMODUL_BUENDEL` steht gar nicht in
         der Datei (Lese-App — nie ein Bündel, kein Fehler). Fall 2: `BUERGERMODUL_BUENDEL` STEHT
         da, ist aber `null` (der Schnitt hat es abgeschafft) — genau der Fall, für den
         BUENDEL_SCHLUESSEL diesen Eintrag überhaupt erst braucht: der Bestand ist umgezogen, UND
         der alte Auffangort ist jetzt leer. `_buendelAusQuelle` unterscheidet das nicht — dieser
         Wächter muss es selbst tun, weil genau diese Zeile den bekannten Ort BUENDEL_SCHLUESSEL
         nennt. Ohne diese Prüfung wurde `wert` zu `null`, `JSON.stringify(null)` zur Zeichenkette
         "null", und die Kette lief unauffällig bis zur bereichsIds-Zählung durch — 0 statt einer
         Fehlermeldung, ein Platzhalter, der als Fund durchrutscht.

         NACH DER LAUTEN MELDUNG DER UMZUG SELBST: bevor geworfen wird, ein Versuch am LIVEN
         Kern (`_liveBestandLaden`) — der Bestand existiert, nur nicht mehr im Quelltext. Erst
         wenn auch der live gebootete Kern das Symbol nicht trägt, ist es wirklich fort. */
      if (buendel === null && new RegExp('(?:const|let)\\s+BUERGERMODUL_BUENDEL\\b').test(q)) {
        const liveWert = await _liveBestandLaden(s.symbol);
        if (liveWert === undefined || !Array.isArray(liveWert) || !liveWert.length) {
          throw new Error('[Sichten] „' + s.name + '“: `' + s.symbol + '` in ' + s.datei +
            ' ist eine leere Hülle, BUENDEL_SCHLUESSEL nennt „' + buendelKey + '“ — aber ' +
            'BUERGERMODUL_BUENDEL selbst ist in dieser Datei leer/abgeschafft (kein ' +
            '`JSON.parse(...)`-Literal mehr), UND der live gebootete Kern (`depotAnlegen()`) ' +
            'trägt `' + s.symbol + '` ebenfalls nicht/leer. Der Bestand ist nicht mehr dort, ' +
            'wo dieser Eintrag ihn sucht, und auch nicht zur Laufzeit auffindbar.');
        }
        block = { start: block.start, ende: block.ende, text: JSON.stringify(liveWert) };
        return _fundAusBlock(s, block, ids, q);
      }
      const wert = buendel && buendel[buendelKey];
      if (wert === undefined) {
        throw new Error('[Sichten] „' + s.name + '“: BUENDEL_SCHLUESSEL nennt „' + buendelKey +
          '“, aber das eingebettete BUERGERMODUL_BUENDEL in ' + s.datei + ' trägt diesen ' +
          'Schlüssel nicht.');
      }
      block = { start: block.start, ende: block.ende, text: JSON.stringify(wert) };
    }
    return _fundAusBlock(s, block, ids, q);
  }));

  // Wörtliche Bereichs-IDs je Anwendung — der Rahmen, in dem die Sichten stehen.
  const jeAnwendung = ANWENDUNGEN.map((a) => ({
    datei: a,
    treffer: ids.reduce((n, id) => n + ((quellen[a].match(new RegExp("['\"]" + id + "['\"]", 'g')) || []).length), 0),
  }));

  return { ids, sichten, jeAnwendung };
}

async function main() {
  const erg = await messen();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(erg, null, 1)); return; }

  console.log('REDUZIERTE SICHTEN — wo definiert, wie fein, wer rendert\n');
  for (const s of erg.sichten) {
    console.log(s.name);
    console.log('  Datei/Zeile   ' + s.datei + ':' + (s.zeile === null ? 'NICHT GEFUNDEN — FUND' : s.zeile)
      + (s.bisZeile ? '–' + s.bisZeile : ''));
    console.log('  Bezeichner    ' + s.symbol);
    console.log('  Granularität  ' + s.granularitaet);
    console.log('  Renderer      ' + s.renderer);
    console.log('  Betreten von  ' + s.betreten);
    console.log('  Bereichs-IDs  ' + (s.bereichsIds === null ? '(Block nicht abgrenzbar)'
      : s.bereichsIds.length + ' verschiedene, ' + s.bereichsIdTreffer + ' Nennungen — ' + (s.bereichsIds.join(', ') || '—')));
    console.log('  Konsumenten   ' + (s.konsumenten === null ? '—' : s.konsumenten + ' Fundstellen ausserhalb der Definition'));
    console.log('');
  }

  const ok = erg.sichten.filter((s) => s.gefunden).length;
  console.log('SICHTEN GEFUNDEN: ' + ok + ' von ' + erg.sichten.length
    + (ok === erg.sichten.length ? '' : ' — die fehlenden sind ein FUND, kein Wegfall'));
  const idNennungen = erg.sichten.reduce((n, s) => n + (s.bereichsIdTreffer || 0), 0);
  console.log('BEREICHS-IDs WÖRTLICH IN DEN SICHT-DEFINITIONEN: ' + idNennungen);
  console.log('KONSUMENTEN ÜBER ALLE SICHTEN: ' + erg.sichten.reduce((n, s) => n + (s.konsumenten || 0), 0));

  console.log('\n\nWÖRTLICHE BEREICHS-IDs JE ANWENDUNG (der Rahmen, nicht nur die Sichten)\n');
  for (const a of erg.jeAnwendung) console.log('  ' + a.datei.padEnd(38) + a.treffer);
  console.log('\n  (mit readFileSync gemessen — `grep` ist über dem Template-Generator wegen eines');
  console.log('   NUL-Bytes blind und liefert dort schweigend null, s. A272.)');
}

if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 1; });
module.exports = { messen, SICHTEN, bereichsIds };
