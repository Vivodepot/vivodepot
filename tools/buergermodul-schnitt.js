'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   buergermodul-schnitt.js — trennt den eingebauten Bestand in die DREI Module,
   aus denen die Bürgerapp zusammengesetzt wird (U2-ADR-291)
   ────────────────────────────────────────────────────────────────────────────
   DIE DREITEILUNG (Festlegung, 05.09.2026):

     VD Privat Struktur — welche Bereiche, Felder, Situationen, Wizards
     VD dt. Rechtsraum Recht — Fristen, Stellen, Rechtsbezüge, Pflichtigkeiten
     VD dt. Sprache Text — alles, was die Bürgerin LIEST

     Gerüst + Privat + dt. Rechtsraum + dt. Sprache = kostenlose dt. Bürgerapp
     Gerüst + Privat + dt. Rechtsraum + engl. Sprache = kostenlose engl. Bürgerapp

   DER PRÜFSTEIN, an dem jede Eigenschaft entschieden wird:
     Wechsle die Sprache. Was sich ändert, ist Sprache. Was bleibt, ist Struktur.
     Wechsle den Rechtsraum. Was sich ändert, ist Rechtsraum.

   WARUM DER TEXT RAUS MUSS AUS DER STRUKTUR: `SEKTOREN` entsteht im Kern als
   `_textsatzAufSektorenAnwenden([…])` — der deutsche Text ist EINGEBACKEN. Bliebe
   er drin, müsste die englische App ein zweites `VD Privat` sein, und die beiden
   liefen auseinander. Rechtsraum und Sprache werden später von Pro mitbenutzt;
   nichts Privates darf darum in diese beiden.

   DIE TRAGENDE INVARIANTE, gemessen statt behauptet:

     Struktur ∪ Sprache ∪ Recht = nativer Bestand, paarweise disjunkt

   Eine Eigenschaft, die beim Schneiden verschwindet, ist genau das, was die
   Bürgerin bemerken würde. Das Werkzeug bricht darum ab, wenn eine Eigenschaft
   in keiner der drei Schubladen landet — statt sie still fallen zu lassen.

   DIE SCHLÜSSELFORMEN DES TEXTSATZES SIND GEMESSEN, NICHT GERATEN (05.09.2026 —
   drei falsche Annahmen hintereinander, bis sie an den Daten geprüft waren):

     Feld <sektorId>.<feldId>.<rolle>
     Feld-Option <sektorId>.<feldId>/<wert>.label
     UnterFeld <sektorId>.<traegerFeldId>/<unterFeldId>.<rolle>
     UnterFeld-Opt <sektorId>.<traegerFeldId>/<unterFeldId>/<wert>.label

   Die Kette des TRÄGERFELDS gehört in den Schlüssel — sie wegzulassen war der
   Fehler, der 134 falsche „Lücken" erzeugte, wo keine einzige war.

   Aufruf: node tools/buergermodul-schnitt.js [zielverzeichnis]
   ════════════════════════════════════════════════════════════════════════════ */
const { deTexte } = require('./lib/textsatz-de-quelle.js');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Eigenschaften eines Feldes, die RECHT tragen — sie ändern sich beim Rechtsraum-
   wechsel, nicht beim Sprachwechsel. Gemessen an den Werten selbst:
     fristRegel            {"dauer":"P1M","quelle":"§ 84 Abs. 1 SGG"}  -> deutsche Norm
     gueltigkeitVorschlag  {"ausFeld":…,"regel":"ausweisdauer"}        -> deutsche Ausweisdauer
   Beide sind im Bestand selten (2 bzw. 1 Feld) — die Seltenheit ist kein Grund,
   sie in der Struktur zu lassen: in einem anderen Rechtsraum stimmen sie nicht. */
const RECHTS_EIGENSCHAFTEN = Object.freeze(['fristRegel', 'gueltigkeitVorschlag']);

