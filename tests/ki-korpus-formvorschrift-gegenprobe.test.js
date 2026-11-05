'use strict';
/* U2-ADR-507 §2.3, Nachtrag 29.10.2026 — Gegenprobe zur Formvorschrift: der KI-Korpus trägt § 2247 BGB nicht selbst, er verweist auf den
   Rechtsraum-Katalog. Erstens nennt die Datei des KI-Korpus weder den Paragrafen noch eine Formvorschrift. Zweitens liest das gebackene
   Produkt die Formvorschrift der KI-Verfügung aus dem Rechtsraum-Modul. Rot-Beweis: ein Produkt, gebaut mit einem Rechtsraum-Modul, das
   einen anderen Paragrafen nennt, zeigt diesen anderen Paragrafen — und sein KI-Korpus bleibt Wort für Wort derselbe. Im öffentlichen
   Zuschnitt läuft die Probe gegen das erfundene Gegenstück des KI-Korpus (tools/lib/vorlage-aufloesen.js). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PRODUKTE, modulDateienFuer, KI_KORPUS_PFAD, RECHTSRAUM_DE_PFAD } = require('../tools/lib/vier-produkte.js');
const { produktKernLaden, abdruckAus } = require('./helfer/dokumentschritte-abdruck.js');
const { vorlageAufloesen } = require('../tools/lib/vorlage-aufloesen.js');
const { ohneZufallsKennungen } = require('./ohne-zufallskennungen.js');

const REPO = path.join(__dirname, '..');

const PRIVAT_DE = PRODUKTE.find((p) => p.slug === 'privat-de');
const kiParagraf = (V) => V.VORSORGE_MODUL_BY_ID['ki-verfuegung'].form.paragraf;

test('[U2-ADR-507·Formvorschrift] der KI-Korpus nennt § 2247 nicht, das Produkt liest ihn aus dem Rechtsraum-Katalog', () => {
  const text = fs.readFileSync(vorlageAufloesen(REPO, KI_KORPUS_PFAD), 'utf8');
  assert.doesNotMatch(ohneZufallsKennungen(text), /2247/, 'kein Paragraf im KI-Korpus');
  assert.doesNotMatch(text, /"(formvorschriften|paragraf)"/, 'keine eigene Formvorschrift im KI-Korpus');
  const katalog = JSON.parse(fs.readFileSync(RECHTSRAUM_DE_PFAD, 'utf8')).typen['ki-verfuegung'].formvorschriften.paragraf;
  assert.equal(katalog, '§ 2247 BGB');
  assert.equal(kiParagraf(produktKernLaden('privat-de', modulDateienFuer(PRIVAT_DE))), katalog);
});

test('[U2-ADR-507·Formvorschrift·Rot-Beweis] ein anderer Paragraf im Rechtsraum-Modul erscheint im Produkt, der KI-Korpus bleibt gleich', () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-formvorschrift-'));
  try {
    const modul = JSON.parse(fs.readFileSync(RECHTSRAUM_DE_PFAD, 'utf8'));
    modul.typen['ki-verfuegung'].formvorschriften.paragraf = '§ 9999 BGB';
    const kopie = path.join(ordner, path.basename(RECHTSRAUM_DE_PFAD));
    fs.writeFileSync(kopie, JSON.stringify(modul, null, 2) + '\n', 'utf8');
    const vorher = produktKernLaden('privat-de', modulDateienFuer(PRIVAT_DE));
    const nachher = produktKernLaden('privat-de', modulDateienFuer(PRIVAT_DE).map((f) => (f === RECHTSRAUM_DE_PFAD ? kopie : f)));
    assert.equal(kiParagraf(nachher), '§ 9999 BGB', 'ROT ERWARTET: der Paragraf kommt aus dem Rechtsraum-Modul');
    assert.equal(abdruckAus(nachher).KI_KORPUS, abdruckAus(vorher).KI_KORPUS, 'der KI-Korpus trägt den Paragrafen nicht');
    assert.equal(abdruckAus(nachher).kiwiz, abdruckAus(vorher).kiwiz);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});
