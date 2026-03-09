# Track: Backend Engineering — Phase 7: Advanced API Features — File Uploads (Images, PDFs & Cloud Storage) in Java

File uploads are a cornerstone of modern backends. This module dives into building robust, scalable, and secure file upload workflows for images and PDFs, with a strong emphasis on cloud storage (S3) and real-world constraints like large-file handling, metadata, security, and observability. You’ll learn to validate inputs, stream data to cloud storage, generate access URLs (including presigned URLs), and design storage abstractions that scale across environments.

## 1. Basic File Upload Endpoint (Spring Boot) — Local disk as first-pass

A simple, idiomatic way to begin is to accept a MultipartFile in a Spring Boot controller and persist it to the local filesystem. This establishes the request handling, validation hooks, and a reusable response format before moving to cloud storage.

```java
package com.example.filesystem;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    private static final Path STORAGE = Paths.get("uploads");

    @PostMapping("/upload")
    public ResponseEntity<FileResponse> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Create storage directory if missing
        Files.createDirectories(STORAGE);

        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null && originalName.contains(".")) {
            extension = originalName.substring(originalName.lastIndexOf('.') + 1);
        }

        String id = UUID.randomUUID().toString();
        String filename = id + (extension.isEmpty() ? "" : "." + extension);
        Path destination = STORAGE.resolve(filename);

        // Save to disk (streaming, not loading entire file in memory)
        file.transferTo(destination.toFile());

        String url = "/uploads/" + filename; // Simple local URL representation
        FileResponse response = new FileResponse(id, originalName, destination.toString(),
                file.getSize(), file.getContentType(), url);

        return ResponseEntity.ok(response);
    }
}

class FileResponse {
    private String id;
    private String originalName;
    private String path;
    private long size;
    private String mimeType;
    private String url;

    // constructor, getters, and setters omitted for brevity

    public FileResponse(String id, String originalName, String path, long size, String mimeType, String url) {
        this.id = id;
        this.originalName = originalName;
        this.path = path;
        this.size = size;
        this.mimeType = mimeType;
        this.url = url;
    }

    // getters
    public String getId() { return id; }
    public String getOriginalName() { return originalName; }
    public String getPath() { return path; }
    public long getSize() { return size; }
    public String getMimeType() { return mimeType; }
    public String getUrl() { return url; }
}
```

### Line-by-line explanation
- Define a REST controller at /api/files with a POST /upload endpoint.
- Validate that the file is not empty; early return for invalid input.
- Ensure a local storage directory exists (uploads).
- Derive a unique id and preserve the original file extension for readability.
- Save the incoming file to disk using transferTo, which streams data rather than loading the entire file into memory.
- Build a simple response object containing id, original name, storage path, size, mime type, and a URL that points to the stored resource.
- Return 200 OK with the FileResponse payload.

## 2. Validation, Metadata, and Optional Thumbnail Generation

Before persisting uploads, validate content types, size limits, and optionally generate thumbnails for images. This reduces downstream issues and helps enforce policy at the API boundary.

Code block 1: Content type and size validation
```java
package com.example.filesystem;

import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

public class FileValidator {
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "application/pdf"
    );
    private static final long MAX_BYTES = 10L * 1024 * 1024; // 10 MB

    public static boolean isAllowed(MultipartFile file) {
        if (file == null || file.isEmpty()) return false;
        String type = file.getContentType();
        return type != null && ALLOWED_TYPES.contains(type) && file.getSize() <= MAX_BYTES;
    }

    public static long maxBytesAllowed() { return MAX_BYTES; }
}
```

Code block 2: Optional thumbnail generation (Images only)
```java
package com.example.filesystem;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class ThumbnailUtil {
    public static byte[] createThumbnail(MultipartFile image, int width, int height) throws Exception {
        try (InputStream in = image.getInputStream();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Thumbnails.of(in)
                    .size(width, height)
                    .outputFormat("jpg")
                    .toOutputStream(out);

            return out.toByteArray();
        }
    }
}
```

### Line-by-line explanation (Validation)
- FileValidator defines an allowlist of MIME types and a max file size for general policy.
- isAllowed returns false when the file is null, empty, or whose type/size violates policy.
- maxBytesAllowed exposes the configured maximum for reuse in controllers.
- ThumbnailUtil uses Thumbnailator to read the input image stream, scale it, and write a new byte array for the thumbnail.

### Line-by-line explanation (Thumbnail)
- ThumbnailUtil.createThumbnail reads the input image stream, creates a thumbnail at the target size, and returns the thumbnail bytes for further processing (e.g., store or return as a separate asset).

Note: Add Thumbnailator to your build (for example, Maven: net.coobird:thumbnailator:0.4.14).

## 3. AWS S3 Upload — Java SDK v2

