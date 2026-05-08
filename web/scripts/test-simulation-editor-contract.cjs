const fs = require("fs");
const path = require("path");

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const editorPath = path.join(
  __dirname,
  "../src/features/simulation/ui/editor/SimulationEditor.tsx",
);
const stylesPath = path.join(
  __dirname,
  "../src/features/simulation/ui/editor/SimulationEditor.module.css",
);

const editor = fs.readFileSync(editorPath, "utf8");
const styles = fs.readFileSync(stylesPath, "utf8");
const page = fs.readFileSync(
  path.join(__dirname, "../app/simulation-v2/page.tsx"),
  "utf8",
);

assertCondition(
  editor.includes("styles.viewportGuard"),
  "Simulation editor must render a viewport guard for narrow screens",
);
assertCondition(
  editor.includes("Конструктор доступен на экранах от 1024 px"),
  "Simulation editor guard must explain the 1024 px minimum in Russian",
);
assertCondition(
  styles.includes("@media (max-width: 1023px)") &&
    styles.includes(".main {\n    display: none;") &&
    styles.includes(".viewportGuard"),
  "Simulation editor CSS must hide the builder and show the guard below 1024 px",
);
assertCondition(
  page.includes("fetchCourses") && page.includes("selectedCourseId"),
  "Simulation page must load courses and pass selectedCourseId to the editor",
);
assertCondition(
  editor.includes("coursePickerOpen") &&
    editor.includes("Привязка к курсу") &&
    editor.includes("/simulation-v2?"),
  "Simulation editor must expose a course binding modal that updates the simulation URL",
);
assertCondition(
  styles.includes(".scopeButton") && styles.includes(".coursePickerModal"),
  "Simulation editor CSS must style the course scope button and picker modal",
);

console.log("Simulation editor contract assertions passed");
