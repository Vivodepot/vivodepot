# Fährt ein Kommando in einem echten Pseudo-TTY und schreibt jeden Chunk als EIN write() — so kommt eingefügter Text
# beim Programm an. Vor jedem Chunk wird auf ein Muster in der Ausgabe gewartet, das seit dem letzten Chunk neu ist.
# Aufruf: python3 pty-fahren.py '{"befehl": [...], "schritte": [{"warte": "...", "chunk": "..."}]}'
import json, os, pty, select, sys, time

auftrag = json.loads(sys.argv[1])
pid, fd = pty.fork()
if pid == 0:
    os.execvp(auftrag['befehl'][0], auftrag['befehl'])

puffer = b''


def lesen(bis, muster=None, ab=0):
    global puffer
    while time.time() < bis and (muster is None or muster.encode() not in puffer[ab:]):
        r, _, _ = select.select([fd], [], [], max(0, bis - time.time()))
        if not r:
            return
        try:
            d = os.read(fd, 4096)
        except OSError:
            return
        if not d:
            return
        puffer += d


for s in auftrag['schritte']:
    if s.get('warte'):
        lesen(time.time() + 10, s['warte'])
        if s['warte'].encode() not in puffer:
            sys.stdout.write(json.dumps({'fehler': 'wartet auf ' + s['warte'], 'ausgabe': puffer.decode(errors='replace')}))
            os.kill(pid, 9)
            sys.exit(0)
    time.sleep(0.2)
    os.write(fd, s['chunk'].encode('utf-8'))

lesen(time.time() + 10, 'ERGEBNIS')
lesen(time.time() + 0.3)
try:
    os.kill(pid, 9)
except OSError:
    pass
sys.stdout.write(json.dumps({'ausgabe': puffer.decode(errors='replace')}))
