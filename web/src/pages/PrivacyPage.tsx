import { Link } from 'react-router-dom';

const COMPANY = {
  name: 'Cornerstone Dev LLC',
  address: '418 Broadway Ste N, Albany, NY 12207, USA',
  support: 'nave@cornerstonedev.co',
  privacy: 'naveprivacy@cornerstonedev.co',
  security: 'navetsecurity@cornerstonedev.co',
  dmcaEmail: 'jordan@cornerstonedev.co',
  state: 'New York',
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

function Bullets({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc list-outside pl-6 mt-4 space-y-2 text-nave-secondary text-base leading-relaxed">
      {children}
    </ul>
  );
}

export function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-nave-secondary text-lg leading-relaxed max-w-xl mx-auto">
              What information Nave collects, how we use it, and the choices you have.
            </p>
            <p className="text-nave-secondary text-sm mt-4">
              Effective {EFFECTIVE_DATE}
            </p>
          </div>

          {/* Publisher card */}
          <div className="bg-white rounded-2xl border border-nave-border shadow-sm p-7 mb-12">
            <p className="text-nave-secondary text-xs font-medium tracking-widest uppercase mb-4">
              Data controller
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
                <dt className="w-32 shrink-0 text-nave-secondary text-sm">Privacy</dt>
                <dd>
                  <a
                    href={`mailto:${COMPANY.privacy}`}
                    className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors break-all"
                  >
                    {COMPANY.privacy}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* Body */}
          <div className="bg-white rounded-2xl border border-nave-border shadow-sm p-7 md:p-10">
            <P>
              This Privacy Policy explains how {COMPANY.name} (&ldquo;<strong>Nave</strong>,&rdquo;
              &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>,&rdquo; or
              &ldquo;<strong>our</strong>&rdquo;), the publisher of the Nave mobile application, the
              naveapp.co website, and related services (collectively, the
              &ldquo;<strong>Service</strong>&rdquo;), collects, uses, and shares information when
              you use the Service. By using the Service, you agree to this Policy and to our{' '}
              <Link to="/terms" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                Terms of Service
              </Link>
              . If you do not agree, do not use the Service.
            </P>
            <P>
              Nave is a Catholic prayer-community app. It is free, contains no ads or in-app
              purchases, and is currently offered only to users in the United States who are at
              least 13 years old.
            </P>

            <SectionHeading>1. Summary</SectionHeading>
            <Bullets>
              <li>
                We collect what you give us when you sign up and use the Service: account details,
                profile information, parish selection, posts, comments, group chat messages,
                images you upload, reactions, friend connections, and the device token used to
                deliver push notifications.
              </li>
              <li>
                We do <strong>not</strong> sell or rent your personal information. We do not use it
                for advertising. We do not run ad networks, analytics pixels, tracking SDKs, or
                cookie banners.
              </li>
              <li>
                We share data only with the service providers we need to run the Service
                (hosting, push delivery, content moderation, sign-in). They process data on our
                behalf under contract.
              </li>
              <li>
                Group chat is <em>not</em> end-to-end encrypted. We can read message content on
                our servers so that we can moderate it.
              </li>
              <li>
                You can delete your account from inside the app (Settings → Delete Account) or
                from{' '}
                <Link to="/delete" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                  naveapp.co/delete
                </Link>
                .
              </li>
            </Bullets>

            <SectionHeading>2. Information we collect</SectionHeading>

            <SubHeading>2.1 Information you provide</SubHeading>
            <Bullets>
              <li>
                <strong>Account &amp; sign-in.</strong> When you sign in with Google, Apple, or
                email and password through Firebase Authentication, we receive your email address,
                a Firebase user ID, and (depending on the provider) your display name and a
                provider-supplied avatar URL. Passwords are stored by Firebase, not by Nave.
              </li>
              <li>
                <strong>Profile.</strong> Your display name, username, date of birth (full
                year-month-day, used for the 13+ age gate and stored on your account), optional
                bio, optional location, optional diocese, and your home parish selection.
              </li>
              <li>
                <strong>Avatar and other images.</strong> If you upload a profile photo, a prayer
                group avatar, a parish cover photo, or a photo in a group chat, the image is
                stored in Google Cloud Storage and is screened by Google Cloud Vision SafeSearch
                before it is accepted.
              </li>
              <li>
                <strong>User-generated content.</strong> Parish posts, comments on parish posts,
                group chat messages, prayer-group metadata (name, description, category,
                schedule), and emoji reactions you add.
              </li>
              <li>
                <strong>Relationships and safety.</strong> Friend requests, friendships, prayer
                group memberships, blocks, and reports you file on other users&rsquo; content.
              </li>
              <li>
                <strong>Notification preferences.</strong> Your master push toggle, per-type
                toggles (group messages, friend requests), and per-group mutes.
              </li>
              <li>
                <strong>Support correspondence.</strong> If you email us, we receive the message
                and your email address.
              </li>
            </Bullets>

            <SubHeading>2.2 Information collected automatically</SubHeading>
            <Bullets>
              <li>
                <strong>Device push token.</strong> If you allow push notifications, your device
                registers a Firebase Cloud Messaging (FCM) token with our server so we can deliver
                pushes.
              </li>
              <li>
                <strong>Server logs.</strong> Our API records application logs and HTTP request
                logs in Google Cloud Logging. These include timestamps, request paths, response
                codes, user-agent, IP address, and (where applicable) the authenticated user ID
                and a request ID. We use them for debugging, security monitoring, abuse detection,
                and rate-limit enforcement.
              </li>
              <li>
                <strong>Crash and error reports.</strong> The mobile app uses Firebase Crashlytics
                to record crash stack traces and basic device/OS metadata; the mobile client only
                attaches an opaque user ID to crash reports (no email, no display name). The
                backend records unhandled errors through Google Cloud Error Reporting (via Cloud
                Logging).
              </li>
              <li>
                <strong>Cloud audit logs.</strong> Google Cloud retains administrative audit logs
                of staff/service-account actions on our cloud project (these record platform
                staff activity, not end-user activity).
              </li>
              <li>
                <strong>Web fonts.</strong> Our public marketing pages load fonts from
                fonts.googleapis.com; when your browser fetches them, your IP address and
                user-agent are transmitted to Google as part of the request.
              </li>
            </Bullets>
            <P>
              <strong>What we do not collect.</strong> Nave does not collect precise or
              approximate location, health or fitness data, contacts, microphone or camera audio,
              SMS or phone number, browsing history outside the app, IDFA / Google Advertising ID,
              or payment information. The mobile app uses your system photo picker only when you
              choose to attach an image.
            </P>

            <SubHeading>2.3 Information from third parties</SubHeading>
            <Bullets>
              <li>
                <strong>Sign-in providers.</strong> When you sign in with Google or Apple, the
                provider sends Firebase Authentication an ID token, which Firebase then passes to
                Nave. We receive the resulting Firebase UID, the email address, and (on first
                sign-in) the display name and a provider avatar URL. Apple may issue a
                relay/private email address; we cannot see your real email in that case.
              </li>
              <li>
                <strong>Have I Been Pwned (email/password sign-up only).</strong> During email and
                password sign-up the mobile app checks your candidate password against the Have I
                Been Pwned breach corpus using a privacy-preserving k-anonymity API. Only the
                first five hexadecimal characters of the SHA-1 hash of the password are
                transmitted; the rest of the password never leaves your device.
              </li>
            </Bullets>

            <SectionHeading>3. How we use information</SectionHeading>
            <P>We use the information described above to:</P>
            <Bullets>
              <li>Operate the Service — create and authenticate your account, render your
                profile, deliver parish feeds and group chats, route notifications, surface
                friends and prayer groups, and otherwise provide the features you use.</li>
              <li>Enforce the 13+ minimum age requirement.</li>
              <li>
                Moderate content. Every parish post, comment, and group chat message is screened
                by an automated text pipeline (OpenAI&rsquo;s moderation API followed by
                Anthropic&rsquo;s Claude Haiku model evaluating Nave&rsquo;s Catholic-specific
                policy). Every uploaded image is screened by Google Cloud Vision SafeSearch.
                Items that fail screening are blocked or held for human review by Nave admins.
              </li>
              <li>
                Respond to user reports and other safety signals, including surfacing crisis
                resources (such as 988, Catholic Charities, your diocese, and your parish) when
                our automated systems detect signals of imminent self-harm.
              </li>
              <li>Send push notifications you have opted into (group messages, friend
                requests, group invites, group approvals).</li>
              <li>Secure the Service — detect and respond to abuse, fraud, and unauthorized
                access; investigate incidents; back up and restore data.</li>
              <li>Debug, monitor performance, and improve the Service.</li>
              <li>Comply with legal obligations and enforce our{' '}
                <Link to="/terms" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                  Terms of Service
                </Link>
                {' '}and policies.</li>
            </Bullets>
            <P>
              We do not use your information for behavioral advertising or to build advertising
              profiles. We do not sell or rent it. We do not use the content you submit to train
              machine-learning models, and we do not authorize the moderation providers above to
              use it for their own model training (text sent to OpenAI and Anthropic is sent
              under their API terms, which exclude API content from training by default).
            </P>

            <SectionHeading>4. Legal bases (for users in covered jurisdictions)</SectionHeading>
            <P>
              Where applicable law (for example, the EEA/UK GDPR or analogous frameworks)
              requires a legal basis for processing personal information, we rely on the
              following:
            </P>
            <Bullets>
              <li><strong>Performance of a contract</strong> — to provide the Service you have
                signed up for (account, profile, feeds, chat, friends, notifications).</li>
              <li><strong>Legitimate interests</strong> — to keep the Service safe and reliable,
                operate moderation and abuse detection, maintain server and audit logs, and
                preserve records needed for appeals and disputes. We balance these interests
                against your rights and freedoms.</li>
              <li><strong>Consent</strong> — for push notifications and access to your photo
                library on your device. You can withdraw consent in your device settings or in
                Nave&rsquo;s in-app notification preferences.</li>
              <li><strong>Legal obligation</strong> — to comply with applicable law and respond
                to lawful requests.</li>
            </Bullets>
            <P>
              The Service is offered only to users in the United States. We do not target the
              EEA or the UK and we do not knowingly serve users in those regions.
            </P>

            <SectionHeading>5. How we share information</SectionHeading>

            <SubHeading>5.1 With other users</SubHeading>
            <P>
              Anything you post should be treated as not private. Your profile (display name,
              username, avatar, bio, parish) is visible to any signed-in Nave user. Parish posts
              and comments are visible to any signed-in user. Group chat messages and images are
              visible to the members of that prayer group. Your friend list, block list, email
              address, birthday, and reports you file are not shown to other users.
            </P>

            <SubHeading>5.2 With service providers (processors)</SubHeading>
            <P>
              We share information with the third parties below strictly to operate the Service.
              They process information on our behalf under contract. We do not authorize them to
              use it for their own purposes (including advertising or model training).
            </P>
            <Bullets>
              <li>
                <strong>Google &amp; Firebase</strong> (Google Cloud Run, Google Cloud Storage,
                Google Cloud Logging, Google Cloud Vision SafeSearch, Google Secret Manager,
                Firebase Authentication, Firebase Cloud Messaging, Firebase Crashlytics) — API
                hosting, image storage, image moderation, logs, secret management, sign-in, push
                delivery, and mobile crash reporting. Privacy notice:{' '}
                <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">firebase.google.com/support/privacy</a>.
              </li>
              <li>
                <strong>Neon, Inc.</strong> — managed PostgreSQL hosting for the Nave database
                (AWS us-east-1). Privacy notice:{' '}
                <a href="https://neon.tech/privacy" target="_blank" rel="noopener noreferrer" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">neon.tech/privacy</a>.
              </li>
              <li>
                <strong>OpenAI, L.L.C.</strong> — text moderation (Layer 1). We send only the
                text of the post, comment, or message being moderated; we do not send your name,
                email, or user ID. Privacy notice:{' '}
                <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">openai.com/policies/privacy-policy</a>.
              </li>
              <li>
                <strong>Anthropic, PBC</strong> — text moderation (Layer 2). We send only the
                text of the post, comment, or message being moderated; we do not send your name,
                email, or user ID. Privacy notice:{' '}
                <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">anthropic.com/legal/privacy</a>.
              </li>
              <li>
                <strong>Apple Inc.</strong> — &ldquo;Sign in with Apple,&rdquo; Apple Push
                Notification service (APNS), and iOS distribution. Privacy notice:{' '}
                <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">apple.com/legal/privacy</a>.
              </li>
              <li>
                <strong>Have I Been Pwned</strong> — privacy-preserving breached-password check
                during email and password sign-up only (k-anonymity, password never transmitted).
                Privacy notice:{' '}
                <a href="https://haveibeenpwned.com/Privacy" target="_blank" rel="noopener noreferrer" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">haveibeenpwned.com/Privacy</a>.
              </li>
            </Bullets>

            <SubHeading>5.3 For legal reasons</SubHeading>
            <P>
              We may disclose information when we believe in good faith that disclosure is
              necessary to (a) comply with applicable law, a court order, or other lawful
              process; (b) enforce our Terms of Service or other policies, including
              investigating possible violations; (c) detect, prevent, or otherwise address
              fraud, security, or technical issues; or (d) protect the rights, property, or
              safety of Nave, our users, or the public.
            </P>

            <SubHeading>5.4 In a corporate transaction</SubHeading>
            <P>
              If we are involved in a merger, acquisition, financing, reorganization, asset sale,
              bankruptcy, or similar transaction, your information may be transferred as part of
              that transaction, subject to a privacy policy at least as protective as this one.
            </P>

            <SubHeading>5.5 No sale, no targeted advertising</SubHeading>
            <P>
              We do not sell personal information for money or other consideration, and we do
              not share personal information for cross-context behavioral advertising, in each
              case as those terms are defined by U.S. state privacy laws including the
              California Consumer Privacy Act (CCPA/CPRA). We do not run ads in the Service and
              we do not embed third-party advertising trackers.
            </P>

            <SectionHeading>6. Group chat is not end-to-end encrypted</SectionHeading>
            <P>
              Group chat messages and images are stored on our servers in a form we can read so
              that we can apply moderation, respond to lawful requests, and operate the Service.
              Group chat is <strong>not</strong> end-to-end encrypted. Treat anything you post in
              chat as something that could be seen by other group members and by Nave. Messages
              are encrypted in transit (TLS) and at rest by our cloud providers&rsquo;
              vendor-managed encryption.
            </P>

            <SectionHeading>7. Moderation and crisis resources</SectionHeading>
            <P>
              Every parish post, every comment, and every group message is screened by an
              automated text-moderation pipeline before it is published; every uploaded image is
              screened by Google Cloud Vision SafeSearch. Some items are held for human review
              by Nave admins. We may also remove, hide, or refuse to publish content that
              violates our community standards. We retain a record of flagged content for safety
              and appeals purposes — see Section 9.
            </P>
            <P>
              If our automated systems detect signals that you may be in crisis (for example,
              indicators of imminent self-harm), the Service may surface crisis resources,
              including the 988 Suicide &amp; Crisis Lifeline, Catholic Charities, your diocese,
              and your parish. <strong>The Service is not a crisis hotline and is not a
              substitute for emergency services. If you or someone else is in immediate danger,
              call 911 (or your local emergency number) or 988.</strong>
            </P>

            <SectionHeading>8. Push notifications</SectionHeading>
            <P>
              If you allow push notifications, your device registers an FCM token with our
              server so we can deliver pushes for group messages, friend requests, group
              invites, and group approvals. You can disable notifications at any time in your
              device settings, and you can fine-tune what you receive in Nave under Settings →
              Notifications, including muting individual prayer groups. Carrier message and data
              rates may apply.
            </P>

            <SectionHeading>9. How long we keep information</SectionHeading>
            <P>
              We retain information for as long as your account is active and as needed to
              provide the Service. We then delete or de-identify it according to the schedule
              below. Specific retention periods:
            </P>
            <Bullets>
              <li>
                <strong>Account and profile data, posts, comments, messages, friendships,
                blocks, group memberships, reactions, notification preferences.</strong> Retained
                for the lifetime of your account. Removed when you delete your account (see
                Section 11), with the carve-outs noted below.
              </li>
              <li>
                <strong>Notifications inbox.</strong> Retained for 90 days from the time the
                notification is created, then purged automatically.
              </li>
              <li>
                <strong>Push device tokens.</strong> Retained until you log out, the token is
                invalidated by the OS, or 180 days of inactivity, whichever comes first. Tokens
                are purged automatically thereafter.
              </li>
              <li>
                <strong>Reported-content records.</strong> When a user report is closed
                (reviewed or dismissed), we retain the report record and a snapshot of the
                reported content for 90 days from closure for appeals and safety review, then
                purge it automatically.
              </li>
              <li>
                <strong>Moderation audit records.</strong> When content is blocked or queued by
                our moderation pipeline, we retain an audit record (including a snapshot of the
                flagged text or image and the model output) for the lifetime of the author&rsquo;s
                account plus one year, for safety and appeals. After account deletion, the user
                identifier is cleared from the audit row and the row is purged on the
                +1-year schedule.
              </li>
              <li>
                <strong>Application logs and HTTP request logs.</strong> 30 days in our default
                Google Cloud Logging bucket.
              </li>
              <li>
                <strong>Cloud audit logs (staff/admin actions).</strong> 400 days in
                Google&rsquo;s fixed audit bucket.
              </li>
              <li>
                <strong>Crash and error reports.</strong> Approximately 90 days.
              </li>
              <li>
                <strong>Backups.</strong> Our cloud providers may retain operational backups for
                a limited period after deletion, which expire on their normal schedules.
              </li>
            </Bullets>

            <SectionHeading>10. Security</SectionHeading>
            <P>
              We use industry-standard safeguards to protect information in transit and at rest,
              including TLS for all client-to-server and server-to-provider traffic, encrypted
              storage at our database and object-storage providers, short-lived signed URLs for
              private image fetches, access controls on administrative tooling, secret
              management through Google Secret Manager, and structured logging for security
              monitoring. No system is perfectly secure; we cannot guarantee the absolute
              security of any information you provide. You are responsible for keeping your
              account credentials safe and for notifying us at{' '}
              <a href={`mailto:${COMPANY.security}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.security}
              </a>{' '}
              if you suspect unauthorized access. We accept good-faith security vulnerability
              reports at the same address.
            </P>

            <SectionHeading>11. Your choices and rights</SectionHeading>

            <SubHeading>11.1 Inside the app</SubHeading>
            <Bullets>
              <li><strong>Edit your profile</strong> — display name, username, bio, parish,
                birthday, and avatar from Settings → Edit Profile.</li>
              <li><strong>Control notifications</strong> — master toggle, per-type toggles, and
                per-group mutes from Settings → Notifications.</li>
              <li><strong>Block or unblock users</strong> — from another user&rsquo;s profile or
                from Settings → Blocked Users.</li>
              <li><strong>Delete your content</strong> — your own group messages and comments
                can be deleted from the kebab menu. Group admins can delete content within their
                group.</li>
              <li>
                <strong>Delete your account</strong> — Settings → Delete Account in the mobile
                app, or sign in at{' '}
                <Link to="/delete" className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                  naveapp.co/delete
                </Link>
                . Deleting your account removes your profile and your content from the Service,
                subject to the retention carve-outs in Section 9 (moderation and report records).
                Group chats you sent to are not retroactively wiped from other members&rsquo;
                already-delivered copies of the conversation; the server-side records are
                deleted on the schedule above.
              </li>
            </Bullets>

            <SubHeading>11.2 U.S. state privacy rights</SubHeading>
            <P>
              Depending on where you live, you may have rights under your state&rsquo;s privacy
              law (such as California&rsquo;s CCPA/CPRA, Colorado, Connecticut, Virginia, Utah,
              Texas, Oregon, and others). Subject to verification and applicable exceptions,
              these rights may include:
            </P>
            <Bullets>
              <li>The right to know what personal information we have collected, how we use
                it, and with whom we share it.</li>
              <li>The right to access a copy of your personal information.</li>
              <li>The right to correct inaccurate personal information.</li>
              <li>The right to delete personal information we hold about you.</li>
              <li>The right to opt out of the sale of personal information and the sharing of
                personal information for cross-context behavioral advertising — <strong>Nave
                does not engage in either</strong>, so there is nothing to opt out of.</li>
              <li>The right to limit use of sensitive personal information — we use the
                limited sensitive information we collect (date of birth, sign-in credentials)
                only for the purposes described in this Policy and only as permitted without an
                opt-out under applicable law.</li>
              <li>The right to non-discrimination for exercising any of these rights.</li>
            </Bullets>
            <P>
              To exercise these rights, email{' '}
              <a href={`mailto:${COMPANY.privacy}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.privacy}
              </a>{' '}
              from the address associated with your account, or use the in-app controls in
              Section 11.1. We will verify your request using information already associated
              with your account. You may designate an authorized agent to submit a request on
              your behalf; we will require written authorization and may verify the request
              directly with you. If we decline a request, we will explain why, and you may
              appeal by replying to our response.
            </P>
            <P>
              <strong>Shine the Light (California Civil Code § 1798.83).</strong> California
              residents may request information about disclosures of personal information to
              third parties for those third parties&rsquo; direct marketing purposes. Nave does
              not make such disclosures.
            </P>

            <SubHeading>11.3 &ldquo;Do Not Track&rdquo; and Global Privacy Control</SubHeading>
            <P>
              The Service does not respond to browser &ldquo;Do Not Track&rdquo; signals because
              there is no industry-standard meaning for them. Because we do not sell personal
              information or share it for cross-context behavioral advertising, Global Privacy
              Control (GPC) signals have no opt-out target to apply on Nave.
            </P>

            <SectionHeading>12. Children</SectionHeading>
            <P>
              The Service is for users 13 and older. We do not knowingly collect personal
              information from children under 13. Our sign-up flow enforces the 13+ minimum age
              both client-side and server-side; an account whose stated date of birth indicates
              an age under 13 is rejected. If you believe a child under 13 has provided personal
              information to Nave, please contact{' '}
              <a href={`mailto:${COMPANY.privacy}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.privacy}
              </a>{' '}
              and we will promptly delete the account and any associated information.
            </P>

            <SectionHeading>13. International users</SectionHeading>
            <P>
              The Service is offered to users in the United States. Our servers, our database,
              and most of our service providers are located in the United States. If you access
              the Service from outside the United States, you understand that your information
              will be processed in the United States, where data-protection laws may differ from
              those in your jurisdiction.
            </P>

            <SectionHeading>14. Cookies and similar technologies</SectionHeading>
            <P>
              The Nave mobile app does not use cookies. Our website (naveapp.co) uses only
              storage required for the sign-in experience: Firebase Authentication stores a
              limited amount of data in your browser&rsquo;s local storage and indexedDB to keep
              you signed in, and our sign-in flow stores the resulting Nave session token in
              local storage. We do not use third-party advertising cookies, marketing pixels,
              analytics SDKs (such as Google Analytics, Segment, Mixpanel, Hotjar, or Meta
              Pixel), or cross-site trackers. Because the site does not place advertising or
              analytics cookies, we do not display a cookie consent banner.
            </P>

            <SectionHeading>15. Third-party links and content</SectionHeading>
            <P>
              The Service may link to third-party websites, services, or resources (for example,
              crisis support hotlines or a parish&rsquo;s website). We do not control those
              third parties, and this Policy does not apply to them. Their handling of your
              information is governed by their own privacy notices.
            </P>

            <SectionHeading>16. Changes to this Policy</SectionHeading>
            <P>
              We may update this Privacy Policy from time to time. If we make a material change,
              we will update the effective date above and provide notice through the Service or
              by other reasonable means before the change takes effect. Your continued use of
              the Service after the change becomes effective constitutes your acceptance of the
              updated Policy. If you do not agree to the change, you should stop using the
              Service and delete your account.
            </P>

            <SectionHeading>17. Contact us</SectionHeading>
            <P>
              For privacy questions or to exercise your rights, email{' '}
              <a href={`mailto:${COMPANY.privacy}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.privacy}
              </a>
              . For general support, email{' '}
              <a href={`mailto:${COMPANY.support}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.support}
              </a>
              . For security reports, email{' '}
              <a href={`mailto:${COMPANY.security}`} className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors">
                {COMPANY.security}
              </a>
              . By mail: {COMPANY.name}, {COMPANY.address}.
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
                href={`mailto:${COMPANY.privacy}`}
                className="text-nave-accent hover:text-nave-accent-dark font-medium transition-colors"
              >
                {COMPANY.privacy}
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
