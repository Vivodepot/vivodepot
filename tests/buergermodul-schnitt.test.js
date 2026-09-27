'use strict';
/* U2-ADR-291 — der Schnitt des eingebauten Bestands in Struktur / Sprache / Recht / Marke.

   DER MASSSTAB, wörtlich (05.09.2026): „Am Ende möchte ich ‚mein'
   Bürgerdepot haben. Als wäre nichts gewesen." Vollständigkeit ist damit die Bedingung,
   keine Güteklasse — und genau das prüfen diese Proben, nicht ob das Werkzeug läuft. */
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const {
  schneiden, feldSchneiden, textKennung, optionKennung, strukturAufTextPruefen, RECHTS_EIGENSCHAFTEN,
} = require(path.join(__dirname, '..', 'tools', 'buergermodul-schnitt.js'));

/* Die Texte des eingebauten Bestands, die HEUTE unter keiner Textsatz-Kennung stehen —
   ein Sprachmodul kann sie darum nicht ersetzen, und in der englischen App blieben sie
   deutsch. Gemessen am 05.09.2026 gegen v557, NICHT geschätzt.

   Diese Liste ist eine RATSCHE: sie darf schrumpfen (jemand trägt die Kennung nach),
   aber nie wachsen. Wächst sie, ist ein neuer Text eingebaut worden, den keine Sprache
   erreicht — und genau das würde die Bürgerin bemerken. */
/* U2-ADR-399 (06.09.2026): `feld.art.vorschlaege` war der einzige Rest nach U2-ADR-291 —
   die Kennungsform `feld.<feldId>.vorschlaege` trug keine sektorId, und `art` ist eine der
   17 katalogweit doppelt vergebenen UnterFeld-IDs (meine-menschen/unterhalt/art —
   Unterhaltsarten, finanzen/konten/art — Kontoarten). Aufgelöst durch die Trägerkette
   (`feld.<traeger>/<feldId>.vorschlaege`, s. Kommentar an `_vorschlaegeTextsatz` und an
   `feldSchneiden` oben) — die Liste ist jetzt leer, nicht entfernt: eine leere RATSCHE bleibt
   der Wächter dafür, dass sie nicht wieder wächst, ohne dass es auffällt. */
const BEKANNTE_LUECKEN = Object.freeze([]);

test('[Schnitt·Vollständigkeit] die geschnittene Struktur trägt keinen sichtbaren Text mehr', () => {
  const { V } = ladeKern();
  const { privat } = schneiden(V);
  const rest = strukturAufTextPruefen(privat, V.TEXTSATZ_ARTEN_FELD);
  assert.deepEqual(rest, [],
    'die Struktur trägt noch Text — er würde beim Sprachwechsel deutsch bleiben:\n'
    + rest.slice(0, 5).map((r) => '  ' + r.pfad + ' = ' + JSON.stringify(r.text)).join('\n'));
});

test('[Schnitt·Positivkontrolle] die Vollständigkeitsprobe erkennt einen eingeschmuggelten Text', () => {
  const { V } = ladeKern();
  const { privat } = schneiden(V);
  const ersterBereich = Object.keys(privat.bereiche)[0];
  privat.bereiche[ersterBereich].sektionen[0].label = 'Ein nachträglich eingesetzter deutscher Text';
  const rest = strukturAufTextPruefen(privat, V.TEXTSATZ_ARTEN_FELD);
  assert.equal(rest.length, 1, 'die Probe findet einen offensichtlich eingesetzten Text nicht — sie misst nichts');
});

test('[Schnitt·RATSCHE] kein NEUER Text ohne Sprachmodul-Deckung', () => {
  const { V } = ladeKern();
  const TS = V.TEXTSATZ_DE_QUELLE.texte;
  const { sprache } = schneiden(V);
  const fehlend = Object.keys(sprache).filter((k) => !(k in TS)).sort();
  const neu = fehlend.filter((k) => BEKANNTE_LUECKEN.indexOf(k) < 0);
  assert.deepEqual(neu, [],
    'NEUE Texte ohne Textsatz-Kennung — ein Sprachmodul kann sie nicht ersetzen, in der '
    + 'englischen App blieben sie deutsch. Entweder die Kennung nachtragen oder, wenn es '
    + 'wirklich keine geben soll, hier bewusst aufnehmen:\n  ' + neu.join('\n  '));
});

test('[Schnitt·RATSCHE-Gegenrichtung] die Lückenliste trägt nichts Erledigtes mit', () => {
  const { V } = ladeKern();
  const TS = V.TEXTSATZ_DE_QUELLE.texte;
  const { sprache } = schneiden(V);
  const fehlend = new Set(Object.keys(sprache).filter((k) => !(k in TS)));
  const erledigt = BEKANNTE_LUECKEN.filter((k) => !fehlend.has(k));
  assert.deepEqual(erledigt, [],
    'diese Kennungen stehen als bekannte Lücke, sind es aber nicht mehr — aus der Liste '
    + 'nehmen, sonst deckt sie irgendwann etwas, das niemand mehr geprüft hat:\n  ' + erledigt.join('\n  '));
});

