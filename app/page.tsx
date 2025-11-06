import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-5xl font-bold mb-4">🌟 Ranking the Stars</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Welcome to het vrienden weekend! 
              Join the ranking game en laat zien wie de beste is! 🏆
            </p>
          </div>

          <Link
            href="/play"
            className="inline-block group rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 px-8 py-6 transition-all hover:border-blue-400 hover:shadow-lg hover:scale-105"
          >
            <div className="text-center">
              <h2 className="mb-3 text-3xl font-bold text-blue-800">
                🎮 Join Game{' '}
                <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                  →
                </span>
              </h2>
              <p className="text-blue-700 text-lg max-w-md">
                Voer de room code in om mee te doen!
                <br />Ready to play? 🚀
              </p>
            </div>
          </Link>

          <div className="text-sm text-gray-500 mt-8">
            Room code: WEEKEND2024 • Mobile-friendly • Live scoring
          </div>
        </div>
      </div>
    </main>
  )
}