'use strict';
/* Notvertretung durch Ehegatten in Gesundheitsfragen (25.09.2026): die Ablehnung im Depot der VERTRETENEN Person.
   Bis heute kannte das Depot die Notvertretung nur auf der Seite des Vertretenden (people.childrenAndDependants/
   basisOfRepresentation, Ablauf-Rechnung) — eine Klinik konnte nicht fragen, ob die Patientin sie ablehnt. Jetzt eine eigene
   Gruppe in advanceCare mit vier Kennungen (spousalRepresentationObjection, …Since, spousalObjectionRegistered,
   spousalObjectionRegisterNumber — die Nummer sensibel). Gehalten wird: speichern und laden; die Anfrage kennt die Kennungen;
   die Notfallkarte zeigt die Ablehnung GENAU bei „ja"; die Angehörigen-Sicht trägt sie (Blatt Krankenhaus), die Nummer nicht;
   der Bürgertext nennt die Norm nur in der Fundstelle. Gilt in jedem Depot gleich (U2-ADR-432), kein eigener Weg. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const FELDER = ['spousalRepresentationObjection', 'spousalRepresentationObjectionSince', 'spousalObjectionRegistered', 'spousalObjectionRegisterNumber'];
const PW = 'notvertretung-pw-2026';

async function mitAblehnung(V, wert = 'ja') {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Gertrud Beispiel');
  V.sektorFeldSetzen('advanceCare', 'spousalRepresentationObjection', wert);
  if (wert === 'ja') {
    V.sektorFeldSetzen('advanceCare', 'spousalRepresentationObjectionSince', '2024-03-01');
    V.sektorFeldSetzen('advanceCare', 'spousalObjectionRegistered', 'ja');
    V.sektorFeldSetzen('advanceCare', 'spousalObjectionRegisterNumber', 'ZVR-2024-000111');
  }
}
const ANFRAGE_KOPF = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Kliniksozialdienst (Beispiel)', zweck: 'Klärung der Vertretung',
  grundlage: 'Notvertretung durch Ehegatten', vorgang: 'NV-1', gestelltAm: '2026-09-25', gueltigBis: '2026-12-31', antwort: { art: 'einmalpasswort' } };
const karte = (V) => V.notfallKernModell().map((z) => z.label + ': ' + z.wert).join(' | ');

test('[Notvertretung] die vier Felder überleben Speichern und Laden', async () => {
  const { V } = ladeKern();
  await mitAblehnung(V);
  const datei = await V.depotSerialisieren();
  const { V: W } = ladeKern();
  await W.depotLaden(JSON.parse(JSON.stringify(datei)), PW);
  const ac = W.getData().sektoren.advanceCare;
  assert.deepEqual(FELDER.map((f) => ac[f]), ['ja', '2024-03-01', 'ja', 'ZVR-2024-000111']);
});

test('[Notvertretung·Anfrage] eine Anfrage nennt die Kennungen und findet sie; die Eintragungsnummer ist sensibel', async () => {
  const { V } = ladeKern();
  await mitAblehnung(V);
  const ab = V.anfrageAbgleich(Object.assign({}, ANFRAGE_KOPF, { felder: FELDER.map((f) => ({ kennung: 'advanceCare.' + f, zweck: 'Vertretung klären' })) }));
  assert.equal(ab.ok, true, 'Anfrage gültig: ' + (ab.grund || ''));
  assert.deepEqual(ab.unbekannt, []);
  assert.deepEqual(ab.vorhanden.map((f) => f.kennung).sort(), FELDER.map((f) => 'advanceCare.' + f).sort());
  assert.deepEqual(ab.sensibelBetroffen, ['advanceCare.spousalObjectionRegisterNumber']);
});

test('[Notvertretung·Anfrage·Rot-Beweis] eine Kennung, die es nicht gibt, fällt als unbekannt auf — der Abgleich unterscheidet', async () => {
  const { V } = ladeKern();
  await mitAblehnung(V);
  const ab = V.anfrageAbgleich(Object.assign({}, ANFRAGE_KOPF, { felder: [{ kennung: 'advanceCare.spousalRepresentationObjectionX', zweck: 'x' }] }));
  assert.equal(ab.ok, true, 'Anfrage gültig: ' + (ab.grund || ''));
  assert.deepEqual(ab.unbekannt.map((u) => u.kennung || u), ['advanceCare.spousalRepresentationObjectionX']);
});

test('[Notvertretung·Notfallkarte] die Karte zeigt die Ablehnung und die Eintragung genau bei „ja", nie die Nummer', async () => {
  const { V } = ladeKern();
  await mitAblehnung(V, 'ja');
  const text = karte(V);
  assert.match(text, /Ich lehne eine Notvertretung durch meinen Ehegatten in Gesundheitsfragen ab: ja/);
  assert.match(text, /Im Zentralen Vorsorgeregister eingetragen: ja/);
  assert.doesNotMatch(text, /ZVR-2024-000111/);
});

test('[Notvertretung·Notfallkarte·Rot-Beweis] bei „nein" steht nichts davon auf der Karte — auch eine verwaiste Eintragung nicht', async () => {
  const { V } = ladeKern();
  await mitAblehnung(V, 'nein');
  V.sektorFeldSetzen('advanceCare', 'spousalObjectionRegistered', 'ja');   // verwaist: ohne Ablehnung keine Aussage
  assert.doesNotMatch(karte(V), /Notvertretung|Vorsorgeregister eingetragen/);
});

test('[Notvertretung·Angehörige] das Blatt Krankenhaus trägt die Ablehnung, die Angehörigen-Sicht auch — die Nummer nicht', () => {
  const { V } = ladeKern();
  const blatt = V.angehoerigenSituationenAlle().find((s) => s.id === 'krankenhausakut');
  const aufBlatt = blatt.bloecke.flatMap((b) => b.eintraege).filter((e) => e.quelle === 'advanceCare').map((e) => e.feld);
  for (const f of FELDER.slice(0, 3)) {
    assert.ok(aufBlatt.includes(f), f + ' steht auf dem Blatt Krankenhaus');
    assert.ok(V._ANG_CACHE_ERLAUBT.has('krankenhausakut|advanceCare|' + f), f + ' ist für die Angehörigen-Sicht freigegeben');
  }
  assert.equal(V._ANG_CACHE_ERLAUBT.has('krankenhausakut|advanceCare|spousalObjectionRegisterNumber'), false, 'die sensible Nummer bleibt draußen');
});

test('[Notvertretung·Wortlaut] Bürgertext in Worten — die Norm steht nur in der Fundstelle des Hilfetexts, in DE und EN', () => {
  const REPO = path.join(__dirname, '..');
  const de = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
  const en = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
  for (const [sprache, t, fundstelle] of [['de', de, /Fundstelle: § 1358 BGB/], ['en', en, /Source: Section 1358/]]) {
    const eigene = Object.entries(t).filter(([k]) => /^advanceCare(#spousal-representation|\.spousal)/.test(k));
    assert.ok(eigene.length >= 7, sprache + ': die Texte der Gruppe sind da (' + eigene.length + ')');
    for (const [k, v] of eigene) {
      if (k.endsWith('#spousal-representation.hint')) assert.match(v, fundstelle, sprache + ': Fundstelle im Hilfetext');
      else assert.doesNotMatch(v, /§|Section \d/, sprache + ': ' + k + ' nennt eine Norm außerhalb der Fundstelle');
    }
  }
});

test('[Notvertretung·jedes Depot gleich] in einem eingehängten Sub-Depot gelten dieselben Felder, dieselbe Karte — kein Sonderweg (U2-ADR-432)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-notvertretung-pw-2026');
  V.akteurSelbstErklaeren('Anna Beispiel');
  const e = await V.subDepotAnlegen({ vorname: 'Gertrud', nachname: 'Beispiel', vertretungsGrundlage: 'vorsorge' }, 'sub-notvertretung-pw-2026');
  await V.subDepotVertrauenOeffnen(e.depotUUID, 'sub-notvertretung-pw-2026');
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Anna Beispiel');
  V.sektorFeldSetzen('advanceCare', 'spousalRepresentationObjection', 'ja');
  assert.match(karte(V), /Notvertretung durch meinen Ehegatten in Gesundheitsfragen ab: ja/, 'die Karte des Sub-Depots zeigt sie wie jede');
  await V.subKontextVerlassen();
  const eintrag = V.getData().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID);
  const inhalt = (await V.subDepotEntsiegeln(eintrag.umschlag, 'sub-notvertretung-pw-2026')).inhalt;
  assert.equal(inhalt.sektoren.advanceCare.spousalRepresentationObjection, 'ja', 'versiegelt im Sub-Depot, wie in jedem Depot');
});

// Die Lese-App führt eine Handkopie der Notfallkarte (U2-ADR-262, tools/handkopien-gegen-original-pruefen.js). Die Kopie
// allein reicht nicht: auch die Regel „nur bei ja“ muss dort gelten, sonst zeigte die Klinik eine Ablehnung, die keine ist.
test('[Notvertretung·Lese-App] die Notfallkarte der Lese-App zeigt die Ablehnung genau bei „ja“ — und bei „nein“ auch keine verwaiste Eintragung', () => {
  const { ladeLesen } = require('./load-lesen.js');
  const karteLesen = (werte) => {
    const Lr = ladeLesen(); const L = Lr.V || Lr;
    L.setData({ schemaVersion: 88, sektoren: { advanceCare: werte }, menschen: [] });
    return L.notfallKernModell().map((z) => z.label + ': ' + z.wert).join(' | ');
  };
  const ja = karteLesen({ spousalRepresentationObjection: 'ja', spousalObjectionRegistered: 'ja', spousalObjectionRegisterNumber: 'ZVR-2024-000111' });
  assert.match(ja, /Notvertretung durch meinen Ehegatten in Gesundheitsfragen ab: ja/);
  assert.match(ja, /Im Zentralen Vorsorgeregister eingetragen: ja/);
  assert.doesNotMatch(ja, /ZVR-2024-000111/);
  const nein = karteLesen({ spousalRepresentationObjection: 'nein', spousalObjectionRegistered: 'ja' });
  assert.doesNotMatch(nein, /Notvertretung|Vorsorgeregister eingetragen/, 'Rot-Beweis: ohne die Regel stünde hier „nein“ bzw. die verwaiste Eintragung');
});

/* Wächter am Inhalt (30.10.2026). Die Wortlaut-Probe oben hält nur die Form: die Norm steht in der Fundstelle. Was der Hinweis
   über die Rechtslage sagt, hielt bis heute nur der Golden Master, und den nimmt die Landung neu auf. Der Hinweis nannte drei
   der vier Ausschlussgründe aus § 1358 Abs. 3 BGB und las sich doch als vollständige Liste; es fehlte die bestellte Betreuung
   für Gesundheitsfragen (Abs. 3 Nr. 3) — genau der Fall, den eine Klinik vor sich haben kann.
   PFLICHT im Hinweis der Gruppe: die Voraussetzung, die Höchstdauer, das Getrenntleben, Ablehnung und Vollmacht, die Betreuung,
     der Weg ins Register, „Keine Rechtsberatung“.
   PFLICHT im Hinweis am Datum der Vertretung (Seite des Vertretenden): ärztliche Bescheinigung und begrenzte Dauer, ohne Norm —
     die Zahl hat die Entscheidung vom 22.09.2026 („Paragraphen raus“) bewusst aus diesem Satz genommen. */
