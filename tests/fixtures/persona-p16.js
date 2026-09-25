'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P16 — Die Anwältin mit Kanzlei- und Privatdepot
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel Nacht 21./22.08.2026, Strang C4: „Zwei Dateien, eingehängt,
   getrennte Passwörter. **Was sieht der Abwickler im Ernstfall, und was nicht?**"

   DER ERNSTFALL IST GESETZLICH GEREGELT. Stirbt eine Rechtsanwältin, bestellt
   die Rechtsanwaltskammer einen Abwickler (§ 55 BRAO). Er führt die schwebenden
   Sachen zu Ende, hat Zugang zu den Handakten — und hat KEIN Recht auf die
   privaten Unterlagen der Verstorbenen. Das ist der Prüfstein: die Trennung
   muss halten, wenn niemand mehr da ist, der sie erklärt.

   WAS DIESE PERSONA MISST, ist nicht ob Vivodepot das regelt — es regelt nichts
   Rechtliches —, sondern **was der Abwickler technisch in der Hand hat, wenn er
   die Datei bekommt.** Und die Antwort hängt daran, WELCHE Datei er bekommt.

   DIE VIER LAGEN werden einzeln gemessen, nicht zusammen beurteilt:
     1 · Er bekommt den ANKER und das Anker-Passwort.
     2 · Er bekommt den ANKER, aber nur das SUB-Passwort.
     3 · Er bekommt die Blackbox des Sub-Depots und das Sub-Passwort.
     4 · Er bekommt die Blackbox, aber nur das Anker-Passwort.

   WAS SIE BRICHT, IST HIER NICHT REPARIERT — so beauftragt.

   ERFUNDEN: alle Personen, Orte, Mandate und Daten. Kein Mandantenname dieser
   Fixture bezeichnet einen wirklichen Menschen.
   ════════════════════════════════════════════════════════════════════════════ */
const ID = 'P16';
const TITEL = 'Die Anwältin mit Kanzlei- und Privatdepot';
const PASSWORT_PRIVAT = 'p16-privat-koeln-2026';
const PASSWORT_KANZLEI = 'p16-kanzlei-handakten-2026';

const MENSCHEN = Object.freeze([
  { schluessel: 'mann', name: 'Jonas Reventlow', beziehung: 'Ehemann' },
  { schluessel: 'sozia', name: 'Dr. Hanna Beck', beziehung: 'Sozia in der Kanzlei' },
  { schluessel: 'kammer', name: 'Rechtsanwaltskammer Köln', beziehung: 'Kammer' },
]);

