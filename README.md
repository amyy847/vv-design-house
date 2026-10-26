# VV Design House

Portfolio site for Vanessa Victor. Plain HTML, CSS and JS; GSAP + ScrollTrigger + Lenis from a CDN.

## Commands

```
npm install          # once (installs sharp for image conversion)
npm run dev          # preview at http://localhost:8080
npm run images       # convert photos-src/ to WebP and update projects.json
```

## Adding real photos

1. Put originals in `photos-src/<project-slug>/` (slug from `site/data/projects.json`).
   Files are ordered by name; the **first photo is the cover**. Name them `01.jpg, 02.jpg…` to control order.
2. Hero and portrait go in `photos-src/_site/` as `hero.jpg` and `portrait.jpg`.
3. Run `npm run images`. It writes `01.webp` (2000px) and `01-sm.webp` (800px) per photo
   and fills in the `images` list in `projects.json`. Delete the placeholder folders first.

HEIC photos from iPhones need converting to JPG first.

## Text and contact details

- Projects: edit `site/data/projects.json` (order in the file = order on the site).
  Optional fields: `tagline`, `credit`, `quote`, `spaces` (list of `{ "title", "text" }`).
  Any empty field (year, city, area, brief…) is simply left out of the page.
- Email and Instagram: search for `hello@vvdesignhouse.com` and `instagram.com` in the HTML files.
- Logo: the `<symbol id="logo">` at the top of each HTML page.
- Footer sketch: replace `site/assets/img/sketch.svg` with a scan of her sketch (PNG/JPG on white paper is fine;
  it is blended onto the cream background).

## Live preview (Vercel)

https://vv-design-house.vercel.app opens from Egypt (*.netlify.app addresses are blocked by Egyptian ISPs).
To update it after changes: `npx vercel@63.1.2 deploy site --prod --yes --project vv-design-house`
(the first time on a new computer, run `npx vercel@63.1.2 login`). `site/vercel.json` holds the project-page rewrite.

## Deploy (Netlify + Wix domain)

Note: *.netlify.app does not open in Egypt. If the final site stays on Netlify, connect the domain with
A records to `75.2.60.5` for both the main domain and `www` (tested reachable from Egypt).

1. Push to GitHub and "Import from Git" on Netlify (or drag the `site` folder onto Netlify Drop).
   `netlify.toml` already sets the publish folder; there is no build step.
2. Netlify → Domain management → add the domain.
3. In Wix → Domains → DNS records: set the `A` record (@) to Netlify's load balancer IP `75.2.60.5`
   and the `CNAME` for `www` to `<your-site>.netlify.app`. HTTPS is issued automatically once DNS resolves.
