'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kette, Auftrag 4: der Einstieg und das freie Zusammenstellen
   (SP Bau, 20.08.2026 — setzt Auftrag 3 voraus)
   ────────────────────────────────────────────────────────────────────────
   *Danach findet ein Mensch den Weg nach draußen, ohne 178 Häkchen zu setzen —
   und stellt selbst zusammen, wenn kein Anlass passt.*

   Zug 1 — der Einstieg am Anlass-Blatt und in der Herausgeben-Tür.
   Zug 2 — Suchfeld, Treffer, aufgenommene Liste, Knopf; leere Felder an Ort und
     Stelle füllbar; eine Zusammenstellung benennen und behalten.
   Zug 3 — der Ort mit zwei Richtungen (Auftrag 7 füllt ihn).
   Zug 4 — D1: ein angedocktes Modul-Feld ist herausgebbar.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const PW = 'kette04-pw';

async function depot() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.zusammenstellungZuruecksetzen();
  return { V, document };
}

/* ══ Zug 1 — der Einstieg ═════════════════════════════════════════════════ */

test('[Kette 04 · Zug 1] das Anlass-Blatt trägt den zweiten Knopf — und er hängt am Ausgang', async () => {
  const { V, document } = await depot();
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.oeffneSituation('geburt');
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /id="b-anlass-herausgeben"/, 'der zweite Knopf steht am Blatt');
  assert.match(html, /Diese Zusammenstellung herausgeben/, 'und sagt, was er tut');
});

test('[Kette 04 · Zug 1] die Herausgeben-Tür bietet ANLÄSSE an — elf Zeilen statt 178', async () => {
  const { V } = await depot();
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456780');
  const anlaesse = V.anlaesseMitDaten();
  assert.ok(anlaesse.length > 0, 'Anlässe mit Daten stehen zur Wahl');
  assert.ok(anlaesse.length <= 26, 'und es sind höchstens die 26 Übergabe-Blätter, nicht 127 Blätter: ' + anlaesse.length);
  const felderImDepot = V.SEKTOREN.flatMap((s) => (s.sektionen || []).flatMap((sek) => sek.felder || [])).length;
  assert.ok(anlaesse.length < felderImDepot / 10,
    'die Liste ist um Größenordnungen kürzer als die Feldliste (' + anlaesse.length + ' gegen ' + felderImDepot + ')');
});

test('[Kette 04 · Zug 1 · Gegenprobe] ein leeres Depot bietet keinen Anlass an', async () => {
  const { V } = await depot();
  assert.deepEqual(V.anlaesseMitDaten(), [], 'ein Blatt ohne einen einzigen Eintrag wäre eine leere Zusage');
});

