import LandingHeader from "@/components/landing/landing-header"
import HeroSection from "@/components/landing/hero-section"
import BenefitsSectionV2 from "@/components/landing/benefits-section-v2"
import FeaturesSectionV2 from "@/components/landing/features-section-v2"
import TestimonialsSection from "@/components/landing/testimonials-section"
import PricingSection from "@/components/landing/pricing-section"
import CtaSection from "@/components/landing/cta-section"
import FaqSection from "@/components/landing/faq-section"
import Footer from "@/components/landing/footer"
import { JsonLd } from "@/components/seo/JsonLd"
import { getAllHomeSchemas } from "@/lib/seo/structured-data"

export default function LandingTestePage() {
  return (
    <>
      <JsonLd data={getAllHomeSchemas()} />
      <LandingHeader />
      
      <main className="flex min-h-screen flex-col pt-16">
        <HeroSection />
        <BenefitsSectionV2 />
        <FeaturesSectionV2 />
        <TestimonialsSection />
        <PricingSection />
        <CtaSection />
        <FaqSection />
        <Footer />
      </main>
    </>
  );
}
