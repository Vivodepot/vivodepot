'use strict';
/* ═════════════════════════════════════════════════════════════════
   NOTFALL-KACHEL-STAND (26.11.2026, Befund an v1073 live)

   Die Kachel „Notfall“ der Übersicht sagte „aktuell · Stand heute“, auch wenn im Depot nur der Name stand: die Marke hing an
   keiner Bedingung. Jetzt misst die Kachel dieselben Kernangaben wie der Druck (notfallKernStand): mindestens ein Notfallkontakt
   mit Telefonnummer. Sind sie da, steht keine Marke, nur wann sie zuletzt geändert wurden; fehlt der Kontakt oder seine Nummer,
   nennt die Kachel das und führt dorthin.

   Proben:
   [Notfall·Stand·Name]    nur der Name → „Notfallkontakt fehlt“, Knopf zum Feld, keine „aktuell“-Marke.
   [Notfall·Stand·Nummer]  Kontakt ohne Nummer → Marke „Telefonnummer fehlt“, der Name in der Zeile darunter, Knopf öffnet die Person.
   [Notfall·Stand·Da]      Kontakt mit Nummer → keine Marke, kein Fehlt-Satz; der Kontakt als eigene Zeile, die Nummer bricht nicht um.
   [Notfall·Stand·Rot-Beweis] ein Kern, der die Kachel ohne Messung als erfüllt zeigt, fällt durch [Notfall·Stand·Name].
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'uebersicht-notfall-stand-pw-2026!';
async function depot(opts, kontakt) {
  const k = ladeKern(Object.assign({ backen: true }, opts || {}));
  await k.V.depotAnlegen(PW);
  const d = k.V.getData();
  d.sektoren.identity = { ...d.sektoren.identity, givenName: 'Maria', familyName: 'Mustermann' };
  if (kontakt) {
    d.menschen = [...(d.menschen || []), { id: 'p-anna', name: 'Anna Beispiel', tel: kontakt.tel || '' }];
    d.sektoren.health = { ...(d.sektoren.health || {}), emergencyContacts: [{ ref: 'p-anna' }] };
  }
  return k;
}
const notfallTeil = (h) => {
  const i = h.indexOf('data-uebersicht-notfall="1"');
  assert.ok(i >= 0, 'die Karte Notfall steht da');
  return h.slice(i, h.indexOf('</section>', i));
};

test('[Notfall·Stand·Name] nur der Name: die Kachel sagt, dass der Notfallkontakt fehlt', async () => {
  const { V } = await depot();
  assert.equal(V.notfallKernStand().zustand, 'kontaktFehlt');
  const t = notfallTeil(V._uebersichtHTML());
  assert.ok(t.includes(V.STRINGS.uebersichtNotfallKontaktFehlt), 'der Satz „Notfallkontakt fehlt“ steht da');
  assert.ok(t.includes('data-uebersicht-feld="health|emergencyContacts"'), 'der Knopf führt zum Feld Notfallkontakte');
  assert.ok(t.includes(V.STRINGS.uebersichtNotfallKontaktEintragen), 'der Knopf heißt „Notfallkontakt eintragen“');
  assert.ok(!/uebersicht-marke ok/.test(t), 'keine Marke in der ok-Farbe');
  assert.equal(V.STRINGS.uebersichtNotfallAktuell, undefined, 'der Schlüssel „aktuell“ ist an der Quelle entfernt');
});

test('[Notfall·Stand·Nummer] Kontakt ohne Nummer: die Kachel nennt die Person und öffnet sie', async () => {
  const { V } = await depot(null, { tel: '' });
  const s = V.notfallKernStand();
  assert.equal(s.zustand, 'nummerFehlt');
  const t = notfallTeil(V._uebersichtHTML());
  assert.ok(/uebersicht-marke warten">[^<]*<\/span>/.test(t) && t.includes('>' + V.STRINGS.notfallkarteTelFehltTitel + '</span>'), 'die Marke sagt nur „Telefonnummer fehlt“, ohne Namen');
  assert.ok(t.includes('data-notfall-kontakt="1">Anna Beispiel</div>'), 'der Name des Kontakts steht darunter in seiner Zeile');
  assert.ok(t.includes('data-uebersicht-notfall-person="p-anna"'), 'der Knopf öffnet die Person');
  assert.ok(t.includes(V.STRINGS.uebersichtNotfallNummerEintragen), 'der Knopf heißt „Nummer eintragen“');
});

test('[Notfall·Stand·Da] Kontakt mit Nummer: keine Marke, kein Fehlt-Satz', async () => {
  const { V } = await depot(null, { tel: '+49 30 1234567' });
  assert.equal(V.notfallKernStand().zustand, 'erfuellt');
  const t = notfallTeil(V._uebersichtHTML());
  assert.ok(!t.includes('uebersicht-marke'), 'keine Marke');
  assert.ok(!t.includes(V.STRINGS.uebersichtNotfallKontaktFehlt) && !t.includes('data-uebersicht-notfall-person'), 'kein Fehlt-Satz, kein Knopf dazu');
  assert.ok(t.includes('data-uebersicht-notfall-ansehen="1"'), '„Notfallkarte ansehen“ bleibt');
  assert.ok(t.includes('data-notfall-kontakt="1">Anna Beispiel · +49\u00a030\u00a01234567</div>'), 'der Kontakt steht als eigene Zeile, die Nummer mit festen Leerzeichen');
});

/* Rot-Beweis: eine Kachel, die ohne Messung „erfüllt“ zeigt (wie die Marke von vorher), fällt durch [Notfall·Stand·Name]. */
test('[Notfall·Stand·Rot-Beweis] ein Kern ohne Messung zeigt beim Depot mit nur dem Namen keinen Fehlt-Satz', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const neu = 'const stand = notfallKernStand();';
  assert.equal(quelle.split(neu).length, 2, 'Vorbedingung: der Anker steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notfall-stand-rot-'));
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, quelle.replace(neu, "const stand = { zustand: 'erfuellt', person: null, geaendert: '' };"));
  try {
    const { V } = await depot({ htmlPfad: datei });
    const t = notfallTeil(V._uebersichtHTML());
    assert.ok(!t.includes(V.STRINGS.uebersichtNotfallKontaktFehlt), 'ohne Messung fehlt der Satz — die Probe oben schlägt an');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
