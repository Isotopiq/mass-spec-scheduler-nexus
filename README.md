
# Lab Management System

A comprehensive web application for managing laboratory instruments, bookings, and user access built with React, TypeScript, Vite, Tailwind CSS, and a standalone Postgres backend.

## Project info

**Repository**: https://github.com/Isotopiq/mass-spec-scheduler-nexus

## Features

- 🔐 User authentication and role-based access control
- 📅 Instrument booking and calendar management
- 📊 Analytics and usage statistics
- 📧 Email notifications with customizable templates
- 🎨 Admin panel for system configuration
- 📱 Responsive design for mobile and desktop

## Technologies

This project is built with:

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Backend**: Node/Express, Postgres (pg), JWT auth
- **Email**: SMTP integration with customizable templates
- **Charts**: Recharts
- **Icons**: Lucide React

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- A Postgres database (local or hosted)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Postgres**
   - Create a Postgres database
   - Set `DATABASE_URL` and `JWT_SECRET` in `.env`
   - Run the SQL migrations from the `migrations/` folder on startup

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:5173 in your browser
   - Create an admin account or modify the database to set a user as admin

## Environment Variables

The application requires the following environment variables for the standalone backend:

- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: A long random secret for signing session tokens
- `PORT`: The port the Express server listens on (default 3000)

Optional S3 variables are documented in `.env.example`.

## Deployment Options

### 1. EasyPanel / Docker Compose (Recommended)

Use the included production compose file to deploy on EasyPanel or any Docker host:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Set `DATABASE_URL`, `JWT_SECRET`, and any S3/SMTP variables in the platform environment panel.

### 2. Traditional Web Hosting

Deploy to any static hosting provider:

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Build the project
npm run build

# Deploy
vercel --prod
```

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

#### AWS S3 + CloudFront
```bash
# Build the project
npm run build

# Upload to S3 bucket
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront distribution
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### 3. Docker Deployment

#### Basic Docker Setup

1. **Create a Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS builder

   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf

   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Create nginx.conf**
   ```nginx
   server {
       listen 80;
       server_name localhost;
       root /usr/share/nginx/html;
       index index.html index.htm;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /health {
           access_log off;
           return 200 "healthy\n";
           add_header Content-Type text/plain;
       }
   }
   ```

3. **Build and run**
   ```bash
   # Build the Docker image
   docker build -t lab-management-system .

   # Run the container
   docker run -p 8080:80 lab-management-system
   ```

#### Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  lab-management:
    build: .
    ports:
      - "8080:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.lab-management.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.lab-management.tls.certresolver=letsencrypt"

  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=your-email@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - letsencrypt:/letsencrypt
    restart: unless-stopped

volumes:
  letsencrypt:
```

### 4. EasyPanel Deployment

EasyPanel provides a simple Docker-based deployment platform.

#### Method 1: Direct Docker Deployment

1. **Login to your EasyPanel instance**
2. **Create a new service**
3. **Use the Docker image option**
4. **Configure the service:**
   ```yaml
   # Service Configuration
   name: lab-management-system
   image: your-registry/lab-management-system:latest
   ports:
     - containerPort: 80
       servicePort: 80
   environment:
     - name: NODE_ENV
       value: production
   ```

#### Method 2: GitHub Integration

1. **Connect your GitHub repository to EasyPanel**
2. **Create a new project from repository**
3. **Configure build settings:**
   ```yaml
   # Build Configuration
   buildCommand: npm run build
   outputDirectory: dist
   nodeVersion: 18
   ```
4. **Deploy automatically on git push**

#### Method 3: Docker Compose in EasyPanel

1. **Create a new stack in EasyPanel**
2. **Use the following docker-compose.yml:**
   ```yaml
   version: '3.8'
   
   services:
     lab-management:
       image: lab-management-system:latest
       ports:
         - "80:80"
       environment:
         NODE_ENV: production
       restart: unless-stopped
       labels:
         - "easypanel.domain=yourdomain.com"
         - "easypanel.ssl=true"
   ```

#### EasyPanel Deployment Script

Create a deployment script for EasyPanel:

```bash
#!/bin/bash

# Build the Docker image
docker build -t lab-management-system:latest .

# Tag for your registry
docker tag lab-management-system:latest your-registry/lab-management-system:latest

# Push to registry
docker push your-registry/lab-management-system:latest

# Deploy to EasyPanel (using their CLI if available)
# easypanel deploy --project lab-management-system --image your-registry/lab-management-system:latest
```

### 5. VPS/Dedicated Server Deployment

For deployment on your own server:

#### Using PM2 (Process Manager)

1. **Install PM2 globally**
   ```bash
   npm install -g pm2
   ```

2. **Create ecosystem.config.js**
   ```javascript
   module.exports = {
     apps: [{
       name: 'lab-management-system',
       script: 'serve',
       args: 'dist -s -l 3000',
       env: {
         NODE_ENV: 'production'
       }
     }]
   };
   ```

3. **Deploy**
   ```bash
   # Build the application
   npm run build
   
   # Install serve
   npm install -g serve
   
   # Start with PM2
   pm2 start ecosystem.config.js
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

#### Using Nginx

1. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       root /var/www/lab-management-system/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

2. **Enable the site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/lab-management-system /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## Configuration

### SMTP Settings

Configure email notifications through the admin panel:

1. Navigate to **Admin → SMTP Settings**
2. Enter your SMTP server details
3. Test the configuration with the test email feature

### Email Templates

Customize email templates in the admin panel:

1. Navigate to **Admin → Email Templates**
2. Edit HTML templates for different notification types
3. Use the preview and test features to verify your templates

### User Management

- Initial admin user is created based on the email specified in the database function
- Additional users can be managed through the admin panel
- Role-based access control (admin/user)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Check the [Devin Documentation](https://docs.devin.ai/)
- Create an issue in this repository
- Create an issue in this repository

## Editing this Project

### Using a Local IDE

Clone the repository, run `npm install`, set your `.env` variables, and use `docker compose up` for local development. Commit changes and open a pull request as usual.

### Using Local IDE

You can also edit locally:

```bash
# Clone and setup
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install

# Start development
npm run dev

# Push changes to your repository
git add .
git commit -m "Your changes"
git push
```

## Custom Domain Setup

To connect a custom domain:

1. Open your platform domain settings (e.g. EasyPanel Domains)
2. Point your domain to the deployed container
3. Configure TLS/SSL in your platform dashboard

For more information, see the deployment platform's custom-domain documentation.
