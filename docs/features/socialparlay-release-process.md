# Social Parlay Release Process

## Overview

Production (work.parlaysocial.ca) is one DigitalOcean droplet running the official `rocketchat-compose`
stack. Its `.env` selects the Rocket.Chat image through `IMAGE` and `RELEASE`. This fork builds its own
image, pushes it to the `socialparlay` DigitalOcean container registry, and points those two variables at it.

Everything deployable lives on one branch, `socialparlay/release`, which is always **an upstream release
tag plus the Social Parlay commits on top**. Nothing is ever deployed from `develop`: it carries unreleased
code and database migrations that cannot be rolled back.

## Branches and tags

| Name                    | What it is                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `develop`               | Mirror of upstream `develop`. Never deployed.                                                         |
| `socialparlay/release`  | Upstream release tag + our commits. The only branch that gets built.                                  |
| `sp-<release>-<n>` tags | A build of `socialparlay/release`, e.g. `sp-8.8.1-1`, `sp-8.8.1-2`, `sp-8.9.0-1`. Also the image tag. |

The Social Parlay commits are kept few and self-contained (theme, assets, dev tooling, CI) so that
rebasing them onto the next upstream tag is routine.

## Adopting an upstream release

```sh
./development/socialparlay-sync-upstream.sh 8.9.0
```

The script fetches the tag, finds the branch's current base tag, and rebases our commits onto the new
one. If upstream changed a file we touch, git stops at that commit; fix it and `git rebase --continue`.
The files most likely to conflict are listed in `docs/features/socialparlay-branding.md`.

Then check the result locally before building:

```sh
./development/socialparlay-dev.sh
```

Note that upstream pins an exact Node version per release (`volta.node` in `package.json`); the dev script
and the CI workflow both read it from there.

## Building an image

Push the branch and a build tag:

```sh
git push origin socialparlay/release
git tag sp-8.9.0-1 && git push origin sp-8.9.0-1
```

The **Social Parlay image** workflow (`.github/workflows/socialparlay-image.yml`) runs on every `sp-*`
tag: it installs dependencies, builds the workspace packages and the Meteor bundle, builds a linux/amd64
image with upstream's own Dockerfile, and pushes `registry.digitalocean.com/socialparlay/rocket.chat:<tag>`.
Expect 30 to 45 minutes. The run summary shows the image reference.

It can also be run by hand from the Actions tab against any ref, with an explicit image tag.

## Deploying

Run the **Social Parlay deploy** workflow from the Actions tab with the image tag. It is manual only and
gated by the `production` environment, so it waits for an approval if one is configured there.

On the droplet it logs in to the registry, backs up `.env`, sets `IMAGE` and `RELEASE`, pulls, and
restarts only the `rocketchat` service. It then waits up to five minutes for the API to answer; if it does
not, it restores the previous `.env` and restarts on the previous image.

Before the first deploy of a new upstream release, take a database dump on the droplet:

```sh
docker compose -f /opt/rocketchat-compose/compose.yml exec mongodb mongodump --archive=/tmp/pre-upgrade.archive
docker compose -f /opt/rocketchat-compose/compose.yml cp mongodb:/tmp/pre-upgrade.archive /root/
```

## Rolling back

Run the deploy workflow again with the previous tag. To return to the stock image, pass
`registry.rocket.chat/rocketchat/rocket.chat` as the image and the upstream version (for example `8.8.1`)
as the tag. Rolling back across an upstream version boundary needs the database dump from above, because
migrations only run forward.

## One-time setup

Repository secrets, under Settings > Secrets and variables > Actions:

- `DIGITALOCEAN_ACCESS_TOKEN` — a DigitalOcean API token with registry read and write scope.
- `DROPLET_HOST` — the droplet's public IP or hostname.
- `DROPLET_SSH_KEY` — an SSH private key whose public half is in `/root/.ssh/authorized_keys` on the droplet. Make a dedicated key for this; do not reuse a personal one.

Environments, under Settings > Environments: create `production` and, optionally, add required reviewers.
The deploy workflow references it, so it must exist.

Actions on a fork are disabled until enabled once from the Actions tab.

The DigitalOcean registry keeps every pushed tag; run garbage collection from the registry settings now and
then, since each image is around 1.5 GB.
