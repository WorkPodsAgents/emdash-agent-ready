## Install from the registry

Your site needs a sandbox runner: `sandbox()` from `@emdash-cms/cloudflare` on Cloudflare Workers
(Workers Paid plan), or `@emdash-cms/sandbox-workerd` with `workerd` on Node.js. See
[Plugin sandbox](https://docs.emdashcms.com/deployment/plugin-sandbox/).

1. Open **Registry** in the EmDash admin and search for **Agent Ready**.
2. Select **Install** and confirm the two permissions: read content and read the content schema.
3. Open **Agent Ready** in the sidebar, or add the **Agent Ready** widget to the dashboard.

## What it reads

Every published entry in each routable collection, except entries marked **Hide from search
engines**. It reads titles, the SEO panel, excerpts, Portable Text bodies and image fields. It
writes nothing and makes no network requests.

## Site URL

Set **Site URL** in **Settings > General** so absolute links to your own domain count as internal
links. Restart the site after changing it; plugins read the URL when they load.
