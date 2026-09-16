<script setup>
import { computed, ref, watch } from 'vue';
import {
  BASIC_GROUP_LABELS,
  BASE_COURSES,
  SEMESTERS,
} from './courseData.js';
import { buildFrameworkProgress, matchesBasicGroup } from './framework.js';
import {
  GRADE_LEVELS,
  GRADE_TYPES,
  PASS_STATES,
  createCourse,
  getCourseGpa,
  hasGrade,
  percentageToGpa,
  round,
} from './courseModel.js';

const CUSTOM_SEMESTER = '__custom__';
const STORAGE_KEY = 'gpa-vue3:software-2024';

const semesterOrder = [...SEMESTERS.map((item) => item.key), CUSTOM_SEMESTER];
const semesterLabels = Object.fromEntries(SEMESTERS.map((item) => [item.key, item.label]));
semesterLabels[CUSTOM_SEMESTER] = '自定义课程';

const formatCredit = (credit) => String(Number(credit));

const createBaseCourses = () => BASE_COURSES.map((course) => createCourse({ ...course }));

const cloneCourses = (source) =>
  source.map((course) => createCourse({ ...course }));

/** 从 localStorage 读取上次填写的数据（无数据或数据损坏时回退到基础数据集） */
const loadCourses = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createBaseCourses();

    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.courses) || parsed.courses.length === 0) {
      return createBaseCourses();
    }

    return cloneCourses(parsed.courses);
  } catch {
    return createBaseCourses();
  }
};

const loadBasicGroup = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return 'auto';

    const value = JSON.parse(saved)?.basicGroup;
    return value && BASIC_GROUP_LABELS[value] ? value : 'auto';
  } catch {
    return 'auto';
  }
};

const courses = ref(loadCourses());
const basicGroup = ref(loadBasicGroup());

/** 基础课数学分班方案：未手选时自动选择能匹配更多课程的一套 */
const resolvedBasicGroup = computed(() => {
  if (basicGroup.value !== 'auto') return basicGroup.value;

  const scoreOf = (group) =>
    courses.value.filter((course) => course.basicGroup === group).length;

  return scoreOf('B') > scoreOf('A') ? 'B' : 'A';
});

/** 每门课程的展示数据 + 框架进度 + 合计，统一在这里算一次 */
const summary = computed(() => {
  const group = resolvedBasicGroup.value;

  const rows = courses.value.map((course) => {
    const matched = matchesBasicGroup(course.basicGroup, group);
    const gpa = matched ? getCourseGpa(course) : null;
    const creditValue = Number(course.credit);
    const creditValid = Number.isFinite(creditValue) && creditValue > 0;
    const filled = matched && hasGrade(course);
    // 是否勾选计入（与是否已填分数无关，用于提示「将计入的学分」）
    const counted = matched && course.counted && creditValid;
    // 实际参与 GPA 计算（需已填分数且换算得出绩点，考查课不计入）
    const included = counted && gpa !== null;

    return {
      ...course,
      matched,
      filled,
      counted,
      included,
      gpa,
      creditValue,
      creditValid,
      creditText: formatCredit(course.credit),
      singleGpa: gpa === null ? null : round(gpa),
    };
  });

  const activeRows = rows.filter((row) => row.matched);
  const countedRows = rows.filter((row) => row.counted);
  const includedRows = rows.filter((row) => row.included);

  const framework = buildFrameworkProgress(courses.value, group, { round });
  const groups = semesterOrder
    .map((key) => {
      const groupRows = rows.filter((course) => course.semester === key);
      const countedInGroup = groupRows.filter((row) => row.counted);
      return {
        key,
        label: semesterLabels[key],
        rows: groupRows,
        filled: groupRows.filter((row) => row.filled).length,
        counted: countedInGroup.length,
        credit: countedInGroup.reduce((sum, row) => sum + row.creditValue, 0),
      };
    })
    .filter((groupItem) => groupItem.rows.length > 0);

  const filledRows = activeRows.filter((row) => row.filled);
  const totalCredits = includedRows.reduce((sum, row) => sum + row.creditValue, 0);
  const totalPoints = includedRows.reduce((sum, row) => sum + row.gpa * row.creditValue, 0);
  const pending = activeRows.filter(
    (row) => row.counted && row.gpa === null && row.type === 'percentage',
  );

  return {
    rows,
    groups,
    framework,
    filledCount: filledRows.length,
    activeCount: activeRows.length,
    countedCount: countedRows.length,
    countedCredit: countedRows.reduce((sum, row) => sum + row.creditValue, 0),
    gradedCount: includedRows.length,
    gradedCredit: totalCredits,
    pendingCount: pending.length,
    weightedGpa: totalCredits === 0 ? 0 : totalPoints / totalCredits,
  };
});

