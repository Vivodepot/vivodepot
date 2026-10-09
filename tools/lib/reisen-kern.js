'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Reisen-Kern — reine Bausteine für den UX-Reisen-Läufer
   ────────────────────────────────────────────────────────────────────────────
   Grundlage: „UX-Reisen automatisch protokollieren" (26.07.2026).
   Automatisiert wird die Reise FAHREN und FESTHALTEN, was zu sehen ist — nie
   die vier Fragen des Cognitive-Walkthrough-Standards. Ein Protokoll, kein
   Urteil.

   Hier liegt reine Logik, damit sie ohne Browser geprüft werden kann:
     · erfasseZustandBrowser  — läuft IM Browser (seite.evaluate), liest den
       sichtbaren Zustand: Überschrift, Hinweistexte, Aktionen mit
       Beschriftung, Rückweg. Wortlaut, nicht Selektor (§2 des Auftrags) —
       jede Zeile ist Text, den eine Bürgerin auch sähe.
     · trefferflaechenPruefen — eigener Schritt, NICHT Teil von
       erfasseZustandBrowser. Der Auftrag nennt „Trefferfläche unter 44px" —
       das ist die 2.5.5-AAA-Zahl. Tatsächlich im ganzen Bestand durchgesetzt
       ist WCAG 2.5.8 AA, 24px (`tools/lib/trefferflaechen.js`, gemessen und
       mit eigener Probe belegt). Eine eigene 44px-Schwelle hier hätte bei
       jedem Lauf Dutzende bereits akzeptierter 24px-Elemente gemeldet
       (gemessen 02.08.: allein „Als sensibel markieren" 24×24px über zehn
       Reisen-Schritte) — ein Detektor, der auf fast jeder Sicht anschlägt,
       ist von einem, der nichts findet, nicht zu unterscheiden. Also dieselbe
       geprüfte Regel wiederverwendet statt eine dritte, abweichende erfunden.
     · ermittleRueckmeldung   — vergleicht Zustand vor/nach einer Aktion,
       reine Funktion, kein DOM.
     · harteFundeAusZustand   — Sackgasse / Aktion ohne Rückmeldung /
       Trefferfläche <24px — Tatsachen, die ohne Grundlinie rot werden dürfen
       (Auftrag §4).
     · vergleicheProtokolle   — Grundlinien-Diff. Ein Unterschied ist rot, bis
       ein Mensch die neue Grundlinie ausdrücklich übernimmt (Auftrag §3).
     · dateiExportPruefen     — Gegenstück zu erfasseZustandBrowser für Schritte,
       die keinen DOM-Zustand hinterlassen, sondern eine heruntergeladene Datei
       (z. B. die Notfallkarte als PDF, `flowNotfallkartePdf`). Wortlaut aus der
       Datei, dieselbe Grundlinien-Logik — s. Kopfkommentar dort, warum ein
       generisches Datums-Muster hier NICHT geht (Geburtsdatum auf derselben
       Karte hat dieselbe Ziffernform wie das flüchtige Erstelldatum).

   KEINE ZEITSTEMPEL, KEINE FLÜCHTIGEN IDs — weder hier noch im Protokoll, das
   diese Funktionen erzeugen. Ein Feld wie `Date.now()` im Protokoll würde
   jeden Lauf gegen die Grundlinie rot machen, unabhängig vom Zustand der App
   — der Unterschied wäre dann Rauschen, kein Befund (Auftrag §2).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const { erheben: trefferflaechenErheben, PFLICHT_PX } = require('./trefferflaechen.js');

/* Läuft AUSSCHLIESSLICH im Browser-Kontext (seite.evaluate(erfasseZustandBrowser)).
   Keine Closure über äußere Variablen — Playwright serialisiert die Funktion. */
