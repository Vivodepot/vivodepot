'use strict';
/* ════════════════════════════════════════════════════════════════════════
   refMehrfach-Bestandsprüfung — Traversierung (Bilanz-Posten 24, 02.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Ursprung: Bestandsprüfung Overwrite-Fix Weg A, 20.07.2026. Findet
   refMehrfach-Einträge mit LEEREM ref und GEFÜLLTEM override — Verdacht auf
   den vor dem 20.07.2026 gefixten Overwrite-Bug (ein Tastendruck in eine
   bestätigte Zeile konnte die Referenz löschen, wenn dazwischen ein
   Speichern lief). KEIN Automatismus, KEINE Reparatur, KEINE Änderung am
   Depot — nur eine Liste zum Durchsehen.

   Ein leerer ref + gefüllter override ist NICHT automatisch ein Fehler: eine
   Person ohne Registereintrag ist ein legitimer, gewollter Fall. Die
   "ähnelt Registereintrag"-Markierung ist ein Hinweis, keine Diagnose — nur
   ein Mensch kann im Einzelfall entscheiden, ob es sich um Schaden oder um
   eine echte, bewusst eingetragene Person ohne Registerbezug handelt.

   VOLLSTÄNDIGKEIT (Nachtrag 20.07.2026): geprüft, ob refMehrfach-Einträge
   außerhalb von `data.sektoren` liegen können — konkret in `data.situationen`
   (geschrieben von `situationFeldSetzen()`, U2-ADR-012). Ergebnis: NEIN.
   `data.sektoren` ist nachweislich der einzige Ort. Beleg: (1) jedes einzelne
   `typ: 'refMehrfach'`-Feld im gesamten Quelltext ist entweder ein direktes
   Sektorfeld, ein `liste`-Unterfeld (per `feld.unterFelder`) oder ein
   Wizard-Korpus-Feld (PV_BMJ/KI_KORPUS), und jeder Wizard-Schritt mit einem
   `situation`-Ziel schreibt nachweislich nie ein refMehrfach-Feld
   (`SITUATIONEN`/die Angehörigen-Blätter deklarieren an keiner Stelle
   `typ: 'refMehrfach'` — nur `ref`, `text`, `textarea`); (2) `wizardZielSetzen()`
   routet strikt entweder auf `sektorFeldSetzen()` ODER `situationFeldSetzen()`,
   nie beides für dasselbe Feld. Falls künftig ein neues Feld
   `typ: 'refMehrfach'` mit `situation`-Ziel entsteht, muss diese Traversierung
   neu geprüft werden — sonst wird "nichts gefunden" hier fälschlich zu
   "nicht gesucht".

   REINE FUNKTION: nimmt `(data, SEKTOREN)` als Parameter statt globaler
   Variablen (Browser-Konsole, wie im ursprünglichen IIFE) — kein console.log,
   das ist Sache des CLI-Wrappers (`tools/refmehrfach-verwaiste-override-pruefen.js`).
   ════════════════════════════════════════════════════════════════════════ */

function normalisiert(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();
}

// Grobe, bewusst großzügige Ähnlichkeitsprüfung (lieber ein falscher Treffer zu viel als ein
// übersehener Schadensfall): Treffer, wenn der getippte Text (ab 2 Zeichen) in irgendeinem Wort
// des Registernamens vorkommt, als Substring in beide Richtungen.
function aehnlicheRegisterPerson(overrideText, register) {
  const t = normalisiert(overrideText);
  if (t.length < 2) return null;
  for (const p of register) {
    const name = normalisiert(p.name);
    if (!name) continue;
    if (name.includes(t) || t.includes(name)) return p;
    const worte = name.split(/\s+/);
    for (const w of worte) {
      if (w.length >= 2 && (w.startsWith(t) || t.startsWith(w))) return p;
    }
  }
  return null;
}

function pruefeArray(arr, ort, register, funde) {
  if (!Array.isArray(arr)) return;
  arr.forEach((eintrag, idx) => {
    if (!eintrag || typeof eintrag !== 'object') return;
    const ref = eintrag.ref;
    const override = eintrag.override;
    if (!ref && override && String(override).trim()) {
      const treffer = aehnlicheRegisterPerson(override, register);
      funde.push({
        ort,
        index: idx,
        override_text: override,
        aehnelt_registereintrag: treffer ? (treffer.name + ' (id ' + treffer.id + ')') : '—',
      });
    }
  });
}

/* Traversiert direkte Sektorfelder UND `liste`-Unterfelder (verschachtelt) —
   die beiden einzigen Orte, an denen laut Vollständigkeits-Beleg oben ein
   `typ: 'refMehrfach'`-Feld stehen kann. Gibt das `funde`-Array zurück. */
function verwaisteOverrideFinden(data, SEKTOREN) {
  const register = data && Array.isArray(data.menschen) ? data.menschen : [];
  const funde = [];
  if (!data || !data.sektoren) return funde;

  (SEKTOREN || []).forEach((sektor) => {
    const sektorDaten = data.sektoren[sektor.id];
    if (!sektorDaten) return;
    (sektor.sektionen || []).forEach((sektion) => {
      (sektion.felder || []).forEach((feld) => {
        if (feld.typ === 'refMehrfach') {
          pruefeArray(sektorDaten[feld.id], sektor.id + '.' + feld.id, register, funde);
        } else if (feld.typ === 'liste' && Array.isArray(feld.unterFelder)) {
          const eintraege = sektorDaten[feld.id];
          if (!Array.isArray(eintraege)) return;
          feld.unterFelder.forEach((uf) => {
            if (uf.typ !== 'refMehrfach') return;
            eintraege.forEach((rec, recIdx) => {
              if (rec && Array.isArray(rec[uf.id])) {
                pruefeArray(rec[uf.id], sektor.id + '.' + feld.id + '[' + recIdx + '].' + uf.id, register, funde);
              }
            });
          });
        }
      });
    });
  });

  return funde;
}

module.exports = { verwaisteOverrideFinden, normalisiert, aehnlicheRegisterPerson };
