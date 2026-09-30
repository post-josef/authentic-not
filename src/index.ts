import { App } from "./app";
import { cameraManager } from "./managers/camera";
import { sceneManager } from "./managers/scene";

import "./styles.css";

let app: App | null = null;

function setView(mode: "welcome" | "exhibition") {
    document.body.classList.toggle("is-welcome", mode === "welcome");
    document.body.classList.toggle("is-exhibition", mode === "exhibition");
}

function route() {
    const id = sceneManager.sceneIdFromHash();
    if (!id) {
        app?.dispose();
        app = null;
        sceneManager.clearLoading();
        setView("welcome");
        return;
    }
    setView("exhibition");
    if (!app) {
        app = new App();
        app.init();
        app.resize();
    }
    if (sceneManager.getRouteId() !== id) {
        sceneManager.switchTo(id, true);
    }
}

const resize = () => app?.resize();
window.addEventListener("resize", resize);
window.addEventListener("hashchange", route);

const backButton = document.getElementById("exhibition-back");
backButton?.addEventListener("click", () => sceneManager.goBack());

const helpWrap = document.getElementById("exhibition-help");
const helpButton = document.getElementById("exhibition-help-btn");
const helpPanel = document.getElementById("exhibition-help-panel");
const helpClose = helpPanel?.querySelector<HTMLButtonElement>('[aria-label="Close"]');

const setHelpOpen = (open: boolean) => {
    helpPanel?.toggleAttribute("hidden", !open);
    helpButton?.setAttribute("aria-expanded", String(open));
    cameraManager.attachControl();
};

helpWrap?.querySelectorAll("button").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
});
helpButton?.addEventListener("click", () => setHelpOpen(true));
helpClose?.addEventListener("click", () => setHelpOpen(false));
document.addEventListener("click", (event) => {
    const target = event.target;
    if (helpPanel?.hidden || !helpWrap || (target instanceof Node && helpWrap.contains(target))) return;
    setHelpOpen(false);
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && helpPanel && !helpPanel.hidden) setHelpOpen(false);
});
window.addEventListener("beforeunload", () => {
    window.removeEventListener("resize", resize);
    app?.dispose();
});

route();
