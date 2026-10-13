#!/usr/bin/env python3
"""
OSV.dev-Scanner für die Vivodepot V1-SBOM (clean-rebuild).

Eigenständige Kopie im clean-rebuild-Repo (keine Cross-Repo-Abhängigkeit). Liest
die V1-SBOM (vivodepot.sbom.cdx.json), prüft alle Komponenten
gegen die OSV.dev-API und beendet sich mit einem Exit-Code, der als echter
CI-Gate taugt:

  Exit 0  — CLEAN: keine Schwachstellen gefunden.
  Exit 1  — VULNERABILITIES_FOUND: mindestens eine Schwachstelle.
  Exit 2  — SCAN_ERROR: API/Netz nicht erreichbar o. Ä. (NICHT still grün —
            ein Gate, das nicht prüfen konnte, ist ein roter Gate, kein grüner).

Verwendung:
  python3 scripts/osv-scan.py [--sbom PATH] [--out DIR]
"""

import sys, os, json, urllib.request, datetime, argparse

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SBOM = os.path.join(REPO_ROOT, 'vivodepot.sbom.cdx.json')
DEFAULT_OUT  = os.path.join(REPO_ROOT, '.osv-cache')   # gitignoriert; CI nutzt --out RUNNER_TEMP

# Ecosystem-Mapping: purl-type → OSV-Ecosystem
PURL_TO_ECOSYSTEM = {
    'npm':    'npm',
    'pypi':   'PyPI',
    'maven':  'Maven',
    'gem':    'RubyGems',
    'cargo':  'crates.io',
    'nuget':  'NuGet',
    'go':     'Go',
}

# JEDER EINTRAG DER STÜCKLISTE IST ABGEFRAGT ODER BENANNT AUSGENOMMEN (11.10.2026, Befund OSV-SCAN-FRAGT-INS-LEERE).
# Bis dahin fiel ein unbekannter purl-Typ still auf npm zurück, und abgefragt wurde mit Name und Fassung des
# Stücklisten-Eintrags. Für die eingebettete Krypto-Bibliothek hieß das: npm · „noble-ed25519“ · „fa14496“ — eine
# Abfrage, die nichts treffen kann, und deren leere Antwort als „kein Fund“ zählte.
#
# ZUORDNUNG: Einträge, deren Stand keine veröffentlichte Paketfassung ist. Schlüssel ist die purl ohne Fassung.
# Abgefragt wird das genannte Paket OHNE Fassung: jede Meldung zu dem Paket macht den Scan rot und wird von Hand
# eingeordnet (EINGEORDNET).
ZUORDNUNG = {
    'pkg:github/paulmillr/noble-ed25519': {
        'ecosystem': 'npm', 'name': '@noble/ed25519',
        'grund': 'eingebettet ist ein Commit-Stand, keine veröffentlichte Fassung',
    },
    'pkg:npm/lucide-static': {
        'ecosystem': 'npm', 'name': 'lucide-static',
        'grund': 'eine Auswahl von Bildzeichen aus mehreren Fassungen des Pakets',
    },
}

# AUSGENOMMEN: Einträge ohne purl, je mit Grund. Es sind Daten, kein ausführbarer Code; die Datenbank führt sie nicht.
# Ein Eintrag ohne purl, der hier fehlt, ist ein Fehler des Scans.
AUSGENOMMEN = {
    'font-inter':                        'Schriftdatei',
    'font-inter-pdf':                    'Schriftdatei (Teilmenge für PDF)',
    'code-liste-atc':                    'amtliche Code-Liste, Daten',
    'code-liste-icd10gm':                'amtliche Code-Liste, Daten',
    'code-liste-loinc':                  'Code-Liste, Daten',
    'code-liste-snomed-allergen':        'Code-Liste, Daten',
    'xshare-yellow-button':              'Bildzeichen-Paket, Bilddaten',
    'wortliste-de-dys2p':                'Wortliste, Daten',
    'wortliste-en-eff':                  'Wortliste, Daten',
    'terminologie-ihe-xds-value-sets':   'Terminologie, Daten',
    'terminologie-hl7-tho':              'Terminologie, Daten',
    'terminologie-kbv-nfd-runaway-risk': 'Terminologie, Daten',
    'terminologie-ihe-formatcode':       'Terminologie, Daten',
}

