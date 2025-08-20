import { ProjectPageClient } from './project-page-client';

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <div className="mt-6 mx-6">
      <ProjectPageClient projectId={params.id} />
    </div>
  );
} 