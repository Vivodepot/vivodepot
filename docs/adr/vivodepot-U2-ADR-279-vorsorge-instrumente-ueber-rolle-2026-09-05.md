# U2-ADR-279 · `vorsorge_instrumente` über die Rolle `instrumenteListe`, nicht über den Feldnamen

**Datum:** 05.09.2026
**Status:** gebaut, bit-identisch und rot-bewiesen belegt (direkte Funktionsaufrufe, kein Testprozess)
**Status heute:** gilt
**Bezug:** A1/U2-ADR-269 (Rollen-Vokabular), Vorstufe zur `tpl_`-Präfix-Neutralisierung
(Bündel D der Rollen-Umstellungs-Arbeitszerlegung)

---

## 1 · Kontext

Das Bürgerdepot soll ein Modul werden. Ein angedocktes Modul kann sich nicht `vorname` nennen
(A1 löst das über Rollen) — dasselbe gilt für JEDES Feld, das der Kern heute über seinen
LITERALEN Namen statt über seine Funktion (Rolle) findet. `vorsorge_instrumente` ist so ein
Fall: die Rolle `instrumenteListe` existiert bereits seit Wochen in `BEREICH_ROLLEN_ERLAUBT`
und ist am `vorsorge`-Sektor gesetzt (`rollen: { instrumenteListe: 'vorsorge_instrumente', ... }`)
— aber zwei Funktionen fragten bislang trotzdem den literalen Namen ab, nicht die Rolle.

Von den ursprünglich vermuteten 14 Funktionen (grobe Ruf-Ketten-Nähe, keine echte Fundstelle)
enthielten bei genauem Lesen NUR diese zwei tatsächlich das Literal `'vorsorge_instrumente'` als
Bypass — und beide hatten bereits einen `sektorId`-Parameter vom Aufrufer, also war die
Umstellung rein mechanisch, ohne neuen Helfer. Die übrigen Bypässe (`_instrumentUnterfeldDef`,
`_vorsorgeFeldDef`, `_vollmachtArtLabel`, weitere) hartcodieren den SEKTOR selbst (keinen
Parameter dafür) — sie brauchen eine noch fehlende Rückwärts-Suche „welcher Bereich trägt Rolle
X" und sind ausdrücklich NICHT Teil dieses ADRs (Anforderung dafür: s. o. genannte Zerlegungsdatei,
Abschnitt 7b).

---

## 2 · Entscheidung

**Zwei Funktionen umgestellt, additiv, bit-identisch für jeden heute erreichbaren Fall:**

1. **`situationSektorZeileHTML(quelleSektorId, feldId)`** (vivodepot.html) — der Click-Through
   einer virtuellen Instrument-Zeile zeigte fest auf `'vorsorge_instrumente'`. Jetzt:
   `bereichRolle(quelleSektorId, 'instrumenteListe')`. `quelleSektorId` ist an dieser Stelle
   heute immer `'vorsorge'` (nur dieser Bereich vergibt `INSTRUMENT_ZEILE_PRAEFIX`-Zeilen) —
   keine Verhaltensänderung, nur die Quelle der Kennung.

2. **`_listenEintragPruefen(sektorId, feldId, feld, eintrag, ausgenommenIndex)`** — die
   Einzigartigkeits-Prüfung für Vorsorge-Instrumente griff bei `feldId === 'vorsorge_instrumente'`,
   unabhängig vom Sektor. Jetzt: `bereichFeldHatRolle(sektorId, feldId, 'instrumenteListe')` —
   zusätzlich korrekt (nicht nur äquivalent): ein zufällig gleichnamiges Feld in einem FREMDEN
   Sektor hätte die alte Prüfung fälschlich mitgezogen, die neue nicht.

**Kein neuer Rollen-Eintrag, kein Katalog-Eingriff** — `instrumenteListe` existierte bereits,
diese Änderung zieht nur zwei Aufrufer auf den bestehenden Weg nach, den 30 andere Aufrufstellen
im Kern schon gehen.

---

## 3 · Beleg

**Persistiert:** `tests/vorsorge-instrumente-ueber-rolle.test.js` — läuft im Bau dieses ADRs
selbst als Rot-Probe an einem echten, damals noch nicht existierenden Anker vorbei (die
`rollen`-Zeile hatte sich zwischen `ba826350` und `eccda35e` durch A1s eigene
`instrumentTypUnterfeld`-Ergänzung von ein- auf zweizeilig verändert — die Probe hat den
veralteten Anker selbst gefunden, `Anker … nicht mehr eindeutig`, bevor sie je committet war).
Genau die Klasse Fehler, die ein Wächter fängt, weil er hinsieht, nicht weil er zufällig
passt.

**Ohne Testprozess** (Gate-Sperre während einer last-kritischen Nacht, Anweisung) —
direkte Funktionsaufrufe in frischen `node`-Prozessen, je einer gegen den unveränderten und den
geänderten Stand:

- **Bit-identisch:** `situationSektorZeileHTML('vorsorge','instrument:patientenverfuegung')`
  liefert identisches HTML (`data-klick-feld="vorsorge_instrumente"`) in beiden Ständen.
  `_listenEintragPruefen` mit einer ECHTEN Kollision (bestehender `testament`-Eintrag + neuer
  `testament`-Eintrag — ein Testfall ohne Kollision hätte in beiden Ständen `{ok:true}` geliefert
  und nichts bewiesen) liefert `{ok:false, grund:'einzigartig'}` in beiden Ständen; falscher
  Sektor / falsches Feld liefert `{ok:true}` in beiden.
- **Rot-Beweis:** dieselbe Probe gegen eine dritte, mutierte Kopie (`rollen.instrumenteListe` von
  `'vorsorge_instrumente'` auf `'FAKE_ROLLE_ZIEL'` geändert) — `klickFeld` wandert auf
  `'FAKE_ROLLE_ZIEL'`, die echte Kollision wird NICHT mehr erkannt (`{ok:true}` statt
  `{ok:false}`). Beweist, dass beide Stellen wirklich über die Rolle lesen, nicht zufällig
  gleich aussehen.
- Erneut vollständig wiederholt nach dem Rebase von Kanon `ba826350` auf `eccda35e` (A1/
  U2-ADR-269 dazwischen gelandet) — unverändertes Ergebnis, A1s Landung berührt diese zwei
  Stellen nicht.

---

## 4 · Was dieser ADR NICHT ist

Keine vollständige Umstellung der `vorsorge_instrumente`-Fußspur — mindestens vier weitere
Funktionen (`_instrumentUnterfeldDef`, `_vorsorgeFeldDef`, `_vollmachtArtLabel`,
`instrumentZeileQuellFelder`) hartcodieren den Sektor selbst und bleiben bewusst unangetastet,
bis die fehlende Rückwärts-Suche „welcher Bereich trägt Rolle X" existiert (bereits als
Anforderung dokumentiert, an anderer Stelle, kein neuer Fund dieses ADRs). Auch keine
`tpl_`-Präfix-Entfernung selbst — drei Register (Situation, Assistent, Ereignis-Achse) bleiben
davon unabhängig für immer literal.