function erfasseZustandBrowser() {
  const sichtbar = (e) => {
    if (!e || !e.getBoundingClientRect) return false;
    if (e.closest && e.closest('[inert]')) return false;   // z. B. #content, solange der Welcome-Dialog steht
    const c = getComputedStyle(e);
    const b = e.getBoundingClientRect();
    return c.display !== 'none' && c.visibility !== 'hidden' && b.width > 0 && b.height > 0;
  };
  const text = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim();

  // Ein offener Dialog ist, was die Bürgerin gerade sieht — er hat Vorrang vor dem Hintergrund.
  // Vor dem Eintritt in die App ist #content mit `inert` stillgelegt (s. o.) und der
  // Welcome-Dialog (#overlay/#overlay-inhalt) trägt Landing/Anlass-Auswahl — ohne diesen
  // dritten Fall läse die Erfassung dort einen leeren, stillgelegten Baum als „keine Aktionen".
  const modalOffen = document.querySelector('#modal-rueck.an');
  const overlayEl = document.getElementById('overlay-inhalt');
  const overlayAktiv = !modalOffen && overlayEl && sichtbar(overlayEl) && overlayEl.children.length > 0;
  const wurzel = modalOffen
    ? (document.getElementById('modal-inhalt') || document.body)
    : overlayAktiv
      ? overlayEl
      : (document.getElementById('content') || document.body);

  const ueberschrift = (() => {
    if (modalOffen) {
      const t = document.getElementById('modal-titel');
      if (t && text(t)) return text(t);
    }
    const h1 = wurzel.querySelector('h1');
    if (h1 && sichtbar(h1) && text(h1)) return text(h1);
    const h2 = wurzel.querySelector('h2, h3');
    if (h2 && sichtbar(h2) && text(h2)) return text(h2);
    return '';
  })();

  // Hinweistexte: sichtbare Absätze/Hinweis-Blöcke im aktuellen Wurzel-Container, PLUS
  // Feld-Label/-Wert (`.feld-label`, `.feld-wert` — der gemeinsame Renderer `feldZeileHTML`,
  // vivodepot.html, trägt beide in jeder Feld-Zeile, ob Sektor-Ansicht, Notfall-Sicht,
  // Cross-Sektor-Referenz oder Situationsblatt). Ohne diese zwei Klassen blieb die gesamte
  // Notfall-Sicht (`renderNotfall`, `.feld-zeile`-Markup) für die Erfassung unsichtbar — Befund
  // Produktverantwortung, 03.08.2026, gegen `S7-notfall-sicht-oeffnen` im Reise-2-Protokoll geprüft: `hinweise`
  // trug dort nur die zwei statischen Erklärsätze, kein einziges Feld-Label/-Wert. DOM-Reihenfolge
  // ist die feste Reihenfolge — keine Sortierung nach Inhalt, Label steht vor Wert wie im Markup.
  const hinweisKandidaten = [...wurzel.querySelectorAll(
    'p, .hinweis, .modal-warnung, .feld-hint, [role="note"], .feld-label, .feld-wert'
  )];
  const hinweise = [];
  const hinweiseGesehen = new Set();
  for (const e of hinweisKandidaten) {
    if (!sichtbar(e)) continue;
    // Im Eingabe-Modus trägt `.feld-wert` ein echtes Formularelement (feldInputHTML), kein
    // Klartext — dessen textContent wäre bei <select> die aneinandergeklebten Options-Label
    // (Muster ohne Trennzeichen, z. B. „0 +0 −A +A −…"), keine Aussage über den Zustand. Das
    // Eingabefeld selbst wird schon als Aktion erfasst (aktionsKnoten, unten) — hier nur der
    // echte Anzeige-Fall (Notfall-Sicht, Cross-Sektor-Referenz, Situationsblatt).
    if (e.matches('.feld-wert') && e.querySelector('input, select, textarea, button')) continue;
    const t = text(e);
    if (!t || hinweiseGesehen.has(t)) continue;
    hinweiseGesehen.add(t);
    hinweise.push(t);
  }

  // Aktionen: sichtbare Buttons/Links im Wurzel-Container, mit ihrer Beschriftung —
  // niemals nur ihr Selektor. Eine Aktion ohne lesbaren Text wäre für eine Bürgerin
  // ohnehin keine Aktion, sondern eine Falle.
  const aktionsKnoten = [...wurzel.querySelectorAll('button, a[href], [role="button"]')].filter(sichtbar);
  const aktionen = [];
  for (const e of aktionsKnoten) {
    const beschriftung = text(e) || (e.getAttribute('aria-label') || '').trim();
    if (!beschriftung) continue;
    const deaktiviert = !!e.disabled || e.getAttribute('aria-disabled') === 'true';
    aktionen.push(deaktiviert ? beschriftung + ' (deaktiviert)' : beschriftung);
  }

  const rueckwegMuster = /zurück|abbrechen|später|schließen|abbruch|verwerfen/i;
  const rueckwegVorhanden = aktionen.some((a) => !/\(deaktiviert\)$/.test(a) && rueckwegMuster.test(a));

  return { ueberschrift, hinweise, aktionen, rueckwegVorhanden };
}

