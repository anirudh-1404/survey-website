#!/usr/bin/env node

/**
 * PULSE Operator Database Seed Utility
 *
 * Safe, opt-in script for populating the database with realistic initial editorial polls.
 * Strictly non-destructive: will NOT overwrite or duplicate existing records.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-polls.mjs
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

const SAMPLE_POLLS = [
  {
    title: "Should governments mandate independent pre-deployment safety audits for frontier artificial intelligence models?",
    slug: "frontier-ai-safety-audits",
    category: "Technology & AI",
    summary: "As frontier AI labs approach recursive reasoning milestones, international regulators are debating whether third-party red-teaming and safety clearances should be mandatory by law before commercial release.",
    context: "A coalition of international researchers and legislators has proposed binding protocols that would halt deployment of models exceeding predefined computational thresholds without certified safety compliance. Proponents cite existential risk and cyber-infrastructure threats, while industry leaders warn that rigid pre-approval could stifle competitiveness.",
    sourceReference: "United Nations AI Advisory Body guidelines & EU AI Act Annexes",
    editorialNote: "PULSE Editorial Inquiry • Global Policy Track",
    status: "published",
    featured: true,
    publishedAt: new Date("2026-10-18T08:00:00Z"),
    closesAt: new Date("2026-10-25T23:59:59Z"),
    options: [
      { key: "yes", label: "Yes — Mandatory independent audits are required" },
      { key: "no", label: "No — Self-governance and flexible guidelines are preferable" },
    ],
  },
  {
    title: "Will central banks achieve a durable soft landing without triggering an employment slump in 2026?",
    slug: "central-banks-soft-landing-2026",
    category: "Global Economy",
    summary: "With sticky services inflation and fragmented supply chains, economists are split on whether aggressive rate adjustments will preserve labor markets or induce stagflation.",
    context: "Recent labor data demonstrates resilience across core service industries, but manufacturing PMI indices show persistent contraction. Policy makers must balance interest rate normalization with debt servicing pressures.",
    sourceReference: "Bank for International Settlements Quarterly Bulletin",
    editorialNote: "Macroeconomic Research Series",
    status: "published",
    featured: false,
    publishedAt: new Date("2026-10-19T14:30:00Z"),
    closesAt: new Date("2026-10-26T23:59:59Z"),
    options: [
      { key: "yes", label: "Yes, soft landing is achievable" },
      { key: "no", label: "No, recessionary pressures will prevail" },
    ],
  },
  {
    title: "Should import tariffs on renewable energy hardware be eliminated to accelerate decarbonization deadlines?",
    slug: "renewable-energy-import-tariffs",
    category: "Climate & Energy",
    summary: "Governments face fierce trade-offs between shielding domestic clean-tech manufacturers from subsidized foreign competition and meeting urgent emissions reduction targets.",
    context: "Tariffs on solar panels and EV batteries protect domestic factories from heavily subsidized imports, but climate scientists warn every year of delay in clean power deployment steepens planetary heating.",
    sourceReference: "International Renewable Energy Agency (IRENA) Global Outlook",
    editorialNote: "Energy Transition Policy Inquiry",
    status: "published",
    featured: false,
    publishedAt: new Date("2026-10-19T11:15:00Z"),
    closesAt: new Date("2026-10-27T18:00:00Z"),
    options: [
      { key: "yes", label: "Yes, prioritize rapid climate transition" },
      { key: "no", label: "No, safeguard domestic manufacturing" },
    ],
  },
  {
    title: "Should companies with over 250 employees be legally required to offer a 4-day workweek option?",
    slug: "mandated-4-day-workweek-option",
    category: "Society & Culture",
    summary: "Large-scale pilot programs across European and North American corporations revealed steady output and steep drops in worker burnout, fueling legislative debate.",
    context: "Over 90 corporate trial participants retained the 32-hour schedule after 12 months, noting no drop in total revenue. Critics argue that specialized services, hospitals, and shift-based retail will face acute staffing deficits.",
    sourceReference: "Oxford Global Labor Economics Report",
    editorialNote: "Future of Labor Standards",
    status: "published",
    featured: false,
    publishedAt: new Date("2026-10-18T16:45:00Z"),
    closesAt: new Date("2026-10-25T20:00:00Z"),
    options: [
      { key: "yes", label: "Yes, mandate the 4-day standard" },
      { key: "no", label: "No, leave it to free market negotiation" },
    ],
  },
  {
    title: "Should sovereign nations sign a binding treaty banning weaponization and territorial claims on lunar exploration zones?",
    slug: "lunar-space-demilitarization-treaty",
    category: "Geopolitics",
    summary: "As multinational lunar base missions near execution, space defense strategists argue for an updated Outer Space Treaty to preempt commercial and military skirmishes.",
    context: "The 1967 Outer Space Treaty lacks specific enforcement mechanisms for rare water-ice craters at lunar poles. As competing private and state missions converge on identical coordinates, sovereignty claims become a volatile flashpoint.",
    sourceReference: "United Nations Office for Outer Space Affairs (UNOOSA)",
    editorialNote: "International Treaties & Sovereignty",
    status: "published",
    featured: false,
    publishedAt: new Date("2026-10-17T09:20:00Z"),
    closesAt: new Date("2026-10-24T12:00:00Z"),
    options: [
      { key: "yes", label: "Yes, enforce demilitarized neutrality" },
      { key: "no", label: "No, national security sovereignty takes precedence" },
    ],
  },
  {
    title: "Should digital social networks with over 50 million active users be classified and regulated as common carrier utilities?",
    slug: "social-media-common-carrier-regulation",
    category: "Technology & AI",
    summary: "A fierce debate on algorithmic content curation, free expression rights, and market concentration culminated in an initial benchmark poll.",
    context: "Proponents argue that digital town squares wield monopolistic communication power and should be legally barred from arbitrary censorship. Opponents highlight private platform editorial rights.",
    sourceReference: "Stanford Cyber Policy Center Monograph",
    editorialNote: "Digital Rights & Communications Law",
    status: "closed",
    featured: false,
    publishedAt: new Date("2026-10-10T10:00:00Z"),
    closesAt: new Date("2026-10-17T18:00:00Z"),
    options: [
      { key: "yes", label: "Yes, regulate as public utilities" },
      { key: "no", label: "No, protect private platform discretion" },
    ],
  },
  {
    title: "Should national security export restrictions apply to commercial post-quantum encryption algorithms?",
    slug: "quantum-encryption-export-controls",
    category: "Technology & AI",
    summary: "Draft proposal analyzing international cryptographic controls, dual-use implications, and hardware barriers.",
    context: "Security agencies suggest advanced lattice cryptography presents strategic advantages and should be classified as munitions, while academia advocates for transparent global standards.",
    sourceReference: "National Institute of Standards and Technology (NIST)",
    editorialNote: "Cryptographic Security Track",
    status: "draft",
    featured: false,
    options: [
      { key: "yes", label: "Yes, restrict to approved alliance members" },
      { key: "no", label: "No, keep cryptographic standards open" },
    ],
  },
];

async function seed() {
  if (!MONGODB_URI) {
    console.error("Error: MONGODB_URI environment variable is missing.");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGODB_URI);

    // Find an administrator user to attribute creation to
    const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({ name: String, email: String, role: String }));
    let admin = await User.findOne({ role: "admin" });

    if (!admin) {
      console.warn("Notice: No administrator found. Looking for any verified user...");
      admin = await User.findOne();
    }

    if (!admin) {
      console.error("Error: Please run 'scripts/provision-admin.mjs' first to establish an administrator account.");
      await mongoose.disconnect();
      process.exit(1);
    }

    const PollSchema = new mongoose.Schema({
      title: String,
      slug: { type: String, unique: true },
      category: String,
      summary: String,
      context: String,
      sourceReference: String,
      editorialNote: String,
      createdBy: mongoose.Schema.Types.ObjectId,
      status: String,
      publishedAt: Date,
      closesAt: Date,
      featured: Boolean,
      options: [{ key: String, label: String }],
    }, { timestamps: true });

    const Poll = mongoose.models.Poll || mongoose.model("Poll", PollSchema);

    const existingCount = await Poll.countDocuments();
    if (existingCount > 0) {
      console.log(`Database already contains ${existingCount} poll(s).`);
      console.log("Seed skipped to prevent overwriting or duplicating active data.");
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log(`Seeding ${SAMPLE_POLLS.length} initial editorial polls attributed to admin [${admin.email}]...`);

    for (const pollData of SAMPLE_POLLS) {
      await Poll.create({
        ...pollData,
        createdBy: admin._id,
      });
      console.log(`  ✓ Created [${pollData.status.toUpperCase()}] "${pollData.title.slice(0, 45)}..."`);
    }

    console.log("Seed complete! All sample polls safely persisted in MongoDB.");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

seed();
