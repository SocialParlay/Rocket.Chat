#!/usr/bin/env bash
#
# Runs this fork locally for styling work, with one seeded admin account.
#
#   ./development/socialparlay-dev.sh
#
# Prerequisites (one-time): Node 22 via mise, a global Meteor install under that
# Node, `yarn install` at the repo root, and `brew install mongodb-community@8.0`.
# See docs/features/socialparlay-local-dev.md.
#
# MongoDB runs as a single-node replica set (Rocket.Chat needs change streams)
# with its data under $SP_MONGO_DIR. It is left running when the app stops;
# `pkill mongod` shuts it down, and deleting the data directory resets the
# workspace so the admin user is re-seeded on the next start.
#
# Login: dev@socialparlay.com / $ADMIN_PASS (override by exporting ADMIN_PASS).

set -euo pipefail
cd "$(dirname "$0")/.."

# The repo pins an exact Node version (package.json volta.node) that yarn enforces,
# and a Deno version (.tool-versions) that the Apps-Engine build needs.
NODE_VERSION=$(sed -nE '/"volta"/,/}/ s/.*"node": *"([^"]+)".*/\1/p' package.json)
DENO_VERSION=$(awk '/^deno /{print $2}' .tool-versions)
mise install -q "node@${NODE_VERSION}" "deno@${DENO_VERSION}"
eval "$(mise env -s bash "node@${NODE_VERSION}" "deno@${DENO_VERSION}")"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export PATH="$HOME/.meteor:$PATH"

MONGO_BIN="${MONGO_BIN:-/opt/homebrew/opt/mongodb-community@8.0/bin}"
MONGOSH="${MONGOSH:-/opt/homebrew/bin/mongosh}"
MONGO_PORT="${MONGO_PORT:-27017}"
SP_MONGO_DIR="${SP_MONGO_DIR:-$HOME/.local/share/socialparlay-rocketchat/mongo}"

if ! "$MONGOSH" --quiet --port "$MONGO_PORT" --eval 'db.runCommand({ ping: 1 }).ok' >/dev/null 2>&1; then
	mkdir -p "$SP_MONGO_DIR"
	"$MONGO_BIN/mongod" --dbpath "$SP_MONGO_DIR" --port "$MONGO_PORT" --replSet rs0 --bind_ip 127.0.0.1 \
		--fork --logpath "$SP_MONGO_DIR/mongod.log" >/dev/null
	for _ in $(seq 1 30); do
		"$MONGOSH" --quiet --port "$MONGO_PORT" --eval 'db.runCommand({ ping: 1 }).ok' >/dev/null 2>&1 && break
		sleep 1
	done
fi

"$MONGOSH" --quiet --port "$MONGO_PORT" --eval "
	try { rs.status(); } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:$MONGO_PORT' }] }); }
" >/dev/null

export MONGO_URL="mongodb://127.0.0.1:$MONGO_PORT/rocketchat?replicaSet=rs0"
export MONGO_OPLOG_URL="mongodb://127.0.0.1:$MONGO_PORT/local?replicaSet=rs0"

export ADMIN_USERNAME="${ADMIN_USERNAME:-dev}"
export ADMIN_NAME="${ADMIN_NAME:-Social Parlay Dev}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-dev@socialparlay.com}"
export ADMIN_EMAIL_VERIFIED=true
export ADMIN_PASS="${ADMIN_PASS:-0Password!}"

export OVERWRITE_SETTING_Show_Setup_Wizard=completed
export OVERWRITE_SETTING_Accounts_Password_Policy_Enabled=false
export OVERWRITE_SETTING_Site_Name="Social Parlay"
export OVERWRITE_SETTING_Register_Server=false

# The `dev` tasks of the workspace packages run in parallel, and a few of them
# (livechat, for one) are one-shot builds that need their siblings' dist first.
# A fresh checkout therefore gets a full dependency build before watch mode.
if [ ! -d packages/ui-contexts/dist ] || [ ! -d packages/livechat/dist ]; then
	yarn turbo run build --filter='@rocket.chat/meteor^...'
fi

# Same as `yarn dev`, but with room for every package watcher plus Meteor: turbo
# caps concurrency at 10 by default and the watchers never exit, so Meteor would
# otherwise wait forever for a slot.
# The livechat package's dev task is a clean-and-rebuild that races Meteor's copy
# of its dist, so it stays out of watch mode and keeps the one-time build above.
exec yarn turbo run dev --env-mode=loose --parallel --concurrency=100 --filter='@rocket.chat/meteor...' --filter='!@rocket.chat/livechat'
