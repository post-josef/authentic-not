import { App } from "./app";
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
window.addEventListener(
    "beforeunload",
    () => {
        window.removeEventListener("resize", resize);
        app?.dispose();
    },
    { once: true },
);

route();
