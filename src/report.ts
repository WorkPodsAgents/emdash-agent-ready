import type { Block, BlockResponse, LinkElement } from "@emdash-cms/blocks";

import type { CheckId, Finding } from "./checks";
import { DESCRIPTION_MAX, THIN_WORDS, TITLE_MAX } from "./checks";

export const PAGE_PATH = "/findings";
export const WIDGET_ID = "summary";

// Keeps the largest report well inside Block Kit's 256 KiB response limit.
export const ROWS_PER_CHECK = 50;

const EXTENSION_URL = "https://workpods.ai/tools/agent-ready";

export const CHECKS: Array<{ id: CheckId; label: string; why: string }> = [
	{
		id: "title",
		label: "Title missing or too long",
		why:
			"Search results and AI answers show the title first; " +
			`past ${TITLE_MAX} characters it is cut.`,
	},
	{
		id: "description",
		label: "Meta description missing or too long",
		why: `Used as the result snippet; past ${DESCRIPTION_MAX} characters it is cut.`,
	},
	{
		id: "headings",
		label: "Extra H1 or skipped heading levels",
		why: "Crawlers and agents read the heading outline to find each section's topic.",
	},
	{
		id: "image-alt",
		label: "Images without alt text",
		why:
			"Alt text is the only description of an image that search engines, " +
			"agents and screen readers get.",
	},
	{
		id: "thin",
		label: "Thin pages",
		why:
			`Pages under ${THIN_WORDS} words rarely answer a question ` +
			"well enough to rank or be cited.",
	},
	{
		id: "internal-links",
		label: "No internal links in the body",
		why: "Links between your pages help crawlers find them and show how topics relate.",
	},
	{
		id: "duplicates",
		label: "Duplicate titles or descriptions",
		why: "Pages that look the same compete with each other, and search engines pick one.",
	},
];

export interface Scan {
	findings: Finding[];
	pagesChecked: number;
	collections: number;
	/** True when the scan stopped at its entry limit before reading every published entry. */
	truncated: boolean;
}

function editLink(finding: Finding): LinkElement {
	const { collection, id, locale } = finding.page;
	return {
		type: "link",
		label: "Edit",
		target: { kind: "content", collection, id, ...(locale ? { locale } : {}) },
	};
}

function checkSection(check: (typeof CHECKS)[number], findings: Finding[]): Block {
	const shown = findings.slice(0, ROWS_PER_CHECK);
	const blocks: Block[] = [{ type: "context", text: check.why }];
	if (findings.length === 0) {
		blocks.push({ type: "section", text: "No issues found." });
	} else {
		blocks.push({
			type: "table",
			page_action_id: `more_${check.id}`,
			columns: [
				{ key: "entry", label: "Entry" },
				{ key: "collection", label: "Collection", format: "badge" },
				{ key: "fix", label: "What to fix" },
				{ key: "edit", label: "", format: "element" },
			],
			rows: shown.map((finding) => ({
				entry: finding.page.label,
				collection: finding.page.collection,
				fix: finding.fix,
				edit: editLink(finding),
			})),
		});
	}
	if (findings.length > shown.length) {
		blocks.push({
			type: "context",
			text:
				`Showing ${shown.length} of ${findings.length}. ` +
				"Fix these and reload to see the rest.",
		});
	}
	return {
		type: "accordion",
		label: `${check.label} (${findings.length})`,
		default_open: findings.length > 0,
		blocks,
	};
}

function entriesWithIssues(findings: Finding[]): number {
	return new Set(findings.map((finding) => finding.page)).size;
}

const PARTIAL: Block = {
	type: "banner",
	variant: "alert",
	title: "Partial scan",
	description: "The scan stopped at its entry limit, so some published entries were not read.",
};

function scope(scan: Scan): string {
	return (
		`Checked ${scan.pagesChecked} published entries in ${scan.collections} collections. ` +
		"Entries hidden from search engines are skipped."
	);
}

export function renderPage(scan: Scan): BlockResponse {
	const byCheck = (id: CheckId) => scan.findings.filter((finding) => finding.check === id);
	return {
		blocks: [
			{ type: "header", text: "Agent Ready" },
			{ type: "context", text: scope(scan) },
			...(scan.truncated ? [PARTIAL] : []),
			{
				type: "stats",
				items: [
					{ label: "Entries checked", value: scan.pagesChecked },
					{ label: "Entries with issues", value: entriesWithIssues(scan.findings) },
					{ label: "Issues", value: scan.findings.length },
				],
			},
			...CHECKS.map((check) => checkSection(check, byCheck(check.id))),
			{ type: "divider" },
			{
				type: "actions",
				elements: [
					{
						type: "link",
						label:
							"Check live pages, llms.txt and robots.txt " +
							"with the free Agent Ready Chrome extension",
						target: { kind: "external", url: EXTENSION_URL },
						appearance: "inline",
					},
				],
			},
		],
	};
}

export function renderWidget(scan: Scan): BlockResponse {
	return {
		blocks: [
			{
				type: "stats",
				items: [
					{ label: "Entries checked", value: scan.pagesChecked },
					{ label: "With issues", value: entriesWithIssues(scan.findings) },
					{ label: "Issues", value: scan.findings.length },
				],
			},
			{
				type: "actions",
				elements: [
					{
						type: "link",
						label: "See what to fix",
						target: { kind: "plugin-page", path: PAGE_PATH },
					},
				],
			},
		],
	};
}
