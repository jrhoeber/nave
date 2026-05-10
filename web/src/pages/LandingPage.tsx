import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-nave-primary/95 backdrop-blur-md py-3 shadow-xl shadow-black/20'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link
          to="/"
          className="font-garamond text-3xl text-white tracking-tight hover:text-nave-accent-light transition-colors duration-200"
          style={{ letterSpacing: '-0.02em' }}
        >
          Nave
        </Link>

        <Link to="/signin" className="btn-ghost text-sm">
          Sign In
        </Link>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden hero-gradient">
      {/* Gold left edge — echoes the mobile WelcomeScreen */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-nave-accent z-20" aria-hidden />

      {/* Decorative cross watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
        <svg
          width="700" height="700" viewBox="0 0 100 100"
          fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.035 }}
        >
          <rect x="43" y="8" width="14" height="84" rx="2" fill="white" />
          <rect x="14" y="30" width="72" height="14" rx="2" fill="white" />
        </svg>
      </div>

      {/* Gold radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(201,168,76,0.07) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-28">
        {/* Eyebrow */}
        <div className="reveal flex items-center justify-center gap-3 mb-10">
          <div className="h-px w-10 bg-nave-accent/50" />
          <span className="text-nave-accent text-xs font-medium tracking-[0.35em] uppercase">
            A Catholic Prayer Community
          </span>
          <div className="h-px w-10 bg-nave-accent/50" />
        </div>

        {/* Headline */}
        <h1 className="reveal reveal-delay-1 font-serif text-5xl md:text-[4.5rem] lg:text-[5.5rem] font-semibold text-white leading-[1.05] tracking-tight mb-6">
          Where Catholics{' '}
          <span className="italic text-nave-accent-light">gather,</span>
          <br />
          <span className="italic text-nave-accent-light">pray,</span> and grow
        </h1>

        {/* Subtext */}
        <p className="reveal reveal-delay-2 text-white/65 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Choose your home parish, join a small prayer group, and stay connected
          with fellow Catholics — all in one app, rooted in the life of the
          Church.
        </p>

        {/* Scripture quote — mirrors the mobile WelcomeScreen */}
        <div className="reveal reveal-delay-3 mb-12">
          <div className="h-px w-8 bg-nave-accent/40 mx-auto mb-5" />
          <p
            className="font-garamond italic text-white/80 text-xl md:text-2xl leading-relaxed max-w-xl mx-auto"
            style={{ fontFeatureSettings: '"liga", "kern"' }}
          >
            &ldquo;For where two or three are gathered together in my name,
            there am I in the midst of them.&rdquo;
          </p>
          <p className="text-white/45 text-xs tracking-[0.25em] uppercase mt-3">
            Matthew 18:20
          </p>
        </div>

        {/* CTA */}
        <div className="reveal reveal-delay-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#"
            className="flex items-center gap-3 bg-white text-nave-primary px-7 py-3.5 rounded-xl font-medium text-sm hover:bg-nave-accent hover:text-white transition-all duration-200 shadow-lg shadow-black/20 group"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span>Download on the App Store</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 bg-white/10 text-white border border-white/20 px-7 py-3.5 rounded-xl font-medium text-sm hover:bg-white/20 transition-all duration-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M3.18 23.76a2.4 2.4 0 0 1-.72-1.83V2.07A2.4 2.4 0 0 1 3.18.24L13.5 12 3.18 23.76zm11.46-11.1L7.2 18.9l8.58-4.95-1.14-1.29zm3.04-1.75a2.38 2.38 0 0 1 0 4.18L15.84 16.5l-2.34-2.7 2.34-2.7 1.84 1.81zM7.2 5.1l7.44 6.24-1.14 1.29L7.2 5.1z" />
            </svg>
            <span>Get it on Google Play</span>
          </a>
        </div>

        {/* Free / 13+ tagline */}
        <p className="reveal reveal-delay-4 text-white/35 text-xs tracking-widest uppercase mt-8">
          Free · iOS &amp; Android · Ages 13+
        </p>
      </div>

      {/* Bottom wave into next section */}
      <div className="absolute bottom-0 left-0 right-0" aria-hidden>
        <svg
          viewBox="0 0 1440 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full"
        >
          <path
            d="M0 72V44C200 72 400 16 720 16C1040 16 1240 72 1440 44V72H0Z"
            fill="#f8f5f0"
          />
        </svg>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const steps = [
  {
    n: 'I',
    title: 'Choose your parish',
    body:
      'Search a directory of US parishes and pick your home. Every feed and group in Nave is rooted in real-world parish life.',
  },
  {
    n: 'II',
    title: 'Join a prayer group',
    body:
      'Find Bible studies, men’s and women’s groups, young adult circles, devotional groups, and more — or start your own.',
  },
  {
    n: 'III',
    title: 'Pray together',
    body:
      'Share intentions in group chat, encourage a brother or sister with a heart on their post, and grow in friendship with fellow Catholics.',
  },
] as const;

function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-nave-bg">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-nave-accent text-xs font-medium tracking-[0.35em] uppercase">
            How it works
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-nave-primary mt-4 leading-tight">
            Three small steps into{' '}
            <span className="italic text-nave-accent-dark">community.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative bg-white rounded-2xl p-8 border border-nave-border shadow-sm"
            >
              <div className="font-garamond italic text-nave-accent text-3xl mb-4">
                {s.n}.
              </div>
              <h3 className="font-serif text-xl font-semibold text-nave-primary mb-3">
                {s.title}
              </h3>
              <p className="text-nave-secondary text-sm leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Feature Cards ────────────────────────────────────────────────────────────

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 4l9 5.5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    title: 'Your parish, in your pocket',
    description:
      'A community feed for your home parish. Share reflections and prayer requests, give a heart, and follow comment threads with fellow parishioners.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Prayer groups for every season',
    description:
      'Bible studies, men’s and women’s groups, young adults, families, devotional groups, and general fellowship — public or private, joined by tap or invitation.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Group chat that feels human',
    description:
      'Every group has its own chat space — share intentions and photos, send a heart on someone’s message, and mute groups when life gets loud.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: 'Friends in the faith',
    description:
      'Find other Catholics by name or username, send friend requests, and see mutual friends and shared groups — relationships rooted in something more than the feed.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: 'Faith-aware moderation',
    description:
      'A Catholic-specific policy reviews every post, comment, message, and image. Honest prayer about hard topics is welcome; harassment, hate, and blasphemy are not.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10z" />
        <path d="M12 11v4" />
        <path d="M10 13h4" />
      </svg>
    ),
    title: 'Care in hard moments',
    description:
      'When someone reaches out in crisis, Nave surfaces 988, Catholic Charities, your diocese family-life office, and your parish priest — help you can actually call.',
  },
] as const;

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group bg-white rounded-2xl p-8 border border-nave-border shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-nave-primary/5 flex items-center justify-center text-nave-primary mb-5 group-hover:bg-nave-accent/10 group-hover:text-nave-accent transition-all duration-300">
        {icon}
      </div>
      <h3 className="font-serif text-xl font-semibold text-nave-primary mb-3">
        {title}
      </h3>
      <p className="text-nave-secondary text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Features() {
  return (
    <section className="py-24 px-6 bg-white border-t border-nave-border/60">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nave-accent/10 border border-nave-accent/20 mb-5">
            <span className="text-nave-accent text-xs font-medium tracking-widest uppercase">What’s inside</span>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold text-nave-primary mb-5 leading-tight">
            Everything for your<br className="hidden sm:block" />{' '}
            <span className="italic text-nave-accent-dark">faith journey</span>
          </h2>
          <p className="text-nave-secondary text-lg max-w-xl mx-auto leading-relaxed">
            From your home parish to prayer groups across the country — Nave
            keeps your community close.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Scripture / Devotional Pause ─────────────────────────────────────────────

function ScripturePause() {
  return (
    <section className="relative py-28 px-6 bg-nave-bg overflow-hidden">
      {/* Faint cross watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
        <svg
          width="500" height="500" viewBox="0 0 100 100"
          fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.04 }}
        >
          <rect x="43" y="8" width="14" height="84" rx="2" fill="#1a2b4a" />
          <rect x="14" y="30" width="72" height="14" rx="2" fill="#1a2b4a" />
        </svg>
      </div>

      <div className="relative max-w-2xl mx-auto text-center">
        <div className="text-nave-accent/60 text-3xl mb-6 select-none" aria-hidden>
          ✦
        </div>
        <p
          className="font-garamond italic text-nave-primary text-2xl md:text-3xl leading-relaxed"
          style={{ fontFeatureSettings: '"liga", "kern"' }}
        >
          &ldquo;Bear one another&rsquo;s burdens, and so you will fulfill the
          law of Christ.&rdquo;
        </p>
        <p className="text-nave-secondary text-xs tracking-[0.3em] uppercase mt-5">
          Galatians 6:2
        </p>
      </div>
    </section>
  );
}

// ─── About ────────────────────────────────────────────────────────────────────

function About() {
  return (
    <section className="py-28 px-6 dark-gradient relative overflow-hidden">
      {/* Faint arch / cathedral shape */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Ornamental cross */}
        <div className="text-nave-accent/40 text-5xl mb-8 select-none" aria-hidden>
          ✝
        </div>

        <h2 className="font-serif text-4xl md:text-5xl font-semibold text-white mb-6 leading-tight">
          Built for the{' '}
          <span className="italic text-nave-accent-light">faithful</span>
        </h2>

        <p className="text-white/65 text-lg leading-relaxed mb-6">
          The name <em className="font-garamond text-nave-accent-light not-italic">Nave</em>{' '}
          refers to the central body of a Catholic church — the space where the
          faithful gather. We built this app to bring that same spirit of
          community to your phone, wherever you are.
        </p>

        <p className="text-white/55 text-base leading-relaxed">
          Nave is made for practicing Catholics and those exploring the faith
          who want to stay connected with their parish, find meaningful prayer
          communities, and share the journey with others. Free, ages 13 and up,
          on iOS and Android.
        </p>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-4 mt-12">
          <div className="h-px w-16 bg-nave-accent/30" />
          <div className="text-nave-accent/40 text-lg select-none">✦</div>
          <div className="h-px w-16 bg-nave-accent/30" />
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-nave-primary-dark py-10 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
          <span className="font-garamond text-2xl text-white/80 tracking-tight">Nave</span>

          <nav className="flex items-center flex-wrap justify-center gap-x-8 gap-y-2" aria-label="Footer">
            <Link
              to="/support"
              className="text-sm text-white/40 hover:text-nave-accent transition-colors duration-200"
            >
              Support
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-white/40 hover:text-nave-accent transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-white/40 hover:text-nave-accent transition-colors duration-200"
            >
              Terms of Service
            </Link>
            <Link
              to="/dmca"
              className="text-sm text-white/40 hover:text-nave-accent transition-colors duration-200"
            >
              DMCA
            </Link>
          </nav>

          <span className="text-xs text-white/25">
            © {new Date().getFullYear()} Nave. All rights reserved.
          </span>
        </div>
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
        <ScripturePause />
        <About />
      </main>
      <Footer />
    </div>
  );
}
