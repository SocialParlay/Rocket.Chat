# Social Parlay Branding

## Overview

This fork restyles Rocket.Chat to the Social Parlay brand for the deployment at work.parlaysocial.ca.
The changes are deliberately layered _on top of_ Fuselage rather than replacing it, so upstream merges
stay small: Fuselage still injects its stock palette, and a second style tag overrides only the tokens
that carry brand meaning.

## Where the values come from

There is no standalone brand guide file in the SocialParlay repositories. The values below come from the
production product in `sp-rails`, which implements the brand most completely:

- `app/assets/stylesheets/application.tailwind.css` — the shadcn-style token set: primary `hsl(199 60% 30%)`
  (teal), dark background `hsl(220 40% 5%)`, card `hsl(220 40% 10%)`, border `hsl(220 40% 15%)`.
- `app/views` and `app/components` — by usage count: gold text `#b08e42` (light) / `#d7b95c` (dark) on ~63
  elements, gold tints at 10–20 % opacity, page navy `#0a0f1e` (88 uses), raised navy `#151b2e` (40 uses),
  secondary green `#94b66a`, `font-montserrat` on ~100 headings, `bg-primary`/`text-primary` teal on ~340 elements.
- `app/assets/images/logo.svg`, `logowhite.svg`, `logo-s.svg` — the wordmark (navy text / white text) and the gold "S".
- `app/services/og_image/theme.rb` — cites the Social Parlay Brand Guide by name: navy + gold, Montserrat headings,
  Source Sans 3 body.
- `app/views/layouts/mailer.html.erb` — navy `#0A0F1E` header/footer with the gold-S + white wordmark PNG.

Earlier drafts used the teal-leaning navy of the Clubhouse prototype (`#0b1a25`); the product's bluer navy wins
because that is what Social Parlay users already see.

**Open question — body font.** The product's web layout loads Inter (`stylesheet_link_tag "inter-font"`), while the
OG-image theme, the only artifact citing the brand guide, names Source Sans 3. This fork follows the guide citation
and ships Source Sans 3. Switching to Inter is a one-line change: delete the `--rcx-font-family-sans` override in
`socialparlay.css` (Fuselage already bundles Inter) and drop the Source Sans 3 `@font-face` blocks and files.

## Brand tokens

| Role                       | Value                                                                       | Notes                                                             |
| -------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Navy 950 / 900 / 800 / 700 | `#070b16` `#0a0f1e` `#0f1624` `#151b2e`                                     | Sidebar, page, cards, raised surfaces                             |
| Navy 600 / 500 / 400       | `#1e2740` `#2b3a5c` `#3c4c6e`                                               | Selected state, strokes, neutral badge                            |
| Ink / Ink 2 / Ink 3 / Mute | `#f1f5f9` `#c9d3df` `#a3b0bd` `#8593a6`                                     | Text on navy                                                      |
| Teal (primary action)      | `#1f5d7a` dark, `#1b536c` light; hover `#276f91` / `#194b63`                | Buttons, links, badges, focus rings, featured surfaces            |
| Teal link on dark          | `#4fb3e0`                                                                   | `font-info` in dark mode, for contrast on navy                    |
| Gold                       | `#d7b95c` dark, `#b08e42` light; logo gradient `#a58845`→`#ceb35c`          | Away status, login title highlight, loading dots, logo "S"        |
| Secondary green            | `#94b66a`                                                                   | Login background blob only                                        |
| Light surfaces             | `#f8fafc` page, `#ffffff` cards, `#e8ecf0` neutral, `#dde3ea` selected      | Light mode content                                                |
| Light text                 | `#131a2b` default, `#080b12` titles, `#4b5b7a` hints, `#64748b` annotations | Light mode content                                                |
| Heading font               | Montserrat 600–800                                                          | `h1`–`h4`, login title                                            |
| Body font                  | Source Sans 3 400–700, italic included                                      | Everything else, via `--rcx-font-family-sans` (see open question) |

Semantic colors (danger, success, warning, info banners, status bullets other than _away_) keep the
Fuselage defaults on purpose. High-contrast mode receives no brand overrides at all.

## Where things live

### Colors

- `apps/meteor/client/lib/brand/socialParlayPalette.ts` — the `light`, `dark` and `sidebar` override maps and `toPaletteCss`.
- `apps/meteor/client/components/BrandPaletteStyleTag.tsx` — renders a Fuselage `PaletteStyleTag` with the override CSS.
  Every selector is prefixed with `html` so the brand declarations outrank Fuselage's for the same scope regardless of
  the order the two `<style>` tags land in `<head>`.
