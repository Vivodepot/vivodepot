# Prüfregeln

<!-- Erzeugt aus pruefregeln.json von tools/pruefregeln-lesbar-erzeugen.js. Nicht von Hand ändern. -->

Fassung 1 · Stand 2026-10-10 · maschinenlesbar: [pruefregeln.json](pruefregeln.json), Schema: [pruefregeln-schema.json](pruefregeln-schema.json)

Geprüft werden Form und Regeln. Ob der Inhalt einer Vorlage richtig ist, wird nicht geprüft.

Maßstab ist die Bürger-App: Jede Regel mit kernGrund gibt einen Ablehnungsgrund ihrer Prüfer wieder. Weicht die App ab, gilt die App, und diese Datei wird nachgezogen.

## Selbst prüfen

```
npm ci
node tools/vorlage-pruefen.js --dokument meine-datei.json
```

Das Werkzeug kennt keinen Schlüssel und öffnet keine Verbindung. Es prüft keine Signatur und sagt nichts darüber, von wem eine Datei kommt.

## Urteile

| Urteil | Bedeutung |
|---|---|
| `bestanden` | Die App nimmt die Datei an und verwirft nichts. |
| `gemeldet` | Die App nimmt die Datei an, verwirft aber Teile; jeder steht als Zeile da. |
| `abgewiesen` | Die App nimmt die Datei nicht an; die Zeile nennt die Regel. |
| `nichtGeprueft` | Für diese Art gibt es keinen Regelsatz, oder die Prüfung konnte nicht laufen. Kein Urteil über die Datei. |

## Schwere einer Zeile

| Schwere | Bedeutung |
|---|---|
| `abweisung` | Die Datei wird nicht angenommen. |
| `meldung` | Ein Teil wird nicht übernommen, der Rest kommt an. |
| `hinweis` | Ändert das Urteil nicht. |

## allgemein

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `allgemein.unbekannte-art` | hinweis | Die Art der Datei ist nicht erkennbar oder für sie gibt es keinen Regelsatz. Sie wird nicht geprüft. |  |
| `allgemein.pruefung-nicht-moeglich` | hinweis | Die Prüfung konnte nicht laufen oder hat nichts Verwertbares geliefert. Das ist kein Urteil über die Datei. |  |
| `allgemein.signatur-nicht-geprueft` | hinweis | Die Datei trägt eine Signatur. Diese Prüfung liest nur das Modul darin; die Signatur prüft sie nicht. |  |
| `allgemein.schema` | hinweis | Das veröffentlichte Schema dieser Art nennt an dieser Stelle eine Abweichung. Das Urteil fällt die Prüfung der Bürger-App, das Schema nennt die Stelle. |  |
| `allgemein.schema-nicht-geprueft` | hinweis | Das Schema konnte nicht geprüft werden, weil dem Aufruf kein Schema-Prüfer mitgegeben wurde. |  |
| `allgemein.teil-verworfen` | meldung | Ein Teil der Datei wird nicht übernommen; der Rest kommt an. Die Fundstelle nennt den Teil, der Grund des Kerns steht daneben. |  |
| `allgemein.nur-signiert-erlaubt` | hinweis | Module dieser Art lässt die Bürger-App nur mit geprüfter Signatur ein. Die Form wird hier trotzdem geprüft. | `nur-signiert-erlaubt` |
| `allgemein.kein-json` | abweisung | Die Datei ist kein gültiges JSON. | `kein-json` |
| `allgemein.kein-objekt` | abweisung | Die Datei enthält kein JSON-Objekt. | `kein-objekt` |
| `allgemein.zu-gross` | abweisung | Das Modul ist größer als 512 KB. | `zu-gross` |
| `allgemein.zu-tief` | abweisung | Das Modul ist tiefer als 40 Ebenen geschachtelt. | `zu-tief` |
| `allgemein.nicht-serialisierbar` | abweisung | Das Modul lässt sich nicht als JSON schreiben. | `nicht-serialisierbar` |
| `allgemein.unbekannter-typ` | abweisung | Der Wert von modulTyp nennt keine Modulart, die die Bürger-App kennt. | `unbekannter-typ` |
| `allgemein.kennung-ab-werk` | abweisung | Ein Logik-Modul trägt die Kennung eines Moduls, das die App ab Werk mitbringt, aber einen anderen Inhalt. | `kennung-ab-werk` |
| `allgemein.appVersion` | abweisung | appVersion ist angegeben, aber keine ganze Zahl ab 1. | `appVersion` |
| `allgemein.app-zu-alt` | abweisung | Das Modul verlangt mit appVersion eine neuere Fassung der App als die geprüfte. | `app-zu-alt` |
| `allgemein.sprache` | abweisung | Das Modul trägt Beschriftungen, nennt aber keine Sprache. | `sprache` |
| `allgemein.sprache-form` | abweisung | Die Angabe sprache hat nicht die Form eines Sprachkennzeichens (zwei oder drei Kleinbuchstaben, optional mit Zusatz). | `sprache-form` |
| `allgemein.aeltere-fassung` | abweisung | In der App liegt bereits eine neuere Fassung dieses Moduls. | `aeltere-fassung` |
| `allgemein.zweite-herkunft` | abweisung | In der App liegt bereits ein Modul dieser Art aus einer anderen Herkunft. | `zweite-herkunft` |
| `allgemein.ungueltig` | abweisung | Die Prüfung der Art lehnt das Modul ab, ohne einen Grund zu nennen. | `ungueltig` |
| `allgemein.fehler` | hinweis | Die Prüfung in der App ist mit einem Fehler abgebrochen. Das ist kein Urteil über die Datei. | `fehler` |
| `allgemein.kein-depot` | hinweis | Die App hatte kein geöffnetes Depot. Das ist kein Urteil über die Datei. | `kein-depot` |
| `allgemein.vorfuehrung` | hinweis | Die App lief in der Vorführung; dort wird kein Modul eingelassen. Das ist kein Urteil über die Datei. | `vorfuehrung` |

