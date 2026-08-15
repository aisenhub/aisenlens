import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("aisenlensDesktop", {
  platform: process.platform,
});
