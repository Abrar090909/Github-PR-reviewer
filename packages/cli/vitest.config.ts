import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // Measured, not guessed: a canvas command spends ~95% of its time
    // spawning git (2-6 processes, ~40ms each on an idle Windows machine,
    // several times that with every test file running in parallel). Tests
    // that chain three commands reached 4.5s of vitest's default 5s under a
    // doubled load, so the default left no headroom on Windows.
    testTimeout: 15_000,
  },
});