Moving to cloud storage, implement a storage service that writes files to S3. We’ll show a clean abstraction and a concrete S3 implementation, including metadata and presigned URL generation for secure access.

Code block: FileStorageService interface and S3-based implementation
```java
package com.example.filesystem;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;

public interface FileStorageService {
    FileRecord store(MultipartFile file) throws IOException;
    String generatePresignedUrl(String fileId, Duration expiry) throws IOException;
}

class FileRecord {
    private final String id;
    private final String originalName;
    private final String s3Key;
    private final long size;
    private final String mimeType;

    public FileRecord(String id, String originalName, String s3Key, long size, String mimeType) {
        this.id = id;
        this.originalName = originalName;
        this.s3Key = s3Key;
        this.size = size;
        this.mimeType = mimeType;
    }

    // getters
    public String getId() { return id; }
    public String getOriginalName() { return originalName; }
    public String getS3Key() { return s3Key; }
    public long getSize() { return size; }
    public String getMimeType() { return mimeType; }
}
```

Code block: S3FileStorageService (AWS SDK v2)
```java
package com.example.filesystem;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;
import java.time.Duration;

public class S3FileStorageService implements FileStorageService {

    private final S3Client s3;
    private final String bucket;
    private final String regionName;

    public S3FileStorageService(Region region, String bucket) {
        this.regionName = region.id();
        this.bucket = bucket;
        this.s3 = S3Client.builder().region(region).build();
    }

    @Override
    public FileRecord store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        String id = UUID.randomUUID().toString();
        String key = "uploads/" + id + "/" + file.getOriginalFilename();

        PutObjectRequest put = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(file.getContentType())
                .build();

        // Stream the upload to S3 to avoid buffering the whole file in memory
        s3.putObject(put, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        return new FileRecord(id, file.getOriginalFilename(), key, file.getSize(), file.getContentType());
    }

    @Override
    public String generatePresignedUrl(String fileId, Duration expiry) {
        // For simplicity, assume you can reconstruct the S3 key from ID in a real app:
        String key = "uploads/" + fileId + "/{original-filename}"; // replace with actual mapping in production

        GetObjectRequest get = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        S3Presigner presigner = S3Presigner.builder().region(software.amazon.awssdk.regions.Region.of(regionName)).build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiry)
                .getObjectRequest(get)
                .build();

        PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);
        return presigned.url().toString();
    }
}
```

Important notes:
- The store method streams from MultipartFile.getInputStream() directly to S3, avoiding large byte[] allocations in memory.
- The presigned URL logic demonstrates a secure, time-bound access mechanism for private buckets. In production, you’ll likely store the mapping of file IDs to S3 keys in a database and derive the key deterministically from the ID.
- Dependency hints (Maven): software.amazon.awssdk:s3 and related presigner libraries.

### Line-by-line explanation (S3 storage)
- S3FileStorageService implements FileStorageService, enabling a pluggable storage backend.
- The constructor wires region, bucket, and creates an S3Client.
- store validates input, generates a unique key, and builds a PutObjectRequest with the bucket, key, and content type.
- The PutObjectRequest is executed with a streaming RequestBody derived from the file input stream, enabling large-file uploads without buffering in memory.
- The returned FileRecord captures essential metadata for downstream usage (id, original name, S3 key, size, mime type).
- generatePresignedUrl builds a GetObjectRequest for the given key and uses a Presigner to produce a time-limited URL for secure access.

## 4. Security and Reliability — input validation, streaming, and resilience

Production-grade APIs require strict validation, streaming data rather than consuming memory, and robust handling of transient failures. The following practices demonstrate a minimal but practical approach in Java with Spring Boot.

Code block: Validation in controller, and streaming upload to S3
```java
package com.example.filesystem;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;

@RestController
@RequestMapping("/api/files")
public class SecureUploadController {

    private final FileStorageService storage;

    public SecureUploadController() {
        // In real apps, inject via constructor and configure via Spring
        this.storage = new S3FileStorageService(software.amazon.awssdk.regions.Region.US_EAST_1, "my-bucket");
    }

    @PostMapping("/secure-upload")
    public ResponseEntity<?> uploadSecure(@RequestParam("file") MultipartFile file) {
        try {
            // Validation: content type + size
            if (!FileValidator.isAllowed(file)) {
                return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                        .body("Unsupported content type or size too large.");
            }

            // Stream to storage (avoids loading entire file in memory)
            FileRecord rec = storage.store(file);

            // Example: return stored metadata
            return ResponseEntity.ok(rec);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Upload failed: " + e.getMessage());
        }
    }

    @GetMapping("/secure-url/{id}")
    public ResponseEntity<?> presign(@PathVariable("id") String id) {
        try {
            String url = storage.generatePresignedUrl(id, Duration.ofHours(4));
            return ResponseEntity.ok(url);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Could not generate URL: " + e.getMessage());
        }
    }
}
```