- Mounted in the two places Fuselage's own tags are mounted:
  - `apps/meteor/client/components/AppLayoutThemeWrapper.tsx` — `:root`, follows the OS color scheme (login, onboarding, everything outside the main layout).
  - `apps/meteor/client/views/root/MainLayout/MainLayoutStyleTags.tsx` — `.rcx-content--main, .rcx-tile` follows the user's theme preference; the sidebar selectors always get the `sidebar` map, which is `dark` one step darker.

### Typography and pre-hydration colors

- `apps/meteor/app/theme/client/imports/brand/socialparlay.css` — `@font-face` for the self-hosted subsets, the
  `--rcx-font-family-sans` override that Fuselage components read, the `--sp-font-family-heading` variable applied
  to `h1`–`h4`, and brand fallbacks for the loading splash and scrollbar (those render before React mounts, so the
  Fuselage palette variables are not defined yet).
- Imported last from `apps/meteor/app/theme/client/main.css`.
- Font files: `apps/meteor/public/fonts/SourceSans3-*.woff2` and `Montserrat-*.woff2` (Google Fonts latin + latin-ext
  subsets, variable weight). Inter is still shipped by Fuselage and remains the fallback.

### Login and onboarding layout (`@rocket.chat/layout`)

The login page comes from the published npm package `@rocket.chat/layout`, not from this repo, so it is
branded with a yarn patch: `.yarn/patches/@rocket.chat-layout-npm-*.patch`, referenced from the `package.json` of
the three workspaces that depend on it (`apps/meteor`, `packages/ui-client`, `packages/web-ui-registration`).
The patch makes the title read the `--layout-font-family-title` variable, turns the workspace-name highlight gold,
sets the page background and text to navy / cloud, and recolours the generated backdrop swirls to teal, gold and
secondary green. When upstream bumps the package version, run `yarn patch @rocket.chat/layout`, apply the same
edits in `dist/esm` and `dist/cjs` (title font, two highlight colours, two background colours, three swirl
colours), and `yarn patch-commit -s`.

Do **not** brand the login backdrop by giving the `background` / `background_dark` assets a `defaultUrl`.
Upstream updates a changed asset default at import time and broadcasts the change before the service broker
exists, which crashes the first boot against any database that already has the setting.

### Assets

- `apps/meteor/public/images/logo/` — every default file replaced with Social Parlay art, same file names, so the
  Assets admin settings keep working (an uploaded asset in the admin UI still wins over these defaults):
  - `logo.svg` / `logo.png` — wordmark with navy text, for light backgrounds (sp-rails `logo.svg`, title fixed).
  - `logo_dark.svg` / `logo_dark.png` — wordmark with white text, for dark backgrounds and the sidebar footer (sp-rails `logowhite.svg`).
  - `icon.svg` — gold "S" on a `#0A0F1E` rounded square; source for every raster icon and favicon size.
  - `safari-pinned-tab.svg` — monochrome "S".
- `apps/meteor/public/favicon.ico` — 16 and 32 px from `icon.svg`.
- `apps/meteor/public/images/manifest.json` and `browserconfig.xml` — app name and navy tile / theme color.
- `apps/meteor/server/lib/ui-master/index.ts` — injects a fixed `<meta name="theme-color">` (the upstream
  `theme-color-sidebar-background` setting it watched is deleted at startup and never fires).

## Regenerating the icons

`icon.svg` is the source. From a machine with `rsvg-convert` and ImageMagick:

```sh
for s in 16 32 48 70 144 150 180 192 310 512 1024; do rsvg-convert -w $s -h $s icon.svg -o icon-$s.png; done
magick -size 310x150 xc:'#0A0F1E' \( icon.svg -resize 120x120 \) -gravity center -composite mstile-310x150.png
magick icon-16.png icon-32.png icon-48.png favicon.ico
```

Then copy each size over the matching file in `public/images/logo/`.

## Admin settings that still apply

Settings live in the database, so a deployment that was set up before this branch keeps whatever it had:

- **Site name** (`Site_Name`) drives the tab title and PWA name; set it to "Social Parlay".
- **Assets** — leave every asset unset to use the bundled defaults above, or upload to override.
- **Layout › Sidebar footer** — the defaults point at `assets/logo.png` / `assets/logo_dark.png`, which now resolve to the
  wordmark. The sidebar is always dark, so the dark variant is the one users see.

## Not done yet

- The loading splash is still three bouncing dots (now gold on navy); adding the "S" mark means editing the HTML
  injected in `server/lib/ui-master/index.ts` and `client/views/root/PageLoading.tsx`.
- Email templates (`server/settings/email.ts`) and the Livechat widget keep their upstream styling. The sp-rails mailer
  layout (navy header/footer, `logo-email.png`) is the reference when that is tackled.
- Nothing here has been built or rendered end to end; verify in the running app after `yarn install && yarn dev`,
  checking light mode, dark mode, the login page and the sidebar footer.
