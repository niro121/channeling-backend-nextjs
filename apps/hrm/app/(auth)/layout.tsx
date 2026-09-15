export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/10 via-muted/50 to-muted p-10 text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <span className="text-xl">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} HRM</span>
        </div>
        <div className="space-y-4">
          <blockquote className="text-lg leading-relaxed border-l-4 border-primary pl-6 italic text-foreground/90">
            &ldquo;Manage your workforce, streamline HR processes, and empower your team—all in one place.&rdquo;
          </blockquote>
          <footer className="text-sm text-muted-foreground">— {process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} Human Resource Management</footer>
        </div>
        <div className="text-sm opacity-70">{process.env.NEXT_PUBLIC_BRAND_NAME || 'Ruhunu'} HRM · Secure access for your team</div>
      </div>
      <div className="flex flex-col items-center justify-center p-6 md:p-10 lg:p-12">
        <div className="w-full max-w-[360px] space-y-6">{children}</div>
      </div>
    </div>
  );
}
