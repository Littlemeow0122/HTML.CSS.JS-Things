#!/bin/bash

if git diff --quiet && git diff --staged --quiet; then
    echo "沒有更改需要提交。"
    exit 0
fi

git add .

commit_message="Update $(date +'%Y-%m-%d %H:%M:%S')"
git commit -m "$commit_message"


git pull origin main --rebase


git push origin main

echo "已成功發佈到 GitHub！"