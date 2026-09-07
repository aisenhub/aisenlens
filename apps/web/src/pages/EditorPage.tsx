import EditorWorkspace from "../features/editor/components/EditorWorkspace";
import ProjectMediaGate from "../features/project/components/ProjectMediaGate";
import type { MediaAsset, ProjectRecord } from "../features/project/types";

interface Props {
  onNavigate: (page: number) => void;
  projectId: string | null;
  projectTitle: string;
  setProjectTitle: (title: string) => void;
  onProjectLoaded: (project: ProjectRecord) => void;
}

export default function EditorPage({ projectId, onProjectLoaded, ...editorProps }: Props) {
  return <ProjectMediaGate projectId={projectId} onNavigate={editorProps.onNavigate} onProjectLoaded={onProjectLoaded}>
    {(project, videoUrl, primaryVideoAsset, onRenameProject, onImportVideo, isSelectingVideo) => {
      const emptyMediaAsset: MediaAsset = {
        id: `empty-video-${project.id}`,
        projectId: project.id,
        kind: "video",
        origin: "imported",
        name: "尚未导入视频",
        status: "unlinked",
        source: null,
        metadata: null,
        linkedAt: null,
        relinkedAt: null,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
      return <EditorWorkspace key={project.id} {...editorProps} project={project} projectTitle={project.title} setProjectTitle={onRenameProject} videoUrl={videoUrl} projectId={project.id} media={primaryVideoAsset ?? emptyMediaAsset} isSelectingVideo={isSelectingVideo} onImportVideo={onImportVideo} coverScreenshotId={project.coverScreenshotId} onProjectUpdated={onProjectLoaded} />;
    }}
  </ProjectMediaGate>;
}
