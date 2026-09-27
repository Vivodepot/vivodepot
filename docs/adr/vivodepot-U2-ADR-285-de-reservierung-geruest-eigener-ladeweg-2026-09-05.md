# U2-ADR-285 · "DE"/'de' bleiben für Fremde reserviert — ein Gerüst-eigener Ladeweg darf sie tragen

**Datum:** 05.09.2026
**Status:** Gilt (bereinigt 25.09.2026)
**Status heute:** gilt
**Bezug:** U2-ADR-121 Punkt 8 (Rechtsraum-Modul-Payload-Vertrag, reservierte "DE" ursprünglich),
U2-ADR-141 (Textsatz-Andockbarkeit, reservierte 'de' ursprünglich), U2-ADR-040 (1E
Basistemplate-Signatur — die hier wiederverwendete Form), U2-ADR-282 (Die Erste-Partei-Zone —
die Aufrufstellen-Bindung der `tpl_`-Feld-ID-Grenze, Absprache mit einer weiteren Sitzung,
05.09.2026, deren wörtliche Form Abschnitt 2b für Textsatz übernimmt)

---

## 1 · Kontext

Ziel: Gerüst + Bürgermodul + Rechtsraum D + Sprache de + Branding = die kostenlose
deutsche Bürgerapp. Gemessen: drei dieser fünf sind heute fest im Gerüst verankert, nicht
modulfähig. Zwei davon — der Rechtsraum-Code `"DE"` und die Textsatz-Sprache `'de'` — sind
Gegenstand dieses ADR.

**Beide Reservierungen waren zum Zeitpunkt ihrer Entscheidung richtig.** ADR-121 reservierte
`"DE"` ausnahmslos (`docs/rechtsraum-modul/rechtsraum-modul-schema.json`,
`validateRechtsraumModul`), weil damals kein Weg existierte, ein Gerüst-eigenes Modul von einem
fremden zu unterscheiden, außer einem Feld IM Modul selbst — und das wäre kein Nachweis: jedes
Modul könnte behaupten, es sei Vivodepots eigenes. Dieselbe Überlegung reservierte `'de'` beim
Textsatz-Andockmechanismus (`textsatzModulPruefen`, `grund: 'reserviert'`).

**Warum das heute nicht mehr die einzig mögliche Antwort ist:** seit dem 23.08.2026 hat der Kern
genau die fehlende Unterscheidung einmal gebaut und bewiesen — die Basistemplate-Signatur (1E,
U2-ADR-040). `STANDARD_VORLAGEN_CERTS` hält TA-signierte Behörden-Zertifikate (BMJ/BZgA) als
**Gerüst-Konstante**, nicht in `data`; `basisVorlagenVerifizieren` prüft sie beim Boot gegen
`TRUST_AUTHORITY_PUBLIC_JWK`. Ein fremdes Dokument erreicht diesen Weg nie, weil es nie aus
`data` gelesen wird — nicht weil ihm ein Nachweis fehlt. Das ist genau die Eigenschaft, die
ADR-121 fehlte, als es geschrieben wurde.

**Die Asymmetrie zwischen Rechtsraum und Textsatz ist gemessen, kein Zufall der Bearbeitung:**
`'en'` ist heute bereits modular (`tools/textsatz-en-modul-erzeugen.js`, angedockt, laufend);
`'de'` ist es nicht. Die englische Bürgerapp ist die modulare, die deutsche die eingebaute —
genau verkehrt herum für ein neutrales Gerüst.

**Abgesprochen mit einer weiteren Sitzung** (parallel an der `tpl_`-Feld-ID-Grenze derselben
Nacht): ihre Aufrufstellen-Bindungs-Form (eine Funktion ohne Aufrufer, die Sicherheit ist die
Abwesenheit eines Wegs) trägt bei einem JSON-Schema nicht direkt — ein Schema ist deklarativ,
kann nicht unterscheiden, wer fragt, und ihre Zone darf schlafend bleiben, während ein echtes
deutsches Rechtsraum-Modul irgendwann tatsächlich geladen werden muss. Gemessen (nicht von 03
angenommen, s. u.): der Rechtsraum-Vertrag hat bereits einen zweiten, bislang schlafenden,
signierten Weg (`validateRechtsraumModul` + `verifiziereTemplateKette`, ADR-121 Punkt 8) — für
ihn passt die lebende Basistemplate-Form. Der Textsatz-Vertrag hat keinen solchen zweiten Weg —
für ihn wird 03s Form wörtlich übernommen.

