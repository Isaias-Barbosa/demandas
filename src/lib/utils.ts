import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUniqueColumnKeys(columns: string[]) {
  const usedKeys = new Set<string>();
  const occurrences = new Map<string, number>();

  return columns.map((column) => {
    let occurrence = (occurrences.get(column) || 0) + 1;
    let key = occurrence === 1 ? column : `${column} (${occurrence})`;

    while (usedKeys.has(key)) {
      occurrence += 1;
      key = `${column} (${occurrence})`;
    }

    occurrences.set(column, occurrence);
    usedKeys.add(key);
    return key;
  });
}