## textsatz

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `textsatz.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `textsatz.sprache` | abweisung | sprache fehlt oder ist leer. | `sprache` |
| `textsatz.reserviert` | abweisung | Die Sprache ist die eingebaute Sprache der App; ein Sprachmodul kann sie nicht ersetzen. | `reserviert` |
| `textsatz.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `textsatz.texte` | abweisung | texte fehlt oder ist kein Objekt. | `texte` |
| `textsatz.leer` | abweisung | Nach der Prüfung bleibt kein gültiger Text übrig. | `leer` |

## stellensatz

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `stellensatz.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `stellensatz.rechtsraum` | abweisung | rechtsraum fehlt oder ist leer. | `rechtsraum` |
| `stellensatz.reserviert` | abweisung | Der Rechtsraum ist der eingebaute der App; ein Stellensatz kann ihn nicht ersetzen. | `reserviert` |
| `stellensatz.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `stellensatz.stellen` | abweisung | stellen fehlt oder ist kein Objekt. | `stellen` |

## rechtsraum

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `rechtsraum.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `rechtsraum.rechtsraum` | abweisung | rechtsraum fehlt oder ist leer. | `rechtsraum` |
| `rechtsraum.reserviert` | abweisung | Der Rechtsraum ist der eingebaute der App; ein Modul kann ihn nicht ersetzen. | `reserviert` |
| `rechtsraum.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `rechtsraum.typen` | abweisung | typen fehlt, oder nach der Prüfung bleibt kein gültiger Eintrag übrig. | `typen` |

## institutionsArt

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `institutionsArt.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `institutionsArt.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `institutionsArt.arten` | abweisung | arten fehlt oder ist kein Objekt. | `arten` |

## blattformat

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `blattformat.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `blattformat.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `blattformat.herkunft` | abweisung | herkunft fehlt oder ist leer. | `herkunft` |
| `blattformat.format` | abweisung | format fehlt oder nennt kein Blattformat, das die App kennt. | `format` |

## bedingungskatalog

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `bedingungskatalog.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `bedingungskatalog.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `bedingungskatalog.herkunft` | abweisung | herkunft fehlt oder ist leer. | `herkunft` |
| `bedingungskatalog.eintraege` | abweisung | eintraege fehlt, ist keine Liste, oder nach der Prüfung bleibt kein gültiger Eintrag übrig. | `eintraege` |

