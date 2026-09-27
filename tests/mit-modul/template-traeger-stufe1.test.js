'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Template-Träger, Stufe 1 — und die Grenze, die dabei präzisiert wurde
   (Entscheidung „Templates konstituieren das Modul", 08.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DREI DINGE WERDEN HIER GEHALTEN, und das dritte ist das sicherheitsrelevante.

   1 · DER TRÄGER. Ein Bereichs-Template kann Bereich UND Felder tragen, über EINEN Weg.
       Bis zum 08.09.2026 stand im Prüfer `sektionen: Object.freeze([])` mit dem Kommentar,
       das sei „kein Platzhalter, sondern die Aussage: dieser Bereich trägt keine eingebauten
       Felder". Die Aussage war richtig — und sie war die halbe Naht, an der der ganze
       08.09. entlanggelaufen ist.

   2 · DIE KENNUNG. `bereichsModulEinbetten` schlüsselte nach `herkunft`. Damit konnte ein
       Anbieter genau EIN Bereichs-Modul haben; ein zweites verdrängte das erste STILL und
       vollständig. Das ist ein Bestandsfehler, kein Neubau-Detail: eine Kammer mit mehreren Templates verlor alle bis auf eines lautlos.

   3 · DIE SAAT HAT ZWEI EINGÄNGE, und nur einer ist vertrauenswürdig:
         (1) `AB_WERK_BEREICH_QUELLEN` — beim Konfektionieren EINGEBACKEN, steht in der
             ausgelieferten Datei. Wer sie ändert, hat die Datei ohnehin in der Hand.
         (2) `d.abWerkMitschrift.bereich` — Rückfall, wenn (1) leer ist. Kommt aus einer
             DEPOT-DATEI, also VON AUSSEN.
       Der erste Entwurf dieses Zuges gab `{ abWerk: true }` am Aufrufer mit und deckte damit
       BEIDE. Eine manipulierte Depot-Datei hätte über den Saat-Weg einen eingebauten Bereich
       kapern können — genau der Fall, gegen den der `reserviert`-Riegel steht.

       Derselbe Schnitt wie U2-ADR-384 für die Marke: „konfektionieren ist nicht einlassen".
       Der Riegel schlüsselt auf den WEG, nicht auf die ID.

   FÄLLT EINE DER DREI SICHERHEITS-PROBEN AUS, ist die Grenze nicht präziser geworden,
   sondern WEITER. Das ist der Unterschied, den ein grüner Lauf allein nicht zeigt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('../load-kern.js');
const { rohQuelleFuer } = require('../helfer/bereichs-rohquelle.js');

const TEMPLATE = Object.freeze({
  modulTyp: 'bereich', moduleVersion: 1, herkunft: 'kammer-probe', sprache: 'de',
  kennung: 'kammer-probe/erstes', fassung: 3,
  bereiche: {
    'probe-wohnen': {
      label: 'Wohnen (Probe)', icon: 'folder',
      sektionen: [
        { id: 'haupt', label: 'Haupt', felder: [{ id: 'tpl_a' }, { id: 'tpl_b' }] },
        { id: 'zweit', felder: [{ id: 'tpl_c' }] },      // bewusst OHNE Label
      ],
    },
  },
});

describe('[Träger] ein Template trägt Bereich UND Felder', () => {
  test('Sektionen mit Feldern kommen durch — nicht mehr als leeres Array', () => {
    const { V } = ladeKern();
    const g = V.bereichsModulPruefen(TEMPLATE);
    assert.equal(g.gueltig, true, 'Grund: ' + g.grund + ' / ' + JSON.stringify(g.verworfene));
    assert.deepEqual(g.verworfene, [], 'ROT ERWARTET, wenn falsch: nichts darf still verworfen werden');
    const b = g.bereiche[0];
    assert.equal(b.sektionen.length, 2);
    assert.deepEqual(b.sektionen.map((s) => s.felder.length), [2, 1],
      'DER KERN DIESES ZUGES: die Felder reisen mit dem Bereich, nicht auf einem zweiten Weg');
  });

  test('eine Sektion ohne Label fällt auf ihre ID zurück, nie auf undefined', () => {
    /* Fund v639 (07.09.2026, aus dem echten Browser): eine Sektions-Hülle ohne Label brach
       `renderSektor()` an `escapeHTML(sek.label)`. Der Rückfall gehört in den Getter und
       NICHT als Vorab-Zuweisung — ein vorab gesetztes Label liest `_textsatzKnotenFuellen`
       als „schon da" und überspringt die echte Übersetzung (Korrektur v640). */
    const { V } = ladeKern();
    const b = V.bereichsModulPruefen(TEMPLATE).bereiche[0];
    assert.equal(b.sektionen[0].label, 'Haupt');
    assert.equal(b.sektionen[1].label, 'zweit',
      'ROT ERWARTET, wenn falsch: undefined hier bricht renderSektor()');
  });

  test('[Bestandsfehler] zwei Templates DESSELBEN Autors verdrängen einander nicht mehr', () => {
    const { V } = ladeKern();
    const zweites = Object.assign({}, TEMPLATE, {
      kennung: 'kammer-probe/zweites',
      bereiche: { 'probe-zwei': { label: 'Zweites', sektionen: [{ id: 's', felder: [{ id: 'tpl_x' }] }] } },
    });
    let bestand = [];
    bestand = V.bereichsModulEinbetten(bestand, TEMPLATE);
    bestand = V.bereichsModulEinbetten(bestand, zweites);
    assert.equal(bestand.length, 2,
      'ROT ERWARTET, wenn falsch: nach `herkunft` geschlüsselt verdrängt das zweite das erste '
      + 'STILL — eine Kammer mit zwei Bereichen verlöre einen davon lautlos');
  });

  test('[Rückwärtsverträglich] ein Bestands-Modul ohne kennung und ohne sektionen verhält sich unverändert', () => {
    const { V } = ladeKern();
    const alt = { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'alt-anbieter', sprache: 'de',
      bereiche: { 'alt-bereich': { label: 'Alt' } } };
    const g = V.bereichsModulPruefen(alt);
    assert.equal(g.gueltig, true);
    assert.deepEqual(g.bereiche[0].sektionen, [], 'ohne `sektionen` bleibt es beim leeren Array');
    let bestand = V.bereichsModulEinbetten([], alt);
    bestand = V.bereichsModulEinbetten(bestand, Object.assign({}, alt, { moduleVersion: 2 }));
    assert.equal(bestand.length, 1,
      'ohne Kennung greift der Rückfall auf `herkunft` — dieselbe Herkunft ERSETZT weiterhin');
  });
});

describe('[Grenze] die Saat hat drei Eingänge, und nur zwei sind vertrauenswürdig', () => {
  const MIT_RESERVIERTER_ID = Object.freeze({
    modulTyp: 'bereich', moduleVersion: 1, herkunft: 'fremd', sprache: 'de',
    bereiche: { housing: { label: 'Gekapert', sektionen: [{ id: 'x', felder: [{ id: 'tpl_a' }] }] } },
  });

  test('[Rot-Beweis 1] ein FREMDES Modul mit reservierter ID wird weiterhin verworfen', () => {
    const { V } = ladeKern();
    const g = V.bereichsModulPruefen(MIT_RESERVIERTER_ID);
    assert.equal(g.gueltig, false);
    assert.ok(g.verworfene.some((v) => v.id === 'housing' && v.grund === 'reserviert'),
      'ROT ERWARTET, wenn falsch: der Einlassweg darf keinen eingebauten Bereich kapern lassen — '
      + JSON.stringify(g.verworfene));
  });

  test('[Rot-Beweis 2] eine MITSCHRIFT mit reservierter ID wird verworfen, auch über den Saat-Weg', () => {
    /* Der Fund, der beim zweiten Lesen nicht mehr sichtbar ist: `_bereichModulAbWerkSeed`
       fällt auf `d.abWerkMitschrift.bereich` zurück — Inhalt aus einer DEPOT-DATEI. Wer die
       Ausnahme pauschal für den Saat-Weg öffnet, macht diesen Eingang auf. */
    const { V } = ladeKern();
    const d = V.leeresDepot();
    d.abWerkMitschrift = { bereich: [MIT_RESERVIERTER_ID] };
    const gesaet = V._bereichModulAbWerkSeed(d);
    /* SEIT STUFE 2 FRAGT DIESE PROBE NACH DER HERKUNFT, NICHT NACH DER ANWESENHEIT
       (09.09.2026) — und das ist eine Verschärfung, keine Lockerung.

       Bis hierher genügte „`wohnen` erscheint nicht in der Saat": es gab keine eingebaute
       Quelle, also konnte `wohnen` dort nur über die Mitschrift landen. Seit `wohnen` aus
       `BEREICH_QUELLEN_EINGEBAUT` gesät wird, IST es in der Saat — zu Recht. Die alte Fassung
       hätte den Umzug als Sicherheitsverstoss gemeldet und wäre bei einer echten Kaperung
       trotzdem nicht schärfer gewesen.

       GEPRÜFT WIRD JETZT DER INHALT: kommt `wohnen` mit dem eingebauten Wortlaut oder mit dem
       der manipulierten Datei? Gemessen, bevor umgestellt wurde: es trägt „Wohnen & Eigentum"
       aus dem Textsatz, nicht „Gekapert" — der `reserviert`-Riegel greift, weil ein
       Mitschrift-Eintrag mit `abWerk: false` läuft. */
    const treffer = gesaet.find((b) => b.id === 'housing');
    assert.ok(treffer, 'Vorbedingung: `wohnen` wird ab Werk gesät und MUSS erscheinen');
    assert.notEqual(treffer.label, 'Gekapert',
      'ROT ERWARTET, wenn falsch: eine manipulierte Depot-Datei kapert über die Mitschrift einen '
      + 'eingebauten Bereich — die Ausnahme gilt NUR den eingebackenen Quellen');
    assert.ok(V.BEREICHS_MODUL_VERWORFEN.some((v) => v.id === 'housing' && v.grund === 'reserviert'),
      'und der Versuch muss eine Spur hinterlassen: ' + JSON.stringify(V.BEREICHS_MODUL_VERWORFEN));
  });

  test('[Rot-Beweis 3·Positivkontrolle] die eingebackene Konstante mit derselben ID wird angenommen', () => {
    /* Ohne diese dritte Probe wären die zwei darüber auch dann grün, wenn die Ausnahme gar
       nicht existierte — dann misst der Lauf, dass alles verboten ist, und nicht die Grenze. */
    const { V } = ladeKern();
    const g = V.bereichsModulPruefen(MIT_RESERVIERTER_ID, { abWerk: true });
    assert.equal(g.gueltig, true,
      'ROT ERWARTET, wenn falsch: die Ab-Werk-Saat des eigenen Produkts MUSS ihre Bereiche '
      + 'setzen dürfen — sonst ist die Grenze nicht präziser, sondern nur enger');
    assert.deepEqual(g.bereiche.map((b) => b.id), ['housing']);
  });
});

/* ══ DIE UNSICHTBARKEITS-MESSUNG ══════════════════════════════════════════════
   DIE EINE FRAGE, AN DER STUFE 1 HÄNGT (08.09.2026): erzeugt derselbe Inhalt über
   den neuen Träger exakt dieselbe Ausgabe wie über den bestehenden Weg?

   Dieselben Daten, zwei Wege, EIN Lauf — schärfer als zwei Zustände nacheinander, weil
   nichts zwischen den Messungen liegen kann.

   WAS DIESE PROBE NICHT BEWEIST, und das ist wichtig genug für einen eigenen Absatz:
   sie beweist den TRÄGER, nicht den UMSTIEG. Ob ein Bereich gefahrlos vom Bündel in die
   Ab-Werk-Saat umziehen kann, ist eine andere Frage — die Saat läuft zur Depot-Zeit, das
   Bündel beim Booten. Wer das verwechselt, hält Stufe 2 für geschenkt. */

describe('[Unsichtbarkeit] derselbe Inhalt über den neuen Träger', () => {
  test('alle dreizehn Bereiche passieren den Träger — Labels, Sektionen und alle Felder identisch', () => {
    const { V } = ladeKern();
    const idx = V._sektorIndexHalter();
    const abweichungen = [];
    let felddefs = 0, geprueft = 0;

    for (const bereich of V.bereicheAlle()) {
      const id = bereich.id;
      const roh = rohQuelleFuer(V, id);
      if (!roh) continue;                       // nicht aus dem Bündel — nicht Gegenstand
      geprueft++;

      const g = V.bereichsModulPruefen({
        modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de',
        kennung: 'vivodepot/' + id, fassung: 1, bereiche: { [id]: roh },
      }, { abWerk: true });
      assert.equal(g.gueltig, true,
        'Bereich "' + id + '" passiert den Träger NICHT: ' + g.grund + ' ' + JSON.stringify(g.verworfene));

      const A = idx[id], B = g.bereiche[0];
      const cmp = (was, x, y) => {
        if (JSON.stringify(x) !== JSON.stringify(y)) abweichungen.push(id + '.' + was);
      };
      cmp('label', A.label, B.label);
      cmp('icon', A.icon, B.icon);
      cmp('sektionsIds', (A.sektionen || []).map((s) => s.id), (B.sektionen || []).map((s) => s.id));
      cmp('sektionsLabels', (A.sektionen || []).map((s) => s.label), (B.sektionen || []).map((s) => s.label));

      /* Die Felder über DIESELBE Abflachung, die auch der Bündelweg benutzt — inklusive
         Sektions-Bindung, Unterfeld-Bindung und dem vollständigen Feld-Inhalt. */
      const schluessel = (d) => [d.sektionId, d.feldId, d.unterVon, d.feld];
      const dA = V._buendelBereichZuFeldDefs(id, roh);
      const dB = V._buendelBereichZuFeldDefs(id, { sektionen: B.sektionen });
      felddefs += dA.length;
      cmp('felder', dA.map(schluessel), dB.map(schluessel));
    }

    assert.equal(geprueft, 13, 'alle dreizehn nativen Bereiche müssen gemessen worden sein');
    assert.ok(felddefs > 450, 'die Messung muss die volle Feldmenge begangen haben, gezählt: ' + felddefs);
    assert.deepEqual(abweichungen, [],
      'DIE ZAHL, AN DER STUFE 1 HÄNGT: jede Abweichung hier heißt, dass ein migrierter Bereich '
      + 'ausgehandelte Ausnahmen in der v515-Abnahme braucht — und dann kostet Bereich zwei so '
      + 'viel wie Bereich eins. Abweichungen: ' + abweichungen.join(', '));
  });

  test('KEINE Abweichung mehr: der Träger reicht durch, statt zu normalisieren', () => {
    /* DIESE PROBE HAT IHREN GEGENSTAND VERLOREN, UND DAS IST DER FORTSCHRITT (09.09.2026).

       Sie hielt bis Stufe 2 fest, dass GENAU ZWEI Abweichungen bleiben: der Bündelweg lässt
       `merkmale`/`rollen` weg, wo ein Bereich keine hat, der Einlassweg normalisierte sie auf
       leere Sammlungen. Das galt als additiv und unvermeidlich.

       UNVERMEIDLICH WAR ES NICHT. Beim ersten migrierten Bereich wurde daraus ein sichtbarer
       Unterschied im ausgelieferten VD-Privat-Struktur-Bündel: `wohnen` trug dort plötzlich
       `"merkmale":[],"rollen":{}`, wo vorher nichts stand. Der Träger REICHERTE AN — und die
       Zusicherung „derselbe Inhalt über den neuen Träger" war damit verletzt, nur in die
       andere Richtung als gesucht: nicht Verlust, sondern Zutat.

       Seit `bereichsModulPruefen` die zwei Schlüssel nur noch setzt, wenn der Bereich sie
       WIRKLICH trägt, gibt es die Abweichung nicht mehr. Die Probe trägt darum die schärfere
       Aussage: KEINE Sorte, nicht zwei. Erscheint wieder eine, ist sie ein Fund — dieselbe
       Wachsamkeit, nur an einer Grenze, die nicht mehr nachgibt. */
    const { V } = ladeKern();
    const idx = V._sektorIndexHalter();
    const sorten = new Set();
    let mitMerkmalen = 0;

    for (const bereich of V.bereicheAlle()) {
      const id = bereich.id;
      const roh = rohQuelleFuer(V, id);
      if (!roh) continue;
      const g = V.bereichsModulPruefen({
        modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', sprache: 'de',
        kennung: 'vivodepot/' + id, fassung: 1, bereiche: { [id]: roh },
      }, { abWerk: true });
      const A = idx[id], B = g.bereiche[0];
      /* JE ATTRIBUT, NICHT JE BEREICH — gemessen: `krisenvorsorge` traegt Merkmale, aber
         keine Rollen. Eine Verzweigung ueber `A.merkmale !== undefined` fuer BEIDE haette
         dort Rollen verglichen, die es gar nicht gibt. Der erste Entwurf dieser Probe tat
         genau das und fiel; der Fehler lag in der Probe, nicht im Gegenstand. */
      for (const attr of ['merkmale', 'rollen']) {
        if (A[attr] !== undefined) {
          if (attr === 'merkmale') mitMerkmalen++;
          assert.deepEqual(B[attr], A[attr],
            'wo `' + attr + '` vorhanden sind, muessen beide Wege uebereinstimmen: ' + id);
        } else if (JSON.stringify(A[attr]) !== JSON.stringify(B[attr])) {
          sorten.add(attr + ': absent -> ' + JSON.stringify(B[attr]));
        }
      }
    }

    assert.ok(mitMerkmalen >= 4, 'die Positivseite muss mitgemessen sein, gezählt: ' + mitMerkmalen);
    assert.deepEqual([...sorten].sort(), [],
      'ROT ERWARTET, wenn falsch: der Träger reicht `merkmale`/`rollen` unverändert durch. '
      + 'Jede Sorte hier heisst, dass er wieder anreichert — und dann steht sie im nächsten '
      + 'erzeugten Produkt-Artefakt. Gefunden: ' + [...sorten].join(', '));
  });
});
