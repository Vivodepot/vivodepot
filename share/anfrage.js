'use strict';
/* Die Abholseite für Anfragen und Vorlagen (anfrage.html), Befund QR-ABHOLSEITE-ANFRAGE-FEHLT, 16.11.2026.
   Kein Netzaufruf: der Inhalt steckt im Teil hinter dem Gatter der Adresse und verlässt diese Seite nie.
   - `#anfrage=…` (Umschlag als base64url oder kompakt mit `z1.`): Weiterleitung auf die App der Sprache, derselbe Teil hinter dem Gatter.
   - `#vorlage=…` (base64url(deflate-raw(JSON)); oder nur die Kennung als base64url(JSON)): im Browser entpackt, lesbar gezeigt,
     als Datei speicherbar.
   Fremde Werte gehen nur über textContent in die Seite, nie über innerHTML. Die reinen Funktionen sind ohne Seite prüfbar
   (tests/qr-abholseite-quelle.test.js). */

const ANFRAGE_ZIELE = Object.freeze({ de: 'https://privat-de.vivodepot.org/', en: 'https://privat-en.vivodepot.org/' });
const MAX_FRAGMENT = 200000;      // Zeichen des Inhalts im Link
const MAX_ENTPACKT = 1000000;     // Bytes nach dem Entpacken
const MAX_FELDER_ANZEIGE = 200;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

const TEXTE = Object.freeze({
  de: Object.freeze({
    'titel-leer': 'Anfrage oder Vorlage öffnen',
    'titel-anfrage': 'Anfrage öffnen',
    'titel-vorlage': 'Vorlage öffnen',
    'leer-1': 'Diese Seite öffnet, was eine Stelle Ihnen über einen Code oder Link schickt: eine Anfrage nach Ihren Angaben oder eine Vorlage für ein Formular.',
    'anfrage-1': 'Sie haben eine Anfrage bekommen.',
    'anfrage-2': 'Der Inhalt der Anfrage bleibt im Link und wird nicht an einen Server geschickt.',
    'anfrage-weiter': 'Weiter zu Vivodepot',
    'anfrage-3': 'Geht es nicht von selbst weiter, öffnen Sie diesen Link.',
    'vorlage-felder': 'Diese Angaben fragt die Vorlage ab:',
    'vorlage-speichern': 'Als Datei speichern',
    'vorlage-hinweis': 'Die Datei öffnen Sie danach im Vivodepot Studio.',
    'kennung-hinweis': 'Die Datei dieser Vorlage bekommen Sie bei der Stelle, die Ihnen den Code geschickt hat.',
    'kennung-text': 'Dieser Code verweist auf die Vorlage „{name}“{fassung}.',
    'fassung': 'Fassung {n}',
    'pflicht': 'Pflichtangabe',
    'ohne-name': 'Vorlage ohne Namen',
    'fehler-kein-entpacken': 'Dieser Browser kann den Inhalt nicht entpacken. Öffnen Sie den Link in einem aktuellen Browser.',
    'fehler-inhalt': 'Der Inhalt dieses Links ist nicht lesbar. Bitten Sie die Stelle, Ihnen den Code oder Link noch einmal zu schicken.',
    'fehler-anfrage': 'Der Inhalt dieser Anfrage ist nicht lesbar. Bitten Sie die Stelle, Ihnen den Code oder Link noch einmal zu schicken.',
  }),
  en: Object.freeze({
    'titel-leer': 'Open a request or template',
    'titel-anfrage': 'Open a request',
    'titel-vorlage': 'Open a template',
    'leer-1': 'This page opens what an organisation sends you as a code or link: a request for your details, or a template for a form.',
    'anfrage-1': 'You have received a request.',
    'anfrage-2': 'The content of the request stays in the link and is not sent to a server.',
    'anfrage-weiter': 'Continue to Vivodepot',
    'anfrage-3': 'If it does not continue by itself, open this link.',
    'vorlage-felder': 'This template asks for:',
    'vorlage-speichern': 'Save as file',
    'vorlage-hinweis': 'You then open the file in Vivodepot Studio.',
    'kennung-hinweis': 'You get the file of this template from the organisation that sent you the code.',
    'kennung-text': 'This code points to the template “{name}”{fassung}.',
    'fassung': 'version {n}',
    'pflicht': 'required',
    'ohne-name': 'Template without a name',
    'fehler-kein-entpacken': 'This browser cannot unpack the content. Open the link in a current browser.',
    'fehler-inhalt': 'The content of this link cannot be read. Ask the organisation to send you the code or link again.',
    'fehler-anfrage': 'The content of this request cannot be read. Ask the organisation to send you the code or link again.',
  }),
});

function sprache(suche, navigatorSprache) {
  const m = /(?:^|[?&])lang=([a-z]{2})/i.exec(String(suche || ''));
  const w = m ? m[1].toLowerCase() : String(navigatorSprache || '').slice(0, 2).toLowerCase();
  return w === 'en' ? 'en' : 'de';
}

