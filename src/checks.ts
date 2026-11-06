import { bodyImages, headingLevels, linkHrefs, wordCount, type BodyImage } from "./portable-text";

/** One published entry, reduced to what the checks read. */
export interface Page {
	collection: string;
	id: string;
	locale: string | null;
	/** Name shown in the report: the entry title, or its slug when the title is empty. */
	label: string;
	/** The title search engines see: the SEO panel title, else the entry title. */
	title: string;
	/** The meta description: the SEO panel description, else the excerpt. */
	description: string;
	/** Every Portable Text field of the entry, concatenated in schema order. */
	body: unknown[];
	/** Images from image fields such as a featured image. */
	fieldImages: BodyImage[];
}

export type CheckId =
	| "title"
	| "description"
	| "headings"
	| "image-alt"
	| "thin"
	| "internal-links"
	| "duplicates";

export interface Finding {
	check: CheckId;
	page: Page;
	/** What to fix, in one sentence. */
	fix: string;
}

// Google rewrites or truncates titles wider than the result column (about 600px, ~60 characters).
export const TITLE_MAX = 60;
// EmDash's SEO panel counts against 160; Google trims snippets near that length.
export const DESCRIPTION_MAX = 160;
// No search engine sets a minimum. 300 words is the common editorial floor below which a page
// rarely answers a question fully enough to be cited.
export const THIN_WORDS = 300;

function length(text: string): number {
	return [...text].length;
}

export function checkTitle(page: Page): string | null {
	const n = length(page.title.trim());
	if (n === 0) return "Add a title.";
	if (n > TITLE_MAX) {
		return `Shorten the title from ${n} to ${TITLE_MAX} characters or fewer.`;
	}
	return null;
}

export function checkDescription(page: Page): string | null {
	const n = length(page.description.trim());
	if (n === 0) return "Add a meta description in the SEO panel, or an excerpt.";
	if (n > DESCRIPTION_MAX) {
		return `Shorten the meta description from ${n} to ${DESCRIPTION_MAX} characters or fewer.`;
	}
	return null;
}

// EmDash templates render the entry title as the page's H1, so the body outline starts at H2.
export function checkHeadings(page: Page): string | null {
	const problems: string[] = [];
	let previous = 1;
	let bodyH1 = false;
	for (const level of headingLevels(page.body)) {
		if (level === 1) bodyH1 = true;
		else if (level > previous + 1) problems.push(`H${previous} is followed by H${level}`);
		previous = level;
	}
	if (bodyH1) {
		problems.unshift("the body has an H1, but the title is already the page H1; use H2");
	}
	if (problems.length === 0) return null;
	return `Fix the heading outline: ${problems.join("; ")}.`;
}

function fileStem(url: string): string {
	const name = url.split(/[?#]/)[0]?.split("/").pop() ?? "";
	return decodeURIComponent(name).replace(/\.[a-z0-9]+$/i, "").toLowerCase();
}

// EmDash's editor does not count an alt that only repeats the file name, and neither do we.
function hasAlt(image: BodyImage): boolean {
	const alt = image.alt.trim();
	if (!alt) return false;
	const stem = fileStem(image.url);
	return stem === "" || (alt.toLowerCase() !== stem && fileStem(alt) !== stem);
}

export function checkImageAlt(page: Page): string | null {
	const images = [...page.fieldImages, ...bodyImages(page.body)];
	const missing = images.filter((image) => !hasAlt(image)).length;
	if (missing === 0) return null;
	const noun = missing === 1 ? "image" : "images";
	return `Describe ${missing} of ${images.length} ${noun} with alt text.`;
}

export function checkThin(page: Page): string | null {
	const words = wordCount(page.body);
	if (words >= THIN_WORDS) return null;
	return `Expand the body from ${words} to at least ${THIN_WORDS} words.`;
}

function isInternal(href: string, siteHost: string | null): boolean {
	if (href.startsWith("#")) return false;
	if (href.startsWith("/")) return !href.startsWith("//");
	try {
		return siteHost !== null && new URL(href).host === siteHost;
	} catch {
		return false;
	}
}

function hostOf(siteUrl: string): string | null {
	try {
		return new URL(siteUrl).host;
	} catch {
		return null;
	}
}

export function checkInternalLinks(page: Page, siteUrl: string): string | null {
	const host = hostOf(siteUrl);
	if (linkHrefs(page.body).some((href) => isInternal(href, host))) return null;
	return "Link to at least one related page on this site from the body.";
}

function normalized(text: string): string {
	return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function groupBy(pages: Page[], key: (page: Page) => string): Map<string, Page[]> {
	const groups = new Map<string, Page[]>();
	for (const page of pages) {
		const value = normalized(key(page));
		if (!value) continue;
		groups.set(value, [...(groups.get(value) ?? []), page]);
	}
	return groups;
}

function others(page: Page, group: Page[]): string {
	return group
		.filter((other) => other !== page)
		.map((other) => `“${other.label}”`)
		.join(", ");
}

/** Pages that share a title or description with another page, keyed by page. */
export function checkDuplicates(pages: Page[]): Map<Page, string> {
	const fixes = new Map<Page, string[]>();
	const add = (page: Page, text: string) => fixes.set(page, [...(fixes.get(page) ?? []), text]);
	for (const group of groupBy(pages, (page) => page.title).values()) {
		if (group.length < 2) continue;
		for (const page of group) add(page, `title with ${others(page, group)}`);
	}
	for (const group of groupBy(pages, (page) => page.description).values()) {
		if (group.length < 2) continue;
		for (const page of group) add(page, `description with ${others(page, group)}`);
	}
	const result = new Map<Page, string>();
	for (const [page, parts] of fixes) {
		result.set(page, `Make this unique; it shares its ${parts.join(" and its ")}.`);
	}
	return result;
}

export function runChecks(pages: Page[], siteUrl: string): Finding[] {
	const findings: Finding[] = [];
	const perPage: Array<[CheckId, (page: Page) => string | null]> = [
		["title", checkTitle],
		["description", checkDescription],
		["headings", checkHeadings],
		["image-alt", checkImageAlt],
		["thin", checkThin],
		["internal-links", (page) => checkInternalLinks(page, siteUrl)],
	];
	for (const [check, run] of perPage) {
		for (const page of pages) {
			const fix = run(page);
			if (fix) findings.push({ check, page, fix });
		}
	}
	for (const [page, fix] of checkDuplicates(pages)) {
		findings.push({ check: "duplicates", page, fix });
	}
	return findings;
}
