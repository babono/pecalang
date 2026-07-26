import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // From the trigger.dev dashboard (Project settings). Set TRIGGER_PROJECT_REF
  // or replace the placeholder before `npx trigger.dev deploy`.
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_REPLACE_ME",
  dirs: ["./trigger"],
  // Ceiling per task run (seconds); a single page check is far quicker.
  maxDuration: 120,
  build: {
    // DB drivers + the Anthropic SDK resolve their own assets at runtime;
    // keep them out of the bundle (same reason as next.config's externals).
    external: ["@electric-sql/pglite", "postgres", "@anthropic-ai/sdk"],
  },
});
