import projectRepository from "../../project/services/projectRepository";
import type { MediaAsset } from "../../project/types";

interface FileSystemHandleWithPermission extends FileSystemFileHandle {
  queryPermission: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
}

export async function loadMediaAssetBlob(asset: MediaAsset): Promise<Blob> {
  if (asset.status !== "linked") throw new Error("媒体素材当前不可用。");
  const storedBlob = await projectRepository.getMediaAssetBlob(asset.id);
  if (storedBlob) return storedBlob;
  const handle = await projectRepository.getMediaAssetHandle(asset.id);
  if (!handle) throw new Error("导入的媒体文件需要重新关联。");
  const permission = await (handle as FileSystemHandleWithPermission).queryPermission({ mode: "read" });
  if (permission !== "granted") throw new Error("需要授予本地媒体文件读取权限。");
  return handle.getFile();
}

export async function loadMediaAssetArrayBuffer(asset: MediaAsset): Promise<ArrayBuffer> {
  return (await loadMediaAssetBlob(asset)).arrayBuffer();
}

export async function createMediaAssetObjectUrl(asset: MediaAsset): Promise<string> {
  return URL.createObjectURL(await loadMediaAssetBlob(asset));
}
