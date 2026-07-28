import { useEffect } from 'react'
import { registerRealtime } from '../../realtime'

export function useRealtime(resource: string, callback: () => void) {
  useEffect(() => {
    return registerRealtime(resource, callback)
  }, [resource, callback])
}