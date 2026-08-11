import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Nằm trong shared/ui (không phải lib/) vì cây sync không được import ra ngoài chính nó. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
