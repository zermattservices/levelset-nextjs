# Levelset Next.js Application

This is a Next.js application for Levelset, built with React and Plasmic.

## Environment Setup

This project uses two deployment environments:

### Production Environment
- **Branch:** `main`
- **URL:** Your production domain (configured in Vercel)
- **Purpose:** Stable, production-ready code

### Preview Environment
- **Branch:** `preview` (or any feature branches)
- **URL:** Auto-generated Vercel preview URLs
- **Purpose:** Testing and staging before production deployment

## Deployment Workflow

### Vercel Setup

1. **Connect your repository to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository: `zermattservices/levelset-nextjs`

2. **Configure Production Branch:**
   - In Vercel project settings → Git
   - Set Production Branch to: `main`
   - Enable "Automatic deployments for Production Branch"

3. **Configure Preview Deployments:**
   - In Vercel project settings → Git
   - Enable "Automatic deployments for Preview branches"
   - All branches except `main` will get preview deployments
   - Pull requests will also get unique preview URLs

4. **Environment Variables:**
   - Go to Vercel project settings → Environment Variables
   - Add your environment variables for each environment:
     - **Production:** Variables available only on `main` branch
     - **Preview:** Variables available on all preview deployments
     - **Development:** Variables for local development

   Common variables you may need:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_PLASMIC_PROJECT_ID=your-plasmic-project-id
   ```

### Git Workflow

#### For Production Deployment:
```bash
# Make changes and commit
git add .
git commit -m "Your commit message"

# Push to main branch (triggers production deployment)
git push origin main
```

#### For Preview Deployment:
```bash
# Create or switch to preview/feature branch
git checkout preview
# or
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Your commit message"

# Push to preview branch (triggers preview deployment)
git push origin preview
# or
git push origin feature/your-feature-name
```

#### Pull Request Workflow:
```bash
# Create a feature branch
git checkout -b feature/new-feature

# Make changes and push
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create a pull request on GitHub
# Vercel will automatically create a preview deployment for the PR
# Review the preview URL in the PR comments
# Merge to main when ready (triggers production deployment)
```

## Development

### Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

- `/components` - React components
  - `/auth` - Authentication components
  - `/CodeComponents` - Custom code components
  - `/plasmic` - Plasmic-generated components
- `/pages` - Next.js pages and API routes
- `/lib` - Utility functions and configurations
- `/styles` - Global styles
- `/public` - Static assets

## Technologies

- **Framework:** Next.js 14
- **UI:** React 18, Plasmic
- **Styling:** CSS Modules, Ant Design
- **Authentication:** Supabase Auth
- **Database:** Supabase
- **Deployment:** Vercel
- **Language:** TypeScript

## Vercel Configuration

The `vercel.json` file in the root directory configures:
- Git integration settings
- Build commands
- Framework detection

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Plasmic Documentation](https://docs.plasmic.app/)
- [Supabase Documentation](https://supabase.com/docs)
