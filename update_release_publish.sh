git fetch
git checkout main
git rebase origin/main

git checkout release
git merge main
git push origin release

git checkout main
