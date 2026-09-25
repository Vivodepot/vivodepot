#!/usr/bin/env node
'use strict';
/* Gesamtdurchlauf — ein Lauf über die App, Funde nach Kategorien getrennt.
   Kategorien: funktional (es bricht) · ux (Sackgasse, fehlende Beschriftung) ·
   design (Kontrast, Trefferfläche, Uneinheitlichkeit).
   Misst am GERENDERTEN Zustand. Jeder Zustand prüft, dass er erreicht ist. */
const path = require('node:path');
const HTML = 'file://' + path.join(__dirname, '..', 'vivodepot.html');
const { echteSektorenListe } = require('./lib/sektoren.js');
const SEKTOREN = echteSektorenListe();

const funde = { funktional: [], ux: [], design: [], ungemessen: [] };

/* ── GELTUNGSBEREICH, und zwar in der Ausgabe ──────────────────────────────
   DER ANLASS (28.07.2026). Nach der Kontrast-Reparatur meldet dieser Lauf NULL
   Kontrast-Funde. Der Neun-Kombinationen-Lauf meldet fuer dieselbe Stelle im
   Nachtmodus 2,72 — unter der Schwelle. Beides stimmt, und der Widerspruch ist
   keiner: dieses Werkzeug setzt keine Theme-Klasse. Seine Null ist eine
   THEME-NULL.

   Wer sie ohne diese Bedingung in ein Dokument traegt, wiederholt genau den
   Fehler, aus dem die Runde entstanden ist: eine Zahl ohne den Zustand, in dem
   sie gemessen wurde. Also sagt der Lauf es selbst, in jeder Ausgabe, und nennt
   ausdruecklich, was er NICHT angesehen hat. Gruen-weil-geprueft und
   gruen-weil-nicht-hingesehen duerfen nicht gleich aussehen. */
const GELTUNGSBEREICH = {
  gemessen: 'helles Theme (keine Theme-Klasse gesetzt), Breiten 390 und 1200 px, normale Schriftskala',
  nichtGemessen: ['dark-mode', 'high-contrast', 'fs-medium', 'fs-large'],
  hinweis: 'Kontrast-Aussagen dieses Laufs gelten NUR fuer das helle Theme. Ueber die anderen ' +
    'acht Kombinationen sagt er nichts — auch nicht bei null Funden. Wer alle neun braucht: ' +
    'node tools/kampagne.js --ebenen 4  oder  node tools/kontrast-messen.js --alle-themes',
};
const add = (k, t) => funde[k].push(t);

/* ── Die Kontrast-Rechnung kommt aus tools/lib/kontrast.js (28.07.2026) ──────
   Sie stand hier als zweite Kopie derselben fehlerhaften Rechnung wie in
   kampagne.js: Alpha verworfen, Vorfahrenkette beim ersten nicht vollstaendig
   durchsichtigen Grund abgebrochen. Dass sie an einer Stelle gefunden wurde,
   machte sie an dieser nicht geprueft — zwei Kopien sind zwei Regeln.

   ZWEITER MANGEL, beim Reparieren gefunden und hier mitbehoben: die Erhebung
   war auf die ersten 260 Elemente je Bereich GEKAPPT, ohne dass die Ausgabe es
   sagte. Eine stille Kappung meldet nicht „ich habe weniger gesehen", sie
   meldet weniger Funde — und das liest sich wie ein besserer Stand. Die Kappung
   bleibt als Vorgabe erhalten, damit die Zahlen des 27.07. reproduzierbar
   bleiben; `--ohne-kappung` zeigt, was sie verdeckt, und die Ausgabe nennt sie. */
const KONTRAST = require('./lib/kontrast.js');
const KAPPUNG = process.argv.includes('--ohne-kappung') ? Infinity : 260;

