# Track: Backend Engineering — Module: Phase 7 — Advanced API Features — Topic: File Uploads — Images, PDFs & Cloud Storage (Ruby)

Compelling introductory paragraph
File uploads are a foundational capability for modern backend services. In Ruby environments (particularly Rails), you’ll often need to store user-generated content like images and PDFs, support efficient delivery via cloud storage, and provide fast, secure access from APIs. This lesson covers robust patterns for uploading, validating, processing, and serving files, with emphasis on images and PDFs, integration with cloud storage (AWS S3), and considerations for security, performance, and reliability in production systems.

## 1. Setup and Storage Backends in Rails

This section shows how to configure storage backends, attach files to models, and expose a simple API for uploading files. We’ll use Rails Active Storage with Amazon S3 as the cloud backend, plus a local fallback for development.

Code: config/storage.yml
```
local:
  service: Disk
  root: <%= Rails.root.join("storage") %>

amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: <%= ENV['AWS_REGION'] %>
  bucket: <%= ENV['AWS_BUCKET'] %>
  upload:
    server_side_encryption: 'AES256'
```

### Line-by-line explanation
- Defines two storage backends: local disk storage and Amazon S3.
- amazon uses environment variables for credentials and region to keep secrets out of code.
- The upload option enables server-side encryption for stored objects.

Code: app/models/upload.rb
```
class Upload < ApplicationRecord
  # Attach optional image and PDF files
  has_one_attached :image
  has_one_attached :pdf
end
```

### Line-by-line explanation
- Creates an Upload model with two Active Storage attachments: image and pdf.
- Attachments are stored in the configured storage backend (local or S3 depending on environment).

Code: app/controllers/uploads_controller.rb
```
class UploadsController < ApplicationController
  def create
    @upload = Upload.new(upload_params)
    if @upload.save
      render json: { id: @upload.id }, status: :created
    else
      render json: { errors: @upload.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def show
    @upload = Upload.find(params[:id])
    render json: {
      id: @upload.id,
      image_url: @upload.image.service_url,
      pdf_url: @upload.pdf&.service_url
    }
  end

  private

  def upload_params
    params.require(:upload).permit(:title, :image, :pdf)
  end
end
```

### Line-by-line explanation
- create action builds and saves an Upload with permitted file params.
- If successful, responds with the new record ID; otherwise returns validation errors.
- show action returns URLs for attached files (uses service_url to fetch from the storage backend).
- upload_params whitelists title and attached files for security.

Code: config/routes.rb
```
Rails.application.routes.draw do
  resources :uploads, only: [:create, :show]
end
```

### Line-by-line explanation
- Exposes a minimal API: POST /uploads to upload and GET /uploads/:id to fetch URLs.

Code: app/views/uploads/_form.html.erb (example form with direct uploads)
```
<%= form_with model: @upload, local: false do |f| %>
  <div>
    <%= f.label :title %>
    <%= f.text_field :title %>
  </div>
  <div>
    <%= f.label :image %>
    <%= f.file_field :image, direct_upload: true %>
  </div>
  <div>
    <%= f.label :pdf %>
    <%= f.file_field :pdf, direct_upload: true %>
  </div>
  <%= f.submit %>
<% end %>
```

### Line-by-line explanation
- Demonstrates how to enable direct uploads (presigned URLs behind the scenes) for images and PDFs.
- direct_upload: true instructs Rails UJS to obtain direct upload URLs from the server.

Code: Gemfile (essential gems)
```
gem 'rails', '~> 7.0'
gem 'aws-sdk-s3', '~> 1'
gem 'image_processing', '~> 1.2'
gem 'mini_magick'
```

### Line-by-line explanation
- aws-sdk-s3 enables server-side cloud storage interactions and presigned URLs if you opt for client-side uploads.
- image_processing and mini_magick are used for image transformations (thumbnails, resizing) later.

## 2. Images: Upload, Validation, and Variants

Images require validation (type and size) and often on-demand or background generation of derived images (variants/thumbnails).