## format

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `format.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `format.kein-code-erlaubt` | abweisung | Das Modul enthält ausführbaren Code oder einen Schlüssel, der Code tragen könnte. Ein Format-Modul ist reine Beschreibung. | `kein-code-erlaubt` |
| `format.format` | abweisung | format fehlt oder ist leer. | `format` |
| `format.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `format.richtung` | abweisung | richtung ist weder import noch export. | `richtung` |
| `format.reserviert` | abweisung | Die Kennung in format ist von der App belegt oder nicht in der verlangten Schreibweise. | `reserviert` |
| `format.sektor` | abweisung | sektor fehlt oder nennt keinen Bereich, den die App kennt. | `sektor` |
| `format.label` | abweisung | label fehlt oder ist leer. | `label` |
| `format.kein-reiner-text` | abweisung | label ist kein reiner Text (Markup oder Zeichenreferenz). | `kein-reiner-text` |
| `format.leser` | abweisung | leser nennt keinen Leser, den die App kennt. | `leser` |
| `format.schreiber` | abweisung | schreiber nennt keinen Schreiber, den die App kennt. | `schreiber` |
| `format.akzeptiert` | abweisung | akzeptiert ist angegeben, aber kein Text. | `akzeptiert` |
| `format.quelle` | abweisung | quelle ist angegeben, aber kein gültiger Pfad. | `quelle` |
| `format.rechtsraum` | abweisung | rechtsraum ist angegeben, aber kein Text. | `rechtsraum` |
| `format.namensraum` | abweisung | namensraum hat nicht die verlangte Form. | `namensraum` |
| `format.namensraum-ohne-xml` | abweisung | namensraum ist nur bei einer Ausgabe mit dem XML-Schreiber zulässig. | `namensraum-ohne-xml` |
| `format.wurzel-ohne-xml` | abweisung | wurzel ist kein Text oder steht nicht bei einer Ausgabe mit dem XML-Schreiber. | `wurzel-ohne-xml` |
| `format.hinweis` | abweisung | hinweis hat nicht die verlangte Form. | `hinweis` |
| `format.hinweis-ohne-xml` | abweisung | hinweis ist nur bei einer Ausgabe mit dem XML-Schreiber zulässig. | `hinweis-ohne-xml` |
| `format.erkennen` | abweisung | erkennen ist angegeben, aber keine Liste. | `erkennen` |
| `format.erkennen-leer` | abweisung | Von den Einträgen in erkennen ist keiner gültig. | `erkennen-leer` |
| `format.zuordnung` | abweisung | zuordnung fehlt, ist keine Liste oder leer. | `zuordnung` |
| `format.zuordnung-leer` | abweisung | Von den Einträgen in zuordnung ist keiner gültig. | `zuordnung-leer` |
| `format.zuordnung-nur-fest` | abweisung | Die Zuordnung nennt kein einziges Feld des Depots. | `zuordnung-nur-fest` |
| `format.schreiber-xml-ohne-wurzel` | abweisung | Eine Ausgabe mit dem XML-Schreiber nennt weder wurzel noch quelle. | `schreiber-xml-ohne-wurzel` |
| `format.schreiber-xml-wurzelname` | abweisung | Der Name des Wurzelelements ist kein gültiger XML-Name. | `schreiber-xml-wurzelname` |
| `format.schreiber-xml-zwei-wurzeln` | abweisung | Eine Ausgabe mit dem XML-Schreiber nennt wurzel und quelle zugleich. | `schreiber-xml-zwei-wurzeln` |
| `format.schreiber-xml-zielname` | abweisung | Ein ziel in zuordnung ist kein gültiger XML-Name. | `schreiber-xml-zielname` |
| `format.vertreter-ohne-nachweis` | abweisung | Das Modul schreibt die bevollmächtigte Person, aber keinen Nachweis der Vollmacht als Anhang. | `vertreter-ohne-nachweis` |
| `format.anhang-rolle-doppelt` | abweisung | Das Modul nennt dieselbe Rolle eines Anhangs mehr als einmal. | `anhang-rolle-doppelt` |

## bereich

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `bereich.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `bereich.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `bereich.herkunft` | abweisung | herkunft fehlt oder ist leer. | `herkunft` |
| `bereich.bereiche` | abweisung | bereiche fehlt oder ist kein Objekt. | `bereiche` |
| `bereich.leer` | abweisung | Nach der Prüfung bleibt kein gültiger Bereich übrig. | `leer` |

