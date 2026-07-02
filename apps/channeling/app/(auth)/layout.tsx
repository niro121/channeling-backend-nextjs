export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: branding panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/10 via-muted/50 to-muted p-10 text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <span className="text-xl">Ruhunu</span>
        </div>
        <div className="space-y-4">
          <blockquote className="text-lg leading-relaxed border-l-4 border-primary pl-6 italic text-foreground/90">
            &ldquo;Manage your channelling appointments and teams in one place—simple, secure, and always in sync.&rdquo;
          </blockquote>
          <footer className="text-sm text-muted-foreground">— Ruhunu Channelling</footer>
        </div>
        <div className="text-sm opacity-70">
          Ruhunu Channelling · Secure access for your team
        </div>
      </div>

      {/* Right: form area — default auth layout: no card border, clean hierarchy */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10 lg:p-12">
        <div className="w-full max-w-[360px] space-y-6">{children}</div>
      </div>
    </div>
  );
}
