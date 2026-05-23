export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
      <div className="w-96 space-y-4">
        <div className="h-8 w-32 bg-gray-800 rounded animate-pulse mx-auto" />
        <div className="h-10 bg-gray-800 rounded animate-pulse" />
        <div className="h-10 bg-gray-800 rounded animate-pulse" />
        <div className="h-10 bg-gray-800 rounded animate-pulse" />
      </div>
    </div>
  );
}
