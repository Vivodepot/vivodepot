'use strict';
/* Pod-Brücke — Access Request und Access Grant nach dem LWS-Entwurf (Linked Web Storage Protocol 1.0, W3C Working Draft
   15.10.2026, Abschnitt 11; https://www.w3.org/TR/2026/WD-lws10-core-20261015/).

   Der Entwurf in Kürze: Ein Request oder Grant hat `type`, `storage` (URI), optional `inbox` und `access` (mindestens eine
   `AccessPolicy` nach dem ODRL-Profil `https://www.w3.org/ns/lws#AccessProfile` mit `action`, `assignee`, optional `target` und
   `constraint`). JSON-LD mit `@context` `https://www.w3.org/ns/lws/v1`, weitere Kontexte für Erweiterungen erlaubt, Medientyp
   `application/lws+json`. Der Speicher kündigt `AccessRequestService`/`AccessGrantService` in seiner Storage Description an.
   Der Entwurf kann sich ändern; diese Datei bildet ihn ab, sie ist kein Validator.

   ERWEITERUNG (Vivodepot): `vd:felder` (IRIs des Feldregisters) und `vd:pflicht` je Feld. Die Rechtsgrundlage steht als
   `dpv:hasLegalBasis` mit der IRI, die die Stelle aus dem Vokabular ihres Rechtsraums nennt (für die DSGVO etwa
   `https://w3id.org/dpv/legal/eu/gdpr#A6-1-c`). Die Brücke nimmt kein Recht an und prüft keine Rechtsgrundlage.

   NIE IM GRANT: kein Schlüssel, kein Passwort, kein Code. Der Grant ist ein Protokolleintrag und geht an die Stelle; der
   Schlüssel erreicht sie auf einem anderen Weg (Einmalpasswort außerhalb des Pods). */

