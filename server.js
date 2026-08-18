const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};

const PORT = 3000;

http.createServer((req, res) => {
  const safeUrl = req.url.split('?')[0];
  let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    let ext = path.extname(filePath).toLowerCase();
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Se o arquivo tiver extensão .gif mas for MP4 internamente
    if (ext === '.gif') {
      try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(12);
        fs.readSync(fd, buf, 0, 12, 0);
        fs.closeSync(fd);
        if (buf.indexOf('ftyp') !== -1) {
          contentType = 'video/mp4';
        }
      } catch (e) {}
    }

    const range = req.headers.range;
    const totalSize = stats.size;

    if (range && contentType.startsWith('video/')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
