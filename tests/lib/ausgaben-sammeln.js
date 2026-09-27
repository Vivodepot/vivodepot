'use strict';
/* Jede Ausgabe, die eine Person aus dem geöffneten Stand sieht oder exportiert: Seitenleiste, jede Bereichsansicht und
   jedes Bereichsmodell, jede Situationsansicht, Vollexport, Modelle, alle EXPORT_FORMATE. Liefert { name: text }; eine
   Ausgabe, die wirft, steht als 'WURF: <Meldung>' darin, damit ein Aufrufer blinde Stellen sieht statt ein stilles Grün.
   `document` kommt aus demselben ladeKern()-Aufruf wie `V` — ohne es werfen genau die sichtbaren Flächen. */
function ausgabenSammeln(V, document) {
  const aus = {};
  const nimm = (name, f) => {
    try { const r = f(); aus[name] = typeof r === 'string' ? r : JSON.stringify(r); } catch (err) { aus[name] = 'WURF: ' + err.message; }
  };
  nimm('seitenleiste', () => { V.renderSidebar(); return document.getElementById('sidebar').innerHTML; });
  for (const b of V.bereicheAlle()) {
    nimm('sektor:' + b.id, () => { V.renderSektor(b.id); return document.getElementById('content').innerHTML; });
    nimm('modell:' + b.id, () => V.bereichVollModell(b.id, { sensibel: true }));
  }
  for (const s of (V.SITUATIONEN || [])) nimm('situation:' + s.id, () => { V.oeffneSituation(s.id); return document.getElementById('content').innerHTML; });
  nimm('vollExport', () => V.vollExportJSON({ sensibel: true }));
  nimm('vollDepotModell', () => V.vollDepotModell({ sensibel: true }));
  nimm('notfallKern', () => V.notfallKernModell());
  for (const def of V.EXPORT_FORMATE) nimm('export:' + def.id, () => def.baue({ sensibel: true, jetzt: new Date('2026-09-23T12:00:00Z') }));
  return aus;
}

const geworfen = (aus) => Object.keys(aus).filter((k) => aus[k].startsWith('WURF: '));
const fundstellen = (aus, marker) => Object.keys(aus).filter((k) => aus[k].includes(marker));

module.exports = { ausgabenSammeln, geworfen, fundstellen };
