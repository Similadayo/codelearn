# File Uploads — Images, PDFs & Cloud Storage

Back-end file uploads are a core capability in modern systems. Getting this right matters for performance, security, compliance, and user experience. This lesson explores advanced API features for uploading images and PDFs from a Node.js backend, including server-side processing, cloud storage integration, streaming large files, and client-side presigned URLs. By the end, you’ll have a solid, production-ready approach to handling binary uploads with validation, transformation, and robust workflows.

## 1. Server-side Uploads to Cloud Storage (Images & PDFs) with Multer + AWS S3

This section demonstrates a typical server-side flow: accept a file via multipart/form-data, validate type and size, optionally process images (resize), and upload to S3. It supports images (jpeg/png/webp) and PDFs, stores a processed image version, and returns a public URL.

```js
// 1. Server-side Uploads to Cloud Storage (Images & PDFs) with Multer + AWS S3
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();

// S3 client
const s3 = new S3Client({ region: process.env.S3_REGION });

// Allowed mime types
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Multer: store in memory so we can process/stream before uploading
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'), false);
  },
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // Destination key (folder based on type)
    const ext = path.extname(file.originalname) || '';
    const base = crypto.randomBytes(16).toString('hex');
    const folder = file.mimetype.startsWith('image/') ? 'images' : 'docs';
    const key = `${folder}/${Date.now()}-${base}${ext}`;

    // If image, resize; otherwise, keep original
    let bodyBuffer = file.buffer;
    let contentType = file.mimetype;
    if (file.mimetype.startsWith('image/')) {
      bodyBuffer = await sharp(file.buffer)
        .resize({ width: 1024, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      contentType = 'image/jpeg';
    }

    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: bodyBuffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await s3.send(cmd);

    const url = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
    res.json({ ok: true, url, key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Server started'));
```

### Line-by-line explanation
- Line 1-4: Import required modules (Express, Multer for multipart parsing, Sharp for image processing, AWS S3 client, crypto for unique keys, path for extension extraction).
- Line 6-9: Initialize Express app and AWS S3 client with region from environment.
- Line 11-13: Define allowed MIME types to enforce accepted formats (images and PDFs).
- Line 15-21: Configure Multer to keep files in memory, enforce a 50 MB limit, and filter by allowed types.
- Line 23-41: Define the /upload route:
  - Line 25: Retrieve the uploaded file.
  - Line 26-28: Validate that a file exists; return 400 if not.
  - Line 31-34: Compute a destination key: choose folder based on type, create a random base, and preserve the file extension.
  - Line 37-42: If an image, resize to a max width of 1024px, convert to JPEG, update content type; otherwise keep the original buffer and MIME type.
  - Line 44-50: Upload to S3 with public-read access, using the calculated key and content type.
  - Line 52-53: Build and return the public URL and key.
- Line 55-57: Start the server.

## 2. Presigned URLs for Client-Side Uploads (Direct-to-S3)

Presigned URLs let clients upload directly to cloud storage without routing large payloads through your server. This reduces server load and speeds up client uploads. This section shows generating a time-limited presigned URL for a PutObject operation and returning the key to the client.

```js
// 2. Presigned URLs for Client-Side Uploads (Direct-to-S3)
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const express = require('express');
require('dotenv').config();

const app = express();
const s3 = new S3Client({ region: process.env.S3_REGION });

app.get('/signed-upload', async (req, res) => {
  const { fileName, contentType } = req.query;
  if (!fileName || !contentType) {
    return res.status(400).json({ error: 'Missing fileName or contentType' });
  }

  // Client-provided name; we generate a safe key on the server
  const key = `uploads/${Date.now()}-${path.basename(fileName)}`;

  try {
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 }); // 1 hour
    res.json({ url, key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not generate signed URL' });
  }
});

app.listen(process.env.PORT || 3001, () => console.log('Signed URL server running'));
```

