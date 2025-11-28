'use client';

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cfl-bg">
      {/* Animated logo */}
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cfl-purple to-cfl-magenta flex items-center justify-center animate-pulse">
          <span className="text-4xl">🏎️</span>
        </div>

        {/* Spinning ring */}
        <div className="absolute inset-0 -m-2">
          <div className="w-28 h-28 border-2 border-transparent border-t-cfl-purple border-r-cfl-cyan rounded-full animate-spin" />
        </div>
      </div>

      {/* Text */}
      <div className="mt-8 text-center">
        <h1 className="text-xl font-bold text-white mb-2">
          CFL Volatility Race
        </h1>
        <p className="text-gray-400 text-sm">
          Loading market data...
        </p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-cfl-purple animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
