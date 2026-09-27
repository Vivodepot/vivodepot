<!--
  PRINCIPLES.md — Vivodepot
  The English text below is the BINDING version. The German section further down
  ("Deutsche Lesefassung") is a reading aid only; in case of doubt, the English wording governs.
  This document sits ABOVE the ADRs. ADRs reference these principles as their justification,
  not the other way around. Changes follow the same discipline as ADR reversals:
  visible, dated, reasoned — never silent.
-->

# Principles

Vivodepot is built to outlast any single contributor and to be extended by people none of today's contributors will ever meet. These principles bind every contribution equally, regardless of who wrote it. An ADR decides *how* something is built in a given case; these principles decide what may be built at all. Where a contribution conflicts with a principle here, the principle wins.

They are not a feature list. They follow from two roots.

---

## Root 1 — Data sovereignty (the *why*)

Vivodepot exists so that a person's life data belongs to that person and to no one else. Not to Vivodepot, not to a provider, not to a server, not to a copy held somewhere for safekeeping. This is where the whole project grew from, and every structural principle below is a consequence of it.

From this root follow:

- **Offline.** The depot file lives with the citizen alone. No server holds it, no cloud backs it up, the application needs no network to work. A server would be a second holder of the data — so there is none.
- **No account, no login, no gatekeeper.** Nothing stands between the citizen and their own file. Access to one's own data is never mediated by a party that could withhold it. The stick from the drawer is enough.
- **Encryption as the citizen's lock, not ours.** The data is encrypted so that only the citizen can open it. The cryptographic core exists to give the citizen the key — not to give anyone else a copy.
- **No loss because software, browser, or device moved on.** A depot must remain readable to its owner over time. The citizen must never lose their data because a version changed, a browser updated, or a device aged. (See *Compatibility* below.)
- **Single source of truth — one datum, one place.** Each datum exists exactly once, at its home. Wherever it is relevant elsewhere, other areas *reference* it — they do not copy it. So there are never two versions drifting apart, and the citizen maintains and deletes each datum in exactly one place. This follows directly from sovereignty: the citizen can only control data that has a single home. The exception is narrow and named: a copy is permitted only where availability demands it — for example the emergency cache that mirrors selected fields so first responders can read them offline without decrypting the whole depot. Such a copy must be visibly marked and justified; convenience is never a sufficient reason.

## Root 2 — Infrastructure others can build on (the *where to*)

Vivodepot is meant to become infrastructure: a base that people can dock new subject areas onto — immigration, recognition of professional qualifications, residence status, and many fields it does not cover today — and adapt to other languages and other legal systems, without asking permission. Modularity is not an end in itself. It is the condition that makes this possible.

From this root follow:

- **Open source.** So that anyone *may* dock on at all. The license guarantees mission continuity and prevents vendor lock-in.
- **Sector-agnostic core.** The core knows nothing of "provisions" or "immigration". It carries modules, whatever their subject.
- **Modular: the structure stands, the content flows.** Modules follow a fixed contract. Their content — the actual texts, building blocks, fields — can move, change, or be replaced without touching the structure. A new module fills a defined shape; it does not reshape the core.
- **Lean core.** The core stays small so that modules carry the content, not the core.
- **Templates to dock onto.** The docking mechanism itself, by which a module — local or foreign, official or research-based — attaches to the core.
- **Open standards, conformant in every direction.** So that a module from another jurisdiction, another language, or another author fits technically, and so that a citizen reaches their own data without a proprietary format standing in the way.

Some principles serve both roots. Open standards serve docking *and* sovereignty. Offline serves sovereignty *and* the honesty of "no hidden dependency". Where a principle is contested later, name which root it comes from — that usually settles whether it is negotiable.

---

## Compatibility

Compatibility is a building law across four axes. Two of them Vivodepot *produces*; two it *enables by restraint*. The distinction is deliberate: a principle that promised "runs everywhere" would break itself at the next browser update and lose its authority. These promises hold because they are about what Vivodepot does, not about systems it does not control.

**Produced compatibility:**

- **Data, across versions.** A depot stays readable across application versions — old data in a new app, new data in an old reader — through lossless migration. This is upheld, not hoped for.
- **Standards.** Conformance to the established versions of the standards in use (FHIR, Verifiable Credentials, and others), with changes tracked as they come.

**Compatibility enabled by restraint:**

- **Browser and hardware — through tool restraint.** Vivodepot uses only built-in browser capabilities that are currently available in every reasonably common browser, and nothing beyond that. No dependency on the newest or on proprietary features; no library that a somewhat older browser might lack. This is a rule about *what Vivodepot uses*, which it controls — not a promise about foreign systems, which it cannot. Single-file, no runtime CDN, no external runtime dependency.
- **Device testing over engine trust.** Node-green is not proven-on-device. A browser engine (notably iOS WebKit) has its own layer; real-device testing on the target audience's hardware is obligatory, not optional.

---

## The pre-v1 time axis

Structure is built before v1. After v1, only content flows.

Before real depots exist, structural change is cheap. Once citizens hold real, encrypted depots, any structural rebuild must run losslessly against live data and becomes expensive — and, at large scale, effectively impossible. Therefore: the docking mechanism, the module contract, the shared structure must all stand before v1. The modules themselves may grow forever afterward; that is content, and content is allowed to flow at any time.

This is why "build it completely now" is not impatience. It is the recognition that the structure has exactly one affordable moment, and it is now.

---

## Standing of this document

These principles bind all contributions equally, including whoever wrote them. They sit above the ADR series: an ADR justifies a concrete decision by reference to a principle here. This document is not an ADR and carries no ADR number.

**Out of scope, on purpose.** This document governs *structure*. It deliberately does not cover:

