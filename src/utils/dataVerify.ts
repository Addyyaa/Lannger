/**
 * 数据验证工具
 * 验证日期字符串或 Date 对象是否有效
 */
export function dataVerify(date: any): boolean {
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

// 保持默认导出以兼容现有代码
export default dataVerify;