'use strict';
/* Außenablage — der einzige Schreibweg nach außen (U2-ADR-520).

   Was bei einem Dritten liegt, ist im Client verschlüsselt, auch Verzeichnisse und Metadaten. Diese Datei entscheidet das vor
   jedem Schreiben: jeder Körper, der mit PUT oder POST das Gerät verlässt, geht durch schreiben(). Angenommen wird
   - Chiffrat in einer der Formen, die chiffrat-pruefen.js kennt (Depot-Datei, SHL-JWE, Antwort-JWE, Verzeichnis-JWE), oder
   - einer der Klartexte aus KLARTEXT, jeder mit festem Schema und einem Grund. Mehr Klartext gibt es nicht.
   Alles andere wird abgewiesen, bevor eine Anfrage abgeht. Die Probe tests/aussenablage-einziger-weg.test.js hält, dass kein
   anderer Code in pod/ und share/ mit Körper schreibt.

   KLARTEXT, je mit Grund:
   - `container` PUT ohne Körper: der Speicher braucht den Ordner. Nur der Pfad.
   - `acl`       WAC-Regel: der Pod setzt den Zugriff nur über sie durch, darum steht die WebID der Stelle darin. Nur die drei
                 Regelformen der Brücke (eigen, link, stelle), sonst nichts. Die Person wählt je Ablage: für eine Stelle
                 (der Pod prüft, der Betreiber sieht die Stelle) oder als Freigabe-Link (der Betreiber sieht keine Stelle,
                 öffnen kann jeder mit dem Link). Entschieden 03.11.2026.
   - `grant`     LWS AccessGrant an den Dienst des Pods oder an die Inbox der Stelle: der Dienst wertet ihn aus, die Stelle ist
                 die Empfängerin. Nur die Felder aus pod/lws.js grantBauen; `purpose` nur als https-Adresse, die die Person
                 selbst eingetragen hat.
   - `ablaufliste` { fassung: 1, ablagen: [{ adresse, bis }] }: damit die Brücke Abgelaufenes ohne geöffnetes Depot löscht.
                 Nur Ablagen mit Ablauf; ohne Stelle, Art, Zweck und Grant (U2-ADR-520 Nr. 3). */

