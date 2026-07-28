export interface Module {
  id: string
  name: string
  description: string
  icon: string
  routes: ModuleRoute[]
  order?: number
}

export interface ModuleRoute {
  path: string
  element: React.LazyExoticComponent<React.ComponentType<any>>
  label?: string
  module?: string
}

export interface ModuleNavItem {
  id: string
  label: string
  path: string
  icon: string
  badge?: number
  module: string
  adminOnly?: boolean
}

export interface ModulePermissions {
  [moduleId: string]: {
    read: boolean
    write: boolean
    delete: boolean
    admin: boolean
  }
}