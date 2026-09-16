/**
 * 推免要求最低框架（表 1）的进度统计。
 * 页面与自检脚本共用这里的实现，避免两处逻辑各写一遍。
 */
import { FRAMEWORK } from './courseData.js';

/** 归一化：课程是否属于当前数学分班方案（basicGroup 为 'A' / 'B' / 'AB' / null） */
export const matchesBasicGroup = (basicGroup, plan) =>
  !basicGroup || basicGroup === 'AB' || basicGroup === plan;

/** 取课程学分（无效学分按 0 计） */
const creditOf = (course) => {
  const value = Number(course.credit);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/** 过滤出属于当前分班方案的课程 */
export const activeCourses = (courses, plan) =>
  courses.filter((course) => matchesBasicGroup(course.basicGroup, plan));

/**
 * 计算框架进度。
 * @param {object[]} courses 全部课程（含 counted 勾选状态）
 * @param {string} plan 当前数学分班方案 'A' | 'B'
 * @param {{round?: (value: number, digits?: number) => number}} [options]
 */
export const buildFrameworkProgress = (courses, plan, options = {}) => {
  const round = options.round ?? ((value, digits = 2) => Number(value.toFixed(digits)));
  const active = activeCourses(courses, plan);

  return FRAMEWORK.map((requirement) => {
    // 框架归属由 ids 决定；基础课两套分班方案由 active 过滤（basicGroup）处理：
    // 「数理基础课 6 门」= 本方案的 5 门数理课 + 概率统计 A（M 组，两方案共用）；
    // 「工程基础课 4 门」= AB 组，与分班方案无关。
    const members = active.filter(
      (course) =>
        course.group &&
        requirement.ids.includes(course.group) &&
        (!requirement.electivesOnly || course.elective),
    );
    const picked = members.filter((course) => course.counted);

    const value =
      requirement.kind === 'credits'
        ? picked.reduce((sum, course) => sum + creditOf(course), 0)
        : picked.length;

    return {
      ...requirement,
      value,
      ok: value >= requirement.min,
      valueText:
        requirement.kind === 'credits'
          ? `${round(value, 1)} / ${requirement.min} 学分`
          : `${value} / ${requirement.min} 门`,
    };
  });
};
