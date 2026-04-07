import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerOfflineServiceWorker } from "@/lib/offlineMedia";

registerOfflineServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