(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik(require('./chiffrat-pruefen.js'));
  else wurzel.vdAussenablage = fabrik(wurzel.vdPodChiffrat);
})(typeof self !== 'undefined' ? self : this, function (C) {
  var METHODEN = ['PUT', 'POST'];
  var IRI = '<[^<>"{}|\\\\^`\\s]+>';
  var ACL_ZEILEN = [
    /^@prefix acl: <http:\/\/www\.w3\.org\/ns\/auth\/acl#>\.$/,
    /^@prefix foaf: <http:\/\/xmlns\.com\/foaf\/0\.1\/>\.$/,
    new RegExp('^<#eigen> a acl:Authorization; acl:agent ' + IRI + '; acl:accessTo ' + IRI + ';( acl:default ' + IRI + ';)? acl:mode acl:Read, acl:Write, acl:Control\\.$'),
    new RegExp('^<#link> a acl:Authorization; acl:agentClass foaf:Agent; acl:accessTo ' + IRI + '; acl:mode acl:Read\\.$'),
    new RegExp('^<#stelle> a acl:Authorization; acl:agent ' + IRI + '; acl:accessTo ' + IRI + '; acl:mode acl:Read\\.$'),
  ];
  var GRANT_FELDER = ['@context', 'type', 'storage', 'access', 'inbox'];
  var POLICY_FELDER = ['type', 'action', 'assignee', 'target', 'constraint'];
  var CONSTRAINT_FELDER = ['leftOperand', 'operator', 'rightOperand'];
  var ABLAUF_FELDER = ['adresse', 'bis'];
  var GRENZE_KLARTEXT = 256 * 1024;

  function nurFelder(o, erlaubt) {
    return !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).every(function (k) { return erlaubt.indexOf(k) >= 0; });
  }
  function https(s) {
    if (typeof s !== 'string' || /[\s<>"]/.test(s)) return false;
    try { var u = new URL(s); return u.protocol === 'https:' && !u.username && !u.password && !u.hash; } catch (_) { return false; }
  }
  function json(text) { try { return JSON.parse(text); } catch (_) { return undefined; } }

  function aclGilt(text) {
    if (typeof text !== 'string' || !text || text.length > GRENZE_KLARTEXT) return false;
    var zeilen = text.split('\n').filter(function (z) { return z !== ''; });
    return zeilen.length > 0 && zeilen.every(function (z) { return ACL_ZEILEN.some(function (re) { return re.test(z); }); });
  }

  function grantGilt(text) {
    if (typeof text !== 'string' || text.length > GRENZE_KLARTEXT) return false;
    var g = json(text);
    if (!nurFelder(g, GRANT_FELDER) || !Array.isArray(g.access) || !g.access.length) return false;
    if (g.inbox !== undefined && !https(g.inbox)) return false;
    return g.access.every(function (p) {
      if (!nurFelder(p, POLICY_FELDER)) return false;
      if (p.constraint === undefined) return true;
      return Array.isArray(p.constraint) && p.constraint.every(function (c) {
        if (!nurFelder(c, CONSTRAINT_FELDER)) return false;
        if (c.leftOperand === 'dateTime') return c.operator === 'lteq' && typeof c.rightOperand === 'string' && !isNaN(Date.parse(c.rightOperand));
        if (c.leftOperand === 'purpose') return c.operator === 'eq' && https(c.rightOperand);
        return false;
      });
    });
  }

  function ablauflisteGilt(text) {
    if (typeof text !== 'string' || text.length > GRENZE_KLARTEXT) return false;
    var l = json(text);
    if (!nurFelder(l, ['fassung', 'ablagen']) || l.fassung !== 1 || !Array.isArray(l.ablagen)) return false;
    return l.ablagen.every(function (e) {
      return nurFelder(e, ABLAUF_FELDER) && https(e.adresse) && typeof e.bis === 'number' && isFinite(e.bis);
    });
  }

  /* Rückgabe: null, wenn der Körper in dieser Form hinaus darf; sonst der Grund. Prüft nur, schickt nichts. */
  function pruefen(form, koerper) {
    switch (form) {
      case 'chiffrat': {
        if (typeof koerper !== 'string') return 'chiffrat-kein-text';
        var b = C.pruefen(koerper);
        return b.fehler ? 'chiffrat-' + b.fehler : null;
      }
      case 'container': return koerper === undefined || koerper === null ? null : 'container-mit-koerper';
      case 'acl': return aclGilt(koerper) ? null : 'acl-form';
      case 'grant': return grantGilt(koerper) ? null : 'grant-form';
      case 'ablaufliste': return ablauflisteGilt(koerper) ? null : 'ablaufliste-form';
      default: return 'form-unbekannt';
    }
  }

  /* Der Schreibweg. `senden(adresse, optionen)` ist podFetch der Brücke oder fetch mit credentials 'omit'. Abgewiesen wird mit
     einem Fehler 'aussenablage:<grund>', bevor `senden` aufgerufen wird. */
  function schreiben(senden, methode, adresse, form, koerper, kopf) {
    if (METHODEN.indexOf(methode) < 0) return Promise.reject(new Error('aussenablage:methode'));
    if (!https(adresse) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(String(adresse))) return Promise.reject(new Error('aussenablage:adresse'));
    var grund = pruefen(form, koerper);
    if (grund) return Promise.reject(new Error('aussenablage:' + grund));
    var o = { method: methode, headers: kopf || {} };
    if (koerper !== undefined && koerper !== null) o.body = koerper;
    return Promise.resolve(senden(adresse, o));
  }

  return { schreiben: schreiben, pruefen: pruefen, METHODEN: METHODEN };
});
