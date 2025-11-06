#!/usr/bin/env node

console.log('=== PORT Debug Information ===')
console.log('process.env.PORT:', JSON.stringify(process.env.PORT))
console.log('typeof process.env.PORT:', typeof process.env.PORT)
console.log('process.env.PORT length:', process.env.PORT ? process.env.PORT.length : 'undefined')
console.log('process.env.SOCKET_PORT:', JSON.stringify(process.env.SOCKET_PORT))
console.log('All PORT-related env vars:')

Object.keys(process.env)
  .filter(key => key.toLowerCase().includes('port'))
  .forEach(key => {
    console.log(`  ${key}: ${JSON.stringify(process.env[key])}`)
  })

console.log('=== Attempting PORT parsing ===')
const portValue = process.env.PORT || '3001'
console.log('Raw PORT value:', JSON.stringify(portValue))
console.log('PORT after trim:', JSON.stringify(portValue.trim()))

try {
  const parsed = parseInt(portValue, 10)
  console.log('Parsed PORT:', parsed)
  console.log('Is valid number:', !isNaN(parsed))
  console.log('Is in range:', parsed >= 0 && parsed <= 65535)
} catch (error) {
  console.error('Error parsing PORT:', error.message)
}

console.log('=== End Debug ===')
process.exit(0)