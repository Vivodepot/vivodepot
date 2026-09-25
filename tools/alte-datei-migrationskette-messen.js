#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 2 · DAS FÜNFZEHN JAHRE ALTE DEPOT — die ganze Kette am Stück
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 2.

   VIER FRAGEN, so beauftragt:
     · läuft die Kette durch
     · wie lange dauert sie
     · **geht unterwegs ein Wert verloren, der am Ende fehlt, ohne dass eine
       Stufe rot wird**
     · wie viele Stufen trägt eine Datei heute

   WARUM JETZT: Der eine Schnitt bringt drei weitere Stufen. Danach ist die
   Antwort teurer, und die Kette bleibt für immer in jeder Datei.

   DIE MESSMETHODE FÜR DEN VERLUST, und sie ist die einzige, die trägt: Alle
   BLATTWERTE vor der Kette werden gezählt und danach wiedergefunden. Ein Wert,
   der vorher da war und nachher nirgends mehr steht — an keinem Ort, auch nicht
   umgezogen —, ist ein stiller Verlust. Ein Wert, der an einer ANDEREN Stelle
   wieder auftaucht, ist ein Umzug und kein Verlust; das unterscheidet diese
   Messung, und darum vergleicht sie Wert-MENGEN und nicht Pfade.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const AELTESTE_FASSUNG = 22;   // die älteste, die `depotNormalisieren` behandelt

/* Ein Depot, wie es 2011 entstanden sein könnte: Werte in den Sektoren, in
   Listen, an Personen, Institutionen und Dokumenten. ERFUNDEN. Die Werte sind
   absichtlich eindeutig (Präfix `W-`), damit sie nach der Kette wiederfindbar
   sind, egal wohin sie gewandert sind. */
function altesDepot(V) {
  const d = V.leeresDepot();
  d.schemaVersion = AELTESTE_FASSUNG;
  d.sektoren = {
    identitaet: { vorname: 'W-vorname', nachname: 'W-nachname', geburtsdatum: '1948-03-11',
      strasse: 'W-strasse', plz_ort: 'W-plzort', telefon: 'W-telefon', email: 'W-email',
      geburtsname: 'W-geburtsname', geburtsort: 'W-geburtsort', nationalitaet: 'W-nationalitaet' },
    gesundheit: { blutgruppe: 'W-blutgruppe', allergien: 'W-allergien',
      medikamente: 'W-medikamente' },
    finanzen: { schulden: 'W-schulden' },
    wohnen: { miete: 'W-miete', kaution: 'W-kaution' },
    vorsorge: { pflegewuensche_sonstiges: 'W-pflegewuensche' },
    persoenliches: { sonstiges_persoenlich: 'W-sonstiges' },
    verwaltung: {},
    bildung: {}, sozialversicherung: {}, mobilitaet: {}, 'meine-menschen': {}, krisenvorsorge: {},
  };
  d.personen = [{ id: 'p-1', name: 'W-person', beziehung: 'W-beziehung', tel: 'W-persontel' }];
  d.institutionen = [{ id: 'i-1', name: 'W-institution', art: 'bank' }];
  d.dokumente = [{ id: 'dok-1', typ: 'sonstiges', name: 'W-dokument', sektorId: 'identitaet',
    gueltigAb: '2011-05-04' }];
  d.mappe = [{ id: 'm-1', name: 'W-mappe' }];
  return d;
}

/* Alle Blattwerte eines Baumes als Multimenge. Zählt Zeichenketten und Zahlen;
   Schlüsselnamen zählen NICHT — die ändern sich beim Umzug absichtlich. */
function blattwerte(o, raus) {
  raus = raus || [];
  if (o === null || o === undefined) return raus;
  if (Array.isArray(o)) { for (const e of o) blattwerte(e, raus); return raus; }
  if (typeof o === 'object') { for (const k of Object.keys(o)) blattwerte(o[k], raus); return raus; }
  if (typeof o === 'string' || typeof o === 'number') raus.push(String(o));
  return raus;
}