### Line-by-line explanation
- SecureUploadController exposes an endpoint that uses FileValidator to enforce policy before storing.
- The upload method returns a 415 error for unsupported types or a 413-like behavior for too-large files.
- Upload handling uses storage.store(file) to leverage streaming and backend abstraction.
- The presign endpoint demonstrates generating a time-limited URL for private access, which is essential for secure delivery.

## 5. Why This Matters In Real Systems — production context and real usage

- Performance: Streaming uploads to cloud storage avoids OOM conditions and scales with file size. Use chunked or multipart uploads for very large files.
- Security: Validate MIME types, enforce size limits, and prefer presigned URLs for private buckets instead of public buckets. Integrate authentication (Spring Security) and per-user access controls.
- Reliability: Rely on cloud storage retry semantics and implement idempotent endpoints. Consider id-based deduplication, and store metadata (filename, size, mimeType, storage key) in a durable store (DB) for auditability.
- Observability: Add metrics (latency, success rate, error rates), structured logs for file IDs, and tracing for upload flows. Use CloudWatch/Prometheus/Grafana combos in production.
- Compliance and lifecycles: Use S3 versioning, lifecycle rules for old files, and encryption at rest (SSE-S3 or SSE-KMS). Ensure audit logging and data retention policies align with regulatory requirements.
- Multi-environment readiness: Abstract storage behind interfaces so you can switch from LocalDisk to S3 (or to alternative providers) with minimal code changes.

Key production considerations:
- Use idempotent upload operations and handle duplicate IDs gracefully.
- Validate and sanitize file names to avoid path traversal vulnerabilities.
- Encrypt sensitive data in transit (HTTPS) and at rest (bucket encryption).
- Implement rate limiting and authentication for upload endpoints to avoid abuse.
- Provide clear error messages and retry guidance without exposing internal stack traces.

## 6. Study Questions — 5 recall questions

1. Why is streaming the upload data to cloud storage preferable to loading the entire file into memory?
2. What are presigned URLs, and why would you use them for private S3 buckets?
3. Name at least two validation checks you should perform on file uploads in a backend API.
4. How can you support large-file uploads efficiently in AWS S3? Briefly describe the concept.
5. What production concerns are addressed by storing upload metadata separately from the file itself?

## 7. Exercise — practical multi-part coding challenge

Goal: Build a small Spring Boot service that accepts image and PDF uploads, stores them in S3, and serves time-limited access URLs. You’ll implement a clean storage abstraction, input validation, and a simple in-memory metadata store to map IDs to S3 keys.

Part A — Project setup
- Create a Spring Boot application (2.x/3.x) with the following dependencies:
  - spring-boot-starter-web
  - spring-boot-starter-validation (optional for bean validations)
  - aws sdk v2 S3
  - thumbnailator (optional, for image thumbnails)
- Configure an AWS region and a bucket name (use a test bucket in a non-production account).

Part B — Storage abstraction
- Implement FileStorageService (as shown in section 3) with:
  - store(MultipartFile) -> FileRecord
  - generatePresignedUrl(String fileId, Duration expiry) -> String
- Implement a simple in-memory metadata repository:
  - Map<String, FileRecord> idToRecord

Part C — API endpoints
- POST /api/files/upload
  - Accepts MultipartFile "file"
  - Validates MIME type (image/jpeg, image/png, image/gif, application/pdf) and max size (e.g., 10 MB)
  - Streams to S3 via your FileStorageService
  - Stores metadata in the in-memory repository
  - Returns a JSON with id, originalName, size, mimeType, and a presigned URL for access (resolve immediately or via a separate endpoint)
- GET /api/files/{id}/download
  - Returns a presigned URL (or redirects) to access the file in S3
  - If the id is unknown, return 404

Part D — Security and validation
- Add basic Spring Security to require authentication for upload and presigned URL access (you can use a simple in-memory user for testing).
- Ensure that only whitelisted content types are accepted and that oversized files are rejected with a 400/413 response.

Part E — Optional enhancements (optional, extra credit)
- Implement server-side thumbnail generation for images and store the thumbnail as a separate S3 object (under thumbnails/).
- Add a unit/integration test that mocks S3 or uses a localstack-like environment to test the upload workflow.
- Add metrics for upload latency and success rate.

Delivery notes:
- Provide clear README instructions for setup, including how to run locally, where to configure AWS credentials, and how to test the endpoints with curl or HTTP clients.
- Include example cURL commands for uploading a small image and obtaining a presigned URL.
- Include a short diagram in your notes showing the flow: Client -> API -> S3 -> (Presigned URL) -> Client.

This concludes the module on File Uploads — Images, PDFs & Cloud Storage in Java. The material blends practical Spring Boot patterns, AWS S3 integration with streaming, validation best practices, and production-oriented considerations to prepare you for real-world systems.