/* VIERTE ACHSE — Branding (Festlegung, 05.09.2026: „alles ist modular").
   Alles, was „Vivodepot" SAGT oder ZEIGT, gehört ins Branding-Modul, nicht in die
   Struktur — sonst kann später keine Fremdmarke aufsetzen und der Baukasten trägt nur
   uns selbst.

   DER MARKENNAME WIRD GEMESSEN, NICHT GESETZT: der Kern führt keine
   Produktnamen-Konstante (geprüft: kein `const PRODUKT…`/`APP_NAME`). Der Name steht
   als Datenwert im Dokument-Katalog (`persoenliches.standardDokumente[].typ ===
   'vivodepot'`). Diesen Wert nimmt der Schnitt — eine hier hingeschriebene Zeichenkette
   wäre eine zweite Wahrheit neben dem Bestand.

   NACHTRAG (14.09.2026, Marke-Achse-Plan §1): Farbe/Schriftart kommen jetzt MIT heraus —
   nicht aus dem CSS-Gerüst geparst (das bliebe ein eigener Gegenstand, s. u.), sondern aus
   `V.AB_WERK_BRANDING` (U2-ADR-384) übernommen: derselbe Kern-Wert, den auch
   `tools/vivodepot-branding-inhalt.js` liest, bereits einmal durch `brandingModulPruefen`
   gelaufen. Kein zweiter CSS-Parser, nur ein zweiter Leser derselben, schon geprüften Quelle.

   WAS WEITERHIN NICHT HERAUSKOMMT: das Logo. `brandingModulPruefen` nimmt `logo` als
   data:-URL entgegen, aber Vivodepots eigenes Icon liegt als Inline-SVG im Markup
   (`.logo-mark`), nicht als data:-URL — `AB_WERK_BRANDING.logo` ist darum korrekt `null`,
   kein Auslassungsfall, sondern der native Zustand selbst (ADR-296: „eigenes Logo bleibt
   textbasiert"). Es bleibt deshalb in der Auslassungsliste, nicht weil es fehlt, sondern
   weil es für Vivodepots eigene Marke nichts zu schneiden gibt. */
const BRANDING_DOKUMENT_TYP = 'vivodepot';
const BRANDING_NICHT_GESCHNITTEN = Object.freeze([
  { was: 'logo', grund: 'Vivodepots eigenes Icon ist Inline-SVG im Markup, kein data:-URL-Datenwert — AB_WERK_BRANDING.logo ist korrekt null, nicht auslassungsbedürftig' },
]);

/* Eigenschaften, die reine Struktur sind, obwohl sie nach Text aussehen könnten —
   je mit dem Grund, warum sie NICHT in die Sprache gehören. Diese Liste ist Teil
   der Auslassungsliste und keine Bequemlichkeit. */
const STRUKTUR_TROTZ_ANSCHEIN = Object.freeze({
  verweisZweck: 'ein Enum (z. B. "familiaer"), kein gelesener Text — es steuert die Verweis-Logik',
  zusammenfassungFelder: 'eine Liste von Feld-KENNUNGEN, keine Texte',
  codeListe: 'der NAME einer Codeliste, nicht ihr Inhalt',
  marken: 'Struktur-Marken (U2-ADR-Kennzeichnung), nicht sichtbarer Text',
});

function textRollen(V) {
  const r = V.TEXTSATZ_ARTEN_FELD;
  if (!Array.isArray(r) || !r.length) throw new Error('TEXTSATZ_ARTEN_FELD nicht exportiert — der Schnitt hinge sonst an einer erfundenen Liste');
  return r;
}

/* Baut den Textsatz-Schlüssel für eine Rolle. `traeger` ist die Feld-ID des
   TRÄGERFELDS, wenn es sich um ein UnterFeld handelt — sonst null. */
