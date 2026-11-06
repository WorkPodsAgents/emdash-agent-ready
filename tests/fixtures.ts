import type { Page } from "../src/checks";

let key = 0;

export function paragraph(text: string, links: string[] = []) {
	key += 1;
	return {
		_type: "block",
		_key: `b${key}`,
		style: "normal",
		markDefs: links.map((href, i) => ({ _type: "link", _key: `l${key}-${i}`, href })),
		children: [
			{ _type: "span", _key: `s${key}`, text, marks: links.map((_, i) => `l${key}-${i}`) },
		],
	};
}

export function heading(level: number, text: string) {
	return { ...paragraph(text), style: `h${level}` };
}

export function image(alt: string | undefined, url = "/_emdash/api/media/file/team-photo.jpg") {
	key += 1;
	return { _type: "image", _key: `i${key}`, asset: { _ref: `m${key}`, url }, alt };
}

export function words(count: number): string {
	return Array.from({ length: count }, (_, i) => `word${i}`).join(" ");
}

/** A page that passes every check; tests override the one property they exercise. */
export function goodPage(overrides: Partial<Page> = {}): Page {
	return {
		collection: "posts",
		id: overrides.id ?? `entry-${++key}`,
		locale: "en",
		label: "A good post",
		title: `How we plan a launch ${key}`,
		description: `A short, specific summary of what this post answers, number ${key}.`,
		body: [
			heading(2, "Why it matters"),
			paragraph(words(320), ["/posts/related"]),
			image("Three people around a whiteboard"),
		],
		fieldImages: [],
		...overrides,
	};
}
