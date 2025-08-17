# Deployment Guide

## Cloudflare Pages Deployment

### Prerequisites
- Cloudflare account
- GitHub repository with your code
- Node.js 18+ for local development

### Deployment Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Data Engineering Book"
   git branch -M main
   git remote add origin https://github.com/yourusername/data-engineering-book.git
   git push -u origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Pages](https://pages.cloudflare.com/)
   - Click "Create a project"
   - Connect your GitHub repository
   - Select the `data-engineering-book` repository

3. **Configure Build Settings**
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
   - **Root directory**: `/` (leave empty)
   - **Node.js version**: `18.17.0`

4. **Environment Variables** (if needed)
   - No environment variables required for this static site

5. **Deploy**
   - Click "Save and Deploy"
   - Your site will be available at `https://your-project-name.pages.dev`

### Build Configuration

The project is configured for static export with these settings in `next.config.js`:
- `output: 'export'` - Generates static files
- `trailingSlash: true` - Ensures proper routing
- `images: { unoptimized: true }` - Disables Next.js image optimization for static export

### Custom Domain (Optional)

1. In Cloudflare Pages dashboard, go to your project
2. Click "Custom domains" tab
3. Add your domain
4. Update DNS records as instructed

### Continuous Deployment

Once connected, Cloudflare Pages will automatically:
- Deploy on every push to main branch
- Generate preview deployments for pull requests
- Provide build logs and deployment status

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm start
```

### Troubleshooting

**Build Failures:**
- Check Node.js version (should be 18+)
- Verify all dependencies are installed
- Check build logs in Cloudflare Pages dashboard

**MDX Issues:**
- Ensure all MDX files have proper frontmatter
- Check for syntax errors in MDX content
- Verify Mermaid diagrams are properly formatted

**Routing Issues:**
- Ensure `trailingSlash: true` is set in next.config.js
- Check that all dynamic routes are properly configured
