import type {
  AnalysisProfileFieldUsage,
  AnalysisProfileSection,
  FieldDefinitionSnapshot,
  FieldInteractionPolicy,
  FieldOption,
  FieldSurfaceSettings,
  ProjectAnalysisProfileSnapshot,
  TemplateFieldKind,
  TemplateReferenceTerm,
} from "../types.ts"

export interface SystemAnalysisProfileDefinition {
  id: string
  version: number
  name: string
  description: string
  fieldIds: string[]
}

const surfaceDefaults: FieldSurfaceSettings = {
  visible: true,
  widget: "chips",
  density: "normal",
  showDescription: true,
  showReferenceTerms: true,
}

const interactionDefaults: FieldInteractionPolicy = {
  allowQuickEntry: true,
  allowCopyPrevious: true,
  allowBatchEdit: true,
  evidencePolicy: "optional",
}

function option(id: string, label: string, retired = false): FieldOption {
  return { id, label, retired }
}

function refs(values: Array<[string, string]>): TemplateReferenceTerm[] {
  return values.map(([label, hint]) => ({ label, hint }))
}

function definition(input: Omit<FieldDefinitionSnapshot, "definitionVersion" | "origin" | "scope"> & { origin?: FieldDefinitionSnapshot["origin"]; definitionVersion?: number }): FieldDefinitionSnapshot {
  return {
    definitionVersion: input.definitionVersion ?? 1,
    origin: input.origin ?? "system",
    scope: "shot",
    ...input,
  }
}

