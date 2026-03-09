# Phase 7 — Advanced API Features: File Uploads — Images, PDFs & Cloud Storage (Go)

File uploads are a foundational capability for modern backends, enabling users to submit media, documents, and assets that drive features from profile pictures to dashboards. In production, uploads must be robust, secure, and scalable: validate types and sizes, stream data to storage without exhausting memory, process images (thumbnails, previews), and integrate with cloud storage providers for durability and global access. This lesson covers end-to-end patterns in Go for uploading images and PDFs, performing basic image processing, and persisting to local disks or cloud storage with a clean, testable design.

## 1. Basic Multipart Uploads and Local Storage

This section covers a production-friendly baseline: handling multipart form uploads securely, streaming to local disk to avoid loading large files into memory, validating content type, and naming files safely.

```go
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const maxUploadSize = 64 << 20 // 64 MB

// sanitizeFileName removes path traversal and normalizes the filename.
func sanitizeFileName(name string) string {
	// Take only the base filename to avoid directory traversal
	base := filepath.Base(name)
	// Replace spaces with underscores and remove potentially problematic chars
	base = strings.ReplaceAll(base, " ", "_")
	return base
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	// Limit total request size to protect against DoS
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// Parse multipart form with a reasonable in-memory window
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "Failed to parse multipart form: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Retrieve the file from form data
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read a small portion to detect content type
	sniff := make([]byte, 512)
	n, _ := file.Read(sniff)
	contentType := http.DetectContentType(sniff[:n])

	// Reset the read pointer to the beginning of the file
	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		http.Error(w, "Failed to seek: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Validate content type against allowed set
	allowed := map[string]bool{
		"image/jpeg":     true,
		"image/png":      true,
		"image/gif":      true,
		"application/pdf": true,
	}
	if !allowed[contentType] {
		http.Error(w, "Unsupported file type: "+contentType, http.StatusBadRequest)
		return
	}

	// Optional: compute a hash for dedupe or naming purposes
	hash := sha256.New()
	tee := io.TeeReader(file, hash)

	// Ensure target directory exists
	destDir := "./uploads"
	_ = os.MkdirAll(destDir, 0755)

	// Create a destination path using a timestamp and sanitized name to ensure uniqueness
	filename := sanitizeFileName(header.Filename)
	destPath := filepath.Join(destDir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), filename))

	// Open destination file
	out, err := os.Create(destPath)
	if err != nil {
		http.Error(w, "Could not create destination file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer out.Close()

	// Copy the file content to destination while computing hash
	written, err := io.Copy(out, tee)
	if err != nil {
		http.Error(w, "Failed to save file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Finalize hash calculation
	sum := hex.EncodeToString(hash.Sum(nil))

	// Return a success response with metadata
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"path": "%s", "size": %d, "content_type": "%s", "hash": "%s"}`,
		destPath, written, contentType, sum)
}

func main() {
	http.HandleFunc("/upload", uploadHandler)
	fmt.Println("Listening on :8080...")
	http.ListenAndServe(":8080", nil)
}
```

### Line-by-line explanation
- import block: pulls in necessary standard library packages for IO, HTTP, hashing, and path handling.
- const maxUploadSize: caps the maximum allowed upload size to 64 MB to prevent abuse.
- sanitizeFileName: ensures a safe filename by stripping directories and normalizing spaces.
- uploadHandler: main HTTP handler for file uploads.
- r.Body = http.MaxBytesReader(...): enforces an upper bound on the request body.
- r.ParseMultipartForm(maxUploadSize): parses the multipart form data, with an in-memory window.
- r.FormFile("file"): retrieves the file data from the form field named "file".
- http.DetectContentType: inspects the first 512 bytes to infer MIME type.
- file.Seek(0, io.SeekStart): resets the reader so we can actually write the full file afterwards.
- allowed map check: ensures only images and PDFs are accepted.
- sha256 hashing: creates a hash of the file content for dedupe or audit purposes.
- destDir and destPath: prepare a safe, unique destination path.
- os.Create and io.Copy: streams the file to disk without loading it all into memory; hash is computed concurrently via TeeReader.
- Sum and response: returns a JSON payload with the storage path, size, content type, and hash.

## 2. Validations and Security: Size, Type, and Basic Scanning

In production, you must validate file size, content type, and consider lightweight malware checks. This section extends the baseline to demonstrate stricter protections and safer defaults, including guard rails and an optional placeholder for antivirus scanning.

```go
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const maxUploadSize = 20 << 20 // 20 MB for uploads per file
var allowedMime = map[string]bool{
	"image/jpeg":     true,
	"image/png":      true,
	"image/gif":      true,
	"application/pdf": true,
}

