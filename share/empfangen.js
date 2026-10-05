'use strict';
/* U2-ADR-183-Geschwister — Abhol-Logik dieser eigenständigen Seite (23.09.2026).

   Läuft NIE im Kontext von vivodepot.html oder vivodepot-lesen.html; beide behalten
   connect-src 'none'. Das ist derselbe Grund wie bei upload.js nebenan, nur umgekehrt:
   die Netz-Arbeit liegt außerhalb der App, damit die App offline bleiben kann.

   WAS HIER PASSIERT, in der Reihenfolge, in der die Spezifikation es vorsieht
   (SMART Health Cards and Links IG v1.0.0, STU 1, „Health Links Specification"):
     1. shlink:/-Nutzlast base64url-dekodieren → { url, key, flag?, label?, exp? }
     2. OHNE Flag  → POST auf url, Körper {"recipient": …}  (der Regelweg)
        MIT `P`    → derselbe POST, zusätzlich {"passcode": …} (Spec: „SHALL be populated
                     with a user-supplied Passcode if the `P` flag was present")
        MIT `U`    → GET auf url?recipient=…                 (Einzeldatei-Ausnahme;
                     `U` SHALL NOT be used in combination with `P`)
     3. JWE compact entschlüsseln (alg: dir, enc: A256GCM) mit dem Schlüssel AUS DEM LINK
     4. Klartext als Datei herausgeben — von hier geht nichts weiter ins Netz

   DER SCHLÜSSEL ERREICHT KEINEN SERVER. Er steht im Link; wird der Link als Adresse
   übergeben, steht er hinter dem `#`, und was hinter dem `#` steht, schickt ein Browser
   nicht mit. Die Spec sieht diese Form ausdrücklich vor („optionally prefixed with a
   viewer URL that ends with #").

   ZWEISTUFIG MIT ABSICHT: Prüfen ist rein lokal, Abrufen ist der Schritt, der die Freigabe
   VERBRAUCHT. Gemessen am 18.09.2026: ein Abruf, der im Browser als Fehler erscheint, kann
   die Freigabe trotzdem verbraucht haben — der Server liefert und löscht, und erst danach
   verweigert der Browser dem Skript die Antwort. Deshalb steht die Warnung VOR dem Knopf
   und nicht daneben. */

const linkEingabe = document.getElementById('link-eingabe');
const pruefenKnopf = document.getElementById('pruefen-knopf');
const abrufenKnopf = document.getElementById('abrufen-knopf');
const speichernKnopf = document.getElementById('speichern-knopf');
const fehlerText = document.getElementById('fehler-text');
const befund = document.getElementById('befund');
const befundListe = document.getElementById('befund-liste');
/* NICHT `ergebnis` nennen: style.css der Ablage-Seite hat eine Regel `#ergebnis { display: none }`,
   die nur deren Klasse `zeigen` aufhebt. Ein `hidden`-Attribut allein hätte diese Kiste nie sichtbar
   gemacht, gemessen beim Bau, als diese Seite style.css noch mitlud (bis 04.10.2026). Der eigene Name
   bleibt, damit ein erneutes Mitladen nichts verbirgt. */
const ergebnis = document.getElementById('abgeholt');
const ergebnisListe = document.getElementById('abgeholt-liste');
const btnDe = document.getElementById('sprache-de');
const btnEn = document.getElementById('sprache-en');

/* Was wir dem fremden Host als `recipient` nennen. Die Spec verlangt das Feld (1..1), und der
   Host darf es der Absenderin anzeigen. Bewusst NEUTRAL: der Name der Bürgerin hat hier
   nichts zu suchen — der fremde Server bekäme sonst eine Angabe über sie, die er ohne diesen
   Abruf nicht hätte. Wer sie nennen will, kann es; die Vorgabe tut es nicht. */
const EMPFAENGER_VORGABE = 'Vivodepot (citizen device)';