function textKennung(sektorId, feldId, rolle, traeger) {
  return traeger
    ? sektorId + '.' + traeger + '/' + feldId + '.' + rolle
    : sektorId + '.' + feldId + '.' + rolle;
}
function optionKennung(sektorId, feldId, wert, traeger) {
  return traeger
    ? sektorId + '.' + traeger + '/' + feldId + '/' + wert + '.label'
    : sektorId + '.' + feldId + '/' + wert + '.label';
}

/* Zerlegt EIN Feld-Definitionsobjekt in seine drei Anteile. Jede Eigenschaft landet
   in genau einem — oder in `unentschieden`, was den Lauf abbricht. */
function feldSchneiden(sektorId, feld, rollen, traeger) {
  const struktur = {};
  const sprache = {};
  const recht = {};
  const unentschieden = [];
  const vorschlaegeKandidaten = [];

  for (const k of Object.keys(feld)) {
    const wert = feld[k];

    if (k === 'unterFelder') continue;               // rekursiv, s. Aufrufer
    if (k === 'optionen') {
      /* Der WERT einer Option ist Struktur (er wird gespeichert), ihr LABEL ist Sprache. */
      if (Array.isArray(wert)) {
        struktur.optionen = wert.map((o) => {
          if (!o || typeof o !== 'object') return o;
          const rest = {};
          for (const ok of Object.keys(o)) if (ok !== 'label') rest[ok] = o[ok];
          if (typeof o.label === 'string' && o.label !== '' && o.wert !== undefined) {
            sprache[optionKennung(sektorId, feld.id, o.wert, traeger)] = o.label;
          }
          return rest;
        });
      } else struktur.optionen = wert;
      continue;
    }
    if (k === 'vorschlaege') {
      /* Datalist-Vorschläge sind gelesener Text. Ihre Textsatz-Form ist ANDERS als bei
         `textKennung`/`optionKennung`: `feld.<feldId>.vorschlaege`, ohne sektorId — Top-
         Level-Feld-IDs sind katalogweit eindeutig, s. `_vorschlaegeTextsatz`. UnterFelder
         teilen sich aber 17 IDs mehrfach (U2-ADR-399, 06.09.2026) — hier NICHT sofort
         entschieden, WELCHE Form zutrifft: gesammelt, damit `schneiden()` es GEGEN DEN
         GANZEN KATALOG entscheiden kann (diese Funktion sieht nur EIN Feld und wüsste bei
         `laender`/`fach`/`betreuungsmodell`/`vorgangstyp` — UnterFelder mit eindeutiger ID —
         sonst fälschlich, sie bräuchten die Trägerkette, und bräche deren bestehende,
         sektorId-lose Kennung). */
      if (Array.isArray(wert) && wert.length) {
        vorschlaegeKandidaten.push({ feldId: feld.id, traeger, wert: wert.join(' · ') });
      }
      continue;
    }
    if (rollen.indexOf(k) >= 0) {
      if (typeof wert === 'string' && wert !== '') sprache[textKennung(sektorId, feld.id, k, traeger)] = wert;
      /* Ein leerer Text ist KEINE fehlende Übersetzung — er ist ein leeres Feld.
         (Gemessen: `people.childrenAndDependants/note.beispiel` ist "", und wurde
         beim ersten Zählen fälschlich als Deckungslücke geführt.) */
      continue;
    }
    if (RECHTS_EIGENSCHAFTEN.indexOf(k) >= 0) { recht[k] = wert; continue; }
    if (Object.prototype.hasOwnProperty.call(STRUKTUR_TROTZ_ANSCHEIN, k)) { struktur[k] = wert; continue; }

    /* Alles Übrige ist Struktur — aber nur, wenn es kein freier Text ist. Ein
       unbekannter String-Wert wäre genau die Sorte, die still Deutsch in die
       Struktur trüge; er wird gemeldet statt einsortiert. */
    if (typeof wert === 'string' && wert.length > 24 && /\s/.test(wert)) {
      unentschieden.push({ sektorId, feldId: feld.id, eigenschaft: k, wert: wert.slice(0, 60) });
      continue;
    }
    struktur[k] = wert;
  }

  return { struktur, sprache, recht, unentschieden, vorschlaegeKandidaten };
}

