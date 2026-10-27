'use strict';
/* Konfiguration der Pod-Brücke (Nachtrag zu U2-ADR-512, Stufe 2). herkuenfte: die Herkünfte der Anwendung. Ihre Übergabe lässt
   die Brücke als „Vivodepot“ bestätigen. Außer ihnen nimmt sie nur 'null' an (vom Stick, aber ebenso jede sandbox- oder
   data:-Seite), dann mit dem Satz „ohne erkennbare Herkunft“ und einer Warnung; jede andere Herkunft verwirft sie. */
self.VD_POD_KONFIG = Object.freeze({
  herkuenfte: Object.freeze(['https://privat-de.vivodepot.org', 'https://privat-en.vivodepot.org', 'https://pro-de.vivodepot.org', 'https://pro-en.vivodepot.org'])
});
