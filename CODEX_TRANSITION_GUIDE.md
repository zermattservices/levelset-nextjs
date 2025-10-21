# 🚀 Codex Transition Guide - Complete Project Context

## 📋 **Project Overview**

**Project Name:** Levelset Next.js Application  
**Repository:** `zermattservices/levelset-nextjs`  
**Purpose:** Employee management and discipline tracking system for restaurant operations  
**Tech Stack:** Next.js 14, React 18, TypeScript, Plasmic, Supabase, Vercel  

## 🏗️ **Architecture & Integration**

### **Plasmic Integration**
- **Visual Development Platform:** Plasmic is used for visual component design and page building
- **Project ID:** `eNCsaJXBZ9ykYnmvxCb8Zx`
- **Project Name:** `levelset-v2`
- **Integration Type:** Blackbox scheme with CSS modules
- **Preview Mode:** Enabled (fetches latest revisions, published or unpublished)

### **Key Plasmic Files:**
- `plasmic-init.ts` - Plasmic loader configuration
- `plasmic.json` - Project configuration and component mappings
- `plasmic.lock` - Locked versions and dependencies
- `pages/plasmic-host.tsx` - Plasmic canvas host for visual editing
- `components/plasmic/` - Generated Plasmic components

### **Plasmic Workflow:**
1. **Design in Plasmic Studio** → Visual component creation
2. **Auto-sync to Git** → Changes pushed to `preview` branch automatically
3. **Code Generation** → Plasmic generates React components
4. **Custom Code Integration** → Custom components in `components/CodeComponents/`

## 🔄 **Deployment Architecture**

### **Environment Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  Deployment Environments                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Production Environment                                     │
│  ├── Branch: main                                           │
│  ├── URL: app.levelset.io                                  │
│  ├── Purpose: Live production application                   │
│  └── Trigger: Manual push to main branch                   │
│                                                             │
│  Preview Environment                                        │
│  ├── Branch: preview (and all other branches)              │
│  ├── URL: preview.levelset.io                              │
│  ├── Purpose: Testing and staging                          │
│  └── Trigger: Push to preview branch OR Plasmic webhook    │
│                                                             │
│  Development Environment                                    │
│  ├── Access: Local development                             │
│  ├── URL: localhost:3000                                   │
│  └── Trigger: npm run dev                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Deployment Triggers:**

#### **1. Manual Git Deployments:**
```bash
# Production Deployment
git checkout main
git add .
git commit -m "Production update"
git push origin main
# → Triggers deployment to app.levelset.io

# Preview Deployment
git checkout preview
git add .
git commit -m "Preview update"
git push origin preview
# → Triggers deployment to preview.levelset.io
```

#### **2. Plasmic Auto-Deployments:**
- **Plasmic Webhook:** `/api/plasmic-webhook.ts`
- **Auto-sync:** Plasmic changes automatically push to `preview` branch
- **Trigger:** Changes in Plasmic Studio → Git commit → Preview deployment
- **Configuration:** Plasmic is configured to push to preview branch

## 🔧 **Environment Variables**

### **Production Environment:**
```
NEXT_PUBLIC_SUPABASE_URL=https://pcplqsnilhrhupntibuv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcGxxc25pbGhyaHVwbnRpYnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDcyODYsImV4cCI6MjA3NTAyMzI4Nn0.sc7FhfCdbNPcpe8IwLjjeqDdpLUaQU2tXeJMArXVN98
```

### **Preview Environment:**
```
NEXT_PUBLIC_SUPABASE_URL=https://pcplqsnilhrhupntibuv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcGxxc25pbGhyaHVwbnRpYnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NDcyODYsImV4cCI6MjA3NTAyMzI4Nn0.sc7FhfCdbNPcpe8IwLjjeqDdpLUaQU2tXeJMArXVN98
PLASMIC_PROJECT_ID=eNCsaJXBZ9ykYnmvxCb8Zx
PLASMIC_API_TOKEN=530xINgmwEfDE5DLWFsVEhxzQTgaIBlZBKghKbN99LDMGiAGgqP4WMkLadhDhIRqCVPLbJjWCVIh4tGDJg
```

## 🗂️ **Project Structure**

