import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from './api'
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: path !== null })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false })
      return
    }
    let active = true
    setState((previous) => ({ ...previous, loading: true, error: null }))
    api
      .get(path)
      .then((data) => {
        if (active) setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (active) setState({ data: null, error: errorMessage(error), loading: false })
      })
    return () => {
      active = false
    }
  }, [path, version])
  const reload = useCallback(() => setVersion((value) => value + 1), [])
  return { ...state, reload }
}
