'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Jeder Feldtyp wird in BEIDEN Apps lesbar — typgetrieben, nicht feldgetrieben.
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST. Rot fuer `mehrfachauswahl` und `bankvollmacht`, bevor sie
   gebaut werden.

   WARUM ES DIESE DRITTE EBENE BRAUCHT: Der Paritaets-Test vergleicht
   DEKLARATIONEN und sieht diese Fehlerklasse prinzipiell nicht. An einem Tag
   sind drei Faelle aufgetreten, in denen ein Feld in beiden Apps KORREKT
   deklariert war und trotzdem falsch erschien:

     · refMehrfach      → „[object Object]" (Zweig fehlte in feldWertText)
     · datum            → „1950-03-07" statt „07.03.1950" (Schicht fehlte ganz)
     · mehrfachauswahl  → „trauer" statt des Klartext-Labels

   Alle drei haetten den Paritaets-Test passiert. Fehlt ein Typ-Zweig, wartet
   derselbe Defekt an JEDEM Feld dieses Typs — und die sieben Listen, die noch
   nachzuziehen sind, sind allesamt vom Typ `liste`. Sie in einen
   unvollstaendigen Renderer zu ziehen, waere die teure Variante gewesen:
   Der Defekt kaeme mit und saehe wie ein Fehler der Umstellung aus.

   DER TEST ITERIERT UEBER DIE TYPEN DES MODELLS, nicht ueber eine Liste im
   Test. Ein Typ, der morgen dazukommt, hat hier keine Probe — und der
   Vollstaendigkeits-Waechter unten schlaegt dann an, statt ihn stumm zu
   uebergehen. Das ist der Unterschied zwischen „deckt die heutigen Typen ab"
   und „deckt die Typen ab".

   GEPRUEFT WIRD LESBARKEIT, nicht „wirft nicht": kein [object Object], kein
   undefined/null im Text, kein leerer String, wo ein Wert steht.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

/* Je Feldtyp EINE Probe: Felddefinition, Rohwert, und der Klartext, der herauskommen muss.
   `hinweis` traegt keinen Wert (statischer Erklaertext) und wird ausdruecklich uebersprungen —
   ausdruecklich, damit die Auslassung eine Aussage ist und keine Luecke. */
const PROBEN = {
  text:      { feld: { id: 'p', label: 'P', typ: 'text' }, roh: 'Sparkasse Nord', erwartet: 'Sparkasse Nord' },
  textarea:  { feld: { id: 'p', label: 'P', typ: 'textarea' }, roh: 'Zeile eins\nZeile zwei', erwartet: 'Zeile zwei' },
  datum:     { feld: { id: 'p', label: 'P', typ: 'datum' }, roh: '1950-03-07', erwartet: '1950-03-07', menschlich: '07.03.1950' },
  auswahl:   { feld: { id: 'p', label: 'P', typ: 'auswahl', optionen: [{ wert: 'ja', label: 'Ja, ausdruecklich' }] },
               roh: 'ja', erwartet: 'Ja, ausdruecklich' },
  mehrfachauswahl: { feld: { id: 'p', label: 'P', typ: 'mehrfachauswahl',
                       optionen: [{ wert: 'a', label: 'Alpha' }, { wert: 'b', label: 'Beta' }] },
                     roh: ['a', 'b'], erwartet: 'Alpha, Beta' },
  liste:     { feld: { id: 'p', label: 'P', typ: 'liste', unterFelder: [{ id: 'w', label: 'Wer', typ: 'text' }] },
               roh: [{ w: 'Eva Beispiel' }], erwartet: 'Eva Beispiel' },
  // U2-ADR-256 (04.09.2026): erstes checkbox-Feld in einem echten SEKTOREN-Feldkatalog
  // (identity.displayFamilyNameFirst) — vorher gab es den Typ nur im Personenregister
  // (menschenRegister), das dieser Test nicht scannt. Kein eigener feldWertText-Zweig (fällt auf
  // den generischen String(roh)-Fallback, "true"/"false") — lesbar im Sinn dieses Tests, auch
  // wenn kein hübsches Ja/Nein. Absichtlich kein neuer Zweig für einen einzelnen Aufrufer.
  checkbox:  { feld: { id: 'p', label: 'P', typ: 'checkbox' }, roh: true, erwartet: 'true' },
  hinweis:   { ueberspringen: 'statischer Erklaertext, traegt keinen Wert' },
  ref:         null,   // unten eigens, weil sie ein Register brauchen
  refMehrfach: null,
};

