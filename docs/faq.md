### Why does it say my body has an extra H1?

EmDash templates render the entry title as the page's H1, so headings in the body should start
at H2. If your template does not render the title as an H1, ignore this finding.

### Which title and description does it check?

The ones search engines get: the SEO panel's title and description, falling back to the entry
title and excerpt, the same way EmDash's `getSeoMeta()` does.

### Does it check my live pages?

No. It reads content inside EmDash only, so it needs no network access. To check rendered pages,
`llms.txt` and `robots.txt`, use the free
[Agent Ready Chrome extension](https://workpods.ai/tools/agent-ready).

### Why does it say "Partial scan"?

Each page load reads up to 800 published entries, eight list calls of 100, because sandboxed
plugins on Cloudflare may make only ten host calls per request.