```
levelset-nextjs/
├── components/
│   ├── CodeComponents/           # Custom React components
│   │   ├── auth/                # Authentication components
│   │   ├── DatabaseComponents/  # Database-related components
│   │   └── [various components] # Custom business logic components
│   └── plasmic/                 # Plasmic-generated components
│       ├── levelset_v_2/        # Main Plasmic project components
│       ├── levelset_tabs/       # Tab components
│       └── [other libraries]    # Plasmic component libraries
├── pages/
│   ├── api/                     # API routes
│   │   ├── auth/               # Authentication API
│   │   └── plasmic-webhook.ts  # Plasmic webhook handler
│   ├── auth/                   # Authentication pages
│   ├── index.tsx               # Homepage (Plasmic-generated)
│   ├── discipline.tsx          # Discipline management page
│   ├── positional-excellence.tsx # PEA scoring page
│   └── plasmic-host.tsx        # Plasmic visual editor host
├── lib/
│   ├── supabase-client.ts      # Supabase client configuration
│   └── supabase.types.ts       # Supabase TypeScript types
├── util/
│   └── supabase/               # Supabase utilities
├── styles/
│   └── globals.css             # Global styles
├── public/                     # Static assets
├── plasmic-init.ts             # Plasmic loader configuration
├── plasmic.json                # Plasmic project configuration
└── plasmic.lock                # Plasmic dependency lock file
```

## 🔐 **Authentication & Database**

### **Supabase Integration:**
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth with Google OAuth
- **Client:** `@supabase/supabase-js` and `@supabase/ssr`
- **Configuration:** `lib/supabase-client.ts`

### **Authentication Flow:**
1. **Login:** Google OAuth or email/password via Supabase
2. **Session Management:** Server-side rendering with SSR
3. **Protected Routes:** Custom `ProtectedRoute` component
4. **User Context:** `AuthProvider` for global auth state

## 🎨 **Styling & UI**

### **Styling Approach:**
- **CSS Modules:** Plasmic components use CSS modules
- **Ant Design:** UI component library (`antd`)
- **Global Styles:** `styles/globals.css`
- **Component Styles:** Individual CSS files for custom components

### **UI Libraries:**
- **Ant Design:** Primary UI component library
- **Plasmic Components:** Visual components from Plasmic
- **Custom Components:** Business logic components in `CodeComponents/`

## 🚀 **Development Workflow**

