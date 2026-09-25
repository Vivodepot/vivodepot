#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   fremdweg-messen.js — „Der Fremdweg" (18.08.2026).
   **Rein messend. Dieses Werkzeug baut nichts und ändert nichts.**
   ────────────────────────────────────────────────────────────────────────────
   DIE FRAGE: Jemand, den wir nicht kennen, will ein abgeleitetes Depot für seine
   Berufsgruppe bauen und in Umlauf bringen. **Was muss er tun, in welcher
   Reihenfolge, und welcher dieser Schritte existiert heute?**

   DER ZÄHLGEGENSTAND (§7): ein SCHRITT des Fremdwegs, mit drei Zuständen —
   `ja` (der Schritt ist gebaut und ohne uns gehbar), `halb` (gebaut, aber nicht
   ohne uns gehbar), `nein` (nicht gebaut). Jeder Schritt nennt einen ANKER: eine
   Zeichenkette, die in der genannten Datei stehen MUSS, damit die Behauptung
   trägt. Fehlt der Anker, meldet das Werkzeug ANKER KAPUTT — das ist ein Fund,
   kein Wegfall, und genau der Unterschied zu einer Liste in einem Bericht.

   Die Einstufung selbst ist ein URTEIL und steht mit ihrem Grund an der Zeile.
   Gemessen wird, ob der Anker existiert — nicht, ob das Urteil gefällt.

   GELESEN WIRD MIT `readFileSync`: `vivodepot-template-generator.html` trägt ein
   NUL-Byte, und `grep` hält die Datei damit für binär (A272).

   AUFRUFE
     node tools/fremdweg-messen.js            Tabelle
     node tools/fremdweg-messen.js --json     maschinenlesbar
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.join(__dirname, '..');

const SCHRITTE = Object.freeze([
  { nr: 1, was: 'Den Bereichssatz / das Template beschreiben',
    datei: 'vivodepot-template-generator.html', anker: 'Template-Definition', zustand: 'ja',
    grund: 'Der Template-Generator führt durch Anbieter, Schlüssel und Felder — ohne IT-Abteilung, ohne uns.' },
  { nr: 2, was: 'Ein eigenes Schlüsselpaar erzeugen und aufbewahren',
    datei: 'vivodepot-template-generator.html', anker: 'Schlüsselpaar', zustand: 'ja',
    grund: 'Schritt 3 des Generators; der Private-Key verlässt den Browser nicht.' },
  { nr: 3, was: 'Gegen das Einreich-Schema prüfen',
    datei: 'vivodepot-template-generator.html', anker: 'SUBMISSION_SCHEMA', zustand: 'ja',
    grund: 'Das Schema liegt IM Generator (und byte-gleich im VC-Issuer und als Datei) — die formale Prüfung läuft lokal.' },
  { nr: 4, was: 'Das eigene Template mit dem eigenen Schlüssel signieren',
    datei: 'vivodepot-template-generator.html', anker: 'Fertigstellen und einreichen', zustand: 'ja',
    grund: 'Im Generator „Fertigstellen und einreichen" (seit dem Umbau zur Arbeitsfläche, GEN1) — signiert über den Schlüssel-Tresor. '
      + 'Diese Signatur sagt „von mir" — sie sagt NICHT „geprüft".' },
  { nr: 5, was: 'Das Submission-Paket EINREICHEN — und zwar an wen?',
    datei: 'vivodepot-template-generator.html', anker: 'mailto:register@vivodepot.de', zustand: 'ja',
    grund: 'NACHGEZOGEN 19.09.2026 (GEN1): der Abriss ist geschlossen. Der Generator führt auf dem „Weg zur Einreichung" '
      + 'zu einer vorbereiteten Nachricht an register@vivodepot.de (mailto mit lesbarem Text, das Paket als Datei dabei). '
      + 'Vorher: eine Datei und der Name des prüfenden Teams, aber keine Adresse.' },
  { nr: 6, was: 'Ein Zertifikat von der Trust Authority bekommen',
    datei: 'vivodepot-vc-issuer.html', anker: 'submissionId', zustand: 'halb',
    grund: 'Der VC-Issuer ist gebaut und importiert genau dieses Paket — aber er ist UNSER Werkzeug '
      + 'und braucht den Trust-Authority-Schlüssel. Für einen Fremden ohne Kontakt nicht erreichbar.' },
  { nr: 7, was: 'Die zertifizierte Vorlage an Bürgerinnen verteilen',
    datei: 'vivodepot.html', anker: 'TRUST_AUTHORITY_PUBLIC_JWK', zustand: 'ja',
    grund: 'Der Kern prüft jede Vorlage gegen den eingebetteten Anker. Der Weg ist gebaut — er setzt Schritt 6 voraus.' },
  { nr: 8, was: 'ODER: das Modul UNGEPRÜFT direkt verteilen (Einlassweg)',
    datei: 'vivodepot.html', anker: 'modulEinlassen', zustand: 'ja',
    grund: 'Seit U2-ADR-145 kann eine Bürgerin ein Modul ohne Signatur selbst einlassen. '
      + 'Dieser Weg braucht uns an KEINER Stelle — er ist der einzige, der ohne Schritt 5 auskommt.' },
  { nr: 9, was: 'Die Bürgerin sieht, dass etwas Ungeprüftes in ihrem Depot liegt',
    datei: 'vivodepot.html', anker: 'einstAbschnittModule', zustand: 'ja',
    grund: 'Abschnitt „Eingelassene Erweiterungen" in den Einstellungen; die Marke `ungeprueft` reist am Modul mit.' },
  /* NACHGEZOGEN am 04.09.2026 (U2-ADR-258): der zweite Abriss ist geschlossen. Bis dahin stand
     hier `zustand: 'nein'` mit der Behauptung, `ungeprueft` komme in der Lese-App NULL Mal vor —
     eine Behauptung über ABWESENHEIT, und die Probe daneben (tests/fremdweg-messung.test.js) war
     ausdrücklich dafür gebaut, rot zu werden, sobald jemand den Hinweis baut. Sie wurde rot. Der
     Befund ist damit nicht weggefallen, sondern erledigt, und die Messung sagt es jetzt.
     Der Anker ist bewusst `herkunft-marke` und nicht `ungeprueft`: die Marke ist das, was der
     Empfänger SIEHT — ein Feldname allein könnte auch in einem toten Kommentar stehen. */
  { nr: 10, was: 'Der EMPFÄNGER sieht, dass etwas Ungeprüftes im Depot liegt',
    datei: 'vivodepot-lesen.html', anker: 'herkunft-marke', zustand: 'ja',
    grund: 'Seit U2-ADR-258 (04.09.2026) trägt die Lese-App den Block „Herkunft der Inhalte" — in der '
      + 'Depot-Ansicht aus dem geöffneten Depot gerechnet, im Antwort-Blatt aus dem Datensatz gelesen. '
      + 'Die Angabe reist zusätzlich IM Artefakt mit (Datensatz-Schlüssel `modulHerkunft`, Segment im '
      + 'PDF-Fuß); fehlt sie, gilt das Dokument als ungeprüft.' },
]);

