# U2-ADR-035: Setup-first — Passwort (Akteur) vor dem ersten Eintrag

**Status:** Akzeptiert
**Datum:** 23.06.2026
**Kategorie:** ARCHITEKTUR, ONBOARDING, PROVENIENZ
**Grundlage:** Erstnutzer-Befund (intern, `befund-erstnutzer-onboarding-akteur-timing-2026-06-22.md`) + Produktentscheidung „Setup-first". Folge-Entscheidung zu U2-ADR-034 (Wiedereintritts-Akteur) — dieselbe Wurzel (Akteur-Timing), Lage: Erstnutzer.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `Modus.darfBearbeiten()` (jetzt akteur-abhängig); `anlegenDialogTitel`/`anlegenPrimaerLabel` (Vorschau-„Sichern"-Weiche entfällt → „Depot anlegen"/„Anlegen"); `wizardLauf` + `flowListenEintragHinzufuegen` (Vorschau → `flowDepotAnlegen` statt totem Pfad); Warntext `modalAnlegenPwWarnung` VOR dem Passwort-Feld in `_depotIdentitaetUndPasswortAbfragen` + `flowPasswortSetzen`; `d1TopbarHinweis`/`d1TopbarCta` (Vorschau-CTA „Einrichten →" → `flowDepotAnlegen`). Tests `tests/setup-first-akteur.test.js` (SF-1..4).
- **Sprint-Commit:** `e03ce42` (lokal, kein Push).
- **ADR-Bezug:** dieser ADR (U2-ADR-035).
**Status heute:** gilt — Beleg akteur-abhängiges `darfBearbeiten()`-Gate (`vivodepot.html:9101`, seit U2-ADR-034-Nachtrag um den `angehoerigen`-Ausschluss erweitert), `flowDepotAnlegen`/`modalAnlegenPwWarnung` (`vivodepot.html:19635`/`:3839`), Tests `tests/setup-first-akteur.test.js`.

---

## Kontext

Der Erstnutzer-Befund zeigte: die passwortlose Vorschau ließ Eintragen zu, aber der Sitzungs-Akteur wurde erst beim Passwort-Setzen etabliert (nur das Anlegen tat es). Jeder urheberschaft-stempelnde Schreibvorgang warf daher ohne Akteur — **asymmetrisch**: nur der Inline-Pfad (`bearbeitungSpeichern`) war durch einen Stempel-Guard stumm, während Listen-Modale, Wizards und Situationsblätter „Kein Sitzungs-Akteur gesetzt" warfen. Das **geführte Ausfüllen** — der von Testern am höchsten bewertete Mehrwert — war für Erstnutzer in der Vorschau tot. Zudem blieben Inline-Erst-Einträge in der Vorschau **ungestempelt** (Provenienz-Lücke).

Zwei mögliche Antworten standen: (A) jeden Eintrags-Versuch in der Vorschau zum Setup führen (bedingte Gabel, app-first erhalten), oder (B) den passwortlosen Probier-Eintrag abschaffen — erst einrichten, dann eintragen. Entschieden wurde **B**.

## Entscheidung — Setup-first

1. **Passwort (Akteur) vor dem ersten Eintrag.** Das Onboarding ist linear: **Name → Passwort (mit Warntext) → Eintragen**. Vor gesetztem Akteur ist **keine Eingabe-Affordanz aktiv**.
2. **Kein passwortloser Probier-Eintrag.** Die passwortlose Vorschau bleibt als **reine Schau** (Erkunden/Lesen) erhalten; eintragen kann man dort nicht. Eintrags-Einstiege (Anlass-Wizard, Listen-Add) führen in der Vorschau zum Einrichten (Name + Passwort).
3. **`darfBearbeiten()` ist akteur-abhängig.** Ein Hebel: `MODUS_DEF[_aktiv].bearbeitung !== 'gesperrt' && !!aktuellerSitzungsAkteur()`. In der Vorschau (kein Akteur) → alle vier Eintragspfade (Inline, Liste, Wizard, Situation) rendern read-only. Nach dem Anlegen (Akteur steht) → alle vier aktiv.
4. **Warntext vor dem Passwort (Schritt 2), wörtlich:** „Dieses Passwort verschlüsselt Ihr Vivodepot. Niemand kann es zurücksetzen — auch wir nicht. Genau das schützt Ihre Daten. Bewahren Sie es sicher auf." Dialog-Titel „Depot anlegen" (die Vorschau-„Sichern"-Weiche entfällt — vor dem Akteur gibt es nichts zu sichern).

## Begründung

- **Vertraute Registrier-Geste.** Name → Passwort vor dem Loslegen ist die Geste, die Nutzer von jeder App kennen; sie trägt das Versprechen „dies ist Ihr geschützter Raum" und macht die Verschlüsselungs-Warnung an genau der Stelle sichtbar, an der das Passwort entsteht.
- **Akteur-vor-Eintrag als Wurzel-Fix.** Statt symptomatisch jeden einzelnen Stempel-Pfad gegen den Null-Akteur abzusichern, schließt Setup-first die Lücke an der Wurzel: solange kein Inhaber-Akteur existiert, gibt es keinen Eintrag — und damit keinen ungestempelten Erst-Eintrag und keine stille Ausnahme. Ein Hebel (`darfBearbeiten()`) deckt alle vier Pfade.

## Konsequenzen

- Erstnutzer können nicht mehr „ins Leere" eintragen; das geführte Ausfüllen funktioniert ab dem ersten Schritt (nach dem Anlegen). Keine ungestempelten Erst-Einträge → Provenienz ab dem ersten Wert vollständig.
- **App-first bleibt als Erkunden erhalten**, nicht mehr als Eintragen: die „Hier anfangen"-Tür (U2-ADR-031-Wiedereinstieg) zeigt die Struktur read-only; der Schritt zum Eintragen ist das Einrichten. Bewusste Verengung gegenüber dem früheren passwortlosen Probier-Eintrag.
- Die obsolete Vorschau-„Sichern"-Weiche (`modalSichernTitel`/`btnSichern`) entfällt aus dem Anlege-Dialog.
- Kein Krypto-Eingriff; Block-Pin `8d31c678…` unberührt. Suite 984/983/0 (1 skip), browser-verifiziert (voller Erstnutzer-Durchlauf, 0 Konsolenfehler).

## Cross-Referenz

U2-ADR-034 (Wiedereintritts-Akteur — gleiche Wurzel, Rückkehrer-Lage; `darfBearbeiten()`-Akteur-Kopplung baut auf der dort eingeführten Inhaber-Akteur-Regel auf), U2-ADR-005 (Urheberschaft/Provenienz), U2-ADR-031 (Persistenz/Wiedereinstieg, App-first-Türen — hier auf „Erkunden, nicht Eintragen" verengt). Befund `befund-erstnutzer-onboarding-akteur-timing-2026-06-22` (intern). Produktiv: —