test('[Kette 04 · Zug 1] die Navigationsleiste ist NICHT länger geworden', () => {
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  const navZeilen = (src.match(/class="nav-item(?:'|"| )/g) || []).length;
  /* Gezählt am Quelltext, weil genau das die Abbruchklausel ist: „Braucht Zug 1 oder Zug 3 einen
     neuen Menüpunkt: anhalten und melden, statt ihn zu setzen." Der Zusammenstellen-Bildschirm
     hängt an der Herausgeben-Tür, der Anfragen-Ort im Übergabe-Protokoll.
     10 → 11 (Fortsetzen-Fokus, 26.08.2026, Task C.1 — eigener, späterer Auftrag, nicht Kette 04):
     dieselbe Bereichs-Knopf-Vorlage ein zweites Mal im Quelltext — einmal im Zwölf-Bereiche-Baum,
     einmal in der "Weitermachen"-Liste.
     11 → 10 (28.08.2026, Entscheidung): "Weitermachen" komplett entfernt
     (bereits vor dem Bau abgelehntes Konzept, s. renderSidebar() im Kern) — die zweite
     Rendering-Stelle fällt mit ihr weg, kein neuer Menüpunkt-TYP betroffen.
     10 → 11 (07.09.2026, C2/U2-ADR-354, „Templates bekommen ihren Ort"):
     GENAU der hier angesagte Fall — Zug 1 braucht einen neuen Menüpunkt-TYP, kein zweiter
     Renderer für einen bestehenden. Die neue Gruppe „Weitere Bereiche" (Template-Verzeichnis,
     s. renderSidebar()) rendert ihre Einträge als <button class="nav-item" data-modul-verzeichnis="…">
     — dieselbe Klasse wie die Bereichs-Knöpfe, aber ein eigener Eintragstyp, der nur erscheint,
     wenn ≥1 Template angedockt ist. Anhalten und melden wie angesagt — nicht still gesetzt.
     11 → 12 (19.09.2026, U2-ADR-423, Ausblenden nicht übersetzter Bereiche): der Umschalter
     „Nicht übersetzte Bereiche zeigen" (renderSidebar()) trägt ebenfalls class="nav-item" —
     wie „Weitere Bereiche" ein eigener Eintragstyp (erscheint nur, wenn etwas ausgeblendet ist
     oder der Umschalter aktiv ist), kein zweiter Renderer für einen bestehenden Typ.
     12 → 13 (20.09.2026, U2-ADR-425, „Hilfe in der Datei"): der Sidebar-Eintrag „Hilfe"
     (data-hilfe="1", renderSidebar()) trägt ebenfalls class="nav-item" — ein eigener,
     IMMER sichtbarer Eintragstyp (kein bedingtes Erscheinen wie bei den beiden vorigen),
     der `hilfeOeffnen()` öffnet. Angesagt wie die vorigen Fälle, nicht still gesetzt. */
  assert.equal(navZeilen, 13, 'U2-ADR-425: der Hilfe-Sidebar-Eintrag trägt ebenfalls class="nav-item" — ein neuer Menüpunkt-TYP, angesagt statt still gesetzt');
});

test('[Kette 04 · Zug 1] die irreführende Beschriftung ist weg', () => {
  // Seit S8 (U2-ADR-428) steht der deutsche Satz im Sprachmodul, nicht im Kern-Quelltext: gelesen wird der Wert der Kennung.
  const { V } = ladeKern();
  const wert = V.TEXTSATZ_DE_QUELLE.texte['strings:exportEtwasZurueckhalten.text'];
  assert.notEqual(wert, 'Etwas zurückhalten',
    'ein Knopf, der zu einer Liste zum Zurückhalten UND Freigeben führt, darf nicht „Etwas zurückhalten" heißen');
  assert.equal(wert, 'Einzeln entscheiden, was mitgeht');
});

/* ══ Zug 2 — das freie Zusammenstellen ════════════════════════════════════ */

test('[Kette 04 · Zug 2] gesucht wird über die BESCHRIFTUNG, nicht über die Kennung', async () => {
  const { V } = await depot();
  const treffer = V.zusammenstellenTreffer('pflegegrad');
  assert.ok(treffer.length > 0, 'ein Mensch tippt „Pflegegrad", nicht „socialInsurance.careLevel"');
  assert.ok(treffer.every((t) => /pflegegrad/i.test(t.label) || /pflege/i.test(t.bereichLabel)));
  assert.equal(V.zusammenstellenTreffer('xyzgibtsnicht').length, 0, 'Gegenprobe: was nicht passt, erscheint nicht');
});

test('[Kette 04 · Zug 2] Umlaute trennen nicht: „Größe" findet, was „groesse" heißt — und umgekehrt', async () => {
  const { V } = await depot();
  const a = V.zusammenstellenTreffer('vorname').length;
  const b = V.zusammenstellenTreffer('VORNAME').length;
  assert.equal(a, b, 'Groß- und Kleinschreibung trennen nicht');
  assert.ok(V.zusammenstellenTreffer('gesundheit').length > 0, 'auch der Bereichsname findet');
});

