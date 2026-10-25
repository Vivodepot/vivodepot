#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   lpa-formular-wortlaut-pruefen.js — der Wortlaut-Wächter der LPA-Ausfüllhilfe (U2-ADR-477)
   ────────────────────────────────────────────────────────────────────────────
   Muster: tools/vollmacht-vorsorge-pdf-beleg-messen.js (U2-ADR-343). Zwei Zusicherungen:

   1. DER FORMULARSTAND IST GEPINNT. Die PDFs von LP1F und LP1H (Stand 08.25) liegen NICHT im Repo, nur ihre
      SHA-256 (unten, und in docs/fremdquellen.md) und ihr extrahierter Text in tests/fixtures/opg/. Wer eine
      Fassung herunterlädt, hält sie mit --dokument gegen den Pin: ein anderes Byte ist ein anderes Formular,
      und der extrahierte Text muss gleich der Fixture sein. Ohne Argument prüft das Werkzeug gegen die Texte.

   2. JEDER AMTLICHE TEXT IM MODUL STEHT WÖRTLICH IM PDF-TEXT. Geprüft werden die fünf Dateien in
      tools/lpa-england-wales/ (nicht der Erzeuger): Abschnittstitel, Feldbezeichnungen, Antwortmöglichkeiten,
      die Zitate in der Übertragungsliste und die Formvorschriften im Rechtsraum-Modul. Was nicht amtlich ist,
      muss als Bedienungstext im Erzeuger stehen (B, SACHSATZ); ein Text, der weder das eine noch das andere
      ist, ist rot. Texte, die das Formular nur in LP1F oder nur in LP1H kennt (Abschnitt 5, die Wahl des
      Formulars), werden gegen genau dieses Formular gehalten, alle übrigen gegen beide.

   DER PDF-TEXT. `pdftotext` (poppler 26.07.0) im Standardmodus, also in Lesereihenfolge, nicht `-layout`:
   LP1H setzt Abschnitt 5 zweispaltig („Option A …" neben „Option B …"), im Layout-Modus stünden die Sätze
   zeilenweise verschränkt. In der abgelegten Textdatei sind Seitenwechsel (U+000C) zu Zeilenwechseln und das
   Kästchen-Zeichen U+0007 zu Leerzeichen geworden — beides Steuerzeichen, kein Wortlaut
   (`extraktNormalisieren`, dieselbe Funktion für die Gegenprobe mit --dokument). Verglichen wird ohne jeden
   Leerraum (Zeilenumbruch und Spaltenabstand sind Layout); jedes andere Zeichen muss in derselben Reihenfolge
   stehen, auch ’ und –. Ein Bindestrich am Zeilenende bleibt stehen: „life-\nsustaining" ist „life-sustaining".

   DIE GEBÜHR steht in keinem der beiden Formulare (LP1F verweist auf gov.uk). Sie ist das einzige Zitat einer
   anderen amtlichen Seite und muss mit Adresse und Abrufdatum am Modul stehen; das prüft dieser Wächter, den
   Inhalt der Seite kann er nicht prüfen (keine gepinnte Kopie, kein Netz).

   RECHTSLAGE: Kennung lpa-england-wales im Register der Rechtslagen (Marke im Kopf von
   tests/lpa-england-wales-wortlaut.test.js) — Stand LP1F/LP1H 08.25, gov.uk-Publikation zuletzt aktualisiert 20.04.2026,
   abgerufen 02.10.2026, Pins am 18.10.2026 gegen die verlinkten PDFs bestätigt (byte-gleich). Die Publikationsseite heißt
   seit 20.04.2026 …/lasting-power-of-attorney-forms; die frühere Adresse leitet nur weiter und ist als Quelle rot
   (ALTE_SEITENADRESSEN). Anlass zur Neuprüfung: neue Formularfassung oder Inkrafttreten von s. 1 Powers of
   Attorney Act 2023 (U2-ADR-477).

   AUFRUF
     node tools/lpa-formular-wortlaut-pruefen.js                     Wortlaut gegen die Text-Fixtures
     node tools/lpa-formular-wortlaut-pruefen.js --dokument <pdf>    eine heruntergeladene Fassung: SHA-256 gegen den Pin
                                                                     und (pdftotext nötig) der Text gleich der Fixture;
                                                                     ohne pdftotext Exit 2, „übersprungen", nie grün.
                                                                     Das ist der Prüfweg gegen die amtlichen PDFs; die Suite
                                                                     prüft nur seine Logik, mit erfundenen Bytes.
     node tools/lpa-formular-wortlaut-pruefen.js --modul-ordner <pfad>  andere Moduldateien prüfen
   Exit 0 grün, 1 rot.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const FIXTURES = path.join(REPO, 'tests', 'fixtures', 'opg');
