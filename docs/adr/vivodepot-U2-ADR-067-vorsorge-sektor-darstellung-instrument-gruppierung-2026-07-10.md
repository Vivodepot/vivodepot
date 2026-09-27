# U2-ADR-067 — Vorsorge-Sektor: Darstellung geheilt (Instrument-Gruppierung + Gate-Kopplung)

**Datum:** 10.07.2026
**Status:** **Angenommen** (02.08.2026 offiziell angenommen) · vorher Entwurf · gebaut 10.07.2026 (Suite 1229/0, VdCrypto-Block-Pin `8d31c678…` + JWS `d0541ea7…` byte-identisch, Firefox-Verifikation grün; Annahme = Produktentscheidung).
**Status heute:** gilt — Instrument-Gruppierung, Gate-Kopplung (`sichtbarWenn` bei Betreuung/Sorgerecht/Testament)
und der bewusst nicht entfernte `organspende`-Bestand sind im heutigen `vivodepot.html` nachweisbar
(Zeilen 6532 ff., 8445 ff.).
**Nummer:** U2-ADR-067 (höchste belegte in `docs/adr/` war U2-ADR-066).
**Typ:** Reine Darstellung/Aufräumen im Vorsorge-Sektor (`SEKTOREN.vorsorge.sektionen`). **KEIN Schema-Bump, Gate-Werte + -Konsumenten unverändert.**
**Bezug:** Instrument-Ebene-Inventur (Melde-Stand 10.07.) · U2-ADR-045 (Verwaisung) · U2-ADR-064/065 (Vollmacht/refMehrfach) · U2-ADR-066 (PV-Wizard, Grundhaltung verwaist).

---

## Kontext

Die Instrument-Ebene-Inventur (read-only) zeigte im Vorsorge-Sektor vier Darstellungs-Brüche: (1) die
Betreuungsverfügung war **gespalten** — Gate `betreuungsverfuegung` in der Sektion „Verfügungen/Vollmachten/
Testament", die Detailfelder `betreuung_*` in „Betreuung & Sorge"; (2) die Detailfelder von Betreuung,
Sorgerecht und Testament wurden **immer** angezeigt, auch bei Gate = nein (kein `sichtbarWenn`); (3) die vom
PV-Wizard (ADR-066) **verwaisten** Felder standen weiter im manuellen Formular; (4) Testament, Vollmacht und
Patientenverfügung lagen in einer gemischten Sammel-Sektion. Auftrag: rein die Darstellung heilen, ohne die
Gate-Konsumenten (ERKENNUNG_LEITFELDER, Situationsblätter, Import-Aliase, WIZARD_DOKUMENT_MAP, Notfall-Kern)
anzufassen und ohne Schema-Bump.

## Entscheidung

