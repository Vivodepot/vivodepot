'use strict';
/* ═════════════════════════════════════════════════════════════════════
   kennung-mapping-erzeugen-modell-guard.test.js — Rot-Beweis für A4
   (code-review-stumme-pruefer-und-fixes-2026-09-16.md#A4, in der Befund-Ratsche
   18./19.09.2026 nachgetragen)

   NACHTRAG 23.09.2026: die ursprüngliche Fassung dieser Probe (Zweig
   r2-befund-reparatur-2026-09-19, Commit a742a994a) prüfte eine eigens dafür
   exportierte Funktion `feldkatalogModellPasstZuBereichEn`. Diese Funktion landete
   nie — der Kanon trägt seit 292c92225 (18.09.2026, VIER STUNDEN vor a742a994a)
   bereits einen unabhängig gebauten, INLINE geschriebenen Schutz gegen exakt dieselbe
   Gefahr: `!feldkatalog.felder.some((f) => Object.prototype.hasOwnProperty.call(BEREICH_EN, f.bereich))`.
   Gemessen (23.09.2026, wörtlicher Vergleich der beiden Bedingungen): beide prüfen
   denselben nichtleeren Schnitt zwischen {bereich-Werten im Feldkatalog} und
   {Schlüsseln von BEREICH_EN} — nur aus entgegengesetzter Richtung berechnet, nicht
   zwei verschiedene Prüfungen. A4 ist damit ANDERWEITIG GESCHÜTZT, nicht gegenstandslos
   (der Gegenstand — der Schutz — existiert, nur an einer anderen, nicht exportierten
   Stelle) und nicht offen. Diese Probe prüft darum den TATSÄCHLICHEN Inline-Check, nicht
   die nie gelandete Funktion — als echter CLI-Lauf gegen eine fabrizierte Kopie, genau wie
   die ursprüngliche Untersuchung es von Hand tat ("beim Bau dieses Fixes den Wächter
   testweise abgeschaltet — der reale Lauf überschrieb sofort ... eine 3988-Zeilen-Diff aus
   Nullen/Fehltreffern").

   OFFEN, NICHT TEIL DIESER PROBE (eigener Befund, 23.09.2026): beide Fassungen des
   Schutzes (die nie gelandete UND die tatsächlich laufende) prüfen nur "trägt MINDESTENS EIN
   Feld noch einen deutschen bereich-Wert" — eine Tabelle, in der 99% der Felder ihren
   bereich schon verloren haben und nur eines ihn noch trägt, läuft bei beiden durch. Ob das
   der richtige Maßstab ist (gebaut gegen "die Tabelle ist VOLLSTÄNDIG leer", nicht gegen
   "die Tabelle ist GROSSTEILS leer"), ist eine eigene, offene Einordnungsfrage — s. Befund-
   Ratsche, eigener Eintrag. ═════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const WERKZEUG_ECHT = path.join(REPO, 'tools', 'kennung-mapping-erzeugen.js');

/* Baut eine fabrizierte, isolierte Kopie des Werkzeugs samt der beiden Dateien, die es beim
   Start lädt (bereiche/feldkatalog.json, tools/textsatz-en-modul.json) — REPO wird im
   Werkzeug selbst aus __dirname abgeleitet, darum muss die Kopie dieselbe Ordnerstruktur
   tragen. Läuft NIE gegen den echten Bestand: das Werkzeug schreibt beim Durchlaufen
   Dateien, genau das soll hier gefahrlos in einem Wegwerf-Verzeichnis passieren. */
