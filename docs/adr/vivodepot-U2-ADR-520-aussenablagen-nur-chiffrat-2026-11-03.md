# U2-ADR-520 — Bei einem Dritten liegt nur Chiffrat, auch das Verzeichnis

**Status:** Angenommen (03.11.2026)
**Datum:** 2026-11-03
**Kategorie:** SICHERHEIT, NETZ, DATENSCHUTZ
**Linie:** U2
**Bezug:** U2-ADR-512 (Pod-Anbindung über die Brückenseite) · U2-ADR-512-Nachtrag Stufe 2 (25.10.2026) · U2-ADR-512-Nachtrag
Verzeichnis im eigenen Pod (29.10.2026), dessen Nr. 3 diese Entscheidung ersetzt · U2-ADR-501 (Antwort-Seed)

**Status heute:** gilt für den Kern, den Schreibweg und die Brücke. Seit der Anpassung der Brücke (04.11.2026, Befund
POD-VERZEICHNIS-KLARTEXT geschlossen) schreibt sie nur über `pod/aussenablage.js`; das Verzeichnis liegt im Pod als v1.jose, die Ablaufliste als a1.json, beide im
Ordner vivodepot/k/. Ohne Kern (Datei-Weg, Herkunft 'null') liest und schreibt die Brücke die Kopie nicht. Nachgezogen am
04.11.2026 nach der Quellenprüfung der Datenschutzerklärung: Ohne Grant-Dienst legt die Brücke keinen Grant im Pod ab (er stand
im Klartext unter grants/), und die Ordner sind neutral (alle Ablagen in vivodepot/d/); Ablagen aus den alten Ordnern nimmt sie
weiter zurück. Die Art einer Ablage bleibt an ihrer Zugriffsregel ablesbar (öffentlich oder eine WebID); das gibt Solid vor.

---

## Anlass

Was Vivodepot bei einem Dritten ablegt, im Pod der Person oder bei einem Ablage-Dienst, soll dort nur verschlüsselt liegen. Für
die Dateien selbst galt das schon (U2-ADR-512 Nr. 3, `pod/chiffrat-pruefen.js`). Nicht für das, was um sie herum entsteht: Die
Kopie des Verzeichnisses nach dem Nachtrag vom 29.10.2026 liegt im Klartext im Pod, mit Art, Stelle, Ablauf, Zeitpunkt und
Grant je Ablage. Der Betreiber des Pods sieht damit, wem die Person wann etwas gegeben hat. Und keine Stelle im Code entschied
vor dem Schreiben, ob ein Körper das Gerät verlassen darf.

Weg zum Nachsehen: `grep -n "method: 'PUT'\|method: 'POST'" pod/*.js`.

## Entscheidung

1. **Ein Schreibweg.** In `pod/` und `share/` schreibt nur `pod/aussenablage.js` mit Körper nach außen (`schreiben`). Er nimmt
   PUT und POST an eine https-Adresse und prüft den Körper, bevor eine Anfrage abgeht. Angenommen wird Chiffrat in den Formen von
   `pod/chiffrat-pruefen.js` oder einer der Klartexte aus Nr. 3. Alles andere weist er mit `aussenablage:<grund>` ab. Andere
   Schreibstellen stehen in einer Positivliste mit Grund: die Anmeldung (Registrierung, Token-Anfrage), der Transport
   `podFetch`, der Methode und Körper nur durchreicht, und der Abruf nach SMART Health Links in `share/`, der nichts ablegt.
