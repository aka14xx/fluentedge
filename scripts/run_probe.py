#!/usr/bin/env python3
import urllib.request
import json

def try_get(u, timeout=5):
    try:
        with urllib.request.urlopen(u, timeout=timeout) as r:
            data = r.read(1000).decode('utf-8', 'replace')
            print('\nGET', u, 'STATUS', r.getcode())
            print(data[:800])
    except Exception as e:
        print('\nGET ERR', u, e)

def try_post(u, payload, timeout=5):
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(u, data=data, headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            resp = r.read(2000).decode('utf-8', 'replace')
            print('\nPOST', u, 'STATUS', r.getcode())
            print(resp[:1500])
    except Exception as e:
        print('\nPOST ERR', u, e)

if __name__ == '__main__':
    base = 'http://127.0.0.1:5000'
    try_get(base + '/')
    try_get(base + '/api/practice-phrases')
    try_get(base + '/api/check-ai-status')
    try_post(base + '/api/evaluate-pronunciation', {'spoken_text':'hello world','expected_text':'hello world'})
