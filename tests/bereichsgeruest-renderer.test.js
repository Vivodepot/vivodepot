'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Bereichsgerüst v2 — der gemeinsame Renderer (bereichGeruestHTML)
   ────────────────────────────────────────────────────────────────────────
   Ein Bereich trägt seine Gruppen in BEREICH_GERUEST ein; der Renderer ordnet die sichtbaren Felder quer über die früheren
   Sektionen in Gruppen (A1–A3, B–F), mit Zwischentiteln, einem Zähler nur für sichtbare Felder, ⓘ mit Erklärtext, „Weitere
   Angaben“ zugeklappt, aufklappbaren Listeneinträgen (Eintrag vor Person), Fristzeilen in E und dem Chip „Keine“ an Listen.

   Abnahme: node --test tests/bereichsgeruest-renderer.test.js → 0 fail.
   Rot-Beweis (im Test selbst): dieselbe Prüfung gegen einen Kern, dessen Zähler auch unsichtbare Felder zählt, schlägt fehl.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const PW = 'bereichsgeruest-pw-1101';

// Die Deklaration verwendet vorhandene Textsatz-Kennungen als Stand-in für Titel und Erklärtexte; die Bereiche tragen ihre eigenen ein.
const DEKL = {
  gruppen: [
    { id: 'A1', titel: 'mehrLabel', abschnitte: [
      { zwischentitel: 'statuskarteLeer', felder: ['givenName', 'familyName'], weitere: ['secondLastName'] },
      { zwischentitel: 'statuskarteTeilweise', info: 'feldFehlerPflicht', felder: ['maritalStatus', 'maritalPropertyRegime', 'dateOfSeparation'] },
    ] },
    { id: 'A2', titel: 'mehrEingetragen', felder: ['formerNames', 'idDocuments'] },
    { id: 'D', felder: ['birthCertificateStorage'] },
    { id: 'E', abgeleitet: [{ feld: 'idDocuments', datum: 'validUntil', gegenstand: 'system' }] },
  ],
  info: { secondLastName: 'feldFehlerPflicht' },
  keine: ['formerNames'],
  listen: { idDocuments: { titel: 'system', kern: ['documentNumber'], weitere: ['issuedOn'] } },
};

const TEMP_ORDNER = [];
after(() => { for (const o of TEMP_ORDNER) fs.rmSync(o, { recursive: true, force: true }); });
function kernMitGeruest(mutation) {
  let html = fs.readFileSync(KERN, 'utf8');
  const marke = 'const BEREICH_GERUEST = Object.freeze({});';
  assert.equal(html.split(marke).length, 2, 'die Registerzeile steht genau einmal');
  html = html.replace(marke, 'const BEREICH_GERUEST = Object.freeze({ identity: ' + JSON.stringify(DEKL) + ' });');
  if (mutation) html = mutation(html);
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-geruest-'));
  TEMP_ORDNER.push(ordner);
  const pfad = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(pfad, html);
  return pfad;
}
async function frisch(pfad) {
  const k = ladeKern({ htmlPfad: pfad, backen: true, zusatzBindungen: ['bereicheAlle'] });
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  k.V.betreteApp();
  return k;
}
const inhalt = (k) => { k.V.oeffneSektor('identity'); return k.document.getElementById('content').innerHTML; };
const zaehler = (html, gruppe) => {
  const m = new RegExp('data-geruest-gruppe="' + gruppe + '"[\\s\\S]*?<span class="geruest-zaehler"[^>]*>(\\d+)</span>').exec(html);
  return m ? Number(m[1]) : null;
};

test('[Gerüst] Gruppen in fester Reihenfolge, erste offen, Festtitel, leere Gruppe entfällt, Rest unter „Weiteres“', async () => {
  const k = await frisch(kernMitGeruest());
  const html = inhalt(k);
  const reihenfolge = [...html.matchAll(/data-geruest-gruppe="([A-Z0-9]+)"/g)].map((m) => m[1]);
  assert.deepEqual(reihenfolge, ['A1', 'A2', 'D', 'E', 'W'].filter((g) => g !== 'E'), 'E ohne Datum entfällt, nicht genannte Felder stehen unter „Weiteres“ (W)');
  assert.match(html, /data-geruest-gruppe="A1" open/, 'die erste Gruppe ist offen');
  assert.doesNotMatch(html, /data-geruest-gruppe="A2" open/, 'die übrigen sind zu');
  assert.ok(html.includes('>' + k.V.STRINGS.geruestTitelD + '</span>'), 'D trägt den Festtitel');
  assert.ok(html.includes('class="geruest"'), 'der Renderer hat seine Klasse');
  assert.ok(!html.includes('class="sektion-titel"'), 'die früheren Sektionstitel entfallen');
});

