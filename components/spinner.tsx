/**
 * Minimal CSS spinner. Inherits the current text colour (`border-current`) so
 * it works on cream buttons and the teal page alike; size via className.
 */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
