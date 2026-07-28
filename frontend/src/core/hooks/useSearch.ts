import { useState, useCallback } from 'react'
import { useDebounce } from './useDebounce'

export interface SearchResult {
  id: string
  type: 'client' | 'lead' | 'company' | 'ticket' | 'conversation' | 'file' | 'user' | 'task' | 'product'
  label: string
  description?: string
  path: string
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debouncedQuery = useDebounce(query, 300)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  return { query, setQuery, results, isSearching, debouncedQuery, search }
}