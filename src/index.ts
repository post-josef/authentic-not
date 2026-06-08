import { App } from "./app";

const app = new App();
app.init();

window.addEventListener("resize", () => {
    app.engine?.resize();
});
