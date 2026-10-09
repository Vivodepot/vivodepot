'use strict';
/* Die Vollbild-Overlays des Kerns (Kennungen auf „-overlay“), die der Durchklick in aufraeumen() schließt (05.10.2026).
   Eigene Datei, damit die Klassenprobe sie lesen kann, ohne das Durchklick-Werkzeug samt seiner Browser-Helfer zu laden:
   das Werkzeug lädt beim Start einen Helfer, der nur drinnen liegt, und die Probe fiel öffentlich schon beim Laden. */
const VOLLBILD_OVERLAYS = Object.freeze(['pv-dok-overlay', 'hilfe-overlay', 'notfallblatt-overlay']);
module.exports = { VOLLBILD_OVERLAYS };
