# File Uploads — Images, PDFs & Cloud Storage (PHP)

In modern backend services, allowing users to upload files—images, PDFs, and other documents—is a common requirement. A robust upload feature must validate content, enforce size and type restrictions, securely store files (locally or in cloud storage), and scale under load while protecting the system from abuse. This lesson covers end-to-end patterns in PHP for handling image and PDF uploads, validating content, saving to local storage, integrating with cloud storage (S3), and designing resilient APIs suitable for production systems.

## 1. Upload Basics: Handling Multipart Form Data in PHP

This section demonstrates a straightforward PHP endpoint that accepts a single file, validates basic constraints, and stores it on disk with a safe, unique filename.

```php
<?php
// config
$uploadDir = __DIR__ . '/uploads';
$maxSize = 5 * 1024 * 1024; // 5MB
$allowedMime = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
];

// ensure upload directory exists
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create upload directory.']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or upload error.']);
    exit;
}

$file = $_FILES['file'];

// size check
if ($file['size'] > $maxSize) {
    http_response_code(413);
    echo json_encode(['error' => 'File is too large.']);
    exit;
}

// mime check using fileinfo
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
if (!in_array($mime, $allowedMime, true)) {
    http_response_code(415);
    echo json_encode(['error' => 'Unsupported file type.']);
    exit;
}

// for images, ensure actual image data (extra safety)
if (preg_match('/^image\//', $mime)) {
    $imageInfo = getimagesize($file['tmp_name']);
    if ($imageInfo === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid image file.']);
        exit;
    }
}

// sanitize and generate a safe, unique filename
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$ext = $ext ?: 'bin';
$name = bin2hex(random_bytes(16)) . '.' . strtolower($ext);

// prevent path traversal
$name = basename($name);

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}
$dest = $uploadDir . '/' . $name;

// move into place
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save uploaded file.']);
    exit;
}

// success response
echo json_encode([
    'success' => true,
    'filename' => $name,
    'path' => $dest,
    'mime' => $mime
]);
```

### Line-by-line explanation breaking down each line

- // config
- $uploadDir = __DIR__ . '/uploads';
  - Sets the target directory for uploaded files, based on the script’s directory.
- $maxSize = 5 * 1024 * 1024; // 5MB
  - Defines the maximum accepted file size (5 megabytes).
- $allowedMime = [ ... ];
  - Lists MIME types allowed for upload to enforce content-type constraints.
- if (!is_dir($uploadDir)) { … }
  - Creates the uploads directory if it does not exist, with proper permissions.
- http_response_code(500) / json_encode(['error'=>...])
  - Returns an error response if directory creation fails.
- if ($_SERVER['REQUEST_METHOD'] !== 'POST') { … }
  - Ensures the endpoint is accessed via POST.
- if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) { … }
  - Validates that a file was uploaded without PHP-level errors.
- $file = $_FILES['file'];
  - Assigns the uploaded file details to a variable for readability.
- if ($file['size'] > $maxSize) { … }
  - Enforces the maximum file size limit and returns an error if exceeded.
- $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->file($file['tmp_name']);
  - Uses PHP’s fileinfo to detect the actual MIME type of the uploaded file (not trusting client-provided type).
- if (!in_array($mime, $allowedMime, true)) { … }
  - Validates the detected MIME against the allowed set.
- if (preg_match('/^image\//', $mime)) { $imageInfo = getimagesize($file['tmp_name']); … }
  - If the file is an image, performs an additional integrity check using getimagesize to ensure it’s a valid image.
- $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
  - Extracts the original file extension for use in the new filename.
- $name = bin2hex(random_bytes(16)) . '.' . strtolower($ext);
  - Generates a cryptographically secure random filename to avoid collisions and exposure of original names.
- $name = basename($name);
  - Sanitizes the filename to remove any path components.
- if (!move_uploaded_file($file['tmp_name'], $dest)) { … }
  - Moves the uploaded file from its temporary location to the final destination; reports any failure.