const NV_PFLICHT = {
  gruppe: {
    DE: [/Bewusstlosigkeit oder Krankheit/, /sechs Monate/, /getrennt/, /ablehnen/, /bevollmächtigt/, /Betreuer/, /Vorsorgeregister/, /Keine Rechtsberatung/],
    EN: [/unconsciousness or illness/, /six months/, /living apart/, /refuse/, /authori[sz]ed/, /court-appointed representative/, /Central Register/, /Not legal advice/],
  },
  datum: {
    DE: [/ärztlichen Bescheinigung/, /begrenzte Zeit/],
    EN: [/medical certificate/, /limited time/],
  },
};
const NV_KENNUNG = { gruppe: 'advanceCare#spousal-representation.hint', datum: 'people.childrenAndDependants/validSince.hint' };

function nvVerstoesse(text, art, sprache) {
  const h = String(text || '');
  const v = NV_PFLICHT[art][sprache].filter((r) => !r.test(h)).map((r) => 'pflicht:' + r.source);
  if (art === 'datum' && /§|Section \d/.test(h)) v.push('norm-im-datum-hinweis');
  return v;
}

function nvHinweise(art) {
  const de = String(ladeKern().V.textLesen(NV_KENNUNG[art]) || '');
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8')).texte[NV_KENNUNG[art]];
  return { DE: de, EN: String(en || '') };
}

