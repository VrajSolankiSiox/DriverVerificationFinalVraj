export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        {/* <p className="text-sm font-medium text-slate-600">Loading...</p> */}
      </div>
    </div>
  );
}
