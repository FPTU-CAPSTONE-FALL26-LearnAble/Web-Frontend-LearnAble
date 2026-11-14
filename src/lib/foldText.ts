/** Lowercase without accents, so "nguyen" finds "Nguyễn" and "dao" finds "Đào". */
export const foldText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