## situation

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `situation.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `situation.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `situation.herkunft` | abweisung | herkunft fehlt oder ist leer. | `herkunft` |
| `situation.situationen` | abweisung | situationen fehlt oder ist kein Objekt. | `situationen` |
| `situation.leer` | abweisung | Nach der Prüfung bleibt keine gültige Situation übrig. | `leer` |

## wizard

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `wizard.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `wizard.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `wizard.herkunft` | abweisung | herkunft fehlt oder ist leer. | `herkunft` |
| `wizard.wizards` | abweisung | wizards fehlt oder ist kein Objekt. | `wizards` |
| `wizard.leer` | abweisung | Nach der Prüfung bleibt kein gültiger Assistent übrig. | `leer` |

## ereignisAchse

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `ereignisAchse.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `ereignisAchse.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `ereignisAchse.herkunft` | abweisung | herkunft fehlt oder ist leer. | `herkunft` |
| `ereignisAchse.eintraege` | abweisung | eintraege fehlt oder ist keine Liste. | `eintraege` |
| `ereignisAchse.leer` | abweisung | Nach der Prüfung bleibt kein gültiger Eintrag übrig. | `leer` |

## angehoerigenVorlage

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `angehoerigenVorlage.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `angehoerigenVorlage.modulTyp` | abweisung | modulTyp ist angegeben, nennt aber nicht diese Art. | `modulTyp` |
| `angehoerigenVorlage.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `angehoerigenVorlage.herkunft` | abweisung | herkunft fehlt oder ist leer. | `herkunft` |
| `angehoerigenVorlage.sprache` | abweisung | sprache fehlt oder ist leer. | `sprache` |
| `angehoerigenVorlage.rechtsraum` | abweisung | rechtsraum ist angegeben, aber kein Text oder leer. | `rechtsraum` |
| `angehoerigenVorlage.rechtsraumName` | abweisung | rechtsraumName ist angegeben, aber kein Text oder leer. | `rechtsraumName` |
| `angehoerigenVorlage.berufsstand` | abweisung | berufsstand ist angegeben, aber kein Text oder leer. | `berufsstand` |
| `angehoerigenVorlage.berufsstandName` | abweisung | berufsstandName ist angegeben, aber kein Text oder leer. | `berufsstandName` |
| `angehoerigenVorlage.bereich` | abweisung | bereich ist angegeben, aber kein Text oder leer. | `bereich` |
| `angehoerigenVorlage.situationen` | abweisung | situationen fehlt oder ist kein Objekt. | `situationen` |
| `angehoerigenVorlage.kein-reiner-text` | abweisung | Eine Zeichenkette der Vorlage ist kein reiner Text (Markup oder Zeichenreferenz). | `kein-reiner-text` |
| `angehoerigenVorlage.leer` | abweisung | Nach der Prüfung bleibt keine gültige Situation übrig. | `leer` |

## branding

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `branding.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `branding.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `branding.nichts-gueltiges-gesetzt` | abweisung | Keine der Angaben zum Erscheinungsbild ist gültig; mindestens eine muss es sein. | `nichts-gueltiges-gesetzt` |

## logikModul

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `logikModul.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `logikModul.id` | abweisung | id fehlt oder hat nicht die verlangte Form. | `id` |
| `logikModul.titel` | abweisung | titel fehlt oder ist leer. | `titel` |
| `logikModul.sektor` | abweisung | sektor fehlt oder nennt keinen Bereich, den die App kennt. | `sektor` |
| `logikModul.herkunft` | abweisung | herkunft fehlt oder ist leer. | `herkunft` |
| `logikModul.datenSchema` | abweisung | datenSchema fehlt oder ist kein Objekt. | `datenSchema` |
| `logikModul.abschnitte` | abweisung | abschnitte fehlt oder hat nicht die verlangte Form. | `abschnitte` |
| `logikModul.blockstruktur` | abweisung | Ein Block in abschnitte hat nicht die verlangte Struktur. | `blockstruktur` |
| `logikModul.dokAusgabe` | abweisung | dokAusgabe fehlt oder hat nicht die verlangte Form. | `dokAusgabe` |
| `logikModul.unterschriftErsatzHinweis` | abweisung | unterschriftErsatzHinweis ist angegeben, hat aber nicht die verlangte Form. | `unterschriftErsatzHinweis` |

## erscheinung

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `erscheinung.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `erscheinung.moduleVersion` | abweisung | moduleVersion fehlt oder ist keine ganze Zahl ab 1. | `moduleVersion` |
| `erscheinung.nichts-gueltiges-gesetzt` | abweisung | Keine der Angaben ist gültig; mindestens eine muss es sein. | `nichts-gueltiges-gesetzt` |

