'use strict';
/* Die EINE Zeile, die der Zuschnitt in einer Datei umschreibt (07.10.2026, Befund aus einer Prüfung von außen: die
   Wurzeldatei des öffentlichen Repositorys galt als Produkt, die Fassung war nicht zu erkennen). Genau eine Datei, genau eine
   Zeile: die erste Zeile des Kopfkommentars von vivodepot.html. Öffentlich nennt sie Fassung, Rolle und Prüfweg; in der
   Quelle und in jedem Produkt steht die Quellzeile, denn ein Produkt trägt keinen Hinweis auf eine gemeinsame Grundlage
   (White Label ab Werk). Beide Richtungen sind rein und deterministisch: der Zuschnitt aus einem Quell-Commit bleibt
   byte-gleich nachbaubar, und ein Produkt, das jemand aus dem öffentlichen Stand konfektioniert, bekommt dieselben Bytes wie
   das ausgelieferte (tools/produkt-konfektionieren.js setzt die Zeile zurück). Eigene Datei, weil der Konfektionierer sie
   braucht; die Liste der benannten Zuschnitt-Ausnahmen führt den Eintrag und lädt ihn von hier. */
const WURZEL_KOPFZEILE = Object.freeze({
  datei: 'vivodepot.html',
  grund: 'öffentlich erkennbar machen, dass die Wurzeldatei die Grundlage ohne Module ist, mit Fassung und Prüfweg',
  quellzeile: '  Vivodepot — Bürger-App (Clean-Slate-Kern)',
});
function _fassungImKern(text) {
  const v = /const BUILD_VERSION = '(v[0-9.]+)'/.exec(text);
  const s = /const SCHALEN_STAND = 'v([0-9]+)'/.exec(text);
  if (!v || !s) throw new Error('Wurzel-Kopfzeile: BUILD_VERSION oder SCHALEN_STAND nicht gefunden');
  return v[1] + '.' + s[1];
}
function wurzelKopfzeileOeffentlich(fassung) {
  return '  Vivodepot — Fassung ' + fassung + '. Diese Datei im Wurzelverzeichnis des Repositorys ist die gemeinsame Grundlage'
    + ' ohne Sprach- und Bereichsmodule, kein Produkt. Produkte: vivodepot.de. Prüfsummen der Produkte je Fassung: SECURITY.md,'
    + ' Abschnitt 8. vivodepot.html.sha256 gilt für diese veröffentlichte Datei; sie unterscheidet sich von der Quelldatei nur in'
    + ' dieser Zeile.';
}
const OEFFENTLICH_MUSTER = /^ {2}Vivodepot — Fassung v[0-9.]+\. Diese Datei im Wurzelverzeichnis des Repositorys .*$/m;
/* Quelle → öffentlich. Wirft, wenn die Quellzeile nicht genau einmal dasteht (nicht raten, welche Zeile gemeint war). */
function wurzelKopfzeileSetzen(text) {
  const n = text.split('\n').filter((z) => z === WURZEL_KOPFZEILE.quellzeile).length;
  if (n !== 1) throw new Error('Wurzel-Kopfzeile: die Quellzeile steht ' + n + '-mal in ' + WURZEL_KOPFZEILE.datei + ', erwartet genau einmal');
  return text.replace(WURZEL_KOPFZEILE.quellzeile + '\n', wurzelKopfzeileOeffentlich(_fassungImKern(text)) + '\n');
}
/* öffentlich → Quelle. Ohne öffentliche Zeile unverändert (der Normalfall: Quelle aus dem Kanon). */
function wurzelKopfzeileZuruecksetzen(text) {
  return OEFFENTLICH_MUSTER.test(text) ? text.replace(OEFFENTLICH_MUSTER, WURZEL_KOPFZEILE.quellzeile) : text;
}
/* Läuft diese Prüfung im öffentlichen Zuschnitt? Erkennbar an der öffentlichen Zeile in der Wurzeldatei. Proben, die den
   Kanon-Baum zählen oder zurückgehaltene Dateien lesen (Hooks, Zahl der Seiten und Specs), gelten dort nicht; sie nennen das
   mit dieser Funktion, statt ihre Zählung zu lockern (öffentlicher Lauf v927, 13.10.2026: fünf Proben rot, alle aus diesem Grund). */
function imOeffentlichenZuschnitt(wurzel) {
  const fs = require('node:fs');
  const path = require('node:path');
  try { return OEFFENTLICH_MUSTER.test(fs.readFileSync(path.join(wurzel, WURZEL_KOPFZEILE.datei), 'utf8')); } catch (_) { return false; }
}
const IM_ZUSCHNITT_GRUND = 'im öffentlichen Zuschnitt: die Probe zählt bzw. liest den Kanon-Baum (zurückgehaltene Dateien)';

/* Steht die öffentliche Zeile in der Wurzeldatei von `repo`? Das Merkmal schreibt nur der Zuschnitt (wurzelKopfzeileSetzen); der
   Kanon trägt die Quellzeile, keine Umgebungsvariable und keine fehlende Datei entscheidet. Wer „öffentlicher Baum“ wissen will,
   um einen Ersatz zuzulassen, fragt hier (tools/lib/vorlage-aufloesen.js). Fehlt die Wurzeldatei oder lässt sie sich nicht lesen:
   false, also kein Ersatz. */
function wurzelIstOeffentlich(repo) {
  try { return OEFFENTLICH_MUSTER.test(require('node:fs').readFileSync(require('node:path').join(repo, WURZEL_KOPFZEILE.datei), 'utf8')); } catch (_) { return false; }
}

module.exports = { WURZEL_KOPFZEILE, wurzelKopfzeileOeffentlich, wurzelKopfzeileSetzen, wurzelKopfzeileZuruecksetzen, imOeffentlichenZuschnitt, IM_ZUSCHNITT_GRUND, wurzelIstOeffentlich };