// Entitaeten, auf die ein ref/refMehrfach zeigen kann — je eine eigene Aufloesung.
const ENTITAETEN = ['person', 'institution', 'mappe', 'bank-power-of-attorney'];

function typenImModell(V) {
  const t = new Set();
  for (const s of Object.values(V.SEKTOR_BY_ID || {})) {
    for (const sek of s.sektionen || []) {
      for (const f of sek.felder || []) {
        t.add(f.typ);
        for (const u of f.unterFelder || []) t.add(u.typ);
      }
    }
  }
  return t;
}
const lesbar = (s) => {
  const t = String(s);
  return !/\[object Object\]/.test(t) && !/\bundefined\b/.test(t) && !/\bnull\b/.test(t) && t.trim() !== '';
};

test('[TypDeck] VOLLSTAENDIGKEIT: jeder Typ des Modells hat hier eine Probe', () => {
  const K = ladeKern().V;
  const ohne = [...typenImModell(K)].filter(t => !(t in PROBEN)).sort().join(',');
  assert.equal(ohne, '',
    'Diese Feldtypen kommen im Modell vor, werden hier aber nicht geprueft. Ein ungeprueter Typ '
    + 'heisst: derselbe Renderer-Defekt wartet an JEDEM Feld dieses Typs. Probe ergaenzen: ' + ohne);
});

test('[TypDeck] jeder Typ ergibt in BEIDEN Apps lesbaren Klartext', () => {
  const K = ladeKern().V;
  const Lr = ladeLesen(); const L = Lr.V || Lr;
  const fehler = [];
  for (const [typ, p] of Object.entries(PROBEN)) {
    if (!p || p.ueberspringen) continue;
    const a = K.feldWertText(p.feld, p.roh);
    const b = L.feldWertText(p.feld, p.roh);
    if (!lesbar(a)) fehler.push('KERN ' + typ + ' → ' + JSON.stringify(a));
    if (!lesbar(b)) fehler.push('LESE ' + typ + ' → ' + JSON.stringify(b));
    if (String(a) !== String(b)) fehler.push('UNGLEICH ' + typ + ' → Kern ' + JSON.stringify(a) + ' / Lese ' + JSON.stringify(b));
  }
  assert.equal(fehler.sort().join('\n'), '',
    'Ein Typ, der nicht lesbar herauskommt, betrifft JEDES Feld dieses Typs:\n' + fehler.sort().join('\n'));
});

test('[TypDeck] die menschliche Schicht deutscht Daten in BEIDEN Apps', () => {
  const K = ladeKern().V;
  const Lr = ladeLesen(); const L = Lr.V || Lr;
  const p = PROBEN.datum;
  assert.equal(K._wertTextMenschlich(p.feld, p.roh), p.menschlich, 'Kern');
  assert.equal(L._wertTextMenschlich(p.feld, p.roh), p.menschlich, 'Lese-App');
  // Und die Maschinen-Schicht bleibt darunter unberuehrt.
  assert.equal(String(K.feldWertText(p.feld, p.roh)), p.erwartet, 'Kern feldWertText bleibt ISO');
  assert.equal(String(L.feldWertText(p.feld, p.roh)), p.erwartet, 'Lese feldWertText bleibt ISO');
});

