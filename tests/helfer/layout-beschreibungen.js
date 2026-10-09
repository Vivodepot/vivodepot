'use strict';
/* Prüf-Fixtures der Layout-Beschreibung (U2-ADR-473, W3). „navigation-a“ beschreibt die Leiste nach Navigation A (Produktentscheidung 05.10.2026), „zonen“ die Zonen-Struktur (Kachel-Zone im Seitenrand, „i“ statt Hilfetext, zwei Spalten). Die echten Beschreibungen tragen die Module im Abschnitt `layout`; das Gerüst kennt keine Profilnamen.
   Eine Quelle für zwei Proben: die Prüfung in Kern und Bauweg (tests/erscheinungsbild-pruefung.test.js) und das Schema
   (tests/mit-modul/erscheinungsbild-modul-schema.test.js). */
module.exports = Object.freeze({
  "navigation-a": {
    "faecher": {
      "kopf": [
        {
          "baustein": "marke"
        },
        {
          "baustein": "depotwahl"
        },
        {
          "baustein": "geoeffnet"
        },
        {
          "baustein": "sicherungsanzeige"
        },
        {
          "baustein": "bedienhilfen",
          "form": "werkzeuge"
        },
        {
          "baustein": "einstellungen"
        },
        {
          "baustein": "schliessen"
        }
      ],
      "seitenrand": [
        {
          "baustein": "suche"
        },
        {
          "baustein": "anlass"
        },
        {
          "baustein": "notfall"
        },
        {
          "baustein": "hilfe"
        },
        {
          "baustein": "bereiche",
          "form": "gruppen"
        },
        {
          "baustein": "weitere"
        },
        {
          "baustein": "austausch",
          "form": "gruppe"
        },
        {
          "baustein": "verlassen"
        }
      ],
      "inhalt": [
        {
          "baustein": "warnbereich"
        },
        {
          "baustein": "ansicht"
        }
      ],
      "fuss": [
        {
          "baustein": "ursprung"
        }
      ]
    }
  },
  "zonen": {
    "hilfeForm": "info",
    "feldRaster": "zweispaltig",
    "faecher": {
      "kopf": [
        {
          "baustein": "marke"
        },
        {
          "baustein": "depotwahl"
        },
        {
          "baustein": "geoeffnet"
        },
        {
          "baustein": "sicherungsanzeige"
        },
        {
          "baustein": "bedienhilfen",
          "form": "werkzeuge"
        },
        {
          "baustein": "einstellungen"
        },
        {
          "baustein": "schliessen"
        }
      ],
      "seitenrand": [
        {
          "baustein": "suche"
        },
        {
          "baustein": "anlass"
        },
        {
          "baustein": "notfall"
        },
        {
          "baustein": "hilfe"
        },
        {
          "baustein": "bereiche",
          "form": "gruppen"
        },
        {
          "baustein": "austausch",
          "form": "kacheln"
        },
        {
          "baustein": "verlassen"
        }
      ],
      "inhalt": [
        {
          "baustein": "warnbereich"
        },
        {
          "baustein": "ansicht"
        }
      ],
      "fuss": [
        {
          "baustein": "ursprung"
        }
      ]
    }
  }
});
