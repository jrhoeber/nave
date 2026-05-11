import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NaveLogo } from '../components/NaveLogo';

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-nave-bg/90 backdrop-blur-md py-2.5 shadow-sm border-b border-nave-border'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-5xl mx-auto px-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <NaveLogo size={30} />
          <span
            className="font-garamond text-2xl text-nave-text tracking-tight group-hover:text-nave-accent-dark transition-colors duration-200"
            style={{ letterSpacing: '-0.02em' }}
          >
            Nave
          </span>
        </Link>

        <Link
          to="/signin"
          className="text-sm font-medium text-nave-secondary hover:text-nave-text transition-colors"
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative cream-hero overflow-hidden pt-28 pb-16 px-5">
      {/* Gold left edge — mirrors WelcomeScreen */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-nave-accent z-20" aria-hidden />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Logo mark */}
        <div className="reveal flex justify-center mb-3">
          <NaveLogo size={72} />
        </div>

        {/* Wordmark */}
        <h1
          className="reveal reveal-delay-1 font-garamond text-nave-text leading-none tracking-tight"
          style={{ fontSize: 'clamp(48px, 7vw, 72px)', letterSpacing: '-0.02em' }}
        >
          Nave
        </h1>

        {/* Gold divider — mirrors WelcomeScreen */}
        <div className="reveal reveal-delay-1 w-8 h-[2px] bg-nave-accent mx-auto my-5" aria-hidden />

        {/* Headline */}
        <h2
          className="reveal reveal-delay-2 font-garamond italic text-nave-text mx-auto max-w-2xl"
          style={{
            fontSize: 'clamp(22px, 3vw, 30px)',
            lineHeight: 1.35,
            fontFeatureSettings: '"liga", "kern"',
          }}
        >
          Where Catholics gather, pray, and grow.
        </h2>

        {/* Subtext */}
        <p className="reveal reveal-delay-2 text-nave-secondary text-base md:text-lg max-w-xl mx-auto mt-5 leading-relaxed">
          Choose your home parish, join a prayer group, and stay close to
          fellow Catholics — rooted in the life of the Church.
        </p>

        {/* Scripture — Garamond italic on cream, exactly like the app */}
        <div className="reveal reveal-delay-3 mt-10">
          <p
            className="font-garamond italic text-nave-text mx-auto max-w-lg"
            style={{ fontSize: 'clamp(18px, 2vw, 22px)', lineHeight: 1.5 }}
          >
            &ldquo;For where two or three are gathered together in my name,
            there am I in the midst of them.&rdquo;
          </p>
          <p
            className="text-nave-secondary text-xs uppercase mt-2.5"
            style={{ letterSpacing: '0.18em' }}
          >
            Matthew 18:20
          </p>
        </div>

        {/* CTAs */}
        <div className="reveal reveal-delay-4 flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
          <a
            href="#"
            className="flex items-center gap-2.5 bg-nave-text text-white px-6 py-3.5 rounded-full font-semibold text-sm hover:bg-black/80 transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span>Continue with Apple</span>
          </a>

          <a
            href="#"
            className="flex items-center gap-2.5 bg-white text-nave-text border border-nave-border px-6 py-3.5 rounded-full font-semibold text-sm hover:border-nave-primary/30 hover:bg-nave-bg-alt transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </a>
        </div>

        <p
          className="reveal reveal-delay-4 text-nave-light text-[10px] uppercase mt-5"
          style={{ letterSpacing: '0.18em' }}
        >
          Free · iOS &amp; Android · Ages 13+
        </p>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const steps = [
  {
    n: 'I',
    title: 'Choose your parish',
    body: 'Search a directory of US parishes and pick your home.',
  },
  {
    n: 'II',
    title: 'Join a prayer group',
    body: 'Bible studies, men’s and women’s groups, devotional circles — or start your own.',
  },
  {
    n: 'III',
    title: 'Pray together',
    body: 'Share intentions, encourage a brother or sister, grow in friendship.',
  },
] as const;

function HowItWorks() {
  return (
    <section className="py-16 px-5 bg-nave-bg-alt border-y border-nave-border">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span
            className="text-nave-accent-dark text-[11px] font-medium uppercase"
            style={{ letterSpacing: '0.25em' }}
          >
            How it works
          </span>
          <h2 className="font-garamond text-3xl md:text-4xl text-nave-text mt-3 leading-tight">
            Three small steps into{' '}
            <span className="italic text-nave-accent-dark">community.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((s) => (
            <div key={s.n} className="card-surface p-6">
              <div className="font-garamond italic text-nave-accent text-3xl mb-2 leading-none">
                {s.n}.
              </div>
              <h3 className="font-garamond text-xl text-nave-text mb-1.5 leading-snug">
                {s.title}
              </h3>
              <p className="text-nave-secondary text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 4l9 5.5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    title: 'Your parish, in your pocket',
    description: 'A community feed for your home parish — reflections, prayer requests, comment threads.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Prayer groups for every season',
    description: 'Bible studies, men’s and women’s groups, young adults, families — public or private.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Group chat that feels human',
    description: 'Share intentions and photos. Send a heart on someone’s message. Mute when life gets loud.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: 'Friends in the faith',
    description: 'Find other Catholics, send friend requests, see mutual friends and shared groups.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: 'Faith-aware moderation',
    description: 'A Catholic policy reviews every post, comment, message, and image — honest prayer welcomed.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10z" />
        <path d="M12 11v4" />
        <path d="M10 13h4" />
      </svg>
    ),
    title: 'Care in hard moments',
    description: 'Crisis resources surface help you can actually call — 988, Catholic Charities, your priest.',
  },
] as const;

function Features() {
  return (
    <section className="py-16 px-5 bg-nave-bg">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span
            className="text-nave-accent-dark text-[11px] font-medium uppercase"
            style={{ letterSpacing: '0.25em' }}
          >
            What’s inside
          </span>
          <h2 className="font-garamond text-3xl md:text-4xl text-nave-text mt-3 mb-3 leading-tight">
            Everything for your{' '}
            <span className="italic text-nave-accent-dark">faith journey</span>
          </h2>
          <p className="text-nave-secondary text-base max-w-lg mx-auto leading-relaxed">
            From your home parish to prayer groups across the country.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group card-surface p-6 hover:border-nave-primary/20 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-nave-bg-alt flex items-center justify-center text-nave-primary mb-4 group-hover:bg-nave-accent/10 group-hover:text-nave-accent-dark transition-all duration-300">
                {f.icon}
              </div>
              <h3 className="font-garamond text-lg text-nave-text mb-1.5 leading-snug">
                {f.title}
              </h3>
              <p className="text-nave-secondary text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── About — single dark bookend ──────────────────────────────────────────────

function About() {
  return (
    <section className="py-20 px-5 dark-gradient relative overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(201,168,76,0.10) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-xl mx-auto text-center">
        <div className="flex justify-center mb-5">
          <NaveLogo size={56} />
        </div>

        <h2 className="font-garamond text-3xl md:text-4xl text-white mb-5 leading-tight">
          Built for the{' '}
          <span className="italic text-nave-accent-light">faithful</span>
        </h2>

        <p className="text-white/75 text-base leading-relaxed mb-3">
          The name <em className="font-garamond text-nave-accent-light not-italic">Nave</em>{' '}
          refers to the central body of a Catholic church — the space where the
          faithful gather.
        </p>

        <p className="text-white/55 text-sm leading-relaxed">
          Made for practicing Catholics and those exploring the faith. Free,
          ages 13 and up, on iOS and Android.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8">
          <div className="h-px w-12 bg-nave-accent/40" />
          <div className="text-nave-accent/60 text-sm select-none">✦</div>
          <div className="h-px w-12 bg-nave-accent/40" />
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-nave-primary-dark py-8 px-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <NaveLogo size={24} />
          <span className="font-garamond text-xl text-white/80 tracking-tight">
            Nave
          </span>
        </Link>

        <nav
          className="flex items-center flex-wrap justify-center gap-x-6 gap-y-1"
          aria-label="Footer"
        >
          {[
            ['Support', '/support'],
            ['Privacy', '/privacy'],
            ['Terms', '/terms'],
            ['DMCA', '/dmca'],
          ].map(([label, to]) => (
            <Link
              key={to}
              to={to}
              className="text-xs text-white/40 hover:text-nave-accent-light transition-colors duration-200"
            >
              {label}
            </Link>
          ))}
        </nav>

        <span className="text-[11px] text-white/25">
          © {new Date().getFullYear()} Nave
        </span>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <About />
      </main>
      <Footer />
    </div>
  );
}