/* Entscheidet die Kennungsform je `feldId` GEGEN DEN GANZEN KATALOG (U2-ADR-399,
   06.09.2026): trägt eine Feld-ID vorschlaege nur EINMAL, bleibt die alte, sektorId-lose
   Form (`feld.<feldId>.vorschlaege`) — auch für ein UnterFeld mit eindeutiger ID, damit
   keine bestehende Kennung sich ändert. Trägt sie MEHRFACH (die 17 katalogweit doppelt
   vergebenen UnterFeld-IDs), bekommt JEDES Vorkommen die Trägerkette
   (`feld.<traeger>/<feldId>.vorschlaege`) — sonst bekäme eine Liste die Vorschläge der
   anderen. */
function vorschlaegeKennungenZuweisen(kandidaten, sprache) {
  const nachFeldId = new Map();
  for (const k of kandidaten) {
    if (!nachFeldId.has(k.feldId)) nachFeldId.set(k.feldId, []);
    nachFeldId.get(k.feldId).push(k);
  }
  for (const [feldId, eintraege] of nachFeldId) {
    if (eintraege.length === 1) {
      sprache['feld.' + feldId + '.vorschlaege'] = eintraege[0].wert;
      continue;
    }
    for (const e of eintraege) {
      const kennung = e.traeger ? 'feld.' + e.traeger + '/' + feldId + '.vorschlaege' : 'feld.' + feldId + '.vorschlaege';
      sprache[kennung] = e.wert;
    }
  }
}

