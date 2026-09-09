<script setup>
import { computed, ref } from 'vue';

const gradeLevels = [
  { label: '优秀', value: 'excellent', gpa: 4 },
  { label: '良好', value: 'good', gpa: 3.5 },
  { label: '中等', value: 'medium', gpa: 2.8 },
  { label: '及格', value: 'pass', gpa: 1.7 },
  { label: '不及格', value: 'fail', gpa: 0 },
];

const createCourse = (name = '', score = 90, credit = 3) => ({
  id: crypto.randomUUID(),
  name,
  type: 'percentage',
  score,
  level: 'excellent',
  passState: 'passed',
  credit,
});

const courses = ref([
  createCourse('高等数学', 92, 4),
  createCourse('大学英语', 86, 2),
  createCourse('程序设计', 95, 3),
]);

const round = (value, digits = 2) => Number(value.toFixed(digits));

const percentageToGpa = (score) => {
  const value = Number(score);

  if (!Number.isFinite(value)) return 0;
  if (value < 60) return 0;
  if (value > 100) return 4;

  return 4 - (3 * (100 - value) ** 2) / 1600;
};

const getCourseGpa = (course) => {
  if (course.type === 'level') {
    return gradeLevels.find((item) => item.value === course.level)?.gpa ?? 0;
  }

  if (course.type === 'passfail') {
    return null;
  }

  return percentageToGpa(course.score);
};

const countedCourses = computed(() =>
  courses.value
    .map((course) => ({
      ...course,
      gpa: getCourseGpa(course),
      creditValue: Number(course.credit),
    }))
    .filter(
      (course) =>
        course.gpa !== null &&
        Number.isFinite(course.creditValue) &&
        course.creditValue > 0,
    ),
);

const totalCredits = computed(() =>
  countedCourses.value.reduce((sum, course) => sum + course.creditValue, 0),
);

const weightedGpa = computed(() => {
  if (totalCredits.value === 0) return 0;

  const totalPoints = countedCourses.value.reduce(
    (sum, course) => sum + course.gpa * course.creditValue,
    0,
  );

  return totalPoints / totalCredits.value;
});

const courseStats = computed(() => ({
  counted: countedCourses.value.length,
  total: courses.value.length,
}));

const addCourse = () => {
  courses.value.push(createCourse('新课程', 85, 2));
};

const removeCourse = (id) => {
  if (courses.value.length === 1) {
    courses.value = [createCourse('新课程', 85, 2)];
    return;
  }

  courses.value = courses.value.filter((course) => course.id !== id);
};
</script>

<template>
  <main class="app-shell">
    <section class="result-panel" aria-label="最终计算结果">
      <div>
        <p class="eyebrow">最终 GPA</p>
        <h1>{{ round(weightedGpa) }}</h1>
      </div>

      <div class="result-meta">
        <span>{{ round(totalCredits, 1) }} 学分</span>
        <span>{{ courseStats.counted }} / {{ courseStats.total }} 门计入</span>
      </div>
    </section>

    <section class="toolbar" aria-label="课程操作">
      <h2>课程列表</h2>
      <button type="button" class="primary-button" @click="addCourse">
        <span aria-hidden="true">+</span>
        添加课程
      </button>
    </section>

    <section class="course-table" aria-label="课程列表">
      <div class="table-head">
        <span>课程名称</span>
        <span>成绩类型</span>
        <span>成绩</span>
        <span>学分</span>
        <span>单课 GPA</span>
        <span></span>
      </div>

      <div v-for="course in courses" :key="course.id" class="course-row">
        <label>
          <span>课程名称</span>
          <input v-model.trim="course.name" type="text" placeholder="课程名称" />
        </label>

        <label>
          <span>成绩类型</span>
          <select v-model="course.type">
            <option value="percentage">百分制</option>
            <option value="level">五级制</option>
            <option value="passfail">考查课</option>
          </select>
        </label>

        <label v-if="course.type === 'percentage'">
          <span>成绩</span>
          <input
            v-model.number="course.score"
            type="number"
            min="0"
            max="100"
            step="0.1"
            inputmode="decimal"
          />
        </label>

        <label v-else-if="course.type === 'level'">
          <span>成绩</span>
          <select v-model="course.level">
            <option
              v-for="level in gradeLevels"
              :key="level.value"
              :value="level.value"
            >
              {{ level.label }}
            </option>
          </select>
        </label>

        <label v-else>
          <span>成绩</span>
          <select v-model="course.passState">
            <option value="passed">通过</option>
            <option value="failed">不通过</option>
          </select>
        </label>

        <label>
          <span>学分</span>
          <input
            v-model.number="course.credit"
            type="number"
            min="0"
            step="0.5"
            inputmode="decimal"
          />
        </label>

        <output>
          {{
            getCourseGpa(course) === null
              ? '不计入'
              : round(getCourseGpa(course), 2)
          }}
        </output>

        <button
          type="button"
          class="icon-button"
          aria-label="删除课程"
          title="删除课程"
          @click="removeCourse(course.id)"
        >
          ×
        </button>
      </div>
    </section>
  </main>
</template>