## design

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `design.kein-objekt` | abweisung | Das Modul ist kein JSON-Objekt. | `kein-objekt` |
| `design.keine-tokens` | abweisung | tokens fehlt. | `keine-tokens` |
| `design.tokens-kein-objekt` | abweisung | tokens ist kein Objekt. | `tokens-kein-objekt` |
| `design.nichts-gueltiges-gesetzt` | abweisung | Keiner der Werte in tokens ist gültig; mindestens einer muss es sein. | `nichts-gueltiges-gesetzt` |

## anfrage

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `anfrage.kein-objekt` | abweisung | Die Anfrage ist kein JSON-Objekt. | `kein-objekt` |
| `anfrage.modulTyp` | abweisung | modulTyp ist angegeben, lautet aber nicht anfrage. | `modulTyp` |
| `anfrage.personendaten` | abweisung | Die Anfrage trägt einen Schlüssel, der einen Wert über eine Person enthielte. Eine Anfrage nennt Kennungen, nie Werte. | `personendaten` |
| `anfrage.anfrageVersion` | abweisung | anfrageVersion fehlt oder ist keine ganze Zahl ab 1. | `anfrageVersion` |
| `anfrage.anfrage-zu-neu` | abweisung | anfrageVersion ist höher als die Fassung, die die geprüfte App versteht. | `anfrage-zu-neu` |
| `anfrage.von` | abweisung | von fehlt oder ist leer (wer anfragt). | `von` |
| `anfrage.zweck` | abweisung | zweck fehlt oder ist leer (der Zweck). | `zweck` |
| `anfrage.grundlage` | abweisung | grundlage fehlt oder ist leer (die Grundlage). | `grundlage` |
| `anfrage.vorgang` | abweisung | vorgang fehlt oder ist leer (der Vorgang). | `vorgang` |
| `anfrage.gueltigBis` | abweisung | gueltigBis fehlt oder ist kein Datum. | `gueltigBis` |
| `anfrage.felder` | abweisung | felder fehlt, ist keine Liste oder leer. | `felder` |
| `anfrage.felder-leer` | abweisung | Von den Einträgen in felder ist keiner gültig. | `felder-leer` |
| `anfrage.antwort` | abweisung | antwort fehlt oder ist kein Objekt. | `antwort` |
| `anfrage.antwort-art` | abweisung | antwort.art nennt kein Verfahren, das die App kennt. | `antwort-art` |
| `anfrage.antwort-schluessel-fehlt` | abweisung | Für das gewählte Antwortverfahren fehlt der öffentliche Schlüssel in antwort.publicKeyJwk. | `antwort-schluessel-fehlt` |