test('[TypDeck] jede Entitaet eines ref-Verweises loest in BEIDEN Apps auf', async () => {
  const k = ladeKern(); const K = k.V;
  await K.depotAnlegen('pw'); K.akteurSelbstErklaeren('Maria');
  const personId = K.personHinzufuegen({ name: 'Anna Helfer' });
  // Bankvollmacht: entsteht als art:'bank'-Zeile in der Instrument-Liste, nicht als eigenes Register.
  K.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', storageLocation: 'Sparkasse Nord' });
  const bankId = (K.bankvollmachtVorschlag() || [])[0];

  const d = JSON.parse(JSON.stringify(K.getData()));
  const Lr = ladeLesen(); const L = Lr.V || Lr;
  L.setData(L._foldVollmachtenLesen(d));

  const faelle = [
    ['person', { ref: personId, override: '' }, 'Anna Helfer'],
    ['bank-power-of-attorney', { ref: bankId && bankId.id, override: '' }, null],
  ].filter(f => f[1].ref);
  const fehler = [];
  for (const [ent, wert] of faelle) {
    const feld = { id: 'p', label: 'P', typ: 'ref', entitaet: ent };
    const a = K.feldWertText(feld, wert), b = L.feldWertText(feld, wert);
    if (!lesbar(b)) fehler.push('LESE ref/' + ent + ' → ' + JSON.stringify(b));
    if (String(a) !== String(b)) fehler.push('UNGLEICH ref/' + ent + ' → Kern ' + JSON.stringify(a) + ' / Lese ' + JSON.stringify(b));
  }
  assert.equal(fehler.join('\n'), '',
    'Eine Entitaet, die nur der Kern aufloest, macht den Verweis in der Lese-App zu einem leeren '
    + 'Feld — die Institution liest „nicht hinterlegt":\n' + fehler.join('\n'));
});

test('[TypDeck] VOLLSTAENDIGKEIT: jede Entitaet, die der Kern unterscheidet, kennt auch die Lese-App', () => {
  /* Strukturell, nicht ueber Proben: Eine Entitaet, die eine App NICHT kennt, faellt still auf
     personName zurueck — und personName liefert bei einem override denselben Text. Ueber Werte
     waere der Unterschied also unsichtbar. Darum wird hier die Verzweigung SELBST verglichen:
     welche Entitaets-Namen kommen in `entitaetAnzeige` der jeweiligen App vor.

     Das ist bewusst eine Quelltext-Pruefung. Sie ist grob, aber sie faengt genau den Fall, den
     kein Wert-Vergleich faengt — und sie war es, die `bankvollmacht` gefunden hat. */
  const fs = require('node:fs');
  const path = require('node:path');
  const repo = path.join(__dirname, '..');
  const zweige = (datei) => {
    const q = fs.readFileSync(path.join(repo, datei), 'utf8');
    const i = q.indexOf('function entitaetAnzeige(');
    assert.ok(i > 0, 'entitaetAnzeige nicht gefunden in ' + datei);
    const block = q.slice(i, q.indexOf('\n}', i));
    return new Set((block.match(/typ === '[a-zA-Z]+'/g) || []).map(x => x.split("'")[1]));
  };
  const kern = zweige('vivodepot.html');
  const lese = zweige('vivodepot-lesen.html');
  const fehlend = [...kern].filter(e => !lese.has(e)).sort().join(',');
  assert.equal(fehlend, '',
    'Diese Entitaeten unterscheidet der Kern in entitaetAnzeige, die Lese-App nicht. Sie fallen '
    + 'dort still auf personName zurueck und liefern einen leeren String statt eines Namens — '
    + 'die Institution liest „nicht hinterlegt": ' + fehlend);
});

/* ════════════════════════════════════════════════════════════════════════
   Kein Auswahl-Feld ohne Optionen — in BEIDEN Apps, an JEDEM Deklarationsort.
   ────────────────────────────────────────────────────────────────────────
   DRITTE INSTANZ derselben Klasse an einem Tag: „Wert da, Bedeutung fehlt".
     · Optionscodes im Alt-Label-Register (`familie` in vier Feldern,
       vier Bedeutungen) — geloest, indem das Register die Labels mitfuehrt.
     · `mehrfachauswahl` fehlte in feldWertText der Lese-App — `trauer`
       statt des Klartexts.
     · Die Instrument-Zeile verlor ihre Optionen mit dem Gate und zeigte
       „ja" statt „vorhanden".

   WARUM DAS BESONDERS TEUER IST: Ein auswahl-Feld ohne Optionen wirft nicht
   und faellt nicht auf. Es zeigt still seinen Rohwert — und einen Rohwert
   haelt man am Bildschirm fuer einen Tippfehler, nicht fuer einen Defekt.
   Es gibt keinen Moment, in dem jemand stutzt.

   Heute ist der Stand an allen vier Orten sauber. Diese Pruefung repariert
   also nichts, sie verhindert. Genau deshalb steht sie hier: Der naechste
   Fall entstuende sonst wieder unbemerkt.
   ════════════════════════════════════════════════════════════════════════ */

