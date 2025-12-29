---
name: image-metadata-extractor
description: Use this skill to extract metadata from images - EXIF data, dimensions, quality, color information. Useful for image validation and quality checking.
allowed-tools: [Bash, Read]
---

# Image Metadata Extractor

Extract metadata and properties from images.

## Extract Image Metadata

```bash
# Get dimensions
identify -format "%wx%h" image.jpg

# Get EXIF data
exiftool image.jpg

# Get file size
stat -f%z image.jpg  # macOS
stat -c%s image.jpg  # Linux
```

```javascript
function validateImageSpecs(metadata, requirements) {
  const issues = [];

  if (metadata.width < requirements.minWidth) {
    issues.push(`Width ${metadata.width}px below minimum ${requirements.minWidth}px`);
  }

  if (metadata.height < requirements.minHeight) {
    issues.push(`Height ${metadata.height}px below minimum ${requirements.minHeight}px`);
  }

  if (metadata.fileSize > requirements.maxFileSize) {
    issues.push(`File size ${metadata.fileSize} exceeds maximum ${requirements.maxFileSize}`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
```

## When This Skill is Invoked

Use for image quality checking, thumbnail validation, or metadata extraction.
