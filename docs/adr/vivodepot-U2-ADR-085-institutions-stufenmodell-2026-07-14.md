# U2-ADR-085 · Institutions-Stufenmodell — Stufe 1 (QR-Scan) gestrichen

**Datum:** 14.07.2026
**Status:** Gilt (bereinigt 25.09.2026)
**Betrifft:** U2-ADR-082 (teil-superseded, siehe §5) · U2-ADR-077 (unberührt) · Lese-App · Bereichs-Export
**Status heute:** gilt — Stufe 1 bleibt gestrichen, kein `flowBereichQr`/Bereichs-QR-Erzeuger mehr im
Code (grep negativ); die drei in §4 genannten Folgearbeiten wurden für diese Statuszeile nicht erneut
einzeln geprüft.

---

## 1 · Kontext

Es existiert seit dem 08.07.2026 ein **Institutions-Stufenmodell** als freigegebenes Konzept
(§7 des Journey-Konzeptdokuments, in einem Chat-Artefakt, **nie in die ADR-Reihe überführt**):

| Stufe | Was die Institution tut | Was sie braucht |
|---|---|---|
| 0 · Papier | Liest den Ausdruck, überträgt händisch ins Fachsystem. | Nichts. |
| 1 · Scannen | Scannt den QR mit der Lese-App auf einem beliebigen Gerät. | Ein Gerät mit Browser. |
| 2 · Datei | Liest die Export-Datei an einem Quarantäne-Gerät. | Lese-App **mit Datei-Eingang**. |
| 3 · System | Übernimmt maschinell ins Fachsystem. | Systemanbindung. |

Stufe 2 war dort bereits als Lücke markiert und in den aktuellen Scope
hochgestuft, weil jeder Pilotpartner sie braucht.

**Dass dieses Modell nirgends in `docs/adr/` steht, ist der eigentliche Anlass dieser ADR.**
Eine getroffene Entscheidung, die nur in einem Chat lebt, bindet niemanden — nicht die,
die am Code arbeiten, nicht externe Contributor, nicht einen Prüfer.

### Der Befund vom 14.07.2026

Der Bereichs-QR (`flowBereichQr`, `bereichQrText`, `bereichQrModell`) erzeugte für jeden
Bereich — einschließlich Gesundheit — einen QR mit **unverschlüsseltem Klartext-Rahmen**
(`VDQR|gid|i/n|payload`). Am Gerät bewiesen: Die native iOS-Kamera reicht diesen Text an
eine **Websuche** weiter und bietet kein Kopieren an. Damit floss Gesundheitsklartext an
einen Dritten, den die Bürgerin nicht gewählt hat.

Der Pfad lag **live** im öffentlichen Harness-Deployment.

Er wurde am 14.07. ersatzlos entfernt (cleanslate `60b0cb1`, Harness *(nicht mehr auflösbar — Historien-Umschreibung 2026, ADR-Datum 14.07.2026)*),
Spiegel zur PDF-QR-Sofortmaßnahme (13.07.2026, U2-ADR-077-Nachtrag). Damit gibt es **keinen erreichbaren Sektor-Daten-QR-Erzeuger**
mehr in der Bürger-App. Erreichbar bleiben nur zwei Erzeuger derselben Notfall-Kontakt-vCard
(ADR-077, keine Gesundheitsdaten) sowie der EUDIW-Wallet-QR hinter `EUDIW_SICHTBAR = false`.

**Stufe 1 hat damit keinen Erzeuger mehr. Die Sprosse ist leer.**

---

## 2 · Entscheidung

**Stufe 1 wird gestrichen. Sie kehrt nicht zurück.**

Der Bereichs-QR wird nicht wiederhergestellt — weder verschlüsselt, noch mit geändertem
Payload-Format, noch auf Art.-9-Bereiche beschränkt.

**Der Datei-Eingang der Lese-App (Stufe 2) trägt den Institutionsfall.** Er ist die einzige
Anbindung unterhalb der Systemintegration.

Das Stufenmodell lautet ab sofort:

| Stufe | Was die Institution tut | Status |
|---|---|---|
| 0 · Papier | Liest den Ausdruck, überträgt händisch. | Bestand |
| 1 · ~~Scannen~~ | — | **gestrichen, 14.07.2026** |
| 2 · Datei | Öffnet die Export-Datei in der Lese-App. | **Lücke — nächster Bau** |
| 3 · System | Übernimmt maschinell. | offen |

---

## 3 · Begründung

Die Sicherheit des QR-Wegs hängt daran, dass der Empfänger die **Lese-App-Kamera** benutzt
und nicht die Kamera-App, die er ohnehin geöffnet hat. Vivodepot kann das nicht durchsetzen
und nicht prüfen. Ein Übergabeweg, dessen Sicherheit von der Disziplin des Empfängers
abhängt, ist kein Übergabeweg.

Der Datei-Eingang hat diese Eigenschaft nicht: Wer eine Datei in die Lese-App zieht,
hat sie in die Lese-App gezogen.

Die öffentliche Zusage „jeder normale QR-Scanner genügt" war bereits am 08.07. als
unhaltbar befundet. Mit dieser Entscheidung entfällt sie ersatzlos, statt repariert zu werden.

---

## 4 · Konsequenzen

**Positiv.** Kein Klartext-Abfluss an Dritte über die native Kamera — die Klasse ist
geschlossen, nicht gemildert. Ein Übergabeweg statt zwei halben. Die Lese-App bekommt
einen einzigen, prüfbaren Eingang.

