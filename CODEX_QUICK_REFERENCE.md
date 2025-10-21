# 🚀 Codex Quick Reference - Levelset Project

## 📋 **Essential Commands**

### **Development:**
```bash
npm run dev          # Start local development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### **Deployment:**
```bash
# Production
git checkout main
git push origin main    # → app.levelset.io

# Preview
git checkout preview
git push origin preview # → preview.levelset.io
```

### **Plasmic:**
```bash
npx plasmic sync       # Sync Plasmic changes
npx plasmic dev        # Start Plasmic development mode
```

## 🔧 **Environment Variables**

### **Required for All Environments:**
```
NEXT_PUBLIC_SUPABASE_URL=https://pcplqsnilhrhupntibuv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Preview Only:**
```
PLASMIC_PROJECT_ID=eNCsaJXBZ9ykYnmvxCb8Zx
PLASMIC_API_TOKEN=530xINgmwEfDE5DLWFsVEhxzQTgaIBlZBKghKbN99LDMGiAGgqP4WMkLadhDhIRqCVPLbJjWCVIh4tGDJg
```

## 🎯 **Key URLs**

- **Production:** https://app.levelset.io
- **Preview:** https://preview.levelset.io
- **Local Dev:** http://localhost:3000
- **Plasmic Editor:** http://localhost:3000/plasmic-host
- **Vercel Dashboard:** https://vercel.com/levelset/levelset-nextjs

## 📁 **Important Files**

- `plasmic-init.ts` - Plasmic configuration
- `pages/_app.tsx` - App wrapper with Plasmic provider
- `lib/supabase-client.ts` - Database configuration
- `components/CodeComponents/` - Custom components
- `pages/api/plasmic-webhook.ts` - Plasmic webhook

## 🔄 **Workflow**

1. **Visual Design** → Plasmic Studio
2. **Custom Logic** → `components/CodeComponents/`
3. **Register Components** → `plasmic-init.ts`
4. **Test** → Preview environment
5. **Deploy** → Production

## 🚨 **Critical Notes**

- **Plasmic Preview Mode:** Enabled (fetches latest revisions)
- **Auto-deploy:** Plasmic changes → preview branch → preview.levelset.io
- **Manual Deploy:** Code changes → push to preview → test → push to main
- **Environment Variables:** Required for all deployments