func antivirusScan(r io.Reader) (bool, error) {
	// Placeholder for real-world integration (e.g., ClamAV, hosted service).
	// You would stream the file contents to the scanner and return cleanliness.
	return true, nil
}

func uploadHandlerSecure(w http.ResponseWriter, r *http.Request) {
	// Enforce max body size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// Parse form
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "Parse error: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File retrieval error: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Detect mime and validate
	buff := make([]byte, 512)
	n, _ := file.Read(buff)
	contentType := http.DetectContentType(buff[:n])
	if !allowedMime[contentType] {
		http.Error(w, "Unsupported content type: "+contentType, http.StatusBadRequest)
		return
	}
	_, _ = file.Seek(0, io.SeekStart)

	// Optional antivirus scan
	clean, err := antivirusScan(file)
	if err != nil || !clean {
		http.Error(w, "File failed security scan", http.StatusForbidden)
		return
	}
	// Reset after scan for actual save
	_, _ = file.Seek(0, io.SeekStart)

	// Reuse previous storage logic (for brevity, not duplicating code)
	destDir := "./uploads_secure"
	_ = os.MkdirAll(destDir, 0755)

	filename := filepath.Base(header.Filename)
	destPath := filepath.Join(destDir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), filename))

	out, err := os.Create(destPath)
	if err != nil {
		http.Error(w, "Cannot create file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer out.Close()

	// Copy file and compute hash
	hash := sha256.New()
	tee := io.TeeReader(file, hash)
	written, err := io.Copy(out, tee)
	if err != nil {
		http.Error(w, "Write error: "+err.Error(), http.StatusInternalServerError)
		return
	}
	sum := hex.EncodeToString(hash.Sum(nil))

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"path": "%s", "size": %d, "content_type": "%s", "hash": "%s"}`,
		destPath, written, contentType, sum)
}

func main() {
	http.HandleFunc("/upload-secure", uploadHandlerSecure)
	fmt.Println("Listening on :8080 (secure)...")
	http.ListenAndServe(":8080", nil)
}
```

### Line-by-line explanation
- antivirusScan: placeholder function illustrating where an antivirus check would be integrated.
- maxUploadSize: lowered to 20 MB to reduce risk surface and memory pressure.
- contentType validation: uses a whitelist to prevent dangerous file types.
- Seek resets: ensures subsequent copy reads from the file start after scanning.
- The remainder mirrors the basic example but with added security checks.

## 3. Image Processing: Thumbnails, Validation, and Safe Presentation

Images often require resizing for previews and thumbnails. This section shows how to validate image-specific constraints (dimensions), generate thumbnails, and store both the original and a derived image.

```go
package main

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"os"

	"github.com/disintegration/imaging"
	"net/http"
	"strings"
)

func isImage(contentType string) bool {
	return strings.HasPrefix(contentType, "image/")
}

func createThumbnail(srcPath, dstPath string, width int) error {
	// Open the source image
	src, err := imaging.Open(srcPath)
	if err != nil {
		return err
	}

	// Create a thumbnail with a fixed width (height auto)
	thumb := imaging.Resize(src, width, 0, imaging.Lanczos)

	// Save the thumbnail in the same format as source
	ext := strings.ToLower(filepath.Ext(srcPath))
	switch ext {
	case ".jpg", ".jpeg":
		return imaging.Save(thumb, dstPath, imaging.JPEGQuality(85))
	case ".png":
		return imaging.Save(thumb, dstPath)
	default:
		// Default to PNG if unknown
		return imaging.Save(thumb, dstPath)
	}
}

func imageUploadHandler(w http.ResponseWriter, r *http.Request) {
	// This assumes the file was already saved to disk as in section 1
	// In a real flow you would chain this after a successful save.
	// For demonstration, we accept a path in query: ?path=/uploads/...
	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "path query param required", http.StatusBadRequest)
		return
	}

	// Ensure it's an image
	// Simple content-type check could be replaced with robust magic detection
	contentType := http.DetectContentType([]byte("preview"))
	_ = contentType // placeholder; rely on prior validation in real flow

	thumbPath := path + "_thumb.png"
	if err := createThumbnail(path, thumbPath, 300); err != nil {
		http.Error(w, "Thumbnail error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "Thumbnail created at %s", thumbPath)
}
```

### Line-by-line explanation
- isImage: helper to confirm the MIME type represents an image.
- createThumbnail: uses the imaging library to resize the image to a specified width, preserving aspect ratio; saves with appropriate format and quality.
- imageUploadHandler: demonstrates how you would trigger thumbnail creation after saving the original. In practice, this would be wired to the upload workflow rather than a separate endpoint.

Note: This section uses the github.com/disintegration/imaging package. To use it, run: go get github.com/disintegration/imaging

## 4. Cloud Storage Integration: Upload to AWS S3 (Go v2)

Cloud storage offloads durability and scalability concerns. This section demonstrates uploading uploaded files to S3 with streaming, then returning a cloud path. It uses AWS SDK for Go v2.

```go
package main

import (
	"context"
	"fmt"
	"io"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type S3Uploader struct {
	Bucket string
	Client *s3.Client
}

func NewS3Uploader(ctx context.Context, bucket string) (*S3Uploader, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &S3Uploader{
		Bucket: bucket,
		Client: s3.NewFromConfig(cfg),
	}, nil
}

func (u *S3Uploader) Save(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error) {
	_, err := u.Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        &u.Bucket,
		Key:           &key,
		Body:          r,
		ContentLength: size,
		ContentType:   &contentType,
		ACL:           types.ObjectCannedACLPrivate,
	})
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("s3://%s/%s", u.Bucket, key), nil
}
```

### Line-by-line explanation
- NewS3Uploader: configures and creates an S3 client using default AWS credentials and region resolution.
- Save: streams the provided reader to S3 using PutObject, including content length and type for proper metadata.
- Returns a cloud path (s3://bucket/key) to be stored in your database or returned to the client.

Usage example (within a larger upload flow) would create an S3Uploader, then call Save with the path and a file reader from the HTTP request.

## 5. Storage Abstraction and Metadata

A production-grade API typically uses a storage abstraction to switch between local disk and cloud storage transparently, and to persist file metadata in a database. This section introduces a minimal Storage interface and a local implementation, plus a simple metadata struct.

```go
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

type Storage interface {
	Save(ctx context.Context, path string, r io.Reader, size int64, contentType string) (string, error)
}

type LocalStorage struct {
	Dir string
}

func (l *LocalStorage) Save(ctx context.Context, path string, r io.Reader, size int64, contentType string) (string, error) {
	if l.Dir == "" {
		l.Dir = "./uploads"
	}
	_ = os.MkdirAll(l.Dir, 0755)
	destPath := filepath.Join(l.Dir, path)
	f, err := os.Create(destPath)
	if err != nil {
		return "", err
	}
	defer f.Close()
	_, err = io.Copy(f, r)
	if err != nil {
		return "", err
	}
	return destPath, nil
}

type FileMeta struct {
	ID          string
	FileName    string
	Size        int64
	ContentType string
	Hash        string
	Location    string
	UploadedAt  time.Time
	UserID      string
}

func computeHashFromReader(r io.Reader) (string, error) {
	h := sha256.New()
	_, err := io.Copy(h, r)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
```

### Line-by-line explanation
- Storage interface: defines a minimal contract for saving a file from an io.Reader with size and content type metadata.
- LocalStorage: a simple filesystem-backed implementation that writes the file to a directory.
- FileMeta: a basic struct for persisting file metadata to a DB (id, name, size, MIME, hash, storage location, etc.).
- computeHashFromReader: utility to compute a SHA-256 hash, useful for deduplication and integrity checks. In real code, you’d combine hashing with streaming write (e.g., via io.TeeReader) so you don’t read the stream twice.

Note: In a real system, you would wire the storage abstraction with a database layer (PostgreSQL, MySQL, or a document store) to persist FileMeta records, alongside event triggers for downstream processing (e.g., thumbnailing, indexing).

## X. Common Beginner Mistakes

- Bad vs Good: attempting to stream large files without a proper limit or streaming to memory.

1) Bad: loading entire file into memory
- Bad
```go
// DO NOT DO THIS
buf, _ := io.ReadAll(file) // loads entire file into memory
destPath := "./uploads/" + header.Filename
os.WriteFile(destPath, buf, 0644)
```
- Good
```go
// Use streaming to disk
out, _ := os.Create(destPath)
defer out.Close()
io.Copy(out, file) // streams directly
```

2) Bad: trusting header.Filename for storage path
- Bad
```go
destPath := "./uploads/" + header.Filename // can contain traversal or invalid chars
```
- Good
```go
destPath := "./uploads/" + fmt.Sprintf("%d_%s", time.Now().UnixNano(), sanitizeFileName(header.Filename))
```

