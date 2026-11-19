'use strict';
/* Eingebettete Fremdbibliotheken (17.11.2026, aus tests/csp-hashes-vertrauensregel.test.js hierher gezogen, damit es EINE Liste gibt).
   Je Eintrag: Name, Fassung laut SBOM, SHA-256 des Skriptinhalts, Grund und woran der Block erkannt wird. Ein Block gilt nur als
   Fremdbibliothek, wenn er erkannt wird UND sein Inhalt genau diese Prüfsumme hat; ein Byte anders, und er ist eigener Code.
   Nutzer: das Netz-Code-Verbot im gebauten Produkt (tests/csp-hashes-vertrauensregel.test.js, Deckel dort) und ohneFremdbloecke in
   tools/lib/html-senken.js, mit dem die Kern-Scanner nur den eigenen Code messen. */
const crypto = require('node:crypto');

const FREMDBIBLIOTHEKEN = Object.freeze([
  { name: 'jsPDF', fassung: '4.2.1', pruefsumme: '2a6e2849becf9f71dde408e1d7980734dec040787fc3c8a27326bee2a2a23fc0',
    grund: 'GET-Download der Bibliothek, durch connect-src none gesperrt',
    trifft: (attr, inhalt) => /^\s*\/\*\* @license[\s\S]{0,600}jsPDF/.test(inhalt) },
  { name: 'noble-ed25519', fassung: 'fa14496', pruefsumme: 'acfbf9bf9ad63e851a8f448dc9da37e4bad7fe7eef4ca9a5c66b58a5288c5b62',
    grund: 'kein Netz-Code gefunden; Bibliothek, nicht eigener Code',
    trifft: (attr) => /id="noble_ed25519_VivodepotInline"/.test(attr) },
  { name: 'qrcode', fassung: '1.4.4', pruefsumme: '5acc9afb7b602986a62f79e46956cde71716d019816f44b7b3f93039c8b6b345',
    grund: 'kein Netz-Code gefunden; Bibliothek, nicht eigener Code',
    trifft: (attr) => /id="qrcode_VivodepotInline"/.test(attr) },
  // PDF ansehen (17.11.2026): pdf.js trägt fetch/XMLHttpRequest für das Laden per Adresse. Der Kern ruft getDocument nur mit
  // den Bytes der Datei auf, ohne Adresse und mit useWorkerFetch false; connect-src 'none' sperrt jeden Abruf.
  { name: 'pdfjs-dist', fassung: '4.10.38', pruefsumme: '76da854e9dca3ef4ea9faa6516028911b4e6f3f453d46b00092f6aa31bc3de68',
    grund: 'fetch/XMLHttpRequest nur für Laden per Adresse; der Kern übergibt nur Bytes, connect-src none sperrt',
    trifft: (attr) => /id="pdfjs_VivodepotInline"/.test(attr) },
]);

const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');

/** Der Eintrag, wenn ein Skriptblock (Attribute, Inhalt) genau eine gelistete Fremdbibliothek ist; sonst null. */
function fremdbibliothek(attr, inhalt) {
  const f = FREMDBIBLIOTHEKEN.find((e) => e.trifft(attr, inhalt));
  return f && sha256(inhalt) === f.pruefsumme ? f : null;
}

module.exports = { FREMDBIBLIOTHEKEN, fremdbibliothek, sha256 };
