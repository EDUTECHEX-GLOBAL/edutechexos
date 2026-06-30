const mongoose = require('mongoose');
const { Readable } = require('stream');

let _bucket = null;

function getBucket() {
  if (mongoose.connection.readyState !== 1) throw new Error('MongoDB not connected');
  if (!_bucket) {
    _bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
      chunkSizeBytes: 255 * 1024,
    });
  }
  return _bucket;
}

async function uploadFile(req, res) {
  try {
    const rawName = req.headers['x-filename'] || `upload-${Date.now()}`;
    let filename;
    try { filename = decodeURIComponent(rawName); } catch { filename = rawName; }

    const contentType = req.headers['content-type'] || 'application/octet-stream';

    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ success: false, error: 'No file data received' });
    }

    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: { uploadedBy: req.user?.email, uploadedAt: new Date() },
    });

    await new Promise((resolve, reject) => {
      Readable.from(req.body).pipe(uploadStream);
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    res.json({
      success: true,
      url: `/api/files/${uploadStream.id}`,
      fileId: String(uploadStream.id),
    });
  } catch (err) {
    console.error('[POST /api/files] Error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

async function serveFile(req, res) {
  try {
    const { id } = req.params;

    let objectId;
    try { objectId = new mongoose.Types.ObjectId(id); }
    catch { return res.status(400).send('Invalid file ID'); }

    const bucket = getBucket();
    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files.length) return res.status(404).send('File not found');

    const file = files[0];
    const storedType = (file.contentType || 'application/octet-stream').toLowerCase();

    // Only let safe media render inline in the browser. Anything else (HTML,
    // SVG, scripts, etc.) is forced to download to prevent stored-XSS / phishing
    // when the file is served from the API origin.
    const inlineSafe = /^(image\/(png|jpe?g|gif|webp|bmp|x-icon)|application\/pdf|video\/|audio\/)/.test(storedType)
      && storedType !== 'image/svg+xml';
    const disposition = inlineSafe ? 'inline' : 'attachment';

    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Length', String(file.length));
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(file.filename || 'file')}"`
    );

    const dl = bucket.openDownloadStream(objectId);
    dl.on('error', () => { if (!res.headersSent) res.status(500).send('Stream error'); });
    dl.pipe(res);
  } catch (err) {
    console.error('[GET /api/files/:id] Error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
}

module.exports = { uploadFile, serveFile };
