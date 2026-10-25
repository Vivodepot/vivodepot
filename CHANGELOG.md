# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden hier festgehalten.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), dieses Projekt hält
sich an [Semantic Versioning](https://semver.org/lang/de/).

**Sicherheitshinweise je Fassung.** Eine ausgelieferte Fassung bekommt eine eigene Überschrift in der
Form, die die App anzeigt (`## [v1.0.818] – 2026-09-28`; die Zahl nach dem letzten Punkt ist die
Fassung). Darunter trägt `### Sicherheit` je behobener Schwachstelle einen Listenpunkt mit ihrer Nummer aus
dem Schwachstellen-Register und dem, was zu tun ist.
Der Listenpunkt entsteht im selben Commit wie die Korrektur. Daraus entstehen die
Sicherheitshinweise der Versionsseite (aus dem internen Versionsregister); `tools/fassungen-register.js --check`
(pre-commit) ist rot, wenn eine als korrigiert geführte Schwachstelle hier fehlt.

## [Unreleased]

## [v1.0.952] – 2026-10-25

### Hinzugefügt
- Neben einer Angabe, die aus einem geprüften Zertifikat einer Einrichtung eingelesen wurde, steht jetzt der Name der
  Einrichtung: „eingelesen · bestätigt von <Name>“. Der Name kommt aus dem geprüften Zertifikat, nicht aus den Angaben.
- Pod-Brücke, Stufe 1 (U2-ADR-512): eine eigene Seite `pod/bruecke.html` legt Dateien, die Vivodepot verschlüsselt gespeichert
  hat, in einem Solid-Pod ab und holt sie wieder, für eine Stelle (nur deren WebID), als Freigabe-Link oder als eigene
  Sicherung. Anmeldung mit Solid-OIDC und DPoP ohne Erneuerungs-Token; die Person bestätigt den Speicher vor dem ersten
  Schreiben; bei einer Freigabe an eine Stelle liegt ein Access Grant nach dem LWS-Entwurf daneben. Die Anwendung selbst baut
  weiter keine Verbindung auf.
- Tiere haben in Privat einen eigenen Bereich in der Gruppe „Alltag“. Angaben zu Tieren, die bisher unter den
  persönlichen Angaben standen, zieht die Anwendung beim Öffnen dorthin um; die Lese-App liest beide Formen.
- Pro, die berufliche Fassung, bekommt neue Angaben: Rechtsform, laufende Verträge, Verkauf und Übergabe; die ersten Tage
  bei Verhinderung oder im Todesfall, wichtige Geschäftsbeziehungen, Post, Kommunikation und Geräte; im Vertretungsplan
  das Ende einer Vertretung und die Qualifikation, einen Informationsplan sowie Beraterinnen, Berater und Stellen; einen
  Abschnitt „Einarbeitung“ und die Form der Übergabe.
- Pro hat einen neuen Abschnitt „Register und Kennungen“ für die Kennungen des Betriebs, etwa EORI, USt-IdNr., EUID, LEI,
  GS1 und D-U-N-S, Registrierungen für Verpackung, Elektrogeräte und Batterien, E-Rechnung und Leitweg-IDs, die
  Business-Wallet und die digitale EU-Vollmacht. Dazu kommen Angaben zu Online-Banking und Freigaben, Lohnlauf, Domain
  und Online-Konten, Angeboten und Terminen, Gesellschafterversammlung, Notgeschäftsführung und Betriebsrat. Die Anlässe
  „Vertretung“, „Übergabe“, „Einarbeitung“ und „Nachfolge“ nennen die neuen Angaben.
- Die Berufsmodule Kanzlei und Steuerberatung fragen nach Anderkonten und Fremdgeld, als sensible Angabe.
- Pro bringt unter „Vollmachten“ drei Auszüge mit, für die Steuerberatung, die Bank und die Nachfolge, und zwei Vorlagen,
  um Kundschaft und Belegschaft zu informieren, auf Deutsch und Englisch.
- Die Hilfe hat in Pro ein eigenes Thema zur beruflichen Fassung.
- Die Suche findet jetzt auch Bereiche und Abschnitte.
- In einzeiligen Feldern eines Dialogs und im Passwortfeld beim Öffnen, auch beim Öffnen mit Code, löst die
  Eingabetaste die Hauptaktion aus.
- Beim Herausgeben stehen höchstens vier Anlässe offen, die mit den meisten eigenen Angaben zuerst; die übrigen stehen
  hinter „Weitere Anlässe“.
- Ein eingelesener EU-Laborbefund lässt sich in „Meine Dokumente“ zusätzlich als EU-Labordokument der Person ausgeben.
  Befund und Messwerte bleiben unverändert, das Original hängt unverändert an.
- Beim Einlesen einer Vorlage zeigt die Anwendung ihre Lizenz mit Kennung und Rechteinhaber, wenn sie eine bekannte
  Lizenz angibt; sonst steht dort, dass die Lizenz nicht erkannt ist.
- Eine Einrichtung kann über ihr signiertes Branding-Modul ein eigenes Erscheinungsprofil mitbringen und „powered
  by“ in der Zeile der Anwendung abschalten, nie auf Ausgaben.

### Behoben
- In den Auszügen von Pro verrutschten Angaben einer Liste in die falsche Zeile, wenn eine Zeile ein Unterfeld leer
  ließ, etwa eine Kontovollmacht beim falschen Institut.
- Nimmt man eine Angabe oder ein Unterfeld zurück, geht sie jetzt auch über die Angehörigen-Blätter, die Notfallkarte
  samt den Kontakten in ihrem QR-Code und unter „Personen, die etwas sehen dürfen“ über die Bausteine „Im Notfall
  (Krankenhaus)“, „Bei Pflege (Heimaufnahme)“ und „Für die Bestattung“ nicht mehr hinaus. Über die Oberfläche lässt sich
  eine solche Rücknahme weiterhin nicht dauerhaft setzen; sie kann nur aus einer Datei stammen, die sie schon trägt
  (siehe den Hinweis zu VD-SEC-026 unter v1.0.943).
- Fragte eine Stelle nach den Feldern ihrer eigenen Vorlage und hatte diese Vorlage keinen Wortlaut, kam keine Angabe
  zurück. Das ist behoben.
- Barrierefreiheit: Hinweise und Fehlermeldungen eines Felds sind dem Feld zugeordnet, Kern und Lese-App haben einen
  Sprunglink zum Inhalt. Ein ungültiger Wert bleibt markiert im Feld stehen und wird nicht gespeichert.
- Die Hilfe sagte, die Anwendung schicke nichts an uns. Mit „Link senden“ und „Sicher weitergeben“ lädt man aber selbst eine
  verschlüsselte Datei auf unsere Ablage. Die Hilfe nennt jetzt beide Wege, was die Ablage sieht und wann sie löscht.

### Geändert
- Pro bietet keine privaten Angaben mehr an: die Ablageorte von Patienten- und Betreuungsverfügung, die Versorgung der
  Familie und die private Absicherung. Den Bereich Gesundheit bietet Pro nicht mehr an, damit auch nicht die
  Gesundheitsdaten als maschinenlesbare Datei. Trägt eine ältere Datei dort Werte, bleiben sie erhalten und sichtbar.
- Pro bringt die Vorlagen für Patientenverfügung, Vorsorgevollmacht, Betreuungsverfügung, KI-Verfügung und Organspende
  und die Angehörigen-Blätter nicht mehr mit.
- Beim Einrichten eines Fachs sagt die Anwendung jetzt: „Eine Datei, die Sie einmal weitergegeben haben, können Sie nicht
  zurückholen.“ Die maschinenlesbaren Ausgaben zu Person, Finanzen und Sozialversicherung heißen jetzt „Selbstauskunft“.
- Die englische Fassung nennt Patientenverfügung und Vorsorgevollmacht „living will“ und „enduring power of attorney“.
- Ein Sprachmodul darf bis 1 MiB groß sein.
- Nachbau: Aus dem öffentlichen Quelltext lässt sich der Kern nachrechnen (SECURITY.md, Abschnitt 8). Die Produkte lassen sich
  seit v1.0.933 nicht mehr byte-gleich nachbauen, weil Vivodepots eigene Vorlagen nicht im öffentlichen Repository liegen. Die
  Angabe im Eintrag zu v1.0.843 gilt nur bis v1.0.931.
- SECURITY.md nennt als Konformitätsweg nach dem Cyber Resilience Act jetzt Modul A mit harmonisierten Normen, andernfalls eine
  notifizierte Stelle; Klasse I ist der Maßstab, die rechtliche Einstufung ist davon getrennt.

### Sicherheit
- VD-SEC-029 (hoch): Behoben in v952.
  Worum es geht: Unter „Personen, die etwas sehen dürfen“ kann man für eine Person Bereiche markieren oder Bausteine
  wählen. Als sensibel markierte Dokumente aus „Meine Dokumente“ gehen dabei nur mit dem Baustein „Im Todesfall (Erbe und
  Behörden)“ mit, der mitgibt, was im Depot steht. Verwies eine Angabe, die die Person sehen darf, auf ein solches
  Dokument, etwa das Profilfoto, ging das Dokument trotzdem mit, in die Datei und den QR-Code für diese Person und in ihr
  Fach in Ihrer Depot-Datei.
  Was jetzt gilt: Ein sensibel markiertes Dokument geht nur noch mit dem Baustein „Im Todesfall (Erbe und Behörden)“ mit.
  Der Verweis bleibt stehen und zeigt beim Empfänger „nicht hinterlegt“.
  Betroffen: Datei und QR-Code v797 bis v943, das Fach in v943 (zum Fach in früheren Fassungen siehe VD-SEC-027).
  Was zu tun ist: auf v952 aktualisieren und eine Sicherungskopie erstellen; damit entsteht das Fach neu. Wer für eine
  solche Person eine Datei oder einen QR-Code erzeugt hat, erzeugt sie mit v952 neu. Ältere Kopien der Depot-Datei und
  schon weitergegebene Dateien durch die neuen ersetzen; was schon weitergegeben ist, lässt sich nicht zurückholen.

## [v1.0.943] – 2026-10-21

### Hinzugefügt
- Die Antwort an eine Stelle und der Auszug zu einem Anlass lassen sich jetzt auch als Link weitergeben. Nach „Antworten“ und nach
  „Herausgeben“ steht die Wahl „Herunterladen“ oder „Link senden“. Der Link lässt sich kopieren oder als QR-Code zeigen; die Stelle
  holt die Datei über share.vivodepot.de ab, der Schlüssel steht nur im Link. Eine Antwort geht nur signiert über einen Link.
- Wer eine Anfrage einer Stelle öffnet und noch kein Depot hat, sieht zuerst, wer bittet (bei einer nicht geprüften Anfrage mit
  dem Hinweis „Nicht geprüft“), wozu und um welche Angaben, und erst danach den Satz zum eigenen Passwort. Beim Anlegen auf diesem
  Weg bietet die Anwendung den Wiederherstellungs-Code noch nicht an. Nach dem Herunterladen der Antwort bietet der
  Abschlussbildschirm „Depot absichern“ an; ist danach noch kein Code eingerichtet, kommt das Angebot beim nächsten Öffnen einmal
  wieder.
- Wird die Antwort auf eine Anfrage als Datei heruntergeladen, zeigt danach ein Abschlussbildschirm, wohin die Datei geht, dass
  sie dort noch nicht angekommen ist und wo die Angaben im Depot liegen. Im Fenster für das Einmalpasswort steht jetzt, dass die
  Stelle dieses Passwort getrennt gegeben hat und dass es nicht das Depot-Passwort ist.

### Behoben
- Die Lese-App öffnet jetzt das Fach eines Empfängerkreises in der Datei der Inhaberin. Bisher ging eine solche Datei in der
  Lese-App nur mit dem Passwort der Inhaberin auf, nicht mit dem Passwort der Vertretung. Ein abgelaufenes Fach nennt sie mit
  eigenem Satz statt als falsches Passwort. Die Lese-App liest die Datei dabei mit demselben Leser wie die Anwendung.
- Auf schmalen Telefonen brechen die Knöpfe eines Dialogs jetzt in eine zweite Zeile um, statt am Rand abgeschnitten zu werden.
- In der Antwort auf eine Anfrage und unter „Selbst zusammenstellen“ ließ sich eine fehlende Angabe nur als freier Text
  nachtragen. Bei Feldern mit Codeliste wie den Allergien („Penicillin“), bei Verweisen und Listen schlug das fehl; bei
  Auswahlfeldern landete die Angabe in einer Form, die die Anwendung nicht als eingetragen las. Jetzt hat jede fehlende Angabe das
  Eingabefeld ihrer Art. Gibt es die erfragte Angabe in einer Liste mehrfach, etwa bei zwei Vorsorgevollmachten, führen ein Satz
  und ein Knopf in den Bereich, statt zu raten.
- Eine Pro-Datei ohne Beschreibung ihrer Bereiche, etwa ein Ausschnitt von vor v937 oder eine Übergabe per QR-Code, zeigt ihre
  Pro-Bereiche jetzt auch in der Lese-App, und Vivodepot Privat und Pro benennen die Bereiche eines Berufsmoduls, wenn die Datei dort
  Angaben trägt.

### Geändert
- Die Staatsangehörigkeit wählt man jetzt aus der amtlichen Liste (im deutschen Rechtsraum die des Statistischen Bundesamts),
  statt sie frei einzutippen; gibt es keine Liste, bleibt das Feld leer. Der „Identitätsnachweis (maschinenlesbar)“ trägt sie nur
  noch als geltende Ländercodes nach ISO 3166-1, für „staatenlos“ und „ungeklärt“ als die Sonderwerte des PID-Regelwerks. Lässt sich
  eine gewählte Angabe nicht so abbilden, trägt er keine und nennt beim Erstellen, was nicht übernommen wurde. Ein früher frei
  eingetragener Text bleibt sichtbar, geht aber nicht in den Identitätsnachweis.
- Eine Antwort-Datei über 16 MiB erkennen die Anwendung, die Lese-App und das Studio nicht mehr als Antwort. Das Studio liest sie
  unter „Eingegangene Antworten öffnen“ gar nicht erst ein und meldet „Die Datei ist zu groß für eine Antwort und wird nicht
  geöffnet.“

### Sicherheit
- VD-SEC-026 (hoch): Behoben in v937, Hinweis mit v943.
  Worum es geht: Trug ein Depot die Entscheidung, ein einzelnes Unterfeld einer Liste zurückzuhalten, galt sie in
  einigen Ausgaben nicht, etwa für das Jahr einer Operation, die Frist oder die bevollmächtigten Personen einer
  Vorsorgevollmacht in den Gesundheitsdaten als maschinenlesbare Datei (medizinischer Export) oder für die Art eines
  Kontos in einem Situationsblatt. Bei einem Vorsorge-Instrument mit ebenfalls zurückgehaltener Art galt dasselbe für
  einen Bereich, den man für eine Person unter „Personen, die etwas sehen dürfen“ markiert hat. Die Angabe ging dann
  mit hinaus. Über die Oberfläche ließ sich eine solche Entscheidung in diesen Fassungen nicht dauerhaft setzen; sie
  konnte nur aus einer Datei stammen, die sie schon trug.
  Was jetzt gilt: Diese Ausgaben prüfen die Entscheidung am einzelnen Unterfeld. Die Notfallkarte, die
  Angehörigen-Blätter und unter „Personen, die etwas sehen dürfen“ die Bausteine „Im Notfall (Krankenhaus)“, „Bei Pflege
  (Heimaufnahme)“ und „Für die Bestattung“ wenden eine solche Entscheidung noch nicht an; das wird gesondert entschieden.
  Der Baustein „Im Todesfall (Erbe und Behörden)“ gibt mit, was im Depot steht; ausnehmen lassen sich dort nur ganze
  Angaben.
  Betroffen: Situationsblätter und medizinischer Export v670 bis v933, der Vorsorge-Abschnitt im medizinischen Export
  v857 bis v933, Datei und QR-Code für einen markierten Bereich v922 bis v933 (zum Fach siehe VD-SEC-027), der Vollexport
  als JSON in v670 und v718.
  Was zu tun ist: auf v943 aktualisieren. Wer eine Depot-Datei oder einen Gesamtexport mit einer solchen Entscheidung
  geöffnet oder eingelesen und daraus eine der genannten Ausgaben erzeugt hat, erzeugt sie mit v943 neu. Eine schon
  weitergegebene Ausgabe bleibt, wie sie ist; wer sie bekommen hat, sollte sie durch die neue ersetzen. Den Vollexport
  als JSON bietet die Anwendung seit v787 nicht mehr an; eine solche Datei aus v670 oder v718 nicht weitergeben.
- VD-SEC-027 (hoch): Behoben in v922 und v943, je Fall unten.
  Worum es geht: Unter „Personen, die etwas sehen dürfen“ kann man für eine Person Bereiche markieren, die sie sehen darf.
  Dafür enthält Ihre Depot-Datei ein Fach für diese Person, und es lassen sich eine Datei und ein QR-Code für sie erzeugen.
  Drei Fälle:
  (1) Fach, Datei und QR-Code enthielten auch die Felder der markierten Bereiche, die als sensibel gelten, etwa die
  meisten Angaben im Bereich Gesundheit. Betroffen: v787 bis v920. Behoben in v922. Der Eintrag zu v922 nannte v917 bis
  v920; das war zu eng.
  (2) Ab v922 hielten Datei und QR-Code diese Felder zurück. Das Fach enthielt bei Listen aber weiter Angaben, die
  zurückgehalten werden, etwa die IBAN in einer Kontenliste. Betroffen: das Fach v922 bis v937. Behoben in v943.
  (3) Das Fach einer Person, für die Sie eines eingerichtet haben, enthielt alle Ihre Angaben zu Lebenslagen, auch wenn
  diese Person sie nicht sehen sollte. Bei den Bausteinen „Bei Pflege (Heimaufnahme)“ und „Für die Bestattung“ und bei
  einem markierten Bereich nannte es außerdem, welche Bereiche Ihr Depot angelegt hat (nur die Namen, keine Angaben daraus). Bei einem markierten Bereich
  enthielt es auch alle Einträge unter „Menschen, die mir wichtig sind“ (im Bereich „Meine Menschen“). Verwies eine
  Angabe eines markierten Bereichs auf ein Dokument, etwa das Profilfoto, enthielt das Fach außerdem alle Ihre Dokumente
  unter „Meine Dokumente“. Betroffen: die Angaben zu Lebenslagen v670 bis v937, die Namen der Bereiche v718 bis v937, die
  Einträge unter „Menschen, die mir wichtig sind“ v787 bis v937, die Dokumente unter „Meine Dokumente“ v797 bis v937.
  Behoben in v943.
  Was jetzt gilt: Ein markierter Bereich gibt Felder, die als sensibel gelten, und zurückgehaltene Angaben in Listen nicht
  mehr mit, auch nicht im Fach. Ihre Angaben im Fach sind nur noch solche, die auch die Datei für diese Person enthält.
  Das Fach kann weniger enthalten: Weicht eine Angabe für diese Person vom Depot ab, etwa eine Liste mit einer
  zurückgehaltenen Angabe, fehlt sie im Fach vorerst ganz; in der Datei für diese Person steht die Liste ohne die
  zurückgehaltene Angabe. Das Fach in Ihrer Depot-Datei wird neu gebildet, wenn Sie mit v943 eine Sicherungskopie
  erstellen; Datei und QR-Code entstehen neu, wenn Sie sie wieder erzeugen.
  Was zu tun ist: Mit v943 eine Sicherungskopie erstellen und die Datei für diese Person neu erzeugen. Ältere Kopien
  Ihrer Depot-Datei und eine schon weitergegebene Datei bleiben, wie sie sind; ersetzen Sie sie durch die neuen.
- VD-SEC-028 (hoch): Behoben in v943.
  Worum es geht: Das PDF der Situationsblätter „Beim Notar oder bei der Bank“, „Einfach so — weil es Zeit
  wird“ und „Im Erbfall“ (Knopf „Als PDF“) enthielt bei den Konten auch die IBAN, obwohl sie ab Werk geschützt ist.
  Was jetzt gilt: Das PDF dieser Blätter enthält die IBAN nicht mehr. Am Bildschirm zeigt das Blatt sie weiter, so wie
  der Bereich Finanzen selbst.
  Betroffen: v670 bis v937.
  Was zu tun ist: auf v943 aktualisieren. Ein solches PDF mit Konten, das mit einer dieser Fassungen erzeugt und
  weitergegeben wurde, trägt die IBAN; erzeugen Sie es mit v943 neu und ersetzen Sie das weitergegebene.
- VD-SEC-030 (mittel): Behoben in v943.
  Worum es geht: Die Sicherheitsregeln der Seite (Content Security Policy) erlaubten jeden Programmcode, der direkt in
  der Seite steht, ohne Prüfsumme, auch solchen, der erst nachträglich hineingelangt. Wäre fremdes HTML in die Seite
  gelangt, etwa ein Bild mit einem Fehler-Handler, hätte dessen Programmcode laufen und angezeigte Angaben hinaustragen
  können, indem er die Seite eine fremde Adresse aufrufen ließ; die Sperre für Netzverbindungen galt für einen solchen
  Aufruf nicht. Solche Wege, fremdes HTML in die Seite zu bringen, gab es bis v927; sie sind als VD-SEC-006, -007 und
  -016 bis -018 behoben. Für v928 bis v937 kennen wir keinen.
  Was jetzt gilt: Programmcode in der Seite läuft nur mit hinterlegter Prüfsumme; ein Fehler-Handler in eingesetztem
  HTML läuft gar nicht. In Browsern, die Trusted Types unterstützen, lehnt eine Vertrauensregel HTML mit ausführbarem
  Anteil zusätzlich schon beim Einsetzen ab.
  Betroffen: die Anwendung in den ausgelieferten Fassungen seit mindestens v670, die Lese-App und das Studio für
  Einrichtungen seit mindestens v792, jeweils bis v937.
  Was zu tun ist: auf v943 aktualisieren. Lese-App und Studio liefern wir unter register.vivodepot.de selbst neu aus.

## [v1.0.937] – 2026-10-20

### Behoben
- Gab jemand ein Listenfeld für eine Antwort auf eine Anfrage, einen Anlass oder eine Zusammenstellung frei, fehlten in der
  Ausgabe die Unterfelder der Liste, die von sich aus besonders geschützt sind, ohne dass es irgendwo zu sehen war. Jetzt gilt die
  Freigabe des Felds auch für seine Unterfelder. Bleiben Unterfelder einer mitgehenden Liste zurück, nennt die Übersicht sie unter
  „Nicht mitgeschickt“ mit Namen.
- Vivodepot Pro mit einem Berufsmodul: Ein Ausschnitt für eine vertretende Person, über ein Fach oder als eigene Datei, nahm nur
  die Angaben mit, nicht die Beschreibung der Bereiche des Berufsmoduls. Vivodepot Privat zeigte diese Bereiche deshalb nicht, und
  die Lese-App zeigte aus einer solchen Datei keinen Pro-Bereich. Jetzt trägt der Ausschnitt die Beschreibung der Bereiche mit, aus
  denen er Angaben enthält.
- Der „Identitätsnachweis (maschinenlesbar)“ trug in der Anschrift fest das Land Deutschland, auch wenn niemand ein Land eingetragen
  hatte. Das Depot führt kein Land der Anschrift; die Angabe fällt jetzt weg.
- In PDFs der Anwendung trugen die eingebetteten Schriften eine falsche Angabe zu ihrer Zeichensammlung. PDF-Programme, die auf
  poppler aufbauen, meldeten dazu einen Fehler. Die Angabe stimmt jetzt.

### Hinzugefügt
- Studio: Im Assistenten für eine Anfrage gibt es unter „Wie die Antwort zu Ihnen kommt“ den Weg „Mit dem Zertifikat Ihrer Stelle:
  ohne Passwort für die Person“. Man lädt die Schlüsseldatei der Stelle und das Zertifikat, das Vivodepot dazu ausgestellt hat, und
  wählt „Laden und prüfen“. Das Studio prüft das Zertifikat sofort und übernimmt es nur, wenn es gültig ist und zur geladenen
  Schlüsseldatei gehört. Dann wird die Anfrage signiert, beim Veröffentlichen entsteht eine eigene Schlüsseldatei für diese Anfrage,
  und die Person antwortet ohne Passwort. Mit „Antworten öffnen“ öffnet man die Antworten mit dieser Schlüsseldatei. Ohne Zertifikat
  oder mit einem abgelaufenen oder widerrufenen bleibt es beim Einmalpasswort wie bisher.
- Bei deutschem Rechtsraum steht in „Vorsorge & Recht“ über der Liste „Vorsorge-Instrumente“ ein Satz, dass sich die Dokumentarten
  und Angaben dort nach deutschem Recht richten, vorerst nur auf Deutsch. Der Satz kommt aus der mitgelieferten Erweiterung für den
  Rechtsraum.

### Geändert
- Jedes PDF der Anwendung nennt jetzt die Software, mit der sie entstanden ist: Der Fuß der PDFs, das Dokument-PDF, das PDF eines Widerrufs,
  die „Notfallkarte“ und das Deckblatt des Gesamt-PDF tragen „Erstellt mit der Software Vivodepot“, das Deckblatt dahinter die
  „Fassung“. Unten in der Anwendung steht „Bereitgestellt mit Vivodepot“. Beides gilt auch unter einer Partnermarke: Genannt wird
  dann die Software, nicht der Partner.

## [v1.0.933] – 2026-10-19

### Behoben
- Ein Passwort mit Umlaut oder ß öffnet die Depot-Datei jetzt in der Anwendung und in der Lese-App, gleich in welcher
  Zeichenform es ankommt. Bisher konnte ein Passwort, das etwa beim Einfügen mit zerlegtem Umlaut ankam, die Datei in der
  Anwendung öffnen und in der Lese-App nicht. Dasselbe gilt für Sub-Depots und für das Einmalpasswort einer Antwort, auch im Studio.
- Wer eine Vorsorgevollmacht und eine Bankvollmacht eingetragen hat, dem nannte die „Notfallkarte“ unter Umständen die Person der
  Bankvollmacht als Bevollmächtigte für den Notfall, dazu den Ablageort der Bankvollmacht. Jetzt nennt die Karte nur die Person einer
  Vollmacht, die für die Behandlung gilt. Dieselbe Regel gilt für die Vertretung in Format-Ausgaben, für die Angabe zur
  Vorsorgevollmacht auf den Blättern (sie sagte bei nur einer Bankvollmacht „ja“) und für die Notfallkarte in der Lese-App.
- In der Lese-App wirkten Erweiterungen, die eine geöffnete Datei mitbrachte, ohne dass jemand sie gewählt hatte, etwa Texte,
  Bereiche oder eine Marke. Jetzt wirkt eine solche Erweiterung dort nur, wenn sie ab Werk ist oder einen nachgeprüften Beleg trägt.
  Unter der Herkunftsangabe steht dann „Diese Datei bringt Erweiterungen mit, die hier nicht angewandt werden:“ mit Name und Wirkung
  jeder solchen Erweiterung. Ein Bereich, den nur eine solche Erweiterung beschreibt, steht neutral in der Ansicht, je Feld mit
  Kennung und Inhalt; keine Angabe geht verloren.
- Die Texte zum Speichern widersprachen sich: An einer Stelle hieß es, ein Feld speichere sich von selbst, an einer anderen, die
  Eingaben seien erst nach dem Sichern gesichert, und eine Fehlermeldung nannte einen Knopf, den es nicht gibt. Jetzt sagt jede
  Stelle dasselbe, passend dazu, ob dieser Browser selbst auf dem Gerät speichert oder nur die Datei bleibt, und die Fehlermeldung
  nennt „Jetzt als Datei sichern“. Der Knopf „Sicherungskopie erstellen“ steht unter Einstellungen → „Sichern & Wiederherstellen“
  jetzt in beiden Fällen, nicht nur, wenn der Browser selbst speichert.
- Der amtliche Titel eines Codes brach nicht um. Auf einem schmalen Bildschirm wurde ein Bereich mit langem amtlichem Titel
  dadurch breiter als der Bildschirm und ließ sich seitlich verschieben. Der Titel bricht jetzt um. In einer Vorführung steht
  die Notiz nach einem Wechsel der Seite wieder an der Ansicht, statt mit der Zwischenkarte zu verschwinden.

### Sicherheit
- VD-SEC-024 (hoch): Behoben in v933.
  Worum es geht: Ein Fach verschließt die Angaben, die ein Empfängerkreis öffnen darf. Für die übrigen Angaben legt die
  Depot-Datei Platzhalter an, damit von außen nicht zu sehen ist, was zu einem Fach gehört. Diese Platzhalter waren ein Byte
  länger als die echten Schlüsselumschläge. Wer eine Depot-Datei mit eingerichtetem Fach ohne Passwort untersuchte, konnte
  daran ablesen, wie viele Angaben ein Fach öffnet und welche verschlüsselten Teile dazugehören. Inhalte, Feldnamen und die
  Namen der Kreise blieben verschlossen.
  Was jetzt gilt: Platzhalter und echte Schlüsselumschläge sind gleich lang, und die Anwendung speichert nicht, wenn sie es
  nicht sind.
  Betroffen: die ausgelieferten Fassungen v670 bis v931, Depot-Dateien mit mindestens einem eingerichteten Fach, auch
  Teil-Depots mit eigenem Fach und deren Exporte; nicht der Ausschnitt für einen Empfänger.
  Was zu tun ist: auf v933 aktualisieren und die Depot-Datei einmal speichern; ein Teil-Depot mit eigenem Fach dazu einmal
  mit seinem eigenen Passwort öffnen und speichern; über ein Fach geöffnet, wird es nicht neu geschrieben. Kopien, die vorher gespeichert oder weitergegeben wurden, bleiben, wie sie sind, und zeigen weiter,
  welche Einheiten zu einem Fach gehören.
- VD-SEC-025 (mittel): Behoben in v933.
  Worum es geht: Der verschlüsselte Teil eines Fachs wird auf eine einheitliche Länge aufgefüllt. Gemessen wurde in Zeichen,
  verschlüsselt in Bytes. Trug der Name eines Empfängerkreises einen Umlaut oder ein anderes Zeichen außerhalb von ASCII,
  wurde der verschlüsselte Teil seines Fachs länger als die anderen. Ohne Passwort war daran zu erkennen, dass der Name solche
  Zeichen trägt, und grob wie viele; den Namen selbst nicht.
  Was jetzt gilt: Aufgefüllt wird in Bytes; die verschlüsselten Teile aller Fächer einer Datei sind gleich lang, und die
  Anwendung speichert nicht, wenn sie es nicht sind.
  Betroffen: die ausgelieferten Fassungen v670 bis v931, Fächer mit einem solchen Kreisnamen.
  Was zu tun ist: wie bei VD-SEC-024.
- VD-SEC-023 (hoch): Behoben, Hinweis nachgetragen mit v933.
  Worum es geht: Öffnete ein Produkt eine Datei mit Bereichen, die Vivodepot nicht ausgeliefert hat (etwa aus einem anderen
  Produkt), behandelten Anwendung und
  Lese-App jeden dieser Bereiche wie einen von Vivodepot ausgelieferten, mit allen Eigenschaften und ohne Spur in der
  Herkunftsangabe. Ein Feld eines solchen Bereichs konnte so einen Termin in die Prüftermine des Depots setzen.
  Was jetzt gilt: Alle Bereiche werden weiter gezeigt. Als ausgeliefert gilt eine Beschreibung nur nach ihrem Inhalt; sonst
  behält sie nur, was anzeigt, Eingaben annimmt oder einschränkt, und steht in der Herkunft als Erweiterung ohne geprüfte
  Herkunft.
  Betroffen: die vor v927 ausgelieferten Fassungen (zuletzt v923).
  Was zu tun ist: Ein PDF, das vor v927 aus einer solchen Datei erzeugt wurde, nennt diese Bereiche in der Herkunft nicht; es mit
  der aktuellen Fassung neu erzeugen.
- VD-SEC-010 (hoch): Behoben, Hinweis nachgetragen mit v933.
  Worum es geht: Die Lese-App zeigte die Vorlage eines Anbieters, der widerrufen und zugleich abgelaufen war, als „abgelaufen“
  und nicht als widerrufen. Ausgelöst werden konnte das nicht, denn bis heute wurde kein Widerruf ausgeliefert.
  Was jetzt gilt: Die Lese-App prüft den Widerruf vor dem Ablauf, wie die Anwendung. Eine nicht leere Widerrufsliste geht nur
  mit grüner Prüfung dieses Falls in eine Auslieferung.
  Betroffen: die Lese-App in den vor v917 ausgelieferten Fassungen (zuletzt v857).
  Was zu tun ist: nichts; seit v917 gilt die Korrektur.
- VD-SEC-013 (hoch): Behoben, Hinweis nachgetragen mit v933.
  Worum es geht: Las jemand eine fremde Sicherung (JSON) vollständig in das eigene Depot ein, kamen die Schlüssel der Fächer aus
  der fremden Datei mit. Danach verschloss das eigene Depot Angaben eines Fachs unter einem Schlüssel, den der Ersteller dieser
  Sicherung kennen konnte.
  Was jetzt gilt: Ein Import bringt kein Fach-Material mehr mit. Der Empfängerkreis kommt mit, das Fach nicht; die Anwendung
  sagt beim Einlesen, dass es neu einzurichten ist.
  Betroffen: die vor v918 ausgelieferten Fassungen mit Fächern (zuletzt v917).
  Was zu tun ist: Wer mit einer Fassung bis v917 eine fremde Sicherung vollständig eingelesen hat, muss selbst handeln, denn die
  Anwendung erkennt ein so übernommenes Fach nicht: das Fach entfernen, speichern und neu einrichten. Ältere Kopien der Datei
  bleiben unter dem alten Schlüssel lesbar.

### Hinzugefügt
- Eine Antwort an eine Stelle wird jetzt signiert. Lese-App und Studio zeigen beim Öffnen „Unverändert seit dem Signieren“ und
  den Schlüssel, mit dem signiert wurde. Kann der Browser nicht signieren, geht die Antwort trotzdem verschlüsselt hinaus; die
  Anwendung sagt das vorher, und Lese-App und Studio zeigen „Diese Antwort ist nicht signiert (Browser ohne Ed25519).“ Eine
  unsignierte Antwort aus einer früheren Fassung trägt den Satz „Diese Antwort ist nicht signiert. Die Fassung, mit der sie
  erstellt wurde, signiert noch keine Antworten.“
- Die zwei Auszüge zur Vorbereitung eines Antrags bei Gericht, Beratungshilfe und Erbschein, sind unter dem Namen „Zugang zum
  Recht“ auffindbar. Die Suche findet sie unter „Zugang zum Recht“, „Beratungshilfe“ oder „Erbschein“ und öffnet den Auszug. Ihre
  Knöpfe heißen „Beratungshilfe-Auszug ansehen“ und „Erbschein-Auszug ansehen“, und die Hilfe hat ein Thema „Zugang zum Recht:
  Beratungshilfe und Erbschein“.
- Bevor die Anwendung eine Antwort mit einem Einmalpasswort unter 16 Zeichen verschlüsselt, erscheint der Hinweis „Kurzes
  Passwort“: Ein kurzes Passwort lässt sich leichter erraten, und man kann die anfragende Stelle um ein längeres bitten. Mit
  „Trotzdem verschlüsseln“ geht es weiter, mit „Abbrechen“ zurück zur Eingabe.
- Bei deutschem Rechtsraum nennt der Fuß eines Dokuments, etwa einer Patientenverfügung, dass die Dokumentart nach deutschem Recht
  gedacht ist, vorerst nur in deutschsprachigen Dokumenten. Der Rechtsraum kommt dabei aus der mitgelieferten Erweiterung für den Rechtsraum, nicht mehr aus einer festen
  Annahme der Anwendung.

### Geändert
- Für eine Datei oder einen QR-Code für eine Person („Datei für diese Person erzeugen“, „QR-Code für diese Person erzeugen“) und
  für das Passwort einer Schlüsseldatei („Passwort (mindestens 12 Zeichen)“ im Studio, ebenso in den übrigen Werkzeugen, die
  Schlüsseldateien schreiben) gelten jetzt mindestens 12 statt 8 Zeichen.
  Dateien mit kürzerem Passwort aus früheren Fassungen öffnen weiter. Enthält ein Passwort Umlaute, ß oder €, rät die Stärkeanzeige,
  sie besser wegzulassen, weil Tastatur und Zeichenkodierung auf einem anderen Gerät manchmal anders sind.
- Beim Umsehen ohne Depot steht je Ansicht nur noch eine Aufforderung zum Anlegen: Zeigt die Ansicht schon die Karte „Sie sehen sich
  gerade um.“ oder den Knopf in „Sub-Depots“, weicht der Hinweis oben. Alle diese Stellen heißen „Depot anlegen“. Auf dem
  Willkommensschirm ist „Depot anlegen“ der Hauptknopf, daneben steht „Erst umsehen, ohne zu speichern“; der Hinweis, dass
  automatisches Speichern auf dem Gerät nicht verfügbar ist, steht dort im Text statt als kurz eingeblendete Meldung. Untertitel
  und Unterzeile des Willkommensschirms sind neu gefasst. In „Meine Vorsorge auf einen Blick“ steht bei einem Dokument ohne
  Eintrag nicht mehr „keine“.
  „Vermögen und Einkommen“ hat einen Einführungstext, die Einführungen von „Meine Menschen“ und „Gesundheit“ sagen, wofür der
  Bereich im Alltag da ist, „Gesundheit“ trägt in der Navigation die Unterzeile „Ärzte, Medikamente, Befunde“, und unter „Persönliches“ steht in der Navigation „Erinnerungen und Wünsche“.
- Studio: Nach „Sicherung speichern“ entsteht mit „Antragsdatei erstellen“ die Datei, die mit dem Antragsformular an Vivodepot
  geht. Sie enthält den öffentlichen Schlüssel und einen Nachweis, dass man den privaten Schlüssel besitzt; dafür trägt man die
  „Antragsnummer (steht im Antragsformular von Vivodepot)“ ein. Die einzelne Datei mit dem öffentlichen Schlüssel entfällt.
  Für das Angehörigen-Blatt braucht es die Antragsdatei nicht.
- Eine Erweiterung für das Erscheinungsbild ohne Signatur kann die Schrift nicht mehr beliebig klein setzen: Es gelten dieselben
  Untergrenzen wie für ein Erscheinungsbild, 10 px je Schriftrolle und 14 px für den Fließtext. Ein kleinerer Wert wird verworfen.
- Im öffentlichen Feldregister sind die drei Zwischenspeicher des Geburts-Assistenten als „deprecated“ markiert: Sie
  waren kein Datenfeld einer Person. Ihre Kennungen bleiben bestehen und auflösbar; welche es sind, nennt das Register.
- Im öffentlichen Feldregister tragen 114 Kennungen eine Entsprechung zu den SEMIC Core Vocabularies der EU (exakt, nah oder
  weiter gefasst); die Grade sind die Auslegung von Vivodepot.

## [v1.0.931] – 2026-10-17

### Behoben
- Eine abgelegte App, die mit einem Zusatz in der Adresse startet, öffnet nach einem Update wieder aus dem Speicher des Geräts,
  statt die Anwendung erneut aus dem Netz zu holen.
- Eine Meldung, die bei offenem Dialog erscheint, etwa ein Fehler beim Export, lag unter dem Weichzeichner und war verschwommen.
  Sie liegt jetzt über dem Dialog, in jedem Erscheinungsbild und ebenso bei Bannern; bei offenem Dialog steht sie am oberen Rand,
  damit sie seine Knöpfe nicht verdeckt.
- Die Gültigkeitszeile unter „Reisepass — ausgestellt am“ (Bereich „Mobilität & Reise“) stand eingerückt in der Spalte der
  Beschriftung. Sie steht jetzt auf derselben linken Kante wie die übrigen Werte; ebenso die Gültigkeitszeile eines Felds in
  „Finanzen“ und die Zeilen „Ausdrücklich keine …“ in „Gesundheit“.

### Sicherheit
- VD-SEC-009 (hoch): Behoben in v931.
  Worum es geht: Vivodepot lässt sich um Erweiterungen ergänzen, das sind Zusatzmodule etwa für Sprache, Rechtsraum oder
  Vorlagen. In Fassungen vor v917 konnte eine Erweiterung ohne Signatur Texte der Anwendung austauschen, auch amtliche Wortlaute
  und die Haftungshinweise in der Anwendung und auf jedem PDF. Sie kam über die Einstellungen oder in einer fremden Depot-Datei,
  die man mit ihrem Passwort öffnete. Angezeigt wurde nur, dass eine ungeprüfte Erweiterung aktiv ist.
  Was jetzt gilt: Von v917 bis v930 waren solche Erweiterungen gesperrt. Seit v931 wirkt eine Erweiterung, die beim Öffnen einer
  Depot-Datei mitkommt oder in den Einstellungen eingelesen wird, erst, wenn man sie wählt, und die Anwendung sagt dabei, was sie
  ändert. Amtliche Wortlaute und Haftungshinweise kann eine Erweiterung ohne Signatur auch dann nicht ersetzen.
  Betroffen: die vor v917 ausgelieferten Fassungen (zuletzt v857).
  Was zu tun ist: auf v931 aktualisieren und keine Erweiterung aus einer Datei wählen, die man nicht selbst angelegt hat.

### Hinzugefügt
- Neue Lebenslage „Längere Krankheit“. Sie nennt die Unterlagen, die meist dazugehören (Krankschreibungen, Schreiben der
  Krankenkasse zum Krankengeld, Arbeitsvertrag, Meldung bei der Agentur für Arbeit, Reha-Antrag und Reha-Bescheid), und unter
  „Rechtslage …“ drei Hinweise zur Rechtslage in Deutschland zu Krankengeld, Arbeitslosengeld und Reha-Antrag, je mit einem Link
  auf den Gesetzestext (§ 48 SGB V, § 145 SGB III, § 51 SGB V). Die Hinweise erscheinen, wenn Deutschland als Rechtsraum
  vorgeschlagen ist.
- Ein QR-Code, der auf eine Webadresse führt, nennt die Adresse lesbar darunter: im Fenster „QR-Code für diese Person“ Host und
  Pfad, ohne den Teil mit dem Inhalt. Studio: unter dem QR-Code einer Anfrage steht ihre kurze Adresse, und „QR-Code mit Adresse
  herunterladen“ liefert ein Bild zum Aushängen, auf dem die Adresse mitgedruckt ist.
- Bevor eine Datei aus „Meine Dokumente“ hinausgeht, prüft die Anwendung sie auf aktive Inhalte, etwa ein Skript, eine Aktion, die
  die Datei von sich aus auslöst, ein Formular, das Daten senden oder laden kann, oder einen Inhalt, der nicht zum Dateityp passt.
  Bei einer Datei Dritter nennt die Vorschau den Fund; „Original herunterladen“, „Mit Verwahrungsnachweis herunterladen“ und
  „Sicher weitergeben“ fragen dann vorher „Möchten Sie die Datei so weitergeben?“. Die Datei bleibt unverändert. Ein PDF, das die
  Anwendung selbst erstellt, wird bei einem solchen Fund nicht ausgegeben, und eine Meldung nennt den Grund.

### Geändert
- Studio: Der Dialog hinter „Fertigstellen und einreichen“ heißt „Einreichen“ und führt in drei Schritten mit je einem Hauptknopf:
  „Wer reicht ein?“, „Sicherung speichern“, „Einreichung speichern“, danach „E-Mail vorbereiten“. „Sicherung speichern“ erzeugt
  das Schlüsselpaar und öffnet die Sicherung vor dem Download einmal mit dem Passwort; gelingt das nicht, entsteht keine Datei.
  Danach steht „Sicherung geprüft, heruntergeladen“; „Ohne Prüfung weiter“ entfällt. Die Prüfergebnisse stehen in einer Zeile
  „✓ Geprüft (Aufbau, nicht der Inhalt) · Einzelheiten“. Weitere Wege stehen unter „Mehr“, etwa „Ich habe schon eine
  Schlüsseldatei“ und „Gespeicherte Sicherung prüfen“. Texte im Studio nennen Bedienelemente beim Namen statt mit „oben“
  oder „links“.
- Studio: Der Empfangsschlüssel entsteht für genau eine Anfrage, und die Schlüsseldatei gehört zu dieser Anfrage. Ihr Name endet
  weiter auf „.empfang.vdkey“ und nennt jetzt Vorgang und Datum der Anfrage. Ältere Schlüsseldateien öffnen Antworten wie bisher.
  Die Lese-App sagt beim Öffnen einer Antwort, an diesem Namen sei die passende Schlüsseldatei zu erkennen. Der Knopf
  „Empfangs-Schlüsselpaar erstellen“ entfällt; das Paar entsteht beim Erzeugen der Anfrage.

## [v1.0.930] – 2026-10-16

### Behoben
- In „Meine Dokumente“ blieb die Vorschau eines PDF immer leer. Jetzt nennt sie Dateiname und Größe; geöffnet wird die Datei über
  „Original herunterladen“.
- Hatte die Person über „Dieses Depot ansehen“ ein Sub-Depot betreten, brachen die Aktionen an den Karten unter „Sub-Depots“ mit
  „Das hat nicht geklappt“ ab, etwa „Als verschlüsselte Datei übergeben“, das Entfernen aus der Verwaltung und „Wieder in die
  Verwaltung aufnehmen“. Sie wirken jetzt auch dort.
- Im betretenen Sub-Depot ließ sich ein weiteres Depot anlegen oder einhängen; es erschien danach in keiner Liste und ließ sich
  nicht exportieren. Dort stehen „Neues Depot anlegen“ und „Depot einhängen“ nicht mehr, sondern der Hinweis, dass ein Depot für
  eine weitere Person im eigenen Depot angelegt wird.
- Studio: Ein Feld aus dem Register, das schon in der Vorlage steht, wird nicht noch einmal angelegt. Das Studio sagt „… ist schon
  in der Vorlage“ und zeigt das vorhandene Feld.

### Sicherheit
- VD-SEC-019 (hoch): Behoben in v930: Speicherte jemand die laufende Anwendung bei geöffnetem Depot mit „Seite speichern“ des
  Browsers, standen die gezeigten Angaben lesbar in der Datei, und geöffnet zeigte sie ohne Passwort ein offenes Depot. Seit v929
  führt eine solche Datei nichts aus und zeigt nur einen Hinweis; seit v930 stehen die Werte der Eingabefelder nicht mehr in ihrem
  Quelltext. Was die Anwendung als Text zeigt, steht weiter darin. Die Depot-Datei und ihre Verschlüsselung waren nicht betroffen.
  Gemessen in Chromium am serialisierten Stand der Seite und an der MHTML-Erfassung; der Speicherweg des Browser-Menüs, Safari und
  Firefox sind nicht gemessen. Betroffen: die ausgelieferten Fassungen bis v929 (das Öffnen ohne Passwort: bis v928); die
  Untergrenze ist nicht je Fassung geprüft.
  Was zu tun ist: auf v930 aktualisieren, mit „Seite speichern“ gesicherte Dateien löschen und zum Sichern „Sicherungskopie
  erstellen“ verwenden.

### Hinzugefügt
- Trägt eine Datei in „Meine Dokumente“ eine digitale Signatur ihres Ausstellers (ein PDF mit Signatur oder Gesundheitsdaten als
  maschinenlesbare Datei mit Signatur), sagt die Vorschau, dass diese Anwendung die Signatur nicht prüft und die Datei unverändert
  weitergibt. Unter „Prüfhinweis für die Stelle“ steht ein Text zum Markieren und Kopieren, der der empfangenden Stelle sagt,
  womit sie prüft; diesen Text gibt es auch bei Bildungsnachweisen (Europass, Open Badges).
- Studio: Ein neu gewähltes Feld aus dem Register kommt in seinen Bereich, in der Reihenfolge der Feldliste. Der Knopf „Nach
  Bereichen ordnen“ sortiert vorhandene Felder einmal so; eigene Felder stehen hinter den Registerfeldern ihres Bereichs.

### Geändert
- Die Hinweise zu Bildungsnachweisen (Europass, Open Badges) in „Meine Dokumente“ nennen, dass diese Anwendung das Siegel bzw.
  die Echtheit nicht prüft, und wo sich beides prüfen lässt: mit dem Europass-Viewer der Europäischen Kommission bzw. dem
  Open-Badges-3.0-Verifier von 1EdTech, beides externe Dienste.
- Die Lese-App kann Antworten lesen, die eine Signatur tragen: Sie zeigt dann, dass die Angaben seit dem Signieren unverändert
  sind, und den Schlüssel; eine Antwort, deren Signatur nicht passt, wird nicht angezeigt. Die Anwendung selbst signiert Antworten
  in dieser Fassung nicht.
- Studio: „Ausprobieren“ heißt „Vorschau“. Das Ergebnis einer Anfrage zeigt zuerst den Brief für die Person, dann das Passwort,
  dann den Link; jeder Speichern-Knopf sagt, für wen die Datei ist, und ein Satz nennt den Ordner „Downloads“. Beim Absenden
  steht, dass die Einreichungs-Datei angehängt wird, nicht die Schlüsseldatei.
- Studio: Wörter für Einrichtungen ohne Fachleute, etwa „Für IT-Fachleute“, „Ihr Aktenzeichen (freiwillig)“, „In welchem Land
  gilt das Recht, nach dem Sie fragen?“, „An welche E-Mail-Adresse soll die Person ihre Antwort schicken?“, „Alle Felder ansehen
  (Register)“ und „Technische Namen (Kennungen) zeigen“.

## [v1.0.929] – 2026-10-15

### Behoben
- Eine Modul-App, die ihre Sprache, ihr Erscheinungsbild und ihre Module als Begleitdatei mitbringt, startet nach dem ersten
  Besuch auch ohne Netz mit dieser Konfiguration. Bisher fehlte die Begleitdatei bis zu einem zweiten Besuch mit Netz.
- Hatte die Person ein Modul mit eigenen Situationen angedockt, brach beim Öffnen eines Depots und beim Wechsel der Sprache
  der Lauf ab, der alle Beschriftungen der Anwendung setzt. Danach konnten Beschriftungen in der falschen Sprache oder leer
  erscheinen, nicht nur die der angedockten Situationen. Der Lauf schreibt nicht mehr in eine angedockte Situation; ihr
  Titel folgt der Sprache wie bisher, ihre Blöcke werden beschriftet wie die einer eingebauten Situation.
- Safari am Mac galt als iPhone oder iPad; nach „Depot anlegen“ erschienen dort das Angebot „In der App anlegen“ und der Hinweis
  zum Home-Bildschirm.
- Scheiterte beim Sichern das Schreiben in die gewählte Datei, legte die Anwendung die Sicherung ohne Ansage als Download ab. Jetzt
  sagt sie, dass die Sicherung nicht in der gewählten Datei liegt.
- Eine Datei einer anderen Fassung der Verschlüsselung oder ein beschädigter Stand hießen beim Öffnen „Das Passwort stimmt nicht.“
  Jetzt nennt die Anwendung den Grund.
- Die Übersicht einer Anfrage beachtet bei sensiblen Angaben die Einstellung der Person.
- Studio am iPad: die Seite wird nicht mehr breiter als das Fenster, Bedienelemente sind bei Fingerbedienung mindestens 44 Pixel
  groß, und „Frage hinzufügen“ legt ein schon vorhandenes Standardfeld nicht noch einmal an.
- Studio: Beim Wechsel der Ansicht beginnt die neue Ansicht sofort oben, statt noch zu rollen.
- Studio: Ein Entwurf aus einer neueren Fassung oder mit ungültiger Fassungsangabe wird mit einer Meldung abgelehnt, statt still
  geöffnet zu werden.
- Studio: Der Import einer Tabelle erkennt Semikolon, Tabulator und senkrechten Strich als Trennzeichen, nicht nur das Komma. Ein
  offenes Anführungszeichen, eine fehlende Spalte „feldname“ und eine Datei ohne Felder werden mit Grund gemeldet; eine Zeile mit
  zu wenigen Zellen wird eingelesen.

### Sicherheit
- VD-SEC-020 (mittel): Behoben in v929: Der Schutz gegen das Einbetten in eine fremde Seite hing an einem Element, das eine mit
  „Seite speichern“ gesicherte Kopie nicht mehr trägt. Er verbirgt die Seite jetzt unabhängig davon. Betroffen: Kopien aus den
  ausgelieferten Fassungen seit v787 bis v928; die ausgelieferte Anwendung selbst nicht.
  Was zu tun ist: auf v929 aktualisieren und die bisher so gesicherten Kopien löschen; der Schutz gilt nur für Kopien, die ab
  v929 gesichert werden.
- VD-SEC-021 (hoch): Behoben in v929: Die Lese-App gab einem signierten Sprachmodul die Prüfer-Stufe allein nach dem Zertifikat
  der Prüfstelle, ohne deren Geltungsbereich (Modultyp, Sprache) und die Bindung an die Originalsätze zu prüfen. Ein solches
  Modul durfte dort Zusicherungssätze übersetzen, die Sätze, die eine empfangende Stelle über den Zustand eines Dokuments liest;
  im Kern galt dasselbe Modul als ungeprüft. Betroffen: die ausgelieferten Fassungen seit v843 bis v928.
  Was zu tun ist: auf v929 aktualisieren. Ab v929 prüft die Lese-App Geltung und Originalsätze wie der Kern; ein Sprachmodul
  einer Prüfstelle bekommt dort die Stufe erst, wenn es die Summen der Originalsätze der Lese-App für Deutsch und Englisch trägt.

### Hinzugefügt
- Wer die Anwendung im Browser oder als installierte App nutzt, findet in den Einstellungen unter „Über …“ den Eintrag
  „… als Datei erhalten“. Er liefert die Anwendung in der aktuellen Fassung als eine Datei zum Aufbewahren; das Depot ist darin
  nicht enthalten. Wer die Anwendung schon als Datei geöffnet hat, sieht den Eintrag nicht.

### Geändert
- Das Zeichen des xShare-Knopfs und das Teilen über einen SMART Health Link gelten für Gesundheitsdokumente. Nachweise aus
  anderen Bereichen, etwa Bildungsnachweise, tragen das Zeichen nicht mehr und werden nicht über einen SMART Health Link geteilt.
- Was das Einlesen eines Moduls, einer Vorlage, einer Anfrage oder einer Konfiguration nicht übernimmt, nennt die Anwendung mit
  Namen und Grund, und der Hinweis bleibt stehen, bis die Person ihn schließt. Eine Anfrage, Vorlage oder Datei aus einer neueren
  Fassung sagt, dass eine aktuelle Fassung der Anwendung sie liest.
- Studio: Beim Schlüssel steht je Datei nach dem Herunterladen „heruntergeladen“ statt „gesichert“. Neu ist der Abschnitt
  „Sicherung prüfen“: er öffnet die eben gespeicherte Schlüsseldatei mit ihrem Passwort und vergleicht sie mit dem Schlüsselpaar.
- Studio: Jede neue Vorlage nennt in ihrer signierten Nutzlast, dass sie eine Vorlage ist und in welcher Fassung ihres Formats sie
  steht. Bisher signierte Vorlagen bleiben gültig.
- Studio: Das Zeichen einer Anfrage steht als Vorschlag im Feld. Unter „Ausprobieren“ lassen sich bei einer Liste mit Unterfeldern
  Einträge anlegen und entfernen. Kennungen in der Feldliste sind eingeklappt und lassen sich einblenden. Die Beispiele reichen über
  Gesundheit hinaus (Verein, Kommune, Stadtbibliothek, Arbeitgeber). Ein Erscheinungsbild ohne Signatur nennt die Folge: es wird
  erst angewendet, wenn es signiert und von Vivodepot bestätigt ist.

## [v1.0.928] – 2026-10-13

### Sicherheit
- VD-SEC-016 (kritisch): Behoben in v928: Hatte eine Kachel der Startseite keine eigene Beschriftung, trug sie den Titel ihrer
  Situation, und dieser Titel wurde ohne Maskierung ins Markup gesetzt. Für Situationen, die ein Produkt ab Werk mitbringt, prüften
  weder die Anwendung noch die Zusammenstellung des Produkts den Titel auf reinen Text; eine solche Situation hätte Programmcode im
  Fenster der Anwendung ausführen können. Eine fremde Depot-Datei war kein Weg dazu. Betroffen: die ausgelieferten Fassungen seit
  v922 bis v927.
  Was zu tun ist: auf v928 aktualisieren. Ab v928 zeigt die Kachel den Titel als Text, und die
  Zusammenstellung nimmt Beschriftungen von Situationen und Assistenten nur als reinen Text an.
- VD-SEC-017 (kritisch): Behoben in v928: Aus der Kennung eines Logikmoduls entstand ein Attribut am Knopf seiner Karte, und die
  Kennung wurde nur auf ihre Länge geprüft. Ein Modul, das mit einem Produkt ausgeliefert oder mit einer Signatur versehen war,
  deren Kette gegen den eingebauten Anker prüft, hätte über seine Kennung Programmcode im Fenster der Anwendung ausführen können.
  Betroffen: die ausgelieferten Fassungen seit mindestens v670 bis v927.
  Was zu tun ist: auf v928 aktualisieren. Ab v928 hat die Kennung beim Einlass eine feste Form (Buchstaben,
  Ziffern, Bindestrich, Unterstrich), und die Karte entsteht nur mit einem Attributnamen in dieser Form.
- VD-SEC-018 (kritisch): Behoben in v928: Texte eines Sprachmoduls wurden beim Einlass auf reinen Text geprüft, die Platzhalter für
  die Marke und für eine andere Beschriftung aber erst danach eingesetzt, ohne erneute Prüfung. Ein Sprachmodul, das mit einem
  Produkt ausgeliefert oder mit geprüfter Kette signiert war, hätte so Programmcode im Fenster der Anwendung ausführen können.
  Betroffen: die ausgelieferten Fassungen seit v787 bis v927.
  Was zu tun ist: auf v928 aktualisieren. Ab v928 gilt die Prüfung für den Text nach dem Einsetzen.
- Werte in den Eingabemasken (Beispieltext und Optionswert aus der Beschreibung eines Bereichs oder einer Vorlage, Verweis auf
  eine Person oder Stelle aus der Datei) werden in Attributen vollständig maskiert, bisher nur am Anführungszeichen.

### Hinweis
- Von den seit v917 ausgelieferten Fassungen haben v920 und v923 keinen öffentlichen Tag.

## [v1.0.927] – 2026-10-12

### Sicherheit
- Bereiche, die eine Datei aus einem anderen Vivodepot-Produkt mitbringt, werden weiter alle angezeigt, mit allen Angaben.
  Entspricht die Beschreibung eines Bereichs einer von Vivodepot ausgelieferten (geprüft werden der Aufbau und jede Beschriftung
  einzeln), verhält er sich wie bisher. Sonst zeigt die Anwendung ihn als gewöhnliche Abschnitte und Felder, mit einem Rand, und
  führt ihn in der Herkunftsangabe als Erweiterung ohne geprüfte Herkunft. Ein solcher Bereich bringt keine eigenen Prüftermine,
  Assistenten oder Ausgabeformate mit; Verweise auf Personen und Stellen werden darin gelesen, nicht bearbeitet. Die Beschreibung
  und die Angaben bleiben unverändert in der Datei (U2-ADR-398, Nachtrag).
- VD-SEC-022 (hoch): Behoben in v927: Die ausgelieferten Produkte enthielten eine Schnittstelle für automatische Tests. Über sie
  konnte Programmcode, der in die Seite gelangt war, den ganzen Inhalt des geöffneten Depots auslesen, auch Angaben, die gerade
  nicht angezeigt wurden. Ein solcher Code konnte darüber außerdem ein selbst ausgestelltes Anbieter-Zertifikat als gültig prüfen
  lassen und ein Erscheinungsbild unter einer erfundenen Anbieterkennung als geprüft einlassen. Ab dieser Fassung fehlt die
  Schnittstelle in allen ausgelieferten Produkten; jeder Auslieferungsweg weist ein Produkt ab, das sie trägt. Betroffen: die
  ausgelieferten Fassungen v787 bis v923.
  Was zu tun ist: auf v927 aktualisieren.

### Behoben
- Öffnete ein Produkt eine Datei, die mit einem anderen Vivodepot-Produkt angelegt war, schrieb es seine eigenen Beschriftungen
  in die Datei. Danach konnten Beschriftungen in der Lese-App oder in einem dritten Produkt in einer anderen Sprache erscheinen.
  Das Öffnen lässt die Beschriftungen in der Datei jetzt unverändert.

### Geändert
- Kennt eine Datei Felder noch nicht, die das öffnende Produkt inzwischen führt, ersetzt das Produkt die Beschreibung des
  Bereichs in der Datei durch seine eigene, statt einzelne Felder anzuhängen. Die Angaben der Person bleiben unberührt
  (U2-ADR-243, Nachtrag).

## [v1.0.923] – 2026-10-09

### Hinzugefügt
- Das Studio fragt zuerst „Was möchten Sie anbieten?“ und zeigt sechs Kacheln; das bisherige Studio steht als „Fachebene“ einen
  Klick dahinter, zurück geht es über „Zur Auswahl“ (U2-ADR-493).
- Der Assistent „Aufnahmebogen“ führt in zwei Schritten, Einrichtung und Bogen, zum Einreichen. Rechts zeigt eine Vorschau, wie die
  Person den Bogen in ihrem Depot sieht.
- Eine Anfrage darf Felder einer Vorlage der Einrichtung mit Angabe der Stelle nennen (`bereich.<Stelle>:Feld`). Die Antwort ist die gewohnte verschlüsselte Datei und führt je
  Vorlage einen eigenen Block für die Antwort auf diese Vorlage (U2-ADR-366).

### Geändert
- Der Vorschlag aus sechs Wörtern steht beim Öffnen schon im Feld und sichtbar darüber, in jedem Feld für ein neues Passwort, auch
  in den Passwörtern für eine Person, die etwas sehen darf (Datei, QR-Code, Fach). Wer selbst tippt, ersetzt den Vorschlag ganz; die Bestätigung bleibt leer.
- Ein selbst gewähltes Passwort braucht beim Setzen und Ändern mindestens 12 statt 8 Zeichen, ebenso das Passwort für „Fach in meiner
  Datei einrichten“. Ein Depot mit kürzerem Passwort öffnet weiter; die Passwörter für die Datei und den QR-Code einer Person,
  die etwas sehen darf, bleiben bei mindestens 8 Zeichen.
- Der QR-Code für eine Person, die etwas sehen darf, bindet Formatversion und Zweck in die Verschlüsselung (U2-ADR-156). Die
  Lese-App nimmt QR-Codes der bisherigen Form noch bis einschließlich 15.11.2026 an; eine unbekannte Fassung nennt sie
  beim Namen, statt „falsches Passwort“ zu sagen.
- Das Erscheinungsbild kommt auch außerhalb des Inhalts ohne Linien aus: Kopfleiste, Seitenleiste und Fuß stehen auf Fläche. Fokus
  und Fehler behalten ihre Kennzeichnung.
- Im geöffneten Sub-Depot trägt die ganze Oberfläche den Ton des Depots, nur die Marke behält ihre helle Fläche (U2-ADR-236).
- Die Töne für ein Sub-Depot sind Ton, Altrose, Nebel, Kiesel, Malve, Pfirsich, Hellblau und Rosé. Hafer, Schilf und Flieder wählt
  kein neues Depot mehr; ein bestehendes Sub-Depot behält seinen Namen in der Datei und erscheint als Pfirsich, Nebel bzw. Malve.
- Das Feld „Name im Depot“ (Neue Person) sagt, wozu es da ist: „So erscheint die Person überall im Depot. Familienname und Vornamen
  darunter brauchen Formulare und Ämter.“ In Dokumenten heißt das Feld „Name“.
- Der Hinweis zum Einrichten in der Kopfzeile trägt kein Warndreieck mehr.
- `docs/vc-issuer/did.json` trägt den öffentlichen Schlüssel der Trust-Authority statt einer Vorlage mit Platzhalter.
- Kleinere sichtbare Änderungen: Das Studio trägt den Glas-Look, sein Kopf „VIVODEPOT Studio“ steht in einer Zeile. Das PDF
  nimmt die Töne eines Sub-Depots aus dem Erscheinungsbild-Modul. Die Stärke-Anzeige meldet unter 12 Zeichen immer „schwach“.
  Partnerfarben für ein
  Sub-Depot dürfen heller sein (Kontrast gegen Weiß und Papier mindestens 1,15 statt 1,5), müssen sich dafür deutlicher von der
  Salbei-Leiste abheben (Farbabstand ΔE2000 mindestens 12).

### Sicherheit
- VD-SEC-014 (mittel): Behoben in v923: Beim Erzeugen eines Freigabe-Links prüfte Vivodepot die Adresse der Ablage nur auf ihre Länge, die
  Seite „Freigabe abholen“ nur auf den Anfang „https://“. Beim Erzeugen wurden Adressen mit anderem Anfang, mit Zugangsdaten
  oder mit Leer- und Steuerzeichen angenommen, und die Person sah den Host nicht, bevor der Link entstand. Betroffen: der Freigabe-Link in den ausgelieferten
  Fassungen seit mindestens v670 bis v922, die Seite „Freigabe abholen“ von v803 bis v922.
  Was zu tun ist: auf v923 aktualisieren. Ab v923 prüft der Dialog die Adresse, nennt den Host vor dem Link
  und weist auf eine andere als die voreingestellte Ablage hin; bei Zweifel an der Ablage-Adresse eines früher erzeugten Links den
  Link neu erzeugen.
- VD-SEC-015 (mittel): Behoben in v923: Eine Anfrage konnte Felder aus der Vorlage einer Einrichtung über die interne Schreibweise des Felds ansprechen, ohne dass geprüft wurde, ob die
  anfragende Stelle diese Vorlage ausgestellt hat; das galt auch für eine unsignierte Anfrage. Die Antwort konnte so Angaben aus
  der Vorlage einer anderen Stelle zur Freigabe anbieten, und schon die Zeile unter „Diese Angaben gibt es in Vivodepot nicht:“ zeigte, dass die
  Person eine Vorlage dieser Stelle hat. Betroffen: die ausgelieferten Fassungen seit mindestens v670 bis v922.
  Was zu tun ist: auf v923 aktualisieren. Ab v923 löst ein Vorlagenfeld nur für die geprüfte Stelle auf, der
  die Vorlage gehört; eine bereits herausgegebene Antwort bleibt, wie sie war.

### Behoben
- Eintragszeilen in Listen zeigen ein ausgefülltes, nicht sensibles Unterfeld mit seiner Beschriftung („Beschriftung: Wert“), in
  Notfallblatt, PDF, Zusammenfassung und Lese-App, auf Deutsch und Englisch. Zuvor stand dort meist der Wert allein; Ja/Nein und Datum trugen ihre
  Beschriftung schon. Im Kern bleibt die Zeile der Vorsorge-Instrumente wie bisher.

## [v1.0.922] – 2026-10-08

Enthält die nicht einzeln ausgelieferte Fassung v921.

### Hinzugefügt
- Pro ohne Notfall: Pro kennt die Situationen Vertretung, Übergabe, Einarbeitung und Nachfolge, dazu 55 neue Felder und die
  Berufsmodule Steuerberatung und Kanzlei. Eine ältere Pro-Datei behält ihre Werte (U2-ADR-243).
- ICD-Codes zeigen immer den amtlichen Titel, daneben den Begriff aus dem Alphabetischen Verzeichnis. Was die amtliche Liste
  nicht führt, steht als „nicht amtlich“ da.
- Beispiel-Integration `examples/anfrage-antwort`: eine Anfrage bauen und eine Antwort öffnen, ohne Vivodepot-Server.
- Integratoren-Leitfaden: Datenmodell und Anfrage/Antwort auf Englisch, dazu eine deutsche Gesamtfassung.
- Die Schemas führen ein Verzeichnis ihrer Fassungen; jede Fassung bekommt eine eigene, unveränderliche Adresse unter
  `vivodepot.de/schemas/` (U2-ADR-488).
- Feldregister: CC0 steht in der Datei, jede Kennung bekommt eine feste Adresse unter `/feld/`, mit Fassungen.

### Geändert
- Die vier Produkte tragen ab Werk das Erscheinungsbild „Salbei mit Glas“: Fläche und Abstand statt Linien, ab Werk ohne Icons.
- Die Startseite bietet „Depot anlegen“ und leiser darunter „Erst umsehen“. Wer in der Umschau etwas eintragen will, kommt
  direkt zu „Depot anlegen“; nach dem Anlegen steht der Fokus wieder im angeklickten Feld. Die Knöpfe der Umschau nennen ihr
  Feld, zum Beispiel „Geburtsdatum eintragen“.
- Die Seitenleiste zeigt ihre Ebenen deutlicher, und der Eintrags-Dialog nimmt den Fokus.
- In Listen steht der erste Eintrag im Bereich, darunter „Weitere(s) … hinzufügen“.
- In der Benutzersicht stehen keine technischen Markierungen mehr.
- Pro trägt keine privaten Kacheln und Lebenslagen mehr. pro-de und pro-en kommen ab Werk ohne das Notariatsmodul; es soll
  künftig mit der Wahl des Berufsmoduls beim Kauf kommen.
- Die öffentliche Wurzeldatei `vivodepot.html` nennt in ihrer ersten Kommentarzeile Fassung, Rolle und Prüfweg, und das README
  sagt in den ersten Zeilen, dass sie das Gerüst ist.

### Behoben
- Ein Fach mit einem Bereich als Baustein enthielt auch die als sensibel markierten Felder dieses Bereichs (v787 bis v920;
  berichtigt am 21.10.2026, hier stand v917 bis v920; siehe VD-SEC-027 unter v943). Ab
  v922 gibt ein Bereich diese Felder nicht mehr her; freigegebene Felder bleiben darin. Im Fach fehlt ab v943 eine Liste ganz,
  wenn sie eine zurückgehaltene Angabe enthält; bis v937 stand sie dort mit dieser Angabe. Das Fach wird beim nächsten Speichern
  neu gebildet. Eine Datei, die schon weitergegeben wurde, bleibt, wie sie war: Wer sie weitergegeben hat, gibt die neue Datei
  weiter.
- Der Haftungshinweis steht in jedem erzeugten Dokument, auch im PDF und auf der Notfallkarte.
- Öffnet man ein Depot in einer anderen Sprache, behält die Mitschrift einer früheren Fassung ihre Schutztexte; zurückgezogene
  Fassungen zeigen ihre Sprache an.
- Der eigene Passwortwechsel im Sub-Depot behält Fächer und Ortshinweis und schreibt keinen Fach-Ausschnitt als ganzes Depot.
- Das Mitschreiben in eine Kind-Datei überschreibt keine eigene Kopie der Person mehr.
- In Safari im Tab bleibt nichts mehr nur still im Browserspeicher: „Depot anlegen“ bietet zuerst die App an, im Browser danach
  „Als Datei ablegen“, und die Erinnerung zum Sichern kommt beim nächsten Besuch, sobald es seit der letzten Datei Änderungen
  gibt.
- Pro rahmt seine eigenen Bereiche und Berufsmodule nicht mehr als fremd, und kein Assistent zeigt auf eine leere Seite.
- Eine Schriftart ohne eigene Schriftdatei fällt nie auf eine Serifenschrift zurück.
- Studio: Optionen ohne Code und Zeilen eines Format-Moduls gehen nicht mehr still verloren.
- Felder sind nachts lesbar, deaktivierte Knöpfe ebenso, und der Fokus bleibt in einem zugeklappten Feld sichtbar.
- Berichtigt: Der Ortshinweis eines Depots steht im Klartext in der Hülle. SOVEREIGNTY.md sagte zuvor, die Datei trage kein
  Klartext-Personendatum; SECURITY.md nennt in Abschnitt 6.6 jetzt jedes Feld der Hülle, das nicht verschlüsselt ist.

## [v1.0.920] – 2026-10-06

### Hinzugefügt
- Eine Beschreibung des Dateiformats des Depots für Dritte (docs/format/SPEZIFIKATION.md), dazu ein eigenständiges
  Prüfprogramm, das den Kern nicht lädt, und ein Satz Testdateien.

### Geändert
- Die Leiste zeigt nur noch die Bereiche, ohne Unterzeilen. Daten einlesen, Daten herausgeben, Herausgegeben, Meine
  Dokumente, Prüftermine und Sub-Depots stehen gesammelt unter einem eingeklappten Punkt „Austausch und Überblick“.
- Die verwalteten Depots heißen jetzt überall „Sub-Depots“.
- Pro: Die Bereiche heißen kürzer: Vollmachten, Gesellschaft und Nachfolge, Finanzen, Betrieb, Unterlagen, Kontakte und
  Vertretung.
- Studio: Beim Einreichen fragt die Maske nicht mehr nach Funktion, Anwendungsbereich und Use Case; die Telefonnummer ist
  freiwillig. Nach dem Erzeugen zeigt eine Karte, dass die Einreichung fertig ist. Die deutschen Texte sagen „Einreichung“
  und „Vorlage“ statt Submission und Template.
- Vorführung „Aufnahme im Krankenhaus: wer entscheidet für Frau Mustermann?“: Das Herausgeben zeigt drei eigene Schritte,
  Auswahl, Bestätigen und die Datei.

### Behoben
- Ein Partnerprodukt trug ab Werk den Namen des Partners, aber nicht dessen Logo, Kopfzeilenfarbe und Farben. Jetzt
  trägt es alle drei.
- Erfolgs- und Fehlermeldungen waren im Nachtmodus kaum lesbar. Jetzt haben sie genug Kontrast.

## [v1.0.919] – 2026-10-06

### Hinzugefügt
- Trägt ein Produkt die Marke einer Einrichtung, steht ihr Logo oben in den PDF-Dateien; auf Notfallkarte, Dokumenten und
  dem Widerruf einer Herausgabe steht die Marke klein im unteren Rand jeder Seite. Ab Werk bleibt das PDF, wie es war.
- Das Studio, das Vorlagen-Werkzeug für Einrichtungen, liegt jetzt im öffentlichen Repository, unter EUPL-1.2 wie die
  anderen Anwendungen.

### Geändert
- Keine Serifenschrift mehr: Alle Texte stehen in derselben Schrift.
- Die Schriften kommen aus dem Erscheinungsbild-Modul, das eigene Schriften mitbringen kann (U2-ADR-473); das PDF nimmt sie
  nur, wenn sie jedes Zeichen der Angaben darstellen, sonst die mitgelieferte Inter. Steht keine geprüfte Schrift zur
  Verfügung, entsteht kein PDF; ein Hinweis sagt das und bietet an, die Angaben als Datei herauszugeben.
- Der Code für den älteren Antwort-Umschlag ist aus der Anwendung entfernt. Die Lese-App öffnet bereits ausgegebene
  Antworten im älteren Format weiter.
- SECURITY.md beschreibt die Passwortprüfung so, wie die Anwendung sie vornimmt: Pflicht ist nur die Mindestlänge von
  8 Zeichen, alles Weitere ist ein Hinweis. Drei weitere Stellen in STANDARDS.md, SOVEREIGNTY.md und docs/pruefebene.md
  sind an den Code angeglichen.

### Behoben
- Ein Hinweis, der nur einmal erscheint, konnte ausbleiben, wenn gerade ein anderer Dialog offen war, oder von einem
  späteren Dialog überdeckt werden, etwa der Hinweis, dass sich eine Datei aus einer neueren Fassung nur lesen lässt.
  Jetzt kommt er, sobald der Dialog davor geschlossen ist.

## [v1.0.918] – 2026-10-05

### Sicherheit
- VD-SEC-012 (mittel): Behoben in v918: Einige Angaben im Dateikopf einer Depot-Datei werden beim Öffnen gelesen, bevor das
  Passwort eingegeben ist, etwa der Hinweis, wo das zweite Passwort liegt. Sie waren nicht gegen Änderung gebunden: Wer die Datei
  veränderte, konnte einen falschen Hinweis anzeigen lassen oder ein Feld hinzufügen, das beim nächsten Speichern mitging. Der
  verschlüsselte Inhalt war nicht betroffen. Betroffen: die ausgelieferten Fassungen seit v670 bis v917 (das Hinzufügen eines
  Felds seit v787).
  Was zu tun ist: auf v918 aktualisieren und die Datei einmal öffnen und speichern. Danach sind diese Angaben an den verschlüsselten
  Inhalt gebunden; eine Änderung meldet die Anwendung nach der Passworteingabe, veränderte fremde Felder verwirft sie.

### Hinzugefügt
- Die Vorsorgevollmacht als Datei nach dem Medizinischen Informationsobjekt Patientenkurzakte 1.0.0 der
  Kassenärztlichen Bundesvereinigung (U2-ADR-471), eine Datei je bevollmächtigter Person. Dafür lässt sich zum Ablageort der Vollmacht
  jetzt die Anschrift eintragen (Straße, Hausnummer, Postleitzahl, Ort); der bisherige freie Text bleibt unverändert stehen.
  Fehlt etwas, das der Standard verlangt (etwa die Krankenversichertennummer), sagt Vivodepot, was fehlt.

### Geändert
- Englisch: Ein Hinweis zur Beratungshilfe sagt jetzt „advice assistance“ statt „legal aid“.

## [v1.0.917] – 2026-10-05

### Hinzugefügt
- Vorführung „Vertretung“ (englisch): eine vertretende Person mit
  Rechtsgrundlage, Umfang und Geltungsdauer in der Patientenkurzakte. Der FHIR-Auszug zeigt die vertretende Person und die
  Einwilligung; über der Datei steht das Ergebnis des Validators mit einem Link zum vollständigen Bericht.
- SD-JWT VC: Die Ausgaben im Format SD-JWT VC tragen jetzt eine Signatur (Ed25519) und enden auf `.sd-jwt`. Die Datei
  ist selbst signiert, mit einem Schlüssel, den die Anwendung aus dem Passwort der Person ableitet. Das ersetzt nicht
  die Bestätigung einer ausstellenden Stelle. Unterstützt der Browser Ed25519 nicht, entsteht eine unsignierte Datei
  mit der Endung `.jwt` (U2-ADR-457).
- Nachweise in „Bildung & Beruf“ zeigen ihre Gültigkeit: gültig ab, gültig bis, abgelaufen oder noch nicht gültig. Ein
  abgelaufener Nachweis ist in der Liste markiert. Ob ein Nachweis widerrufen wurde, fragt die App nicht ab.
- Die Lizenzhinweise zu LOINC und SNOMED CT (Global Patient Set) stehen im Wortlaut in den Einstellungen.
- Hilfe: drei neue Themen („Lese-App“, „Daten einlesen“, „Daten herausgeben“). Das Thema „Depot und Passwort“ sagt
  jetzt, was gilt, wenn Sie einen Wiederherstellungs-Code eingerichtet haben.
- Vivodepot Pro bringt die Auszüge „Erbschein — Vorbereitungsauszug“ und „Beratungshilfe — Vorbereitungsauszug“ mit.

### Geändert
- Vorführungen: Die Notiz steht auf einem eigenen Platz und bleibt im Bild, auch hinter Dialogen und auf dem Handy.
  Die Sicherungsanzeige zeigt „Beispiel — wird nicht gespeichert“. Eine Demo fragt beim Verlassen nicht mehr nach,
  und ihre Einstiegsseite leitet nicht mehr weiter, sondern zeigt den Bau-Commit und einen Knopf „Demo starten“.
- Wo der Vollmachtsumfang § 1829 BGB nennt, steht neben der Lebensgefahr jetzt auch der schwere, länger dauernde
  Gesundheitsschaden; bisher las man daraus weniger, als die Vollmacht umfasst.
- Jeder verschlüsselte Teil der Depotdatei wird auf das nächste volle Kilobyte aufgefüllt. Wer mehrere Fassungen einer
  Datei aufbewahrt, etwa ein Cloud-Anbieter, sieht an der Länge nicht mehr, ob sich ein Teil um weniger als ein Kilobyte
  geändert hat. Die Datei wird dadurch um 6 bis 10 % größer (U2-ADR-464).
- Außen trägt die Datei eine Marke, an der die App erkennt, ob zwei Dateien denselben Stand haben. Ältere
  Fassungen öffnen die neue Datei (U2-ADR-464).
- Hinweise zur Netzverbindung berichtigt: Bei der gehosteten Fassung fragt die Anwendung nach Aktualisierungen. Die Hilfe
  „Was wir nicht sehen“ und der Hinweis bei „Nach neuer Version suchen“ sagen jetzt nur noch, was trägt: Die Anwendung
  sendet keine Daten aus Ihrem Depot an einen Server.
- Der Hinweis zum Ablageort sagt jetzt, dass jeder mit der Datei ihn lesen kann, ohne Passwort und ohne die App, und rät
  zu einer unpräzisen Angabe.
- Patientenverfügung (v874, U2-ADR-459): Das erzeugte Dokument steht Zeile für Zeile im Wortlaut der Textbausteine des
  Bundesministeriums der Justiz. In Ziffer 2.7 stehen bevollmächtigte und betreuende Person mit Name, Anschrift und Kontakt wie im
  Formular; der Hinweis auf die Vorsorgevollmacht erscheint nur, wenn die Besprechung bejaht ist. Ziffer 2.12 fragt getrennt,
  wo Sie sich informiert haben und wer Sie beraten hat. Eine fehlende Angabe bleibt eine Lücke zum Ausfüllen.
- Bringt eine Datei die Kopie eines mitgelieferten Auszugs aus einer früheren Fassung mit, ersetzt die App sie beim
  Öffnen durch die aktuelle Fassung und vermerkt das nach dem Öffnen und in den Einstellungen. Eine veränderte Kopie
  bleibt, wie sie ist.
- Im Studio und beim Sichern in „Schlüssel teilen“ werden private Schlüssel nur noch mit Passwort gespeichert
  (Dateiendung `.vdkey`).
- Die Ausgabe heißt jetzt „Bildungsangaben (maschinenlesbar)“, vorher „Bildungsnachweise (maschinenlesbar)“.
- Der Hinweis am Feld „Abschrift im Register hinterlegt“ (Zentrales Vorsorgeregister) ist neu gefasst.

### Behoben
- Firefox fragte beim ersten Sichern ohne Vorwarnung, ob die Seite Daten dauerhaft speichern darf. Jetzt sagt ein Hinweis
  vorher, warum und was „Erlauben“ bewirkt — nur in Firefox, dem Browser, der fragt. Unter „Sichern & Wiederherstellen“
  steht dauerhaft, wann ein Browser das Depot löschen kann, mit dem Knopf „Sicherungskopie erstellen“ direkt darunter.

## [v1.0.857] – 2026-10-02

### Hinzugefügt
- Der Export als HL7 FHIR IPS trägt Vorsorgevollmacht, Patientenverfügung und Betreuungsverfügung als eigene Sektion
  „Advance Directives“: je Verfügung ein Consent nach EU EPS mit Rechtsgrundlage und den bevollmächtigten Personen, dazu,
  wo zutreffend, der Widerspruch gegen die Notvertretung durch Ehegatten. Ablageort und Gesundheitsbefugnisse gehen nur
  mit Freigabe der sensiblen Felder mit. In allen 24 Sprachen des Begleittexts gegen IPS 2.0.0 und EU EPS (Fassung
  1.0.0-ballot) geprüft (U2-ADR-466).
- Namen und Anschrift in getrennten Feldern (U2-ADR-467): Personen haben Familienname und Vornamen, Identität und
  Personen haben Straße, Hausnummer, Postleitzahl und Ort. Die bisherigen Einträge bleiben stehen. Aus einer bisherigen
  Anschrift schlägt die Anwendung die Teile nur vor; sie gelten erst, wenn die Person sie übernimmt. Namen werden nie
  automatisch zerlegt. FHIR, vCard, der selbst ausgestellte Nachweis über die Person und die Dokumente nutzen die
  getrennten Teile; XMeld liest sie getrennt ein.
- Beim Export als HL7 FHIR IPS wählt man die Sprache der festen Sätze (Narrative, Leer-Hinweise, Herkunft): alle 24
  EU-Amtssprachen, voreingestellt Englisch. Codes und die eigenen Einträge bleiben, wie sie sind. Die englischen
  Leer-Hinweise sind die amtlichen Sätze der eHDSI (MyHealth@EU); eine noch nicht unabhängig geprüfte Übersetzung sagt das
  in der Auswahl und im Export (U2-ADR-458).
- Passwort: Jedes Feld für ein neues Passwort bietet „Passwort vorschlagen“ an, sechs zufällige Wörter aus einer Wortliste
  der Produktsprache. Der Vorschlag lässt sich ersetzen und vorlesen; die Bestätigung tippt man selbst. Wer ein eigenes
  Passwort wählt, sieht einen Hinweis, gesperrt wird nichts (U2-ADR-463).
- Weichen der Stand auf dem Gerät und die geöffnete Datei voneinander ab, gibt es neben der Wahl einer Seite „Beide
  zusammenführen“. Listen werden Eintrag für Eintrag zusammengeführt: Was nur eine Seite geändert hat, wird übernommen,
  wo beide etwas geändert haben, wird gefragt. Ein gelöschter Eintrag kehrt nicht zurück, eine Änderung geht nicht ohne
  Rückfrage verloren (U2-ADR-463).
- Die Anwendung kann sich den Speicherort der Depotdatei merken, nur nach Zustimmung und in Browsern, die das
  unterstützen. Die nächste Sicherungskopie geht dann ohne Dateidialog in dieselbe Datei. In den Einstellungen steht der
  gemerkte Ort mit „Speicherort vergessen“ (U2-ADR-031).
- In der installierten Desktop-App von Chrome und Edge öffnet ein Doppelklick auf die Depotdatei die Anwendung mit dieser
  Datei; sie wird das Speicherziel. Ist schon ein Depot offen, wird es zuerst geschlossen, mit Warnung, falls etwas
  ungesichert ist (U2-ADR-463).
- Notfall: Die Notfallkarte zeigt, wo die Vorsorgevollmacht liegt, wie bisher schon bei der Patientenverfügung (Nachtrag
  U2-ADR-096).
- Anfragen per QR-Code: Das Studio erzeugt für eine signierte Anfrage eine kompakte Form, die die Stelle unter einer
  kurzen Adresse ablegt; der QR-Code trägt nur diese Adresse und bleibt so vom Aushang lesbar. Die Anwendung liest die
  kompakte Form aus Link und eingefügtem Text, prüft die Signatur wie bisher und liest Anfragen in der bisherigen Form
  weiter. Die Anwendung selbst lädt nichts; die kurze Adresse ruft das Handy auf, dafür braucht es ein Netz (U2-ADR-460).

### Geändert
- Vivodepot Studio liegt jetzt unter register.vivodepot.de/studio.html; die bisherige Adresse leitet dorthin weiter.
  Lese-App, „Schlüssel teilen“ und der VC-Issuer zeigen wie das Studio im Kopf den Produktnamen und einen Link zur Seite
  der Marke (U2-ADR-362).

### Behoben
- Wurde bei offenem Depot eine zweite Fassung derselben Depotdatei geöffnet, bot die Anwendung die abweichenden Angaben
  nie zum Zusammenführen an: der Vergleich fand das Depot nicht und brach ab (U2-ADR-463).
- In einer älteren Datei mit eigenem Sprachmodul erschienen Texte, die es in diesem Modul noch nicht gab, auf Deutsch,
  auch wenn die Anwendung eine andere Sprache hatte. Sie kommen jetzt aus der Sprache der Anwendung; die Lese-App zeigt
  sie ersatzweise auf Englisch, wenn es sie dort gibt, sonst auf Deutsch, und kennzeichnet das (U2-ADR-463).
- Der FHIR-Export nahm bei einer vertretenden Person das letzte Wort des Namens als Familiennamen, und beim Anlegen eines
  Sub-Depots für ein Kind wurde das erste Wort des Namens als Vorname eingesetzt. Beides nimmt die Teile jetzt nur aus
  den eigenen Feldern oder lässt sie leer (U2-ADR-467).

## [v1.0.843] – 2026-10-01

### Hinzugefügt
- PBKDF2-Iterationen je Kryptoversion (U2-ADR-271, Entscheidung vom 04.09.2026, nachgetragen): eine Zuordnung außerhalb des
  gepinnten Krypto-Blocks hält fest, welche Iterationszahl zu welcher Kryptoversion gehört — je erlaubte Version ein Eintrag,
  heute überall dieselbe Zahl. Eine
  Erhöhung geht damit nur über einen Versionssprung; jede Fundstelle des Werts im ausgelieferten Bestand ist an ihn gebunden.
- Sub-Depot: Zum 18. Geburtstag der vertretenen Person erinnert die Anwendung an die Übergabe, im Prüfblatt und im
  Kalender.
- Sub-Depot: Widerspricht die vertretene Person einer Handlung, wird das festgehalten, bei jeder weiteren Handlung
  angezeigt und nie still gelöscht.
- Sub-Depot: Das Kind übernimmt sein Depot später allein mit seinem Passwort, ohne dass die Eltern mitwirken müssen.
  Wer das Depot führt, richtet dafür einmal einen Ort ein (Kind-Datei).
- Meine Dokumente: Ein Original lässt sich zusammen mit seinem Verwahrungsnachweis herunterladen. Ein eingelesenes
  Gesundheitsdokument ist als sensibel markiert.
- Anfragen: Die Antwort nennt, wer antwortet. Anfrage, Antwort und Notfall-Ansicht zeigen die Angaben mit lesbaren
  Beschriftungen. Die Antwort wird als JWE (RFC 7516) verschlüsselt; die Lese-App öffnet sie und Antworten im früheren
  Format.
- Vertretung: Ein Fach kann ablaufen („gilt bis“); ein abgelaufenes Fach öffnet nicht mehr. Im FHIR-Export erscheint
  die Vertretung mit ihrer Rolle und ihrem Ende.
- Notfall: Schwangerschaft und Weglaufgefährdung sind eigene Felder; im IPS-Export erscheinen sie als
  Schwangerschaftsstatus und als Warnhinweis.
- Bildung: Ein fremd ausgestellter Open Badge 3.0 wird als Original verwahrt und unverändert vorgezeigt.
- Verwaltung: Bei den Stammdaten-Feldern (Name, Anschrift, Geburtsdatum u. a.) zeigt die Anwendung den Bezug zum
  Föderalen Informationsmanagement (FIM) mit Kennung, Fassung und Status; der FIM-Export trägt ihn mit.
- Vorführung: Die Erklärtexte erscheinen als Notiz am jeweiligen Element; eine Demo „Patientin“ zeigt Originalbefunde
  unter „Meine Dokumente“.
- Vivodepot Studio: Das Werkzeug für Vorlagen heißt jetzt so und führt im Kopf zu vivodepot.de. Die Allergene Erdnuss
  und Schalenfrüchte stehen wieder zur Auswahl.
- Nachbau: Die ausgelieferten Dateien lassen sich aus dem Quelltext byte-gleich nachbauen; wie, steht in
  `DEVELOPING.md`.

### Behoben
- In der Kurzzeile eines Listeneintrags stand ein Datum ohne Beschriftung und im Format JJJJ-MM-TT („… · 2026-08-10 ·
  2026-10-15“) — welches die Frist ist, sagte die Zeile nicht. Jetzt „Gültig bis / Frist: 15.10.2026“, in der Ansicht, im
  Word-Export und in der Lese-App; ein Wächter prüft jedes Datums-Unterfeld jeder Liste.
- Die Hilfe spricht nur noch vom Sub-Depot, nicht mehr zusätzlich vom „Unterdepot“.
- Beim Export an die EUDI-Wallet trug der Dateiname den Vornamen; ein Dateiname liegt außerhalb jeder Verschlüsselung.
  Jetzt trägt er keinen Personennamen mehr, wie alle anderen erzeugten Dateien.
- Nach dem Öffnen stand das eingetippte Passwort (beim Öffnen mit dem Wiederherstellungs-Code auch Code und neues
  Passwort) weiter im ausgeblendeten Öffnen-Schirm. Er wird jetzt beim Eintritt geleert; ein Wächter hält jedes
  Geheimnis-Feld in einem Dialog oder im Öffnen-Schirm, die beide geleert werden.
- Notfallkarte: der Name steht in der Reihenfolge, die die Bürgerin gewählt hat („Familienname zuerst anzeigen“) — bisher
  immer Vorname zuerst (U2-ADR-277, Entscheidung vom 05.09.2026, nachgetragen).
- Eine über ein Fach geöffnete Vertretung konnte Angaben ändern; sie liest jetzt nur.
- In Pro lieferten Bürger-Bereiche ohne Werte an mehreren Stellen leere Antworten oder brachen ab; sie werden jetzt
  aus dem Katalog gelesen.
- FHIR-Export: ICD-10-GM und ATC tragen die Adresse aus dem deutschen Basisprofil und die Version des Codesystems.
  Bestehende Depots werden beim Öffnen umgestellt.
- Ein Exportweg hieß nach einem XÖV-Standard, den es für diese Daten nicht gibt; er heißt jetzt
  „Verwaltungs-Stammdaten“.
- Der Dialog zum Abgeben eines Sub-Depots nennt die Grenze: Ältere Sicherungskopien der eigenen Datei enthalten das
  Depot weiter.
- Studio: Der Link für Anfragen zeigt auf die ausgelieferte Fassung.

## [v1.0.842] – 2026-10-01

### Sicherheit
- VD-SEC-006 (kritisch): Behoben in v842: Ein fremdes Logikmodul konnte beim Öffnen seines Dokuments Programmcode in der
  Anwendung ausführen und damit angezeigte Depotdaten an eine fremde Adresse schicken — ohne Signatur eingelassen oder in
  einer fremden Depotdatei mitgebracht. Betroffen: Fassungen bis v841.
  Was zu tun ist: auf v842 aktualisieren; Module und fremde Depotdateien nur aus bekannter Quelle.
- VD-SEC-007 (kritisch): Behoben in v842: Eine fremde Depotdatei konnte über den Namen ihrer Marke, den Anbieternamen einer
  Vorlage oder die Liste einer Zusammenstellung Programmcode in der Anwendung ausführen und Daten aus der geöffneten Datei
  an eine fremde Adresse bringen. Betroffen: Fassungen bis v841.
  Was zu tun ist: auf v842 aktualisieren; fremde Depotdateien nur öffnen, wenn man der Absenderin
  vertraut.
- VD-SEC-008 (kritisch): Behoben in v842: Im Ausstellungswerkzeug der Trust Authority konnte eine präparierte Einreichung
  über ihre Anbieter-Kennung Programmcode ausführen. Betroffen: Schalen-Fassungen bis v841.
  Was zu tun ist: nichts für Nutzerinnen; Einreichungen werden nur mit v842 oder später ausgestellt.

### Behoben
- Härtung: Im Studio setzt die Antwort auf das Vereinbarungs-Angebot einer Person einen Verweis „Quelle“ nur noch
  für http(s)-Adressen; andere erscheinen als Text. In der Lese-App werden die Lückensätze, die ein signiertes
  Sprachmodul überschreiben kann, maskiert eingesetzt.

## [v1.0.818] – 2026-09-28

### Hinzugefügt
- Wiederherstellungs-Code (U2-ADR-430): nach dem Anlegen bietet die App einen erzeugten Code an (135 Bit, sieben
  Vierergruppen mit Prüfzeichen), der die Datei öffnet, wenn das Passwort vergessen ist. Voreinstellung ist
  „einrichten“; wer ablehnt, liest vorher die Tragweite. Der Code wird nur angezeigt und von Hand abgeschrieben, zur
  Kontrolle einmal eingetippt, und steht in keiner Datei, keinem Druck, keinem Export. Ein eigenes Code-Blatt wird
  ohne Code gedruckt, getrennt vom Notfall-Blatt mit dem Passwort („Nicht zum Passwort legen.“). Wer mit dem Code
  öffnet, legt im selben Schritt ein neues Passwort fest; der Code gilt weiter. In den Einstellungen: Zustand,
  neu einrichten, entfernen (mit dem Hinweis, dass ältere Kopien den Code weiter tragen). Beim Passwortwechsel gilt
  der Code weiter, wenn er eingegeben wird, sonst fällt er weg. Eine exportierte Kopie trägt ihn nie.
- Vorsorge: neue Gruppe „Verständigung und Unterstützung“ — Sprache, Unterstützung bei der Verständigung (Dolmetschen,
  Gebärdensprache, Leichte Sprache), Begleitperson, „Was mir hilft“ und „Wer nicht informiert werden soll“. Sprache,
  Unterstützung und Begleitperson stehen auf der Notfallkarte und im Blatt Krankenhaus der Angehörigen-Sicht; „Wer nicht
  informiert werden soll“ steht auf keinem von beiden.
- Notfallkarte: „Besondere Situation“ und „Hinweis für Rettungskräfte“ stehen jetzt auf der Karte (höchstens 160 Zeichen,
  dann „… (vollständig in der Datei)“) und ungekürzt im Blatt Krankenhaus.
- Vorsorge: die Festlegungen, die der Assistent zur Patientenverfügung schreibt, sind Felder des Bereichs Vorsorge und
  können mit einer Anfrage erfragt werden; sie werden aus den Antworten abgeleitet und nur angezeigt (U2-ADR-440).
- Bildung: ein fremd ausgestellter European Digital Credential wird als Original verwahrt und byte-gleich vorgezeigt
  (U2-ADR-443).

### Sicherheit
- VD-SEC-004 (mittel): Teilweise behoben in v818, vollständig ab v830: Erzeugte Dateinamen trugen Personennamen
  (Übergabe-Datei eines Sub-Depots, Export-Dateien, Datei eines Empfängerkreises; bis v830 auch der Export an die
  EUDI-Wallet). Ein Dateiname liegt außerhalb der Verschlüsselung. Betroffen: alle Wege bis v811, der Export an die
  EUDI-Wallet bis v818.
  Was zu tun ist: auf v830 aktualisieren; ältere Dateien bei Bedarf umbenennen.

### Behoben
- FHIR-Export: `display` ist nur noch der offizielle Begriff des Codesystems oder fehlt; der eigene deutsche Name steht
  in `text`. Die mitgelieferten ICD-10-GM-Codes sind endständig (E11.90, I10.90, J45.99 statt E11.9, I10, J45.9).
- Der Hinweis am Feld „Abschrift im Register hinterlegt“ behauptete eine Rechtslage zum Zentralen Vorsorgeregister, die
  nicht belegt ist; er beschreibt jetzt nur das Feld.

## [v1.0.811] – 2026-09-27

### Hinzugefügt
- Identität: die Ablageorte von Geburtsurkunde, Ehe- oder Lebenspartnerschaftsurkunde und Familienstammbuch sind eigene
  Felder (U2-ADR-439). Eine Anfrage kann sie erfragen, und der Auszug zur Erbschein-Vorbereitung nennt sie.

## [v1.0.810] – 2026-09-27

### Sicherheit
- VD-SEC-003 (hoch): Behoben: Felder, die ein Assistent unter einer Bedingung ausblendet, zeigten Listen-Editor,
  Bereichsansicht, PDF und Vorlesen trotzdem. Betroffen: Fassungen bis v806.
  Was zu tun ist: auf v810 aktualisieren. Früher erzeugte PDFs können die ausgeblendeten Felder
  enthalten; bei Bedarf neu erzeugen und die alten nicht weitergeben.
- VD-SEC-005 (hoch): Behoben: Hatte die Person eine Bedingung für die Weitergabe festgelegt, ging der Auszug eines
  Empfängerkreises als QR-Code ohne die Vereinbarung hinaus, als Datei nicht. Betroffen: Fassungen bis v806.
  Was zu tun ist: auf v810 aktualisieren.

### Hinzugefügt
- JSON-Schemas (2020-12) für alle Modultypen unter `docs/<typ>-modul/`, je mit einer Probe, die Schema und
  App-Prüfung im Gleichlauf hält.

### Geändert
- Rechtsraum-Modul-Schema (`docs/rechtsraum-modul/rechtsraum-modul-schema.json`): das Pflichtfeld
  `schemaVersion` entfällt. Die App hat es nie gelesen und als unbekannt verworfen; zugleich lehnte das
  Schema `modulTyp` und `sprache` ab, die die App annimmt. Maßstab ist jetzt die Prüfung der App.
  Module mit `schemaVersion` laden weiter, das Feld wird verworfen und benannt. Siehe `docs/JURISDICTIONS.md`.
- FHIR-Export: SNOMED CT nur so, wie SNOMED International es freigegeben hat — als `display` der unveränderte Begriff
  aus dem Global Patient Set, sonst kein `display`. Die Pflicht-Wortlaute für LOINC, ICD-10-GM und ATC-GM stehen
  wörtlich im Kern, in NOTICE.md und in THIRD_PARTY_LICENSES.
- Template-Generator: die Vorschlagsliste bietet keine Allergen-Codes mehr an, das Beispielfeld „Bekannte Allergien“ ist
  Freitext, bis SNOMED International die zwei angefragten Konzepte beantwortet.

### Behoben
- Ein Stellensatz-Modul mit dem Rechtsraum ` DE` (Leerraum) oder `de` wurde angenommen und lieferte im
  deutschen Depot fremde Stellen; der reservierte Rechtsraum war nur in exakter Schreibung geschützt.
  Rechtsraum- und Sprach-Codes werden jetzt einmal normalisiert, und Prüfung, Speicherung und Nachschlagen
  benutzen denselben Wert (auch für Textsatz- und Rechtsraum-Module; `at` und `AT` sind derselbe Rechtsraum).
- Ein Logikmodul mit dem Blocktyp `constructor` (oder einem anderen vom Objekt geerbten Namen) wurde
  angenommen. Konstanten-Tabellen werden jetzt nur noch mit eigenen Einträgen nachgeschlagen.

## [v1.0.806] – 2026-09-26

### Behoben
- Die englische Ausgabe zeigt die Lebenslagen englisch, im Wegweiser, in der Bestandsauswahl und in der Suche.
- Einstellungen → Rechtliches verlinkt die Datenschutzerklärung der Webseite.
- Englische Ausgabe: die rechtliche Betreuung heißt „court-appointed representation“ statt „guardianship“; die
  Unterlagen für die Steuerberatung nennen den Ort der Zugangsdaten, nicht die Zugangsdaten selbst.
- Template-Generator: das Impressum verlinkt auf vivodepot.de statt Platzhalter zu zeigen; das Logo der App steht im
  Kopf, und auf schmalen Bildschirmen bleibt er bedienbar.

## [v1.0.805] – 2026-09-26

### Sicherheit
- VD-SEC-001 (hoch): Behoben: Abgewählte Angaben aus Listen wurden beim Beantworten einer Anfrage trotzdem übermittelt.
  Was zu tun ist: auf v805 aktualisieren.

## [v1.0.803] – 2026-09-26

### Hinzugefügt
- SMART Health Links: ein geprüftes Original der Mappe lässt sich jetzt auch über ein Manifest weitergeben; „Daten
  einlesen“ verweist auf die Abhol-Seite.
- Lese-App: die Antwort auf eine Anfrage zeigt je Angabe, ob sie aus einem geprüften Nachweis stammt oder von der Person
  angegeben ist.

### Behoben
- Template-Generator, VC-Issuer und „Schlüssel teilen“ zeigen sich in einer fremden Seite nicht mehr, sondern nur als
  oberstes Fenster.
- Vorführung: das Band verdeckte im Handy-Format die Tab-Leiste, wenn diese nach dem Laden wuchs.

## [v1.0.800] – 2026-09-25

### Hinzugefügt
- Vorsorge: Ablehnung der Notvertretung durch Ehegatten, mit Datum und Eintragung im Zentralen Vorsorgeregister
  (U2-ADR-433); die Notfallkarte zeigt Ablehnung und Eintragung, die Registernummer nie.

### Behoben
- Die Einstellungen zeigten die Version als „vv1.0-rc“, jetzt „v1.0“.

## [v1.0.799] – 2026-09-25

### Sicherheit
- VD-SEC-002 (hoch): Behoben: Beim Herausgeben einer Zusammenstellung, eines Anlass-Auszugs oder einer Antwort trug der
  Rohwert einer Liste auch zurückgehaltene Angaben hinaus. Betroffen: Fassungen bis v797.
  Was zu tun ist: auf v799 aktualisieren. Früher erzeugte Zusammenstellungs- oder
  Anlass-Dateien können die zurückgehaltenen Angaben enthalten; bei Bedarf neu erzeugen und die alten nicht weitergeben.

## [v1.0.797] – 2026-09-25

### Behoben
- Die Vorsorgevollmacht entsteht wieder als PDF; sie brach ab, sobald die Gesundheitssorge beantwortet war.
- Ein Auszug aus einem Sub-Depot trägt die Personen und Institutionen, auf die seine Felder verweisen; die Antwort auf
  eine Anfrage meldete sonst etwa eine hinterlegte Bevollmächtigte als „nicht hinterlegt“.

## [v1.0.795] – 2026-09-25

### Behoben
- Die aus dem Shop ausgelieferte Fassung startet auch ohne Netz: sie bringt ihren Service Worker mit.

## [v1.0] – 2026-09-24

Erste veröffentlichte Version.