const TEXTE = {
  de: {
    titel: 'Freigabe abholen',
    einleitung: 'Hat Ihnen jemand einen Freigabe-Link geschickt — eine Praxis, ein Labor, ein Krankenhaus —, dann holt diese Seite das Dokument ab und entschlüsselt es auf Ihrem Gerät. Danach speichern Sie es und lesen es in Vivodepot ein. Diese Seite ist NICHT Teil der Vivodepot-App; die App selbst macht zu keinem Zeitpunkt einen Netzaufruf.',
    'schluessel-hinweis': 'Der Schlüssel steckt im Link und bleibt auf Ihrem Gerät. Weder der Server, der die Datei ausliefert, noch Vivodepot bekommt ihn zu sehen.',
    'nicht-klicken': 'Kommt der Link als anklickbare Adresse: bitte nicht anklicken, sondern kopieren und hier einfügen. Ein Klick öffnet unter Umständen den Betrachter des Absenders, und der ruft die Freigabe sofort ab — dann ist sie verbraucht, bevor Sie sie hier haben.',
    'passcode-label': 'Passcode (dieser Link verlangt einen — die Absenderin hat ihn separat mitgeteilt):',
    'link-label': 'Freigabe-Link (beginnt mit shlink:/):',
    'pruefen-knopf': 'Link prüfen',
    'befund-text': 'Der Link ist lesbar. Das steht darin:',
    'warnung-einmal': 'Bitte einmal lesen, bevor Sie abrufen. Eine Freigabe gilt für genau einen Abruf. Danach ist der Link tot — auch für Sie. Speichern Sie das Dokument also, sobald es da ist.',
    'warnung-cors': 'Es kann sein, dass der fremde Server den Abruf aus einem Browser nicht erlaubt. Dann erscheint hier ein Fehler, obwohl der Server die Datei möglicherweise schon herausgegeben hat — die Freigabe wäre dann verbraucht. Das liegt an der Gegenstelle und lässt sich von hier aus nicht verhindern. Fragen Sie in dem Fall dort nach einem neuen Link.',
    'abrufen-knopf': 'Jetzt abrufen und entschlüsseln',
    'abgeholt-text': 'Abgeholt und entschlüsselt. Das Dokument liegt jetzt in diesem Browser-Fenster — sonst nirgends.',
    'manifest-text-hinweis': 'Was die Gegenstelle auf Ihren Abruf geantwortet hat — das Verzeichnis der freigegebenen Datei:',
    'manifest-knopf': 'Manifest speichern',
    'speichern-knopf': 'Dokument speichern',
    'import-hinweis': 'Danach in Vivodepot öffnen: Daten einlesen → die gespeicherte Datei wählen. Der Befund wird als Original in Ihrer Mappe abgelegt, unverändert.',
    'formate-hinweis': 'Als Original in Ihre Mappe übernimmt Vivodepot drei Dokumentarten: Laborbefund (HL7 Europe Laboratory Report), Entlassbrief (HL7 Europe Hospital Discharge Report) und Patientenkurzakte (International Patient Summary). Alles andere können Sie hier trotzdem abholen und speichern — die Datei gehört dann Ihnen, unabhängig davon, ob Vivodepot sie ablegt.',
    feld: { adresse: 'Abruf bei', weg: 'Weg', bezeichnung: 'Bezeichnung', ablauf: 'Gültig bis', groesse: 'Größe', art: 'Art' },
    weg: { direkt: 'Direkt-Abruf (U-Flag, eine Datei)', manifest: 'Manifest (der Regelweg)' },
    fehler: {
      leer: 'Bitte den Link einfügen.',
      praefix: 'Das sieht nicht wie ein Freigabe-Link aus — er muss mit shlink:/ beginnen.',
      unlesbar: 'Der Link lässt sich nicht lesen. Bitte prüfen, ob er vollständig kopiert wurde.',
      unvollstaendig: 'Im Link fehlt die Adresse oder der Schlüssel.',
      abgelaufen: 'Diese Freigabe ist abgelaufen. Bitte bei der Absenderin einen neuen Link erbitten.',
      nichthttps: 'Der Link zeigt nicht auf eine gesicherte Adresse (https). Abruf abgelehnt.',
      verbraucht: 'Die Freigabe ist nicht mehr abrufbar — sie wurde bereits geholt oder ist abgelaufen.',
      passcode: 'Der Passcode wurde nicht angenommen. ACHTUNG: die Gegenstelle zählt Fehlversuche und sperrt die Freigabe danach. Bitte den Passcode genau prüfen, bevor Sie es noch einmal versuchen.',
      verbindung: 'Der Abruf hat nicht geklappt. Möglicherweise erlaubt der fremde Server keinen Zugriff aus dem Browser. Bitte bei der Absenderin nachfragen — und beachten Sie den Hinweis oben.',
      manifestform: 'Die Antwort der Gegenstelle ist kein gültiges Manifest.',
      entschluesseln: 'Die Datei ließ sich mit dem Schlüssel aus dem Link nicht entschlüsseln.',
      unerwartet: 'Unerwarteter Fehler beim Abholen.',
    },
  },
  en: {
    titel: 'Retrieve a shared document',
    einleitung: 'If someone sent you a sharing link — a practice, a laboratory, a hospital — this page retrieves the document and decrypts it on your device. You then save it and read it into Vivodepot. This page is NOT part of the Vivodepot app; the app itself never makes a network call.',
    'schluessel-hinweis': 'The key travels inside the link and stays on your device. Neither the server delivering the file nor Vivodepot ever sees it.',
    'nicht-klicken': 'If the link arrives as a clickable address: please do not click it — copy it and paste it here. A click may open the sender\'s own viewer, which retrieves the share immediately — it would then be used up before you get here.',
    'passcode-label': 'Passcode (this link requires one — the sender provided it separately):',
    'link-label': 'Sharing link (starts with shlink:/):',
    'pruefen-knopf': 'Check link',
    'befund-text': 'The link is readable. Here is what it says:',
    'warnung-einmal': 'Please read this before retrieving. A share is valid for exactly one retrieval. After that the link is dead — for you as well. So save the document as soon as it arrives.',
    'warnung-cors': 'The other server may not allow browser retrieval. You would then see an error here even though the server may already have handed out the file — the share would be used up. That is up to the sender’s server and cannot be prevented from here. In that case, ask them for a new link.',
    'abrufen-knopf': 'Retrieve and decrypt now',
    'abgeholt-text': 'Retrieved and decrypted. The document is now in this browser window — nowhere else.',
    'manifest-text-hinweis': 'What the other side returned in response to your request — the listing of the shared file:',
    'manifest-knopf': 'Save manifest',
    'speichern-knopf': 'Save document',
    'import-hinweis': 'Then open Vivodepot: Import data → choose the saved file. The report is stored in your folder as the original, unchanged.',
    'formate-hinweis': 'Vivodepot files three document types as originals in your folder: laboratory report (HL7 Europe Laboratory Report), hospital discharge report (HL7 Europe Hospital Discharge Report) and patient summary (International Patient Summary). Anything else you can still retrieve and save here — the file is then yours, whether or not Vivodepot files it.',
    feld: { adresse: 'Retrieved from', weg: 'Path', bezeichnung: 'Label', ablauf: 'Valid until', groesse: 'Size', art: 'Type' },
    weg: { direkt: 'Direct retrieval (U flag, single file)', manifest: 'Manifest (the standard path)' },
    fehler: {
      leer: 'Please paste the link.',
      praefix: 'That does not look like a sharing link — it must start with shlink:/.',
      unlesbar: 'The link cannot be read. Please check that it was copied in full.',
      unvollstaendig: 'The link is missing the address or the key.',
      abgelaufen: 'This share has expired. Please ask the sender for a new link.',
      nichthttps: 'The link does not point to a secure (https) address. Retrieval refused.',
      verbraucht: 'The share is no longer available — it has already been retrieved, or it expired.',
      passcode: 'The passcode was not accepted. NOTE: the other side counts failed attempts and disables the share after a limit. Please check the passcode carefully before trying again.',
      verbindung: 'Retrieval failed. The other server may not allow browser access. Please ask the sender — and see the note above.',
      manifestform: 'The response from the other side is not a valid manifest.',
      entschluesseln: 'The file could not be decrypted with the key from the link.',
      unerwartet: 'Unexpected error while retrieving.',
    },
  },
};

