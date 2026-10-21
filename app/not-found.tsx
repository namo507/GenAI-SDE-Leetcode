import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid max-w-xl gap-4 py-12">
      <p className="t-label tp-muted">404</p>
      <h1 className="t-title">That page is not part of the plan</h1>
      <p className="t-body tp-muted">The link may be from an older version of the curriculum. Every lesson and day is reachable from the roadmap.</p>
      <div className="flex flex-wrap gap-2">
        <Link className="tp-btn tp-btn--primary" href="/roadmap">
          Open the roadmap
        </Link>
        <Link className="tp-btn tp-btn--secondary" href="/dashboard">
          Go to today
        </Link>
      </div>
    </div>
  );
}
