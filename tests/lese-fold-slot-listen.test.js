'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die sieben Slot→Listen-Umbauten, gespiegelt in der Lese-App.
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST, vor Fold und Deklarationen geschrieben und rot.

   DER DEFEKT, den das schliesst, steht seit Schema-Stufe 34 im
   AUSGELIEFERTEN Stand (gemessen an ci-probe 0e4bd9f, nicht vermutet): Der
   Kern führt sieben Listen — Konten, Kreditkarten, Fachärzte, Haustiere,
   Fahrzeuge, persönliche Briefe, weitere Wohnungen. Die Lese-App kennt
   KEINE davon; sie trägt noch die alten Flachfelder. Eine Bürgerin, die
   ihr heutiges Depot einer Institution vorlegt, zeigt an diesen Stellen
   leere Abschnitte — ohne Fehler, ohne Hinweis, nicht zu unterscheiden von
   „nichts hinterlegt".

   ZWEI RICHTUNGEN, beide nötig:
     · NEUES Depot (Kern-Form, Listen gefüllt) → die Lese-App muss es zeigen.
       Das ist der Defekt, der heute live ist.
     · ALTES Depot (Flachfelder, nie in der neuen Bürger-App geöffnet) → der
       Fold muss es überführen. Ohne ihn wäre das Entfernen der alten
       Deklarationen ein Datenverlust in der Anzeige: Die Bürger-App
       migriert beim Öffnen, die Lese-App bekommt die Datei, wie sie ist.

   Die Reihenfolge ist deshalb bindend: erst Fold, dann löschen. Nicht
   umgekehrt.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

/* Je Liste: der Alt-Zustand (Flachfelder, wie ein Depot vor Stufe 34 ihn trägt), die Werte,
   die nach dem Öffnen sichtbar sein MÜSSEN, und die Werte, die zurückgehalten werden MÜSSEN.
   Die Alt-Feldnamen stammen aus den Kern-Migrationen (33→34, 34→35, 36→37), nicht aus einer
   Annahme.

   ZURUECKGEHALTEN („Die Lese-App wird nirgends mitgemessen", Befund 2, 12./13.08.2026):
   drei der sieben Zielfelder tragen `sensibel: true` im Kern-Schema — `konten.iban`,
   `kreditkarten.karte` (Unterfeld-Ebene) und die GANZEN Listen `fachaerzte`/`persoenliche_briefe`
   (Trägerfeld-Ebene). Vor Befund 2 prüfte die Lese-App `sensibel` nirgends — diese Werte waren
   sichtbar, obwohl der Kern sie in jedem eigenen Exportweg zurückhält. Jetzt zurecht NICHT
   sichtbar; die Migration selbst (kein Datenverlust im STAND) bleibt aber Pflicht — geprüft über
   `V.getData()`, nicht über das HTML (dieselbe Trennung wie im Test „ohne Alt-Werte..." unten). */
const FAELLE = [
  { liste: 'accounts',            sektor: 'finance', sektorAlt: 'finanzen',
    alt: { konto_haupt_bank: 'Sparkasse Nord', konto_haupt_iban: 'DE02 1234 5678' },
    sichtbar: ['Sparkasse Nord'],
    zurueckgehalten: [{ unterfeld: 'iban', wert: 'DE02 1234 5678' }] },
  { liste: 'creditCards',         sektor: 'finance', sektorAlt: 'finanzen',
    alt: { kreditkarte1: 'Visa Sparkasse', kreditkarte2: 'Mastercard Gold' },
    sichtbar: [],
    zurueckgehalten: [{ unterfeld: 'karte', wert: 'Visa Sparkasse' }, { unterfeld: 'karte', wert: 'Mastercard Gold' }] },
  { liste: 'specialistDoctors',   sektor: 'health', sektorAlt: 'gesundheit',
    alt: { facharzt_1: 'Dr. Kardio Berlin', facharzt_2: 'Dr. Augen Rostock' },
    sichtbar: [],
    zurueckgehalten: [{ unterfeld: 'arzt', wert: 'Dr. Kardio Berlin' }, { unterfeld: 'arzt', wert: 'Dr. Augen Rostock' }] },
  { liste: 'pets',                sektor: 'identity', sektorAlt: 'identitaet',
    alt: { tier_name: 'Kater Miez', tier_tierarzt: 'Dr. Vet Rostock', tier_futter: 'morgens trocken' },
    sichtbar: ['Kater Miez', 'Dr. Vet Rostock', 'morgens trocken'],
    zurueckgehalten: [] },
  { liste: 'vehicles',            sektor: 'mobility', sektorAlt: 'mobilitaet',
    alt: { auto1: 'VW Golf HRO-AB 12', auto1_ausweis: 'im Handschuhfach', auto2: 'Anhaenger' },
    sichtbar: ['VW Golf HRO-AB 12', 'Anhaenger'],
    zurueckgehalten: [{ unterfeld: 'fahrzeugausweis_ort', wert: 'im Handschuhfach' }] },
  { liste: 'personalLettersWordsToPeople', sektor: 'personal', sektorAlt: 'persoenliches',
    alt: { brief_1: 'Liebe Lina, wenn Du das liest', brief_2: 'Lieber Tom, ich wollte Dir sagen' },
    sichtbar: [],
    zurueckgehalten: [{ unterfeld: 'text', wert: 'Liebe Lina, wenn Du das liest' }, { unterfeld: 'text', wert: 'Lieber Tom, ich wollte Dir sagen' }] },
  { liste: 'furtherHomes',        sektor: 'housing', sektorAlt: 'wohnen',
    alt: { zw_strasse: 'Seestrasse 4', zw_plz_ort: '18055 Rostock', zw_miete: '420' },
    sichtbar: ['Seestrasse 4', '18055 Rostock'],
    zurueckgehalten: [{ unterfeld: 'miete', wert: '420' }] },
];