const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'DAS SUB-DEPOT IST DIE KANZLEI, UND DAS IST EIN BEHELF. `verwaltungsTyp` kennt drei Werte, '
  + 'und jeder beschreibt eine Beziehung zu EINER PERSON (`eigen`, `delegiert`, `verwaltet`). '
  + 'Eine Kanzlei ist keine Person. Der Behelf trägt technisch — die Trennung hält —, aber '
  + 'nichts im Depot sagt, dass hier eine BERUFLICHE und keine vertretene Person liegt. '
  + 'SCHICHT 3, und derselbe Befund wie A474 (die GbR).',
  'DER ABWICKLER HAT KEINE ROLLE. Der Kern kennt Bevollmächtigte, Betreuer und '
  + 'Vertrauenspersonen; einen Abwickler nach § 55 BRAO kennt er nicht — und der ist etwas '
  + 'anderes: er wird von der Kammer bestellt, nicht von der Anwältin benannt, und seine '
  + 'Befugnis entsteht mit ihrem Tod. SCHICHT 3.',
  'DIE KANZLEI-BEZEICHNUNG STEHT IM KLARTEXT. `bezeichnung` und `inhaberin` liegen VOR dem '
  + 'Sub-Passwort — das ist eine bewusste Entscheidung (D36: die Auswahlliste muss lesbar '
  + 'sein). Für ein Sub-Depot einer Person ist das richtig. Für eine Kanzlei heisst es: wer '
  + 'den Anker öffnet, weiss, dass es eine Kanzlei gibt und wie sie heisst. KERN — und keine '
  + 'Lücke, sondern eine Entscheidung, die für diesen Fall anders ausfallen könnte.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT_PRIVAT);
  V.akteurSelbstErklaeren('Dr. Marlene Reventlow');
  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };

  /* DAS PRIVATDEPOT — das, was den Abwickler NICHTS angeht. */
  setze('identity', {
    givenName: 'Marlene',
    familyName: 'Reventlow',
    birthDate: '1968-04-22',
    nationality: 'deutsch',
    streetAddress: 'Aachener Straße 233',
    postcodeCity: '50931 Köln',
    maritalStatus: 'verh',
  });
  setze('personal', {
    whatElseIWantToSayWhatElse: 'Brief an Jonas, im Schreibtisch links. Nicht vor der Beerdigung.',
  });

  /* DAS KANZLEIDEPOT — eingehängt, eigenes Passwort. */
  const eintrag = await V.subDepotAnlegen({
    bezeichnung: 'Kanzlei Reventlow & Beck — Handakten',
    inhaberin: 'Kanzlei Reventlow & Beck',
    verwaltungsTyp: 'verwaltet',
  }, PASSWORT_KANZLEI);

  await V.subDepotVertrauenOeffnen(eintrag.depotUUID, PASSWORT_KANZLEI);
  V.subKontextBetreten(eintrag.depotUUID);
  setze('identity', {
    furtherDetails: [
      'Handakten-Ablage: Regal 3, Kanzlei; digital im Kanzleisystem (advoware).',
      'Schwebende Mandate zum Stichtag: 14.',
      'Fristenkalender: geführt von Frau Özdemir, Zugang über das Kanzleisystem.',
      'Mandate ohne Rückfrage NICHT übernehmbar: 3 (Vermerk in der jeweiligen Handakte).',
    ].join('\n'),
  });
  /* `subKontextVerlassen` ist ASYNC und versiegelt die Bearbeitung zurück in den
     Umschlag. Ohne `await` bleibt `data` auf dem Sub stehen, und alles darunter
     misst das Kanzleidepot statt des Privatdepots — der erste Bau dieser Fixture
     lief genau so, und fünf von sieben Proben wurden rot, ohne dass am Gegenstand
     etwas fehlte. */
  await V.subKontextVerlassen();

  return { p, subUUID: eintrag.depotUUID, subEintrag: eintrag };
}