2. **Das Verzeichnis verschlüsselt der Kern.** Die Brücke kennt keinen Schlüssel und bekommt keinen. Während eines Pod-Auftrags
   bittet sie den Kern, ihre Kopie zu öffnen (`vd-pod-verzeichnis-oeffnen`) oder zu verschließen
   (`vd-pod-verzeichnis-schliessen`). Der Kern antwortet nur nach dem Auftrag, nur dem Fenster und der Herkunft des Auftrags, nur
   mit dessen `id`, nur auf Nachrichten mit genau den Feldern der Bitte und höchstens 24-mal je Auftrag.
   - **Schlüssel:** HKDF-SHA-256 aus dem Seed im Depot (U2-ADR-501), Info `vivodepot/aussenablage-verzeichnis/v1`. Der Seed ist
     zufällig, liegt verschlüsselt im Depot, bleibt beim Passwortwechsel gleich und reist mit der Depot-Datei auf ein zweites
     Gerät. Die eigene Info trennt den Schlüssel von jeder anderen Ableitung aus demselben Seed. Die Bytes des Seeds und des
     Schlüssels werden nach Gebrauch überschrieben.
   - **Hülle:** kompakte JWE, `alg` `dir`, `enc` `A256GCM`, `typ` `vivodepot-verzeichnis+jwe`; der geschützte Kopf ist AAD.
     `pod/chiffrat-pruefen.js` kennt sie als vierte Form („verzeichnis“).
   - **Inhalt:** `{ fassung: 1, ablagen: [...] }`, je Eintrag genau `adresse`, `art`, `stelle`, `bis`, `am`, `grant`,
     `ueberDienst`. Der Kern prüft die Liste beim Verschließen und beim Öffnen; eine Liste mit fremdem Feld weist er ab.
   - **Im Sub-Kontext** antwortet der Kern `nicht-verfuegbar`: Die Brücke gehört der Person, nicht dem vertretenen Depot.
3. **Was im Klartext bleibt, und warum.**
   - Die WAC-Regel (`.acl`): Der Pod setzt den Zugriff nur über sie durch. Bei einer Ablage für eine Stelle steht darum deren WebID
     darin. Die Person wählt je Ablage: für eine Stelle (der Pod prüft, der Betreiber sieht die Stelle) oder als Freigabe-Link
     (der Betreiber sieht keine Stelle, öffnen kann jeder mit dem Link). Angenommen werden nur die drei Regelformen der Brücke.
   - Der Grant an den Dienst des Pods und an die Inbox der Stelle, nur mit POST: Der Dienst wertet ihn aus, die Stelle ist die
     Empfängerin. Nur die Felder aus `pod/lws.js` `grantBauen`; ein Zweck nur als https-Adresse. Als Datei im Pod liegt er nicht;
     seine Angaben stehen im verschlüsselten Verzeichnis (Feld `grant`). Der Schreibweg `pod/aussenablage.js` weist einen Grant per
     PUT und einen Grant in den Ordner `vivodepot/` der Brücke vor dem Netz ab.
   - Die Ablaufliste `{ fassung: 1, ablagen: [{ adresse, bis }] }` unter einem neutralen Namen: Mit ihr löscht die Brücke
     Abgelaufenes, ohne dass das Depot offen ist. Sie trägt nur Ablagen mit Ablauf, ohne Art, Stelle, Zweck und Grant.
     Ohne geöffnetes Depot kennt die Brücke darum den Grant einer abgelaufenen Ablage nicht. Er fällt beim nächsten Abgleich
     mit dem Kern; bis dahin endet der Zugriff über das `bis` im Grant und die gelöschte Ressource (entschieden 04.11.2026).
   - Neben dem Chiffrat einer Depot-Datei (eigene Sicherung, Ausschnitt für eine Stelle) nur: `pbkdf2`, `depotSalt` und
     `kryptoVersion`, die Parameter der Ableitung, ohne Angaben über die Person; ohne sie lässt sich nichts öffnen. Dazu
     `depotUUID`, eine zufällige Kennung und Teil der AAD des Wiederherstellungs-Codes. `iv`, `ct`, `einheiten`,
     `umschlagTabelle` und `wiederherstellung` sind selbst Chiffrat. Der Ort-Hinweis für Angehörige (`angehoerigenOrt`) und die
     Zeitpunkte des eigenen Stands (`stand_marke`, `gespeichert_am`) bleiben in der Datei auf dem eigenen Gerät. Der Kern
     schreibt die Hülle aus einer Positivliste (`AUSSENABLAGE_HUELLE_FELDER`), `pod/chiffrat-pruefen.js` prüft dieselbe Liste.
   - Im Kopf einer JWE nur die Angaben zum Verfahren und `typ`/`cty`; bei der Antwort dazu `vorgang`, eine zufällige Kennung der
     Anfrage, die in `apv` an die Schlüsselvereinbarung gebunden ist und die die Stelle vor dem Entschlüsseln braucht. Die
     Kennung der Stelle steht nicht im Kopf. In der signierten Antwort steht sie als `aud` im Chiffrat.
   - Container ohne Körper, Adressen, Größen und Zeitpunkte: Sie entstehen beim Speichern selbst.

   Mehr Klartext gibt es nicht.
