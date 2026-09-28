'use strict';
/* ═════════════════════════════════════════════════════════════════
   Schema 89 (27.09.2026, U2-ADR-439): die Ablageorte der Personenstandsurkunden sind Kennungen im Bereich
   `identity` — `birthCertificateStorage`, `marriageCertificateStorage`, `familyRegisterBookStorage`. Bis Schema 88
   standen sie als eigene Felder der Situation Erbfall (`erb_personenstand` „Geburts-/Heiratsurkunde“, EIN Feld für
   beide; `erb_stammbuch`) — nicht anfragbar, nicht im Katalog. Anlass: § 38 PStV (das Standesamt verlangt Geburts-
   und Eheurkunde, wenn ein Sterbefall angezeigt wird) und § 352 Abs. 3 FamFG (Nachweis durch öffentliche Urkunden).

   Geprüft: die Stufe (in beide Urkundenfelder, nur in leere, Altwert bleibt), die Kennungen (anfragbar, sensibel),
   die Situation Erbfall und das Blatt „Behörden und Nachlass“ zeigen die Kennungsfelder, und die Lese-App liest
   einen alten Stand genauso.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const NEU = Object.freeze(['birthCertificateStorage', 'marriageCertificateStorage', 'familyRegisterBookStorage']);
const alt = (erbfall, identity) => ({ schemaVersion: 88, sektoren: { identity: identity || {} }, menschen: [], situationen: { erbfall } });

test('[Stufe 89] „Geburts-/Heiratsurkunde“ geht in beide Urkundenfelder, das Stammbuch in sein Feld; der Altwert bleibt', () => {
  const { V } = ladeKern({ blank: true });
  const d = alt({ erb_personenstand: 'Mappe „Urkunden“', erb_stammbuch: 'Schreibtisch, unten', erb_notar: 'Dr. X' });
  V.depotNormalisieren(d);
  assert.ok(d.schemaVersion >= 89);
  assert.equal(d.sektoren.identity.birthCertificateStorage, 'Mappe „Urkunden“');
  assert.equal(d.sektoren.identity.marriageCertificateStorage, 'Mappe „Urkunden“');
  assert.equal(d.sektoren.identity.familyRegisterBookStorage, 'Schreibtisch, unten');
  assert.equal(d.situationen.erbfall.erb_personenstand, 'Mappe „Urkunden“', 'Verwaisungsregel: der Altwert bleibt stehen');
  assert.equal(d.situationen.erbfall.erb_stammbuch, 'Schreibtisch, unten');
});

test('[Stufe 89·Vorrang] ein schon gesetztes Identitätsfeld wird nicht überschrieben; leere Altwerte schreiben nichts', () => {
  const { V } = ladeKern({ blank: true });
  const d = alt({ erb_personenstand: 'Mappe', erb_stammbuch: '   ' }, { birthCertificateStorage: 'Tresor' });
  V.depotNormalisieren(d);
  assert.equal(d.sektoren.identity.birthCertificateStorage, 'Tresor');
  assert.equal(d.sektoren.identity.marriageCertificateStorage, 'Mappe');
  assert.equal('familyRegisterBookStorage' in d.sektoren.identity, false, 'aus Leerzeichen entsteht kein Wert');
  const ohne = { schemaVersion: 88, sektoren: {}, menschen: [] };
  V.depotNormalisieren(ohne);
  assert.equal(ohne.sektoren.identity && Object.keys(ohne.sektoren.identity).filter((k) => NEU.includes(k)).length || 0, 0,
    'ohne Situation Erbfall legt die Stufe nichts an');
});

test('[Kennungen] die drei sind Kennungen des Kerns, sensibel, und eine Anfrage erreicht sie', async () => {
  const { V } = ladeKern();
  for (const f of NEU) {
    const def = V.kennungFeldDef('identity.' + f);
    assert.ok(def, 'Kennung fehlt: identity.' + f);
    assert.equal(def.sensibel, true, 'ein Ablageort von Urkunden ist sensibel wie das Situationsfeld vorher: ' + f);
    assert.ok(typeof def.label === 'string' && def.label.trim() && !/^[a-z]+[A-Z]/.test(def.label), 'Beschriftung, keine Kennung: ' + f);
  }
  await V.depotAnlegen('schema-89-anfrage-2026!');
  V.akteurSelbstErklaeren('Walter Mustermann');
  V.sektorFeldSetzen('identity', 'birthCertificateStorage', 'Mappe „Urkunden“');
  V.sensibelFeldSetzen('identity', 'birthCertificateStorage', false);
  const ds = V.anfrageAntwortDatensatz({ modulTyp: 'anfrage', anfrageVersion: 1, von: 'Standesamt', zweck: 'Sterbefall', grundlage: '§ 38 PStV',
    vorgang: 'S-1', gestelltAm: '2026-09-27', gueltigBis: '2027-12-31', antwort: { art: 'einmalpasswort' },
    felder: [{ kennung: 'identity.birthCertificateStorage', zweck: '§ 38 Nr. 2 PStV', pflicht: true }] });
  assert.equal(ds.felder.find((f) => f.kennung === 'identity.birthCertificateStorage').wert, 'Mappe „Urkunden“');
});

test('[Situation·Blatt] die Situation Erbfall und das Blatt „Behörden und Nachlass“ zeigen die Kennungsfelder, nicht mehr die eigenen', () => {
  const { V } = ladeKern();
  const erbfall = V.SITUATIONEN.find((s) => s.id === 'erbfall');
  const eintraege = erbfall.bloecke.flatMap((b) => b.eintraege || []);
  const eigene = eintraege.filter((e) => e.feld && typeof e.feld === 'object').map((e) => e.feld.id);
  assert.ok(!eigene.includes('erb_personenstand') && !eigene.includes('erb_stammbuch'), 'die zwei Situationsfelder sind deaktiviert');
  for (const f of NEU) assert.ok(eintraege.some((e) => e.quelle === 'identity' && e.feld === f), 'Situation verweist auf identity.' + f);
  const fs = require('node:fs');
  const kern = fs.readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  for (const f of NEU) assert.ok(kern.includes("'behoerden_nachlass|identity|" + f + "'"), 'Blatt: ' + f);
  assert.ok(!/'behoerden_nachlass\|sit:erbfall\|erb_(personenstand|stammbuch)'/.test(kern), 'das Blatt trägt die alten Situationsfelder nicht mehr');
});

test('[Lese-App·Gegenprobe] ein gesetztes Identitätsfeld gewinnt, ohne Situation Erbfall bleibt der Bereich unverändert', () => {
  const { V } = ladeLesen();
  V.setData({ schemaVersion: 88, sektoren: { identity: { birthCertificateStorage: 'Tresor' } }, menschen: [],
    situationen: { erbfall: { erb_personenstand: 'Mappe' } } });
  const d = V._sektorDatenFuerLesen('identity');
  assert.equal(d.birthCertificateStorage, 'Tresor', 'der Wert im Bereich gewinnt');
  assert.equal(d.marriageCertificateStorage, 'Mappe', 'das leere Feld liest den Altwert');
  const basis = { givenName: 'Walter' };
  V.setData({ schemaVersion: 89, sektoren: { identity: basis }, menschen: [] });
  assert.equal(V._sektorDatenFuerLesen('identity'), basis, 'ohne Altwert: dasselbe Objekt, nichts angelegt');
});

test('[Beschriftung·Rot-Beweis] die eigene Geburtsurkunde ist von der eines Kindes unterscheidbar (W-8)', () => {
  const { V } = ladeKern();
  const eigen = V.kennungFeldDef('identity.birthCertificateStorage').label;
  assert.match(eigen, /^Eigene Geburtsurkunde/, 'sonst trägt das Formular zweimal „Geburtsurkunde — Ablageort“');
});

test('[Lese-App] ein Stand bis Schema 88 zeigt die Ablageorte bei der Angehörigen im Bereich Identität', () => {
  const { V } = ladeLesen();
  V.setData({ schemaVersion: 88, sektoren: { identity: { givenName: 'Walter' } }, menschen: [],
    situationen: { erbfall: { erb_personenstand: 'Mappe „Urkunden“', erb_stammbuch: 'Schublade' } } });
  const d = V._sektorDatenFuerLesen('identity');
  assert.equal(d.birthCertificateStorage, 'Mappe „Urkunden“');
  assert.equal(d.marriageCertificateStorage, 'Mappe „Urkunden“');
  assert.equal(d.familyRegisterBookStorage, 'Schublade');
  assert.equal(d.givenName, 'Walter');
});

/* Erbschein-Vorbereitungsauszug, Teil C (27.09.2026, Wortlaut gegengelesen): die Urkunden für den Nachweis nach § 352 Abs. 3
   FamFG. Die drei Ablageorte werden gelesen oder bleiben sichtbar Lücke; die Sterbeurkunde und die Urkunden der Erben stehen
   ausdrücklich als NICHT im Depot da — sonst läse sich die Liste vollständig, obwohl der Nachweis des Todeszeitpunkts fehlt. */