### Line-by-line explanation
- Line 1-3: Import path utility, AWS S3 client, and presigner utility; set up Express.
- Line 5-9: Initialize Express app and S3 client using environment config.
- Line 11-21: Define /signed-upload route that accepts query params fileName and contentType.
- Line 13-16: Validate input; return 400 if missing.
- Line 19: Generate a server-side safe object key using a timestamp and the base file name.
- Line 21-28: Build a PutObjectCommand with Bucket, Key, and ContentType (no Body here; the presigner will accept this for upload).
- Line 30-32: Create a presigned URL valid for 1 hour and return it along with the key to the client.
- Line 34-36: Error handling and server start.

## 3. Streaming Large Files to Cloud Storage (Busboy + S3)

For large uploads, streaming avoids buffering the entire file in memory. This section shows how to parse a streaming multipart request with Busboy and pipe the file stream directly to S3 using a PassThrough stream.

```js
// 3. Streaming Large Files to Cloud Storage (Busboy + S3)
const Busboy = require('busboy');
const { PassThrough } = require('stream');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
const s3 = new S3Client({ region: process.env.S3_REGION });
const bucket = process.env.S3_BUCKET;

app.post('/upload-large', (req, res) => {
  const busboy = new Busboy({ headers: req.headers, limits: { files: 1, fileSize: 1024 * 1024 * 1024 } });

  let fileKey;

  busboy.on('file', (fieldname, fileStream, filename, encoding, mimeType) => {
    const ext = path.extname(filename) || '';
    const base = crypto.randomBytes(16).toString('hex');
    fileKey = `uploads/large/${Date.now()}-${base}${ext}`;

    const pass = new PassThrough();

    // Pipe incoming file stream to a PassThrough, which S3 can consume as Body
    fileStream.pipe(pass);

    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      Body: pass,
      ContentType: mimeType,
    });

    s3.send(cmd).catch(err => {
      console.error('S3 upload error', err);
    });
  });

  busboy.on('finish', () => {
    res.json({ ok: true, key: fileKey || null });
  });

  req.pipe(busboy);
});
```

### Line-by-line explanation
- Line 1-5: Import Busboy for streaming multipart parsing, PassThrough for streaming data to S3, AWS S3 client, crypto and path utilities.
- Line 7-12: Initialize Express and S3 client; define the bucket name from environment.
- Line 14-31: Define the /upload-large route and configure Busboy with a 1 GB file size limit.
  - Line 19-26: On file event, construct a safe S3 key using timestamp and random bytes, initialize a PassThrough stream, and pipe the incoming file stream into it.
  - Line 28-34: Create an S3 PutObjectCommand that uses the PassThrough stream as the Body; set ContentType to the detected MIME type.
  - Line 36: Push the upload to S3; log errors if they occur.
- Line 40-42: When Busboy finishes, respond with the uploaded key.
- Line 44: Start the route server.

## 4. Security, Validation, and Observability

Security and correctness hinge on validating file content, not just extensions, and adding observability around uploads. This section shows validating by file signature, enforcing strict MIME checks, and enriching metadata for later auditing.

```js
// 4. Security, Validation, and Observability
const FileType = require('file-type');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const express = require('express');
const multer = require('multer');
require('dotenv').config();

const app = express();
const s3 = new S3Client({ region: process.env.S3_REGION });

// Use memory storage to inspect file contents
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

app.post('/upload-secure', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file' });

  // Determine type by magic bytes
  const type = await FileType.fromBuffer(file.buffer);
  if (!type || !allowed.includes(type.mime)) {
    return res.status(400).json({ error: 'Unsupported or undetermined file type' });
  }

  // Optional: additional validation (e.g., PDF version, image dimensions)
  const key = `secure/${Date.now()}-${Math.random().toString(36).slice(2)}${type.ext || ''}`;

  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: type.mime,
    Metadata: {
      uploadedBy: 'backend-service',
      app: 'file-upload-secure',
    },
  });

  try {
    await s3.send(cmd);
    const url = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
    res.json({ ok: true, url, key });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Secure upload failed' });
  }
});
```

