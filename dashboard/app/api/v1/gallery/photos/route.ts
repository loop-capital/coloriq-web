import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { getOrCreateStylistForUser } from '@/lib/stylist'
import { resolveReader, isServablePhoto, PUBLISHED_TRANSFORMATION_WHERE } from '@/lib/v1-gallery-consent'

// GET /api/v1/gallery/photos?formulaId=...&stylistId=...&sort=score|recent&limit=20&offset=0
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const formulaId = searchParams.get('formulaId')
    const stylistId = searchParams.get('stylistId')
    const sort = searchParams.get('sort') || 'recent' // 'score' | 'recent' | 'featured'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Consent gate (Phase 1 item 2, ruling 2026-10-28 option (a)): optional
    // auth — anonymous readers and auth failures degrade to anonymous, never
    // 401/500 for a missing/invalid token on this GET.
    const reader = await resolveReader(req)

    const where: any = { is_approved: true }
    if (formulaId) where.formula_id = formulaId
    if (stylistId) where.stylist_id = stylistId
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
        stylists: { select: { display_name: true, first_name: true, avatar_url: true } },
        // include (not select) so product_brand/product_shade still reach
        // the serializer below; nested listings carry the transformations
        // the JS consent filter reads. No consent value is serialized.
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
        clientId: p.client_id,
        beforeUrl: p.before_url,
        afterUrl: p.after_url,
        caption: p.caption,
        hairType: p.hair_type,
        porosity: p.porosity,
        levelBefore: p.level_before,
        levelAfter: p.level_after,
        toneBefore: p.tone_before,
        toneAfter: p.tone_after,
        developerVol: p.developer_vol,
        processingTime: p.processing_time,
        isFeatured: p.is_featured,
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        score: p.score,
        viewCount: p.view_count,
        tags: p.photo_tags.map(t => t.tag),
        commentCount: p._count.photo_comments,
        createdAt: p.created_at,
        stylistName: p.stylists?.display_name || p.stylists?.first_name || undefined,
        stylistAvatar: p.stylists?.avatar_url || undefined,
        brand: p.formulas?.product_brand || undefined,
        shades: p.formulas?.product_shade ? [p.formulas.product_shade] : [],
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Gallery photos GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }
}

// POST /api/v1/gallery/photos — Create a new photo post
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // stylist_id has a real, enforced FK to stylists.id, not users.id —
    // this previously took stylistId straight from the client body
    // (unauthenticated, and the wrong id space even if it had been the
    // caller's own).
    const stylist = await getOrCreateStylistForUser(user.userId)
    if (!stylist) {
      return NextResponse.json({ error: 'Could not resolve your stylist profile' }, { status: 400 })
    }

    const body = await req.json()
    const {
      formulaId, clientId, beforeUrl, afterUrl,
      caption, hairType, porosity, levelBefore, levelAfter,
      toneBefore, toneAfter, developerVol, processingTime, tags,
    } = body

    if (!formulaId || !afterUrl) {
      return NextResponse.json({ error: 'formulaId and afterUrl are required' }, { status: 400 })
    }

    const photo = await prisma.formula_photos.create({
      data: {
        formula_id: formulaId,
        stylist_id: stylist.id,
        client_id: clientId || null,
        before_url: beforeUrl || null,
        after_url: afterUrl,
        caption: caption || null,
        hair_type: hairType || null,
        porosity: porosity || null,
        level_before: levelBefore || null,
        level_after: levelAfter || null,
        tone_before: toneBefore || null,
        tone_after: toneAfter || null,
        developer_vol: developerVol || null,
        processing_time: processingTime || null,
      },
    })

    // Create tags if provided
    if (Array.isArray(tags) && tags.length > 0) {
      await prisma.formula_photo_tags.createMany({
        data: tags.map((tag: string) => ({ photo_id: photo.id, tag })),
      })
    }

    return NextResponse.json({ id: photo.id, createdAt: photo.created_at }, { status: 201 })
  } catch (error) {
    console.error('Gallery photos POST error:', error)
    return NextResponse.json({ error: 'Failed to create photo' }, { status: 500 })
  }
}