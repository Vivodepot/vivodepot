# U2-ADR-314: Der Gültigkeits-Vorschlag kommt aus dem Rechtsraum — das Modul trägt die Zahl, der Kern rechnet

**Status:** Akzeptiert
**Datum:** 06.09.2026
**Betrifft:** `vivodepot.html` (`feldGueltigkeitVorschlagPruefen`,
`_rechtsraumGueltigkeitVorschlag`, `feldGueltigkeitVorschlag`),
`tests/rechtsraum-gueltigkeit-ueberlagerung.test.js`,
`tests/fixtures/rechtsraum-PRUEFFIXTURE-keine-rechtsaussage.json`

- **Status heute:** gilt — die Überlagerung greift, der Leerfall ist byte-gleich zum eingebauten
  Stand, und eine Angabe ohne Fundstelle wird verworfen. **Die eingebaute deutsche Regel bleibt
  im Kern**, und der Grund dafür ist ein Befund, kein Versäumnis (siehe unten).

---

## Der letzte Weg, der noch am Modul vorbeilief

`feldGueltigkeitVorschlag` prüfte `v.regel` gegen eine **absichtlich geschlossene** Liste:

```js
const FELD_VORSCHLAG_REGELN = Object.freeze(['ausweisdauer']);
```

Der Kommentar dort begründet die Geschlossenheit richtig: *„Ein Feld mit Marke, für das es
keine Regel gibt, bekommt KEINEN Vorschlag. Leer ist hier die richtige Antwort, nicht eine
geratene Frist."* **Die Liste schützte gegen Raten.**

Für ein zweites Land ist sie trotzdem wirkungslos: ein Modul kann einen Regel**namen**
mitbringen, aber die Rechnung dahinter steht im Kern. **Dann wäre der Rechtsraum kein
Andockpunkt, sondern ein Antragsformular an Vivodepot.**

## Die Entscheidung

**Das Modul trägt die Zahl, der Kern rechnet** — dasselbe Muster wie `fristRegel`:

```js
gueltigkeitVorschlag: { ausFeld: '…', monate: 60, quelle: '…' }
```

`monate` ist eine **Zahl, keine Kennung**: der Kern muss sie nicht kennen, um sie zu rechnen.
**Und `quelle` ist Pflicht.** Damit bleibt der Schutzzweck der geschlossenen Liste erhalten —
sie schützte gegen Raten, und eine Zahl mit Fundstelle rät nicht, sie behauptet etwas
Nachprüfbares.

Verworfen wird **benannt**, nicht verschluckt: `(ohne quelle)`, `(ohne monate)`, `(ohne
ausFeld)` — dieselbe Zusage wie bei `feldFristRegelPruefen`.

**Ein Slot, zwei Leser.** `_rechtsraumGueltigkeitVorschlag` liest aus **demselben**
`RECHTSRAUM_FRIST_UEBERLAGERUNG` wie `_rechtsraumFristRegel`, über denselben Setzer. Ein
Rechtsraum ist eine Sache; zwei Slots hießen zwei Module für denselben Rechtsraum, und beim
nächsten Umbau wird einer vergessen.

## Der Befund: die deutsche Regel passt nicht in diese Form

Der Auftrag lautete, die zehn/sechs Jahre nach `vd-de-rechtsraum.json` zu ziehen — deutsches
Recht, kein Gerüst. **Gemessen geht das nicht, und der Grund steht im Code:**

```js
return _fristPlusMonate(ausstellung, (alterBeiAusstellung < 24 ? 6 : 10) * 12) || '';
```

**Die Regel ist BEDINGT.** Sie hängt vom Alter bei Ausstellung ab, gerechnet gegen das
Geburtsdatum aus einem **anderen** Bereich. Eine einzelne `monate`-Zahl kann das nicht
ausdrücken.

**Die eingebaute Regel bleibt darum, wo sie ist.** Ein fremder Rechtsraum mit einer ebenso
bedingten Regel bräuchte eine eigene benannte Regel im Kern — **für den bedingten Fall bleibt
es beim Antragsformular, und das gehört benannt statt kaschiert.**

Eine Probe hält den Befund fest, damit er beim nächsten Anlauf nicht neu gefunden werden muss:
über 24 → zehn Jahre, unter 24 → sechs. **Wer die Regel später doch verschiebt, muss zuerst die
Bedingung abbilden — sonst verlöre eine Bürgerin unter 24 vier Jahre Gültigkeit.**

