# Vercel Environment Setup Guide

## ✅ Completed Steps

1. ✅ Created `preview` branch for staging/preview deployments
2. ✅ Added `vercel.json` configuration file
3. ✅ Pushed both `main` and `preview` branches to GitHub
4. ✅ Updated README with deployment workflow

## 🚀 Final Vercel Dashboard Configuration

### Access Your Project Settings

1. Go to: https://vercel.com/levelset/levelset-nextjs/settings

### Configure Git Settings

**Settings → Git**

1. **Production Branch:**
   - Set to: `main`
   - This ensures only pushes to `main` trigger production deployments

2. **Preview Branch Deployments:**
   - ✅ Enable "Automatic deployments for Git branches"
   - This creates preview deployments for:
     - `preview` branch
     - Any feature branches
     - Pull requests

3. **Ignored Build Step (Optional):**
   - Leave empty or configure if you want to skip builds for certain branches

### Configure Environment Variables

**Settings → Environment Variables**

Add your environment variables and specify which environments they apply to:

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_PLASMIC_PROJECT_ID` | ✅ | ✅ | ✅ |

**To add a variable:**
1. Click "Add New"
2. Enter the variable name and value
3. Select which environments:
   - **Production:** `main` branch only
   - **Preview:** All non-production branches
   - **Development:** Local development
4. Click "Save"

> **Tip:** You can have different values for each environment. For example, use a test Supabase project for Preview and your production Supabase for Production.

### Configure Domains (Optional)

**Settings → Domains**

1. **Production Domain:**
   - Already configured: `app.levelset.io`
   - Points to `main` branch

2. **Preview Domain (Optional):**
   - You can assign a custom domain to the `preview` branch
   - Example: `preview.levelset.io` or `staging.levelset.io`
   - Click "Add" → Enter domain → Select `preview` branch

## 📋 Deployment Workflow

### Your Current Setup:

```
┌─────────────────────────────────────────────┐
│  GitHub Repository                          │
├─────────────────────────────────────────────┤
│                                             │
│  main branch (Production)                   │
│    ↓                                        │
│    Vercel Deploy → app.levelset.io         │
│                                             │
│  preview branch (Staging)                   │
│    ↓                                        │
│    Vercel Deploy → preview-*.vercel.app    │
│                                             │
│  feature/* branches (Feature Preview)       │
│    ↓                                        │
│    Vercel Deploy → feature-*.vercel.app    │
│                                             │
│  Pull Requests (PR Preview)                 │
│    ↓                                        │
│    Vercel Deploy → pr-*.vercel.app         │
│                                             │
└─────────────────────────────────────────────┘
```

### How to Use:

#### Production Deployment:
```bash
git checkout main
git pull origin main
# Make changes...
git add .
git commit -m "Production update"
git push origin main
# ✅ Deploys to app.levelset.io
```

#### Preview/Staging Deployment:
```bash
git checkout preview
git pull origin preview
# Make changes...
git add .
git commit -m "Staging update"
git push origin preview
# ✅ Deploys to preview URL (check Vercel dashboard)
```

#### Feature Development:
```bash
git checkout -b feature/new-feature
# Make changes...
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
# ✅ Deploys to feature-specific preview URL
```

#### Pull Request Workflow:
```bash
# After pushing a feature branch
# 1. Create PR on GitHub
# 2. Vercel automatically creates preview deployment
# 3. Preview URL is commented on the PR
# 4. Review and test the preview
# 5. Merge PR → triggers production deployment
```

## 🔍 Viewing Deployments

1. **Vercel Dashboard:** https://vercel.com/levelset/levelset-nextjs
   - See all deployments (Production, Preview, etc.)
   - Click on any deployment to see build logs

2. **GitHub:**
   - Vercel bot comments on PRs with preview URLs
   - Check status in PR checks

3. **CLI:**
   ```bash
   npx vercel ls
   ```

## 🛠️ Useful Commands

```bash
# View deployments
npx vercel ls

# View project details
npx vercel inspect [deployment-url]

# View logs
npx vercel logs [deployment-url]

# Manual deployment (if needed)
npx vercel --prod  # Deploy to production
npx vercel         # Deploy to preview
```

## 📞 Support

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Project Dashboard:** https://vercel.com/levelset/levelset-nextjs

## 🎯 Next Steps

1. ✅ Go to Vercel dashboard
2. ✅ Verify Git settings (Production Branch = `main`)
3. ✅ Add/verify environment variables for each environment
4. ✅ Test by pushing to `preview` branch
5. ✅ Watch the deployment in Vercel dashboard

Your preview deployment should be live at a URL like:
`https://levelset-nextjs-git-preview-levelset.vercel.app`

Check the Vercel dashboard to see the exact URL!

