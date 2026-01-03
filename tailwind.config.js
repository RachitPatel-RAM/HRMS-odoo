/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./public/**/*.{html,js}", "./src/**/*.{js,html}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#9C27B0",
                "primary-hover": "#6447e8",
                "background-light": "#f8f6f8",
                "card-light": "#FFFFFF",
                "text-light": "#1F2937",
                secondary: "#6A1B9A",
                active: "#9C27B0",
                "background-dark": "#1e131f",
                "paper-dark": "#2d2d2d"
            },
            fontFamily: {
                display: "Space Grotesk",
                body: ["'Gochi Hand'", "cursive"],
                sans: ["'Gochi Hand'", "cursive"]
            },
            borderRadius: { DEFAULT: "0.5rem" },
            boxShadow: {
                hand: "2px 3px 0px 0px rgba(0,0,0,1)",
                "hand-hover": "5px 6px 0px 0px rgba(123, 97, 255, 1)",
                "hand-dark": "3px 4px 0px 0px rgba(255,255,255,0.9)",
                "hand-hover-dark": "5px 6px 0px 0px rgba(123, 97, 255, 1)"
            }
        }
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography')
    ],
}
