#!/usr/bin/env node
/**
 * Tiny reverse proxy that forwards to Metro (port 8081) and injects
 * the Cross-Origin-Isolation headers required by expo-sqlite on web.
 * Run alongside `npm run web`:  node web-proxy.mjs
 * Then open: http://localhost:8088
 */
import http from 'http';

const METRO_PORT = parseInt(process.env.METRO_PORT ?? '8081', 10);
const PROXY_PORT = 8088;

const COOP_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

// expo-sqlite web worker has a bug: `resultArray.set(new Uint32Array([length]), 0)`
// stores only the low byte of `length` (because Uint8Array.set truncates each element).
// For results > 255 bytes the main thread reads only `length & 0xFF` bytes → JSON parse fails.
// We patch the worker bundle on the fly to use DataView.setUint32 instead.
const WORKER_URL_FRAGMENT = 'expo-sqlite';
const BUGGY_CODE   = 'resultArray.set(new Uint32Array([length]), 0);';
const PATCHED_CODE = 'new DataView(resultArray.buffer).setUint32(0, length, true);';

function isWorkerRequest(url) {
  return url && url.includes(WORKER_URL_FRAGMENT) && url.includes('worker');
}

const server = http.createServer((req, res) => {
  // For worker bundles, strip Accept-Encoding so Metro returns plain text we can patch
  const reqHeaders = isWorkerRequest(req.url)
    ? { ...req.headers, 'accept-encoding': 'identity' }
    : req.headers;

  const options = {
    hostname: 'localhost',
    port: METRO_PORT,
    path: req.url,
    method: req.method,
    headers: reqHeaders,
  };

  const proxy = http.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers, ...COOP_HEADERS };

    if (isWorkerRequest(req.url)) {
      // Buffer the entire worker bundle so we can patch it
      const chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        let body = Buffer.concat(chunks).toString('utf8');
        let patched = false;

        if (body.includes(BUGGY_CODE)) {
          body = body.replaceAll(BUGGY_CODE, PATCHED_CODE);
          patched = true;
        }

        if (patched) {
          console.log(`[proxy] Patched expo-sqlite worker bug in: ${req.url}`);
        } else {
          console.warn(`[proxy] WARNING: Worker bundle fetched but patch target not found in: ${req.url}`);
        }

        const buf = Buffer.from(body, 'utf8');
        const patchedHeaders = {
          ...headers,
          'content-length': buf.length,
          'content-encoding': undefined, // remove any gzip since we decoded
        };
        // Remove undefined keys
        Object.keys(patchedHeaders).forEach(k => patchedHeaders[k] === undefined && delete patchedHeaders[k]);
        res.writeHead(proxyRes.statusCode, patchedHeaders);
        res.end(buf);
      });
    } else {
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res, { end: true });
    }
  });

  proxy.on('error', (err) => {
    res.writeHead(502);
    res.end(`Metro not reachable: ${err.message}`);
  });

  req.pipe(proxy, { end: true });
});

// Forward WebSocket connections (hot reload / HMR)
server.on('upgrade', (req, socket, head) => {
  const options = { hostname: 'localhost', port: METRO_PORT, path: req.url };
  const conn = http.request(options);
  conn.on('upgrade', (_proxyRes, proxySocket) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\n\r\n');
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  conn.end();
});

server.listen(PROXY_PORT, () => {
  console.log(`Proxy running → http://localhost:${PROXY_PORT}`);
  console.log(`Forwarding to Metro on port ${METRO_PORT}`);
});