/* DIE BREITE FASSUNG: JEDES Feld des heutigen Katalogs trägt einen eindeutigen
   Wert. Ein Depot von 2011 hatte diese Felder natürlich nicht alle — aber die
   Migrationen sind FELDWEISE, und die Frage lautet, ob irgendeine Stufe einen
   Wert fallen lässt, den sie anfasst. Eine Obermenge misst genau das; ein
   dünner Prüfstoff misst nur die Felder, an die ich zufällig gedacht habe.
   (Die erste Fassung dieses Werkzeugs hatte 23 Werte — zu wenig für eine
   Aussage über 50 Stufen.) */
function altesDepotBreit(V) {
  const d = altesDepot(V);
  let n = 0;
  for (const s of (V.bereicheAlle())) {
    d.sektoren[s.id] = d.sektoren[s.id] || {};
    for (const sek of (s.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if (f.typ === 'liste' && Array.isArray(f.unterFelder)) {
          const zeile = {};
          for (const u of f.unterFelder) zeile[u.id] = 'W-' + s.id + '-' + f.id + '-' + u.id;
          d.sektoren[s.id][f.id] = [zeile];
          n += f.unterFelder.length;
          continue;
        }
        if (f.typ === 'jaNein') { d.sektoren[s.id][f.id] = true; continue; }
        if (f.typ === 'auswahl' || f.typ === 'mehrfachauswahl') {
          const erste = (f.optionen || [])[0];
          if (erste) { d.sektoren[s.id][f.id] = f.typ === 'mehrfachauswahl' ? [erste.wert] : erste.wert; }
          continue;
        }
        if (f.typ === 'datum') { d.sektoren[s.id][f.id] = '2011-05-04'; continue; }
        d.sektoren[s.id][f.id] = 'W-' + s.id + '-' + f.id;
        n++;
      }
    }
  }
  d._gepflanzt = n;
  return d;
}

/* IST DIESER WERT NOCH DA? Nicht „steht er als eigenes Blatt", sondern „ist er
   irgendwo noch zu finden" — auch als TEIL eines längeren Blattes.

   WARUM DAS NÖTIG IST, und es ist der eigentliche Befund dieses Postens: Die
   Sorgerecht-Stufe wirft einen unbekannten Auswahlwert NICHT weg, sondern hängt
   ihn an das freie Ergänzungsfeld an (`"…zusatz; W-unsinn"`). Das ist das
   Gegenteil eines stillen Verlusts — aber ein Vergleich exakter Blattwerte
   meldet es als einen. Die erste Fassung dieses Werkzeugs tat genau das und
   fand zwei „Verluste", die keine waren. */
function nochDa(wert, werte) {
  for (const w of werte) { if (w === wert || w.indexOf(wert) >= 0) return true; }
  return false;
}

