export function StarRating({
  rating,
  size = "md",
  className = "",
}: {
  rating: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const starClass = size === "sm" ? "size-4" : "size-5";
  return (
    <div
      className={`inline-flex gap-0.5 text-[var(--star)] ${className}`}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <svg
          key={value}
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={starClass}
          fill={value <= rating ? "currentColor" : "none"}
        >
          <path
            d="m12 2.8 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17l-5.56 2.92 1.06-6.2L3 9.33l6.22-.9L12 2.8Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}