/* Trefferflächen — eigener Aufruf, eigener Erhebungsraum (der offene Dialog, sonst
   #content), dieselbe geprüfte Regel wie der Rest des Bestands (s. Kopfkommentar). */
async function trefferflaechenPruefen(seite) {
  const raum = await seite.evaluate(() => (document.querySelector('#modal-rueck.an') ? '#modal-inhalt *' : '#content *'));
  const r = await seite.evaluate(trefferflaechenErheben, { mindest: PFLICHT_PX, raum });
  return (r.zuKlein || []).map((k) => ({ text: (k.text || '').slice(0, 30), w: Math.round(k.breite), h: Math.round(k.hoehe) }));
}

/* Feedback-Schnappschuss — separat und knapp, weil er VOR und NACH einer Aktion
   gebraucht wird (der Unterschied IST die Rückmeldung), nicht nur einmal danach. */
function feedbackSchnappschussBrowser() {
  const modal = document.querySelector('#modal-rueck.an');
  const titelEl = modal ? document.getElementById('modal-titel') : null;
  const toastHost = document.getElementById('toast-host');
  // Auftrag Sektorfeld-Autosave-Rückmeldung (03.08.2026): das Inline-Häkchen selbst ist
  // `aria-hidden` (rein visuell, bewusst kein zweiter Kanal) — die geprüfbare Rückmeldung läuft
  // über die entprellte aria-live-Ansage (#autosave-live). Wer diesen Schritt fährt, braucht ein
  // `wartenMs` über der 600ms-Entprell-Schwelle (reisen-registry.js), sonst wird vor der Ansage
  // gemessen und die echte Rückmeldung als „keine" verkannt.
  const autosaveLive = document.getElementById('autosave-live');
  // CI-Flake-Befund (03.08.2026): `ui.toast()` haengt jeden Toast 3200ms lang in #toast-host
  // (vivodepot.html:15206-15213, eigener setTimeout je Toast) — mehrere Toasts aus VERSCHIEDENEN,
  // zeitlich auseinanderliegenden Schritten koennen darum GLEICHZEITIG im DOM stehen (Reise 4,
  // S6 „Sub-Depot angelegt" + S7 „Sub-Depot fuer diese Sitzung geoeffnet" leben parallel).
  // `toastText` (Konkatenation via `.textContent`) aendert sich darum auch dann, wenn NUR ein
  // AELTERER, unabhaengiger Toast von selbst verschwindet — kein neues Feedback, nur das Ende
  // eines alten. Unter CI-Last (langsamere Krypto-Ableitung in S6/S7 vor Playwrights `wartenMs`)
  // fiel das reale Zeitfenster einmal so, dass genau das zwischen S10s vor/nach-Schnappschuss
  // passierte — `ermittleRueckmeldung` meldete den NOCH lebenden S7-Toast faelschlich als neue
  // Rueckmeldung des S10-Autosaves. Lokal (schnelle, gleichfoermige Ausfuehrung) bleiben beide
  // Toasts ueber das ganze Fenster hinweg unveraendert stehen — das Fenster fuer den Fund existiert
  // dort praktisch nie, daher lokal reproduzierbar gruen, in CI beobachtet rot.
  // `toastTexte` (Array, ein Eintrag je einzelnem Toast-Element) macht die Erkennung robust
  // GEGEN das Verschwinden eines Toasts — nur ein NEU HINZUGEKOMMENER Text zaehlt als Rueckmeldung
  // (s. `ermittleRueckmeldung`). `toastText` bleibt zusaetzlich stehen (unveraendert, falls es
  // anderswo gelesen wird) — reine Ergaenzung, kein Bruch.
  const toastTexte = toastHost
    ? [...toastHost.children].map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    : [];
  return {
    modalOffen: !!modal,
    modalTitel: titelEl ? (titelEl.textContent || '').replace(/\s+/g, ' ').trim() : '',
    toastText: toastHost ? (toastHost.textContent || '').replace(/\s+/g, ' ').trim() : '',
    toastTexte,
    autosaveLiveText: autosaveLive ? (autosaveLive.textContent || '').replace(/\s+/g, ' ').trim() : '',
  };
}

