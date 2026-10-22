import { Poll, TrendingTopic, PollComment, AdminMetrics } from "@/types/poll";

export const FEATURED_POLL: Poll = {
  id: "featured-ai-safety-audit",
  title:
    "Should governments mandate independent pre-deployment safety audits for frontier artificial intelligence models?",
  category: "Technology & AI",
  summary:
    "As frontier AI labs approach recursive reasoning milestones, international regulators are debating whether third-party red-teaming and safety clearances should be mandatory by law before commercial release.",
  context:
    "A coalition of international researchers and legislators has proposed binding protocols that would halt deployment of models exceeding predefined computational thresholds without certified safety compliance. Proponents cite existential risk, cyber-infrastructure security, and autonomous capabilities, while industry leaders warn that rigid pre-approval cycles could stifle technological competitiveness and trigger brain drains to less regulated jurisdictions.",
  status: "Live",
  totalVotes: 52110,
  publishedAt: "2026-10-18T08:00:00Z",
  closesAt: "2026-10-25T23:59:59Z",
  featured: true,
  editorialNote: "PULSE Editorial Inquiry • Global Policy Track",
  sourceReference: "Referenced against United Nations AI Advisory Body guidelines & EU AI Act Annexes",
  imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  imageAlt: "Frontier artificial intelligence safety neural network visualization",
  options: [
    {
      id: "opt-yes",
      label: "Yes — Mandatory independent audits are required",
      votes: 28142,
      percentage: 54,
    },
    {
      id: "opt-no",
      label: "No — Self-governance and flexible guidelines are preferable",
      votes: 23968,
      percentage: 46,
    },
  ],
};