4. **Ein Wächter.** Eine Probe liest jede Datei in `pod/` und `share/` und findet jede Schreibstelle außerhalb von
   `aussenablage.js`, die nicht auf der Positivliste steht. Eine neue Datei ist ohne Eintrag erfasst.
5. **postMessage des Kerns.** Die Positivliste aus dem Nachtrag Stufe 2 bekommt einen dritten Eintrag: die Antwort auf eine Bitte
   um das Verzeichnis, an die feste Herkunft der Brücke. Sie trägt beim Verschließen nur das Chiffrat; beim Öffnen die Liste der
   Ablagen mit genau den Verzeichnisfeldern, also die Angaben, die die Brücke selbst geschrieben hat, auf demselben Gerät. Einen
   anderen Inhalt des Depots und den Schlüssel trägt sie nie. In `pod/` gibt es keine Ableitung und keine Entschlüsselung.

Damit ist Nr. 3 des Nachtrags vom 29.10.2026 („Unverschlüsselt“) ersetzt. Dort war eine Verschlüsselung verworfen, weil die
Brücke dafür einen Schlüssel bräuchte. Hier bekommt sie keinen: Der Schlüssel bleibt im Kern.

## Grenzen

- **Ohne geöffnetes Depot** kann die Brücke die Kopie nicht lesen. Abgelaufenes löscht sie weiter über die Ablaufliste.
  Zurücknehmen und die Übersicht der Ablagen auf einem zweiten Gerät brauchen das Depot dort.
- **Ein anderes Depot** öffnet die Kopie nicht (`unlesbar`); die Brücke lässt sie dann unverändert.
- **Der Betreiber sieht weiter** Größe und Zeitpunkt jeder Datei, die Adressen, die Ablaufdaten aus der Ablaufliste und bei einer
  Ablage für eine Stelle deren WebID. Den Inhalt der Dateien und das Verzeichnis sieht er nicht.
- **Der Ort-Hinweis für Angehörige** fehlt in der Kopie im Pod. Er entsteht beim Speichern neu aus dem Depot
  (`angehoerigen_passwort_ort`, im Chiffrat) und steht weiter in der Datei auf dem eigenen Gerät. Die eigene Sicherung im Pod
  kann nur die Person selbst öffnen (WAC-Regel `eigen`). Für Angehörige ändert sich damit nichts.
- **Ohne Kern** (Datei-Weg, nach dem Auftrag, Brücke von einem Kern mit Herkunft 'null') bittet die Brücke nicht um das
  Verzeichnis: bei 'null' ginge die Liste an '*'. Es bleiben das lokale Verzeichnis und die Ablaufliste. Was so entsteht, kommt beim nächsten Auftrag mit Kern ins Verzeichnis.
- **Nextcloud und der Ablage-Dienst** folgen in eigenen Schritten; für sie gilt Nr. 1 erst, wenn ihr Schreibweg über
  `aussenablage.js` läuft.

## Erwogen und verworfen

- **Schlüssel in der Brücke** (aus dem DPoP-Schlüssel oder einem eigenen Passwort): Der DPoP-Schlüssel endet mit dem Abmelden;
  ein eigenes Passwort wäre ein zweites Geheimnis neben dem Depot.
- **Schlüssel aus dem Depot-Passwort:** Er wechselte mit jedem Passwortwechsel; der Seed bleibt.
- **Ein neues Feld im Depot:** Der Seed besteht schon und wird gesichert; ein zweites Feld brauchte eine Schemaänderung ohne Gewinn.
- **Ablaufliste mit Stelle oder Art:** Für das Löschen nach Ablauf reichen Adresse und Ablauf.

