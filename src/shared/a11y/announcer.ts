/**
 * Một API thông báo duy nhất, một kênh duy nhất (§8.2).
 * Ghi vào <LiveRegion/> — hai node aria-live luôn có mặt trong DOM.
 * KHÔNG chồng Web Speech API lên aria-live: NVDA sẽ đọc mỗi thông báo hai lần.
 *
 * NFR-12 (xác nhận âm thanh ≤ 1s): gọi announce() ngay trong event handler,
 * không đợi server trả lời. Lưu thất bại thì announce đính chính sau.
 */

type Politeness = "polite" | "assertive";

type Regions = Record<Politeness, HTMLElement | null>;

const regions: Regions = { polite: null, assertive: null };

/** LiveRegion gọi khi mount/unmount. Không dùng ở nơi khác. */
export function _registerLiveRegion(politeness: Politeness, node: HTMLElement | null): void {
  regions[politeness] = node;
}

export function announce(message: string, opts?: { assertive?: boolean }): void {
  const node = regions[opts?.assertive ? "assertive" : "polite"];
  if (!node) return;
  // Xóa rồi ghi lại ở frame sau để thông báo lặp lại (vd. "Đã lưu" hai lần liên tiếp)
  // vẫn được screen reader đọc.
  node.textContent = "";
  requestAnimationFrame(() => {
    node.textContent = message;
  });
}