export const LATEST_POLLS: Poll[] = [
  {
    id: "poll-econ-soft-landing",
    title:
      "Will central banks achieve a durable soft landing without triggering an employment slump in 2026?",
    category: "Global Economy",
    summary:
      "With sticky services inflation and fragmented supply chains, economists are split on whether aggressive rate adjustments will preserve labor markets or induce stagflation.",
    context:
      "Recent labor data demonstrates resilience across core service industries, but manufacturing PMI indices show persistent contraction. Policy makers must balance interest rate normalization with the risk of escalating debt servicing burdens for mid-size enterprises.",
    status: "Open",
    totalVotes: 34820,
    publishedAt: "2026-10-19T14:30:00Z",
    closesAt: "2026-10-26T23:59:59Z",
    editorialNote: "Macroeconomic Research Series",
    sourceReference: "Bank for International Settlements Quarterly Bulletin",
    commentsCount: 88,
    imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Central bank monetary policy and financial market metrics",
    options: [
      { id: "opt-yes", label: "Yes, soft landing is achievable", votes: 19150, percentage: 55 },
      { id: "opt-no", label: "No, recessionary pressures will prevail", votes: 15670, percentage: 45 },
    ],
  },
  {
    id: "poll-climate-tariffs",
    title:
      "Should import tariffs on renewable energy hardware be eliminated to accelerate decarbonization deadlines?",
    category: "Climate & Energy",
    summary:
      "Governments face fierce trade-offs between shielding domestic clean-tech manufacturers from subsidized foreign competition and meeting urgent emissions reduction targets.",
    context:
      "Tariffs on solar panels and EV batteries protect domestic factories from heavily subsidized imports, but climate scientists warn every year of delay in clean power deployment steepens catastrophic planetary heating.",
    status: "Open",
    totalVotes: 28450,
    publishedAt: "2026-10-19T11:15:00Z",
    closesAt: "2026-10-27T18:00:00Z",
    editorialNote: "Energy Transition Policy Inquiry",
    sourceReference: "International Renewable Energy Agency (IRENA) Global Outlook",
    commentsCount: 64,
    imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Renewable solar energy farm installation",
    options: [
      { id: "opt-yes", label: "Yes, prioritize rapid climate transition", votes: 17639, percentage: 62 },
      { id: "opt-no", label: "No, safeguard domestic manufacturing", votes: 10811, percentage: 38 },
    ],
  },
  {
    id: "poll-society-4day-workweek",
    title:
      "Should companies with over 250 employees be legally required to offer a 4-day workweek option?",
    category: "Society & Culture",
    summary:
      "Large-scale pilot programs across European and North American corporations revealed steady output and steep drops in worker burnout, fueling legislative debate.",
    context:
      "Over 90 corporate trial participants retained the 32-hour schedule after 12 months, noting no drop in total revenue. Critics argue that specialized services, hospitals, and shift-based retail will face acute staffing deficits.",
    status: "Open",
    totalVotes: 46710,
    publishedAt: "2026-10-18T16:45:00Z",
    closesAt: "2026-10-25T20:00:00Z",
    editorialNote: "Future of Labor Standards",
    sourceReference: "Oxford Global Labor Economics Report",
    commentsCount: 205,
    imageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Modern workplace collaboration and labor reform",
    options: [
      { id: "opt-yes", label: "Yes, mandate the 4-day standard", votes: 31762, percentage: 68 },
      { id: "opt-no", label: "No, leave it to free market negotiation", votes: 14948, percentage: 32 },
    ],
  },
  {
    id: "poll-geopolitics-space-treaty",
    title:
      "Should sovereign nations sign a binding treaty banning weaponization and territorial claims on lunar exploration zones?",
    category: "Geopolitics",
    summary:
      "As multinational lunar base missions near execution, space defense strategists argue for an updated Outer Space Treaty to preempt commercial and military skirmishes.",
    context:
      "The 1967 Outer Space Treaty lacks specific enforcement mechanisms for rare water-ice craters at lunar poles. As competing private and state missions converge on identical coordinates, sovereignty claims become a volatile flashpoint.",
    status: "Open",
    totalVotes: 19300,
    publishedAt: "2026-10-17T09:20:00Z",
    closesAt: "2026-10-24T12:00:00Z",
    editorialNote: "International Treaties & Sovereignty",
    sourceReference: "United Nations Office for Outer Space Affairs (UNOOSA)",
    commentsCount: 42,
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Lunar space exploration surface",
    options: [
      { id: "opt-yes", label: "Yes, enforce demilitarized neutrality", votes: 14861, percentage: 77 },
      { id: "opt-no", label: "No, national security sovereignty takes precedence", votes: 4439, percentage: 23 },
    ],
  },
  {
    id: "poll-health-gene-therapy",
    title:
      "Should breakthrough CRISPR gene therapies receive accelerated conditional approval for fatal rare pediatric disorders?",
    category: "Health & Science",
    summary:
      "Patient advocacy groups argue standard decade-long trials condemn terminal patients, while bioethicists urge caution against unforeseen off-target edits.",
    context:
      "Conditional access allows single-dose molecular corrections to reach pediatric patients with degenerative enzyme deficiencies. However, irreversible genomic edits in young patients carry unknown multi-decade immunological risks.",
    status: "Open",
    totalVotes: 22140,
    publishedAt: "2026-10-16T13:00:00Z",
    closesAt: "2026-10-23T23:59:59Z",
    editorialNote: "Bioethics & Medical Innovation",
    sourceReference: "World Health Organization Expert Advisory on Human Genome Editing",
    commentsCount: 57,
    imageUrl: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Medical biotechnology and genetic research",
    options: [
      { id: "opt-yes", label: "Yes, fast-track for terminal cases", votes: 18155, percentage: 82 },
      { id: "opt-no", label: "No, maintain standard long-term clinical safety bars", votes: 3985, percentage: 18 },
    ],
  },
  {
    id: "poll-tech-common-carrier",
    title:
      "Should digital social networks with over 50 million active users be classified and regulated as common carrier utilities?",
    category: "Technology & AI",
    summary:
      "A fierce debate on algorithmic content curation, free expression rights, and market concentration culminated in an initial benchmark poll.",
    context:
      "Proponents argue that digital town squares wield monopolistic communication power and should be legally barred from arbitrary account censorship. Opponents highlight first-amendment platform editorial rights and malicious content liabilities.",
    status: "Closed",
    totalVotes: 61420,
    publishedAt: "2026-10-10T10:00:00Z",
    closesAt: "2026-10-17T18:00:00Z",
    editorialNote: "Digital Rights & Communications Law",
    sourceReference: "Stanford Cyber Policy Center Monograph",
    commentsCount: 312,
    imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Digital telecommunications and social media networks",
    options: [
      { id: "opt-yes", label: "Yes, regulate as public utilities", votes: 38694, percentage: 63 },
      { id: "opt-no", label: "No, protect private platform discretion", votes: 22726, percentage: 37 },
    ],
  },
];

