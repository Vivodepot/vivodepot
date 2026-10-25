'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vertrauensregel-block.js — die Trusted-Types-Default-Policy der HTML-Anwendungen (U2-ADR-470)
   ────────────────────────────────────────────────────────────────────────────
   Die zweite Wand hinter der CSP mit Hashes. Mit `require-trusted-types-for 'script'` nimmt der Browser an den
   HTML- und Skript-Senken (innerHTML, insertAdjacentHTML, DOMParser, script.src, serviceWorker.register …) keine
   Zeichenkette mehr an, nur, was eine Policy freigibt. Diese Default-Policy reicht NICHTS ungeprüft durch:
     · HTML mit ausführbarem Anteil wird ABGELEHNT (TypeError): Ereignis-Attribute (on…), srcdoc, Adressen mit
       javascript:/vbscript: (auch kodiert), Elemente, die ausführen, fremd laden oder die Regeln der Seite ändern
       (script, iframe, frame, object, embed, base, meta, link …), und Markup im Rohtext von style/textarea/title.
     · Skript-Adressen nur aus einer festen Liste: `sw.js` (vivodepot.html, navigator.serviceWorker.register) und
       `./vorabkonfiguration.js` (vivodepot.html, VOR_DEPOT_KONFIGURATION_PFAD, dynamisch eingesetztes Skript).
     · Skript aus Zeichenketten nie.
   Benannte Policies gibt es keine; die CSP erlaubt nur den Namen `default`.

   KEIN <iframe> MEHR (17.10.2026): die Fassung vom 01.10. ließ einen Rahmen für die eigene PDF-Vorschau der Mappe zu.
   Den Rahmen gibt es im Kern seit 15.10.2026 nicht mehr (Befund PDF-VORSCHAU-VON-CSP-BLOCKIERT, Probe
   tests/e2e/pdf-vorschau-rahmen.spec.js); die Ausnahme fiel mit ihm. Ein künftiger Rahmen braucht eine eigene Entscheidung.

   WIE GELESEN WIRD. Die Zeichenkette wird so zerlegt, wie der HTML-Tokenizer es tut, nicht mit einem Muster über den
   ganzen Text: Anführungszeichen schützen nur in einem Attributwert (nach `=`), Kommentare enden am frühesten möglichen
   Ende, Rohtext (style/textarea/title) endet am ersten schließenden Tag. Wo HTML und SVG/MathML verschieden lesen, gilt
   die strengere Lesart. Darum ist `title="… onclick=…"` (ein Wert) erlaubt, `<p title="a"onclick=x>` nicht; und ein
   maskierter Wert (`&#39;`, `&quot;`, `&amp;`) in einer Adresse wird erst entschlüsselt, dann geprüft — die Fassung vom
   01.10. lehnte jede Adresse mit Zeichenreferenz ab und hätte ein Logo als data:-SVG mit Apostroph gesperrt.

   Der Block steht als erstes Skript nach der CSP-Zeile, in jeder Anwendung byte-gleich; tools/csp-bauen.js setzt ihn ein
   und zieht danach die Hashes nach. Der Text des Blocks ist der Quelltext der Funktion unten (Function.prototype.toString),
   damit er hier als Code gelesen, geprüft und im Sandkasten getestet wird (tests/csp-hashes-vertrauensregel.test.js).
   Im Text darf darum keine Zeichenfolge stehen, die ein <script>-Element im HTML beendet oder umschaltet.
   ════════════════════════════════════════════════════════════════════════════ */

const BLOCK_ID = 'vertrauensregel';