// Der Inhalt hinter dem Gatter: { art: 'anfrage'|'vorlage'|null, wert }. Der Wert wird hier nur auf die Zeichen geprüft.
function fragmentLesen(hash) {
  const t = String(hash || '').replace(/^#/, '');
  if (!t) return { art: null, wert: '' };
  for (const teil of t.split('&')) {
    const i = teil.indexOf('=');
    if (i < 0) continue;
    const art = teil.slice(0, i);
    if (art === 'anfrage' || art === 'vorlage') return { art, wert: teil.slice(i + 1) };
  }
  return { art: null, wert: '' };
}

function anfrageWertGueltig(wert) {
  const w = String(wert || '');
  if (!w || w.length > MAX_FRAGMENT) return false;
  return BASE64URL.test(w.startsWith('z1.') ? w.slice(3) : w);
}

function anfrageZiel(wert, spr) {
  return ANFRAGE_ZIELE[spr === 'en' ? 'en' : 'de'] + '#anfrage=' + wert;
}

function base64urlZuBytes(text) {
  if (!BASE64URL.test(text)) return null;
  const b = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const roh = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return bytes;
}

async function entpacken(bytes) {
  if (typeof DecompressionStream !== 'function' || typeof ReadableStream !== 'function') return { fehler: 'kein-entpacken' };
  try {
    const quelle = new ReadableStream({ start(c) { c.enqueue(bytes); c.close(); } });
    const leser = quelle.pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const teile = [];
    let n = 0;
    for (;;) {
      const { done, value } = await leser.read();
      if (done) break;
      n += value.length;
      if (n > MAX_ENTPACKT) { try { await leser.cancel(); } catch (e) { /* zu groß: abgebrochen */ } return { fehler: 'inhalt' }; }
      teile.push(value);
    }
    const aus = new Uint8Array(n);
    let o = 0;
    for (const t of teile) { aus.set(t, o); o += t.length; }
    return { bytes: aus };
  } catch (e) { return { fehler: 'inhalt' }; }
}

function istObjekt(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }

// Ein Text je Sprache: eine Zeichenkette oder ein Objekt { de, en, … }.
function sprachText(x, spr) {
  if (typeof x === 'string') return x.trim();
  if (istObjekt(x)) {
    const w = x[spr] != null ? x[spr] : (x.de != null ? x.de : x.en);
    if (typeof w === 'string') return w.trim();
    const erster = Object.values(x).find((v) => typeof v === 'string');
    return typeof erster === 'string' ? erster.trim() : '';
  }
  return '';
}

function vorlageName(v, spr) {
  const q = istObjekt(v.wortlautQuelle) ? sprachText(v.wortlautQuelle.titel, spr) : '';
  const d = istObjekt(v.dokument) ? sprachText(v.dokument.titel, spr) : '';
  return q || d || (typeof v.vorlageId === 'string' ? v.vorlageId.trim() : '');
}

// Ergebnis: { art: 'vorlage', name, version, felder: [{ name, pflicht }], text } | { art: 'kennung', name, version } | { fehler }.
async function vorlageLesen(wert, spr) {
  if (!wert || wert.length > MAX_FRAGMENT || !BASE64URL.test(wert)) return { fehler: 'inhalt' };
  let bytes;
  try { bytes = base64urlZuBytes(wert); } catch (e) { return { fehler: 'inhalt' }; }
  if (!bytes) return { fehler: 'inhalt' };
  let text = null;
  const e = await entpacken(bytes);
  if (e.bytes) {
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(e.bytes); } catch (x) { return { fehler: 'inhalt' }; }
  } else if (e.fehler === 'kein-entpacken') {
    return { fehler: 'kein-entpacken' };
  } else {
    // Kein gepackter Inhalt: nur die Kennung einer Vorlage steht unverpackt im Link.
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (x) { return { fehler: 'inhalt' }; }
  }
  let v;
  try { v = JSON.parse(text); } catch (x) { return { fehler: 'inhalt' }; }
  if (!istObjekt(v)) return { fehler: 'inhalt' };
  const version = Number.isInteger(v.version) ? v.version : null;
  if (!Array.isArray(v.felder)) {
    const name = typeof v.vorlageId === 'string' ? v.vorlageId.trim() : '';
    return name ? { art: 'kennung', name, version } : { fehler: 'inhalt' };
  }
  const felder = [];
  for (const f of v.felder.slice(0, MAX_FELDER_ANZEIGE)) {
    if (!istObjekt(f)) continue;
    const name = sprachText(f.feldname, spr);
    if (name) felder.push({ name, pflicht: f.pflicht === true });
  }
  return { art: 'vorlage', name: vorlageName(v, spr), version, felder, text: JSON.stringify(v, null, 2) };
}