3) Bad: no file type validation
- Bad
```go
// Accept any content
io.Copy(dest, file)
```
- Good
```go
// Validate MIME type before saving
if !allowedMime[contentType] { http.Error(...); return }
```

4) Bad: not enforcing size limits per-request
- Bad
```go
http.ListenAndServe(":8080", http.FileServer(http.Dir("."))) // naive
```
- Good
```go
r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
```

5) Bad: missing TLS for file transfers in production
- Bad
```go
// Over plain HTTP
```
- Good
```text
# Serve behind TLS termination (e.g., with AWS ALB/ELB, or a reverse proxy)
```

## Y. Why This Matters In Real Systems

- Reliability and scale: Streaming saves memory, enabling large-file support without exhausting server RAM.
- Security: Content-type validation, filename sanitization, and per-file limits reduce surface area for attacks like path traversal, script uploads, and DoS.
- Compliance and auditing: Hashing and metadata storage enable deduplication, integrity checks, and traceability for user data.
- Performance and UX: Image processing (thumbnails/previews) improves front-end experience; cloud storage offloads durability, enables CDN-based access, and reduces server load.
- Operational patterns: Separate storage from compute allows you to scale components independently, implement retries, and leverage serverless or containerized workers for background processing (e.g., thumbnails, virus scans).