async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    for (const breite of [390, 1200]) {
      const seite = await browser.newPage({ viewport: { width: breite, height: 900 } });
      const jsFehler = [];
      seite.on('pageerror', (e) => jsFehler.push(String(e.message).slice(0, 120)));
      await seite.goto(HTML);
      await seite.waitForSelector('#w-anfangen', { timeout: 8000 });

      // Eintreten über den echten Weg.
      await seite.click('#w-anfangen', { timeout: 3000 });
      await seite.waitForTimeout(400);
      const drin = await seite.evaluate(() => {
        const w = document.querySelector('#w-anfangen');
        return !w || w.getBoundingClientRect().width === 0;
      });
      if (!drin) { add('funktional', `${breite}px: „Hier anfangen" fuehrt nicht in die App`); continue; }

      /* DEPOT EINRICHTEN — ueber die Oberflaeche, wie eine Buergerin.
         Ohne diesen Schritt misst der Lauf den Zustand VOR der Einrichtung, in dem
         nichts erfassbar ist. Der erste Durchlauf tat genau das. */
      await seite.click('#tb-pw-hinweis', { timeout: 3000 }).catch(() => {});
      await seite.waitForTimeout(400);
      const pwDa = await seite.evaluate(() => {
        const e = document.querySelector('#id-pw');
        return !!e && e.getBoundingClientRect().width > 0;
      });
      if (!pwDa) { add('funktional', `${breite}px: das Einrichten-Formular oeffnet nicht`); await seite.close(); continue; }
      await seite.fill('#id-vorname', 'Marlies', { timeout: 3000 });
      await seite.fill('#id-nachname', 'Beispiel', { timeout: 3000 });
      await seite.fill('#id-pw', 'Durchlauf-2026!', { timeout: 3000 });
      await seite.fill('#id-pw2', 'Durchlauf-2026!', { timeout: 3000 });
      await seite.evaluate(() => {
        // U2-ADR-288-Nachtrag: 'div' entfernt — sonst stoppt closest() am neuen
        // '.modal-koerper'-Wrapper, bevor es '.modal' erreicht.
        const raum = document.querySelector('#id-pw').closest('form, .modal, #overlay-inhalt, section');
        const k = [...(raum || document).querySelectorAll('button')]
          .find((b) => /anleg|einricht|erstell|speicher|weiter|fertig|ok/i.test(b.textContent || ''));
        if (k) k.click();
      });
      await seite.waitForTimeout(700);
      const eingerichtet = await seite.evaluate(() => {
        const e = document.querySelector('#id-pw');
        return !e || e.getBoundingClientRect().width === 0;
      });
      if (!eingerichtet) { add('funktional', `${breite}px: Einrichten schliesst nicht ab`); await seite.close(); continue; }

      for (const sid of SEKTOREN) {
        const r = await seite.evaluate(async ([s, kappung]) => {
          try { window.__vdOeffentlich.oeffneSektor(s); } catch (e) { return { fehler: String(e.message) }; }
          await new Promise((x) => setTimeout(x, 60));
          const sicht = (e) => { const c = getComputedStyle(e), b = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
          const inhalt = document.querySelector('#content');
          const bedienbar = [...document.querySelectorAll('#content button, #content a, #content input, #content select, #content textarea, #content [onclick]')].filter(sicht);
          const felder = [...document.querySelectorAll('#content input, #content select, #content textarea')].filter(sicht);
          const ohneLabel = felder.filter((e) => !e.id || !document.querySelector(`label[for="${e.id}"]`)).length;
          const klein = bedienbar.filter((e) => { const b = e.getBoundingClientRect(); return b.width < 44 || b.height < 44; })
            .map((e) => ({ t: (e.textContent || '').trim().slice(0, 18), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }));
          // Kontrast: Text gegen wirksamen Hintergrund
          /* Die Seite rechnet nicht, sie berichtet: Textfarbe und die GANZE
             Vorfahrenkette als rohe Zeichenketten. Komponiert wird in Node. */
          const farben = [];
          const alleSichtbaren = [...document.querySelectorAll('#content *')].filter(sicht);
          for (const e of alleSichtbaren.slice(0, kappung)) {
            if (!e.textContent || e.children.length || e.textContent.trim().length < 2) continue;
            const kette = [];
            for (let p = e; p; p = p.parentElement) kette.push(getComputedStyle(p).backgroundColor);
            farben.push({ farbe: getComputedStyle(e).color, kette,
              t: e.textContent.trim().slice(0, 22), fs: parseFloat(getComputedStyle(e).fontSize) });
          }
          const gekappt = Math.max(0, alleSichtbaren.length - kappung);
          return {
            ueberschrift: ((document.querySelector('h2') || {}).textContent || '').trim(),
            bedienbar: bedienbar.length, felder: felder.length, ohneLabel,
            klein, farben, gekappt, hoehe: inhalt ? inhalt.scrollHeight : 0,
          };
        }, [sid, KAPPUNG === Infinity ? 1e9 : KAPPUNG]);

        if (r.fehler) { add('funktional', `${breite}px ${sid}: oeffneSektor wirft — ${r.fehler.slice(0, 70)}`); continue; }
        if (!r.ueberschrift) { add('funktional', `${breite}px ${sid}: keine Bereichs-Ueberschrift nach dem Oeffnen`); continue; }
        if (r.bedienbar === 0) add('ux', `${breite}px ${sid}: KEIN bedienbares Element im Inhalt — Sackgasse`);
        else if (r.bedienbar === 1) add('ux', `${breite}px ${sid}: nur EIN bedienbares Element im Inhalt`);
        if (r.felder === 0 && r.hoehe > 400) add('ux', `${breite}px ${sid}: ${r.hoehe}px Inhalt, aber kein Eingabefeld erreichbar`);
        if (r.ohneLabel) add('ux', `${breite}px ${sid}: ${r.ohneLabel} Eingabefeld(er) ohne verknuepfte Beschriftung`);
        for (const k of r.klein) add('design', `${breite}px ${sid}: Trefferflaeche ${k.w}x${k.h}px — „${k.t}"`);
        if (r.gekappt) {
          /* KEIN STILLES KAPPEN. Was nicht angesehen wurde, steht als ungemessen —
             sonst liest sich eine kleinere Fundzahl wie ein besserer Stand. */
          add('ungemessen', `${breite}px ${sid}: ${r.gekappt} sichtbare Elemente NICHT angesehen (Kappung bei ${KAPPUNG})`);
        }
        for (const f of r.farben) {
          const k = KONTRAST.kontrast(f.farbe, f.kette);
          if (!k) continue;                   // Farbe nicht deutbar — kein Befund, kein Gruen
          const soll = f.fs >= 18.66 ? 3 : 4.5;
          if (k.wert < soll) add('design', `${breite}px ${sid}: Kontrast ${k.wert} (soll ${soll}) — „${f.t}"`);
        }
      }
      for (const e of [...new Set(jsFehler)]) add('funktional', `${breite}px: JavaScript-Fehler — ${e}`);
      add('ungemessen', `${breite}px: ${GELTUNGSBEREICH.nichtGemessen.join(', ')} — nicht angesehen`);
      await seite.close();
    }
  } finally { await browser.close(); }

  const kurz = (a) => [...new Set(a)];
  for (const k of Object.keys(funde)) funde[k] = kurz(funde[k]);
  console.log(JSON.stringify({ geltungsbereich: GELTUNGSBEREICH, ...funde }, null, 1));
}
main().catch((e) => { console.error('DURCHLAUF GESCHEITERT:', e.message); process.exit(1); });
