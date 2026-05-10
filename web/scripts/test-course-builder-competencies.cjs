const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

const dialog = read(
  "src/features/course-builder/ui/competencies/CourseCompetenciesDialog.tsx",
);
const types = read("src/features/course-builder/types.ts");
const api = read("src/features/course-builder/api.ts");
const header = read("src/features/course-builder/ui/CourseBuilderHeader.tsx");

[
  "Компетенции курса",
  "Тип курса",
  "Добавить новую компетенцию",
  "Название компетенции",
].forEach((text) => assertIncludes(dialog, text, "dialog text"));

["Базовый", "Практический", "Дополнительный"].forEach((text) =>
  assertIncludes(types, text, "course type label"),
);

[
  "listCompetencies",
  "createCompetency",
  "listCourseCompetencies",
  "saveCourseCompetencies",
].forEach((name) => assertIncludes(api, name, "course builder API function"));

assertIncludes(header, "CourseCompetenciesDialog", "header dialog wiring");
assertIncludes(header, "Компетенции", "header action");

console.log("course builder competencies contract ok");
