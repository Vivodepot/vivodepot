'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Fünf Beispielbündel — eines je Modul-Art
   ────────────────────────────────────────────────────────────────────────────
   Strang D3 des Laufzettels „Nacht 21./22.08.2026": *„Ein Beispielbündel je
   Modul-Art — fünf Stück, jedes lädt. Textsatz, Rechtsraum, Institutions-Art,
   Format, Bereich. Prüfstoff, nicht Veröffentlichung."*

   DER ZWECK IST ZWEITEILIG, und der zweite Teil ist der eigentliche: sie sind
   die Vorarbeit für die Anleitung — und **sie zeigen beim Bauen, wie schwer es
   ist, ein Modul von Hand zu schreiben.** Genau die Frage aus dem Konzept,
   Abschnitt 1e: ein Erzeuger oder fünf Werkzeuge?

   WAS DABEI SCHWERFIEL, ist je Bündel unter `WIDERSTAND` notiert — nicht als
   Meinung, sondern als das, was der erste Versuch zurückwies und woran es lag.
   Diese Notizen sind die Antwort auf die Frage; die Bündel selbst sind nur der
   Weg dorthin.

   ALLE KENNUNGEN TRAGEN `zz`/`ZZ` ODER `pruefstoff` — nichts hiervon ist zur
   Veröffentlichung bestimmt, und keine Kennung kann mit einer echten kollidieren.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── 1 · TEXTSATZ ──────────────────────────────────────────────────────────── */
const TEXTSATZ = Object.freeze({
  modulTyp: 'textsatz',
  sprache: 'zz-Probe',
  moduleVersion: 1,
  anbieterId: 'pruefstoff',
  texte: {
    'identitaet.vorname.label': 'ZZ-Vorname',
    'identitaet.nachname.label': 'ZZ-Nachname',
  },
  regeln: {
    datumsformat: 'JJJJ-MM-TT',
    waehrung: 'CHF',
    schreibrichtung: 'ltr',
  },
});
const TEXTSATZ_WIDERSTAND = [
  'DIE KENNUNGEN SIND NICHT ERRATBAR. Ein Text darf nur unter einer Kennung stehen, die '
  + '`AB_WERK_TEXTSATZ_DE` bereits führt — 2 509 Stück, und die Form `bereich.feld.label` steht '
  + 'in keinem Dokument, das ein Anbieter bekäme. Wer sie nicht kennt, schreibt ein gültiges '
  + 'Modul, das NICHTS tut: unbekannte Kennungen werden benannt verworfen, das Modul selbst '
  + 'gilt weiter.',
  'DIE ERLAUBTEN REGEL-WERTE STEHEN NIRGENDS. `datumsformat` nimmt vier Werte, `dezimaltrenner` '
  + 'zwei, `waehrung` einen freien ISO-4217-Code. Ein Tippfehler verliert GENAU DIESE Regel — '
  + 'nicht das Modul. Ohne Werkzeug merkt es niemand.',
];

/* ── 2 · RECHTSRAUM ────────────────────────────────────────────────────────── */
const RECHTSRAUM = Object.freeze({
  modulTyp: 'rechtsraum', sprache: 'de',
  rechtsraum: 'ZZ',
  moduleVersion: 1,
  anbieterId: 'pruefstoff',
  typen: {
    'enduring-power-of-attorney': {
      katalogVersion: 1,
      wortlaut: 'Vollmacht (Prüfstoff-Rechtsraum ZZ)\n\nIch, …, erteile hiermit Vollmacht an …',
      zweck: ['vermoegenssorge'],
    },
  },
});
const RECHTSRAUM_WIDERSTAND = [
  'DER TYP-NAMENSRAUM IST GESCHLOSSEN. `typen` nimmt nur Kennungen, die der Kern kennt, oder '
  + 'solche mit dem `tpl_`-Präfix. Ein Rechtsraum, der ein Instrument mitbringt, das es in '
  + 'Deutschland nicht gibt, muss es unter einem Präfix nennen, das nach einem Vorlagenfeld '
  + 'aussieht. Das ist nicht falsch, aber es steht nirgends.',
  '`katalogVersion` IST PFLICHT UND STEHT AM TYP, nicht am Modul — neben `moduleVersion` am '
  + 'Modul. Zwei Versionszahlen an zwei Ebenen, und die eine fehlt zu lassen macht das Modul '
  + 'ungültig, nicht den Typ. Der erste Versuch dieses Bündels scheiterte genau daran.',
  '`DE` IST RESERVIERT. Richtig so — aber die Meldung heisst `reserviert`, und wer sein Modul '
  + 'zum Ausprobieren erst einmal auf `DE` schreibt, bekommt ein Wort und keine Erklärung.',
];

