'use strict';
/* Wird vom `npm test` per --require in jeden Testprozess geladen. Setzt den Schalter, mit dem ein Hook-Lauf, den ein
   TEST startet, seine Belegungssperre je PID führt statt eine gemeinsame zu halten (tools/worktree-belegung-pruefen.js).
   Der echte pre-commit/pre-push setzt ihn nie. */
process.env.VD_HOOK_SPERRE_JE_PID = '1';
/* Und der Schlüsselbund (23.09.2026): kein Testprozess und kein von einem Test gestartetes Werkzeug liest oder schreibt den
   echten Schlüsselbund — tools/lib/schluesselbund.js verweigert beides, solange dieser Schalter steht. Ein Test injiziert den Leser. */
process.env.VD_SCHLUESSELBUND_GESPERRT = '1';