- echo json_encode([ 'success'=>true, 'filename'=>$name, 'path'=>$dest, 'mime'=>$mime ]);
  - Returns a JSON payload confirming success and details about the stored file.

## 2. Validating Images and PDFs: Security & Integrity

A robust upload path validates content not only by MIME but by inspecting actual content, supports PDFs and images, and enforces additional checks like image dimensions and PDF structure. This minimizes risk from spoofed content and ensures downstream processing can rely on consistent inputs.

```php
<?php
// config
$allowed = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/gif'  => 'gif',
    'application/pdf' => 'pdf'
];
$maxSize = 10 * 1024 * 1024; // 10MB
$uploadDir = __DIR__ . '/uploads';

function validateUploadedFile($file, $maxSize, $allowed) {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'Upload error: ' . $file['error']];
    }
    if ($file['size'] > $maxSize) {
        return ['ok' => false, 'error' => 'File too large.'];
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']);
    if (!isset($allowed[$mime])) {
        return ['ok' => false, 'error' => 'Unsupported mime: ' . $mime];
    }

    // additional checks per type
    if (strpos($mime, 'image/') === 0) {
        $imageInfo = getimagesize($file['tmp_name']);
        if ($imageInfo === false) {
            return ['ok' => false, 'error' => 'Invalid image data.'];
        }
        // optional: enforce min/max dimensions
        [$width, $height] = $imageInfo;
        if ($width < 100 || $height < 100) {
            return ['ok' => false, 'error' => 'Image is too small.'];
        }
    }

    if ($mime === 'application/pdf') {
        // basic PDF header check
        $fh = fopen($file['tmp_name'], 'rb');
        if ($fh === false) {
            return ['ok' => false, 'error' => 'Cannot read PDF.'];
        }
        $header = fread($fh, 4);
        fclose($fh);
        if ($header !== '%PDF') {
            return ['ok' => false, 'error' => 'Invalid PDF header.'];
        }
    }

    return ['ok' => true, 'mime' => $mime];
}
```

### Line-by-line explanation breaking down each line

- // config
- $allowed = [ ... ];
  - Maps allowed MIME types to a simple extension map for internal use if needed.
- $maxSize = 10 * 1024 * 1024;
  - Sets the maximum allowed upload size (10MB) for stricter guidelines.
- $uploadDir = __DIR__ . '/uploads';
  - Local storage path for uploads.
- function validateUploadedFile($file, $maxSize, $allowed) { … }
  - Defines a reusable validator that encapsulates common checks.
- if ($file['error'] !== UPLOAD_ERR_OK) { … }
  - Handles the PHP upload error code.
- if ($file['size'] > $maxSize) { … }
  - Enforces the size constraint.
- $finfo = new finfo(FILEINFO_MIME_TYPE); $mime = $finfo->file($file['tmp_name']);
  - Detects the true MIME type using server-side inspection.
- if (!isset($allowed[$mime])) { … }
  - Validates the detected MIME against the allowed set.
- if (strpos($mime, 'image/') === 0) { … }
  - If image, perform additional verification with getimagesize.
- [$width, $height] = $imageInfo;
  - Extracts image dimensions for possible size checks.
- if ($width < 100 || $height < 100) { … }
  - Rejects images that are too small to be real content.
- if ($mime === 'application/pdf') { … }
  - Performs a simple PDF header check to validate structure.
- $fh = fopen($file['tmp_name'], 'rb'); … fclose($fh);
  - Reads the first few bytes to inspect the PDF header safely.
- return ['ok' => true, 'mime' => $mime];
  - Returns the detected MIME for downstream handling.

## 3. Storage Strategies: Local & Cloud

This section contrasts local filesystem storage with cloud storage (Amazon S3). It includes code for both, along with best practices like deterministic/object-based paths, content-type metadata, and access control.

### 3a) Local filesystem storage with safe naming

```php
<?php
// assume prior validation (see Section 1)
$uploadDir = __DIR__ . '/uploads';
$dest = $uploadDir . '/' . basename(bin2hex(random_bytes(16)) . '.jpg');

// ensure dir
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

// move
$src = $_FILES['file']['tmp_name'];
if (!move_uploaded_file($src, $dest)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file.']);
    exit;
}

// response
echo json_encode(['path' => $dest]);
```

