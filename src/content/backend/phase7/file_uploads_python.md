# Phase 7 — Advanced API Features: File Uploads — Images, PDFs & Cloud Storage (Python)

Uploading files is a fundamental capability for modern backends, enabling user-generated content, document workflows, and media pipelines. In professional systems, uploads must be secure, scalable, fault-tolerant, and cost-aware. This lesson explores how to design and implement robust file upload features in Python backends, covering images and PDFs, safe cloud storage integration (AWS S3), streaming and resumable uploads, and practical validation.

## 1. File Upload Fundamentals with Cloud Storage (FastAPI + S3)

A solid foundation for file uploads includes:
- Accepting files via an API endpoint.
- Validating content type and size.
- Streaming data to cloud storage to avoid loading large files entirely into memory.
- Returning a stable storage key and accessible URL or path.

Code example: simple upload that streams to S3 and validates type/size.

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
import boto3
from botocore.exceptions import ClientError
import os
from uuid import uuid4

app = FastAPI()

S3_BUCKET = os.getenv("S3_BUCKET", "my-app-bucket")
s3_client = boto3.client("s3")

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type.")
    # Read to enforce size limit (streaming approach; adjust for large files in production)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large.")
    # Generate a safe, unique key
    s3_key = f"uploads/{uuid4()}_{file.filename}"
    try:
        # Stream directly to S3 (avoids storing on local disk)
        s3_client.put_object(Bucket=S3_BUCKET, Key=s3_key, Body=content, ContentType=file.content_type)
    except ClientError:
        raise HTTPException(status_code=500, detail="Upload failed.")
    return {"filename": file.filename, "s3_key": s3_key}
```

### Line-by-line explanation
- Line 1-5: Import necessary FastAPI types, boto3 client, HTTP exceptions, environment vars, and utilities.
- Line 7-9: Create FastAPI app and configure S3 bucket name from environment.
- Line 11: Define allowed MIME types for security and correctness.
- Line 12: Set a maximum allowed file size to prevent abuse.
- Line 14-28: Define an endpoint /upload that accepts a single file.
- Line 16-18: Validate the file’s content type against allowed types.
- Line 20-21: Read the entire file content into memory to enforce the size limit.
- Line 22-23: If size exceeds limit, return a 400 error.
- Line 25: Construct a unique S3 object key to avoid collisions.
- Line 28-32: Upload the content to S3 with the correct content type; handle errors gracefully.
- Line 33-34: Return a structured response with the original filename and the S3 key.

## 2. Images: Validation, Processing, and Thumbnails

Images often require additional handling: strict type checks, size limits, and derived assets like thumbnails. This section demonstrates validating image uploads, storing the original, generating a thumbnail via Pillow, and saving both to S3.

```python
from io import BytesIO
from PIL import Image

THUMBNAIL_SIZE = (256, 256)

@app.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    # Ensure the content is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Not an image.")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5 MB limit for images
        raise HTTPException(status_code=400, detail="Image too large.")
    # Original image key
    original_key = f"images/original/{uuid4()}_{file.filename}"
    s3_client.put_object(Bucket=S3_BUCKET, Key=original_key, Body=content, ContentType=file.content_type)
    # Generate thumbnail
    image = Image.open(BytesIO(content))
    image.thumbnail(THUMBNAIL_SIZE)
    thumb_buf = BytesIO()
    image_format = image.format or "JPEG"
    image.save(thumb_buf, format=image_format)
    thumb_buf.seek(0)
    thumbnail_key = f"images/thumbnails/{uuid4()}_{file.filename}"
    s3_client.put_object(Bucket=S3_BUCKET, Key=thumbnail_key, Body=thumb_buf, ContentType=f"image/{image_format.lower()}")
    return {"filename": file.filename, "original": original_key, "thumbnail": thumbnail_key}
```

### Line-by-line explanation
- Line 1-2: Import BytesIO and Pillow’s Image for in-memory image processing.
- Line 4: Set a thumbnail size target.
- Line 6-28: Define /upload/image endpoint.
- Line 8-9: Confirm the uploaded file is an image by content type.
- Line 10-12: Read content into memory and enforce a 5 MB limit.
- Line 14-15: Create a unique S3 key for the original image and upload it.
- Line 17-18: Open the image from the in-memory content and generate a thumbnail.
- Line 19-21: Save the thumbnail to an in-memory buffer in an appropriate format.
- Line 22-23: Reset buffer position and upload thumbnail to S3.
- Line 24-26: Return URLs/keys for both original and thumbnail images.

Notes:
- In production, you might store only references in a database and serve images via a CDN. You can also generate multiple thumbnail sizes and store them similarly.
- For very large images, consider streaming to S3 and streaming the thumbnail computation to avoid peak memory usage.

## 3. PDFs: Validation and Storage

PDF uploads are common for documents, invoices, and reports. This section covers strict content-type validation and safe storage in S3.

```python
@app.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50 MB limit for PDFs
        raise HTTPException(status_code=400, detail="PDF too large.")
    pdf_key = f"docs/{uuid4()}_{file.filename}"
    s3_client.put_object(Bucket=S3_BUCKET, Key=pdf_key, Body=content, ContentType="application/pdf")
    return {"filename": file.filename, "s3_key": pdf_key}