function schneiden(V) {
  const rollen = textRollen(V);
  const privat = { bereiche: {} };
  const sprache = {};
  const recht = { felder: {} };
  const marke = {};
  const unentschieden = [];
  const vorschlaegeKandidaten = [];
  let felderGesamt = 0;

  /* Kampagne „eine Leseart statt dreiundvierzig", Zug 2 (09.09.2026) — `bereicheAlle()`
     statt der Buendel-Liste: ein AB WERK gesaeter Bereich steht nicht im Buendel und fiele
     sonst aus diesem Artefakt. Der Drift-Waechter wuerde das melden und anbieten, den
     Ausgabestand neu zu backen — was die Auslassung einfriert statt sie zu beheben. */
  for (const sektor of (V.bereicheAlle() || [])) {
    const sektionen = [];
    for (const sektion of (sektor.sektionen || [])) {
      const felder = [];
      for (const feld of (sektion.felder || [])) {
        felderGesamt++;
        const s = feldSchneiden(sektor.id, feld, rollen, null);
        Object.assign(sprache, s.sprache);
        unentschieden.push(...s.unentschieden);
        vorschlaegeKandidaten.push(...s.vorschlaegeKandidaten);
        if (Object.keys(s.recht).length) recht.felder[sektor.id + '.' + feld.id] = s.recht;

        const unterFelder = [];
        for (const unter of (feld.unterFelder || [])) {
          felderGesamt++;
          const u = feldSchneiden(sektor.id, unter, rollen, feld.id);
          Object.assign(sprache, u.sprache);
          unentschieden.push(...u.unentschieden);
          vorschlaegeKandidaten.push(...u.vorschlaegeKandidaten);
          if (Object.keys(u.recht).length) recht.felder[sektor.id + '.' + feld.id + '/' + unter.id] = u.recht;
          unterFelder.push(u.struktur);
        }
        if (unterFelder.length) s.struktur.unterFelder = unterFelder;
        felder.push(s.struktur);
      }
      /* Die Sektions-Texte tragen die RUBRIK-Form `<sektorId>#<sektionId>.<rolle>`
         (gemessen: `identitaet#fruehere-namen.label` und `.hint`). Sie ist ABLEITBAR
         und wird darum hier aufgelöst — nicht erst im Wert-Nachschlag, der bei
         mehrfach vorkommenden Texten zu Recht keine Entscheidung trifft. Genau daran
         scheiterten im ersten Lauf neun Einträge als „mehrdeutig": nicht weil sie
         unentscheidbar wären, sondern weil ich den ableitbaren Weg nicht zuerst ging. */
      const sektionStruktur = { id: sektion.id, felder };
      for (const k of Object.keys(sektion)) {
        if (k === 'felder' || k === 'id') continue;
        if (rollen.indexOf(k) >= 0 && typeof sektion[k] === 'string' && sektion[k] !== '') {
          sprache[sektor.id + '#' + sektion.id + '.' + k] = sektion[k];
          continue;
        }
        sektionStruktur[k] = sektion[k];
      }
      sektionen.push(sektionStruktur);
    }

    const bereich = { id: sektor.id, sektionen };
    for (const k of Object.keys(sektor)) {
      if (k === 'sektionen' || k === 'id') continue;
      if (rollen.indexOf(k) >= 0) {
        if (typeof sektor[k] === 'string' && sektor[k] !== '') sprache[sektor.id + '.' + k] = sektor[k];
        continue;
      }
      /* Der Dokument-Katalog trägt seine Texte unter `dokument.<typ>.<art>` — auch das
         eine ABLEITBARE Form (gemessen an `_dokumentTextsatzText`). `typ` ist die
         stabile Kennung des Dokuments, nicht seine Position in der Liste. */
      if (k === 'standardDokumente' && Array.isArray(sektor[k])) {
        bereich[k] = sektor[k].map((dok) => {
          if (!dok || typeof dok !== 'object' || !dok.typ) return dok;
          const rest = {};
          for (const dk of Object.keys(dok)) {
            const dv = dok[dk];
            if ((dk === 'name' || dk === 'hinweis') && typeof dv === 'string' && dv !== '') {
              /* Der eigene Produktname ist MARKE, nicht Sprache: er wird nicht übersetzt,
                 er wird ausgetauscht, wenn eine andere Marke aufsetzt. */
              if (dok.typ === BRANDING_DOKUMENT_TYP && dk === 'name') { marke.name = dv; continue; }
              sprache['dokument.' + dok.typ + '.' + dk] = dv;
              continue;
            }
            rest[dk] = dv;
          }
          return rest;
        });
        continue;
      }
      bereich[k] = sektor[k];
    }
    privat.bereiche[sektor.id] = bereich;
  }

  // U2-ADR-399 (06.09.2026): erst hier, mit Sicht auf den GANZEN Katalog, entscheidbar —
  // s. Kommentar an `vorschlaegeKennungenZuweisen`.
  vorschlaegeKennungenZuweisen(vorschlaegeKandidaten, sprache);

  /* Der Nachzieh-Durchgang gehoert HIERHER, nicht in main(): `schneiden()` muss einen
     FERTIGEN Schnitt zurueckgeben. Stand er nur im Aufrufer, bekaeme jeder andere
     Aufrufer — auch die Proben — eine Struktur, die noch Text traegt, und die
     Vollstaendigkeit haenge daran, dass man das Werkzeug richtig herum benutzt.
     (Genau daran fielen die ersten beiden Proben am 05.09.2026 durch.) */
  const nachgezogen = textAusStrukturZiehen(privat, rollen, deTexte(), sprache, unentschieden);

  /* U2-ADR-307 (05.09.2026) — NACHGEZOGEN. Der Schnitt lief bis hierher NUR ueber SEKTOREN
     und uebersah damit die Haelfte des Rechtsraums: der Bestand traegt SECHS Rechtsregeln,
     drei in SEKTOREN und drei in SITUATIONEN. Darunter § 1944 BGB — die Erbausschlagungs-
     frist von sechs Wochen. In einem anderen Rechtsraum waere sie still deutsch geblieben,
     und am Buendel haette es niemand gesehen: es sah vollstaendig aus, weil nichts darin
     fehlte, das es kannte. Ein Messwerkzeug, das einen Ort nicht ablaeuft, meldet dort
     keine Luecke.

     KENNUNGSFORM: `situation:<sitId>.<feldId>` — der eigene Kennungsraum der Situationen,
     nicht der Sektor-Raum. Eine Form allein ueber `feldId` faellt aus; das ist genau die
     Mehrdeutigkeit, an der `feld.art.vorschlaege` gescheitert ist (17 doppelte UnterFeld-IDs). */
  for (const sit of (V.SITUATIONEN || [])) {
    for (const blk of ((sit && sit.bloecke) || [])) {
      for (const e of ((blk && blk.eintraege) || [])) {
        const feld = e && e.feld;
        if (!feld || !feld.id) continue;
        const r = {};
        for (const k of RECHTS_EIGENSCHAFTEN) if (feld[k] !== undefined) r[k] = feld[k];
        if (Object.keys(r).length) recht.felder['situation:' + sit.id + '.' + feld.id] = r;
      }
    }
  }

  return { privat, sprache, recht, marke, unentschieden, felderGesamt, nachgezogen };
}