function mitFabriziertemLauf(bereicheDerFelder, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kennung-mapping-guard-probe-'));
  try {
    fs.mkdirSync(path.join(dir, 'tools'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'bereiche'), { recursive: true });
    fs.copyFileSync(WERKZEUG_ECHT, path.join(dir, 'tools', 'kennung-mapping-erzeugen.js'));
    fs.writeFileSync(path.join(dir, 'tools', 'textsatz-en-modul.json'), JSON.stringify({ texte: {} }));
    const felder = bereicheDerFelder.map((bereich, i) => ({ kennung: 'probe.feld' + i, bereich }));
    fs.writeFileSync(path.join(dir, 'bereiche', 'feldkatalog.json'), JSON.stringify({ felder }));
    const r = spawnSync(process.execPath, [path.join(dir, 'tools', 'kennung-mapping-erzeugen.js')],
      { cwd: dir, encoding: 'utf8' });
    fn({
      status: r.status,
      ausgabe: (r.stdout || '') + (r.stderr || ''),
      ausgabeDateiDa: fs.existsSync(path.join(dir, 'docs', 'umbau-englisch-vor-v1', 'kennung-mapping.json')),
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/* HEADs echte Meldung (Zitat, Stand 23.09.2026): ein uncaught `throw new Error(...)`, nicht ein
   `console.error` + gesetzter Exit-Code wie in der nie gelandeten A4-Fassung — Node beendet
   den Prozess darum mit Exit 1 über den DEFAULT-Pfad für eine ungefangene Ausnahme, nicht über
   ein bewusst gesetztes `process.exitCode`. Die Probe prüft gegen den WORTLAUT der echten
   Meldung ("trägt keinen einzigen", "bereits migriert"), nicht gegen das Wort „ABGEBROCHEN" —
   das stand nur in der nie gelandeten Fassung. */
test('[A4·Rot-Beweis] ausschließlich englische bereich-Werte: das Werkzeug bricht ab, schreibt nichts', () => {
  mitFabriziertemLauf(['identity', 'finance'], (r) => {
    assert.equal(r.status, 1, 'erwartet: Exit 1 — Ausgabe: ' + r.ausgabe);
    assert.match(r.ausgabe, /trägt keinen einzigen/);
    assert.match(r.ausgabe, /bereits migriert/);
    assert.equal(r.ausgabeDateiDa, false, 'darf NICHTS geschrieben haben, auch keine leere/falsche Tabelle');
  });
});

test('[A4·Gegenprobe] mindestens ein deutscher bereich-Wert: das Werkzeug läuft durch, schreibt die Tabelle', () => {
  mitFabriziertemLauf(['identitaet', 'finance'], (r) => {
    assert.equal(r.status, 0, 'erwartet: Exit 0 — Ausgabe: ' + r.ausgabe);
    assert.ok(!/trägt keinen einzigen/.test(r.ausgabe));
    assert.equal(r.ausgabeDateiDa, true, 'muss die Tabelle geschrieben haben');
  });
});

test('[A4·Drei-Ausgänge·Rand] leerer Feldkatalog bricht ebenfalls ab, kein stiller Freifahrtschein', () => {
  mitFabriziertemLauf([], (r) => {
    assert.equal(r.status, 1);
    assert.match(r.ausgabe, /trägt keinen einzigen/);
  });
});

test('[A4] der echte Feldkatalog trägt heute englische bereich-Werte — die Vorbedingung des Befunds gilt weiterhin', () => {
  const fk = JSON.parse(fs.readFileSync(path.join(REPO, 'bereiche', 'feldkatalog.json'), 'utf8'));
  const bereiche = new Set(fk.felder.map((f) => f.bereich));
  const BEREICH_EN_SCHLUESSEL = ['identitaet', 'meine-menschen', 'mobilitaet', 'finanzen', 'vermoegen',
    'gesundheit', 'bildung', 'sozialversicherung', 'vorsorge', 'verwaltung', 'wohnen', 'krisenvorsorge', 'persoenliches'];
  const deutscheTreffer = BEREICH_EN_SCHLUESSEL.filter((b) => bereiche.has(b));
  assert.equal(deutscheTreffer.length, 0,
    'Vorbedingung gefallen — feldkatalog.json trägt wieder deutsche Bereiche? Dann prüft diese Probe die falsche Sache: '
    + JSON.stringify(deutscheTreffer));
});
