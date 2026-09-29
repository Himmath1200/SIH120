/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0b1220", 900: "#111a2e", 800: "#18233d", 700: "#22314f", 600: "#34466b" },
        accent: { DEFAULT: "#f59e0b", soft: "#fbbf24" },
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        drift: { "0%,100%": { transform: "translate(0,0) scale(1)" }, "33%": { transform: "translate(40px,-30px) scale(1.08)" }, "66%": { transform: "translate(-30px,25px) scale(0.95)" } },
        fadeUp: { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "none" } },
        shine: { from: { transform: "translateX(-120%)" }, to: { transform: "translateX(220%)" } },
        rise: { "0%": { transform: "translateY(0) scale(.6)", opacity: "0" }, "20%": { opacity: ".9" }, "100%": { transform: "translateY(-120px) scale(1.4)", opacity: "0" } },
        rock: { "0%,100%": { transform: "rotate(-9deg)" }, "50%": { transform: "rotate(9deg)" } },
        rod: { "0%,100%": { transform: "translateY(-7px)" }, "50%": { transform: "translateY(7px)" } },
        flow: { to: { strokeDashoffset: "-24" } },
        gradient: { "0%,100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
      },
      animation: {
        float: "float 4s ease-in-out infinite",
        drift: "drift 22s ease-in-out infinite",
        "fade-up": "fadeUp .55s cubic-bezier(.2,.7,.2,1) both",
        gradient: "gradient 6s ease infinite",
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"] },
    },
  },
  plugins: [],
};
