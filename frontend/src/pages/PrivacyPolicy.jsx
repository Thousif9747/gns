import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const sections = [
  {
    title: '1. Introduction',
    content: 'Grow Nest Paper Products ("Grow Nest", "we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit our website, use our mobile application, or interact with our services. By using our platform, you consent to the practices described in this policy.',
  },
  {
    title: '2. Information We Collect',
    content: 'We collect the following categories of personal information when you use our platform:',
    list: [
      'Identity Information: Full name, email address, phone number, date of birth, gender, and profile avatar image.',
      'Account Credentials: Hashed password and authentication tokens for secure access.',
      'Contact Information: Billing and shipping addresses including street address, city, state, postal code, and country.',
      'Order Information: Purchase history, cart items, wishlist items, and product reviews submitted.',
      'Payment Information: Payment method preferences (UPI, QR, Bank Transfer, COD). Please note that payment proof screenshots or PDFs you upload may contain transaction details. We do not store full financial instrument numbers.',
      'Device Information: Firebase Cloud Messaging (FCM) tokens and device type for push notifications.',
      'Communication Data: OTP codes (stored temporarily with 10-minute expiry), email correspondence, and SMS delivery logs.',
      'Technical Data: IP address, browser type and version, operating system, referral source, page views, and navigation patterns.',
    ],
  },
  {
    title: '3. How We Collect Information',
    content: 'We collect information when you:',
    list: [
      'Register for an account or update your profile.',
      'Browse products, add items to cart, or place orders.',
      'Upload payment proofs or other documents.',
      'Submit product reviews or contact us via forms.',
      'Interact with our push notifications or emails.',
      'Use our mobile application or mobile website.',
    ],
  },
  {
    title: '4. How We Use Your Information',
    content: 'We use your personal information for the following purposes:',
    list: [
      'To create and manage your account.',
      'To process and fulfill your orders, including payment verification and shipping.',
      'To communicate with you about order status, payment confirmations, and account updates.',
      'To provide customer support and respond to inquiries.',
      'To send transactional emails and SMS messages (order confirmations, shipping updates, payment receipts).',
      'To deliver push notifications for order updates via Firebase Cloud Messaging.',
      'To improve our products, services, and website experience.',
      'To prevent fraud, enforce our Terms of Service, and comply with legal obligations.',
    ],
  },
  {
    title: '5. Legal Basis for Processing (GDPR & DPDP Act)',
    content: 'We process your personal information based on the following legal grounds: (a) Performance of a contract — to fulfill orders and provide services requested by you; (b) Consent — where you have explicitly agreed, such as for receiving notifications; (c) Legitimate interests — to improve our services, prevent fraud, and ensure platform security; (d) Legal obligation — to comply with applicable Indian laws and regulations, including the Digital Personal Data Protection Act, 2023.',
  },
  {
    title: '6. Third-Party Service Providers',
    content: 'We engage trusted third-party service providers to operate our platform. These providers process your data solely on our instructions and are contractually bound to protect your information:',
    list: [
      'Firebase (Google) — Push notifications and cloud messaging.',
      'Fast2SMS — SMS delivery for OTPs and transactional messages.',
      'Brevo (Sendinblue) — Transactional email delivery.',
      'PostgreSQL — Database storage (hosted on our infrastructure).',
      'Redis — Caching and session management.',
      'DigitalOcean / Cloud Hosting Provider — Server infrastructure.',
    ],
  },
  {
    title: '7. Data Retention',
    content: 'We retain your personal information only as long as necessary to fulfill the purposes described in this policy or as required by law:',
    list: [
      'Account data: Retained for the duration of your account activity plus 3 years after account closure for legal and tax purposes.',
      'Order data: Retained for 7 years as required by Indian tax laws.',
      'OTP codes: Deleted automatically after 10 minutes or upon use.',
      'Payment proofs: Retained for 7 years for accounting and tax compliance.',
      'Push notification tokens: Retained until you unregister or delete your account.',
      'Communication logs: Retained for 2 years.',
    ],
  },
  {
    title: '8. Data Security',
    content: 'We implement appropriate technical and organizational measures to protect your personal information, including: (a) Encryption of passwords using industry-standard hashing algorithms; (b) JWT-based authentication with rotating refresh tokens; (c) HTTPS encryption for all data in transit; (d) Rate limiting on authentication endpoints to prevent brute-force attacks; (e) Role-based access control ensuring only authorized personnel can access user data; (f) Regular security reviews and updates.',
  },
  {
    title: '9. Your Rights',
    content: 'Under applicable data protection laws, including the Digital Personal Data Protection Act, 2023 (India), GDPR (if applicable), and CCPA (if applicable), you have the following rights:',
    list: [
      'Right to Access: Request a copy of the personal data we hold about you.',
      'Right to Correction: Request correction of inaccurate or incomplete data.',
      'Right to Deletion: Request deletion of your account and associated data, subject to legal retention requirements.',
      'Right to Restrict Processing: Request restriction of processing under certain circumstances.',
      'Right to Data Portability: Request a machine-readable copy of your data.',
      'Right to Withdraw Consent: Withdraw consent for non-essential processing (e.g., marketing notifications).',
      'Right to Grievance Redressal: Lodge a complaint with our Grievance Officer.',
    ],
  },
  {
    title: '10. Account Deletion',
    content: 'You may request account deletion by contacting our support team. Upon verification of your identity, we will deactivate your account and initiate data deletion within 30 days, subject to legal retention obligations (e.g., order records required for tax purposes). Certain data may be retained in anonymized form for analytics.',
  },
  {
    title: '11. Cookies & Tracking',
    content: 'Our platform uses essential cookies and similar technologies for authentication, session management, and platform functionality. We do not use third-party tracking cookies for advertising purposes. You can control cookie settings through your browser preferences, but disabling essential cookies may affect platform functionality.',
  },
  {
    title: '12. Children\'s Privacy',
    content: 'Our platform is not intended for children under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal data, we will take steps to delete such information. If you are a parent or guardian and believe your child has provided us with personal data, please contact us.',
  },
  {
    title: '13. Data Transfers',
    content: 'Your data is primarily stored on servers located within India. For certain third-party services (e.g., Firebase push notifications), data may be processed in jurisdictions outside India. We ensure that such transfers comply with applicable data protection laws through appropriate safeguards, including standard contractual clauses.',
  },
  {
    title: '14. Changes to This Policy',
    content: 'We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or operational needs. The "Last Updated" date at the top of this page indicates when the policy was last revised. We encourage you to review this policy periodically. Material changes will be communicated via email or prominent notice on our platform.',
  },
  {
    title: '15. Grievance Officer',
    content: 'In compliance with the Digital Personal Data Protection Act, 2023 and Indian IT Rules, 2011, we have appointed a Grievance Officer to address your concerns regarding data privacy: Name: Grievance Officer, Grow Nest Paper Products, GNS Factory Road, Jadigenahalli, Karnataka 562114, India. Email: grievance@grownest.in. We will acknowledge your complaint within 24 hours and resolve it within 30 days.',
  },
  {
    title: '16. Contact Us',
    content: 'If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at: Grow Nest Paper Products, GNS Factory Road, Jadigenahalli, Karnataka 562114, India. Email: support@grownest.in. Phone: Available on our Contact page.',
  },
]

export default function PrivacyPolicy() {
  return (
    <div className="ops-route legal-page min-h-screen bg-gradient-to-br from-[#f8fff8] via-[#faf8f2] to-[#f0f7f0]" data-page="privacy">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/" className="inline-flex items-center gap-2 text-eco-600 hover:text-eco-700 font-medium text-sm mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <h1 className="text-3xl sm:text-4xl font-bold text-eco-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-2">Last updated: July 1, 2026</p>
          <p className="text-gray-500 text-sm mb-10">Grow Nest Paper Products — India&apos;s #1 Eco Paper Brand</p>

          <div className="space-y-8">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <h2 className="text-lg font-semibold text-eco-800 mb-2">{section.title}</h2>
                {section.list ? (
                  <>
                    <p className="text-gray-600 leading-relaxed mb-2">{section.content}</p>
                    <ul className="list-disc pl-6 space-y-1">
                      {section.list.map((item, j) => (
                        <li key={j} className="text-gray-600 leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-gray-600 leading-relaxed">{section.content}</p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
