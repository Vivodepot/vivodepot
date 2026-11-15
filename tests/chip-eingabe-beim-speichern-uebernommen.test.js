'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Chip-Eingabe beim Speichern: ein getippter Text geht nicht verloren
   ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Die Person tippt in einer Mehrfach-Eingabe (Medikamente, Allergien, Diagnosen) einen Text und drückt den Hauptknopf des
   Fensters („Speichern“) oder des Assistenten („Weiter“), ohne vorher Enter oder ✓ zu drücken. Früher schloss das Fenster, der
   Text war weg, ohne Meldung. Verlangt: der Text wird mit dem Hauptknopf wie mit Enter zum Chip, bevor der Speicherweg liest.
   Die Proben halten: je Fenster mit Chip-Feldern und Hauptknopf (Eintrag hinzufügen, Eintrag bearbeiten, Assistent), dass die
   Eingabe vor dem Lesen übernommen ist; dass der Text beim Verlassen der Eingabe stehen bleibt, wohin der Fokus auch fällt; und am Quelltext, dass
   jede Funktion, die Chip-Felder verdrahtet und ein Fenster mit Hauptknopf öffnet, die Übernahme aufruft.
   Rot-Beweis: derselbe Prüfer findet Verstöße im Kern ohne die Aufrufe.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

// Eine Liste mit Unterfeldern (Eintrag hinzufügen und bearbeiten) und das Chip-Feld, dessen Code-Liste die Probe nutzt.
function listenFeld(V) {
  for (const sid of Object.keys(V.SEKTOR_BY_ID)) {
    for (const sek of V.SEKTOR_BY_ID[sid].sektionen || []) {
      for (const f of sek.felder || []) if (f.typ === 'liste' && f.unterFelder && f.unterFelder.length) return { sektorId: sid, feld: f };
    }
  }
  return null;
}
function chipFeldDef(V) {
  return V.SEKTOR_BY_ID.health.sektionen.flatMap((s) => s.felder || []).find((f) => f.id === 'medicationOngoing');
}

// Der Stub des Kerns kennt keine Elementbäume: die Chip-Eingabe wird nachgebaut (Behälter, Liste, Eingabe, ✓) und als Baum des
// Fensters (#modal-inhalt) gesetzt, bevor es öffnet; die Verdrahtung des Kerns hängt sich daran wie an das echte Feld.
// `beimLesen` hält fest, wie viele Chips standen, als der Speicherweg (ab `aktiv`, dem Druck auf den Hauptknopf) zum ersten Mal aus dem Fenster las.
function chipBaum(k, feld, huelle) {
  const chips = [];
  const liste = {
    querySelectorAll: (sel) => (sel === '.chip' || sel === '[data-chip]' || sel === '.chip[data-chip]' ? chips : []),
    appendChild: (x) => { chips.push(x); return x; },
  };
  const eingabe = { value: '', hidden: false };
  const haken = { hidden: true };
  const feldEl = {
    getAttribute: (n) => ({ 'data-codeliste': feld.codeListe, 'data-chip-liste': feld.id }[n] ?? null),
    hasAttribute: () => false,
    dispatchEvent: () => true,
    querySelector: (sel) => ({ '.chip-liste': liste, '[data-chip-eingabe]': eingabe, '[data-chip-uebernehmen]': haken }[sel] ?? null),
    querySelectorAll: (sel) => (sel === '.chip[data-chip]' ? chips : []),
  };
  const stand = { beimLesen: null, aktiv: false };
  huelle.querySelectorAll = (sel) => ({ '[data-chip-liste]': [feldEl], '[data-chip-eingabe]': [eingabe] }[sel] ?? []);
  huelle.querySelector = () => { if (stand.aktiv && stand.beimLesen === null) stand.beimLesen = chips.length; return null; };
  return { eingabe, chips, stand };
}

