import Nav from "./(marketing)/components/Nav";
import Hero from "./(marketing)/components/Hero";
import ProblemFraming from "./(marketing)/components/ProblemFraming";
import ContourDifference from "./(marketing)/components/ContourDifference";
import LiveExample from "./(marketing)/components/LiveExample";
import RealCase from "./(marketing)/components/RealCase";
import HowItWorks from "./(marketing)/components/HowItWorks";
import InstallSection from "./(marketing)/components/InstallSection";
import Pricing from "./(marketing)/components/Pricing";
import Footer from "./(marketing)/components/Footer";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <ProblemFraming />
        <ContourDifference />
        <RealCase />
        <LiveExample />
        <HowItWorks />
        <InstallSection />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
