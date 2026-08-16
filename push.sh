#!/data/data/com.termux/files/usr/bin/bash
# push.sh - Auto push with username & password

# 🔐 Your Credentials (Edit karo)
USERNAME="pw-marco"
PASSWORD="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"

DATE=$(date '+%d-%m-%Y %H:%M:%S')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 Auto Push: $DATE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Set username (optional)
git config --global user.name "$USERNAME"

# Add all changes
echo "📦 Adding files..."
git add .

# Commit with date
echo "✏️ Committing..."
git commit -m "Auto-update: $DATE"

# Push with username & password in URL
echo "🚀 Pushing..."
git push https://$USERNAME:$PASSWORD@github.com/pw-marco/pwmarco.git

if [ $? -eq 0 ]; then
    echo "✅ Pushed successfully at $DATE"
else
    echo "❌ Push failed! Check credentials"
fi