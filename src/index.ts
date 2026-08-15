import { App } from "./app";

import "./styles.css";

const app = new App();
app.init();

const resize = () => app.resize();
window.addEventListener("resize", resize);
window.addEventListener(
    "beforeunload",
    () => {
        window.removeEventListener("resize", resize);
        app.dispose();
    },
    { once: true },
);