/* ── 3 · INSTITUTIONS-ART ──────────────────────────────────────────────────── */
const INSTITUTIONS_ART = Object.freeze({
  modulTyp: 'institutionsArt', sprache: 'de',
  moduleVersion: 1,
  herkunft: 'pruefstoff',
  anbieterId: 'pruefstoff',
  arten: {
    'zz-stiftung': 'Stiftung (Prüfstoff)',
    'zz-verein': 'Eingetragener Verein (Prüfstoff)',
  },
});
const INSTITUTIONS_ART_WIDERSTAND = [
  '`arten` IST EIN OBJEKT, KEINE LISTE. Der erste Versuch schrieb '
  + '`arten: [{id, label}]` — die naheliegende Form, und die Form, die das BEREICHS-Modul '
  + 'tatsächlich verlangt. Das Ergebnis war ein GÜLTIGES Modul mit null Arten und einem '
  + 'verworfenen Eintrag namens „0". **Zwei Register, zwei Formen für dieselbe Sache.**',
];

/* ── 4 · FORMAT ────────────────────────────────────────────────────────────── */
const FORMAT = Object.freeze({
  modulTyp: 'format', sprache: 'de',
  format: 'zz-pruefstoff-csv',
  moduleVersion: 1,
  /* KEIN `anbieterId` — die Schlüsselliste dieses Registers führt ihn nicht, und
     ein unbekannter Schlüssel wird benannt verworfen. Vier der fünf Register
     nehmen ihn; dieses eine nicht. */
  richtung: 'import',
  sektor: 'finance',
  label: 'Prüfstoff-CSV (ZZ)',
  /* `leser` ist bei `richtung: 'import'` PFLICHT und muss eine Kennung aus
     `FORMAT_LESER` sein — der Kern liest, das Modul beschreibt nur. */
  leser: 'json@1',
  quelle: 'eintraege',
  /* `feld` ist die KERN-Feldkennung im Bereich `sektor`, `ziel` der Pfad in der
     fremden Datei — nicht umgekehrt. Der erste Versuch hatte beides vertauscht
     und bekam `feld-unbekannt`: „Ein Modul ERFINDET KEIN FELD." */
  zuordnung: [{ feld: 'taxIdsTaxNumbers', ziel: 'steuernummer' }],
});
const FORMAT_WIDERSTAND = [
  'DER ERSTE VERSUCH SCHEITERTE ZWEIMAL AN DERSELBEN STELLE — an dem, was NICHT dasteht. '
  + '`mime`, `endung` und `anbieterId` wurden als „unbekannt" verworfen (die Schlüsselliste ist '
  + 'geschlossen und steht in keinem Dokument), und danach fehlte `leser`: bei '
  + '`richtung: import` ist er PFLICHT und muss eine Kennung aus `FORMAT_LESER` sein. '
  + '**Ein Format-Modul beschreibt ein Format; den Leser bringt der Kern mit.** Wer das nicht '
  + 'weiss, schreibt genau das falsche Modul — und die Ablehnung heisst `leser`, ein Wort.',
  'UND EIN DRITTES MAL, an der Zuordnung: `feld` ist die KERN-Feldkennung, `ziel` der Pfad in '
  + 'der fremden Datei. Der erste Versuch hatte beides vertauscht — die Meldung heisst '
  + '`feld-unbekannt`, und der Kommentar an der Stelle sagt den Grund („Ein Modul ERFINDET KEIN '
  + 'FELD"), aber der Kommentar steht im Kern und nicht beim Anbieter. **Drei Anläufe für ein '
  + 'Modul mit acht Zeilen.**',
  'UND `anbieterId` GEHT HIER NICHT. Vier der fünf Register nehmen ihn (A437); dieses eine '
  + 'führt eine geschlossene Schlüsselliste, die ihn nicht kennt — er wird benannt verworfen, '
  + 'und das Modul gilt trotzdem. **Fünf Register, fünf Formen.**',
  'ES TRÄGT KEINEN CODE, UND DAS IST DIE ERSTE PRÜFUNG. `_formatModulTraegtCode` läuft VOR '
  + 'allem anderen. Ein Format-Modul beschreibt ein Format; es bringt keinen Parser mit. Wer '
  + 'das nicht weiss, baut zuerst das Falsche.',
  '`sektor` MUSS EIN EINGEBAUTER SEIN. Ein Format für einen angedockten Bereich geht nicht — '
  + 'die Prüfung liest `SEKTOREN`, nicht den Laufzeit-Index. Das ist dieselbe Klasse wie A451, '
  + 'nur an einer anderen Stelle und hier NICHT gemessen, ob es dieselbe Reihenfolge-Frage ist.',
  'DIE SCHLÜSSELLISTE IST GESCHLOSSEN. Jeder Schlüssel ausserhalb von `FORMAT_MODUL_SCHLUESSEL` '
  + 'wird benannt verworfen — das Modul gilt weiter. Ein Anbieter, der ein Feld zu viel '
  + 'schreibt, bekommt „angenommen" und hat etwas verloren.',
];

