'use strict';
/* FELD-HINWEIS-NICHT-VERKNUEPFT (Barrierefreiheits-Audit 06.09.2026, Befund 2; WCAG 1.3.1, Stufe A)
   Ein Feldhinweis stand als loses Element neben dem Eingabefeld. Ein Vorleseprogramm las ihn nicht mit dem Feld vor.
   Diese Probe rendert JEDES Feld des Feldregisters mit Hinweis (alle Bereiche, alle Listen-Unterfelder, Deutsch und Englisch)
   und verlangt: jedes Eingabeelement des Felds (input, select, textarea, Knopfgruppe mit role="group") trägt aria-describedby
   auf ein vorhandenes Element mit genau dem Hinweistext; die ids sind über alle gerenderten Felder einer Seite eindeutig.
   Klassenschutz: class="feld-hint" entsteht im Kern nur im Helfer feldHinweisHTML; Ausnahmen stehen in AUSNAHMEN mit Grund
   und dürfen nur weniger werden.
   Rot-Beweis: derselbe Lauf gegen den Kern von a8243ba7e (vor dem Helfer) findet unverknüpfte Hinweise. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');   // im pre-commit sind GIT_DIR/GIT_INDEX_FILE gesetzt
const VORHER = 'a8243ba7e';   // der Stand vor dem Wagen; öffentlich fehlt die private Geschichte
function vorherDa() {
  try { execFileSync('git', ['cat-file', '-e', VORHER + '^{commit}'], { cwd: REPO, env: ohneGitUmgebung(), stdio: 'ignore' }); return true; } catch { return false; }
}
const vorher = (d) => execFileSync('git', ['show', VORHER + ':' + d], { cwd: REPO, env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
const LOAD_KERN = require.resolve('./load-kern.js');

function ladeV(opts) {
  delete require.cache[LOAD_KERN];
  return require(LOAD_KERN).ladeKern(opts).V;
}

const STEUER = /<(input|select|textarea|div|fieldset)\b([^>]*)>/gi;
function steuerelemente(html) {
  const raus = [];
  for (const m of html.matchAll(STEUER)) {
    if (/\btype=["']hidden["']/i.test(m[2])) continue;
    if (/^(div|fieldset)$/i.test(m[1]) && !/\srole="(radio)?group"/i.test(m[2])) continue;
    const d = /\saria-describedby="([^"]*)"/i.exec(m[2]);
    raus.push({ tag: m[0].slice(0, 80), ids: d ? d[1].split(/\s+/).filter(Boolean) : [] });
  }
  return raus;
}
function idsMitText(html) {
  const karte = new Map();
  for (const m of html.matchAll(/<(div|p|span)\b[^>]*\bid="([^"]+)"[^>]*>([^<]*)<\/\1>/g)) karte.set(m[2], m[3]);
  return karte;
}

/** @returns {{ fehler: string[], gezaehlt: number }} */
function pruefe(V, sprache) {
  const fehler = [];
  const gesehen = new Map();
  let gezaehlt = 0;
  const halte = (wo, html, hint) => {
    const texte = idsMitText(html);
    for (const [id] of texte) {
      if (gesehen.has(id) && gesehen.get(id) !== wo) fehler.push(sprache + ' ' + wo + ': id ' + id + ' doppelt (auch ' + gesehen.get(id) + ')');
      gesehen.set(id, wo);
    }
    const hinweisId = [...texte].find(([, t]) => t === V.escapeHTML(hint));
    for (const s of steuerelemente(html)) {
      gezaehlt++;
      if (!hinweisId) { fehler.push(sprache + ' ' + wo + ': kein Element mit dem Hinweistext und id'); continue; }
      if (!s.ids.includes(hinweisId[0])) fehler.push(sprache + ' ' + wo + ': ' + s.tag + ' ohne aria-describedby auf den Hinweis');
    }
  };
  for (const b of V.bereicheAlle()) {
    for (const sek of b.sektionen || []) {
      for (const f of sek.felder || []) {
        if (f.hint) halte(b.id + '.' + f.id, V.feldZeileHTML(f, undefined, b.id, true, true), f.hint);
        const uf = Array.isArray(f.unterFelder) ? f.unterFelder : [];
        if (!uf.some((x) => x.hint)) continue;
        const form = V.listenEintragInputsHTML(f, {});
        for (const x of uf) {
          if (!x.hint) continue;
          const zeile = new RegExp('<div class="feld-zeile feld-zeile-sub" data-sub-zeile="' + x.id + '"[^>]*>([\\s\\S]*?)(?=<div class="feld-zeile feld-zeile-sub"|$)').exec(form);
          if (!zeile) { fehler.push(sprache + ' ' + b.id + '.' + f.id + '.' + x.id + ': Unterfeld-Zeile fehlt'); continue; }
          halte(b.id + '.' + f.id + '.' + x.id, zeile[1], x.hint);
        }
      }
    }
  }
  return { fehler, gezaehlt };
}