function ohneOptionen(V) {
  const raus = [];
  const chk = (f, wo) => {
    if (!f || (f.typ !== 'auswahl' && f.typ !== 'mehrfachauswahl')) return;
    if (!Array.isArray(f.optionen) || !f.optionen.length) { raus.push(wo + '.' + f.id); return; }
    for (const o of f.optionen) {
      if (o.wert == null || !o.label || !String(o.label).trim()) raus.push(wo + '.' + f.id + ' (Option „' + o.wert + '" ohne Label)');
    }
  };
  const tief = (f, wo) => { chk(f, wo); for (const u of f.unterFelder || []) chk(u, wo + '.' + f.id); };
  // 1) Sektorfelder + Unterfelder
  for (const s of Object.values(V.SEKTOR_BY_ID || {})) {
    for (const sek of s.sektionen || []) for (const f of sek.felder || []) tief(f, s.id);
  }
  // 2) Personen-Register
  for (const u of ((V.MENSCHEN_REGISTER_FELD || {}).unterFelder) || []) chk(u, 'menschen-register');
  // 3) Wizard-Schritte (nur Kern — die Lese-App fuehrt keine Wizards)
  for (const w of V.WIZARDS || []) for (const st of w.schritte || []) tief(st.feld, 'wizard:' + w.id);
  // 4) Situations-Eigenfelder, beide Register (die Angehörigen-Blätter kommen seit ANG1 aus den Vorlagen)
  const situationsRegister = [['SITUATION_BY_ID', Object.values(V.SITUATION_BY_ID || {})],
    ['ANG_BLAETTER', typeof V.angehoerigenSituationenAlle === 'function' ? V.angehoerigenSituationenAlle() : []]];
  for (const [reg, liste] of situationsRegister) {
    for (const s of liste) {
      for (const b of s.bloecke || []) for (const e of b.eintraege || []) {
        if (e && e.feld && typeof e.feld === 'object') tief(e.feld, reg + ':' + s.id);
      }
    }
  }
  return raus.sort();
}

test('[TypDeck] KERN: kein auswahl-Feld ohne Optionen (Felder, Unterfelder, Wizards, Situationen)', () => {
  const fehlend = ohneOptionen(ladeKern().V);
  assert.equal(fehlend.join('\n'), '',
    'Diese Auswahl-Felder tragen keine Optionen. Sie werfen nicht und fallen nicht auf — sie zeigen '
    + 'still ihren Rohwert, und den haelt man fuer einen Tippfehler statt fuer einen Defekt:\n'
    + fehlend.join('\n'));
});

test('[TypDeck] LESE-APP: dasselbe, unabhaengig geprueft', () => {
  const Lr = ladeLesen();
  const fehlend = ohneOptionen(Lr.V || Lr);
  assert.equal(fehlend.join('\n'), '',
    'Dieselbe Pruefung fuer die Lese-App — sie ist die Sicht, die eine Institution liest:\n'
    + fehlend.join('\n'));
});

test('[TypDeck] auch das Alt-Label-Register traegt ueberall Optionen', () => {
  // Das Register ist der vierte Deklarationsort und der einzige, dessen Inhalt nicht mehr aus
  // einer lebenden Quelle nachbeschafft werden kann. Eine Luecke dort ist endgueltig.
  const K = ladeKern().V;
  const tief = (f, raus = []) => { raus.push(f); for (const u of f.unterFelder || []) tief(u, raus); return raus; };
  const fehlend = (K.ALT_LABEL_REGISTER || []).flatMap(e => tief(e.feld)
    .filter(f => (f.typ === 'auswahl' || f.typ === 'mehrfachauswahl') && !(f.optionen || []).length)
    .map(f => e.sektor + '.' + e.feld.id + '.' + f.id));
  assert.equal(fehlend.join(', '), '', 'ohne Optionen ist ein Registereintrag so unlesbar wie der Rohwert: ' + fehlend.join(', '));
});
