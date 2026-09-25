'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vor-depot-sprachschalter.test.js — Rot-Beweis für den Vor-Depot-
   Sprachschalter (27.08.2026, „Bürgersatz englisch andocken",
   Strang 4)
   ────────────────────────────────────────────────────────────────────────────
   BEFUND (Produktentscheidung, gegengeprüft): der Textsatz-Modul-Mechanismus lebt IM
   Depot — `renderWelcome()`/`renderCryptoOverlay()` laufen aber, BEVOR
   irgendein Depot existiert. Diese Proben halten fest, dass ein reiner
   Laufzeit-Schalter (kein localStorage, wie Kontrast/Nachtmodus) genau die
   Handvoll Kennungen auf beiden Vor-Depot-Bildschirmen umschaltet — UND dass
   er NICHT in ein bereits geladenes, ECHTES Depot hineinwirkt (die eigentliche
   Gefahr eines geteilten Schalters).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Vor-Depot-Schalter] Standard ist Deutsch — kein Depot, keine Umschaltung, kein localStorage', () => {
  const { V } = ladeKern();
  assert.equal(V.vorDepotText('welcomeWeiter'), V.STRINGS.welcomeWeiter, 'ohne Umschalten liefert vorDepotText denselben (deutschen) Text wie STRINGS');
});

test('[Vor-Depot-Schalter·Rot] renderWelcome() zeigt nach dem Umschalten Englisch, und zurück wieder Deutsch', () => {
  const { V, document } = ladeKern();
  V.renderWelcome();
  const vorher = document.getElementById('overlay-inhalt').innerHTML;
  assert.match(vorher, />English</, 'Standard: Umschalt-Knopf bietet "English" an (aktuell Deutsch)');
  assert.doesNotMatch(vorher, /Your digital depot/);

  V.vorDepotSpracheUmschalten();
  V.renderWelcome();
  const danach = document.getElementById('overlay-inhalt').innerHTML;
  // "vault" → "depot" (01.09.2026, U2-ADR-195): die Produktentscheidung kehrte die Wortwahl um —
  // "depot, wenn es in der jeweiligen Sprache funktioniert". PRE_DEPOT_EN trägt seither
  // "depot", diese Probe folgt dem echten Bestand statt einer überholten Fassung.
  assert.match(danach, /Your digital depot — offline, encrypted, in your hands\./);
  assert.match(danach, />Deutsch</, 'Umschalt-Knopf bietet jetzt "Deutsch" an (aktuell Englisch)');

  V.vorDepotSpracheUmschalten();
  V.renderWelcome();
  const wieder = document.getElementById('overlay-inhalt').innerHTML;
  assert.doesNotMatch(wieder, /Your digital depot/, 'der Rückweg gibt den eingebauten deutschen Text frei');
});

test('[Vor-Depot-Schalter] renderCryptoOverlay() schaltet mit derselben Schalter-Variable', () => {
  const { V, document } = ladeKern();
  V.vorDepotSpracheUmschalten();
  V.renderCryptoOverlay();
  const html = document.getElementById('overlay-inhalt').innerHTML;
  assert.match(html, /Enter the password for your depot/);
  V.vorDepotSpracheUmschalten();
});

test('[Vor-Depot-Schalter] vorDepotText() zeigt für unbekannte Schlüssel die eigene Kennung, nie Deutsch', () => {
  // U2-ADR-363 (Zug 2, 07.09.2026): PRE_DEPOT_EN ist entfernt — der Schalter erzwingt seither
  // die 'en'-Registry-Sprache direkt (s. _vorDepotTextEnErzwingen). Ein Schlüssel außerhalb der
  // Ab-Werk-Vordepot-Teilmenge (24 Kennungen) zeigt darum die Kennung selbst, NICHT mehr den
  // deutschen STRINGS-Text — genau der stille Rückfall, den dieser Umbau entfernt.
  /* WIEDER GÜLTIG seit S1 (20.09.2026, U2-ADR-426; die Umkehr vom 16.09. — „die Saat trägt jetzt jede
     Kennung" — war die Prämisse von U2-ADR-416 Entscheidung 5, die abgelöst ist): das Gerüst trägt nur die
     Vor-Depot-Teilmenge. `kreiseAbschnitt` liegt außerhalb und zeigt darum die Kennung selbst, weiterhin nie Deutsch. */
  const { V } = ladeKern();
  V.vorDepotSpracheUmschalten();
  const angezeigt = V.vorDepotText('kreiseAbschnitt');
  assert.notEqual(angezeigt, V.TEXTSATZ_DE_QUELLE.texte['strings:kreiseAbschnitt.text'], 'nie Deutsch');
  assert.equal(angezeigt, 'strings:kreiseAbschnitt.text', 'die Kennung selbst');
  assert.equal(V.vorDepotText('gibtEsInKeinerSprache'), 'strings:gibtEsInKeinerSprache.text',
    'unbekannt in jeder Sprache — die Kennung selbst');
  V.vorDepotSpracheUmschalten();
});

test('[Vor-Depot-Schalter·Gegenprobe] der Schalter wirkt NICHT in ein bereits geladenes echtes Depot hinein', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('vor-depot-schalter-echtes-depot-pw');
  // Das echte Depot ist deutsch (kein Modul angedockt). Steht der Vor-Depot-Schalter noch auf
  // 'en' (z. B. von der Willkommensseite übrig), darf das die Kernel-STRINGS-Kennung NICHT auf
  // Englisch umschalten — nur der eigene, im Kern fest hinterlegte Vor-Depot-Ersatz (vorDepotText)
  // greift ein, STRINGS selbst bleibt allein am Depot-Textsatz hängen.
  V.vorDepotSpracheUmschalten();
  assert.equal(V.vorDepotText('welcomeWeiter'), 'What would you like to do?', 'Testvoraussetzung: Schalter steht auf Englisch');
  assert.equal(V.STRINGS.geoeffnet, 'Depot entschlüsselt und geöffnet.',
    'STRINGS bleibt am Depot-Textsatz hängen, nicht am Vor-Depot-Schalter');
  V.vorDepotSpracheUmschalten();
});

/* U2-ADR-208 (02.09.2026) — dieser Schalter lief nie durch textsatzRegeln()/
   textsatzSprachkennungAnwenden() (eigener, depotloser Zustand `_vorDepotSprache`) und blieb
   darum von dessen Fix unberührt: `document.documentElement.lang` folgte ihm nirgends. Eine
   Vorleserin bekäme die deutsche Aussprache für englischen Willkommenstext (WCAG 3.1.1). */
test('[Vor-Depot-Schalter·U2-ADR-208] document.documentElement.lang folgt dem Umschalter', () => {
  const { V, document } = ladeKern();

  V.vorDepotSpracheUmschalten();
  assert.equal(document.documentElement.lang, 'en');

  V.vorDepotSpracheUmschalten();
  assert.equal(document.documentElement.lang, 'de', 'der Rückweg gilt auch hier');
});