const E = require('./lpa-england-wales-erzeugen.js');

const LPA_FORMULARE = Object.freeze({
  LP1F: Object.freeze({
    pdfAdresse: 'https://assets.publishing.service.gov.uk/media/68e51ea8dadf7616351e4ee4/102025-LP1F-Lasting-power-of-attorney-financial-decisions.pdf',
    text: path.join(FIXTURES, 'LP1F-08-25.txt'),
    sha256: 'fcc3ffb8d041d8bff67fb073733549b07dd9fa6a29ee69abc9797f49c30b1f71', stand: '08.25',
    url: 'https://www.gov.uk/government/publications/lasting-power-of-attorney-forms',
  }),
  LP1H: Object.freeze({
    pdfAdresse: 'https://assets.publishing.service.gov.uk/media/68a83d5d3a052c9c504c8d8f/20250822-LP1H-create-and-register-your-lasting-power-of-attorney.pdf',
    text: path.join(FIXTURES, 'LP1H-08-25.txt'),
    sha256: '2978620918617478a7501b9cee99dd9be7d4b806a51d0e8ab5ff42671a17f599', stand: '08.25',
    url: 'https://www.gov.uk/government/publications/lasting-power-of-attorney-forms',
  }),
});
const FORMULAR_ZU_WAHL = Object.freeze({ lp1f: 'LP1F', lp1h: 'LP1H' });
/* Adressen, unter denen die Publikationsseite früher stand und die heute nur weiterleiten (gov.uk Content-API:
   document_type „redirect"). Eine Quelle darf sie nicht mehr nennen. */
const ALTE_SEITENADRESSEN = Object.freeze(['https://www.gov.uk/government/publications/make-a-lasting-power-of-attorney']);

function sha256(datei) { return crypto.createHash('sha256').update(fs.readFileSync(datei)).digest('hex'); }
function extraktNormalisieren(roh) { return String(roh).replace(/\f/g, '\n').replace(/\u0007/g, ' '); }
function ohneLeerraum(s) { return String(s).normalize('NFC').replace(/\s+/g, ''); }
/* Der Vergleichstext: jeder Leerraum (Zeilenumbruch, Spaltenabstand, Tabulator) wird EIN Leerzeichen. So bleibt die
   Wortgrenze erhalten — „First name" ist nicht belegt, nur weil „First names" im Formular steht. */
function einLeerraum(s) { return ' ' + String(s).normalize('NFC').replace(/\s+/g, ' ').trim() + ' '; }
/* Steht `text` als ganze Folge im Formular: vorn und hinten weder Buchstabe noch Ziffer als Nachbar. */
function wortgenauEnthalten(formularText, text) {
  const nadel = einLeerraum(text).trim();
  let i = formularText.indexOf(nadel);
  while (i >= 0) {
    const vor = formularText[i - 1] || ' ', nach = formularText[i + nadel.length] || ' ';
    if (!/[\p{L}\p{N}]/u.test(vor) && !/[\p{L}\p{N}]/u.test(nach)) return true;
    i = formularText.indexOf(nadel, i + 1);
  }
  return false;
}

/* Die Pins selbst: je Formular eine SHA-256 (64 Hex-Zeichen), eine amtliche PDF-Adresse und die Text-Fixture. Das PDF
   gegen den Pin zu halten ist Sache von --dokument (dokumentPruefen) — im Repo liegt kein PDF. */
function pinsPruefen(formulare) {
  const fehler = [];
  for (const [name, f] of Object.entries(formulare || LPA_FORMULARE)) {
    if (!/^[0-9a-f]{64}$/.test(f.sha256 || '')) fehler.push(name + ': kein gültiger SHA-256-Pin');
    if (!/^https:\/\/assets\.publishing\.service\.gov\.uk\/.+\.pdf$/.test(f.pdfAdresse || '')) fehler.push(name + ': keine amtliche PDF-Adresse');
    if (!fs.existsSync(f.text)) fehler.push(name + ': Text-Fixture fehlt (' + path.relative(REPO, f.text) + ')');
  }
  return fehler;
}

function pdfTexte(formulare) {
  const raus = {};
  for (const [name, f] of Object.entries(formulare || LPA_FORMULARE)) raus[name] = einLeerraum(fs.readFileSync(f.text, 'utf8'));
  return raus;
}

