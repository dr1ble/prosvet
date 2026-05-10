import { About } from "@/features/landing/ui/About";
import { Features } from "@/features/landing/ui/Features";
import { Footer } from "@/features/landing/ui/Footer";
import { Header } from "@/features/landing/ui/Header";
import { Hero } from "@/features/landing/ui/Hero";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Header />
      <main>
        <Hero />
        <Features />
        <About />
      </main>
      <Footer />
    </div>
  );
}