const directionCourses = computed(() =>
  courses.value.filter((course) => course.group === 'G'),
);
const allDirectionsCounted = computed(
  () =>
    directionCourses.value.length > 0 &&
    directionCourses.value.every((course) => course.counted),
);
const requiredGroups = computed(() =>
  summary.value.framework.filter((item) => !item.passOnly),
);
const requiredOk = computed(() => requiredGroups.value.filter((item) => item.ok).length);

const addCourse = () => {
  courses.value.push(
    createCourse({
      name: '自定义课程',
      credit: 2,
      semester: CUSTOM_SEMESTER,
      type: 'percentage',
      counted: true,
    }),
  );
};

const removeCourse = (id) => {
  courses.value = courses.value.filter((course) => course.id !== id);
};

const toggleAllDirections = () => {
  const next = !allDirectionsCounted.value;
  courses.value = courses.value.map((course) =>
    course.group === 'G' ? { ...course, counted: next } : course,
  );
};

const resetAll = () => {
  courses.value = createBaseCourses();
  basicGroup.value = 'auto';
};

/** 每次改动都保存到 localStorage，刷新页面不丢数据 */
watch(
  [courses, basicGroup],
  () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          basicGroup: basicGroup.value,
          courses: courses.value.map(({ id, ...rest }) => rest),
        }),
      );
    } catch {
      /* 隐私模式等场景下忽略存储失败 */
    }
  },
  { deep: true },
);
</script>