**Negativ, und ehrlich zu nennen.** Die niedrigste Institutions-Schwelle fällt. Das Argument
„Sie brauchen nichts außer einem Handy" ist weg. Getroffen sind genau die kleinen Praxen,
für die Stufe 1 gedacht war. Bis der Datei-Eingang gebaut ist, gibt es **keine** Anbindung
unterhalb von Papier — dieser Zustand ist jetzt, nicht in der Zukunft.

**Zwingende Folgearbeit (blockiert nichts, aber gehört in denselben Zug):**

1. `erkenneFormat` in der Lese-App kennt nur Voll-Depot, Blackbox und Klartext-Depot.
   Ein **einzelner Bereichs-Export** (SD-JWT-VC, FHIR-IPS-JSON) landet heute als „unbekannt".
   Das ist die Stufe-2-Lücke, konkret benannt.
2. Website und PDF-Texte: jede Zusage streichen, die einen QR-Scan durch die Institution
   verspricht (`institutionen.html`, `org.html`, Export-PDF-Fußzeilen).
3. `qrTeileZusammensetzen` hat **null Aufrufer im Produktivcode** und wird nur von Tests
   am Leben gehalten. Toter Code plus grüne Tests, die eine ungenutzte Fähigkeit bezeugen.
   Streichen oder begründen.

---

## 5 · Verhältnis zu U2-ADR-082

U2-ADR-082 trägt drei Entscheidungen. Zwei davon sind gegenstandslos, eine bleibt in Kraft.

**Entscheidung 2 (Nutzlastformen der Lese-App) — vollständig superseded, 14.07.2026.**
Sie nennt genau zwei Formen, `vivodepot-pdf` und `vivodepot-bereich`. Beide Erzeuger sind
entfernt (PDF-QR- bzw. Bereich-QR-Sofortmaßnahme). Die Entscheidung hat keinen Gegenstand mehr. Der EUDIW-QR war
dort ausdrücklich ausgeschlossen und bleibt es.

**Entscheidung 3 (Kamera-Bau in der Lese-App, `getUserMedia`) — vollständig superseded, 14.07.2026.**
Ihre einzige Begründung war, die beiden Formen aus Entscheidung 2 lesbar zu machen. Beide
Zwecke sind weg. Der Kamera-Pfad ist damit toter Code **mit Geräte-Berechtigung** — eine
eigene Klasse. Er wird entfernt oder neu begründet, im selben Zug wie `qrTeileZusammensetzen`.
Nicht liegenlassen: Er fällt im externen Krypto-Review als Erstes auf.

**Entscheidung 1 (proprietäres Pipe-Rahmenformat) — bleibt in Kraft, mit Vorbehalt.**
Der Rahmen wird noch vom EUDIW-Pfad benutzt (`qrTeilePacken`, hinter `EUDIW_SICHTBAR = false`).

> **Offener Punkt, nicht hier entschieden:** Entscheidung 1 rechtfertigt das proprietäre
> Format wörtlich damit, dass der Empfänger immer die Lese-App sei. Für EUDIW gilt das
> nicht — dort ist der Empfänger eine fremde Wallet. Der EUDIW-Pfad benutzt den Rahmen also
> auf einer Prämisse, die nie für ihn aufgestellt wurde; er greift lediglich auf dieselbe
> Hilfsfunktion zu. Das ist heute folgenlos, weil der Pfad ausgeblendet ist. **Bei
> Reaktivierung von EUDIW ist es die erste zu klärende Frage** — vor jedem Bau. Eintrag in
> interne Liste offener Punkte, Rubrik *Beobachten*.

---

## 6 · Verworfene Alternativen

**Payload-Format ändern.** Löst nichts. Jeder Klartext, in welchem Rahmen auch immer,
landet bei der nativen Kamera in der Suche.

**QR nur für nicht-sensible Bereiche sperren.** Halbfix. Er behauptet, Finanzen, Identität
und Vorsorge seien unkritisch — eine Aussage über Sensibilität, die Vivodepot nicht treffen will.

**QR verschlüsseln.** Verschiebt das Problem auf den Schlüssel: Ein zweiter QR oder ein
abgetipptes Passwort am Tresen zerstört die Niedrigschwelligkeit, die der QR erst rechtfertigte.

**Harness offline nehmen.** Verworfen am 14.07. Der Code liegt öffentlich im Repo, unabhängig
vom Deployment; ein passiver Abfluss existiert nicht. Der Rückzug hätte die einzige
On-Device-Verifikationsschicht gekostet und nichts gekauft.

---

## 7 · Validierung

- Kein `window.qrcode(`-Aufruf in der Bürger-App trägt Sektor- oder Depot-Inhalt.
  (Stand 14.07.: drei Fundstellen — zwei Notfall-vCard, eine EUDIW hinter Flag.)
- Der Datei-Eingang der Lese-App nimmt einen einzelnen Bereichs-Export an und rendert ihn.
  **Abnahme am Gerät, nicht in node.**
- Keine öffentliche Zusage mehr, die einen Institutions-QR-Scan verspricht.

---

## 8 · Methodischer Nachtrag

Das Stufenmodell galt sechs Tage lang als entschieden, ohne in einem bindenden Dokument
zu stehen. Eine Repo-Suche fand es nicht — korrekt, denn es war nicht dort.

**Regel:** Eine Entscheidung, die in einem Chat getroffen und in einem Chat-Artefakt
festgehalten wird, ist nicht getroffen, bevor sie in `docs/adr/` steht.
Das ist die menschliche Variante von Declared ≠ Verified.

---

*Vivodepot GmbH · Berlin · 14.07.2026*
