'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Klassenprüfung zum Code-Review der Kennungs-Kampagne (15.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Umbenennung erfasste die Datenpfade (`sektoren`), aber nicht Kennungen,
   die als WERT in anderen Strukturen stehen — Ausnahmelisten, Bereichsauswahl,
   Dokument-Verweise, Mappe, Sicherungskopie. Drei Befunde waren „hoch". Diese
   Datei prüft die KLASSE, nicht die drei Fälle:

   1. Nach der Migration eines Alt-Depots verweist KEIN Wert mehr auf eine alte
      Bereichs- oder Feld-Kennung — gleich in welcher Struktur. Erkannt an der
      Form (Bereichs-Schlüssel mit alter ID, „alterBereich.feld", Objekt-Schlüssel
      mit alter Bereichs-ID), nicht an einer Liste von Ablagen. Und jeder Verweis
      in neuer Form löst im Modell auf.
   2. Ein Export „ohne sensible Daten" enthält keinen Wert eines Feldes, das das
      Modell sensibel führt — auch nicht unter Nebenschlüsseln. Geprüft mit einem
      Kontrollwert je sensiblem Feld, gepflanzt an seiner ALTEN Adresse.

   Proben: ein wörtliches Alt-Depot, das jede bekannte Ablage mit Bereichs- oder
   Feldbezug füllt, dazu jedes Alt-Fixture im Repo (tests/fixtures, Schema < 81).
   Ausgenommen sind nur zwei Teilbäume, jeweils begründet:
     `_migrationSicherung81` — die absichtliche Kopie im alten Format (K1: nie im Export);
     `logikModule` — fremde Module werden im Kern nicht umgeschrieben (signierter Inhalt),
       Vivodepots eigene Auszüge ersetzt Stufe 81; geprüft in altdatei-keine-unbekannten-schluessel.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const AUSGENOMMEN = new Set(['_migrationSicherung81', 'logikModule']);
const BEREICHS_SCHLUESSEL = new Set(['sektorId', 'sektor', 'bereich', 'bereichId']);

function ladeKernAus(pfad) {
  const lader = require.resolve('./load-kern.js');
  const vorher = process.env.KERN_HTML_PATH;
  if (pfad) process.env.KERN_HTML_PATH = pfad; else delete process.env.KERN_HTML_PATH;
  delete require.cache[lader];
  try { return require(lader).ladeKern().V; } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[lader];
  }
}

/* ── 1 · alte Kennungen als Wert, an der FORM erkannt ── */
function alteVerweise(depot, V) {
  const alt = new Set(V.KENNUNG_MAPPING.map((z) => z.bereichAlt).filter((b) => !V.SEKTOR_BY_ID[b]));
  const dotted = new RegExp('^(' + [...alt].map((b) => b.replace(/[-]/g, '\\-')).join('|') + ')\\.[A-Za-z_]');
  const raus = [];
  const lauf = (o, pfad, schluessel) => {
    if (typeof o === 'string') {
      if (dotted.test(o)) raus.push(pfad + ' = ' + o);
      else if (BEREICHS_SCHLUESSEL.has(schluessel) && alt.has(o)) raus.push(pfad + ' = ' + o);
      else if (schluessel === 'bereichssatz[]' && alt.has(o)) raus.push(pfad + ' = ' + o);
      return;
    }
    if (Array.isArray(o)) { o.forEach((x, i) => lauf(x, pfad + '[' + i + ']', schluessel === 'bereichssatz' ? 'bereichssatz[]' : schluessel)); return; }
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (pfad === '' && AUSGENOMMEN.has(k)) continue;
      if (alt.has(k) && v && typeof v === 'object') raus.push((pfad ? pfad + '.' : '') + k + ' (Schlüssel)');
      lauf(v, (pfad ? pfad + '.' : '') + k, k);
    }
  };
  lauf(depot, '', '');
  return raus;
}