/* Reine Funktion: vor/nach → was hat sich als Rückmeldung gezeigt, oder null.
   Ein Toast-Text, der VORHER schon dastand, ist keine neue Rückmeldung — das
   Vorher/Nachher-Paar ist der Punkt, nicht der bloße Fund eines Toasts. Dieselbe
   Grenze gilt jetzt auch für `autosaveLiveText`: zwei aufeinanderfolgende Autosaves mit
   IDENTISCHEM Ansage-Text (bei uns immer „Gespeichert", s. STRINGS.feldAutosaveAnsage) sind
   von hier aus nicht auseinanderzuhalten — dieselbe, seit dem Toast-Vergleich bestehende
   Eigenschaft dieses Mechanismus, kein neues Problem.

   Toast-Erkennung über `toastTexte` (Array), NICHT über die Konkatenation `toastText` (CI-Flake-
   Befund 03.08.2026, s. feedbackSchnappschussBrowser). Zählung pro Text, NICHT Mengendifferenz
   (`.includes()`) — zweiter Fund 03.08.2026, blinde Stelle des ersten Fixes: löst ein Schritt einen
   Toast aus, dessen Text schon von einem noch lebenden ÄLTEREN Toast belegt ist (z. B. zweimal
   „Gespeichert" kurz hintereinander, der erste noch nicht abgelaufen), stand dieser Text bereits in
   `vor` — `.includes()` hätte die echte neue Rückmeldung als „keine" gemeldet. Jetzt: `vor` wird zu
   einer Text→Anzahl-Zählung, jeder Text in `nach` verbraucht zuerst ein passendes Vorkommen aus `vor`
   (Reihenfolge irrelevant); bleibt nach dem Verbrauch ein Text übrig, ist GENAU DIESES Vorkommen neu.
   Kommt „Gespeichert" in `nach` zweimal und in `vor` einmal vor, ist eines der beiden neu — das
   andere deckt sich mit dem noch lebenden alten Toast. Das Verschwinden eines anderen, unabhängigen
   Toasts zwischen vor und nach ändert an dieser Zählung nichts. ALLE neuen Texte werden
   zusammengefügt (nicht nur der erste) — ein Schritt, der selbst zwei echte Toasts hintereinander
   auslöst (z. B. Reise 3s S10 „Datei gespeichert" + „Vertrauens-Zugang gesetzt", beide synchron
   innerhalb derselben Aktion), darf beide melden, genau wie vor diesem Fix. `vorToasts`/`nachToasts`
   fallen auf `toastText` zurück (als Ein-Element-Array), falls `toastTexte` fehlt — ältere/
   synthetische Aufrufer (Proben unten) bleiben unverändert gültig. */
function ermittleRueckmeldung(vor, nach) {
  if (!vor || !nach) return null;
  const vorToasts = vor.toastTexte || (vor.toastText ? [vor.toastText] : []);
  const nachToasts = nach.toastTexte || (nach.toastText ? [nach.toastText] : []);
  const vorRest = new Map();
  for (const t of vorToasts) vorRest.set(t, (vorRest.get(t) || 0) + 1);
  const neueToasts = [];
  for (const t of nachToasts) {
    if (!t) continue;
    const rest = vorRest.get(t) || 0;
    if (rest > 0) {
      vorRest.set(t, rest - 1);
      continue;
    }
    neueToasts.push(t);
  }
  if (neueToasts.length) return 'Meldung: „' + neueToasts.join('') + '"';
  if (nach.modalOffen && (!vor.modalOffen || nach.modalTitel !== vor.modalTitel)) {
    return 'Dialog: „' + nach.modalTitel + '"';
  }
  if (vor.modalOffen && !nach.modalOffen) return 'Dialog geschlossen';
  if (nach.autosaveLiveText && nach.autosaveLiveText !== vor.autosaveLiveText) {
    return 'Angesagt: „' + nach.autosaveLiveText + '"';
  }
  return null;
}

/* Harte Prüfungen (Auftrag §4) — dürfen ohne Grundlinie rot werden, weil sie
   Tatsachen sind, kein Urteil über einen fremden Kopf.
   `schritt` trägt mindestens { id, titel, veraendernd, geraetepunkt }. */