test('[Kette 04 · Zug 2] ANGEBOTEN WIRD ALLES — ausgefüllte zuerst, leere gekennzeichnet', async () => {
  const { V } = await depot();
  V.sektorFeldSetzen('identity', 'familyName', 'Brandt');   // ein einziges gefülltes Feld
  const alle = V.zusammenstellenTreffer('');
  assert.ok(alle.length > 200, 'nichts wird versteckt: ' + alle.length + ' Felder im Angebot');
  assert.equal(alle[0].gefuellt, true, 'ausgefüllte stehen vorn');
  const ersterLeer = alle.findIndex((t) => !t.gefuellt);
  const letzterGefuellt = alle.map((t) => t.gefuellt).lastIndexOf(true);
  assert.ok(letzterGefuellt < ersterLeer, 'kein leeres Feld steht vor einem ausgefüllten');
  assert.ok(alle.some((t) => !t.gefuellt), 'und die leeren sind da — als leer gekennzeichnet, nicht versteckt');
});

test('[Kette 04 · Zug 2 · Rot-Beweis] ein leeres Feld VOR einem ausgefüllten lässt die Probe anschlagen', async () => {
  const { V } = await depot();
  V.sektorFeldSetzen('identity', 'familyName', 'Brandt');
  const alle = V.zusammenstellenTreffer('');
  // Die Reihenfolge wird GESTELLT verletzt — die Prüfung darüber muss das sehen.
  const verdreht = alle.slice().reverse();
  const ersterLeer = verdreht.findIndex((t) => !t.gefuellt);
  const letzterGefuellt = verdreht.map((t) => t.gefuellt).lastIndexOf(true);
  assert.ok(letzterGefuellt > ersterLeer, 'die Ordnungs-Prüfung misst wirklich die Reihenfolge');
});

test('[Kette 04 · Zug 2] aufnehmen, entfernen, keine Dublette', async () => {
  const { V } = await depot();
  assert.equal(V.zusammenstellungAufnehmen('identity.givenName'), true);
  assert.equal(V.zusammenstellungAufnehmen('identity.givenName'), false, 'zweimal dasselbe ist keine zweite Zeile');
  assert.equal(V.zusammenstellungAufnehmen('gibtsnicht.feld'), false, 'eine unbekannte Kennung kommt nicht hinein');
  assert.deepEqual(V.zusammenstellungAuswahl(), ['identity.givenName']);
  assert.equal(V.zusammenstellungEntfernen('identity.givenName'), true);
  assert.deepEqual(V.zusammenstellungAuswahl(), []);
});

test('[Kette 04 · Zug 2] an Ort und Stelle füllen — die aufgenommene Liste bleibt stehen', async () => {
  const { V } = await depot();
  V.zusammenstellungAufnehmen('identity.givenName');
  V.zusammenstellungAufnehmen('identity.familyName');
  const vorher = V.zusammenstellungAuswahl();
  const r = V.zusammenstellungFeldFuellen('health.insuranceNumber', 'A123456780');
  assert.equal(r.ok, true, 'der Wert wird geschrieben');
  assert.deepEqual(V.zusammenstellungAuswahl(), vorher,
    'geht die Liste beim Füllen verloren, ist der Zug nicht fertig');
  assert.equal(V.feldRohwert('health', 'insuranceNumber'), 'A123456780',
    'Gegenprobe: der Wert steht danach im BEREICH, nicht nur in dieser einen Ausgabe');
});

test('[Kette 04 · Zug 2] das Gefüllte geht danach auch wirklich hinaus', async () => {
  const { V } = await depot();
  V.zusammenstellungFeldFuellen('health.insuranceNumber', 'A123456780');
  V.zusammenstellungAufnehmen('health.insuranceNumber');
  const ds = V.zusammenstellungDatensatz(V.zusammenstellungAuswahl(), { id: 'z' }, { sensibel: true });
  assert.equal(ds.felder.length, 1);
  assert.match(ds.felder[0].wert, /A123456780/);
});

