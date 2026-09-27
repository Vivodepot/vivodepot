'use strict';
/* Der deutsche Rechtsraum-Katalog des gebauten Produkts in der Form, die diese Proben seit jeher lesen
   ({ typ: { zweck, DE: { katalogVersion, wortlaut, formvorschriften, fristenVorrang } } }). Seit dem Gerüst-Schnitt S3 trägt das
   Gerüst ihn nicht mehr (AB_WERK_RECHTSRAUM_DE ist leer); er steht als Modul im Produkt und in der Registry
   (`getRechtsraumModulRegistry().DE`). Diese Funktion baut die alte Form aus der Registry zurück; sie erfindet keinen Wert. */
function katalogDe(V) {
  const fach = V.getRechtsraumModulRegistry().DE || {};
  const aus = {};
  for (const [typ, e] of Object.entries(fach)) {
    const eintrag = {};
    if (Array.isArray(e.zweck)) eintrag.zweck = e.zweck.slice();
    eintrag.DE = {
      katalogVersion: e.katalogVersion,
      wortlaut: e.wortlaut === undefined ? null : e.wortlaut,
      formvorschriften: e.formvorschriften === undefined ? null : e.formvorschriften,
      fristenVorrang: e.fristenVorrang === undefined ? null : e.fristenVorrang,
    };
    aus[typ] = eintrag;
  }
  return aus;
}

module.exports = { katalogDe };
