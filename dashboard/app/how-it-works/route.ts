import { HOW_HTML, stagedPage } from '@/lib/staged-site/pages'

export function GET() {
  return stagedPage(HOW_HTML)
}
