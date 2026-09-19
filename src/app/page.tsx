import { SiteHeader } from "@/components/prother/site-header";
import { Hero } from "@/components/prother/hero";
import { CategoryTicker } from "@/components/prother/category-ticker";
import { HowItWorks } from "@/components/prother/how-it-works";
import { LaunchFeed } from "@/components/prother/launch-feed";
import { AgentEra } from "@/components/prother/agent-era";
import { Standards } from "@/components/prother/standards";
import { Faq } from "@/components/prother/faq";
import { FinalCta } from "@/components/prother/final-cta";
import { SiteFooter } from "@/components/prother/site-footer";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-ink pb-16 text-foreground md:pb-0">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <CategoryTicker />
        <HowItWorks />
        <LaunchFeed />
        <AgentEra />
        <Standards />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
