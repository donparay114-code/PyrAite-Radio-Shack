// Design Tokens - Premium Apple/Spotify Aesthetic

export const tokens = {
  colors: {
    // Dark Mode Primary Palette
    background: {
      primary: '#0A0A0A',
      secondary: '#121212',
      tertiary: '#1A1A1A',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },

    // Glassmorphism overlays
    glass: {
      light: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.12)',
      heavy: 'rgba(255, 255, 255, 0.16)',
      border: 'rgba(255, 255, 255, 0.18)',
    },

    // Text hierarchy
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      tertiary: 'rgba(255, 255, 255, 0.5)',
      inverse: '#0A0A0A',
    },

    // Brand colors
    brand: {
      primary: '#1DB954',
      primaryHover: '#1ED760',
      secondary: '#667eea',
      tertiary: '#764ba2',
    },

    // Status colors
    status: {
      success: '#1DB954',
      warning: '#FFA500',
      error: '#FF3B30',
      info: '#007AFF',
    },

    // Genre colors (vibrant accents per channel)
    genres: {
      rap: '#FF6B6B',
      jazz: '#4ECDC4',
      lofi: '#95E1D3',
      electronic: '#C77DFF',
      rock: '#E63946',
      classical: '#FFD60A',
      indie: '#06FFA5',
      pop: '#FF69B4',
      country: '#F4A460',
      rnb: '#9370DB',
    },
  },

  typography: {
    // Font families
    fontFamily: {
      display:
        '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      text: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      mono: '"SF Mono", "Roboto Mono", "Courier New", monospace',
    },

    // Type scale (Perfect Fourth - 1.333 ratio)
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.333rem', // 21px
      '2xl': '1.777rem', // 28px
      '3xl': '2.369rem', // 38px
      '4xl': '3.157rem', // 50px
      '5xl': '4.209rem', // 67px
    },

    // Font weights (SF Pro)
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      heavy: 800,
    },

    // Line heights
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },

    // Letter spacing
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
    },
  },

  spacing: {
    px: '1px',
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
  },

  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    glow: {
      primary: '0 0 20px rgba(29, 185, 84, 0.3)',
      purple: '0 0 20px rgba(102, 126, 234, 0.3)',
    },
  },

  blur: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
  },

  transitions: {
    duration: {
      fast: '150ms',
      base: '250ms',
      slow: '350ms',
    },

    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  touchTarget: {
    min: '44px',
    comfortable: '48px',
  },
} as const;

// Utility function to get genre color
export function getGenreColor(genre: string): string {
  const normalizedGenre = genre.toLowerCase().replace(/[^a-z]/g, '');
  return (
    tokens.colors.genres[normalizedGenre as keyof typeof tokens.colors.genres] ||
    tokens.colors.brand.secondary
  );
}

// Utility to create glassmorphic styles
export function glassStyle(intensity: 'light' | 'medium' | 'heavy' = 'medium') {
  return {
    background: tokens.colors.glass[intensity],
    backdropFilter: `blur(${tokens.blur.xl})`,
    WebkitBackdropFilter: `blur(${tokens.blur.xl})`,
    border: `1px solid ${tokens.colors.glass.border}`,
    boxShadow: tokens.shadows.glass,
  };
}

// Utility for transitions
export function transition(
  properties: string[] = ['all'],
  duration: keyof typeof tokens.transitions.duration = 'base',
  easing: keyof typeof tokens.transitions.easing = 'default'
) {
  return {
    transition: properties
      .map((prop) => `${prop} ${tokens.transitions.duration[duration]} ${tokens.transitions.easing[easing]}`)
      .join(', '),
  };
}
