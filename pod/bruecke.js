'use strict';
/* Pod-Brücke, Stufe 1 (Datei) — U2-ADR-512; Stufe 2 (Übergabe aus der Anwendung) — Nachtrag zu U2-ADR-512.

   Diese Seite ist nicht Teil der Anwendung. vivodepot.html und vivodepot-lesen.html behalten connect-src 'none'; die einzige
   Verbindung zum Pod läuft hier. Die Person wählt eine Datei, die der Kern verschlüsselt gespeichert hat; was die Tür in
   chiffrat-pruefen.js nicht als Chiffrat erkennt, verlässt das Gerät nicht.

   Drei Arten der Ablage (U2-ADR-512, Punkt 5):
   - `stelle`  Hauptweg: lesbar nur für die WebID einer Stelle (WAC acl:agent), mit Ablauf
   - `link`    Zusatzweg SHL: die Ressource ist ohne Anmeldung lesbar, ihr Container nie; Pfad mit 128 Bit Zufall
   - `eigen`   eigene Sicherung: lesbar nur für die Person
   Ablauf und Rücknahme setzt die Brücke selbst durch; ein Pod löscht nichts von selbst. Rücknahme gilt für künftige Abrufe.

   ZIEL BESTÄTIGEN: Wohin abgelegt wird, kommt aus dem öffentlichen Profil der Person (pim:storage), also aus fremdem Text.
   Bevor die Brücke dort irgendetwas schreibt oder löscht, sieht die Person die Adresse und bestätigt sie; ohne Bestätigung
   lehnt ablegen() ab. Die Bestätigung gilt für diese Seite und diese Adresse, nicht über das Schließen hinaus.

   STUFE 2 (Nachtrag zu U2-ADR-512): Die Anwendung öffnet diese Seite und schickt per postMessage genau die Bytes, die sie sonst
   als Datei ausgibt. Angenommen wird nur vom Fenster, das diese Seite geöffnet hat; die Tür prüft je Art wie beim Datei-Weg.
   Abgelegt wird erst nach dem Klick der Person, ein Auftrag je Klick. Zurück gehen an genau dieses Fenster die Adresse und,
   während des Auftrags, die Bitten um das verschlüsselte Verzeichnis (U2-ADR-520).

   EIN SCHREIBWEG (U2-ADR-520): Jeder Körper, der das Gerät verlässt, geht durch pod/aussenablage.js (W.schreiben). Die Probe
   tests/aussenablage-einziger-weg.test.js hält, dass hier keine andere Schreibstelle steht. */