### Line-by-line explanation
- Line 1-6: Import a file-type detector to validate based on file signature, AWS S3 client, Express, and Multer for in-memory upload.
- Line 8-12: Initialize Express and S3 client with region from env.
- Line 15-18: Set up Multer to store in memory with a 50 MB limit; this allows content inspection before storage.
- Line 20-21: Define allowed MIME types to enforce.
- Line 23-38: Define /upload-secure route:
  - Line 24: Retrieve uploaded file.
  - Line 25-27: Return 400 if no file.
  - Line 30-32: Detect MIME type via file signature; reject if undetermined or disallowed.
  - Line 35: Create a safe S3 key with a timestamp and the detected extension.
  - Line 37-44: Upload to S3 with metadata for observability.
  - Line 46-53: On success, return the public URL; on error, respond with 500.
- Line 55: Server continues running.

## 5. Versioning, Metadata, and Access Control

Production-grade storage often requires object versioning, rich metadata, and explicit access control. This section demonstrates enabling metadata and tagging at upload-time and notes on enabling bucket versioning for safe recovery.

```js
// 5. Versioning, Metadata, and Access Control
const { PutObjectCommand, PutBucketVersioningCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3 = new (require('@aws-sdk/client-s3').S3Client)({ region: process.env.S3_REGION });

// Ensure bucket versioning is enabled (one-time setup, usually via CLI/console)
async function enableVersioning(bucket) {
  const { PutBucketVersioningCommand } = require('@aws-sdk/client-s3');
  // This is a one-time operation to enable versioning on the bucket
  // You can run it separately; included here for completeness
  // await s3.send(new PutBucketVersioningCommand({ Bucket: bucket, VersioningConfiguration: { Status: 'Enabled' } }));
}

// Example upload with metadata and tagging
async function uploadWithMetadata(buffer, key, mimeType) {
  const cmd = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: { uploadedBy: 'backend-service', app: 'file-upload' },
    Tagging: 'project=backend&env=prod', // optional tagging
  });
  await s3.send(cmd);
}

// usage example
// await uploadWithMetadata(someBuffer, 'images/12345.jpg', 'image/jpeg');
```

### Line-by-line explanation
- Line 1-6: Import PutObjectCommand and PutBucketVersioningCommand for object upload and optional bucket versioning configuration.
- Line 8-12: Initialize S3 client using environment configuration.
- Line 14-23: Define a function to enable versioning for a bucket (commented as a one-time setup; can be run separately).
- Line 26-34: Define a helper function uploadWithMetadata to upload a buffer with metadata and tagging:
  - Line 28-34: Build a PutObjectCommand with Bucket, Key, Body, and ContentType, plus Metadata and Tagging.
  - Line 35: Execute the command to upload.
- Line 38-39: Example usage commented: call uploadWithMetadata with your buffer, destination key, and MIME type.

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Trusting file extensions instead of MIME type for validation
  - Bad:
    ```
    // BAD: validation by extension only
    function isAllowed(filename) {
      const ext = filename.split('.').pop();
      return ['jpg','png','pdf'].includes(ext);
    }
    ```
  - Good:
    ```
    // GOOD: validate by content/type, not just extension
    const FileType = require('file-type');
    async function isAllowedBuffer(buf) {
      const type = await FileType.fromBuffer(buf);
      return type && ['image/jpeg','image/png','image/webp','application/pdf'].includes(type.mime);
    }
    ```
- Pitfall 2: Buffering large uploads in memory without streaming
  - Bad:
    ```
    // BAD: buffering entire file in memory
    app.post('/upload', upload.single('file'), (req, res) => {
      const data = req.file.buffer; // could be huge
      // upload to cloud storage
    });
    ```
  - Good:
    ```
    // GOOD: streaming to S3 or disk; avoid memory pressure
    app.post('/upload-large', (req, res) => {
      // Use Busboy or a streaming pipeline to push data directly to storage
    });
    ```
- Pitfall 3: Not setting safe access controls or metadata
  - Bad:
    ```
    // BAD: public-read by default with no metadata
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer }));
    ```
  - Good:
    ```
    // GOOD: explicit ACL and useful metadata
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'private',
      Metadata: { uploadedBy: 'backend', app: 'file-upload' }
    }));
    ```
