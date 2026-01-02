---
name: color-palette-analyzer
description: Use this skill to extract and analyze color schemes from images/videos, check color accessibility (WCAG), and generate harmonious color palettes.
allowed-tools: [Bash, Read]
---

# Color Palette Analyzer

Extract and analyze color schemes.

## Extract Dominant Colors

```bash
# Using ImageMagick
convert image.jpg -resize 1x1 -format "%[pixel:u]" info:-

# Get color palette
convert image.jpg -colors 5 -unique-colors txt:-
```

```javascript
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function calculateContrast(color1, color2) {
  const getLuminance = (rgb) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const L1 = getLuminance(hexToRgb(color1));
  const L2 = getLuminance(hexToRgb(color2));

  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);

  return (lighter + 0.05) / (darker + 0.05);
}

function checkWCAGCompliance(bgColor, textColor) {
  const contrast = calculateContrast(bgColor, textColor);

  return {
    contrast: contrast.toFixed(2),
    AA_normal: contrast >= 4.5,
    AA_large: contrast >= 3,
    AAA_normal: contrast >= 7,
    AAA_large: contrast >= 4.5
  };
}
```

## When This Skill is Invoked

Use for brand consistency, thumbnail design, or accessibility checking.
