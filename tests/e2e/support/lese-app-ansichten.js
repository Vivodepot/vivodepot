'use strict';
/* Die Ansichten der Lese-App, eine Liste für zwei Proben (LESE-KOPF-390, 03.11.2026):
   - tests/e2e/lese-app-ohne-querlauf.spec.js öffnet jede Ansicht bei 390, 360 und 320 px und misst, dass die Seite nicht breiter ist
     als das Fenster;
   - tests/lese-app-ansichten-vollstaendig.test.js verlangt, dass jede Funktion render…() aus vivodepot-lesen.html hier steht.
   Eine neue Ansicht ist damit erst fertig, wenn sie hier mit ihrem Aufruf steht und die Messung sie schmal findet.

   Ein Eintrag ist entweder ein Aufruf im Fenster der Lese-App (nach dem Öffnen einer echten Depot-Datei, `data` ist gesetzt)
   oder 'ablauf': die Ansicht entsteht im echten Ablauf der Probe (Datei wählen, Passwort, Depot-Ansicht mit allen Reitern). */
const ANSICHTEN = Object.freeze({
  renderWelcome: 'renderWelcome()',
  renderPasswort: 'ablauf',
  renderVollExport: 'ablauf',
  renderSituationOnly: 'renderSituationOnly(document.querySelector("[data-situation]") ? document.querySelector("[data-situation]").dataset.situation : "")',
  renderNotfall: 'renderNotfall()',
  renderQrPdf: 'renderQrPdf({ titel: "Selbstauskunft für den Notfall mit einem sehr langen Titel", stand: "2026-11-03", bereiche: [] })',
  renderQrBereich: 'renderQrBereich({ bereichLabel: "Vermögen und Einkommen", felder: [], stand: "2026-11-03" })',
  renderEinfuegen: 'renderEinfuegen()',
  renderAntwortOeffnen: 'renderAntwortOeffnen({ verfahren: "passwort" })',
  renderAntwort: 'renderAntwort({ anfrage: { titel: "Anfrage" }, antwort: {} }, null)',
  renderAnlass: 'renderAnlass({ anfrage: {} })',
  renderKamera: 'renderKamera()',
  renderHinweisMitZurueck: 'renderHinweisMitZurueck("Ein Hinweis.")',
  renderFehler: 'renderFehler("Diese Datei lässt sich nicht lesen.")',
  renderEmpfaengerQrPasswort: 'renderEmpfaengerQrPasswort("")',
});

/* Die Messung, im Fenster ausgeführt: die Seite ist nicht breiter als das Fenster, kein Teil des Kopfs ragt über den rechten
   Rand (das fängt auch einen Kopf, dessen Überstand ein overflow: hidden verdeckt), und die Teile des Kopfs — Titel, Link,
   Etikett, jeder Knopf — überlappen einander nicht (ein Text, der breiter ist als sein geschrumpfter Kasten). */
function querlaufMessen() {
  const d = document.documentElement;
  const aus = [];
  if (d.scrollWidth > d.clientWidth) aus.push('Seite ' + d.scrollWidth + ' px breit, Fenster ' + d.clientWidth + ' px');
  for (const e of document.querySelectorAll('.topbar, .topbar *')) {
    const r = e.getBoundingClientRect();
    if (r.width > 0 && r.right > d.clientWidth + 0.5) aus.push((e.id ? '#' + e.id : e.className || e.tagName) + ' endet bei ' + Math.round(r.right) + ' px');
  }
  const teile = [...document.querySelectorAll('.topbar > *:not(.tb-aktionen), .topbar .tb-aktionen > *')]
    .map((e) => {
      const r = document.createRange(); r.selectNodeContents(e);
      const k = e.getBoundingClientRect(); const t = r.getBoundingClientRect();
      return { name: e.id ? '#' + e.id : e.className || e.tagName, l: Math.min(k.left, t.left), r: Math.max(k.right, t.right), o: k.top, u: k.bottom, w: k.width };
    })
    .filter((x) => x.w > 0);
  for (let i = 0; i < teile.length; i++) {
    for (let j = i + 1; j < teile.length; j++) {
      const a = teile[i]; const b = teile[j];
      if (a.o < b.u && b.o < a.u && a.l < b.r - 0.5 && b.l < a.r - 0.5) aus.push(a.name + ' überlappt ' + b.name);
    }
  }
  return aus;
}

module.exports = { ANSICHTEN, querlaufMessen };
