import EditorWorkspace from "../features/editor/components/EditorWorkspace";
import ProjectMediaGate from "../features/project/components/ProjectMediaGate";
import type { ProjectRecord } from "../features/project/types";

interface Props {
  onNavigate: (page: number) => void;
  projectId: string | null;
  projectTitle: string;
  setProjectTitle: (title: string) => void;
  onProjectLoaded: (project: ProjectRecord) => void;
}

export default function EditorPage({ projectId, onProjectLoaded, ...editorProps }: Props) {
  return <ProjectMediaGate projectId={projectId} onNavigate={editorProps.onNavigate} onProjectLoaded={onProjectLoaded}>
    {(project, videoUrl, primaryVideoAsset, onRenameProject) => <EditorWorkspace {...editorProps} project={project} projectTitle={project.title} setProjectTitle={onRenameProject} videoUrl={videoUrl} projectId={project.id} media={primaryVideoAsset} coverScreenshotId={project.coverScreenshotId} onProjectUpdated={onProjectLoaded} />}
  </ProjectMediaGate>;
}
