export function WinnerHistoryHeading({ onReset }: { onReset: () => void }) {
  return (
    <div className="history-heading">
      <h2>당첨 이력</h2>
      <button
        className="history-reset"
        type="button"
        onClick={onReset}
        aria-label="당첨 이력 초기화"
        title="당첨 이력 초기화"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 7a9 9 0 0 0-15-1L2 9m0-6v6h6" />
          <path d="M4 17a9 9 0 0 0 15 1l3-3m0 6v-6h-6" />
        </svg>
      </button>
    </div>
  );
}