## vorlage

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `vorlage.kein-objekt` | abweisung | Die Vorlage ist kein JSON-Objekt. | `kein Template-Objekt` (anfang) |
| `vorlage.nicht-serialisierbar` | abweisung | Die Vorlage lässt sich nicht als JSON schreiben. | `Template nicht serialisierbar` (anfang) |
| `vorlage.zu-gross` | abweisung | Die Vorlage ist größer als 70 KB. | `Template zu groß` (anfang) |
| `vorlage.formatfassung-ungueltig` | abweisung | formatFassung ist angegeben, aber keine ganze Zahl ab 1. | `formatfassung-ungueltig` |
| `vorlage.zu-neu` | abweisung | Die Vorlage trägt eine Formatfassung, die diese Fassung der Anwendung noch nicht kennt. | `vorlage-zu-neu` |
| `vorlage.nutzlasttyp-widerspruch` | abweisung | nutzlastTyp ist angegeben, heißt aber nicht vivodepot-vorlage, oder die Datei trägt zugleich modulTyp. | `nutzlasttyp-widerspruch` |
| `vorlage.nutzlasttyp-fehlt` | abweisung | Ab Formatfassung 2 muss die Vorlage nutzlastTyp tragen. | `nutzlasttyp-fehlt` |
| `vorlage.modul-keine-vorlage` | abweisung | Die Datei trägt modulTyp: sie ist ein Modul und keine Vorlage. | `modul-keine-vorlage` |
| `vorlage.felder` | abweisung | felder fehlt oder ist leer. | `felder fehlt oder ist leer` (anfang) |
| `vorlage.feld-kein-objekt` | abweisung | Ein Eintrag in felder ist kein Objekt. | `Feld ist kein Objekt` (anfang) |
| `vorlage.feldname` | abweisung | Ein Feld hat keinen feldname, oder eine Sprachvariante davon ist leer. | `feldname fehlt` (anfang) |
| `vorlage.feldname-zu-lang` | abweisung | Ein feldname ist länger als 300 Zeichen. | `feldname zu lang` (anfang) |
| `vorlage.hilfetext` | abweisung | Ein hilfetext ist angegeben, aber kein Text. | `hilfetext ist kein Text` (anfang) |
| `vorlage.hilfetext-zu-lang` | abweisung | Ein hilfetext ist länger als 2000 Zeichen. | `hilfetext zu lang` (anfang) |
| `vorlage.feldtyp` | abweisung | Ein Feld nennt einen feldtyp, den die App nicht kennt. | `unbekannter feldtyp` (anfang) |
| `vorlage.auswahl-ohne-werte` | abweisung | Ein Auswahlfeld nennt weder codeWerte noch ein codeSystem. | `auswahl/mehrfachauswahl ohne codeWerte und ohne codeSystem` (anfang) |
| `vorlage.auswahl-codesystem-ohne-liste` | abweisung | Ein Auswahlfeld verweist auf ein codeSystem, zu dem die Vorlage in codeListen keine Liste trägt. | `auswahl/mehrfachauswahl verweist auf codeSystem` (anfang) |
| `vorlage.codewerte-unvollstaendig` | abweisung | Ein Eintrag in codeWerte ist unvollständig. | `codeWerte unvollständig` (anfang) |
| `vorlage.freitext-mit-codewerten` | abweisung | Ein Freitextfeld trägt codeWerte. | `freitext mit codeWerte` (anfang) |
| `vorlage.liste-zu-viele-unterfelder` | abweisung | Ein Listenfeld hat mehr als 40 unterFelder. | `liste mit zu vielen unterFelder` (anfang) |
| `vorlage.unterfelder-keine-liste` | abweisung | unterFelder ist keine Liste. | `unterFelder ist keine Liste` (anfang) |
| `vorlage.unterfeld-kein-objekt` | abweisung | Ein Eintrag in unterFelder ist kein Objekt. | `unterFeld ist kein Objekt` (anfang) |
| `vorlage.unterfeld-feldname` | abweisung | Ein Unterfeld hat keinen feldname. | `unterFeld ohne feldname` (anfang) |
| `vorlage.unterfeld-feldname-zu-lang` | abweisung | Der feldname eines Unterfelds ist länger als 300 Zeichen. | `unterFeld-feldname zu lang` (anfang) |
| `vorlage.unterfeld-feldtyp` | abweisung | Ein Unterfeld nennt einen feldtyp, der in einer Liste nicht zulässig ist. | `unterFeld mit unbekanntem feldtyp` (anfang) |
| `vorlage.unterfeld-auswahl-ohne-werte` | abweisung | Ein Auswahl-Unterfeld nennt keine codeWerte. | `unterFeld-auswahl ohne codeWerte` (anfang) |
| `vorlage.unterfeld-codewerte-unvollstaendig` | abweisung | Ein Eintrag in den codeWerte eines Unterfelds ist unvollständig. | `unterFeld-codeWerte unvollständig` (anfang) |
| `vorlage.verweis-mit-codewerten` | abweisung | Ein Verweisfeld trägt codeWerte. | `verweis mit codeWerte` (anfang) |
| `vorlage.verweis-ohne-ziel` | abweisung | Ein Verweisfeld nennt kein ziel. | `verweis ohne ziel` (anfang) |
| `vorlage.verweis-adresse` | abweisung | Das ziel eines Verweisfelds ist keine gültige Adresse. | `verweis mit ungültiger Adresse` (anfang) |
| `vorlage.verweis-nicht-https` | abweisung | Das ziel eines Verweisfelds beginnt nicht mit https:. | `verweis mit unzulässigem Schema` (anfang) |
| `vorlage.verweis-ohne-bereich` | abweisung | Ein Verweisfeld nennt keinen bereich. | `verweis ohne bereich` (anfang) |
| `vorlage.codelisten-keine-liste` | abweisung | codeListen ist keine Liste. | `codeListen ist keine Liste` (anfang) |
| `vorlage.codelisten-zu-viele` | abweisung | Die Vorlage trägt mehr als 20 codeListen. | `zu viele codeListen` (anfang) |
| `vorlage.codeliste-kein-objekt` | abweisung | Ein Eintrag in codeListen ist kein Objekt. | `codeListe ist kein Objekt` (anfang) |
| `vorlage.codeliste-systemid` | abweisung | Eine Code-Liste hat keine systemId. | `codeListe ohne systemId` (anfang) |
| `vorlage.codeliste-systemid-zu-lang` | abweisung | Die systemId einer Code-Liste ist länger als 120 Zeichen. | `codeListe-systemId zu lang` (anfang) |
| `vorlage.codeliste-ohne-eintraege` | abweisung | Eine Code-Liste hat keine eintraege. | `codeListe ohne eintraege` (anfang) |
| `vorlage.codeliste-eintraege-unvollstaendig` | abweisung | Ein Eintrag einer Code-Liste ist unvollständig. | `codeListe-eintraege unvollständig` (anfang) |
| `vorlage.codeliste-herkunft` | abweisung | Die uri einer Code-Liste nennt keine Terminologie, die die App führt. | `codeListe-Herkunft unbekannt` (anfang) |
| `vorlage.wortlaut` | abweisung | wortlaut ist angegeben, aber kein Text. | `wortlaut ist kein Text` (anfang) |
| `vorlage.wortlaut-zu-lang` | abweisung | wortlaut ist länger als 61440 Zeichen. | `wortlaut zu lang` (anfang) |
| `vorlage.wortlaut-ohne-quelle` | abweisung | Die Vorlage trägt einen wortlaut, aber keine wortlautQuelle. Herkunft und Lizenz sind Pflicht. | `wortlaut ohne wortlautQuelle` (anfang) |
| `vorlage.wortlautquelle-behoerde` | abweisung | wortlautQuelle.behoerde fehlt. | `wortlautQuelle.behoerde fehlt` (anfang) |
| `vorlage.wortlautquelle-lizenz` | abweisung | wortlautQuelle.lizenz fehlt. | `wortlautQuelle.lizenz fehlt` (anfang) |
| `vorlage.wortlautquelle-titel` | abweisung | wortlautQuelle.titel fehlt. | `wortlautQuelle.titel fehlt` (anfang) |
| `vorlage.broschuere-kein-objekt` | abweisung | wortlautQuelleBroschuere ist angegeben, aber kein Objekt. | `wortlautQuelleBroschuere kein Objekt` (anfang) |
| `vorlage.broschuere-behoerde` | abweisung | wortlautQuelleBroschuere.behoerde fehlt. | `wortlautQuelleBroschuere.behoerde fehlt` (anfang) |
| `vorlage.broschuere-titel` | abweisung | wortlautQuelleBroschuere.titel fehlt. | `wortlautQuelleBroschuere.titel fehlt` (anfang) |
| `vorlage.broschuere-url` | abweisung | wortlautQuelleBroschuere.url fehlt. | `wortlautQuelleBroschuere.url fehlt` (anfang) |
| `vorlage.quelle-url-nicht-https` | abweisung | Die url einer Quellenangabe beginnt nicht mit https:. | `.url:schema-nicht-https` (ende) |
| `vorlage.quelle-url-ungueltig` | abweisung | Die url einer Quellenangabe ist keine gültige Adresse. | `.url:ungueltig` (ende) |

## einreichung

| Kennung | Schwere | Regel | Grund der App |
|---|---|---|---|
| `einreichung.ohne-vorlage` | abweisung | Das Paket enthält keine Vorlage. |  |
| `einreichung.schema` | abweisung | Das Paket weicht an dieser Stelle vom veröffentlichten Schema der Einreichung ab. |  |
