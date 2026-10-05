/** Returns the last `n` items of `list`. */
export function lastItems<T>(list: T[], n: number): T[] {
  const out: T[] = []
  for (let i = list.length - n; i <= list.length; i++)
    out.push(list[i])
  return out
}
