/**
 * wcag-axe.mjs — WCAG 2.2 AA Konformität via axe-core über die V1-Sichten
 * ======================================================================
 * Re-Target des B16-axe-Tests auf den V1-Kern + die ECHTEN V1-Sichten. Klärt
 * zugleich die „31 Sichten"-Überzeichnung der Validierungsseite: hier wird eine
 * AUFGEZÄHLTE, reale Sicht-Liste gescannt (Welcome, Zuhause, alle 11 Sektoren,
 * Anlass-Auswahl, alle 9 Situationen, Notfall) — die Zahl, die rauskommt, ist die
 * echte Zahl für die Seite (nicht die geerbten „31").
 *
 * Logotype-Ausnahme WCAG 1.4.3: Gold-„DEPOT"-Wortmarke (.logo-wort/.vd-logo) wird
 * vom Kontrast-Check ausgeschlossen (Text als Teil eines Logos hat keine
 * Kontrast-Anforderung).
 *
 * Ausführen: node --test tests/konformitaet/wcag-axe.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import netzSperre from '../../tools/lib/netz-sperre.js';
import AxeBuilder from '@axe-core/playwright';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

/* A6/G1 (29.07.2026): der gemessene Gegenstand ist UMLENKBAR — dieselbe
   Umgebungsvariable, die `tests/load-kern.js` schon kennt. Vorher stand hier ein
   fester Pfad, und der Selbsttest wies den Waechter als „nicht ansetzbar" aus:
   ein Beispiel liess sich ihm nur unterschieben, indem man die AUSGELIEFERTE
   Datei veraendert — das ist kein Beispiel, das ist ein Eingriff.
   Vier Waechter teilten diese eine Ursache. */
/* S8 (U2-ADR-428): das rohe Gerüst trägt keinen deutschen Satz mehr — auf ihm bricht schon die Seitenleiste (`escapeHTML(undefined)`), und die Messung
   liefe an einem Gegenstand, den es als Produkt nicht gibt. Ohne Umlenkung wird darum das konfektionierte deutsche Produkt gemessen. */
const HTML_PFAD = process.env.KERN_HTML_PATH
  ? resolve(process.env.KERN_HTML_PATH)
  : createRequire(import.meta.url)('../produkt-html-erzeugen.js').produktHtmlTestfassung('privat-de');   // die Probe öffnet jede Sicht über window.__vdOeffentlich (U2-ADR-494)
const FILE_URL = pathToFileURL(HTML_PFAD).href;
// AXE-SICHTEN-STILL-UNGEPRUEFT (22.10.2026): die Sollliste der gescannten Sichten. Fehlt eine, ist der Lauf rot —
// eine Ausnahme steht nur namentlich, mit Grund, unter `ausnahmen`. Die Zahl in den Dokumenten folgt aus dieser Datei
// (tests/axe-sichten-zahl.test.js). Ort: tools/axe-sichten.json.
const SOLL = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tools', 'axe-sichten.json'), 'utf8'));
// EN-301-549: die axe-Regeln zu EN 301 549 V3.2.1 Kap. 9 (Web, = WCAG 2.1 AA); Registerzeile barrierefreiheit/en-301-549.
const TAGS    = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'EN-301-549'];
const EXCLUDE = ['.logo-wort', '.vd-logo'];   // WCAG 1.4.3 Logotype-Ausnahme
const VOLLE_BREITE = { width: 1280, height: 720 };   // die Vorgabe von Playwright, hier ausgeschrieben, weil eine Sicht sie kurz verlässt

async function scan(page, name, alle) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).exclude(EXCLUDE).analyze();
  alle.push({ name, violations: r.violations.map(v => `${v.id}(${v.impact}×${v.nodes.length})`) });
}