test('[Gerüst] der Zähler zählt nur sichtbare Felder (sichtbarWenn)', async () => {
  const k = await frisch(kernMitGeruest());
  assert.equal(zaehler(inhalt(k), 'A1'), 4, 'Vorname, Nachname, Zweiter Nachname, Familienstand; Güterstand und Trennungsdatum sind verborgen');
  k.V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  assert.equal(zaehler(inhalt(k), 'A1'), 5, 'verheiratet zeigt den Güterstand');
  k.V.sektorFeldSetzen('identity', 'maritalStatus', 'geschieden');
  assert.equal(zaehler(inhalt(k), 'A1'), 5, 'geschieden zeigt das Trennungsdatum statt des Güterstands');
});

test('[Gerüst] Rot-Beweis: ein Zähler, der auch verborgene Felder zählt, fällt durch dieselbe Prüfung', async () => {
  const kaputt = kernMitGeruest((h) => {
    const alt = '.filter((feld) => feld.id !== fotoId && feldSichtbar(feld, sektorDaten, bereichFelder(sektorId)) && _feldImRuhendenBereichAngeboten(sektorId, feld, sektorDaten))';
    assert.ok(h.includes(alt), 'die Stelle der Sichtbarkeitsprüfung ist auffindbar');
    return h.replace(alt, '.filter((feld) => feld.id !== fotoId)');
  });
  const k = await frisch(kaputt);
  assert.notEqual(zaehler(inhalt(k), 'A1'), 4, 'der kaputte Zähler zählt Verborgenes mit');
});

test('[Gerüst] Zwischentitel, ⓘ mit Erklärtext, „Weitere Angaben“ zugeklappt', async () => {
  const k = await frisch(kernMitGeruest());
  const html = inhalt(k);
  assert.equal([...html.matchAll(/<h3 class="geruest-zwischentitel">/g)].length, 2, 'zwei Zwischentitel');
  const knopf = /<button type="button" class="geruest-info" data-geruest-info="(gi-\d+)" aria-expanded="false" aria-controls="\1"/.exec(html);
  assert.ok(knopf, 'ein ⓘ-Knopf am Feld, verknüpft mit seinem Text');
  assert.ok(html.includes('<p class="geruest-info-text" id="' + knopf[1] + '" hidden>'), 'der Erklärtext ist zu');
  assert.ok(html.includes(k.V.STRINGS.geruestWeitereAngaben), '„Weitere Angaben“ steht da');
  assert.match(html, /<details class="geruest-weitere"><summary>/, 'Fachdetail ist zugeklappt');
  assert.ok(html.indexOf('data-feld="secondLastName"') > html.indexOf('class="geruest-weitere"'), 'der Zweite Nachname steht hinter „Weitere Angaben“');
});

