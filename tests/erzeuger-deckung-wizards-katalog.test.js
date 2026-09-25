'use strict';
/* U2-ADR-317 — die Deckung der WIZARDS-Katalogverweise gegen das Bündel.

   DER ANLASS: fehlt EIN Feld in einem sonst befüllten Bereich, dessen WIZARDS-Katalogverweis
   noch besteht, wirft der Boot-Lauf — und dreizehn Seitenleisten-Labels zeigen „undefined".
   Seit dem Umbau kann der Bündel-Erzeuger nicht mehr automatisch gegen den nativen Bestand
   gegenprüfen; die Regenerierung ist bewusst aus, ihr Gegenstand existiert nicht mehr.

   Gedeckt war bis hierher EINE Stichprobe (`familienstand`, vormals in
   tests/e4-buergermodul-buendel-abnahmebeweis-u2-adr-310.test.js — diese Datei gibt es nicht
   mehr, der Schnitt hat sie mit dem Bündel-Erzeuger-Kreis entfernt). Die übrigen liefen
   ungeprüft — ein stiller Tippfehler bei einem davon fiele durch keine Probe, sondern erst
   live in genau diesen Ausfall.

   DIE LISTE WIRD AUS DER QUELLE GEZOGEN, NICHT GEPFLEGT. Wer einen neunten Katalogverweis in
   `WIZARDS` einbaut, ist damit automatisch gedeckt — eine gepflegte Liste wäre genau der
   Wächter, der den nächsten Fall nicht kennt.

   NACHTRAG (Schnitt 17./18.09.2026): bis hierher gab es ZWEI echte Träger, die
   auseinanderlaufen konnten (87s Form aus U2-ADR-310 Probe 3) — die Platte
   (tools/vd-privat-struktur-bundle.json) UND das im Kern eingebettete
   BUERGERMODUL_BUENDEL. Der zweite Träger ist mit dem Schnitt entfernt
   (BUERGERMODUL_BUENDEL === null); die zugehörige Deckungs-Probe unten ist mit
   ihm gegangen — es gibt nur noch EINEN Träger, der divergieren könnte. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const PLATTE = path.join(REPO, 'tools', 'vd-privat-struktur-bundle.json');

/* Zieht jeden Katalog-Verweis aus dem GELADENEN, LEBENDEN `V.WIZARDS` — mit den Filterwerten,
   wo welche stehen.

   NACHTRAG (U2-ADR-346, 07.09.2026): vorher ein `_katalogOptionen(sektor, feld[, erlaubteWerte])`-
   Regex-Scan über den ROHEN WIZARDS-Quelltext. Seit fünf der sieben Wizards real ins Bündel
   umgezogen sind (`katalogOptionenAus`, s. dort), existiert dieser Aufruf als LITERALER
   Quelltext nirgends mehr — der Regex fand ZERO Treffer, still, ohne zu werfen (derselbe Fund
   wie an den übrigen fünf Stellen dieses Abends, s. U2-ADR-346 §8/§9). Der Verweis lebt jetzt
   als `feld.katalogOptionenAus` auf dem MATERIALISIERTEN Feld — DAS ist „die Quelle" geworden,
   nicht mehr der rohe Text; dieselbe Prinzip-Treue wie vorher („aus der Quelle gezogen, nicht
   gepflegt"), nur an der Stelle, an der der Bestand heute tatsächlich lebt. Robuster als der
   alte Text-Anker: er bricht nicht erneut, wenn `WIZARDS` von `let` auf irgendeine andere Form
   wechselt, oder ein sechster Wizard migriert — er liest, was der Kern selbst daraus macht. */
function katalogVerweiseAusQuelle() {
  const { V } = ladeKern();
  const treffer = [];
  for (const wiz of V.WIZARDS) {
    for (const schritt of (Array.isArray(wiz.schritte) ? wiz.schritte : [])) {
      const felder = [schritt.feld].concat(
        (schritt.feld && Array.isArray(schritt.feld.unterFelder)) ? schritt.feld.unterFelder : []);
      for (const feld of felder) {
        if (!feld || !feld.katalogOptionenAus) continue;
        const { sektorId, feldId, erlaubteWerte } = feld.katalogOptionenAus;
        treffer.push({ sektor: sektorId, feld: feldId, filter: erlaubteWerte || null });
      }
    }
  }
  return treffer;
}

function feldImBuendel(buendel, sektorId, feldId) {
  const b = buendel && buendel.bereiche && buendel.bereiche[sektorId];
  if (!b) return null;
  for (const sek of (b.sektionen || [])) {
    const f = (sek.felder || []).find((x) => x.id === feldId);
    if (f) return f;
  }
  return null;
}

const platteLesen = () => JSON.parse(fs.readFileSync(PLATTE, 'utf8'));

