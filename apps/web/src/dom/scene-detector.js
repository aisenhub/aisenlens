import { createSceneDetector as createFeatureSceneDetector } from '../features/auto-shot/detector.js';

export function createSceneDetector(video, fps, options = {}) {
  return createFeatureSceneDetector(video, fps, {
    ...options,
    createCanvas: () => document.createElement('canvas'),
    waitForFrame: () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  });
}
