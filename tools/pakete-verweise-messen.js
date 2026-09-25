'use strict';
/* Misst, ob die AUSGEHENDEN PAKETE des Kerns jeden Verweis ({ ref }) zusammen mit seinem Ziel tragen
   (Befund SUB-DEPOT-PERSONEN, 25.09.2026: ein Sub-Depot aus Bereichs-Bausteinen trug „bevollmächtigt: { ref }"
   ohne die Person, die Antwort an die Klinik sagte „nicht hinterlegt"). Ein Verweis zeigt auf eine Person
   (data.menschen), eine Institution (data.institutionen), einen Mappe-Eintrag (data.mappe) oder eine Bankvollmacht-
   Zeile (advanceCare.provisionInstruments); ein leerer ref ('' neben einem override) ist kein Verweis. Gemessen gegen das Referenzdepot (tools/rundlauf-matrix.js depotMitReferenz):
   jeder Empfänger-Baustein einzeln, alle zusammen, und der Angehörigen-Cache.
   Aufruf: node tools/pakete-verweise-messen.js [--json] — Exit 1, sobald ein Paket einen Verweis ohne Ziel trägt
   oder ein Ziel, auf das es nicht verweist. */
const path = require('node:path');

// Die vier Entitäten, auf die ein ref-Feld zeigen kann (feld.entitaet): person → data.menschen, institution →
// data.institutionen, mappe → data.mappe, bank-power-of-attorney → eine Zeile in advanceCare.provisionInstruments.
function verweisZiele(paket) {
  const mappe = Array.isArray(paket.mappe) ? paket.mappe : ((paket.mappe && Array.isArray(paket.mappe.eintraege)) ? paket.mappe.eintraege : []);
  const instrumente = ((paket.sektoren || {}).advanceCare || {}).provisionInstruments;
  return new Set([...(paket.menschen || []), ...(paket.institutionen || []), ...mappe, ...(Array.isArray(instrumente) ? instrumente : [])]
    .map((x) => x && x.id).filter(Boolean));
}
function verweiseOhneZiel(paket) {
  const ziele = verweisZiele(paket);
  const verweise = [], offen = [];
  (function lauf(x, pfad) {
    if (Array.isArray(x)) return x.forEach((y, i) => lauf(y, pfad + '[' + i + ']'));
    if (!x || typeof x !== 'object') return;
    if (typeof x.ref === 'string' && x.ref !== '') { verweise.push(pfad); if (!ziele.has(x.ref)) offen.push(pfad); }
    for (const [k, v] of Object.entries(x)) lauf(v, pfad ? pfad + '.' + k : k);
  })({ sektoren: paket.sektoren || {}, situationen: paket.situationen || {} }, '');
  return { verweise: verweise.length, offen };
}

// Die Gegenrichtung: ein Ziel, auf das im Paket nichts verweist, reist überzählig mit — außer das Paket
// führt die Liste selbst als Inhalt (das Register bei „Meine Menschen" auf einem Blatt, im Bereich Menschen
// oder im weiten Baustein; die Instrument-Liste, wenn das Paket die Vorsorge selbst trägt).
function ueberzaehlig(paket, eigen) {
  const ids = new Set();
  (function lauf(x) {
    if (Array.isArray(x)) return x.forEach(lauf);
    if (!x || typeof x !== 'object') return;
    if (typeof x.ref === 'string' && x.ref !== '') ids.add(x.ref);
    for (const v of Object.values(x)) lauf(v);
  })([paket.sektoren || {}, paket.situationen || {}]);
  const raus = [];
  const pruefe = (name, liste) => { for (const e of (Array.isArray(liste) ? liste : [])) if (e && e.id && !ids.has(e.id)) raus.push(name + ':' + e.id); };
  if (!eigen.register) pruefe('menschen', paket.menschen);
  if (!eigen.weit) { pruefe('institutionen', paket.institutionen); pruefe('mappe', paket.mappe); }
  if (!eigen.vorsorge) pruefe('provisionInstruments', ((paket.sektoren || {}).advanceCare || {}).provisionInstruments);
  return raus;
}

// Gemessen wird gegen den Anker: ein Verweis, der schon im Anker kein Ziel hat, ist ein anderer Befund (ein
// kaputtes Depot), nicht einer des Pakets. Offen ist, was im Anker auflöst und im Paket nicht mehr.
function paketeMessen(V) {
  const imAnker = new Set(verweiseOhneZiel(V.getData()).offen);
  const register = (q, f) => V.bereichFeldHatRolle(q, f, 'personenListe');
  const eigenVon = (ids) => {
    const bs = ids.map((id) => V.empfaengerBausteineAlle().find((b) => b.id === id)).filter(Boolean);
    const tripel = (b) => (b.bereich ? [] : V.empfaengerBausteinTripel(b.id));
    return {
      weit: bs.some((b) => b.weit),
      register: bs.some((b) => b.weit || (b.bereich && V.bereichRolle(b.bereich, 'personenListe') != null) || tripel(b).some((e) => register(e.quelle, e.feld))),
      vorsorge: bs.some((b) => b.weit || b.bereich === 'advanceCare' || tripel(b).some((e) => e.quelle === 'advanceCare')),
    };
  };
  const alle = V.empfaengerBausteineAlle().map((b) => b.id);
  const pakete = alle.map((id) => ({ paket: 'empfaenger:' + id, eigen: eigenVon([id]), inhalt: V.empfaengerZuschnittModell({ id: 'k', name: 'k', bausteine: [id] }) }));
  pakete.push({ paket: 'empfaenger:ALLE', eigen: eigenVon(alle), inhalt: V.empfaengerZuschnittModell({ id: 'k', name: 'k', bausteine: alle }) });
  const cacheTripel = [...V._ANG_CACHE_ERLAUBT].map((z) => z.split('|'));
  pakete.push({ paket: 'angehoerigen-cache', inhalt: V.angehoerigenCacheModell(), eigen: {
    weit: false, register: cacheTripel.some(([, q, f]) => register(q, f)), vorsorge: cacheTripel.some(([, q]) => q === 'advanceCare') } });
  return pakete.map(({ paket, inhalt, eigen }) => {
    const r = verweiseOhneZiel(inhalt);
    return { paket, verweise: r.verweise, offen: r.offen.filter((p) => !imAnker.has(p)), schonImAnker: r.offen.filter((p) => imAnker.has(p)),
      ueberzaehlig: ueberzaehlig(inhalt, eigen) };
  });
}

module.exports = { verweisZiele, verweiseOhneZiel, ueberzaehlig, paketeMessen };

if (require.main === module) {
  (async () => {
    const M = require(path.join(__dirname, 'rundlauf-matrix.js'));
    const V = await M.depotMitReferenz();
    const r = paketeMessen(V);
    if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
    else for (const z of r) {
      const rot = z.offen.length || z.ueberzaehlig.length;
      console.log((rot ? 'OFFEN ' : 'ok    ') + z.paket + ' — Verweise ' + z.verweise + ', ohne Ziel ' + z.offen.length + ', überzählig ' + z.ueberzaehlig.length
        + (rot ? ': ' + [...z.offen, ...z.ueberzaehlig].slice(0, 4).join(', ') + (z.offen.length + z.ueberzaehlig.length > 4 ? ' …' : '') : ''));
    }
    process.exitCode = r.some((z) => z.offen.length || z.ueberzaehlig.length) ? 1 : 0;
  })().catch((e) => { console.error(e); process.exitCode = 2; });
}