- Pitfall 4: Ignoring large file resuming and retry handling
  - Bad:
    ```
    // BAD: single PUT without retry/backoff
    await s3.send(new PutObjectCommand({ Bucket, Key, Body: buffer }));
    ```
  - Good:
    ```
    // GOOD: implement retries with exponential backoff on transient errors, consider multipart upload for large files
    // (e.g., AWS SDK V3 with managed uploader or custom retry logic)
    ```
- Pitfall 5: Skipping security scans
  - Bad:
    ```
    // BAD: omit content scanning
    // upload is accepted as-is
    ```
  - Good:
    ```
    // GOOD: integrate antivirus scanning before storage (e.g., ClamAV) and reject threats
    // const cleanBuffer = await scanBufferForViruses(buffer);
    // if (!cleanBuffer) throw new Error('Virus detected');
    ```

Why This Matters In Real Systems

- Performance and scale: Streaming and presigned URLs reduce server load, latency, and memory pressure, enabling large-scale file uploads with predictable costs.
- Security: Validating content, enforcing mime-types, limiting sizes, and avoiding trust in file names prevents a broad class of attacks (malicious file upload, path traversal, etc.).
- Reliability and observability: Metadata, tagging, and versioning provide audit trails, backups, and access control, which are critical for compliance and incident response.
- UX and cost: Direct-to-cloud uploads via presigned URLs or streaming reduce bandwidth costs and improve user experience, especially on slow networks or mobile.

Y. Study Questions — 5 recall questions

1) What is the advantage of using Multer memoryStorage for the initial file upload stage, and when might you prefer diskStorage instead?  
2) How do presigned URLs work, and what are the typical security considerations when using them for client-side uploads?  
3) Why is validating file type on the server using content-based detection (e.g., file-type) more secure than relying on file extensions?  
4) How can you handle very large file uploads to avoid buffering the entire file in memory? Name at least two approaches.  
5) What metadata and tagging options exist on S3 objects, and how can they help with observability and governance in production?

Exercise — a practical multi-part coding challenge

Part A: Implement server-side upload to S3 for images and PDFs
- Build an Express endpoint POST /upload that accepts a single file field named file.
- Validate file types (image/jpeg, image/png, image/webp, application/pdf) and limit size to 50 MB.
- If the file is an image, resize to a maximum width of 1024px (keep aspect ratio) and convert to JPEG.
- Upload the resulting file to S3 with public-read ACL, and return the public URL and key.
- Use memory storage for Multer and ensure proper error handling and user-friendly responses.

Part B: Implement presigned URL generation for client-side uploads
- Build GET /signed-upload that accepts query params fileName and contentType.
- Generate a presigned URL for a PutObject operation and return the URL and the target key.
- Ensure the URL expires within a reasonable window (e.g., 15–60 minutes) and that invalid inputs are rejected.

Part C: Implement streaming large file uploads
- Build POST /upload-large that uses Busboy to stream a single file field to S3 without buffering the full file in memory.
- Return the S3 key of the uploaded object on success.
- Include a small note about handling multiple files in a stream-safe way (e.g., rejecting after first file, or buffering multiple streams if required).

Part D: Add basic security checks and metadata
- Extend Part A to validate the file type via content inspection (e.g., using file-type) and reject mismatches.
- Attach meaningful metadata to the S3 object (e.g., uploadedBy, app) and demonstrate how to add a couple of tags.
- Ensure you run with proper environment configuration for S3 (region, bucket).

Part E: Quick QA checklist
- Verify that invalid file types return 400 with a helpful error message.
- Verify that image uploads are correctly resized and stored as JPEG in S3.
- Verify that presigned URLs allow upload without your server acting as a middleman.
- Verify that large file streaming uploads complete and return the correct S3 key.

Deliverable: Provide a single cohesive codebase snippet per Part (A–C) and a short integration guide describing how to wire them together in a real project, including environment variable requirements, dependencies, and a quick start script.