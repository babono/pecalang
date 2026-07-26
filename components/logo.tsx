/**
 * Pecalang mark — a pair of watcher's binoculars. Line-art in `currentColor`
 * so it inherits whatever text colour it sits next to (cream on the teal
 * header, cream on the login screen).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* lenses */}
      <circle cx="10" cy="20" r="5.4" />
      <circle cx="22" cy="20" r="5.4" />
      {/* pupils */}
      <circle cx="10" cy="20" r="1.9" />
      <circle cx="22" cy="20" r="1.9" />
      {/* bridge */}
      <path d="M15.4 18.4 C 15.8 16.6 16.2 16.6 16.6 18.4" />
      {/* antenna + knob */}
      <path d="M16 16.8 V 12" />
      <circle cx="16" cy="10.4" r="1.4" />
    </svg>
  );
}
