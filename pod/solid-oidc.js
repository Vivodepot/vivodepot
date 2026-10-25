'use strict';
/* Pod-Brücke — Anmeldung am Pod mit Solid-OIDC (U2-ADR-512, Punkt 7).

   WARUM EIN EIGENER CLIENT: Die verbreitete Bibliothek @inrupt/solid-client-authn-browser 5.0.1 erzeugt den DPoP-Schlüssel
   fest als exportierbar (solid-client-authn-core, dist/index.mjs, generateDpopKeyPair: generateKeyPair(…, { extractable:
   true })). Hier ist der private Schlüssel ein CryptoKey mit extractable: false. Ein Skript in der Brücke kann ihn benutzen,
   aber nicht herausziehen; ohne ihn ist ein abgeflossenes Zugangs-Token wertlos, weil der Pod es an diesen Schlüssel bindet
   (Probe am lokalen Pod). Jede Anmeldung erzeugt einen neuen Schlüssel.

   WAS HIER NIE STEHT: kein Passwort des Depots, kein Schlüssel des Depots, keine Ableitung daraus. Dieser Schlüssel entschlüsselt
   nichts; er beweist dem Pod nur, wer ablegt und löscht.

   ABLAUF (OAuth 2.0 Autorisierungscode mit PKCE S256, OpenID Connect, DPoP nach RFC 9449, Solid-OIDC):
     1. Discovery am Aussteller; dessen `issuer` muss genau der angefragte sein.
     2. Dynamische Registrierung (öffentlicher Client, Rücksprung = genau diese Seite).
     3. Weiterleitung zur Anmeldung mit state, nonce, code_challenge (nur S256).
     4. Rücksprung: state und, wenn der Aussteller es ankündigt, `iss` (RFC 9207) werden geprüft; Code gegen Tokens mit DPoP.
     5. id_token: Signatur gegen die Schlüssel des Ausstellers, iss, aud, nonce, exp; daraus die WebID.
   Das Zugangs-Token geht nur an den Speicher der Person oder an eine Adresse, die sie selbst eingegeben hat.
   KEIN ERNEUERUNGS-TOKEN: Die Brücke fragt nicht nach offline_access und registriert nur authorization_code. Schickt ein
   Aussteller trotzdem eines, wird es verworfen. Zugangs-Token und Sitzung liegen nur im Speicher; die Sitzung endet mit der
   Seite, danach meldet sich die Person neu an.
   Was den Rücksprung überdauern muss: state, nonce und code_verifier in sessionStorage dieses Tabs (beim Rücksprung sofort
   gelöscht, vor jeder Prüfung); der DPoP-Schlüssel (nicht serialisierbar außer als CryptoKey) und die Registrierung des
   öffentlichen Clients in der IndexedDB dieser Herkunft. Nie localStorage, nie Cookies. Abmelden löscht alles. */

