import { clsx, type ClassValue } from "clsx";

// twMerge is Tailwind-specific and useless under UnoCSS (it only dedupes known
// Tailwind classes); clsx alone is the correct conditional-class joiner here.
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}