Code: app/models/upload.rb (enhanced with image validation)
```
class Upload < ApplicationRecord
  has_one_attached :image
  has_one_attached :pdf

  validate :validate_files

  private

  def validate_files
    if image.attached?
      unless image.blob.content_type.start_with?('image/')
        errors.add(:image, 'must be an image (jpeg, png, webp, gif, etc.)')
      end
      if image.blob.byte_size > 8.megabytes
        errors.add(:image, 'size must be <= 8MB')
      end
    end

    if pdf.attached?
      unless pdf.blob.content_type == 'application/pdf'
        errors.add(:pdf, 'must be a PDF')
      end
      if pdf.blob.byte_size > 25.megabytes
        errors.add(:pdf, 'size must be <= 25MB')
      end
    end
  end
end
```

### Line-by-line explanation
- Validates both image and PDF attachments (content type and size).
- Uses blob metadata to guard against spoofed file extensions.
- Keeps upload payloads small and predictable for APIs.

Code: app/jobs/image_thumbnail_job.rb
```
class ImageThumbnailJob < ApplicationJob
  queue_as :default

  def perform(upload_id)
    upload = Upload.find(upload_id)
    return unless upload.image.attached?

    # Generate a 200x200 thumbnail variant
    variant = upload.image.variant(resize_to_limit: [200, 200]).processed
    # Optionally, touch a field or a separate attachment to cache the URL
    Rails.logger.info("Thumbnail variant created: #{variant}")
  end
end
```

### Line-by-line explanation
- Background job to generate a thumbnail for an uploaded image.
- Uses Active Storage variants to produce a small, optimized image for previews.
- processed ensures the variant is built and ready for delivery.

Code: how to trigger the job after attach (example)
```
# In a controller action after a successful save
ImageThumbnailJob.perform_later(@upload.id)
```

### Line-by-line explanation
- Offloads image processing to the background, enabling fast API responses for uploads.
- Keeps CPU-intensive work out of the request/response cycle.

## 3. PDFs: Handling, Preview, and Access

PDFs require stricter content-type checks, possible page previews, and careful streaming for viewing.

Code: app/models/upload.rb (PDF-specific validation)
```
class Upload < ApplicationRecord
  has_one_attached :pdf

  validate :validate_pdf

  private

  def validate_pdf
    return unless pdf.attached?
    if pdf.blob.content_type != 'application/pdf'
      errors.add(:pdf, 'must be a PDF')
    end
    if pdf.blob.byte_size > 50.megabytes
      errors.add(:pdf, 'size must be <= 50MB')
    end
  end
end
```

### Line-by-line explanation
- Ensures only PDFs are accepted and enforces a generous, production-appropriate size limit.

Code: app/jobs/pdf_preview_job.rb
```
class PdfPreviewJob < ApplicationJob
  queue_as :default

  def perform(upload_id)
    upload = Upload.find(upload_id)
    return unless upload.pdf.attached?

    # Download PDF bytes and render first page as PNG using MiniMagick
    pdf_bytes = upload.pdf.download
    require 'mini_magick'
    Tempfile.create(['pdf_preview', '.png']) do |tmp|
      image = MiniMagick::Image.read(MiniMagick::Image.from_blob(pdf_bytes).to_blob)
      image.format('png')
      image.resize('600x600')
      image.write(tmp.path)

      upload.pdf_preview.attach(io: File.open(tmp.path), filename: 'preview.png', content_type: 'image/png')
    end
  end
end
```

### Line-by-line explanation
- Downloads the PDF as bytes, renders the first page to PNG, resizes to a thumbnail, and stores the result as a new attachment (pdf_preview) for quick UI previews.
- Uses MiniMagick for image processing of the PDF page snapshot.
- Cleans up the temporary file automatically.

Code: app/models/upload.rb (attachable for preview)
```
class Upload < ApplicationRecord
  has_one_attached :pdf
  has_one_attached :pdf_preview
end
```

### Line-by-line explanation
- Adds a pdf_preview attachment to hold the rendered preview image.

Notes on preview generation
- PDF preview requires ImageMagick/ghostscript support for rendering PDF pages. Ensure system dependencies are installed on your servers (e.g., libgs for Ghostscript, ImageMagick with PDF support).
- For large-scale systems, consider a separate service (microservice) to handle heavy document processing.

## 4. Cloud Storage: AWS S3 Integration and Direct Uploads

Cloud storage is essential for scalability, cost control, and reliability. This section covers using S3 with Rails Active Storage and optional direct uploads from the client.

