import { sha256Hex } from '../../cache/token-hash'

/**
 * A file's page on GitHub at a given commit.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param sha The commit to show the file at.
 * @param path Repository-relative file path.
 * @returns The `blob` URL.
 */
export function githubBlobUrl(owner: string, repo: string, sha: string, path: string): string {
  return `https://github.com/${owner}/${repo}/blob/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`
}

/**
 * A link that opens GitHub's diff view scrolled to one file.
 * @param url The PR, compare or commit page on GitHub.
 * @param pullRequest Whether `url` is a PR, whose diff lives under `/files`.
 * @param path Repository-relative file path.
 * @returns The URL with GitHub's `#diff-<sha256 of path>` anchor, or without it where hashing is unavailable (insecure contexts).
 */
export async function githubFileDiffUrl(url: string, pullRequest: boolean, path: string): Promise<string> {
  const page = pullRequest ? `${url}/files` : url
  try {
    return `${page}#diff-${await sha256Hex(path)}`
  }
  catch {
    return page
  }
}
