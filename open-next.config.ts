import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache: every page is static or a plain API route, so R2 is not needed.
export default defineCloudflareConfig({});