export const ALL_POLLS: Poll[] = [FEATURED_POLL, ...LATEST_POLLS];

export const TRENDING_TOPICS: TrendingTopic[] = [
  {
    id: "topic-ai-governance",
    title: "Frontier AI Governance",
    category: "Technology & AI",
    pollCount: 14,
    participantCount: 185400,
    isHot: true,
  },
  {
    id: "topic-labor-reform",
    title: "Labor Rights & 4-Day Week",
    category: "Society & Culture",
    pollCount: 8,
    participantCount: 128900,
    isHot: true,
  },
  {
    id: "topic-monetary-policy",
    title: "Central Bank Rate Cycles",
    category: "Global Economy",
    pollCount: 11,
    participantCount: 142300,
    isHot: false,
  },
  {
    id: "topic-green-tariffs",
    title: "Clean Energy Trade Tariffs",
    category: "Climate & Energy",
    pollCount: 9,
    participantCount: 94600,
    isHot: true,
  },
  {
    id: "topic-space-neutrality",
    title: "Lunar Space Neutrality",
    category: "Geopolitics",
    pollCount: 5,
    participantCount: 53100,
    isHot: false,
  },
  {
    id: "topic-crispr-ethics",
    title: "Bioethics & Gene Editing",
    category: "Health & Science",
    pollCount: 6,
    participantCount: 71200,
    isHot: false,
  },
];

export const SAMPLE_COMMENTS: Record<string, PollComment[]> = {
  "featured-ai-safety-audit": [
    {
      id: "c-101",
      pollId: "featured-ai-safety-audit",
      author: "Dr. Elena Rostova",
      authorRole: "AI Safety Researcher, Center for Algorithmic Integrity",
      isVerified: true,
      userVote: "Yes",
      content:
        "Voluntary commitments are structurally inadequate when commercial pressures prioritize release velocity over catastrophic risk verification. Independent third-party red-teaming with subpoena powers for internal test benches is the only way to safeguard critical infrastructure.",
      createdAt: "2 hours ago",
      likes: 342,
      replies: [
        {
          id: "r-101",
          author: "Marcus Vance",
          authorRole: "Open Source ML Contributor",
          isVerified: true,
          content:
            "How do we prevent regulatory capture by the largest trillion-dollar labs? If licensing requirements become prohibitive, only three incumbents will have legal permission to train models.",
          createdAt: "1 hour ago",
          likes: 129,
        },
      ],
    },
    {
      id: "c-102",
      pollId: "featured-ai-safety-audit",
      author: "Kenneth Wright",
      authorRole: "Tech Policy Analyst, Global Digital Institute",
      isVerified: true,
      userVote: "No",
      content:
        "Auditing models before deployment assumes we can reliably test recursive capabilities in sandbox environments. In practice, capability emergence often occurs post-release via fine-tuning. We should focus on liability frameworks for damages rather than bureaucratic bottlenecks.",
      createdAt: "4 hours ago",
      likes: 184,
      replies: [
        {
          id: "r-102",
          author: "Amina Al-Mansoor",
          authorRole: "Digital Rights Advocate",
          isVerified: true,
          content:
            "Post-facto liability is meaningless if an autonomous biological design error or power-grid exploit is already deployed into the wild. Prevention is the standard in aviation and pharma for good reason.",
          createdAt: "3 hours ago",
          likes: 95,
        },
      ],
    },
    {
      id: "c-103",
      pollId: "featured-ai-safety-audit",
      author: "Julian Chen",
      authorRole: "Verified Public Voter",
      isVerified: true,
      userVote: "Yes",
      content:
        "The public has a fundamental right to know that systems making autonomous legal, financial, and medical decisions have passed non-conflicted safety assessments.",
      createdAt: "6 hours ago",
      likes: 78,
    },
  ],
};