```

### Line-by-line explanation
- Line 1-2: Define a dedicated /upload/pdf endpoint.
- Line 4-6: Validate that the content type is exactly application/pdf.
- Line 7-9: Read content into memory and enforce a 50 MB limit for PDFs.
- Line 10: Generate a unique S3 key under a docs directory.
- Line 11-12: Upload the PDF to S3 with the proper content type.
- Line 13: Return the stored key as confirmation.

Notes:
- PDFs may require special handling (e.g., virus scanning, digital signature verification) in enterprise environments.
- If you expect very large PDFs, consider a streaming/multipart approach similar to large binary files (see Section 5).

## 4. Cloud Storage: Client Direct Uploads with Presigned URLs

To reduce backend processing and scale writes, you can let clients upload directly to S3 using presigned URLs. The server issues a time-limited URL and a storage key, and the client performs the PUT itself.

```python
from fastapi import HTTPException

@app.post("/upload/presigned-url")
def get_presigned_url(filename: str, content_type: str):
    if content_type not in {"image/jpeg", "image/png", "application/pdf"}:
        raise HTTPException(status_code=400, detail="Unsupported content type.")
    key = f"uploads/{uuid4()}_{filename}"
    try:
        url = s3_client.generate_presigned_url(
            "put_object",
            Params={"Bucket": S3_BUCKET, "Key": key, "ContentType": content_type},
            ExpiresIn=3600  # 1 hour
        )
    except ClientError:
        raise HTTPException(status_code=500, detail="Could not generate presigned URL.")
    return {"url": url, "key": key}
```

### Line-by-line explanation
- Line 1: Import HTTPException for error handling.
- Line 3-12: Define /upload/presigned-url endpoint.
- Line 5-7: Validate that the content type is one of the allowed types.
- Line 8: Create a unique storage key for the eventual object.
- Line 9-15: Generate a presigned PUT URL for the exact bucket/key and content type; set a 1-hour expiry.
- Line 16-18: Return the presigned URL and key to the client, or raise a 500 error if URL generation fails.

Usage notes:
- The client must PUT exactly the content type specified and handle 403/0 rate limits gracefully.
- Consider returning additional metadata (size, checksum) if your workflow requires integrity checks.

## 5. Streaming Large Files & Resumable Uploads (Multipart Upload)

For large uploads, streaming with multipart uploads avoids loading the entire file into memory and supports resumable transfers. This example demonstrates a server-driven multipart upload to S3, reading the UploadFile in chunks.

```python
CHUNK_SIZE = 5 * 1024 * 1024  # 5 MB

@app.post("/upload/stream")
async def upload_stream(file: UploadFile = File(...)):
    if file.content_type not in {"image/jpeg", "image/png", "application/pdf"}:
        raise HTTPException(status_code=400, detail="Unsupported content type.")
    key = f"uploads/stream/{uuid4()}_{file.filename}"
    mp = s3_client.create_multipart_upload(Bucket=S3_BUCKET, Key=key, ContentType=file.content_type)
    upload_id = mp["UploadId"]
    parts = []
    part_number = 1

    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            part = s3_client.upload_part(
                Bucket=S3_BUCKET,
                Key=key,
                PartNumber=part_number,
                UploadId=upload_id,
                Body=chunk
            )
            parts.append({"PartNumber": part_number, "ETag": part["ETag"]})
            part_number += 1

        s3_client.complete_multipart_upload(
            Bucket=S3_BUCKET,
            Key=key,
            UploadId=upload_id,
            MultipartUpload={"Parts": parts}
        )
    except Exception:
        s3_client.abort_multipart_upload(Bucket=S3_BUCKET, Key=key, UploadId=upload_id)
        raise HTTPException(status_code=500, detail="Streaming upload failed.")
    return {"s3_key": key}
```

### Line-by-line explanation
- Line 1-2: Import a configurable chunk size and define the endpoint.
- Line 4-9: Validate content type and initialize a multipart upload session with S3.
- Line 11-24: Enter a loop to read the incoming file in 5 MB chunks. Each chunk is uploaded as a separate part via upload_part, collecting PartNumbers and ETag values for the final assembly.
- Line 26-32: Complete the multipart upload by providing the ordered parts; on any error, abort the multipart upload to release resources.
- Line 33-34: Return the final S3 key upon success.

Notes:
- This approach minimizes peak memory usage and supports resuming by reusing the same upload_id and key across retries.
- In real systems, you may implement client-side resumption tokens and server-side bookkeeping to support partial retries more robustly.

## X. Common Beginner Mistakes

Bad vs Good: file uploads

- Mistake 1: No content-type validation and no size limit
Bad:
```python
# BAD: Accepts any file type and size, stores directly
@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    s3_client.put_object(Bucket=S3_BUCKET, Key=file.filename, Body=await file.read())
    return {"filename": file.filename}
