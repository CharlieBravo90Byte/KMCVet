/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Se inyectan dinámicamente desde la config del tenant (white-label)
        primary: {
          DEFAULT: 'var(--color-primary, #2563EB)',
          foreground: 'var(--color-primary-foreground, #ffffff)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #10B981)',
          foreground: 'var(--color-secondary-foreground, #ffffff)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
