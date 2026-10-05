/**
 * The skill taxonomy.
 *
 * Data, not code — it imports nothing, and the schema in
 * src/content/schemas/skill.ts is the contract.
 *
 * This is a TREE, deliberately. A skill graph with weighted edges is the more
 * expressive model and is the classic over-engineering move; the prerequisite
 * mechanism on lessons plus roadmap stage order already covers every real use
 * case. A tree gives a learner an understandable shape ("communication is made
 * of these five things") which a graph does not.
 *
 * A skill id is a join key: lessons, exercises, quizzes, labs and assessments
 * all reference skills, and the registry derives the reverse index. Nothing
 * hand-maintains "which lessons teach this skill".
 *
 * At M0 only the three top-level nodes referenced by the sample content exist.
 * The remaining branches arrive as their modules are written at M2 and M8.
 */
export const skills = [
  // --- Communication ------------------------------------------------------
  {
    id: 'communication',
    title: 'Communication',
    summary: 'Conveying information clearly and checking that it landed.',
    gloss: 'Getting your point across so the other person can act on it.',
    relation: 'contains' as const,
    order: 0,
  },
  {
    id: 'communication-written-english',
    title: 'Written English',
    summary: 'Sentence structure, clarity, concision and professional register.',
    gloss: 'Writing sentences that are correct, clear and appropriately formal.',
    parent: 'communication',
    order: 0,
  },
  {
    id: 'communication-email',
    title: 'Email',
    summary: 'Writing, organising and prioritising email professionally.',
    gloss: 'Managing a professional inbox so nothing important is missed.',
    parent: 'communication',
    order: 1,
  },
  {
    id: 'communication-client-updates',
    title: 'Client Updates',
    summary: 'Reporting progress, delays, problems and completion to a client.',
    gloss: 'Telling a client what is happening without them having to ask.',
    parent: 'communication',
    order: 2,
  },
  {
    id: 'communication-professional-tone',
    title: 'Professional Tone',
    summary: 'Choosing language that is respectful, calm and appropriately formal.',
    gloss: 'Sounding like a competent colleague rather than a friend or a robot.',
    parent: 'communication',
    order: 3,
  },

  // --- Research -----------------------------------------------------------
  {
    id: 'research',
    title: 'Research',
    summary: 'Finding, checking and presenting information.',
    gloss: 'Answering a question with sources you can point to.',
    relation: 'contains' as const,
    order: 1,
  },
  {
    id: 'research-search',
    title: 'Search',
    summary: 'Using search engines and operators to find relevant sources quickly.',
    gloss: 'Getting to the right page faster than clicking through links.',
    parent: 'research',
    order: 0,
  },
  {
    id: 'research-verification',
    title: 'Source Verification',
    summary: 'Checking that a source is credible, current and says what it appears to say.',
    gloss: 'Noticing when a source is wrong, old, or making something up.',
    parent: 'research',
    order: 1,
  },
  {
    id: 'research-data-collection',
    title: 'Data Collection',
    summary: 'Gathering structured information into a consistent format.',
    gloss: 'Turning scattered web pages into one tidy list or table.',
    parent: 'research',
    order: 2,
  },
  {
    id: 'research-reporting',
    title: 'Reporting',
    summary: 'Presenting findings clearly, with sources attached.',
    gloss: 'Writing up what you found so someone else can use it.',
    parent: 'research',
    order: 3,
  },

  // --- Administration -----------------------------------------------------
  {
    id: 'administration',
    title: 'Administration',
    summary: 'Organising work, schedules, files and information for other people.',
    gloss: 'Keeping someone else’s work organised and moving.',
    relation: 'contains' as const,
    order: 2,
  },
  {
    id: 'administration-calendar',
    title: 'Calendar Management',
    summary: 'Scheduling, rescheduling, invitations, conflicts and time zones.',
    gloss: 'Booking meetings so nobody is double-booked or surprised.',
    parent: 'administration',
    order: 0,
  },
  {
    id: 'administration-organisation',
    title: 'Digital Organisation',
    summary: 'Folder structures, naming conventions and finding things later.',
    gloss: 'Being able to find a file in ten seconds, six months from now.',
    parent: 'administration',
    order: 1,
  },
  {
    id: 'administration-documentation',
    title: 'Documentation',
    summary: 'SOPs, checklists, meeting notes, reports and handover documents.',
    gloss: 'Writing things down so the work can be repeated without you.',
    parent: 'administration',
    order: 2,
  },
  {
    id: 'administration-prioritisation',
    title: 'Prioritisation',
    summary: 'Deciding what to do first when several things are urgent.',
    gloss: 'Working out what actually matters most before you start.',
    parent: 'administration',
    order: 3,
  },

  // --- Data ---------------------------------------------------------------
  {
    id: 'data',
    title: 'Data and Spreadsheets',
    summary: 'Entering, cleaning and presenting data accurately.',
    gloss: 'Working with lists and tables without corrupting them.',
    relation: 'contains' as const,
    order: 3,
  },
  {
    id: 'data-entry',
    title: 'Data Entry',
    summary: 'Accurate, verifiable entry of information into a system.',
    gloss: 'Typing information in correctly, and checking your own work.',
    parent: 'data',
    order: 0,
  },
  {
    id: 'data-cleaning',
    title: 'Data Cleaning',
    summary: 'Fixing inconsistent formatting, duplicates and errors in a dataset.',
    gloss: 'Making a messy spreadsheet reliable enough to use.',
    parent: 'data',
    order: 1,
  },
  {
    id: 'data-quality-control',
    title: 'Quality Control',
    summary: 'Checking your own output before submitting it.',
    gloss: 'Catching your own mistakes before the client does.',
    parent: 'data',
    order: 2,
  },
  {
    id: 'data-spreadsheets',
    title: 'Spreadsheets',
    summary: 'Reading, formatting and safely editing tabular data.',
    gloss: 'Working in a spreadsheet without breaking someone else’s formulas.',
    parent: 'data',
    order: 3,
  },

  // --- Digital safety -----------------------------------------------------
  //
  // Added at M6, when the curriculum began teaching work that involves other
  // people's accounts and other people's money. Both branches are capabilities
  // rather than topics: "can you tell a fake client from a real one" and "can you
  // hold a login without exposing it" are things a learner either can do or
  // cannot, which is the test the taxonomy uses.
  {
    id: 'safety',
    title: 'Digital Safety',
    summary: 'Protecting client information, accounts and your own work from avoidable risk.',
    gloss: 'Handling logins, links and client data so nothing goes wrong.',
    relation: 'contains' as const,
    order: 4,
  },
  {
    id: 'safety-accounts',
    title: 'Accounts and Access',
    summary: 'Passwords, two-factor authentication, and sharing access without exposing it.',
    gloss: 'Giving a client access without handing over anything you should not.',
    parent: 'safety',
    order: 0,
  },
  {
    id: 'safety-scam-awareness',
    title: 'Scam Awareness',
    summary: 'Recognising fake clients, fake job offers and payment fraud before acting on them.',
    gloss: 'Spotting the warning signs in an offer that is too good to be true.',
    parent: 'safety',
    order: 1,
  },
] as const
