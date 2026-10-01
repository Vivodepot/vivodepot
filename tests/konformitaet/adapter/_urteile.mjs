/* ═════════════════════════════════════════════════════════════════════════
   _urteile.mjs — die EINE Stelle, an der der Extern-Lauf Urteile holt
   ─────────────────────────────────────────────────────────────────────────
   Kann ein Prüfer alle Artefakte in einem Werkzeuglauf urteilen (`urteileAlle`), wird er so gerufen — genau ein
   Aufruf für alle Dateien. Trägt ein Eintrag `sammelPflicht: true` (der HL7-Prüfer: eine JVM je Datei trieb den Lauf
   am 28.09.2026 über die 240-s-Grenze des Gates), gibt es für ihn KEINEN Einzelweg: fehlt urteileAlle, ist das ein
   Fehler, kein stiller Rückfall. Alle anderen urteilen je Datei.
   ═════════════════════════════════════════════════════════════════════════ */
export function urteileHolen(v, umgebung, faelle) {
  if (typeof v.urteileAlle === 'function') {
    const je = v.urteileAlle(umgebung, faelle.map((f) => f.pfad));
    return new Map(faelle.map((f) => [f.pfad, je.get(f.pfad) || { gelesen: false, gueltig: false, fehler: ['kein Urteil für ' + f.pfad] }]));
  }
  if (v.sammelPflicht) throw new Error(v.id + ': sammelPflicht, aber kein urteileAlle — der Einzelweg (ein Werkzeuglauf je Datei) ist für diesen Prüfer gesperrt');
  return new Map(faelle.map((f) => [f.pfad, v.urteile(umgebung, f.pfad, f.standard)]));
}
