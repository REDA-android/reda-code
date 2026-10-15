import { resolve, normalize, isAbsolute } from 'node:path'

export class WorkspaceGuard {
  private workspaceRoot: string

  constructor(workspaceRoot: string) {
    this.workspaceRoot = normalize(resolve(workspaceRoot))
  }

  getRoot(): string {
    return this.workspaceRoot
  }

  setRoot(newRoot: string): void {
    this.workspaceRoot = normalize(resolve(newRoot))
  }

  /**
   * Resolves a relative or absolute path against the workspace root.
   * Throws an error if the resolved path escapes the workspace.
   */
  resolveSafe(targetPath: string): string {
    const absPath = isAbsolute(targetPath)
      ? normalize(targetPath)
      : normalize(resolve(this.workspaceRoot, targetPath))

    // Check if absPath starts with workspaceRoot
    if (!absPath.startsWith(this.workspaceRoot)) {
      throw new Error(`Access denied: path "${targetPath}" escapes workspace "${this.workspaceRoot}"`)
    }
    return absPath
  }

  isSafe(targetPath: string): boolean {
    try {
      this.resolveSafe(targetPath)
      return true
    } catch {
      return false
    }
  }
}
