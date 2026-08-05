import "./styles.css";
import { registerSW } from "virtual:pwa-register";
import { createApp } from "./app/create-app";

registerSW({ immediate: true });

const app = document.getElementById("app")!;
const toastEl = document.getElementById("toast")!;

createApp(app, toastEl).init();
