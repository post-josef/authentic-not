import { App } from "./app";

import "./styles.css";

const app = new App();
app.init();

window.addEventListener("resize", () => {
    app.engine?.resize();
});
