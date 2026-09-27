# Beispiel — Energie-Template (Referenz, unsigniert)

**Status:** Referenz/Doku, **unsigniert**. KEIN ausgeliefertes Artefakt. Zeigt, wie ein realistisches
Energie-Template im Generator-Vokabular aussieht. Das echte, signierte Template entsteht im
Template-Generator (Komponente 4) mit dem Anbieter-Schlüssel und reist als Bundle durch die Pipeline.
**Bezug:** U2-ADR-037 (Energie als Themenfeld über die Template-Schicht, kein festes Modul).

## Verortung
- **Bereich:** Wohnen (`bereich:"Wohnen"` → `sektorId:"wohnen"`).
- **Abschnitt:** „Energie & Erzeugung" (`gruppe` → `abschnitt`).

## Felder (Generator-Vokabular, flaches Typ-System)

| feldname | feldtyp | Hinweis |
|---|---|---|
| Zählpunkt | text | Marktlokations-ID / Zählpunktbezeichnung |
| PV-Leistung (kWp) | zahl | Anlagenleistung |
| Inbetriebnahme | datum | |
| Einspeisung vorhanden | jaNein | → `auswahl` ja/nein; **kein** codeWerte nötig |
| Einspeise-Art | auswahl | **braucht codeWerte** (sonst weist der 1C-Validator ab) |

```json
{
  "template": {
    "felder": [
      { "feldname": "Zählpunkt", "feldtyp": "text", "pflicht": false, "bereich": "Wohnen", "gruppe": "Energie & Erzeugung" },
      { "feldname": "PV-Leistung (kWp)", "feldtyp": "zahl", "pflicht": false, "bereich": "Wohnen", "gruppe": "Energie & Erzeugung" },
      { "feldname": "Inbetriebnahme", "feldtyp": "datum", "pflicht": false, "bereich": "Wohnen", "gruppe": "Energie & Erzeugung" },
      { "feldname": "Einspeisung vorhanden", "feldtyp": "jaNein", "pflicht": false, "bereich": "Wohnen", "gruppe": "Energie & Erzeugung" },
      { "feldname": "Einspeise-Art", "feldtyp": "auswahl", "pflicht": false, "bereich": "Wohnen", "gruppe": "Energie & Erzeugung",
        "codeWerte": [ { "code": "voll", "anzeige": "Volleinspeisung" }, { "code": "ueberschuss", "anzeige": "Überschusseinspeisung" } ] }
    ],
    "ankerTauglich": true, "subTauglich": false, "sorgerechtTauglich": false
  }
}
```

## Weg durch die Pipeline (end-to-end durchstochen)
1. **Generator (Komp. 4)** erfasst die Felder, erzeugt das Anbieter-Keypair, **signiert** das Template
   (`templateJws`) und legt es ins Submission-Paket (Lieferform a).
2. **VC-Issuer (Komp. 3)** stellt das TA-signierte Provider-Zertifikat aus (zertifiziert `publicKeyJwk`)
   und liefert ein **Bundle** `{ providerCredentialJws, templateJws }` aus — das Template wird NICHT in
   den Cert signiert.
3. **Bürger-App (Komp. 1)** teilt das Bundle auf, prüft die **zweistufige Kette** (Trust-Anker + Anbieter-
   Signatur), validiert das Template (1C), übersetzt das Generator-Vokabular ins Feld-Modell
   (jaNein→auswahl, auswahl+codeWerte→optionen) und **rendert** den Abschnitt im Kern-Look.
4. **Lese-App (Komp. 2)** spiegelt den Energie-Abschnitt read-only aus dem fertigen Depot. `auswahl`-Werte
   erscheinen dort als **Rohwert** (z. B. `voll`) — bewusst keine Label-Auflösung in der Lese-Sicht.

Der end-to-end-Durchstich ist als Test verankert: `tests/energie-pilot-durchstich.test.js`.