/* `schritteEin` ist nur für die GEGENPROBE da (tests/fremdweg-messung.test.js): seit der
   Abwesenheits-Mechanismus von keinem echten Schritt mehr benutzt wird, ließe er sich sonst
   nicht mehr fahren — und ein Mechanismus, den niemand fährt, ist stillschweigend kaputt.
   Ohne Argument misst das Werkzeug wie immer die echten SCHRITTE. */
function messen(schritteEin) {
  const quellen = Object.create(null);
  const schritte = (Array.isArray(schritteEin) ? schritteEin : SCHRITTE).map((s) => {
    if (!quellen[s.datei]) quellen[s.datei] = fs.readFileSync(path.join(REPO, s.datei), 'utf8');
    const treffer = quellen[s.datei].split(s.anker).length - 1;
    /* Ein Schritt kann behaupten, dass sein Anker FEHLT — dann heisst ein plötzlich vorhandener
       Anker „gebaut" und nicht „kaputt". Bis zum 04.09.2026 war Schritt 10 der einzige solche;
       seit U2-ADR-258 ist er gebaut, und heute erhebt kein Schritt mehr diese Behauptung. Der
       Mechanismus bleibt: er wird für den nächsten gemessenen Abriss gebraucht — aber er wird
       jetzt AM SCHRITT erklärt (`erwartetAbwesend: true`) und nicht mehr aus Zustand plus
       Dateiname erraten. Die alte Herleitung hätte für jeden künftigen 'nein'-Schritt in der
       Lese-App still mitgegolten. */
    const erwartetAbwesend = s.erwartetAbwesend === true;
    const ankerOk = erwartetAbwesend ? treffer === 0 : treffer > 0;
    return Object.assign({}, s, { treffer, ankerOk, erwartetAbwesend });
  });
  const zaehl = { ja: 0, halb: 0, nein: 0 };
  for (const s of schritte) zaehl[s.zustand]++;
  const abriss = schritte.find((s) => s.zustand === 'nein');
  return { schritte, zaehl, abriss: abriss ? abriss.nr : null, kaputt: schritte.filter((s) => !s.ankerOk) };
}

function main() {
  const erg = messen();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(erg, null, 1)); return; }
  console.log('DER FREMDWEG — was jemand tun muss, der ableitet, ohne uns zu fragen\n');
  for (const s of erg.schritte) {
    const marke = s.ankerOk ? { ja: '  ja  ', halb: ' halb ', nein: ' NEIN ' }[s.zustand] : 'ANKER!';
    console.log(String(s.nr).padStart(2) + ' [' + marke + '] ' + s.was);
    console.log('      ' + s.datei + (s.erwartetAbwesend ? '  (Anker MUSS fehlen, Treffer: ' : '  (Treffer: ') + s.treffer + ')');
    console.log('      ' + s.grund);
    console.log('');
  }
  console.log('SCHRITTE: ' + erg.schritte.length + ' — davon ' + erg.zaehl.ja + ' vorhanden, '
    + erg.zaehl.halb + ' halb, ' + erg.zaehl.nein + ' nicht.');
  console.log(erg.abriss === null ? 'DER WEG REISST AN KEINEM FEHLENDEN SCHRITT; Engpass: die Schritte mit „halb".' : 'DER WEG REISST AN SCHRITT ' + erg.abriss + '.');
  if (erg.kaputt.length) {
    console.error('\nANKER KAPUTT — die Behauptung trägt nicht mehr:');
    for (const s of erg.kaputt) console.error('  Schritt ' + s.nr + ': `' + s.anker + '` in ' + s.datei);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { messen, SCHRITTE };
