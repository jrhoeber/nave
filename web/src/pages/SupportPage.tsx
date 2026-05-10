import { Link } from 'react-router-dom';
import { useState } from 'react';

const SUPPORT_EMAIL = 'nave@cornerstonedev.co';

const FAQS = [
  {
    q: 'What is Nave?',
    a: 'Nave is a Catholic prayer community app that connects you with your home parish, prayer groups, and fellow Catholics. The name refers to the central body of a Catholic church — the space where the faithful gather.',
  },
  {
    q: 'How much does Nave cost?',
    a: 'Nave is free to download and use on iOS and Android.',
  },
  {
    q: 'How do I sign up?',
    a: 'Download Nave from the App Store or Google Play, then sign in with Google or Apple. After signing in, you\'ll set up your profile (name, birthday, short bio) and choose your home parish.',
  },
  {
    q: 'Why do I need to provide my birthday?',
    a: 'Nave requires users to be at least 13 years old. Your birthday is also displayed on your profile so other members can wish you well.',
  },
  {
    q: 'How do I change my parish?',
    a: 'Open the Profile tab, tap Edit Profile, and select a new parish from the list. Use the search bar to find your parish quickly.',
  },
  {
    q: 'My parish isn\'t listed. What can I do?',
    a: `Email us at ${SUPPORT_EMAIL} with your parish name, city, and diocese. We add new parishes regularly and will get yours into the directory.`,
  },
  {
    q: 'How do prayer groups work?',
    a: 'Prayer groups are small communities organized around a shared focus — rosary, scripture study, men\'s and women\'s groups, youth, and more. You can browse and join existing groups or create your own. Each group has its own chat space for sharing intentions and reactions.',
  },
  {
    q: 'How do I report inappropriate content or a user?',
    a: 'Tap the menu (⋯) on any post, comment, or message to report it. You can also block another user from their profile. Reports are reviewed by our moderation team.',
  },
  {
    q: 'How do I block or unblock someone?',
    a: 'To block: open the user\'s profile and tap the menu icon (⋯) in the top right, then choose Block. To unblock: go to Settings → Blocked Users and tap unblock next to their name.',
  },
  {
    q: 'How do notifications work?',
    a: 'Nave sends push notifications for new group messages, friend requests, and parish activity. You can manage these in Settings → Notifications, or mute individual prayer groups from each group\'s profile screen.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Open the Profile tab, go to Settings, and tap Delete Account. This permanently removes your profile, posts, comments, and messages. The action cannot be undone.',
  },
  {
    q: 'I found a bug or have a feature request.',
    a: `We\'d love to hear from you. Email ${SUPPORT_EMAIL} with as much detail as possible — what device you\'re on, what you were doing, and what happened.`,
  },
] as const;

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-nave-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
        aria-expanded={open}
      >
        <span className="font-serif text-lg text-nave-primary group-hover:text-nave-accent transition-colors">
          {q}
        </span>
        <span
          className={`shrink-0 w-7 h-7 rounded-full bg-nave-primary/5 flex items-center justify-center text-nave-primary transition-transform duration-300 ${
            open ? 'rotate-45' : ''
          }`}
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-nave-secondary text-base leading-relaxed pr-10">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function SupportPage() {
  return (
    <div className="min-h-screen bg-nave-bg flex flex-col">
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

      <main className="flex-1 px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center pt-6 pb-12">
            <div className="text-nave-accent/50 text-4xl mb-6 select-none" aria-hidden>✝</div>
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="h-px w-10 bg-nave-accent/40" />
              <span className="text-nave-accent text-xs font-medium tracking-[0.35em] uppercase">
                Support
              </span>
              <div className="h-px w-10 bg-nave-accent/40" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-nave-primary mb-5 leading-tight">
              How can we help?
            </h1>
            <p className="text-nave-secondary text-lg leading-relaxed max-w-xl mx-auto">
              Answers to common questions. If you don&apos;t find what you&apos;re looking for,
              reach out and we&apos;ll get back to you.
            </p>
          </div>

          {/* Contact card */}
          <div className="bg-white rounded-2xl border border-nave-border shadow-sm p-7 mb-12 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-nave-accent/10 flex items-center justify-center text-nave-accent shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-nave-secondary text-xs font-medium tracking-widest uppercase mb-1.5">
                Contact us
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-serif text-xl sm:text-2xl text-nave-primary hover:text-nave-accent transition-colors break-all"
              >
                {SUPPORT_EMAIL}
              </a>
              <p className="text-nave-secondary text-sm mt-1.5">
                We typically respond within one to two business days.
              </p>
            </div>
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-2xl border border-nave-border shadow-sm px-7">
            <div className="pt-7 pb-2">
              <span className="text-nave-accent text-xs font-medium tracking-widest uppercase">
                Frequently asked questions
              </span>
            </div>
            <div>
              {FAQS.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center mt-14">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-nave-accent/30" />
              <div className="text-nave-accent/40 text-lg select-none">✦</div>
              <div className="h-px w-12 bg-nave-accent/30" />
            </div>
            <p className="text-nave-secondary text-sm">
              Still need help? Email{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