test('[Eintrag hinzufügen] Text in der Chip-Eingabe, dann „Speichern“: der Text ist Chip, bevor der Eintrag gelesen wird', async () => {
  const k = await frischMitDepot();
  const l = listenFeld(k.V);
  assert.ok(l, 'keine Liste mit Unterfeldern gefunden');
  const baum = chipBaum(k, chipFeldDef(k.V), k.document.getElementById('modal-inhalt'));
  k.V.flowListenEintragHinzufuegen(l.sektorId, l.feld, {});
  baum.eingabe.value = 'Probetext Hinzufügen';
  baum.stand.aktiv = true;
  await k.document.getElementById('m-ok').onclick();
  assert.equal(baum.stand.beimLesen, 1, 'beim Lesen des Eintrags war der getippte Text noch kein Chip (Chips: ' + baum.stand.beimLesen + ')');
  assert.equal(baum.eingabe.value, '', 'die Eingabe ist geleert, der Text steht als Chip da');
});

test('[Eintrag bearbeiten] Text in der Chip-Eingabe, dann „Speichern“: der Text ist Chip, bevor der Eintrag gelesen wird', async () => {
  const k = await frischMitDepot();
  const l = listenFeld(k.V);
  assert.ok(l, 'keine Liste mit Unterfeldern gefunden');
  const baum = chipBaum(k, chipFeldDef(k.V), k.document.getElementById('modal-inhalt'));
  k.V.flowListenEintragBearbeiten(l.sektorId, l.feld, 0);
  baum.eingabe.value = 'Probetext Bearbeiten';
  baum.stand.aktiv = true;
  await k.document.getElementById('m-ok').onclick();
  assert.equal(baum.stand.beimLesen, 1, 'beim Lesen des Eintrags war der getippte Text noch kein Chip (Chips: ' + baum.stand.beimLesen + ')');
  assert.equal(baum.eingabe.value, '', 'die Eingabe ist geleert, der Text steht als Chip da');
});

test('[Assistent] Text in der Chip-Eingabe, dann „Weiter“: der Text wird übernommen, bevor der Schritt gesichert wird', async () => {
  const k = await frischMitDepot();
  assert.equal(k.V.wizardLauf('gebwiz'), true, 'der Assistent startet nicht');
  const content = k.document.getElementById('content');
  const baum = chipBaum(k, chipFeldDef(k.V), content);
  content.querySelector = () => null;   // der Schritt selbst trägt kein Eingabefeld: nichts zu sichern, nur die Chip-Eingabe zählt
  const eingabe = baum.eingabe;
  eingabe._chipBestaetigen = () => { baum.chips.push(eingabe.value); eingabe.value = ''; };
  eingabe.value = 'Probetext Assistent';
  k.V.wizardWeiter();
  assert.equal(baum.chips.length, 1, '„Weiter“ hat den getippten Text nicht übernommen');
});

test('[Fokus] der getippte Text bleibt beim Verlassen der Eingabe stehen, auch ohne Fokus auf dem Hauptknopf; „Speichern“ übernimmt ihn nach langer Wartezeit', async () => {
  const k = await frischMitDepot();
  const l = listenFeld(k.V);
  const baum = chipBaum(k, chipFeldDef(k.V), k.document.getElementById('modal-inhalt'));
  k.V.flowListenEintragHinzufuegen(l.sektorId, l.feld, {});
  baum.eingabe.value = 'bleibt';
  // Manche Browser geben einem angeklickten Knopf keinen Fokus: das Ereignis nennt dann kein Ziel. Auch ein lange gehaltener
  // Knopf (hier 600 ms) darf den Text nicht kosten.
  baum.eingabe.onblur({ relatedTarget: null });
  await new Promise((r) => setTimeout(r, 600));
  assert.equal(baum.eingabe.value, 'bleibt', 'der Text ging beim Verlassen der Eingabe verloren');
  assert.equal(baum.chips.length, 0, 'aus dem verlassenen Text wurde still ein Chip');
  baum.stand.aktiv = true;
  await k.document.getElementById('m-ok').onclick();
  assert.equal(baum.stand.beimLesen, 1, 'nach dem Verlassen und der Wartezeit hat „Speichern“ den Text nicht übernommen');
});