for (const produkt of ['privat-de', 'privat-en']) {
  test('[Feld-Hinweis·' + produkt + '] jedes Eingabeelement eines Felds mit Hinweis verweist per aria-describedby auf den Hinweis', () => {
    const { fehler, gezaehlt } = pruefe(ladeV({ produkt }), produkt);
    assert.ok(gezaehlt > 100, 'zu wenige Eingabeelemente mit Hinweis geprüft (' + gezaehlt + ') — dann prüft die Probe nichts');
    assert.deepEqual(fehler, []);
  });
}

test('[Feld-Hinweis·Rot-Beweis] der Kern vor dem Helfer (a8243ba7e) hat unverknüpfte Hinweise', (t) => {
  if (!vorherDa()) return t.skip('ohne Git-Historie: der Stand ' + VORHER + ' fehlt');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feld-hinweis-'));
  try {
    const alt = path.join(tmp, 'vivodepot.html');
    fs.writeFileSync(alt, vorher('vivodepot.html'));
    const { fehler, gezaehlt } = pruefe(ladeV({ htmlPfad: alt, backen: true }), 'alt');
    assert.ok(gezaehlt > 100, 'der alte Kern rendert keine Felder mit Hinweis — der Rot-Beweis prüft nichts');
    assert.ok(fehler.length > 100, 'der alte Kern wurde nicht als unverknüpft erkannt (' + fehler.length + ' Funde)');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* Klassenschutz. Hinweise ohne eigenes Eingabefeld (Erklärtexte, Statusansagen) sind keine Feldhinweise im Sinne des Befunds. */
const AUSNAHMEN = [
  { wortlaut: "'<p class=\"feld-hint\">' + escapeHTML(herkunft) + '</p>'", grund: 'Herkunftsangabe der Krisenvorsorge-Liste, kein Eingabefeld' },
  { wortlaut: "'<p class=\"feld-hint\">' + escapeHTML(STRINGS.krisenvorsorgeBedarfQuelle) + '</p>'", grund: 'Quellenangabe, kein Eingabefeld' },
  { wortlaut: "'<p class=\"feld-hint\">' + escapeHTML(STRINGS.k9VorlageHerkunftText", grund: 'Herkunft einer Vorlage, kein Eingabefeld' },
  { wortlaut: "'<p class=\"feld-hint\" id=\"zus-suche-hint\">'", grund: 'schon verknüpft: das Suchfeld trägt aria-describedby="zus-suche-hint"' },
  { wortlaut: "'<p class=\"feld-hint feld-pruefintervall-hinweis\">'", grund: 'Statusansage zum Prüfrhythmus einer Modul-Definition, kein Hinweis zur Eingabe' },
  { wortlaut: "'<p class=\"feld-hint\" data-name-getrennt-hinweis=\"1\">'", grund: 'Hinweis über dem ganzen Personenformular, kein einzelnes Feld' },
];
test('[Feld-Hinweis·Klasse] class="feld-hint" entsteht nur im Helfer — sonst nur die benannten Ausnahmen', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const helfer = /function feldHinweisHTML\([\s\S]*?\n}\n/.exec(kern);
  assert.ok(helfer, 'Helfer feldHinweisHTML fehlt');
  const rest = kern.replace(helfer[0], '');
  const stellen = rest.split('\n').filter((z) => /class="feld-hint/.test(z) && !/^\s*(\/\/|\*|\/\*)/.test(z));
  const offen = stellen.filter((z) => !AUSNAHMEN.some((a) => z.includes(a.wortlaut)));
  assert.deepEqual(offen.map((z) => z.trim().slice(0, 140)), [], 'neuer Feldhinweis am Helfer vorbei');
  const tot = AUSNAHMEN.filter((a) => !stellen.some((z) => z.includes(a.wortlaut)));
  assert.deepEqual(tot.map((a) => a.grund), [], 'Ausnahme ohne Stelle — streichen (die Liste darf nur weniger werden)');
});

test('[Feld-Hinweis·Klasse·Rot-Beweis] ein Feldhinweis am Helfer vorbei fällt auf', () => {
  const zeile = "  h += '<div class=\"feld-hint\">' + escapeHTML(feld.hint) + '</div>';";
  assert.ok(/class="feld-hint/.test(zeile) && !AUSNAHMEN.some((a) => zeile.includes(a.wortlaut)));
});