function leseSicht(depot, sektorId) {
  const Lr = ladeLesen(); const V = Lr.V || Lr;
  V.setData(V._foldVollmachtenLesen(depot));      // ECHTER Oeffnen-Pfad, nicht setData allein
  return { html: V.sektorHTML(sektorId), daten: V.getData() };
}

/* ── Richtung 1: das HEUTIGE Depot (Kern-Form) ──────────────────────────────────────── */

for (const f of FAELLE) {
  test('[SlotFold] neue Form — ' + f.sektor + '.' + f.liste + ' wird in der Lese-App sichtbar', async () => {
    const k = ladeKern(); const K = k.V;
    await K.depotAnlegen('pw'); K.akteurSelbstErklaeren('Maria');
    // Das Depot vom KERN migrieren lassen — so entsteht genau die Form, die real vorliegt,
    // statt einer von mir angenommenen.
    const d = K.depotNormalisieren(Object.assign(K.getData(), {
      sektoren: Object.assign(K.getData().sektoren, { [f.sektorAlt]: Object.assign({}, f.alt) }),   // Flachfelder stehen in Alt-Dateien unter dem DEUTSCHEN Bereich
    }));
    const { html, daten } = leseSicht(JSON.parse(JSON.stringify(d)), f.sektor);
    const fehlt = f.sichtbar.filter(w => !html.includes(w));
    assert.equal(fehlt.join(', '), '',
      'Diese Werte fuehrt der Kern in ' + f.liste + ', die Lese-App zeigt sie NICHT. Beim Vorzeigen '
      + 'erscheint dort ein leerer Abschnitt — ununterscheidbar von „nichts hinterlegt": ' + fehlt.join(', '));
    // Befund 2 (12./13.08.2026): sensible Unterfelder/Listen erscheinen NICHT im HTML — aber der
    // Fold muss den Wert trotzdem in den STAND geschrieben haben (kein Datenverlust, nur
    // Zurückhaltung beim Vorzeigen). Zwei getrennte Behauptungen, zwei getrennte Prüfungen.
    const nichtZurueckgehalten = f.zurueckgehalten.filter(z => html.includes(z.wert));
    assert.equal(nichtZurueckgehalten.map(z => z.wert).join(', '), '',
      'Diese Werte sind sensibel (' + f.liste + ') und dürfen NICHT im HTML der Lese-App erscheinen: '
      + nichtZurueckgehalten.map(z => z.wert).join(', '));
    const liste = ((daten.sektoren[f.sektor] || {})[f.liste]) || [];
    const fehltImStand = f.zurueckgehalten.filter(z => !JSON.stringify(liste).includes(z.wert));
    assert.equal(fehltImStand.map(z => z.wert).join(', '), '',
      'Diese sensiblen Werte fehlen sogar im migrierten STAND (nicht nur im HTML) — das wäre '
      + 'echter Datenverlust, nicht Zurückhaltung: ' + fehltImStand.map(z => z.wert).join(', '));
  });
}

