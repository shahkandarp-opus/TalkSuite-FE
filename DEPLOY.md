# Deploying TalkSuite Frontend to S3

## Prerequisites

- AWS CLI installed and configured
- An S3 bucket
- Your backend already deployed (you'll need the URL)

## Steps

### 1. Build the static site

Set the backend URL and build:

```bash
set NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
npm run build
```

This produces a static export in the `out/` folder.

### 2. Create and configure S3 bucket

```bash
aws s3 mb s3://YOUR-BUCKET-NAME --region us-east-1

# Enable static website hosting
aws s3 website s3://YOUR-BUCKET-NAME --index-document index.html --error-document 404.html
```

### 3. Set bucket policy for public access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

Save as `bucket-policy.json` and apply:

```bash
aws s3api put-bucket-policy --bucket YOUR-BUCKET-NAME --policy file://bucket-policy.json
```

### 4. Upload the build

```bash
aws s3 sync out/ s3://YOUR-BUCKET-NAME --delete
```

### 5. Handle SPA routing

Since this is a single-page app with client-side routes (`/login`, `/dashboard`), you need to handle 404s:

**Option A: S3 only** — Set the error document to `index.html`:
```bash
aws s3 website s3://YOUR-BUCKET-NAME --index-document index.html --error-document index.html
```
Note: This returns HTTP 404 status with the correct content. Works but not ideal for SEO.

**Option B: CloudFront (recommended)** — Create a CloudFront distribution with a custom error response:
- Error code: 403 and 404
- Response page path: `/index.html`
- Response code: 200

### 6. (Recommended) CloudFront distribution

For HTTPS and proper SPA routing:

```bash
aws cloudfront create-distribution \
  --origin-domain-name YOUR-BUCKET-NAME.s3.amazonaws.com \
  --default-root-object index.html
```

Then add custom error responses in the console:
- 403 → /index.html (200)
- 404 → /index.html (200)

### 7. Set your backend URL

Make sure `NEXT_PUBLIC_BACKEND_URL` is set to your deployed backend's URL at build time. This gets baked into the JS bundle.

## Quick deploy (Linux/Mac)

```bash
BUCKET_NAME=your-bucket BACKEND_URL=https://your-api.com ./deploy.sh
```

## Quick deploy (Windows)

```powershell
$env:NEXT_PUBLIC_BACKEND_URL = "https://your-backend-url.com"
npm run build
aws s3 sync out/ s3://YOUR-BUCKET-NAME --delete
```