/* eslint-disable no-var */
function vertrauensregelEinrichten() {
  if (!window.trustedTypes || typeof window.trustedTypes.createPolicy !== 'function') return;
  // Elemente, die nie aus einer Zeichenkette entstehen: sie führen aus, laden fremd oder ändern die Regeln der Seite.
  var VERBOTEN = { script: 1, iframe: 1, frame: 1, frameset: 1, object: 1, embed: 1, applet: 1, base: 1, meta: 1, link: 1,
    portal: 1, noscript: 1, noembed: 1, noframes: 1, xmp: 1, plaintext: 1 };
  // Rohtext: für HTML kein Markup, für SVG/MathML schon. Ein Tag darin ist darum in jeder Lesart ein Fund.
  var ROHTEXT = { style: 1, textarea: 1, title: 1 };
  var ADRESSEN = { href: 1, src: 1, action: 1, formaction: 1, 'xlink:href': 1, data: 1, poster: 1, background: 1,
    codebase: 1, cite: 1, ping: 1, values: 1, to: 1, from: 1, by: 1 };
  var ZEICHEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n', nbsp: ' ',
    sol: '/', bsol: '\\', semi: ';', lpar: '(', rpar: ')', period: '.', comma: ',', equals: '=', num: '#', excl: '!',
    quest: '?', percnt: '%', plus: '+' };
  var SKRIPT_ADRESSEN = { 'sw.js': 1, './vorabkonfiguration.js': 1 };

  // Ablehnungen als Kennung, nicht als Satz: der Block steht im Gerüst jeder Anwendung, und Sätze gehören ins Produkt
  // (tools/geruest-waechter-pruefen.js, Eimer satz). Die Meldung liest nur, wer die Konsole öffnet.
  function ablehnen(was) { throw new TypeError('vertrauensregel-abgelehnt:' + was); }
  function leer(c) { return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f'; }
  function buchstabe(c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }

  // Eine Adresse, wie der Browser sie liest: Zeichenreferenzen entschlüsselt, Steuer- und Leerzeichen entfernt.
  function adresseGefaehrlich(name, roh) {
    var w = String(roh)
      .replace(/&#x([0-9a-f]+);?/gi, function (_, h) { var n = parseInt(h, 16); return n > 0xffff ? '�' : String.fromCharCode(n); })
      .replace(/&#([0-9]+);?/g, function (_, d) { var n = parseInt(d, 10); return n > 0xffff ? '�' : String.fromCharCode(n); })
      .replace(/&([a-z]+);/gi, function (g, n) { var z = ZEICHEN[n.toLowerCase()]; return z === undefined ? g : z; });
    if (/&[a-z0-9]+;/i.test(w)) return true;   // eine unbekannte benannte Referenz: nicht raten
    w = w.replace(/[\u0000- \u007f]+/g, '').toLowerCase();
    var teile = name === 'values' ? w.split(';') : [w];
    for (var i = 0; i < teile.length; i++) {
      if (teile[i].indexOf('javascript:') === 0 || teile[i].indexOf('vbscript:') === 0) return true;
    }
    return false;
  }

  function pruefen(s) {
    var n = s.length;
    var i = 0;
    while (i < n) {
      var lt = s.indexOf('<', i);
      if (lt < 0) return;
      var c = s.charAt(lt + 1);
      if (s.slice(lt + 1, lt + 4) === '!--') {
        // Kommentar: endet am frühesten möglichen Ende (zwei Striche und '>', zwei Striche, '!' und '>', oder sofort,
        // wenn direkt nach dem Öffner ein '>' oder '->' folgt).
        var ende = -1;
        if (s.charAt(lt + 4) === '>') ende = lt + 5;
        else if (s.slice(lt + 4, lt + 6) === '->') ende = lt + 6;
        else {
          var a = s.indexOf('-->', lt + 4);
          var b = s.indexOf('--!>', lt + 4);
          if (a >= 0) ende = a + 3;
          if (b >= 0 && (ende < 0 || b + 4 < ende)) ende = b + 4;
        }
        if (ende < 0) return;
        i = ende;
      } else if (c === '!' || c === '?' || (c === '/' && !buchstabe(s.charAt(lt + 2)))) {
        // Doctype, CDATA, Verarbeitungsanweisung, falsches Endtag: für HTML ein Kommentar bis zum nächsten '>'.
        var g = s.indexOf('>', lt + 2);
        if (g < 0) return;
        i = g + 1;
      } else if (buchstabe(c) || (c === '/' && buchstabe(s.charAt(lt + 2)))) {
        var endtag = c === '/';
        var j = lt + (endtag ? 2 : 1);
        var name = '';
        while (j < n && !leer(s.charAt(j)) && s.charAt(j) !== '/' && s.charAt(j) !== '>') { name += s.charAt(j); j++; }
        name = name.toLowerCase();
        if (!endtag && VERBOTEN[name] === 1) ablehnen('element:' + name);
        while (j < n) {
          var z = s.charAt(j);
          if (leer(z) || z === '/') { j++; continue; }
          if (z === '>') { j++; break; }
          var an = '';
          do { an += s.charAt(j); j++; } while (j < n && !leer(s.charAt(j)) && s.charAt(j) !== '/' && s.charAt(j) !== '>' && s.charAt(j) !== '=');
          while (j < n && leer(s.charAt(j))) j++;
          var wert = null;
          if (s.charAt(j) === '=') {
            j++;
            while (j < n && leer(s.charAt(j))) j++;
            var q = s.charAt(j);
            if (q === '"' || q === "'") {
              var zu = s.indexOf(q, j + 1);
              if (zu < 0) { wert = s.slice(j + 1); j = n; } else { wert = s.slice(j + 1, zu); j = zu + 1; }
            } else if (q !== '>') {
              var k = j;
              while (k < n && !leer(s.charAt(k)) && s.charAt(k) !== '>') k++;
              wert = s.slice(j, k);
              j = k;
            }
          }
          if (!endtag) {
            var al = an.toLowerCase();
            if (al.indexOf('on') === 0) ablehnen('ereignis-attribut:' + al);
            if (al === 'srcdoc') ablehnen('srcdoc');
            if (wert !== null && ADRESSEN[al] === 1 && adresseGefaehrlich(al, wert)) ablehnen('skript-adresse-in:' + al);
          }
        }
        i = j;
        if (!endtag && ROHTEXT[name] === 1) {
          var schluss = s.toLowerCase().indexOf('<' + '/' + name, i);
          var inhalt = schluss < 0 ? s.slice(i) : s.slice(i, schluss);
          for (var p = inhalt.indexOf('<'); p >= 0; p = inhalt.indexOf('<', p + 1)) {
            var d = inhalt.charAt(p + 1);
            if (buchstabe(d) || (d === '/' && buchstabe(inhalt.charAt(p + 2)))) ablehnen('markup-im-rohtext:' + name);
          }
          if (schluss < 0) return;
          i = schluss;
        }
      } else {
        i = lt + 1;
      }
    }
  }

  window.trustedTypes.createPolicy('default', {
    createHTML: function (s) { s = String(s); pruefen(s); return s; },
    createScriptURL: function (u) {
      if (Object.prototype.hasOwnProperty.call(SKRIPT_ADRESSEN, String(u))) return String(u);
      ablehnen('skript-adresse:' + String(u).slice(0, 40));
    },
    createScript: function () { ablehnen('skript-aus-text'); }
  });
}
/* eslint-enable no-var */

const BLOCK_TEXT = '\n(' + String(vertrauensregelEinrichten) + ')();\n';

// Was im Block nie stehen darf: es beendete das <script>-Element oder schaltete den Parser um.
if (/<\/script|<!--|<script/i.test(BLOCK_TEXT)) throw new Error('vertrauensregel-block: der Blocktext enthält eine Zeichenfolge, die das Skript-Element bricht');

const blockHtml = () => `<script id="${BLOCK_ID}">${BLOCK_TEXT}</script>`;

module.exports = { BLOCK_ID, BLOCK_TEXT, blockHtml };