### Line-by-line explanation breaking down each line

- $uploadDir = __DIR__ . '/uploads';
  - Local storage path for uploaded files.
- $dest = $uploadDir . '/' . basename(bin2hex(random_bytes(16)) . '.jpg');
  - Creates a fully randomized filename to prevent collisions and obscure original names; forces a .jpg extension for demonstration.
- if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
  - Ensures the uploads directory exists with safe permissions.
- $src = $_FILES['file']['tmp_name'];
  - References the uploaded file’s temporary path.
- if (!move_uploaded_file($src, $dest)) { … }
  - Moves the file atomically to its final path; handles failure gracefully.
- echo json_encode(['path' => $dest]);
  - Returns the final storage path to the client.

### 3b) Cloud storage with AWS S3 (PHP SDK v3)

```php
<?php
require __DIR__ . '/vendor/autoload.php';
use Aws\S3\S3Client;
use Aws\Exception\AwsException;

// initialize client with credentials from env
$s3 = new S3Client([
    'region' => getenv('AWS_REGION') ?: 'us-east-1',
    'version' => 'latest',
    'credentials' => [
        'key'    => getenv('AWS_ACCESS_KEY_ID'),
        'secret' => getenv('AWS_SECRET_ACCESS_KEY'),
    ],
]);

$bucket = getenv('S3_BUCKET') ?: 'my-upload-bucket';
$key = 'uploads/' . basename(bin2hex(random_bytes(16))) . '.jpg';
$path = __DIR__ . '/uploads/placeholder.jpg'; // source file to upload

try {
    $result = $s3->putObject([
        'Bucket' => $bucket,
        'Key' => $key,
        'Body' => fopen($path, 'rb'),
        'ContentType' => 'image/jpeg',
        'ACL' => 'private', // or 'public-read' depending on needs
        'Metadata' => [
            'uploaded-by' => 'api-user',
        ],
    ]);
    $url = $result['ObjectURL'];
    echo json_encode(['url' => $url, 'key' => $key]);
} catch (AwsException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
```

### Line-by-line explanation breaking down each line

- require __DIR__ . '/vendor/autoload.php';
  - Loads the AWS SDK and other dependencies via Composer.
- use Aws\S3\S3Client; use Aws\Exception\AwsException;
  - Imports the classes used for S3 interactions and error handling.
- $s3 = new S3Client([ ... ]);
  - Instantiates the S3 client with region and credentials sourced from environment variables.
- $bucket = getenv('S3_BUCKET') ?: 'my-upload-bucket';
  - Selects the target bucket for storage.
- $key = 'uploads/' . basename(bin2hex(random_bytes(16))) . '.jpg';
  - Creates a unique object key within S3 to avoid collisions.
- $path = __DIR__ . '/uploads/placeholder.jpg';
  - Local file path used as the source for the upload (could be the actual file you validated earlier).
- $result = $s3->putObject([ ... ]);
  - Uploads the file to S3 with metadata and ACL controls.
- $url = $result['ObjectURL'];
  - Retrieves the public URL (for private objects you’d typically generate a presigned URL instead).
- catch (AwsException $e) { … }
  - Catches and reports AWS SDK-specific errors.

## 4. API Design & Efficiency: Handling Multiple Files & Asynchronous Processing

In production, endpoints often support multiple files in a single request, and uploads can trigger asynchronous processing (thumbnails, virus scanning, indexing). This section provides a pattern for batch uploads and a simple queue-based approach for async work.