function harteFundeAusZustand(schritt, zustand, rueckmeldung, trefferflaechenZuKlein) {
  const funde = [];
  if (!schritt || schritt.geraetepunkt || !zustand) return funde;

  if (zustand.aktionen.length === 0 && !zustand.rueckwegVorhanden) {
    funde.push({
      art: 'sackgasse', schritt: schritt.id,
      text: 'Schritt „' + schritt.titel + '": kein Weg vorwärts und kein Weg zurück.',
    });
  }
  if (schritt.veraendernd && !rueckmeldung) {
    funde.push({
      art: 'ohne-rueckmeldung', schritt: schritt.id,
      text: 'Schritt „' + schritt.titel + '": verändernde Aktion ohne sichtbare Rückmeldung.',
    });
  }
  for (const k of (trefferflaechenZuKlein || [])) {
    funde.push({
      art: 'trefferflaeche', schritt: schritt.id,
      text: 'Schritt „' + schritt.titel + '": „' + k.text + '" ' + k.w + '×' + k.h + 'px unter ' + PFLICHT_PX + 'px.',
    });
  }
  return funde;
}

/* Grundlinien-Diff — vergleicht zwei Protokolle (dieselbe Form wie ein
   erzeugtes Protokoll: { reiseId, persona, ziel, viewport, schritte: [...] }).
   Ein Unterschied in IRGENDEINEM festgehaltenen Feld ist rot; welches, wird
   benannt, damit ein Mensch hinsehen kann, statt nur „irgendwas anders". */
function vergleicheProtokolle(basis, neu) {
  const unterschiede = [];
  if (!basis || !neu) {
    return { gleich: false, unterschiede: ['Grundlinie oder neuer Lauf fehlt.'] };
  }
  const basisSchritte = basis.schritte || [];
  const neuSchritte = neu.schritte || [];
  const alleIds = [...new Set([...basisSchritte.map((s) => s.id), ...neuSchritte.map((s) => s.id)])];
  for (const id of alleIds) {
    const b = basisSchritte.find((s) => s.id === id);
    const n = neuSchritte.find((s) => s.id === id);
    if (!b) { unterschiede.push('Schritt „' + id + '": neu hinzugekommen.'); continue; }
    if (!n) { unterschiede.push('Schritt „' + id + '": in der Grundlinie, im neuen Lauf nicht mehr erreicht.'); continue; }
    for (const feld of ['ueberschrift', 'geraetepunkt', 'rueckmeldung', 'rueckwegVorhanden', 'dateiExport']) {
      if (JSON.stringify(b[feld] ?? null) !== JSON.stringify(n[feld] ?? null)) {
        unterschiede.push('Schritt „' + id + '", Feld „' + feld + '": „' + JSON.stringify(b[feld] ?? null) +
          '" → „' + JSON.stringify(n[feld] ?? null) + '"');
      }
    }
    for (const feld of ['hinweise', 'aktionen']) {
      const bv = b[feld] || [], nv = n[feld] || [];
      if (JSON.stringify(bv) !== JSON.stringify(nv)) {
        unterschiede.push('Schritt „' + id + '", Feld „' + feld + '": ' + JSON.stringify(bv) + ' → ' + JSON.stringify(nv));
      }
    }
  }
  return { gleich: unterschiede.length === 0, unterschiede };
}

