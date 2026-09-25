'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A438 (21.08.2026, Produktentscheidung, Laufzettel Nacht 22./23.08.2026
   Posten 6) — Die vierte Sperre ist keine
   ────────────────────────────────────────────────────────────────────────────
   GEMESSEN am 21.08.2026: `_ANG_CACHE_ERLAUBT` stand als `Object.freeze(new
   Set([...]))`. `Object.freeze` friert die EIGENSCHAFTEN eines Objekts ein —
   ein `Set` hat kaum welche (`add`/`delete`/`clear`/`has`/`size` leben auf
   `Set.prototype`, nicht auf der Instanz). Der interne Set-Inhalt blieb
   veränderbar: `.add(...)` lief klaglos durch, die Liste wuchs von 75 auf 76
   Einträge. Kein Loch im Produkt (kein Weg ruft `add` auf), aber eine
   Zusicherung, die nicht gilt, ist schlimmer als eine fehlende.

   DIE ECHTE SPERRE: die drei mutierenden Methoden sind als eigene, werfende
   Instanz-Eigenschaften überschrieben, ERST DANACH `Object.freeze()`t (sonst
   liesse sich `.add` einfach wieder einsetzen). Lesen (`has`, `size`,
   Iteration) bleibt unverändert — das ist keine neue Grenze, nur eine
   Bestätigung, dass diese Sperre nur Schreibversuche betrifft.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[A438·Rot-Beweis] die ALTE Form (Object.freeze auf einem nackten Set) verhindert add() NICHT', () => {
  const nackt = Object.freeze(new Set(['a', 'b']));
  nackt.add('c');   // wirft NICHT — genau der gemessene Befund vom 21.08.2026
  assert.equal(nackt.size, 3, 'Gegenprobe: der Inhalt WÄCHST trotz Object.freeze auf dem Set selbst');
});

test('[A438] _ANG_CACHE_ERLAUBT.add() wirft jetzt wirklich', () => {
  const { V } = ladeKern();
  const vorher = V._ANG_CACHE_ERLAUBT.size;
  assert.throws(() => V._ANG_CACHE_ERLAUBT.add('erfunden|irgendwas|irgendwas'), /gesperrt/);
  assert.equal(V._ANG_CACHE_ERLAUBT.size, vorher, 'die Größe ist unverändert — der Wurf kam VOR der Mutation');
});

test('[A438] .delete() und .clear() sind ebenfalls gesperrt', () => {
  const { V } = ladeKern();
  const irgendeinSchluessel = [...V._ANG_CACHE_ERLAUBT][0];
  assert.throws(() => V._ANG_CACHE_ERLAUBT.delete(irgendeinSchluessel), /gesperrt/);
  assert.throws(() => V._ANG_CACHE_ERLAUBT.clear(), /gesperrt/);
  assert.equal(V._ANG_CACHE_ERLAUBT.size, 75, 'der gemessene Stand vom 20.08.2026 — unverändert nach beiden Versuchen');
});

test('[A438] die Sperre selbst ist nicht wieder aufhebbar (add lässt sich nicht zurücksetzen)', () => {
  const { V } = ladeKern();
  assert.throws(() => { V._ANG_CACHE_ERLAUBT.add = (x) => Set.prototype.add.call(V._ANG_CACHE_ERLAUBT, x); },
    /Cannot assign to read only property|not extensible/,
    'Object.freeze() auf der Instanz verhindert, die geworfene add-Eigenschaft zu überschreiben');
});

test('[A438·Gegenprobe] Lesen bleibt unverändert -- has/size/Iteration funktionieren wie zuvor', () => {
  const { V } = ladeKern();
  assert.equal(V._ANG_CACHE_ERLAUBT.has('krankenhausakut|health|bloodType'), true);
  assert.equal(V._ANG_CACHE_ERLAUBT.has('nie-gehoert|nirgendwo|nichts'), false);
  assert.equal([...V._ANG_CACHE_ERLAUBT].length, V._ANG_CACHE_ERLAUBT.size);
  assert.equal(Array.from(V._ANG_CACHE_ERLAUBT).length, 75);
});
