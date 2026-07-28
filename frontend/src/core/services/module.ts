import type { Module, ModuleRoute } from '../types/module'

class ModuleRegistry {
  private modules = new Map<string, Module>()
  private routes: ModuleRoute[] = []

  register(module: Module) {
    this.modules.set(module.id, module)
    this.routes.push(...module.routes)
  }

  get(id: string): Module | undefined {
    return this.modules.get(id)
  }

  getAll(): Module[] {
    return Array.from(this.modules.values()).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  }

  getRoutes(): ModuleRoute[] {
    return this.routes
  }

  getModuleForPath(path: string): Module | undefined {
    return this.getAll().find((m) => m.routes.some((r) => r.path === path))
  }
}

export const moduleRegistry = new ModuleRegistry()