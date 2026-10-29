export const pct = (v: number) => `${Math.round(v * 100)}%`;

/** "1 day", "3 days"; pass the plural when adding "s" is wrong ("1 topic in review" style phrases pass both). */
export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
