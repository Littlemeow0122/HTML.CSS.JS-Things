#!/bin/bash

# 檢查是否有未提交的更改
if git diff --quiet && git diff --staged --quiet; then
    echo "沒有更改需要提交。"
    exit 0
fi

# 添加所有更改
git add .

# 提交更改，使用當前日期作為訊息
commit_message="Update $(date +'%Y-%m-%d %H:%M:%S')"
git commit -m "$commit_message"

# 推送至 GitHub
git push origin main

echo "已成功發佈到 GitHub！"