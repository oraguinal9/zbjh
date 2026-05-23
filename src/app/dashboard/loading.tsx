export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="h-6 w-24 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="h-8 w-32 bg-gray-800 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
              <div className="h-5 w-48 bg-gray-800 rounded mb-3" />
              <div className="h-4 w-64 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