/* Form-spezifische Texte: Abschnitt 5 und die Wahl des Formulars. */
function formSpezifisch() {
  const karte = new Map();
  for (const o of E.FORMULAR_WAHL.optionen) karte.set(o.label, FORMULAR_ZU_WAHL[o.wert]);
  for (const a of E.ABSCHNITTE) {
    if (a.titelJeFormular) for (const [form, titel] of Object.entries(a.titelJeFormular)) karte.set(titel, FORMULAR_ZU_WAHL[form]);
    if (a.zitateJeFormular) for (const [form, t] of Object.entries(a.zitateJeFormular)) karte.set(t, FORMULAR_ZU_WAHL[form]);
    for (const slot of a.slots) for (const f of slot.felder) {
      if (!f.nurFormular) continue;
      karte.set(f.label, FORMULAR_ZU_WAHL[f.nurFormular]);
      for (const o of (f.optionen || [])) karte.set(o.label, FORMULAR_ZU_WAHL[f.nurFormular]);
    }
  }
  return karte;
}

/* Titel an den eigenen Trennern zerlegen; eine reine Ziffer ist eigene Zählung der Plätze. */
function titelTeile(t) { return String(t).split(E.TRENNER).filter((x) => !/^\d+$/.test(x)); }

/* Sammelt aus den Moduldateien jeden Text an einer amtlichen Stelle: [{text, ort}].
   `bedienung` ist die Menge der Texte, die als eigener Text gelten (Erzeuger), für die „immer"-Blöcke. */
function amtlicheStellen(module, bedienung) {
  const stellen = [];
  /* `bindung`: an welches Formular die Stelle gebunden ist — 'lp1f'/'lp1h' über `sichtbarWenn` (Übertragungsliste)
     oder den Hinweis „Nur im Formular …" (Bereich), 'frei' für die Wahl des Formulars selbst, sonst null. */
  const add = (text, ort, bindung) => stellen.push({ text, ort, bindung: bindung || null });
  const hinweisBindung = (hint) => {
    for (const spr of Object.keys(E.B)) {
      if (hint === E.B[spr].nurLp1f) return 'lp1f';
      if (hint === E.B[spr].nurLp1h) return 'lp1h';
    }
    return null;
  };
  const { bereichDe, bereichEn, listeDe, listeEn, rechtsraum } = module;
  for (const [name, m] of [['bereich-de', bereichDe], ['bereich-en', bereichEn]]) {
    for (const bereich of Object.values(m.bereiche)) {
      for (const sek of bereich.sektionen) {
        for (const t of titelTeile(sek.label)) add(t, name + '#' + sek.id + '.label');
        for (const f of sek.felder) {
          const bindung = f.id === E.FORMULAR_WAHL.id ? 'frei' : hinweisBindung(f.hint);
          add(f.label, name + '#' + sek.id + '/' + f.id + '.label', bindung);
          for (const o of (f.optionen || [])) add(o.label, name + '#' + sek.id + '/' + f.id + '/' + o.wert, bindung);
        }
      }
    }
  }
  for (const [name, m] of [['uebertragungsliste-de', listeDe], ['uebertragungsliste-en', listeEn]]) {
    m.abschnitte.forEach((a, ai) => {
      if (ai > 0) for (const t of titelTeile(a.titel)) add(t, name + '#' + ai + '.titel');
      a.bloecke.forEach((blk, bi) => {
        const ort = name + '#' + ai + '/' + bi;
        const bindung = blk.feldId === E.FORMULAR_WAHL.id ? 'frei'
          : (blk.sichtbarWenn && blk.sichtbarWenn.feld === E.FORMULAR_WAHL.id ? blk.sichtbarWenn.wert : null);
        if (blk.typ === 'frageAntwortOderLuecke') add(String(blk.frage).replace(/:$/, ''), ort + '.frage', bindung);
        else if (blk.typ === 'freitextSatz') add(String(blk.satz).replace(/: \{text\}$/, ''), ort + '.satz', bindung);
        else if (blk.typ === 'auswahlFest') add(String(blk.text).replace(/^☒ /, ''), ort + '.text', bindung);
        else if (blk.typ === 'immer') for (const t of blk.texte) { if (!bedienung.has(t)) add(t, ort + '.texte', bindung); }
        else add('[unbekannter Blocktyp ' + blk.typ + ']', ort);
      });
    });
  }
  for (const r of rechtsraum.typen['enduring-power-of-attorney'].formvorschriften.regeln) {
    if (typeof r.fundstelle === 'string' && r.fundstelle.indexOf('LP1F/LP1H') === 0) add(r.text, 'rechtsraum.formvorschriften');
  }
  return stellen;
}

