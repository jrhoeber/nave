import { Link } from 'react-router-dom';

const COMPANY = {
  name: 'Cornerstone Dev LLC',
  address: '418 Broadway Ste N, Albany, NY 12207, USA',
  support: 'nave@cornerstonedev.co',
  privacy: 'naveprivacy@cornerstonedev.co',
  security: 'navetsecurity@cornerstonedev.co',
  dmcaEmail: 'jordan@cornerstonedev.co',
  state: 'New York',
  county: 'Albany County',
};

const EFFECTIVE_DATE = 'May 10, 2026';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-2xl text-nave-primary mt-10 mb-4">{children}</h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-serif text-lg text-nave-primary mt-6 mb-3">{children}</h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-nave-secondary text-base leading-relaxed mt-4">{children}</p>
  );
}

export function TermsPage() {
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
                Legal
              </span>
              <div className="h-px w-10 bg-nave-accent/40" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-nave-primary mb-5 leading-tight">
              Terms of Service
            </h1>
            <p className="text-nave-secondary text-lg leading-relaxed max-w-xl mx-auto">
              The agreement that governs your use of Nave.
            </p>
            <p className="text-nave-secondary text-sm mt-4">
              Effective {EFFECTIVE_DATE}
            </p>
          </div>

          {/* Publisher card */}
          <div className="bg-white rounded-2xl border border-nave-border shadow-sm p-7 mb-12">
            <p className="text-nave-secondary text-xs font-medium tracking-widest uppercase mb-4">
              Publisher
            </p>
            <dl className="space-y-2 text-nave-primary">
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 text-nave-secondary text-sm">Company</dt>
                <dd className="font-medium">{COMPANY.name}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 text-nave-secondary text-sm">Address</dt>
                <dd>{COMPANY.address}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 text-nave-secondary text-sm">Support</dt>
                <dd>
                  <a
                    href={`mailto:${COMPANY.support}`}
                    className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors break-all"
                  >
                    {COMPANY.support}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* Body */}
          <div className="bg-white rounded-2xl border border-nave-border shadow-sm p-7 md:p-10">
            <P>
              These Terms of Service (&ldquo;<strong>Terms</strong>&rdquo;) are a binding agreement
              between you and {COMPANY.name} (&ldquo;<strong>Nave</strong>,&rdquo;
              &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>,&rdquo; or
              &ldquo;<strong>our</strong>&rdquo;), the publisher of the Nave mobile application, the
              naveapp.co website, and related services (collectively, the
              &ldquo;<strong>Service</strong>&rdquo;). By creating an account or otherwise using the
              Service, you agree to these Terms and to our{' '}
              <Link to="/privacy" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the Service.
            </P>

            <SectionHeading>1. Eligibility</SectionHeading>
            <P>
              You must be at least 13 years old to create an account. We do not knowingly collect
              personal information from anyone under 13, and our sign-up flow blocks accounts whose
              stated date of birth indicates an age under 13. If you are between 13 and the age of
              majority where you live, you represent that your parent or legal guardian has reviewed
              and agreed to these Terms on your behalf. The Service is currently offered only to
              users in the United States; by using the Service you represent that you are accessing
              it from the United States.
            </P>
            <P>
              By using the Service you also represent that you are not barred from receiving the
              Service under the laws of the United States or any other jurisdiction that applies to
              you, and that you will comply with all applicable laws and these Terms.
            </P>

            <SectionHeading>2. Your account</SectionHeading>
            <P>
              You create an account by signing in with Google, Apple, or an email and password
              through Firebase Authentication, then completing a short profile (name, username,
              date of birth, optional bio) and selecting a home parish. You are responsible for the
              accuracy of the information you provide and for keeping your sign-in credentials
              secure. You are responsible for everything that happens under your account, including
              content you post and actions you take.
            </P>
            <P>
              You agree to notify us at{' '}
              <a href={`mailto:${COMPANY.security}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.security}
              </a>{' '}
              promptly if you suspect any unauthorized access to your account or any other security
              concern. You may not transfer your account to anyone else.
            </P>

            <SectionHeading>3. The Service</SectionHeading>
            <P>
              Nave is a Catholic prayer-community application. Features include: a parish community
              feed; small prayer groups (public or private) with their own member chat; reactions
              and comments; a friend graph; user reports; and push notifications. You select a
              real-world parish as your home parish, and the Service connects you to its community
              feed and the prayer groups associated with it. We may add, change, or remove features
              at any time.
            </P>

            <SectionHeading>4. Free service</SectionHeading>
            <P>
              The Service is provided free of charge. There are no subscriptions, paid tiers, or
              in-app purchases. We reserve the right to introduce paid features in the future, in
              which case we will give you notice and obtain any required consent before charging
              you for anything.
            </P>

            <SectionHeading>5. Your content</SectionHeading>
            <SubHeading>5.1 You own your content</SubHeading>
            <P>
              You retain all ownership rights in the text, photos, profile information, prayer
              group descriptions, and other content you submit to the Service
              (&ldquo;<strong>Your Content</strong>&rdquo;). You are solely responsible for Your
              Content, including its lawfulness, accuracy, and the rights you have to share it.
            </P>
            <SubHeading>5.2 License you grant to us</SubHeading>
            <P>
              By submitting Your Content to the Service, you grant Nave a worldwide, non-exclusive,
              royalty-free, sublicensable, and transferable license to host, store, copy, transmit,
              display, modify (for example, to crop, resize, compress, or transcode photos), make
              derivative works of, and otherwise use Your Content solely as necessary to operate,
              provide, secure, moderate, and improve the Service, and to enforce these Terms. This
              license ends when Your Content is removed from the Service, except (a) for backup
              copies that we retain for a reasonable period before purging and (b) where Your
              Content has been shared with others who have not deleted it (for example, a group
              message in a chat that other members have not deleted).
            </P>
            <SubHeading>5.3 Feedback</SubHeading>
            <P>
              If you send us suggestions, ideas, or other feedback, you grant us an unrestricted,
              perpetual, irrevocable, royalty-free license to use that feedback for any purpose,
              with no obligation to you.
            </P>
            <SubHeading>5.4 Visibility of Your Content</SubHeading>
            <P>
              Your profile (display name, username, avatar, bio, parish) is visible to any signed-in
              user. Parish posts and comments are visible to any signed-in user. Group messages and
              images are visible only to members of the prayer group. Anything you post should be
              treated as not private and as potentially visible to other users.
            </P>

            <SectionHeading>6. Community standards</SectionHeading>
            <P>
              Nave is built around prayer and Catholic community. You agree not to use the Service
              to do or share any of the following:
            </P>
            <ul className="list-disc list-outside pl-6 mt-4 space-y-2 text-nave-secondary text-base leading-relaxed">
              <li>
                Harass, threaten, bully, intimidate, or impersonate another person, or incite others
                to do so.
              </li>
              <li>
                Post hate speech or attack any person or group based on faith, race, ethnicity,
                national origin, sex, gender, sexual orientation, disability, or other protected
                characteristic.
              </li>
              <li>
                Post anti-Catholic harassment, blasphemy, profanity, vulgar language, sexually
                explicit content, nudity, or sexually suggestive imagery.
              </li>
              <li>
                Post graphic violence, gore, or content glorifying self-harm, suicide, or violence
                against others.
              </li>
              <li>
                Post content that promotes illegal activity, fraud, scams, spam, deceptive practices,
                or unsolicited commercial messaging.
              </li>
              <li>
                Post content that infringes any copyright, trademark, right of publicity, or other
                intellectual property right; submit confidential information you do not have the
                right to share.
              </li>
              <li>
                Share another person&rsquo;s private or personal information without their consent
                (doxxing).
              </li>
              <li>
                Use the Service to provide medical, legal, financial, or other professional advice
                you are not qualified to give. Prayer requests about hard topics including grief,
                addiction, mental health, or recovery are welcome and are not professional advice.
              </li>
              <li>
                Attempt to access another user&rsquo;s account; circumvent moderation, age, or
                privacy controls; reverse-engineer, scrape, crawl, or load-test the Service; or use
                automated means to interact with the Service except for the official mobile and web
                clients we publish.
              </li>
              <li>
                Use the Service to develop a competing product or to train any machine-learning
                model on Your Content or other users&rsquo; content.
              </li>
              <li>
                Interfere with the integrity of the Service, including by introducing malware,
                conducting denial-of-service activity, or probing for vulnerabilities outside the
                process described in our security disclosure address below.
              </li>
            </ul>
            <P>
              You may report security vulnerabilities in good faith to{' '}
              <a href={`mailto:${COMPANY.security}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.security}
              </a>
              . Please do not access, modify, or destroy other users&rsquo; data while testing.
            </P>

            <SectionHeading>7. Moderation, reporting, and removal</SectionHeading>
            <P>
              Every parish post, comment, and group message is screened by an automated moderation
              pipeline before it is published, and every uploaded image is screened by an automated
              image-safety service. Some content is held for human review before it appears. We may
              remove, hide, edit, refuse to publish, restore, or otherwise act on any content at any
              time, with or without notice, in our sole discretion, including (without limitation)
              when we believe content violates these Terms or is otherwise harmful to the
              community.
            </P>
            <P>
              You can report a post, comment, or group message from the kebab (&ldquo;…&rdquo;) menu
              in the app. We review reports through an admin queue and may act on them as described
              above. Filing a report does not guarantee any particular outcome.
            </P>
            <P>
              If our automated systems detect that you may be in crisis (for example, signals of
              imminent self-harm), the Service may surface crisis resources, including the 988
              Suicide &amp; Crisis Lifeline, Catholic Charities, your diocese, and your parish. The
              Service is not a crisis hotline and is not a substitute for emergency services.
              <strong> If you or someone else is in immediate danger, call 911 (or your local
              emergency number) or 988.</strong>
            </P>

            <SectionHeading>8. Group chat is not end-to-end encrypted</SectionHeading>
            <P>
              Group messages and images are stored on our servers in a form we can read so that we
              can apply moderation, respond to lawful requests, and operate the Service. Group chat
              is <em>not</em> end-to-end encrypted. Treat anything you post in chat as something
              that could be seen by other group members and by Nave. Messages are encrypted in
              transit and at rest by our cloud providers.
            </P>

            <SectionHeading>9. Push notifications</SectionHeading>
            <P>
              You can opt in to push notifications during onboarding or later in your device
              settings. Within the app you can also control which notification types you receive
              (group messages, friend requests) and mute individual prayer groups. Standard message
              and data rates may apply, depending on your carrier and device.
            </P>

            <SectionHeading>10. Our intellectual property</SectionHeading>
            <P>
              The Service, including the Nave name, logo, trade dress, software, design, graphics,
              and the curated parish directory, is owned by {COMPANY.name} or its licensors and is
              protected by copyright, trademark, and other intellectual property laws. We grant you
              a personal, limited, non-exclusive, non-transferable, revocable license to install and
              use the official Nave mobile application and to access the Service through our
              official clients, solely for your personal, non-commercial use and subject to these
              Terms. All rights not expressly granted are reserved.
            </P>
            <P>
              Some components of the Service incorporate third-party open-source software, which is
              licensed under its own terms. A list of significant open-source components is
              available in the mobile app at Settings → About Nave → Open Source Notices.
            </P>

            <SectionHeading>11. Copyright (DMCA)</SectionHeading>
            <P>
              We respond to notices of alleged copyright infringement that comply with the Digital
              Millennium Copyright Act, 17 U.S.C. § 512. To submit a notice or counter-notice, see
              our{' '}
              <Link to="/dmca" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                DMCA Policy
              </Link>
              , which lists our designated copyright agent. We may terminate the accounts of users
              who are determined to be repeat infringers.
            </P>

            <SectionHeading>12. Third-party services</SectionHeading>
            <P>
              The Service relies on third-party providers (including Google Firebase, Google Cloud,
              Apple, OpenAI, and Anthropic) to deliver authentication, hosting, push notifications,
              and content moderation. Your use of those providers&rsquo; products through the
              Service is subject to their own terms and privacy policies. We are not responsible
              for the acts or omissions of third parties.
            </P>

            <SectionHeading>13. Suspension and termination</SectionHeading>
            <P>
              We may suspend, restrict, or terminate your access to the Service, in whole or in
              part, at any time, with or without notice, for any reason, including (without
              limitation) if we believe you have violated these Terms, if your account is inactive
              for a long period, if continuing to provide the Service to you would expose us or
              other users to legal or safety risk, or if we discontinue the Service. We may also
              remove, hide, or refuse to publish content as described in Section 7.
            </P>
            <P>
              You may stop using the Service at any time. You may delete your account from the
              mobile app under Settings → Delete Account, or from the web at{' '}
              <Link to="/delete" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                naveapp.co/delete
              </Link>
              . Deletion removes your profile and most of your content from the Service. We may
              retain certain records (for example, moderation audit records and security logs) for
              the periods described in our Privacy Policy, where we have a lawful basis to do so.
              Sections of these Terms that by their nature should survive termination (including,
              without limitation, Sections 5.2&ndash;5.3, 10, 14&ndash;19, and 21) will survive.
            </P>

            <SectionHeading>14. Disclaimers</SectionHeading>
            <P>
              <strong>
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
                warranty of any kind, whether express, implied, or statutory.
              </strong>{' '}
              To the fullest extent permitted by law, Nave disclaims all warranties, including any
              implied warranties of merchantability, fitness for a particular purpose,
              non-infringement, and any warranty arising from course of dealing or usage of trade.
              We do not warrant that the Service will be uninterrupted, timely, secure, error-free,
              or free of viruses or other harmful components, or that any defects will be
              corrected. We do not warrant the accuracy, reliability, completeness, or quality of
              any content posted by users.
            </P>
            <P>
              Nave is not affiliated with, endorsed by, or otherwise officially connected to the
              Catholic Church, the Holy See, the United States Conference of Catholic Bishops, any
              diocese, or any individual parish, except where we have an explicit written agreement
              that says otherwise. References to parishes in the directory are for identification
              and routing of community features only and do not imply any endorsement.
            </P>

            <SectionHeading>15. Limitation of liability</SectionHeading>
            <P>
              <strong>
                To the fullest extent permitted by law, in no event will {COMPANY.name}, its
                affiliates, or its or their officers, directors, employees, agents, or licensors be
                liable for any indirect, incidental, special, consequential, exemplary, or punitive
                damages, or for any loss of profits, revenue, data, use, goodwill, or other
                intangible losses, arising out of or relating to your use of, or inability to use,
                the Service, even if we have been advised of the possibility of such damages.
              </strong>
            </P>
            <P>
              <strong>
                Our total cumulative liability arising out of or relating to these Terms or the
                Service will not exceed the greater of (a) one hundred U.S. dollars ($100) or (b)
                the amount you paid us, if any, in the twelve (12) months immediately preceding the
                event giving rise to the claim.
              </strong>{' '}
              The limitations in this Section apply to any theory of liability, whether based on
              warranty, contract, statute, tort (including negligence), or otherwise. Some
              jurisdictions do not allow the exclusion or limitation of certain damages, so some of
              the above may not apply to you; in those jurisdictions our liability is limited to
              the smallest extent permitted by law.
            </P>

            <SectionHeading>16. Indemnification</SectionHeading>
            <P>
              You agree to defend, indemnify, and hold harmless {COMPANY.name} and its affiliates,
              officers, directors, employees, and agents from and against any claims, liabilities,
              damages, losses, and expenses, including reasonable attorneys&rsquo; fees, arising
              out of or in any way connected with (a) Your Content, (b) your use of the Service,
              (c) your violation of these Terms, or (d) your violation of any law or the rights of
              any third party. We reserve the right, at our own expense, to assume the exclusive
              defense and control of any matter otherwise subject to indemnification by you, in
              which event you will cooperate with us in asserting any available defenses.
            </P>

            <SectionHeading>17. Governing law and dispute resolution</SectionHeading>
            <P>
              These Terms are governed by the laws of the State of {COMPANY.state}, without regard
              to its conflict-of-laws rules. The U.N. Convention on Contracts for the International
              Sale of Goods does not apply.
            </P>
            <P>
              You and Nave agree to first try to resolve any dispute informally by contacting us at{' '}
              <a href={`mailto:${COMPANY.support}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.support}
              </a>
              . If we cannot resolve a dispute within sixty (60) days, you and Nave agree that any
              dispute, claim, or controversy arising out of or relating to these Terms or the
              Service will be brought exclusively in the state or federal courts located in
              {' '}{COMPANY.county}, {COMPANY.state}, and you and Nave consent to the personal
              jurisdiction of those courts.{' '}
              <strong>
                You and Nave each waive any right to a jury trial and agree that any dispute will
                be resolved on an individual basis only and not as part of any class, collective,
                or representative action.
              </strong>
            </P>

            <SectionHeading>18. Apple-specific terms (iOS)</SectionHeading>
            <P>
              The following applies if you obtained the Nave mobile app from the Apple App Store.
              These Terms are between you and Nave, not Apple. Apple is not responsible for the
              app or its content. Apple has no obligation to provide maintenance or support for
              the app. In the event of any failure of the app to conform to any applicable
              warranty, you may notify Apple, and Apple will refund the purchase price (if any);
              to the maximum extent permitted by applicable law, Apple has no other warranty
              obligation. Apple is not responsible for addressing any claims by you or any third
              party relating to the app, including product-liability, regulatory, or
              intellectual-property claims. Apple and its subsidiaries are third-party
              beneficiaries of these Terms and, upon your acceptance, will have the right to
              enforce them against you.
            </P>

            <SectionHeading>19. Changes to these Terms</SectionHeading>
            <P>
              We may update these Terms from time to time. If we make a material change, we will
              update the effective date above and provide notice through the Service or by other
              reasonable means before the change takes effect. Your continued use of the Service
              after the change becomes effective constitutes your acceptance of the updated Terms.
              If you do not agree to the change, you should stop using the Service and delete your
              account.
            </P>

            <SectionHeading>20. Notices and contact</SectionHeading>
            <P>
              We may give notice to you by email to the address associated with your account, by
              posting in the Service, or by any other reasonable means. You may give notice to us
              at{' '}
              <a href={`mailto:${COMPANY.support}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.support}
              </a>{' '}
              or by mail to {COMPANY.name}, {COMPANY.address}. For privacy questions, write{' '}
              <a href={`mailto:${COMPANY.privacy}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.privacy}
              </a>
              . For copyright notices, see our{' '}
              <Link to="/dmca" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                DMCA Policy
              </Link>
              .
            </P>

            <SectionHeading>21. Miscellaneous</SectionHeading>
            <P>
              These Terms, together with our Privacy Policy and any other terms we link from
              within the Service, are the entire agreement between you and Nave regarding the
              Service and supersede any prior agreements on the same subject. If any provision is
              held invalid or unenforceable, the remaining provisions will remain in full force
              and effect, and the invalid or unenforceable provision will be modified to the
              minimum extent necessary to make it valid and enforceable. Our failure to enforce a
              provision is not a waiver of our right to enforce it later. You may not assign these
              Terms without our prior written consent; we may assign them in connection with a
              merger, acquisition, reorganization, or sale of assets, or by operation of law.
              Headings are for convenience only and do not affect interpretation.
            </P>

            <p className="text-nave-secondary text-sm leading-relaxed mt-10 pt-6 border-t border-nave-border">
              This page is provided for general informational purposes and does not constitute
              legal advice. Last updated {EFFECTIVE_DATE}.
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
                href={`mailto:${COMPANY.support}`}
                className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors"
              >
                {COMPANY.support}
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
