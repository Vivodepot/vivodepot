'use strict';
/* Eine Vorlage, die im öffentlichen Baum fehlt, wird dort durch ihr erfundenes Gegenstück ersetzt — im Kanon nie.
   Fail-closed (Auflage 09.10.2026): der Ersatz greift nur, wenn die Wurzeldatei die öffentliche Kopfzeile trägt, ein Merkmal,
   das allein der Zuschnitt schreibt (tools/lib/wurzel-kopfzeile.js, wurzelIstOeffentlich). Fehlt eine Vorlage im Kanon, wirft
   die Auflösung — eine Kanon-Probe läuft nie still gegen den Ersatz. Das Gegenstück liegt unter
   tests/fixtures/zuschnitt-schicht2/testprodukt-neutral/ mit demselben Pfad relativ zur Wurzel wie das Original. */
const fs = require('node:fs');
const path = require('node:path');
const { wurzelIstOeffentlich } = require('./wurzel-kopfzeile.js');

const ERSATZ_WURZEL = path.join('tests', 'fixtures', 'zuschnitt-schicht2', 'testprodukt-neutral');

/* SPUR (20.10.2026, Befund VORLAGEN-PORT-PROBEN-OHNE-HEIMAT): ist VD_VORLAGEN_SPUR gesetzt, schreibt jeder Griff zum
   Gegenstück eine Zeile in diese Datei — welche Vorlage angefordert war und öffentlich fehlte. So misst ein internes
   Messwerkzeug je Probe, welche zurückgehaltene Vorlage sie braucht, statt es zu vermuten. */
function spurSchreiben(repo, vorlageAbs, ersatz) {
  const ziel = process.env.VD_VORLAGEN_SPUR;
  if (!ziel) return;
  try { fs.appendFileSync(ziel, JSON.stringify({ vorlage: path.relative(repo, vorlageAbs), ersatz: path.relative(repo, ersatz) }) + '\n'); } catch (_) { /* Messung ist Zugabe */ }
}
function ersatzPfad(repo, vorlageAbs) {
  return path.join(repo, ERSATZ_WURZEL, path.relative(repo, vorlageAbs));
}

function vorlageAufloesen(repo, vorlageAbs) {
  if (fs.existsSync(vorlageAbs)) return vorlageAbs;
  if (!wurzelIstOeffentlich(repo)) {
    throw new Error('Vorlage fehlt im Kanon: ' + path.relative(repo, vorlageAbs) + ' — kein Ersatz außerhalb des öffentlichen Zuschnitts');
  }
  const ersatz = ersatzPfad(repo, vorlageAbs);
  if (!fs.existsSync(ersatz)) {
    const e = new Error('Vorlage fehlt im öffentlichen Baum und hat kein erfundenes Gegenstück: ' + path.relative(repo, vorlageAbs));
    e.code = 'VORLAGE_NICHT_OEFFENTLICH';   // ein Produkt, das sie braucht, gehört nicht zum öffentlichen Zuschnitt (tools/vier-produkte-erzeugen.js überspringt es)
    throw e;
  }
  spurSchreiben(repo, vorlageAbs, ersatz);
  return ersatz;
}

/* Ein Vorlagen-ORDNER: dasselbe für ein Verzeichnis, das ein Werkzeug durchliest. Im öffentlichen Zuschnitt der Ordner der Gegenstücke, wenn es ihn
   gibt, sonst null (das Werkzeug überspringt ihn); im Kanon wirft ein fehlender Ordner. */
function vorlagenOrdnerAufloesen(repo, ordnerAbs) {
  if (fs.existsSync(ordnerAbs)) return ordnerAbs;
  if (!wurzelIstOeffentlich(repo)) throw new Error('Vorlagen-Ordner fehlt im Kanon: ' + path.relative(repo, ordnerAbs) + ' — kein Ersatz außerhalb des öffentlichen Zuschnitts');
  const ersatz = ersatzPfad(repo, ordnerAbs);
  if (!fs.existsSync(ersatz)) return null;
  spurSchreiben(repo, ordnerAbs, ersatz);
  return ersatz;
}

module.exports = { vorlageAufloesen, vorlagenOrdnerAufloesen, ersatzPfad, ERSATZ_WURZEL };