1. **Instrument-Gruppierung** — sechs Sektionen, je Instrument: `vorsorgevollmacht` (ZVR + Gate + `vollmachten`-
   Liste), `patientenverfuegung` (Gate + Ablageort + Ärztin + Organspende + Pflege-Geprüft), `testament-erbe`,
   `pflegewuensche`, `betreuungsverfuegung`, `sorgerechtsverfuegung`. (Die KI-Verfügung liegt in Sektor 9
   „Verwaltung", nicht hier — außerhalb dieses Umbaus.)
2. **Betreuungs-Split geheilt** — der Gate `betreuungsverfuegung` ist in dieselbe Sektion wie die `betreuung_*`-
   Detailfelder gezogen. „Betreuung & Sorge" ist in zwei Instrument-Sektionen geteilt.
3. **Detailfelder ans Gate gekoppelt** (`sichtbarWenn`): Betreuung-Details nur bei `betreuungsverfuegung = ja`;
   Sorgerecht-Details bei `∈ {ja, in Vorbereitung}`; Testament-**Dokument**-Felder (Ablageort, Datum) bei
   `∈ {ja, in Vorbereitung}`. Der **Erbe-Inhalt** (`erben`, `erbfolge_hinweis`, `vermaechtnisse`) bleibt bewusst
   ungekoppelt — die (gesetzliche) Erbfolge gilt auch OHNE Testament. `feldSichtbar` wertet Wert-Arrays aus.
4. **Verwaiste PV-Reste entfernt** (nur Anzeige, Daten verwaisen, keine Migration): `patientenverf_haltung`,
   `patientenverf_wunsch`, `palliativ_wunsch` — der BMJ-Wizard schreibt sie nicht mehr.

## Bewusst NICHT entfernt: `organspende`

Die Inventur des Auftrags nannte `organspende`/`_einschraenkung` als „verwaist". Der Code zeigt aber einen
**aktiven Konsumenten**: `organspende` steht in `NOTFALL_KERN_FELDER` — der Klartext-Allowlist für die
Notfall-QR-Karte + den Sanitäter-Cache. Ein Entfernen würde diesen Notfall-Datenpunkt kappen (das neue
`pv_organspende` hat andere Werte: `zustimmung/ablehnung` vs. `ja/teil/nein/familie`). Deshalb bleiben
`organspende` + `organspende_einschraenkung` im Formular (Patientenverfügungs-Sektion). Ein späteres Entfernen
setzt voraus, den Notfall-Kern zuerst auf `pv_organspende` umzupointen — eine eigene, noch offene Entscheidung.

## Konsequenzen

- Reine `sektionen`-Umstrukturierung: Feld-IDs, Datenpfade (`data.sektoren.vorsorge[*]`) und alle Gate-
  Konsumenten unverändert. Exporte/Situationsblätter lesen über Feld-IDs, nicht über Sektionen → unberührt.
- Sektions-Reihenfolge: Vollmacht → PV → Testament → Pflegewünsche → Betreuung → Sorgerecht (Pflegewünsche
  liegt physisch vor Betreuung/Sorgerecht — akzeptiert; reine Reihenfolge, jederzeit umsortierbar).
- **Offen:** organspende → pv_organspende-Repoint des Notfall-Kerns (dann wäre organspende
  entfernbar); ob der Erbe-Inhalt doch ans Testament-Gate soll; ob „Vorbereitung" als Gate-Option auch für
  Betreuungsverfügung ergänzt wird (heute nur ja/nein).

## Verifikation

- Suite **1229/0** (sektoren-spec: Instrument-Gruppierung + Gate-Kopplung + Verwaisung nachgezogen; +2 Tests).
- Block-Pins byte-identisch (VdCrypto `8d31c678…`, JWS `d0541ea7…`).
- **Firefox** (Playwright/Gecko): sechs Instrument-Sektionen sichtbar; Betreuungs-Detail verborgen bei Gate leer,
  sichtbar bei ja; Testament-Detail verborgen bei Gate leer; drei verwaiste Felder nicht mehr gerendert;
  organspende weiter da; keine Seiten-/Konsolenfehler.
- sha256 `69cbccd3…`; SW-Cache cleanslate `v31 → v32`. Kein Push.

## Nachtrag 1 (10.07.2026) — „in Vorbereitung" als Betreuungsverfügungs-Gate-Option

Der oben notierte offene Punkt ist umgesetzt: das `betreuungsverfuegung`-Gate hatte nur `ja/nein` — ergänzt um
`plant` („in Vorbereitung"), konsistent zu Sorgerecht/Testament. Die Betreuungs-Detailfelder-`sichtbarWenn`
wandern von `'ja'` auf `['ja', 'plant']`, sodass die Details auch beim Entwerfen erscheinen. Rein additive
Option — die ERKENNUNG bleibt (`erfuellt: (w) => w === 'ja'`, `plant` löst KEINEN Dokument-Vorschlag aus,
wie bei den anderen Gates). Suite **1229/0**, Block-Pins byte-identisch, Firefox grün (`plant` zeigt Details);
sha256 `d7eb260f…`; SW-Cache `v32 → v33`.

## Nachtrag 2 (03.09.2026) — KI-Verfügung: Klammersatz durch U2-ADR-100 §9 abgelöst

Der Klammersatz in Entscheidung 1 oben — „(Die KI-Verfügung liegt in Sektor 9 ‚Verwaltung', nicht
hier — außerhalb dieses Umbaus.)" — ist überholt. U2-ADR-100 §9 (24.07.2026) hält fest: die
KI-Verfügung liegt seit Block E am gemeinsamen Ort (Migration 39→40), nicht mehr in Sektor 9.
Abgelöst ist ausschließlich dieser eine Klammersatz — Instrument-Gruppierung, Betreuungs-Split,
Gate-Kopplung (`sichtbarWenn`), die verwaisten PV-Reste und der bewusst nicht entfernte
`organspende`-Bestand (oben) bleiben unberührt in Kraft. Kein Ablösen dieses ADR im Ganzen, nur
eine benannte, enge Korrektur.
