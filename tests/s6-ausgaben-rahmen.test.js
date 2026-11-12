'use strict';
/* Zielbild S6 · Ausgaben (31.10.2026): der gemeinsame Rahmen der PDFs. Telefonnummern brechen nicht um, die Notfallkarte zeigt ihre
   Pflichtangaben auch leer. Den Fuß setzt der Kanon (pdfFussZeilen, U2-ADR-400) — seine Proben halten Inhalt und Umbruch, nicht diese. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frisch() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k.V;
}

test('[S6·Telefon] Ziffergruppen einer Nummer werden geschützt verbunden, andere Zahlen bleiben', async () => {
  const V = await frisch();
  assert.equal(V.pdfTelefonGeschuetzt('Anna · 0171 2345678 · Lindenweg 4, 80331 München'),
    'Anna · 0171 2345678 · Lindenweg 4, 80331 München');
  assert.equal(V.pdfTelefonGeschuetzt('+49 30 123 45'), '+49 30 123 45');
  assert.equal(V.pdfTelefonGeschuetzt('Ramipril 5 mg, 2 mal'), 'Ramipril 5 mg, 2 mal');
});

test('[S6·Notfallkarte] leere Pflichtangaben stehen als Leerzeile da, eingetragene als Zeile aus dem Modell', async () => {
  const V = await frisch();
  V.sektorFeldSetzen('health', 'bloodType', '0+');
  const leer = V._notfallKartePflichtZeilen(V.notfallKernModell());
  assert.ok(leer.length >= 5, 'mindestens Allergien, Medikamente, Erkrankungen, Implantate, Hausarzt');
  assert.ok(leer.every((z) => z.leer === true && z.label), JSON.stringify(leer));
  V.sektorFeldSetzen('health', 'implantsProsthesesPacemakers', 'Hüft-TEP');
  const mit = V._notfallKartePflichtZeilen(V.notfallKernModell());
  const implantat = mit.find((z) => z.feld === 'implantsProsthesesPacemakers');
  assert.ok(implantat && !implantat.leer && implantat.wert === 'Hüft-TEP', JSON.stringify(implantat));
});

test('[S6·Notfallkarte] die Karte schreibt jeden Notfallkontakt mit seiner Nummer als eigene Zeichenfolge', async () => {
  const V = await frisch();
  const id = V.personHinzufuegen({ name: 'Johanna Lichtblau', tel: '0171 2345678' });
  V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: id, override: '' }]);
  const texte = [];
  const doc = {
    internal: { pageSize: { getWidth: () => 105, getHeight: () => 148 }, getNumberOfPages: () => 1, scaleFactor: 72 / 25.4 },
    setFont() {}, setFontSize() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {}, line() {}, setPage() {}, addPage() {},
    splitTextToSize: (s) => [String(s)], text(t) { (Array.isArray(t) ? t : [t]).forEach((x) => texte.push(String(x))); },
  };
  V.zeichneNotfallkarte(doc, V.notfallKernModell(), V.notfallKartenMeta(), null);
  assert.ok(texte.includes('0171 2345678'), texte.join(' | '));
  assert.ok(texte.includes('Johanna Lichtblau'), texte.join(' | '));
});

test('[S6·Telefon·Rot-Beweis] eine Funktion, die nichts schützt, fiele durch', async () => {
  const V = await frisch();
  const roh = '0171 2345678';
  const geschuetzt = V.pdfTelefonGeschuetzt(roh);
  assert.equal(geschuetzt, '0171 2345678', 'die Nummer trägt ein geschütztes Leerzeichen');
  // Gegenprobe: der Vergleich oben fände eine Funktion, die den Text unverändert lässt.
  assert.throws(() => assert.equal(roh, '0171 2345678'));
});

test('[S6·Notfallkarte·Rot-Beweis] eine Karte ohne Leerzeilen der Pflichtangaben fiele durch', async () => {
  const V = await frisch();
  const leer = V._notfallKartePflichtZeilen(V.notfallKernModell());
  const ohnePflicht = leer.filter((z) => !z.leer);
  // Gegenprobe: die Bedingung der Probe oben (mindestens fünf Leerzeilen) schlägt an einer Karte ohne sie an.
  assert.ok(leer.length >= 5);
  assert.equal(ohnePflicht.length >= 5, false);
});