const registryDefinitions: FieldDefinitionSnapshot[] = [
  definition({
    fieldId: "shot_description",
    semanticKey: "observation.visual_description",
    label: "画面内容",
    description: "记录你在画面中实际看到的内容；这是事实描述，不替代解释笔记。",
    kind: "text",
    options: [],
    referenceTerms: [],
    allowsNotApplicable: false,
    guidance: {
      observationTarget: "主体、空间、动作与代表性画面状态",
      selectionRule: "用可被另一位观察者复述的事实描述，避免直接写意图判断。",
      example: "女孩站在车站月台边，远处列车驶过，画面保持中远景。",
      counterExample: "导演想表达她的孤独。",
      unknownRule: "事实文本没有单独的待判断状态；暂时留空并在笔记中记录局限。",
      notApplicableRule: "固定画面描述字段始终适用于镜头。",
    },
  }),
  definition({
    fieldId: "shot",
    semanticKey: "camera.shot_size",
    label: "景别",
    description: "以主要主体的代表性时刻判断景别；显著变化写入笔记。",
    kind: "single-select",
    options: [
      option("shot.extreme-wide", "大远景"), option("shot.wide", "远景"), option("shot.full", "全景"),
      option("shot.medium", "中景"), option("shot.medium-close", "近景"), option("shot.close", "特写"), option("shot.extreme-close", "大特写"),
    ],
    referenceTerms: refs([["大远景", "环境压过主体，建立空间关系"], ["远景", "人物作为环境的一部分"], ["全景", "完整主体与动作清晰可辨"], ["中景", "常用于人物互动与叙事交流"], ["近景", "表情和情绪细节更突出"], ["特写", "局部特征被强调"], ["大特写", "极端聚焦，信息范围最窄"]]),
    allowsNotApplicable: true,
    guidance: {
      observationTarget: "画面主要主体与其占据的画面范围",
      selectionRule: "选择最能代表镜头主体关系的景别，不按短暂过渡帧切换标签。",
      example: "人物面部占据画面大部分，选择特写。",
      counterExample: "只因为镜头中出现过一帧近景就认为整镜是近景。",
      unknownRule: "主体持续变化或无法判断时选择待判断。",
      notApplicableRule: "无可辨识主体或纯抽象画面时可选择不适用。",
    },
  }),
  definition({
    fieldId: "motion",
    semanticKey: "camera.movement",
    label: "运镜",
    description: "记录主要运镜方式；复合变化可在笔记中补充，不宣称完整轨迹。",
    kind: "single-select",
    options: [option("motion.static", "固定"), option("motion.push", "推镜"), option("motion.pull", "拉镜"), option("motion.pan", "摇镜"), option("motion.track", "移镜"), option("motion.follow", "跟镜"), option("motion.crane", "升降")],
    referenceTerms: refs([["固定", "摄影机位置基本稳定"], ["推镜", "向主体靠近"], ["拉镜", "远离主体并揭示空间"], ["摇镜", "绕固定支点水平或垂直转动"], ["移镜", "摄影机整体在空间中移动"], ["跟镜", "持续跟随主体运动"], ["升降", "摄影机沿垂直方向移动"]]),
    allowsNotApplicable: true,
    guidance: {
      observationTarget: "摄影机相对主体和空间的主要运动",
      selectionRule: "选择占主要时长或最有叙事作用的运动；复杂运动写笔记。",
      example: "摄影机平稳跟随人物穿过走廊，选择跟镜。",
      counterExample: "把人物自己移动误标为摄影机移镜。",
      unknownRule: "运动来源或方向不可辨识时选择待判断。",
      notApplicableRule: "无法观察到摄影机运动的静态素材可选择不适用。",
    },
  }),
  definition({
    fieldId: "color",
    semanticKey: "color.dominant_tone",
    label: "色彩印象",
    description: "粗粒度记录画面的主导色彩印象，不是色相、冷暖、饱和度的独立测量。",
    kind: "single-select",
    options: [option("color.cool", "冷蓝调"), option("color.warm", "暖黄调"), option("color.neutral", "中性"), option("color.saturated", "高饱和"), option("color.desaturated", "脱色"), option("color.green", "绿调"), option("color.red", "红调")],
    referenceTerms: refs([["冷蓝调", "整体观感偏冷、疏离或克制"], ["暖黄调", "整体观感偏暖、亲密或怀旧"], ["中性", "色彩不明显偏向单一色调"], ["高饱和", "颜色鲜明、视觉刺激强"], ["脱色", "颜色被压低，趋向灰度"], ["绿调", "绿色成为显著主导印象"], ["红调", "红色成为显著主导印象"]]),
    allowsNotApplicable: true,
    guidance: {
      observationTarget: "整镜的主导视觉色彩观感",
      selectionRule: "记录主导印象，不把单个道具或局部灯光当作整镜色彩。",
      example: "整镜低饱和、偏灰，选择脱色。",
      counterExample: "仅因画面出现红色物体就选择红调。",
      unknownRule: "色彩条件不足或变化互相抵消时选择待判断。",
      notApplicableRule: "纯黑白或无法辨识色彩的片段可选择不适用。",
    },
  }),
  definition({
    fieldId: "sound",
    semanticKey: "audio.design",
    label: "声音概况",
    description: "记录主要听觉组织印象，不是完整声音元素或叙事关系的互斥分类。",
    kind: "single-select",
    options: [option("sound.sync", "同期声"), option("sound.voiceover", "旁白"), option("sound.music", "音乐主导"), option("sound.silence", "静默"), option("sound.mixed", "混合")],
    referenceTerms: refs([["同期声", "现场环境与人物声音承担主要感知"], ["旁白", "画外人声提供叙事引导"], ["音乐主导", "音乐显著塑造节奏或情绪"], ["静默", "主动的声音留白或低声场"], ["混合", "多种声音层共同承担作用"]]),
    allowsNotApplicable: true,
    guidance: {
      observationTarget: "当前镜头的主要听觉组织方式",
      selectionRule: "选择最能概括主要声音层的印象，细分元素写入笔记。",
      example: "对白与现场环境主导，选择同期声。",
      counterExample: "听到一段音乐就忽略对白和环境声，直接选择音乐主导。",
      unknownRule: "没有可用音轨或无法判断层次时选择待判断。",
      notApplicableRule: "无音频且项目明确标记为静音观察时可选择不适用。",
    },
  }),
  definition({
    fieldId: "rhythm",
    semanticKey: "editing.rhythm",
    label: "节奏感受",
    description: "结合前后镜头记录主观节奏感受，不等同于镜长或客观剪辑速率。",
    kind: "single-select",
    options: [option("rhythm.urgent", "急促"), option("rhythm.moderate", "中速"), option("rhythm.slow", "舒缓"), option("rhythm.breathing", "呼吸")],
    referenceTerms: refs([["急促", "切换和动作带来紧迫感"], ["中速", "信息推进平稳"], ["舒缓", "停留和变化较少，偏沉思"], ["呼吸", "节奏有自然起伏与停顿"]]),
    allowsNotApplicable: true,
    guidance: {
      observationTarget: "镜头与前后镜头共同形成的剪辑节奏感",
      selectionRule: "结合上下文选择感受，不直接用单镜时长替代判断。",
      example: "连续短切和动作叠加造成紧张推进，选择急促。",
      counterExample: "仅凭一个长镜头就判定整段节奏舒缓。",
      unknownRule: "缺少上下文或节奏无法辨识时选择待判断。",
      notApplicableRule: "孤立静帧或没有可用剪辑上下文时可选择不适用。",
    },
  }),
]

export const SYSTEM_FIELD_REGISTRY: readonly FieldDefinitionSnapshot[] = registryDefinitions

export const SYSTEM_ANALYSIS_PROFILES: readonly SystemAnalysisProfileDefinition[] = [
  { id: "system.quick-review", version: 1, name: "快速拉片", description: "先记录画面范围与节奏，适合快速建立全片观察底稿。", fieldIds: ["shot_description", "shot", "rhythm"] },
  { id: "system.film-basic", version: 1, name: "影视基础观察", description: "覆盖画面、运镜、色彩、声音和节奏五个基础观察维度。", fieldIds: registryDefinitions.map((item) => item.fieldId) },
  { id: "system.cinematography-basic", version: 1, name: "摄影基础观察", description: "集中记录画面、景别、运镜和色彩印象，不延伸到未开放的专业 taxonomy。", fieldIds: ["shot_description", "shot", "motion", "color"] },
  { id: "system.editing-basic", version: 1, name: "剪辑与声音初记", description: "记录画面、节奏和声音概况，为后续研究保留真实笔记入口。", fieldIds: ["shot_description", "rhythm", "sound"] },
]

