'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Depot-Bogen am Stück — einhängen, führen, aushängen, wieder für sich
   ────────────────────────────────────────────────────────────────────────
   WAS EIN SUB-DEPOT IST (Produktentscheidung, 03.09.2026): „jedes Depot
   ist unendlich mobil und kann ein- und ausgehängt werden und jede Rolle
   annehmen." Ein Depot ist keine SORTE, sondern ein Ding; Ein- und Aushängen
   ist eine BEZIEHUNG, keine Bauform. Geburt, Volljährigkeit, Betreuung,
   Vollmacht, Erbfall und die Bürgerdepots im Pro-Depot einer Notarin sind
   darum nicht sechs Fälle, sondern einer in sechs Rollen (Gerüst-Konzept,
   Beschluss vom 21.08.2026: „Depots ineinander einhängbar, auch unter
   Vollmacht und Vertretung").

   DARUM PRÜFT DIESE DATEI DIE BEZIEHUNG, NICHT DIE GESCHICHTE. Die Fixture
   darf einen Fall erzählen — die Zusicherungen nennen „führende Seite" und
   „geführtes Depot", nicht Eltern und Kind. Wer später den Notariatsfall
   prüfen will, braucht keine zweite Datei; er braucht eine Zeile in der
   Rollen-Tabelle unten.

   DIE GEMESSENE LÜCKE (Zug 0, 03.09.2026). Die Bausteine sind vollständig da
   und einzeln geprüft. Der DURCHGANG war es nicht: über alle Testdateien, je
   test()-Block und mit Helfern gerechnet, war die längste Kette VIER von zwölf
   Schritten, in sechs von 130 Blöcken. Die beiden E2E-Specs mit „durchgehend"
   im Namen berühren je genau EINEN Schritt.

   WAS DIESE DATEI NICHT IST. Sie ersetzt keine der bestehenden Einzelproben —
   was `einhaengen`, `aushaeng-akt`, `blackbox-export`, `sub-kontext` und
   `sub-depot-selbstbestimmung` je für sich zusichern, bleibt dort. Hier steht
   die REIHENFOLGE, und sie steht an EINER Stelle: bricht der Bogen, sagt eine
   Meldung an welcher Station, statt drei Meldungen aus drei Zusammenhängen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const FUEHREND_PW = 'Fuehrend-Bogen-2026!';
const GEFUEHRT_PW = 'Gefuehrt-Bogen-2026!';
const EIGEN_PW    = 'Eigen-Bogen-2026!';
const ZWEIT_PW    = 'Zweit-Bogen-2026!';

/* Die Rollen, in denen derselbe Bogen laufen muss. Die Namen sind Fixture —
   geprüft wird, dass die BEZIEHUNG in allen dieselbe ist. Wer eine siebte
   Rolle hat, hängt eine Zeile an; die Zusicherungen bleiben unberührt.
   `grundlage` muss ein Schlüssel aus RECHTSGRUNDLAGEN_VERTRETUNG sein — ein
   unbekannter Wert fällt still auf null (Whitelist im Kern), und die Zeile
   prüfte dann heimlich einen anderen Fall als ihr Name behauptet. */
const ROLLEN = [
  { name: 'Kind unter elterlicher Sorge', typ: 'verwaltet', grundlage: 'elterliche_sorge' },
  { name: 'Vollmachtgeberin',             typ: 'delegiert', grundlage: 'vorsorge' },
  { name: 'Betreute Person',              typ: 'delegiert', grundlage: 'gesetzliche_betreuung' },
  { name: 'Mandantin im Pro-Depot',       typ: 'verwaltet', grundlage: null },
];

/* Ein Feldwert, der die Fahrt überlebt haben MUSS. Ohne ihn prüfte der
   Durchstich nur, dass keine Funktion wirft — nicht, dass etwas ankommt. */
const MARKE_FELD = 'furtherDetails';   // `notizen` gibt es im Modell nicht — die Marke landete bisher unter einem modellfremden Schlüssel
const MARKE_WERT = 'Unterlagen liegen im blauen Ordner (Bogen-Marke)';

function markeSetzen(V) {
  const sid = (V.SEKTOREN[0] && V.SEKTOREN[0].id) || null;
  assert.ok(sid, 'es gibt überhaupt einen Sektor — sonst kann die Marke nirgends stehen');
  V.sektorFeldSetzen(sid, MARKE_FELD, MARKE_WERT);
  return sid;
}

/* Der ganze Bogen, einmal, für EINE Rolle. Gibt zurück, was danach geprüft
   werden kann — und die Liste der gefahrenen Stationen, damit ein früher
   `return` auffällt statt still grün zu bleiben. */
async function bogenFahren(rolle) {
  const { V } = ladeKern();
  const gefahren = [];
  const station = async (name, fn) => { const r = await fn(); gefahren.push(name); return r; };

  /* ── I. Die führende Seite nimmt ein Depot in ihre Obhut ────────────── */
  await station('anlegen-fuehrend', () => V.depotAnlegen(FUEHREND_PW));
  await station('akteur', () => V.akteurSelbstErklaeren('Führende Person'));
  const gefuehrt = await station('sub-anlegen', () => V.subDepotAnlegen({
    bezeichnung: rolle.name, inhaberin: rolle.name,
    verwaltungsTyp: rolle.typ, vertretungsGrundlage: rolle.grundlage,
  }, GEFUEHRT_PW));

  assert.equal(V.subDepotNieBetreten(gefuehrt.depotUUID), true,
    'frisch angelegt ist NIE BETRETEN — der abgeleitete Zustand muss das sagen, bevor jemand hineingeht');

  /* ── II. Führen: befüllen im geführten Kontext ──────────────────────── */
  await station('vertrauen-oeffnen', () => V.subDepotVertrauenOeffnen(gefuehrt.depotUUID, GEFUEHRT_PW));
  await station('kontext-betreten', () => V.subKontextBetreten(gefuehrt.depotUUID));

  assert.equal(V.subDepotNieBetreten(gefuehrt.depotUUID), false,
    'nach dem ersten echten Betreten ist der Zustand umgeschlagen — sonst bliebe die Liste stumm');

  const sid = await station('marke-setzen', () => markeSetzen(V));
  await station('kontext-verlassen', () => V.subKontextVerlassen());

  /* ── III. Herausgeben ───────────────────────────────────────────────── */
  const datei = await station('blackbox-export', () => V.subDepotBlackboxExportieren(gefuehrt.depotUUID));
  await station('aushaengen-abgeben', () => V.subDepotAushaengen(
    gefuehrt.depotUUID, { empfaenger: rolle.name, absicht: 'abgeben' }));

  /* ── IV. Das Depot steht wieder für sich ─────────────────────────────
     Ohne Mitwirkung der führenden Seite: eigene Datei, eigenes Passwort. */
  const umschlag = await station('umschlag-aus-datei', () => V.umschlagAusDatei(datei));
  const auf = await station('entsiegeln', () => V.subDepotEntsiegeln(umschlag, GEFUEHRT_PW));

  const angekommen = ((auf.inhalt.sektoren || {})[sid] || {})[MARKE_FELD];
  assert.equal(angekommen, MARKE_WERT,
    'DIE MARKE IST ANGEKOMMEN. Was im geführten Kontext eingetragen wurde, steht in der\n' +
    'herausgegebenen Datei. Bricht diese Zeile, ist unterwegs eine Bearbeitung verloren\n' +
    'gegangen — und zwar lautlos: jede Einzelstation meldet dabei weiter Erfolg.');

  const eigen = await station('eigenes-passwort', () => V.subDepotEigenerPasswortWechsel(
    umschlag, GEFUEHRT_PW, EIGEN_PW));

  /* U2-ADR-123 „Reichweite": der Umschlag in der Liste der führenden Person
     bleibt unverändert und mit dem alten Passwort lesbar. Das ist KEIN Mangel
     und kein Fund — es ist kryptographisch unvermeidbar, sobald jemand die
     Bytes besitzt, und als Grenze beschlossen. Der Test hält beide Hälften,
     damit niemand die unbequeme später für einen Defekt hält. */
  await station('alte-kopie-bleibt-lesbar', () => V.subDepotEntsiegeln(umschlag, GEFUEHRT_PW));
  await station('neue-kopie-mit-eigen-pw', () => V.subDepotEntsiegeln(eigen, EIGEN_PW));
  await assert.rejects(() => V.subDepotEntsiegeln(eigen, GEFUEHRT_PW), undefined,
    'das ALTE Passwort darf die NEUE Kopie nicht mehr öffnen — sonst wäre der Wechsel keiner');

  /* ── V. Und es lässt sich wieder einhängen — bei irgendwem ──────────── */
  await station('zweite-fuehrende-seite', () => V.depotAnlegen(ZWEIT_PW));
  await station('akteur-zweit', () => V.akteurSelbstErklaeren('Zweite führende Person'));
  const beiIhr = await station('einhaengen', () => V.subDepotEinhaengen(
    datei, { bezeichnung: rolle.name, inhaberin: rolle.name }));
  await station('aushaengen-beiseitelegen', () => V.subDepotAushaengen(beiIhr.depotUUID, { empfaenger: rolle.name }));
  await station('reaktivieren', () => V.subDepotReaktivieren(beiIhr.depotUUID));

  assert.equal(V.verwaltungAktiv(beiIhr), true,
    'nach dem Rettungspfad ist der Eintrag wieder AKTIV geführt — sonst wäre die\n' +
    'Wiederaufnahme eine Statusänderung ohne Wirkung');

  return { V, gefahren, gefuehrt, beiIhr, datei, sid };
}

test('[Bogen] der ganze Weg am Stück: aufnehmen → führen → herausgeben → eigenes Passwort → wieder einhängen', async () => {
  const { gefahren } = await bogenFahren(ROLLEN[0]);
  assert.equal(gefahren.length, 19,
    'NEUNZEHN Stationen sind gefahren, nicht weniger. Diese Zahl steht hier, damit ein\n' +
    'früher `return` oder ein weggefallener Abschnitt auffällt statt still grün zu bleiben.\n' +
    'Sie zählt die Aufrufe dieser Fahrt, nicht die Schritte des Kerns: `subDepotNeuVersiegeln`\n' +
    'läuft hier INNERHALB von subKontextVerlassen mit und hat eine eigene Datei\n' +
    '(sub-depot-neu-versiegeln.test.js).');
});

/* ── ROLLENNEUTRALITÄT — geprüft, nicht angenommen ────────────────────────
   Der Satz sagt „jede Rolle". Diese Tests fragen den Kern, ob das
   stimmt, statt es zu glauben. Gemessen am Code (Zug 1): von den zehn Funktionen
   des Bogens verzweigt KEINE auf ein Verhältnis. Die Treffer auf `art` sind
   durchweg die PROVENIENZ-Ereignisart ('betreten', 'eingehaengt', 'abgegeben',
   'blackbox-export'), nicht der Verhältnis-Typ. Und `pruefeBlackboxUmschlag`
   prüft ausschließlich Umschlag-Form und Krypto — sechs Felder, kryptoVersion,
   Salt- und IV-Längen. Kein Rollenfeld, keine Depot-Sorte, keine Herkunft. */

/* GEGENPROBE zur Rollenneutralität: dieselbe Zusicherung (Stationszahl) gegen VIER
   verschiedene Rollen gefahren — hält sie in allen, ist „unendlich mobil" ein
   gemessener Zustand und keine Annahme aus einem einzigen Fall. */
for (const rolle of ROLLEN) {
  test(`[Bogen·Rolle·Gegenprobe] derselbe Bogen trägt die Rolle „${rolle.name}"`, async () => {
    const { gefahren } = await bogenFahren(rolle);
    assert.equal(gefahren.length, 19,
      'Der Bogen läuft in dieser Rolle GENAUSO WEIT wie in jeder anderen. Bricht das hier,\n' +
      'ist die Mobilität nicht so unbedingt, wie der Satz sagt — dann gehört der Unterschied\n' +
      'benannt, nicht diese Zeile angepasst.');
  });
}

test('[Bogen·Rolle] es gibt keine Depot-SORTE: das Einhängen prüft Umschlag und Krypto, nichts sonst', () => {
  const { V } = ladeKern();
  /* Wenn hier je ein Rollen- oder Sortenfeld auftauchte, wäre ein Bürgerdepot im
     Pro-Depot einer Notarin nicht mehr derselbe Vorgang wie ein Kind-Depot bei den
     Eltern — und der Satz „jedes Depot ist unendlich mobil" hätte eine Ausnahme. */
  /* U2-ADR-235 (03.09.2026): die Versionsweiche steht jetzt VOR der Feldprüfung (Auflage 1) —
     ein Umschlag ohne kryptoVersion wirft darum zuerst wegen der Version, nicht wegen der
     Feldzahl. `kryptoVersion` gehört dazu, damit diese Zeile weiterhin den Sechs-Felder-Pfad
     prüft, nicht nur den vorgelagerten Versions-Gate. */
  assert.throws(() => V.pruefeBlackboxUmschlag({ kryptoVersion: 3, ct: 'x' }), /sechs Felder/,
    'die Prüfung nennt die sechs Umschlagfelder — und nur die');
  assert.throws(() => V.pruefeBlackboxUmschlag(null), /kein gültiger Umschlag/,
    'und weist Unsinn ab, statt ihn zu deuten');
});

/* ── ZWEI GEMESSENE GRENZEN — heutiger Stand, schriftlich ────────────────
   ZUG 0 hat sieben absichtlich falsche Aufrufe gefahren; FÜNF warfen (unbekannte
   UUID · reaktivieren nach Abgeben · zweites Aushängen · Export nach Archivierung ·
   unbekannte Absicht). ZWEI warfen NICHT, und das steht hier, damit die nächste
   Sitzung die Probe nicht für schärfer hält, als sie ist:

     (1) Aushängen OHNE vorheriges Einhängen geht. Richtig so — ein Depot wird
         aufgenommen ODER angelegt, und beides mündet in dieselbe Beziehung.
         Es war nur nirgends als Zusage geschrieben. Jetzt hier.

     (2) Aushängen eines NIE BETRETENEN Depots geht, ohne dass etwas darauf
         hinweist. `subDepotNieBetreten` existiert und ist sauber abgeleitet, aber
         sein einziger Aufrufer im Kern ist die Render-Zeile der geführten Liste
         (`data-nie-betreten`). Wer ein leeres, nie geöffnetes Depot abgibt, gibt
         eine leere Hülle heraus — einbahnig, ohne Rückweg.

   (2) IST KEIN DEFEKT, DEN DIESE DATEI REPARIERT. Ob die App dort etwas sagen
   soll, ist eine Produktfrage und lag am 03.09.2026 bei. GEMESSEN
   dazu (Zug 1): die naheliegende Sperre „nie betreten darf nicht ausgehängt
   werden" bricht auch den LEGITIMEN Weg — ein eingehängtes Depot ist bei der
   aufnehmenden Seite nie betreten worden und ließe sich nicht mehr weiterreichen.
   Wer die Sperre baut, braucht eine feinere Bedingung als die naheliegende. */
test('[Bogen·Grenze] Aushängen setzt weder Einhängen noch Betreten voraus — heutiger Stand, offene Produktfrage', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(FUEHREND_PW);
  V.akteurSelbstErklaeren('Führende Person');

  const nurAngelegt = await V.subDepotAnlegen(
    { bezeichnung: 'Nie geoeffnet', inhaberin: 'Wer auch immer', verwaltungsTyp: 'verwaltet' }, GEFUEHRT_PW);
  assert.equal(V.subDepotNieBetreten(nurAngelegt.depotUUID), true, 'Ausgangslage: nie betreten');

  const raus = V.subDepotAushaengen(nurAngelegt.depotUUID, { empfaenger: 'Wer auch immer', absicht: 'abgeben' });
  assert.equal(raus.status, 'abgegeben',
    'Ein nie betretenes, nie eingehängtes Depot lässt sich heute abgeben — ohne Hinweis.\n' +
    'Wird diese Zeile rot, hat jemand eine Vorkehrung eingebaut: dann gehört die Zusage hierher,\n' +
    'und der Kommentar über diesem Test ist überholt.');
  assert.equal(V.subDepotNieBetreten(nurAngelegt.depotUUID), true,
    'und es ist bis zuletzt nie betreten worden — der abgeleitete Zustand bleibt wahr');
});

