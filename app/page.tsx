import { getConsentSnapshot } from "@/lib/consent-snapshot";
import { publicMetadata } from "@/lib/cms-seo";
import { HomeMotion } from "@/components/home/HomeMotion";
import { Intro } from "@/components/home/Intro";
import { Mobility } from "@/components/home/Mobility";
import { Legal } from "@/components/home/Legal";
import ProcessFolder from "@/components/ProcessFolder";
import { ContactFooter } from "@/components/home/ContactFooter";
import "@/components/home/home.css";

export const generateMetadata = () => publicMetadata("home");

export default async function Home() {
  const consent = await getConsentSnapshot();
  return (
    <HomeMotion>
      <Intro />
      <Mobility />
      <Legal />
      <ProcessFolder />
      <ContactFooter consentRevision={consent?.revision ?? null} />
    </HomeMotion>
  );
}
