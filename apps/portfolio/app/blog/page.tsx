import { getCategorisedArticles } from "@/lib/articles";
import Link from "next/link";
import { AnimatedEntrance } from "@yohaan-lab/ui";

export default function BlogPage() {
  const categorisedArticles = getCategorisedArticles();
  const categories = Object.keys(categorisedArticles);

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <AnimatedEntrance delay={0}>
        <div className="mb-14">
          <h1 className="font-sans text-3xl font-semibold text-primary mb-2">
            Blog
          </h1>
          <p className="font-mono text-sm text-muted">
            Thoughts on AI, stoicism, and clean code
          </p>
        </div>
      </AnimatedEntrance>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {categories.map((category, catIndex) => (
          <div key={category} className="flex flex-col gap-6">
            <AnimatedEntrance delay={0.1 + catIndex * 0.1}>
              <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-accent/80 border-b border-border pb-2">
                {category}
              </h2>
            </AnimatedEntrance>
            
            <div className="flex flex-col gap-4">
              {categorisedArticles[category].map((article, index) => (
                <AnimatedEntrance 
                  key={article.id} 
                  delay={0.2 + catIndex * 0.1 + index * 0.05}
                >
                  <Link 
                    href={`/blog/${article.id}`}
                    className="group block"
                  >
                    <div className="flex flex-col gap-1">
                      <h3 className="font-sans text-lg font-medium text-primary group-hover:text-accent transition-colors duration-200">
                        {article.title}
                      </h3>
                      <p className="font-mono text-xs text-muted">
                        {article.date}
                      </p>
                    </div>
                  </Link>
                </AnimatedEntrance>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
