import { mockApi } from './mockApi'
import { realApi } from './realApi'

const useMockApi = (import.meta.env.VITE_USE_MOCK_API ?? 'false') !== 'false'

export const api = useMockApi ? mockApi : realApi
