import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/v1/certification/status — check certification progress
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const stylist = await prisma.stylists.findUnique({
      where: { id: userId },
      select: {
        id: true,
        badges: true,
        formulations_generated: true,
        average_satisfaction: true,
        created_at: true,
        last_login_at: true,
      },
    })

    if (!stylist) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Count community engagement (likes received)
    const likesReceived = await prisma.post_likes.count({
      where: {
        post: { stylist_id: userId },
        user_id: { not: userId },
      },
    })

    // Count active days (distinct days with activity — login or formulation)
    const daysSinceCreation = stylist.created_at
      ? Math.floor(
          (Date.now() - new Date(stylist.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0

    // Check assessment status (stored in badges if passed)
    const assessmentPassed = stylist.badges.includes('assessment-passed') || stylist.badges.includes('coloriq-certified')

    // Build requirements
    const formulations = {
      id: 'formulations',
      label: 'Formulations Created',
      description: 'Create at least 25 formulations in ColorIq',
      target: 25,
      current: stylist.formulations_generated || 0,
      unit: '',
    }

    const accuracy = {
      id: 'accuracy',
      label: 'Formula Accuracy',
      description: 'Maintain 80%+ average confidence on your formulas',
      target: 80,
      current: Number(stylist.average_satisfaction) || 0,
      unit: '%',
    }

    const community = {
      id: 'community',
      label: 'Community Engagement',
      description: 'Receive 10+ likes on your posts',
      target: 10,
      current: likesReceived,
      unit: '',
    }

    const active = {
      id: 'active',
      label: 'Active Days',
      description: 'Be active for at least 14 days',
      target: 14,
      current: Math.min(daysSinceCreation, 14),
      unit: '',
    }

    const assessment = {
      id: 'assessment',
      label: 'Assessment',
      description: 'Pass the color formulation assessment (70%+)',
      target: 1,
      current: assessmentPassed ? 1 : 0,
      unit: '',
    }

    const requirements = [formulations, accuracy, community, active, assessment]

    // Calculate overall progress
    const overallProgress = Math.round(
      requirements.reduce((sum, r) => sum + Math.min(r.current / r.target, 1), 0) / requirements.length * 100
    )

    // Check if fully certified
    const allComplete = requirements.every(r => r.current >= r.target)
    const isCertified = stylist.badges.includes('coloriq-certified') || allComplete

    // Auto-award badge if all requirements met
    if (allComplete && !stylist.badges.includes('coloriq-certified')) {
      await prisma.stylists.update({
        where: { id: userId },
        data: {
          badges: { push: 'coloriq-certified' },
        },
      })
    }

    return NextResponse.json({
      isCertified,
      certifiedAt: isCertified ? stylist.last_login_at : null,
      assessmentPassed,
      assessmentScore: assessmentPassed ? null : null, // stored separately if needed
      overallProgress,
      requirements,
    })
  } catch (error: any) {
    console.error('Certification status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
