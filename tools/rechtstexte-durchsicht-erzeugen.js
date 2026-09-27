#!/usr/bin/env node
'use strict';
/* Schreibt die Rechtstexte des Template-Generators (RECHTSTEXTE, Entwürfe) als eine Datei zur Durchsicht.
   Die Quelle bleibt der Generator: was hier steht, ist aus ihm gelesen, nicht abgeschrieben.
   Aufruf: node tools/rechtstexte-durchsicht-erzeugen.js --ziel PFAD.md
   Die Datei enthält bewusst keine spitzen Klammern (lesbar für die Durchsicht). */
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('../tests/load-generator.js');

function bloecke(liste) {
  const z = [];
  for (const b of Array.from(liste)) {
    if (typeof b === 'string') z.push(b, '');
    else if (b.h) z.push('**' + b.h + '**', '');
    else if (b.z) z.push('Zitat: „' + b.z + '“', 'Beleg: ' + b.beleg, '');
  }
  return z;
}

function erzeugen() {
  const { V } = ladeGenerator();
  const z = [];
  z.push('# Rechtstexte im Template-Generator — Entwürfe zur Durchsicht', '');
  z.push('Stand der Entwürfe: 19.09.2026. Quelle: RECHTSTEXTE in vivodepot-template-generator.html (diese Datei ist daraus erzeugt: node tools/rechtstexte-durchsicht-erzeugen.js). Änderungen gehören in den Generator; danach diese Datei neu erzeugen.', '');
  z.push('Jeder Text trägt im Werkzeug eine sichtbare Entwurfsmarke mit Kennung und Stand. Kein Text mit Marke geht in eine Auslieferung: tools/register-ausliefern.js bricht davor ab (Wächter tools/lib/entwurfsmarke.js, Proben in tests/rechtstexte-entwurf.test.js).', '');
  z.push('**Freigabe eines Textes:** im Generator entwurf auf false setzen, die Marke aus dem Wortlaut nehmen, Stand und Kennung hochzählen (RT-NAME-2). Vorher geht der Generator nicht ins Register.', '');
  z.push('Dies sind Entwürfe ohne Rechtsberatung. Wo ein amtlicher Wortlaut besteht, steht er als Zitat mit Beleg da; alles andere ist eigener Text im Sie-Ton und stützt sich auf Angaben, die im Projekt schon stehen.', '');
  z.push('---', '');
  for (const k of V.RECHT_REIHENFOLGE) {
    const r = V.RECHTSTEXTE[k];
    z.push('## ' + r.titel[0] + ' / ' + r.titel[1], '');
    z.push('Kennung: ' + r.kennung + ' · Stand: ' + r.stand + ' · Status: Entwurf', '');
    z.push('### Deutsch', '', ...bloecke(r.text[0]));
    z.push('### English', '', ...bloecke(r.text[1]));
    z.push('---', '');
  }
  z.push('## Offene Punkte für die Durchsicht', '');
  z.push(
    '1. Impressum: Die Angaben stammen aus dem Impressum der Website vivodepot.de (Fassung vom 14.09.2026: E-Mail info@, Telefon, Handelsregister, EUID, Umsatzsteuer-Nummer). Ein älterer, verworfener Entwurf nannte kontakt@; hier gilt die Website. Der Text nennt die Geschäftsführerin mit Namen, weil das Impressum die vertretungsberechtigte Person nennen muss und die Website es so tut. Bitte bestätigen. Vom Gesetz zitiert ist nur die Überschrift von § 5 DDG (Allgemeine Informationspflichten); den Wortlaut des Paragrafen gebe ich nicht wieder.',
    '2. Lizenz: Der Text nennt die EUPL-1.2 für den Generator. Die Lizenzpolitik im Repository (LICENSING.md, Stand 12.09.2026) beschreibt noch das Zwei-Schichten-Modell mit BUSL für die Vorlagenschicht; die Entscheidung vom 19.09.2026 (EUPL-1.2 für alles) ist dort noch nicht umgesetzt. Der Text stimmt mit beidem nur, wenn der Generator unter Schicht 1 fällt; das ist zu bestätigen, sobald die Lizenzumstellung gelandet ist. Die Zitate der Artikel 7 und 8 stammen von eupl.eu, abgerufen am 19.09.2026 (deutsche und englische Fassung); vor der Freigabe gegen den Volltext abgleichen. Zur Marke steht nur, dass die Unionsmarke angemeldet ist und die Eintragung aussteht.',
    '3. Nutzungsbedingungen: Der Satz, dass die gesetzlichen Haftungsregeln daneben unberührt bleiben, ist bewusst zurückhaltend gehalten. Ob es für ein kostenloses Werkzeug eigene Bedingungen mit Haftungsklauseln braucht, ist eine Frage für die Anwältin. Der Verweis auf den Ausschluss in Artikel 8 der EUPL steht unter dem Vorbehalt, dass zwingendes deutsches Recht weitergehend haften lässt.',
    '4. Einreichungsbedingungen: Sie geben wieder, was das Werkzeug heute schon sagt (Einreichung per E-Mail an register@vivodepot.de, Prüfung durch die Trust Authority, Zertifikat, einige Werktage, Rückmeldung bei Ablehnung, Konditionen direkt). Nicht festgelegt und darum nicht im Text: die Rechtsgrundlage der Datenverarbeitung, die Aufbewahrungs- und Löschfrist eingereichter Pakete, die Höhe oder Art der Konditionen. Wenn diese Punkte in die Bedingungen sollen, braucht es dazu eine Entscheidung.',
    '5. Datenschutz: Die Kurzfassung sagt, was das Werkzeug technisch tut (kein Netz, kein Speicher, keine Cookies) und verweist für die E-Mail-Einreichung auf die Datenschutzerklärung der Vivodepot GmbH auf vivodepot.de. Die vollständige Erklärung liegt dort; ob die Kurzfassung ausreicht, ist zu entscheiden.',
    '6. Ton: Alle Texte sind in Sie-Ton geschrieben, ohne Steigerungswörter; die englische Fassung ist eigenständig formuliert, nicht Wort für Wort übersetzt.',
    '');
  return z.join('\n');
}

function main() {
  const i = process.argv.indexOf('--ziel');
  const text = erzeugen();
  if (i < 0 || !process.argv[i + 1]) { process.stdout.write(text + '\n'); return; }
  const ziel = path.resolve(process.argv[i + 1]);
  fs.writeFileSync(ziel, text + '\n');
  console.log('geschrieben: ' + ziel + ' (' + text.length + ' Zeichen)');
}
if (require.main === module) main();
module.exports = { erzeugen };
