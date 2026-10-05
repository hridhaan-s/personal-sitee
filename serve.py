"""Local preview with the same routing as Vercel: real files are served
as-is, every other path (/about, /astrophotography, /blog ...) gets
index.html, and /archive redirects to /achievements.

    python3 serve.py          # http://localhost:8000
    python3 serve.py 5500     # pick a port
"""
import http.server, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path.rstrip("/") in ("/archive", "/archive.html"):
            self.send_response(308)
            self.send_header("Location", "/achievements")
            self.end_headers()
            return
        if not os.path.isfile(os.path.join(ROOT, path.lstrip("/"))):
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), Handler).serve_forever()