/* ── Datei-Export-Schritte (z. B. Notfallkarte als PDF) — eigener Prüfmechanismus ──
   `flowNotfallkartePdf` hinterlässt keinen neuen DOM-Zustand, den erfasseZustandBrowser
   fassen könnte — der Ertrag ist eine heruntergeladene Datei. Playwright fängt sie über
   ein `download`-Ereignis, das GLEICHZEITIG mit dem Klick laufen muss (reiseAusfuehren
   startet beide mit Promise.all), nicht danach — der Download läuft synchron im Klick.

   Empirisch geprüft (03.08.2026, echter Lauf gegen #n-karte): jsPDF schreibt den
   Karteninhalt hier UNKOMPRIMIERT in den Content-Stream — jede gezeichnete Zeile steht
   wortwörtlich als `(Text) Tj`-Operator in der Datei. Das ist der Wortlaut-Anschluss ans
   DOM-Protokoll (Auftrag §2): kein `pdf-parse`/`pdfjs` nötig, ein schlanker Tj-Extraktor
   reicht. Bricht sichtbar (leere textZeilen), falls jsPDF je auf komprimierte Streams
   umstellt — dieselbe Kopplungs-Art wie tools/lib/druck-messen.js ans Print-CSS.

   Nachtrag (27.08.2026, PDF-Inter-Font): genau das vorhergesagte „bricht sichtbar" trat
   ein — nicht durch Kompression, sondern durch eingebettetes Inter (`pdfInterEinrichten`,
   `doc.addFont`). Ein eingebetteter TrueType-Font läuft in jsPDF als Type0/Identity-H-
   Composite-Font: derselbe Text steht jetzt als `<hexCIDs> Tj` (2-Byte-Glyph-IDs), nicht
   mehr als lesbarer literal `(Text) Tj`-String — Standard-PDF-Verhalten (dasselbe, was
   `pdftotext`/Bildschirmleser über die mitgelieferte `/ToUnicode`-CMap auflösen; ECHTE
   Prüfung mit `pdftotext` bestätigt: der Text bleibt vollständig extrahierbar, keine
   Barrierefreiheits-Regression). Der Extraktor hier bekommt darum einen zweiten Zweig:
   findet er hex-codierte Tj-Strings, löst er sie über dieselbe `/ToUnicode`-CMap auf, die
   jsPDF für jeden eingebetteten Font mitschreibt (bfchar/bfrange, CIDSystemInfo
   Adobe-Identity-UCS) — keine externe PDF-Bibliothek, derselbe schlanke Grundsatz wie zuvor. */
function pdfToUnicodeMapAuslesen(text) {
  // Alle CMap-Blöcke im Dokument einsammeln (Regular+Bold tragen je einen eigenen) — für den
  // Zweck hier (Text wiederfinden, nicht Font-Identität) reicht eine gemeinsame, gemergte Map.
  const map = new Map();
  const bfcharRe = /beginbfchar([\s\S]*?)endbfchar/g;
  let block;
  while ((block = bfcharRe.exec(text))) {
    const paarRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let paar;
    while ((paar = paarRe.exec(block[1]))) {
      map.set(paar[1].toLowerCase().padStart(4, '0'), parseInt(paar[2].slice(0, 4), 16));
    }
  }
  const bfrangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((block = bfrangeRe.exec(text))) {
    // Zwei Formen: `<start> <end> <zielStart>` (fortlaufend) oder `<start> <end> [<u1> <u2> …]`
    // (Einzelwerte je Codepunkt) — jsPDFs eigene Subsets nutzen bislang die erste Form,
    // beide werden unterstützt, damit der Extraktor nicht an einem künftigen Subset zerbricht.
    const einzelRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([^\]]*)\]/g;
    const bereichRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let m;
    const abgedeckt = new Set();
    while ((m = einzelRe.exec(block[1]))) {
      abgedeckt.add(m.index);
      const start = parseInt(m[1], 16);
      const werte = [...m[3].matchAll(/<([0-9A-Fa-f]+)>/g)].map((w) => parseInt(w[1].slice(0, 4), 16));
      werte.forEach((u, i) => map.set((start + i).toString(16).padStart(4, '0'), u));
    }
    while ((m = bereichRe.exec(block[1]))) {
      if (abgedeckt.has(m.index)) continue;   // von der Einzelwert-Form oben bereits erfasst
      const start = parseInt(m[1], 16), ende = parseInt(m[2], 16), zielStart = parseInt(m[3], 16);
      for (let cid = start; cid <= ende; cid++) map.set(cid.toString(16).padStart(4, '0'), zielStart + (cid - start));
    }
  }
  return map;
}
function pdfHexTjTexteAuslesen(text, unicodeMap) {
  if (!unicodeMap.size) return [];
  const re = /<([0-9A-Fa-f]+)>\s*Tj/g;
  const zeilen = [];
  let treffer;
  while ((treffer = re.exec(text))) {
    const hex = treffer[1];
    let zeile = '';
    for (let i = 0; i + 4 <= hex.length; i += 4) {
      const cid = hex.slice(i, i + 4).toLowerCase();
      const cp = unicodeMap.get(cid);
      if (cp != null) zeile += String.fromCodePoint(cp);
    }
    if (zeile) zeilen.push(zeile);
  }
  return zeilen;
}
function pdfTjTexteAuslesen(puffer) {
  if (!puffer) return [];
  const text = Buffer.isBuffer(puffer) ? puffer.toString('latin1') : String(puffer);
  const re = /\(((?:\\.|[^()\\])*)\)\s*Tj/g;
  const zeilen = [];
  let treffer;
  while ((treffer = re.exec(text))) {
    zeilen.push(treffer[1].replace(/\\(.)/g, '$1'));   // PDF-String-Escapes auflösen: \( \) \\
  }
  if (zeilen.length) return zeilen;   // klassischer, literal codierter Font — unverändertes Verhalten
  // Kein literal Tj gefunden — vermutlich ein eingebetteter Composite-Font (Inter): über die
  // /ToUnicode-CMap auflösen, statt fälschlich „leer" zu melden.
  return pdfHexTjTexteAuslesen(text, pdfToUnicodeMapAuslesen(text));
}

