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
- Cover photo: `"cover": "02"` makes photo `02` lead its project (home card, project list, project page).
  Without it, the first photo in `photos-src/<slug>/` is the cover.
- Project page layouts: projects with `chapters` follow their PDF (Soleil and Lumière are the two styles).
  Add `"layout": "photos"` to a project for the third style: photos only, no text, in a repeating rhythm
  (Hacienda White uses it). Remove the line to go back to its chapters.
  The fourth style is `"layout": "gallery"`: the same photos-only wall, but inset from the screen edges with a gap around every photo (Creek Town uses it).
- Contact form (`site/contact.html`): it opens the visitor's own email app with the enquiry filled in,
  addressed to the email shown on the page, so it works on any host. To collect enquiries on Netlify
  instead, add `name="contact" data-netlify="true"` to the `<form>` and remove its submit handler in
  `site/assets/js/contact.js`.
  Add `"hidden": true` to keep a project in the file but off the site.
- Project pages are built from each project's `chapters`, in order, as a walk through the space: arrival,
  reception, living, dining and kitchen, bedrooms, bathrooms, spa, terrace. Keep the photos numbered in that
  same order: the first photo is the project's cover everywhere.
  Each chapter has a `layout`, optional `title` and `text` (a list of paragraphs), and `images` (photo numbers).
  Layouts: `collage` (text beside staggered photos), `feature` (one large photo, with text and smaller ones),
  `row` (photos side by side at equal height; `"narrow": true` makes it smaller), `tiles` (text beside a grid of
  evenly cropped photos), `grid` (four photos), `full` (one full-width photo), `quote` (a photo beside a panel,
  using `quote` for the words), `dark` (a small and a large photo on a dark band).
  Add `"align": "right"` to mirror a `collage`, `feature` or `quote`.
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