## Z. Study Questions

1) Why is streaming uploads to disk preferred over loading entire files into memory for large uploads?
2) What are common attack vectors when handling user-uploaded files, and how do MIME-type checks mitigate them?
3) How would you implement a storage abstraction that allows swapping between local storage and S3 without changing business logic?
4) What metadata would you persist for each uploaded file, and why is file hashing useful?
5) How can you automate post-upload processing (thumbnails, indexing) in a production-grade pipeline?

## Exercise

You are building a microservice endpoint for file uploads supporting images and PDFs with local storage and an optional S3 backend. Complete the following multi-part challenge.

Part A: Baseline HTTP server
- Implement an HTTP server with an /upload endpoint that:
  - Accepts multipart form data with a field named "file".
  - Limits uploads to 40 MB each.
  - Validates content type against image/jpeg, image/png, image/gif, and application/pdf.
  - Streams the upload to local disk under uploads/ with a safe, unique filename.
  - Returns a JSON payload containing path, size, content_type, and hash.

Part B: Image thumbnail generation
- Extend the flow to generate a 300px-wide thumbnail for image uploads using github.com/disintegration/imaging.
- Save the thumbnail next to the original with a _thumb suffix and return its path in the response.

Part C: Cloud storage integration (optional)
- Add an optional flag or environment variable (USE_S3=true) to switch to S3 storage.
- Implement a minimal S3Uploader with PutObject as shown in Section 4, and ensure the /upload endpoint stores to S3 when enabled, returning the s3://bucket/key URL.

Part D: Metadata persistence (mock DB)
- Define a FileMeta struct (as shown in Section 5) and a simple in-memory store to persist metadata after a successful upload.
- Return a final response including a minimal metadata JSON object (id, filename, size, hash, location).

Part E: Tests
- Write a basic test that simulates uploading a small PNG, asserts the response contains a path and a hash, and verifies the file exists on disk (or in S3 if USE_S3 is true).

Deliverables
- A single Go file (or a small module) implementing Parts A–D with clean separation of concerns (handler, storage, metadata).
- A go.mod file listing dependencies (including github.com/disintegration/imaging if used).
- A README fragment explaining how to run the server, how to enable S3, and how to run tests.

Notes
- If you cannot run tests that reach AWS in your environment, implement Part C with a stubbed S3 client or a fake in-memory bucket for demonstration.
- Prioritize clean error handling, meaningful HTTP status codes, and deterministic file naming.

End of lesson.