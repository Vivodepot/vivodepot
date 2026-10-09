'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kind-Datei — das stille Mitschreiben darf die eigene Kopie der Person nicht überschreiben
   (Befund KINDDATEI-UEBERSCHREIBT-EIGENE-KOPIE)
   ────────────────────────────────────────────────────────────────────────
   Die Kind-Datei liegt an einem Ort, den die haltende Person einmal gewählt hat. Öffnet die
   vertretene Person genau diese Datei („Öffnen mit“) und sichert sie mit eigenem Passwort, liegt
   auf der Platte ein neuerer Stand, den nur sie öffnen kann. Vorher schrieb das nächste Sichern der
   haltenden Person blind darüber: neues Passwort und alles, was die Person eingetragen hatte, waren
   still verloren.

   Jetzt: vor dem Schreiben wird die Platte gelesen und ihr Stand am Umschlag mit dem zuletzt
   geschriebenen verglichen. Weicht er ab, wird nicht geschrieben; der Konflikt steht an der Karte
   und im Prüfblatt, und die Kind-Datei wird an einem neuen Ort eingerichtet.

   ROT-BEWEIS: gegen den Kern vor dem Fix (Basis 5ee20a0d3) fällt die erste Probe — das Mitschreiben
   meldet 1 geschriebene Datei, die eigene Kopie ist überschrieben. Die Klassenprobe am Ende fällt an
   einem Kern, in dem der Schreibweg die Platte nicht liest (unten gepflanzt).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const ANKER_PW = 'Anker-Eigene-Kopie-2026!';
const SUB_PW = 'Sub-Eigene-Kopie-2026!';
const EIGENES_PW = 'Nur-die-Person-2026!';

// Ein Datei-Picker, dessen Handles wie echte Dateien gelesen und beschrieben werden können.
function fsaMitPlatte() {
  const handles = [];
  const showSaveFilePicker = async (opt) => {
    const h = {
      name: (opt && opt.suggestedName) || 'x', inhalt: null, schreibvorgaenge: 0,
      getFile: async () => ({ size: h.inhalt == null ? 0 : h.inhalt.length, text: async () => h.inhalt || '' }),
      createWritable: async () => {
        const teile = [];
        return { write: async (b) => { teile.push(typeof b === 'string' ? b : await b.text()); },
          close: async () => { h.inhalt = teile.join(''); h.schreibvorgaenge++; } };
      },
    };
    handles.push(h);
    return h;
  };
  return { showSaveFilePicker, handles };
}

async function halterinMitKindDatei() {
  const fsa = fsaMitPlatte();
  const k = ladeKern({ Blob, showSaveFilePicker: fsa.showSaveFilePicker });
  const { V } = k;
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Mutter');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  assert.equal(await V.kindDateiEinrichten(e.depotUUID, 'datei'), 'geschrieben');
  return { V, e, fsa, h: fsa.handles[0] };
}

async function halterinAendertUndSichert(V, uuid) {
  await V.subDepotVertrauenOeffnen(uuid, SUB_PW);
  V.subKontextBetreten(uuid);
  V.sektorFeldSetzen('identity', 'givenName', 'Lea-Marie');
  await V.subKontextVerlassen();
  V.markiereGespeichert();
  return V.kindDateienMitschreiben();
}

function eintragVon(V, uuid) { return V.ankerDaten().verwalteteDepots.find((x) => x.depotUUID === uuid); }

test('[Kind-Datei·eigene Kopie] das stille Mitschreiben überschreibt keinen neueren Stand der Person', async () => {
  const { V, e, h } = await halterinMitKindDatei();

  // Die Person öffnet die Kind-Datei und sichert sie mit eigenem Passwort an denselben Ort.
  const umschlagAlt = V.umschlagAusDatei(JSON.parse(h.inhalt));
  const umschlagNeu = await V.subDepotEigenerPasswortWechsel(umschlagAlt, SUB_PW, EIGENES_PW);
  const eigeneKopie = JSON.stringify(V.blackboxDateiAusUmschlag(umschlagNeu), null, 2);
  h.inhalt = eigeneKopie;

  assert.equal(await halterinAendertUndSichert(V, e.depotUUID), 0, 'nichts still geschrieben: auf der Platte liegt ein fremder Stand');
  assert.equal(h.inhalt, eigeneKopie, 'die eigene Kopie der Person ist unverändert');

  // Sichtbar: der Konflikt steht am Eintrag und im Prüfblatt, und ein weiteres Sichern versucht es nicht still erneut.
  const eintrag = eintragVon(V, e.depotUUID);
  assert.ok(eintrag.kindDatei.konflikt_am, 'der Konflikt ist festgehalten');
  const zeilen = V.prueftermineKindDateien(new Date());
  assert.equal(zeilen.length, 1);
  assert.equal(zeilen[0].name, V.STRINGS.kindDateiKonfliktName.replaceAll('{name}', 'Lea'), 'das Prüfblatt nennt den Konflikt, nicht „nachziehen“');
  assert.equal(await V.kindDateienMitschreiben(), 0, 'nach einem Konflikt kein stiller zweiter Versuch');
  assert.equal(h.inhalt, eigeneKopie);

  // Gegenprobe: die Person öffnet ihre Kopie weiter mit ihrem eigenen Passwort.
  const { V: P } = ladeKern();
  await P.depotLaden(P.umschlagEntpacken(JSON.parse(h.inhalt)), EIGENES_PW);
  assert.ok(P.getData(), 'die Person kommt mit ihrem Passwort hinein');
});

