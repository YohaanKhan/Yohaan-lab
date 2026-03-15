import { ProjectCard, AnimatedEntrance } from "@yohaan-lab/ui";
import { projects } from "@/data/projects";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-16 max-w-4xl mx-auto">

      <AnimatedEntrance delay={0}>
        <div className="mb-14">
          <h1 className="font-sans text-3xl font-semibold text-primary mb-2">
            Yohaan Khan
          </h1>
          <p className="font-mono text-sm text-muted">
            AI Systems & Experiments
          </p>
        </div>
      </AnimatedEntrance>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {projects.map((project, index) => (
          <AnimatedEntrance key={project.id} delay={0.1 + index * 0.05}>
            <ProjectCard {...project} />
          </AnimatedEntrance>
        ))}
      </div>

    </main>
  );
}