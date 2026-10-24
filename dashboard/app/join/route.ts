import { JOIN_HTML, stagedPage } from '@/lib/staged-site/pages'

export function GET() {
  return stagedPage(JOIN_HTML)
}
