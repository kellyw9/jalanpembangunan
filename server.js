const http = require('http');
const fs = require('fs');
const path = require('path');
const { createConfiguredAssetResolver } = require('./server/approvedAssetResolver.cjs');

const PORT = process.env.PORT || 8000;
const WEB_DIR = path.join(__dirname, 'web');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

const ASSET_MIME_TYPES = {
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8',
};

function sendAssetError(res, statusCode, message) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(message);
}

function assetErrorResponse(error) {
  switch (error?.name) {
    case 'ProfileNotLaunchableError':
      return { statusCode: 409, message: 'Map profile is not available' };
    case 'ProfileNotFoundError':
    case 'ResourceNotFoundError':
    case 'UnknownAssetRootError':
    case 'ResourceFileNotFoundError':
    case 'NonRegularResourceError':
    case 'UnsafeResourcePathError':
      return { statusCode: 404, message: 'Resource not found' };
    case 'InvalidResourcePathError':
      return { statusCode: 400, message: 'Invalid resource reference' };
    default:
      return { statusCode: 500, message: 'Internal server error' };
  }
}

function createServer({ assetResolverFactory = createConfiguredAssetResolver } = {}) {
  let assetResolverPromise;
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const requestTarget = (req.url || '/').split('?')[0];
    if (requestTarget === '/api/assets' || requestTarget.startsWith('/api/assets/')) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendAssetError(res, 405, 'Method not allowed');
        return;
      }

      const match = /^\/api\/assets\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(requestTarget);
      if (!match) {
        sendAssetError(res, 400, 'Invalid resource reference');
        return;
      }

      if (!assetResolverPromise) {
        assetResolverPromise = Promise.resolve().then(() => assetResolverFactory());
      }
      assetResolverPromise
        .then(assetResolver => assetResolver.resolveAsset(match[1], match[2]))
        .then(asset => {
          const contentType = ASSET_MIME_TYPES[asset.extension] || 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': asset.size,
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
          });
          const stream = asset.fileHandle.createReadStream({ autoClose: true });
          stream.on('error', () => {
            if (!res.headersSent) sendAssetError(res, 500, 'Internal server error');
            else res.destroy();
          });
          stream.pipe(res);
        })
        .catch(error => {
          const response = assetErrorResponse(error);
          sendAssetError(res, response.statusCode, response.message);
        });
      return;
    }

    let parsedUrl = req.url.split('?')[0];
    let safePath = path.normalize(decodeURIComponent(parsedUrl)).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
      safePath = '/index.html';
    }

    const filePath = path.join(WEB_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + safePath);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Cache-Control': 'no-cache',
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
  });

  return server;
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Serving files from: ${WEB_DIR}`);
  });
}

module.exports = { createServer };