# EINGEORDNET: Meldungen, die von Hand geprüft sind und den eingebetteten Stand nicht betreffen (Kennung → Grund).
# Nur für Einträge aus ZUORDNUNG nötig, weil dort ohne Fassung gefragt wird. Leer heißt: es gibt keine.
EINGEORDNET = {}

# KONTROLLE: eine Abfrage, deren Antwort Meldungen tragen MUSS (eine alte Fassung mit bekannten Meldungen). Kommt
# sie leer zurück, antwortet die Datenbank nicht so, wie der Scan es voraussetzt, und „kein Fund“ wäre nichts wert.
KONTROLLE = {'ecosystem': 'npm', 'name': 'jspdf', 'version': '2.5.1'}

def purl_zerlegen(purl):
    """pkg:typ/[namensraum/]name[@fassung] → (typ, name mit Namensraum, fassung oder None, purl ohne Fassung)."""
    rumpf = purl.split('?')[0].split('#')[0]
    ohne_fassung, fassung = rumpf, ''
    if '@' in rumpf.split('/')[-1]:   # nur ein @ im letzten Glied trennt die Fassung ab, nicht das eines Namensraums
        ohne_fassung = rumpf[:rumpf.rindex('@')]
        fassung = rumpf[rumpf.rindex('@') + 1:]
    typ, _, name = ohne_fassung[len('pkg:'):].partition('/') if ohne_fassung.startswith('pkg:') else ('', '', '')
    return typ, name.replace('%40', '@'), (fassung or None), ohne_fassung

def auswahl(sbom_path):
    """Teilt die Stückliste: was abgefragt wird (und wie), was benannt ausgenommen ist, und was ein Fehler ist.
    Ohne Netz. Ein Eintrag, der weder abgefragt noch ausgenommen werden kann, steht unter 'fehler'."""
    with open(sbom_path, encoding='utf-8') as f:
        sbom = json.load(f)
    abfragen, ausgenommen, fehler = [], [], []
    for c in sbom.get('components', []):
        eintrag = c.get('name', '')
        purl = c.get('purl', '')
        if not purl:
            if eintrag in AUSGENOMMEN:
                ausgenommen.append({'eintrag': eintrag, 'grund': AUSGENOMMEN[eintrag]})
            else:
                fehler.append({'eintrag': eintrag, 'warum': 'ohne purl und nicht in AUSGENOMMEN: weder abgefragt noch benannt ausgenommen'})
            continue
        typ, name, fassung, ohne_fassung = purl_zerlegen(purl)
        if ohne_fassung in ZUORDNUNG:
            z = ZUORDNUNG[ohne_fassung]
            abfragen.append({'eintrag': eintrag, 'ecosystem': z['ecosystem'], 'name': z['name'], 'version': None,
                             'wie': 'Paket ohne Fassung (' + z['grund'] + ')'})
        elif typ in PURL_TO_ECOSYSTEM and name and fassung:
            abfragen.append({'eintrag': eintrag, 'ecosystem': PURL_TO_ECOSYSTEM[typ], 'name': name, 'version': fassung,
                             'wie': 'Paket und Fassung aus der purl'})
        elif typ in PURL_TO_ECOSYSTEM:
            fehler.append({'eintrag': eintrag, 'warum': 'purl ohne Fassung (' + purl + ') und keine ZUORDNUNG: die Abfrage träfe nichts Bestimmtes'})
        else:
            fehler.append({'eintrag': eintrag, 'warum': 'purl-Typ „' + typ + '“ ohne ZUORDNUNG (' + purl + '): kein Rückfall auf ein anderes Register'})
    return {'abfragen': abfragen, 'ausgenommen': ausgenommen, 'fehler': fehler}

def query_osv(components, timeout=20):
    """Batch-Abfrage bei OSV.dev. Ohne 'version' fragt sie nach jeder Meldung zum Paket."""
    queries = []
    for c in components:
        q = {'package': {'name': c['name'], 'ecosystem': c['ecosystem']}}
        if c.get('version'):
            q['version'] = c['version']
        queries.append(q)
    payload = json.dumps({'queries': queries}).encode('utf-8')
    req = urllib.request.Request(
        'https://api.osv.dev/v1/querybatch',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())

