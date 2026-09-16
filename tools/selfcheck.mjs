/**
 * 本地自检：校验基础数据集、绩点换算、框架统计与 SFC 模板编译。
 * 运行：node tools/selfcheck.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ---- SFC 编译（等价于 @vitejs/plugin-vue 的模板/脚本编译） ----
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const source = readFileSync('src/App.vue', 'utf8');
const { descriptor, errors } = parse(source, { filename: 'App.vue' });
if (errors.length) {
  console.error('SFC 解析失败:', errors);
  process.exitCode = 1;
}

const scriptResult = compileScript(descriptor, { id: 'selfcheck' });
const templateResult = compileTemplate({
  source: descriptor.template.content,
  filename: 'App.vue',
  id: 'selfcheck',
  compilerOptions: { bindingMetadata: scriptResult.bindings },
});
if (templateResult.errors.length) {
  console.error('模板编译失败:', templateResult.errors);
  process.exitCode = 1;
}

// ---- 数据与换算自检 ----
const { BASE_COURSES, SEMESTERS } = await import('../src/courseData.js');
const { percentageToGpa, getCourseGpa, round } = await import('../src/courseModel.js');
const { buildFrameworkProgress } = await import('../src/framework.js');

const checks = [];
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  checks.push({ ok, name, actual, expected });
};

// 公式关键点：100 → 4，60 → 1，60 以下 → 0
check('100 分绩点', round(percentageToGpa(100), 4), 4);
check('60 分绩点', round(percentageToGpa(60), 4), 1);
check('59 分绩点', percentageToGpa(59), 0);
check('90 分绩点', round(percentageToGpa(90), 4), 3.8125);
check('空值待填', percentageToGpa(''), null);
check('五级制良好', getCourseGpa({ type: 'level', level: 'good' }), 3.5);
check('五级制中等', getCourseGpa({ type: 'level', level: 'medium' }), 2.8);
check('五级制及格', getCourseGpa({ type: 'level', level: 'pass' }), 1.7);
check('五级制不及格', getCourseGpa({ type: 'level', level: 'fail' }), 0);
check('考查课不计入', getCourseGpa({ type: 'passfail' }), null);

// 课程代码唯一（同一门课只出现一次）
const codes = BASE_COURSES.map((course) => course.code);
const duplicated = codes.filter((code, index) => codes.indexOf(code) !== index);
check('课程代码唯一', duplicated, []);

// 每门课都有学期、学分、成绩类型
const broken = BASE_COURSES.filter(
  (course) =>
    !course.name ||
    !SEMESTERS.some((item) => item.key === course.semester) ||
    !(Number(course.credit) > 0) ||
    !['percentage', 'level', 'passfail'].includes(course.type),
);
check('课程字段完整', broken.map((course) => course.name), []);

// 框架统计：直接复用页面使用的实现（src/framework.js）
const summarize = (group) =>
  buildFrameworkProgress(BASE_COURSES, group, { round }).map((item) => ({
    key: item.key,
    value: item.value,
    min: item.min,
    ok: item.ok,
  }));

const planA = summarize('A');
const planB = summarize('B');
const notOk = (plan) => plan.filter((item) => !item.ok).map((item) => item.key);
check('A 方案基础课达标（仅方向课/一般专业必修待选）', notOk(planA), ['G', 'F']);
check('B 方案基础课达标（仅方向课/一般专业必修待选）', notOk(planB), ['G', 'F']);
check(
  'A 方案数理基础课门数',
  planA.find((item) => item.key === 'A').value,
  6,
);
check(
  'B 方案数理基础课门数',
  planB.find((item) => item.key === 'A').value,
  6,
);
check(
  'A 方案工程基础课门数',
  planA.find((item) => item.key === 'B').value,
  4,
);
check(
  'B 方案工程基础课门数',
  planB.find((item) => item.key === 'B').value,
  4,
);

// 默认（A 方案 + 全部方向课）整体 GPA
const includeAll = (group) =>
  BASE_COURSES.filter(
    (course) =>
      (!course.basicGroup || course.basicGroup === 'AB' || course.basicGroup === group) &&
      course.counted &&
      course.group !== 'G',
  );
const sampleGpa = (group) => {
  const rows = includeAll(group).map((course) => ({
    credit: Number(course.credit),
    gpa: 3.6,
  }));
  const credits = rows.reduce((sum, row) => sum + row.credit, 0);
  return round(rows.reduce((sum, row) => sum + row.gpa * row.credit, 0) / credits, 3);
};
check('A 方案等绩点加权结果', sampleGpa('A'), 3.6);

// 真实加权：90 分（3.8125 绩点，3 学分）+ 80 分（3.25 绩点，1 学分）
const mixRows = [
  { score: 90, credit: 3 },
  { score: 80, credit: 1 },
];
const expectedMix =
  (percentageToGpa(90) * 3 + percentageToGpa(80) * 1) /
  mixRows.reduce((sum, row) => sum + row.credit, 0);
check(
  '混合分数加权平均',
  round(
    mixRows.reduce((sum, row) => sum + percentageToGpa(row.score) * row.credit, 0) /
      mixRows.reduce((sum, row) => sum + row.credit, 0),
    4,
  ),
  round(expectedMix, 4),
);
check('混合分数加权平均值', round(expectedMix, 4), 3.6719);

// ---- 输出 ----
const failed = checks.filter((item) => !item.ok);
const report = [
  `SFC 模板编译：${templateResult.errors.length ? '失败' : '通过'}`,
  `课程条数：${BASE_COURSES.length}`,
  `A 方案默认统计：${planA.map((i) => `${i.key}=${i.value}/${i.min}`).join(' ')}`,
  `B 方案默认统计：${planB.map((i) => `${i.key}=${i.value}/${i.min}`).join(' ')}`,
  '',
  ...checks.map((item) => `${item.ok ? 'PASS' : 'FAIL'}  ${item.name}  →  ${JSON.stringify(item.actual)}`),
  '',
  failed.length ? `失败 ${failed.length} 项` : '全部通过',
].join('\n');

mkdirSync('tools', { recursive: true });
writeFileSync('tools/selfcheck-result.txt', report, 'utf8');
console.log(report);
if (failed.length || templateResult.errors.length) process.exitCode = 1;