test('[Konformität] axe-core WCAG 2.2 AA über alle V1-Sichten', async (t) => {
  const browser = await chromium.launch(netzSperre.mitSperre());
  try {
    const context = await browser.newContext({ viewport: VOLLE_BREITE });
    const page = await context.newPage();
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    const alle = [];

    await scan(page, 'welcome', alle);   // Pre-Depot-Eintritt

    const sektoren = await page.evaluate(async () => {
      const V = window.__vdOeffentlich;
      await V.depotAnlegen('pw'); V.akteurSelbstErklaeren('Maria'); if (typeof V.betreteApp === 'function') V.betreteApp();
      V.sektorFeldSetzen('identity', 'givenName', 'Maria'); V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
      V.sektorFeldSetzen('identity', 'birthDate', '1965-04-23');
      V.sektorFeldSetzen('health', 'bloodType', 'A+'); V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
      return V.SEKTOREN.map(s => s.id);
    });

    await page.evaluate(() => window.__vdOeffentlich.geheZuZuhause()); await scan(page, 'zuhause', alle);
    for (const id of sektoren) { await page.evaluate(i => window.__vdOeffentlich.oeffneSektor(i), id); await scan(page, 'sektor:' + id, alle); }
    await page.evaluate(() => window.__vdOeffentlich.oeffneAnlassAuswahl()); await scan(page, 'anlass-auswahl', alle);
    const sits = await page.evaluate(() => window.__vdOeffentlich.SITUATIONEN.map(s => s.id));
    for (const id of sits) { await page.evaluate(i => window.__vdOeffentlich.oeffneSituation(i), id); await scan(page, 'situation:' + id, alle); }

    // ── Erweiterung (U2): weitere echt scanbare V1-Sichten. Was sich headless nicht öffnen lässt, wird übersprungen
    //    und gemeldet — und macht den Lauf seit 22.10.2026 rot, weil die Sollliste axe-sichten.json die Sicht verlangt.
    const uebersprungen = [];
    async function reset() {
      await page.evaluate(() => {
        try { const mi = document.getElementById('modal-inhalt'); if (mi) mi.innerHTML = ''; } catch (_) {}
        try { const mr = document.getElementById('modal-rueck'); if (mr) { mr.className = ''; mr.removeAttribute('style'); } } catch (_) {}
        try { if (typeof window.__vdOeffentlich.geheZuZuhause === 'function') window.__vdOeffentlich.geheZuZuhause(); } catch (_) {}
      });
    }
    async function versuch(name, oeffnen) {
      try {
        await reset();
        const ok = await page.evaluate(oeffnen);
        if (ok === false) { uebersprungen.push(name + ' (nicht verfügbar)'); return; }
        await scan(page, name, alle);
      } catch (e) { uebersprungen.push(name + ' (' + String((e && e.message) || e).slice(0, 70) + ')'); }
    }
    // D.4 (Rest-Sichten, 26.08.2026): neun der zehn Abschnitte stecken seither hinter
    // <details>, standardmäßig zu (Session-Merker, keine automatische Öffnung bei Inhalt wie
    // bei .feldgruppen-karte/.situation-block/.anfragen-ort). Ohne das Aufklappen hier säße der
    // Scan nur auf dem einen offenen Rest (Barrierefreiheit) — dieselbe axe-Scan-Lücke, die
    // U2-ADR-174 (Vorgänger-Fund, cca638b) schon einmal für ein anderes Feature schloss.
    await versuch('einstellungen',        () => {
      if (typeof window.__vdOeffentlich.flowEinstellungen !== 'function') return false;
      window.__vdOeffentlich.flowEinstellungen();
      document.querySelectorAll('#modal-inhalt details.einst-abschnitt').forEach((d) => { d.open = true; });
      return true;
    });
    await versuch('export-uebersicht',    () => { if (typeof window.__vdOeffentlich.flowExportUebersicht !== 'function') return false; window.__vdOeffentlich.flowExportUebersicht(); return true; });
    await versuch('mappe',                () => { if (typeof window.__vdOeffentlich.oeffneMappe !== 'function') return false; window.__vdOeffentlich.oeffneMappe(); return true; });
    await versuch('angehoerigen-blatt',   () => {
      const V = window.__vdOeffentlich;
      if (typeof V.oeffneAngehoerigenBlatt !== 'function' || typeof V.angehoerigenSituationenAlle !== 'function') return false;
      const alle = V.angehoerigenSituationenAlle();
      if (!alle.length) return false;
      return V.oeffneAngehoerigenBlatt(alle[0].id);
    });
    // KEIN 'qr-bereich'-Versuch mehr: „Die Lese-App wird nirgends mitgemessen"
    // (12./13.08.2026), Nebenbefund — die Begründung des früheren Skips („flowBereichQr existiert
    // nicht") stand hier als läse sie einen VORÜBERGEHENDEN Zustand, meldete aber wortgleich jeden
    // Lauf „nicht verfügbar" und klang so, als könnte die Sicht irgendwann wieder erscheinen. Sie
    // kann es nicht: der Bereichs-QR-Producer (`bereichQrModell`/`bereichQrText`/`flowBereichQr`)
    // ist mit CC-08 (14.07.2026) ABSICHTLICH und ERSATZLOS entfernt — Klartext-Gesundheitsdaten,
    // die die native Kamera an eine Websuche weiterreichte (vivodepot.html:28736). Es gibt im Kern
    // keine `qr-bereich`-Sicht mehr zu scannen, dauerhaft, kein Übersprungen-Eintrag nötig. Die
    // einzige verbliebene Konsumentenseite des Formats (`renderQrBereich` in vivodepot-lesen.html,
    // Text-Einfüge-Weg) deckt `tools/axe-lauf-lesen.js` ab — dort, nicht hier.
    // AXE-SICHTEN-STILL-UNGEPRUEFT (22.10.2026): sieben Sichten riefen Funktionen, die seit dem Kern-Verschluss
    // vom 19.09.2026 nicht mehr global sind — zwei davon (notfall, bestand-auswahl) in einem leeren catch, ganz
    // ohne Meldung, fünf als „nicht verfügbar“; der Lauf blieb grün. Sie werden jetzt geöffnet wie von einer
    // Person: über den Knopf, den die Oberfläche dafür verdrahtet. Kein neuer Export, der Verschluss bleibt zu.
    async function klickVersuch(name, schritte, { breite } = {}) {
      try {
        await reset();
        // reset() endet auf der Startseite, die Anwendung samt Seitenleiste ist dort ausgeblendet — erst eintreten,
        // wie eine Person nach der Startseite (derselbe Eintritt wie im Aufbau oben), dann klicken.
        await page.evaluate(() => window.__vdOeffentlich.betreteApp());
        // geheZuZuhause in reset() öffnet bei diesem Depot (Inhalt, keine Sicherungsdatei) den Schließen-Schutz
        // „Vor dem Schließen“; sein Hintergrund #modal-rueck fängt jeden Klick ab. Zu, wie reset() ein Modal schließt.
        await page.evaluate(() => {
          const mi = document.getElementById('modal-inhalt'); if (mi) mi.innerHTML = '';
          const mr = document.getElementById('modal-rueck'); if (mr) { mr.className = ''; mr.removeAttribute('style'); }
        });
        if (breite) await page.setViewportSize({ width: breite, height: 844 });
        for (const sel of schritte) {
          // { aufklappen: '<details>' } — eine Gruppe der Seitenleiste per Klick auf ihre Überschrift öffnen, nur wenn sie zu ist
          // (ein zweiter Klick schlösse sie wieder).
          if (sel.aufklappen) {
            const gruppe = page.locator(sel.aufklappen).first();
            if (!(await gruppe.evaluate(d => d.open))) await gruppe.locator('summary').first().click({ timeout: 5000 });
            continue;
          }
          await page.locator(sel).first().click({ timeout: 5000 });
        }
        await scan(page, name, alle);
      } catch (e) {
        uebersprungen.push(name + ' (' + String((e && e.message) || e).split('\n')[0].slice(0, 90) + ')');
      } finally {
        if (breite) await page.setViewportSize(VOLLE_BREITE);
      }
    }
    await klickVersuch('notfall',              ['[data-notfall]']);
    // Mappe und Prüftermine stehen in der Gruppe „Austausch“ der Seitenleiste, die zugeklappt ist, solange keiner ihrer Einträge aktiv ist.
    const AUSTAUSCH = { aufklappen: 'details.nav-gruppe-austausch' };
    await klickVersuch('prueftermine',         [AUSTAUSCH, '[data-prueftermine]']);
    await klickVersuch('bestand-auswahl',      [AUSTAUSCH, '[data-mappe]', '#mappe-bestand-link']);
    await klickVersuch('depot-liste',          ['#tb-depot-pille', '#tb-depot-menue-liste']);
    // Der Bottom-Tab „Eintragen" steht nur in schmaler Ansicht (.bottom-tabs ab der Mobil-Breite), dort öffnet ihn eine Person.
    await klickVersuch('eintragen-uebersicht', ['#bt-eintragen'], { breite: 390 });
    // Ein frisch angelegtes Sub-Depot ist versiegelt (istEntsiegelt: kein Sub-Schlüssel im RAM) — der Normalzustand der
    // Karten-Übersicht, und der Knopf „Entsiegeln“ darauf öffnet den Passwort-Dialog.
    await page.evaluate(() => window.__vdOeffentlich.subDepotAnlegen({ bezeichnung: 'S2', inhaberin: 'I2', verwaltungsTyp: 'verwaltet', akzent: 'sand' }, 'pw2'));
    await klickVersuch('verwaltete-depots',    ['#tb-depot-pille', '#tb-depot-menue-verwaltung']);
    await klickVersuch('sub-depot-entsiegeln-dialog', ['#tb-depot-pille', '#tb-depot-menue-verwaltung', '[data-entsiegeln]']);
    await versuch('sub-depot-kontext',    async () => {
      const V = window.__vdOeffentlich;
      if (typeof V.subDepotAnlegen !== 'function' || typeof V.subKontextBetreten !== 'function') return false;
      const e = await V.subDepotAnlegen({ bezeichnung: 'S', inhaberin: 'I', verwaltungsTyp: 'verwaltet', akzent: 'sand' }, 'pw');
      if (typeof V.subDepotVertrauenOeffnen === 'function') await V.subDepotVertrauenOeffnen(e.depotUUID, 'pw');
      V.subKontextBetreten(e.depotUUID); return true;
    });
    // Gestaltungsabgleich-Erhebung (02.09.2026, Auftrag): 'sub-depot-kontext' oben öffnet
    // programmatisch, an der Verwaltungs-Liste UND dem Entsiegeln-Dialog vorbei — gescannt wurde
    // bisher nur, was NACH dem Betreten steht, nie der Weg dorthin. Zwei eigene Sichten schließen
    // die Lücke: die Karten-Übersicht selbst (mit einem versiegelten Eintrag, dem Normalzustand
    // eines noch nicht geöffneten Sub-Depots) und der Entsiegeln-Dialog (`ui.modal()`, dasselbe
    // Passwort-Eingabefeld-Muster wie die übrigen Passwort-Dialoge dieser Suite).
    t.diagnostic('Übersprungen (nicht echt scanbar): ' + (uebersprungen.length ? uebersprungen.join(' · ') : 'keine'));

    const mitViol = alle.filter(v => v.violations.length);
    t.diagnostic(`Sichten gescannt: ${alle.length}`);
    t.diagnostic(`Sichten mit Violations: ${mitViol.length}`);
    for (const v of mitViol) t.diagnostic(`  ${v.name}: ${v.violations.join(', ')}`);

    const soll = SOLL.hauptanwendung.filter(n => !(n in SOLL.ausnahmen));
    const ist = alle.map(v => v.name);
    assert.deepEqual([...ist].sort(), [...soll].sort(),
      'gescannte Sichten weichen von tools/axe-sichten.json ab — fehlend: ' +
      soll.filter(n => !ist.includes(n)).join(', ') + ' · neu: ' + ist.filter(n => !soll.includes(n)).join(', ') +
      ' · übersprungen: ' + (uebersprungen.join(' · ') || 'keine'));
    assert.equal(mitViol.length, 0,
      `WCAG-Violations in ${mitViol.length}/${alle.length} Sichten:\n` +
      mitViol.map(v => `  ${v.name}: ${v.violations.join(', ')}`).join('\n'));
  } finally { await browser.close(); }
});
