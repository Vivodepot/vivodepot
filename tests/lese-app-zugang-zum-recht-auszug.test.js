'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Beratungshilfe-Auszug kommt in der LESE-APP an — U2-ADR-326
   ────────────────────────────────────────────────────────────────────────────
   Spiegel von tests/a528-lese-app-logikmodul-erbschein.test.js, auf den zweiten
   Zweck derselben Template-Familie angewandt. Der Punkt ist NICHT, dass dieses
   eine Bündel funktioniert — sondern dass der Weg der Lese-App generisch ist:
   `logikModulAbschnitteHTML(sektorId)` rendert JEDES eingelassene Logikmodul
   des Sektors, ohne eine Kennung im Code. Behauptet war das schon; hier ist es
   an einem zweiten, unabhängigen Bündel gemessen.

   „Ein Template, das nur im Kern sichtbar ist, erfüllt den Posten nicht."

   DIE SENSIBEL-PROBE IST DIE WICHTIGERE: der Auszug führt Einkommen, Unterhalt,
   Gegenseite und frühere Beratung — genau die Angaben, die eine Stelle sieht und
   sonst niemand. Die Lese-App muss sie zurückhalten wie jeder andere Weg.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen } = require('./load-lesen.js');

const BUNDLE = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'zugang-zum-recht-beratungshilfe-logikmodul.json'), 'utf8'));

function basisDepot(extra) {
  return Object.assign({ schemaVersion: 80, menschen: [], urheberschaft: {}, mappe: [],
    sektoren: {}, feldDefinitionen: [], sensibelFelder: {}, logikModule: [] }, extra || {});
}

test('[U2-ADR-326] der Beratungshilfe-Auszug rendert in der Lese-App im Zielsektor (assets)', () => {
  const { V } = ladeLesen();
  V.setData(basisDepot({
    logikModule: [BUNDLE],
    sektoren: { assets: { livingSituation: 'alleine', numberOfPeopleInTheHome: '3' } },
  }));
  const html = V.sektorHTML('assets');
  assert.match(html, /Beratungshilfe/, 'der Bündel-Titel muss im Sektor auftauchen');
  assert.match(html, /Wie viele Personen leben in der Wohnung\?/, 'eine Frage aus dem Bündel muss erscheinen');
  assert.match(html, /3/, 'der nicht-sensible Wert muss erscheinen');
});

test('[U2-ADR-326] unbeantwortete Fragen zeigen die Bündel-eigene Lücke, nicht "undefined"', () => {
  const { V } = ladeLesen();
  V.setData(basisDepot({ logikModule: [BUNDLE], sektoren: { assets: {}, administration: {} } }));
  const html = V.sektorHTML('assets');
  assert.match(html, /— nicht erfasst —/);
  assert.doesNotMatch(html, /undefined/);
});

/* ── U2-ADR-330 — Teil 0, die Person ────────────────────────────────────────
   GEMESSEN, NICHT ANGENOMMEN: die sechs Personen-Angaben (Vorname, Nachname, Geburtsdatum,
   Anschrift, Telefon, E-Mail) sind im Schema NICHT `sensibel: true` — nur `geburtsname` ist es,
   und der gehört nicht zu den Antragsangaben. Sie brauchen darum KEIN `sensibelErlaubt` im
   Bündel: die Erlaubnis ist eine Aussage des Moduls über sich selbst, und wo nichts Sensibles
   gelesen wird, wäre sie eine falsche Aussage.

   DIE RÜCKHALTUNG HAT TROTZDEM EINEN GEGENSTAND, nur einen anderen: die BÜRGERIN kann jedes Feld
   selbst als sensibel markieren (`data.sensibelFelder`). Genau das prüfen die zwei Proben unten,
   in beide Richtungen — die markierte Angabe verschwindet, die übrigen bleiben VOLLSTÄNDIG
   stehen. Eine Rückhaltung, die nebenbei die Nachbarn mitnimmt, wäre so falsch wie keine. */
