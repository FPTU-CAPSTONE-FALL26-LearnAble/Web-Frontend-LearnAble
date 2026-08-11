# UI_SYNC — repo này là NGUỒN GỐC (source of truth)

Cây UI dùng chung giữa `learnable-web` và `learnable-desktop` gồm đúng **bốn thư mục**:

```
src/shared/ui/        # primitives + patterns + test đi kèm
src/shared/a11y/      # LiveRegion, announce(), SkipLink, useRouteAnnouncer
src/shared/tokens/    # tokens.css — lớp thị giác (RULE-17)
src/shared/strings/   # vi.ts — toàn bộ copy tiếng Việt
```

## Quy tắc (§5 của spec)

1. Cây sync được **viết ở repo này và chỉ ở repo này**. Sync một chiều: web → desktop.
2. Không gì khác đi qua ranh giới: `api/`, `mocks/`, `features/`, `lib/` là của riêng từng repo.
3. **Không file nào trong `src/shared/` được import từ ngoài `src/shared/`.**
   (ESLint `no-restricted-imports` chặn — cây phải tự chứa thì mới copy được.)
4. Bên desktop, mọi file copy sang mang header "SYNCED FROM learnable-web — do not edit".
   Sửa UI thì sửa **ở đây**, rồi bên desktop chạy `pnpm sync:ui`.

## Cách sync (chạy ở repo desktop)

```
pnpm sync:ui      # copy 4 thư mục + ghi .ui-sync.json (SHA commit + hash cây)
pnpm sync:check   # CI: fail nếu bản copy bị sửa tay, cảnh báo nếu web đã đi trước
```

Trước khi đổi API công khai của một component trong cây sync, kiểm tra cả hai repo
đang dùng nó thế nào — bên desktop chỉ được sửa cách *gọi*, không sửa component.
