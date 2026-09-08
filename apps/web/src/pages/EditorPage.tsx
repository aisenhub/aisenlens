import { useEffect } from "react";
import EditorWorkspace from "../features/editor/components/EditorWorkspace";
import ProjectMediaGate from "../features/project/components/ProjectMediaGate";
import type { MediaAsset, ProjectRecord } from "../features/project/types";
import ProjectWorkspaceShell from "../features/workflow/components/ProjectWorkspaceShell";
import WorkflowPlaceholder from "../features/workflow/components/WorkflowPlaceholder";
import useWorkflowNavigation from "../features/workflow/hooks/useWorkflowNavigation";
import ProjectSessionProvider from "../features/editor/session/ProjectSessionProvider";
import ProjectSessionRuntime from "../features/editor/session/ProjectSessionRuntime";

interface Props {
  onNavigate: (page: number) => void;
  projectId: string | null;
  projectTitle: string;
  setProjectTitle: (title: string) => void;
  onProjectLoaded: (project: ProjectRecord) => void;
}

export default function EditorPage({ projectId, onProjectLoaded, ...editorProps }: Props) {
  const workflow = useWorkflowNavigation(projectId)

  useEffect(() => {
    workflow.ensureProjectInLocation()
  }, [workflow.ensureProjectInLocation])

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
      return (
        <ProjectSessionProvider projectId={project.id}>
          <ProjectSessionRuntime isLoading={false} hasError={false}>
            <ProjectWorkspaceShell activeStage={workflow.stage} onStageChange={workflow.goTo}>
              <EditorWorkspace
                key={project.id}
                {...editorProps}
                project={project}
                projectTitle={project.title}
                setProjectTitle={onRenameProject}
                videoUrl={videoUrl}
                projectId={project.id}
                media={primaryVideoAsset ?? emptyMediaAsset}
                isSelectingVideo={isSelectingVideo}
                onImportVideo={onImportVideo}
                coverScreenshotId={project.coverScreenshotId}
                onProjectUpdated={onProjectLoaded}
                isActive={workflow.stage === "analyze"}
              />
              {workflow.stage !== "analyze" && (
                <WorkflowPlaceholder
                  stage={workflow.stage}
                  onGoToAnalyze={() => workflow.goTo("analyze", "scenes")}
                />
              )}
            </ProjectWorkspaceShell>
          </ProjectSessionRuntime>
        </ProjectSessionProvider>
      );
    }}
  </ProjectMediaGate>;
}
