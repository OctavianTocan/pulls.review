import type { DiffGroup, DiffGroupLeaf } from '../../../types/analyze'

function mergeChild(children: DiffGroupLeaf[], incoming: DiffGroupLeaf): void {
  const existing = children.find(child => child.key === incoming.key)
  if (!existing) {
    children.push({ ...incoming, filePaths: [...incoming.filePaths] })
    return
  }
  existing.filePaths.push(...incoming.filePaths)
  if (incoming.summary && incoming.summary !== existing.summary)
    existing.summary = existing.summary ? `${existing.summary} ${incoming.summary}` : incoming.summary
}

/**
 * Combines groups produced independently across chunks of a large diff. Chunks are
 * analyzed with no visibility into each other, so the same logical group (e.g.
 * "tests") commonly recurs across chunks with the same `key` - this merges those
 * back into a single group instead of surfacing duplicate groups in the view.
 */
export function mergeGroups(groups: DiffGroup[]): DiffGroup[] {
  const byKey = new Map<string, DiffGroup>()

  for (const group of groups) {
    const existing = byKey.get(group.key)
    if (!existing) {
      byKey.set(group.key, {
        ...group,
        filePaths: [...group.filePaths],
        children: group.children?.map(child => ({ ...child, filePaths: [...child.filePaths] })),
      })
      continue
    }

    existing.filePaths.push(...group.filePaths)
    if (group.summary && group.summary !== existing.summary)
      existing.summary = existing.summary ? `${existing.summary} ${group.summary}` : group.summary
    if (group.children?.length) {
      existing.children ??= []
      for (const child of group.children)
        mergeChild(existing.children, child)
    }
  }

  return Array.from(byKey.values())
}