## Was bewiesen ist

```
Leerfall            ohne Modul rechnet der eingebaute Weg unverändert (2030-03-02)
Überlagerung        `monate: 60` ergibt 2025-03-02 — der Kern rechnet die Zahl des Moduls
Rückweg             nach dem Entladen wieder der eingebaute Stand
ROT  ohne quelle    verworfen, eingebauter Stand bleibt
ROT  Monatszahl     0, -12, 1.5, "60", null, 99999 — alle verworfen
Gegenprobe          eine Überlagerung unter der bloßen `feldId` greift NICHT
Positivkontrolle    der Prüfer nimmt eine vollständige Angabe wirklich an
```

**Die Positivkontrolle ist nicht Zierat:** ohne sie wären die vier Rot-Beweise auch dann grün,
wenn der Prüfer *alles* verwürfe — dann prüften sie nichts als ihre eigene Wirkungslosigkeit.

**Die Gegenprobe ist dieselbe wie bei den Fristen** und aus demselben Grund: unter den 182
UnterFeldern sind 17 IDs doppelt vergeben. Wäre der Leser gegenüber der Kennung gleichgültig,
träfen sie einander gegenseitig.

## Was ausdrücklich NICHT dazugehört

**Ein echter fremder Rechtsraum.** Die Prüf-Fixture deckt die B-Seite mit ab (`monate: 60` statt
der bedingten deutschen Regel) und nennt sich im Dateinamen als Fixture. Echtes Recht für ein
fremdes Land braucht die Produktfreigabe.

**Der hartkodierte `case 'reisepass_gueltig'`** in `_fristHinweisFuerFeld`. Er ist ein dritter,
älterer Weg zum selben Feld und bleibt unangetastet — er liefert einen Anzeige-TEXT, nicht den
Vorschlagswert. Benannt, nicht behoben.

## Die Grenze, die daraus folgt — und sie schränkt „alle Andockpunkte" ein

> **Ein Modul kann eine UNBEDINGTE Dauer mitbringen.
> Für eine BEDINGTE Regel bleibt es beim Antragsformular an Vivodepot.**

Das ist eine echte Einschränkung der Zusage, alle denkbaren Andockpunkte zu bauen, und sie
gehört benannt statt umschrieben. **Konkret:** ein Rechtsraum, dessen Ausweisdauer schlicht
„zehn Jahre" lautet, dockt heute an. Einer, dessen Regel „zehn Jahre, unter 24 aber sechs"
lautet — also der deutsche —, tut es nicht. **Die eigene Regel des Hauses passt nicht durch die
eigene Schnittstelle.**

### Was hier bewusst NICHT gebaut wurde

Eine **Bedingungssprache** für Rechtsraum-Regeln, etwa
`{ bedingung: { feld, unter, dann, sonst } }`.

Das wäre eine eigene Sprache mit eigenen Sicherheitsfragen: **ein Modul, das gegen fremde
Bereiche rechnet, ist ein anderer Gegenstand als eines, das eine Zahl mitbringt.** Die deutsche
Regel liest das Geburtsdatum aus `identitaet`, während das Feld in `mobilitaet` liegt — eine
Bedingungssprache müsste also bereichsübergreifende Lesezugriffe erlauben, und wer sie erlaubt,
muss sagen, welche.

**Diese Frage ist aufgeschrieben, nicht entschieden.** Sie gehört an einen Tisch, nicht in eine
Nachtschicht.

## Warum die halbe Ausführung die richtige war

Der Auftrag lautete, die deutsche Regel nach `vd-de-rechtsraum.json` zu ziehen. Wörtlich
ausgeführt hätte sie dort als flache Zahl gestanden — vermutlich als zehn Jahre, weil das der
häufigere Fall ist.

**Eine Bürgerin unter 24 hätte damit still vier Jahre Gültigkeit verloren.** Kein Fehler wäre
sichtbar geworden: der Vorschlag hätte funktioniert, eine Zahl geliefert und plausibel
ausgesehen. Genau die Klasse, gegen die dieses Haus seine Proben baut.

**Die Probe, die den bedingten Fall festhält, ist darum mehr wert als der Bau, der verlangt
war** — sie macht die Bedingung messbar, statt sie im Gedächtnis zu lassen.