Code: config/storage.yml (Amazon S3)
```
amazon:
  service: S3
  access_key_id: <%= ENV['AWS_ACCESS_KEY_ID'] %>
  secret_access_key: <%= ENV['AWS_SECRET_ACCESS_KEY'] %>
  region: <%= ENV['AWS_REGION'] %>
  bucket: <%= ENV['AWS_BUCKET'] %>
  upload:
    server_side_encryption: 'AES256'
```

### Line-by-line explanation
- Configures the S3 backend with credentials and region from environment.
- Enables server-side encryption for all uploaded objects.

Code: config/environments/production.rb (activate S3 in production)
```
config.active_storage.service = :amazon
```

### Line-by-line explanation
- Tells Rails to use the Amazon S3 service for Active Storage in production.

Code: app/controllers/uploads_controller.rb (support for presigned direct uploads)
```
class UploadsController < ApplicationController
  def create
    @upload = Upload.new(upload_params)
    if @upload.save
      render json: { id: @upload.id }, status: :created
    else
      render json: { errors: @upload.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def upload_params
    params.require(:upload).permit(:title, :image, :pdf)
  end
end
```

### Line-by-line explanation
- Standard create action to handle server-side uploads via Active Storage attachments.
- Works seamlessly with direct uploads on the client side (form_fields with direct_upload: true).

Code: app/views/uploads/new.html.erb (direct upload form example)
```
<%= form_with model: @upload, url: uploads_path, local: false do |f| %>
  <%= f.label :title %>
  <%= f.text_field :title %>

  <%= f.label :image %>
  <%= f.file_field :image, direct_upload: true %>

  <%= f.label :pdf %>
  <%= f.file_field :pdf, direct_upload: true %>

  <%= f.submit "Upload" %>
<% end %>
```

### Line-by-line explanation
- Demonstrates a modern approach where the browser uploads files directly to S3 (via presigned URLs) rather than streaming through the Rails server.
- Keeps server load low and reduces latency for large files.

Code: Optional presigned URL generation with AWS SDK (server-side for direct client upload)
```
# Gemfile
gem 'aws-sdk-s3', '~> 1.0'

# app/controllers/presign_controller.rb
class PresignController < ApplicationController
  def presign_put
    s3 = Aws::S3::Client.new(
      region: ENV['AWS_REGION'],
      access_key_id: ENV['AWS_ACCESS_KEY_ID'],
      secret_access_key: ENV['AWS_SECRET_ACCESS_KEY']
    )
    key = "uploads/#{SecureRandom.uuid}/#{params[:filename]}"
    signer = Aws::S3::Presigner.new(client: s3)
    url = signer.presigned_url(:put_object,
      bucket: ENV['AWS_BUCKET'],
      key: key,
      content_type: params[:content_type],
      expires_in: 3600
    )
    render json: { url: url, key: key }
  end
end
```

### Line-by-line explanation
- Generates a presigned PUT URL to upload a file directly to S3 from a client.
- Returns the targeted object key so the server can associate the uploaded file with a model later.

## 5. Security, Performance, and Reliability

This section ties together validation, permissions, and scalability considerations to keep uploads secure and performant in production.

Code: app/models/upload.rb (comprehensive validations)
```
class Upload < ApplicationRecord
  has_one_attached :image
  has_one_attached :pdf
  has_one_attached :pdf_preview

  validate :validate_files

  private

  def validate_files
    if image.attached?
      unless image.blob.content_type.start_with?('image/')
        errors.add(:image, 'must be an image')
      end
      if image.blob.byte_size > 8.megabytes
        errors.add(:image, 'size must be <= 8MB')
      end
    end

    if pdf.attached?
      unless pdf.blob.content_type == 'application/pdf'
        errors.add(:pdf, 'must be a PDF')
      end
      if pdf.blob.byte_size > 50.megabytes
        errors.add(:pdf, 'size must be <= 50MB')
      end
    end
  end
end
```

### Line-by-line explanation
- Centralized, reusable validation logic for all uploads.
- Uses content_type metadata to protect against spoofed file types.
- Keeps file sizes within reasonable and predictable limits to prevent abuse.