/* ── Richtung 2: das ALTE Depot, das nie in der neuen Buerger-App war ──────────────────
   ACHTUNG BEIM LESEN DIESER TESTS: Sie sind schon VOR dem Bau gruen — aber nicht, weil ein
   Fold sie traegt, sondern weil die Lese-App die alten Flachfelder noch DEKLARIERT. Genau
   das ist der Zustand, den Punkt 1 des Umbaus beendet. Ihr Zweck liegt DANACH: Sie muessen
   gruen BLEIBEN, wenn die alten Deklarationen entfernt sind. Dann — und erst dann — messen
   sie den Fold. Wer sie heute als Beleg liest, liest sie falsch. */

for (const f of FAELLE) {
  test('[SlotFold] Alt-Depot — ' + f.sektor + '.' + f.liste + ' wird beim Oeffnen ueberfuehrt', () => {
    const depot = { schemaVersion: 24, sektoren: { [f.sektorAlt]: Object.assign({}, f.alt) }, menschen: [] };   // Alt-Datei: deutscher Bereich
    const { html, daten } = leseSicht(depot, f.sektor);
    const fehlt = f.sichtbar.filter(w => !html.includes(w));
    assert.equal(fehlt.join(', '), '',
      'Ein Depot, das seit dem Umbau nie in der Buerger-App geoeffnet wurde, traegt diese Werte '
      + 'noch flach. Die Lese-App migriert nicht — sie braucht den Fold, SONST ist das Entfernen '
      + 'der alten Deklarationen ein Datenverlust in der Anzeige: ' + fehlt.join(', '));
    const nichtZurueckgehalten = f.zurueckgehalten.filter(z => html.includes(z.wert));
    assert.equal(nichtZurueckgehalten.map(z => z.wert).join(', '), '',
      'Diese Werte sind sensibel (' + f.liste + ') und dürfen NICHT im HTML der Lese-App erscheinen: '
      + nichtZurueckgehalten.map(z => z.wert).join(', '));
    const liste = ((daten.sektoren[f.sektor] || {})[f.liste]) || [];
    const fehltImStand = f.zurueckgehalten.filter(z => !JSON.stringify(liste).includes(z.wert));
    assert.equal(fehltImStand.map(z => z.wert).join(', '), '',
      'Diese sensiblen Werte fehlen sogar im migrierten STAND (nicht nur im HTML) — das wäre '
      + 'echter Datenverlust, nicht Zurückhaltung: ' + fehltImStand.map(z => z.wert).join(', '));
  });
}

/* ── Die Regeln, die auch fuer die frueheren Folds gelten ────────────────────────────── */

test('[SlotFold] ohne Alt-Werte entsteht KEINE Zeile (kein Geistereintrag)', () => {
  const Lr = ladeLesen(); const V = Lr.V || Lr;
  for (const f of FAELLE) {
    V.setData(V._foldVollmachtenLesen({ schemaVersion: 24, sektoren: { [f.sektor]: {} }, menschen: [] }));
    const liste = ((V.getData().sektoren[f.sektor] || {})[f.liste]) || [];
    // Geprueft wird der DATENSTAND, nicht das HTML: Eine leere Zeile waere eine Behauptung ueber
    // die Buergerin, die sie nie aufgestellt hat — und im HTML waere sie kaum von „nichts" zu
    // unterscheiden. (Die erste Fassung dieses Tests war eine Tautologie mit `|| true`.)
    assert.equal(liste.length, 0, f.sektor + '.' + f.liste + ': der Fold hat aus nichts eine Zeile gemacht');
  }
});

test('[SlotFold] ein bereits migriertes Depot wird NICHT doppelt gefaltet', async () => {
  const k = ladeKern(); const K = k.V;
  await K.depotAnlegen('pw'); K.akteurSelbstErklaeren('Maria');
  // A56 (30.07.2026): `bank` ist ein ref-Unterfeld — {override} statt rohem String. `iban` bleibt Text.
  K.listenEintragHinzufuegen('finance', 'accounts', { institution: { override: 'Sparkasse Nord' }, iban: 'DE02' });
  const d = JSON.parse(JSON.stringify(K.getData()));
  const Lr = ladeLesen(); const V = Lr.V || Lr;
  V.setData(V._foldVollmachtenLesen(d));
  const liste = ((V.getData().sektoren.finance || {}).accounts) || [];
  assert.equal(liste.length, 1, 'genau ein Eintrag — der Fold darf einen fertigen Bestand nicht verdoppeln');
});