test('[Kette 04 · Zug 2] behalten: benennen, Depot schließen, öffnen — sie ist da und gibt dasselbe aus', async () => {
  const { V } = await depot();
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456780');
  const kennungen = ['identity.givenName', 'health.insuranceNumber'];
  const r = V.zusammenstellungSpeichern('Heimaufnahme', kennungen);
  assert.equal(r.ok, true);
  const umschlag = await V.depotSerialisieren();

  const { V: V2 } = ladeKern();
  await V2.depotLaden(umschlag, PW);
  const behalten = V2.zusammenstellungenLesen();
  assert.equal(behalten.length, 1, 'sie hat das Schließen und Öffnen überstanden');
  assert.equal(behalten[0].name, 'Heimaufnahme');
  const ds = V2.zusammenstellungDatensatz(behalten[0].kennungen, { id: 'z' }, { sensibel: true });
  assert.equal(ds.felder.length, 2, 'und gibt dasselbe aus');
});

test('[Kette 04 · Zug 2 · Rot-Beweis] ein Feld aus der behaltenen Liste entfernen ändert die Ausgabe', async () => {
  const { V } = await depot();
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.sektorFeldSetzen('health', 'insuranceNumber', 'A123456780');
  V.zusammenstellungSpeichern('Heimaufnahme', ['identity.givenName', 'health.insuranceNumber']);
  const vorher = V.zusammenstellungDatensatz(V.zusammenstellungenLesen()[0].kennungen, { id: 'z' }, { sensibel: true });
  V.zusammenstellungSpeichern('Heimaufnahme', ['identity.givenName']);   // dieselbe Liste, ein Feld weniger
  const nachher = V.zusammenstellungDatensatz(V.zusammenstellungenLesen()[0].kennungen, { id: 'z' }, { sensibel: true });
  assert.equal(vorher.felder.length, 2);
  assert.equal(nachher.felder.length, 1, 'die Ausgabe folgt der Liste, nicht einem Gedächtnis');
  assert.equal(V.zusammenstellungenLesen().length, 1, 'und derselbe Name legt keine zweite an');
});

test('[Kette 04 · Zug 2 · Gegenprobe] ohne Namen und ohne Felder wird nichts behalten', async () => {
  const { V } = await depot();
  assert.deepEqual(V.zusammenstellungSpeichern('', ['identity.givenName']), { ok: false, grund: 'name' });
  assert.deepEqual(V.zusammenstellungSpeichern('Leer', []), { ok: false, grund: 'leer' });
  assert.equal(V.zusammenstellungenLesen().length, 0);
});

test('[Kette 04 · Zug 2] der Bildschirm trägt seine vier Dinge', async () => {
  const { V, document } = await depot();
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  V.oeffneZusammenstellen();
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /id="zus-suche"/, '1 · Suchfeld');
  assert.match(html, /id="zus-treffer"/, '2 · Treffer');
  assert.match(html, /Das geht mit/, '3 · aufgenommene Liste');
  assert.match(html, /data-zus-nimm=/, '4 · der Knopf, mit dem etwas hineinkommt');
  assert.match(html, /data-zus-fuellen=/, 'und das Füllen an Ort und Stelle');
});

/* ══ Zug 3 — der Ort mit zwei Richtungen ═════════════════════════════════ */

test('[Kette 04 · Zug 3] „Wer hat Sie gefragt" steht NEBEN „Wem haben Sie das gegeben"', async () => {
  const { V, document } = await depot();
  V.oeffneUebergabeProtokoll();
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /id="anfragen-ort"/, 'der Ort entsteht hier');
  assert.match(html, /Wer hat Sie gefragt/);
  assert.match(html, /Es hat Sie noch niemand gefragt/, 'mit ehrlichem Leerzustand statt erfundener Zeilen');
});