(function () {
  var A = self.vdPodAnmeldung;
  var C = self.vdPodChiffrat;
  var L = self.vdPodLws;
  var W = self.vdAussenablage;
  /* Neutrale Ordner (U2-ADR-520 Nr. 3): Am Pfad liest der Anbieter weder Art noch Stelle. Alle drei Arten liegen im selben Ordner;
     Verzeichnis und Ablaufliste in einem zweiten. ORDNER_ALT nennt die sprechenden Ordner früherer Fassungen: Dort schreibt die
     Brücke nichts mehr, Ablagen von dort nimmt sie aber weiter zurück. */
  var ORDNER = { stelle: 'vivodepot/d/', link: 'vivodepot/d/', eigen: 'vivodepot/d/', intern: 'vivodepot/k/' };
  var ORDNER_ALT = { stelle: 'vivodepot/freigaben/', link: 'vivodepot/links/', eigen: 'vivodepot/sicherungen/' };
  var $ = function (id) { return document.getElementById(id); };
  var zielBestaetigt = null;   // { webid, wurzel } nach dem Klick der Person; nur im Speicher
  var kopie = null;            // { liste, etag } der Kopie des Verzeichnisses, mit dem Kern zuletzt gelesen oder geschrieben; nur im Speicher

  function zeigen(id, text) { var e = $(id); if (e) e.textContent = text || ''; }
  function fehler(text) { zeigen('fehler', text); }

  function pfadZufall() { var a = new Uint8Array(16); crypto.getRandomValues(a); var s = ''; for (var i = 0; i < 16; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

  function iri(s) {
    var u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('webid-form');
    if (/[<>"{}|\\^`\s]/.test(u.href)) throw new Error('webid-form');
    return '<' + u.href + '>';
  }

  /* Speicherort aus dem WebID-Dokument (pim:storage); sonst der Ordner über /profile/. */
  /* Das Profil ist öffentlich: ohne Anmeldung geholt, damit das Token nie an eine Adresse aus fremdem Text geht. */
  function speicherOrt(webid) {
    return fetch(webid.split('#')[0], { credentials: 'omit', headers: { Accept: 'text/turtle' } }).then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/(?:pim:storage|<http:\/\/www\.w3\.org\/ns\/pim\/space#storage>)\s+<([^>]+)>/);
      var ort = m ? new URL(m[1], webid).href : new URL('../', webid.split('#')[0]).href;
      return A.speicherSetzen(ort).then(function () { return ort; });
    });
  }

  function aclAdresse(adresse) {
    return A.podFetch(adresse, { method: 'HEAD' }).then(function (r) {
      var l = r.headers.get('Link') || '';
      var m = l.match(/<([^>]+)>\s*;\s*rel="?acl"?/);
      var acl = m ? new URL(m[1], adresse).href : adresse + '.acl';
      if (new URL(acl).origin !== new URL(adresse).origin) throw new Error('acl-fremde-herkunft');
      return acl;
    });
  }

  /* Jeder Körper, der das Gerät verlässt, geht durch W.schreiben (U2-ADR-520 Nr. 1). Die Methode steht wörtlich im Aufruf. */
  function aclSetzen(adresse, regeln) {
    return aclAdresse(adresse).then(function (acl) {
      return W.schreiben(A.podFetch, 'PUT', acl, 'acl', regeln, { 'Content-Type': 'text/turtle' });
    }).then(function (r) { if (!r.ok) throw new Error('acl-' + r.status); });
  }

  var PRAEFIX = '@prefix acl: <http://www.w3.org/ns/auth/acl#>.\n@prefix foaf: <http://xmlns.com/foaf/0.1/>.\n';
  function regelEigen(webid, ziel, mitVererbung) {
    return '<#eigen> a acl:Authorization; acl:agent ' + iri(webid) + '; acl:accessTo <' + ziel + '>;' +
      (mitVererbung ? ' acl:default <' + ziel + '>;' : '') + ' acl:mode acl:Read, acl:Write, acl:Control.\n';
  }

  /* Container anlegen und auf die Person allein setzen, ohne Vererbung nach außen. */
  function ordnerBereit(wurzel, webid, art) {
    var ziel = new URL(ORDNER[art], wurzel).href;
    return A.podFetch(ziel, { method: 'HEAD' }).then(function (h) {
      if (h.ok) return;
      if (h.status !== 404) throw new Error('ordner-' + h.status);
      return W.schreiben(A.podFetch, 'PUT', ziel, 'container', undefined, { 'Content-Type': 'text/turtle', 'If-None-Match': '*' })
        .then(function (r) { if (!r.ok) throw new Error('ordner-' + r.status); });
    })
      .then(function () { return aclSetzen(ziel, PRAEFIX + regelEigen(webid, ziel, true)); })
      .then(function () { return ziel; });
  }

  /* Storage Description lesen (LWS 11.1); bietet der Speicher einen AccessGrantService an, geht der Grant dorthin. */
  function grantDienstFinden(wurzel) {
    return A.podFetch(wurzel, { method: 'HEAD' }).then(function (r) {
      var l = r.headers.get('Link') || '';
      var m = l.match(/<([^>]+)>\s*;\s*rel="?[^"]*storageDescription"?/);
      if (!m) return null;
      var adr = new URL(m[1], wurzel).href;
      if (new URL(adr).origin !== new URL(wurzel).origin) return null;
      return A.podFetch(adr, { headers: { Accept: L.MEDIENTYP + ', application/ld+json' } })
        .then(function (d) { return d.ok ? d.json().catch(function () { return null; }) : null; })
        .then(function (j) { var u = L.grantDienst(j); return u && new URL(u).origin === new URL(wurzel).origin ? u : null; });
    }).catch(function () { return null; });
  }

  /* Die Benachrichtigung der Stelle geht ohne Anmeldung hinaus und folgt keiner Umleitung. */
  function ohneAnmeldung(adresse, o) { return fetch(adresse, Object.assign({}, o, { credentials: 'omit', redirect: 'error' })); }

  /* Access Grant für eine Freigabe an eine Stelle. Bietet der Speicher einen Grant-Dienst an, geht der Grant dorthin. Ohne Dienst
     gibt die Zugriffsregel den Zugriff (schon gesetzt), und die Brücke legt KEINEN Grant im Pod ab: Er stünde dort im Klartext
     mit Stelle, Adresse und Ablauf (U2-ADR-520 Nr. 3). Was die Brücke zum Zurücknehmen braucht, steht im Verzeichnis. */
  /* Der Körper des Grants, geprüft wie im Schreibweg (Pflichtfelder, https bei Zweck und Posteingang). ablegen() ruft das VOR dem
     PUT der Ressource: sonst läge eine Freigabe im Pod, deren Grant der Schreibweg danach abweist, ohne Verzeichnis, Ablauf und
     Rücknahme (Befund GRANT-PRUEFUNG-NACH-PUT). Wirft bei einem Fehler. */
  function grantKoerper(wurzel, adresse, stelle, bis, zweck, inbox) {
    var g = L.grantBauen({ storage: wurzel, stelle: stelle, adresse: adresse, bis: bis, zweck: zweck || null, inbox: inbox || null });
    var fehler = L.pruefen(g, 'AccessGrant');
    if (fehler.length) throw new Error('grant:' + fehler.join(','));
    var koerper = JSON.stringify(g);
    var grund = W.pruefen('grant', koerper);
    if (grund) throw new Error('aussenablage:' + grund);
    return koerper;
  }

  function grantAnlegen(wurzel, s, adresse, stelle, bis, zweck, inbox) {
    var koerper;
    try { koerper = grantKoerper(wurzel, adresse, stelle, bis, zweck, inbox); } catch (x) { return Promise.reject(x); }
    return grantDienstFinden(wurzel).then(function (dienst) {
      if (dienst) {
        return W.schreiben(A.podFetch, 'POST', dienst, 'grant', koerper, { 'Content-Type': L.MEDIENTYP }).then(function (r) {
          if (!r.ok) throw new Error('grant-dienst-' + r.status);
          return { grant: new URL(r.headers.get('Location'), dienst).href, ueberDienst: true };
        });
      }
      return { grant: null, ueberDienst: false };
    }).then(function (erg) {
      if (!inbox) return erg;
      // Benachrichtigung der Stelle (LWS 11.6): ohne Anmeldung, nur der Grant, nie ein Schlüssel.
      return W.schreiben(ohneAnmeldung, 'POST', inbox, 'grant', koerper, { 'Content-Type': L.MEDIENTYP })
        .then(function (r) { erg.benachrichtigt = r.ok; return erg; }, function () { erg.benachrichtigt = false; return erg; });
    });
  }

  function zielGilt(s, wurzel) { return !!(zielBestaetigt && zielBestaetigt.webid === s.webid && zielBestaetigt.wurzel === wurzel); }

  /* Ein vorgegebener Ablauf steht im Klartext in Ablaufliste und Grant. Er darf nur ein Jahreswechsel sein (01.01., 00:00 UTC,
     also mit Ablauf des 31.12.): Ein Tag, der aus einem Datum des Depots folgt, verriete sonst mehr als das Jahr (Befund
     KIND-ABLAUF-VERRAET-GEBURTSDATUM). Ein Ablauf aus der Zahl der Tage, die die Person hier eingibt, ist davon nicht berührt. */
  function jahreswechsel(ms) {
    if (typeof ms !== 'number' || !isFinite(ms)) return false;
    var d = new Date(ms);
    return d.getUTCMonth() === 0 && d.getUTCDate() === 1 && ms % 86400000 === 0;
  }

  function ablegen(text, art, stelleWebid, tage, zusatz) {
    var befund = C.pruefen(text);
    if (befund.fehler) return Promise.reject(new Error('nicht-chiffrat:' + befund.fehler));
    if (art === 'link' && befund.art !== 'shl') return Promise.reject(new Error('link-nur-fuer-shl'));
    if (art === 'eigen' && befund.art !== 'depot') return Promise.reject(new Error('eigen-nur-fuer-depot'));
    if (!C.passtZurArt(text, art, new Blob([text]).size)) return Promise.reject(new Error('passt-nicht-zur-art'));
    // Die WebID der Stelle vor jedem Schreiben: sonst läge die Ressource schon im Pod, ohne Regel, Verzeichnis und Ablauf.
    if (art === 'stelle') { try { iri(stelleWebid); } catch (x) { return Promise.reject(new Error('stelle-webid')); } }
    // Ein vorgegebener Ablauf (Kind-Datei: Volljährigkeit plus Frist) liegt in der Zukunft: sonst legte die Brücke ab, und der
    // nächste Abgleich nähme die Ablage sofort wieder zurück.
    var zb = zusatz && zusatz.bis;
    if (zb != null && (art !== 'stelle' || typeof zb !== 'number' || !isFinite(zb) || zb <= Date.now())) return Promise.reject(new Error('ablauf-vergangen'));
    if (zb != null && !jahreswechsel(zb)) return Promise.reject(new Error('ablauf-jahresende'));
    return A.sitzung().then(function (s) {
      if (!s) throw new Error('nicht-angemeldet');
      var wurzel = null, adresse = null;
      var z = zusatz || {};
      var bis = z.bis != null ? z.bis : (tage ? Date.now() + tage * 86400000 : null);
      return speicherOrt(s.webid).then(function (w) {
        wurzel = w;
        if (!zielGilt(s, wurzel)) throw new Error('ziel-nicht-bestaetigt');
        adresse = new URL(pfadZufall(), new URL(ORDNER[art], wurzel)).href;
        // Der Grant wird vor jedem Schreiben gebaut und geprüft; weist der Schreibweg ihn ab, kommt nichts in den Pod.
        if (art === 'stelle') grantKoerper(wurzel, adresse, stelleWebid, bis, z.zweck, z.inbox);
        return ordnerBereit(wurzel, s.webid, art);
      }).then(function (ordner) {
        if (adresse.indexOf(ordner) !== 0) throw new Error('ordner-' + art);
        var typ = befund.art === 'depot' ? 'application/octet-stream' : 'application/jose';
        var etag = null;
        return W.schreiben(A.podFetch, 'PUT', adresse, 'chiffrat', text, { 'Content-Type': typ, 'If-None-Match': '*' })
          .then(function (r) { if (!r.ok) throw new Error('ablegen-' + r.status); etag = r.headers.get('ETag'); })
          .then(function () { return nachDemAblegen(adresse); });
        // Scheitert nach dem PUT ein Schritt (Regel, Grant-Dienst, Verzeichnis), nimmt die Brücke die eben angelegte Ablage zurück:
        // sonst läge sie lesbar im Pod, ohne Verzeichnis-Eintrag, Ablauf und Rücknahme (Befund GRANT-POST-WAISE). Gemeldet wird
        // der ursprüngliche Fehler. Scheitert der PUT selbst, gibt es nichts zurückzunehmen; eine fremde Ressource bleibt.
        function nachDemAblegen(adresse) {
          var angelegt = null;   // der Grant beim Dienst, falls schon angelegt: er fällt mit der Ablage
          return Promise.resolve().then(function () {
            // Ohne ETag könnte die Anwendung den Stand nie ersetzen: dann bleibt nichts liegen.
            if (z.mitEtag && !etagGilt(etag)) throw new Error('kind-ohne-etag');
            var regeln = PRAEFIX + regelEigen(s.webid, adresse, false);
            if (art === 'link') regeln += '<#link> a acl:Authorization; acl:agentClass foaf:Agent; acl:accessTo <' + adresse + '>; acl:mode acl:Read.\n';
            if (art === 'stelle') regeln += '<#stelle> a acl:Authorization; acl:agent ' + iri(stelleWebid) + '; acl:accessTo <' + adresse + '>; acl:mode acl:Read.\n';
            return aclSetzen(adresse, regeln);
          })
          .then(function () {
            var grant = art === 'stelle' ? grantAnlegen(wurzel, s, adresse, stelleWebid, bis, z.zweck, z.inbox) : Promise.resolve(null);
            return grant.then(function (g) {
              angelegt = g && g.ueberDienst ? g.grant : null;
              var eintrag = { adresse: adresse, art: art, stelle: art === 'stelle' ? stelleWebid : null, bis: bis, am: Date.now(),
                grant: g ? g.grant : null, ueberDienst: g ? g.ueberDienst : null, benachrichtigt: g ? !!g.benachrichtigt : null };
              return verzeichnisAendern(function (v) { return v.concat([eintrag]); });
            }).then(function () { return z.mitEtag ? { adresse: adresse, etag: etag } : adresse; });
          }).catch(function (e) {
            var weg = function () { throw e; };
            return (angelegt ? loeschen(angelegt).catch(function () {}) : Promise.resolve())
              .then(function () { return loeschen(adresse); }).then(weg, weg);
          });
        }
      });
    });
  }

  /* ── Ersetzen eines eigenen Stands an derselben Adresse (Kind-Datei, U2-ADR-454; Nachtrag zu U2-ADR-512) ────────────────
     Die Kind-Datei ist eine Ablage der Art `stelle` für die WebID des Kindes. Das erste Mal legt ablegen() sie an (Regel, Grant,
     Verzeichnis, Ablaufliste); jedes weitere Sichern ersetzt nur die Bytes an derselben Adresse, damit das Kind sie dort findet.
     Regel, Grant, Verzeichnis und Ablaufliste bleiben, wie sie sind. Bedingungen (je eine Probe in tests/kind-datei-pod-ort.test.js):
     - Die Adresse steht genau so im eigenen Verzeichnis, als gültiger, nicht abgelaufener Eintrag der Art `stelle` im
       Ablageordner des bestätigten Speichers; sonst schreibt die Brücke nichts.
     - Ersetzt wird nur durch eine Depot-Datei, die die Tür für die Art `stelle` annimmt.
     - Geschrieben wird nur mit If-Match auf das ETag, das die Anwendung zuletzt bekam; `*` oder kein ETag weist die Brücke ab.
       412: ein anderer Stand liegt dort, nichts geschrieben (Fehler 'konflikt').
     - Ohne ETag in der Antwort ließe sich nicht weiter ersetzen: Fehler 'kind-ohne-etag'. */
  var ETAG_MUSTER = /^(W\/)?"[\x21\x23-\x7e\x80-\xff]*"$/;
  function etagGilt(etag) { return typeof etag === 'string' && etag.length <= 256 && ETAG_MUSTER.test(etag); }

  function jahreswechselNach(ms) { return Date.UTC(new Date(ms).getUTCFullYear() + 1, 0, 1); }
  function ablaufGilt(ms) { return typeof ms === 'number' && isFinite(ms) && ms > Date.now() && jahreswechsel(ms); }

  /* Nachtrag (Befund KIND-POD-OHNE-ABLAUF): eine Kind-Datei, die ohne Ablauf abgelegt wurde, bekommt ihn mit dem nächsten
     Ersetzen. Bedingungen (07.11.2026, je eine Probe in tests/kind-datei-pod-ort.test.js):
     (a) nur an einem Eintrag ohne Ablauf, und nur ein Jahreswechsel (01.01., 00:00 UTC);
     (b) erst Ablaufliste und neuer Grant mit Ablauf, dann fällt der alte Grant ohne Ablauf; scheitert ein Schritt, bleibt der
         alte Grant stehen, der Fehler geht weiter und die Anwendung erfährt keinen Erfolg;
     (c) zuerst der neue Stand mit If-Match: bei einem Konflikt wird nichts angelegt. */
  function ersetzen(adresse, text, etag, nachtragBis) {
    var befund = C.pruefen(text);
    if (befund.fehler) return Promise.reject(new Error('nicht-chiffrat:' + befund.fehler));
    if (befund.art !== 'depot' || !C.passtZurArt(text, 'stelle', new Blob([text]).size)) return Promise.reject(new Error('ersetzen-nur-depot'));
    if (!etagGilt(etag)) return Promise.reject(new Error('ersetzen-etag'));
    var nachtrag = nachtragBis != null;
    if (nachtrag && !ablaufGilt(nachtragBis)) return Promise.reject(new Error('ablauf-jahresende'));
    return A.sitzung().then(function (s) {
      if (!s) throw new Error('nicht-angemeldet');
      return speicherOrt(s.webid).then(function (wurzel) {
        if (!zielGilt(s, wurzel)) throw new Error('ziel-nicht-bestaetigt');
        return verzeichnis().then(function (v) {
          var e = v.filter(function (x) { return x && x.adresse === adresse; })[0];
          var ablage = new URL(ORDNER.stelle, wurzel).href;
          if (!e || e.art !== 'stelle' || !eintragGilt(e, wurzel) || adresse.indexOf(ablage) !== 0 || (e.bis != null && e.bis <= Date.now())) {
            throw new Error('ersetzen-fremde-adresse');
          }
          // (a) Ein Eintrag mit Jahreswechsel bekommt keinen anderen; einer mit anderem Ablauf (Geburtstag, vor dem Befund
          // KIND-ABLAGE-ALT-BEHAELT-GEBURTSTAG abgelegt) nur den Jahreswechsel direkt danach.
          if (nachtrag && e.bis != null && (jahreswechsel(e.bis) || nachtragBis !== jahreswechselNach(e.bis))) throw new Error('nachtrag-hat-ablauf');
          var erg = null;
          var setzen = function () {   // der Schreibweg „ersetzen“ (Register SCHREIBWEGE)
            return W.schreiben(A.podFetch, 'PUT', adresse, 'chiffrat', text, { 'Content-Type': 'application/octet-stream', 'If-Match': etag })
              .then(function (r) {
                if (r.status === 412) throw new Error('konflikt');
                if (!r.ok) throw new Error('ersetzen-' + r.status);
                var neu = r.headers.get('ETag');
                if (!etagGilt(neu)) throw new Error('kind-ohne-etag');
                erg = { adresse: adresse, etag: neu };
              });
          };
          function nachtragen() { return nachtrag ? ablaufNachtragen(wurzel, s, e, nachtragBis) : null; }
          var schritte = [setzen, nachtragen];   // (c): erst der neue Stand mit If-Match, dann Ablauf und Grant
          return schritte.reduce(function (p, f) { return p.then(f); }, Promise.resolve()).then(function () { return erg; });
        });
      });
    });
  }
  function ablaufNachtragen(wurzel, s, e, bis) {
    var alt = e.ueberDienst ? e.grant : null;
    var neu = null;
    function grantNeu() {
      return grantAnlegen(wurzel, s, e.adresse, e.stelle, bis, null, null).then(function (g) { neu = g; });
    }
    function eintragNeu() {
      var mit = { bis: bis, grant: neu.grant, ueberDienst: neu.ueberDienst, benachrichtigt: !!neu.benachrichtigt };
      return verzeichnisAendern(function (v) {
        // Die Ablaufliste führt den Eintrag noch nicht (sie nimmt nur Ablagen mit Ablauf): dann kommt er hinzu.
        var da = v.some(function (x) { return x && x.adresse === e.adresse; });
        return da ? v.map(function (x) { return x && x.adresse === e.adresse ? Object.assign({}, x, mit) : x; })
          : v.concat([Object.assign({}, e, mit)]);
      }).catch(function (x) {
        var weg = function () { throw x; };
        return (neu.ueberDienst ? loeschen(neu.grant).catch(function () {}) : Promise.resolve()).then(weg, weg);
      });
    }
    function grantAltWeg() { return alt ? loeschen(alt) : null; }
    var schritte = [grantNeu, eintragNeu, grantAltWeg];   // (b): der alte Grant fällt erst nach Ablaufliste und neuem Grant
    return schritte.reduce(function (p, f) { return p.then(f); }, Promise.resolve());
  }

  function verzeichnis() { return A.verzeichnis.lesen().then(function (v) { return v || []; }); }

  /* ── Was im Pod über die Ablagen liegt (U2-ADR-520; ersetzt Nr. 3 des Nachtrags zu U2-ADR-512 vom 29.10.2026) ──────────────
     Das lokale Verzeichnis überdauert weder das Abmelden noch gelöschte Website-Daten noch ein zweites Gerät. Darum liegen unter
     vivodepot/k/, nur für die WebID der Person lesbar (regelEigen mit Vererbung), zwei Dateien:
     - v1.jose, die Kopie des Verzeichnisses, nur als Chiffrat. Die Brücke kennt keinen Schlüssel. Sie bittet den Kern während
       eines Auftrags aus der Anwendung, die Kopie zu öffnen (vd-pod-verzeichnis-oeffnen) oder zu verschließen
       (vd-pod-verzeichnis-schliessen). Ohne Kern (Datei-Weg, nach dem Auftrag, Herkunft 'null') liest und schreibt sie die Kopie
       nicht; bei 'null' ginge die Liste an '*'. Öffnet der Kern die Kopie nicht (anderes Depot, Sub-Kontext), lässt sie sie
       unverändert.
     - a1.json, die Ablaufliste { fassung: 1, ablagen: [{ adresse, bis }] }, nur Ablagen mit Ablauf. Mit ihr löscht die Brücke
       Abgelaufenes auch ohne Kern; den Grant dazu kennt sie erst mit geöffneter Kopie.
     Erst wenn der Ordner samt Regel steht, wird geschrieben (fail-closed). Vor der Bestätigung des Ziels liest und schreibt die Brücke
     dort nichts. Abgleich mit Kern: Was Kopie und lokales Verzeichnis gemeinsam kennen, bleibt; ein Eintrag, den nur eine Seite
     kennt, bleibt, wenn seine Ressource noch besteht (HEAD 200); 404 oder 410 verwirft ihn. Jeder andere Status bricht den Abgleich
     ab, ohne etwas zu schreiben. Geschrieben wird mit If-Match auf das zuletzt gelesene ETag; bei 412 liest die Brücke neu und
     wendet dieselbe Änderung auf den neuen Stand an. */
  var KOPIE_FELDER = ['adresse', 'art', 'stelle', 'bis', 'am', 'grant', 'ueberDienst'];
  var KOPIE_ARTEN = ['stelle', 'link', 'eigen'];
  var KERN_ANTWORT_FELDER = ['typ', 'fassung', 'id', 'nr', 'liste', 'daten', 'fehler'];
  var KERN_WARTEN_MS = 15000;
  function kopieAdresse(wurzel) { return new URL(ORDNER.intern + 'v1.jose', wurzel).href; }
  function ablaufAdresse(wurzel) { return new URL(ORDNER.intern + 'a1.json', wurzel).href; }

  /* Gilt für einen Eintrag aus der Kopie wie aus dem lokalen Verzeichnis: die Brücke löscht später Ressource und Grant, also
     nur unter dem eigenen Speicher, im Ablageordner oder im alten Ordner der Art, ohne Fragment und ohne Abfrage. */
  function adresseGilt(adresse, wurzel, art) {
    try {
      var a = new URL(adresse);
      var ordner = [];
      (art ? [art] : KOPIE_ARTEN).forEach(function (k) { ordner.push(ORDNER[k], ORDNER_ALT[k]); });
      return !a.hash && !a.search && ordner.some(function (o) { return a.href.indexOf(new URL(o, wurzel).href) === 0; });
    } catch (_) { return false; }
  }
  function eintragGilt(e, wurzel) {
    if (!e || typeof e !== 'object' || KOPIE_ARTEN.indexOf(e.art) < 0 || !adresseGilt(e.adresse, wurzel, e.art)) return false;
    try {
      if (e.grant != null) { var g = new URL(e.grant); if (g.hash || g.origin !== new URL(wurzel).origin) return false; }
      if (e.art === 'stelle') iri(e.stelle); else if (e.stelle != null) return false;
    } catch (_) { return false; }
    if (e.bis != null && (typeof e.bis !== 'number' || !isFinite(e.bis))) return false;
    return true;
  }
  function auswahl(e) { var k = {}; KOPIE_FELDER.forEach(function (f) { k[f] = e[f] === undefined ? null : e[f]; }); return k; }

  /* Bitten an den Kern: nur während des Auftrags, an das Fenster und die Herkunft des Auftrags, mit dessen id. */
  var kern = null;        // { id, quelle, herkunft, bis } des laufenden Auftrags aus der Anwendung
  var kopieGesperrt = false;   // der Kern öffnet die Kopie nicht, oder der Abgleich scheiterte: die Kopie bleibt, wie sie ist
  var vorab = null;       // Promise beim Eintreffen des Auftrags: Kopie lesen, Abgelaufenes samt Grant löschen, nichts schreiben
  var abgleich = null;    // Promise des Abgleichs nach „Ablegen“; erst er schreibt die Kopie
  var ausOrdner = [];     // Ablagen aus dem Ablageordner, die das Verzeichnis dieses Browsers nicht kennt (ordnerLesen)
  var bitteNr = 0;
  var bittenOffen = {};
  function kernDa() { return !!(kern && kern.herkunft !== 'null' && Date.now() < kern.bis); }
  function kernVerfuegbar() { return !!zielBestaetigt && kernDa() && !kopieGesperrt; }
  // Geschrieben wird die Kopie erst nach dem Abgleich: sonst ersetzte sie Einträge, die nur dieses Gerät kennt.
  function kopieMoeglich() { return kernVerfuegbar() && kopie !== null; }
  function kopieImPod() { return !!(kopie && kopie.liste !== null); }

  function kernBitte(typ, antwortTyp, zusatz) {
    if (!kernDa()) return Promise.reject(new Error('verzeichnis-ohne-kern'));
    var nr = ++bitteNr;
    return new Promise(function (ja, nein) {
      var uhr = typeof setTimeout === 'function'
        ? setTimeout(function () { delete bittenOffen[nr]; nein(new Error('verzeichnis-keine-antwort')); }, KERN_WARTEN_MS) : null;
      bittenOffen[nr] = { typ: antwortTyp, fertig: function (d) { if (uhr !== null) clearTimeout(uhr); ja(d); } };
      kern.quelle.postMessage(Object.assign({ typ: typ, fassung: 1, id: kern.id, nr: nr }, zusatz), kern.herkunft);
    });
  }
  function kernAntwort(e, d) {
    if (!kern || e.origin !== kern.herkunft || d.fassung !== 1 || d.id !== kern.id) return;
    var b = Object.prototype.hasOwnProperty.call(bittenOffen, d.nr) ? bittenOffen[d.nr] : null;
    if (!b || b.typ !== d.typ || Object.keys(d).some(function (k) { return KERN_ANTWORT_FELDER.indexOf(k) < 0; })) return;
    delete bittenOffen[d.nr];
    b.fertig(d);
  }

  function kopieLesen(wurzel) {
    return A.podFetch(kopieAdresse(wurzel), { headers: { Accept: 'application/jose' } }).then(function (r) {
      if (r.status === 404) return { liste: null, etag: null };
      if (!r.ok) throw new Error('kopie-lesen-' + r.status);
      var etag = r.headers.get('ETag');
      return r.text().then(function (t) {
        if (C.pruefen(t).art !== 'verzeichnis') throw new Error('kopie-form');
        return kernBitte('vd-pod-verzeichnis-oeffnen', 'vd-pod-verzeichnis-offen', { daten: t });
      }).then(function (d) {
        if (d.fehler) throw new Error('verzeichnis-' + d.fehler);
        if (!Array.isArray(d.liste)) throw new Error('verzeichnis-form');
        return { liste: d.liste.filter(function (e) { return eintragGilt(e, wurzel); }).map(auswahl), etag: etag };
      });
    });
  }

  function kopieSchreiben(s, stand, liste) {
    var rein;
    try {
      rein = liste.map(function (e) { if (!eintragGilt(e, s.wurzel)) throw new Error('kopie-eintrag'); return auswahl(e); });
    } catch (x) { return Promise.reject(x); }
    return ordnerBereit(s.wurzel, s.webid, 'intern').then(function () {
      return kernBitte('vd-pod-verzeichnis-schliessen', 'vd-pod-verzeichnis-verschlossen', { liste: rein });
    }).then(function (d) {
      if (d.fehler) throw new Error('verzeichnis-' + d.fehler);
      var kopf = { 'Content-Type': 'application/jose' };
      if (stand.etag) kopf['If-Match'] = stand.etag; else if (stand.liste === null) kopf['If-None-Match'] = '*';
      return W.schreiben(A.podFetch, 'PUT', kopieAdresse(s.wurzel), 'chiffrat', d.daten, kopf);
    }).then(function (r) {
      if (r.status === 412) return null;
      if (!r.ok) throw new Error('kopie-' + r.status);
      return { liste: rein, etag: r.headers.get('ETag') };
    });
  }

  /* Dieselbe Änderung auf die Kopie im Pod; bei 412 neu lesen und noch einmal, höchstens dreimal. */
  function kopieAendern(aendern) {
    var s = zielBestaetigt;
    var versuche = 0;
    function kopieRunde(stand) {
      return kopieSchreiben(s, stand, aendern(stand.liste || [])).then(function (neu) {
        if (neu) { kopie = neu; return neu.liste; }
        if (++versuche >= 3) throw new Error('kopie-konflikt');
        return kopieLesen(s.wurzel).then(kopieRunde);
      });
    }
    return (kopie ? Promise.resolve(kopie) : kopieLesen(s.wurzel)).then(kopieRunde);
  }

  /* Die Ablaufliste: lesen, dieselbe Änderung anwenden, nur Adresse und Ablauf zurückschreiben. */
  function ablaufLesen(wurzel) {
    return A.podFetch(ablaufAdresse(wurzel), { headers: { Accept: 'application/json' } }).then(function (r) {
      if (r.status === 404) return { liste: null, etag: null };
      if (!r.ok) throw new Error('ablauf-lesen-' + r.status);
      var etag = r.headers.get('ETag');
      return r.json().then(function (j) {
        if (!j || j.fassung !== 1 || !Array.isArray(j.ablagen)) throw new Error('ablauf-form');
        return { liste: j.ablagen.filter(function (e) { return e && adresseGilt(e.adresse, wurzel) && typeof e.bis === 'number' && isFinite(e.bis); })
          .map(function (e) { return { adresse: e.adresse, bis: e.bis }; }), etag: etag };
      });
    });
  }
  function nurAblauf(liste) {
    return liste.filter(function (e) { return e.bis != null; }).map(function (e) { return { adresse: e.adresse, bis: e.bis }; });
  }
  function ablaufAendern(aendern) {
    var s = zielBestaetigt;
    var versuche = 0;
    function ablaufRunde(stand) {
      var vorher = stand.liste || [];
      var neu = nurAblauf(aendern(vorher));
      if (JSON.stringify(neu) === JSON.stringify(vorher)) return Promise.resolve();
      return ordnerBereit(s.wurzel, s.webid, 'intern').then(function () {
        var kopf = { 'Content-Type': 'application/json' };
        if (stand.etag) kopf['If-Match'] = stand.etag; else if (stand.liste === null) kopf['If-None-Match'] = '*';
        return W.schreiben(A.podFetch, 'PUT', ablaufAdresse(s.wurzel), 'ablaufliste', JSON.stringify({ fassung: 1, ablagen: neu }), kopf);
      }).then(function (r) {
        if (r.status === 412) {
          if (++versuche >= 3) throw new Error('ablauf-konflikt');
          return ablaufLesen(s.wurzel).then(ablaufRunde);
        }
        if (!r.ok) throw new Error('ablauf-' + r.status);
      });
    }
    return ablaufLesen(s.wurzel).then(ablaufRunde);
  }

  /* Ein Fehler beim Kern (keine Antwort, anderes Depot, Sub-Kontext) lässt die Kopie unverändert; Fehler des Pods gehen weiter. */
  function kernFehlerWeich(e) {
    if (!/^verzeichnis-/.test(e && e.message)) throw e;
    kopieGesperrt = true;
  }

  /* Erst lokal, dann die Ablaufliste, dann mit Kern die Kopie; danach trägt das lokale Verzeichnis den Stand der Kopie. */
  function verzeichnisAendern(aendern) {
    return verzeichnis().then(function (v) { return A.verzeichnis.schreiben(aendern(v)); }).then(function () {
      if (!zielBestaetigt) return;
      return ablaufAendern(aendern).then(function () {
        if (!kopieMoeglich()) return;
        return kopieAendern(aendern).then(function (liste) { return A.verzeichnis.schreiben(liste); }, kernFehlerWeich);
      });
    });
  }

  function besteht(adresse) {
    return A.podFetch(adresse, { method: 'HEAD' }).then(function (r) {
      if (r.status === 200) return true;
      if (r.status === 404 || r.status === 410) return false;
      throw new Error('kopie-pruefen-' + r.status);
    });
  }

  /* Mit Kern: die Kopie lesen, strittige Einträge prüfen, beide auf denselben Stand bringen. */
  function kopieUebernehmen() {
    var s = zielBestaetigt;
    return Promise.all([kopieLesen(s.wurzel), verzeichnis()]).then(function (x) {
      var stand = x[0];
      var inKopie = (stand.liste || []).map(function (e) { return e.adresse; });
      var lokal = x[1].filter(function (e) { return eintragGilt(e, s.wurzel); });
      var inLokal = lokal.map(function (e) { return e.adresse; });
      var strittig = (stand.liste || []).filter(function (e) { return inLokal.indexOf(e.adresse) < 0; })
        .concat(lokal.filter(function (e) { return inKopie.indexOf(e.adresse) < 0; }).map(auswahl));
      return strittig.reduce(function (p, e) {
        return p.then(function (weg) { return besteht(e.adresse).then(function (ja) { if (!ja) weg.push(e.adresse); return weg; }); });
      }, Promise.resolve([])).then(function (weg) {
        kopie = stand;
        var dazu = strittig.filter(function (e) { return inKopie.indexOf(e.adresse) < 0 && weg.indexOf(e.adresse) < 0; });
        var ohneWeg = function (liste) { return liste.filter(function (e) { return weg.indexOf(e.adresse) < 0; }); };
        if (!dazu.length && !weg.some(function (a) { return inKopie.indexOf(a) >= 0; })) return ohneWeg(stand.liste || []);
        return kopieAendern(function (liste) {
          var da = liste.map(function (e) { return e.adresse; });
          return ohneWeg(liste).concat(dazu.filter(function (e) { return da.indexOf(e.adresse) < 0; }));
        }).then(function (liste) {
          // Eine Ressource, die schon fehlt (ohne Kern über die Ablaufliste gelöscht), kann noch einen Grant haben: jetzt mit.
          var grants = strittig.filter(function (e) { return weg.indexOf(e.adresse) >= 0 && e.grant; }).map(function (e) { return e.grant; });
          return grants.reduce(function (p, g) { return p.then(function () { return loeschen(g); }); }, Promise.resolve()).then(function () { return liste; });
        });
      });
    }).then(function (liste) { return A.verzeichnis.schreiben(liste); });
  }

  function loeschen(ziel) {
    return A.podFetch(ziel, { method: 'DELETE' }).then(function (r) { if (!r.ok && r.status !== 404) throw new Error('loeschen-' + r.status); });
  }
  /* Rücknahme: Grant löschen (am Dienst ist das der Widerruf, LWS 11.5), Ressource löschen. Gilt für künftige Abrufe. */
  function zuruecknehmen(adresse) {
    return verzeichnis().then(function (v) {
      var e = v.filter(function (x) { return x.adresse === adresse; })[0];
      return (e && e.grant ? loeschen(e.grant) : Promise.resolve())
        .then(function () { return loeschen(adresse); })
        .then(function () { return verzeichnisAendern(function (w) { return w.filter(function (x) { return x.adresse !== adresse; }); }); });
    });
  }

  /* Fällig ist, was lokal oder in der Ablaufliste abgelaufen ist; die Ablaufliste liest die Brücke nur mit bestätigtem Ziel. */
  function abgelaufeneLoeschen() {
    var ablauf = zielBestaetigt ? ablaufLesen(zielBestaetigt.wurzel) : Promise.resolve({ liste: null });
    return Promise.all([verzeichnis(), ablauf]).then(function (x) {
      var faellig = [];
      x[0].filter(function (e) { return !zielBestaetigt || eintragGilt(e, zielBestaetigt.wurzel); }).concat(x[1].liste || []).forEach(function (e) {
        if (e.bis && e.bis < Date.now() && faellig.indexOf(e.adresse) < 0) faellig.push(e.adresse);
      });
      return faellig.reduce(function (p, a) { return p.then(function () { return zuruecknehmen(a); }); }, Promise.resolve())
        .then(function () { return faellig.length; });
    });
  }

  /* Abmelden löscht das lokale Verzeichnis (U2-ADR-512 Nr. 6); Kopie und Ablaufliste im Pod bleiben. Ohne sie setzte die Brücke
     danach keinen Ablauf mehr durch und könnte nichts zurücknehmen (Befund POD-ABMELDEN-VERLIERT-ABLAGEN). Darum löscht sie vorher
     die abgelaufenen und fragt, wenn noch offene liegen. Ohne bestätigtes Ziel (etwa nach einem Neuladen)
     schreibt sie nichts in den Pod, fragt aber genauso; zurücknehmen kann sie dann nicht. Scheitert das Löschen der
     abgelaufenen, fragt sie ebenfalls, ohne Rücknahme. */
  function abmeldenLokal() {
    $('abmelden-pruefen').hidden = true;
    return A.abmelden().then(function (ergebnis) { document.body.dataset.abmeldung = ergebnis; return A.verzeichnis.loeschen(); })
      .then(function () { angemeldetZeigen(null); });
  }

  /* Mit Kopie im Pod (in dieser Sitzung mit dem Kern gelesen oder geschrieben) kennt die Seite die Ablagen wieder, wenn sie aus
     der Anwendung geöffnet wird; ohne sie gilt der Satz aus Teil 1. */
  function rueckfrageZeigen(anzahl, mitRuecknahme, zusatz) {
    zeigen('abmelden-satz', 'In Ihrem Pod ' + (anzahl === 1 ? 'liegt noch eine Ablage' : 'liegen noch ' + anzahl + ' Ablagen') +
      ' aus dieser Seite. ' + (kopieImPod()
        ? 'Eine verschlüsselte Liste davon liegt in Ihrem Pod: Öffnen Sie die Seite wieder aus Vivodepot und bestätigen Ihren' +
          ' Speicher, können Sie zurücknehmen.'
        : 'Nach dem Abmelden kennt die Seite sie nicht mehr: zurücknehmen können Sie sie dann nur noch bei Ihrem Pod-Anbieter.') +
      ' Ablaufdaten setzt die Seite nach jeder Anmeldung durch, sobald Sie Ihren Speicher bestätigen.' + (zusatz ? ' ' + zusatz : ''));
    $('abmelden-alle').hidden = !mitRuecknahme;
    $('abmelden-pruefen').hidden = false;
  }

  function abmeldenPruefen() {
    fehler('');
    if (!zielBestaetigt) {
      return verzeichnis().then(function (v) {
        if (!v.length) return abmeldenLokal();
        rueckfrageZeigen(v.length, false, 'Zurücknehmen kann die Seite erst, wenn Sie Ihren Speicher bestätigt haben.');
      });
    }
    return abgelaufeneLoeschen().then(verzeichnis).then(function (offen) {
      if (!offen.length) return abmeldenLokal();
      rueckfrageZeigen(offen.length, true);
      return verzeichnisZeigen();
    }).catch(function (e) {
      fehler(e.message);
      return verzeichnis().then(function (v) {
        if (v.length) rueckfrageZeigen(v.length, false, 'Die abgelaufenen konnte die Seite gerade nicht löschen.');
      });
    });
  }

  function alleZuruecknehmenUndAbmelden() {
    fehler('');
    return verzeichnis().then(function (v) {
      return v.reduce(function (p, e) { return p.then(function () { return zuruecknehmen(e.adresse); }); }, Promise.resolve());
    }).then(abmeldenLokal, function (e) { fehler(e.message); return verzeichnisZeigen(); });
  }

  function abholen(adresse) {
    return A.podFetch(adresse, { vonDerPersonEingegeben: true }).then(function (r) { if (!r.ok) throw new Error('abholen-' + r.status); return r.text(); });
  }

  function dateiAnbieten(text, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
    a.download = name; a.textContent = name; a.id = 'abgeholt';
    var z = $('abholung'); z.textContent = ''; z.appendChild(a);
  }

  /* Ohne Auftrag aus der App, in einem anderen Browser: die Ablagen aus dem Ablageordner zum Zurücknehmen (Befund
     RUECKNAHME-OHNE-AUFTRAG). Die Container-Liste ist Eingabe des Servers. Der Ordner kommt darum nur aus dem bestätigten
     Speicher, nie aus der Antwort; podFetch folgt keiner Weiterleitung, und eine umgeleitete Antwort zählt nicht. Angenommen wird
     nur ein Kind genau dieses Ordners (Subjekt der Ordner, Prädikat ldp:contains) mit dem Namen, den pfadZufall vergibt; so fallen
     Unterordner, Hilfsdateien, fremde Pfade und Kodierungen heraus. Gelesen wird nur; den Grant kennt die Brücke so nicht, er fällt
     beim nächsten Abgleich mit dem Kern und gilt bis dahin nur bis zu seinem Ablauf. */
  var ABLAGE_NAME = /^[A-Za-z0-9_-]{22}$/;
  var LDP_ENTHAELT = ['http://www.w3.org/ns/ldp#contains', 'ldp:contains', 'contains'];
  var ORDNER_DECKEL = 500;
  function ablageImOrdner(adresse, wurzel) {
    try {
      var ordner = new URL(ORDNER.eigen, wurzel).href;
      var u = new URL(adresse);
      if (u.href.indexOf(ordner) !== 0) return false;
      var name = u.href.slice(ordner.length);
      return !u.search && !u.hash && u.href === ordner + name && ABLAGE_NAME.test(name);
    } catch (_) { return false; }
  }
  /* Die Kinder genau dieses Containers, die `gilt` annimmt; höchstens ORDNER_DECKEL. Liest nur. */
  function kinderLesen(ordner, gilt) {
    return A.podFetch(ordner, { headers: { Accept: 'application/ld+json' } }).then(function (r) {
      if (!r.ok || r.redirected || (r.url && r.url !== ordner)) return [];
      return r.json().then(function (j) {
        var kinder = [];
        [].concat(j && j['@graph'] ? j['@graph'] : j).forEach(function (k) {
          if (!k || typeof k !== 'object' || typeof k['@id'] !== 'string') return;
          var id; try { id = new URL(k['@id'], ordner).href; } catch (_) { return; }
          if (id !== ordner) return;
          LDP_ENTHAELT.forEach(function (p) {
            [].concat(k[p] || []).forEach(function (c) {
              var roh = c && typeof c === 'object' ? c['@id'] : c;
              if (typeof roh !== 'string' || kinder.length >= ORDNER_DECKEL) return;
              var a; try { a = new URL(roh, ordner).href; } catch (_) { return; }
              if (gilt(a) && kinder.indexOf(a) < 0) kinder.push(a);
            });
          });
        });
        return kinder;
      });
    }).catch(function () { return []; });
  }
  function ordnerLesen() {
    var s = zielBestaetigt;
    ausOrdner = [];
    if (!s) return Promise.resolve();
    var ordner = new URL(ORDNER.eigen, s.wurzel).href;
    return kinderLesen(ordner, function (a) { return ablageImOrdner(a, s.wurzel) && adresseGilt(a, s.wurzel); }).then(function (kinder) {
      if (zielBestaetigt !== s) return;
      return verzeichnis().then(function (v) {
        var da = v.map(function (e) { return e.adresse; });
        ausOrdner = kinder.filter(function (a) { return da.indexOf(a) < 0; });
      });
    });
  }
  /* Übergang (Befund ALTE-GRANTS-KLARTEXT): Frühere Fassungen legten ohne Grant-Dienst jeden Grant im Klartext unter
     vivodepot/grants/<Ablagename>.json ab, mit Stelle, Adresse, Zweck und Ablauf. Den Zugriff gab schon damals die Regel, nicht
     der Grant. Nach der Bestätigung des Speichers löscht die Brücke genau diese Dateien, auch ohne Kern; anderes in grants/ bleibt.
     Scheitert das Lesen oder ein Löschen, bleibt der Rest bis zum nächsten Öffnen. */
  var GRANTS_ALT = 'vivodepot/grants/';
  var GRANT_ALT_NAME = /^[A-Za-z0-9_-]{22}\.json$/;
  function alteGrantsLoeschen() {
    var s = zielBestaetigt;
    if (!s) return Promise.resolve();
    var ordner = new URL(GRANTS_ALT, s.wurzel).href;
    return kinderLesen(ordner, function (a) {
      var u = new URL(a);
      return !u.search && !u.hash && u.href.indexOf(ordner) === 0 && GRANT_ALT_NAME.test(u.href.slice(ordner.length));
    }).then(function (kinder) {
      return kinder.reduce(function (p, a) { return p.then(function () { if (zielBestaetigt === s) return loeschen(a); }); }, Promise.resolve());
    }).catch(function () {});
  }
  /* Ein Klick nimmt genau eine Adresse zurück; die Grenze gilt unmittelbar vor dem DELETE noch einmal. */
  function zuruecknehmenImOrdner(adresse) {
    var s = zielBestaetigt;
    if (!s || ausOrdner.indexOf(adresse) < 0 || !ablageImOrdner(adresse, s.wurzel) || !adresseGilt(adresse, s.wurzel)) {
      return Promise.reject(new Error('ruecknahme-ziel'));
    }
    return zuruecknehmen(adresse).then(function () { ausOrdner = ausOrdner.filter(function (a) { return a !== adresse; }); });
  }

  function verzeichnisZeigen() {
    return verzeichnis().then(function (v) {
      var ul = $('liste'); ul.textContent = '';
      v.forEach(function (e) {
        var li = document.createElement('li');
        li.textContent = (e.art ? e.art + ' · ' : '') + e.adresse + (e.bis ? ' · gilt bis ' + new Date(e.bis).toLocaleDateString('de-DE') : '');
        var k = document.createElement('button'); k.type = 'button'; k.textContent = 'Zurücknehmen (für künftige Abrufe)';
        k.onclick = function () { zuruecknehmen(e.adresse).then(verzeichnisZeigen, function (x) { fehler(x.message); }); };
        li.appendChild(k); ul.appendChild(li);
      });
      var da = v.map(function (e) { return e.adresse; });
      ausOrdner.filter(function (a) { return da.indexOf(a) < 0; }).forEach(function (a) {
        var li = document.createElement('li');
        li.textContent = a.slice(a.lastIndexOf('/') + 1);   // nur der Name, nie HTML aus der Liste
        var k = document.createElement('button'); k.type = 'button'; k.textContent = 'Zurücknehmen (für künftige Abrufe)';
        k.onclick = function () { zuruecknehmenImOrdner(a).then(verzeichnisZeigen, function (x) { fehler(x.message); }); };
        li.appendChild(k); ul.appendChild(li);
      });
    });
  }

  function angemeldetZeigen(webid) {
    zeigen('wer', webid ? 'Angemeldet als ' + webid : 'Nicht angemeldet');
    $('anmelden-bereich').hidden = !!webid; $('ablage-bereich').hidden = true; $('ziel').hidden = true;
    if (!webid) { zielBestaetigt = null; kopie = null; ausOrdner = []; return; }
    return speicherOrt(webid).then(function (wurzel) {
      if (zielBestaetigt && zielBestaetigt.webid === webid && zielBestaetigt.wurzel === wurzel) return zielGezeigt();
      zeigen('ziel-adresse', new URL('vivodepot/', wurzel).href);
      $('ziel').hidden = false;
      $('ziel-ja').onclick = function () { zielBestaetigt = { webid: webid, wurzel: wurzel }; $('ziel').hidden = true; zielGezeigt().catch(function (e) { fehler(e.message); }); };
    });
  }
  /* Erst nach der Bestätigung: abgelaufene Ablagen löschen (lokal und aus der Ablaufliste) und das Verzeichnis zeigen. Scheitert
     das Lesen der Ablaufliste, bleibt alles, wie es war: kein bestätigtes Ziel, keine Ablage, kein Löschen. Die Kopie gleicht die
     Brücke erst mit dem Kern ab, wenn ein Auftrag kommt (auftragAbgleichen). */
  function zielGezeigt() {
    $('ablage-bereich').hidden = false;
    return abgelaufeneLoeschen().catch(function (e) {
      if (!/^ablauf-/.test(e.message)) throw e;
      zielBestaetigt = null; kopie = null; $('ablage-bereich').hidden = true;
      throw new Error('Die Liste der Ablagen ließ sich nicht abgleichen. Nichts wurde geändert, abgelaufene Ablagen sind noch nicht gelöscht. Bitte öffnen Sie die Seite später erneut.');
    }).then(alteGrantsLoeschen).then(ordnerLesen).then(verzeichnisZeigen).then(bereitMelden);
  }

  /* Beim Eintreffen des Auftrags, vor jeder Wahl der Person: Die Brücke entfernt abgelaufene Ablagen samt Grant, denn ein Grant
     ist ein Zugriffsrecht und soll nicht bis zur nächsten Ablage stehen bleiben. Sie liest dafür die Kopie (mit dem Kern) und die
     Ablaufliste, wie abgelaufeneLoeschen, und löscht nur im bestätigten Speicher (eintragGilt, adresseGilt): sonst ginge ein
     DELETE mit der Anmeldung der Person an jede Adresse, die in der Kopie steht. Den Grant eines Eintrags, den nur die
     Ablaufliste nennt, kennt sie nicht; er fällt beim nächsten Abgleich mit der Kopie. Kopie und Ablaufliste schreibt sie hier
     nicht: wählt die Person „Nicht ablegen“, kommt nichts in den Pod. */
  function auftragVorab() {
    var s = zielBestaetigt;
    if (!s) return Promise.resolve();
    var ausKopie = kernVerfuegbar()
      ? kopieLesen(s.wurzel).then(function (stand) { return stand.liste || []; }, function () { kopieGesperrt = true; return []; })
      : Promise.resolve([]);
    var ausAblauf = ablaufLesen(s.wurzel).then(function (stand) { return stand.liste || []; }, function () { return []; });
    return Promise.all([ausKopie, ausAblauf]).then(function (x) {
      var faellig = [];
      x[0].filter(function (e) { return e.bis && e.bis < Date.now() && eintragGilt(e, s.wurzel); })
        .concat(x[1].filter(function (e) { return e.bis < Date.now() && adresseGilt(e.adresse, s.wurzel); }))
        .forEach(function (e) { if (!faellig.some(function (f) { return f.adresse === e.adresse; })) faellig.push(e); });
      return faellig.reduce(function (p, e) {
        return p.then(function () { return (e.grant ? loeschen(e.grant) : Promise.resolve()).then(function () { return loeschen(e.adresse); }); });
      }, Promise.resolve()).then(function () { return kopieZeigen(x[0], faellig); });
    }).catch(function () {});
  }

  /* Was die Kopie kennt, zeigt die Brücke zum Zurücknehmen, auch wenn die Person danach „Nicht ablegen“ wählt (sonst ginge eine
     Ablage in einem anderen Browser nur nach einer neuen Ablage zurückzunehmen). Übernommen wird nur ins Verzeichnis dieses
     Browsers, nicht in den Pod; in den Pod schreibt erst ein Klick auf „Zurücknehmen“. */
  function kopieZeigen(ausKopie, faellig) {
    var weg = faellig.map(function (e) { return e.adresse; });
    var gueltig = ausKopie.filter(function (e) { return !(e.bis && e.bis < Date.now()) && weg.indexOf(e.adresse) < 0; });
    if (!gueltig.length) return;
    return verzeichnis().then(function (v) {
      var da = v.map(function (e) { return e.adresse; });
      var dazu = gueltig.filter(function (e) { return da.indexOf(e.adresse) < 0; });
      if (!dazu.length) return;
      return A.verzeichnis.schreiben(v.concat(dazu)).then(verzeichnisZeigen);
    });
  }

  /* Nach „Ablegen“: die Kopie öffnen und abgleichen, dann die Abgelaufenen samt Grant löschen. Scheitert das, bleibt die Kopie,
     wie sie ist; das Ablegen läuft trotzdem. */
  function auftragAbgleichen() {
    if (!kernVerfuegbar()) return Promise.resolve();
    return kopieUebernehmen().then(abgelaufeneLoeschen).then(verzeichnisZeigen)
      .catch(function () { kopieGesperrt = true; });
  }

  /* ── Stufe 2: Übergabe aus der Anwendung per postMessage ──────────────────────────────────────────────────────────────────
     Angenommen werden nur die bekannten Herkünfte aus konfiguration.js und 'null'. Die Herkunft 'null' haben ein Kern vom Stick,
     aber ebenso jede sandbox- oder data:-Seite: darum sagt der Satz dann, dass die Herkunft nicht erkennbar ist, und warnt.
     Jede andere Herkunft hat keinen echten Aufrufer und wird verworfen. Je Laden der Seite ein Auftrag; ein zweiter wird
     verworfen, damit niemand den gezeigten Auftrag unter dem Klick tauscht. Nach `bis` (vom Kern, kurz vor seiner Frist) legt
     die Seite nicht mehr ab. An das Fenster des Auftrags gehen die Adresse der Ablage und, bei bekannter Herkunft, die Bitten um
     das Verzeichnis (U2-ADR-520). Die Antwort geht an die Herkunft des Auftrags; bei 'null' bleibt nur '*': dann erfährt die
     öffnende Seite die Adresse (Grenze im Nachtrag zu U2-ADR-512), und um das Verzeichnis bittet die Brücke nicht. */
  var auftrag = null;
  var auftragGenommen = false;
  // Ein Klick so kurz nach dem Erscheinen des Auftrags gilt nicht: der Öffner bestimmt den Zeitpunkt, ein Doppelklick auf
  // „Ja, das ist mein Speicher“ soll nicht auf „Ablegen“ landen.
  var KLICK_SPERRE_MS = 800;
  var ID_MUSTER = /^[A-Za-z0-9_-]{22}$/;
  var NACHRICHT_FELDER = ['typ', 'fassung', 'id', 'art', 'bis', 'daten'];
  // Kind-Datei, erstes Ablegen: dazu die WebID des Kindes und der Ablauf (Zahl oder null), nur an der Art `stelle`.
  var NACHRICHT_FELDER_KIND = NACHRICHT_FELDER.concat(['stelle', 'ablauf']);
  // Kind-Datei, jedes weitere Sichern: genau diese Felder, ohne Art, Stelle und Zusatz.
  var NACHRICHT_FELDER_ERSETZEN = ['typ', 'fassung', 'id', 'bis', 'daten', 'adresse', 'etag'];
  // Kind-Datei ohne Ablauf im Pod: Ersetzen mit Nachtrag des Ablaufs (Befund KIND-POD-OHNE-ABLAUF).
  var NACHRICHT_FELDER_NACHTRAG = NACHRICHT_FELDER_ERSETZEN.concat(['ablauf']);
  var KERN_ANTWORTEN = ['vd-pod-verzeichnis-offen', 'vd-pod-verzeichnis-verschlossen'];
  var WAS = {
    eigen: 'eine verschlüsselte Sicherung (nur für Sie lesbar)',
    link: 'eine verschlüsselte Datei als Freigabe-Link (für jeden lesbar, der den Link hat)',
    stelle: 'eine verschlüsselte Datei für eine Stelle (nur für die WebID lesbar, die Sie unten eintragen)'
  };
  function groesse(n) { return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB'; }

  function artGewaehlt() { var r = document.querySelector('input[name="art"]:checked'); return r ? r.value : null; }
  function artSetzen(art) { var r = document.querySelector('input[name="art"][value="' + art + '"]'); if (r) r.checked = true; }

  function nachrichtAnnehmen(e) {
    var d = e.data;
    if (!window.opener || e.source !== window.opener) return;
    if (d && typeof d === 'object' && KERN_ANTWORTEN.indexOf(d.typ) >= 0) return kernAntwort(e, d);
    if (!zielBestaetigt || auftragGenommen) return;   // bereit meldet sich die Seite erst mit bestätigtem Ziel; ein Auftrag je Laden
    var bekannt = ((self.VD_POD_KONFIG && self.VD_POD_KONFIG.herkuenfte) || []).indexOf(e.origin) >= 0;
    if (!bekannt && e.origin !== 'null') return;
    if (!d || typeof d !== 'object' || d.typ !== 'vd-pod-ablegen' || d.fassung !== 1) return;
    var ersetzt = Object.prototype.hasOwnProperty.call(d, 'adresse');
    var nachtrag = ersetzt && Object.prototype.hasOwnProperty.call(d, 'ablauf');
    var kindErst = !ersetzt && Object.prototype.hasOwnProperty.call(d, 'stelle');
    var felder = nachtrag ? NACHRICHT_FELDER_NACHTRAG : ersetzt ? NACHRICHT_FELDER_ERSETZEN : kindErst ? NACHRICHT_FELDER_KIND : NACHRICHT_FELDER;
    if (Object.keys(d).some(function (k) { return felder.indexOf(k) < 0; })) return;
    if (ersetzt && felder.some(function (k) { return !Object.prototype.hasOwnProperty.call(d, k); })) return;
    var art = ersetzt ? 'stelle' : d.art;
    if (!ID_MUSTER.test(d.id || '') || !WAS[art] || !(d.daten instanceof ArrayBuffer)) return;
    if (typeof d.bis !== 'number' || !isFinite(d.bis) || d.bis <= Date.now()) return;
    if (ersetzt && (typeof d.adresse !== 'string' || !etagGilt(d.etag))) return;
    if (nachtrag && !ablaufGilt(d.ablauf)) return;
    if (kindErst) {
      if (art !== 'stelle' || typeof d.stelle !== 'string') return;
      try { iri(d.stelle); } catch (_) { return; }
      // Die Kind-Datei kommt nie ohne Ablauf (Befund KIND-POD-OHNE-ABLAUF), und er liegt in der Zukunft.
      if (typeof d.ablauf !== 'number' || !isFinite(d.ablauf) || d.ablauf <= Date.now()) return;
      // Der Ablauf geht im Klartext an den Pod: nur ein Jahreswechsel, aus dem höchstens das Geburtsjahr folgt.
      if (!jahreswechsel(d.ablauf)) return;
    }
    var text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(d.daten); } catch (_) { return; }
    if (!C.passtZurArt(text, art, d.daten.byteLength)) return;
    auftragGenommen = true;
    auftrag = { id: d.id, art: art, bis: d.bis, text: text, laenge: d.daten.byteLength, quelle: e.source, herkunft: e.origin, gezeigt: Date.now(),
      ersetzen: ersetzt ? { adresse: d.adresse, etag: d.etag, ablauf: nachtrag ? d.ablauf : null } : null, kind: kindErst ? { stelle: d.stelle, ablauf: d.ablauf } : null };
    kern = { id: d.id, quelle: e.source, herkunft: e.origin, bis: d.bis };
    vorab = auftragVorab();
    var wer = bekannt ? 'Vivodepot möchte ' : 'Eine Anwendung ohne erkennbare Herkunft (zum Beispiel Vivodepot vom Stick) möchte ';
    zeigen('auftrag-satz', wer + (ersetzt
      ? 'die verschlüsselte Datei unter ' + d.adresse + ' durch einen neuen Stand (' + groesse(d.daten.byteLength) + ') ersetzen' +
        (nachtrag ? ' und ihr den Ablauf ' + new Date(d.ablauf).toISOString().slice(0, 10) + ' nachtragen (Ablaufliste und Grant mit Ablauf).' : '.')
      : kindErst
        ? 'eine verschlüsselte Kind-Datei (' + groesse(d.daten.byteLength) + ') in Ihrem Pod ablegen, nur lesbar für die WebID ' + d.stelle + '.'
        : WAS[art] + ' (' + groesse(d.daten.byteLength) + ') in Ihrem Pod ablegen.') +
      (bekannt ? '' : ' Haben Sie nicht gerade selbst in Vivodepot „Im Pod ablegen“ gewählt, legen Sie nichts ab.'));
    artSetzen(art);
    // Die WebID des Kindes kommt aus der Anwendung und steht im Satz oben; sie ist hier nicht mehr zu ändern.
    if (kindErst) { $('stelle').value = d.stelle; $('stelle').readOnly = true; }
    $('stelle-bereich').hidden = art !== 'stelle' || ersetzt;
    $('auftrag').hidden = false;
  }

  /* Rückprobe der eigenen Sicherung (Nachtrag zu U2-ADR-512, Rückprobe): Nach „abgelegt“ liest die Brücke die eben gemeldete Adresse
     und gibt dem Fenster, das den Auftrag gab, die Bytes in einer eigenen Nachricht zurück. Nur Art eigen. Gezählt wird beim Lesen:
     Mehr als die gesendete Bytezahl wird nicht gehalten, beim ersten überzähligen Byte bricht das Lesen ab. Content-Length ist nur
     Vorfilter. Jeder Fehler wird zur Angabe aus der festen Liste und sagt nichts über die Kopie. */
  function zurueckLesen(adresse, laenge) {
    return A.podFetch(adresse, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/octet-stream' } }).then(function (r) {
      if (!r || !r.ok) return { fehler: 'status' };
      var angabe = r.headers && r.headers.get ? r.headers.get('content-length') : null;
      if (angabe !== null && angabe !== '' && Number(angabe) > laenge) {
        if (r.body && r.body.cancel) { try { r.body.cancel(); } catch (_) { /* das Ergebnis steht schon fest */ } }
        return { fehler: 'groesse' };
      }
      if (!r.body || typeof r.body.getReader !== 'function') return { fehler: 'form' };
      var leser = r.body.getReader(), puffer = new Uint8Array(laenge), n = 0;
      function weiter() {
        return leser.read().then(function (s) {
          if (s.done) return null;
          if (n + s.value.length > laenge) return Promise.resolve(leser.cancel()).catch(function () {}).then(function () { return { fehler: 'groesse' }; });
          puffer.set(s.value, n); n += s.value.length;
          return weiter();
        });
      }
      return weiter().then(function (abbruch) {
        if (abbruch) return abbruch;
        var daten = puffer.slice(0, n), text;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(daten); } catch (_) { return { fehler: 'form' }; }
        if (!C.passtZurArt(text, 'eigen', n)) return { fehler: 'form' };
        return { daten: daten.buffer };
      });
    }).catch(function () { return { fehler: 'netz' }; });
  }
  function zurueckGeben(a, adresse, an) {
    return zurueckLesen(adresse, a.laenge).then(function (erg) {
      if (erg.daten) a.quelle.postMessage({ typ: 'vd-pod-zurueck', fassung: 1, id: a.id, daten: erg.daten }, an, [erg.daten]);
      else a.quelle.postMessage({ typ: 'vd-pod-zurueck', fassung: 1, id: a.id, fehler: erg.fehler }, an);
    });
  }

  function auftragAusfuehren() {
    if (!auftrag || Date.now() - auftrag.gezeigt < KLICK_SPERRE_MS) return;
    var a = auftrag; auftrag = null; $('auftrag').hidden = true;
    fehler(''); zeigen('ergebnis', '');
    if (Date.now() > a.bis) { fehler('auftrag-abgelaufen'); return; }
    var an = a.herkunft === 'null' ? '*' : a.herkunft;
    Promise.resolve(vorab).then(function () { abgleich = auftragAbgleichen(); return abgleich; }).then(function () {
      if (a.ersetzen) return ersetzen(a.ersetzen.adresse, a.text, a.ersetzen.etag, a.ersetzen.ablauf);
      var zusatz = { zweck: $('zweck').value || null, inbox: $('inbox').value || null };
      if (a.kind) return ablegen(a.text, 'stelle', a.kind.stelle, null, Object.assign(zusatz, { bis: a.kind.ablauf, mitEtag: true }));
      return ablegen(a.text, a.art, $('stelle').value, Number($('tage').value) || null, zusatz);
    })
      .then(function (erg) {
        var mitEtag = typeof erg === 'object';
        var adresse = mitEtag ? erg.adresse : erg;
        zeigen('ergebnis', adresse);
        a.quelle.postMessage(mitEtag ? { typ: 'vd-pod-abgelegt', fassung: 1, id: a.id, adresse: adresse, etag: erg.etag }
          : { typ: 'vd-pod-abgelegt', fassung: 1, id: a.id, adresse: adresse }, an);
        kern = null;   // nach der Antwort beantwortet der Kern keine Bitte mehr
        var eigeneSicherung = a.art === 'eigen' && !a.ersetzen && !a.kind;
        return (eigeneSicherung ? zurueckGeben(a, adresse, an) : Promise.resolve()).then(verzeichnisZeigen);
      })
      .catch(function (x) {
        fehler(x.message);
        // Ein anderer Stand liegt an der Adresse: die Anwendung erfährt es und übernimmt nichts.
        if (a.ersetzen && x.message === 'konflikt') { a.quelle.postMessage({ typ: 'vd-pod-konflikt', fassung: 1, id: a.id }, an); kern = null; }
      });
  }

  function bereitMelden() {
    // Erst nach Anmeldung und bestätigtem Ziel: eine Anmeldung verlässt die Seite, ein Auftrag ginge dabei verloren.
    if (window.opener && zielBestaetigt) window.opener.postMessage({ typ: 'vd-pod-bereit', fassung: 1 }, '*');
  }

  function start() {
    window.addEventListener('message', nachrichtAnnehmen);
    $('auftrag-ja').onclick = auftragAusfuehren;
    $('auftrag-nein').onclick = function () {
      auftrag = null; $('auftrag').hidden = true;
      // Nach dem Lesen beantwortet der Kern keine Bitte mehr; geschrieben wird nichts.
      return Promise.resolve(vorab).then(function () { kern = null; });
    };
    $('ziel-nein').onclick = abmeldenPruefen;
    $('anmelden').onclick = function () { fehler(''); A.anmelden($('aussteller').value).catch(function (e) { fehler(e.message); }); };
    $('abmelden').onclick = abmeldenPruefen;
    $('abmelden-alle').onclick = alleZuruecknehmenUndAbmelden;
    $('abmelden-lassen').onclick = abmeldenLokal;
    $('abmelden-abbrechen').onclick = function () { $('abmelden-pruefen').hidden = true; };
    $('art').onchange = function () { $('stelle-bereich').hidden = artGewaehlt() !== 'stelle'; };
    $('ablegen').onclick = function () {
      fehler(''); zeigen('ergebnis', '');
      var f = $('datei').files[0]; if (!f) { fehler('keine-datei'); return; }
      f.text().then(function (t) { return ablegen(t, artGewaehlt(), $('stelle').value, Number($('tage').value) || null, { zweck: $('zweck').value || null, inbox: $('inbox').value || null }); })
        .then(function (adresse) { zeigen('ergebnis', adresse); return verzeichnisZeigen(); })
        .catch(function (e) { fehler(e.message); });
    };
    $('abholen').onclick = function () {
      fehler('');
      abholen($('abhol-adresse').value).then(function (t) { dateiAnbieten(t, 'abgeholt.vivodepot'); }).catch(function (e) { fehler(e.message); });
    };
    A.ruecksprungVerarbeiten()
      .then(function (w) { return w || A.sitzung().then(function (s) { return s && s.webid; }); })
      .then(angemeldetZeigen)
      .catch(function (e) { fehler(e.message); angemeldetZeigen(null); });
  }

  // _probe.abgleichen: der Schritt, den „Ablegen“ vor dem Ablegen geht, für Proben, die danach selbst ablegen.
  self.vdPodBruecke = { ablegen: ablegen, ersetzen: ersetzen, abholen: abholen, zuruecknehmen: zuruecknehmen, verzeichnis: verzeichnis, nachrichtAnnehmen: nachrichtAnnehmen,
    zuruecknehmenImOrdner: zuruecknehmenImOrdner, ablagenImOrdner: function () { return ausOrdner.slice(); },
    _probe: { abgleichen: function () { abgleich = Promise.resolve(vorab).then(auftragAbgleichen); return abgleich; } } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
