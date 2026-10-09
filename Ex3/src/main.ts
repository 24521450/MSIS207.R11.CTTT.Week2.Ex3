import "./styles.css";
import { createDataFeedApp } from "./app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("The app root element was not found.");
}

const app = createDataFeedApp(root);

window.addEventListener(
  "pagehide",
  () => {
    app.dispose();
  },
  { once: true },
);
