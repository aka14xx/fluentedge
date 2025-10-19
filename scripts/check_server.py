import urllib.request
import json
import sys
import time

OUT = r"c:\Users\al rushaidi\Desktop\OmaniEnglishtutor\scripts\server_check.json"
URLS = {
    'root': 'http://127.0.0.1:5000/',
    'practice': 'http://127.0.0.1:5000/api/practice-phrases',
    'status': 'http://127.0.0.1:5000/api/check-ai-status',
    'evaluate': 'http://127.0.0.1:5000/api/evaluate-pronunciation'
}

report = {'time': time.ctime(), 'results': {}}

def get(u, timeout=3):
    try:
        with urllib.request.urlopen(u, timeout=timeout) as r:
            return {'status': r.getcode(), 'body': r.read(2000).decode('utf-8', 'replace')}
    except Exception as e:
        return {'error': str(e)}

# GET checks
for k,u in [('root', URLS['root']), ('practice', URLS['practice']), ('status', URLS['status'])]:
    report['results'][k] = get(u)

# POST evaluate
payload = json.dumps({'spoken_text': 'hello world', 'expected_text': 'hello world'}).encode('utf-8')
req = urllib.request.Request(URLS['evaluate'], data=payload, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=5) as r:
        report['results']['evaluate'] = {'status': r.getcode(), 'body': r.read(5000).decode('utf-8')}
except Exception as e:
    report['results']['evaluate'] = {'error': str(e)}

# write report
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2)

print('Wrote', OUT)
