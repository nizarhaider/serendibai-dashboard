"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="loading-page">
      <h1>We couldn’t load your workspace.</h1>
      <p>Your data is safe. Please try again.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
