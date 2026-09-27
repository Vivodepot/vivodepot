'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zug 3 (Auftrag M2/S4, 09.08.2026) + Zug 1 („S4 — die elf
   ungeprüften Formulierungen", 11.08.2026) — Regel 18 für S4: „je Schlüssel die
   alte gegen die neue Zeichenkette gepinnt, wie in Zug 3 des Wortlaut-
   Auftrags" (s. tests/wortlaute-freigabe-2026-08-09.test.js).

   Begriffsliste (Zug 2, aus vivodepot.html vor saveStatusAenderungEinzahl):
     „gespeichert"        — schwächere Garantie: nur Browser/RAM/IndexedDB.
     „gesichert"/„sichern" — stärkere Garantie: in der eigenen Datei geschrieben.
     „ungespeichert"      — Zustand: Änderungen noch nicht in der Datei.
   Domäne: Depot-eigener Speicher-Lebenszyklus (Kopfzeile, Schließen-Dialog,
   Pause-Hinweis, Vorschau-Banner) — NICHT die Export-Toast-Gruppe (eigene
   Domäne, quittiert einen einmaligen Artefakt-Download) und NICHT die
   generischen Modal-Knöpfe btnSpeichern/btnAbbrechen (eigene Domäne, dort
   korrekt: schreibt nur ins RAM-Depot).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ALT_NEU = [
  {
    schluessel: 'saveStatusAlsDatei',
    alt: 'Als Sicherungsdatei gespeichert ✓',
    neu: 'Als Sicherungsdatei gesichert ✓',
  },
  {
    schluessel: 'saveStatusInternToast',
    alt: 'Gespeichert. Für eine Sicherung gelegentlich als Datei speichern.',
    neu: 'Gespeichert. Für eine Sicherung gelegentlich als Datei sichern.',
  },
  // dateiNameHinweis stand hier bis U2-ADR-220 (02.09.2026) — die Speichern→Sichern-
  // Terminologiespur dieses Eintrags ist mit dem ADR gegenstandslos geworden: der Satz trägt
  // seither einen vollständig anderen Inhalt (kein „dieselbe Datei ersetzen"-Versprechen mehr,
  // das an dieser Stelle nie zutraf). Eigene Probe dafür: tests/persistenz-status.test.js.
  {
    schluessel: 'dateiNamePrimaer',
    alt: 'Speichern',
    neu: 'Sichern',
  },
  {
    schluessel: 'd40KeineDateiText',
    alt: 'Ihre Datei ist nicht auf dem neuesten Stand. Speichern Sie jetzt, sonst fehlen dort Ihre letzten Änderungen.',
    neu: 'Ihre Datei ist nicht auf dem neuesten Stand. Sichern Sie jetzt, sonst fehlen dort Ihre letzten Änderungen.',
  },
  {
    schluessel: 'schnellstartSchritt4',
    alt: null, // Zug 0 (S4-Erhebung): voller Alt-Wortlaut im Bericht, hier nur das geänderte Wortstück gepinnt.
    neuTeil: 'kein eigener Sichern-Schritt nötig',
    altTeil: 'Speichern-Schritt',
  },
  {
    schluessel: 'pausenErlaubnis',
    alt: 'Solange dieses Fenster offen ist, bleiben Ihre Eingaben erhalten. Gesichert sind sie erst, wenn Sie Ihr Depot gespeichert haben.',
    neu: 'Solange dieses Fenster offen ist, bleiben Ihre Eingaben erhalten. Gesichert sind sie erst, wenn Sie Ihr Depot gesichert haben.',
  },
  {
    schluessel: 'vorschauVerlassenText',
    alt: null,
    neuTeil: 'NICHT gesichert',
    altTeil: 'NICHT gespeichert',
  },
  {
    schluessel: 'd2SchliessenText',
    alt: null,
    neuTeil: 'noch nicht dauerhaft gesichert',
    altTeil: 'noch nicht dauerhaft gespeichert',
  },
  // Zug 1 („S4 — die elf ungeprüften Formulierungen", 11.08.2026): die restlichen
  // Kandidaten der Kopfzeile/Schließen-Dialog/Pause-Hinweis/Vorschau-Banner-Domäne geprüft.
  // Zwei Vokabular-Verstöße gefunden — beide beschreiben eine DATEI-Sicherung (starke Garantie),
  // trugen aber das schwächere „gespeichert" statt „gesichert".
  {
    schluessel: 'saveStatusDateiToast',
    alt: 'Ihre Sicherung wurde als Datei gespeichert.',
    neu: 'Ihre Sicherung wurde als Datei gesichert.',
  },
  // `d3ToastText` (D3-Erst-Eintrag-Toast) stand hier bis 13.08.2026 — „Zwei tote
  // Toasts" hat den Schlüssel samt totem Erzeuger entfernt (strukturell unerreichbares Gate,
  // s. vivodepot.html an der ehemaligen Fundstelle). Kein STRINGS-Eintrag mehr, kein Pin nötig.
  // Zug 3 („Drei Messungen, die keine Entscheidung brauchen", 13.08.2026): dieser
  // Wächter war ein FESTES Register (Regel 18), kein Scan über alle STRINGS — diese vier
  // Verstöße (Register-und-Reste-Bericht, 12.08.2026) standen nicht in ALT_NEU und wurden darum
  // NICHT gefangen. Beide betroffenen Flüsse (Passwort setzen/ändern, Datei-Konflikt) schreiben
  // real eine Datei (`speichernOderFehlschlagMarkieren`/`passwortWechselDurchfuehren` bzw. der
  // `aufDatei`-Zweig von `ueberschreibText`) — die starke Garantie ist zutreffend, „gespeichert"
  // war die Begriffsliste-Verletzung, nicht der Sachverhalt.
  {
    schluessel: 'pwSetzenFertig',
    alt: 'Passwort gesetzt — Ihr Depot ist jetzt verschlüsselt gespeichert.',
    neu: 'Passwort gesetzt — Ihr Depot ist jetzt verschlüsselt gesichert.',
  },
  {
    // Trug bislang BEIDE Vokabeln für dieselbe Handlung im selben Satz („gesichert und neu
    // abgespeichert") — das „abgespeichert" am Ende entfällt, nicht nur umbenannt.
    schluessel: 'pwWechselErklaerung',
    alt: 'Zum Ändern brauchen wir zuerst Ihr bisheriges Passwort. Danach wird Ihr Depot mit dem neuen Passwort gesichert und neu abgespeichert.',
    neu: 'Zum Ändern brauchen wir zuerst Ihr bisheriges Passwort. Danach wird Ihr Depot mit dem neuen Passwort neu gesichert.',
  },
  {
    schluessel: 'pwWechselPrimaer',
    alt: 'Passwort ändern und speichern →',
    neu: 'Passwort ändern und sichern →',
  },
  {
    // Copy-Paste-Rest aus dem korrekten `ueberschreibTextIntern` (dort bleibt „gespeichert"
    // richtig — der interne Zweig schreibt keine Datei). Dieser Schlüssel ist der `aufDatei`-Zweig.
    schluessel: 'ueberschreibText',
    alt: 'Die Datei trägt den Stand vom {ziel}. Sie bearbeiten einen Stand vom {geoeffnet}. Das kommt vor, wenn dasselbe Depot in einem zweiten Fenster geöffnet und dort gespeichert wurde. Beim Überschreiben sind die Eingaben aus dem anderen Fenster fort.',
    neu: 'Die Datei trägt den Stand vom {ziel}. Sie bearbeiten einen Stand vom {geoeffnet}. Das kommt vor, wenn dasselbe Depot in einem zweiten Fenster geöffnet und dort gesichert wurde. Beim Überschreiben sind die Eingaben aus dem anderen Fenster fort.',
  },
];

