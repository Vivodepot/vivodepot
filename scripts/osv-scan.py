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

def load_sbom_components(sbom_path):
    """Liest Komponenten aus CycloneDX-SBOM. NUR Komponenten MIT purl werden
    abgefragt — file-Komponenten ohne purl (Font, Code-Listen) sind keine
    Paket-Abhängigkeiten und würden sonst als bogus-npm-Abfragen rauschen."""
    with open(sbom_path, encoding='utf-8') as f:
        sbom = json.load(f)
    components = []
    for c in sbom.get('components', []):
        name    = c.get('name', '')
        version = c.get('version', '')
        purl    = c.get('purl', '')
        if not purl:
            continue
        pkg_type = purl.split(':')[1].split('/')[0] if ':' in purl else ''
        ecosystem = PURL_TO_ECOSYSTEM.get(pkg_type, 'npm')
        if name and version:
            clean_version = version.replace('.x', '.0')
            components.append({'name': name, 'version': clean_version, 'ecosystem': ecosystem})
    return components

def query_osv(components, timeout=20):
    """Batch-Abfrage bei OSV.dev."""
    queries = [
        {'package': {'name': c['name'], 'ecosystem': c['ecosystem']}, 'version': c['version']}
        for c in components
    ]
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
    args = parser.parse_args()

    print(f'[osv-scan] SBOM: {args.sbom}')
    components = load_sbom_components(args.sbom)
    print(f'[osv-scan] {len(components)} Paket-Komponenten (mit purl) gefunden')

    date_str = datetime.date.today().isoformat()
    scan_result = {
        'scan_date':          date_str,
        'tool':               'OSV.dev API v1 querybatch',
        'sbom_source':        os.path.relpath(args.sbom, REPO_ROOT),
        'components_checked': len(components),
        'components':         components,
        'vulnerabilities':    [],
        'status':             'UNKNOWN',
    }

    try:
        raw = query_osv(components)
        results = raw.get('results', [])
        vulns_found = []
        for i, comp in enumerate(components):
            r = results[i] if i < len(results) else {}
            for v in r.get('vulns', []):
                vulns_found.append({
                    'component': comp['name'],
                    'version':   comp['version'],
                    'vuln_id':   v.get('id'),
                    'aliases':   v.get('aliases', []),
                    'severity':  v.get('database_specific', {}).get('severity', 'UNKNOWN'),
                })
        scan_result['vulnerabilities'] = vulns_found
        scan_result['status'] = 'CLEAN' if not vulns_found else 'VULNERABILITIES_FOUND'
        print(f'[osv-scan] Status: {scan_result["status"]}, Schwachstellen: {len(vulns_found)}')
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