let sprache = 'de';
let teile = null;        // { url, key, flag, label, exp } aus dem Link
let klartext = null;     // Uint8Array, erst nach erfolgreichem Abruf
/* Das Manifest wird AUFGEHOBEN, nicht nur benutzt. Der Grund ist die Bürgerin: sie soll sehen
   und behalten können, was der fremde Server auf ihren Abruf geantwortet hat — woher ihre Datei
   kam, unter welcher Adresse, mit welcher Angabe zum Inhalt. Ein zweiter Abruf ist unmöglich,
   die Freigabe gilt einmal; was hier nicht aufgehoben wird, ist für immer fort.
   (Dass eine Konformitätsprüfung dieselbe Ansicht verlangt, ist eine Folge davon, nicht der
   Anlass. Ein Produkt, das seine Fähigkeiten mit Testschritten begründet, hat keine.) */
let manifest = null;     // das Manifest-Objekt, wenn der Regelweg gegangen wurde

function t() { return TEXTE[sprache]; }

function spracheSetzen(neu) {
  sprache = neu;
  document.documentElement.lang = neu;
  const txt = t();
  document.querySelectorAll('[data-t]').forEach((el) => {
    const k = el.getAttribute('data-t');
    if (txt[k]) el.textContent = txt[k];
  });
  btnDe.setAttribute('aria-pressed', String(neu === 'de'));
  btnEn.setAttribute('aria-pressed', String(neu === 'en'));
  if (teile) befundZeigen();
  if (klartext) ergebnisZeigen();
}