```
Good:
```python
# GOOD: Validate type and enforce size limits
ALLOWED = {"image/jpeg", "image/png", "application/pdf"}
MAX_SIZE = 20 * 1024 * 1024

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, "Unsupported content type.")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large.")
    s3_client.put_object(Bucket=S3_BUCKET, Key=f"uploads/{uuid4()}_{file.filename}", Body=content, ContentType=file.content_type)
    return {"filename": file.filename}
```

- Mistake 2: Loading entire large files into memory without streaming
Bad:
```python
@app.post("/upload/large")
async def upload_large(file: UploadFile = File(...)):
    data = await file.read()  # reads entire file into memory
    s3_client.put_object(Bucket=S3_BUCKET, Key=f"uploads/{file.filename}", Body=data)
    return {"filename": file.filename}
```
Good (streaming or multipart):
```python
# GOOD: Stream using multipart upload or chunked reads
```
- Misstep: Not sanitizing filenames, leading to path traversal or collisions
Bad:
```python
# BAD: Unsanitized filename used as the S3 key
s3_client.put_object(Bucket=S3_BUCKET, Key=f"uploads/{file.filename}", Body=content)
```
Good:
```python
import re
def sanitize(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    safe_name = sanitize(file.filename)
    key = f"uploads/{uuid4()}_{safe_name}"
    s3_client.put_object(Bucket=S3_BUCKET, Key=key, Body=content, ContentType=file.content_type)
    return {"filename": safe_name, "s3_key": key}
```

- Mistake 3: Not handling errors or cleanup
Bad:
```python
@app.post("/upload/simple")
async def upload_simple(file: UploadFile = File(...)):
    s3_client.put_object(Bucket=S3_BUCKET, Key="uploads/"+file.filename, Body=await file.read())
    return {"filename": file.filename}
```
Good:
```python
@app.post("/upload/simple")
async def upload_simple(file: UploadFile = File(...)):
    try:
        content = await file.read()
        s3_client.put_object(Bucket=S3_BUCKET, Key=f"uploads/{uuid4()}_{file.filename}", Body=content)
        return {"filename": file.filename}
    except Exception as e:
        # Log error, return meaningful HTTP error
        raise HTTPException(status_code=500, detail="Upload failed.")
```

## Y. Why This Matters In Real Systems

- Reliability and scalability: Cloud storage offloads heavy I/O and scales with your usage; use multipart uploads for large files and presigned URLs for client-side efficiency.
- Security: Validate content types, enforce size limits, sanitize file names, and consider virus scanning for uploads. Use least-privilege IAM roles for storage access.
- Performance: Streaming reduces memory pressure on the API server; thumbnails or precomputed assets support fast front-end rendering via CDNs.
- Observability: Track metrics like upload latency, success rate, error rates, and storage costs. Emit structured logs with file size, type, and storage key.
- Compliance and governance: Retain metadata (upload time, user ID, etc.), implement retention policies, and support auditing requirements.

## Z. Study Questions

1) What is a presigned URL and when would you use it for uploads?  
2) How would you generate a thumbnail for uploaded images and store it alongside the original?  
3) What is the difference between a simple upload (put_object) and a multipart upload in S3?  
4) How can you prevent memory blowups when users upload very large files via an API?  
5) What security considerations should you address when handling file uploads in production?

## Exercise

Complete this practical multi-part coding challenge to solidify learning.

Part A — Basic multi-file upload to S3
- Build a FastAPI endpoint /upload-multi that accepts List[UploadFile], validates content types (image/jpeg, image/png, application/pdf), enforces a 15 MB per-file limit, and uploads each to S3 under uploads/multi/{uuid}_{filename}.
- Return a JSON map of original filename to S3 key for all uploaded files.

Part B — Image handling with thumbnails
- Extend Part A to, for any uploaded image, also generate a 256x256 thumbnail and store it at images/thumbnails/{uuid}_{filename}. Return both keys/urls.

Part C — Presigned URL workflow
- Implement /presigned-upload that accepts filename and content_type and returns a presigned PUT URL and an S3 key. Demonstrate client-side usage with a hypothetical fetch to the URL.

Part D — Streaming large file uploads (multipart)
- Implement /upload-large that streams a file from UploadFile in 5 MB chunks and uploads with a multipart upload to S3. Ensure proper error handling and cleanup on failure.

Deliverables:
- Clean, well-documented FastAPI code that passes unit tests or integration tests you write.
- Clear handling of errors, timeouts, and edge cases (empty file, unsupported type, zero-byte file, etc.).
- Brief README notes outlining your architecture decisions (validation rules, storage layout, and error handling strategy).

This completes the lesson on File Uploads — Images, PDFs & Cloud Storage in Python for Backend Engineering at Phase 7.