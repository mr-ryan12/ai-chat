import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Separate from vite.config.ts on purpose: the Remix plugin isn't meant to run
// under the test runner. We only need the `~/` path alias here.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
