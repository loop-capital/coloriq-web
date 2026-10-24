import { PROOF_HTML, stagedPage } from '@/lib/staged-site/pages'

export function GET() {
  return stagedPage(PROOF_HTML)
}
