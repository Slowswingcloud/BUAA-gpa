/**
 * 课程数据模型与绩点换算（规则来自《软件学院推免平均学分绩点成绩规则说明（适用 2024 级）》）
 */

/** 五级分制 → 课程绩点：优秀 4 / 良好 3.5 / 中等 2.8 / 及格 1.7 / 不及格 0 */
export const GRADE_LEVELS = [
  { label: '优秀', value: 'excellent', gpa: 4 },
  { label: '良好', value: 'good', gpa: 3.5 },
  { label: '中等', value: 'medium', gpa: 2.8 },
  { label: '及格', value: 'pass', gpa: 1.7 },
  { label: '不及格', value: 'fail', gpa: 0 },
];

/** 两级分制通过 / 不通过（考查课不累计学分绩点） */
export const PASS_STATES = [
  { label: '通过', value: 'passed' },
  { label: '不通过', value: 'failed' },
];

export const GRADE_TYPES = [
  { label: '百分制', value: 'percentage' },
  { label: '五级制', value: 'level' },
  { label: '考查课', value: 'passfail' },
];

export const createCourse = ({
  code = '',
  name = '',
  credit = 0,
  semester = 'y1a',
  module = '',
  group = null,
  basicGroup = null,
  tracks = null,
  gradeType = 'percentage',
  counted = true,
  score = '',
  level = 'excellent',
  passState = 'passed',
  note = '',
  elective = false,
  passOnly = false,
} = {}) => ({
  id: crypto.randomUUID(),
  code,
  name,
  credit,
  semester,
  module,
  group,
  basicGroup,
  tracks,
  elective,
  passOnly,
  note,
  counted,
  type: gradeType,
  score,
  level,
  passState,
});

/**
 * 百分制分数 → 课程绩点：课程绩点 = 4 - 3 (100 - X)² / 1600（60 ≤ X ≤ 100）
 * 100 分绩点为 4，60 分绩点为 1，60 分以下绩点为 0。
 * 尚未填写分数（空值）时返回 null，表示「待填写」，不计入统计。
 */
export const percentageToGpa = (score) => {
  if (score === '' || score === null || score === undefined) return null;

  const value = Number(score);

  if (!Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value < 60) return 0;
  if (value > 100) return 4;

  return 4 - (3 * (100 - value) ** 2) / 1600;
};

export const round = (value, digits = 2) => Number(value.toFixed(digits));

/** 单门课程的绩点；返回 null 表示该课程不计入平均学分绩点 */
export const getCourseGpa = (course) => {
  if (course.type === 'level') {
    return GRADE_LEVELS.find((item) => item.value === course.level)?.gpa ?? 0;
  }

  if (course.type === 'passfail') {
    return null;
  }

  return percentageToGpa(course.score);
};

/** 是否已填写成绩（百分制需填分数，五级制/考查课选择即为填写） */
export const hasGrade = (course) =>
  course.type === 'percentage'
    ? percentageToGpa(course.score) !== null
    : true;
