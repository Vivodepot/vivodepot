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
Rezept, Herkunft und Prüfsummen: `tools/schrift-pdf-quellen/README.md`. Seit v896 reisen die Schnitte im Erscheinungsbild-Modul (`schriften[]`, `pdf: true`).

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
Die vorliegende Ausgabe beruht  
(1) auf der vollständigen amtlichen Fassung der Internationalen statistischen Klassifikation der Krankheiten und verwandter Gesundheitsprobleme, 10. Revision, und  
(2) auf der australischen ICD-10-AM, First Edition.  
Die englischsprachige Originalausgabe zu (1) wurde 1992 von der Weltgesundheitsorganisation (WHO) veröffentlicht als International Statistical Classification of Diseases and Related Health Problems, Tenth Revision, Geneva, WHO, Vol. 1, 1992; die englischsprachige Originalausgabe zu (2) wurde 1998 vom australischen National Centre for Classification in Health veröffentlicht als Volume 1 of The International Statistical Classification of Diseases and Related Health Problems, 10th Revision, Australian Modification (ICD-10-AM), First Edition.  
© zu (1): Weltgesundheitsorganisation (WHO) 1992  
© zu (2): Commonwealth of Australia 1998  
Der Generaldirektor der Weltgesundheitsorganisation (WHO) hat die Übersetzungsrechte für eine deutschsprachige Ausgabe an das Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) vergeben, das für die Übersetzung allein verantwortlich ist.  
Das Commonwealth of Australia hat die Übersetzungsrechte für eine deutschsprachige Ausgabe an das Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) vergeben, das für die Übersetzung allein verantwortlich ist.  
Herausgegeben vom Bundesinstitut für Arzneimittel und Medizinprodukte (BfArM) im Auftrag des Bundesministeriums für Gesundheit (BMG)  
Die Erstellung bzw. der Druck erfolgt unter Verwendung der maschinenlesbaren Fassung des Bundesinstituts für Arzneimittel und Medizinprodukte (BfArM).

