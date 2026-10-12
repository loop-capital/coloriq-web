'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, FlaskConical, Camera, ImageIcon, MessageCircle, BookOpen,
  Users, History, ClipboardList, Package, DollarSign, CreditCard, CirclePlus, Settings, Award,
  ShieldCheck, Store, Banknote, Droplets, Calculator, Sparkles, Palette, Droplet,
} from 'lucide-react'
import { LogoutButton } from '@/components/ui/logout-button'
import { ColorIqLogo } from '@/components/icons/coloriq-logo'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/service', label: 'New Service', icon: CirclePlus },
  { href: '/formulate', label: 'Formulate', icon: FlaskConical },
  { href: '/questionnaire', label: 'Consultation', icon: ClipboardList },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/library', label: 'Library', icon: BookOpen },
  { href: '/analyze', label: 'Analyze', icon: Camera },
  { href: '/history', label: 'History', icon: History },
  { href: '/gallery', label: 'Gallery', icon: ImageIcon },
  { href: '/community', label: 'Community', icon: MessageCircle },
  { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { href: '/dashboard/pricing', label: 'Pricing Rules', icon: DollarSign },
  { href: '/certification', label: 'Certification', icon: Award },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const toolsNavItems = [
  { href: '/tools/developer-mix', label: 'Developer Mix', icon: Droplets },
  { href: '/tools/bleach-predictor', label: 'Bleach Predictor', icon: Sparkles },
  { href: '/tools/color-correction', label: 'Color Correction', icon: Palette },
  { href: '/tools/porosity-test', label: 'Porosity Test', icon: Droplet },
  { href: '/tools/salon-pricing', label: 'Salon Pricing', icon: Calculator },
]

const adminNavItems = [
  { href: '/admin/salons', label: 'Salons & Stylists', icon: Store },
  { href: '/admin/account-types', label: 'Account Types', icon: ShieldCheck },
  { href: '/admin/creator-payouts', label: 'Creator Payouts', icon: Banknote },
]

export function Sidebar() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('colorgenius_token')
    fetch('/api/auth/me', { 
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => r.ok ? r.json() : null).then(d => setUser(d?.user)).catch(() => {})
  }, [])

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed h-screen z-40"
        style={{ background: '#0F0F1A', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', borderRadius: '10px' }}>
              <ColorIqLogo size={36} color="#0A0A0F" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: '#F5F5F7' }}>ColorIq</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-[#161620] hover:text-[#F5F5F7]"
              style={{ color: '#A1A1AA', borderRadius: '10px' }}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          ))}

          <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#71717A' }}>
            Tools
          </p>
          {toolsNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-[#161620] hover:text-[#F5F5F7]"
              style={{ color: '#A1A1AA', borderRadius: '10px' }}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          ))}

          {user?.role === 'admin' && (
            <>
              <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#71717A' }}>
                Admin
              </p>
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-[#161620] hover:text-[#F5F5F7]"
                  style={{ color: '#A1A1AA', borderRadius: '10px' }}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/subscription"
            className="flex items-center gap-2 mb-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-[#161620] transition-colors"
            style={{ color: '#A1A1AA' }}>
            <CreditCard className="w-[18px] h-[18px]" />
            Subscription
          </Link>
          <div className="p-3 mb-3" style={{ background: '#161620', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#71717A' }}>{user?.salonName || 'Guest'}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full cg-pulse-glow" style={{ background: user ? '#10B981' : '#EF4444' }} />
              <span className="text-xs" style={{ color: '#A1A1AA' }}>{user ? 'Connected' : 'Signed Out'}</span>
            </div>
          </div>
          <LogoutButton className="px-3 py-2 w-full justify-center rounded-lg hover:bg-[#161620]" />
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50"
        style={{ background: 'rgba(15,15,26,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', borderRadius: '8px' }}>
              <ColorIqLogo size={30} color="#0A0A0F" />
            </div>
            <span className="font-bold text-sm" style={{ color: '#F5F5F7' }}>ColorIq</span>
          </Link>
          <Link href="/login"
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #9333EA, #EC4899)', color: '#FFFFFF', textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </>
  )
}