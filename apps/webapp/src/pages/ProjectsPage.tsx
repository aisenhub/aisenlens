import ProjectLibrary from "../features/project/components/ProjectLibrary";
import type { ProjectRecord } from "../features/project/types";

interface Props {
  onOpenProject: (project: ProjectRecord) => void;
}

export default function ProjectsPage(props: Props) {
  return <ProjectLibrary {...props} />;
}
