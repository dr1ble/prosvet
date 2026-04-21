import { About } from "@/features/landing/ui/About";
import { Features } from "@/features/landing/ui/Features";
import { Footer } from "@/features/landing/ui/Footer";
import { Hero } from "@/features/landing/ui/Hero";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Hero />
      <Features />
      <About />
      <Footer />
    </main>
  );
}
