'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Minimaler In-Memory-IndexedDB-Mock (Test-Hilfe, KEIN Produkt-Code).
   ────────────────────────────────────────────────────────────────────────
   `fake-indexeddb` ist in dieser Bau-Umgebung nicht installierbar (npm-Netz
   gesperrt, E403). Darum dieser kleine Mock — er deckt GENAU die vom VdStore
   genutzte IndexedDB-API-Teilmenge ab und treibt die promise-gekapselten
   Backend-Pfade realitätsnah (asynchron via queueMicrotask, readwrite-
   Transaktion mit oncomplete/onabort/onerror).

   Bewusst NICHT abgedeckt: Indizes, Cursor, Versions-Downgrade, Multi-Store-
   Transaktionen. Reicht für put/get/delete/getAll auf einem keyPath-Store.

   Optionen:
     • fehlerBeiPut: Error|true  → put wirft (Quota-/Disk-Full-Simulation, Etappe 2)
     • _dbs: Map                 → geteilter Persistenz-Speicher (überlebt reopen)
   ════════════════════════════════════════════════════════════════════════ */

function _microtask(fn) {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn);
  else Promise.resolve().then(fn);
}
function _kopie(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }

function createIdbMock(opts) {
  opts = opts || {};
  // Persistenter Speicher je DB-Name (überlebt close()/reopen → „Schließen+Öffnen").
  const dbs = opts._dbs || new Map();   // name -> { version, stores: Map<name,{keyPath,rows:Map}> }

  function makeStore(meta, tx) {
    function op(run) {
      const rq = { onsuccess: null, onerror: null, result: undefined, error: null };
      tx._pending++;
      _microtask(function () {
        if (tx._aborted) { tx._pending--; return; }
        try {
          rq.result = run();
          if (typeof rq.onsuccess === 'function') rq.onsuccess({ target: rq });
          tx._pending--;
          tx._maybeComplete();
        } catch (e) {
          rq.error = e;
          if (typeof rq.onerror === 'function') rq.onerror({ target: rq });
          tx._pending--;
          tx._abort(e);
        }
      });
      return rq;
    }
    return {
      put: function (rec) {
        return op(function () {
          if (tx.mode !== 'readwrite') throw new Error('DataError: put in readonly tx');
          if (opts.fehlerBeiPut) throw (opts.fehlerBeiPut instanceof Error ? opts.fehlerBeiPut : new Error('QuotaExceededError (Mock)'));
          const key = rec[meta.keyPath];
          meta.rows.set(key, _kopie(rec));
          return key;
        });
      },
      get: function (id) {
        return op(function () { const r = meta.rows.get(id); return r ? _kopie(r) : undefined; });
      },
      delete: function (id) {
        return op(function () { if (tx.mode !== 'readwrite') throw new Error('DataError: delete in readonly tx'); meta.rows.delete(id); return undefined; });
      },
      getAll: function () {
        return op(function () { return Array.from(meta.rows.values()).map(_kopie); });
      },
    };
  }

  function makeDb(entry) {
    return {
      objectStoreNames: { contains: function (n) { return entry.stores.has(n); } },
      createObjectStore: function (name, options) {
        const meta = { keyPath: (options && options.keyPath) || 'id', rows: new Map() };
        entry.stores.set(name, meta);
        return { /* Upgrade-Store; im Test ungenutzt */ };
      },
      transaction: function (storeName, mode) {
        const tx = {
          mode: mode || 'readonly',
          error: null,
          oncomplete: null, onabort: null, onerror: null,
          _pending: 0, _aborted: false, _completed: false,
          objectStore: function (n) {
            const meta = entry.stores.get(n);
            if (!meta) throw new Error('NotFoundError: store ' + n);
            return makeStore(meta, tx);
          },
          abort: function () { tx._abort(new Error('AbortError')); },
          _abort: function (err) {
            if (tx._aborted || tx._completed) return;
            tx._aborted = true; tx.error = err || tx.error;
            if (typeof tx.onerror === 'function') tx.onerror({ target: tx });
            if (typeof tx.onabort === 'function') tx.onabort({ target: tx });
          },
          _maybeComplete: function () {
            if (tx._aborted || tx._completed) return;
            if (tx._pending === 0) { tx._completed = true; if (typeof tx.oncomplete === 'function') tx.oncomplete({ target: tx }); }
          },
        };
        return tx;
      },
      close: function () {},
    };
  }

  return {
    _dbs: dbs,
    open: function (name, version) {
      const rq = { onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null, result: undefined, error: null };
      if (opts.fehlerBeiOpen) {
        _microtask(function () { rq.error = (opts.fehlerBeiOpen instanceof Error ? opts.fehlerBeiOpen : new Error('OpenError (Mock)')); if (typeof rq.onerror === 'function') rq.onerror({ target: rq }); });
        return rq;
      }
      _microtask(function () {
        let entry = dbs.get(name);
        const needUpgrade = !entry || (version && version > entry.version);
        if (!entry) { entry = { version: version || 1, stores: new Map() }; dbs.set(name, entry); }
        const db = makeDb(entry);
        rq.result = db;
        if (needUpgrade) {
          if (version) entry.version = version;
          if (typeof rq.onupgradeneeded === 'function') rq.onupgradeneeded({ target: rq });
        }
        if (typeof rq.onsuccess === 'function') rq.onsuccess({ target: rq });
      });
      return rq;
    },
  };
}

module.exports = { createIdbMock };
