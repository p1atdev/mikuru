import { Hono } from "hono";
import { loadDefaultManifest } from "core/src/config/default";
import { registerCheckApi } from "./api/check";
import { registerSitesApi } from "./api/sites";
import { HomePage } from "./pages/home";
import { renderer } from "./renderer";

const app = new Hono();
const manifest = loadDefaultManifest();

app.use(renderer);

app.get("/", (c) => {
  return c.render(<HomePage />);
});

registerSitesApi(app, manifest);
registerCheckApi(app, manifest);

export default app;
