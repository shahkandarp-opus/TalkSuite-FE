#!/bin/bash
# Deploy TalkSuite frontend to S3 + CloudFront
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - S3 bucket created with static website hosting enabled
#
# Usage:
#   BUCKET_NAME=your-bucket-name BACKEND_URL=https://your-api.com ./deploy.sh
#   
#   Optional: DISTRIBUTION_ID=EXXXXX for CloudFront invalidation

set -e

# Configuration
BUCKET_NAME="${BUCKET_NAME:?Error: Set BUCKET_NAME environment variable}"
BACKEND_URL="${BACKEND_URL:?Error: Set BACKEND_URL environment variable (your deployed backend URL)}"
DISTRIBUTION_ID="${DISTRIBUTION_ID:-}"

echo "==> Building with BACKEND_URL=$BACKEND_URL"
NEXT_PUBLIC_BACKEND_URL="$BACKEND_URL" npm run build

echo "==> Uploading to s3://$BUCKET_NAME"
aws s3 sync out/ "s3://$BUCKET_NAME" --delete

# Set cache headers for static assets (JS, CSS, fonts)
aws s3 cp "s3://$BUCKET_NAME" "s3://$BUCKET_NAME" \
  --recursive \
  --exclude "*" \
  --include "*.js" --include "*.css" --include "*.otf" --include "*.woff2" \
  --cache-control "public, max-age=31536000, immutable" \
  --metadata-directive REPLACE

# Set short cache for HTML files (for updates)
aws s3 cp "s3://$BUCKET_NAME" "s3://$BUCKET_NAME" \
  --recursive \
  --exclude "*" \
  --include "*.html" \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "text/html" \
  --metadata-directive REPLACE

# Invalidate CloudFront cache if distribution ID provided
if [ -n "$DISTRIBUTION_ID" ]; then
  echo "==> Invalidating CloudFront distribution $DISTRIBUTION_ID"
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*"
fi

echo "==> Done! Site deployed to s3://$BUCKET_NAME"