/* ── 5 · BEREICH ───────────────────────────────────────────────────────────── */
const BEREICH = Object.freeze({
  modulTyp: 'bereich', sprache: 'de',
  moduleVersion: 1,
  herkunft: 'pruefstoff',
  anbieterId: 'pruefstoff',
  bereiche: {
    zzobhut: { label: 'Prüfstoff-Rubrik ZZ' },
  },
});
const BEREICH_WIDERSTAND = [
  // Schnitt Glied 5 (23.08.2026, A484): GELÖST, nicht gelöscht. `bereiche` war eine Liste,
  // `arten` (Institutions-Modul) ein Objekt — „dieselbe Sache, zwei Formen". Gemessen (nicht
  // geraten): 32 Bestandsstellen bauten `bereiche` als Liste, 128 `arten`/`typen`/`texte` als
  // Objekt — das Objekt gewann. `bereiche` ist seither wie `arten`/`typen` verschlüsselt
  // (Schlüssel = ID). Der Fund bleibt hier stehen, als Beleg für den WIDERSTAND, den dieses
  // Bündel tatsächlich fand — nur die Form über ihm ist jetzt die aktuelle.
  '`bereiche` WAR EINE LISTE VON OBJEKTEN — anders als `arten` beim Institutions-Modul, das '
  + 'ein Objekt verlangt(e). **Dieselbe Sache, zwei Formen, ein Register auseinander.** Genau '
  + 'dieser Fund hat Glied 5 des Schnitts ausgelöst: `bereiche` ist jetzt ebenfalls ein Objekt.',
  'DIE ID-FORM IST GEPRÜFT UND STEHT NIRGENDS. `_BEREICH_ID_FORM` lässt kein Minuszeichen zu; '
  + '`zz-obhut` wird mit `grund: id` verworfen, `zzobhut` geht. Das ist der einzige Punkt '
  + 'dieses Bündels, an dem der erste Versuch scheiterte — und die Meldung nennt den Grund, '
  + 'nicht die Regel.',
];

const BUENDEL = Object.freeze([
  { art: 'textsatz', modul: TEXTSATZ, slot: 'textsatzModule', widerstand: TEXTSATZ_WIDERSTAND },
  { art: 'rechtsraum', modul: RECHTSRAUM, slot: 'rechtsraumModule', widerstand: RECHTSRAUM_WIDERSTAND },
  { art: 'institutionsArt', modul: INSTITUTIONS_ART, slot: 'institutionsArten', widerstand: INSTITUTIONS_ART_WIDERSTAND },
  { art: 'format', modul: FORMAT, slot: 'formatModule', widerstand: FORMAT_WIDERSTAND },
  { art: 'bereich', modul: BEREICH, slot: 'bereichsModule', widerstand: BEREICH_WIDERSTAND },
]);

module.exports = { BUENDEL, TEXTSATZ, RECHTSRAUM, INSTITUTIONS_ART, FORMAT, BEREICH };
