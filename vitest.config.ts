import { emdashPluginTest } from "@emdash-cms/plugin-test/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [emdashPluginTest()],
	// The admin test boots EmDash and workerd, which takes about a minute on a cold start.
	test: { testTimeout: 180_000, hookTimeout: 180_000 },
});
