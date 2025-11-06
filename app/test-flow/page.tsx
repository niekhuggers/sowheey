'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function TestFlowPage() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runTest = async () => {
    setTesting(true)
    setResults(null)
    
    try {
      const response = await fetch('/api/test-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({ error: 'Test failed to run', details: error })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>🧪 End-to-End Game Flow Test</CardTitle>
          <p className="text-gray-600">
            This test simulates a complete game flow: team pairing → round start → submissions → scoring → results
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runTest} 
            disabled={testing}
            className="w-full"
            size="lg"
          >
            {testing ? 'Running Test...' : 'Run End-to-End Test'}
          </Button>
          
          {results && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">
                {results.success ? '✅ Test Results' : '❌ Test Failed'}
              </h3>
              
              {results.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700 font-medium">Error: {results.error}</p>
                  {results.details && (
                    <p className="text-red-600 text-sm mt-1">{results.details}</p>
                  )}
                </div>
              )}
              
              {results.testResults && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {results.testResults.join('\n')}
                  </pre>
                </div>
              )}
              
              {results.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <h4 className="text-green-800 font-medium">Test Summary:</h4>
                  <ul className="text-green-700 text-sm mt-2 space-y-1">
                    <li>• Team Used: {results.teamUsed}</li>
                    <li>• Round ID: {results.roundId}</li>
                    <li>• Scores Generated: {results.scoresGenerated}</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}