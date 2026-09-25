'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A389, Nachtrag — die Angehörigen-Sicht trägt kein Modul-Feld, und zwar aus
   DREI Gründen. Gemessen, nicht gebaut.
   ────────────────────────────────────────────────────────────────────────────
   Der Laufzettel „Restliste bis v1" (20.08.2026) verlangt zu Posten 4: „Die
   Angehörigen-Sicht wird darin mitgemessen — sie trägt heute kein Modul-Feld."

   A389 hat den Weg aufs Blatt geöffnet: ein angedocktes Feld erscheint seither
   im Gesamt-PDF, im Bereichs-PDF und in der QR-Datenschicht, über dieselbe
   Auflösung wie ein Katalog-Feld. Die Angehörigen-Sicht ist davon NICHT
   erfasst — und das ist kein Versehen dieses Zuges, sondern eine ältere,
   ausdrückliche Entscheidung. Diese Datei hält fest, wo sie sitzt.

   DREI SPERREN, jede für sich hinreichend:

     1 · `_ANG_SITUATIONEN` ist eingebaut und eingefroren. Fünf Blätter, ihre
         Einträge stehen im Quelltext. Ein Modul kann keinen Eintrag beisteuern
         — es gibt keinen Weg dorthin (anders als bei Bereichen seit A389).

     2 · `_ANG_CACHE_ERLAUBT` ist eine ZWEITE, engere Liste: was ein Angehöriger
         OHNE Depot-Passwort sieht. Der Kommentar an ihr sagt es wörtlich: „Das
         Blatt sagt, was zum Anlass gehört; die eigene Liste sagt, was ein
         Angehöriger ohne Depot-Passwort sieht." Ein Feld, das nur auf dem Blatt
         steht, kommt hier nicht durch.

     3 · `akutZeileHTML` löst nur über `crossRefFeldUndRoh` auf — den EINGEBAUTEN
         Katalog. Der Fallback auf `_angedockteFeldDef`, den `_datensatzAusEintraegen`
         seit D1 trägt, fehlt hier. Gemessen: der WERT käme durch, die
         BESCHRIFTUNG nicht — die Vertrauensperson läse `tpl_pflegegrad_modul`
         statt „Pflegegrad (Modul)".

   WARUM HIER NICHTS GEBAUT WIRD: ob ein angedocktes Modul-Feld auf dem Blatt
   einer Vertrauensperson stehen darf, ist eine Vertrauensgrenze und keine
   Bauzahl — die Entscheidung ist eine Produktentscheidung. Sperre 3 allein zu
   beheben hiesse, Code zu verdrahten, den nichts erreicht (A253).

   WAS DIESE PROBE LEISTET: sie hält die Grenze fest. Wird eine der drei Sperren
   geöffnet, ohne die anderen mitzudenken, wird sie rot — und der Fall liegt auf
   dem Tisch, statt still zu passieren.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function mitModulFeld() {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.feldDefinitionen = [{ sektorId: 'health', feldId: 'tpl_pflegegrad_modul',
    typ: 'text', label: 'Pflegegrad (Modul)', abschnitt: 'Modul' }];
  d.sektoren.health = { tpl_pflegegrad_modul: 'Grad 3' };
  V.setData(d);
  return V;
}

test('[A389·Nachtrag·1] kein Blatt der Angehörigen-Sicht nennt ein angedocktes Feld', () => {
  const { V } = ladeKern();
  const felder = [];
  for (const s of V.angehoerigenSituationenAlle()) {
    for (const b of (s.bloecke || [])) {
      for (const e of (b.eintraege || [])) {
        if (e && typeof e.feld === 'string') felder.push(e.feld);
        else if (e && e.feld && e.feld.id) felder.push(e.feld.id);
      }
    }
  }
  assert.ok(felder.length > 20, 'die Blätter tragen überhaupt Einträge: ' + felder.length);
  const angedockt = felder.filter((f) => f.startsWith('tpl_'));
  assert.deepEqual(angedockt, [],
    'ein `tpl_`-Feld auf einem eingebauten Blatt wäre ein Widerspruch: die Liste ist eingefroren, '
    + 'ein Modul kann nichts beisteuern — es wäre also von Hand eingetragen worden');
});

test('[A389·Nachtrag·2] die Cache-Allowlist ist enger als die Blätter, und sie kennt kein Modul-Feld', () => {
  const { V } = ladeKern();
  const erlaubt = [...V._ANG_CACHE_ERLAUBT];
  assert.ok(erlaubt.length > 0, 'die zweite Liste existiert');
  assert.deepEqual(erlaubt.filter((k) => k.includes('|tpl_')), [],
    'kein angedocktes Feld ist für den passwortlosen Angehörigen-Zugang freigegeben');
});

/* GEDREHT am 21.08.2026 (U2-ADR-157). Diese Probe hielt die DRITTE Sperre fest: die Akut-Zeile
   löste ein angedocktes Feld nicht auf — der Wert kam durch, die Beschriftung nicht, und die
   Vertrauensperson las `tpl_pflegegrad_modul`. Der Auftrag „Ein Modul schlägt vor, die Bürgerin
   hebt" nennt genau diesen Rückfall den eigentlichen Bauteil; er ist gebaut.

   DIE PROBE BLEIBT UND KEHRT SICH UM. Sie hält jetzt fest, dass die Beschriftung ANKOMMT — und
   sie ist damit dieselbe Zusicherung von der anderen Seite: was auf dem Blatt einer
   Vertrauensperson steht, muss lesbar sein. Was NICHT gedreht ist: dass ein Modul-Feld ohne
   Zutun der Bürgerin gar nicht erst auf dem Blatt steht (Sperre 1, `tests/blatt-vorschlag-und-heben.test.js`). */
test('[A389·Nachtrag·3] die Akut-Zeile löst ein angedocktes Feld AUF — Beschriftung und Typ kommen mit', () => {
  const V = mitModulFeld();
  const html = V.akutZeileHTML('health', 'tpl_pflegegrad_modul');
  assert.match(html, /Grad 3/, 'der Wert steht da wie zuvor');
  assert.match(html, /Pflegegrad \(Modul\)/,
    'und die Beschriftung des Moduls jetzt auch — über `_angedockteFeldDef`, dieselbe EINE Auflösung');
  assert.equal(/tpl_pflegegrad_modul/.test(html), false,
    'die rohe Kennung erscheint nicht mehr; sie war das Symptom der dritten Sperre');
});

test('[A389·Nachtrag·Gegenprobe] dasselbe Feld trägt im Gesamt-PDF sehr wohl seine Beschriftung', () => {
  /* Die Gegenprobe zeigt, dass die Lücke am Angehörigen-Pfad hängt und nicht am Feld:
     derselbe Datenbestand, derselbe Bereich — auf dem Blatt aus A389 steht das Label. */
  const V = mitModulFeld();
  const bereich = V.vollDepotModell({ sensibel: true }).bereiche.find((b) => b.id === 'health');
  const zeilen = bereich.sektionen.flatMap((s) => s.zeilen);
  assert.ok(zeilen.some((z) => z.label === 'Pflegegrad (Modul)' && z.wert === 'Grad 3'),
    'A389 hat diesen Weg geöffnet; seit U2-ADR-157 trägt auch der Angehörigen-Weg das Label');
});
