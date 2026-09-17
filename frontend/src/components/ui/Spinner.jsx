export default function Spinner({ size = "md", className = "" }) {
  const s = { sm: "h-4 w-4", md: "h-7 w-7", lg: "h-10 w-10" }[size];
  return (
    <div className={`animate-spin rounded-full border-2 border-brand-200 border-t-brand-500 ${s} ${className}`} />
  );
}

export function PageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