function fehler(schluessel) {
  fehlerText.textContent = t().fehler[schluessel] || t().fehler.unerwartet;
}

function zeile(dl, bezeichnung, wert) {
  const dt = document.createElement('dt'); dt.textContent = bezeichnung;
  const dd = document.createElement('dd'); dd.textContent = wert;   // textContent, nie innerHTML
  dl.append(dt, dd);
}

/* ── base64url → Bytes. Ohne Padding, wie die Spec es schreibt. ────────────────────────── */
function b64uZuBytes(s) {
  const roh = atob(String(s).replace(/-/g, '+').replace(/_/g, '/')
    .padEnd(Math.ceil(String(s).length / 4) * 4, '='));
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return bytes;
}
function b64uZuText(s) { return new TextDecoder().decode(b64uZuBytes(s)); }

/* ── Schritt 1: den Link lesen. Rein lokal, kein Netzaufruf. ───────────────────────────── */
function linkLesen(roh) {
  const text = String(roh || '').trim();
  if (!text) return { fehler: 'leer' };
  // Der Link darf als nackter shlink:/ kommen ODER hinter einer Betrachter-Adresse mit `#`.
  const i = text.indexOf('shlink:/');
  if (i === -1) return { fehler: 'praefix' };
  let nutzlast;
  try { nutzlast = JSON.parse(b64uZuText(text.slice(i + 'shlink:/'.length).trim())); }
  catch (e) { return { fehler: 'unlesbar' }; }
  if (!nutzlast || typeof nutzlast.url !== 'string' || typeof nutzlast.key !== 'string') {
    return { fehler: 'unvollstaendig' };
  }
  // Nur https. Ein Klartext-Abruf wäre hier besonders falsch: die Chiffre ginge zwar
  // verschlüsselt über die Leitung, die Adresse aber offen — und sie ist das Geheimnis.
  if (!/^https:\/\//i.test(nutzlast.url)) return { fehler: 'nichthttps' };
  if (Number.isFinite(nutzlast.exp) && nutzlast.exp * 1000 < Date.now()) {
    return { fehler: 'abgelaufen' };
  }
  return { teile: nutzlast };
}

function istDirektweg(p) { return typeof p.flag === 'string' && p.flag.includes('U'); }
function brauchtPasscode(p) { return typeof p.flag === 'string' && p.flag.includes('P'); }

function befundZeigen() {
  befundListe.textContent = '';
  const f = t().feld;
  let host = teile.url;
  try { host = new URL(teile.url).host; } catch (e) { /* zur Anzeige reicht der rohe Wert */ }
  zeile(befundListe, f.adresse, host);
  zeile(befundListe, f.weg, istDirektweg(teile) ? t().weg.direkt : t().weg.manifest);
  if (teile.label) zeile(befundListe, f.bezeichnung, String(teile.label));
  if (Number.isFinite(teile.exp)) {
    zeile(befundListe, f.ablauf, new Date(teile.exp * 1000).toLocaleString(sprache === 'de' ? 'de-DE' : 'en-GB'));
  }
  /* Das Passcode-Feld nur zeigen, wenn der Link es verlangt. Und es MUSS gezeigt werden:
     ohne Passcode antwortet die Gegenstelle mit 401, und die Spezifikation verlangt, dass sie
     Fehlversuche über die Lebenszeit der Freigabe zählt und sie danach sperrt. Ein blinder
     Versuch ist also nicht folgenlos. */
  document.getElementById('passcode-feld').hidden = !brauchtPasscode(teile);
  befund.hidden = false;
}

/* ── Schritt 2: abholen. AB HIER wird die Freigabe verbraucht. ─────────────────────────── */
async function jweHolen(p) {
  if (istDirektweg(p)) {
    // Einzeldatei-Ausnahme: GET, `recipient` als Abfrage-Parameter (Spec, Abschnitt
    // „SMART Health Link Direct File Request (with U Flag)").
    const adresse = new URL(p.url);
    adresse.searchParams.set('recipient', EMPFAENGER_VORGABE);
    const antwort = await fetch(adresse.toString(), { method: 'GET', referrerPolicy: 'no-referrer' });
    if (antwort.status === 404 || antwort.status === 410) throw new Error('verbraucht');
    if (!antwort.ok) throw new Error('verbindung');
    return (await antwort.text()).trim();
  }
  // Der Regelweg: POST, `recipient` im JSON-Körper — plus `passcode`, wenn der Link ihn verlangt.
  const koerper = { recipient: EMPFAENGER_VORGABE };
  if (brauchtPasscode(p)) koerper.passcode = document.getElementById('passcode-eingabe').value.trim();
  const antwort = await fetch(p.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(koerper),
    referrerPolicy: 'no-referrer',
  });
  if (antwort.status === 404 || antwort.status === 410) throw new Error('verbraucht');
  if (antwort.status === 401) {
    /* Falscher oder fehlender Passcode. Die Spec verlangt, dass der Server die verbleibenden
       Versuche mitteilt — die gehören der Bürgerin gesagt, denn danach ist die Freigabe hin. */
    let rest = null;
    try { rest = (await antwort.json()).remainingAttempts; } catch (e) { /* ohne Zahl eben ohne */ }
    const f = new Error('passcode');
    f.rest = rest;
    throw f;
  }
  if (!antwort.ok) throw new Error('verbindung');
  try { manifest = await antwort.json(); } catch (e) { throw new Error('manifestform'); }
  const datei = manifest && Array.isArray(manifest.files) ? manifest.files[0] : null;
  if (!datei) throw new Error('manifestform');
  // `embedded` ODER `location` — die Spec erlaubt beides und verlangt mindestens eines.
  // Sind beide da, sind sie laut Spec identisch; dann kostet `embedded` einen Abruf weniger.
  if (typeof datei.embedded === 'string' && datei.embedded) return datei.embedded.trim();
  if (typeof datei.location === 'string' && datei.location) {
    if (!/^https:\/\//i.test(datei.location)) throw new Error('nichthttps');
    const zweite = await fetch(datei.location, { method: 'GET', referrerPolicy: 'no-referrer' });
    if (zweite.status === 404 || zweite.status === 410) throw new Error('verbraucht');
    if (!zweite.ok) throw new Error('verbindung');
    return (await zweite.text()).trim();
  }
  throw new Error('manifestform');
}

/* ── Schritt 3: entschlüsseln. JWE compact, alg: dir, enc: A256GCM. ────────────────────────
   Zwei Stellen, an denen man das erfahrungsgemäß falsch macht, beide hier bewusst benannt:
     · WebCrypto will Chiffre UND Prüfsumme aneinandergehängt, nicht getrennt.
     · Die Zusatzdaten (AAD) sind der KODIERTE Kopf als ASCII — nicht der dekodierte. */
async function entschluesseln(jwe, keyB64u) {
  const abschnitte = String(jwe).split('.');
  if (abschnitte.length !== 5) throw new Error('entschluesseln');
  const [kopfB64u, , ivB64u, chiffreB64u, pruefB64u] = abschnitte;
  const chiffre = b64uZuBytes(chiffreB64u);
  const pruef = b64uZuBytes(pruefB64u);
  const zusammen = new Uint8Array(chiffre.length + pruef.length);
  zusammen.set(chiffre, 0);
  zusammen.set(pruef, chiffre.length);
  const schluessel = await crypto.subtle.importKey('raw', b64uZuBytes(keyB64u), 'AES-GCM', false, ['decrypt']);
  const klar = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64uZuBytes(ivB64u), additionalData: new TextEncoder().encode(kopfB64u), tagLength: 128 },
    schluessel, zusammen);
  return new Uint8Array(klar);
}

