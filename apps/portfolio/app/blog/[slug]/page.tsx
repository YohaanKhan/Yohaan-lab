import { getArticleData } from "@/lib/articles";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimatedEntrance } from "@yohaan-lab/ui";
import "@/app/blog/blog.css";

// Updated for Next.js 15+ async params
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  let article;
  try {
    article = await getArticleData(slug);
  } catch (error) {
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <AnimatedEntrance delay={0}>
        <div className="mb-12">
          <Link 
            href="/blog"
            className="inline-flex items-center gap-2 font-mono text-xs text-muted hover:text-accent transition-colors duration-200 mb-8 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Blog
          </Link>
          
          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs text-accent uppercase tracking-widest font-semibold">
              {article.category}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-primary leading-tight">
              {article.title}
            </h1>
            <p className="font-mono text-sm text-muted">
              {article.date}
            </p>
          </div>
        </div>
      </AnimatedEntrance>

      <AnimatedEntrance delay={0.2}>
        <div 
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: article.contentHtml || "" }}
        />
      </AnimatedEntrance>
      
      <div className="mt-20 pt-12 border-t border-border">
        <Link 
          href="/blog"
          className="font-mono text-sm text-muted hover:text-accent transition-colors duration-200"
        >
          ← Explore more articles
        </Link>
      </div>
    </main>
  );
}