test('[Erbschein·Teil C] liest die drei Ablageorte, nennt die Sterbeurkunde und die Urkunden der Erben als nicht im Depot', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const modul = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'erbschein-vorbereitung-modul.json'), 'utf8'));
  const teilC = modul.abschnitte.find((a) => /^Teil C/.test(a.titel));
  assert.ok(teilC, 'Teil C steht im ausgelieferten Modul');
  const texte = teilC.bloecke.filter((b) => b.typ === 'immer').flatMap((b) => b.texte).join(' ');
  assert.match(texte, /in der Regel durch öffentliche Urkunden nach \(§ 352 Abs\. 3 FamFG\)/, 'Wiedergabe mit Fundstelle');
  assert.match(texte, /Die Sterbeurkunde stellt das Standesamt aus, nachdem der Sterbefall beurkundet ist; sie steht nicht in diesem Depot\./);
  assert.match(texte, /Urkunden der Erben, etwa deren Geburtsurkunden, gehören nicht zu diesem Depot\./);
  assert.deepEqual(teilC.bloecke.filter((b) => b.typ === 'frageAntwortOderLuecke').map((b) => b.feldId), ['geburtsurkunde_ort', 'eheurkunde_ort', 'stammbuch_ort']);

  const { V } = ladeKern();
  await V.depotAnlegen('schema-89-erbschein-2026!');
  V.akteurSelbstErklaeren('Walter Mustermann');
  const lesen = () => V.datenSchemaLesen(modul.datenSchema, V.getData());
  assert.equal(lesen().geburtsurkunde_ort, undefined, 'leer: keine Erfindung, die Lücke bleibt');
  V.sektorFeldSetzen('identity', 'birthCertificateStorage', 'Mappe „Urkunden“');
  V.sektorFeldSetzen('identity', 'familyRegisterBookStorage', 'Schublade');
  const d = lesen();
  assert.equal(d.geburtsurkunde_ort, 'Mappe „Urkunden“', 'sensibel, aber für den eigenen Auszug erlaubt (sensibelErlaubt)');
  assert.equal(d.stammbuch_ort, 'Schublade');
  assert.equal(d.eheurkunde_ort, undefined);
  // Der zweite Lesepfad (XML-Datei) liest dasselbe (U2-ADR-248: beide Wege explizit gleich halten).
  const alt = V._erbscheinSektorDaten();
  for (const k of ['geburtsurkunde_ort', 'eheurkunde_ort', 'stammbuch_ort']) assert.equal(alt[k], d[k], 'XML-Pfad gleich: ' + k);
  const xml = V.erbscheinAuszugXML();
  assert.match(xml, /<geburtsurkundeAblageort erfasst="ja">Mappe „Urkunden“<\/geburtsurkundeAblageort>/);
  assert.match(xml, /<eheurkundeAblageort erfasst="nein"><\/eheurkundeAblageort>/);
});
