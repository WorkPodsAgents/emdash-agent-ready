import type { SandboxedPlugin } from "emdash/plugin";

import { runChecks } from "./checks";
import { loadPages } from "./load";
import { renderPage, renderWidget, type Scan } from "./report";

const plugin: SandboxedPlugin = {
	routes: {
		// Block Kit calls this for the page and the widget. Both only read, so every interaction,
		// whatever its type, re-runs the scan and returns the current report.
		admin: {
			handler: async (routeCtx, ctx) => {
				const loaded = await loadPages(ctx);
				const scan: Scan = {
					findings: runChecks(loaded.pages, ctx.site.url),
					pagesChecked: loaded.pages.length,
					collections: loaded.collections,
					truncated: loaded.truncated,
				};
				const widget = routeCtx.ui?.surface === "dashboard-widget";
				return widget ? renderWidget(scan) : renderPage(scan);
			},
		},
	},
};

export default plugin;
