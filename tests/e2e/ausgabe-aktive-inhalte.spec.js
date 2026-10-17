// @ts-check
/* ausgabe-aktive-inhalte.spec.js — die SVG-Prüfung mit dem Parser des Browsers (16.10.2026, Befund AUSGABE-AKTIVE-INHALTE-UNGEPRUEFT).
   Im Browser geht der Kern ein SVG mit dem eingebauten DOMParser durch (Elemente und Attribute), nicht mit einer Textsuche: drei
   Umgehungen der Textsuche in einer Stunde (Gegenlesung) zeigten, dass nur so die Klasse zu ist. Die Node-Proben haben keinen Parser
   und prüfen den Rückfall.
   Warum nicht über den Upload in die Mappe: dort wird ein Bild als JPEG neu gezeichnet (bildVerkleinern), ein Skript überlebt das
   nicht. Rohe SVG kommen nur als importiertes Original (etwa ein Badge-Bild) hinein. Diese Probe nimmt darum die Funktion
   _svgAktivDom wörtlich aus dem gebackenen Produkt privat-de und führt sie in einer leeren Seite mit dem echten Parser aus. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');
function funktionsQuelle(name) {
  const produkt = fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8');
  const i = produkt.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('Funktion ' + name + ' fehlt im Produkt');
  const ende = produkt.indexOf('\n}\n', i);
  if (ende < 0) throw new Error('Ende der Funktion ' + name + ' nicht gefunden');
  return produkt.slice(i, ende + 2);
}

async function pruefen(page, svgListe) {
  const QUELLE = funktionsQuelle('_svgAktivDom');
  await page.goto('about:blank');
  return page.evaluate(([q, liste]) => {
    const f = new Function(q + '\nreturn _svgAktivDom;')();
    return liste.map((s) => f(s));
  }, [QUELLE, svgListe]);
}

test('[Aktive Inhalte·Browser] der Parser findet Handler, Skript in foreignObject und javascript:-Verweis, auch hinter den Umgehungen der Textsuche', async ({ page }) => {
  const r = await pruefen(page, [
    "<svg xmlns='http://www.w3.org/2000/svg'><text><![CDATA[ ' ]]></text><rect onload=\"x()\"/><!--'--></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg'><rect title='a>b' onclick='x()'/></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg'><foreignObject><div xmlns='http://www.w3.org/1999/xhtml'><script>x()</script></div></foreignObject></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'><a xlink:href=' javascript:x()'><circle r='4'/></a></svg>",
  ]);
  expect(r).toEqual([true, true, true, true]);
});

test('[Aktive Inhalte·Browser·Rot-Beweis] ein sauberes SVG ist kein Fund, ein kaputtes ist ungeprüft (null) und fällt auf den Rückfall', async ({ page }) => {
  const r = await pruefen(page, [
    "<svg xmlns='http://www.w3.org/2000/svg'><text>Spin on x=1</text><desc title=' onload=1'>t</desc><circle r='4'/></svg>",
    "<svg xmlns='http://www.w3.org/2000/svg'><rect onload=\"x()\"",
  ]);
  expect(r).toEqual([false, null]);
});
