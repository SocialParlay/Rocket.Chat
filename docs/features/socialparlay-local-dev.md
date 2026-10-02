# Social Parlay Local Development

## Overview

A single-machine setup for checking the branding work in `docs/features/socialparlay-branding.md`
in a real Rocket.Chat instance. It runs the Meteor app from this checkout against a local MongoDB 8
replica set and seeds one admin account on first start.

|          |                                                                                  |
| -------- | -------------------------------------------------------------------------------- |
| URL      | http://localhost:3000                                                            |
| Login    | `dev@socialparlay.com` (username `dev`)                                          |
| Password | `0Password!` by default; export `ADMIN_PASS` before the first start to change it |

## One-time setup (macOS, Apple Silicon)

Each upstream release pins a Node (`volta.node` in `package.json`), sometimes a Deno (`.tool-versions`, absent from 8.9.0 on), Yarn
(`packageManager`) and Meteor (`apps/meteor/.meteor/release`) version; the dev script reads the Node and Deno pins
itself, so the versions below are only for the one-time global installs. Rocket.Chat exits at startup on MongoDB older than 7 and warns below 8.

```sh
mise install node@22.22.3                 # the exact version in package.json volta.node; yarn rejects any other
mise install deno@2.3.1                   # the version in .tool-versions; the Apps-Engine build needs it
eval "$(mise env -s zsh node@22.22.3 deno@2.3.1)"
corepack enable                           # yarn 4.18 is picked up from packageManager
npm install -g meteor                     # the tool fetches the release the repo pins; installs into ~/.meteor
brew trust --formula mongodb/brew/mongodb-community@8.0 && brew install mongodb-community@8.0
yarn install                              # several minutes; needs ~10 GB free
```

## Running

```sh
./development/socialparlay-dev.sh
```

The script:

- starts `mongod` as the single-node replica set `rs0` with data under
  `~/.local/share/socialparlay-rocketchat/mongo` if nothing answers on port 27017, and initiates the set once;
- exports `MONGO_URL` and `MONGO_OPLOG_URL` for that set;
- seeds the admin account through Rocket.Chat's `ADMIN_*` environment variables, which only apply while no
  admin user exists;
- marks the setup wizard completed, names the site "Social Parlay", disables the 14-character password
  policy so the dev password is accepted, and turns off cloud registration;
- on a fresh checkout, builds the workspace packages Meteor depends on once (several minutes), because a few
  package `dev` tasks are one-shot builds that need their siblings' `dist` to exist;
- runs `yarn dev`, which rebuilds the workspace packages in watch mode and then starts Meteor.

The first start compiles everything and takes a while. Later starts are much faster. Ctrl+C twice stops the
app; `mongod` keeps running until `pkill mongod`.

## Resetting

Stop the app, `pkill mongod`, delete `~/.local/share/socialparlay-rocketchat/mongo`, and start again. The
replica set is re-initiated and the admin user is re-seeded.

## What to check for branding

- Login page: navy or cloud background, Montserrat title, gold workspace-name highlight.
- Sidebar: navy, darker than the content area, wordmark in the footer.
- Content area in both themes (Account > Preferences > Theme): teal buttons and links, gold _away_ status.
- Browser tab: gold "S" favicon, "Social Parlay" title.
