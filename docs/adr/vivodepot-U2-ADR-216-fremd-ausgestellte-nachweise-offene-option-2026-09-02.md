# U2-ADR-216: Fremd ausgestellte Nachweise halten — bewusst offene Option

**Status:** Angenommen (als offene Option — keine Bau-Zusage)
**Datum:** 02.09.2026
**Kategorie:** ARCHITEKTUR, PRODUKTPHILOSOPHIE
**Linie:** U2
**U2-Bezug:** Ändert U2-ADR-046 NICHT (Vivodepot bleibt kein Aussteller — ein selbst ausgestellter
Nachweis ist keiner). Nutzt, falls je gebaut, dieselbe Fach-Architektur wie U2-ADR-156
(Empfängerkreis, fachweise eigene Schlüssel). Berührt dieselbe Weitergabe-Grenze wie U2-ADR-213
(dort: welches Verfahren die Ableitung schützt; hier: was am anderen Ende überhaupt ankommen
könnte).
**Anker:** Entscheidung vom 02.09.2026 — die Frage, ob Vivodepot eines Tages fremd
ausgestellte, kryptographisch signierte Nachweise halten soll, bleibt ausdrücklich offen. Sie
will die Tür nicht zubauen.
**Status heute:** gilt — keine Probe (reine Entscheidung, kein Code berührt, s. Abschnitt
„Konformität" unten).

---

## Kontext

Ein fremd ausgestellter Nachweis ist ein Dokument, das eine Behörde oder eine andere Institution
einer Bürgerin ausstellt — signiert, kryptographisch prüfbar, aber nicht von Vivodepot erzeugt.
Die Bürgerin bewahrt ihn auf und zeigt ihn bei Bedarf vor. Ob Vivodepot solche Nachweise künftig
halten und weitergeben können soll, ist eine offene Produktfrage. Dieses ADR entscheidet sie
NICHT — es hält fest, warum sie offen bleibt, was dabei im Weg steht, und unter welcher Bedingung
die Option lebendig bleibt, statt sich selbst zu widersprechen.

## Entscheidung

**Die Option bleibt bewusst offen. Kein Bau, keine Zusage — aber auch keine stillschweigende
Absage.**

**1 — Es passt zur eigenen Philosophie.** Ein Nachweis, den eine Behörde der Bürgerin ausstellt,
ist ihr Dokument — genau wie jedes andere Papier, das heute schon ins Depot wandert. Ihn zu
verwahren und selbst vorzuzeigen, ist keine neue Idee, sondern derselbe Zweck, den das Produkt
ohnehin verfolgt. Er schlösse zudem die schwächste Stelle an der Weitergabe-Grenze: heute muss
eine Ärztin, ein Amt, eine Institution der Bürgerin schlicht GLAUBEN, dass ein vorgelegtes
Dokument echt ist. Ein signierter, fremd ausgestellter Nachweis ließe sich stattdessen offline
prüfen — gegen eine mitgeführte oder eingebettete Vertrauensliste des Ausstellers, ohne
Online-Abfrage, ohne Konto. Das ist dieselbe Bauweise, die Vivodepots eigener Vertrauens-Anker
schon heute nutzt (lokal geprüfte Signatur gegen einen bekannten Aussteller-Schlüssel) — kein
neues Vertrauensmodell, nur ein weiterer Aussteller neben dem eigenen.

**2 — Der eine echte Konflikt, ehrlich benannt.** Nachweise dieser Art werden in der Praxis
verbreitet an einen GERÄTEGEBUNDENEN Schlüssel gekoppelt — ein Schutz dagegen, dass jemand den
Nachweis unbemerkt kopiert und anderswo erneut vorlegt. Vivodepots Grundprämisse ist das genaue
Gegenteil: die Datei WANDERT — auf einen Stick, auf einen zweiten Rechner, auf ein neues Telefon,
wenn das alte kaputtgeht. Ein Schlüssel, der an ein einzelnes Gerät gebunden ist, wandert nicht
mit. Das lässt sich nicht wegkonstruieren — es ist ein echter, struktureller Widerspruch
zwischen zwei Schutzzielen (Kopierschutz des Ausstellers gegen Portabilität der Bürgerin), kein
Detail, das eine geschicktere Umsetzung auflöst.

**3 — Warum der Konflikt trotzdem eingrenzbar ist.** Nicht jeder Eintrag im Depot muss sich
gleich verhalten. Ein fremd ausgestellter, gerätegebundener Nachweis wäre einfach eine EIGENE ART
von Eintrag: er lebt auf dem Gerät, auf dem er entgegengenommen wurde, reist nicht automatisch
mit der Depot-Datei mit, und die App sagt das der Bürgerin ausdrücklich, statt es zu verschweigen
oder zu behaupten, es sei anders. Alles andere im Depot — die eigenen Dokumente, Vollmachten,
Angaben — wandert weiter uneingeschränkt. Die Maschinerie für diese Art von Eingrenzung existiert
bereits und müsste nicht neu erfunden werden: Vivodepots Empfängerkreis-Architektur (U2-ADR-156)
teilt das Depot schon heute in Fächer mit jeweils eigenen Schlüsseln auf — ein zusätzliches Fach,
dessen Schlüssel an ein Gerät statt an ein Passwort gebunden ist, wäre eine Erweiterung
desselben, bereits vorhandenen Musters, kein neuer Mechanismus.

**4 — Was ausdrücklich NICHT gilt.** Dieses ADR ist keine Zusage, so etwas zu bauen — nur die
Feststellung, dass die Tür nicht zugebaut werden soll. Es ändert U2-ADR-046 nicht: Vivodepot wird
dadurch nicht zum Aussteller, und ein selbst ausgestellter Nachweis bleibt keiner. Es geht
ausschließlich um das HALTEN und VORZEIGEN fremd ausgestellter Nachweise, nicht um deren
Erzeugung.

**5 — Die Auflage, die die Option am Leben hält.** Nach außen darf nie behauptet werden, dass
restlos ALLES im Depot überall gleich funktioniert — auf jedem Gerät, in jedem Zustand, ohne
Ausnahme. Ein solcher Satz entsteht leicht, weil er heute stimmt und gut klingt — und er wäre
genau der Satz, den ein künftiger gerätegebundener Eintrag bricht. Die Bewahrung dieser Option
verlangt darum eine kleine, aber bleibende Zurückhaltung in der eigenen Außendarstellung schon
heute, lange bevor je ein solcher Nachweis existiert.

## Konsequenzen

Keine unmittelbare Code-Konsequenz — dieses ADR baut nichts. Die Konsequenz liegt in der
Außendarstellung: Formulierungen wie „eine Datei, alles was Sie brauchen, läuft überall" sind
heute wahr und bleiben es, solange kein gerätegebundener Eintrag existiert — sie sind aber als
UNBEDINGTE Aussage zu vermeiden, damit sie nicht rückwirkend falsch werden, sobald diese Option
je gezogen wird. Register-Eintrag dazu in `docs/aussenaussagen.md` (`einedatei-ueberall`).

**Offen, ausdrücklich keine Antwort dieses ADR:** ob, wann und für welche Nachweis-Art die Option
je gezogen wird; welches konkrete technische Format dabei zum Einsatz käme; wie die App das
Gerätegebunden-Sein einer Bürgerin verständlich macht, ohne Vertrauen zu kosten. Alles das bleibt
einem eigenen, künftigen Bau-Auftrag vorbehalten, der auf diesem ADR aufsetzen kann, es aber nicht
vorwegnimmt.

## Konformität

Bewusst kein `konformitaet`-Block. Dieses ADR trifft keine Aussage über heutiges Code-Verhalten,
die eine Probe tragen könnte — es bewahrt eine Option und benennt eine Auflage für künftige
Außentexte. Die Auflage selbst ist im Außenaussagen-Register (`docs/aussenaussagen.md`,
`einedatei-ueberall`) geführt, mit eigenem Beleg-Feld dort — nicht hier verdoppelt.

---

*Vivodepot GmbH · Berlin · 02.09.2026*