test('[U2-ADR-330] Teil 0 führt die Personen-Angaben, die das Depot ohnehin hat', () => {
  const { V } = ladeLesen();
  V.setData(basisDepot({
    logikModule: [BUNDLE],
    sektoren: {
      identity: { givenName: 'Elisabeth', familyName: 'Wredenhagen', secondLastName: 'Sonnenschein',
        birthDate: '1958-03-14', streetAddress: 'Lindenweg 4', postcodeCity: '80331 München',
        telephone: '0171 2345678', email: 'elisabeth@beispielpost.example' },
      assets: {},
    },
  }));
  const html = V.sektorHTML('assets');
  assert.match(html, /Vorname\?/, 'die Frage aus Teil 0 muss erscheinen');
  assert.match(html, /Elisabeth/);
  assert.match(html, /Wredenhagen Sonnenschein/, 'beide Nachnamen über `verbinden`, mit Leerzeichen');
  assert.match(html, /Lindenweg 4, 80331 München/, 'Anschrift über `verbinden`, wie beim Erbschein-Lebensmittelpunkt');
  assert.match(html, /0171 2345678/);
});

test('[U2-ADR-330·Rot-Beweis] eine von der Bürgerin als sensibel markierte Angabe verschwindet — und NUR sie', () => {
  const { V } = ladeLesen();
  const sektoren = {
    identity: { givenName: 'Elisabeth', familyName: 'GEHEIM-NACHNAME', birthDate: '1958-03-14',
      streetAddress: 'Lindenweg 4', postcodeCity: '80331 München', telephone: '0171 2345678' },
    assets: {},
  };
  V.setData(basisDepot({ logikModule: [BUNDLE], sektoren: sektoren,
    sensibelFelder: { identity: { familyName: true } } }));
  const html = V.sektorHTML('assets');
  assert.equal(html.indexOf('GEHEIM-NACHNAME'), -1,
    'die Bürgerin hat den Nachnamen als sensibel markiert — der Auszug darf ihn nicht führen');
  // Die andere Richtung, und sie ist die wichtigere: eine Rückhaltung, die die Nachbarn
  // mitnimmt, wäre so falsch wie keine.
  for (const bleibt of ['Elisabeth', '1958-03-14', 'Lindenweg 4, 80331 München', '0171 2345678']) {
    assert.ok(html.indexOf(bleibt) >= 0,
      'die übrigen Angaben müssen vollständig stehenbleiben — fehlt "' + bleibt + '", hält die Probe '
      + 'zu viel zurück und der Auszug wäre auf ein Feld verkürzt');
  }
});

test('[U2-ADR-326·Sicherheit·Rot-Beweis] die sensiblen Angaben des Auszugs werden in der Lese-App zurückgehalten', () => {
  const { V } = ladeLesen();
  V.setData(basisDepot({
    logikModule: [BUNDLE],
    sektoren: {
      assets: { yourOwnIncomeNetMonthly: 'GEHEIM-EINKOMMEN', maintenanceObligations: 'GEHEIM-UNTERHALT',
        incomeOfOtherPeopleInThe: 'GEHEIM-HAUSHALT', monthlyCommitments: 'GEHEIM-BELASTUNG' },
      administration: { ongoingAdministrativeCases: [{ authority: 'Amtsgericht', typeOfCase: 'Beratungshilfe',
        opposingParty: 'GEHEIM-GEGENSEITE', alreadyAdvisedBy: 'GEHEIM-BERATUNG' }] },
    },
  }));
  const html = V.sektorHTML('assets');
  for (const geheim of ['GEHEIM-EINKOMMEN', 'GEHEIM-UNTERHALT', 'GEHEIM-HAUSHALT', 'GEHEIM-BELASTUNG',
    'GEHEIM-GEGENSEITE', 'GEHEIM-BERATUNG']) {
    assert.equal(html.indexOf(geheim), -1,
      geheim + ' ist schema-sensibel und darf über das Bündel nicht offengelegt werden');
  }
  assert.match(html, /— nicht erfasst —/, 'die Fragen bleiben sichtbar, aber mit der Lücke statt des sensiblen Werts');
});