### **Local Development:**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access Plasmic visual editor
# Navigate to http://localhost:3000/plasmic-host
```

### **Plasmic Development:**
1. **Open Plasmic Studio** → Design components visually
2. **Auto-sync** → Changes automatically sync to Git
3. **Preview** → View changes on preview.levelset.io
4. **Deploy** → Merge to main for production

### **Code Development:**
1. **Create custom components** in `components/CodeComponents/`
2. **Register with Plasmic** in `plasmic-init.ts`
3. **Use in Plasmic** → Import custom components into visual designs
4. **Test on preview** → Deploy to preview branch

## 📦 **Dependencies**

### **Core Dependencies:**
```json
{
  "next": "^14.2.5",
  "react": "^18",
  "react-dom": "^18",
  "typescript": "^5.7.3"
}
```

### **Plasmic Dependencies:**
```json
{
  "@plasmicapp/cli": "^0.1.348",
  "@plasmicapp/loader-nextjs": "^1.0.441",
  "@plasmicapp/react-web": "^0.2.404"
}
```

### **UI Dependencies:**
```json
{
  "antd": "^5.27.5",
  "@ant-design/icons": "^6.1.0",
  "@ant-design/pro-components": "^2.6.4"
}
```

### **Database Dependencies:**
```json
{
  "@supabase/supabase-js": "^2.48.0",
  "@supabase/ssr": "^0.5.2"
}
```

## 🔄 **Git Workflow**

### **Branch Strategy:**
- **`main`** → Production deployments
- **`preview`** → Preview/staging deployments
- **`feature/*`** → Feature development (auto-preview)

### **Plasmic Integration:**
- **Auto-commits:** Plasmic changes automatically commit to `preview` branch
- **Webhook:** `/api/plasmic-webhook.ts` handles Plasmic notifications
- **Sync:** Visual changes in Plasmic → Git commits → Preview deployments

## 🛠️ **Vercel Configuration**

### **Project Settings:**
- **Project Name:** `levelset-nextjs`
- **Organization:** `levelset`
- **Framework:** Next.js (auto-detected)
- **Node Version:** 22.x

### **Environment Configuration:**
- **Production Branch:** `main`
- **Preview Branches:** All other branches
- **Custom Domains:**
  - Production: `app.levelset.io`
  - Preview: `preview.levelset.io`

### **Build Settings:**
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install`

## 📋 **Key Files to Understand**

### **Critical Configuration Files:**
1. **`plasmic-init.ts`** - Plasmic loader and component registration
2. **`plasmic.json`** - Plasmic project configuration
3. **`pages/_app.tsx`** - Next.js app wrapper with Plasmic provider
4. **`lib/supabase-client.ts`** - Database and auth configuration
5. **`pages/api/plasmic-webhook.ts`** - Plasmic webhook handler

### **Important Pages:**
1. **`pages/index.tsx`** - Homepage (Plasmic-generated)
2. **`pages/discipline.tsx`** - Discipline management
3. **`pages/positional-excellence.tsx`** - PEA scoring
4. **`pages/plasmic-host.tsx`** - Plasmic visual editor

### **Custom Components:**
1. **`components/CodeComponents/auth/`** - Authentication components
2. **`components/CodeComponents/DisciplineTable.tsx`** - Discipline management
3. **`components/CodeComponents/Scoreboard.tsx`** - Scoring components
4. **`components/CodeComponents/RosterTable.tsx`** - Employee roster

## 🎯 **Development Guidelines**

### **When to Use Plasmic:**
- **Visual Design:** Layout, styling, responsive design
- **Page Structure:** Overall page layout and navigation
- **UI Components:** Standard UI elements and interactions

### **When to Use Custom Code:**
- **Business Logic:** Complex data processing
- **Database Operations:** CRUD operations with Supabase
- **Authentication:** User management and session handling
- **Custom Functionality:** Specialized restaurant management features

### **Integration Pattern:**
1. **Design in Plasmic** → Visual layout and styling
2. **Create Custom Components** → Business logic and data handling
3. **Register Components** → Make them available in Plasmic
4. **Use in Plasmic** → Integrate custom components into visual designs
5. **Deploy and Test** → Preview changes before production

## 🚨 **Important Notes**

### **Plasmic Preview Mode:**
- **Enabled:** Fetches latest revisions (published and unpublished)
- **Production:** Should disable preview mode for stability
- **Configuration:** Set in `plasmic-init.ts`

### **Environment Variables:**
- **Required for all environments:** Supabase URL and anon key
- **Preview only:** Plasmic project ID and API token
- **Security:** Never commit actual values to Git

### **Deployment Strategy:**
- **Preview first:** Always test changes on preview environment
- **Plasmic changes:** Automatically deploy to preview
- **Code changes:** Manual deployment to preview, then production
- **Production:** Only stable, tested changes

## 🔗 **External Services**

### **Plasmic:**
- **Studio URL:** [Plasmic Studio](https://studio.plasmic.app)
- **Project:** levelset-v2
- **Webhook:** Configured to push to preview branch

### **Supabase:**
- **Dashboard:** [Supabase Dashboard](https://supabase.com/dashboard)
- **Project:** pcplqsnilhrhupntibuv
- **Features:** Database, Authentication, Real-time

### **Vercel:**
- **Dashboard:** [Vercel Dashboard](https://vercel.com/levelset/levelset-nextjs)
- **Domains:** app.levelset.io (production), preview.levelset.io (preview)

## 📞 **Support Resources**

### **Documentation:**
- **Next.js:** [Next.js Documentation](https://nextjs.org/docs)
- **Plasmic:** [Plasmic Documentation](https://docs.plasmic.app/)
- **Supabase:** [Supabase Documentation](https://supabase.com/docs)
- **Vercel:** [Vercel Documentation](https://vercel.com/docs)

### **Project-Specific:**
- **README.md** - Basic project information
- **VERCEL_SETUP.md** - Vercel configuration details
- **DEPLOYMENT_STATUS.md** - Current deployment status

---

## 🎯 **For Codex: Getting Started**

When starting with this project in Codex:

1. **Understand the dual workflow:** Plasmic for visual design + custom code for business logic
2. **Respect the deployment strategy:** Preview first, then production
3. **Use the existing component structure:** Build on what's already there
4. **Maintain Plasmic integration:** Register custom components properly
5. **Follow the environment setup:** Use correct environment variables
6. **Test on preview:** Always verify changes before production

The project is fully configured and ready for development. All environments are working, and the deployment pipeline is established.
