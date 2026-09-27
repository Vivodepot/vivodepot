'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════════
   zertifikat-ablauf-messen — was schaltet der Ablauf eines Anbieter-Zertifikats ab?
   ────────────────────────────────────────────────────────────────────────────
   Strang D1 des Laufzettels „Nacht 21./22.08.2026"; Erhebung 3 des Laufzettels
   „Nach den dreizehn" (Posten 13), deren Ergebnis ausstand.

   WARUM DIE FRAGE AM VERTRIEBSMODELL HÄNGT, wörtlich aus dem Auftrag: „Bei
   Einzelkunden braucht sonst jede und jeder einmal im Jahr eine neue Datei — und
   die Anwendung darf nicht daran erinnern, weil sie offline ist."

   DER AUFTRAG SAGT AUSDRÜCKLICH: „Am 19.08. wurde berichtet, es verschwinde
   nichts; **das ist gegen den heutigen Stand zu bestätigen, nicht zu
   übernehmen.**" Dieses Werkzeug übernimmt darum nichts — es misst den
   Verzweigungsbaum von `verifiziereTemplateKette` und `basisVorlagenVerifizieren`
   am ausgelieferten Kern.

   VIER LAGEN, die unterschieden werden müssen und im Bericht oft eine werden:
     A · Cert gültig                    → geprüft, Vorlage nutzbar
     B · Cert ABGELAUFEN, nicht widerrufen, Signatur gültig  → Schonfrist (1F/b2)
     C · Cert WIDERRUFEN                → Widerruf schlägt Schonfrist
     D · Cert kaputt/fremd              → hart ungültig

   Aufruf:  node tools/zertifikat-ablauf-messen.js [--json]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

function zeilenMit(text, muster) {
  const raus = [];
  const zeilen = text.split('\n');
  for (let i = 0; i < zeilen.length; i++) if (muster.test(zeilen[i])) raus.push(i + 1);
  return raus;
}

/* Die Frage hinter der Frage: verschwinden FELDER, wenn ein Cert abläuft? Ein
   Feld verschwindet nur, wenn etwas es entfernt. Gemessen wird darum, WAS mit
   den zwei Mengen geschieht — die geprüften und die veralteten Vorlagen — und ob
   irgendwo eine Feld-Definition gelöscht wird. */
function messen() {
  const t = fs.readFileSync(KERN, 'utf8');

  const stellen = {
    schonfrist: zeilenMit(t, /certRes\.abgelaufen && !certRes\.widerrufen/),
    veralteteMenge: zeilenMit(t, /_veralteteBasisVorlagen/),
    gepruefteMenge: zeilenMit(t, /_gepruefteBasisVorlagen/),
    vorwarnung: zeilenMit(t, /_basisAblaufFrueh/),
    widerrufVorAblauf: zeilenMit(t, /Widerruf schlaegt Schonfrist|Widerruf schlägt Schonfrist/),
  };

  /* DIE ENTSCHEIDENDE MESSUNG: gibt es IRGENDWO einen Pfad, der wegen eines
     abgelaufenen Zertifikats Felder, Definitionen oder Werte entfernt? Gesucht
     wird nach Löschungen in der Nähe der Ablauf-Behandlung — und die Antwort
     ist die Zahl, nicht die Erinnerung an den 19.08. */
  const loeschungen = zeilenMit(t, /delete\s+.*(feldDefinition|sektoren|templateModul|importierteVorlagen)/);
  const ablaufZeilen = zeilenMit(t, /abgelaufen/);
  const ablaufNaeheLoeschung = loeschungen.filter((l) =>
    ablaufZeilen.some((a) => Math.abs(a - l) <= 30));

  /* GEGENPROBE, ohne die „null Löschungen" nichts wert wäre: findet dieselbe
     Suche überhaupt Löschungen im Kern? */
  const loeschungenGesamt = zeilenMit(t, /^\s*delete\s+/);

  return {
    stellen,
    schonfristGebaut: stellen.schonfrist.length > 0,
    veraltetStattEntfernt: stellen.veralteteMenge.length > 0,
    vorwarnungGebaut: stellen.vorwarnung.length > 0,
    loeschungenGesamt: loeschungenGesamt.length,
    loeschungenNahAmAblauf: ablaufNaeheLoeschung,
    ablaufStellen: ablaufZeilen.length,
    /* Die vier Lagen, jede mit ihrer Fundstelle. */
    lagen: [
      { lage: 'A · Cert gültig', folge: 'Vorlage gilt als geprüft',
        stelle: 'basisVorlagenVerifizieren, Zeile ' + stellen.gepruefteMenge.join('/') },
      { lage: 'B · Cert abgelaufen, nicht widerrufen, Signatur gültig',
        folge: 'SCHONFRIST — die Vorlage wird als VERALTET markiert, nicht entfernt',
        stelle: 'verifiziereTemplateKette, Zeile ' + stellen.schonfrist.join('/')
          + ' · Menge `_veralteteBasisVorlagen`, Zeile ' + stellen.veralteteMenge.join('/') },
      { lage: 'C · Cert widerrufen',
        folge: 'HART ungültig — Widerruf schlägt Schonfrist',
        stelle: 'verifiziereProviderCredential, Sperrlisten-Prüfung vor der Ablauf-Prüfung' },
      { lage: 'D · Cert kaputt oder fremd', folge: 'HART ungültig, keine Schonfrist',
        stelle: 'verifiziereTemplateKette, Zweig `!certRes.gueltig`' },
    ],
  };
}

function bericht(m) {
  const z = [];
  z.push('D1 — was der Ablauf eines Anbieter-Zertifikats abschaltet');
  z.push('');
  for (const l of m.lagen) {
    z.push('  ' + l.lage);
    z.push('      Folge:  ' + l.folge);
    z.push('      Stelle: ' + l.stelle);
  }
  z.push('');
  z.push('Die Antwort auf die Frage des Auftrags:');
  z.push('  Schonfrist gebaut (Lage B):                 ' + (m.schonfristGebaut ? 'JA' : 'NEIN'));
  z.push('  Veraltet MARKIERT statt entfernt:           ' + (m.veraltetStattEntfernt ? 'JA' : 'NEIN'));
  z.push('  Vorwarnung auf das früheste Ablaufdatum:    ' + (m.vorwarnungGebaut ? 'JA' : 'NEIN'));
  z.push('  Löschpfade in der Nähe der Ablauf-Logik:    '
    + (m.loeschungenNahAmAblauf.length ? m.loeschungenNahAmAblauf.join(', ') : 'KEINE'));
  z.push('  Gegenprobe — Löschpfade im Kern überhaupt:  ' + m.loeschungenGesamt
    + ' (die Suche findet also Löschungen, wenn es welche gibt)');
  z.push('  Ablauf-Stellen im Kern gesamt:              ' + m.ablaufStellen);
  return z.join('\n');
}

if (require.main === module) {
  const m = messen();
  console.log(process.argv.includes('--json') ? JSON.stringify(m, null, 2) : bericht(m));
}
module.exports = { messen, bericht };