/* Der Vollständigkeits-Beweis: JEDER Text, den der Schnitt aus der Struktur
   herausgenommen hat, muss im nativen Textsatz unter DERSELBEN Kennung stehen.
   Steht er dort nicht, hat der Schnitt entweder eine Kennung falsch gebaut oder
   der Bestand trägt Text, den kein Sprachmodul je erreichen könnte — beides muss
   sichtbar werden, statt in einer Zahl zu verschwinden. */
function spracheGegenBestandPruefen(sprache, texte) {
  const fehlen = [];
  const abweichend = [];
  for (const [k, v] of Object.entries(sprache)) {
    if (!(k in texte)) { fehlen.push({ kennung: k, text: String(v).slice(0, 50) }); continue; }
    if (texte[k] !== v) abweichend.push({ kennung: k, imBestand: String(texte[k]).slice(0, 40), imSchnitt: String(v).slice(0, 40) });
  }
  return { geprueft: Object.keys(sprache).length, fehlen, abweichend };
}

/* Nicht jeder Text hat eine aus der Struktur ABLEITBARE Kennung. Gemessen:

     sektion.hint            -> <sektorId>#<sektionId>.hint          ableitbar
     standardDokumente.name  -> dokument.<typ>.name                  ableitbar
     exporte[].label         -> strings:exportIdentitaetLabel.text   NICHT ableitbar

   Die dritte Form ist ein frei vergebener `strings:`-Name; kein Pfad führt zu ihm.
   Statt eine Kennung zu ERFINDEN (die dann in keinem Sprachmodul stünde), wird der
   Text im nativen Textsatz über seinen WERT gesucht. Nur ein EINDEUTIGER Treffer
   zählt — steht derselbe Text unter mehreren Kennungen, ist nicht entscheidbar,
   welche gemeint ist, und der Fall wandert nach `unentschieden` statt geraten zu
   werden. */
function wertNachschlagBauen(texte) {
  const nach = new Map();
  for (const [k, v] of Object.entries(texte)) {
    if (typeof v !== 'string' || !v) continue;
    if (!nach.has(v)) nach.set(v, []);
    nach.get(v).push(k);
  }
  return nach;
}

/* Zieht die Texte, die der feldweise Schnitt nicht erfasst (Sektions-Rubriken,
   Export-Etiketten, Dokument-Namen), nachträglich aus der Struktur heraus.
   `name`/`hinweis` gehören dazu, obwohl sie NICHT in TEXTSATZ_ARTEN_FELD stehen:
   sie sind Rollen des Dokument-Wegs (`dokument.<typ>.<art>`), nicht des Feld-Wegs
   — dieselbe Unterscheidung wie bei U2-ADR-290. */
