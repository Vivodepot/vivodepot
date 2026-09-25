'use strict';
/* Minimal-Auszug aus einem FHIR-Lab-Bundle für die Empfänger-Ansicht der Demo-Aufnahme
   (Clip 2c). KEIN Ersatz für vivodepot.html:_fhirDokumentAnsichtHTML — dort läuft ein
   allowlist-basierter Narrative-Sanitizer, hier reicht für den Testharness textContent
   (sicher, aber ohne Absatz-/Fett-Formatierung). Nur zur Anzeige in einem Wegwerf-Kontext,
   nicht Teil des Produkts. */

// Rohes Composition.text.div -> reiner Text (Tags entfernt, keine HTML-Interpretation nötig
// beim Aufrufer, da hier schon textContent-Extraktion über eine simple Tag-Entfernung läuft).
function narrativTextAus(bundleText) {
  let b;
  try { b = JSON.parse(String(bundleText || '')); } catch (e) { return null; }
  if (!b || !Array.isArray(b.entry)) return null;
  const comp = b.entry.map((e) => e && e.resource).find((r) => r && r.resourceType === 'Composition');
  const div = comp && comp.text && typeof comp.text.div === 'string' ? comp.text.div : null;
  if (!div) return null;
  return div.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Erste Observation mit „Glucose" im Analyt-Namen -> { analyt, wert } oder null.
function glukoseZeileAus(bundleText) {
  let b;
  try { b = JSON.parse(String(bundleText || '')); } catch (e) { return null; }
  if (!b || !Array.isArray(b.entry)) return null;
  const obs = b.entry.map((e) => e && e.resource).find((r) => {
    if (!r || r.resourceType !== 'Observation') return false;
    const txt = (r.code && (r.code.text || (r.code.coding && r.code.coding[0] && r.code.coding[0].display))) || '';
    return /glucose/i.test(txt);
  });
  if (!obs) return null;
  const analyt = (obs.code && (obs.code.text || (obs.code.coding && obs.code.coding[0] && obs.code.coding[0].display))) || '';
  const vq = obs.valueQuantity;
  const wert = vq && vq.value != null ? String(vq.value) + ' ' + (vq.code || vq.unit || '') : '';
  return { analyt, wert };
}

module.exports = { narrativTextAus, glukoseZeileAus };