test('[Katalog-Deckung] die Verweise werden aus der QUELLE gezogen, nicht gepflegt', () => {
  const v = katalogVerweiseAusQuelle();
  assert.ok(v.length >= 8,
    'nur ' + v.length + ' Katalogverweise gefunden — erwartet mindestens acht. Findet das '
    + 'Muster weniger, prüft alles darunter ins Leere: eine Probe, die nichts findet, ist grün');
  const doppelt = v.map((x) => x.sektor + '.' + x.feld)
    .filter((k, i, a) => a.indexOf(k) !== i);
  assert.deepEqual([...new Set(doppelt)], [], 'derselbe Verweis zweimal — dann zählt die Probe falsch');
});

test('[Katalog-Deckung] JEDER Verweis findet sein Feld im Bündel auf der Platte, mit Optionen', () => {
  const buendel = platteLesen();
  const fehlend = [];
  for (const v of katalogVerweiseAusQuelle()) {
    const f = feldImBuendel(buendel, v.sektor, v.feld);
    if (!f) { fehlend.push(v.sektor + '.' + v.feld + ' (Feld fehlt)'); continue; }
    if (!Array.isArray(f.optionen) || !f.optionen.length) {
      fehlend.push(v.sektor + '.' + v.feld + ' (ohne optionen)');
    }
  }
  assert.deepEqual(fehlend, [],
    'diese WIZARDS-Katalogverweise finden im Bündel kein Katalogfeld. Der Kern wirft dann beim '
    + 'BOOT (`_katalogOptionen: kein Katalogfeld …`), und die Bürgerin sieht dreizehn '
    + '„undefined"-Labels:\n  ' + fehlend.join('\n  '));
});

test('[Katalog-Deckung·still] jeder FILTERWERT existiert wirklich — sonst schrumpft der Schritt lautlos', () => {
  /* Der leiseste Fall, und er wirft NICHT: `_katalogOptionen(sek, feld, ['verh','elp'])`
     filtert. Fehlt `verh` im Bündel, liefert der Aufruf einfach eine Option weniger — kein
     Wurf, keine Meldung, ein Assistenten-Schritt mit halbem Angebot. */
  const buendel = platteLesen();
  const luecken = [];
  let mitFilter = 0;
  for (const v of katalogVerweiseAusQuelle()) {
    if (!v.filter) continue;
    mitFilter++;
    const f = feldImBuendel(buendel, v.sektor, v.feld);
    const da = (f && f.optionen || []).map((o) => o.wert);
    for (const w of v.filter) {
      if (!da.includes(w)) luecken.push(v.sektor + '.' + v.feld + ' → ' + JSON.stringify(w));
    }
  }
  assert.ok(mitFilter >= 2,
    'nur ' + mitFilter + ' gefilterte Verweise gefunden — erwartet mindestens zwei '
    + '(familienstand, steuerklasse). Findet das Muster keine, prüft diese Probe nichts');
  assert.deepEqual(luecken, [],
    'diese Filterwerte stehen in WIZARDS, aber nicht in den Optionen des Bündels. Der Schritt '
    + 'zeigt dann weniger Auswahl, ohne dass irgendetwas wirft:\n  ' + luecken.join('\n  '));
});

test('[Katalog-Deckung·ROT] ein fehlendes Feld im Bündel wird gefunden', () => {
  /* Der Rot-Beweis, der heute Nacht gefehlt hat: an einer KOPIE des Bündels ein Katalogfeld
     entfernen — die Prüfung muss es sehen. Ohne ihn wäre grün, was blind ist. */
  const buendel = platteLesen();
  const v = katalogVerweiseAusQuelle()[0];
  const b = buendel.bereiche[v.sektor];
  for (const sek of (b.sektionen || [])) {
    sek.felder = (sek.felder || []).filter((f) => f.id !== v.feld);
  }
  assert.equal(feldImBuendel(buendel, v.sektor, v.feld), null,
    'das Feld ist nach dem Entfernen noch da — dann misst die Probe oben nichts');
});

test('[Katalog-Deckung·ROT] ein fehlender Filterwert wird gefunden', () => {
  const buendel = platteLesen();
  const v = katalogVerweiseAusQuelle().find((x) => x.filter && x.filter.length);
  assert.ok(v, 'kein gefilterter Verweis gefunden — der Rot-Beweis läuft ins Leere');
  const f = feldImBuendel(buendel, v.sektor, v.feld);
  const weg = v.filter[0];
  f.optionen = f.optionen.filter((o) => o.wert !== weg);
  const da = f.optionen.map((o) => o.wert);
  assert.ok(!da.includes(weg),
    'der Filterwert ist nach dem Entfernen noch da — dann misst die Probe oben nichts');
});

