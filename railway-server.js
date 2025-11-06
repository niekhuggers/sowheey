const { createServer } = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const httpServer = createServer();

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://ranking-the-stars-drab.vercel.app',
      'https://sowheey-production.up.railway.app',
      'https://sowheey.vercel.app',
      ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : [])
    ],
    methods: ['GET', 'POST']
  }
});

// Basic socket connection for testing
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Use Railway's PORT or fallback
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

console.log(`Starting basic Socket.IO server on ${HOST}:${PORT}`);

httpServer.listen(PORT, HOST, () => {
  console.log(`Socket.IO server running on ${HOST}:${PORT}`);
});