import Link from "next/link";

export function NavBar() {
  return (
    <nav className="w-full px-6 py-4 border-b border-border bg-background">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="relative font-sans text-sm font-medium text-primary group"
        >
          Yohaan <span className="text-accent">Khan</span>
          <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 ease-out group-hover:w-full" />
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/blog"
            className="font-mono text-xs sm:text-sm text-muted hover:text-primary transition-colors duration-200"
          >
            Blog
          </Link>
          <a
            href="https://github.com/YohaanKhan"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs sm:text-sm text-muted hover:text-primary transition-colors duration-200"
          >
            GitHub
          </a>
          <div className="h-4 w-px bg-border mx-1" />
          <Link
            href="/login"
            className="font-mono text-xs sm:text-sm text-muted hover:text-primary transition-colors duration-200"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-3 py-1.5 rounded-md bg-accent text-white font-sans text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity duration-200"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}