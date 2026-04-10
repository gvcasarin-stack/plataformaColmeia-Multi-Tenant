import HeroSection from "@/components/landing/hero-section"
import BenefitsSection from "@/components/landing/benefits-section"
import FeaturesSection from "@/components/landing/features-section"
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
      
      <main className="flex min-h-screen flex-col">
        <HeroSection />
        <BenefitsSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <CtaSection />
        <FaqSection />
        <Footer />
      </main>
    </>
  );
}