/* Nur zur Anzeige: was für ein Dokument ist das? Keine Auslegung, keine Umformung —
   es wird gelesen, was dasteht, und sonst nichts. */
function artErkennen(bytes) {
  try {
    const o = JSON.parse(new TextDecoder().decode(bytes));
    const profil = o && o.meta && Array.isArray(o.meta.profile) ? o.meta.profile[0] : '';
    if (o && o.resourceType) return profil ? o.resourceType + ' · ' + profil : o.resourceType;
  } catch (e) { /* kein JSON — dann eben nicht */ }
  return '—';
}

function ergebnisZeigen() {
  /* Das Manifest sichtbar hinschreiben, nicht nur zum Speichern anbieten. Für die Bürgerin
     ist es Transparenz: sie sieht, was der fremde Server geantwortet hat. In einem
     Konformitätstest ist dieselbe Ansicht zugleich der Beleg für den Manifest-Schritt —
     aber DAS gehört in den Bericht, nicht in den Text der Seite. Ein Produkt, das von
     Testschritten spricht, liest sich wie eine Attrappe. */
  const kasten = document.getElementById('manifest-kasten');
  if (manifest) {
    document.getElementById('manifest-text').textContent = JSON.stringify(manifest, null, 2);
    kasten.hidden = false;
  } else {
    kasten.hidden = true;   // Direkt-Weg (U-Flag): es gibt kein Manifest, und das ist richtig so
  }
  ergebnisListe.textContent = '';
  const f = t().feld;
  zeile(ergebnisListe, f.art, artErkennen(klartext));
  zeile(ergebnisListe, f.groesse, klartext.length.toLocaleString(sprache === 'de' ? 'de-DE' : 'en-GB') + ' Bytes');
  ergebnis.hidden = false;
}

