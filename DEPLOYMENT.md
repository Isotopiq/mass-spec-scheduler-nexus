
# Deployment Guide

This guide covers deploying the Lab Management System using Docker across different platforms.

## Quick Start

### Local Development with Docker

```bash
# Build and run locally
docker-compose up --build

# Access the application (host port randomized to avoid conflicts)
open http://localhost:41783
```

### Production Deployment

```bash
# Build for production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Platform-Specific Deployments

### 1. EasyPanel Deployment

EasyPanel provides a simple Docker-based deployment platform with a web interface.

#### Method 1: Direct Docker Deployment

1. **Access your EasyPanel instance**
2. **Create a new service**
3. **Configure the service:**
   ```yaml
   # Service Configuration
   name: lab-management-system
   image: lab-management-system:latest
   ports:
     - containerPort: 80
       servicePort: 80
   environment:
     - name: NODE_ENV
       value: production
   domains:
     - yourdomain.com
   ```

#### Method 2: Docker Compose Deployment

1. **Upload your docker-compose.yml to EasyPanel**
2. **Create a new stack**
3. **Use the provided docker-compose.yml**
4. **Configure domain in EasyPanel dashboard**

#### Method 3: GitHub Integration

1. **Connect your GitHub repository to EasyPanel**
2. **Create a new project from repository**
3. **Configure build settings:**
   ```yaml
   # Build Configuration
   buildCommand: npm run build
   outputDirectory: dist
   nodeVersion: 18
   dockerfile: Dockerfile
   ```

### 2. Dokploy Deployment

Dokploy is a modern alternative to Vercel/Netlify for self-hosted deployments.

#### Setup Steps:

1. **Install Dokploy on your server**
   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```

2. **Create a new application in Dokploy dashboard**

3. **Configure the application:**
   ```yaml
   # Application Settings
   name: lab-management-system
   source: github  # or gitlab/docker
   repository: your-username/lab-management-system
   branch: main
   buildCommand: npm run build
   outputDirectory: dist
   ```

4. **Set environment variables:**
   ```bash
   NODE_ENV=production
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Configure domain and SSL**
   - Add your domain in the Dokploy dashboard
   - SSL certificates are automatically generated

#### Using Docker Compose with Dokploy:

1. **Create a new Docker Compose application**
2. **Upload your docker-compose.yml**
3. **Configure environment variables through the dashboard**
4. **Deploy and monitor through Dokploy interface**

### 3. CapRover Deployment

CapRover is a self-hosted PaaS platform that simplifies Docker deployments.

#### Prerequisites:

1. **Install CapRover on your server**
   ```bash
   docker run -p 80:80 -p 443:443 -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v /captain:/captain caprover/caprover
   ```

2. **Setup CapRover**
   ```bash
   npm install -g caprover
   caprover serversetup
   ```

#### Deployment Methods:

##### Method 1: Direct Dockerfile Deployment

1. **Create a new app in CapRover dashboard**
2. **Enable HTTPS and set up domain**
3. **Deploy using CapRover CLI:**
   ```bash
   caprover deploy --appName lab-management-system
   ```

##### Method 2: Docker Compose Deployment

1. **Create captain-definition file:**
   ```json
   {
     "schemaVersion": 2,
     "dockerComposeFileLocation": "./docker-compose.yml"
   }
   ```

2. **Deploy:**
   ```bash
   tar -czf lab-management.tar.gz .
   caprover deploy --appName lab-management-system --tarFile lab-management.tar.gz
   ```

##### Method 3: One-Click App

1. **Use CapRover's One-Click Apps**
2. **Create a custom template:**
   ```json
   {
     "captainVersion": 4,
     "services": {
       "$$cap_appname": {
         "image": "$$cap_image_name",
         "containerHttpPort": "80",
         "environment": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

## Environment Configuration

### Current Supabase Configuration

The application currently connects to Supabase using these settings in `src/integrations/supabase/client.ts`:

```typescript
const SUPABASE_URL = "https://jfsktwwlkmdieldnqlqt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

### Switching to Self-Hosted Supabase

#### 1. Set Up Self-Hosted Supabase

```bash
# Clone Supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy the fake env vars
cp .env.example .env

# Edit .env file with your settings
nano .env

# Start Supabase
docker-compose up -d
```

#### 2. Update Application Configuration

To switch to a self-hosted Supabase instance, you have several options:

##### Option A: Environment Variables (Recommended)

1. **Update the Supabase client configuration:**

Create a new file `src/integrations/supabase/config.ts`:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jfsktwwlkmdieldnqlqt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
```

2. **Update `src/integrations/supabase/client.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage
  }
});
```

3. **Set environment variables in your deployment:**
```bash
VITE_SUPABASE_URL=https://your-selfhosted-supabase.com
VITE_SUPABASE_ANON_KEY=your-selfhosted-anon-key
```

##### Option B: Build-Time Configuration

1. **Create different configuration files for different environments**
2. **Use build scripts to copy the appropriate config**
3. **Modify your docker-compose.yml to include build args**

#### 3. Update Edge Functions

If you're using a self-hosted Supabase, you'll need to update the edge functions configuration:

1. **Update the project ID in supabase/config.toml:**
```toml
project_id = "your-selfhosted-project-id"
```

2. **Redeploy edge functions:**
```bash
supabase functions deploy --project-ref your-selfhosted-project-id
```

### Migration Steps Summary

1. **Backup your current data from hosted Supabase**
2. **Set up self-hosted Supabase instance**
3. **Import your schema and data**
4. **Update application configuration**
5. **Test the connection**
6. **Deploy with new environment variables**

## Monitoring and Maintenance

### Health Checks

All deployment configurations include health checks:
- **Endpoint:** `http://your-domain/health`
- **Expected Response:** `200 OK` with `"healthy"` text

### Logs

Access application logs:
```bash
# Docker Compose
docker-compose logs -f lab-management

# Individual platforms
# EasyPanel: Available in dashboard
# Dokploy: Built-in log viewer
# CapRover: Available in app dashboard
```

### Updates

To update the application:
1. **Push changes to your repository**
2. **Rebuild and redeploy:**
   ```bash
   docker-compose up --build -d
   ```

### Backup Strategy

1. **Database backups:** Use Supabase backup features
2. **Application state:** Ensure all critical data is in the database
3. **Configuration backups:** Keep environment variables documented

## Troubleshooting

### Common Issues

1. **Port conflicts:** Ensure ports 80/443 are available
2. **SSL issues:** Check domain DNS configuration
3. **Environment variables:** Verify all required vars are set
4. **Health check failures:** Check application startup logs

### Support Resources

- **EasyPanel:** [Documentation](https://easypanel.io/docs)
- **Dokploy:** [GitHub](https://github.com/Dokploy/dokploy)
- **CapRover:** [Documentation](https://caprover.com/docs)
- **Supabase Self-Hosting:** [Guide](https://supabase.com/docs/guides/self-hosting)
