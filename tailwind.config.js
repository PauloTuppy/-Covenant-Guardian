/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#208082',
                secondary: '#32b8c6',
                accent: '#e67f61',
                danger: '#c0152f',
                warning: '#a84b2f',
                success: '#208082',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['Berkeley Mono', 'Menlo', 'monospace'],
            },
        },
    },
    plugins: [],
}