test('[Schnitt·Kennung] keine Feld-Kennung trägt ein tpl_-Präfix', () => {
  const { V } = ladeKern();
  const { privat } = schneiden(V);
  const mitPraefix = [];
  for (const [bid, bereich] of Object.entries(privat.bereiche)) {
    for (const sektion of (bereich.sektionen || [])) {
      for (const feld of (sektion.felder || [])) {
        if (typeof feld.id === 'string' && feld.id.indexOf('tpl_') === 0) mitPraefix.push(bid + '.' + feld.id);
        for (const u of (feld.unterFelder || [])) {
          if (typeof u.id === 'string' && u.id.indexOf('tpl_') === 0) mitPraefix.push(bid + '.' + feld.id + '/' + u.id);
        }
      }
    }
  }
  assert.deepEqual(mitPraefix, [],
    'eine Feld-Kennung trägt ein Präfix. Die Kennung IST der Speicherplatz '
    + '(data.sektoren[sektorId][feldId], U2-ADR-037 Entscheidung 1) — ein Präfix verwaist '
    + 'den Eintrag jeder Bestandsbürgerin.');
});

test('[Schnitt·Disjunkt] keine Eigenschaft liegt in Struktur UND Recht', () => {
  const { V } = ladeKern();
  const rollen = V.TEXTSATZ_ARTEN_FELD;
  let geprueft = 0;
  for (const sektor of V.SEKTOREN) {
    for (const sektion of (sektor.sektionen || [])) {
      for (const feld of (sektion.felder || [])) {
        const s = feldSchneiden(sektor.id, feld, rollen, null);
        geprueft++;
        for (const k of Object.keys(s.recht)) {
          assert.ok(!(k in s.struktur), 'die Eigenschaft `' + k + '` liegt an ' + sektor.id + '.' + feld.id
            + ' in Struktur UND Recht — beim Rechtsraumwechsel bliebe die Kopie in der Struktur stehen');
        }
      }
    }
  }
  assert.ok(geprueft > 200, 'die Probe hat nur ' + geprueft + ' Felder gesehen — sie läuft ins Leere');
});

test('[Schnitt·Recht] die Rechts-Eigenschaften verlassen die Struktur wirklich', () => {
  const { V } = ladeKern();
  const { privat, recht } = schneiden(V);
  assert.ok(Object.keys(recht.felder).length > 0, 'kein einziges Feld trägt Recht — der Bestand kennt aber § 84 SGG und § 4 KSchG');
  const gefunden = [];
  const lauf = (o, pfad, tiefe) => {
    if (!o || typeof o !== 'object' || tiefe > 25) return;
    if (Array.isArray(o)) { o.forEach((v, i) => lauf(v, pfad + '[' + i + ']', tiefe + 1)); return; }
    for (const k of Object.keys(o)) {
      if (RECHTS_EIGENSCHAFTEN.indexOf(k) >= 0) gefunden.push(pfad + '.' + k);
      lauf(o[k], pfad + '.' + k, tiefe + 1);
    }
  };
  lauf(privat, 'privat', 0);
  assert.deepEqual(gefunden, [],
    'die Struktur trägt noch Rechts-Eigenschaften — in einem anderen Rechtsraum stimmten sie nicht:\n  ' + gefunden.join('\n  '));
});

test('[Schnitt·Kennungsform] die Textsatz-Kennung trägt die Kette des Trägerfelds', () => {
  /* Der gemessene Fehler vom 05.09.2026: ohne das Trägerfeld im Schlüssel meldete der
     Schnitt 134 Deckungslücken, wo keine einzige war. Die Form ist damit kein Detail. */
  assert.equal(textKennung('identity', 'givenName', 'label', null), 'identity.givenName.label');
  assert.equal(textKennung('people', 'note', 'label', 'childrenAndDependants'), 'people.childrenAndDependants/note.label');
  assert.equal(optionKennung('identity', 'gender', 'm', null), 'identity.gender/m.label');
  assert.equal(optionKennung('identity', 'reason', 'heirat', 'formerNames'), 'identity.formerNames/reason/heirat.label');

  const { V } = ladeKern();
  const TS = V.TEXTSATZ_DE_QUELLE.texte;
  assert.ok('identity.formerNames/reason/heirat.label' in TS,
    'die UnterFeld-Options-Form steht nicht im Bestand — dann ist sie erfunden, nicht gemessen');
});