```yaml
konformitaet:
  - aussage: >-
      In pod/ und share/ schreibt außer pod/aussenablage.js und der Positivliste mit Grund nichts mit Körper nach außen; jede Datei
      der Ordner wird gelesen, und jeder Eintrag der Positivliste hat seine Fundstelle.
    zustand: erfuellt
    herkunft: U2-ADR-520 Nr. 1 und 4 (03.11.2026)
    pruefung:
      - tests/aussenablage-einziger-weg.test.js "[Außenablage·ein Weg] außerhalb von aussenablage.js und der Brücke schreibt nichts mit Körper nach außen; POSITIV ist aktuell"
      - tests/aussenablage-einziger-weg.test.js "[Außenablage·ein Weg·Rot-Beweis] PUT mit JSON vorbei an aussenablage.js, POST außerhalb der erlaubten Funktion, Methode aus Variable, sendBeacon"
  - aussage: >-
      aussenablage.js lässt Chiffrat und die vier Klartexte in ihrer Form hinaus und weist alles andere ab, bevor eine Anfrage
      abgeht; eine Ablaufliste mit Stelle und das bisherige Klartext-Verzeichnis werden abgewiesen.
    zustand: erfuellt
    herkunft: U2-ADR-520 Nr. 1 und 3 (03.11.2026)
    pruefung:
      - tests/aussenablage-schreibweg.test.js "[Außenablage] die vier Klartexte in ihrer Form"
      - tests/aussenablage-schreibweg.test.js "[Außenablage·Rot-Beweis] Ablaufliste mit stelle, das Klartext-Verzeichnis und anderer Klartext werden abgewiesen"
      - tests/aussenablage-schreibweg.test.js "[Außenablage·Rot-Beweis] abgewiesen wird, bevor etwas abgeht"
  - aussage: >-
      Bei einem Dritten steht neben dem Chiffrat nur, was Nr. 3 aufzählt: die Hülle einer Depot-Datei aus der Positivliste, ohne
      Ort-Hinweis und ohne Zeitpunkte; der Kopf einer Antwort ohne Kennung der Stelle.
    zustand: erfuellt
    herkunft: U2-ADR-520 Nr. 3 (04.11.2026), Befund KLARTEXT-NEBEN-CHIFFRAT
    pruefung:
      - tests/aussenablage-klartext-positivliste.test.js "[Außenablage·Klartext] die Hülle im Pod trägt genau die Felder der Positivliste, Kern und Brücke halten dieselbe Liste"
      - tests/aussenablage-klartext-positivliste.test.js "[Außenablage·Klartext·Rot-Beweis] ein zusätzliches Feld in der Hülle und anbieter im Kopf der Antwort werden vor dem Netz abgewiesen"
  - aussage: >-
      Der Kern verschlüsselt das Verzeichnis mit einem Schlüssel aus dem Seed im Depot; dasselbe Depot öffnet es, ein anderes
      nicht, ein verändertes Chiffrat oder ein umgeschriebener Kopf auch nicht; hinein und hinaus geht nur die Liste mit genau
      den Verzeichnisfeldern.
    zustand: erfuellt
    herkunft: U2-ADR-520 Nr. 2 (03.11.2026)
    pruefung:
      - tests/aussenablage-verzeichnis-kern.test.js "[Verzeichnis·Kern] hin und zurück; das Chiffrat besteht die Tür der Brücke und trägt nichts im Klartext"
      - tests/aussenablage-verzeichnis-kern.test.js "[Verzeichnis·Kern·Rot-Beweis] anderes Depot, gekipptes Byte und umgeschriebener Kopf öffnen nicht"
      - tests/aussenablage-verzeichnis-kern.test.js "[Verzeichnis·Kern·Rot-Beweis] nur Listen mit genau den Verzeichnisfeldern"
      - tests/aussenablage-einziger-weg.test.js "[Außenablage·ohne Schlüssel] die Brücke leitet keinen Schlüssel ab und entschlüsselt nichts; den Schlüssel des Verzeichnisses kennt nur der Kern"
      - tests/hkdf-domaenen-verschluesselung-signatur.test.js "[HKDF·Domänen·Bauart] jede HKDF-Ableitung steht in einer benannten Funktion mit genau einer Info-Konstante; die Konstanten sind präfixfrei, Verschlüsselung und Signatur getrennt"
  - aussage: >-
      Der Kern beantwortet Bitten der Brücke nur während des Auftrags, nur mit dessen id, nur auf Nachrichten mit genau den Feldern
      der Bitte, höchstens 24-mal und nur an die feste Herkunft; im Sub-Kontext gibt es das Verzeichnis nicht.
    zustand: erfuellt
    herkunft: U2-ADR-520 Nr. 2 und 5 (03.11.2026)
    pruefung:
      - tests/aussenablage-verzeichnis-kern.test.js "[Verzeichnis·Kern·Protokoll] Bitten nur mit der id des Auftrags, nur mit ihren Feldern, nur bis zur Höchstzahl"
      - tests/aussenablage-verzeichnis-kern.test.js "[Verzeichnis·Kern·Protokoll] vor „bereit“ keine Antwort"
      - tests/aussenablage-verzeichnis-kern.test.js "[Verzeichnis·Kern] im Sub-Kontext gibt es das Verzeichnis nicht"
      - tests/aussenablage-verzeichnis-kern.test.js "[Verzeichnis·Kern·G2] über die Antwort an die Brücke geht nur das Chiffrat oder die Liste der Ablagen, kein Inhalt des Depots"
  - aussage: >-
      Die Brücke schreibt nur über aussenablage.js; die Kopie des Verzeichnisses liegt im Pod nur als Chiffrat, die Ablaufliste
      nur mit Adresse und Ablauf.
    zustand: erfuellt
    herkunft: U2-ADR-520 Nr. 1 bis 3 (03.11.2026), Befund POD-VERZEICHNIS-KLARTEXT (geschlossen 04.11.2026)
    pruefung:
      - tests/aussenablage-einziger-weg.test.js "[Außenablage·ein Weg] bruecke.js schreibt nur über aussenablage.js"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] mit Kern: im Pod liegen das Verzeichnis als Chiffrat und die Ablaufliste, nach der Regel, ohne Klartext"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] ohne Kern: keine Bitte, kein Lesen der Kopie; Abgelaufenes über die Ablaufliste, danach mit Kern abgeglichen"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] schriebe die Brücke die Liste statt des Chiffrats, wiese der Schreibweg sie ab"
  - aussage: >-
      Ohne Grant-Dienst liegt kein Grant im Pod, und kein Pfad nennt Art oder Stelle einer Ablage; Ablagen aus den Ordnern früherer
      Fassungen nimmt die Brücke weiter zurück, samt altem Grant-Eintrag.
    zustand: erfuellt
    herkunft: U2-ADR-520 Nr. 3, Quellenprüfung der Datenschutzerklärung Ziffer 7b (04.11.2026)
    pruefung:
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] ohne Grant-Dienst liegt kein Grant im Pod: kein Grant-Eintrag, kein Körper im Klartext mit der Stelle"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] legte die Brücke den Grant ohne Dienst im Pod ab, fände die Probe ihn"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] neutrale Ordner: keine Schreibadresse nennt Art oder Stelle, alle Ablagen liegen im selben Ordner"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] mit den sprechenden Ordnern früherer Fassungen fiele die Ordner-Probe"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] eine Ablage aus einem alten Ordner samt altem Grant-Eintrag nimmt die Brücke weiter zurück"
  - aussage: >-
      Ein Grant geht nur mit POST hinaus und nie in den Ordner vivodepot/ der Brücke; einen Grant per PUT oder in diesen Ordner weist
      der Schreibweg vor dem Netz ab.
    zustand: erfuellt
    herkunft: U2-ADR-520 Nr. 3 (04.11.2026)
    pruefung:
      - tests/aussenablage-klartext-positivliste.test.js "[Außenablage·Grant·Rot-Beweis] ein Grant per PUT oder in den Ordner der Brücke wird vor dem Netz abgewiesen, per POST an den Dienst geht er"
  - aussage: >-
      Wählt die Person „Nicht ablegen“, schreibt die Brücke nichts in den Pod; Verzeichnis und Ablaufliste bleiben, wie sie sind.
      Abgleich und Schreiben der Kopie kommen erst nach „Ablegen“. Abgelaufene Ablagen samt Grant entfernt sie trotzdem nicht
      später: beim Bestätigen aus dem lokalen Verzeichnis und der Ablaufliste, beim Eintreffen des Auftrags aus der Kopie und der
      Ablaufliste, nur im bestätigten Speicher. Den Grant eines Eintrags, den nur die Ablaufliste nennt, kennt die Brücke dann nicht;
      sie entfernt ihn beim nächsten Abgleich mit der Kopie. Was die Kopie kennt, zeigt die Brücke beim Eintreffen zum Zurücknehmen,
      auch in einem anderen Browser und auch bei „Nicht ablegen“; übernommen wird es nur ins Verzeichnis dieses Browsers. In den Pod
      schreibt erst ein Klick auf „Zurücknehmen“.
    zustand: erfuellt
    herkunft: Entscheidung vom 04.11.2026 nach der Quellenprüfung der Datenschutzerklärung Ziffer 7b
    pruefung:
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] Auftrag kommt, „Nicht ablegen“: die Brücke schreibt nichts in den Pod, Verzeichnis und Ablaufliste bleiben"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] glich die Brücke schon beim Eintreffen des Auftrags ab, schriebe sie das Verzeichnis trotz „Nicht ablegen“"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] Auftrag kommt, „Nicht ablegen“: beim Bestätigen entfernt die Ablaufliste die abgelaufene Ablage samt Grant trotzdem"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] nähme die Rücknahme den Grant nicht mit, bliebe er nach dem Bestätigen stehen"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] Grant nur in der Kopie (leerer Browser): beim Eintreffen des Auftrags weg, auch bei „Nicht ablegen“"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] räumte die Brücke beim Eintreffen nichts ab, bliebe der Grant bis zur nächsten Ablage stehen"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] beim Eintreffen löscht die Brücke nur im bestätigten Speicher, nie an einer fremden Adresse aus der Kopie"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] ohne die Grenze auf den bestätigten Speicher ginge ein DELETE an die fremde Adresse"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] Kopie nicht lesbar, „Nicht ablegen“: die Ablaufliste entfernt die abgelaufene Ablage, ohne etwas zu schreiben"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] ohne die Ablaufliste beim Eintreffen bliebe die Ablage bei nicht lesbarer Kopie liegen"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] Kopie nicht lesbar, Grant beim Dienst: die abgelaufene Ablage fällt, der stehende Grant gilt nur bis zum Ablauf"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] gäbe die Brücke dem Grant keinen Ablauf mit, gälte der stehende Grant unbegrenzt"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] fremder Browser, „Nicht ablegen“: die Ablage steht zum Zurücknehmen da, und Zurücknehmen nimmt den Grant mit"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] zeigte die Brücke die Kopie erst nach „Ablegen“, stünde im fremden Browser nichts zum Zurücknehmen da"
  - aussage: >-
      Ohne Auftrag aus der Anwendung, auch in einem anderen Browser, liest die Brücke nach der Bestätigung des Speichers den
      Ablageordner und bietet seine Ablagen zum Zurücknehmen an. Angenommen wird nur ein Kind genau dieses Ordners im bestätigten
      Speicher mit dem Namen, den die Brücke selbst vergibt; eine umgeleitete Antwort zählt nicht. Bis zum Klick schreibt sie nichts
      in den Pod, ein Klick löscht genau eine Adresse. Den Grant kennt sie dabei nicht; er fällt beim nächsten Abgleich mit dem Kern
      und gilt bis dahin nur bis zu seinem Ablauf.
    zustand: erfuellt
    herkunft: Entscheidung vom 04.11.2026 (Befund RUECKNAHME-OHNE-AUFTRAG)
    pruefung:
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] anderer Browser ohne Auftrag: die Ablage aus dem Ablageordner steht zum Zurücknehmen da, Zurücknehmen löscht genau sie"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] ohne das Lesen des Ablageordners stünde im anderen Browser ohne Auftrag nichts zum Zurücknehmen da"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] gefälschte Container-Liste: kein fremder Pfad, kein Unterordner, keine Hilfsdatei wird gezeigt, und kein DELETE geht hinaus"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] ohne die Namens- und Ordnergrenze zeigte die Brücke Kinder aus der gefälschten Liste"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis] Container-Antwort nach einer Weiterleitung: die Brücke zeigt nichts daraus"
      - tests/pod-bruecke-verzeichnis-pod.test.js "[Pod·Verzeichnis·Rot-Beweis] ohne die Weiterleitungs-Prüfung übernähme die Brücke die umgeleitete Liste"
```
