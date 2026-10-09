'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pro-felder-erweiterung.js — die Pro-Felder aus P4 (U2-ADR-243 §7), EINE Quelle, zwei Verbraucher
   ────────────────────────────────────────────────────────────────────────────
   Quelle ist tools/pro-felder-erweiterung.json: je Feld Bereich, Sektion, vorgegebene Kennung, Typ, Optionen, Unterfelder,
   `sensibel`, interne Quelle (Norm), Beschriftung und Hinweis DE/EN. Die Kennungen sind vorgegeben (gegengelesener Entwurf
   vom 23.09.2026), nicht aus dem Feldnamen abgeleitet wie bei den Bestandsfeldern (lib/pro-felder-aus-vorlage.js).
   Verbraucher:
   - `strukturEinbauen(templates)`: hängt die Felder in die von Hand gepflegten Bereichs-Templates
     (tools/bereich-templates/vivodepot-pro-*.json) — neue Sektionen vor „allgemein", Felder ans Ende ihrer Sektion.
     Idempotent; ein vorhandenes Feld wird nie verändert. Werkzeug: tools/pro-felder-erweiterung-einbauen.js [--check].
   - `texte(sprache)`: die Sprachmodul-Kennungen (Sektion, Feld, Hinweis, Unterfeld, Option), eingehängt in
     tools/textsatz-de-pro-felder-daten.js und tools/textsatz-en-pro-felder-daten.js.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const QUELLE = path.join(__dirname, '..', 'pro-felder-erweiterung.json');

function laden() {
  return JSON.parse(fs.readFileSync(QUELLE, 'utf8'));
}

function texte(sprache, daten) {
  const d = daten || laden();
  const raus = {};
  const setzen = (k, v) => {
    if (typeof v !== 'string' || !v.trim()) throw new Error('pro-felder-erweiterung: leerer Text für ' + k + ' (' + sprache + ')');
    if (Object.prototype.hasOwnProperty.call(raus, k)) throw new Error('pro-felder-erweiterung: Kennung doppelt: ' + k);
    raus[k] = v;
  };
  for (const s of d.neueSektionen) setzen(s.bereich + '#' + s.id + '.label', s[sprache]);
  // Ein Satz je Pro-Bereich: sagt etwas über das Produkt, nicht über das Recht.
  if (d.bereichsSatz) for (const b of d.bereichsSatz.bereiche) setzen(b + '.einfuehrungstext', d.bereichsSatz[sprache]);
  for (const f of d.felder) {
    const fk = f.bereich + '.' + f.id;
    setzen(fk + '.label', f[sprache].label);
    if (f[sprache].hint) setzen(fk + '.hint', f[sprache].hint);
    for (const uf of (f.unterFelder || [])) setzen(fk + '/' + uf.id + '.label', uf[sprache]);
    for (const o of (f.optionen || [])) setzen(fk + '/' + o.wert + '.label', o[sprache]);
  }
  return raus;
}

/* Das Struktur-Objekt eines Felds, wie es im Template steht: keine Beschriftung (die kommt über die Sprachmodule).
   Mit `sprache` (nur für tools/vivodepot-bereiche-bekannt.json, die Beschriftungs-Literale trägt) stehen sie dabei. */
function feldStruktur(f, sprache) {
  const s = { id: f.id, typ: f.typ };
  if (sprache) s.label = f[sprache].label;
  if (sprache && f[sprache].hint) s.hint = f[sprache].hint;
  if (f.sensibel) s.sensibel = true;
  if (f.optionen) s.optionen = f.optionen.map((o) => (sprache ? { wert: o.wert, label: o[sprache] } : { wert: o.wert }));
  if (f.unterFelder) s.unterFelder = f.unterFelder.map((u) => (sprache ? { id: u.id, typ: u.typ, label: u[sprache] } : { id: u.id, typ: u.typ }));
  return s;
}

/* templates: { <bereichId>: <Bereichsdefinition mit sektionen> } — wird an Ort und Stelle ergänzt. Gibt die Zahl der
   angehängten Sektionen und Felder zurück. */
function strukturEinbauen(templates, daten, sprache) {
  const d = daten || laden();
  let sektionen = 0, felder = 0;
  for (const s of d.neueSektionen) {
    const b = templates[s.bereich];
    if (!b) throw new Error('pro-felder-erweiterung: Bereich fehlt: ' + s.bereich);
    if (b.sektionen.some((x) => x.id === s.id)) continue;
    const allgemein = b.sektionen.findIndex((x) => x.id === 'allgemein');
    b.sektionen.splice(allgemein < 0 ? b.sektionen.length : allgemein, 0, sprache ? { id: s.id, label: s[sprache], felder: [] } : { id: s.id, felder: [] });
    sektionen++;
  }
  for (const f of d.felder) {
    const b = templates[f.bereich];
    if (!b) throw new Error('pro-felder-erweiterung: Bereich fehlt: ' + f.bereich);
    if (b.sektionen.some((x) => (x.felder || []).some((g) => g.id === f.id))) continue;
    const sek = b.sektionen.find((x) => x.id === f.sektion);
    if (!sek) throw new Error('pro-felder-erweiterung: Sektion fehlt: ' + f.bereich + '#' + f.sektion);
    sek.felder.push(feldStruktur(f, sprache));
    felder++;
  }
  return { sektionen, felder };
}

module.exports = { QUELLE, laden, texte, feldStruktur, strukturEinbauen };
