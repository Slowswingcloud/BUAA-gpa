/**
 * 2024 级软件工程专业 · 推免平均学分绩点基础数据集
 *
 * 数据来源：《软件学院推荐优秀应届本科毕业生免试攻读研究生的平均学分绩点成绩规则说明（适用 2024 级）》
 *   - 表 1 软件工程专业推免要求最低框架
 *   - 表 2 推免课程明细（课程代码 / 中文课程名称 / 学分 / 开课学期 / 课程性质）
 *
 * 字段说明：
 *   code        课程代码
 *   name        中文课程名称
 *   credit      学分（来自表 2「总学分」列）
 *   semester    开课学期 key，见 SEMESTERS
 *   module      所属课程模块（基础课 / 通修课 / 专业课 / 综合素养课）
 *   group       框架组：A 数学分班 A 方案的数理基础课、B 数学分班 B 方案的数理基础课、
 *               M 两套方案均需修读的数理基础课、AB 两套方案均需修读的工程基础课、
 *               C 外语课、D 思政课、E 核心专业类、G 专业方向课（限修）、
 *               H 英文科技写作、I 跨文化交流、J 软件工程伦理与职业规范、
 *               K 学科前沿讲座、F 一般专业必修课（要求通过，不计入绩点）
 *   basicGroup  仅基础课使用：'A' / 'B' 表示只在对应数学分班方案下计入，
 *               'AB' 表示两套方案均计入，null 表示与分班方案无关
 *   tracks      所属数学分班线 ['A'] / ['B'] / ['A', 'B']，非基础课为 null
 *   type        预置成绩类型：percentage 百分制 / level 五级制 / passfail 两级分制
 *   counted     是否默认计入平均学分绩点（false 表示默认不计入，可手动勾选）
 *   elective    是否为「按最低要求自行选取」的课程（外语课、专业方向课）
 *   passOnly    是否只要求通过课程考核、不纳入分数计算
 *   note        备注
 */
import { createCourse } from './courseModel.js';

/** 开课学期顺序与显示名（表 2 中课程按开课时间排列） */
export const SEMESTERS = [
  { key: 'y1a', label: '大一上' },
  { key: 'y1b', label: '大一下' },
  { key: 'y1s', label: '大一夏' },
  { key: 'y2a', label: '大二上' },
  { key: 'y2b', label: '大二下' },
  { key: 'y2s', label: '大二夏' },
  { key: 'y3a', label: '大三上' },
  { key: 'y3b', label: '大三下' },
];

/** 表 1 推免要求最低框架；kind 为 courses 时统计门数，为 credits 时统计学分 */
export const FRAMEWORK = [
  // 「数理基础课 6 门」= 本方案的 5 门数理课 + 概率统计 A（M 组，两方案共用）
  { key: 'A', ids: ['M', 'A', 'B'], kind: 'courses', min: 6, label: '数理基础课' },
  // 「工程基础课 4 门」= AB 组，与分班方案无关
  { key: 'B', ids: ['AB'], kind: 'courses', min: 4, label: '工程基础课' },
  { key: 'C', ids: ['C'], kind: 'credits', min: 6, label: '外语课' },
  { key: 'D', ids: ['D'], kind: 'courses', min: 6, label: '思政课' },
  { key: 'E', ids: ['E'], kind: 'courses', min: 14, label: '核心专业类' },
  {
    key: 'G',
    ids: ['G'],
    kind: 'credits',
    min: 6,
    label: '专业方向课（限修）',
    electivesOnly: true,
  },
  { key: 'H', ids: ['H'], kind: 'courses', min: 1, label: '英文科技写作' },
  { key: 'I', ids: ['I'], kind: 'courses', min: 1, label: '跨文化交流' },
  { key: 'J', ids: ['J'], kind: 'courses', min: 1, label: '软件工程伦理与职业规范' },
  { key: 'K', ids: ['K'], kind: 'courses', min: 1, label: '学科前沿讲座' },
  { key: 'F', ids: ['F'], kind: 'courses', min: 4, label: '一般专业必修课', passOnly: true },
];

/**
 * 课程明细，顺序与表 2 一致。
 * [课程代码, 课程名称, 学分, 学期, 模块, 组, 基础课方案, 成绩类型, 计入, 选修, 仅通过, 所属分班线]
 * 所属分班线仅基础课需要：['A'] / ['B'] / ['A', 'B']，其余课程为 null。
 */