/* Maskiert NUR exakt bekannte flüchtige Werte (z. B. das heutige Datum aus
   notfallKartenMeta()) — bewusst KEIN Datums-MUSTER. Ein Muster wie /\d{2}\.\d{2}\.\d{4}/
   träfe auch ein echtes Geburtsdatum auf derselben Karte (dieselbe TT.MM.JJJJ-Form,
   _datumDeutsch) und würde eine echte Textänderung dort unsichtbar gegen die Grundlinie
   machen — genau das Gegenteil vom Zweck des Diffs. Der Aufrufer muss den flüchtigen Wert
   selbst kennen (z. B. `seite.evaluate(() => notfallKartenMeta().datum)` im selben Schritt),
   statt ihn hinterher zu erraten. */
function maskiereFluechtigeWerte(zeilen, fluechtigeWerte) {
  const werte = (fluechtigeWerte || []).filter((w) => typeof w === 'string' && w.length > 0);
  if (!werte.length) return zeilen;
  return zeilen.map((z) => werte.reduce((acc, w) => acc.split(w).join('<FLUECHTIG>'), z));
}

/* Harte Tatsachen + grundlinien-würdiger Wortlaut EINES Datei-Exports — Gegenstück zu
   erfasseZustandBrowser/trefferflaechenPruefen für Schritte ohne DOM-Ertrag. */
function dateiExportPruefen({ dateiname, puffer, dateinameMuster, mindestBytes, fluechtigeWerte }) {
  const heruntergeladen = !!puffer;
  const dateinameOk = !dateinameMuster || dateinameMuster.test(dateiname || '');
  const magiePdf = heruntergeladen && puffer.slice(0, 5).toString('latin1') === '%PDF-';
  const groesseBytes = heruntergeladen ? puffer.length : 0;
  const groesseOk = heruntergeladen && groesseBytes >= (mindestBytes || 0);
  const rohZeilen = heruntergeladen ? pdfTjTexteAuslesen(puffer) : [];
  const textZeilen = maskiereFluechtigeWerte(rohZeilen, fluechtigeWerte);
  return { heruntergeladen, dateiname: dateiname || null, dateinameOk, magiePdf, groesseBytes, groesseOk, textZeilen };
}

/* Harte Funde (Auftrag §4-Analogie) — Tatsachen über den Datei-Export, dürfen ohne
   Grundlinie rot werden, wie harteFundeAusZustand für den DOM-Fall. */
function harteFundeAusDateiExport(schritt, befund) {
  const funde = [];
  if (!befund || !befund.heruntergeladen) {
    funde.push({
      art: 'datei-export-fehlt', schritt: schritt.id,
      text: 'Schritt „' + schritt.titel + '": kein Datei-Download ausgelöst.',
    });
    return funde;
  }
  if (!befund.dateinameOk) {
    funde.push({
      art: 'datei-export-name', schritt: schritt.id,
      text: 'Schritt „' + schritt.titel + '": Dateiname „' + befund.dateiname + '" passt nicht zum erwarteten Muster.',
    });
  }
  if (!befund.magiePdf) {
    funde.push({
      art: 'datei-export-format', schritt: schritt.id,
      text: 'Schritt „' + schritt.titel + '": keine gültige PDF-Kennung (%PDF-) am Dateianfang.',
    });
  }
  if (!befund.groesseOk) {
    funde.push({
      art: 'datei-export-groesse', schritt: schritt.id,
      text: 'Schritt „' + schritt.titel + '": Datei kleiner als erwartet (' + befund.groesseBytes + ' Bytes) — vermutlich leer oder kaputt.',
    });
  }
  return funde;
}