/* U2-ADR-307 (05.09.2026) — die Probe, die meinen eigenen Fehler gefangen haette.

   Der Schnitt lief anfangs NUR ueber SEKTOREN und uebersah drei der sechs Rechtsregeln,
   alle drei in SITUATIONEN — darunter § 1944 BGB, die Erbausschlagungsfrist. Am Buendel war
   das nicht zu sehen: es sah vollstaendig aus, weil nichts darin fehlte, das es kannte.

   DIESE PROBE LAEUFT DARUM NICHT DEN SCHNITT AB, SONDERN DEN BESTAND — generisch, ueber
   jeden exportierten Katalog, ohne zu wissen, wo Regeln stehen duerfen. Nur so faellt eine
   Regel an einem Ort auf, den der Schnitt (noch) nicht kennt. Ein Waechter, der dieselbe
   Landkarte benutzt wie das Werkzeug, das er bewacht, bewacht nichts. */
test('[Schnitt·Recht·RATSCHE] JEDE Rechtsregel im Bestand landet im Rechtsraum-Anteil', () => {
  const { V } = ladeKern();
  const imBestand = [];
  const lauf = (o, pfad, tiefe) => {
    if (!o || typeof o !== 'object' || tiefe > 25) return;
    if (Array.isArray(o)) return o.forEach((v, i) => lauf(v, pfad + '[' + i + ']', tiefe + 1));
    for (const k of Object.keys(o)) {
      if (RECHTS_EIGENSCHAFTEN.indexOf(k) >= 0) imBestand.push({ pfad: pfad + '.' + k, wert: JSON.stringify(o[k]) });
      lauf(o[k], pfad + '.' + k, tiefe + 1);
    }
  };
  for (const name of ['SEKTOREN', 'SITUATIONEN', 'WIZARDS', 'VOLLMACHT_BMJ', 'ANLAESSE']) {
    if (V[name] !== undefined) lauf(V[name], name, 0);
  }
  assert.ok(imBestand.length >= 6,
    'der Bestand traegt nur ' + imBestand.length + ' Rechtsregeln — erwartet mindestens sechs. '
    + 'Sind welche entfallen, gehoert die Zahl hier gesenkt; sonst laeuft die Probe ins Leere.');

  const { recht } = schneiden(V);
  const geschnitten = [];
  for (const eintrag of Object.values(recht.felder)) {
    for (const k of Object.keys(eintrag)) geschnitten.push(JSON.stringify(eintrag[k]));
  }
  const fehlend = imBestand.filter((f) => geschnitten.indexOf(f.wert) < 0);
  assert.deepEqual(fehlend.map((f) => f.pfad), [],
    'diese Rechtsregeln stehen im Bestand, aber nicht im Rechtsraum-Anteil des Schnitts — in '
    + 'einem anderen Rechtsraum blieben sie still deutsch:\n  '
    + fehlend.map((f) => f.pfad + ' = ' + f.wert).join('\n  '));
});

test('[Schnitt·Recht·Positivkontrolle] die Ratsche sieht eine Regel an einem neuen Ort', () => {
  const { V } = ladeKern();
  /* Eine Regel an einem Ort einsetzen, den der Schnitt NICHT ablaeuft (ein Wizard-Schritt).
     Faellt die Probe darauf nicht herein, misst sie nur die Orte, die der Schnitt ohnehin kennt
     — und waere damit genau der Waechter, der meinen Fehler nicht gefangen hat. */
  const w = V.WIZARDS[0];
  const schritt = (w.schritte || [])[0];
  assert.ok(schritt && schritt.feld, 'kein Wizard-Schritt mit Feld — die Positivkontrolle laeuft ins Leere');
  schritt.feld.fristRegel = { dauer: 'P6W', quelle: '§ ERFUNDEN — nur fuer diese Probe' };

  const imBestand = [];
  const lauf = (o, pfad, tiefe) => {
    if (!o || typeof o !== 'object' || tiefe > 25) return;
    if (Array.isArray(o)) return o.forEach((v, i) => lauf(v, pfad + '[' + i + ']', tiefe + 1));
    for (const k of Object.keys(o)) {
      if (RECHTS_EIGENSCHAFTEN.indexOf(k) >= 0) imBestand.push(JSON.stringify(o[k]));
      lauf(o[k], pfad + '.' + k, tiefe + 1);
    }
  };
  lauf(V.WIZARDS, 'WIZARDS', 0);
  assert.ok(imBestand.indexOf(JSON.stringify(schritt.feld.fristRegel)) >= 0,
    'der Bestands-Laeufer findet die eingesetzte Regel nicht — dann faende er auch eine echte nicht');

  const { recht } = schneiden(V);
  const geschnitten = Object.values(recht.felder).map((e) => JSON.stringify(e.fristRegel));
  assert.ok(geschnitten.indexOf(JSON.stringify(schritt.feld.fristRegel)) < 0,
    'der Schnitt hat die Wizard-Regel mitgenommen — dann ist die Ratsche oben nicht mehr noetig, '
    + 'aber diese Positivkontrolle gehoert dann angepasst statt stillschweigend gruen zu bleiben');
});
