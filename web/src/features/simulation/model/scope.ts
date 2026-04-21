export type SimulationScopeInput = {
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
};

export type SimulationScope = {
  scopeKey: string;
  courseId: string | null;
  moduleId: string | null;
  lessonId: string | null;
  isGlobal: boolean;
};

function normalizePart(value?: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, 120);
}

export function buildSimulationScope(
  input: SimulationScopeInput,
): SimulationScope {
  const courseId = normalizePart(input.courseId);
  const moduleId = normalizePart(input.moduleId);
  const lessonId = normalizePart(input.lessonId);

  const parts: string[] = [];
  if (courseId) {
    parts.push(`course:${courseId}`);
  }
  if (moduleId) {
    parts.push(`module:${moduleId}`);
  }
  if (lessonId) {
    parts.push(`lesson:${lessonId}`);
  }

  const scopeKey = parts.length > 0 ? parts.join("|") : "global";
  return {
    scopeKey,
    courseId,
    moduleId,
    lessonId,
    isGlobal: parts.length === 0,
  };
}