/* ── 1b · jeder Verweis in neuer Form löst im Modell auf ── */
function modellFelder(V) {
  const felder = new Map();
  for (const s of Object.values(V.SEKTOR_BY_ID || {})) {
    for (const sek of s.sektionen || []) for (const f of sek.felder || []) felder.set(s.id + '.' + f.id, new Set((f.unterFelder || []).map((u) => u.id)));
  }
  for (const w of V.WIZARDS || []) for (const st of w.schritte || []) {
    if (st && st.feld && st.feld.id && st.ziel && st.ziel.sektor && !felder.has(st.ziel.sektor + '.' + st.feld.id)) felder.set(st.ziel.sektor + '.' + st.feld.id, new Set());
  }
  return felder;
}
function unaufgeloesteVerweise(depot, V) {
  const felder = modellFelder(V);
  const bereichBekannt = (b) => !!V.SEKTOR_BY_ID[b];
  const feldBekannt = (b, f, u) => {
    if (typeof f !== 'string' || /^instrument:|:/.test(f) && !f.startsWith('liste:')) return true;   // Pseudo-Kennung / Anbieter-Feld
    if (f.startsWith('liste:')) { const [l, , uu] = f.slice(6).split(':'); return felder.has(b + '.' + l) && felder.get(b + '.' + l).has(uu); }
    if (!felder.has(b + '.' + f)) return /^tpl_/.test(f);   // angedocktes Vorlagenfeld
    return u == null || felder.get(b + '.' + f).has(u);
  };
  const raus = [];
  const kennung = /^([a-z][A-Za-z0-9-]*)\.([^.[\]]+)(?:\[[^\][]+\]\.([^.[\]]+))?$/;
  const lauf = (o, pfad) => {
    if (Array.isArray(o)) { o.forEach((x, i) => lauf(x, pfad + '[' + i + ']')); return; }
    if (!o || typeof o !== 'object') return;
    if (typeof o.sektorId === 'string' && bereichBekannt(o.sektorId) && typeof o.feldId === 'string'
      && !feldBekannt(o.sektorId, o.feldId, o.unterfeldId)) raus.push(pfad + ' → ' + o.sektorId + '.' + o.feldId + (o.unterfeldId ? '/' + o.unterfeldId : ''));
    for (const [k, v] of Object.entries(o)) {
      if (pfad === '' && AUSGENOMMEN.has(k)) continue;
      const p = (pfad ? pfad + '.' : '') + k;
      if (typeof v === 'string' && (k === 'kennung' || /ausnahmen|kennungen|blattFelder/.test(pfad + '.' + k))) {
        const m = kennung.exec(v);
        if (m && bereichBekannt(m[1]) && !feldBekannt(m[1], m[2], m[3])) raus.push(p + ' → ' + v);
      }
      lauf(v, p);
    }
  };
  lauf(depot, '');
  return raus;
}

const altDepotAlleAblagen = () => ({
  schemaVersion: 80, menschen: [{ id: 'p1', name: 'Anna' }],
  sektoren: {
    identitaet: { vorname: 'Anna', nationalitaet: 'deutsch', ausweis: [{ id: 'a1', nr: 'L01', gueltig: '2030-01-01' }] },
    gesundheit: { blutgruppe: 'A+' },
    wohnen: { mietvertrag_befristet_bis: '' },
    vorsorge: { tpl_probe: 'angedockt' },
  },
  bereichssatz: ['identitaet', 'gesundheit', 'wohnen', 'vorsorge'],
  empfaengerkreise: [{ id: 'k1', name: 'Angehörige', bausteine: ['notfall'], ausnahmen: ['gesundheit.blutgruppe', 'identitaet.nationalitaet'] }],
  blattFelder: { notfall: ['gesundheit.blutgruppe'] },
  feldDefinitionen: [{ sektorId: 'vorsorge', feldId: 'tpl_probe', label: 'Probe', typ: 'text' }],
  feldDefinitionenVerwaist: [{ sektorId: 'vorsorge', feldId: 'tpl_alt', label: 'Alt', typ: 'text' }],
  dokumente: [{ id: 'd1', typ: 'personalausweis', sektorId: 'identitaet',
    felder: [{ sektorId: 'identitaet', feldId: 'ausweis', unterfeldId: 'gueltig', zeilenId: 'a1' }],
    leitfeld: { sektorId: 'identitaet', feldId: 'ausweis' } }],
  zusammenstellungen: [{ id: 'z1', name: 'Wohnung', kennungen: ['identitaet.vorname', 'identitaet.ausweis[a1].gueltig'] }],
  anfragen: [{ id: 'q1', felder: [{ kennung: 'gesundheit.blutgruppe' }] }],
  mappe: [{ id: 'm1', beschriftung: 'Scan', bereich: 'gesundheit', dateiname: 'a.pdf', mime: 'application/pdf', inhalt: '' }],
  importierteVorlagen: [{ id: 'v1', vorlageId: 'x', sektorId: 'vorsorge', feldIds: ['tpl_probe'] }],
  feldGueltigkeit: { wohnen: { mietvertrag_befristet_bis: { bis: '2028-06-30' } } },
  feldGueltigkeitGerettet: { wohnen: { mietvertrag_befristet_bis: 'irgendwann' } },
  urheberschaft: { identitaet: { vorname: [{ akteur: 'a' }] } },
  ausdruecklichKeine: { gesundheit: { allergien: { datum: '2026-01-01' } } },
  codes: { gesundheit: { blutgruppe: null } },
  sensibelFelder: { identitaet: { nationalitaet: true } },
  bereichsIdentitaeten: { vorsorge: { label: 'Vorsorge', icon: 'x' } },
  bereicheVerwaist: { vorsorge: { tpl_weg: 'gerettet' } },
});

