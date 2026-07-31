import { motion } from 'framer-motion'
import Card from '../../components/ui/Card'

export default function Contact() {
  return (
    <div className="ops-route customer-content-page bg-[#f4faf4]" data-page="contact">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(58,125,68,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(35,80,41,0.16),transparent_28%),linear-gradient(135deg,#f8fff8_0%,#eaf6ea_52%,#dbebdc_100%)] text-eco-900">
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(26,61,31,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(26,61,31,0.10)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute -top-24 right-[-4rem] h-72 w-72 rounded-full bg-primary-300/25 blur-3xl" />
        <div className="absolute -bottom-24 left-[-5rem] h-80 w-80 rounded-full bg-eco-300/25 blur-3xl" />

        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 pb-20 lg:pt-20 lg:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary-700 mb-6">
              Get in touch
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.95] text-eco-900 mb-6">
              Contact Us
            </h1>
            <p className="max-w-2xl text-base md:text-lg leading-relaxed text-eco-800">
              Have a question about bulk orders, partnerships, or our products? Reach out to us and our team will get back to you promptly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CONTACT DETAILS */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-16 lg:pb-20 -mt-6">
        <a
          href="https://maps.app.goo.gl/e4b4gh6bhSn7q4PZ6?g_st=aw"
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-[2rem] overflow-hidden border border-white/70 bg-white shadow-[0_18px_60px_rgba(26,61,31,0.08)] hover:shadow-[0_22px_70px_rgba(26,61,31,0.12)] transition-all"
        >
          <div className="grid md:grid-cols-2">
            <div className="relative min-h-[280px] overflow-hidden">
              <iframe
                title="Store Location"
                src="https://maps.google.com/maps?q=GNS+paper+products,+GNS+factory+Road,+Jadigenahalli,+Karnataka+562114&output=embed"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ border: 0 }}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
            </div>

            <div className="p-8 flex flex-col justify-center bg-gradient-to-br from-white to-[#edf8ed]">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>

              <h3 className="font-display text-2xl text-eco-800 mb-1">Grow Nest</h3>
              <p className="text-gray-600 text-lg leading-relaxed mb-5">
                GNS Factory Road<br />
                Jadigenahalli, Karnataka<br />
                562114
              </p>

              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Mon - Sat: 10:00 AM - 8:00 PM</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>+91 9738085880</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>gnspaperproducts50@gmail.com</span>
                </div>
              </div>
            </div>
          </div>
        </a>

        {/* CONTACT CARDS */}
        <div className="grid gap-4 md:grid-cols-3 mt-8">
          {[
            {
              title: 'Phone',
              value: '+91 9738085880',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              ),
            },
            {
              title: 'Email',
              value: 'gnspaperproducts50@gmail.com',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              ),
            },
            {
              title: 'Hours',
              value: 'Mon - Sat: 10:00 AM - 8:00 PM',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="h-full p-6 !bg-white/90 border-white/70 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-medium text-eco-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-eco-700">{item.value}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