for (const eintrag of ALT_NEU) {
  test(`[S4·Regel18] ${eintrag.schluessel}: neuer Wortlaut steht, alter Wortlaut ist wirklich weg`, () => {
    const { V } = ladeKern();
    const jetzt = V.STRINGS[eintrag.schluessel];
    assert.ok(jetzt, `Schlüssel ${eintrag.schluessel} existiert weiterhin`);
    if (eintrag.alt !== null) {
      assert.equal(jetzt, eintrag.neu, 'neuer Wortlaut steht wörtlich');
      assert.notEqual(jetzt, eintrag.alt, 'alter Wortlaut ist wirklich verdrängt, nicht nur behauptet');
    } else {
      assert.match(jetzt, new RegExp(eintrag.neuTeil.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'neues Wortstück steht');
      assert.ok(!jetzt.includes(eintrag.altTeil), 'altes Wortstück ist wirklich verdrängt, nicht nur behauptet');
    }
  });
}

test('[S4·Regel18] btnSpeichern-Doppel-Deklaration ist weg, überlebende Stelle unverändert korrekt', () => {
  const { V } = ladeKern();
  assert.equal(V.STRINGS.btnSpeichern, 'Speichern', 'eigene Domäne (Modal), bewusst nicht Teil der Begriffsliste');
});

test('[S4·Zug3·Gegenprobe] ueberschreibTextIntern bleibt bei „gespeichert" — der interne Zweig schreibt keine Datei', () => {
  const { V } = ladeKern();
  assert.match(V.STRINGS.ueberschreibTextIntern, /dort gespeichert wurde/,
    'korrekt schwach: dieser Zweig läuft ohne Dateiziel, „gesichert" wäre hier die Übertreibung');
});

test('[S4·Zug1] vorschauStartHinweis war ein toter Schlüssel (nie gerendert) — jetzt entfernt', () => {
  const { V } = ladeKern();
  assert.equal('vorschauStartHinweis' in V.STRINGS, false, 'entfernt, nicht nur unbenutzt gemeldet');
});
