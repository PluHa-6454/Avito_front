import { createMockServer } from './server'

const port = Number(process.env.MOCK_PORT ?? 4010)

createMockServer().listen(port, () => {
  console.log(`[mock] AI-buddy mock API: http://localhost:${port}/api/v1`)
})