// Die Verdrahtung der Chip-Eingabe im Kern, vom Verlassen bis zum Häkchen.
function verlassenStelle(quelle) {
  const m = /eingabe\._chipBestaetigen = bestaetige;[\s\S]*?uebernehmenBtn\.onmousedown/.exec(String(quelle));
  return m ? m[0] : null;
}
function verlassenBefund(quelle) {
  const stelle = verlassenStelle(quelle);
  if (!stelle) return ['Verdrahtung der Chip-Eingabe nicht gefunden'];
  const fehler = [];
  if (/eingabe\.value = ''/.test(stelle)) fehler.push('das Verlassen leert die Eingabe');
  if (/relatedTarget/.test(stelle)) fehler.push('das Verlassen hängt am Ziel des Fokuswechsels');
  return fehler;
}

test('[Fokus·Klasse] das Verlassen der Chip-Eingabe verwirft nichts und hängt nicht am Ziel des Fokuswechsels', () => {
  assert.deepEqual(verlassenBefund(KERN), []);
});

test('[Fokus·Rot-Beweis] ein Leeren nach dem Verlassen und ein Schutz über das Fokusziel werden gefunden', () => {
  const leert = KERN.replace('eingabe.onblur = zustand;', "eingabe.onblur = () => setTimeout(() => { eingabe.value = ''; zustand(); }, 150);");
  assert.notEqual(leert, KERN, 'Vorbedingung: die Stelle zum Verändern existiert');
  assert.deepEqual(verlassenBefund(leert), ['das Verlassen leert die Eingabe']);
  const amZiel = KERN.replace('eingabe.onblur = zustand;', "eingabe.onblur = (e) => { if (e.relatedTarget) return; zustand(); };");
  assert.deepEqual(verlassenBefund(amZiel), ['das Verlassen hängt am Ziel des Fokuswechsels']);
});

// ── Klassenprobe am Quelltext ──────────────────────────────────────────────────────────────────────────────────────────
// Jede Funktion des Kerns, die Chip-Felder verdrahtet UND ein Fenster mit onPrimaer öffnet, ruft im onPrimaer
// chipEingabenUebernehmen( auf, vor dem ersten Lesen aus dem Fenster. Liefert die Liste der Verstöße.
function befund(quelle) {
  const verstoesse = [];
  const teile = String(quelle).split(/\n(?=(?:async )?function [A-Za-z_$][\w$]*\()/);
  for (const teil of teile) {
    const m = /^(?:async )?function ([A-Za-z_$][\w$]*)\(/.exec(teil);
    if (!m || m[1] === '_chipFelderVerdrahten') continue;
    const rumpf = teil.slice(teil.indexOf('\n') + 1);
    if (!rumpf.includes('_chipFelderVerdrahten(') || !rumpf.includes('onPrimaer')) continue;
    const ab = rumpf.slice(rumpf.indexOf('onPrimaer'));
    const uebernahme = ab.indexOf('chipEingabenUebernehmen(');
    const lesen = ab.indexOf('liesEintragAusDOM(');
    if (uebernahme < 0) verstoesse.push(m[1] + ': keine Übernahme im Hauptknopf');
    else if (lesen >= 0 && uebernahme > lesen) verstoesse.push(m[1] + ': Übernahme nach dem Lesen');
  }
  return verstoesse;
}

test('[Klasse] jede Funktion mit verdrahteten Chip-Feldern und Hauptknopf übernimmt die Chip-Eingabe vor dem Lesen', () => {
  assert.deepEqual(befund(KERN), []);
  assert.ok(/function wizardWeiter\(\) \{\n  chipEingabenUebernehmen\(/.test(KERN), '„Weiter“ im Assistenten übernimmt die Chip-Eingabe nicht als Erstes');
});

test('[Rot-Beweis] ohne die Aufrufe findet der Prüfer die Fenster der Einträge', () => {
  const ohne = KERN.split('chipEingabenUebernehmen(modalEl);').join('');
  const funde = befund(ohne);
  assert.ok(funde.some((f) => f.startsWith('flowListenEintragHinzufuegen')), 'Hinzufügen nicht erkannt: ' + JSON.stringify(funde));
  assert.ok(funde.some((f) => f.startsWith('flowListenEintragBearbeiten')), 'Bearbeiten nicht erkannt: ' + JSON.stringify(funde));
});
