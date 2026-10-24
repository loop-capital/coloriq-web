import { INDEX_HTML, stagedPage } from '@/lib/staged-site/pages'

export function GET() {
  return stagedPage(INDEX_HTML)
}