test('[Katalog-Deckung·Positivkontrolle] am unveränderten Bündel findet die Prüfung KEINE Lücke', () => {
  /* Ohne sie wären die Proben oben auch dann grün, wenn `feldImBuendel` immer `null`
     lieferte — dann prüften sie nichts als ihre eigene Strenge. */
  const buendel = platteLesen();
  const v = katalogVerweiseAusQuelle();
  const gefunden = v.filter((x) => feldImBuendel(buendel, x.sektor, x.feld));
  assert.equal(gefunden.length, v.length,
    'am echten Bündel muss JEDER Verweis sein Feld finden — sonst ist entweder das Bündel '
    + 'kaputt oder die Suchfunktion, und die Rot-Beweise oben bewiesen nichts');
});

/* ══════════════════════════════════════════════════════════════════════════
   Die größere Frage, gemessen statt vermutet: die acht WIZARDS-Verweise sind
   nicht die einzigen ihrer Klasse. Das Bündel enthält selbst Verweise auf
   Feld-Kennungen, die auflösen MÜSSEN — und keiner davon war gedeckt:

     sichtbarWenn.feld        87
     zusammenfassungFelder    12
     verweisKontextFeld        2

   Alle lösen heute auf. Ein Feld umzubenennen, ohne die Verweise nachzuziehen,
   fiele bisher durch keine Probe — und anders als bei den Katalogverweisen
   WIRFT hier nichts: eine `sichtbarWenn`-Bedingung auf ein nicht existierendes
   Feld ist schlicht nie erfüllt. Das Feld bleibt unsichtbar, dauerhaft, ohne
   Meldung. ══════════════════════════════════════════════════════════════ */

function verweiseImBuendel(buendel) {
  const felder = new Set();
  const unter = new Set();
  for (const [sid, ber] of Object.entries(buendel.bereiche || {})) {
    for (const sek of (ber.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        felder.add(sid + '.' + f.id);
        for (const u of (f.unterFelder || [])) unter.add(sid + '.' + f.id + '/' + u.id);
      }
    }
  }
  const verweise = [];
  for (const [sid, ber] of Object.entries(buendel.bereiche || {})) {
    for (const sek of (ber.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        const sammle = (o, wo, traeger) => {
          if (o && o.sichtbarWenn && o.sichtbarWenn.feld) {
            verweise.push({ art: 'sichtbarWenn', wo, ziel: o.sichtbarWenn.feld, sid, traeger });
          }
          for (const z of (Array.isArray(o && o.zusammenfassungFelder) ? o.zusammenfassungFelder : [])) {
            verweise.push({ art: 'zusammenfassungFelder', wo, ziel: z, sid, traeger });
          }
        };
        sammle(f, sid + '.' + f.id, null);
        for (const u of (f.unterFelder || [])) sammle(u, sid + '.' + f.id + '/' + u.id, f.id);
      }
    }
  }
  return { felder, unter, verweise };
}

/* Ein Ziel darf ein Sektorfeld sein ODER ein Geschwister-UnterFeld desselben Trägers —
   `sichtbarWenn` an einer Listenzeile zeigt auf eine andere Spalte derselben Zeile. */
function zielLoest(v, felder, unter) {
  if (felder.has(v.sid + '.' + v.ziel)) return true;
  if (v.traeger && unter.has(v.sid + '.' + v.traeger + '/' + v.ziel)) return true;
  for (const u of unter) if (u.endsWith('/' + v.ziel) && u.startsWith(v.sid + '.')) return true;
  return false;
}

test('[Katalog-Deckung·weiter] die Verweise INNERHALB des Bündels lösen alle auf', () => {
  const { felder, unter, verweise } = verweiseImBuendel(platteLesen());
  assert.ok(verweise.length >= 90,
    'nur ' + verweise.length + ' Verweise gefunden — erwartet rund hundert (87 sichtbarWenn, '
    + '12 zusammenfassungFelder). Findet der Sammler weniger, prüft er ins Leere');
  const tot = verweise.filter((v) => !zielLoest(v, felder, unter));
  assert.deepEqual(tot.map((v) => v.art + ' ' + v.wo + ' → ' + v.ziel), [],
    'diese Verweise zeigen auf ein Feld, das es im Bündel nicht gibt. Anders als bei den '
    + 'Katalogverweisen wirft hier NICHTS: eine `sichtbarWenn`-Bedingung auf ein fehlendes Feld '
    + 'ist nie erfüllt — das Feld bleibt unsichtbar, dauerhaft, ohne Meldung');
});

test('[Katalog-Deckung·weiter·ROT] ein ins Leere zeigender Verweis wird gefunden', () => {
  const buendel = platteLesen();
  const erster = Object.keys(buendel.bereiche)[0];
  const sek = buendel.bereiche[erster].sektionen[0];
  sek.felder[0].sichtbarWenn = { feld: 'gibt_es_nicht_a317', wert: 'x' };
  const { felder, unter, verweise } = verweiseImBuendel(buendel);
  const tot = verweise.filter((v) => !zielLoest(v, felder, unter));
  assert.equal(tot.length, 1, 'der eingesetzte Blindverweis wurde nicht gefunden — dann misst die Probe oben nichts');
  assert.equal(tot[0].ziel, 'gibt_es_nicht_a317');
});