(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.vdPodLws = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  var LWS_KONTEXT = 'https://www.w3.org/ns/lws/v1';
  var PROFIL = 'https://www.w3.org/ns/lws#AccessProfile';
  var VD_KONTEXT = { vd: 'https://register.vivodepot.de/ns#', dpv: 'https://w3id.org/dpv#',
    'vd:felder': { '@type': '@id', '@container': '@set' }, 'dpv:hasLegalBasis': { '@type': '@id' } };
  var FELD = 'https://register.vivodepot.de/feld/';
  var VERBOTEN = /(^|[^a-z])(key|schluessel|schlüssel|passwor[dt]|passcode|secret|geheim|code|k)$/i;
  var ACTIONS = ['read', 'modify', 'create', 'delete'];

  function iri(s) {
    try { var u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : null; } catch (_) { return null; }
  }
  function kennungsIri(k) { return /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$/.test(k) ? FELD + k : null; }

  /* Studio-Anfrage (vivodepot-anfrage@1) → Access Request. Ohne WebID der Stelle kein Hauptweg (dann SHL). */
  function requestAusAnfrage(a) {
    if (!a || typeof a !== 'object') return { fehler: 'keine-anfrage' };
    var stelle = iri(a.webid || '');
    if (!stelle) return { fehler: 'keine-webid-der-stelle' };
    var felder = [], pflicht = [];
    (a.felder || []).forEach(function (f) {
      var i = kennungsIri(f && f.kennung); if (!i) return;
      felder.push(i); if (f.pflicht) pflicht.push(i);
    });
    if (!felder.length) return { fehler: 'keine-felder' };
    var constraint = [];
    var zweck = iri(a.zweckIri || '');
    if (zweck) constraint.push({ leftOperand: 'purpose', operator: 'eq', rightOperand: zweck });
    if (a.gueltigBis) {
      var d = new Date(a.gueltigBis); if (isNaN(d)) return { fehler: 'frist-unlesbar' };
      constraint.push({ leftOperand: 'dateTime', operator: 'lteq', rightOperand: d.toISOString() });
    }
    var policy = { type: 'AccessPolicy', action: ['read'], assignee: stelle };
    if (constraint.length) policy.constraint = constraint;
    var r = { '@context': [LWS_KONTEXT, VD_KONTEXT], type: 'AccessRequest', access: [policy], 'vd:felder': felder };
    if (pflicht.length) r['vd:pflicht'] = pflicht;
    var grundlage = iri(a.grundlageIri || '');
    if (grundlage) r['dpv:hasLegalBasis'] = grundlage;
    if (iri(a.antwortAn || '')) r.inbox = iri(a.antwortAn);
    if (a.zweck) r['vd:zweckText'] = String(a.zweck);
    if (a.grundlage) r['vd:grundlageText'] = String(a.grundlage);
    return { request: r };
  }

  /* Freigabe der Person → Access Grant für genau eine Ressource. */
  function grantBauen(o) {
    var policy = { type: 'AccessPolicy', action: ['read'], assignee: o.stelle,
      target: { type: 'DataResource', value: o.adresse } };
    var c = [];
    if (o.zweck) c.push({ leftOperand: 'purpose', operator: 'eq', rightOperand: o.zweck });
    if (o.bis) c.push({ leftOperand: 'dateTime', operator: 'lteq', rightOperand: new Date(o.bis).toISOString() });
    if (c.length) policy.constraint = c;
    var g = { '@context': [LWS_KONTEXT, VD_KONTEXT], type: 'AccessGrant', storage: o.storage, access: [policy] };
    if (o.inbox) g.inbox = o.inbox;
    return g;
  }

  function schluesselFelder(x, pfad, funde) {
    if (x && typeof x === 'object') {
      Object.keys(x).forEach(function (k) {
        if (VERBOTEN.test(k)) funde.push(pfad + k);
        schluesselFelder(x[k], pfad + k + '.', funde);
      });
    }
    return funde;
  }

  /* Pflichtfelder nach 11.2/11.3 und das Verbot von Schlüsselfeldern. Rückgabe: Liste der Fehler, leer = gut. */
  function pruefen(obj, art) {
    var f = [];
    if (!obj || typeof obj !== 'object') return ['kein-objekt'];
    var ctx = [].concat(obj['@context'] || []);
    if (ctx.indexOf(LWS_KONTEXT) < 0) f.push('context');
    if ([].concat(obj.type || []).indexOf(art) < 0) f.push('type');
    if (art === 'AccessGrant' && !iri(obj.storage || '')) f.push('storage');
    if (obj.inbox !== undefined && !iri(obj.inbox)) f.push('inbox');
    var acc = [].concat(obj.access || []);
    if (!acc.length) f.push('access');
    acc.forEach(function (p, i) {
      if (!p || [].concat(p.type || []).indexOf('AccessPolicy') < 0) f.push('access.' + i + '.type');
      var act = [].concat((p && p.action) || []);
      if (!act.length || act.some(function (a) { return ACTIONS.indexOf(a) < 0; })) f.push('access.' + i + '.action');
      if (!p || !iri(p.assignee || '')) f.push('access.' + i + '.assignee');
      if (art === 'AccessGrant' && !(p && p.target && iri(p.target.value || ''))) f.push('access.' + i + '.target');
    });
    schluesselFelder(obj, '', []).forEach(function (k) { f.push('schluesselfeld:' + k); });
    return f;
  }

  /* Storage Description (JSON-LD) → Adresse des AccessGrantService, sonst null. */
  function grantDienst(beschreibung) {
    var dienste = [].concat((beschreibung && (beschreibung.service || beschreibung.services)) || []);
    for (var i = 0; i < dienste.length; i++) {
      var d = dienste[i];
      if ([].concat(d.type || []).indexOf('AccessGrantService') >= 0 && iri(d.id || d['@id'] || d.endpoint || '')) return iri(d.id || d['@id'] || d.endpoint);
    }
    return null;
  }

  return { requestAusAnfrage: requestAusAnfrage, grantBauen: grantBauen, pruefen: pruefen, grantDienst: grantDienst,
    LWS_KONTEXT: LWS_KONTEXT, PROFIL: PROFIL, MEDIENTYP: 'application/lws+json' };
});
