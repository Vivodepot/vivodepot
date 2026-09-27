#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   formate-dreischnitt.js — „Die Formate in ihre drei Teile zerlegen"
   (17.08.2026).
   ────────────────────────────────────────────────────────────────────────────
   DIE FRAGE: Die Andockbarkeits-Erhebung führt `IMPORT_FORMATE`/`EXPORT_FORMATE`
   als nicht andockbar — „ein Format ist Code". **Das stimmt für ein Format als
   Ganzes. Es stimmt möglicherweise nicht für seine Teile.** Dieses Werkzeug
   zerlegt jeden Kanal in drei und misst je Teil, ob er Code ist oder Daten.

   DER ZÄHLGEGENSTAND (§7), je Import-Kanal:

     LESER      welche Funktion der `parse`-Rumpf aufruft, und ob dieselbe
                Funktion von mehreren Kanälen benutzt wird. Ein GETEILTER Leser
                heisst: ein neuer Kanal derselben Drahtform braucht keinen Code.
     ERKENNER   drei Klassen — `regex` (reiner regulärer Ausdruck über den Text),
                `funktion` (Aufruf einer benannten Funktion), `rumpf` (eigene
                Logik). Bei `regex` zusätzlich: ALS ZEICHENKETTE SCHREIBBAR?
                Ein Muster mit Rückwärtsreferenz oder Zustand ist keine.
     ZUORDNUNG  `tabelle`, wenn die Feldzuordnung über `_ausMappingZurueck` aus
                einer `*_MAPPING`-Konstante kommt; sonst `code`.

   GEMESSEN WIRD AM GELADENEN KERN, nicht am Quelltext: die Funktionen selbst
   werden gelesen (`Function.prototype.toString`). Was hier steht, ist das, was
   die App wirklich ausführt.

   AUFRUFE
     node tools/formate-dreischnitt.js            Tabelle Import + Export
     node tools/formate-dreischnitt.js --json     maschinenlesbar
     node tools/formate-dreischnitt.js --form     je Kanal EIN Satz gegen die
                                                  Beschreibungsform (U2-ADR-146)

   NACHTRAG 18.08.2026 (Glied 7, U2-ADR-146): `--form` hält die Frage fest, die
   nach der Messung kommt — LÄSST SICH DIESER KANAL ALS BESCHREIBUNG SAGEN?
   Die drei Teile werden gegen die gebaute Form gehalten: der Leser muss einer
   aus `FORMAT_LESER` sein, die Zuordnung über `_ausMappingZurueck` laufen, der
   Erkenner als Vergleichsliste ausdrückbar oder gar nicht vorhanden sein.
   Wo ein eigener Parser ZWINGEND bleibt, steht der Grund als GRENZE daneben —
   das ist die Linie zwischen Werkzeug und Plattform und wird nicht als Mangel
   gezählt. Diese Begründungen sind ein Urteil, kein Messwert; darum stehen sie
   NAMENTLICH in einer Tabelle im Werkzeug und nicht im Kopf des Lesers.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/** Rückwärtsreferenzen (`\1`) und Zustands-Flags (`g`, `y`) machen ein Muster unschreibbar. */
function regexSchreibbar(quelle) {
  const m = quelle.match(/\/((?:[^/\\]|\\.)+)\/([a-z]*)/);
  if (!m) return null;
  if (/\\\d/.test(m[1])) return false;          // Rückwärtsreferenz
  if (/[gy]/.test(m[2])) return false;          // zustandsbehaftet (lastIndex)
  return true;
}

