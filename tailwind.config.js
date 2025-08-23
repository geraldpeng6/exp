/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // 使用 class 策略来控制黑夜模式
  theme: {
    extend: {
      // 自定义颜色，保持与现有设计一致
      colors: {
        // 浅色主题
        light: {
          bg: '#ffffff',
          fg: '#111111',
          muted: '#6b7280',
          border: '#e5e7eb',
          accent: '#111111',
          link: '#1f2937',
        },
        // 深色主题
        dark: {
          bg: '#0f0f0f',
          fg: '#f5f5f5',
          muted: '#9ca3af',
          border: '#374151',
          accent: '#f5f5f5',
          link: '#d1d5db',
        }
      },
      // 自定义动画
      animation: {
        'sun-rise': 'sunRise 0.5s ease-in-out',
        'sun-set': 'sunSet 0.5s ease-in-out',
        'moon-rise': 'moonRise 0.5s ease-in-out',
        'moon-set': 'moonSet 0.5s ease-in-out',
        'theme-switch': 'themeSwitch 0.3s ease-in-out',
      },
      keyframes: {
        sunRise: {
          '0%': {
            transform: 'translateY(2rem) rotate(-180deg)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0) rotate(0deg)',
            opacity: '1'
          }
        },
        sunSet: {
          '0%': {
            transform: 'translateY(0) rotate(0deg)',
            opacity: '1'
          },
          '100%': {
            transform: 'translateY(2rem) rotate(180deg)',
            opacity: '0'
          }
        },
        moonRise: {
          '0%': {
            transform: 'translateY(-2rem) rotate(180deg)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0) rotate(0deg)',
            opacity: '1'
          }
        },
        moonSet: {
          '0%': {
            transform: 'translateY(0) rotate(0deg)',
            opacity: '1'
          },
          '100%': {
            transform: 'translateY(-2rem) rotate(-180deg)',
            opacity: '0'
          }
        },
        themeSwitch: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' }
        }
      },
      // 自定义字体
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace'
        ]
      },
      // 自定义间距
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      // 自定义宽度
      width: {
        'toc': '280px',
      },
      // 自定义 z-index
      zIndex: {
        '100': '100',
      }
    },
  },
  plugins: [],
}