const ROWS = [
  // 数理基础课 · 数学分析 A 方案
  ['B090011021', '工科数学分析（1）', 5, 'y1a', '基础课', 'A', 'A', 'percentage', true, false, false, ['A']],
  ['B090011010', '工科高等代数', 6, 'y1a', '基础课', 'A', 'A', 'percentage', true, false, false, ['A']],
  ['B090011022', '工科数学分析（2）', 5, 'y1b', '基础课', 'A', 'A', 'percentage', true, false, false, ['A']],
  ['B190011004', '基础物理学A（1）', 4, 'y1b', '基础课', 'A', 'A', 'percentage', true, false, false, ['A']],
  ['B190011007', '基础物理实验（1）', 1, 'y2a', '基础课', 'A', 'A', 'percentage', true, false, false, ['A']],
  // 数理基础课 · 工科数学分析 B 方案
  ['B090011019', '工科数学分析（1）', 5, 'y1a', '基础课', 'B', 'B', 'percentage', true, false, false, ['B']],
  ['B090011020', '工科数学分析（2）', 5, 'y1b', '基础课', 'B', 'B', 'percentage', true, false, false, ['B']],
  ['B190011005', '基础物理学（1）', 4, 'y1b', '基础课', 'B', 'B', 'percentage', true, false, false, ['B']],
  ['B190011006', '基础物理学（2）', 4, 'y2a', '基础课', 'B', 'B', 'percentage', true, false, false, ['B']],
  ['B190011008', '基础物理实验（2）', 1, 'y2a', '基础课', 'B', 'B', 'percentage', true, false, false, ['B']],
  // 数理基础课 · 两套方案均需修读（M 组）
  ['B090011018', '概率统计A', 3, 'y2a', '基础课', 'M', null, 'percentage', true],
  // 工程基础课（4 门，两套方案均需修读）
  ['B370012005', '程序设计基础', 2, 'y1a', '基础课', 'AB', null, 'percentage', true],
  ['B020012001', '电子设计基础训练', 2, 'y1b', '基础课', 'AB', null, 'percentage', true],
  ['B060012004', '离散数学（信息类）', 2, 'y1b', '基础课', 'AB', null, 'percentage', true],
  ['B060012005', '数据结构与程序设计（信息类）', 3, 'y1b', '基础课', 'AB', null, 'percentage', true],
  // 外语课（C 组，要求 ≥6 学分，可自行取舍）
  ['B120013001', '大学英语 A（1）', 2, 'y1a', '通修课', 'C', null, 'percentage', true, true],
  ['B120013002', '大学英语 A（2）', 2, 'y1b', '通修课', 'C', null, 'percentage', true, true],
  ['B120013003', '大学英语 B（1）', 2, 'y1a', '通修课', 'C', null, 'percentage', true, true],
  ['B120013004', '大学英语 B（2）', 2, 'y1b', '通修课', 'C', null, 'percentage', true, true],
  ['B120013007', '英语阅读（3）', 1, 'y2a', '通修课', 'C', null, 'percentage', true, true],
  ['B120013008', '英语写作（3）', 1, 'y2a', '通修课', 'C', null, 'percentage', true, true],
  // 思政课（D 组，6 门）
  ['B280021001', '思想道德与法治', 3, 'y1a', '通修课', 'D', null, 'percentage', true],
  ['B280021002', '习近平新时代中国特色社会主义思想概论', 3, 'y1a', '通修课', 'D', null, 'percentage', true],
  ['B280021003', '中国近现代史纲要', 3, 'y1b', '通修课', 'D', null, 'percentage', true],
  ['B280021004', '毛泽东思想和中国特色社会主义理论体系概论', 3, 'y2a', '通修课', 'D', null, 'percentage', true],
  ['B280021005', '社会实践', 2, 'y3a', '通修课', 'D', null, 'percentage', true],
  ['B280021006', '马克思主义基本原理', 3, 'y2b', '通修课', 'D', null, 'percentage', true],
  // 综合素养课（要求通过课程考核即可，但不计入学分绩点；含思政「概论课（大类内部）七选一」）
  ['B050026003', '航空航天概论B', 1.5, 'y2a', '综合素养课', null, null, 'passfail', false, false, true],
  ['B080026004', '经济管理', 2, 'y3b', '综合素养课', null, null, 'passfail', false, false, true],
  ['B210026002', '互联网软件创新创意创业', 1.5, 'y3b', '综合素养课', null, null, 'passfail', false, false, true],
  // 核心专业类（E 组，14 门）
  ['B210031003', '离散数学（2）', 2, 'y2a', '专业课', 'E', null, 'percentage', true],
  ['B210031002', '计算机硬件基础（软件专业）', 4, 'y2a', '专业课', 'E', null, 'percentage', true],
  ['B210031004', '算法分析与设计', 3, 'y2a', '专业课', 'E', null, 'percentage', true],
  ['B210031001', '面向对象程序设计（Java）', 2.5, 'y2a', '专业课', 'E', null, 'percentage', true],
  ['B210031005', '数据管理技术', 3, 'y2b', '专业课', 'E', null, 'percentage', true],
  ['B210031006', '软件工程基础', 3, 'y2b', '专业课', 'E', null, 'percentage', true],
  ['B060031006', '操作系统', 4.5, 'y2b', '专业课', 'E', null, 'percentage', true],
  ['B210031007', '人工智能', 2, 'y2b', '专业课', 'E', null, 'percentage', true],
  ['T210031001', '计算机网络与应用', 3, 'y3a', '专业课', 'E', null, 'percentage', true],
  ['B060031011', '编译技术', 4.5, 'y3a', '专业课', 'E', null, 'percentage', true],
  ['B210031008', '软件系统分析与设计', 3, 'y3a', '专业课', 'E', null, 'percentage', true],
  ['T210031002', '软件过程与质量', 3, 'y3b', '专业课', 'E', null, 'percentage', true],
  ['B210031009', '程序设计实践', 2, 'y1s', '专业课', 'E', null, 'percentage', true],
  ['B210031010', '软件工程基础实践', 2, 'y2s', '专业课', 'E', null, 'percentage', true],
  // 专业方向课（G 组，限修 ≥6 学分，自行选取）
  ['B210032101', '分布式系统导论', 2, 'y3a', '专业课', 'G', null, 'percentage', false, true],
  ['B210032102', '并行程序设计', 2, 'y3b', '专业课', 'G', null, 'percentage', false, true],
  ['B210032103', '云计算技术基础', 2, 'y3b', '专业课', 'G', null, 'percentage', false, true],
  ['B210032104', '嵌入式软件设计', 2, 'y3a', '专业课', 'G', null, 'percentage', false, true],
  ['B210032105', '数值计算与算法', 2, 'y3a', '专业课', 'G', null, 'percentage', false, true],
  ['B210032106', '计算机辅助设计与制造', 2, 'y3a', '专业课', 'G', null, 'percentage', false, true],
  ['B210032107', '工业互联网技术基础', 2, 'y3b', '专业课', 'G', null, 'percentage', false, true],
  ['B210032108', '工业大数据技术', 2, 'y3b', '专业课', 'G', null, 'percentage', false, true],
  ['B210032109', '物联网技术基础', 2, 'y3b', '专业课', 'G', null, 'percentage', false, true],
  ['B210032110', '智能计算系统', 2, 'y3a', '专业课', 'G', null, 'percentage', false, true],
  ['B210032111', '图像处理和计算机视觉', 2, 'y3b', '专业课', 'G', null, 'percentage', false, true],
  ['B210032112', '智能软件工程', 2, 'y3b', '专业课', 'G', null, 'percentage', false, true],
  ['B210032113', '开源软件开发导论', 2, 'y3a', '专业课', 'G', null, 'percentage', false, true],
  // 一般专业类：英文科技写作 / 跨文化交流 / 软件工程伦理与职业规范 / 学科前沿讲座
  ['B210032002', '英文科技写作（软件工程）', 2, 'y3b', '专业课', 'H', null, 'percentage', true],
  ['B210032001', '跨文化交流', 1, 'y3b', '专业课', 'I', null, 'passfail', true, false, true],
  ['B210032003', '软件工程伦理与职业规范', 1, 'y2b', '专业课', 'J', null, 'passfail', true, false, true],
  ['B210032005', '学科前沿讲座', 0.5, 'y3b', '专业课', 'K', null, 'passfail', true, false, true],
  // 一般专业必修课（F 组，4 门，要求通过课程考核，不计入绩点）
  ['B210031011', '离散数学（2）', 2, 'y2a', '专业课', 'F', null, 'passfail', false, false, true],
  ['B210031012', '计算机硬件基础（软件专业）', 4, 'y2a', '专业课', 'F', null, 'passfail', false, false, true],
  ['B210031013', '算法分析与设计', 3, 'y2a', '专业课', 'F', null, 'passfail', false, false, true],
  ['B210031014', '面向对象程序设计（Java）', 2.5, 'y2a', '专业课', 'F', null, 'passfail', false, false, true],
];

export const BASE_COURSES = ROWS.map((row) =>
  createCourse({
    code: row[0],
    name: row[1],
    credit: row[2],
    semester: row[3],
    module: row[4],
    group: row[5],
    basicGroup: row[6],
    gradeType: row[7],
    counted: row[8],
    elective: row[9] ?? false,
    passOnly: row[10] ?? false,
    tracks: row[11] ?? null,
  }),
);

/** 基础课数学分班方案：A 方案（数学分析 + 基础物理学 A + 基础物理实验（1））/ B 方案（工科数学分析 + 基础物理学 1、2 + 基础物理实验（2）） */
export const BASIC_GROUP_LABELS = {
  auto: '自动匹配',
  A: '方案 A：数学分析 + 基础物理学 A + 基础物理实验（1）',
  B: '方案 B：工科数学分析 + 基础物理学 + 基础物理实验（2）',
};
