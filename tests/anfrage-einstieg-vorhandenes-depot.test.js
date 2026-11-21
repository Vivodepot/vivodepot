'use strict';
/* Anfrage über QR-Code oder Link, die Bürgerin hat schon ein Depot, es ist auf diesem Gerät nicht offen.
   (1) Das Ankunftsfenster bietet neben „neues Depot anlegen“ einen zweiten Weg: das eigene Depot öffnen.
   (2) Die Anfrage aus der Adresse geht dabei nicht verloren: nach dem Öffnen eines Depots wird sie noch einmal gelesen,
       nicht nur beim Start der Anwendung.
   Erwartete Röte bis zum Fix (todo mit Kennung). ROT-BEWEIS: am heutigen Kern rot (kein zweiter Weg im Fenster; die Adresse wird nur beim Start gelesen). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ANFRAGE = {
  modulTyp: 'anfrage', anfrageVersion: 1, von: 'Stadtbibliothek Probestadt', zweck: 'Ausstellen eines Bibliotheksausweises',
  grundlage: 'Benutzungsordnung', vorgang: 'BIB-2026-0001', gestelltAm: '2026-11-18', gueltigBis: '2026-12-31',
  felder: [{ kennung: 'identity.givenName', zweck: 'Ausweis', pflicht: true }, { kennung: 'identity.familyName', zweck: 'Ausweis', pflicht: true }],
  antwort: { art: 'einmalpasswort', an: 'ausweis@bibliothek.example.de' },
};

test('[Anfrage · vorhandenes Depot 1] das Ankunftsfenster ohne offenes Depot bietet „eigenes Depot öffnen“', { todo: 'Befund ANFRAGE-EINSTIEG-OHNE-EIGENES-DEPOT (HOCH): wer schon ein Depot hat und es nicht offen hat, kommt aus dem Ankunftsfenster nicht hinein; Eigentümer Pro' }, async () => {
  const { V } = ladeKern();
  const rufe = [];
  V.ui.modal = (opt) => { rufe.push(opt); return () => {}; };
  const ok = await V.flowAnfrageEinstieg({ anfrage: ANFRAGE });
  assert.equal(ok, true, 'die Anfrage führt nicht in den Einstieg');
  const fenster = rufe[rufe.length - 1];
  assert.ok(fenster, 'kein Ankunftsfenster');
  const wege = [fenster.zweitAktion, fenster.drittAktion].filter(Boolean);
  assert.ok(wege.length > 0, 'das Ankunftsfenster kennt nur „neues Depot anlegen“; wer schon ein Depot hat, kommt von hier nicht hinein');
});

test('[Anfrage · vorhandenes Depot 2] die Anfrage aus der Adresse wird nicht nur beim Start gelesen', { todo: 'Befund ANFRAGE-EINSTIEG-OHNE-EIGENES-DEPOT (HOCH): wer schon ein Depot hat und es nicht offen hat, kommt aus dem Ankunftsfenster nicht hinein; Eigentümer Pro' }, () => {
  const { html } = ladeKern();
  const aufrufe = html.split('anfrageAusAdresseVielleicht(').length - 2;   // ohne die Definition
  assert.ok(aufrufe >= 2, 'die Adresse wird nur an einer Stelle (beim Start) gelesen; nach dem Öffnen eines Depots geht die Anfrage verloren');
});