function erkennerKlasse(fn) {
  if (typeof fn !== 'function') return { klasse: 'keiner', schreibbar: null, ruft: null };
  const q = fn.toString().replace(/\s+/g, ' ');
  // Reiner Regex-Test: der ganze Rumpf ist `/…/.test(t)` (ggf. mit || verkettet).
  const nurRegex = /^\([^)]*\)\s*=>\s*\/.*\.test\([a-zA-Z_$]+\)(\s*\|\|\s*\/.*\.test\([a-zA-Z_$]+\))*\s*$/.test(q);
  if (nurRegex) return { klasse: 'regex', schreibbar: regexSchreibbar(q), ruft: null };
  // Aufruf genau einer benannten Funktion.
  const einAufruf = q.match(/^\([^)]*\)\s*=>\s*([A-Za-z_$][\w$]*)\([a-zA-Z_$]+\)\s*$/);
  if (einAufruf) return { klasse: 'funktion', schreibbar: false, ruft: einAufruf[1] };
  /* VIERTE MESSUNG INNERHALB DER DRITTEN KLASSE, und sie verschiebt das Ergebnis:
     mehrere `rumpf`-Erkenner sind nichts als „JSON lesen und ein Feld vergleichen"
     (`(t) => { const o = _jsonParse(t); return !!(o && o.vct === vctErwartet); }`).
     Das ist Ablauf in der FORM, aber Daten im INHALT — als `{ leser:'json',
     feld:'vct', gleich:'…' }` verlustfrei schreibbar. Wer nur die drei Klassen des
     Auftrags zählt, meldet für diese Kanäle „eigene Logik" und übersieht, dass
     genau sie die einfachsten sind.
     Erkannt mechanisch: der Rumpf ruft `_jsonParse` und SONST KEINE Funktion,
     kennt keine Schleife und keinen regulären Ausdruck. */
  const nurJson = /_jsonParse\s*\(/.test(q)
    && !/\b(for|while)\b/.test(q)
    && !/\//.test(q.replace(/_jsonParse/g, ''))
    && (q.match(/[A-Za-z_$][\w$]*\s*\(/g) || []).filter((c) => !/^(_jsonParse|if|return|typeof)\s*\(/.test(c)).length === 0;
  return { klasse: 'rumpf', schreibbar: false, ruft: null, alsDatenAusdrueckbar: nurJson };
}

/** Welche benannten Funktionen ruft ein Rumpf auf? (Grobe, aber mechanische Näherung.) */
function aufrufe(fn) {
  if (typeof fn !== 'function') return [];
  const q = fn.toString();
  const raus = new Set();
  for (const m of q.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) {
    const n = m[1];
    if (['if', 'for', 'while', 'switch', 'return', 'function', 'catch', 'test', 'String', 'Array', 'Object'].includes(n)) continue;
    raus.add(n);
  }
  return Array.from(raus);
}

function messen() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();

  const importe = [];
  for (const f of (V.IMPORT_FORMATE || [])) {
    const parseQ = typeof f.parse === 'function' ? f.parse.toString().replace(/\s+/g, ' ') : '';
    const ruft = aufrufe(f.parse);
    // Der LESER ist die Funktion, die den Text in Struktur bringt; die ZUORDNUNG die,
    // die daraus Felder macht. `_ausMappingZurueck` ist der geteilte Tabellen-Weg.
    const tabelle = /_ausMappingZurueck/.test(parseQ)
      || ruft.some((n) => typeof V[n] === 'function' && /_ausMappingZurueck/.test(String(V[n])));
    importe.push({
      id: f.id,
      signiert: !!f.signiert,
      leser: ruft.filter((n) => /^(_?json|parse|_[a-z])/i.test(n)),
      erkenner: erkennerKlasse(f.erkennen),
      zuordnung: tabelle ? 'tabelle' : 'code',
    });
  }

  // Geteilte Leser: dieselbe Funktion in mehr als einem Kanal.
  const zaehler = new Map();
  for (const i of importe) for (const l of i.leser) zaehler.set(l, (zaehler.get(l) || 0) + 1);
  for (const i of importe) i.geteilt = i.leser.filter((l) => zaehler.get(l) > 1);

  /* EINE EBENE TIEFER, und das ist keine Feinheit: jedes `baue` ist ein Einzeiler, der
     an eine benannte Funktion delegiert (`(opt) => vollExportJSON(opt)`). Wer nur `baue`
     misst, bekommt für alle elf Formate „1 Zeile, keine Tabelle" — eine Zahl, die nichts
     über den Erzeuger sagt. Gemessen wird darum die Funktion, an die delegiert wird. */
  const exporte = (V.EXPORT_FORMATE || []).map((f) => {
    const bau = f.baue || f.bauen || f.erzeuge;
    const erste = typeof bau === 'function' ? bau.toString().replace(/\s+/g, ' ') : '';
    const del = erste.match(/=>\s*([A-Za-z_$][\w$]*)\s*\(/);
    const echt = del && typeof V[del[1]] === 'function' ? V[del[1]] : bau;
    const q = typeof echt === 'function' ? echt.toString() : '';
    return {
      id: f.id,
      erzeuger: del ? del[1] : '(inline)',
      nurExport: !!f.nurExport,
      ueberTabelle: /baueAusMapping/.test(q),
      zeilen: q ? q.split('\n').length : 0,
    };
  });

  return { importe, exporte, leserZaehler: Array.from(zaehler.entries()).sort((a, b) => b[1] - a[1]) };
}

/* Warum ein Kanal einen eigenen Parser BRAUCHT — je Kanal ein Satz. Ein Urteil, kein
   Messwert: es sagt, warum die fehlende Ausdrückbarkeit die richtige Grenze ist und keine
   Lücke. Ein Kanal, der hier NICHT steht und die Form trotzdem nicht trägt, ist eine echte
   offene Stelle — genau die Unterscheidung, die diese Tabelle möglich macht. */
const GRENZE = Object.freeze({
  'fhir-ips': 'Ein Bündel mit Ressourcen-Graph: die Felder liegen nicht an Pfaden, sondern in Einträgen, die erst nach resourceType gesucht und dann über CodeableConcepts aufgelöst werden.',
  'fhir-lab': 'Legt VERBATIM als autoritatives Dokument ab (U2-ADR-045) und mappt bewusst kein einziges Feld — es gibt nichts zuzuordnen.',
  'camt053': 'ISO-20022-XML mit Namensräumen; der Leser ist ein XML-Parser, kein JSON-Leser, und die Kontozeilen sind Listeneinträge.',
  'xmeld': 'XÖV-XML mit Namensräumen — derselbe Grund wie camt053.',
  'elster': 'Eigene Struktur-Logik über den Steuerbescheid hinweg; die Zuordnung entsteht im Ablauf, nicht in einer Tabelle.',
  'vivodepot-beta': 'Wiederherstellung eines Alt-Depots samt Profil-Zusammenführung und Sammelnotiz — ein Migrationsweg, kein Feld-Kanal.',
  'provider-credential': 'Kryptographie: Signatur, Sperrliste und Zertifikatskette entscheiden über die Annahme, nicht ein Feldvergleich.',
  'edci-europass-extern': 'Unterscheidet signierte von unsignierten EU-Nachweisen STRUKTURELL und packt die Nutzlast aus — das ist eine Prüfung, keine Beschreibung.',
  'vcard-menschen': 'Erzeugt LISTENEINTRÄGE (`listen`), keine Feldwerte; die Form beschreibt heute nur den Feld-Weg.',
  'json': 'Die Wiederherstellung eines ganzen Depots über alle Bereiche — kein Bereichs-Kanal, und die Kennung ist reserviert.',
  'vcard-identitaet': 'Der Erkenner ist eine Textprobe VOR dem Parsen (`BEGIN:VCARD`); die Form erkennt erst nach dem Leser. Der Kanal ist als Beschreibung OHNE Erkenner ausdrückbar — dann wird er von Hand gewählt.',
});

function ausdrueckbarkeit(erg) {
  // Die Leser der gebauten Form: `json` (über _jsonParse) und `vcard-erste` (über parseVCards).
  const FORM_LESER = ['_jsonParse', 'parseVCards'];
  return erg.importe.map((i) => {
    const leserOk = i.leser.some((l) => FORM_LESER.indexOf(l) >= 0);
    const zuordnungOk = i.zuordnung === 'tabelle';
    const erkennerOk = i.erkenner.klasse === 'keiner'
      || (i.erkenner.klasse === 'rumpf' && i.erkenner.alsDatenAusdrueckbar);
    const fehlt = [];
    if (!leserOk) fehlt.push('Leser');
    if (!zuordnungOk) fehlt.push('Zuordnung');
    if (!erkennerOk) fehlt.push('Erkenner');
    return { id: i.id, traegt: !fehlt.length, fehlt, grenze: GRENZE[i.id] || null };
  });
}

function main() {
  const erg = messen();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(erg, null, 1)); return; }
  if (process.argv.includes('--form')) {
    const zeilen = ausdrueckbarkeit(erg);
    console.log('AUSDRÜCKBARKEIT gegen die Beschreibungsform (U2-ADR-146) — je Kanal ein Satz\n');
    for (const z of zeilen) {
      const kopf = z.id.padEnd(30) + (z.traegt ? 'TRÄGT' : 'fehlt: ' + z.fehlt.join('+'));
      console.log(kopf);
      if (!z.traegt) console.log('  ' + (z.grenze ? 'GRENZE — ' + z.grenze : 'OFFEN — kein benannter Grund; das ist eine echte Lücke, kein Zuschnitt.'));
    }
    const traegt = zeilen.filter((z) => z.traegt);
    const grenze = zeilen.filter((z) => !z.traegt && z.grenze);
    const offen = zeilen.filter((z) => !z.traegt && !z.grenze);
    console.log('\nIN DER FORM AUSDRÜCKBAR: ' + traegt.length + ' von ' + zeilen.length
      + (traegt.length ? ' — ' + traegt.map((z) => z.id).join(', ') : ''));
    console.log('EIGENER PARSER, mit benanntem Grund (Grenze Werkzeug/Plattform): ' + grenze.length);
    console.log('OHNE benannten Grund (echte offene Stelle): ' + offen.length
      + (offen.length ? ' — ' + offen.map((z) => z.id).join(', ') : ''));
    return;
  }

  console.log('IMPORT — je Kanal die drei Teile\n');
  console.log('Kanal'.padEnd(30) + 'Erkenner'.padEnd(12) + 'schreibbar'.padEnd(12) + 'Zuordnung'.padEnd(11) + 'Leser (geteilt)');
  for (const i of erg.importe) {
    console.log(i.id.padEnd(30) + i.erkenner.klasse.padEnd(12)
      + String(i.erkenner.klasse === 'regex' ? i.erkenner.schreibbar : '—').padEnd(12)
      + i.zuordnung.padEnd(11) + (i.geteilt.join(', ') || '—'));
  }
  const schreibbarerErkenner = (i) => (i.erkenner.klasse === 'regex' && i.erkenner.schreibbar)
    || (i.erkenner.klasse === 'rumpf' && i.erkenner.alsDatenAusdrueckbar);
  const engBer = erg.importe.filter((i) => i.geteilt.length && i.erkenner.klasse === 'regex'
    && i.erkenner.schreibbar && i.zuordnung === 'tabelle');
  const weit = erg.importe.filter((i) => i.geteilt.length && schreibbarerErkenner(i) && i.zuordnung === 'tabelle');
  console.log(`\nREINE KONFIGURATION, ENGE LESART (nur echte Regex-Erkenner): `
    + `${engBer.length} von ${erg.importe.length}` + (engBer.length ? ' — ' + engBer.map((r) => r.id).join(', ') : ''));
  console.log(`REINE KONFIGURATION, WEITE LESART (Erkenner als Daten ausdrückbar): `
    + `${weit.length} von ${erg.importe.length}` + (weit.length ? ' — ' + weit.map((r) => r.id).join(', ') : ''));
  /* DRITTE LESART, weil zwei Kanäle GAR KEINEN Erkenner haben: `xoev-verwaltung` und
     `fim-json` werden von Hand gewählt statt erkannt. Für einen angedockten Kanal ist das
     kein Mangel — es gibt nichts auszudrücken. Ob sie mitzählen, ist eine Entscheidung
     über den Zuschnitt, keine Messung; darum steht die Zahl daneben, nicht darin. */
  const ohneErkenner = erg.importe.filter((i) => i.geteilt.length && i.erkenner.klasse === 'keiner' && i.zuordnung === 'tabelle');
  console.log(`  dazu ohne Erkenner (von Hand gewählt, nichts auszudrücken): ${ohneErkenner.length}`
    + (ohneErkenner.length ? ' — ' + ohneErkenner.map((r) => r.id).join(', ') : ''));

  console.log('\n\nEXPORT — Ablauf oder Zuordnung?\n');
  console.log('Format'.padEnd(30) + 'Erzeuger'.padEnd(28) + 'über Tabelle'.padEnd(14) + 'Zeilen');
  for (const e of erg.exporte) {
    console.log(e.id.padEnd(30) + e.erzeuger.padEnd(28) + String(e.ueberTabelle).padEnd(14) + String(e.zeilen));
  }
  const tab = erg.exporte.filter((e) => e.ueberTabelle);
  console.log(`\nÜBER EINE TABELLE: ${tab.length} von ${erg.exporte.length}`
    + (tab.length ? ' — ' + tab.map((t) => t.id).join(', ') : ''));

  console.log('\n\nGETEILTE LESER (Funktion → Zahl der Kanäle):');
  for (const [n, c] of erg.leserZaehler.filter(([, c]) => c > 1)) console.log('  ' + n.padEnd(24) + c);
}

if (require.main === module) main();
module.exports = { messen, erkennerKlasse, regexSchreibbar, ausdrueckbarkeit, GRENZE };
