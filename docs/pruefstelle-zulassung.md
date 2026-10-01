# Zulassung einer Prüfstelle für Sprachmodule

Eine Prüfstelle ist eine externe Stelle, deren signierte Sprachmodule die Sätze übersetzen dürfen, mit denen die Anwendung über den Zustand eines Dokuments spricht (U2-ADR-331, U2-ADR-441). Diese Kriterien beschreiben, wann Vivodepot eine Stelle zulässt. Sie sind kein Vertrag und lösen keine Zahlung aus.

## Was zugelassen wird

Eine Stelle wird für einen **Geltungsbereich** zugelassen: bestimmte Sprachen und Modultypen (etwa `textsatz`). Deutsch und Englisch sind app-eigen und werden nicht zugelassen. Das Zwischenzertifikat gilt **zwölf Monate**; die Erneuerung ist eine neue Zulassung.

## Kriterien

1. **Unabhängigkeit.** Die Stelle hat das geprüfte Modul nicht selbst herausgegeben. Wer Module herausgibt und prüft, führt dafür zwei getrennte Zertifikate mit zwei Schlüsseln.
2. **Kompetenz.** Muttersprachlich und fachlich (Vorsorge, Recht, Gesundheit) für jede Sprache im Geltungsbereich, nachgewiesen durch Referenzen oder eine Akkreditierung nach ISO/IEC 17065. Eine Akkreditierung ist ein anerkannter Nachweis, keine Bedingung.
3. **Verfahren.** Die Stelle prüft Bedeutung und Rechtsfolge jedes Zusicherungssatzes gegen das deutsche und das englische Original, nicht nur Form und Platzhalter. Sie bestätigt das schriftlich und bewahrt das Protokoll auf.
4. **Identität.** Name und Kennung der Stelle werden aus einem öffentlichen Register belegt. Sie stehen im Zertifikat und werden der Leserin bei einem übersetzten Satz genannt.
5. **Schlüssel.** Die Stelle bewahrt ihren Schlüssel verschlüsselt auf und meldet eine Kompromittierung sofort. Ein Widerruf wirkt über den Ablauf und, im Notfall, über eine neue Fassung der Anwendung (U2-ADR-038, -173); rein offline genutzte Kopien erreicht er nicht früher.

## Was die Stelle bestätigt

Mit ihrer Signatur bürgt die Stelle dafür, dass die Sätze in dieser Sprache dasselbe sagen wie die Originale, die sie vor sich hatte. Ändert Vivodepot einen Originalsatz, gilt die alte Übersetzung als ungeprüft, bis die Stelle das geänderte Original erneut geprüft und signiert hat.

## Ablauf der Ausstellung

Die Treuhand stellt der Prüfstelle ein Blatt-Zertifikat aus, ohne neue Anker-Zeremonie: `tools/kundenzertifikat-ausstellen.js … --rolle pruefer --sprachen … --modultypen …`. Das Werkzeug lehnt eine Prüfstelle ohne Geltungsbereich, für Deutsch oder Englisch, an einem `vivodepot/*`-Typ und für mehr als zwölf Monate ab. Die Rolle zählt nur, wenn das Zertifikat unter der eigenen Treuhand steht. Wer Module herausgibt und prüft, bekommt dafür zwei getrennte Zertifikate.
