#!/usr/bin/env bash
# Writes one snapshot commit to the private mirror: the source tree minus .git and .github.
# GitHub refuses deploy-key pushes that touch workflow files, so the mirror never carries them.
#
# Usage: scripts/sync-mirror.sh <source-dir> <source-sha> <mirror-git-url>
# Authentication comes from the caller's environment, for example GIT_SSH_COMMAND.
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <source-dir> <source-sha> <mirror-git-url>" >&2
  exit 2
fi

source_dir="$1"
source_sha="$2"
mirror_url="$3"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

git clone --quiet "$mirror_url" "$work_dir/mirror"
git -C "$work_dir/mirror" symbolic-ref HEAD refs/heads/main

rsync -a --delete --exclude .git --exclude .github "$source_dir"/ "$work_dir/mirror"/

git -C "$work_dir/mirror" add -A
if git -C "$work_dir/mirror" rev-parse --verify --quiet HEAD >/dev/null \
  && git -C "$work_dir/mirror" diff --cached --quiet; then
  echo "The mirror already matches agentic-plugins-main@$source_sha."
  exit 0
fi

git -C "$work_dir/mirror" \
  -c user.name="agentic-plugins-main mirror" \
  -c user.email="noreply@mgtinsurance.com" \
  commit --quiet -m "Sync from MGT-Insurance/agentic-plugins-main@$source_sha"
git -C "$work_dir/mirror" push --quiet origin HEAD:refs/heads/main
echo "Pushed $(git -C "$work_dir/mirror" rev-parse HEAD) to the mirror for agentic-plugins-main@$source_sha."