(function (wurzel) {
  var DB = 'vd-pod-bruecke';
  var ABLAGE = 'kv';
  var zugang = null;   // { token, ablauf } nur im Speicher
  var aktuell = null;  // { aussteller, webid, speicher } nur im Speicher; endet mit der Seite
  var PKCE = 'vd-pod-pkce';

  // ── IndexedDB ────────────────────────────────────────────────────────────────────────────────────────────────────────
  function db() {
    return new Promise(function (ja, nein) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(ABLAGE); };
      r.onsuccess = function () { ja(r.result); };
      r.onerror = function () { nein(r.error); };
    });
  }
  function kv(modus, fn) {
    return db().then(function (d) {
      return new Promise(function (ja, nein) {
        var tx = d.transaction(ABLAGE, modus);
        var erg = fn(tx.objectStore(ABLAGE));
        tx.oncomplete = function () { d.close(); ja(erg && 'result' in erg ? erg.result : undefined); };
        tx.onerror = function () { d.close(); nein(tx.error); };
      });
    });
  }
  function lesen(k) { return kv('readonly', function (s) { return s.get(k); }); }
  function schreiben(k, v) { return kv('readwrite', function (s) { s.put(v, k); }); }
  function loeschen(k) { return kv('readwrite', function (s) { s.delete(k); }); }

  // ── Bytes ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  var enc = new TextEncoder();
  function b64u(bytes) {
    var s = ''; var a = new Uint8Array(bytes);
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64uText(t) { return b64u(enc.encode(t)); }
  function b64uLesen(s) {
    var b = s.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    var bin = atob(b); var a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  function zufall(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return b64u(a); }
  function sha256(t) { return crypto.subtle.digest('SHA-256', enc.encode(t)); }

  // ── DPoP ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  function dpopSchluessel() {
    return lesen('dpop').then(function (paar) { if (!paar) throw new Error('kein-dpop-schluessel'); return paar; });
  }
  function dpopNeu() {
    return crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
      .then(function (neu) { return schreiben('dpop', neu).then(function () { return neu; }); });
  }
  var dpopNonce = {};   // je Herkunft die zuletzt verlangte DPoP-Nonce (RFC 9449 §8, §9)
  function dpopBeweis(methode, adresse, token) {
    return dpopSchluessel().then(function (paar) {
      return crypto.subtle.exportKey('jwk', paar.publicKey).then(function (jwk) {
        var kopf = { typ: 'dpop+jwt', alg: 'ES256', jwk: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y } };
        var u = new URL(adresse); u.search = ''; u.hash = '';
        var last = { jti: zufall(16), htm: methode, htu: u.href, iat: Math.floor(Date.now() / 1000) };
        if (dpopNonce[u.origin]) last.nonce = dpopNonce[u.origin];
        var ath = token ? sha256(token).then(function (h) { last.ath = b64u(h); }) : Promise.resolve();
        return ath.then(function () {
          var eingabe = b64uText(JSON.stringify(kopf)) + '.' + b64uText(JSON.stringify(last));
          return crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, paar.privateKey, enc.encode(eingabe))
            .then(function (sig) { return eingabe + '.' + b64u(sig); });
        });
      });
    });
  }

  // ── Aussteller ──────────────────────────────────────────────────────────────────────────────────────────────────────
  /* http nur für den lokalen Pod einer Probe, und nur, wenn die Probe den Schalter vor dem Laden setzt. */
  function sichereAdresse(u) {
    return u.protocol === 'https:' || (self.VD_POD_SPIKE === true && u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost'));
  }
  function ausstellerNormal(a) {
    var u = new URL(a);
    if (!sichereAdresse(u)) throw new Error('aussteller-nicht-https');
    u.search = ''; u.hash = '';
    return u.href.replace(/\/?$/, '/');
  }
  function discovery(aussteller) {
    return fetch(aussteller + '.well-known/openid-configuration', { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('discovery-' + r.status); return r.json(); })
      .then(function (k) {
        if (k.issuer !== aussteller && k.issuer + '/' !== aussteller) throw new Error('aussteller-abweichend');
        var m = k.code_challenge_methods_supported;
        if (Array.isArray(m) && m.indexOf('S256') < 0) throw new Error('pkce-s256-fehlt');
        // Code und code_verifier gehen an den token_endpoint: jeder genannte Endpunkt muss so sicher sein wie der Aussteller.
        ['authorization_endpoint', 'token_endpoint', 'jwks_uri', 'registration_endpoint'].forEach(function (f) {
          if (k[f] !== undefined && !sichereAdresse(new URL(k[f]))) throw new Error('endpunkt-nicht-https:' + f);
        });
        return k;
      });
  }
  function rueckspung() { return location.origin + location.pathname; }

  function registrieren(konf) {
    return lesen('client').then(function (c) {
      if (c && c.aussteller === konf.issuer && c.rueckspung === rueckspung()) return c;
      if (!konf.registration_endpoint) throw new Error('keine-registrierung');
      return fetch(konf.registration_endpoint, {
        method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Vivodepot Pod-Brücke', application_type: 'web', redirect_uris: [rueckspung()],
          grant_types: ['authorization_code'], response_types: ['code'],
          token_endpoint_auth_method: 'none', id_token_signed_response_alg: 'ES256', dpop_bound_access_tokens: true
        })
      }).then(function (r) { if (!r.ok) throw new Error('registrierung-' + r.status); return r.json(); })
        .then(function (j) {
          var neu = { aussteller: konf.issuer, rueckspung: rueckspung(), client_id: j.client_id };
          return schreiben('client', neu).then(function () { return neu; });
        });
    });
  }

  /* Schritt 1–3. Verlässt die Seite. */
  function anmelden(ausstellerEingabe) {
    var aussteller = ausstellerNormal(ausstellerEingabe);
    return discovery(aussteller).then(function (konf) {
      return Promise.all([registrieren(konf), dpopNeu()]).then(function (e) {
        var client = e[0]; var verifier = zufall(32); var state = zufall(16); var nonce = zufall(16);
        return sha256(verifier).then(function (h) {
          sessionStorage.setItem(PKCE, JSON.stringify({ verifier: verifier, state: state, nonce: nonce, aussteller: konf.issuer }));
          return Promise.resolve().then(function () {
            var u = new URL(konf.authorization_endpoint);
            u.search = new URLSearchParams({
              response_type: 'code', client_id: client.client_id, redirect_uri: rueckspung(),
              scope: 'openid webid', state: state, nonce: nonce,
              code_challenge: b64u(h), code_challenge_method: 'S256', prompt: 'consent'
            }).toString();
            location.assign(u.href);
          });
        });
      });
    });
  }

  function nonceMerken(adresse, r) {
    var n = r.headers.get('DPoP-Nonce'); if (!n) return false;
    var o = new URL(adresse).origin; var neu = dpopNonce[o] !== n; dpopNonce[o] = n; return neu;
  }
  function tokenAnfrage(konf, felder, zweiter) {
    return dpopBeweis('POST', konf.token_endpoint).then(function (beweis) {
      return fetch(konf.token_endpoint, {
        method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', DPoP: beweis },
        body: new URLSearchParams(felder).toString()
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok && j.error === 'use_dpop_nonce' && nonceMerken(konf.token_endpoint, r) && !zweiter) return tokenAnfrage(konf, felder, true);
        nonceMerken(konf.token_endpoint, r);
        if (!r.ok) throw new Error('token-' + r.status + (j.error ? '-' + j.error : ''));
        if (String(j.token_type).toLowerCase() !== 'dpop') throw new Error('token-nicht-dpop');
        return j;
      });
    });
  }

  function idTokenPruefen(konf, idToken, clientId, nonce) {
    var teile = String(idToken).split('.');
    if (teile.length !== 3) return Promise.reject(new Error('id-token-form'));
    var kopf = JSON.parse(new TextDecoder().decode(b64uLesen(teile[0])));
    var last = JSON.parse(new TextDecoder().decode(b64uLesen(teile[1])));
    var jetzt = Math.floor(Date.now() / 1000);
    if (last.iss !== konf.issuer) return Promise.reject(new Error('id-token-iss'));
    var aud = Array.isArray(last.aud) ? last.aud : [last.aud];
    if (aud.indexOf(clientId) < 0) return Promise.reject(new Error('id-token-aud'));
    if ((aud.length > 1 || last.azp !== undefined) && last.azp !== clientId) return Promise.reject(new Error('id-token-azp'));   // OIDC Core 3.1.3.7 Nr. 4 und 5
    if (!(typeof last.iat === 'number' && last.iat <= jetzt + 60 && last.iat > jetzt - 600)) return Promise.reject(new Error('id-token-iat'));
    if (last.nonce !== nonce) return Promise.reject(new Error('id-token-nonce'));
    if (!(last.exp > jetzt)) return Promise.reject(new Error('id-token-abgelaufen'));
    if (typeof last.webid !== 'string') return Promise.reject(new Error('id-token-webid'));
    var verfahren = { ES256: { imp: { name: 'ECDSA', namedCurve: 'P-256' }, sig: { name: 'ECDSA', hash: 'SHA-256' } },
      RS256: { imp: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, sig: { name: 'RSASSA-PKCS1-v1_5' } } }[kopf.alg];
    if (!verfahren) return Promise.reject(new Error('id-token-alg'));
    return fetch(konf.jwks_uri, { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (jwks) {
      var kty = kopf.alg === 'ES256' ? 'EC' : 'RSA';
      var passend = (jwks.keys || []).filter(function (x) {
        return x.kty === kty && (!x.alg || x.alg === kopf.alg) && (!x.use || x.use === 'sig') && (kopf.kid ? x.kid === kopf.kid : true);
      });
      if (passend.length !== 1) throw new Error('id-token-kein-eindeutiger-schluessel');
      var k = passend[0];
      return crypto.subtle.importKey('jwk', k, verfahren.imp, false, ['verify']);
    }).then(function (pub) {
      return crypto.subtle.verify(verfahren.sig, pub, b64uLesen(teile[2]), enc.encode(teile[0] + '.' + teile[1]));
    }).then(function (ok) {
      if (!ok) throw new Error('id-token-signatur');
      return ausstellerImProfil(last.webid, konf.issuer).then(function () { return last.webid; });
    });
  }

  /* Solid-OIDC: Das WebID-Profil muss den Aussteller als solid:oidcIssuer nennen. Sonst könnte ein beliebiger Aussteller die
     WebID eines anderen behaupten, und die Brücke setzte Zugriffsregeln auf diese WebID. Gelesen wird das Profil ohne
     Anmeldung; verglichen wird mit und ohne abschließenden Schrägstrich. */
  function ausstellerImProfil(webid, aussteller) {
    var u = new URL(webid); if (!sichereAdresse(u)) return Promise.reject(new Error('webid-form'));
    var dok = u.href.split('#')[0];
    return fetch(dok, { credentials: 'omit', headers: { Accept: 'text/turtle' } }).then(function (r) {
      if (!r.ok) throw new Error('webid-profil-' + r.status); return r.text();
    }).then(function (t) {
      if (ausstellerDerWebid(t).indexOf(aussteller.replace(/\/$/, '')) < 0) throw new Error('webid-aussteller-nicht-im-profil');
    });
  }

  /* Turtle ohne Parser, aber nicht als bloße Textsuche: Kommentare und Literale fallen vorher weg (sonst gälte ein Satz in einer
     Beschreibung als Angabe), `solid:` gilt nur, wenn das Profil das Präfix auf den Solid-Namensraum setzt, und eine Objektliste
     `<a>, <b>` liefert jeden Aussteller. Grenze: andere Präfixnamen und JSON-LD erkennt das nicht; es scheitert geschlossen. */
  function turtleOhneKommentarUndLiteral(t) {
    var aus = ''; var i = 0;
    while (i < t.length) {
      var c = t[i];
      if (c === '<') { var e = t.indexOf('>', i); if (e < 0) break; aus += t.slice(i, e + 1); i = e + 1; continue; }
      if (c === '"' || c === "'") {
        var lang = t.substr(i, 3) === c + c + c; var ende = lang ? c + c + c : c; var j = i + ende.length;
        while (j < t.length && t.substr(j, ende.length) !== ende) j += t[j] === '\\' ? 2 : 1;
        aus += ' ""'; i = j + ende.length; continue;
      }
      if (c === '#') { while (i < t.length && t[i] !== '\n') i++; continue; }
      aus += c; i++;
    }
    return aus;
  }
  function ausstellerDerWebid(text) {
    var t = turtleOhneKommentarUndLiteral(text);
    var praedikat = '<http://www\\.w3\\.org/ns/solid/terms#oidcIssuer>';
    if (/(?:@prefix|PREFIX)\s+solid:\s*<http:\/\/www\.w3\.org\/ns\/solid\/terms#>/i.test(t)) praedikat = '(?:solid:oidcIssuer|' + praedikat + ')';
    var funde = [];
    var re = new RegExp(praedikat + '\\s+(<[^>]*>(?:\\s*,\\s*<[^>]*>)*)', 'g'); var m;
    while ((m = re.exec(t))) m[1].replace(/<([^>]*)>/g, function (_, iri) { funde.push(iri.replace(/\/$/, '')); });
    return funde;
  }

  /* Schritt 4–5. Läuft beim Laden der Seite; tut nichts, wenn kein Rücksprung vorliegt. */
  function ruecksprungVerarbeiten() {
    var q = new URLSearchParams(location.search);
    if (!q.has('code') && !q.has('error')) return Promise.resolve(null);
    history.replaceState(null, '', rueckspung());
    var roh = sessionStorage.getItem(PKCE); sessionStorage.removeItem(PKCE);   // einmal benutzbar, auch wenn danach etwas scheitert
    return Promise.resolve(roh ? JSON.parse(roh) : null).then(function (p) {
      return Promise.resolve().then(function () {
        if (!p) throw new Error('kein-anmeldevorgang');
        if (q.get('state') !== p.state) throw new Error('state-abweichend');
        if (q.has('error')) throw new Error('anmeldung-' + q.get('error'));
        return Promise.all([discovery(ausstellerNormal(p.aussteller)), lesen('client')]).then(function (e) {   // issuer kann ohne / stehen
          var konf = e[0]; var client = e[1];
          // RFC 9207: Kündigt der Aussteller `iss` an, muss er dabeistehen und stimmen; steht er ungefragt da, muss er auch stimmen.
          if (konf.authorization_response_iss_parameter_supported === true && q.get('iss') !== konf.issuer) throw new Error('iss-abweichend');
          if (q.has('iss') && q.get('iss') !== konf.issuer) throw new Error('iss-abweichend');
          return tokenAnfrage(konf, {
            grant_type: 'authorization_code', code: q.get('code'), redirect_uri: rueckspung(),
            client_id: client.client_id, code_verifier: p.verifier
          }).then(function (t) {
            return idTokenPruefen(konf, t.id_token, client.client_id, p.nonce).then(function (webid) {
              zugang = { token: t.access_token, ablauf: Date.now() + 1000 * (t.expires_in || 300) };
              aktuell = { aussteller: konf.issuer, webid: webid };   // ein ungefragtes t.refresh_token wird nicht übernommen
              return webid;
            });
          });
        });
      });
    });
  }

  function sitzung() { return Promise.resolve(aktuell); }

  /* Der Speicher der Person: einmal nach der Anmeldung gesetzt, aus ihrem öffentlichen Profil. Das Zugangs-Token geht nur an
     Adressen unter dieser Herkunft, nie an eine Adresse, die aus fremdem Text kommt (Profil, Link-Kopf). */
  function speicherSetzen(adresse) {
    var u = new URL(adresse); if (!sichereAdresse(u)) return Promise.reject(new Error('speicher-nicht-https'));
    return sitzung().then(function (s) { if (!s) throw new Error('nicht-angemeldet'); s.speicher = u.origin; });
  }

  /* Anfrage an den Pod mit DPoP-gebundenem Zugangs-Token. */
  function podFetch(adresse, optionen) {
    var o = optionen || {}; var methode = (o.method || 'GET').toUpperCase();
    var ziel;
    try { ziel = new URL(adresse); } catch (_) { return Promise.reject(new Error('adresse-form')); }
    return sitzung().then(function (s) {
      if (!s || !s.speicher) throw new Error('kein-speicher');
      if (!sichereAdresse(ziel)) throw new Error('fremde-herkunft');
      // Eine andere Herkunft nur lesend und nur, wenn die angemeldete Person die Adresse selbst eingegeben hat: eine Stelle holt
      // mit IHRER Anmeldung aus dem Pod einer Person ab (Hauptweg, Solid-Abruf). Der Beweis gilt nur für genau diese Adresse.
      if (ziel.origin !== s.speicher && !(o.vonDerPersonEingegeben === true && methode === 'GET')) throw new Error('fremde-herkunft');
      // Ohne Erneuerungs-Token gibt es nach dem Ablauf nur die neue Anmeldung.
      if (!(zugang && zugang.ablauf - 30000 > Date.now())) throw new Error('neu-anmelden');
    }).then(function () {
      var token = zugang.token;   // dasselbe Token für Beweis (ath) und Kopfzeile
      return dpopBeweis(methode, adresse, token).then(function (beweis) { return { token: token, beweis: beweis }; });
    }).then(function (b) {
      var kopf = new Headers(o.headers || {});
      kopf.set('Authorization', 'DPoP ' + b.token); kopf.set('DPoP', b.beweis);
      return fetch(adresse, { method: methode, headers: kopf, body: o.body, credentials: 'omit', redirect: 'error' });   // nie mit dem Token einer Weiterleitung folgen
    }).then(function (r) {
      var w = r.headers.get('WWW-Authenticate') || '';
      if (r.status === 401 && /use_dpop_nonce/.test(w) && nonceMerken(adresse, r) && !o._zweiter) {
        return podFetch(adresse, Object.assign({}, o, { _zweiter: true }));
      }
      return r;
    });
  }

  /* Abmelden vergisst das Zugangs-Token und löscht alles lokal: Schlüssel, Registrierung, offenen Anmeldevorgang. Ein
     Erneuerungs-Token, das zurückzuziehen wäre, gibt es nicht; das Zugangs-Token läuft beim Pod nach expires_in ab und ist
     ohne den gelöschten Schlüssel nicht mehr nutzbar. */
  function abmelden() {
    zugang = null; aktuell = null;
    sessionStorage.removeItem(PKCE);
    return Promise.all(['dpop', 'client'].map(loeschen)).then(function () { return 'lokal-geloescht'; });
  }

  wurzel.vdPodAnmeldung = {
    anmelden: anmelden, ruecksprungVerarbeiten: ruecksprungVerarbeiten, sitzung: sitzung,
    podFetch: podFetch, speicherSetzen: speicherSetzen, abmelden: abmelden,
    // nur für die Probe: das Zugangs-Token als abgelaufen setzen
    _probe: self.VD_POD_SPIKE === true ? { zugangAblaufen: function () { if (zugang) zugang.ablauf = 0; } } : undefined,
    // Die Brücke braucht nur ihr Verzeichnis; Schlüssel und Registrierung sind von außen nur unter dem Probenschalter erreichbar.
    verzeichnis: {
      lesen: function () { return lesen('verzeichnis'); },
      schreiben: function (v) { return schreiben('verzeichnis', v); },
      loeschen: function () { return loeschen('verzeichnis'); }
    },
    _ablage: self.VD_POD_SPIKE === true ? { lesen: lesen, schreiben: schreiben, loeschen: loeschen } : undefined
  };
})(self);