/* Eine Reise fahren — der eigentliche Läufer. `seite` ist bereits geöffnet
   (Playwright Page), `reise` ein Eintrag aus tools/reisen-registry.js.
   `opts.bisSchrittId` bricht NACH dem genannten Schritt ab (für Proben, die
   nicht die ganze Reise brauchen — z. B. nicht bis zur teuren PBKDF2-Ableitung
   beim echten Anlegen). `opts.htmlUrl` wird an Schritte gereicht, die
   navigieren (Schritt 0). Gerätepunkte werden benannt abgebrochen, nicht
   still übersprungen (Auftrag §5) — der Rest der Reise läuft weiter. */
async function reiseAusfuehren(seite, reise, opts = {}) {
  const wartenStandard = opts.wartenMs || 350;
  const schritte = [];
  const harteFunde = [];
  for (const schritt of reise.schritte) {
    if (schritt.geraetepunkt) {
      schritte.push({
        id: schritt.id, titel: schritt.titel, ueberschrift: null, hinweise: [], aktionen: [],
        rueckmeldung: null, rueckwegVorhanden: null, geraetepunkt: schritt.geraetepunkt.grund, dateiExport: null,
      });
    } else if (schritt.dateiExport) {
      // Kein DOM-Ertrag hier (s. Kopfkommentar bei dateiExportPruefen) — das `download`-Ereignis
      // muss MIT dem Klick starten (Promise.all), nicht danach, sonst läuft es am Klick vorbei.
      const de = schritt.dateiExport;
      const [download] = await Promise.all([
        seite.waitForEvent('download'),
        de.aktion(seite, opts.htmlUrl),
      ]);
      const pfad = await download.path();
      const puffer = pfad ? fs.readFileSync(pfad) : null;
      const fluechtigeWerte = de.bekannteFluechtigeWerte ? await de.bekannteFluechtigeWerte(seite) : [];
      const befund = dateiExportPruefen({
        dateiname: download.suggestedFilename(),
        puffer,
        dateinameMuster: de.dateinameMuster,
        mindestBytes: de.mindestBytes,
        fluechtigeWerte,
      });
      schritte.push({
        id: schritt.id, titel: schritt.titel, ueberschrift: null, hinweise: [], aktionen: [],
        rueckmeldung: null, rueckwegVorhanden: null, geraetepunkt: null,
        dateiExport: { dateiname: befund.dateiname, textZeilen: befund.textZeilen },
      });
      harteFunde.push(...harteFundeAusDateiExport(schritt, befund));
    } else {
      const vor = await seite.evaluate(feedbackSchnappschussBrowser);
      await schritt.aktion(seite, opts.htmlUrl);
      await seite.waitForTimeout(schritt.wartenMs || wartenStandard);
      const zustand = await seite.evaluate(erfasseZustandBrowser);
      const nach = await seite.evaluate(feedbackSchnappschussBrowser);
      const rueckmeldung = ermittleRueckmeldung(vor, nach);
      const zuKlein = await trefferflaechenPruefen(seite);
      schritte.push({
        id: schritt.id, titel: schritt.titel, ueberschrift: zustand.ueberschrift, hinweise: zustand.hinweise,
        aktionen: zustand.aktionen, rueckmeldung, rueckwegVorhanden: zustand.rueckwegVorhanden, geraetepunkt: null,
        dateiExport: null,
      });
      harteFunde.push(...harteFundeAusZustand(schritt, zustand, rueckmeldung, zuKlein));
    }
    if (opts.bisSchrittId && schritt.id === opts.bisSchrittId) break;
  }
  const protokoll = { reiseId: reise.id, persona: reise.persona, ziel: reise.ziel, viewport: reise.viewport, schritte };
  return { protokoll, harteFunde };
}

module.exports = {
  erfasseZustandBrowser,
  trefferflaechenPruefen,
  feedbackSchnappschussBrowser,
  ermittleRueckmeldung,
  harteFundeAusZustand,
  vergleicheProtokolle,
  pdfTjTexteAuslesen,
  maskiereFluechtigeWerte,
  dateiExportPruefen,
  harteFundeAusDateiExport,
  reiseAusfuehren,
};
