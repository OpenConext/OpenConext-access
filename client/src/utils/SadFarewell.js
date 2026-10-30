// Easter egg: when an application is deactivated, a few tears roll down the page.
// To remove: delete this file and the single `sadFarewell(...)` call in ApplicationDetail.jsx.

const DURATION_MS = 3000;
const TEAR_COUNT = 10;
const STYLE_ID = "sad-farewell-style";

const css = `
.sad-farewell { position: fixed; inset: 0; z-index: 10000; pointer-events: none; overflow: hidden;
  background: radial-gradient(ellipse at top, rgba(70, 100, 140, 0.16), rgba(70, 100, 140, 0) 70%);
  animation: sad-farewell-fade ${DURATION_MS}ms ease-in-out forwards; }
.sad-farewell .tear { position: absolute; top: -40px; width: 12px; height: 17px; opacity: 0;
  background: linear-gradient(160deg, #cfe8ff, #5b9bd5);
  border-radius: 50% 50% 50% 50% / 65% 65% 35% 35%;
  box-shadow: inset -2px -2px 3px rgba(255, 255, 255, 0.5);
  animation: sad-farewell-fall var(--dur) cubic-bezier(0.45, 0, 0.9, 0.6) var(--delay) forwards; }
@keyframes sad-farewell-fall {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  10% { opacity: 0.9; transform: translateY(0) scale(1); }
  50% { opacity: 0.8; }
  100% { transform: translateY(75vh) scale(1); opacity: 0; }
}
@keyframes sad-farewell-fade { 0%, 100% { opacity: 0; } 15%, 80% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sad-farewell .tear { display: none; } }
`;

export const sadFarewell = () => {
    if (typeof document === "undefined" || document.querySelector(".sad-farewell")) {
        return;
    }
    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = css;
        document.head.appendChild(style);
    }
    const overlay = document.createElement("div");
    overlay.className = "sad-farewell";
    overlay.setAttribute("aria-hidden", "true");
    for (let i = 0; i < TEAR_COUNT; i++) {
        const tear = document.createElement("span");
        tear.className = "tear";
        tear.style.left = `${Math.random() * 98}%`;
        tear.style.setProperty("--delay", `${Math.random() * 1.2}s`);
        tear.style.setProperty("--dur", `${1.5 + Math.random() * 0.4}s`);
        overlay.appendChild(tear);
    }
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), DURATION_MS + 100);
};
