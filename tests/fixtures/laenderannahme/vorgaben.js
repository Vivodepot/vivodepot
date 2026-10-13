// Fixture für tools/laenderannahme-pruefen.js — erfundene Stellen, kein Produktcode.
const land = String(form.land || 'Deutschland');           // land-vorgabe
const blatt = { rechtsraum: 'DE', rechtsraumName: L('Deutschland', 'Germany') };  // rechtsraum-vorgabe + land-vorgabe
const FORMEN = ['e.V.', 'GmbH', 'AG'];                       // rechtsform-liste
/* nicht gezählt: Kommentar mit || 'Deutschland' und rechtsraum: 'DE' */
const grundlage = 'z. B. § 630f BGB';                        // Normzitat: eigene Prüfung, hier nicht gezählt
const sdjwt = { address: { country_code: 'DE' } };           // country_code: eigene Prüfung, hier nicht gezählt
