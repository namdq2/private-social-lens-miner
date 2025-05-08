const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        'dfus-blue': '#1A56CB',
        'dfus-gray': '#2f2f2f',
        'dfus-orange': '#FB9C2D',
        'dfus-dark-blue': '#1A56CB',
        'dfus-dark': '#121212',
        'dfus-border': '#4a4a4b',
        'dfus-black': '#1a1a1a',
        'dfus-gray-dark': '#333333',
        'dfus-gray-light': '#999999',
        'dfus-gray-medium': '#bababd',
        'dfus-error': '#ff8389',
        'dfus-bg-dark': '#222222',
        'dfus-text-muted': '#848689',
        'dfus-link': '#5B92FD',
        'dfus-light-gray': '#C6C6C6',
        'dfus-bg-darker': '#0A0D14',
        'dfus-bg-darkest': '#101520',
        'dfus-border-light': '#2a303a',
        'dfus-text-light': '#b5b6b8',
        'dfus-border-muted': '#54575B',
        'dfus-border-dark': '#22252B',
        'dfus-bg-blue': '#07122C',
        'dfus-bg-dark-blue': '#151a23',
        'dfus-white-transparent': '#FFFFFF75',
      },
    },
  },
  plugins: [
  ],
};
