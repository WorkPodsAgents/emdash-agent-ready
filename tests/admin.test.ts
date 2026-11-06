import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPluginRuntimeTestHost, type PluginRuntimeTestHost } from "@emdash-cms/plugin-test";

import { heading, image, paragraph, words } from "./fixtures";

let host: PluginRuntimeTestHost;

async function siteWithEntries(): Promise<PluginRuntimeTestHost> {
	const site = await createPluginRuntimeTestHost({ site: { url: "https://example.com" } });
	await site.fixtures.collection({
		slug: "posts",
		label: "Posts",
		urlPattern: "/posts/{slug}",
		hasSeo: true,
		supports: ["seo"],
		fields: [
			{ slug: "title", label: "Title", type: "string" },
			{ slug: "content", label: "Content", type: "portableText" },
			{ slug: "excerpt", label: "Excerpt", type: "text" },
		],
	});
	await site.fixtures.content("posts", {
		slug: "good",
		status: "published",
		data: {
			title: "A post that passes",
			excerpt: "Everything a reader needs to know, in one line.",
			content: [
				heading(2, "Intro"),
				paragraph(words(320), ["/posts/thin"]),
				image("A chart"),
			],
		},
	});
	await site.fixtures.content("posts", {
		slug: "thin",
		status: "published",
		data: { title: "Thin", content: [heading(1, "Thin"), paragraph("Too short."), image("")] },
	});
	await site.fixtures.content("posts", {
		slug: "draft",
		status: "draft",
		data: { title: "", content: [] },
	});
	return site;
}

describe("Given published entries with problems and a draft", () => {
	// Both tests only read, so they share one host; booting one takes about a minute.
	beforeAll(async () => {
		host = await siteWithEntries();
	});
	afterAll(() => host.dispose());

	it("When the admin page loads, Then it reports each check with edit links", async () => {
		const response = await host.admin.loadPage("/findings");
		const blocks = response.blocks;

		expect(blocks[0]).toEqual({ type: "header", text: "Agent Ready" });
		expect(blocks).toContainEqual({
			type: "stats",
			items: [
				{ label: "Entries checked", value: 2 },
				{ label: "Entries with issues", value: 1 },
				{ label: "Issues", value: 5 },
			],
		});
		const sections = blocks.filter((block) => block.type === "accordion");
		expect(sections.map((block) => block.label)).toEqual([
			"Title missing or too long (0)",
			"Meta description missing or too long (1)",
			"Extra H1 or skipped heading levels (1)",
			"Images without alt text (1)",
			"Thin pages (1)",
			"No internal links in the body (1)",
			"Duplicate titles or descriptions (0)",
		]);
		const thin = sections[4]?.blocks.find((block) => block.type === "table");
		expect(thin?.rows[0]).toMatchObject({
			entry: "Thin",
			collection: "posts",
			fix: "Expand the body from 3 to at least 300 words.",
			edit: { type: "link", target: { kind: "content", collection: "posts" } },
		});
		expect(blocks.at(-1)).toMatchObject({
			type: "actions",
			elements: [
				{ target: { kind: "external", url: "https://workpods.ai/tools/agent-ready" } },
			],
		});
	});

	it("When the dashboard widget loads, Then it shows the summary counts", async () => {
		const response = await host.admin.loadWidget("summary");
		expect(response.blocks[0]).toEqual({
			type: "stats",
			items: [
				{ label: "Entries checked", value: 2 },
				{ label: "With issues", value: 1 },
				{ label: "Issues", value: 5 },
			],
		});
	});
});
