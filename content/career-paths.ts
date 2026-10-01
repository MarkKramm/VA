/**
 * The career-path taxonomy.
 *
 * This file is DATA, not code. It imports nothing, on purpose: `content/` must
 * never depend on `src/`, because the dependency arrow points one way (app →
 * registry → content). The schema in src/content/schemas/career-path.ts is the
 * contract; this file is checked against it at build time.
 *
 * Adding a career path is one entry here. Adding a roadmap under it is one file
 * in content/roadmaps/. Neither requires a code change.
 *
 * The 21 built-in roadmaps these paths will eventually hold are enumerated in
 * the implementation plan, §6.1. At M0 only two exist; the taxonomy is
 * populated ahead of the content so that adding roadmaps never requires
 * touching this file's shape.
 */
export const careerPaths = [
  {
    id: 'beginner',
    title: 'Getting Started',
    summary: 'A first path for people who are not yet sure what virtual assistance involves.',
    icon: 'compass',
    order: 0,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'data',
    title: 'Data and Research',
    summary: 'Roles built around accurate data handling, spreadsheets and structured research.',
    icon: 'table',
    order: 1,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'admin',
    title: 'Operations and Support',
    summary: 'Roles that organise other people’s work: scheduling, inbox, documents and tasks.',
    icon: 'clipboard',
    order: 2,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'non-voice',
    title: 'Generalist (Non-Voice)',
    summary:
      'Broad non-voice work that combines administration, communication and light data tasks.',
    icon: 'layers',
    order: 3,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'support',
    title: 'Customer Support',
    summary: 'Resolving customer questions by email, chat and ticket systems.',
    icon: 'lifebuoy',
    order: 4,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'voice',
    title: 'Voice',
    summary: 'Phone-based roles: reception, appointment setting, support and sales calls.',
    icon: 'phone',
    order: 5,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'sales',
    title: 'Sales and CRM',
    summary: 'Lead generation, pipeline management and client communication in a CRM.',
    icon: 'target',
    order: 6,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'marketing',
    title: 'Marketing and Social Media',
    summary: 'Content calendars, publishing, community management and campaign reporting.',
    icon: 'megaphone',
    order: 7,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'commerce',
    title: 'E-commerce',
    summary: 'Store operations: listings, orders, inventory and customer messages.',
    icon: 'cart',
    order: 8,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'creative',
    title: 'Creative',
    summary: 'Design, video and brand assets produced for clients.',
    icon: 'palette',
    order: 9,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'technical',
    title: 'Technical',
    summary: 'Website maintenance, hosting, domains and troubleshooting.',
    icon: 'wrench',
    order: 10,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'automation',
    title: 'Automation',
    summary: 'Removing repetitive manual work by connecting the tools a client already uses.',
    icon: 'workflow',
    order: 11,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'ai',
    title: 'AI-Assisted Work',
    summary:
      'Using AI tools for drafting, research and processing, with verification and data safety.',
    icon: 'sparkle',
    order: 12,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'real-estate',
    title: 'Real Estate',
    summary: 'Property research, listings, lead management and transaction coordination.',
    icon: 'home',
    order: 13,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'finance',
    title: 'Bookkeeping',
    summary: 'Assistant-level bookkeeping: invoices, receipts, payables and receivables.',
    icon: 'calculator',
    order: 14,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
  {
    id: 'freelance',
    title: 'Freelancing',
    summary: 'Finding clients, scoping work, contracts, invoicing and repeat business.',
    icon: 'briefcase',
    order: 15,
    status: 'draft' as const,
    updatedAt: '2026-10-01',
  },
] as const
