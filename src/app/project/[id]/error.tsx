"use client";

export default function ProjectError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-5xl">⚠️</p>
        <h1 className="text-xl font-bold">作品加载失败</h1>
        <p className="text-sm text-gray-400">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition">重试</button>
          <a href="/dashboard" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">返回仪表盘</a>
        </div>
      </div>
    </div>
  );
}