function moduleLesen(ordner) {
  const o = ordner || E.ZIEL;
  const lies = (n) => JSON.parse(fs.readFileSync(path.join(o, n), 'utf8'));
  return {
    rechtsraum: lies('rechtsraum-gb-eng-wls.json'),
    bereichDe: lies('bereich-de.json'), bereichEn: lies('bereich-en.json'),
    listeDe: lies('uebertragungsliste-de.json'), listeEn: lies('uebertragungsliste-en.json'),
  };
}

/* Die Bedienungstexte: die Tabelle B des Erzeugers und die Sachsätze — eine geschlossene Liste. Ein Text in einem
   „immer"-Block, der nicht darin steht, gilt als amtlich und muss im PDF stehen; ein neuer eigener Satz muss also
   erst in B eingetragen werden und kann sich nicht als Zitat ausgeben (und umgekehrt). */
function bedienungsTexte() {
  const s = new Set();
  for (const spr of Object.keys(E.B)) for (const t of Object.values(E.B[spr])) s.add(t);
  for (const spr of Object.keys(E.SACHSATZ)) for (const t of Object.values(E.SACHSATZ[spr])) s.add(t);
  return s;
}

function wortlautPruefen(opts) {
  const o = opts || {};
  const module = o.module || moduleLesen(o.modulOrdner);
  const texte = o.pdfTexte || pdfTexte();
  const bedienung = o.bedienung || bedienungsTexte();
  const spezifisch = formSpezifisch();
  const fehler = [];
  const stellen = amtlicheStellen(module, bedienung);
  for (const { text, ort, bindung } of stellen) {
    if (typeof text !== 'string' || !text.trim()) { fehler.push(ort + ': leer'); continue; }
    if (text === E.GEBUEHR.text) continue;   // eigene Prüfung unten (Quelle und Abrufdatum)
    /* Gebunden an ein Formular: gegen genau dieses. Ungebunden: gegen beide — ein Text, den nur eines der beiden
       Formulare kennt, muss also an seiner Stelle gebunden sein, sonst ist er rot. */
    const formulare = (bindung === 'lp1f' || bindung === 'lp1h') ? [FORMULAR_ZU_WAHL[bindung]]
      : (bindung === 'frei' && spezifisch.has(text)) ? [spezifisch.get(text)] : Object.keys(texte);
    const nicht = formulare.filter((f) => !wortgenauEnthalten(texte[f], text));
    if (nicht.length) fehler.push(ort + ': „' + text + '" steht nicht wörtlich in ' + nicht.join(', '));
  }
  /* Die Gebühr: nur mit Adresse und Abrufdatum. */
  const gebuehr = module.rechtsraum.typen['enduring-power-of-attorney'].formvorschriften.regeln.find((r) => r.text === E.GEBUEHR.text);
  if (!gebuehr || !/^https:\/\/www\.gov\.uk\//.test(gebuehr.fundstelle || '') || !/^\d{4}-\d{2}-\d{2}$/.test(gebuehr.abgerufen || '')) {
    fehler.push('rechtsraum.formvorschriften: die Gebühr steht ohne gov.uk-Adresse oder ohne Abrufdatum');
  }
  /* Die Quelle am Rechtsraum-Modul: OPG, OGL v3.0, Stand der gepinnten Formulare. */
  const q = module.rechtsraum.quelle || {};
  if (q.behoerde !== 'Office of the Public Guardian' || q.lizenz !== 'Open Government Licence v3.0' || q.stand !== LPA_FORMULARE.LP1F.stand) {
    fehler.push('rechtsraum.quelle: Behörde, Lizenz oder Stand passen nicht zum gepinnten Formular');
  }
  /* Die Seitenadresse: die der gepinnten Formulare, keine bloße Weiterleitung. */
  if (q.url !== LPA_FORMULARE.LP1F.url || ALTE_SEITENADRESSEN.indexOf(q.url) >= 0) {
    fehler.push('rechtsraum.quelle: url ist nicht die Publikationsseite der gepinnten Formulare (' + LPA_FORMULARE.LP1F.url + ')');
  }
  /* Ein Zitat aus dem Gesetz trägt die Adresse der Norm auf legislation.gov.uk und ein Abrufdatum. */
  for (const r of module.rechtsraum.typen['enduring-power-of-attorney'].formvorschriften.regeln) {
    if (typeof r.fundstelle !== 'string' || r.fundstelle.indexOf('Mental Capacity Act 2005') !== 0) continue;
    if (!/^https:\/\/www\.legislation\.gov\.uk\/ukpga\/2005\/9\//.test(r.uri || '') || !/^\d{4}-\d{2}-\d{2}$/.test(r.abgerufen || '')) {
      fehler.push('rechtsraum.formvorschriften: ' + r.fundstelle + ' ohne legislation.gov.uk-Adresse oder ohne Abrufdatum');
    }
  }
  return { geprueft: stellen.length, fehler };
}

