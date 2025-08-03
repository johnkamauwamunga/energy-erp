module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'flame-dance': 'flame-dance 2s ease-in-out infinite alternate',
      },
      keyframes: {
        'flame-dance': {
          '0%': { transform: 'translateY(0px) scale(1)' },
          '100%': { transform: 'translateY(-5px) scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}