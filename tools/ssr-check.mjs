/**
 * 渲染自检：用 @vue/server-renderer 把 App.vue 真正渲染成 HTML，
 * 校验课程条数、学期分组、GPA 数值是否正确。
 * 运行：node tools/ssr-check.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';

const require = createRequire(import.meta.url);
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');

// ---- 浏览器环境垫片（页面里用到 localStorage / crypto.randomUUID） ----
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const source = readFileSync('src/App.vue', 'utf8');
const { descriptor } = parse(source, { filename: 'App.vue' });
const script = compileScript(descriptor, { id: 'ssrcheck' });
const template = compileTemplate({
  source: descriptor.template.content,
  filename: 'App.vue',
  id: 'ssrcheck',
  ssr: true,
  ssrCssVars: [],
  compilerOptions: { bindingMetadata: script.bindings },
});

// SSR 版渲染函数：去掉编译器加的 import 包裹，只保留函数体
const renderBody = template.code
  .replace(/^import[\s\S]*?from\s*"vue\/server-renderer"\s*;?/m, '')
  .replace(/export function ssrRender/, 'function ssrRender');

// 渲染函数用到的 vue / server-renderer 辅助函数
const vueRuntimeNames = [
  'createElementBlock',
  'createElementVNode',
  'createTextVNode',
  'createCommentVNode',
  'toDisplayString',
  'renderList',
  'openBlock',
  'Fragment',
  'normalizeClass',
  'vModelText',
  'vModelSelect',
  'vModelCheckbox',
  'withDirectives',
  'withModifiers',
  'resolveDirective',
  'createBlock',
  'withCtx',
  'createSlots',
  'guardReactiveProps',
  'toHandlers',
  'renderSlot',
  'mergeProps',
];
const ssrRuntimeNames = [
  'ssrRenderComponent',
  'ssrRenderAttrs',
  'ssrRenderClass',
  'ssrRenderStyle',
  'ssrRenderAttr',
  'ssrRenderList',
  'ssrInterpolate',
  'ssrIncludeBooleanAttr',
  'ssrLooseContain',
  'ssrLooseEqual',
  'ssrRenderSlot',
  'ssrRenderDynamicAttr',
];

// 把模板渲染函数拼到组件脚本后面，并补上 vue 运行时导入
mkdirSync('tools/.ssr', { recursive: true });
const componentPath = 'tools/.ssr/App.mjs';
const componentUrl = pathToFileURL(componentPath).href;

// 把 vue 运行时函数名补进脚本里的 `import { ... } from 'vue'`
const scriptCode = script.content
  .split('\n')
  .map((line) =>
    /^import\s*\{[^}]*\}\s*from\s*'vue';?$/.test(line)
      ? line.replace(
          /^import\s*\{([^}]*)\}\s*from\s*'vue';?$/,
          (match, names) =>
            `import {${names}, ${vueRuntimeNames.map((name) => `${name} as _${name}`).join(', ')} } from 'vue';`,
        )
      : line,
  )
  .join('\n')
  .replace(/^export default \{$/m, 'const __sfc__ = {')
  .replace(/^export default \/\*@__PURE__\*\/_sfc_main;?$/m, '')
  .replace(/^export default _sfc_main;?$/m, '')
  .replace(/^export default __sfc__;?$/m, '');

const composed = [
  `import { ${ssrRuntimeNames.map((name) => `${name} as _${name}`).join(', ')} } from 'vue/server-renderer';`,
  scriptCode,
  renderBody,
  'const __component = { ...__sfc__, ssrRender };',
  'export default __component;',
].join('\n');

const fixed = composed
  .replace(/from '\.\/courseData\.js'/g, "from '../../src/courseData.js'")
  .replace(/from '\.\/courseModel\.js'/g, "from '../../src/courseModel.js'")
  .replace(/from '\.\/framework\.js'/g, "from '../../src/framework.js'");
writeFileSync(componentPath, fixed, 'utf8');
writeFileSync('tools/.ssr/composed.mjs', fixed, 'utf8');
console.log('component written, bytes:', fixed.length);

const { default: App } = await import(componentUrl);
const app = createSSRApp(App);
const html = await renderToString(app);

rmSync('tools/.ssr', { recursive: true, force: true });

// ---- 断言 ----
const checks = [];
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  checks.push({ ok, name, actual, expected });
};

const countMatches = (pattern) => (html.match(pattern) ?? []).length;

check('学期分组数量（8 个学期，无自定义课程分组）', countMatches(/class="group-head"/g), 8);
check('课程行数量', countMatches(/class="cell-check"/g), 65);
check('含概率统计A', html.includes('概率统计A'), true);
check('含基础物理实验（1）', html.includes('基础物理实验（1）'), true);
check('含基础物理实验（2）', html.includes('基础物理实验（2）'), true);
check('含软件工程伦理与职业规范', html.includes('软件工程伦理与职业规范'), true);
check('含学科前沿讲座', html.includes('学科前沿讲座'), true);
check('含开源软件开发导论', html.includes('开源软件开发导论'), true);
check('含英文科技写作', html.includes('英文科技写作（软件工程）'), true);
check('含综合素养课', html.includes('互联网软件创新创意创业'), true);
check('含一般专业必修课', html.includes('计算机硬件基础（软件专业）'), true);
check('框架项数量', countMatches(/framework-label/g), 11);
check('初始 GPA 为 0（未填分数）', /gpa-value[^>]*>0</.test(html), true);
check('待填门数提示存在', html.includes('待填'), true);

// 学期分组标题检查
for (const label of ['大一上', '大一下', '大一夏', '大二上', '大二下', '大二夏', '大三上', '大三下']) {
  check(`分组标题 ${label}`, html.includes(label), true);
}

mkdirSync('tools', { recursive: true });
const failed = checks.filter((item) => !item.ok);
const report = [
  `渲染 HTML 长度：${html.length}`,
  '',
  ...checks.map((item) => `${item.ok ? 'PASS' : 'FAIL'}  ${item.name}  →  ${JSON.stringify(item.actual)}`),
  '',
  failed.length ? `失败 ${failed.length} 项` : '全部通过',
].join('\n');

writeFileSync('tools/ssr-check-result.txt', report, 'utf8');
writeFileSync('tools/ssr-render.html', html, 'utf8');
console.log(report);
if (failed.length) process.exitCode = 1;