export const DEFAULT_COMMENTS: PollComment[] = [
  {
    id: "def-1",
    pollId: "default",
    author: "Siddharth Rao",
    authorRole: "Public Policy Fellow",
    isVerified: true,
    userVote: "Yes",
    content:
      "This is one of the pivotal legislative decisions of our decade. We need quantifiable accountability standards rather than rhetorical posturing.",
    createdAt: "3 hours ago",
    likes: 84,
    replies: [
      {
        id: "def-r1",
        author: "Claire Beauchamp",
        authorRole: "Economics Researcher",
        isVerified: true,
        content:
          "Agreed, provided the implementation criteria are transparent and published for open peer review.",
        createdAt: "2 hours ago",
        likes: 36,
      },
    ],
  },
  {
    id: "def-2",
    pollId: "default",
    author: "Teresa Martinez",
    authorRole: "Civic Participant",
    isVerified: true,
    userVote: "No",
    content:
      "Excessive statutory intervention often produces perverse incentives and slows down decentralized innovation where it is needed most.",
    createdAt: "5 hours ago",
    likes: 47,
  },
];

export const ADMIN_METRICS: AdminMetrics = {
  totalPolls: 28,
  publishedPolls: 24,
  draftPolls: 4,
  closedPolls: 1,
  totalVotes: 240820,
  verifiedUsers: 14250,
};

export const ADMIN_MOCK_POLLS = [
  ...ALL_POLLS,
  {
    id: "poll-draft-quantum",
    title: "Should national security export restrictions apply to quantum encryption algorithms?",
    category: "Technology & AI" as const,
    summary: "Draft proposal analyzing international cryptographic controls and hardware barriers.",
    status: "Draft" as const,
    totalVotes: 0,
    publishedAt: "2026-10-20T00:00:00Z",
    options: [
      { id: "opt-1", label: "Yes", votes: 0 },
      { id: "opt-2", label: "No", votes: 0 },
    ],
  },
  {
    id: "poll-draft-water",
    title: "Should groundwater extraction rights be traded on regulated public commodity exchanges?",
    category: "Climate & Energy" as const,
    summary: "Investigation into market-based municipal water allocation during drought conditions.",
    status: "Draft" as const,
    totalVotes: 0,
    publishedAt: "2026-10-20T00:00:00Z",
    options: [
      { id: "opt-1", label: "Yes", votes: 0 },
      { id: "opt-2", label: "No", votes: 0 },
    ],
  },
];

export function getPollById(id: string): Poll | undefined {
  return ALL_POLLS.find((p) => p.id === id);
}

export function getAllPolls(): Poll[] {
  return ALL_POLLS;
}

export function getRelatedPolls(currentPollId: string, category?: string, limit = 3): Poll[] {
  return ALL_POLLS.filter(
    (p) => p.id !== currentPollId && (!category || p.category === category || true)
  ).slice(0, limit);
}

export function getPollComments(pollId: string): PollComment[] {
  return SAMPLE_COMMENTS[pollId] || DEFAULT_COMMENTS;
}
