# NOTICE — Vivodepot v1.0

Dieses Dokument enthält Attribution-Hinweise für Dritt-Software, die in Vivodepot v1.0 eingebettet ist.
Die vollständigen Lizenz-Texte finden sich in `THIRD_PARTY_LICENSES`.

Vivodepot wird als EUPL-1.2-lizenziertes Werk gemäß Art. 5 EUPL unter Mitgabe dieser Hinweise verteilt.

---

## Eingebettete Dritt-Bibliotheken


**jsPDF 4.2.1** — Copyright (c) 2010-2021 James Hall et al. — MIT License
`https://github.com/parallax/jsPDF`

**qrcode-generator 1.4.4** — Copyright (c) 2009 Kazuhiko Arase — MIT License
`https://github.com/kazuhikoarase/qrcode-generator`

**pako 2.1.0** — Copyright (C) 2014-2017 Vitaly Puzrin and Andrei Tuputcyn; zlib-Anteile (C) 1995-2013 Jean-loup Gailly and Mark Adler — MIT AND Zlib License
`https://github.com/nodeca/pako` — Bestandteil des jsPDF-Bundles, mit ihm im selben Skript-Block eingebettet

**Inter (Oberflächenschrift, WOFF2)** — Copyright (c) The Inter Project Authors — SIL Open Font License 1.1
`https://github.com/rsms/inter` — als base64-WOFF2 im CSS eingebettet, Volltext siehe `OFL.txt`

**Inter (PDF-Einbettung, zugeschnittene TrueType-Statik-Instanzen)** — Copyright (c) The Inter Project Authors — SIL Open Font License 1.1
`https://github.com/rsms/inter` — Volltext siehe `OFL.txt`
Quelle der Schnitte seit 23.09.2026: Release v4.1, `Inter-4.1.zip` (SHA-256 `9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e`),
`InterVariable.ttf` und `InterVariable-Italic.ttf`, „Version 4.001;git-9221beed3"; die vorigen Schnitte stammten aus git-66647c0bb.
Rezept: `tools/build-pdf-inter-einbetten.js`.

**Probe-Schrift (nur Test-Fixture, wird nicht ausgeliefert)** — `tests/fixtures/pdf-schrift-probe-klein.ttf`, abgeleitet aus Inter 4.1
(dieselbe Quelle wie oben), Regular-Instanz auf U+0020–U+007E und U+00A0 zugeschnitten, Versalhöhe (OS/2 sCapHeight) von 1490
auf 1100 gesetzt, umbenannt in „VivodepotProbeKlein" — SIL Open Font License 1.1, Volltext siehe `OFL.txt`. Zweck: der
Nachweis, dass die PDF-Kästchen der Metrik der aktiven Schrift folgen (tests/e2e/pdf-kaestchen-vektor.spec.js).

---

## Eingebettete Code-Listen (Auszüge)

Die vollständigen Quellenangaben und Lizenzbedingungen stehen in `THIRD_PARTY_LICENSES`, Abschnitt „Code-Listen".

**ATC-Klassifikation mit DDD, amtliche deutsche Fassung 2026** — BfArM, anderes amtliches Werk (§ 5 Abs. 2 UrhG), Änderungsverbot (§ 62 UrhG), Quellenangabe (§ 63 UrhG):
Das Wissenschaftliche Institut der AOK (WIdO) ist Urheber der ATC-GM mit DDD, die auf dem vom WHO Collaborating Centre for Drug Statistics Methodology herausgegebenen Werk mit dem Titel „ATC Index with DDDs and Guidelines for ATC Classification and DDD Assignment“ beruht. Die amtliche Veröffentlichung erfolgt durch das Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM).

**ICD-10-GM** — BfArM im Auftrag des BMG, anderes amtliches Werk (§ 5 Abs. 2 UrhG), Änderungsverbot (§ 62 UrhG), Quellenangabe (§ 63 UrhG):
Die englischsprachige Originalausgabe wurde 1992 von der Weltgesundheitsorganisation (WHO) veröffentlicht als International Statistical Classification of Diseases and Related Health Problems, Tenth Revision, Geneva, WHO, Vol. 1, 1992. © Weltgesundheitsorganisation (WHO) 1992. Der Generaldirektor der WHO hat die Übersetzungsrechte für eine deutschsprachige Ausgabe an das BfArM vergeben, das für die Übersetzung allein verantwortlich ist.

**LOINC** — Regenstrief Institute, Inc., LOINC-Lizenz:
This material contains content from LOINC (http://loinc.org). LOINC is copyright (c) 1995-2026, Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee and is available at no cost under the license at http://loinc.org/license. LOINC is a registered United States trademark of Regenstrief Institute, Inc.

**SNOMED CT (Allergen-Auszug)** — SNOMED International; genutzt unter einer Affiliate-Lizenz des National Release Center Deutschland (BfArM). SNOMED CT ist lizenzpflichtig; Einzelheiten in `THIRD_PARTY_LICENSES`.

---

## Eingebettete Programmzeichen

**xShare Yellow Button** — Visual Identity Kit des Horizon-Europe-Vorhabens xShare (Grant Agreement
No. 101136734), Stand 22.07.2026, bereitgestellt zur Verwendung in Yellow-Button-Implementierungen.
Drei Varianten („Full – light background" für DOWNLOAD, UPLOAD, ONE_TIME_SHARE), verkleinert, sonst
unverändert. Das Kit enthält keine eigenen Nutzungsbedingungen.
`https://xshare-project.eu/wp-content/uploads/2026/07/xShare-Yellow-Button-Visual-identity-kit.zip`

---

## Vivodepot-eigener Code

Copyright (c) 2026 Vivodepot GmbH, Berlin
Lizenz: EUPL-1.2 (Code und Dokumentation)
Siehe `LICENSE` für den vollständigen Lizenztext.