<template>
  <main class="app-shell">
    <header class="hero">
      <p class="eyebrow">2024 级 · 软件工程 · 推免平均学分绩点</p>
      <h1>推免 GPA 计算器</h1>
      <p class="hero-note">
        课程清单来自《软件学院推荐优秀应届本科毕业生免试攻读研究生的平均学分绩点成绩规则说明（适用
        2024 级）》表 1、表 2，直接填入百分制分数即可实时得到平均学分绩点。
      </p>
    </header>

    <section class="result-panel" aria-label="最终计算结果">
      <div>
        <p class="eyebrow">最终 GPA</p>
        <h2 class="gpa-value">{{ round(summary.weightedGpa) }}</h2>
        <p class="result-caption">
          课程绩点 = 4 - 3(100 - X)² / 1600，按学分加权平均
        </p>
      </div>

      <div class="result-meta">
        <span>已填成绩 {{ summary.filledCount }} / {{ summary.activeCount }} 门</span>
        <span>
          计入 {{ summary.countedCount }} 门 · {{ round(summary.countedCredit, 1) }} 学分
        </span>
        <span>已算出成绩 {{ summary.gradedCount }} 门 · {{ round(summary.gradedCredit, 1) }} 学分</span>
        <span :class="{ 'is-warn': summary.pendingCount > 0 }">
          待填 {{ summary.pendingCount }} 门
        </span>
        <span :class="requiredOk === requiredGroups.length ? 'is-ok' : 'is-warn'">
          框架达标 {{ requiredOk }} / {{ requiredGroups.length }} 项
        </span>
      </div>
    </section>

    <section class="settings-bar" aria-label="计算设置">
      <label class="field">
        <span>基础课数学分班方案（A / B 二选一，按本人实际修读的数学课选择）</span>
        <select v-model="basicGroup">
          <option value="auto">
            {{ BASIC_GROUP_LABELS.auto }}（当前按方案 {{ resolvedBasicGroup }} 统计）
          </option>
          <option value="A">{{ BASIC_GROUP_LABELS.A }}</option>
          <option value="B">{{ BASIC_GROUP_LABELS.B }}</option>
        </select>
      </label>

      <div class="settings-actions">
        <button type="button" class="ghost-button" @click="toggleAllDirections">
          {{ allDirectionsCounted ? '取消全部方向课' : '计入全部方向课' }}
        </button>
        <button type="button" class="ghost-button danger" @click="resetAll">
          清空并恢复默认
        </button>
      </div>
    </section>

    <section class="split">
      <div class="toolbar">
        <h2>课程列表</h2>
        <button type="button" class="primary-button" @click="addCourse">
          <span aria-hidden="true">+</span>
          添加课程
        </button>
      </div>

      <aside class="framework-panel" aria-label="推免要求最低框架">
        <h2>推免框架进度</h2>
        <ul>
          <li v-for="item in summary.framework" :key="item.key" :class="{ ok: item.ok }">
            <span class="framework-dot" aria-hidden="true">{{ item.ok ? '✓' : '·' }}</span>
            <span class="framework-label">{{ item.label }}</span>
            <span class="framework-value">{{ item.valueText }}</span>
            <span class="framework-tag">{{ item.passOnly ? '仅需通过' : item.ok ? '已达标' : '未达标' }}</span>
          </li>
        </ul>
        <p class="framework-note">
          综合素养课与一般专业必修课要求通过课程考核，但不纳入分数计算。
        </p>
      </aside>
    </section>

    <section class="course-table" aria-label="课程列表">
      <table>
        <thead>
          <tr>
            <th scope="col">课程名称 / 代码</th>
            <th scope="col">成绩类型</th>
            <th scope="col">成绩</th>
            <th scope="col">学分</th>
            <th scope="col">单课绩点</th>
            <th scope="col" title="是否计入平均学分绩点">计入</th>
            <th scope="col"><span class="sr-only">操作</span></th>
          </tr>
        </thead>

        <tbody v-for="group in summary.groups" :key="group.key">
          <tr class="group-head">
            <th colspan="7" scope="colgroup">
              <span>{{ group.label }}</span>
              <span class="group-meta">
                已填 {{ group.filled }} / {{ group.rows.length }} 门 · 计入
                {{ group.counted }} 门 {{ round(group.credit, 1) }} 学分
              </span>
            </th>
          </tr>

          <tr
            v-for="course in group.rows"
            :key="course.id"
            :class="{ 'is-off': !course.counted || !course.matched }"
          >
            <td class="cell-name">
              <input v-model.trim="course.name" type="text" aria-label="课程名称" />
              <span class="course-meta">
                <code v-if="course.code">{{ course.code }}</code>
                <em v-if="course.elective" class="badge">自行选取</em>
                <em v-if="course.passOnly" class="badge">仅需通过</em>
                <em v-if="!course.matched" class="badge warn">{{ course.basicGroup }} 方案课程</em>
              </span>
            </td>

            <td>
              <select v-model="course.type" aria-label="成绩类型">
                <option v-for="type in GRADE_TYPES" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </td>

            <td>
              <input
                v-if="course.type === 'percentage'"
                v-model="course.score"
                type="number"
                min="0"
                max="100"
                step="0.1"
                inputmode="decimal"
                placeholder="填分数"
                aria-label="百分制成绩"
              />
              <select v-else-if="course.type === 'level'" v-model="course.level" aria-label="五级制成绩">
                <option v-for="level in GRADE_LEVELS" :key="level.value" :value="level.value">
                  {{ level.label }}
                </option>
              </select>
              <select v-else v-model="course.passState" aria-label="考查课成绩">
                <option v-for="state in PASS_STATES" :key="state.value" :value="state.value">
                  {{ state.label }}
                </option>
              </select>
            </td>

            <td>
              <input
                v-model.number="course.credit"
                type="number"
                min="0"
                step="0.5"
                inputmode="decimal"
                aria-label="学分"
              />
            </td>

            <td>
              <output :class="{ 'is-off': course.singleGpa === null }">
                {{ course.singleGpa === null ? '—' : course.singleGpa }}
              </output>
            </td>

            <td class="cell-check">
              <input
                v-model="course.counted"
                type="checkbox"
                :aria-label="`${course.name} 是否计入平均学分绩点`"
              />
            </td>

            <td class="cell-action">
              <button
                type="button"
                class="icon-button"
                aria-label="删除课程"
                title="删除课程"
                @click="removeCourse(course.id)"
              >
                ×
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>