test('[Kind-Datei·eigene Kopie] derselbe Stand in anderer Schreibform ist kein Konflikt (Vergleich am Umschlag)', async () => {
  const { V, e, h } = await halterinMitKindDatei();
  h.inhalt = JSON.stringify(JSON.parse(h.inhalt));            // ohne Einrückung: anderer Text, derselbe Umschlag
  assert.equal(await halterinAendertUndSichert(V, e.depotUUID), 1, 'die Kind-Datei wird nachgezogen');
  assert.equal(eintragVon(V, e.depotUUID).kindDatei.konflikt_am, undefined);
});

test('[Kind-Datei·eigene Kopie] eine fremde oder unlesbare Datei am Ort wird nicht überschrieben', async () => {
  const { V, e, h } = await halterinMitKindDatei();
  h.inhalt = 'keine Übergabe-Datei';
  assert.equal(await halterinAendertUndSichert(V, e.depotUUID), 0);
  assert.equal(h.inhalt, 'keine Übergabe-Datei');
  assert.ok(eintragVon(V, e.depotUUID).kindDatei.konflikt_am);
});

test('[Kind-Datei·eigene Kopie] nach dem Konflikt richtet ein Klick die Kind-Datei an einem neuen Ort ein', async () => {
  const { V, e, fsa, h } = await halterinMitKindDatei();
  h.inhalt = 'keine Übergabe-Datei';
  await halterinAendertUndSichert(V, e.depotUUID);
  assert.equal(await V.kindDateiEinrichten(e.depotUUID, 'datei'), 'geschrieben', 'neuer Ort, neue Geste');
  assert.equal(fsa.handles.length, 2);
  assert.equal(h.inhalt, 'keine Übergabe-Datei', 'der alte Ort bleibt unberührt');
  assert.equal(eintragVon(V, e.depotUUID).kindDatei.konflikt_am, undefined, 'der Konflikt ist mit dem neuen Ort erledigt');
  assert.deepEqual(V.prueftermineKindDateien(new Date()), []);
});

/* Klassenprobe: jede Stelle im Kern, die per createWritable auf die Platte schreibt, schreibt entweder eine Datei,
   die der Kern selbst führt, oder liest vor dem Schreiben, was dort liegt. Eine neue Stelle ist rot, bis sie
   hier mit Grund steht. */
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const SCHREIBER = {
  _depotBlobSpeichern: { art: 'eigene', grund: 'die Depot-Datei der Sitzung, die der Kern selbst geöffnet oder angelegt hat' },
  _kindDateiInHandleSchreiben: { art: 'liest-vorher', grund: 'ein Ort, an den auch die Person schreibt', liest: '_kindDateiPlatteFremd(' },
};
function schreiberIm(src) {
  const ohne = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
  const re = /^(async )?function ([A-Za-z_$][\w$]*)\s*\(/gm;
  const fn = []; let m;
  while ((m = re.exec(ohne))) fn.push({ name: m[2], start: m.index });
  return fn.map((f, i) => ({ name: f.name, rumpf: ohne.slice(f.start, i + 1 < fn.length ? fn[i + 1].start : ohne.length) }))
    .filter((f) => /\.createWritable\(/.test(f.rumpf));
}
function verstoesse(src) {
  const fehler = [];
  for (const f of schreiberIm(src)) {
    const regel = SCHREIBER[f.name];
    if (!regel) { fehler.push(f.name + ': schreibt per createWritable, ohne Grund in der Liste'); continue; }
    if (regel.art === 'liest-vorher') {
      const lesen = f.rumpf.indexOf(regel.liest);
      if (lesen < 0 || lesen > f.rumpf.indexOf('.createWritable(')) fehler.push(f.name + ': schreibt, ohne vorher die Platte zu lesen');
    }
  }
  return fehler;
}

test('[Kind-Datei·Klasse] jeder Schreiber per createWritable führt die Datei selbst oder liest vorher die Platte', () => {
  assert.deepEqual(verstoesse(KERN), []);
  assert.deepEqual(schreiberIm(KERN).map((f) => f.name).sort(), Object.keys(SCHREIBER).sort(), 'Listeneintrag ohne Stelle im Kern');
});

test('[Kind-Datei·Klasse·Rot-Beweis] ein Schreibweg ohne Lesen der Platte und ein neuer Schreiber werden gefunden', () => {
  const ohneLesen = KERN.replace('if (await _kindDateiPlatteFremd(handle, stand)) return \'konflikt\';', '');
  assert.notEqual(ohneLesen, KERN, 'Vorbedingung: die Zeile steht im Kern');
  assert.match(verstoesse(ohneLesen).join('\n'), /_kindDateiInHandleSchreiben: schreibt, ohne vorher/);
  const neuer = KERN + '\nasync function fremdSchreiben(h) { const w = await h.createWritable(); }\n';
  assert.match(verstoesse(neuer).join('\n'), /fremdSchreiben: schreibt per createWritable, ohne Grund/);
});
