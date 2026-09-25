#!/bin/sh
# ════════════════════════════════════════════════════════════════════════════
# Gemeinsame Log-Zeile fuer pre-commit und pre-push (Auftrag, 13.09.2026,
# Folgeauftrag zu "pre-commit-Durchbruch tote Verweise", 401159c5).
#
# DER GRUND: eine frühere Erhebung konnte nicht rekonstruieren, ob hooks/pre-commit bei
# einem konkreten Commit ueberhaupt lief — es gibt keinerlei Beleg dafuer oder
# dagegen, weder in git noch im Dateisystem. Diese Datei schliesst genau diese
# Luecke: EINE Zeile je Hook-Lauf, danach ist die Frage ein `grep` statt eine
# Rekonstruktion.
#
# EIN FEHLER HIER DARF DEN AUFRUFENDEN HOOK NIE BEEINFLUSSEN — weder blockieren
# noch faelschlich gruen machen. Deshalb: kein `set -e` in dieser Datei, die
# Umleitung traegt ihr eigenes `2>/dev/null`, und der aufrufende Hook rekon-
# struiert seinen Exit-Code nach dem Aufruf explizit aus der VOR dem Trap
# gesicherten Variable (`rc`) — der Rueckgabewert dieser Funktion wird nie zum
# Exit-Code des Hooks.
#
# PFAD RELATIV ZU CWD, NICHT ZU $0: git fuehrt Hooks IMMER mit CWD auf der
# Wurzel des Arbeitsbaums aus (unabhaengig davon, wo core.hooksPath hinzeigt) —
# derselbe Grund, aus dem alle anderen Aufrufe in diesen Hooks schon relative
# Pfade wie `tools/…` verwenden. Ein $0-abgeleiteter Pfad braeche ausserdem die
# bestehende Testtechnik in tests/pre-push-standzahlen-faktenbasis-check.test.js
# und tests/pre-push-bestand-waechter-erneut.test.js, die den Hook-Text in ein
# beliebiges Temp-Verzeichnis schreiben und mit `cwd: REPO` ausfuehren — dort
# zeigt `$0` auf das Temp-Verzeichnis, `pwd` aber weiterhin auf REPO.
#
# Aufruf: hook_log_schreiben <hook-name> <exit-code>
hook_log_schreiben() {
  _hook="$1"
  _rc="$2"
  _ziel="$(git rev-parse HEAD 2>/dev/null || echo unbekannt)"
  _ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{"zeit":"%s","hook":"%s","ziel":"%s","rc":"%s"}\n' "$_ts" "$_hook" "$_ziel" "$_rc" >> "hook-log.ndjson" 2>/dev/null
  unset _hook _rc _ziel _ts
}