const WEITERE_TEXT_SCHLUESSEL = Object.freeze(['name', 'hinweis']);

function textAusStrukturZiehen(privat, rollen, texte, sprache, unentschieden) {
  const nach = wertNachschlagBauen(texte);
  const textig = rollen.concat(WEITERE_TEXT_SCHLUESSEL);
  let gezogen = 0;

  const lauf = (o, pfad, tiefe) => {
    if (!o || typeof o !== 'object' || tiefe > 30) return;
    if (Array.isArray(o)) { o.forEach((v, i) => lauf(v, pfad + '[' + i + ']', tiefe + 1)); return; }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (textig.indexOf(k) >= 0 && typeof v === 'string' && v !== '') {
        const treffer = nach.get(v) || [];
        if (treffer.length === 1) { sprache[treffer[0]] = v; delete o[k]; gezogen++; continue; }
        unentschieden.push({
          pfad: pfad + '.' + k, wert: v.slice(0, 60),
          grund: treffer.length === 0 ? 'kein-textsatz-schluessel' : 'mehrdeutig (' + treffer.length + ' Kennungen)',
        });
        continue;
      }
      lauf(v, pfad + '.' + k, tiefe + 1);
    }
  };
  lauf(privat, 'privat', 0);
  return gezogen;
}

/* Gegenprobe in die andere Richtung: trägt die geschnittene Struktur noch Text? */
function strukturAufTextPruefen(privat, rollen) {
  const treffer = [];
  const lauf = (o, pfad, tiefe) => {
    if (treffer.length >= 30 || tiefe > 30 || !o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach((v, i) => lauf(v, pfad + '[' + i + ']', tiefe + 1)); return; }
    for (const k of Object.keys(o)) {
      if (rollen.indexOf(k) >= 0 && typeof o[k] === 'string' && o[k] !== '') {
        treffer.push({ pfad: pfad + '.' + k, text: o[k].slice(0, 40) });
      }
      lauf(o[k], pfad + '.' + k, tiefe + 1);
    }
  };
  lauf(privat, 'privat', 0);
  return treffer;
}

