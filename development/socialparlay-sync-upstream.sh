#!/usr/bin/env bash
#
# Moves the Social Parlay commits onto a newer upstream Rocket.Chat release.
#
#   ./development/socialparlay-sync-upstream.sh 8.9.0
#
# The socialparlay/release branch is always "an upstream release tag plus our
# commits on top", so adopting a release is a rebase of those commits onto the
# new tag. Conflicts, if any, are in our own files and git stops for them as
# usual; finish with `git rebase --continue`.
#
# Afterwards: run ./development/socialparlay-dev.sh to check the app, then cut
# a build tag:  git tag sp-<release>-1 && git push origin socialparlay/release sp-<release>-1

set -euo pipefail
cd "$(dirname "$0")/.."

NEW_TAG="${1:?usage: $0 <upstream release tag, e.g. 8.9.0>}"
BRANCH="socialparlay/release"

git fetch upstream "refs/tags/${NEW_TAG}:refs/tags/${NEW_TAG}"

# The current base is the newest upstream release tag reachable from the branch.
OLD_TAG=$(git describe --tags --abbrev=0 --match '[0-9]*.[0-9]*.[0-9]*' --exclude '*-rc.*' "${BRANCH}")

if [ "${OLD_TAG}" = "${NEW_TAG}" ]; then
	echo "${BRANCH} is already based on ${NEW_TAG}"
	exit 0
fi

echo "Rebasing $(git rev-list --count "${OLD_TAG}..${BRANCH}") Social Parlay commits from ${OLD_TAG} onto ${NEW_TAG}"
git rebase --onto "${NEW_TAG}" "${OLD_TAG}" "${BRANCH}"

echo
echo "Done. ${BRANCH} is now ${NEW_TAG} plus:"
git log --oneline "${NEW_TAG}..${BRANCH}"
