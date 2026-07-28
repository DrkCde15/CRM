import { useState, useEffect } from 'react'
import { Upload, FileText, Trash2, Search, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardContent } from '../../../core/components/ui/Card'
import { Button } from '../../../core/components/ui/Button'
import { Badge } from '../../../core/components/ui/Badge'
import { EmptyState } from '../../../core/components/ui/EmptyState'
import { formatDate } from '../../../core/utils/format'
import { documentsApi } from '../services/api'
import type { Document } from '../types'
import { PageHeader } from '../../../core/components/layout/PageHeader'

const typeIcons: Record<string, string> = { pdf: '📄', docx: '📝', xlsx: '📊', csv: '📋', txt: '📃' }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState<number | null>(null)

  useEffect(() => { loadDocs() }, [])

  const loadDocs = async () => {
    setLoading(true)
    try { setDocs(await documentsApi.list()) }
    finally { setLoading(false) }
  }

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await documentsApi.upload(file)
      await loadDocs()
    } finally { setUploading(false) }
  }

  const analyze = async (id: number) => {
    setAnalyzing(id)
    try { await documentsApi.analyze(id); await loadDocs() }
    finally { setAnalyzing(null) }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <PageHeader
        title="Documentos"
        description="Gerencie documentos, contratos e arquivos."
        actions={
          <label className="cursor-pointer">
            <Button loading={uploading}>
              <Upload size={16} />
              {uploading ? 'Enviando...' : 'Upload'}
            </Button>
            <input type="file" accept=".pdf,.docx,.xlsx,.csv,.txt" onChange={upload} className="hidden" />
          </label>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent><div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" /></CardContent></Card>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title="Nenhum documento"
          description="Faça upload de PDFs, planilhas ou textos para começar"
          action={
            <label className="cursor-pointer">
              <Button><Upload size={16} />Upload</Button>
              <input type="file" accept=".pdf,.docx,.xlsx,.csv,.txt" onChange={upload} className="hidden" />
            </label>
          }
        />
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{typeIcons[doc.type] || '📄'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink dark:text-slate-100 truncate">{doc.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                      <span>{formatSize(doc.size)}</span>
                      <span>·</span>
                      <span>{doc.type.toUpperCase()}</span>
                      <span>·</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                    {doc.summary && <p className="text-xs text-muted mt-1 line-clamp-2">{doc.summary}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={doc.status === 'ready' ? 'success' : doc.status === 'processing' ? 'warning' : 'danger'}>
                      {doc.status === 'ready' ? 'Pronto' : doc.status === 'processing' ? 'Processando' : 'Erro'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => analyze(doc.id)} loading={analyzing === doc.id}>
                      <Search size={14} />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