Code: app/jobs/virus_scan_job.rb (conceptual outline)
```
class VirusScanJob < ApplicationJob
  queue_as :default

  def perform(upload_id)
    upload = Upload.find(upload_id)
    # Placeholder: integrate with a real AV service or library, e.g., ClamAV
    # result = Antivirus.scan(upload.image) || Antivirus.scan(upload.pdf)
    Rails.logger.info("Virus scan would run here for Upload ##{upload.id}")
  end
end
```

### Line-by-line explanation
- Demonstrates how you might hook in a background virus scan for uploaded files.
- Real deployments use services like ClamAV, AWS Macie, or managed antimalware.

Code: Governance and observability snippet
```
# config/initializers/active_storage_logging.rb
Rails.application.config.active_storage.logger = Logger.new(STDOUT)

# app/controllers/application_controller.rb (example logging)
before_action :log_upload_details

def log_upload_details
  Rails.logger.info "Upload action: #{params[:action]} by #{current_user&.id || 'anonymous'}"
end
```

### Line-by-line explanation
- Enables logging around uploads to aid debugging and security auditing.
- Helps to observe who uploaded what and when.

Why This Matters In Real Systems — production context and real usage
- Reliability: Offload heavy processing (thumbnails, PDF previews) to background workers to keep API responses fast and predictable under load.
- Scale: S3-based storage with direct uploads reduces server bandwidth and enables global delivery via CDN-enabled endpoints.
- Security: Validate content types and sizes; never rely on file extensions; use presigned URLs for client-side uploads to minimize exposure of credentials.
- Observability: Logging, error handling, and background job queues give you visibility into failures and latency, essential for incident response.
- Compliance and governance: Enforce retention policies, encryption (S3 SSE), and generate audit logs for uploads, modifications, and access.

Z. Study Questions — 5 recall questions
1) What is the advantage of using Active Storage variants for images, and how do you request a 200x200 thumbnail in Rails?
2) Why should you validate both content_type and byte_size instead of relying on file extensions?
3) How can you enable direct client-to-cloud uploads in Rails, and what are the security benefits?
4) What is the purpose of a background job when handling PDF previews, and what library could you use to render a PDF page as an image?
5) How would you attach a generated PDF preview image to an Upload record in Rails?

Exercise — a practical multi-part coding challenge

Part A — Set up a Rails API endpoint to upload images and PDFs to S3, with validations
- Create a Rails API (or API-only mode) app.
- Install and configure Active Storage with Amazon S3 (config/storage.yml and production.rb entries).
- Implement an Upload model with has_one_attached :image and has_one_attached :pdf.
- Add validations: image must be an image and <= 8MB; pdf must be a PDF and <= 50MB.
- Create an UploadsController with create and show endpoints as shown in Section 1.
- Ensure direct uploads are enabled on the client form (form_with with direct_upload: true).

Part B — Images: generate a thumbnail variant after upload
- Add a background job (ImageThumbnailJob) that creates a 200x200 thumbnail for any uploaded image.
- Enqueue the job after a successful upload.
- Expose an API endpoint or payload that returns the URL for the thumbnail variant.

Part C — PDFs: generate a first-page PNG preview
- Add a background job (PdfPreviewJob) that downloads the PDF, renders the first page to PNG using MiniMagick, and attaches it as pdf_preview.
- Make sure the job handles temporary files safely and cleans up resources.
- Update the Upload model to include has_one_attached :pdf_preview.

Part D — Direct uploads via presigned URLs (optional for advanced students)
- Implement a PresignController with a presign_put action that generates a presigned URL for a PUT operation to S3.
- The client should upload directly to S3 using that URL and then inform Rails of the final attachment (e.g., by creating an Upload record with the S3 object key).

Part E — Tests
- Write unit tests for Upload validations.
- Write a test that mocks the background job enqueuing for image thumbnail generation.
- Write a test that mocks the PDF preview generation path.

Notes
- This lesson uses Rails conventions with Active Storage. If you’re not on Rails, adapt the patterns to your framework’s file storage abstractions (e.g., Hanami, Sinatra with Shrine, or Dry-System).
- For production security, ensure AWS credentials are rotated, IAM policies restrict access to only the required S3 bucket, and that presigned URLs have short expiry and narrow content-type constraints.

If you’d like, I can tailor this lesson to a specific Rails version (e.g., Rails 6.x vs Rails 7.x) or provide a ready-to-run Rails app scaffold with all the code wired together.