function dateiname(name) {
  const slug = String(name || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return 'vivodepot-vorlage-' + (slug || 'vorlage') + '.json';
}

/* ── die Seite ─────────────────────────────────────────────────────────── */
function seiteStarten(doc, ort, nav, urlApi) {
  const $ = (id) => doc.getElementById(id);
  let spr = sprache(ort.search, nav && nav.language);
  let zustand = { art: 'leer' };
  const t = (k) => TEXTE[spr][k];

  function zeigen(id, an) { const e = $(id); if (e) e.hidden = !an; }
  function alleKaesten(sicht) { for (const id of ['leer', 'anfrage', 'vorlage', 'vorlage-kennung', 'fehler']) zeigen(id, id === sicht); }
  function fassung(version) { return version == null ? '' : ' (' + t('fassung').replace('{n}', String(version)) + ')'; }

  function malen() {
    doc.documentElement.lang = spr;
    for (const el of doc.querySelectorAll('[data-t]')) { const k = el.getAttribute('data-t'); if (TEXTE[spr][k] != null) el.textContent = TEXTE[spr][k]; }
    $('sprache-de').setAttribute('aria-pressed', String(spr === 'de'));
    $('sprache-en').setAttribute('aria-pressed', String(spr === 'en'));
    const z = zustand;
    if (z.art === 'leer') { alleKaesten('leer'); $('titel').textContent = t('titel-leer'); }
    else if (z.art === 'anfrage') {
      alleKaesten('anfrage'); $('titel').textContent = t('titel-anfrage');
      $('anfrage-weiter').setAttribute('href', anfrageZiel(z.wert, spr));
    } else if (z.art === 'vorlage') {
      alleKaesten('vorlage'); $('titel').textContent = t('titel-vorlage');
      $('vorlage-name').textContent = z.name || t('ohne-name');
      $('vorlage-fassung').textContent = z.version == null ? '' : t('fassung').replace('{n}', String(z.version));
      const liste = $('vorlage-felder');
      while (liste.firstChild) liste.removeChild(liste.firstChild);
      for (const f of z.felder) {
        const li = doc.createElement('li');
        li.textContent = f.name + (f.pflicht ? ' (' + t('pflicht') + ')' : '');
        liste.appendChild(li);
      }
      zeigen('vorlage-felder-titel', z.felder.length > 0);
    } else if (z.art === 'kennung') {
      alleKaesten('vorlage-kennung'); $('titel').textContent = t('titel-vorlage');
      $('kennung-text').textContent = t('kennung-text').replace('{name}', () => z.name).replace('{fassung}', () => fassung(z.version));
    } else if (z.art === 'fehler') {
      alleKaesten('fehler'); $('titel').textContent = t('titel-leer');
      $('fehler-text').textContent = t(z.grund);
    }
  }

  function speichern() {
    if (zustand.art !== 'vorlage' || !urlApi || typeof urlApi.createObjectURL !== 'function') return;
    const blob = new doc.defaultView.Blob([zustand.text], { type: 'application/json' });
    const href = urlApi.createObjectURL(blob);
    const a = doc.createElement('a');
    a.setAttribute('href', href);
    a.setAttribute('download', dateiname(zustand.name));
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    if (typeof urlApi.revokeObjectURL === 'function') setTimeout(() => urlApi.revokeObjectURL(href), 1000);
  }

  async function lesen() {
    const f = fragmentLesen(ort.hash);
    if (f.art === 'anfrage') {
      if (!anfrageWertGueltig(f.wert)) { zustand = { art: 'fehler', grund: 'fehler-anfrage' }; malen(); return; }
      zustand = { art: 'anfrage', wert: f.wert };
      malen();
      // Weiter in die App der Sprache, derselbe Inhalt hinter dem Gatter; greift das nicht, bleibt der Link stehen.
      try { ort.replace(anfrageZiel(f.wert, spr)); } catch (e) { /* der Link auf der Seite bleibt */ }
    } else if (f.art === 'vorlage') {
      const r = await vorlageLesen(f.wert, spr);
      if (r.fehler) zustand = { art: 'fehler', grund: r.fehler === 'kein-entpacken' ? 'fehler-kein-entpacken' : 'fehler-inhalt' };
      else zustand = r;
      malen();
    } else { zustand = { art: 'leer' }; malen(); }
  }

  $('sprache-de').addEventListener('click', () => { spr = 'de'; malen(); });
  $('sprache-en').addEventListener('click', () => { spr = 'en'; malen(); });
  $('vorlage-speichern').addEventListener('click', speichern);
  malen();
  return lesen();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  seiteStarten(document, window.location, window.navigator, window.URL);
}
if (typeof module === 'object' && module && module.exports) {
  module.exports = { sprache, fragmentLesen, anfrageWertGueltig, anfrageZiel, vorlageLesen, dateiname, seiteStarten, TEXTE, ANFRAGE_ZIELE };
}
