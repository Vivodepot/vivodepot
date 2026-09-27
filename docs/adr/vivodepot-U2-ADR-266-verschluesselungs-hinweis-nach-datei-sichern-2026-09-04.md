# U2-ADR-266: Nach dem ersten Datei-Sichern erfährt die Bürgerin, dass die Datei verschlüsselt ist

**Status:** Angenommen
**Datum:** 04.09.2026
**Kategorie:** UX, KORREKTHEIT
**Linie:** U2
**U2-Bezug:** U2-ADR-031 (Persistenz-Ehrlichkeit), U2-ADR-097 (kein Master-Key, kein
Wiederherstellungsweg) — dieser ADR erklärt der Bürgerin nur, was diese beiden bereits gebaut
haben. Wiederverwendet dieselbe Einmal-Modal-Infrastruktur wie der Rückweg-Hinweis
(„Wiedereinstieg Teil B", `vivodepot.html`, `_wiedereinstiegHinweisGezeigt`).
**Anker:** Bauauftrag, 04.09.2026, aus einer UX-Bestandsaufnahme vor dem Einfrieren — die größte
Einzellücke des dortigen Durchgangs.
**Status heute:** gilt — Beleg `tests/wiedereinstieg-app-first.test.js`.

---

## Befund — selbst gemessen, nicht übernommen

Gegen den echten Kern nachvollzogen, nicht aus dem Auftrag abgeschrieben: `depotHerunterladen()`
(via `depotInDateiSichern()`) zeigt nach einem erfolgreichen Datei-Sichern zwei Rückmeldungen —
`STRINGS.saveStatusDateiToast` ("Ihre Sicherung wurde als Datei gesichert.") und, beim ERSTEN
bewussten Sichern eines eigenen Depots, das Rückweg-Hinweis-Modal
(`wiedereinstiegHinweisZeigen()`, Titel „So kommen Sie später wieder hinein"). **Keine der beiden
Stellen erwähnt Verschlüsselung.** Der Befund aus der Fundsachen-Erhebung ist bestätigt.

## Warum das die größte Einzellücke ist

In dem Moment, in dem eine Bürgerin die Datei ablegt (Cloud, Stick, Mail-Anhang an sich selbst),
entscheidet sie, wie vorsichtig sie mit ihr umgeht — ohne die Information, die diese Entscheidung
trägt. Zwei Fehler in beide Richtungen sind sonst möglich: die Datei wie Klartext behandeln (zu
vorsichtig, am Ende keine Sicherung) oder sie für harmlos halten und das Passwort verlieren, ohne
zu wissen, dass es das einzige ist.

## Bestand geprüft, bevor ein neuer Ton erfunden wurde

Mehrere bestehende Sätze behandeln dieselbe Aussage bereits, an anderen Stellen im Ablauf:

- `modalAnlegenPwWarnung` (beim Passwort-Setzen): „Dieses Passwort verschlüsselt Ihr Vivodepot.
  Niemand kann es zurücksetzen — auch wir nicht. Genau das schützt Ihre Daten."
- `schnellstartSchritt2` (Schnellstart-Anleitung): „Setzen Sie ein Passwort. Es verschlüsselt Ihre
  Datei; ohne dieses Passwort lässt sich die Datei später nicht mehr öffnen — auch nicht von uns."
- `exportJsonHinweis` (Gegenbeispiel, unverschlüsselter Export): „Diese Datei ist NICHT
  verschlüsselt; bewahren Sie sie sicher auf..." — bestätigt im Umkehrschluss, dass die reguläre
  `.vivodepot`-Datei aus `depotInDateiSichern()` verschlüsselt ist (derselbe Krypto-Pfad wie beim
  Anlegen, keine zweite Form).

**Der neue Text übernimmt den etablierten Ton wörtlich**, statt eine neue Formulierung zu
erfinden — „Niemand kann es zurücksetzen" und „auch nicht von uns" stammen direkt aus den beiden
Sätzen oben, nur auf den Sicherungs- statt den Anlege-Moment übertragen.

## Entscheidung

**Wortlaut (neue STRINGS-Kennung `dateiVerschluesselungHinweisText`):**

> „Diese Datei ist verschlüsselt und darf abgelegt werden, wo Dateien liegen — in einer Cloud,
> auf einem Stick, im Mail-Anhang an sich selbst. Ihr Passwort ist der einzige Schlüssel dazu;
> niemand kann es zurücksetzen, auch wir nicht."

Zwei Sätze, keine Zahl, kein Verfahrensname, kein Ausrufezeichen — geprüft gegen die
Wortlaut-Auflagen des Auftrags. Faktisch geprüft, nicht nur behauptet: kein Master-Key, kein
Wiederherstellungsweg existiert (U2-ADR-097 §3, Wächter G12/G13, weiterhin grün) — der Satz „auch
wir nicht" verspricht damit nichts, was nicht gilt.

**Ort: derselbe Moment wie der bestehende Rückweg-Hinweis, als zweiter Absatz im selben Modal —
kein eigenes, zweites Modal.**

Geprüft, nicht angenommen: ein Toast (wie `saveStatusDateiToast`) ist zu kurzlebig für einen Satz,
den man wirklich lesen soll — und würde bei jedem Sichern erscheinen, seit Speicher-Modell Stück 3
(03.09.2026) geht JEDER Sichern-Klick über die Datei, nicht mehr selten. Ein zweites, eigenes
Einmal-Modal direkt nach dem ersten hätte das bestehende `wiedereinstiegHinweisZeigen()` beim
zweiten `ui.modal()`-Aufruf lautlos überschrieben (derselbe Mechanismus, den der Kommentar bei
`migrationsHinweisZeigen()` für genau diesen Fall dokumentiert) — eine eigene Warteschlangen-Logik
dafür zu bauen wäre ein größerer, riskanterer Eingriff gewesen als nötig. **Ein zweiter `<p>` im
bestehenden Modal löst beides:** ein Moment, eine Bestätigung, kein Kollisionsrisiko.

**„Nur beim ersten Mal" — bewusste Entscheidung, kein Standardfall, hier begründet:** Der
Verschlüsselungs-Fakt ändert sich für ein Depot nie; ihn bei jedem der jetzt häufigen
Sichern-Klicks zu wiederholen, wäre nach kurzer Zeit genau die Belästigung, vor der der Auftrag
warnt. **Gemerkt wird „das erste Mal" über dieselbe, bereits gebaute und geprüfte Markierung**
(`data._wiedereinstiegHinweisGezeigt`) — kein neues Feld, keine neue Speicherstelle. Dieselbe
Rollback-Logik gilt automatisch mit: schlägt das erste Sichern fehl (Abbruch, unbestätigter
Download), bleibt die Markierung `false`, und der Hinweis — beide Absätze zusammen — bleibt
fällig, bis ein echtes erstes Sichern durchgeht.

**Bewusst nicht geändert:** der Titel des Modals („So kommen Sie später wieder hinein") bleibt,
wie er ist — er beschreibt weiterhin zutreffend den ersten, primären Absatz; ein zweiter, kurzer
Absatz zu einem verwandten Thema („was Sie über diese Datei wissen sollten") braucht keinen
eigenen, umständlicheren Titel.

## Konsequenzen

Eine Bürgerin, die zum ersten Mal bewusst ihr Depot als Datei sichert, erfährt im selben Moment,
in dem sie den Rückweg lernt, auch, dass die Datei verschlüsselt ist und ihr Passwort der einzige
Schlüssel dazu ist. Jedes weitere Sichern bleibt unverändert kurz (nur der bestehende Toast) —
keine neue, wiederkehrende Unterbrechung.

**Offen, nicht Teil dieser ADR:** ob dieselbe Aussage auch beim Anlegen selbst (vor dem ersten
Sichern) sinnvoll wäre — `modalAnlegenPwWarnung` deckt dort bereits einen sehr ähnlichen Satz ab,
am Passwort-Moment, nicht am Datei-Moment. Beide Momente zusammenzulegen war nicht Teil des
Auftrags und hier nicht geprüft.

## Konformität

```konformitaet
aussage:   nach dem ersten bewussten Datei-Sichern zeigt das Rückweg-Hinweis-Modal einen zweiten
           Absatz (#datei-verschluesselung-hinweis), der erklärt, dass die Datei verschlüsselt
           ist und das Passwort der einzige Schlüssel dazu ist; bei jedem weiteren Sichern
           bleibt der Hinweis aus.
zustand:   prüfbar
pruefung:  tests/wiedereinstieg-app-first.test.js#WE-B9: der Verschlüsselungs-Hinweis ist in dasselbe Modal verdrahtet wie der Rückweg-Hinweis (ein Aufruf, zwei Absätze)
quelle:    fund
```

---
*Vivodepot GmbH · Berlin · U2-ADR-266 · 04.09.2026*
