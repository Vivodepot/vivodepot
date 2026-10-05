#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════════════════
   kern-pdfs-erzeugen.mjs — echte PDFs des Kerns für die Prüfer (01.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────
   veraPDF prüfte bis hierher nur tests/fixtures/verapdf-kandidat.pdf, ein synthetisches PDF. Ein Prüfer, der
   nie ein PDF des Produkts sieht, belegt nichts über das Produkt. Dieses Werkzeug öffnet den Kern im Browser
   (echtes jsPDF, der inline-Block läuft nur dort), befüllt ein kleines, erfundenes Depot über die öffentlichen Setzer
   (derselbe Weg wie tests/konformitaet/wcag-axe.mjs; Umlaute, Gedankenstrich und Anführungszeichen, damit die
   eingebetteten Schriften gebraucht werden) und zeichnet die PDF-Wege mit denselben Funktionen und Seitenformaten wie
   die Flows — ohne Dialog, ohne Datei-Ausgabe der App:
     vollmappe.pdf    zeichneVollDepotPdf + eingebettete Datenfassung (wie der Export der ganzen Mappe)
     notfallkarte.pdf zeichneNotfallkarte im Format A6 (wie flowNotfallkartePdf, ohne QR)
     anlass.pdf       flowSituationPdf für das erste Situationsblatt, die Datei aus dem Download (situationModell ist nicht öffentlich)

   Aufruf:
     node tools/kern-pdfs-erzeugen.mjs --ziel <ordner> [--kern <pfad einer Produktdatei>]
   Ohne --kern das Produkt privat-de, gebacken wie für die E2E-Gates.
   --ziel ist Pflicht (kein Wegwerf-Verzeichnis, das niemand räumt). Exit 0 mit allen Dateien, 1 sonst, 2 ohne --ziel.
   ═══════════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { oeffneApp, depotAnlegen } = require(path.join(REPO, 'tests', 'e2e', 'helpers.js'));
const { gebackeneProdukteSicherstellen, GEBACKENE_PRODUKT_PFADE } = require(path.join(REPO, 'tests', 'e2e', 'global-setup.js'));

export const PDF_WEGE = Object.freeze(['vollmappe', 'notfallkarte', 'anlass']);

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

export async function kernPdfsErzeugen({ ziel, kern = null } = {}) {
  fs.mkdirSync(ziel, { recursive: true });
  // Ohne --kern das ausgelieferte Produkt privat-de, gebacken wie für die E2E-Gates (tests/e2e/global-setup.js).
  if (!kern) { gebackeneProdukteSicherstellen(); kern = GEBACKENE_PRODUKT_PFADE['privat-de']; }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await oeffneApp(page, { url: 'file://' + path.resolve(kern) });
    await depotAnlegen(page);
    await page.evaluate(() => {
      const V = window.__vdOeffentlich;
      V.akteurSelbstErklaeren('Jördis');
      V.sektorFeldSetzen('identity', 'givenName', 'Jördis'); V.sektorFeldSetzen('identity', 'familyName', 'Übelhör');
      V.sektorFeldSetzen('identity', 'birthDate', '1958-03-14');
      V.sektorFeldSetzen('health', 'bloodType', '0+');
      V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin – „Hautausschlag“' }]);
      if (typeof V.renderContent === 'function') V.renderContent();
    });
    await page.waitForFunction(() => typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function');
    const b64 = await page.evaluate(() => {
      const V = window.__vdOeffentlich;
      const bytes = (doc) => { const a = new Uint8Array(doc.output('arraybuffer')); let s = ''; for (const x of a) s += String.fromCharCode(x); return btoa(s); };
      const aus = {};
      {
        const modell = V.vollDepotModell({});
        const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
        V.zeichneVollDepotPdf(doc, modell, V.vollDepotPdfMeta());
        V.pdfDatenfassungEinbetten(doc, modell, 'Vollmappe.json');
        aus.vollmappe = bytes(doc);
      }
      {
        const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a6' });
        doc.setProperties({ title: 'Notfallkarte' });
        V.zeichneNotfallkarte(doc, V.notfallKernModell(), V.notfallKartenMeta(), null);
        aus.notfallkarte = bytes(doc);
      }
      return aus;
    });
    // Das Anlass-PDF über den Flow selbst: situationModell/situationPdfMeta sind nicht öffentlich. Der Flow gibt die
    // Datei über dateiAusgeben aus; im Browser ohne Teilen-Blatt ist das ein Download, den Playwright abfängt.
    const download = page.waitForEvent('download', { timeout: 30000 });
    await page.evaluate(() => { const V = window.__vdOeffentlich; const s = V.situationenAlle()[0]; V.flowSituationPdf(s && (s.id || s)); });
    const dl = await download;
    b64.anlass = fs.readFileSync(await dl.path()).toString('base64');
    const dateien = [];
    for (const weg of PDF_WEGE) {
      const p = path.join(ziel, weg + '.pdf');
      fs.writeFileSync(p, Buffer.from(b64[weg], 'base64'));
      dateien.push(p);
    }
    return dateien;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ziel = arg('--ziel');
  if (!ziel) { console.error('[kern-pdfs-erzeugen] --ziel <ordner> fehlt'); process.exit(2); }
  kernPdfsErzeugen({ ziel, kern: arg('--kern') || undefined })
    .then((d) => { for (const p of d) console.log(p); process.exit(d.length === PDF_WEGE.length ? 0 : 1); })
    .catch((e) => { console.error('[kern-pdfs-erzeugen] ' + (e && e.stack || e)); process.exit(1); });
}
