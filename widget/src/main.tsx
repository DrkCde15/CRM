import { createRoot } from "react-dom/client";
import ChatWidget from "./widget";
import stylesText from "./styles.css?inline";

function bootstrap() {
  const mount = document.getElementById("convexo-chat");
  if (!mount) return;

  const host = document.createElement("div");
  const shadow = mount.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = stylesText;
  shadow.appendChild(style);
  shadow.appendChild(host);

  const token = mount.getAttribute("data-token") || (window as any).CONVEXO_TOKEN || "";
  const root = createRoot(host);
  root.render(<ChatWidget token={token} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
