'use strict';
/* echte-faecher.js — welche Fach-Einträge einer Depot-Datei echte Fächer sind (U2-ADR-520 Nr. 3, 04.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Seit den Attrappen-Fächern trägt jede Datei ein Vielfaches von vier Fach-Einträgen; ohne Schlüssel sind echte und
   Attrappen gleich. Proben, die zählen, ob ein Fach geschrieben wird, fragen darum mit den Fach-Schlüsseln K
   (`fachKeyRoh`), die die Inhaberin im Depot hält: ein Eintrag ist echt, wenn sein `geheim` unter einem K und der AAD
   seiner Kennung aufgeht. Eine Attrappe geht unter keinem K auf. */
async function echteFaecher(V, umschlag, schluesselRoh) {
  const keys = [];
  for (const roh of schluesselRoh.filter(Boolean)) keys.push(await V._fachSchluesselAusRoh(roh));
  const echte = [];
  for (const e of umschlag.umschlagTabelle.slice(1)) {
    for (const key of keys) {
      try {
        await V.VdCrypto.decryptDepot(e.geheim, key, V.VdCrypto.aadEinheit(umschlag.depotUUID, e.kennung));
        echte.push(e.kennung);
        break;
      } catch (_) { /* nicht dieses K */ }
    }
  }
  return echte;
}
/* Die K aller Kreise im Depot, die eines tragen. */
const kreisSchluessel = (V) => (V.getData().empfaengerkreise || []).map((k) => k.fachKeyRoh).filter(Boolean);
/* Zahl der echten Fächer mit den K des Depots selbst. */
async function echteFachZahl(V, umschlag, weitere) {
  return (await echteFaecher(V, umschlag, kreisSchluessel(V).concat(weitere || []))).length;
}
module.exports = { echteFaecher, echteFachZahl, kreisSchluessel };
