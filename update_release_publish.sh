#!/bin/bash
set -e

git fetch
git checkout main
git rebase origin/main

git checkout release
git merge main -m "Merge main into release"
git push origin release