---

## 2 · Entscheidung

**Zwei verwandte, aber unterschiedliche Umsetzungen für einen Grund — nicht dieselbe Form
erzwungen, wo der Kern für die eine Sperre bereits einen passenden Weg gebaut hatte und für die
andere nicht.**

### 2a — Rechtsraum "DE": Basistemplate-Form (lebend, TA-verifiziert)

1. `validateRechtsraumModul(modul, opts)` — neuer, optionaler zweiter Parameter. `"DE"` bleibt
   abgelehnt, **außer** `opts.erlaubtGeruestEigenesDE` ist gesetzt. Dieses Flag steht nirgends im
   JWS-Payload — es kann von keinem Modul behauptet werden, nur vom Aufrufer gesetzt werden.
2. **Neu:** `_rechtsraumGeruestModulLaden(anbieterId, modulJws, opts, certs)` — sucht das
   Zertifikat für `anbieterId` in einer eigenen, engen Cert-Tabelle
   (`_RECHTSRAUM_GERUEST_MODUL_CERTS`, **heute leer**), prüft die Kette über das unveränderte,
   bereits bewiesene `verifiziereTemplateKette`, und reicht **nur bei gültiger Kette** das Flag an
   `validateRechtsraumModul` durch. Bei Erfolg landet der Inhalt in einer **eigenen** Registry
   (`_RECHTSRAUM_GERUEST_REGISTRY`), niemals in der aus `data.rechtsraumModule[]` gespeisten.
3. `_rechtsraumKatalogLesen` fragt jetzt in dieser Reihenfolge: eingebauter Katalog →
   Gerüst-Registry → Einlassweg-Registry. Der eingebaute Katalog gewinnt für jeden heute bekannten
   Instrument-Typ **immer** — ein Modul (gleich über welchen Weg) kann nur **neue,
   `tpl_`-namensraum-geschützte** Typen ergänzen, nichts Bestehendes ersetzen (unverändert seit
   ADR-121 Punkt 8, jetzt zusätzlich für den neuen Weg bewiesen, s. Abschnitt 3).
4. **`EINLASS_REGISTER` (Einstellungen → Module → Einlassen) bleibt unverändert** — sein
   Rechtsraum-Eintrag ruft `validateRechtsraumModul` gar nicht auf (eigene, inline Prüfung) und
   lehnt `"DE"` weiterhin ausnahmslos ab. Kein Bürger-Weg führt je zum neuen Ladeweg.

### 2b — Textsatz 'de': wörtlich 03s Aufrufstellen-Bindung (schlafend, ohne Aufrufer)

Kein bereits gebauter zweiter Weg vorhanden — darum wörtlich übernommen: **Neu:**
`_textsatzModulPruefenGeruest(modul)`, strukturell identisch zu `textsatzModulPruefen`, bis auf
die eine Zeile, die `'de'` ablehnt. Diese Funktion hat **keinen einzigen Aufrufer** im Kern;
`textsatzModulPruefen` (vom Einlassweg gerufen) bleibt unverändert und lehnt `'de'` weiterhin ab.
Eine Ratschen-Probe (Abschnitt 3) hält fest, dass das so bleibt, bis jemand sie absichtlich
ändert.

---

## 3 · Beleg

Beide Mechanismen sind mit **Test-Schlüsseln** bewiesen, nicht mit dem echten TA-Anker —
`_RECHTSRAUM_GERUEST_MODUL_CERTS` bleibt in diesem Commit leer (s. Abschnitt 4).

**`tests/u2-adr-285-rechtsraum-geruest-modul.test.js`** (neu, sieben Proben):
- **Positivkontrolle:** ein korrekt gegen einen Test-Anker signiertes `"DE"`-Modul wird
  angenommen, sein neuer `tpl_`-Typ ist über `_rechtsraumKatalogLesen` lesbar.
- **Rotmachbarkeit (drei Proben):** ein fremd signiertes, ein manipuliertes und ein
  Cert-loses Modul werden abgelehnt; die Registry bleibt in jedem Fall leer.
- **Der allgemeine Einlassweg bleibt unverändert:** `EINLASS_REGISTER`s Rechtsraum-Eintrag lehnt
  `"DE"` weiterhin ab.
