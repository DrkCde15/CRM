import { moduleRegistry } from '../core/services/module'
import { aiModule } from './ai'
import { documentsModule } from './documents'

export function registerModules() {
  moduleRegistry.register(aiModule)
  moduleRegistry.register(documentsModule)
}