function main() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  const rollen = textRollen(V);

  const { privat, sprache, recht, marke, unentschieden, felderGesamt, nachgezogen } = schneiden(V);
  const deckung = spracheGegenBestandPruefen(sprache, deTexte());
  const textInStruktur = strukturAufTextPruefen(privat, rollen);

  const ziel = process.argv[2] || path.join(__dirname, 'buergermodul');
  fs.mkdirSync(ziel, { recursive: true });

  /* Marke-Achse-Plan §1 (14.09.2026): Farbe/Schriftart kommen NICHT aus `schneiden()` (das
     bleibt der reine Struktur-Katalog-Schnitt, `marke` trägt weiterhin nur `name` — s.
     BRANDING_NICHT_GESCHNITTEN-Kommentar oben), sondern aus `V.AB_WERK_BRANDING`
     (U2-ADR-384) — derselbe, bereits durch `brandingModulPruefen` geprüfte Kern-Wert, den
     auch `tools/vivodepot-branding-inhalt.js` liest. Zwei getrennte Quellen für dieselbe
     Marke wäre der Fehler, den U2-ADR-384 für den Rest der Werte schon ausschließt. */
  const { farbePrimaer, farbeSekundaer, schriftart } = V.AB_WERK_BRANDING || {};
  const markeVollstaendig = Object.assign({}, marke, { farbePrimaer, farbeSekundaer, schriftart });

  const dateien = {
    'vd-privat.json': { modulTyp: 'bereich', moduleVersion: 1, herkunft: 'vivodepot', bereiche: privat.bereiche },
    'vd-de-sprache.json': { modulTyp: 'textsatz', sprache: 'de', moduleVersion: 1, anbieterId: 'vivodepot', texte: sprache },
    'vd-de-rechtsraum.json': { modulTyp: 'rechtsraum', rechtsraum: 'DE', moduleVersion: 1, anbieterId: 'vivodepot', felder: recht.felder },
    'vd-branding.json': Object.assign({ modulTyp: 'branding', moduleVersion: 1, herkunft: 'vivodepot' }, markeVollstaendig),
  };
  const MAX = 512 * 1024;
  console.log('Schnitt gegen Kern ' + (V.SCHALEN_STAND || '?') + ', ' + felderGesamt + ' Feld-Definitionen, ' + nachgezogen + ' Texte nachgezogen');
  console.log('');
  for (const [name, inhalt] of Object.entries(dateien)) {
    const roh = JSON.stringify(inhalt, null, 2) + '\n';
    fs.writeFileSync(path.join(ziel, name), roh, 'utf8');
    const bytes = Buffer.byteLength(JSON.stringify(inhalt), 'utf8');
    console.log('  ' + name.padEnd(22) + (bytes + ' Bytes').padStart(10)
      + (bytes > MAX ? '   ÜBER der Einlass-Grenze (' + MAX + ')' : '   unter der Grenze'));
  }
  console.log('');
  console.log('VOLLSTÄNDIGKEIT — jeder herausgeschnittene Text im nativen Textsatz wiedergefunden?');
  console.log('  geprüft:   ' + deckung.geprueft);
  console.log('  fehlend:   ' + deckung.fehlen.length);
  console.log('  abweichend:' + deckung.abweichend.length);
  for (const f of deckung.fehlen.slice(0, 10)) console.log('     fehlt: ' + f.kennung + '  = ' + JSON.stringify(f.text));
  for (const a of deckung.abweichend.slice(0, 5)) console.log('     anders: ' + a.kennung);
  console.log('');
  console.log('GEGENPROBE — trägt die Struktur noch sichtbaren Text?');
  console.log('  Treffer: ' + textInStruktur.length);
  for (const t of textInStruktur.slice(0, 10)) console.log('     ' + t.pfad + ' = ' + JSON.stringify(t.text));
  console.log('');
  console.log('UNENTSCHIEDEN (passt in keine der drei Schubladen): ' + unentschieden.length);
  /* Zwei Herkünfte, zwei Formen: der feldweise Schnitt meldet {sektorId, feldId,
     eigenschaft}, der Nachzieh-Durchgang {pfad, grund}. Beide ausschreiben — ein
     `undefined.undefined` im Bericht wäre genau die stumme Zahl, gegen die dieses
     Werkzeug gebaut ist. */
  for (const u of unentschieden.slice(0, 20)) {
    const wo = u.pfad || (u.sektorId + '.' + u.feldId + '.' + u.eigenschaft);
    console.log('     ' + wo + (u.grund ? '  [' + u.grund + ']' : '') + '\n         = ' + JSON.stringify(u.wert));
  }
  console.log('');
  console.log('MARKE — was „Vivodepot" sagt oder zeigt:');
  console.log('  geschnitten: ' + JSON.stringify(marke));
  console.log('  NICHT geschnitten (benannt, nicht uebergangen):');
  for (const b of BRANDING_NICHT_GESCHNITTEN) console.log('     ' + b.was + ' — ' + b.grund);
  console.log('');
  console.log('RECHTSRAUM-Anteil: ' + Object.keys(recht.felder).length + ' Feld(er) mit ' + RECHTS_EIGENSCHAFTEN.join('/'));
  for (const [k, v] of Object.entries(recht.felder)) console.log('     ' + k + ' = ' + JSON.stringify(v));
}

if (require.main === module) main();
module.exports = {
  schneiden, feldSchneiden, textKennung, optionKennung, spracheGegenBestandPruefen, strukturAufTextPruefen,
  RECHTS_EIGENSCHAFTEN, STRUKTUR_TROTZ_ANSCHEIN, vorschlaegeKennungenZuweisen,
};