function pruefungen(assert) {
  return [
    { name: 'Positivkontrolle — beide Depots stehen, und beide tragen ihren Inhalt',
      fn: async (V, ctx) => {
        const d = V.getData();
        assert.equal(d.sektoren.identity.givenName, 'Marlene', 'das Privatdepot trägt');
        assert.equal((d.verwalteteDepots || []).length, 1, 'genau ein eingehängtes Depot');
        await V.subDepotVertrauenOeffnen(ctx.subUUID, PASSWORT_KANZLEI);
        V.subKontextBetreten(ctx.subUUID);
        assert.match(String(V.getData().sektoren.identity.furtherDetails || ''), /Handakten-Ablage/,
          'das Kanzleidepot trägt seinen Inhalt');
        await V.subKontextVerlassen();
      } },

    { name: 'LAGE 1 — Anker plus Anker-Passwort: der Abwickler sieht das PRIVATLEBEN, nicht die Akten',
      fn: (V) => {
        /* Und das ist die unangenehme Antwort. Wer das Anker-Passwort hat, sieht
           alles Private im Klartext — und die Handakten NICHT, weil sie hinter
           dem zweiten Passwort liegen. Genau verkehrt herum zu dem, was § 55 BRAO
           will: der Abwickler soll die Akten führen und das Private nicht sehen. */
        const d = V.getData();
        assert.match(String(d.sektoren.personal.whatElseIWantToSayWhatElse || ''), /Brief an Jonas/,
          'das Private liegt offen');
        const eintrag = d.verwalteteDepots[0];
        assert.ok(eintrag.umschlag, 'das Kanzleidepot liegt versiegelt daneben');
        assert.equal(eintrag.inhalt, undefined, '… und sein Inhalt ist nicht lesbar');
      } },

    { name: 'LAGE 2 — Anker, aber nur das SUB-Passwort: der Anker öffnet gar nicht',
      fn: async (V, ctx) => {
        /* Das ist die Lage, die der Kammer eigentlich zusteht — und sie ist
           technisch unmöglich: das Sub-Depot liegt IM Anker, und der Anker
           braucht sein eigenes Passwort. Der Abwickler kommt an die Akten nur
           über die Datei, in der auch das Private liegt. */
        let fehler = null;
        try { await V.subDepotVertrauenOeffnen(ctx.subUUID, PASSWORT_PRIVAT); }
        catch (e) { fehler = e; }
        assert.ok(fehler, 'das falsche Passwort öffnet das Sub-Depot NICHT');
      } },

    { name: 'LAGE 3 — die Blackbox plus Sub-Passwort: genau das, was der Abwickler braucht',
      fn: (V, ctx) => {
        /* DIE GUTE NACHRICHT, und sie ist die Antwort auf die Frage des
           Laufzettels: der Weg EXISTIERT. `subDepotBlackboxExportieren` gibt die
           versiegelte Kanzleidatei allein heraus — ohne ein Byte des Privaten. */
        const datei = V.subDepotBlackboxExportieren(ctx.subUUID);
        assert.ok(datei, 'die Blackbox entsteht');
        const roh = typeof datei === 'string' ? datei : JSON.stringify(datei);
        assert.ok(!roh.includes('Brief an Jonas'), 'kein privater Inhalt in der Blackbox');
        assert.ok(!roh.includes('Marlene'), 'auch kein privater Name in der Blackbox');
      } },

    { name: 'LAGE 4 — die Blackbox, aber nur das Anker-Passwort: sie bleibt zu',
      fn: (V, ctx) => {
        /* Die Gegenprobe zu Lage 3. Ohne sie hiesse „die Blackbox trägt nichts
           Privates" womöglich nur, dass sie überhaupt nichts trägt. */
        const datei = V.subDepotBlackboxExportieren(ctx.subUUID);
        const roh = typeof datei === 'string' ? datei : JSON.stringify(datei);
        assert.ok(roh.length > 100, 'die Blackbox hat Inhalt — sie ist nicht leer');
        assert.ok(!roh.includes('Handakten-Ablage'),
          'und der Inhalt ist VERSIEGELT: auch der Kanzlei-Klartext steht nicht drin');
      } },

    { name: 'DER BEHELF: `verwaltungsTyp` beschreibt eine PERSON, und hier steht eine Kanzlei',
      fn: (V) => {
        const eintrag = V.getData().verwalteteDepots[0];
        assert.equal(eintrag.verwaltungsTyp, 'verwaltet');
        assert.equal(eintrag.inhaberin, 'Kanzlei Reventlow & Beck',
          'die Kanzlei steht im Feld für eine Inhaberin — der Behelf trägt, und nichts sagt, '
          + 'dass es keine Person ist');
      } },

    { name: 'Gegenprobe — die Kanzlei-Bezeichnung steht VOR dem Sub-Passwort im Klartext',
      fn: (V) => {
        /* Keine Lücke, sondern eine Entscheidung (D36: die Auswahlliste muss vor
           dem Sub-Passwort lesbar sein). Für eine vertretene Person ist sie
           richtig. Für eine Kanzlei heisst sie: wer den Anker öffnet, weiss, dass
           es eine Kanzlei gibt und wie sie heisst. Das gehört gemessen und vorgelegt, nicht stillschweigend geändert. */
        const eintrag = V.getData().verwalteteDepots[0];
        assert.equal(eintrag.bezeichnung, 'Kanzlei Reventlow & Beck — Handakten');
        assert.equal(eintrag.vertretungsGrundlage, undefined,
          'die Vertretungsgrundlage liegt seit E1 HINTER dem Passwort — die Bezeichnung nicht');
      } },
  ];
}

module.exports = { ID, TITEL, PASSWORT: PASSWORT_PRIVAT, PASSWORT_KANZLEI,
  baueDepot, pruefungen, UNTERLAGEN_OHNE_FELD, MENSCHEN };
