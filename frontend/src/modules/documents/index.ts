import { lazy } from 'react'
import type { Module } from '../../core/types/module'

const Documents = lazy(() => import('./pages/Documents'))

export const documentsModule: Module = {
  id: 'documents',
  name: 'Documentos',
  description: 'Upload, análise e consulta de documentos com IA',
  icon: 'FileText',
  order: 30,
  routes: [
    { path: '/documents', element: Documents },
  ],
}
