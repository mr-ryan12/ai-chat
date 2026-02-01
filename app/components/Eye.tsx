export default function Eye({ slashed }: { slashed?: boolean }) {
  return (
    <svg
      className="h-5 w-5 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      {slashed && <path d="M3 3l18 18" />}
    </svg>
  );
}