```php
<?php
// Simple batch upload handler (multiple files under 'files[]')
$uploadDir = __DIR__ . '/uploads';
$maxSize = 8 * 1024 * 1024;
$allowedMime = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'application/pdf' => 'pdf'
];

// assume validation function exists (from Section 2)
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['files'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Provide files[] as multipart.']);
    exit;
}

$results = [];
foreach ($_FILES['files']['tmp_name'] as $idx => $tmp) {
    $name = $_FILES['files']['name'][$idx];
    $size = $_FILES['files']['size'][$idx];
    $error = $_FILES['files']['error'][$idx];

    $file = [
        'tmp_name' => $tmp,
        'name' => $name,
        'size' => $size,
        'error' => $error
    ];

    // reuse validation
    $validation = validateUploadedFile($file, $maxSize, $allowedMime);
    if (!$validation['ok']) {
        $results[] = ['index' => $idx, 'ok' => false, 'error' => $validation['error']];
        continue;
    }

    // determine final path
    $fMime = $validation['mime'];
    $ext = pathinfo($name, PATHINFO_EXTENSION) ?: 'bin';
    $ext = strtolower($ext);
    $destDir = $uploadDir;
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);
    $destName = bin2hex(random_bytes(16)) . '.' . $ext;
    $dest = $destDir . '/' . $destName;

    if (!move_uploaded_file($tmp, $dest)) {
        $results[] = ['index' => $idx, 'ok' => false, 'error' => 'Failed to save.'];
        continue;
    }

    // enqueue a processing job (simple file-based queue here for demonstration)
    $queueDir = __DIR__ . '/queue';
    if (!is_dir($queueDir)) mkdir($queueDir, 0755, true);
    file_put_contents($queueDir . '/job_' . time() . '_' . $destName, json_encode([
        'path' => $dest,
        'mime' => $fMime
    ]));

    $results[] = ['index' => $idx, 'ok' => true, 'path' => $dest];
}

echo json_encode(['results' => $results]);
```

### Line-by-line explanation breaking down each line

- // Simple batch upload handler (multiple files under 'files[]')
- $uploadDir = __DIR__ . '/uploads';
  - Directory for storing uploaded files.
- $maxSize = 8 * 1024 * 1024;
  - Max size per file in the batch.
- $allowedMime = [ ... ];
  - Allowed MIME types and their extensions.
- if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['files'])) { … }
  - Validates the request method and presence of files[].
- $results = [];
  - Collects per-file results for the response.
- foreach ($_FILES['files']['tmp_name'] as $idx => $tmp) { … }
  - Iterates through each uploaded file in the batch.
- $validation = validateUploadedFile($file, $maxSize, $allowedMime);
  - Reuses the centralized validation function from Section 2.
- if (!$validation['ok']) { … }
  - Records validation failures per file.
- $destName = bin2hex(random_bytes(16)) . '.' . $ext;
  - Generates a unique destination filename.
- if (!move_uploaded_file($tmp, $dest)) { … }
  - Persists the file locally.
- // enqueue a processing job
- file_put_contents($queueDir . '/job_' . time() . '_' . $destName, json_encode([ ... ]));
  - Writes a lightweight, file-based queue entry that a separate worker could process (illustrative; in production, consider Redis/RabbitMQ or SQS).
- echo json_encode(['results' => $results]);
  - Returns a structured summary of per-file results.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Trusting client-provided MIME type
  - Bad:
    ```php
    $mime = $_FILES['file']['type']; // not trustworthy
    ```
  - Good:
    ```php
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($_FILES['file']['tmp_name']);
    ```
- Pitfall 2: Saving with user-supplied filename in web-accessible path
  - Bad:
    ```php
    $dest = __DIR__ . '/uploads/' . $_FILES['file']['name'];
    move_uploaded_file($_FILES['file']['tmp_name'], $dest);
    ```
  - Good:
    ```php
    $ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION);
    $destName = bin2hex(random_bytes(16)) . '.' . strtolower($ext);
    $dest = __DIR__ . '/uploads/' . $destName;
    move_uploaded_file($_FILES['file']['tmp_name'], $dest);
    ```
- Pitfall 3: Not validating upload errors or size
  - Bad:
    ```php
    move_uploaded_file($_FILES['file']['tmp_name'], $dest);
    ```
  - Good:
    ```php
    if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) { /* handle error */ }
    if ($_FILES['file']['size'] > $maxSize) { /* reject */ }
    ```
