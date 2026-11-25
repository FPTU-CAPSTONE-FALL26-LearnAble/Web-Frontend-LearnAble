export class ExcelImportError extends Error {}

export function assertExcelImportFile(file: File): void {
  if (!/\.xlsx$/i.test(file.name)) throw new ExcelImportError("Choose an Excel Workbook (.xlsx). CSV and XLS files are not supported. Download the template and save your data as .xlsx.");
  if (file.size === 0) throw new ExcelImportError("The selected file is empty. Add your data to the downloaded template and save it before importing.");
}

export function saveImportTemplate({ blob, fileName }: { blob: Blob; fileName?: string | null }, fallback: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? fallback;
  link.click();
  URL.revokeObjectURL(url);
}
