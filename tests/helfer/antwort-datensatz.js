'use strict';
/* Der Datensatz einer Antwort-JWE, wie Lese-App oder Studio ihn lesen (U2-ADR-449, U2-ADR-501).
   Seit dem Umlegen von ANTWORT_SIGNIEREN (v931) trägt die JWE einen signierten JWS (`cty` `JWT`); dann geht der Weg über die
   Signaturprüfung der App selbst (antwortSignaturPruefen, ohne gebundene Kennung, Vorgang aus dem geschützten Kopf). Sonst ist der
   Inhalt der Datensatz als JSON, wie vor dem Wagen. Proben, die das Verschlüsseln prüfen, lesen so dasselbe wie vorher. */
async function datensatzAusJwe(app, jwe, schluessel) {
  const offen = await app.antwortJweOeffnen(jwe, schluessel);
  if (typeof offen.kopf.cty === 'string' && offen.kopf.cty.toLowerCase() === 'jwt') {
    const erg = await app.antwortSignaturPruefen(offen.klartext, { anbieterId: '', vorgang: String(offen.kopf.vorgang || '') });
    return JSON.parse(JSON.stringify(erg.datensatz));   // aus dem Kontext der App in gewöhnliche Objekte (deepStrictEqual vergleicht Prototypen)
  }
  return JSON.parse(offen.klartext);
}
module.exports = { datensatzAusJwe };
