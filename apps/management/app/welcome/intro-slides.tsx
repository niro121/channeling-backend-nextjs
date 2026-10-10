'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Building2, Fingerprint, LineChart, Lock, ShieldCheck, Smartphone, Stethoscope, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIMARY_BUTTON } from '@/components/pwa/install-steps';

/** Set once the intro has been seen on this device — after that, the app opens on sign-in. */
export const INTRO_SEEN_KEY = 'management_intro_seen';

type Slide = { title: string; text: string; art: React.ReactNode };

function ArtTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-primary/10">
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

const SLIDES: Slide[] = [
  {
    title: 'Your business,\nat a glance.',
    text: 'The figures management needs, on your phone or iPad — wherever you are.',
    art: <Image src="/icon-512.png" alt="" width={168} height={168} className="rounded-[2.5rem] shadow-xl shadow-primary/25" priority />
  },
  {
    title: 'Every system,\none view.',
    text: 'Channeling, HR and doctor payments brought together, so you don’t have to open each one.',
    art: (
      <div className="grid w-64 grid-cols-2 gap-3">
        <ArtTile icon={<Stethoscope className="h-7 w-7" />} label="Channeling" />
        <ArtTile icon={<Fingerprint className="h-7 w-7" />} label="HR" />
        <ArtTile icon={<Wallet className="h-7 w-7" />} label="DPAY" />
        <ArtTile icon={<Building2 className="h-7 w-7" />} label="Branches" />
      </div>
    )
  },
  {
    title: 'Secure\nby design.',
    text: 'Sign in with your existing account and two-factor code. Figures are never stored on the device.',
    art: (
      <div className="grid w-64 grid-cols-3 gap-3">
        <ArtTile icon={<Lock className="h-6 w-6" />} label="Login" />
        <ArtTile icon={<ShieldCheck className="h-6 w-6" />} label="2FA" />
        <ArtTile icon={<Smartphone className="h-6 w-6" />} label="App" />
      </div>
    )
  }
];

export function IntroSlides() {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  // Seen it before on this device → straight to sign-in.
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(INTRO_SEEN_KEY) === '1';
    } catch {
      // storage unavailable — show the intro
    }
    if (seen) router.replace('/login');
    else setReady(true);
  }, [router]);

  function finish() {
    try {
      window.localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // storage unavailable — the intro just shows again next time
    }
    router.push('/login');
  }

  function goTo(i: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  if (!ready) return null;
  const last = index === SLIDES.length - 1;

  return (
    <div className="app-gradient flex h-dvh flex-col pt-safe pb-safe">
      <div className="flex h-14 shrink-0 items-center justify-between px-6">
        <span className="flex items-center gap-2 text-sm font-semibold text-primary">
          <LineChart className="h-4 w-4" aria-hidden />
          {process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} Management
        </span>
        {!last && (
          <button type="button" onClick={finish} className="-mr-2 px-2 py-1 text-sm font-medium text-muted-foreground">
            Skip
          </button>
        )}
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((slide) => (
          <section key={slide.title} className="flex w-full shrink-0 snap-center flex-col px-6">
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
              <h1 className="mt-6 whitespace-pre-line text-[2.125rem] font-medium leading-[1.2] tracking-tight">
                {slide.title}
              </h1>
              <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted-foreground">{slide.text}</p>
              <div className="flex flex-1 items-center justify-center py-8">{slide.art}</div>
            </div>
          </section>
        ))}
      </div>

      <div className="mx-auto w-full max-w-md shrink-0 px-6 pb-6">
        <div className="mb-6 flex justify-center gap-2" role="tablist" aria-label="Intro pages">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Page ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn('h-2 rounded-full transition-all', i === index ? 'w-6 bg-primary' : 'w-2 bg-primary/25')}
            />
          ))}
        </div>
        <button type="button" className={PRIMARY_BUTTON} onClick={() => (last ? finish() : goTo(index + 1))}>
          {last ? 'Get started' : 'Next'} <ArrowRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
