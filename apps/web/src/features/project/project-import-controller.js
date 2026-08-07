export function createProjectImportController({
  readTextFile,
  parseProject,
  parseManifest = parseProject,
  validateManifest,
  validateProject,
  normalizeShots,
  normalizeGroups,
  resolveVideo,
  findProjectByUuid,
  migrateBundle
} = {}) {
  return {
    async readFolder(dirHandle) {
      const manifestText = await readTextFile(dirHandle, 'manifest.json');
      if (manifestText != null) {
        const manifest = parseManifest(manifestText, 'manifest.json');
        validateManifest?.(manifest);
      }
      const projectText = await readTextFile(dirHandle, 'project.json');
      if (projectText === null) {
        return {
          mode: 'new',
          dirHandle,
          video: await resolveVideo(dirHandle, '')
        };
      }
      const project = parseProject(projectText, 'project.json');
      const shotsText = await readTextFile(dirHandle, 'shots.json');
      const groupsText = await readTextFile(dirHandle, 'groups.json');
      const resourceIndexText = await readTextFile(dirHandle, 'resource-index.json');
      const shots = shotsText == null ? [] : parseProject(shotsText, 'shots.json');
      const groups = groupsText == null ? [] : parseProject(groupsText, 'groups.json');
      const migrated = migrateBundle ? migrateBundle({ project, shots, groups }) : { project, shots, groups };
      validateProject(migrated.project, migrated.shots, migrated.groups);
      const videoName = migrated.project.videoFileName || '';
      const video = await resolveVideo(dirHandle, videoName);
      const projectUuid = migrated.project.projectUuid;
      const existing = await findProjectByUuid(projectUuid);
      const screenshotAssets = [];
      if (resourceIndexText) {
        try {
          const index = JSON.parse(resourceIndexText);
          const directory = await dirHandle.getDirectoryHandle('screenshots');
          for (const item of Array.isArray(index) ? index : []) {
            if (!item?.key || !item?.shotId || !item?.type) continue;
            try {
              const handle = await directory.getFileHandle(`asset-${encodeURIComponent(String(item.key))}.bin`);
              const blob = await handle.getFile();
              screenshotAssets.push({
                ...item,
                key: String(item.key),
                shotId: String(item.shotId),
                type: String(item.type),
                blob,
                size: Number(item.size) || blob.size
              });
            } catch (_) {}
          }
        } catch (_) {}
      }
      return {
        mode: 'import',
        dirHandle,
        project: migrated.project,
        entries: normalizeShots(migrated.shots),
        shotGroups: normalizeGroups(migrated.groups),
        video,
        videoFileName: video.fileName || videoName,
        existing,
        screenshotAssets
      };
    }
  };
}
