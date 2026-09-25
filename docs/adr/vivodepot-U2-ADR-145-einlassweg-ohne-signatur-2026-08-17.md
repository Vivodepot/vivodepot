# U2-ADR-145: Ein eingelassenes Modul sagt „ich habe es selbst hineingelassen"

**Status:** Akzeptiert
**Datum:** 17.08.2026
**Kategorie:** ARCHITEKTUR, SICHERHEIT
**Grundlage:** Auftragskette Abend 17.08.2026, Glied 5 („Der Einlassweg, einmal für alle
Register ohne einen"). Vormessung A271, vor dem Bau neu bestätigt.
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `EINLASS_REGISTER`, `modulEinlassen`,
  `eingelasseneModule`, der Abschnitt „Eingelassene Erweiterungen" in `einstellungenHTML`
  samt Datei-Tür in `verdrahteEinstellungen`.
- **ADR-Bezug:** U2-ADR-040 (Signatur-Architektur — sie bleibt UNBERÜHRT, dieser ADR steht
  daneben und nicht darüber), U2-ADR-141 (Textsatz-Modul), U2-ADR-121 (Rechtsraum-Modul),
  U2-ADR-051 (Registry-Anmeldemuster), U2-ADR-143 (Bereichsliste — das siebte Register, das
  dieses Loch sonst geerbt hätte).
- **Status heute:** gilt — Beleg `tests/einlassweg-module.test.js` (10 Proben, darunter die
  drei vom Auftrag verlangten Rot-Belege). **Nachtrag 21.08.2026 (A437):** die Anbieter-Kennung
  ist Teil des Gleichheitsbegriffs, s. u.

---

## Der Befund

**Drei andockbare Register hatten keinen Weg hinein.** Gemessen, nicht vermutet:
`textsatzModulEinbetten`, `institutionsArtModulEinbetten` und `_rechtsraumModulEinbetten`
kamen im ganzen Kern **je genau einmal** vor — in ihrer eigenen Definition.

Die Register wurden beim Öffnen des Depots gelesen und in die Laufzeit gehoben. **Niemand
konnte je etwas hineingeben.** Die Schicht trug, aber die Tür fehlte.

**Und ein siebtes Register hätte dasselbe Loch geerbt.** U2-ADR-143 macht die Bereichsliste zur
einen Quelle; ohne diesen ADR wäre sie das siebte lesbare, unbefüllbare Register geworden.

## Die Entscheidung

**1 · EIN Weg, nicht drei.** Die Register unterscheiden sich in ihrer Prüfung und in ihrem Slot,
nicht im Weg dorthin. `EINLASS_REGISTER` hält je Register die Prüf- und Einbett-Funktion und die
Kennung; `modulEinlassen` fährt für alle denselben Weg. **Drei Einlasswege wären dreimal dieselbe
Fehlerbehandlung, dreimal derselbe Hinweis und drei Gelegenheiten, verschieden falsch zu liegen.**

**2 · Ohne Signaturzwang — und das ist der Unterschied, der genannt werden muss.**

> Ein **signiertes** Modul sagt: *jemand steht dafür ein.*
> Ein **eingelassenes** Modul sagt: *ich habe es selbst hineingelassen.*

Mehr sagt es nicht, und genau das trägt es als `ungeprueft: true` mit sich. **Ein eingelassenes
Modul zertifiziert niemanden.** Die Signatur-Architektur (U2-ADR-040) bleibt vollständig
unberührt: dieser Weg legt nichts an ihr an, er steht daneben.

**3 · Der Hinweis ist sichtbar, aber er warnt nicht ohne Anlass.** Der Abschnitt „Eingelassene
Erweiterungen" steht in den Einstellungen — dort steht, woraus dieses Depot besteht. **Die Tür
steht immer offen** (ein Register, in das niemand etwas geben kann, ist kein Register); **der
Hinweis erscheint nur, wenn etwas Eingelassenes da ist** (eine Warnung ohne Anlass ist Rauschen).

**4 · Die Marke reist am Modul mit**, nicht in einer Liste daneben. Ein zweites Register über
dieselbe Sache liefe auseinander — dieselbe Überlegung wie bei den Textsatz-Regeln. Sie überlebt
damit auch Export und Re-Import.

**5 · Reservierte Kennungen bleiben reserviert.** Die Prüfung dafür steht schon in jedem
Register; der Einlassweg **fragt** sie, er ersetzt sie nicht. Die eingebaute Sprache und der
eingebaute Rechtsraum sind nicht überschreibbar; eine reservierte Institutions-Art wird
**namentlich verworfen und verwirft nicht das Modul**.

**6 · Ein kaputtes Modul ist ein Befund, kein Absturz.** `modulEinlassen` gibt immer ein Ergebnis
zurück und wirft nie. **Ein abgelehntes Modul hinterlässt keine Spur** im Depot.

## Die Abbruchbedingung — geprüft, trifft nicht zu

Der Auftrag sagt: *„Verlangt der Einlass eine Änderung am Depot-Umschlag: melden, nicht bauen."*

**Er verlangt keine.** Ein Modul landet in `data`, also innerhalb des Umschlags, der ohnehin
AEAD-authentifiziert und passwortgeschützt ist; **ein zusätzlicher Eintrag in einem bestehenden
Array ist kein Formatwechsel.** Eine Probe hält das fest: die Schlüsselmenge des Grundgerüsts ist
vor und nach einem Einlass identisch.

**Ein Nebenbefund machte das erst wahr.** Die Probe ging beim ersten Lauf ROT — weil
`textsatzModule` und `institutionsArten` bis dahin **gar nicht im Grundgerüst standen** und der
Einlass sie ANLEGTE statt sie zu füllen (`rechtsraumModule` stand dort, die beiden anderen nicht).
Beide sind jetzt deklariert. **Eine deklarierte Form ist auch eine Zusage:** sie sagt, dass es
dieses Register gibt, auch wenn es leer ist.

## Konsequenzen

**Vier Namen sind aus der Grundlinie der unverdrahteten Namen verschwunden** — die drei
Einbett-Funktionen und `_rechtsraumModulUebersetzen` haben jetzt einen Aufrufer im Produkt.

**Die beiden neuen Slots sind als STRUKTUR eingeordnet** (`VOLLEXPORT_STRUKTURELL_SCHLUESSEL`),
wie `rechtsraumModule` daneben: angedockte Module tragen Beschriftungen und Katalogeinträge,
keine Werte über die Bürgerin. Ein Umzug ohne sie käme in einem Depot an, das plötzlich anders
spricht.

**Ein eingelassenes Modul wirkt sofort.** Nach dem Einlass laufen die drei Boot-Registrierungen
erneut — sonst sähe der Erfolg wie einer aus und wäre keiner.

## Nachtrag 21.08.2026 (A437) — die Anbieter-Kennung gehört in den Gleichheitsbegriff

**Gemessen, nicht vermutet, in einer separaten Erhebung nach diesem ADR:** die Tür stand offen
(dieser ADR), aber **wer sie durchschritt, wurde nicht unterschieden.** `_einbettenMitFassung`
— die EINE Fassungs-Vergleichsfunktion, durch die alle Register laufen (`gleich`, oben Punkt 1)
— verglich nur die Register-Kennung selbst (Sprache, Rechtsraum, Herkunft, …), nicht den
Anbieter. **Zwei Anbieter mit einem Textsatz derselben Sprachkennung überschrieben einander
nach Versionsnummer:** der mit der höheren Zahl gewann, unabhängig davon, wer ihn eingereicht
hatte — eine stille Verdrängung, kein Formatbruch, darum von diesem ADR selbst nicht erfasst.

**Für Felder und Code-Listen war das längst gelöst** (`_tplFeldId`/`_tplCodeListeId`,
U2-ADR-051 — ein Namensraum aus der Anbieter-Kennung). Für die Register — genau die, denen
dieser ADR die Tür gebaut hat — fehlte dieselbe Absicherung.

**Der Bau sitzt an der EINEN Stelle** (`_gleicherAnbieter`/`_modulAnbieterKennung`, unmittelbar
vor `_einbettenMitFassung` in `vivodepot.html`), nicht in den einzelnen Einbett-Funktionen —
genau die Disziplin, die dieser ADR selbst für den Einlassweg verlangt (Punkt 1: „EIN Weg,
nicht drei"). `_einbettenMitFassung` findet eine bestehende Fassung nur noch, wenn Register-
Kennung UND Anbieter übereinstimmen; ein neuer Anbieter mit derselben Register-Kennung landet
als **eigener, zusätzlicher Eintrag**, nicht als stiller Ersatz.

**Sie unterscheidet, sie beglaubigt nicht.** Ein selbst eingelassenes Modul trägt weiterhin
`ungeprueft: true` (Punkt 2 oben, unberührt); die Anbieter-Kennung daran ist eine Angabe des
Moduls, keine Aussage über Vertrauen — sie verhindert genau eine Sache: dass zwei verschiedene
Herkünfte still zu einer werden. Kommt ein Modul über einen signierten Weg, gewinnt die Kennung
aus dem Zertifikat, nicht die selbstgenannte (`modulEinlassen` nimmt sie als Argument entgegen).

**Reichweite, gemessen, nicht angenommen:** `_einbettenMitFassung` ist die gemeinsame Stelle für
inzwischen **dreizehn** Register (Stand: `tests/a437-anbieter-kennung-register.test.js`, letzte
Probe) — die fünf, die diesen ADR ursprünglich betrafen (Textsatz, Rechtsraum, Institutionsart,
Bereich, Format), plus Branding, Logikmodul, Situation, Wizard, Ereignisachse und weitere, die
seither denselben Weg ohne eigenen Fassungsweg übernommen haben. **Ein sechstes/vierzehntes
Register erbt die Absicherung automatisch**, weil es keinen eigenen Vergleich schreiben darf —
dieselbe Zusage wie Punkt 1 dieses ADR, jetzt auf den Anbieter erweitert.

**Rot-Beweis:** zwei Anbieter mit derselben Sprachkennung stehen seither nebeneinander im
Register, statt sich zu ersetzen; Aktualisierung (derselbe Anbieter, höhere Fassung) und
Rückschritt-Sperre (derselbe Anbieter, niedrigere Fassung) bleiben unverändert.

**Weg zum Nachsehen:** `_gleicherAnbieter`/`_modulAnbieterKennung` in `vivodepot.html` (Kommentar
„A437") · `node --test tests/a437-anbieter-kennung-register.test.js`.

## Cross-Referenz

`tests/einlassweg-module.test.js` · `tests/a437-anbieter-kennung-register.test.js` ·
U2-ADR-040 (unberührt) · U2-ADR-143 (das siebte Register) · U2-ADR-051 (Namensraum-Vorbild für
Felder/Code-Listen, hier auf die Register übertragen).
