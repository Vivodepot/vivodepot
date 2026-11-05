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
   Abgelegt wird erst nach dem Klick der Person, ein Auftrag je Klick. Zurück geht nur die Adresse, an genau dieses Fenster. */

(function () {
  var A = self.vdPodAnmeldung;
  var C = self.vdPodChiffrat;
  var L = self.vdPodLws;
  var ORDNER = { stelle: 'vivodepot/freigaben/', link: 'vivodepot/links/', eigen: 'vivodepot/sicherungen/', grants: 'vivodepot/grants/', intern: 'vivodepot/intern/' };
  var $ = function (id) { return document.getElementById(id); };
  var zielBestaetigt = null;   // { webid, wurzel } nach dem Klick der Person; nur im Speicher
  var kopie = null;            // { liste, etag } der Kopie des Verzeichnisses im Pod, zuletzt gelesen oder geschrieben; nur im Speicher

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

  function aclSetzen(adresse, regeln) {
    return aclAdresse(adresse).then(function (acl) {
      return A.podFetch(acl, { method: 'PUT', headers: { 'Content-Type': 'text/turtle' }, body: regeln });
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
      return A.podFetch(ziel, { method: 'PUT', headers: { 'Content-Type': 'text/turtle', 'If-None-Match': '*' } })
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

  /* Access Grant für eine Freigabe an eine Stelle. Ohne Dienst: die Zugriffsregel setzt die Brücke selbst (schon geschehen),
     und derselbe Grant liegt als Protokolleintrag unter vivodepot/grants/, nur für die Person lesbar. */
  function grantAnlegen(wurzel, s, adresse, stelle, bis, zweck, inbox) {
    var g = L.grantBauen({ storage: wurzel, stelle: stelle, adresse: adresse, bis: bis, zweck: zweck || null, inbox: inbox || null });
    var fehler = L.pruefen(g, 'AccessGrant');
    if (fehler.length) return Promise.reject(new Error('grant:' + fehler.join(',')));
    var koerper = JSON.stringify(g);
    return grantDienstFinden(wurzel).then(function (dienst) {
      if (dienst) {
        return A.podFetch(dienst, { method: 'POST', headers: { 'Content-Type': L.MEDIENTYP }, body: koerper }).then(function (r) {
          if (!r.ok) throw new Error('grant-dienst-' + r.status);
          return { grant: new URL(r.headers.get('Location'), dienst).href, ueberDienst: true };
        });
      }
      return ordnerBereit(wurzel, s.webid, 'grants').then(function (ordner) {
        var ziel = new URL(adresse.split('/').pop() + '.json', ordner).href;
        return A.podFetch(ziel, { method: 'PUT', headers: { 'Content-Type': 'application/ld+json', 'If-None-Match': '*' }, body: koerper })
          .then(function (r) { if (!r.ok) throw new Error('grant-eintrag-' + r.status); return { grant: ziel, ueberDienst: false }; });
      });
    }).then(function (erg) {
      if (!inbox) return erg;
      // Benachrichtigung der Stelle (LWS 11.6): ohne Anmeldung, nur der Grant, nie ein Schlüssel.
      return fetch(inbox, { method: 'POST', credentials: 'omit', redirect: 'error', headers: { 'Content-Type': L.MEDIENTYP }, body: koerper })
        .then(function (r) { erg.benachrichtigt = r.ok; return erg; }, function () { erg.benachrichtigt = false; return erg; });
    });
  }

  function zielGilt(s, wurzel) { return !!(zielBestaetigt && zielBestaetigt.webid === s.webid && zielBestaetigt.wurzel === wurzel); }

  function ablegen(text, art, stelleWebid, tage, zusatz) {
    var befund = C.pruefen(text);
    if (befund.fehler) return Promise.reject(new Error('nicht-chiffrat:' + befund.fehler));
    if (art === 'link' && befund.art !== 'shl') return Promise.reject(new Error('link-nur-fuer-shl'));
    if (art === 'eigen' && befund.art !== 'depot') return Promise.reject(new Error('eigen-nur-fuer-depot'));
    if (!C.passtZurArt(text, art, new Blob([text]).size)) return Promise.reject(new Error('passt-nicht-zur-art'));
    // Die WebID der Stelle vor jedem Schreiben: sonst läge die Ressource schon im Pod, ohne Regel, Verzeichnis und Ablauf.
    if (art === 'stelle') { try { iri(stelleWebid); } catch (x) { return Promise.reject(new Error('stelle-webid')); } }
    return A.sitzung().then(function (s) {
      if (!s) throw new Error('nicht-angemeldet');
      return speicherOrt(s.webid).then(function (wurzel) {
        if (!zielGilt(s, wurzel)) throw new Error('ziel-nicht-bestaetigt');
        return ordnerBereit(wurzel, s.webid, art);
      }).then(function (ordner) {
        var adresse = new URL(pfadZufall(), ordner).href;
        var typ = befund.art === 'depot' ? 'application/octet-stream' : 'application/jose';
        return A.podFetch(adresse, { method: 'PUT', headers: { 'Content-Type': typ, 'If-None-Match': '*' }, body: text })
          .then(function (r) { if (!r.ok) throw new Error('ablegen-' + r.status); })
          .then(function () {
            var regeln = PRAEFIX + regelEigen(s.webid, adresse, false);
            if (art === 'link') regeln += '<#link> a acl:Authorization; acl:agentClass foaf:Agent; acl:accessTo <' + adresse + '>; acl:mode acl:Read.\n';
            if (art === 'stelle') regeln += '<#stelle> a acl:Authorization; acl:agent ' + iri(stelleWebid) + '; acl:accessTo <' + adresse + '>; acl:mode acl:Read.\n';
            return aclSetzen(adresse, regeln);
          })
          .then(function () {
            var bis = tage ? Date.now() + tage * 86400000 : null;
            var z = zusatz || {};
            var grant = art === 'stelle' ? speicherOrt(s.webid).then(function (wurzel) { return grantAnlegen(wurzel, s, adresse, stelleWebid, bis, z.zweck, z.inbox); }) : Promise.resolve(null);
            return grant.then(function (g) {
              var eintrag = { adresse: adresse, art: art, stelle: art === 'stelle' ? stelleWebid : null, bis: bis, am: Date.now(),
                grant: g ? g.grant : null, ueberDienst: g ? g.ueberDienst : null, benachrichtigt: g ? !!g.benachrichtigt : null };
              return verzeichnisAendern(function (v) { return v.concat([eintrag]); });
            }).then(function () { return adresse; });
          });
      });
    });
  }

  function verzeichnis() { return A.verzeichnis.lesen().then(function (v) { return v || []; }); }

  /* ── Kopie des Verzeichnisses im eigenen Pod (POD-ABMELDEN-VERLIERT-ABLAGEN, Teil 2; Nachtrag zu U2-ADR-512 Nr. 9) ────────────
     Das lokale Verzeichnis überdauert weder das Abmelden noch gelöschte Website-Daten noch ein zweites Gerät. Darum liegt eine
     Kopie unter vivodepot/intern/verzeichnis.json, nur für die WebID der Person lesbar (regelEigen mit Vererbung, wie
     sicherungen/ und grants/). Unverschlüsselt: die Brücke kennt keinen Schlüssel, der das Abmelden überdauert, und soll keinen
     aus dem Depot kennen. Darin stehen genau die Felder aus KOPIE_FELDER; bei `link` ist die Adresse die Fähigkeit, ein Teil des
     SHL-Links oder ein Schlüssel aus dem Fragment kommt nie hinein. Erst wenn intern/ samt Regel steht, wird geschrieben
     (fail-closed). Vor der Bestätigung des Ziels liest und schreibt die Brücke die Kopie nicht.
     Nach der Bestätigung gilt die Kopie im Pod. Ein Eintrag, den nur dieses Gerät kennt, kommt hinzu, wenn seine Ressource noch
     besteht (HEAD 200); 404 oder 410 verwirft ihn. Eine Vereinigung ohne diese Prüfung holte zurück, was ein anderes Gerät
     zurückgenommen hat. Jeder andere Status bricht den Abgleich ab, ohne etwas zu schreiben. Geschrieben wird mit If-Match auf
     das zuletzt gelesene ETag; bei 412 liest die Brücke neu und wendet dieselbe Änderung auf den neuen Stand an. */
  var KOPIE_FELDER = ['adresse', 'art', 'stelle', 'bis', 'am', 'grant', 'ueberDienst'];
  var KOPIE_ARTEN = ['stelle', 'link', 'eigen'];
  function kopieAdresse(wurzel) { return new URL(ORDNER.intern + 'verzeichnis.json', wurzel).href; }

  /* Gilt für einen Eintrag aus der Kopie wie aus dem lokalen Verzeichnis: die Brücke löscht später Ressource und Grant, also
     nur unter dem eigenen Speicher, im Ordner der Art, ohne Fragment und ohne Abfrage. */
  function eintragGilt(e, wurzel) {
    if (!e || typeof e !== 'object' || KOPIE_ARTEN.indexOf(e.art) < 0) return false;
    try {
      var a = new URL(e.adresse);
      if (a.hash || a.search || a.href.indexOf(new URL(ORDNER[e.art], wurzel).href) !== 0) return false;
      if (e.grant != null) { var g = new URL(e.grant); if (g.hash || g.origin !== new URL(wurzel).origin) return false; }
      if (e.art === 'stelle') iri(e.stelle); else if (e.stelle != null) return false;
    } catch (_) { return false; }
    if (e.bis != null && (typeof e.bis !== 'number' || !isFinite(e.bis))) return false;
    return true;
  }
  function auswahl(e) { var k = {}; KOPIE_FELDER.forEach(function (f) { k[f] = e[f] === undefined ? null : e[f]; }); return k; }

  function kopieLesen(wurzel) {
    return A.podFetch(kopieAdresse(wurzel), { headers: { Accept: 'application/json' } }).then(function (r) {
      if (r.status === 404) return { liste: null, etag: null };
      if (!r.ok) throw new Error('kopie-lesen-' + r.status);
      var etag = r.headers.get('ETag');
      return r.json().then(function (j) {
        if (!j || !Array.isArray(j.ablagen)) throw new Error('kopie-form');
        return { liste: j.ablagen.filter(function (e) { return eintragGilt(e, wurzel); }).map(auswahl), etag: etag };
      });
    });
  }

  function kopieSchreiben(s, stand, liste) {
    var koerper;
    try {
      koerper = JSON.stringify({ fassung: 1, ablagen: liste.map(function (e) { if (!eintragGilt(e, s.wurzel)) throw new Error('kopie-eintrag'); return auswahl(e); }) });
    } catch (x) { return Promise.reject(x); }
    return ordnerBereit(s.wurzel, s.webid, 'intern').then(function () {
      var kopf = { 'Content-Type': 'application/json' };
      if (stand.etag) kopf['If-Match'] = stand.etag; else if (stand.liste === null) kopf['If-None-Match'] = '*';
      return A.podFetch(kopieAdresse(s.wurzel), { method: 'PUT', headers: kopf, body: koerper });
    }).then(function (r) {
      if (r.status === 412) return null;
      if (!r.ok) throw new Error('kopie-' + r.status);
      return { liste: liste, etag: r.headers.get('ETag') };
    });
  }

  /* Dieselbe Änderung auf die Kopie im Pod; bei 412 neu lesen und noch einmal, höchstens dreimal. */
  function kopieAendern(aendern) {
    var s = zielBestaetigt;
    var versuche = 0;
    function runde(stand) {
      return kopieSchreiben(s, stand, aendern(stand.liste || [])).then(function (neu) {
        if (neu) { kopie = neu; return neu.liste; }
        if (++versuche >= 3) throw new Error('kopie-konflikt');
        return kopieLesen(s.wurzel).then(runde);
      });
    }
    return (kopie ? Promise.resolve(kopie) : kopieLesen(s.wurzel)).then(runde);
  }

  /* Erst lokal, dann im Pod; danach trägt das lokale Verzeichnis den Stand der Kopie. */
  function verzeichnisAendern(aendern) {
    return verzeichnis().then(function (v) { return A.verzeichnis.schreiben(aendern(v)); }).then(function () {
      if (!zielBestaetigt) return;
      return kopieAendern(aendern).then(function (liste) { return A.verzeichnis.schreiben(liste); });
    });
  }

  function lokalBehalten(e) {
    return A.podFetch(e.adresse, { method: 'HEAD' }).then(function (r) {
      if (r.status === 200) return true;
      if (r.status === 404 || r.status === 410) return false;
      throw new Error('kopie-pruefen-' + r.status);
    });
  }

  /* Nach der Bestätigung: die Kopie lesen, nur lokale Einträge prüfen, beide auf denselben Stand bringen. */
  function kopieUebernehmen() {
    var s = zielBestaetigt;
    return Promise.all([kopieLesen(s.wurzel), verzeichnis()]).then(function (x) {
      var stand = x[0];
      var bekannt = (stand.liste || []).map(function (e) { return e.adresse; });
      var nurLokal = x[1].filter(function (e) { return bekannt.indexOf(e.adresse) < 0 && eintragGilt(e, s.wurzel); });
      return nurLokal.reduce(function (p, e) {
        return p.then(function (dazu) { return lokalBehalten(e).then(function (ja) { if (ja) dazu.push(auswahl(e)); return dazu; }); });
      }, Promise.resolve([])).then(function (dazu) {
        kopie = stand;
        if (!dazu.length) return stand.liste || [];
        return kopieAendern(function (liste) {
          var da = liste.map(function (e) { return e.adresse; });
          return liste.concat(dazu.filter(function (e) { return da.indexOf(e.adresse) < 0; }));
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

  function abgelaufeneLoeschen() {
    return verzeichnis().then(function (v) {
      var faellig = v.filter(function (e) { return e.bis && e.bis < Date.now(); });
      return faellig.reduce(function (p, e) { return p.then(function () { return zuruecknehmen(e.adresse); }); }, Promise.resolve())
        .then(function () { return faellig.length; });
    });
  }

  /* Abmelden löscht das lokale Verzeichnis (U2-ADR-512 Nr. 6); die Kopie im Pod bleibt. Ohne Kopie setzte die Brücke danach
     keinen Ablauf mehr durch und könnte nichts zurücknehmen (Befund POD-ABMELDEN-VERLIERT-ABLAGEN). Darum löscht sie vorher die
     abgelaufenen und fragt, wenn noch offene liegen. Ohne bestätigtes Ziel (etwa nach einem Neuladen)
     schreibt sie nichts in den Pod, fragt aber genauso; zurücknehmen kann sie dann nicht. Scheitert das Löschen der
     abgelaufenen, fragt sie ebenfalls, ohne Rücknahme. */
  function abmeldenLokal() {
    $('abmelden-pruefen').hidden = true;
    return A.abmelden().then(function (ergebnis) { document.body.dataset.abmeldung = ergebnis; return A.verzeichnis.loeschen(); })
      .then(function () { angemeldetZeigen(null); });
  }

  /* Mit Kopie im Pod (in dieser Sitzung gelesen oder geschrieben) kennt die Seite die Ablagen nach der nächsten Anmeldung wieder;
     ohne sie gilt der Satz aus Teil 1. */
  function rueckfrageZeigen(anzahl, mitRuecknahme, zusatz) {
    zeigen('abmelden-satz', 'In Ihrem Pod ' + (anzahl === 1 ? 'liegt noch eine Ablage' : 'liegen noch ' + anzahl + ' Ablagen') +
      ' aus dieser Seite. ' + (kopie
        ? 'Eine Liste davon liegt in Ihrem Pod, nur für Sie lesbar: Melden Sie sich wieder an und bestätigen Ihren Speicher, setzt' +
          ' die Seite die Ablaufdaten durch, und Sie können zurücknehmen.'
        : 'Nach dem Abmelden kennt die Seite sie nicht mehr: Ein Ablaufdatum wird dann nicht mehr durchgesetzt,' +
          ' und zurücknehmen können Sie sie nur noch bei Ihrem Pod-Anbieter.') + (zusatz ? ' ' + zusatz : ''));
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

  function verzeichnisZeigen() {
    return verzeichnis().then(function (v) {
      var ul = $('liste'); ul.textContent = '';
      v.forEach(function (e) {
        var li = document.createElement('li');
        li.textContent = e.art + ' · ' + e.adresse + (e.bis ? ' · gilt bis ' + new Date(e.bis).toLocaleDateString('de-DE') : '');
        var k = document.createElement('button'); k.type = 'button'; k.textContent = 'Zurücknehmen (für künftige Abrufe)';
        k.onclick = function () { zuruecknehmen(e.adresse).then(verzeichnisZeigen, function (x) { fehler(x.message); }); };
        li.appendChild(k); ul.appendChild(li);
      });
    });
  }

  function angemeldetZeigen(webid) {
    zeigen('wer', webid ? 'Angemeldet als ' + webid : 'Nicht angemeldet');
    $('anmelden-bereich').hidden = !!webid; $('ablage-bereich').hidden = true; $('ziel').hidden = true;
    if (!webid) { zielBestaetigt = null; kopie = null; return; }
    return speicherOrt(webid).then(function (wurzel) {
      if (zielBestaetigt && zielBestaetigt.webid === webid && zielBestaetigt.wurzel === wurzel) return zielGezeigt();
      zeigen('ziel-adresse', new URL('vivodepot/', wurzel).href);
      $('ziel').hidden = false;
      $('ziel-ja').onclick = function () { zielBestaetigt = { webid: webid, wurzel: wurzel }; $('ziel').hidden = true; zielGezeigt().catch(function (e) { fehler(e.message); }); };
    });
  }
  /* Erst nach der Bestätigung: die Kopie im Pod übernehmen, abgelaufene Ablagen löschen (ein Schreiben im Pod) und das
     Verzeichnis zeigen. Scheitert der Abgleich, bleibt alles, wie es war: kein bestätigtes Ziel, keine Ablage, kein Löschen. */
  function zielGezeigt() {
    $('ablage-bereich').hidden = false;
    return kopieUebernehmen().then(abgelaufeneLoeschen, function (e) {
      if (!/^kopie-/.test(e.message)) throw e;
      zielBestaetigt = null; kopie = null; $('ablage-bereich').hidden = true;
      throw new Error('Die Liste der Ablagen ließ sich nicht abgleichen. Nichts wurde geändert, abgelaufene Ablagen sind noch nicht gelöscht. Bitte öffnen Sie die Seite später erneut.');
    }).then(verzeichnisZeigen).then(bereitMelden);
  }

  /* ── Stufe 2: Übergabe aus der Anwendung per postMessage ──────────────────────────────────────────────────────────────────
     Angenommen werden nur die bekannten Herkünfte aus konfiguration.js und 'null'. Die Herkunft 'null' haben ein Kern vom Stick,
     aber ebenso jede sandbox- oder data:-Seite: darum sagt der Satz dann, dass die Herkunft nicht erkennbar ist, und warnt.
     Jede andere Herkunft hat keinen echten Aufrufer und wird verworfen. Je Laden der Seite ein Auftrag; ein zweiter wird
     verworfen, damit niemand den gezeigten Auftrag unter dem Klick tauscht. Nach `bis` (vom Kern, kurz vor seiner Frist) legt
     die Seite nicht mehr ab. Die Antwort geht an die Herkunft des Auftrags; bei 'null' bleibt nur '*': dann erfährt die
     öffnende Seite die Adresse (Grenze im Nachtrag zu U2-ADR-512). */
  var auftrag = null;
  var auftragGenommen = false;
  // Ein Klick so kurz nach dem Erscheinen des Auftrags gilt nicht: der Öffner bestimmt den Zeitpunkt, ein Doppelklick auf
  // „Ja, das ist mein Speicher“ soll nicht auf „Ablegen“ landen.
  var KLICK_SPERRE_MS = 800;
  var ID_MUSTER = /^[A-Za-z0-9_-]{22}$/;
  var NACHRICHT_FELDER = ['typ', 'fassung', 'id', 'art', 'bis', 'daten'];
  var WAS = {
    eigen: 'eine verschlüsselte Sicherung (nur für Sie lesbar)',
    link: 'eine verschlüsselte Datei als Freigabe-Link (für jeden lesbar, der den Link hat)',
    stelle: 'eine verschlüsselte Datei für eine Stelle (nur für die WebID lesbar, die Sie unten eintragen)'
  };
  function groesse(n) { return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB'; }

  function nachrichtAnnehmen(e) {
    var d = e.data;
    if (!window.opener || e.source !== window.opener) return;
    if (!zielBestaetigt || auftragGenommen) return;   // bereit meldet sich die Seite erst mit bestätigtem Ziel; ein Auftrag je Laden
    var bekannt = ((self.VD_POD_KONFIG && self.VD_POD_KONFIG.herkuenfte) || []).indexOf(e.origin) >= 0;
    if (!bekannt && e.origin !== 'null') return;
    if (!d || typeof d !== 'object' || d.typ !== 'vd-pod-ablegen' || d.fassung !== 1) return;
    if (Object.keys(d).some(function (k) { return NACHRICHT_FELDER.indexOf(k) < 0; })) return;
    if (!ID_MUSTER.test(d.id || '') || !WAS[d.art] || !(d.daten instanceof ArrayBuffer)) return;
    if (typeof d.bis !== 'number' || !isFinite(d.bis) || d.bis <= Date.now()) return;
    var text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(d.daten); } catch (_) { return; }
    if (!C.passtZurArt(text, d.art, d.daten.byteLength)) return;
    auftragGenommen = true;
    auftrag = { id: d.id, art: d.art, bis: d.bis, text: text, quelle: e.source, herkunft: e.origin, gezeigt: Date.now() };
    zeigen('auftrag-satz', (bekannt ? 'Vivodepot möchte ' : 'Eine Anwendung ohne erkennbare Herkunft (zum Beispiel Vivodepot vom Stick) möchte ') +
      WAS[d.art] + ' (' + groesse(d.daten.byteLength) + ') in Ihrem Pod ablegen.' +
      (bekannt ? '' : ' Haben Sie nicht gerade selbst in Vivodepot „Im Pod ablegen“ gewählt, legen Sie nichts ab.'));
    $('art').value = d.art; $('stelle-bereich').hidden = d.art !== 'stelle';
    $('auftrag').hidden = false;
  }

  function auftragAusfuehren() {
    if (!auftrag || Date.now() - auftrag.gezeigt < KLICK_SPERRE_MS) return;
    var a = auftrag; auftrag = null; $('auftrag').hidden = true;
    fehler(''); zeigen('ergebnis', '');
    if (Date.now() > a.bis) { fehler('auftrag-abgelaufen'); return; }
    ablegen(a.text, a.art, $('stelle').value, Number($('tage').value) || null, { zweck: $('zweck').value || null, inbox: $('inbox').value || null })
      .then(function (adresse) {
        zeigen('ergebnis', adresse);
        a.quelle.postMessage({ typ: 'vd-pod-abgelegt', fassung: 1, id: a.id, adresse: adresse }, a.herkunft === 'null' ? '*' : a.herkunft);
        return verzeichnisZeigen();
      })
      .catch(function (x) { fehler(x.message); });
  }

  function bereitMelden() {
    // Erst nach Anmeldung und bestätigtem Ziel: eine Anmeldung verlässt die Seite, ein Auftrag ginge dabei verloren.
    if (window.opener && zielBestaetigt) window.opener.postMessage({ typ: 'vd-pod-bereit', fassung: 1 }, '*');
  }

  function start() {
    window.addEventListener('message', nachrichtAnnehmen);
    $('auftrag-ja').onclick = auftragAusfuehren;
    $('auftrag-nein').onclick = function () { auftrag = null; $('auftrag').hidden = true; };
    $('ziel-nein').onclick = abmeldenPruefen;
    $('anmelden').onclick = function () { fehler(''); A.anmelden($('aussteller').value).catch(function (e) { fehler(e.message); }); };
    $('abmelden').onclick = abmeldenPruefen;
    $('abmelden-alle').onclick = alleZuruecknehmenUndAbmelden;
    $('abmelden-lassen').onclick = abmeldenLokal;
    $('abmelden-abbrechen').onclick = function () { $('abmelden-pruefen').hidden = true; };
    $('art').onchange = function () { $('stelle-bereich').hidden = $('art').value !== 'stelle'; };
    $('ablegen').onclick = function () {
      fehler(''); zeigen('ergebnis', '');
      var f = $('datei').files[0]; if (!f) { fehler('keine-datei'); return; }
      f.text().then(function (t) { return ablegen(t, $('art').value, $('stelle').value, Number($('tage').value) || null, { zweck: $('zweck').value || null, inbox: $('inbox').value || null }); })
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

  self.vdPodBruecke = { ablegen: ablegen, abholen: abholen, zuruecknehmen: zuruecknehmen, verzeichnis: verzeichnis, nachrichtAnnehmen: nachrichtAnnehmen };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
