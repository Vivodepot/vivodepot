#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Die Fliesstext-Ausnahme vorlegen — jeden Ausgenommenen mit seinem Satz
   ────────────────────────────────────────────────────────────────────────────
   WOZU (A14, 28.07.2026). Ebene 4b hat drei Ausnahmegründe. Zwei davon sind
   STRUKTURELL — „unsichtbar" und „kein Bedienelement" sind Definitionen, in
   ihnen steckt kein Urteil. Der dritte trägt ein ERMESSEN: WCAG 2.5.8 nimmt
   Links im Fliesstext aus, und ob die Regel den Fall trifft, den die Norm meint,
   entscheidet eine Heuristik aus zwei Bedingungen.

   Sie nimmt mehr heraus, als die Ebene je gefunden hat. Liegt sie daneben,
   versteckt sie eine ganze Klasse — und niemand merkt es, weil das Ergebnis der
   Ebene dann null ist. Ein Leerbefund sieht aus wie ein sauberer Befund; das ist
   in diesem Repo schon dreimal passiert.

   WAS DIESES WERKZEUG NICHT TUT: urteilen. Es legt vor. Ob ein Ziel „in einem
   Satz" steht, ist eine Lesefrage und keine Messfrage — die Norm sagt „in a
   sentence", und kein Prädikat entscheidet das zuverlässig. Darum sammelt das
   Werkzeug die Merkmale, an denen ein Mensch es entscheiden kann, und nennt sie
   beim Namen: den ganzen Elterntext, die Stellung des Links darin, was links und
   rechts von ihm steht, und ob der Elternknoten überhaupt satzartig ist.

   WARUM ES IM REPO STEHT und nicht als Wegwerfskript lief: es wird wieder
   gebraucht. Jedes Mal, wenn die Ausnahme wächst — ein Link mehr, eine Bedingung
   weiter —, ist dieselbe Vorlage nötig. Ein Werkzeug ausserhalb des Repos hat
   keine Historie und keine Suite.

   Aufruf:
     node tools/fliesstext-ausnahme-erheben.js                → alle, ein Block je Element
     node tools/fliesstext-ausnahme-erheben.js --breite 1280  → eine andere Breite
     node tools/fliesstext-ausnahme-erheben.js --json
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
const REPO = path.join(__dirname, '..');
const HTML_PFAD = process.env.KERN_HTML_PATH
  ? path.resolve(process.env.KERN_HTML_PATH)
  : path.join(REPO, 'vivodepot.html');
const HTML = 'file://' + HTML_PFAD;
const PW = 'Ausnahme-2026!';
const BREITE = parseInt(arg('breite', '390'), 10);
const { echteSektorenListe } = require('./lib/sektoren.js');
const SEKTOREN = echteSektorenListe();

const { erheben, PFLICHT_PX } = require('./lib/trefferflaechen.js');

/* Läuft IM BROWSER. NIMMT DIE AUSNAHME NICHT SELBST VOR: welche Elemente
   ausgenommen sind, entscheidet `erheben` aus `lib/trefferflaechen.js`, und
   dieses Werkzeug bekommt deren Texte übergeben. Es LEGT VOR, es urteilt nicht.

   Die erste Fassung trug die Bedingungen ein zweites Mal — „damit sichtbar ist,
   woran sie hängt" — und hat sich dafür sofort gerächt: nach dem Schärfen der
   Regel meldete sie unverändert die alte Menge, und ich hätte den Unterschied
   für einen Befund über die Regel gehalten. Zwei Regeln an zwei Orten sind zwei
   Regeln, auch wenn die zweite nur vorführen soll. Derselbe Fehler wie in A4,
   drei Ebenen weiter unten. */
function vorlegen({ texte }) {
  const gesucht = new Set(texte);
  const raus = [];
  for (const a of document.querySelectorAll('body a[href]')) {
    const eigen = (a.textContent || '').trim();
    // 30 Zeichen — genau die Länge, auf die `notieren()` im Modul kürzt. Ein
    // anderer Wert findet nur die kurzen Texte und meldet stumm zu wenige.
    if (!gesucht.has(eigen.slice(0, 30))) continue;
    const b = a.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    const eltern = a.parentElement;
    if (!eltern) continue;
    const elternText = (eltern.textContent || '').trim();

    /* Die Merkmale, an denen ein Mensch „steht das in einem Satz?" entscheidet. */
    const i = elternText.indexOf(eigen);
    const davor = i > 0 ? elternText.slice(Math.max(0, i - 60), i) : '';
    const danach = i >= 0 ? elternText.slice(i + eigen.length, i + eigen.length + 60) : '';
    const geschwisterLinks = [...eltern.querySelectorAll(':scope > a[href]')].length;
    raus.push({
      text: eigen,
      elternTag: eltern.tagName.toLowerCase(),
      elternKlasse: String(eltern.className || '') || '—',
      elternText,
      davor, danach,
      /* Satzartig heisst: es steht Text VOR dem Link, und der Elterntext endet
         mit einem Satzzeichen. Ein Link, der seinen Absatz eröffnet und dem nur
         eine Aufzählung folgt, ist keiner „in einem Satz". */
      textDavor: davor.trim().length,
      textDanach: danach.trim().length,
      endetMitSatzzeichen: /[.!?]\s*$/.test(elternText),
      geschwisterLinks,
      anteilLinktext: Math.round((eigen.length / Math.max(1, elternText.length)) * 100),
      hoehe: +b.height.toFixed(1), breite: +b.width.toFixed(1),
      zeilenkaesten: a.getClientRects().length,
    });
  }
  return raus;
}