- Pitfall 4: Exposing uploads directory directly via URL
  - Bad:
    - Placing uploads in web root without access control or proper permissions.
  - Good:
    - Store in a non-public path and serve via signed URLs or a controlled endpoint, or place in a protected directory and serve with a backend endpoint that streams files after validation.
- Pitfall 5: Lack of error handling and user feedback in API responses
  - Bad:
    ```php
    echo "OK";
    ```
  - Good:
    ```php
    http_response_code(400);
    echo json_encode(['error' => 'Meaningful error message here.']);
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Security: Validating content types via server-side inspection (fileinfo) and optional deep content checks reduces risk from malicious files. Avoid trusting client-provided MIME types or file extensions alone.
- Reliability: Clear size limits, robust error handling, and unique filenames prevent server overload and naming collisions. Directory permissions (e.g., 0755 for dirs, 0644 for files) reduce risk of accidental execution or leakage.
- Scalability: Decoupling upload from processing (e.g., queue-based workers for thumbnails, virus scanning, indexing) lets the system scale out horizontally. Direct client-to-cloud uploads (presigned URLs) can reduce server load.
- Observability: Return structured JSON responses with status, paths, MIME types, and error messages. Instrument logs for upload sizes, counts, failure rates, and per-user quotas.
- Compliance & governance: For PDFs and documents, consider virus scanning, content policies, and retention rules. Use metadata to enable searchability and audit trails.
- Real-world patterns: 
  - Client uploads to S3 via pre-signed URLs; server issues signed intents and validates before persisting references.
  - Server-side validation ensures only expected content is processed and stored.
  - Post-upload processing workflows enable automated image optimization, thumbnail creation, OCR, or indexing.

## Z. Study Questions — 5 recall questions

1. Why is it insufficient to rely on $_FILES['file']['type'] or the file extension for validating uploads?
2. What PHP functions can you use to verify that an uploaded file is a real image? Provide an example.
3. How would you store uploaded files securely in production to avoid filename collisions and path traversal risks?
4. What are the benefits of using a cloud storage service (like S3) for file uploads, and how do presigned URLs help?
5. Describe a simple approach to decouple upload from processing to improve scalability in a production backend.

## Exercise — a practical multi-part coding challenge

Part A: Build a single-file PHP upload endpoint
- Implement an endpoint that accepts a single file via POST, validates that it is either an image (jpeg/png/gif) or a PDF, enforces a 10MB size limit, stores the file in a non-web-accessible local path, and returns a JSON response with a safe URL or path and the detected MIME type.

Part B: Add batch uploads and basic asynchronous queuing
- Extend the endpoint to support multiple files in one request (files[]). For each file, perform the same validations and save to disk. Create a simple file-based queue (or a Redis-backed queue if available) that stores a small job descriptor for each uploaded file to be processed asynchronously (e.g., for thumbnail generation or indexing).

Part C: Integrate with AWS S3
- Add an optional mode (config flag) to upload files directly to AWS S3 using the PHP AWS SDK v3. The endpoint should:
  - Validate content and size as before.
  - Upload to S3 with appropriate Content-Type and a unique key.
  - Return the S3 ObjectURL (or a presigned URL if you choose to keep objects private).

Part D: Provide a presigned URL endpoint for direct client uploads
- Create an endpoint that, given a desired key prefix and content type, returns a presigned PUT URL that the client can use to upload directly to S3. Ensure the URL expires after a short window (e.g., 15 minutes) and that the backend validates the request for a safe origin and allowed content types.

Part E: Observability and small post-upload processing
- Add basic logging (to a file or syslog) for each upload, including timestamp, user/session, file size, MIME, and destination.
- Implement a tiny post-upload processor (a separate script) that reads the queue and simulates processing (e.g., creating a thumbnail for images) and writes a log entry when done.

Deliverable tip: Provide a single cohesive PHP file for Part A, and separate, clearly labeled files or functions for Part B–E. Include usage instructions in comments at the top of each file and consider security notes (permissions, environment configuration, and error handling) in your README-style guidance.