test('[Gerüst] Chip „Keine“ an der Liste: setzen, zurücknehmen, mit Eintrag entfällt er', async () => {
  const k = await frisch(kernMitGeruest());
  let html = inhalt(k);
  assert.ok(html.includes('data-ausdruecklich-keine-setzen="identity.formerNames"'), 'der Chip steht an der leeren Liste');
  assert.ok(!html.includes('ausdruecklich-keine-zeile'), 'die ältere Zeile steht nicht daneben');
  k.V.ausdruecklichKeineSetzen('identity', 'formerNames', true);
  html = inhalt(k);
  assert.match(html, /geruest-chip geruest-chip--an" aria-pressed="true"/, 'gesetzt ist der Chip an');
  assert.ok(html.includes('data-ausdruecklich-keine-zuruecknehmen="identity.formerNames"'));
  k.V.ausdruecklichKeineSetzen('identity', 'formerNames', false);
  k.V.listenEintragHinzufuegen('identity', 'formerNames', { name: 'Meier' });
  assert.ok(!inhalt(k).includes('data-ausdruecklich-keine-setzen="identity.formerNames"'), 'mit Eintrag gibt es keinen Chip');
  assert.throws(() => k.V.ausdruecklichKeineSetzen('identity', 'formerNames', true), /befüllt/);
});

test('[Gerüst] Listeneinträge klappen auf: Eintrag vor Person, Fachdetail zugeklappt, Knöpfe bleiben', async () => {
  const k = await frisch(kernMitGeruest());
  k.V.listenEintragHinzufuegen('identity', 'idDocuments', { system: 'Personalausweis', documentNumber: 'L01X', issuedOn: '2020-01-02', validUntil: '2030-01-01' });
  k.V.listenEintragHinzufuegen('identity', 'idDocuments', { system: 'Reisepass', documentNumber: 'C02Y' });
  const html = inhalt(k);
  assert.equal([...html.matchAll(/<details class="geruest-eintrag">/g)].length, 2, 'zwei aufklappbare Einträge');
  assert.ok(html.indexOf('geruest-eintrag-titel">Personalausweis') > 0, 'der Titel des Eintrags steht in der Kopfzeile');
  assert.ok(html.includes('data-eintrag-bearbeiten="0"') && html.includes('data-eintrag-entfernen="1"'), 'Bearbeiten und Entfernen bleiben dieselben Knöpfe');
  assert.match(html, /<li class="geruest-eintrag-punkt" data-eintrag="0"/, 'der Eintrag behält sein data-eintrag');
  assert.match(html, /<details class="geruest-weitere"><summary>[^<]*<\/summary><div class="geruest-eintrag-zeile">/, 'Fachdetail im Eintrag ist zu');
});

test('[Gerüst] E zeigt abgeleitete Fristzeilen „Gegenstand · Art Datum“ und ist ohne Datum leer', async () => {
  const k = await frisch(kernMitGeruest());
  assert.ok(!inhalt(k).includes('data-geruest-gruppe="E"'), 'ohne Datum keine Gruppe');
  k.V.listenEintragHinzufuegen('identity', 'idDocuments', { system: 'Personalausweis', validUntil: '2030-01-05' });
  const html = inhalt(k);
  assert.match(html, /data-geruest-gruppe="E"/);
  assert.match(html, /<span class="geruest-frist-text">Personalausweis · [^<]+<\/span><span class="geruest-frist-datum">05\.01\.2030<\/span>/);
  assert.ok(html.includes('data-geruest-gehe-zu="idDocuments"'), 'die Zeile führt zum Feld ihres Gegenstands');
});

test('[Gerüst] D legt Dokumente als Karten ins Raster', async () => {
  const k = await frisch(kernMitGeruest());
  assert.match(inhalt(k), /<div class="geruest-dokumente"><div class="geruest-dokument"><div class="feld-zeile/);
});

test('[Gerüst] die Prüfung der Deklaration nennt Verstöße gegen die Gerüst-Regeln', () => {
  const { V } = ladeKern({});
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.deepEqual(V.geruestDeklarationPruefen({ gruppen: [{ id: 'A1', titel: 't', felder: ['a'] }, { id: 'B', felder: ['b'] }, { id: 'F', felder: ['c'] }] }, ids), []);
  const meldung = (g) => V.geruestDeklarationPruefen({ gruppen: g }, ids).join('|');
  assert.match(meldung([{ id: 'B', felder: ['a'] }, { id: 'D', felder: ['a'] }]), /feld-doppelt/);
  assert.match(meldung([{ id: 'D', felder: ['a'] }, { id: 'B', felder: ['b'] }]), /reihenfolge/);
  assert.match(meldung([{ id: 'E', felder: ['a'] }]), /e-ohne-eingabefelder/);
  assert.match(meldung([{ id: 'F', felder: ['a', 'b'] }]), /f-nicht-genau-ein-feld/);
  assert.match(meldung([{ id: 'A1', titel: 't' }, { id: 'A2', titel: 't' }, { id: 'A3', titel: 't' }, { id: 'A3', titel: 't' }]), /reihenfolge|zu-viele/);
  assert.match(meldung([{ id: 'B', felder: ['zz'] }]), /feld-unbekannt/);
  assert.match(meldung([{ id: 'E', abgeleitet: [{ feld: 'a' }] }]), /e-feld-ohne-heimat/);
  assert.match(meldung([{ id: 'X' }]), /gruppe-unbekannt/);
});

test('[Gerüst] das Register ist leer, solange kein Bereich eine Deklaration trägt; Bereiche ohne Eintrag rendern wie bisher', async () => {
  const { V, document } = await (async () => { const k = ladeKern({ zusatzBindungen: ['bereicheAlle'] }); await k.V.depotAnlegen(PW); k.V.akteurSelbstErklaeren('T'); k.V.betreteApp(); return k; })();
  assert.deepEqual(Object.keys(V.BEREICH_GERUEST), []);
  V.oeffneSektor('identity');
  assert.ok(!document.getElementById('content').innerHTML.includes('class="geruest"'));
});
