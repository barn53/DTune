#!/bin/bash
set -e

git fetch
git checkout main
git rebase origin/main

git checkout release
git merge main -m "Merge branch 'main' into 'release' publish workflow"
git push origin release

