// Readers for EmDash Portable Text bodies. Bodies are untrusted JSON from the database, so every
// reader tolerates missing or malformed nodes instead of trusting the declared shape.

export interface BodyImage {
	alt: string;
	url: string;
}

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nodes(value: unknown): Node[] {
	return Array.isArray(value) ? value.filter(isNode) : [];
}

function str(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function textBlocks(body: unknown): Node[] {
	return nodes(body).filter((node) => node._type === "block");
}

function blockText(block: Node): string {
	return nodes(block.children)
		.map((child) => str(child.text))
		.join("");
}

export function plainText(body: unknown): string {
	return textBlocks(body).map(blockText).join("\n");
}

export function wordCount(body: unknown): number {
	return plainText(body)
		.split(/\s+/)
		.filter((word) => word.length > 0).length;
}

/** Heading levels (1–6) in document order. */
export function headingLevels(body: unknown): number[] {
	const levels: number[] = [];
	for (const block of textBlocks(body)) {
		const match = /^h([1-6])$/.exec(str(block.style));
		if (match) levels.push(Number(match[1]));
	}
	return levels;
}

/** Link targets from link annotations on text blocks. */
export function linkHrefs(body: unknown): string[] {
	const hrefs: string[] = [];
	for (const block of textBlocks(body)) {
		for (const def of nodes(block.markDefs)) {
			const href = str(def.href).trim();
			if (def._type === "link" && href) hrefs.push(href);
		}
	}
	return hrefs;
}

function imageOf(node: Node): BodyImage {
	const asset = isNode(node.asset) ? node.asset : {};
	// The site renders the block's own alt, then the alt cached on the asset reference
	// (EmDash's resolveImageMedia); the Media Library record is not consulted at render time.
	return { alt: str(node.alt) || str(asset.alt), url: str(asset.url) || str(asset.src) };
}

/** Images from image blocks and gallery blocks. */
export function bodyImages(body: unknown): BodyImage[] {
	const images: BodyImage[] = [];
	for (const node of nodes(body)) {
		if (node._type === "image") images.push(imageOf(node));
		if (node._type === "gallery") images.push(...nodes(node.images).map(imageOf));
	}
	return images;
}