/* ── Bedienung ────────────────────────────────────────────────────────────────────────── */
pruefenKnopf.addEventListener('click', () => {
  fehlerText.textContent = '';
  befund.hidden = true; ergebnis.hidden = true; klartext = null; manifest = null; teile = null;
  const gelesen = linkLesen(linkEingabe.value);
  if (gelesen.fehler) { fehler(gelesen.fehler); return; }
  teile = gelesen.teile;
  befundZeigen();
});

abrufenKnopf.addEventListener('click', async () => {
  if (!teile) return;
  fehlerText.textContent = '';
  abrufenKnopf.disabled = true;
  try {
    const jwe = await jweHolen(teile);
    klartext = await entschluesseln(jwe, teile.key);
    ergebnisZeigen();
  } catch (e) {
    /* Die echte Ursache gehört in die Konsole, nicht nur in den freundlichen Text. Ohne das
       sieht ein Entschlüsselungsfehler exakt aus wie ein Verbindungsfehler — beim Bau dieser
       Seite hat genau das eine Viertelstunde gekostet. Der Bürgerin nützt der Rohtext nichts,
       wer nachsieht, braucht ihn. */
    console.error('[empfangen] Abruf/Entschlüsselung gescheitert:', e);
    const bekannt = ['verbraucht', 'verbindung', 'manifestform', 'entschluesseln', 'nichthttps', 'passcode'];
    fehler(bekannt.includes(e && e.message) ? e.message : 'verbindung');
    if (e && e.message === 'passcode' && Number.isFinite(e.rest)) {
      fehlerText.textContent += ' (' + e.rest + ')';
    }
  } finally {
    abrufenKnopf.disabled = false;
  }
});

/* Anker in die Seite hängen, klicken, entfernen — genau wie dateiAusgeben() im Kern.
   Ein Klick auf einen NICHT eingehängten Anker wird von Browsern nicht zuverlässig
   ausgeführt; gemessen beim Bau dieser Seite. */
function dateiGeben(inhalt, name, typ) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: typ }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

speichernKnopf.addEventListener('click', () => {
  if (!klartext) return;
  dateiGeben(klartext, 'freigabe-' + new Date().toISOString().slice(0, 10) + '.json',
    'application/fhir+json');
});

document.getElementById('manifest-knopf').addEventListener('click', () => {
  if (!manifest) return;
  dateiGeben(JSON.stringify(manifest, null, 2) + '\n',
    'manifest-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
});

btnDe.addEventListener('click', () => spracheSetzen('de'));
btnEn.addEventListener('click', () => spracheSetzen('en'));

/* Kommt der Link als Betrachter-Adresse (…/empfangen.html#shlink:/…), steht er im Fragment.
   Das Fragment geht NIE an den Server — genau dafür sieht die Spec diese Form vor. Wir
   übernehmen ihn ins Feld und prüfen ihn, rufen aber NICHTS ab: der Abruf bleibt ein
   ausdrücklicher Klick, weil er die Freigabe verbraucht. */
if (location.hash && location.hash.length > 1) {
  linkEingabe.value = decodeURIComponent(location.hash.slice(1));
  pruefenKnopf.click();
}
