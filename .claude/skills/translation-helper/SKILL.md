---
name: translation-helper
description: Use this skill for multi-language support, translation management, locale handling, and internationalization (i18n) best practices.
allowed-tools: [Read, Write]
---

# Translation Helper

Multi-language support and translation management.

## Translation Management

```javascript
const TRANSLATIONS = {
  en: {
    greeting: 'Hello, {name}!',
    welcome: 'Welcome to our platform'
  },
  es: {
    greeting: '¡Hola, {name}!',
    welcome: 'Bienvenido a nuestra plataforma'
  },
  fr: {
    greeting: 'Bonjour, {name}!',
    welcome: 'Bienvenue sur notre plateforme'
  }
};

function translate(key, locale = 'en', variables = {}) {
  let translation = TRANSLATIONS[locale]?.[key] || TRANSLATIONS['en'][key] || key;

  // Replace variables
  Object.entries(variables).forEach(([varName, value]) => {
    translation = translation.replace(`{${varName}}`, value);
  });

  return translation;
}
```

## Locale Detection

```javascript
function detectLocale(acceptLanguage) {
  const supported = ['en', 'es', 'fr', 'de'];
  const preferred = acceptLanguage.split(',')[0].split('-')[0];

  return supported.includes(preferred) ? preferred : 'en';
}
```

## When This Skill is Invoked

Use for internationalization, multi-language content, or locale management.
