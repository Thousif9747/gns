import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { get, extractList } from '../../api/client'
import ProductCard from '../../components/ui/ProductCard'
import AutoCarousel from '../../components/ui/AutoCarousel'

export default function Home() {
  const [categories, setCategories] = useState([])
  const [featured, setFeatured] = useState([])
  const [offers, setOffers] = useState([])
  const [banners, setBanners] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      get('/catalog/categories/'), get('/catalog/products/', { is_featured: true, page_size: 200 }),
      get('/catalog/offers/', { is_homepage_banner: true }), get('/catalog/ad-banners/'),
      get('/catalog/reviews/'),
    ]).then(([cats, products, deals, ads, reviewData]) => {
      if (cats.ok) setCategories(extractList(cats.data))
      if (products.ok) setFeatured(extractList(products.data))
      if (deals.ok) setOffers(extractList(deals.data))
      if (ads.ok) setBanners(extractList(ads.data))
      if (reviewData.ok) setReviews(extractList(reviewData.data))
    }).finally(() => setLoading(false))
  }, [])

  function openProduct(product, e) {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/products/${product.slug}`)
  }

  const offerProducts = useMemo(() => featured.filter(product => product.offer_info), [featured])
  const carouselItems = banners.filter(item => item.image_url)

  return <div className="min-h-screen bg-[#f6f7f5] text-[#17211b]">
    <main className="mx-auto max-w-[1440px] px-3 pb-12 pt-3 sm:px-6 sm:pt-5">
      {carouselItems.length > 0 ? <AutoCarousel
        slides={carouselItems}
        interval={4500}
        className="mb-9 animate-[homeReveal_.65s_ease-out_both]"
        viewportClassName="aspect-[16/8] rounded-[22px] bg-[#e8eee9] shadow-[0_22px_60px_rgba(20,76,48,.13)] sm:aspect-[3.6/1]"
        renderSlide={(banner, index, active) => <a className="group relative block h-full w-full overflow-hidden" href={banner.link_url || '/products'} aria-label={banner.title || 'View promotion'}>
          <img src={banner.image_url} alt={banner.title || 'GNS promotion'} className={`h-full w-full object-cover transition-transform duration-[1400ms] motion-reduce:transition-none ${active ? 'scale-100' : 'scale-[1.035]'}`} style={{ objectPosition: banner.object_position || '50% 50%' }} />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent opacity-60" />
          {banner.title && <span className="absolute bottom-5 left-5 max-w-[70%] rounded-xl bg-white/90 px-4 py-2 text-sm font-black text-[#17211b] shadow-lg backdrop-blur-sm transition group-hover:-translate-y-0.5 sm:bottom-7 sm:left-7 sm:text-lg">{banner.title}</span>}
        </a>}
      /> : <section className="relative mb-9 grid min-h-[230px] animate-[homeReveal_.65s_ease-out_both] place-items-center overflow-hidden rounded-[22px] bg-[#146b45] px-6 text-center text-white shadow-[0_22px_60px_rgba(20,76,48,.13)] sm:min-h-[300px]">
        <span className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#ddf54a]/10 blur-2xl" />
        <span className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-[#f59e0b]/10 blur-2xl" />
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#ddf54a]">Better tables, lighter footprint</p><h1 className="mt-2 text-3xl font-black sm:text-5xl">Everyday paper essentials,<br />ready for every occasion.</h1><Link to="/products" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#ddf54a] px-6 text-sm font-black text-[#17211b]">Shop now</Link></div>
      </section>}

      <CommerceSection title="Shop by category" subtitle="Everything you need, neatly sorted" link="/products">
        {loading ? <CategorySkeletons /> : categories.length ? <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
          {categories.slice(0, 20).map((category, index) => <Link key={category.id} to={`/products?category=${category.slug}`} className="group min-w-0 text-center">
            <div className={`mx-auto aspect-square overflow-hidden rounded-[16px] border border-[#dce6de] p-2 transition group-hover:-translate-y-1 ${['bg-[#edf7df]','bg-[#fff1d9]','bg-[#e8f2ee]','bg-[#f2ebff]'][index % 4]}`}>
              {category.image_url ? <img src={category.image_url} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <span className="grid h-full place-items-center text-2xl font-black text-[#146b45]">{category.name?.[0]}</span>}
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] font-extrabold leading-4 sm:text-xs">{category.name}</p>
          </Link>)}
        </div> : <Empty message="Categories are being prepared." />}
      </CommerceSection>

      <CommerceSection title="Bestsellers" subtitle="Most loved paper essentials" link="/products">
        {loading ? <ProductSkeletons /> : featured.length ? <ProductRail products={featured.slice(0, 12)} openProduct={openProduct} /> : <Empty message="Our collection is being refreshed." />}
      </CommerceSection>

      {(offerProducts.length > 0 || offers.length > 0) && <CommerceSection title="Deals for you" subtitle="More value in every pack" link="/offers" accent>
        {offerProducts.length ? <ProductRail products={offerProducts.slice(0, 12)} openProduct={openProduct} /> :
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">{offers.slice(0, 6).map(offer => <Link key={offer.id} to="/offers" className="min-w-[240px] snap-start rounded-2xl border border-[#f3d9a9] bg-[#fff4df] p-5 text-sm font-black text-[#704d13]">{offer.name}</Link>)}</div>}
      </CommerceSection>}

      {categories.slice(0, 2).map(category => {
        const products = featured.filter(product => product.category === category.id || product.category_name === category.name)
        return products.length ? <CommerceSection key={category.id} title={category.name} subtitle="Handpicked for you" link={`/products?category=${category.slug}`}>
          <ProductRail products={products} openProduct={openProduct} />
        </CommerceSection> : null
      })}

      <section className="my-8 grid overflow-hidden rounded-[18px] bg-[#146b45] text-white md:grid-cols-[1fr_auto] md:items-center">
        <div className="p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-widest text-[#ddf54a]">Restaurants  Caterers  Events</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Buying for your business?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Get dependable supply, practical pack sizes and support for recurring bulk requirements.</p></div>
        <Link to="/contact" className="m-4 flex min-h-12 items-center justify-center rounded-xl bg-[#ddf54a] px-6 text-sm font-black text-[#17211b] md:m-8">Request bulk pricing</Link>
      </section>

      <section className="grid grid-cols-2 overflow-hidden rounded-[16px] border border-[#dfe7e1] bg-white md:grid-cols-4">
        {['Food-safe quality','Eco-conscious choices','Secure checkout','Responsive support'].map((item, i) => <div key={item} className={`p-4 text-center text-xs font-extrabold ${i ? 'border-l border-[#e4ebe6]' : ''}`}>{item}</div>)}
      </section>

      <section className="mt-8 grid gap-3 md:grid-cols-3">
        <div className="rounded-[16px] border border-[#dfe7e1] bg-white p-5"><p className="text-xs font-black uppercase text-[#146b45]">Why GNS</p><h2 className="mt-2 text-xl font-black">Practical products, thoughtful service.</h2><p className="mt-2 text-sm leading-6 text-[#596a60]">Paper essentials for busy homes and businesses, with consistent quality and useful support.</p></div>
        {(reviews.length ? reviews : [{ reviewer_name: 'Restaurant buyer', comment: 'Consistent quality and prompt service.' }, { reviewer_name: 'Event customer', comment: 'Strong products and good value for bulk needs.' }]).slice(0, 2).map((review, i) => <blockquote key={review.id || i} className="rounded-[16px] border border-[#dfe7e1] bg-white p-5"><p className="text-sm leading-6 text-[#394e43]">{review.comment || review.text}</p><footer className="mt-3 text-xs font-black text-[#146b45]">{review.reviewer_name || review.name}</footer></blockquote>)}
      </section>
    </main>
  </div>
}

function CommerceSection({ title, subtitle, link, children, accent }) {
  return <section className={`mb-9 animate-[homeReveal_.7s_ease-out_both] ${accent ? 'rounded-[18px] bg-[#fff9ed] px-3 py-5 sm:px-5' : ''}`}>
    <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-xl font-black tracking-[-.02em] sm:text-2xl">{title}</h2><p className="mt-0.5 text-xs font-medium text-[#6b7a71]">{subtitle}</p></div><Link to={link} className="shrink-0 text-xs font-black text-[#146b45]">See all </Link></div>{children}
  </section>
}
function ProductRail({ products, openProduct }) {
  return <div className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0">{products.filter(Boolean).map(product => <div key={product.id} className="w-[164px] shrink-0 snap-start sm:w-[190px]"><ProductCard product={product} onAdd={openProduct} onBuyNow={openProduct} compact detailOnly /></div>)}</div>
}
function ProductSkeletons() { return <div className="flex gap-3 overflow-hidden">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[300px] w-[164px] shrink-0 animate-pulse rounded-2xl border border-[#e2eae4] bg-white"><div className="aspect-square bg-[#edf2ee]" /></div>)}</div> }
function CategorySkeletons() { return <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">{Array.from({ length: 8 }, (_, i) => <div key={i} className="animate-pulse"><div className="aspect-square rounded-2xl bg-[#e8eee9]" /><div className="mx-auto mt-2 h-3 w-2/3 rounded bg-[#e8eee9]" /></div>)}</div> }
function Empty({ message }) { return <div className="rounded-2xl border border-dashed border-[#cddacf] bg-white px-4 py-7 text-center text-sm font-semibold text-[#5a6c62]">{message}</div> }
