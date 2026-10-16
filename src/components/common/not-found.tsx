import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Droplets, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-10">
        <Link to="/" className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src="/favicon.png" alt="SOHAN PIPELINES" className="size-11 shrink-0 rounded-md object-contain" />
          <span className="min-w-0">
            <span className="block font-display text-sm font-semibold">SOHAN PIPELINES</span>
            <span className="mt-1 block text-xs text-muted-foreground">Admin Operations</span>
          </span>
        </Link>
        <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><ShieldCheck className="size-4" />Administrator workspace</span>
      </header>

      <main className="page-enter mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-12 text-center sm:py-16">
        <div className="relative mb-8 w-full max-w-md" aria-hidden="true">
          <svg viewBox="0 0 440 190" className="h-auto w-full text-primary" fill="none">
            <path d="M20 100H58V48H98V146M58 100H124M156 54C156 34 220 34 220 54V132C220 152 156 152 156 132ZM264 100H302V48H342V146M302 100H368" stroke="currentColor" strokeWidth="19" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 100H58V48H98V146M58 100H124M156 54C156 34 220 34 220 54V132C220 152 156 152 156 132ZM264 100H302V48H342V146M302 100H368" className="text-background" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M116 85V115M360 85V115M148 80H168M208 112H228M90 65H106M334 118H350" className="text-foreground" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <path d="M399 125C399 125 389 138 389 145A10 10 0 0 0 409 145C409 138 399 125 399 125Z" fill="currentColor" />
          </svg>
          <span className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"><Droplets className="size-3.5" />404 / Page not found</span>
        </div>
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">A break in the pipeline.</h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">This page may have moved, or the address isn’t quite right. Your operations are still in place.</p>
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild className="h-11 gap-3 px-5"><Link to="/">Back to dashboard<ArrowRight className="size-4" /></Link></Button>
          <Button variant="outline" className="h-11 gap-2 px-5" onClick={() => { if (window.history.length > 1) router.history.back(); else void router.navigate({ to: "/" }); }}><ArrowLeft className="size-4" />Go back</Button>
        </div>
      </main>

      <footer className="mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-xs text-muted-foreground sm:mx-10">
        <span>SOHAN PIPELINES</span><span>Bookings · Inventory · Business operations</span>
      </footer>
    </div>
  );
}