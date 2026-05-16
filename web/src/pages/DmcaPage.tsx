import { Link } from 'react-router-dom';
import { NaveLogo } from '../components/NaveLogo';

const AGENT = {
  name: 'Jordan Hoeber',
  email: 'jordan@cornerstonedev.co',
  phone: '(716) 347-5307',
  address: '418 Broadway Ste N, Albany, NY 12207, USA',
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-2xl text-nave-primary mt-10 mb-4">{children}</h2>
  );
}

export function DmcaPage() {
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
            <NaveLogo size={56} className="mx-auto mb-6" />
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="h-px w-10 bg-nave-accent/40" />
              <span className="text-nave-accent text-xs font-medium tracking-[0.35em] uppercase">
                Legal
              </span>
              <div className="h-px w-10 bg-nave-accent/40" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-nave-primary mb-5 leading-tight">
              DMCA Policy
            </h1>
            <p className="text-nave-secondary text-lg leading-relaxed max-w-xl mx-auto">
              How to report copyright infringement on Nave under the Digital Millennium Copyright
              Act, 17 U.S.C. § 512.
            </p>
          </div>

          {/* Designated agent card */}
          <div className="bg-white rounded-2xl border border-nave-border shadow-sm p-7 mb-12">
            <p className="text-nave-secondary text-xs font-medium tracking-widest uppercase mb-4">
              Designated Copyright Agent
            </p>
            <dl className="space-y-2 text-nave-primary">
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 text-nave-secondary text-sm">Name</dt>
                <dd className="font-medium">{AGENT.name}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 text-nave-secondary text-sm">Email</dt>
                <dd>
                  <a
                    href={`mailto:${AGENT.email}`}
                    className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors break-all"
                  >
                    {AGENT.email}
                  </a>
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 text-nave-secondary text-sm">Phone</dt>
                <dd>{AGENT.phone}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 text-nave-secondary text-sm">Mailing address</dt>
                <dd>{AGENT.address}</dd>
              </div>
            </dl>
          </div>

          {/* Body */}
          <div className="bg-white rounded-2xl border border-nave-border shadow-sm p-7 md:p-10">
            <p className="text-nave-secondary text-base leading-relaxed">
              Nave respects the intellectual property rights of others and expects its users to do
              the same. We respond to clear notices of alleged copyright infringement that comply
              with the Digital Millennium Copyright Act (the &ldquo;DMCA&rdquo;). This page
              describes how to submit a notice of infringement, how to submit a counter-notice if
              your content was removed in error, and our policy regarding repeat infringers.
            </p>

            <SectionHeading>Filing a notice of infringement</SectionHeading>
            <p className="text-nave-secondary text-base leading-relaxed">
              If you believe that material available on Nave infringes a copyright you own or
              control, you may submit a written notice to our Designated Copyright Agent listed
              above. Under 17 U.S.C. § 512(c)(3)(A), a valid notice must include substantially the
              following:
            </p>
            <ol className="list-decimal list-outside pl-6 mt-4 space-y-3 text-nave-secondary text-base leading-relaxed">
              <li>
                A physical or electronic signature of the copyright owner, or a person authorized
                to act on the owner&rsquo;s behalf.
              </li>
              <li>
                Identification of the copyrighted work claimed to have been infringed, or, if
                multiple works at a single online site are covered by a single notification, a
                representative list of such works.
              </li>
              <li>
                Identification of the material that is claimed to be infringing or to be the
                subject of infringing activity, with information reasonably sufficient to permit us
                to locate the material — typically a direct URL, post ID, message ID, or
                comment ID within Nave.
              </li>
              <li>
                Information reasonably sufficient to permit us to contact you, including your full
                legal name, mailing address, telephone number, and, if available, an email address.
              </li>
              <li>
                A statement that you have a good-faith belief that use of the material in the
                manner complained of is not authorized by the copyright owner, its agent, or the
                law.
              </li>
              <li>
                A statement that the information in the notification is accurate, and under penalty
                of perjury, that you are authorized to act on behalf of the owner of an exclusive
                right that is allegedly infringed.
              </li>
            </ol>
            <p className="text-nave-secondary text-base leading-relaxed mt-4">
              Notices that do not substantially comply with these requirements may not be
              actionable. Please send your notice by email to{' '}
              <a
                href={`mailto:${AGENT.email}`}
                className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors"
              >
                {AGENT.email}
              </a>{' '}
              with the subject line &ldquo;DMCA Notice,&rdquo; or by mail to the address above.
            </p>

            <SectionHeading>Counter-notice procedure</SectionHeading>
            <p className="text-nave-secondary text-base leading-relaxed">
              If you believe that content of yours that was removed or disabled is not infringing,
              or that you have the authorization from the copyright owner, the owner&rsquo;s agent,
              or pursuant to the law to post and use the material, you may submit a counter-notice
              to our Designated Copyright Agent. Under 17 U.S.C. § 512(g)(3), a valid
              counter-notice must include substantially the following:
            </p>
            <ol className="list-decimal list-outside pl-6 mt-4 space-y-3 text-nave-secondary text-base leading-relaxed">
              <li>Your physical or electronic signature.</li>
              <li>
                Identification of the material that has been removed or to which access has been
                disabled, and the location at which the material appeared before it was removed or
                disabled.
              </li>
              <li>
                A statement under penalty of perjury that you have a good-faith belief that the
                material was removed or disabled as a result of mistake or misidentification.
              </li>
              <li>
                Your full legal name, address, and telephone number, and a statement that you
                consent to the jurisdiction of the federal district court for the judicial district
                in which your address is located, or, if your address is outside the United States,
                of any judicial district in which Nave may be found, and that you will accept
                service of process from the person who provided notification under § 512(c)(1)(C)
                or an agent of that person.
              </li>
            </ol>
            <p className="text-nave-secondary text-base leading-relaxed mt-4">
              Upon receipt of a valid counter-notice, we will promptly forward a copy to the
              original complainant. Unless the complainant notifies us within ten (10) business
              days that they have filed an action seeking a court order to restrain you from
              engaging in the allegedly infringing activity, we may restore the removed material in
              not less than ten (10) and not more than fourteen (14) business days following
              receipt of the counter-notice.
            </p>

            <SectionHeading>Repeat infringer policy</SectionHeading>
            <p className="text-nave-secondary text-base leading-relaxed">
              In accordance with the DMCA and other applicable law, Nave maintains a policy of
              terminating, in appropriate circumstances, the accounts of users who are determined
              to be repeat infringers. We may also, in our sole discretion, limit access to Nave
              and terminate the accounts of any users who infringe the intellectual property rights
              of others, whether or not there is any repeat infringement.
            </p>

            <SectionHeading>Misrepresentations</SectionHeading>
            <p className="text-nave-secondary text-base leading-relaxed">
              Please be aware that under 17 U.S.C. § 512(f), any person who knowingly materially
              misrepresents that material or activity is infringing, or that material or activity
              was removed or disabled by mistake or misidentification, may be liable for damages,
              including costs and attorneys&rsquo; fees, incurred by the alleged infringer, by any
              copyright owner or copyright owner&rsquo;s authorized licensee, or by us, as a result
              of our reliance upon such misrepresentation. If you are unsure whether material on
              Nave infringes your copyright, we suggest that you first contact an attorney.
            </p>

            <p className="text-nave-secondary text-sm leading-relaxed mt-10 pt-6 border-t border-nave-border">
              Last updated May 10, 2026.
            </p>
          </div>

          {/* Footer note */}
          <div className="text-center mt-14">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-nave-accent/30" />
              <div className="text-nave-accent/40 text-lg select-none">✦</div>
              <div className="h-px w-12 bg-nave-accent/30" />
            </div>
            <p className="text-nave-secondary text-sm">
              Questions? Email{' '}
              <a
                href={`mailto:${AGENT.email}`}
                className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors"
              >
                {AGENT.email}
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