test('[Notvertretung·Wächter] der Hinweis nennt die Rechtslage nach § 1358 BGB vollständig, auch die bestellte Betreuung — DE und EN', () => {
  for (const art of ['gruppe', 'datum']) {
    const h = nvHinweise(art);
    for (const sprache of ['DE', 'EN']) {
      assert.ok(h[sprache].trim(), 'Vorbedingung: ' + art + ' ' + sprache + ' vorhanden');
      assert.deepEqual(nvVerstoesse(h[sprache], art, sprache), [], art + ' ' + sprache + ': ' + h[sprache]);
    }
  }
});

// Der Hinweis der Gruppe bis zum 30.10.2026, wörtlich: ohne die bestellte Betreuung.
const NV_GRUPPE_BIS_30_10 = {
  DE: 'Können Sie wegen Bewusstlosigkeit oder Krankheit in Gesundheitsfragen nicht selbst entscheiden, darf Ihr Ehegatte Sie darin bis zu sechs Monate vertreten, wenn Sie nicht getrennt leben. Das gilt nicht, wenn Sie eine solche Vertretung ablehnen oder jemanden für Gesundheitsfragen bevollmächtigt haben und die behandelnde Ärztin oder Ihr Ehegatte davon weiß. Damit eine Ablehnung gefunden wird, können Sie sie im Zentralen Vorsorgeregister eintragen lassen. Keine Rechtsberatung. Fundstelle: § 1358 BGB, § 78a BNotO.',
  EN: 'If, due to unconsciousness or illness, you cannot make decisions on health matters yourself, your spouse may represent you in these matters for up to six months, provided you are not living apart. This does not apply if you refuse such representation or have authorised someone for health matters, and the treating doctor or your spouse knows of it. So that a refusal can be found, you can have it registered in the Central Register of Lasting Powers of Attorney (Zentrales Vorsorgeregister). Not legal advice. Source: Section 1358 German Civil Code (BGB), Section 78a Federal Notarial Code (BNotO).',
};
// Der Hinweis am Datum vor dem 22.09.2026, wörtlich: mit Norm und ohne Bescheinigung.
const NV_DATUM_VOR_22_09 = 'Bei einer Ehegattennotvertretung (§ 1358 BGB) das ärztlich festgestellte Datum — daraus wird der Ablauf berechnet.';

test('[Notvertretung·Wächter·Rot-Beweis] der Hinweis bis 30.10.2026 fällt genau an der fehlenden Betreuung', () => {
  for (const sprache of ['DE', 'EN']) {
    assert.deepEqual(nvVerstoesse(NV_GRUPPE_BIS_30_10[sprache], 'gruppe', sprache), ['pflicht:' + NV_PFLICHT.gruppe[sprache][5].source], sprache);
  }
});

test('[Notvertretung·Wächter·Rot-Beweis] der Datums-Hinweis von vor dem 22.09.2026 fällt: Norm im Satz, keine Bescheinigung, keine Dauer', () => {
  const v = nvVerstoesse(NV_DATUM_VOR_22_09, 'datum', 'DE');
  assert.ok(v.includes('norm-im-datum-hinweis'), v.join(', '));
  assert.ok(v.includes('pflicht:' + NV_PFLICHT.datum.DE[0].source), v.join(', '));
  assert.ok(v.includes('pflicht:' + NV_PFLICHT.datum.DE[1].source), v.join(', '));
});