/* ── DER EINE ORT, AN DEM DIE ROLLE NICHT MITWANDERT ──────────────────────
   GEMESSEN, Zug 1. `subDepotEinhaengen` setzt `verwaltungsTyp` HART auf
   'verwaltet' (die Zeile steht so im Kern). Im versiegelten Inhalt steht
   weiterhin der ursprüngliche Typ. Nach dem Einhängen sagen also zwei Orte
   Verschiedenes über dasselbe Depot: der Eintrag bei der aufnehmenden Seite
   'verwaltet', der Inhalt 'delegiert'.

   Das ist die EINZIGE Stelle, an der die Mobilität nicht vollständig ist —
   sie kostet keine Daten, aber sie kostet eine Aussage. Ob der Typ mitwandern
   soll oder ob 'verwaltet' beim Aufnehmen richtig ist (die aufnehmende Seite
   hat womöglich gar keine Vollmacht), ist eine Produktfrage, keine Reparatur.
   Der Test hält den heutigen Stand fest, damit die Frage nicht verschwindet. */
test('[Bogen·Rolle] beim Einhängen wird verwaltungsTyp neu gesetzt — der versiegelte Inhalt behält den alten', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(FUEHREND_PW);
  V.akteurSelbstErklaeren('Führende Person');
  const e = await V.subDepotAnlegen({
    bezeichnung: 'Wanderer', inhaberin: 'Wanderer',
    verwaltungsTyp: 'delegiert', vertretungsGrundlage: 'vorsorge',
  }, GEFUEHRT_PW);
  assert.equal(e.verwaltungsTyp, 'delegiert', 'Ausgangslage: delegiert');

  const datei = V.subDepotBlackboxExportieren(e.depotUUID);
  await V.depotAnlegen(ZWEIT_PW);
  V.akteurSelbstErklaeren('Zweite führende Person');
  const ein = V.subDepotEinhaengen(datei, { bezeichnung: 'Wanderer', inhaberin: 'Wanderer' });

  assert.equal(ein.verwaltungsTyp, 'verwaltet',
    'GEMESSENER STAND: das Einhängen setzt den Typ neu, es übernimmt ihn nicht.');
  const auf = await V.subDepotEntsiegeln(ein.umschlag, GEFUEHRT_PW);
  assert.equal(auf.inhalt.verwaltungsTyp, 'delegiert',
    'und der versiegelte Inhalt trägt weiter den ursprünglichen Typ — zwei Orte, eine Aussage,\n' +
    'zwei Antworten. Wird diese Zeile rot, ist die Frage entschieden worden; dann gehört die\n' +
    'Entscheidung hierher statt dieses Befundes.');
  /* POSITIVKONTROLLE zur Zusicherung oben (§3.5b): würde eine Bearbeitung beim Einhängen
     grundsätzlich verloren gehen, fiele auch DIESE Zeile — sie zeigt, dass die Probe
     einen echten Verlust sehen KANN, nicht nur den einen behaupteten Unterschied. */
  assert.equal(auf.inhalt.vertretungsGrundlage, 'vorsorge',
    'Die RECHTSGRUNDLAGE wandert dagegen mit — sie liegt seit E1 (20.08.2026) im versiegelten\n' +
    'Inhalt, nicht als Klartext am Eintrag. Genau darum überlebt sie den Wechsel der führenden Seite.');
});
