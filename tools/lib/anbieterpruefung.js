'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════════
   anbieterpruefung.js — Pflichtblock vor jeder Zertifikatsausstellung (19.09.2026, Produktentscheidung:
   „auf jeden Fall implementieren, abschaltbar")
   ────────────────────────────────────────────────────────────────────────────
   {methode, geprueftAm, geprueftVon, belegHash} — der Beleg selbst wird NIE mitgeführt, nur sein
   sha256-Hash (dasselbe Konstruktionsprinzip wie `originaleSumme` im Prüfer-Weg,
   vivodepot.html _originaleSummeKern: der Nachweis ist prüfbar, ohne den Rohinhalt zu tragen).

   VORGABE AN, je Ausstellungsweg getrennt (Kundenzertifikat/Behördenzertifikat je eigener
   Schalter) — Abschalten ist möglich, aber NIE still: die Abschaltung selbst wird im
   ausgestellten Zertifikat vermerkt (`anbieterPruefungAbgeschaltet: true`,
   vivodepot-vc-issuer.html `baueProviderVC`). KEINE Rückwirkung — gilt nur für neue
   Ausstellungen; ein Altzertifikat ohne `anbieterPruefung` UND ohne
   `anbieterPruefungAbgeschaltet` gilt als „ungeprüft (vor Einführung)" (s.
   `anbieterPruefungStatus` unten) — dafür ist kein drittes Feld nötig, die bloße Abwesenheit
   beider Felder ist das Signal.
   ════════════════════════════════════════════════════════════════════════════ */

const METHODEN = Object.freeze(['registerauszug', 'email-bestaetigung', 'ausweis-von-hand']);
const SHA256_HEX = /^[0-9a-f]{64}$/;
const ISO_DATUM = /^\d{4}-\d{2}-\d{2}/;

// Wirft benannt. Rot-Beweis der Ausstellungswerkzeuge: „ohne Anbieterprüfung keine Signatur" —
// es sei denn, die Abschaltung wurde ausdrücklich gewählt (dann läuft diese Funktion gar nicht,
// s. Aufrufer in den Ausstellungswerkzeugen).
function anbieterPruefungPruefen(p) {
  const wo = 'Anbieterprüfung';
  if (!p || typeof p !== 'object') throw new Error(wo + ' fehlt — vor jeder Ausstellung Pflicht (Vorgabe an), es sei denn ausdrücklich abgeschaltet.');
  if (!METHODEN.includes(p.methode)) {
    throw new Error(wo + ': methode fehlt oder unbekannt (erwartet eine von ' + METHODEN.join('/') + ').');
  }
  if (!p.geprueftAm || !ISO_DATUM.test(p.geprueftAm)) {
    throw new Error(wo + ': geprueftAm fehlt oder ist kein Datum (ISO, z. B. "2026-09-19").');
  }
  if (!p.geprueftVon || !String(p.geprueftVon).trim()) {
    throw new Error(wo + ': geprueftVon fehlt — wer hat geprüft?');
  }
  if (!SHA256_HEX.test(p.belegHash || '')) {
    throw new Error(wo + ': belegHash fehlt oder ist kein sha256-Hex (64 Zeichen) — der Beleg selbst reist nie mit, nur sein Hash.');
  }
  return { methode: p.methode, geprueftAm: p.geprueftAm, geprueftVon: p.geprueftVon, belegHash: p.belegHash };
}

// Liest den Drei-Zustands-Status eines ausgestellten Zertifikats (credentialSubject) —
// „geprueft" | „abgeschaltet" | „vor-einfuehrung". Keine Rückwirkung: ein Zertifikat, das vor
// dieser Funktion entstand, trägt keines der beiden Felder und gilt als vor-einfuehrung, nicht
// als Fehler.
function anbieterPruefungStatus(credentialSubject) {
  const cs = credentialSubject || {};
  if (cs.anbieterPruefung) return { status: 'geprueft', anbieterPruefung: cs.anbieterPruefung };
  if (cs.anbieterPruefungAbgeschaltet) return { status: 'abgeschaltet' };
  return { status: 'vor-einfuehrung' };
}

module.exports = { METHODEN, anbieterPruefungPruefen, anbieterPruefungStatus };
