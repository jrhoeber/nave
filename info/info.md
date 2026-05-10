The owner of the Nave app is a company called Cornerstone Dev LLC (cornerstonedev.co)
- Company address: 418 Broadway Ste N, Albany, NY 12207 US

Additional Nave info / updates
- support email: nave@cornerstonedev.co
- support page: naveapp.co/support
- privacy contact: naveprivacy@cornerstonedev.co
- DMCA agent: navetakedown@cornerstonedev.co
- Vulnerability disclosure: navetsecurity@cornerstonedev.co
- In-app Open Source Notices screen: in setting screen in RN app
- account deletion URL: naveapp.co/delete
- server side block of less than 13 year old users

Updated data retention policies
Data type:        Moderation action records
Linked to user:   Yes
Purpose:          Platform safety, abuse prevention, appeals
Retention:        Account lifetime + 1 year
Legal basis:      Legitimate interest (GDPR Art. 6(1)(f)); 
                  Security/integrity exemption (CCPA §1798.105(d)(2))

Data type:        Reported content snapshots
Linked to user:   Yes (via author)
Purpose:          Moderation review, appeals
Retention:        90 days after case closure
Legal basis:      Legitimate interest (GDPR); legal compliance (DSA)

Data type:        Notification records (in-app inbox)
Linked to user:   Yes
Purpose:          Delivering platform notifications to user
Retention:        90 days

Data type:        Push notification device tokens
Linked to user:   Yes
Purpose:          Delivering push notifications
Retention:        Until logout, account deletion, token invalidation, or 
                  180 days of inactivity
Shared with:      Apple Push Notification service, Firebase Cloud Messaging

Data type:        Notification delivery logs
Linked to user:   N/A not stored
Purpose:          N/A not stored
Retention:        N/A not stored

Data type:        Notification preferences
Linked to user:   Yes
Purpose:          Honoring user opt-in/opt-out choices
Retention:        Account lifetime

Data type:        Application logs (stdout/stderr from Cloud Run services)
Linked to user:   Yes, where the application logs identifiers (user ID, request ID)
Identifiers:      User ID, request ID, IP address (in request context)
Purpose:          Debugging, error investigation, performance monitoring,
                  abuse detection
Storage:          Google Cloud Logging _Default bucket
Retention:        30 days (GCP default for _Default bucket)
Legal basis:      Legitimate interest (GDPR Art. 6(1)(f))

Data type:        HTTP request/access logs
Linked to user:   Yes, indirectly
Identifiers:      IP address, user-agent, requested URL, timestamp,
                  authenticated user ID where available
Purpose:          Security monitoring, abuse detection, debugging,
                  rate-limit enforcement
Storage:          Google Cloud Logging _Default bucket
Retention:        30 days
Legal basis:      Legitimate interest (security and platform integrity)

Data type:        Cloud audit logs (Admin Activity, System Event,
                  Access Transparency)
Linked to user:   Yes, for staff/admin actions; not for end users
Identifiers:      Service account or staff identity performing the action
Purpose:          Security audit trail, compliance, incident investigation
Storage:          Google Cloud Logging _Required bucket
Retention:        400 days (fixed by GCP, not configurable)
Legal basis:      Legal obligation, legitimate interest

Data type:        Error and crash reports
Linked to user:   Yes, where stack traces include user-scoped data
Identifiers:      User ID, session ID, device info, app version
Purpose:          Debugging, stability monitoring
Storage:          Sentry (or whichever error monitoring service is in use)
Retention:        90 days
Shared with:      Sentry (acting as data processor)
Legal basis:      Legitimate interest