export function getSystemFieldDefinition(fieldId: string): FieldDefinitionSnapshot | undefined {
  const field = SYSTEM_FIELD_REGISTRY.find((item) => item.fieldId === fieldId)
  return field ? structuredClone(field) : undefined
}

export function getSystemProfile(profileId: string): SystemAnalysisProfileDefinition | undefined {
  return SYSTEM_ANALYSIS_PROFILES.find((profile) => profile.id === profileId)
}

function surfaceFor(kind: TemplateFieldKind): FieldSurfaceSettings {
  return {
    ...surfaceDefaults,
    widget: kind === "text" ? "textarea" : kind === "multi-select" ? "multi-chips" : kind === "number" ? "number" : kind === "boolean" ? "boolean" : "chips",
  }
}

function usageFor(definitionValue: FieldDefinitionSnapshot, order: number, sectionId: string): AnalysisProfileFieldUsage {
  return {
    fieldId: definitionValue.fieldId,
    sectionId,
    order,
    required: false,
    core: definitionValue.fieldId === "shot_description" || order < 3,
    presentation: {
      detail_panel: surfaceFor(definitionValue.kind),
      shot_table: { ...surfaceFor(definitionValue.kind), density: "compact", showDescription: false, showReferenceTerms: false },
      focus_mode: surfaceFor(definitionValue.kind),
      report: { ...surfaceFor(definitionValue.kind), showDescription: false, showReferenceTerms: false },
    },
    interaction: { ...interactionDefaults },
  }
}

export function createSystemProfileSnapshot(projectId: string, profileId = "system.film-basic"): ProjectAnalysisProfileSnapshot {
  const source = getSystemProfile(profileId) ?? getSystemProfile("system.film-basic")!
  const now = new Date().toISOString()
  const fieldDefinitions = source.fieldIds.map((fieldId) => getSystemFieldDefinition(fieldId)).filter((item): item is FieldDefinitionSnapshot => Boolean(item))
  const sections: AnalysisProfileSection[] = [{ id: "observations", label: "基础观察", order: 0, defaultExpanded: true }]
  const fieldUsages = fieldDefinitions.map((field, order) => usageFor(field, order, "observations"))
  return {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    projectId,
    name: source.name,
    version: 1,
    sourceProfile: { id: source.id, version: source.version },
    fieldDefinitions,
    sections,
    fieldUsages,
    createdAt: now,
    updatedAt: now,
  }
}

export function createProfileDraftFromSystemProfile(current: ProjectAnalysisProfileSnapshot, profileId: string): ProjectAnalysisProfileSnapshot {
  const systemDefinition = getSystemProfile(profileId)
  if (!systemDefinition) throw new Error("找不到所选分析任务。")
  const systemProfile = createSystemProfileSnapshot(current.projectId, profileId)
  const currentDefinitions = new Map(current.fieldDefinitions.map((definition) => [definition.fieldId, definition]))
  const definitions = systemProfile.fieldDefinitions.map((definition) => currentDefinitions.get(definition.fieldId) ?? structuredClone(definition))
  current.fieldDefinitions.forEach((definition) => {
    if (definition.origin === "project" && !definitions.some((item) => item.fieldId === definition.fieldId)) definitions.push(structuredClone(definition))
  })
  const systemUsageIds = new Set(systemProfile.fieldUsages.map((usage) => usage.fieldId))
  const customUsages = current.fieldUsages.filter((usage) => !systemUsageIds.has(usage.fieldId) && currentDefinitions.get(usage.fieldId)?.origin === "project")
  const usages = [...systemProfile.fieldUsages.map((usage) => structuredClone(usage)), ...customUsages.map((usage) => structuredClone(usage))]
    .filter((usage, index, all) => all.findIndex((candidate) => candidate.fieldId === usage.fieldId) === index)
    .map((usage, order) => ({ ...usage, order }))
  return {
    ...structuredClone(current),
    name: systemDefinition.name,
    sourceProfile: { id: systemDefinition.id, version: systemDefinition.version },
    fieldDefinitions: definitions,
    sections: structuredClone(systemProfile.sections),
    fieldUsages: usages,
  }
}

export function createProjectFieldDefinition(projectId: string, fieldId: string, input: Pick<FieldDefinitionSnapshot, "label" | "description" | "kind" | "options" | "referenceTerms" | "allowsNotApplicable">): FieldDefinitionSnapshot {
  return {
    fieldId,
    definitionVersion: 1,
    origin: "project",
    semanticKey: `project.${projectId}.field.${fieldId}`,
    scope: "shot",
    ...input,
  }
}
