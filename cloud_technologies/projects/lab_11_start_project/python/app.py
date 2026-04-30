import os
import socket
from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return f"""
    <h1>🌩️ Cloud Lab 06 — Docker</h1>
    <p>Hostname: {socket.gethostname()}</p>
    <p>Version: {os.environ.get('APP_VERSION', '1.0.0')}</p>
    """

@app.route('/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 3000)))
