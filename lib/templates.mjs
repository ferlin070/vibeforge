export const templates = [
  {
    id: "homestay",
    category: "Hospitality",
    name: "Homestay Booking",
    type: "Web application",
    audience: "Property owners, staff and guests in Malaysia",
    idea: "Build a responsive homestay website and booking workspace. Plan room availability, date conflicts, guest enquiries, owner dashboard, cancellation rules, manual payment verification and accessibility. Confirm data retention and payment scope before implementation.",
  },
  {
    id: "restaurant",
    category: "Retail",
    name: "Restaurant Ordering",
    type: "Web application",
    audience: "Restaurant owners, staff and customers",
    idea: "Plan a mobile-first menu, cart, pickup or dine-in ordering, availability, order status and staff dashboard. Define pricing, validation, customer privacy and failed-order recovery. Do not assume live payment integration.",
  },
  {
    id: "education",
    category: "Education",
    name: "Teacher AI Toolkit",
    type: "Web application",
    audience: "Teachers and education administrators",
    idea: "Plan lesson materials, quiz generation, teacher review, export and accessible learning activities. Define source verification and student-data minimization; exclude student profiling and unreviewed assessment decisions.",
  },
  {
    id: "inventory",
    category: "Business",
    name: "Inventory Workspace",
    type: "Web application",
    audience: "Small business inventory operators",
    idea: "Plan product records, stock movements, supplier details, role-based access, audit trail, reconciliation and low-stock alerts. Specify concurrent stock updates, validation and reversible correction workflows.",
  },
  {
    id: "saas",
    category: "Business",
    name: "SaaS Customer Portal",
    type: "SaaS",
    audience: "Small business customers and operators",
    idea: "Plan onboarding, tenant isolation, customer dashboard, support and subscription lifecycle. Specify server-side entitlement checks, idempotent payment events, cancellation and data export. No live billing until approved and tested.",
  },
  {
    id: "portfolio",
    category: "Marketing",
    name: "Professional Portfolio",
    type: "Website",
    audience: "Freelancers and prospective clients",
    idea: "Plan a responsive professional portfolio, case studies, service pages, contact form, metadata, accessible navigation and performance budgets. Verify consent and minimize collected personal data.",
  },
  {
    id: "automation",
    category: "Automation",
    name: "Business Automation Agent",
    type: "AI agent",
    audience: "Business operators and reviewers",
    idea: "Plan an assistant that proposes routine workflow actions for human review. Define allowed tools, least privilege, confirmation for external changes, redaction, failure recovery and auditability. No autonomous external writes by default.",
  },
  {
    id: "mobile",
    category: "Business",
    name: "Field Service Mobile App",
    type: "Mobile application",
    audience: "Field technicians and supervisors",
    idea: "Plan job assignments, offline drafts, photo evidence with consent, sync conflict handling, role permissions, accessibility and secure device storage. Confirm connectivity and supported device requirements.",
  },
];

export function findTemplates(query = "", category = "All") {
  const term = query.trim().toLowerCase();
  return templates.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      [item.name, item.type, item.idea, item.category].some((value) =>
        value.toLowerCase().includes(term),
      ),
  );
}

export function templateDraft(id) {
  const item = templates.find((entry) => entry.id === id);
  if (!item) throw Error("Unknown template.");
  return {
    name: item.name,
    type: item.type,
    idea: item.idea,
    audience: item.audience,
    agent: "Universal",
  };
}