/* Der Standard-Extraktor: pdftotext (poppler) in Lesereihenfolge. Liefert den Text oder null, wenn es kein
   pdftotext gibt oder es scheitert. Einspritzbar (opts.extraktor), damit die Logik des --dokument-Pfads in der Suite
   mit erfundenen Bytes geprüft werden kann, ohne ein amtliches PDF im Repo und ohne pdftotext. */
function pdftotextExtraktor(pdfPfad) {
  const r = spawnSync('pdftotext', [pdfPfad, '-'], { encoding: 'utf8' });
  return (r.error || r.status !== 0) ? null : r.stdout;
}

/* Eine heruntergeladene Fassung gegen den Pin. Ergebnis: { fehler, formular, uebersprungen }.
   `uebersprungen` heißt: die Prüfsumme passt, aber ohne Extraktor ließ sich der Text nicht vergleichen — das ist
   KEIN Grün (dokumentExitCode: 2). */
function dokumentPruefen(pdfPfad, opts) {
  const formulare = (opts && opts.formulare) || LPA_FORMULARE;
  const extraktor = (opts && opts.extraktor) || pdftotextExtraktor;
  const fehler = [];
  const ist = sha256(pdfPfad);
  const passend = Object.entries(formulare).find(([, f]) => f.sha256 === ist);
  if (!passend) {
    fehler.push(path.basename(pdfPfad) + ': SHA-256 ' + ist + ' ist keiner der gepinnten Stände — eine neue Fassung? Erst lesen, dann den Pin umsetzen.');
    return { fehler, formular: null, uebersprungen: false };
  }
  const text = extraktor(pdfPfad);
  if (typeof text !== 'string') return { fehler, formular: passend[0], uebersprungen: true };
  if (extraktNormalisieren(text) !== fs.readFileSync(passend[1].text, 'utf8')) {
    fehler.push(passend[0] + ': der frisch extrahierte Text weicht von der Fixture ab');
  }
  return { fehler, formular: passend[0], uebersprungen: false };
}

/* Exit-Code und Meldung des --dokument-Pfads: 1 rot, 2 übersprungen, 0 grün. */
function dokumentUrteil(r, name) {
  if (r.fehler.length) return { exit: 1, meldung: '[lpa-wortlaut] ROT\n  - ' + r.fehler.join('\n  - ') };
  if (r.uebersprungen) return { exit: 2, meldung: '[lpa-wortlaut] ÜBERSPRUNGEN — Prüfsumme passt (' + r.formular + '), kein Text-Extraktor (pdftotext), der Text ist nicht verglichen.' };
  return { exit: 0, meldung: '[lpa-wortlaut] OK — ' + name + ' ist der gepinnte Stand ' + r.formular + ', Text gleich der Fixture.' };
}

function main(argv) {
  const i = argv.indexOf('--dokument');
  if (i >= 0) {
    const u = dokumentUrteil(dokumentPruefen(argv[i + 1]), path.basename(argv[i + 1]));
    (u.exit === 1 ? console.error : console.log)(u.meldung);
    return u.exit;
  }
  const j = argv.indexOf('--modul-ordner');
  const fehler = pinsPruefen().concat(wortlautPruefen({ modulOrdner: j >= 0 ? argv[j + 1] : null }).fehler);
  if (fehler.length) { console.error('[lpa-wortlaut] ROT\n  - ' + fehler.join('\n  - ')); return 1; }
  const n = wortlautPruefen({ modulOrdner: j >= 0 ? argv[j + 1] : null }).geprueft;
  console.log('[lpa-wortlaut] OK — LP1F/LP1H 08.25: Pins stehen, ' + n + ' amtliche Stellen wörtlich im Text belegt.');
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { LPA_FORMULARE, ALTE_SEITENADRESSEN, pinsPruefen, pdfTexte, wortlautPruefen, dokumentPruefen, dokumentUrteil, pdftotextExtraktor, moduleLesen, amtlicheStellen,
  bedienungsTexte, extraktNormalisieren, ohneLeerraum, einLeerraum, wortgenauEnthalten, sha256 };