**LOINC** — Regenstrief Institute, Inc., LOINC-Lizenz:
This material contains content from LOINC (http://loinc.org). LOINC is copyright © Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee and is available at no cost under the license at http://loinc.org/license. LOINC® is a registered United States trademark of Regenstrief Institute, Inc.

**SNOMED CT (Global Patient Set)** — Enthält Bestandteile des SNOMED CT Global Patient Set (GPS), © 2026 SNOMED International, lizenziert unter der Creative Commons Attribution-NoDerivatives 4.0 International License (CC BY-ND 4.0, https://creativecommons.org/licenses/by-nd/4.0/), bezogen über https://www.snomed.org/gps. SNOMED® und SNOMED CT® sind eingetragene Marken der International Health Terminology Standards Development Organisation. SNOMED CT® was originally created by the College of American Pathologists. Hinweis auf den Gewährleistungsausschluss: Das Material wird ohne Gewähr bereitgestellt; es gilt Abschnitt 5 der CC BY-ND 4.0 (Gewährleistungsausschluss und Haftungsbeschränkung). GPS-Release: 20260101. Genutzt werden ausgewählte Konzepte mit ihrem unveränderten Begriff; deutsche Bezeichnungen daneben sind eigene Bezeichnungen von Vivodepot, keine SNOMED-Begriffe. Einzelheiten in `THIRD_PARTY_LICENSES`.

## Eingebettete Wortlisten (Passwort-Vorschlag)

Die Listen stehen in den Sprachmodulen unter der Kennung `strings:passwortWortliste.text`. Einzelheiten in
`THIRD_PARTY_LICENSES`, Abschnitt „Wortlisten".

**Deutsch: dys2p wordlists-de, `de-1296-v1.txt`.** Quelle: https://github.com/dys2p/wordlists-de. Lizenz nach Wahl des
Nutzers Unlicense, CC0 oder BSD-3-Clause; Vivodepot nutzt sie unter CC0. Verändert: 45 Wörter entfernt.

**Englisch: EFF Short Wordlist 1** (Electronic Frontier Foundation, 2016). Quelle:
https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt. Lizenz: Creative Commons Attribution 4.0 International
(CC BY 4.0, https://creativecommons.org/licenses/by/4.0/), laut https://www.eff.org/copyright. Verändert: 101 Wörter
entfernt, Würfelnummern weggelassen.

**IHE Deutschland — Value Sets for XDS** — © IHE Deutschland e.V., lizenziert unter der Creative Commons Attribution 4.0 International License (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/). Quelle: IHE Germany, „Value Sets for XDS“ 4.0.0, https://github.com/IHE-Germany/ITI.XDS.VS, Stand aa1e0e5bed8c5fbcf3ff64636dbce74e6ca8f3b1. Genutzt werden vier Codes mit ihrer unveränderten Bezeichnung in der Ausgabe für Krankenhäuser (ISiK): IHEXDStypeCode PATD „Patienteneigene Dokumente“, IHEXDSclassCode ADM „Administratives Dokument“ und PAT „Patient außerhalb der Betreuung“ (NichtPatientBezogeneGesundheitsversorgung, NichtaerztlicheFachrichtungen). Nachprüfbar mit `tools/fhir-paket-herkunft-vergleichen.js --codes`.

**IHE formatcode** — Some content from IHE® Copyright © 2015 IHE International, Inc., lizenziert unter der Creative Commons Attribution 4.0 International License (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/). Quelle: ihe.formatcode.fhir (https://profiles.ihe.net/fhir/ihe.formatcode.fhir/). Genutzt wird ein Code, `urn:ihe:iti:xds:2017:mimeTypeSufficient`, unverändert in der Ausgabe für Krankenhäuser (ISiK).

**HL7 Terminology (THO)** — Codes aus elf Codesystemen der HL7 Terminology. THO is copyright ©1989+ Health Level Seven International and is made available under the CC0 designation (https://creativecommons.org/publicdomain/zero/1.0/). Die Liste der Systeme steht in `THIRD_PARTY_LICENSES` und in der SBOM (`terminologie-hl7-tho`).

**KDL (Klinische Dokumentenklassen-Liste, DVMD e.V.) — nicht Teil von Vivodepot.** Die Person lädt die KDL selbst unter GPL-3.0-or-later (https://www.gnu.org/licenses/gpl-3.0.html), Quelle https://packages.fhir.org/dvmd.kdl.r4. Vivodepot verteilt nichts aus ihr; der Kern kennt nur zwei Codes und die URI (U2-ADR-468, Nachtrag 02.10.2026).

---

## Eingebettete Programmzeichen

**xShare Yellow Button** — Visual Identity Kit des Horizon-Europe-Vorhabens xShare (Grant Agreement
No. 101136734), Stand 22.07.2026, bereitgestellt zur Verwendung in Yellow-Button-Implementierungen.
Drei Varianten („Full – light background" für DOWNLOAD, UPLOAD, ONE_TIME_SHARE), verkleinert, sonst
unverändert. Das Kit enthält keine eigenen Nutzungsbedingungen.
`https://xshare-project.eu/wp-content/uploads/2026/07/xShare-Yellow-Button-Visual-identity-kit.zip`

---

## Eingebettete Icons

**Lucide-Icons** — 35 Icons als Pfaddaten in der Skript-Konstante `ICONS`, abgeleitet aus lucide-static,
31 wörtlich, 4 verändert (heart-pulse, contrast, volume-2, square). ISC License: Copyright (c) for portions
of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are
held by Lucide Contributors 2022. Die aus Feather stammenden Icons (lock, alert-triangle, plus,
chevron-right, moon, x, square, clock, help-circle): MIT License, Copyright (c) 2013-2023 Cole Bemis.
`https://lucide.dev` — Wortlaut beider Lizenzen und Herkunft je Icon in `THIRD_PARTY_LICENSES`, Abschnitt 6

---

## Vivodepot-eigener Code

Copyright (c) 2026 Vivodepot GmbH, Berlin
Lizenz: EUPL-1.2 (Code und Dokumentation)
Siehe `LICENSE` für den vollständigen Lizenztext.

## Logo

`logo.png`: Das Logo ist Kennzeichen der Vivodepot GmbH und nicht von der EUPL erfasst.
