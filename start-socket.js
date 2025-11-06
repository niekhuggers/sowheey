#!/usr/bin/env node

// Minimal Railway-compatible startup script
console.log('Starting Socket.IO server for Railway...')

// Set default PORT if not provided
if (!process.env.PORT) {
  console.log('No PORT env var found, setting to 3001')
  process.env.PORT = '3001'
}

console.log(`PORT environment variable: ${process.env.PORT}`)

// Import and start the socket server
require('tsx/esm').register()
require('./server/socket.ts')