import assert from "node:assert/strict"
import test from "node:test"
import { applyShotCommand } from "../src/features/shot/services/shotCommandService.ts"
import type { ShotRecord } from "../src/features/shot/types.ts"

const shot = (id: string, startFrame: number, endFrame: number): ShotRecord => ({ id, projectId: "p", order: 0, startFrame, endFrame, status: "draft", detection: { source: "manual" }, primaryScreenshotId: null, screenshotIds: [], firstFrameScreenshotId: null, lastFrameScreenshotId: null, revision: 1, structureRevision: 1, lineage: { origin: "manual", parentShotIds: [] }, createdAt: "2026-01-01", updatedAt: "2026-01-01" })

test("move-boundary keeps adjacent half-open ranges", () => {
 const result=applyShotCommand([shot("a",0,10),shot("b",10,20)],{type:"move-boundary",boundaryIndex:0,frame:12})
 assert.equal(result.ok,true); if(!result.ok)return
 assert.deepEqual(result.shots.map(x=>[x.startFrame,x.endFrame]),[[0,12],[12,20]])
})
test("split creates structural lineage without analysis payload",()=>{
 const result=applyShotCommand([shot("a",0,20)],{type:"split",shotId:"a",frame:8,newShotId:"b"})
 assert.equal(result.ok,true); if(!result.ok)return
 assert.deepEqual(result.shots.map(x=>[x.id,x.startFrame,x.endFrame]),[["a",0,8],["b",8,20]])
 assert.equal("analysisFields" in result.shots[1],false)
})
test("merge records both parents",()=>{
 const result=applyShotCommand([shot("a",0,8),shot("b",8,20)],{type:"merge",firstIndex:0})
 assert.equal(result.ok,true); if(!result.ok)return
 assert.deepEqual(result.shots[0].lineage,{origin:"merge",parentShotIds:["a","b"]})
 assert.equal(result.shots[0].endFrame,20)
})