async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: BREITE, height: 900 } });
  await seite.goto(HTML);
  await seite.waitForSelector('#w-anfangen', { timeout: 8000 });
  await seite.click('#w-anfangen', { timeout: 3000 });
  await seite.waitForTimeout(400);
  await seite.click('#tb-pw-hinweis', { timeout: 3000 }).catch(() => {});
  await seite.waitForTimeout(400);
  for (const [sel, wert] of [['#id-vorname', 'Marlies'], ['#id-nachname', 'Beispiel'], ['#id-pw', PW], ['#id-pw2', PW]]) {
    await seite.fill(sel, wert, { timeout: 3000 }).catch(() => {});
  }
  await seite.evaluate(() => {
    // U2-ADR-288-Nachtrag: 'div' entfernt — sonst stoppt closest() am neuen
    // '.modal-koerper'-Wrapper, bevor es '.modal' erreicht.
    const raum = document.querySelector('#id-pw').closest('form, .modal, #overlay-inhalt, section');
    const k = [...(raum || document).querySelectorAll('button')]
      .find((b) => /anleg|einricht|erstell|speicher|weiter|fertig|ok/i.test(b.textContent || ''));
    if (k) k.click();
  });
  await seite.waitForTimeout(700);

  /* Je Element EINE Zeile, nicht je Messpunkt. Über das Raster erscheint
     derselbe Link vielfach; die Frage „ist er zu Recht ausgenommen?" stellt sich
     einmal je Element. Das ist genau die Unterscheidung, an der die Zahl 341
     missverstanden werden kann: sie zaehlt Messpunkte. */
  const je = new Map();
  for (const sid of SEKTOREN) {
    const ok = await seite.evaluate(async (s) => {
      try { window.__vdOeffentlich.oeffneSektor(s); } catch (_) { return false; }
      await new Promise((x) => setTimeout(x, 60));
      return ((document.querySelector('#content') || {}).childElementCount || 0) > 0;
    }, sid);
    if (!ok) continue;
    /* Die geltende Regel bestimmt die Menge, dieses Werkzeug nur ihre Darstellung. */
    const r = await seite.evaluate(erheben, { mindest: PFLICHT_PX, raum: 'body *' });
    if (!r.ausgenommen.length) continue;
    const texte = r.ausgenommen.map((f) => f.text);
    for (const f of await seite.evaluate(vorlegen, { texte })) {
      const schluessel = sid + '|' + f.text;
      if (!je.has(schluessel)) je.set(schluessel, { bereich: sid, ...f });
    }
  }
  await browser.close();

  const alle = [...je.values()];
  if (argv.includes('--json')) { console.log(JSON.stringify({ breite: BREITE, elemente: alle }, null, 1)); return; }

  console.log(`Fliesstext-Ausnahme bei ${BREITE} px — ${alle.length} VERSCHIEDENE Elemente ` +
    `(die Fundzahl der Ebene zaehlt Messpunkte, nicht Elemente)\n`);
  for (const f of alle) {
    console.log(`── ${f.bereich} · <${f.elternTag} class="${f.elternKlasse}"> · ` +
      `${f.breite}x${f.hoehe} px, ${f.zeilenkaesten} Zeilenkasten/-kaesten`);
    console.log(`   LINK      „${f.text}"`);
    console.log(`   DAVOR     ${f.davor ? '…' + f.davor : '(NICHTS — der Link eroeffnet den Elterntext)'}`);
    console.log(`   DANACH    ${f.danach ? f.danach + '…' : '(NICHTS — der Link beendet den Elterntext)'}`);
    console.log(`   MERKMALE  Linktext-Anteil ${f.anteilLinktext} % · Geschwister-Links ${f.geschwisterLinks} · ` +
      `Elterntext endet mit Satzzeichen: ${f.endetMitSatzzeichen ? 'ja' : 'NEIN'}`);
    console.log('');
  }
}

if (require.main === module) {
  main().catch((e) => { console.error('ERHEBUNG GESCHEITERT:', e.message); process.exit(1); });
}
module.exports = { vorlegen };
