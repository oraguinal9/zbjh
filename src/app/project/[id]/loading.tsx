export default function ProjectLoading() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="h-5 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
      </nav>
      <div className="flex h-[calc(100vh-57px)]">
        <div className="w-72 border-r border-gray-800 p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 w-64 bg-gray-800 rounded animate-pulse" />
          <div className="h-64 bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
