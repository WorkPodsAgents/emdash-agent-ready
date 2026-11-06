import { describe, expect, it } from "vitest";

import {
	checkDescription,
	checkDuplicates,
	checkHeadings,
	checkImageAlt,
	checkInternalLinks,
	checkThin,
	checkTitle,
	runChecks,
} from "../src/checks";
import { goodPage, heading, image, paragraph, words } from "./fixtures";

const SITE = "https://example.com";

describe("Given a well-formed published entry", () => {
	it("When every check runs, Then nothing is reported", () => {
		expect(runChecks([goodPage(), goodPage()], SITE)).toEqual([]);
	});
});

describe("Title", () => {
	it("Given no title, When checked, Then it asks for one", () => {
		expect(checkTitle(goodPage({ title: "  " }))).toBe("Add a title.");
	});

	it("Given a 61-character title, When checked, Then it asks to shorten it to 60", () => {
		expect(checkTitle(goodPage({ title: "x".repeat(61) }))).toBe(
			"Shorten the title from 61 to 60 characters or fewer.",
		);
		expect(checkTitle(goodPage({ title: "x".repeat(60) }))).toBeNull();
	});
});

describe("Meta description", () => {
	it("Given no SEO description and no excerpt, When checked, Then it asks for one", () => {
		expect(checkDescription(goodPage({ description: "" }))).toMatch(/^Add a meta description/);
	});

	it("Given a 161-character description, When checked, Then it asks to shorten it", () => {
		expect(checkDescription(goodPage({ description: "d".repeat(161) }))).toBe(
			"Shorten the meta description from 161 to 160 characters or fewer.",
		);
		expect(checkDescription(goodPage({ description: "d".repeat(160) }))).toBeNull();
	});
});

describe("Headings", () => {
	it("Given an H1 in the body, When checked, Then it says the title is already the H1", () => {
		const page = goodPage({ body: [heading(1, "Again"), paragraph(words(300))] });
		expect(checkHeadings(page)).toMatch(/the body has an H1/);
	});

	it("Given H2 followed by H4, When checked, Then it names the skipped level", () => {
		const page = goodPage({ body: [heading(2, "A"), heading(4, "B"), heading(2, "C")] });
		expect(checkHeadings(page)).toBe("Fix the heading outline: H2 is followed by H4.");
	});

	it("Given a body that starts at H3, When checked, Then it reports the jump", () => {
		const page = goodPage({ body: [heading(3, "Deep")] });
		expect(checkHeadings(page)).toMatch(/H1 is followed by H3/);
	});
});

describe("Image alt text", () => {
	it("Given images with empty or file-name alt, When checked, Then it counts them", () => {
		const page = goodPage({
			body: [image(undefined), image("team-photo.jpg"), image("Our team at the offsite")],
			fieldImages: [{ alt: "", url: "/_emdash/api/media/file/cover.png" }],
		});
		expect(checkImageAlt(page)).toBe("Describe 3 of 4 images with alt text.");
	});

	it("Given a gallery whose images all have alt text, When checked, Then it passes", () => {
		const gallery = {
			_type: "gallery",
			images: [{ _type: "image", asset: { _ref: "a", url: "/x.jpg" }, alt: "Stage" }],
		};
		expect(checkImageAlt(goodPage({ body: [gallery] }))).toBeNull();
	});
});

describe("Thin pages", () => {
	it("Given a 120-word body, When checked, Then it asks for at least 300 words", () => {
		expect(checkThin(goodPage({ body: [paragraph(words(120))] }))).toBe(
			"Expand the body from 120 to at least 300 words.",
		);
	});
});

describe("Internal links", () => {
	it("Given only external and anchor links, When checked, Then it asks for one", () => {
		const hrefs = ["https://other.org/a", "#top", "//cdn.example.org/x"];
		const body = [paragraph(words(300), hrefs)];
		expect(checkInternalLinks(goodPage({ body }), SITE)).toMatch(/^Link to at least one/);
	});

	it("Given an absolute link to the site's own host, When checked, Then it passes", () => {
		const body = [paragraph(words(300), ["https://example.com/pricing"])];
		expect(checkInternalLinks(goodPage({ body }), SITE)).toBeNull();
	});
});

describe("Duplicates", () => {
	it("Given two entries with the same title, When checked, Then each names the other", () => {
		const a = goodPage({ label: "Pricing", title: "Pricing plans" });
		const b = goodPage({ label: "Plans", title: " pricing  PLANS " });
		const result = checkDuplicates([a, b, goodPage()]);
		expect(result.get(a)).toBe("Make this unique; it shares its title with “Plans”.");
		expect(result.get(b)).toBe("Make this unique; it shares its title with “Pricing”.");
		expect(result.size).toBe(2);
	});

	it("Given a shared description, When checked, Then it is reported as a duplicate", () => {
		const a = goodPage({ label: "A", description: "Same words." });
		const b = goodPage({ label: "B", description: "Same words." });
		expect(checkDuplicates([a, b]).get(a)).toMatch(/description with “B”/);
	});
});