- **Business model** — who pays, and the principle that citizens never do. Lives elsewhere; it is non-negotiable but not a structural rule.
- **Licensing of individual templates** — the license split for the template mechanism. A separate, non-negotiable decision, documented in its own place.
- **User experience** — low-threshold design for older users. Its *architectural* part (no account, no login, offline) already follows from Root 1; the design part is not a structural principle.
- **Enforcement / governance** — *who* decides whether a foreign module conforms, and by what procedure. This layer exists and is acknowledged here, but is documented separately (see `CONTRIBUTING.md` and, when it exists, a governance document). Text alone does not bind; the enforcement layer is what makes conformance real.
- **Internal working method** — Spec First, "declared ≠ verified", the three-role model, and the rest bind the internal team, not an external contributor, and live in the development notes.

**Changing these principles.** A change to this document is visible, dated, and reasoned — never silent. The same discipline the project applies to ADR reversals (only as a dated supersede) applies here, more strictly: this is the root others rely on.

**Changes.** 2026-09-25: the word "honestly" removed from the heading "Compatibility" (and „ehrlich" from its German
reading). Reason: it was a label, not a statement; the content of the section is unchanged.

---

## Deutsche Lesefassung (nicht bindend)

*Die englische Fassung oben ist verbindlich. Dieser Abschnitt ist Lesehilfe; im Zweifel gilt der englische Wortlaut.*

Vivodepot ist gebaut, um jede einzelne Mitwirkende zu überdauern und von Menschen erweitert zu werden, die keiner der heutigen Beteiligten je trifft. Diese Grundsätze binden jeden Beitrag gleich, unabhängig davon, wer ihn geschrieben hat. Ein ADR entscheidet, *wie* im Einzelfall gebaut wird; diese Grundsätze entscheiden, *was überhaupt* gebaut werden darf. Wo ein Beitrag einem Grundsatz hier widerspricht, gewinnt der Grundsatz. Sie folgen aus zwei Wurzeln.

**Wurzel 1 — Datensouveränität (das Warum).** Vivodepot existiert, damit die Lebensdaten eines Menschen diesem Menschen gehören und sonst niemandem — nicht Vivodepot, keinem Anbieter, keinem Server, keiner Kopie irgendwo. Daraus folgen: offline (die Depot-Datei liegt allein beim Bürger, kein Server, keine Cloud); kein Konto, kein Login, kein Türsteher zwischen Bürger und eigener Datei; Verschlüsselung als Schloss des Bürgers, nicht als unsere Kopie; kein Datenverlust, weil Software, Browser oder Gerät weiterzogen; **single source of truth — ein Datum, ein Ort** (jedes Datum existiert genau einmal am Heimatort; andere Bereiche *verweisen* darauf, statt zu kopieren — nie zwei Fassungen, die auseinanderlaufen; gepflegt und gelöscht an einer Stelle). Die Ausnahme ist eng und benannt: eine Kopie nur, wo Verfügbarkeit sie erzwingt — etwa der Notfall-Cache, der ausgewählte Felder spiegelt, damit Sanitäter offline lesen können, ohne das ganze Depot zu entschlüsseln; sichtbar markiert und begründet, nie aus Bequemlichkeit.

**Wurzel 2 — Infrastruktur zum Andocken (das Wohin).** Vivodepot soll Infrastruktur werden: eine Basis, an die andere weitere Themenfelder andocken — Immigration, Anerkennung von Berufsabschlüssen, Aufenthaltsstatus und vieles, was es heute nicht abdeckt — und die sich an andere Sprachen und Rechtsräume anpassen lässt, ohne zu fragen. Modularität ist kein Selbstzweck, sondern die Bedingung dafür. Daraus folgen: Open Source (damit überhaupt jemand andocken *darf*); sektoragnostischer Kern; modular — die Struktur steht, der Inhalt fließt; schlanker Kern; Templates zum Andocken; offene Standards, konform in alle Richtungen.

**Kompatibilität.** Vier Achsen. Daten (verlustfreie Migration über Versionen) und Standards (Konformität zu etablierten Versionen) werden *hergestellt*. Browser und Hardware werden *durch Zurückhaltung ermöglicht*: nur Bordmittel, die in jedem gebräuchlichen Browser aktuell verfügbar sind, nichts darüber hinaus — eine Regel über das, was Vivodepot benutzt, nicht ein Versprechen über fremde Systeme. Plus: Gerätetest statt Vertrauen auf die Engine (node-grün ≠ am-Gerät-bewiesen).

**Zeitachse vor v1.** Struktur wird vor v1 gebaut, nach v1 fließt nur noch Inhalt. Vor echten Depots ist struktureller Umbau billig; gegen echte verschlüsselte Depots wird er teuer und im großen Stil praktisch unmöglich. Der Andock-Mechanismus, der Modul-Vertrag, die gemeinsame Struktur müssen vor v1 stehen. Die Module wachsen danach ewig weiter — das ist Inhalt, und Inhalt darf jederzeit fließen.

**Stand dieses Dokuments.** Bindet alle Beiträge gleich, auch den der Urheberin. Steht über der ADR-Reihe (ADRs verweisen herauf), ist selbst kein ADR. Ausdrücklich ausgelagert: Geschäftsmodell (wer zahlt — Bürger nie), Template-Lizenzierung, UX, Durchsetzung/Governance, interne Arbeitsweise. Änderungen an diesem Dokument: sichtbar, datiert, begründet — nie still.

**Änderungen.** 25.09.2026: das Wort „ehrlich“ aus der Überschrift „Kompatibilität“ gestrichen (englisch „honestly“). Grund: ein Etikett, keine Aussage; der Inhalt des Abschnitts ist unverändert.

---

<sub>Vivodepot · public repository · PRINCIPLES.md · English binding, German reading aid · sits above the ADR series.</sub>