function altFixtures() {
  const raus = [];
  for (const name of fs.readdirSync(path.join(__dirname, 'fixtures'))) {
    if (!name.endsWith('.json')) continue;
    let j; try { j = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8')); } catch (_) { continue; }
    const d = (j && (j.depot || (j.export && j.export.depot))) || j;
    if (d && typeof d.schemaVersion === 'number' && d.schemaVersion < 81 && d.sektoren && typeof d.sektoren === 'object') raus.push([name, d]);
  }
  return raus;
}

test('[Kennung als Wert] ein Alt-Depot mit jeder Ablage: nach dem Öffnen kein Verweis auf eine alte Kennung', () => {
  const V = ladeKernAus(null);
  const d = V.depotNormalisieren(altDepotAlleAblagen());
  assert.deepEqual(alteVerweise(d, V), []);
  assert.deepEqual(unaufgeloesteVerweise(d, V), []);
});

test('[Kennung als Wert] jedes Alt-Fixture im Repo: nach dem Öffnen kein Verweis auf eine alte Kennung', () => {
  const V = ladeKernAus(null);
  const fixtures = altFixtures();
  assert.ok(fixtures.length >= 1, 'Positivkontrolle: es gibt Alt-Fixtures');
  const funde = [];
  for (const [name, roh] of fixtures) {
    const d = V.depotNormalisieren(JSON.parse(JSON.stringify(roh)));
    for (const f of alteVerweise(d, V).concat(unaufgeloesteVerweise(d, V))) funde.push(name + ': ' + f);
  }
  assert.deepEqual(funde, []);
});

test('[Kennung als Wert · Rot-Beweis] nur `sektoren` umgeschrieben — die Prüfung findet die Nebenstrukturen', () => {
  const V = ladeKernAus(null);
  const roh = altDepotAlleAblagen();
  const halb = Object.assign({}, roh, { schemaVersion: 81, sektoren: V._sektorenKennungenUmschreiben(roh.sektoren, V.KENNUNG_MAPPING) });
  const funde = alteVerweise(halb, V).join('\n');
  for (const erwartet of ['bereichssatz', 'empfaengerkreise[0].ausnahmen', 'dokumente[0].felder[0].sektorId', 'mappe[0].bereich',
    'zusammenstellungen[0].kennungen', 'anfragen[0].felder[0].kennung', 'feldGueltigkeit.wohnen', 'bereicheVerwaist.vorsorge']) {
    assert.ok(funde.includes(erwartet), 'nicht gefunden: ' + erwartet + '\n' + funde);
  }
});

/* ── 2 · Export ohne sensible Daten, gegen die Sensibel-Markierung des Modells ── */
function altDepotMitSensiblenKontrollwerten(V) {
  const M = V.KENNUNG_MAPPING;
  const altVon = (neu) => M.find((z) => z.kennungNeu === neu);
  const d = { schemaVersion: 80, menschen: [], sektoren: {}, sensibelFelder: {} };
  const kontrollwerte = [];
  let i = 0;
  for (const s of Object.values(V.SEKTOR_BY_ID)) {
    for (const sek of s.sektionen || []) {
      for (const f of sek.felder || []) {
        const z = altVon(s.id + '.' + f.id);
        if (!z) continue;
        const bAlt = z.bereichAlt;
        const fAlt = z.kennungAlt.slice(bAlt.length + 1);
        // Auswahlfelder nicht: ein Freitext dort ist kein Wert, Stufe 57 zieht ihn ins Rettungsfeld
        // `<feld>_frueher` — und überschriebe den dort gepflanzten Kontrollwert (Artefakt der Probe).
        if (f.sensibel && f.typ !== 'liste' && /^(text|textarea|datum)$/.test(f.typ)) {
          const w = 'SENS-' + (++i) + '-' + f.id;
          (d.sektoren[bAlt] = d.sektoren[bAlt] || {})[fAlt] = w; kontrollwerte.push(w);
        }
        if (f.typ === 'liste') {
          for (const u of f.unterFelder || []) {
            if (!u.sensibel || !/^(text|textarea|datum)$/.test(u.typ)) continue;
            const zu = altVon(s.id + '.' + f.id + '/' + u.id);
            if (!zu) continue;
            const w = 'SENS-' + (++i) + '-' + f.id + '-' + u.id;
            const liste = (d.sektoren[bAlt] = d.sektoren[bAlt] || {})[fAlt] = (d.sektoren[bAlt][fAlt] || []);
            liste.push({ id: 'z' + i, [zu.kennungAlt.split('/')[1]]: w });
            kontrollwerte.push(w);
          }
        }
      }
    }
  }
  // Eine Markierung der Bürgerin an einem schema-unsensiblen Feld, unter der ALTEN Adresse.
  const blut = altVon('health.bloodType');
  const markiert = 'SENS-MARKIERT-bloodType';
  (d.sektoren[blut.bereichAlt] = d.sektoren[blut.bereichAlt] || {})[blut.kennungAlt.split('.')[1]] = markiert;
  d.sensibelFelder[blut.bereichAlt] = { [blut.kennungAlt.split('.')[1]]: true };
  kontrollwerte.push(markiert);
  return { d, kontrollwerte };
}

function sensibleWerteImExport(V) {
  const { d, kontrollwerte } = altDepotMitSensiblenKontrollwerten(V);
  V.setData(V.depotNormalisieren(d));
  const ohne = JSON.stringify(V.vollExportJSON({ sensibel: false }));
  const mit = JSON.stringify(V.vollExportJSON({ sensibel: true }));
  return { kontrollwerte, drin: kontrollwerte.filter((w) => ohne.includes(w)), angekommen: kontrollwerte.filter((w) => mit.includes(w)) };
}

test('[Export ohne sensible Daten] kein Kontrollwert eines sensiblen Feldes steht im Export — in keinem Schlüssel', () => {
  const r = sensibleWerteImExport(ladeKernAus(null));
  assert.ok(r.kontrollwerte.length >= 10, 'Positivkontrolle: das Modell führt sensible Felder mit alter Adresse (' + r.kontrollwerte.length + ')');
  assert.equal(r.angekommen.length, r.kontrollwerte.length, 'die Kontrollwerte kamen nach der Migration an (Umzugs-Export): ' + r.angekommen.length + '/' + r.kontrollwerte.length);
  assert.deepEqual(r.drin, []);
});

test('[Export ohne sensible Daten · Rot-Beweis] mit der Sicherungskopie im Export werden die Kontrollwerte gefunden', () => {
  const zeile = "  if (kopie && Object.prototype.hasOwnProperty.call(kopie, '_migrationSicherung81')) delete kopie._migrationSicherung81;";
  const quelle = fs.readFileSync(KERN, 'utf8');
  assert.equal(quelle.split(zeile).length, 2, 'Anker trifft nicht genau einmal');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kennung-als-wert-'));
  const ziel = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(ziel, quelle.replace(zeile, '/* MUTATION */'));
  try {
    const r = sensibleWerteImExport(ladeKernAus(ziel));
    assert.ok(r.drin.length > 0, 'die Prüfung sieht die Sicherungskopie nicht');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
