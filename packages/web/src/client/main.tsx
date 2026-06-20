/** @jsxImportSource react */

import "@vitejs/plugin-react/preamble";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SearchPage } from "./pages/search-page";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Mikuru root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <SearchPage />
  </StrictMode>,
);