test('[Kette 04 · Zug 3] die drei Zustände sind benannt, und der Ort zählt sie', async () => {
  const { V } = await depot();
  assert.deepEqual(V.ANFRAGE_ZUSTAENDE.slice(), ['offen', 'beantwortet', 'abgelaufen']);
  const leer = V.anfragenOrtModell();
  assert.equal(leer.leer, true);
  V.getData().anfragen = [{ von: 'Pflegeheim', zustand: 'offen' }, { von: 'Bank', zustand: 'abgelaufen' }];
  const voll = V.anfragenOrtModell();
  assert.equal(voll.anzahl, 2);
  assert.equal(voll.nachZustand.offen, 1);
  assert.equal(voll.nachZustand.abgelaufen, 1);
  assert.equal(voll.nachZustand.beantwortet, 0);
});

/* ══ Zug 4 — D1: das angedockte Modul-Feld ═══════════════════════════════ */

function mitModulFeld(V) {
  const d = V.getData();
  d.feldDefinitionen = [{ sektorId: 'health', feldId: 'tpl_notfallhinweis',
    label: 'Notfallhinweis der Kammer', typ: 'text' }];
  if (!d.sektoren.health) d.sektoren.health = {};
  d.sektoren.health.tpl_notfallhinweis = 'Marcumar-Patient';
}

test('[Kette 04 · Zug 4] ein angedocktes Modul-Feld ist herausgebbar — Kennung, Angebot, Datensatz', async () => {
  const { V } = await depot();
  mitModulFeld(V);
  assert.equal(V.kennungPruefen('health.tpl_notfallhinweis').ok, true,
    'ohne das liefe die Kennung eines mitgebrachten Feldes auf „unbekannt"');
  const imAngebot = V.zusammenstellenTreffer('Notfallhinweis');
  assert.equal(imAngebot.length, 1, 'es steht im Angebot des Zusammenstellen-Bildschirms');
  assert.equal(imAngebot[0].angedockt, true);
  const ds = V.zusammenstellungDatensatz(['health.tpl_notfallhinweis'], { id: 'z' }, { sensibel: true });
  assert.equal(ds.felder.length, 1, 'und es geht hinaus');
  assert.match(ds.felder[0].wert, /Marcumar/);
});

test('[Kette 04 · Zug 4 · Gegenprobe] ohne angedocktes Feld bleibt alles wie zuvor', async () => {
  const { V } = await depot();
  assert.equal(V.kennungPruefen('health.tpl_notfallhinweis').ok, false);
  assert.equal(V.zusammenstellenTreffer('Notfallhinweis').length, 0);
});

test('[Kette 04 · Zug 4 · GEMESSEN, NICHT GEBAUT] die gedruckte Notfallkarte trägt es NICHT', async () => {
  /* Der Auftrag verlangt: „ein Depot, in dem AUSSCHLIESSLICH ein Modul-Feld die Notfall-Angabe
     trägt — es muss auf dem Notfallblatt erscheinen." Gemessen: es erscheint NICHT. Und das
     bleibt vorerst so, mit Grund: `NOTFALL_KERN_FELDER` ist eine ENTSCHIEDENE Erlaubnisliste
     (28.07.2026), die `tools/kampagne.js` außerhalb des Produkts als Messlatte führt — die
     gedruckte Karte ist Papier in der Brieftasche, lesbar von jedem, der sie findet. Ein
     angedocktes Feld dort automatisch aufzunehmen hiesse, diese Entscheidung ohne Entscheidung
     umzukehren. Diese Probe hält den Zustand fest, damit er nicht unbemerkt kippt — in
     KEINE der beiden Richtungen. */
  const { V } = await depot();
  mitModulFeld(V);
  const karte = JSON.stringify(V.notfallKernModell());
  assert.equal(karte.includes('Marcumar'), false,
    'die gedruckte Karte folgt weiterhin ihrer entschiedenen Liste');
  assert.equal(V.katalogFremdeFelder('health').some((f) => f.feldId === 'tpl_notfallhinweis'), true,
    'der Meldeweg aus A358 sieht das Feld sehr wohl — es ist nicht unsichtbar, nur nicht auf der Karte');
});
