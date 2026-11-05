'use strict';
/* PDF-Listen als Block je Eintrag (GL B2, Punkte 4 und 5, 02.11.2026). Eine Wiederholgruppe stand im Bereichs- und
   Gesamt-PDF als ein Fließtext „…; …“. Jetzt steht je Eintrag ein Block, je Teil eine Zeile „Beschriftung: Wert“; eine
   Beschriftung, die auf „?“ endet, bekommt keinen Doppelpunkt; die Unterbeschriftung wiederholt den Namen der Gruppe nicht
   („BundID — E-Mail-Adresse“ steht unter „BundID“ als „E-Mail-Adresse“). Die eingebettete Datenfassung bleibt wortgleich:
   `eintraege` ist nicht aufzählbar. Gemessen am Text, den zeichneVollDepotPdf an einen schlanken jsPDF-Stub schreibt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function fakeDoc() {
  let seiten = 1;
  const texte = [];
  return {
    internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 }, getNumberOfPages: () => seiten },
    setFont() {}, setFontSize() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {}, line() {},
    getTextWidth: (t) => String(t).length * 4.5,
    splitTextToSize: (s) => [String(s == null ? '' : s)],
    addPage() { seiten += 1; }, setPage() {},
    text(t) { (Array.isArray(t) ? t : [t]).forEach((x) => texte.push(String(x))); },
    _texte: () => texte,
  };
}

async function depotMitListen() {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', { authority: 'Deutsche Rentenversicherung', typeOfCase: 'Rentenantrag', fileReferenceNumber: 'RV-2026-00417' });
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', { authority: 'Stadt München, Bürgerbüro', typeOfCase: 'Ummeldung' });
  V.listenEintragHinzufuegen('administration', 'bundid', { bundidEmailAddress: 'e.muster@beispielpost.example' });
  V.listenEintragHinzufuegen('administration', 'homeKeyWhoHoldsOne', { note: 'zweiter Schlüssel bei der Nachbarin' });
  return V;
}

function gezeichnet(V) {
  const doc = fakeDoc();
  V.zeichneVollDepotPdf(doc, V.vollDepotModell({ sensibel: true }), V.vollDepotPdfMeta());
  return doc._texte();
}

/* Die Verstöße eines gezeichneten PDF-Texts gegen die Block-Form (leer = in Ordnung). */
function blockVerstoesse(texte) {
  const v = [];
  if (texte.some((t) => /;\s/.test(t) && /Rentenversicherung/.test(t))) v.push('Einträge als Fließtext mit Semikolon');
  for (const z of ['Behörde: Deutsche Rentenversicherung', 'Behörde: Stadt München, Bürgerbüro', 'Art des Vorgangs: Ummeldung']) {
    if (!texte.includes(z)) v.push('Zeile fehlt: ' + z);
  }
  if (texte.some((t) => /\?:/.test(t))) v.push('„?:“ in einer Beschriftung');
  if (!texte.includes('Wohnungsschlüssel — wer hat einen?')) v.push('Beschriftung mit „?“ fehlt ohne Doppelpunkt');
  if (texte.some((t) => t.startsWith('BundID — E-Mail-Adresse'))) v.push('Unterbeschriftung wiederholt „BundID“');
  if (!texte.includes('E-Mail-Adresse: e.muster@beispielpost.example')) v.push('BundID-Eintrag fehlt als „E-Mail-Adresse: …“');
  return v;
}

test('[PDF-Listen·Block] je Eintrag ein Block, Beschriftung ohne „?:“, Gruppenname nicht wiederholt', async () => {
  const V = await depotMitListen();
  assert.deepEqual(blockVerstoesse(gezeichnet(V)), []);
});

test('[PDF-Listen·Block·Rot-Beweis] der frühere Fließtext und „?:“ werden gemeldet', async () => {
  const V = await depotMitListen();
  const alt = ['Laufende Verwaltungsvorgänge:', 'Behörde: Deutsche Rentenversicherung · Art des Vorgangs: Rentenantrag; Behörde: Stadt München, Bürgerbüro',
    'Wohnungsschlüssel — wer hat einen?:', 'BundID:', 'BundID — E-Mail-Adresse: e.muster@beispielpost.example'];
  assert.ok(blockVerstoesse(alt).length >= 4, blockVerstoesse(alt).join(' | '));
  assert.ok(V, 'Positivkontrolle: Kern geladen');
});

test('[PDF-Listen·Datenfassung] die eingebettete Datenfassung bleibt wortgleich — eintraege ist nicht aufzählbar', async () => {
  const V = await depotMitListen();
  const m = V.vollDepotModell({ sensibel: true });
  const zeile = m.bereiche.find((b) => b.id === 'administration').sektionen.flatMap((s) => s.zeilen).find((z) => z.label === 'Laufende Verwaltungsvorgänge');
  assert.ok(zeile && Array.isArray(zeile.eintraege) && zeile.eintraege.length === 2, 'Positivkontrolle: zwei Einträge am Modell');
  assert.deepEqual(Object.keys(zeile).sort(), ['label', 'wert']);
  assert.ok(!JSON.stringify(m).includes('"eintraege"'));
  assert.ok(zeile.wert.includes('; '), 'wert trägt weiter den Text der Zusammenfassung');
});

module.exports = {
  PROBEN: [
    { fuer: '[PDF-Listen·Block] je Eintrag ein Block, Beschriftung ohne „?:“, Gruppenname nicht wiederholt', diskriminante: blockVerstoesse },
  ],
};
