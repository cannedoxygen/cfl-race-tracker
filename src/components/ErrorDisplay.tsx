'use client';

interface Props {
  error: string;
  onRetry: () => void;
}

export function ErrorDisplay({ error, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {/* Error icon */}
      <div className="w-16 h-16 rounded-2xl bg-red-500 bg-opacity-20 flex items-center justify-center mb-4">
        <span className="text-3xl">⚠️</span>
      </div>

      {/* Error message */}
      <h3 className="text-lg font-bold text-white mb-2">
        Connection Error
      </h3>
      <p className="text-gray-400 text-sm mb-6 max-w-sm">
        {error || 'Failed to fetch market data. Please check your connection and try again.'}
      </p>

      {/* Retry button */}
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-cfl-purple rounded-xl text-white font-medium hover:bg-opacity-80 transition-all"
      >
        Try Again
      </button>
    </div>
  );
}
