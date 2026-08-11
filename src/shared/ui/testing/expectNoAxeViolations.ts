import axe from "axe-core";

/**
 * §8.3 điều kiện 1: component trong cây sync chưa "xong" khi axe-core chưa sạch.
 * Helper nằm TRONG cây sync để test đi cùng khi copy sang desktop —
 * desktop chạy lại đúng bộ test này sau mỗi lần sync.
 */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container, {
    rules: {
      // Unit test render lẻ từng component — không có landmark/region của trang.
      region: { enabled: false },
    },
  });
  if (results.violations.length > 0) {
    const detail = results.violations
      .map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html).join("\n  ")}`)
      .join("\n");
    throw new Error(`axe-core violations:\n${detail}`);
  }
}
