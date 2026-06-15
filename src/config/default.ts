import manifestData from "../../sites.yaml";
import { parseManifest } from "./load.ts";

export function loadDefaultManifest() {
  return parseManifest(manifestData);
}
