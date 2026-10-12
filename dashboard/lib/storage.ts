// LocalStorage wrapper for ColorIq dashboard
// No database needed for MVP — persists to localStorage

import { AnalysisResult } from './color-analysis';
import { FormulationResult } from './formulation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  lastVisit?: string;
  favoriteBrand?: string;
  conditions: Array<{
    type: 'virgin' | 'previously_colored' | 'damaged' | 'highly_damaged';
    porosity: 'low' | 'normal' | 'high';
    grayPercent: number;
    date: string;
  }>;
}

export interface SavedFormula {
  id: string;
  clientId?: string;
  clientName?: string;
  name: string;
  formulation: FormulationResult;
  createdAt: string;
  tags?: string[];
}

export interface AnalysisHistoryEntry {
  id: string;
  clientId?: string;
  clientName?: string;
  imageData?: string; // base64 thumbnail
  result: AnalysisResult;
  createdAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Clients ───────────────────────────────────────────────────────────────────

export function getClients(): Client[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('cg-clients');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveClient(client: Omit<Client, 'id' | 'createdAt' | 'conditions'> & {
  id?: string;
  conditions?: Client['conditions'];
}): Client {
  const clients = getClients();
  const now = new Date().toISOString();
  
  if (client.id) {
    // Update existing
    const idx = clients.findIndex(c => c.id === client.id);
    if (idx >= 0) {
      clients[idx] = { ...clients[idx], ...client, lastVisit: now };
      localStorage.setItem('cg-clients', JSON.stringify(clients));
      return clients[idx];
    }
  }

  // Create new
  const newClient: Client = {
    id: generateId(),
    name: client.name,
    email: client.email,
    phone: client.phone,
    notes: client.notes,
    createdAt: now,
    lastVisit: now,
    favoriteBrand: client.favoriteBrand,
    conditions: client.conditions || [],
  };
  clients.push(newClient);
  localStorage.setItem('cg-clients', JSON.stringify(clients));
  return newClient;
}

export function getClient(id: string): Client | undefined {
  return getClients().find(c => c.id === id);
}

export function deleteClient(id: string): void {
  const clients = getClients().filter(c => c.id !== id);
  localStorage.setItem('cg-clients', JSON.stringify(clients));
  // Also delete associated history and formulas
  const history = getAnalysisHistory().filter(h => h.clientId !== id);
  localStorage.setItem('cg-analysis-history', JSON.stringify(history));
  const formulas = getFormulas().filter(f => f.clientId !== id);
  localStorage.setItem('cg-formulas', JSON.stringify(formulas));
}

// ─── Formulas ──────────────────────────────────────────────────────────────────

export function getFormulas(): SavedFormula[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('cg-formulas');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFormula(formula: Omit<SavedFormula, 'id' | 'createdAt'>): SavedFormula {
  const formulas = getFormulas();
  const newFormula: SavedFormula = {
    id: generateId(),
    ...formula,
    createdAt: new Date().toISOString(),
  };
  formulas.push(newFormula);
  localStorage.setItem('cg-formulas', JSON.stringify(formulas));
  return newFormula;
}

export function deleteFormula(id: string): void {
  const formulas = getFormulas().filter(f => f.id !== id);
  localStorage.setItem('cg-formulas', JSON.stringify(formulas));
}

export function updateFormula(id: string, updates: Partial<SavedFormula>): SavedFormula | null {
  const formulas = getFormulas();
  const idx = formulas.findIndex(f => f.id === id);
  if (idx < 0) return null;
  formulas[idx] = { ...formulas[idx], ...updates };
  localStorage.setItem('cg-formulas', JSON.stringify(formulas));
  return formulas[idx];
}

// ─── Analysis History ──────────────────────────────────────────────────────────

export function getAnalysisHistory(): AnalysisHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('cg-analysis-history');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAnalysis(entry: Omit<AnalysisHistoryEntry, 'id' | 'createdAt'>): AnalysisHistoryEntry {
  const history = getAnalysisHistory();
  const newEntry: AnalysisHistoryEntry = {
    id: generateId(),
    ...entry,
    createdAt: new Date().toISOString(),
  };
  history.unshift(newEntry); // newest first
  // Keep last 100 entries
  if (history.length > 100) history.splice(100);
  localStorage.setItem('cg-analysis-history', JSON.stringify(history));
  return newEntry;
}

export function deleteAnalysis(id: string): void {
  const history = getAnalysisHistory().filter(h => h.id !== id);
  localStorage.setItem('cg-analysis-history', JSON.stringify(history));
}

// ─── Seed Demo Data ────────────────────────────────────────────────────────────

export function seedDemoData(): void {
  if (typeof window === 'undefined') return;
  
  // Only seed if empty
  if (getClients().length > 0) return;

  const demoClients: Client[] = [
    {
      id: 'demo-1',
      name: 'Aaliyah Johnson',
      email: 'aaliyah.j@email.com',
      phone: '(614) 555-0142',
      notes: 'Prefers low-maintenance color. Allergic to PPD — use PPD-free line.',
      createdAt: '2025-11-10T14:00:00Z',
      lastVisit: '2026-03-15T10:30:00Z',
      favoriteBrand: 'Wella',
      conditions: [
        { type: 'previously_colored', porosity: 'normal', grayPercent: 15, date: '2026-03-15' },
      ],
    },
    {
      id: 'demo-2',
      name: 'Marcus Rivera',
      email: 'm.rivera@email.com',
      phone: '(614) 555-0198',
      notes: 'Full gray coverage needed. Wants natural look, not too dark.',
      createdAt: '2025-09-22T09:00:00Z',
      lastVisit: '2026-04-01T11:00:00Z',
      favoriteBrand: 'Schwarzkopf',
      conditions: [
        { type: 'virgin', porosity: 'low', grayPercent: 60, date: '2026-04-01' },
      ],
    },
    {
      id: 'demo-3',
      name: 'Sophie Chen',
      email: 'sophie.chen@email.com',
      phone: '(614) 555-0177',
      notes: 'Regular balayage client. Looking to go bolder with copper tones.',
      createdAt: '2026-01-05T15:00:00Z',
      lastVisit: '2026-04-10T14:00:00Z',
      favoriteBrand: 'Pulp Riot',
      conditions: [
        { type: 'previously_colored', porosity: 'high', grayPercent: 0, date: '2026-04-10' },
      ],
    },
  ];

  const demoFormulas: SavedFormula[] = [
    {
      id: 'f-demo-1',
      clientId: 'demo-1',
      clientName: 'Aaliyah Johnson',
      name: 'Caramel Balayage',
      formulation: {
        success: true,
        steps: [
          { product: { id: 'wella-kol-6g', brand: 'Wella', line: 'Koleston Perfect ME+', shadeName: 'Dark Blonde Golden', shadeCode: '6/73', level: 6, tone: 'golden', type: 'permanent', mixingRatio: '1:1' } as any, grams: 50, role: 'primary' },
          { product: { id: 'wella-kol-7g', brand: 'Wella', line: 'Koleston Perfect ME+', shadeName: 'Medium Blonde Golden', shadeCode: '7/73', level: 7, tone: 'golden', type: 'permanent', mixingRatio: '1:1' } as any, grams: 20, role: 'secondary' },
        ],
        developerVolume: 20,
        developerMl: 70,
        totalMl: 70,
        processingTime: 35,
        application: 'balayage',
        coverage: 'partial',
        notes: ['Virgin application: apply to midlengths and ends first, then roots', 'Wella Koleston Perfect ME+: mix 1:1 with 20 vol developer', 'Processing time: 35 minutes at room temperature'],
        warnings: [],
        brand: 'Wella',
        line: 'Koleston Perfect ME+',
      },
      createdAt: '2026-03-15T10:30:00Z',
      tags: ['balayage', 'caramel', 'warm'],
    },
    {
      id: 'f-demo-2',
      clientId: 'demo-2',
      clientName: 'Marcus Rivera',
      name: 'Natural Ash Brown (Full Coverage)',
      formulation: {
        success: true,
        steps: [
          { product: { id: 'skf-igora-5a', brand: 'Schwarzkopf', line: 'Igora Royal', shadeName: 'Light Brown Ash', shadeCode: '5-1', level: 5, tone: 'ash', type: 'permanent', mixingRatio: '1:1' } as any, grams: 60, role: 'primary' },
          { product: { id: 'skf-igora-5', brand: 'Schwarzkopf', line: 'Igora Royal', shadeName: 'Light Brown Natural', shadeCode: '5-0', level: 5, tone: 'neutral', type: 'permanent', mixingRatio: '1:1' } as any, grams: 15, role: 'additive', notes: 'Neutral base for gray coverage (60% gray)' },
        ],
        developerVolume: 20,
        developerMl: 75,
        totalMl: 75,
        processingTime: 40,
        application: 'all_over',
        coverage: 'full',
        notes: ['Gray coverage: ensure saturation of all gray areas', 'Schwarzkopf Igora Royal: mix 1:1 with 20 vol developer', 'Processing time: 40 minutes at room temperature'],
        warnings: [],
        brand: 'Schwarzkopf',
        line: 'Igora Royal',
      },
      createdAt: '2026-04-01T11:00:00Z',
      tags: ['gray-coverage', 'ash', 'natural'],
    },
  ];

  // Fix demo formulas that reference ALL_PRODUCTS - need to serialize properly
  const fixedFormulas: SavedFormula[] = demoFormulas.map(f => {
    const stepProducts = f.formulation.steps.map(s => {
      // Find the actual product object from ALL_PRODUCTS if not already serialized
      return {
        ...s,
        product: s.product, // This should be the full product object
      };
    });
    return {
      ...f,
      formulation: {
        ...f.formulation,
        steps: stepProducts,
      },
    };
  });

  // Note: We need to import ALL_PRODUCTS here. Since this is a module, we'll just
  // save the formulas with null products and they'll work fine for display
  localStorage.setItem('cg-clients', JSON.stringify(demoClients));
  
  // Save demo formulas
  const formulasToSave = [
    {
      id: 'f-demo-1',
      clientId: 'demo-1',
      clientName: 'Aaliyah Johnson',
      name: 'Caramel Balayage',
      createdAt: '2026-03-15T10:30:00Z',
      tags: ['balayage', 'caramel', 'warm'],
      formulation: {
        success: true,
        brand: 'Wella',
        line: 'Koleston Perfect ME+',
        steps: [
          { productId: 'wella-kol-6g', productName: 'Dark Blonde Golden', shadeCode: '6/73', grams: 50, role: 'primary' },
          { productId: 'wella-kol-7g', productName: 'Medium Blonde Golden', shadeCode: '7/73', grams: 20, role: 'secondary' },
        ],
        developerVolume: 20,
        developerMl: 70,
        totalMl: 70,
        processingTime: 35,
        application: 'balayage',
        coverage: 'partial',
        notes: ['Virgin application: apply to midlengths and ends first', 'Wella Koleston Perfect ME+: mix 1:1 with 20 vol developer', 'Processing time: 35 minutes'],
        warnings: [],
      },
    },
    {
      id: 'f-demo-2',
      clientId: 'demo-2',
      clientName: 'Marcus Rivera',
      name: 'Natural Ash Brown (Full Coverage)',
      createdAt: '2026-04-01T11:00:00Z',
      tags: ['gray-coverage', 'ash', 'natural'],
      formulation: {
        success: true,
        brand: 'Schwarzkopf',
        line: 'Igora Royal',
        steps: [
          { productId: 'skf-igora-5a', productName: 'Light Brown Ash', shadeCode: '5-1', grams: 60, role: 'primary' },
          { productId: 'skf-igora-5', productName: 'Light Brown Natural', shadeCode: '5-0', grams: 15, role: 'additive', notes: 'Neutral base for gray coverage (60% gray)' },
        ],
        developerVolume: 20,
        developerMl: 75,
        totalMl: 75,
        processingTime: 40,
        application: 'all_over',
        coverage: 'full',
        notes: ['Gray coverage: ensure saturation of all gray areas', 'Schwarzkopf Igora Royal: mix 1:1 with 20 vol', 'Processing time: 40 minutes'],
        warnings: [],
      },
    },
  ];
  localStorage.setItem('cg-formulas', JSON.stringify(fixedFormulas));
  localStorage.setItem('cg-formulas-v2', JSON.stringify(formulasToSave));
}
