'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   navicon.js — das Icon jeder öffentlichen Seite aus EINER Quelle: dem Kopf des Kerns (09.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Anlass: Nur der Kern trug ein Icon. Lese-App, Studio, Schlüssel teilen, VC-Issuer, Style Guide und alle Seiten des
   Registers zeigten im Browser-Tab das leere Blatt.

   Quelle ist der Kopf des Kerns, nicht eine Bilddatei im Werkzeug: so kommt in einem Partnerprodukt das Icon aus dessen
   Markenmodul, sobald der Produktbau den Bereich füllt (White Label, `--quelle <produkt-kern>`). Gelesen wird:
     1. der markierte Bereich NAVICON:BEGIN … NAVICON:END, wenn der Kern ihn trägt (der Produktbau ersetzt nur seinen Inhalt);
     2. sonst die zwei Zeilen <link rel="apple-touch-icon" …> und <link rel="icon" …>, wie der Kern sie heute hat;
     3. fehlt beides, Abbruch — es gibt kein Ersatzbild hier.
   Wer das Icon trägt, sagt die Inhaltssicherheitsrichtlinie (CSP) der Seite: `cspErlaubtIcon` hält die Form des Links
   (data: oder eigener Pfad) gegen img-src bzw. default-src. Sonst stünde rel="icon" im HTML und lüde doch nicht.
   Proben: tests/navicon-alle-seiten.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const KERN_BEGIN_RE = /^[ \t]*<!-- NAVICON:BEGIN\b[^\n]*-->[ \t]*$/m;
const KERN_END_RE = /^[ \t]*<!-- NAVICON:END -->[ \t]*$/m;
// Der Bereich in den eigenständigen Seiten, gefüllt von tools/navicon-einsetzen.js.
const SEITE_BEGIN = '<!-- NAVICON:BEGIN — erzeugt von tools/navicon-einsetzen.js aus dem Kopf des Kerns, nicht von Hand ändern -->';
const SEITE_END = '<!-- NAVICON:END -->';
// Die Kennungsseiten des Registers (rund 1.350) verweisen auf diese Datei in der Wurzel statt auf den data-URI.
const FAVICON_DATEI = 'favicon.png';
const FAVICON_LINK = '<link rel="icon" type="image/png" href="/' + FAVICON_DATEI + '">';

const LINK_RE = /<link\b[^>]*\brel="(?:icon|apple-touch-icon)"[^>]*>/g;

function _kopf(html) {
  const e = html.search(/<\/head>/i);
  return e >= 0 ? html.slice(0, e) : html;
}

function naviconLinksAusKern(kernText) {
  const kopf = _kopf(String(kernText));
  const b = KERN_BEGIN_RE.exec(kopf);
  if (b) {
    const rest = kopf.slice(b.index + b[0].length);
    const e = KERN_END_RE.exec(rest);
    if (!e) throw new Error('navicon: NAVICON:BEGIN ohne NAVICON:END im Kopf des Kerns.');
    const zeilen = rest.slice(0, e.index).match(LINK_RE) || [];
    if (!zeilen.some((z) => /rel="icon"/.test(z))) throw new Error('navicon: der Bereich NAVICON im Kern trägt kein rel="icon".');
    return zeilen;
  }
  const beruehrt = kopf.match(LINK_RE) || [];
  const touch = beruehrt.filter((z) => /rel="apple-touch-icon"/.test(z));
  const icon = beruehrt.filter((z) => /rel="icon"/.test(z));
  if (icon.length !== 1 || touch.length > 1) {
    throw new Error('navicon: im Kopf des Kerns weder ein Bereich NAVICON noch genau eine Zeile rel="icon" ('
      + icon.length + ' gefunden). Kein Ersatzbild — erst den Kern richten.');
  }
  return touch.concat(icon);
}

function naviconLinks({ quelle = KERN_PFAD } = {}) {
  return naviconLinksAusKern(fs.readFileSync(quelle, 'utf8')).join('\n');
}

// Das Bild für favicon.png in der Register-Wurzel: der data-URI aus rel="icon", dekodiert. Nur PNG, weil die Datei so heißt.
function faviconPngAusKern(kernText) {
  const icon = naviconLinksAusKern(kernText).find((z) => /rel="icon"/.test(z));
  const m = /href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/.exec(icon);
  if (!m) throw new Error('navicon: rel="icon" im Kern ist kein PNG als data-URI — favicon.png lässt sich daraus nicht bilden.');
  const png = Buffer.from(m[1], 'base64');
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('navicon: der data-URI ist kein PNG.');
  return png;
}

function faviconPng({ quelle = KERN_PFAD } = {}) {
  return faviconPngAusKern(fs.readFileSync(quelle, 'utf8'));
}

function seitenBereich(links) {
  return SEITE_BEGIN + '\n' + links + '\n' + SEITE_END;
}

// Der markierte Bereich einer eigenständigen Seite: Lage und Text, oder null.
function seitenBereichIn(html) {
  const a = html.indexOf(SEITE_BEGIN);
  const e = html.indexOf(SEITE_END, a + 1);
  if (a < 0 || e < a || html.indexOf(SEITE_BEGIN, a + 1) >= 0) return null;
  return { anfang: a, ende: e + SEITE_END.length, text: html.slice(a, e + SEITE_END.length) };
}

// Die Icon-Links im Kopf einer Seite, je mit der Form ihres Ziels.
function iconLinksIn(html) {
  return (_kopf(String(html)).match(LINK_RE) || []).map((link) => {
    const href = (/\bhref="([^"]*)"/.exec(link) || [])[1] || '';
    const form = href.startsWith('data:') ? 'data' : (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//') ? 'fremd' : 'self');
    return { link, rel: /rel="apple-touch-icon"/.test(link) ? 'apple-touch-icon' : 'icon', href, form };
  });
}

function _cspAusMeta(html) {
  const m = /<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*\bcontent="([^"]*)"/i.exec(_kopf(String(html)));
  return m ? m[1] : null;
}

// Erlaubt die CSP der Seite das Laden dieses Icons? img-src gilt für Icons; fehlt es, gilt default-src; fehlt beides
// (oder die ganze CSP), ist alles erlaubt.
function cspErlaubtIcon(html, icon) {
  const csp = _cspAusMeta(html);
  if (!csp) return true;
  const direktiven = new Map(csp.split(';').map((d) => d.trim().split(/\s+/)).filter((t) => t[0]).map((t) => [t[0].toLowerCase(), t.slice(1)]));
  const quellen = direktiven.get('img-src') || direktiven.get('default-src');
  if (!quellen) return true;
  if (quellen.includes("'none'")) return false;
  if (quellen.includes('*') && icon.form !== 'data') return true;
  if (icon.form === 'data') return quellen.includes('data:');
  if (icon.form === 'self') return quellen.includes("'self'");
  return quellen.some((q) => q !== "'self'" && q !== 'data:' && icon.href.startsWith(q));
}

module.exports = {
  naviconLinks, naviconLinksAusKern, faviconPng, faviconPngAusKern, seitenBereich, seitenBereichIn, iconLinksIn,
  cspErlaubtIcon, KERN_PFAD, SEITE_BEGIN, SEITE_END, FAVICON_DATEI, FAVICON_LINK,
};
