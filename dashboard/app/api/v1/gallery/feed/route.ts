import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveReader, isServablePhoto, PUBLISHED_TRANSFORMATION_WHERE } from '@/lib/v1-gallery-consent'

// GET /api/v1/gallery/feed — Trending/top gallery feed
// Query params: sort=score|recent|featured, tone=N|A|G|K|R|V|P|B|M|Ch|W|C, level=1-10, limit=20, offset=0
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sort = searchParams.get('sort') || 'recent'
    const tone = searchParams.get('tone')
    const level = searchParams.get('level')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Consent gate (Phase 1 item 2, ruling 2026-10-28 option (a)): optional
    // auth — anonymous readers and auth failures degrade to anonymous, never
    // 401/500 for a missing/invalid token on this GET.
    const reader = await resolveReader(req)

    const where: any = { is_approved: true }
    if (tone) where.tone_after = tone
    if (tone) where.tone_before = tone // Search both directions
    if (level) {
      where.OR = [
        { level_after: parseInt(level) },
        { level_before: parseInt(level) },
      ]
    }
    if (sort === 'featured') where.is_featured = true

    const orderBy: any =
      sort === 'score' ? { score: 'desc' as const } :
      sort === 'featured' ? { is_featured: 'desc' as const, score: 'desc' as const } :
      { created_at: 'desc' as const }

    // DB-level consent arm: the reader's own photos, OR photos whose formula
    // has a published transformation with an after photo (via
    // formulas -> formula_listings -> transformations; see
    // lib/v1-gallery-consent.ts SCHEMA NOTE). This arm narrows candidates
    // only — consent VALIDITY is enforced by the JS filter below, which
    // JSON cannot express in a Prisma where.
    const consentArm: any = {
      OR: [
        ...(reader.stylistId ? [{ stylist_id: reader.stylistId }] : []),
        {
          formulas: {
            formula_listings: {
              some: {
                transformations: { some: { ...PUBLISHED_TRANSFORMATION_WHERE } },
              },
            },
          },
        },
      ],
    }
    const gatedWhere: any = { AND: [where, consentArm] }

    // Pagination tradeoff (documented, deliberate): because consent validity
    // is enforced in JS, a DB count would overcount the gated set. Fetch the
    // candidate set ordered as today WITHOUT take/skip, JS-filter to the
    // servable set, then slice by limit/offset and set total to the servable
    // count. Full candidate scan per page; acceptable at gallery scale. A
    // DB-level consent column / consent_records join is the follow-up.
    const candidates = await prisma.formula_photos.findMany({
      where: gatedWhere,
      orderBy,
      include: {
        photo_tags: { select: { tag: true } },
        _count: { select: { photo_comments: true } },
        // Nested listings carry the transformations the JS consent filter
        // reads. No consent value is serialized.
        formulas: {
          include: {
            formula_listings: {
              include: {
                transformations: {
                  where: { status: 'published' },
                  select: { status: true, after_photo_ref: true, client_consent: true },
                },
              },
            },
          },
        },
      },
    })

    const servable = candidates.filter((p) => isServablePhoto(p as any, reader))
    const total = servable.length
    const photos = servable.slice(offset, offset + limit)

    return NextResponse.json({
      items: photos.map(p => ({
        id: p.id,
        formulaId: p.formula_id,
        stylistId: p.stylist_id,
        beforeUrl: p.before_url,
        afterUrl: p.after_url,
        caption: p.caption,
        hairType: p.hair_type,
        porosity: p.porosity,
        levelBefore: p.level_before,
        levelAfter: p.level_after,
        toneBefore: p.tone_before,
        toneAfter: p.tone_after,
        isFeatured: p.is_featured,
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        score: p.score,
        tags: p.photo_tags.map(t => t.tag),
        commentCount: p._count.photo_comments,
        createdAt: p.created_at,
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Gallery feed GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}