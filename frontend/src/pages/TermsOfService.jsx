import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: 'By accessing or using the Grow Nest Paper Products website, mobile application, or any services offered by Grow Nest ("Company", "we", "us", "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our platform or services.',
  },
  {
    title: '2. Business Description',
    content: 'Grow Nest Paper Products is a manufacturer and wholesale supplier of biodegradable paper plates, paper glasses, bulk combo packs, and related eco-friendly disposable products. We operate as a B2B and B2C e-commerce platform serving businesses, retailers, event planners, and individual customers across India.',
  },
  {
    title: '3. Account Registration',
    content: 'To place orders, you must create an account providing accurate and complete information including your full name, email address, and phone number. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.',
  },
  {
    title: '4. Eligibility',
    content: 'By registering, you represent that you are at least 18 years of age or have the consent of a parent or guardian. We reserve the right to refuse service, terminate accounts, or cancel orders at our discretion, including if we suspect a violation of these Terms or applicable law.',
  },
  {
    title: '5. Product Information & Pricing',
    content: 'We endeavor to display accurate product descriptions, images, and pricing. All prices are in Indian Rupees (INR) and include GST (CGST 9% + SGST 9%) unless stated otherwise. We reserve the right to modify prices at any time without prior notice. In the event of a pricing error, we reserve the right to cancel or adjust the order with notification to you.',
  },
  {
    title: '6. Orders & Acceptance',
    content: 'Placing an item in your cart or submitting an order does not constitute acceptance of the order. We reserve the right to accept or decline any order for any reason, including product availability, pricing errors, or payment verification issues. An order is confirmed only when we send an order confirmation with a unique order number.',
  },
  {
    title: '7. Payment Terms',
    content: 'We accept the following payment methods: (a) Online payment via UPI, QR code scan, or bank transfer, where you must upload a payment proof (screenshot or PDF) for manual verification by our team; and (b) Cash on Delivery (COD) for eligible orders. Payment must be received in full before order processing begins for online payments. COD orders may require a partial advance payment at our discretion. Your payment proof serves as a record of transaction and will be stored securely.',
  },
  {
    title: '8. Payment Proof & Verification',
    content: 'For online payments, you are required to upload a clear screenshot or PDF of the payment confirmation. Our admin team will verify the payment against the expected amount. If the payment cannot be verified within a reasonable time, we may contact you for clarification. We reserve the right to reject a payment proof if it is illegible, incomplete, or appears fraudulent.',
  },
  {
    title: '9. Shipping & Delivery',
    content: 'We offer free shipping on all orders across India. Orders are dispatched from our manufacturing facility in Karnataka. Estimated delivery timelines depend on the destination and order volume. While we strive to meet all delivery commitments, delays may occur due to factors beyond our control. Title and risk of loss pass to you upon delivery to the carrier.',
  },
  {
    title: '10. Returns & Refunds',
    content: 'If you receive damaged or defective products, you may request a return within 7 days of delivery. Refund requests are reviewed by our team and may be approved, rejected, or subject to partial refund depending on the condition of returned goods. Approved refunds will be processed via the original payment method within 7-10 business days. Custom or bulk orders may be subject to different return terms as agreed in writing at the time of order.',
  },
  {
    title: '11. Order Cancellation',
    content: 'Orders may be cancelled before they enter processing status. Once an order is in processing or shipped status, cancellation is not guaranteed and may be subject to a cancellation fee. For COD orders, repeated non-acceptance of deliveries may result in account restrictions.',
  },
  {
    title: '12. Account Suspension & Termination',
    content: 'We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, provide false information, or abuse our services (including but not limited to repeated non-payment, chargebacks, or harassment of staff). Upon termination, your right to access the platform ceases immediately.',
  },
  {
    title: '13. Intellectual Property',
    content: 'All content on the Grow Nest platform — including text, graphics, logos, product images, videos, and software — is the property of Grow Nest Paper Products or its licensors and is protected by Indian copyright and trademark laws. You may not reproduce, distribute, modify, or create derivative works without our prior written consent.',
  },
  {
    title: '14. User Reviews & Content',
    content: 'You may submit product reviews, ratings, and feedback. By submitting content, you grant us a non-exclusive, royalty-free, perpetual license to use, reproduce, and display such content on our platform. You represent that your reviews are truthful and not misleading. We reserve the right to remove reviews at our discretion.',
  },
  {
    title: '15. Prohibited Uses',
    content: 'You agree not to: (a) use the platform for any unlawful purpose; (b) attempt to gain unauthorized access to our systems; (c) interfere with the proper functioning of the website; (d) scrape, crawl, or collect data without our permission; (e) impersonate any person or entity; (f) use the platform to distribute malware or harmful code.',
  },
  {
    title: '16. Limitation of Liability',
    content: 'To the maximum extent permitted by law, Grow Nest Paper Products shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform or purchase of products. Our total liability for any claim shall not exceed the amount paid by you for the product giving rise to the claim.',
  },
  {
    title: '17. Disclaimer of Warranties',
    content: 'Our products and services are provided "as is" without any express or implied warranties, including but not limited to implied warranties of merchantability or fitness for a particular purpose, except as expressly stated in writing. Product images are for illustration purposes and actual products may vary slightly.',
  },
  {
    title: '18. Indemnification',
    content: 'You agree to indemnify and hold harmless Grow Nest Paper Products, its directors, employees, and affiliates from any claims, losses, damages, liabilities, and expenses arising out of your use of the platform, violation of these Terms, or infringement of any third-party rights.',
  },
  {
    title: '19. Privacy',
    content: 'Your use of our platform is also governed by our Privacy Policy. By using our services, you consent to the collection, storage, and processing of your personal information as described in the Privacy Policy.',
  },
  {
    title: '20. Communications',
    content: 'By creating an account, you consent to receive transactional communications from us via email, SMS, and push notifications regarding your orders, account, and payment status. These are essential communications and cannot be opted out of while your account is active.',
  },
  {
    title: '21. Governing Law & Dispute Resolution',
    content: 'These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or relating to these Terms or your use of the platform shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.',
  },
  {
    title: '22. Changes to Terms',
    content: 'We reserve the right to update or modify these Terms at any time. Changes will be effective immediately upon posting on this page. Your continued use of the platform after any changes constitutes acceptance of the new Terms. We encourage you to review these Terms periodically.',
  },
  {
    title: '23. Contact Information',
    content: 'For questions regarding these Terms, please contact us at: Grow Nest Paper Products, GNS Factory Road, Jadigenahalli, Karnataka 562114, India. Email: support@grownest.in',
  },
]

export default function TermsOfService() {
  return (
    <div className="ops-route legal-page min-h-screen bg-gradient-to-br from-[#f8fff8] via-[#faf8f2] to-[#f0f7f0]" data-page="terms">
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

          <h1 className="text-3xl sm:text-4xl font-bold text-eco-900 mb-2">Terms of Service</h1>
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
                <p className="text-gray-600 leading-relaxed">{section.content}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
