import { Link } from 'react-router-dom';

interface Props {
  title: string;
}

export function ComingSoonPage({ title }: Props) {
  return (
    <div className="min-h-screen bg-nave-bg flex flex-col">
      {/* Back link */}
      <div className="p-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-nave-secondary hover:text-nave-primary transition-colors font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-20">
        <div className="text-nave-accent/50 text-4xl mb-6 select-none" aria-hidden>✝</div>

        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-nave-primary mb-5">
          {title}
        </h1>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nave-accent/10 border border-nave-accent/20 mb-6">
          <div className="w-2 h-2 rounded-full bg-nave-accent animate-pulse-slow" />
          <span className="text-nave-accent text-xs font-medium tracking-widest uppercase">
            Coming Soon
          </span>
        </div>

        <p className="text-nave-secondary text-base max-w-sm leading-relaxed">
          This page is currently being prepared. Thank you for your patience.
        </p>

        <Link
          to="/"
          className="mt-10 inline-flex items-center gap-2 text-sm text-nave-accent hover:text-nave-accent-dark transition-colors font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Return to homepage
        </Link>
      </div>
    </div>
  );
}
