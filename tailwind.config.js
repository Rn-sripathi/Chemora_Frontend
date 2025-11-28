/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                chemistry: {
                    primary: '#0f172a', // Slate 900
                    secondary: '#1e293b', // Slate 800
                    accent: '#38bdf8', // Sky 400
                    highlight: '#818cf8', // Indigo 400
                    success: '#34d399', // Emerald 400
                    warning: '#fbbf24', // Amber 400
                    error: '#f87171', // Red 400
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            backgroundImage: {
                'molecule-pattern': "url('https://www.transparenttextures.com/patterns/cubes.png')", // Subtle pattern
            }
        },
    },
    plugins: [],
}
