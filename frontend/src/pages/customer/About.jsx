import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const highlights = [
  {
    title: 'Manufacturing Strength',
    description: 'Dedicated production lines for plates and glasses with bulk-first planning and predictable output cycles.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
  {
    title: 'Quality & Compliance',
    description: 'Food-safe materials, clean finishing, and consistent lot checks to protect downstream brands.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Sustainable Materials',
    description: 'Compostable inputs with reduced plastic usage and packaging designed for eco buyers.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    title: 'Pan-India Dispatch',
    description: 'Optimized dispatch windows and regional partner networks for faster wholesale fulfillment.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
]

const capabilities = [
  {
    title: 'B2B Supply',
    description: 'Wholesale-ready cartons, distributor bundles, and retail packs.',
  },
  {
    title: 'Private Label',
    description: 'Branding support, packaging customization, and bulk assortments.',
  },
  {
    title: 'Event & Catering',
    description: 'Large-format packs for venues, hotels, and event planners.',
  },
  {
    title: 'Retail Support',
    description: 'Shelf-ready SKUs with margin-friendly pricing tiers.',
  },
]

const coreLines = [
  {
    name: 'Paper Plates',
    description: 'Wholesale-ready packs with sustainable materials.',
    gradient: 'from-[#e6f3e6] via-[#d4e8d4] to-[#b8d4b8]',
    emoji: '🍽',
  },
  {
    name: 'Paper Glasses',
    description: 'Wholesale-ready packs with sustainable materials.',
    gradient: 'from-[#dce8f5] via-[#c8d9ed] to-[#a8c4e0]',
    emoji: '🥤',
  },
  {
    name: 'Bulk Combos',
    description: 'Wholesale-ready packs with sustainable materials.',
    gradient: 'from-[#f5edd6] via-[#ede0c0] to-[#e0d0a8]',
    emoji: '📦',
  },
]

const processSteps = [
  { number: '01', title: 'Sourcing & Inspection', description: 'Verified raw material intake with batch tracking and moisture control.' },
  { number: '02', title: 'Production & Forming', description: 'Precision forming, heat sealing, and automated stack finishing.' },
  { number: '03', title: 'Quality Checks', description: 'Weight, thickness, and leak testing before final packing.' },
  { number: '04', title: 'Bulk Dispatch', description: 'Cartonized pallets and route planning for faster delivery.' },
]

const whyChooseUs = [
  'Transparent pricing and predictable lead times for repeat wholesale orders.',
  'Dedicated support for new distributor onboarding and product guidance.',
  'Flexible pack sizes across plates, glasses, and combo bundles.',
  'Consistent quality checks to protect your retail reputation.',
]

export default function About() {
  return (
    <div className="ops-route customer-content-page bg-[#f4faf4]" data-page="about">
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
              Eco Manufacturing Platform
            </div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.95] text-eco-900 mb-6">
              Grow Nest Paper Products
            </h1>
            <p className="max-w-2xl text-base md:text-lg leading-relaxed text-eco-800 mb-4">
              We build paper plates and paper glasses for wholesale buyers, retailers, and event planners across India. Our focus is sustainable materials, consistent quality, and fast bulk dispatch.
            </p>
            <p className="max-w-2xl text-sm md:text-base leading-relaxed text-eco-700 mb-8">
              From everyday retail packs to distributor mega bundles, we help partners scale with compostable solutions.
            </p>
            <Link to="/products">
              <Button size="lg" className="!bg-eco-900 !text-white hover:!bg-eco-800 px-8 shadow-lg">
                Explore the collection
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-18">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-primary-600 mb-2">About highlight 1</p>
          <h2 className="font-display text-4xl md:text-5xl text-eco-800 mb-3">What we bring to the table</h2>
          <div className="w-20 h-1 bg-primary-500 mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {highlights.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="h-full p-6 !bg-white/90 border-white/70">
                <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 mb-4">
                  {item.icon}
                </div>
                <h3 className="font-display text-xl text-eco-900 mb-2">{item.title}</h3>
                <p className="text-sm text-eco-800 leading-relaxed">{item.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-18">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-primary-600 mb-2">Capabilities</p>
          <h2 className="font-display text-4xl md:text-5xl text-eco-800 mb-3">Built For Wholesale Growth</h2>
          <div className="w-20 h-1 bg-primary-500 mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {capabilities.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="h-full p-6 !bg-white/90 border-white/70">
                <div className="w-12 h-12 rounded-full bg-eco-100 flex items-center justify-center text-eco-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </div>
                <h3 className="font-display text-xl text-eco-900 mb-2">{item.title}</h3>
                <p className="text-sm text-eco-800 leading-relaxed">{item.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CORE LINES */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-18">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-primary-600 mb-2">Core Lines</p>
          <h2 className="font-display text-4xl md:text-5xl text-eco-800 mb-3">Products Built For Every Buyer Segment</h2>
          <div className="w-20 h-1 bg-primary-500 mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {coreLines.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Link to="/products">
                <Card hover className="overflow-hidden h-full flex flex-col !bg-white/90 border-white/70 group">
                  <div className={`relative h-48 bg-gradient-to-br ${item.gradient} overflow-hidden`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl opacity-60">{item.emoji}</span>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-display text-xl text-eco-900 mb-2">{item.name}</h3>
                    <p className="text-sm text-eco-800 leading-relaxed flex-1">{item.description}</p>
                    <span className="mt-4 text-sm font-medium text-primary-600 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                      View range &rarr;
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-18">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-primary-600 mb-2">Process</p>
          <h2 className="font-display text-4xl md:text-5xl text-eco-800 mb-3">How We Deliver Consistency</h2>
          <div className="w-20 h-1 bg-primary-500 mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {processSteps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 h-full relative shadow-card">
                <span className="font-display text-5xl text-primary-200 leading-none mb-4 block">{step.number}</span>
                <div className="w-10 h-0.5 bg-primary-500/40 mb-4" />
                <h3 className="font-display text-lg text-eco-900 mb-2">{step.title}</h3>
                <p className="text-sm text-eco-800 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY PARTNERS CHOOSE US */}
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-14 lg:py-18">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xs uppercase tracking-[0.28em] text-primary-600 mb-2">Why us</p>
          <h2 className="font-display text-4xl md:text-5xl text-eco-800 mb-3">Why Partners Choose Us</h2>
          <div className="w-20 h-1 bg-primary-500 mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 max-w-4xl mx-auto">
          {whyChooseUs.map((text, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="h-full p-5 !bg-white/90 border-white/70 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm text-eco-800 leading-relaxed">{text}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  )
}
