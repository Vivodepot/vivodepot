'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   rezept-rueckweg.js — der Rückweg eines Auslieferungslaufs (23.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Schritt 4 überschreibt `rezepte/<slug>.json` auf der Ablage; die alte `.jws` deckt die neuen Bytes nicht mehr,
   und bis Schritt 5 signiert hat, liefert der Worker kein Produkt aus (src/rezept-kette.js im Gateway). Schlägt
   Schritt 5 fehl, bleibt es so. Dieser Rückweg stellt den alten, gültigen Zustand wieder her:

     SICHERN        vor dem ersten Überschreiben je Slug die alten `.json` UND `.jws` holen und außerhalb des Baums
                    ablegen, mit `sicherung.json` (SHA-256 je Datei). Der Baum bleibt sauber, sonst wäre
                    `--nur-signieren` rot (Schritt 0 lässt dort nur docs/auslieferung-stand.md zu).
     ZURÜCKSPIELEN  erst ALLES prüfen, dann schreiben: die Sicherung unverändert, jedes Paar mit gültiger Signatur
                    über genau diese Bytes, und jede Datei, auf die das alte Rezept zeigt (Kern, Module, Vorlagen,
                    vorgebautes Produkt), liegt mit der Prüfsumme des alten Rezepts auf der Ablage. Ein Fund = nichts
                    geschrieben. Dann je Slug das PAAR zurück, nur was abweicht: liegt die alte `.jws` noch oben (Schritt
                    5 kam nicht bis zu diesem Slug), genügt die `.json`, und es gibt keinen Zwischenzustand, den der
                    Worker abweist. Liegt schon eine neue `.jws` oben, gehen `.json` und `.jws` zurück — zwischen den
                    beiden PUTs deckt die Signatur die Bytes für einen Schritt nicht; zwei Dateien auf WebDAV lassen
                    sich nicht zusammen ersetzen.

   Kein Netz, kein Dateisystem-Pfad der Ablage hier: `holen(pfad)` (Buffer, `null` bei 404, wirft sonst),
   `schreiben(pfad, inhalt)` (PUT samt Zurücklesen, wirft) und `paarGueltig(slug, json, jws)` kommen herein —
   tools/kern-ausliefern.js reicht die echten, die Proben erfundene. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SICHERUNG_DATEI = 'sicherung.json';
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

async function rezepteSichern({ slugs, holen, ordner, jetzt = new Date() }) {
  fs.mkdirSync(ordner, { recursive: true });
  const rezepte = [];
  for (const slug of slugs) {
    const json = await holen('rezepte/' + slug + '.json');
    const jws = await holen('rezepte/' + slug + '.jws');
    if (json) fs.writeFileSync(path.join(ordner, slug + '.json'), json);
    if (jws) fs.writeFileSync(path.join(ordner, slug + '.jws'), jws);
    rezepte.push({ slug, json: json ? sha256(json) : null, jws: jws ? sha256(jws) : null });
  }
  fs.writeFileSync(path.join(ordner, SICHERUNG_DATEI), JSON.stringify({ zeit: jetzt.toISOString(), rezepte }, null, 2) + '\n');
  return { ordner, rezepte };
}

function _verweise(rezept) {
  return [
    { pfad: rezept.kernStand, pruefsumme: rezept.kernPruefsumme },
    rezept.sprachmodul && { pfad: rezept.sprachmodul, pruefsumme: rezept.sprachmodulPruefsumme },
    rezept.rechtsraumModul && { pfad: rezept.rechtsraumModul, pruefsumme: rezept.rechtsraumModulPruefsumme },
    ...(rezept.bereichsmodule || []), ...(rezept.templates || []),
    rezept.produktPfad && { pfad: rezept.produktPfad, pruefsumme: rezept.produktPruefsumme },
    rezept.serviceWorkerPfad && { pfad: rezept.serviceWorkerPfad, pruefsumme: rezept.serviceWorkerPruefsumme },
  ].filter(Boolean).map(({ pfad, pruefsumme }) => ({ pfad, pruefsumme }));
}

async function rezepteZurueckspielen({ ordner, holen, schreiben, paarGueltig, melden = () => {} }) {
  const sicherung = JSON.parse(fs.readFileSync(path.join(ordner, SICHERUNG_DATEI), 'utf8'));
  const plan = [];
  const fehler = [];
  for (const e of sicherung.rezepte) {
    if (!e.json) { melden(e.slug + ': vor dem Lauf lag kein Rezept oben — nichts zurückzuspielen.\n'); continue; }
    if (!e.jws) { fehler.push(e.slug + ': gesichert ist ein Rezept ohne Signatur — es gibt keinen gültigen alten Zustand'); continue; }
    const json = fs.readFileSync(path.join(ordner, e.slug + '.json'));
    const jws = fs.readFileSync(path.join(ordner, e.slug + '.jws'));
    if (sha256(json) !== e.json || sha256(jws) !== e.jws) { fehler.push(e.slug + ': die Sicherung ist seit dem Lauf verändert'); continue; }
    if (!(await paarGueltig(e.slug, json, jws))) { fehler.push(e.slug + ': das gesicherte Paar trägt keine gültige Signatur über diese Bytes'); continue; }
    let rezept;
    try { rezept = JSON.parse(json.toString('utf8')); } catch { fehler.push(e.slug + ': das gesicherte Rezept ist kein JSON'); continue; }
    for (const v of _verweise(rezept)) {
      const inhalt = await holen(v.pfad);
      if (!inhalt) fehler.push(e.slug + ': ' + v.pfad + ' fehlt auf der Ablage');
      else if (sha256(inhalt) !== v.pruefsumme) fehler.push(e.slug + ': ' + v.pfad + ' weicht vom alten Rezept ab');
    }
    plan.push({ slug: e.slug, json, jws });
  }
  if (fehler.length) throw new Error('Rückweg NICHT gefahren, nichts geschrieben:\n  ' + fehler.join('\n  '));
  const ergebnis = [];
  for (const { slug, json, jws } of plan) {
    const obenJson = await holen('rezepte/' + slug + '.json');
    const obenJws = await holen('rezepte/' + slug + '.jws');
    const schritte = [];
    if (!obenJson || !obenJson.equals(json)) schritte.push({ pfad: 'rezepte/' + slug + '.json', inhalt: json });
    if (!obenJws || !obenJws.equals(jws)) schritte.push({ pfad: 'rezepte/' + slug + '.jws', inhalt: jws });
    for (const s of schritte) await schreiben(s.pfad, s.inhalt);
    melden(slug + ': ' + (schritte.length ? schritte.map((s) => s.pfad).join(' + ') + ' zurückgespielt' : 'lag schon im alten Zustand') + '.\n');
    ergebnis.push({ slug, geschrieben: schritte.map((s) => s.pfad) });
  }
  return ergebnis;
}

module.exports = { rezepteSichern, rezepteZurueckspielen, SICHERUNG_DATEI, _verweise };
