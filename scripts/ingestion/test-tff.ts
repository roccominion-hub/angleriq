import * as dotenv from 'dotenv'; import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { searchTff } from './tff-auth-fetch'
async function main() {
  console.log('Testing TFF authenticated search...')
  const results = await searchTff('Moss Lake bass')
  console.log('Results:', JSON.stringify(results, null, 2))
}
main().catch(e => console.error('Error:', e.message))