def main():
    parser = argparse.ArgumentParser(description='OSV.dev SBOM-Scanner (V1)')
    parser.add_argument('--sbom', default=DEFAULT_SBOM)
    parser.add_argument('--out',  default=DEFAULT_OUT)
    parser.add_argument('--auswahl', action='store_true',
                        help='nur die Aufteilung der Stückliste als JSON ausgeben, ohne Netz (Exit 2 bei einem Eintrag, der weder abgefragt noch ausgenommen ist)')
    args = parser.parse_args()

    a = auswahl(args.sbom)
    if args.auswahl:
        print(json.dumps(a, indent=1, ensure_ascii=False))
        sys.exit(2 if a['fehler'] else 0)

    print(f'[osv-scan] SBOM: {args.sbom}')
    components = a['abfragen']
    print(f'[osv-scan] {len(components)} Einträge abgefragt, {len(a["ausgenommen"])} benannt ausgenommen, {len(a["fehler"])} weder noch')
    for c in components:
        print(f'[osv-scan]   {c["eintrag"]}: {c["ecosystem"]} · {c["name"]} · {c["version"] or "jede Fassung"} — {c["wie"]}')

    date_str = datetime.date.today().isoformat()
    scan_result = {
        'scan_date':          date_str,
        'tool':               'OSV.dev API v1 querybatch',
        'sbom_source':        os.path.relpath(args.sbom, REPO_ROOT),
        'components_checked': len(components),
        'components':         components,
        'ausgenommen':        a['ausgenommen'],
        'fehler':             a['fehler'],
        'vulnerabilities':    [],
        'eingeordnet':        [],
        'status':             'UNKNOWN',
    }

    if a['fehler']:
        # Ein Eintrag, den der Scan nicht prüfen kann, ist kein grüner Scan.
        scan_result['status'] = 'SCAN_ERROR'
        scan_result['error'] = 'Einträge der Stückliste weder abgefragt noch ausgenommen'
        for f in a['fehler']:
            print(f'[osv-scan] FEHLER: {f["eintrag"]} — {f["warum"]}', file=sys.stderr)
        print('[osv-scan]   Beheben: purl mit Paket und Fassung, ein Eintrag in ZUORDNUNG, oder (ohne purl) in AUSGENOMMEN mit Grund.', file=sys.stderr)
    else:
        try:
            raw = query_osv(components + [KONTROLLE])
            results = raw.get('results', [])
            if len(results) != len(components) + 1:
                raise RuntimeError(f'{len(results)} Antworten auf {len(components) + 1} Abfragen')
            if not results[-1].get('vulns'):
                raise RuntimeError('die Kontroll-Abfrage (bekannte Meldungen) kam leer zurück: eine leere Antwort wäre kein Befund')
            vulns_found = []
            for i, comp in enumerate(components):
                for v in results[i].get('vulns', []):
                    zeile = {
                        'component': comp['eintrag'],
                        'paket':     comp['name'],
                        'version':   comp['version'],
                        'vuln_id':   v.get('id'),
                        'aliases':   v.get('aliases', []),
                        'severity':  v.get('database_specific', {}).get('severity', 'UNKNOWN'),
                    }
                    if v.get('id') in EINGEORDNET:
                        zeile['eingeordnet'] = EINGEORDNET[v.get('id')]
                        scan_result['eingeordnet'].append(zeile)
                    else:
                        vulns_found.append(zeile)
            scan_result['vulnerabilities'] = vulns_found
            scan_result['status'] = 'CLEAN' if not vulns_found else 'VULNERABILITIES_FOUND'
            print(f'[osv-scan] Status: {scan_result["status"]}, Schwachstellen: {len(vulns_found)}')
            for z in vulns_found:
                print(f'[osv-scan]   {z["component"]} ({z["paket"]}): {z["vuln_id"]}', file=sys.stderr)
        except Exception as e:
            scan_result['error'] = str(e)
            scan_result['status'] = 'SCAN_ERROR'
            print(f'[osv-scan] Fehler: {e}', file=sys.stderr)

    os.makedirs(args.out, exist_ok=True)
    out_path = os.path.join(args.out, f'osv-scan-{date_str}.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(scan_result, f, indent=2, ensure_ascii=False)
    print(f'[osv-scan] Ergebnis gespeichert: {out_path}')

    # Echter Gate: Schwachstelle ODER Scan-Fehler → non-zero. Ein Scan, der nicht
    # prüfen konnte (SCAN_ERROR), darf NICHT als grün durchgehen (Schicht-A-Härtung).
    if scan_result['status'] == 'VULNERABILITIES_FOUND':
        sys.exit(1)
    if scan_result['status'] != 'CLEAN':
        sys.exit(2)

if __name__ == '__main__':
    main()
