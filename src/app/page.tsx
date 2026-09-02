'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useNetworkQuality } from '@/contexts/NetworkQualityContext';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export default function LandingPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { quality } = useNetworkQuality();
  
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Nodenza-style parallax values
  const yHero = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div ref={containerRef} className="relative bg-background overflow-hidden selection:bg-primary/20 selection:text-primary">
      <Navbar />
      
      <main className="relative z-10">
        {/* Cinematic Hero */}
        <section className="relative min-h-screen flex items-center pt-24 overflow-hidden bg-background">
          <div className="absolute inset-0 z-0">
            {/* The live-fold Golden image */}
            <motion.div style={{ y: yHero, opacity: opacityHero }} className="w-full h-full relative">
              <Image 
                src="/images/arthasetu_hero_cinematic.jpg" 
                alt="ArthaSetu Neo Mirai Hero" 
                fill 
                priority 
                className="object-cover object-[70%_30%] mix-blend-luminosity opacity-80" 
                sizes="100vw" 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background" />
            </motion.div>
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl"
            >
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[140px] font-display font-black text-foreground tracking-tighter leading-[0.85] uppercase">
                Artha<br/>Setu
              </h1>
              
              <div className="mt-8 sm:mt-12 flex items-center gap-6">
                <div className="w-16 h-[2px] bg-primary" />
                <span className="text-sm font-bold text-primary tracking-[0.3em] uppercase">India 2026</span>
              </div>

              <p className="mt-8 text-xl sm:text-2xl text-foreground max-w-xl leading-relaxed font-serif">
                {t.landing.subtitle}
              </p>

              <div className="mt-12 flex items-center gap-6">
                {user ? (
                  <Link href="/dashboard" className="px-8 py-4 bg-primary text-primary-foreground font-bold text-sm tracking-wider uppercase hover:bg-primary-hover transition-colors rounded-none">
                    {t.landing.ctaDashboard}
                  </Link>
                ) : (
                  <Link href="/signup" className="px-8 py-4 bg-primary text-primary-foreground font-bold text-sm tracking-wider uppercase hover:bg-primary-hover transition-colors rounded-none">
                    {t.landing.ctaSignup}
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Editorial Feature Sections */}
        <section className="relative z-20 bg-background py-32 sm:py-48 text-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-48 sm:space-y-72">
             
             {/* 01: Voice Interface */}
             <div className="relative flex flex-col md:flex-row items-center gap-16 md:gap-32">
                <div className="flex-1 relative z-10">
                   <motion.div 
                     initial={{ opacity: 0, x: -50 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     viewport={{ once: true, margin: "-100px" }}
                     transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                   >
                     <div className="text-[10rem] md:text-[18rem] font-display font-black text-border-subtle/40 select-none leading-none absolute -top-24 md:-top-32 -left-10 z-0">01</div>
                     <div className="relative z-10">
                       <h2 className="text-4xl md:text-5xl lg:text-7xl font-display font-bold text-foreground tracking-tighter leading-[0.9] mb-8 uppercase">
                         {t.landing.featureVoiceTitle}
                       </h2>
                       <p className="text-muted-foreground text-xl md:text-2xl leading-relaxed mb-10 font-serif">
                         {t.landing.featureVoiceDesc}
                       </p>
                     </div>
                   </motion.div>
                </div>

                <div className="flex-1 relative z-10 w-full">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                    className="aspect-[4/5] relative overflow-hidden"
                  >
                    <Image src="/images/women-entrepreneur.webp" alt="Women entrepreneurs" fill className="object-cover grayscale hover:grayscale-0 transition-all duration-700" sizes="(min-width: 768px) 50vw, 100vw" />
                  </motion.div>
                </div>
             </div>

             {/* 02: Language */}
             <div className="relative flex flex-col md:flex-row-reverse items-center gap-16 md:gap-32">
                <div className="flex-1 relative z-10 md:pl-16">
                   <motion.div 
                     initial={{ opacity: 0, x: 50 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     viewport={{ once: true, margin: "-100px" }}
                     transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                   >
                     <div className="text-[10rem] md:text-[18rem] font-display font-black text-border-subtle/40 select-none leading-none absolute -top-24 md:-top-32 -right-10 z-0">02</div>
                     <div className="relative z-10">
                       <h2 className="text-4xl md:text-5xl lg:text-7xl font-display font-bold text-foreground tracking-tighter leading-[0.9] mb-8 uppercase">
                         {t.landing.featureLanguageTitle}
                       </h2>
                       <p className="text-muted-foreground text-xl md:text-2xl leading-relaxed mb-10 font-serif">
                         {t.landing.featureLanguageDesc}
                       </p>
                       <Link href="/schemes" className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-2 group tracking-[0.2em] uppercase text-sm">
                         {t.landing.viewSchemesCta} <span className="group-hover:translate-x-2 transition-transform">→</span>
                       </Link>
                     </div>
                   </motion.div>
                </div>

                <div className="flex-1 relative z-10 w-full">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                    className="aspect-[4/5] relative overflow-hidden"
                  >
                    <Image src="/images/small-shopkeeper.webp" alt="Small shopkeeper" fill className="object-cover grayscale hover:grayscale-0 transition-all duration-700" sizes="(min-width: 768px) 50vw, 100vw" />
                  </motion.div>
                </div>
             </div>

             {/* 03: Planner */}
             <div className="relative flex flex-col md:flex-row items-center gap-16 md:gap-32">
                <div className="flex-1 relative z-10">
                   <motion.div 
                     initial={{ opacity: 0, x: -50 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     viewport={{ once: true, margin: "-100px" }}
                     transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                   >
                     <div className="text-[10rem] md:text-[18rem] font-display font-black text-border-subtle/40 select-none leading-none absolute -top-24 md:-top-32 -left-10 z-0">03</div>
                     <div className="relative z-10">
                       <h2 className="text-4xl md:text-5xl lg:text-7xl font-display font-bold text-foreground tracking-tighter leading-[0.9] mb-8 uppercase">
                         {t.landing.featurePlannerTitle}
                       </h2>
                       <p className="text-muted-foreground text-xl md:text-2xl leading-relaxed mb-10 font-serif">
                         {t.landing.featurePlannerDesc}
                       </p>
                       <Link href="/planner" className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-2 group tracking-[0.2em] uppercase text-sm">
                         Try Planner <span className="group-hover:translate-x-2 transition-transform">→</span>
                       </Link>
                     </div>
                   </motion.div>
                </div>

                <div className="flex-1 relative z-10 w-full">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                    className="aspect-[4/5] relative overflow-hidden"
                  >
                    <Image src="/images/pottery-artisan.webp" alt="Pottery artisan" fill className="object-cover grayscale hover:grayscale-0 transition-all duration-700" sizes="(min-width: 768px) 50vw, 100vw" />
                  </motion.div>
                </div>
             </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