- **Gegenprobe (Überhol-Sicherheit, ausdrücklich verlangt):** ein echtes,
  Gerüst-geladenes `"DE"`-Modul UND eine fingierte, direkt in `data.rechtsraumModule[]`
  geschriebene `"DE"`-Registry (kann über den echten Einlassweg strukturell nicht entstehen)
  bestehen nebeneinander — der eingebaute Katalog gewinnt gegen beide, und das echte
  Gerüst-Modul bleibt unberührt von der fingierten Registry. Die zwei Registries haben keine
  gemeinsame beschreibbare Fläche; ein ungeprüftes Modul kann ein geprüftes darum strukturell
  nicht überholen, unabhängig von der Aufruf-Reihenfolge.

**`tests/u2-adr-285-textsatz-geruest-modul.test.js`** (neu, fünf Proben): der neue Prüfweg
arbeitet korrekt und identisch zu `textsatzModulPruefen` bis auf die Sprachsperre; der
Einlassweg lehnt `'de'` weiterhin ab; **die Ratsche** liest den rohen `vivodepot.html`-Quelltext
und verlangt genau eine Fundstelle für `_textsatzModulPruefenGeruest` (die eigene Definition) —
wird sie zwei, ist irgendwo ein Aufruf entstanden, der bewusst geprüft werden muss.

**Regression, unverändert grün:** `tests/rechtsraum-modul-vertrag.test.js` (19 Proben, darunter
die bestehende „der eingebaute Katalog hat IMMER Vorrang"-Probe) und
`tests/textsatz-mechanismus.test.js` (49 Proben) — beide gezielt gegen den geänderten Kern
gefahren, alle 76 Proben dieses Laufs grün. **Kein voller Suite-Lauf** (Gate-Disziplin, mehrere
Sitzungen bauen parallel dieselbe Nacht, Läufe werden einzeln freigegeben).

---

## 4 · Was noch fehlt, damit es im Betrieb wirkt — benannt, nicht verschwiegen

Ein ADR, der das verschweigt, sieht aus wie ein fertiges Feature und ist keines (ausdrückliche Auflage).

- **Das echte Zertifikat.** `_RECHTSRAUM_GERUEST_MODUL_CERTS` ist leer. Ein „Vivodepot ist der
  Anbieter für DE"-Zertifikat auszustellen braucht den TA-Anker-Schlüssel — ein eigener, späterer
  Akt, wie die Anker-Rotation A285/A353, nicht etwas, das dieser Commit tut oder tun darf
  (Schlüsselmaterial ist außerhalb der Reichweite dieser Änderung).
- **Die Boot-Verdrahtung.** `_rechtsraumGeruestModulLaden` wird heute nirgends beim Start
  aufgerufen — genau wie `basisVorlagenVerifizieren` vor seiner eigenen Verdrahtung. Ohne ein
  echtes Zertifikat gäbe es dort ohnehin nichts zu laden; das Verdrahten selbst ist eine eigene,
  spätere Entscheidung.
- **Der eigentliche Inhalt.** Dieser ADR macht `"DE"` MODULFÄHIG, migriert aber keinen
  bestehenden `RECHTSRAUM_KATALOG`-Eintrag in ein Modul. Der eingebaute Katalog bleibt für alle
  fünf Instrument-Typen + `ehegattennotvertretung` unverändert die alleinige Quelle.
- **Textsatz 'de' bleibt bewusst schlafend.** Anders als beim Rechtsraum gibt es keinen
  Anschluss an einen bereits bewiesenen, lebenden Signaturweg — ob und wie ein echtes deutsches
  Textsatz-Modul je geladen wird, ist eine eigene, spätere Entscheidung, keine dieses ADR.
- **Der Contributor-Vertrauensweg bleibt unentschieden** (ADR-121, „ausdrücklich offen") — wer
  außer Vivodepot selbst je ein Rechtsraum-Modul signieren darf, ändert sich durch diesen ADR
  nicht.

---

## 5 · Was dieser ADR NICHT ist

Keine Aufhebung der Reservierung — für jeden Weg, den eine Bürgerin oder ein fremder Anbieter
tatsächlich erreichen kann (Einstellungen → Module → Einlassen), bleiben `"DE"` und `'de'`
ausnahmslos abgelehnt, unverändert. Keine Migration von Bestandsinhalt in ein Modul. Keine
Entscheidung über den Contributor-Vertrauensweg. Kein Ankerschlüssel-Akt — die Ausstellung eines
echten Vivodepot-Zertifikats bleibt ein eigener, späterer Schritt.
