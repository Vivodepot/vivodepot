# Zusicherungs-Scanner — Negativ-Proben

Nachweis, dass jede aktive Regel schon einmal ROT war — Beleg gegen einen
Scanner, der nur grün kennt (Nachtrag zur Abnahme, 23.07.2026).
Läuft ab sofort automatisch vor jedem `npm run zusicherungen:pruefen`
(Selbsttest-Kopplung, siehe Kopf von `tools/zusicherungen-pruefen.js`) —
dieser Bericht ist der Beleg des letzten eigenständigen Laufs.

Erzeugt von `node tools/zusicherungen-negativproben.js`, Commit 9e733e7f.
Jede Probe: ein fingierter Verstoß in eine temporäre Fixture-Datei
geschrieben, derselbe Prüfcode wie im echten Lauf angesetzt, Ergebnis
geprüft, Fixture gelöscht. Kein Anwendungscode wurde berührt.

| ID | Zusicherung | Fixture (fingierter Verstoß) | Ergebnis |
|---|---|---|---|
| Z1 | Kein Server | `<script> function ping() { return fetch("https://example.invalid/x"); } </script>` | ROT bestätigt (1 Fund) |
| Z2 | Buergerdaten verlassen das Geraet nicht | `<script> function merken(v) { localStorage.setItem("x", v); } </script>` | ROT bestätigt (1 Fund) |
| Z3 | Kein Konto | `<script> const sessionToken = erzeugeToken(); </script>` | ROT bestätigt (1 Fund) |
| Z6 | Kein selbst ausgestelltes Bildungs-Credential | `const VC_TYPEN = Object.freeze(['VerifiableCredential', 'VivodepotProviderCredential', 'BildungsCredential']);` | ROT bestätigt (1 Fund) |
| Z8 | Keine inhaltliche Zertifizierung | `<script> const text = "Dieses Dokument wurde inhaltlich geprüft."; </script>` | ROT bestätigt (1 Fund) |
| Z-PLATZHALTER-subDepotVertrauenSchliessen | Nach dem Versiegeln bleibt kein Klartext im Arbeitsspeicher | `fehlende Beleg-Datei: tests/.definitiv-nie-vorhanden-fuer-negativprobe-Z-PLATZHALTER.test.js` | ROT bestätigt (1 Fund) |
| Z9 | Eine fremde Person sieht nur die Fünf-Blatt-Allowlist | `fehlende Beleg-Datei: tests/.definitiv-nie-vorhanden-fuer-negativprobe-Z9.test.js` | ROT bestätigt (1 Fund) |
| Z-PLATZHALTER-subDepotVertrauenSchliessen | Nach dem Versiegeln bleibt kein Klartext im Arbeitsspeicher (Marke fehlt) | `vorhandene Datei ohne Marke „Zusicherung: Z-PLATZHALTER-subDepotVertrauenSchliessen"` | ROT bestätigt (1 Fund) |
| Z9 | Eine fremde Person sieht nur die Fünf-Blatt-Allowlist (Marke fehlt) | `vorhandene Datei ohne Marke „Zusicherung: Z9"` | ROT bestätigt (1 Fund) |

## Gegenproben (Falsch-Positiv-Wächter)

Nachweis, dass die Kommentar-Ausnahme den Kontext trifft und nicht die Regel
kaputtmacht: ein Regel-Stichwort im **Kommentar** bleibt grün, derselbe Wortlaut
in **bürger-sichtbarem Text** bleibt rot. Anlass: Z8 schlug an einem JS-`//`-
Kommentar an (`vivodepot.html:4802`), keinem sichtbaren Text (Stufe-1a-Befund).

| ID | Gegenprobe | Erwartet | Ergebnis |
|---|---|---|---|
| Z8 | JS-//-Kommentar mit „inhaltlich richtig" bleibt gruen (4802-Fall) | gruen | gruen bestätigt |
| Z8 | sichtbarer Zertifizierungstext „inhaltlich richtig" bleibt rot | rot | rot bestätigt |
| Z-PLATZHALTER-subDepotVertrauenSchliessen | mit den echten, vorhandenen Beleg-Dateien bleibt Z9 gruen | gruen | gruen bestätigt |
| Z9 | mit den echten, vorhandenen Beleg-Dateien bleibt Z9 gruen | gruen | gruen bestätigt |

Z4 (nicht prüfbar) und Z7 (ausgesetzt) haben keine Muster und sind hier nicht
Gegenstand — beide führen keinen automatisierten grün/rot-Vergleich.
