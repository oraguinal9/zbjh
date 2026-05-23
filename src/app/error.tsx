"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-5xl">⚠️</p>
        <h1 className="text-xl font-bold">出错了</h1>
        <p className="text-sm text-gray-400 max-w-md">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition">
          重试
        </button>
      </div>
    </div>
  );
}
