/** @type {import('tailwindcss').Config} */

/**
 * WEB-006 — the ZCode enter/exit utilities.
 *
 * The reference docs (`ZCODE-ANIMATIONS.md`) are extracted from a **Tailwind v4.2.2**
 * build, so `animate-in`, `fade-in-*`, `zoom-in-*` and `slide-in-from-*` are quoted
 * in the spec and used at 12 call sites in this repo. This project is on **v3**
 * with `plugins: []` and neither `tailwindcss-animate` nor `tw-animate-css`
 * installed — so every one of those classes generated *nothing* and the menus,
 * file trees, search panel, context menus and settings modal all appeared abruptly
 * while the source read as if the animation were handled.
 *
 * Rather than delete the call sites or add a dependency for a 4-utility subset,
 * the utilities are defined here against the **spec's own timing**: 200 ms enter,
 * `cubic-bezier(0.16, 1, 0.3, 1)` — the same values as `.mcode-stream-text-in`.
 *
 * Keep in sync: `packages/web/tests/no-dead-utilities.test.js` fails if a
 * `animate-in` / `fade-in` / `zoom-in` / `slide-in-from` token is used but is not
 * produced by this plugin.
 */
const EASE_ENTER = 'cubic-bezier(0.16, 1, 0.3, 1)';
const ENTER_DURATION = '200ms';

/** Scale values the call sites actually use (Tailwind's 0/50/75/90/95/100). */
const SCALES = { 0: '0', 50: '.5', 75: '.75', 80: '.8', 90: '.9', 95: '.95', 100: '1' };

/** Tailwind spacing steps used by `slide-in-from-*`. */
const SLIDE_OFFSETS = { 1: '0.25rem', 2: '0.5rem', 4: '1rem', 8: '2rem' };

const zcodeEnterExit = ({ addUtilities }) => {
  const duration = ENTER_DURATION;
  const easing = EASE_ENTER;

  // animate-in / animate-out
  addUtilities({
    '.animate-in': { animation: `mcode-enter ${duration} ${easing} both` },
    '.animate-out': { animation: `mcode-exit 150ms cubic-bezier(0.4, 0, 1, 1) both` },
  });

  // Bare `fade-in` / `fade-out` / `zoom-in` / `zoom-out` (no scale suffix) —
  // used by the change-password modal in SettingsPage. In tailwindcss-animate
  // these are shorthand for the `0` / `100` variant.
  addUtilities({
    '.fade-in': { '--tw-enter-opacity': '0', animation: `mcode-enter ${duration} ${easing} both` },
    '.fade-out': { '--tw-exit-opacity': '0', animation: 'mcode-exit 150ms cubic-bezier(0.4, 0, 1, 1) both' },
    '.zoom-in': { '--tw-enter-scale': '.95', animation: `mcode-enter ${duration} ${easing} both` },
    '.zoom-out': { '--tw-exit-scale': '.95', animation: 'mcode-exit 150ms cubic-bezier(0.4, 0, 1, 1) both' },
  });

  // fade-in-{scale} / fade-out-{scale}
  for (const [pct, scale] of Object.entries(SCALES)) {
    addUtilities({
      [`.fade-in-${pct}`]: { '--tw-enter-opacity': scale, animation: `mcode-enter ${duration} ${easing} both` },
      [`.fade-out-${pct}`]: { '--tw-exit-opacity': scale, animation: `mcode-exit 150ms cubic-bezier(0.4, 0, 1, 1) both` },
    });
  }

  // zoom-in-{scale} / zoom-out-{scale}
  for (const [pct, scale] of Object.entries(SCALES)) {
    addUtilities({
      [`.zoom-in-${pct}`]: { '--tw-enter-scale': scale, animation: `mcode-enter ${duration} ${easing} both` },
      [`.zoom-out-${pct}`]: { '--tw-exit-scale': scale, animation: `mcode-exit 150ms cubic-bezier(0.4, 0, 1, 1) both` },
    });
  }

  // slide-in-from-{side}-{size} / slide-out-to-{side}-{size}
  const axes = {
    top:    { enter: '--tw-enter-translate-y', exit: '--tw-exit-translate-y',  sign: '-1' },
    bottom: { enter: '--tw-enter-translate-y', exit: '--tw-exit-translate-y',  sign: '1' },
    left:   { enter: '--tw-enter-translate-x', exit: '--tw-exit-translate-x', sign: '-1' },
    right:  { enter: '--tw-enter-translate-x', exit: '--tw-exit-translate-x', sign: '1' },
  };
  for (const [side, { enter, exit, sign }] of Object.entries(axes)) {
    for (const [size, offset] of Object.entries(SLIDE_OFFSETS)) {
      const enter_ = `${sign} * ${offset}`;
      addUtilities({
        [`.slide-in-from-${side}-${size}`]:  { [enter]: enter_, animation: `mcode-enter ${duration} ${easing} both` },
        [`.slide-out-to-${side}-${size}`]:  { [exit]:  enter_, animation: `mcode-exit 150ms cubic-bezier(0.4, 0, 1, 1) both` },
      });
    }
  }
};

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* WEB-008: pin the emerald ramp used across the chat path to the
           spec's mcode green so raw `text-emerald-400/500` cannot drift
           from `--mcode-green (#3ecf8e)`. Only the two shades used in the
           chat layer are overridden; the rest of the default ramp merges
           through via `extend`. */
        emerald: {
          400: "#38b383",
          500: "#3ecf8e",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        frame: "hsl(var(--frame))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      animation: {
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
      },
      keyframes: {
        "border-beam": {
          "100%": {
            "offset-distance": "100%",
          },
        },
        // Enter/exit driven by the utilities above. Opacity, scale and the two
        // translate axes are composed from CSS custom properties so that
        // `fade-in-*`, `zoom-in-*` and `slide-in-from-*` stack instead of
        // overwriting each other (this is the same trick tailwindcss-animate uses).
        "mcode-enter": {
          "from": {
            opacity: "var(--tw-enter-opacity, 0)",
            transform:
              "translate(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0)) scale(var(--tw-enter-scale, 1))",
          },
          "to": { opacity: "1", transform: "translate(0, 0) scale(1)" },
        },
        "mcode-exit": {
          "from": { opacity: "1", transform: "translate(0, 0) scale(1)" },
          "to": {
            opacity: "var(--tw-exit-opacity, 0)",
            transform:
              "translate(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0)) scale(var(--tw-exit-scale, 1))",
          },
        },
      },
    },
  },
  plugins: [zcodeEnterExit],
}