function messen(V) {
  const d = altesDepot(V);
  const vorher = blattwerte(d);
  const vorherEigene = vorher.filter((w) => w.startsWith('W-'));

  const t0 = process.hrtime.bigint();
  const nachher = V.depotNormalisieren(d);
  const dauerMs = Number(process.hrtime.bigint() - t0) / 1e6;

  const nachWerte = blattwerte(nachher);
  const verloren = vorherEigene.filter((w) => !nochDa(w, nachWerte));

  /* WIE VIELE STUFEN TRÄGT EINE DATEI? Gezählt an den Hebungen im Code, nicht
     geraten: jede Zeile `schemaVersion < N` hebt genau eine Stufe. */
  const fs = require('node:fs');
  const kern = fs.readFileSync(process.env.KERN_HTML_PATH
    || path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const hebungen = (kern.match(/schemaVersion < \d+/g) || []).length;

  /* IDEMPOTENZ: ein zweiter Lauf darf nichts mehr ändern. Sonst wäre jede
     Öffnung eine neue Migration, und der Verlust käme in Raten. */
  const zweiterLauf = V.depotNormalisieren(JSON.parse(JSON.stringify(nachher)));
  const idempotent = JSON.stringify(zweiterLauf) === JSON.stringify(nachher);

  /* POSITIVKONTROLLE: ein gepflanzter Verlust MUSS gefunden werden. Ohne sie
     ist „nichts verloren" nicht von „die Messung sieht nichts" zu unterscheiden.
     `d` selbst ist an dieser Stelle NICHT mehr das Alt-Depot: `depotNormalisieren`
     mutiert sein Argument in-place und gibt dieselbe Referenz zurück (gemessen) —
     ein frischer `altesDepot(V)`-Aufruf ist darum nötig, sonst existiert
     `sektoren.identitaet` schon nicht mehr (längst zu `identity` migriert). */
  const geraubt = JSON.parse(JSON.stringify(altesDepot(V)));
  delete geraubt.sektoren.identitaet.vorname;
  const kontrolle = vorherEigene.filter((w) => !nochDa(w, blattwerte(geraubt)));

  /* Und derselbe Lauf noch einmal, breit. */
  const db = altesDepotBreit(V);
  const bVorher = blattwerte(db).filter((w) => w.startsWith('W-'));
  const t1 = process.hrtime.bigint();
  const bNach = V.depotNormalisieren(db);
  const bDauer = Number(process.hrtime.bigint() - t1) / 1e6;
  const bNachWerte = blattwerte(bNach);
  const bVerloren = bVorher.filter((w) => !nochDa(w, bNachWerte));

  return {
    breit: { werte: bVorher.length, dauerMs: bDauer, verloren: bVerloren,
      nachFassung: bNach.schemaVersion },
    vonFassung: AELTESTE_FASSUNG,
    nachFassung: nachher.schemaVersion,
    hebungen,
    dauerMs,
    werteVorher: vorherEigene.length,
    werteNachher: nachWerte.filter((w) => w.startsWith('W-')).length,
    verloren,
    idempotent,
    kontrolleFindetGepflanztenVerlust: kontrolle,
  };
}

function bericht(m) {
  const z = [];
  z.push('Kette:            Schema ' + m.vonFassung + ' → ' + m.nachFassung);
  z.push('Stufen im Code:   ' + m.hebungen + ' Hebungen');
  z.push('Dauer:            ' + m.dauerMs.toFixed(1) + ' ms');
  z.push('Idempotent:       ' + m.idempotent + '   (ein zweiter Lauf ändert nichts)');
  z.push('');
  z.push('Werte vorher:     ' + m.werteVorher);
  z.push('Werte nachher:    ' + m.werteNachher);
  z.push('STILL VERLOREN:   ' + (m.verloren.length ? JSON.stringify(m.verloren) : 'keiner'));
  z.push('');
  z.push('Positivkontrolle (ein gepflanzter Verlust wird gefunden): '
    + JSON.stringify(m.kontrolleFindetGepflanztenVerlust));
  z.push('');
  z.push('── DIE BREITE FASSUNG: jedes Feld des Katalogs gefüllt ──');
  z.push('   Werte:          ' + m.breit.werte);
  z.push('   Dauer:          ' + m.breit.dauerMs.toFixed(1) + ' ms · Schema 22 → ' + m.breit.nachFassung);
  z.push('   STILL VERLOREN: ' + (m.breit.verloren.length
    ? m.breit.verloren.length + ' Stück: ' + JSON.stringify(m.breit.verloren.slice(0, 20))
      + (m.breit.verloren.length > 20 ? ' …' : '')
    : 'keiner'));
  return z.join('\n');
}

function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const m = laufen(i > -1 ? process.argv[i + 1] : null);
  console.log(bericht(m));
  if (m.kontrolleFindetGepflanztenVerlust.length !== 1) {
    console.error('\nABBRUCH: die Positivkontrolle trägt nicht — die Messung sagt nichts.');
    process.exit(2);
  }
}

module.exports = { messen, bericht, laufen, altesDepot, blattwerte, AELTESTE_FASSUNG };
