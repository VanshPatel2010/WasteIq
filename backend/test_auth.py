import urllib.request
import json

req = urllib.request.Request('http://localhost:8000/api/auth/login', data=json.dumps({'email': 'admin@wasteiq.com', 'password': 'password123'}).encode('utf-8'), headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read().decode('utf-8'))
token = data['access_token']
print('TOKEN:', token)

req2 = urllib.request.Request('http://localhost:8000/api/zones/', headers={'Authorization': 'Bearer ' + token})
try:
    resp2 = urllib.request.urlopen(req2)
    print('ZONES:', resp2.read().decode('utf-8')[:50])
except Exception as e:
    import traceback
    traceback.print_exc()
    if hasattr(e, 'read'):
        print('ERROR:', e.read())
    else:
        print('ERROR:', str(e))
