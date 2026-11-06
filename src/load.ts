import type { PluginContext } from "emdash/plugin";

import type { Page } from "./checks";
import type { BodyImage } from "./portable-text";

type Collection = Awaited<ReturnType<NonNullable<PluginContext["schema"]>["listCollections"]>>[0];
type Entry = Awaited<ReturnType<NonNullable<PluginContext["content"]>["list"]>>["items"][0];

// Each host call from the sandbox is a subrequest and Cloudflare allows ten per invocation: one
// goes to the schema, the rest to listing pages of 100 entries. The report says when it stops.
export const MAX_LIST_CALLS = 8;
const PAGE_SIZE = 100;

export interface Loaded {
	pages: Page[];
	collections: number;
	truncated: boolean;
}

function text(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function fieldImage(value: unknown): BodyImage | null {
	if (typeof value !== "object" || value === null) return null;
	const media = value as Record<string, unknown>;
	return { alt: text(media.alt), url: text(media.src) || text(media.filename) };
}

function toPage(collection: Collection, entry: Entry): Page {
	const data = entry.data;
	const title = text(data[collection.titleField ?? "title"]) || text(data.title);
	const body: unknown[] = [];
	const fieldImages: BodyImage[] = [];
	for (const field of collection.fields) {
		const value = data[field.slug];
		if (field.type === "portableText" && Array.isArray(value)) body.push(...value);
		if (field.type === "image") {
			const image = fieldImage(value);
			if (image) fieldImages.push(image);
		}
	}
	return {
		collection: collection.slug,
		id: entry.id,
		locale: entry.locale,
		label: title || entry.slug || entry.id,
		// Same fallbacks as EmDash's getSeoMeta(): SEO panel first, then the entry's own fields.
		title: entry.seo?.title || title,
		description: entry.seo?.description || text(data.excerpt),
		body,
		fieldImages,
	};
}

/** Published, indexable entries of every routable collection, up to MAX_LIST_CALLS pages. */
export async function loadPages(ctx: PluginContext): Promise<Loaded> {
	if (!ctx.schema || !ctx.content) throw new Error("content:read and schema:read are required");
	const collections = (await ctx.schema.listCollections()).filter((c) => c.routable);
	const pages: Page[] = [];
	let calls = 0;
	let truncated = false;
	for (const collection of collections) {
		let cursor: string | undefined;
		do {
			if (calls === MAX_LIST_CALLS) {
				truncated = true;
				break;
			}
			calls += 1;
			const result = await ctx.content.list(collection.slug, {
				limit: PAGE_SIZE,
				cursor,
				where: { status: "published" },
			});
			for (const entry of result.items) {
				if (!entry.seo?.noIndex) pages.push(toPage(collection, entry));
			}
			cursor = result.hasMore ? result.cursor : undefined;
		} while (cursor);
	}
	return { pages, collections: collections.length, truncated };
}
