# Railway Deployment Guide

This app requires **TWO separate Railway services**:

## 1. Main Next.js App Service

### Environment Variables:
```bash
DATABASE_URL=<your-postgres-url>
NEXT_PUBLIC_SOCKET_URL=https://your-socket-service.up.railway.app
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
```

### Build Command:
```bash
npm run build
```

### Start Command:
```bash
npm run start
```

## 2. Socket.IO Server Service

Create a **separate Railway service** for the Socket.IO server.

### Environment Variables:
```bash
DATABASE_URL=<same-postgres-url-as-main-app>
PORT=${{PORT}}  # Railway will auto-assign this
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
```

### Build Command:
```bash
npm install && npx prisma generate
```

### Start Command:
```bash
npm run start:socket
```

### Important Settings:
- **Health Check Path**: `/health`
- **Port**: Leave as default (Railway will assign)
- **Region**: Same as your main app

## Deployment Steps:

1. **Deploy PostgreSQL Database** (if not already done)
   - Create a new PostgreSQL service in Railway
   - Copy the DATABASE_URL

2. **Deploy Main App**
   - Create new service from GitHub repo
   - Set environment variables (including NEXT_PUBLIC_SOCKET_URL pointing to Socket service)
   - Deploy

3. **Deploy Socket.IO Server**
   - Create another new service from the SAME GitHub repo
   - Set environment variables
   - Set custom start command: `npm run socket:prod`
   - Deploy

4. **Update Main App**
   - Once Socket.IO server is deployed, get its URL
   - Update NEXT_PUBLIC_SOCKET_URL in main app to point to Socket.IO service
   - Redeploy main app

## Verifying Deployment:

1. **Check Socket.IO Health**: Visit `https://your-socket-service.up.railway.app/health`
2. **Check Console**: Both services should show connection logs
3. **Test Real-time**: Admin actions should update player screens in real-time

## Common Issues:

- **CORS errors**: Make sure the Socket.IO server has your main app URL in its CORS origins
- **Connection failures**: Verify NEXT_PUBLIC_SOCKET_URL is using HTTPS and correct URL
- **Database errors**: Both services need the same DATABASE_URL

## Production URLs:

After deployment, you'll have:
- Main app: `https://your-app-name.up.railway.app`
- Socket server: `https://your-socket-name.up.railway.app`

The Socket.IO server will automatically use Railway's assigned PORT.