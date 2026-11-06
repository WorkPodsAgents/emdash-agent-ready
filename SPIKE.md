# Spike notes (6 Nov 2026)

Nothing blocking. Findings from a local EmDash 1.4.0 site (`~/emdash-demo-site`, Starter
template, Node.js, `@emdash-cms/sandbox-workerd`) with `@emdash-cms/plugin-cli` 0.13.5.

## Demo site

`npm create emdash@1.4.0 -- --template starter --platform node`, then the dev-only
`/_emdash/api/setup/dev-bypass` instead of the passkey wizard. Eight entries were added with
`emdash content create` and REST (SEO panel values cannot be set through the CLI), plus three
uploaded images, covering each check: one entry that passes; a long title, long description, body
H1 and H2→H4 skip, an image without alt and only external links; a thin entry with no
description; a post and a page sharing a title and description; an entry whose featured image
and body image use the file name as alt; a draft; and a published entry hidden from search
engines. The Starter's own Welcome post and About page are thin.

## Entry shape (b)

- Bodies are Portable Text arrays: `block` nodes with `style` `normal` or `h1`–`h6`, `children`
  spans and `markDefs` (`{ _type: "link", href }`); `image` blocks
  (`{ asset: { _ref, url }, alt }`); `gallery` blocks with `images[]` of the same shape.
- `ctx.content.list(collection, { where: { status: "published" }, limit: 100, cursor })` returns
  `{ items, cursor, hasMore }`. Each item has `data` (fields by slug), `slug`, `locale` and, when
  the collection has SEO on, `seo: { title, description, image, canonical, noIndex }`.
- `ctx.schema.listCollections()` gives `routable`, `titleField`, `urlPattern`, `hasSeo` and
  field types (`portableText`, `image`), so the plugin finds bodies without guessing field names.
- `ctx.site.url` is the **Site URL** setting, `""` when unset, and is read when plugins load.
- `ctx.content.getPublicUrl()` exists but costs one host call per entry; it is not needed for the
  v1 checks.
- Templates render the entry title as the page H1 (`src/pages/posts/[slug].astro`), so "no H1 in
  the body" is the normal case. The check flags an H1 in the body and skipped levels instead.

## media:read is not needed (decision changed)

The rendered alt text comes from the content itself: `resolveImageMedia()` in
`emdash/src/content/converters/gallery.ts` uses the block's `alt`, then the alt cached on the
asset reference. The Media Library record is not read at render time, so using its alt would hide
images that render with no alt. Image fields store `alt` and `filename` inline too. The plugin
therefore asks for `content:read` and `schema:read` only.

## Admin UI (c)

Sandboxed plugins use Block Kit: the manifest declares `admin.pages` and `admin.widgets`, and one
route named `admin` answers `page_load` with `page: "/findings"` for the page and
`page: "widget:summary"` for the widget (`routeCtx.ui.surface` says which). EmDash validates the
response (256 KiB, 2,000 nodes). A `link` element with `target: { kind: "content", collection,
id, locale }` renders as `/_emdash/admin/content/posts/<id>?locale=en`, the entry editor.
External links render with `rel="noopener noreferrer"` in a new tab. Screenshots in `images/`.

## Author link on plugins.emdashcms.com (d)

Rendered DOM via headless Chrome (CDP), Author section of each listing, 6 Nov:

| Listing | Author link | rel |
| --- | --- | --- |
| `@emquix.com/quixseo` | `https://emquix.com/` | none |
| `@moorage.dev/seo` | `https://moorage.dev/` | none |
| `@hit.life/hit-seo` | `https://hit.life/` | none |
| `@lasymphonieagency.com/ai-alt-text` | `https://lasymphonieagency.com/` | none |
| `@tagperfect.eu/indexnow` | `https://tagperfect.eu/` | none |
| `@ranklybee.com/ranklybee` | `https://ranklybee.com/` | none |
| `@masonjames.com/contact-forms` | `https://masonjames.com/plugins/contact-forms/` | none |
| `@hlplanet.bsky.social/keyboard-sizes` | `https://www.hlplanet.com/keyboard-layout/` | none |

None of the 163 listings found through search has a `rel` on its author link (server HTML). Deep
paths are kept, so `https://workpods.ai/tools/agent-ready` should render as given. Listing pages
have a self canonical, no robots meta, and `robots.txt` allows everything.

## Limits worth knowing

- On Cloudflare a sandboxed invocation gets 50 ms CPU and 10 subrequests. The plugin makes one
  schema call and at most eight list calls (800 entries) per load, and says when it stops early.
- `@emdash-cms/plugin-test`'s runtime host takes about a minute to boot here, so the Block Kit
  test shares one host between its two cases; the check tests are plain function tests.
- `@emdash-cms/registry-verification` (used by `publish`) wants Node ^22.22.2; this machine has
  22.22.0. `validate` and `bundle` work; `publish` may need a Node update.
- The directory already lists SEO plugins (`@eclipsedigi.bsky.social/seo-guard`,
  `@nookeshk.bsky.social/seo-suite`, `@agenticecom.net/rendered-seo-inspector`,
  `@agenticecom.net/llms-txt`, `@mrhandsome39.bsky.social/image-alt-review`, `@emquix.com/quixseo`).
