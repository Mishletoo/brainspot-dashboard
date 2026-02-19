import type { Employee } from "@/components/employees/types";
import type { Client } from "@/components/clients/types";
import type { Service } from "@/components/services/types";
import type { Task } from "@/components/tasks/types";
import type { ClientService } from "@/components/client-services/types";
import type { MonthlyReport, TimeEntry } from "@/components/reports/types";
import { computeHourlyCost } from "@/components/employees/storage";

const DEMO_KEYS = [
  "brainspot_employees_v1",
  "brainspot_clients_v1",
  "brainspot_services_v1",
  "brainspot_tasks_v1",
  "brainspot_client_services_v1",
  "brainspot_monthly_reports_v1",
  "brainspot_time_entries_v1",
] as const;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function hasDemoData(): boolean {
  if (typeof window === "undefined") return false;
  return DEMO_KEYS.some((k) => {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return false;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  });
}

export function buildDemoData() {
  const now = new Date().toISOString();
  const monthKey = currentMonthKey();

  // ── Employees ────────────────────────────────────────────────────────────────
  const employees: Employee[] = [
    {
      id: "emp_anna_demo",
      fullName: "Anna Kowalska",
      email: "anna@digitalnosti.bg",
      role: "ADMIN",
      workdayHours: 8,
      salaryFixed: 3000,
      bonusFixed: 0,
      vouchersFixed: 200,
      hourlyCost: computeHourlyCost(3000, 0, 200, 8),
      isActive: true,
      createdAt: now,
    },
    {
      id: "demo_emp_martin",
      fullName: "Martin Vasilev",
      email: "martin@digitalnosti.bg",
      role: "EMPLOYEE",
      workdayHours: 8,
      salaryFixed: 2000,
      bonusFixed: 200,
      vouchersFixed: 150,
      hourlyCost: computeHourlyCost(2000, 200, 150, 8),
      isActive: true,
      createdAt: now,
    },
    {
      id: "demo_emp_elena",
      fullName: "Elena Todorova",
      email: "elena@digitalnosti.bg",
      role: "EMPLOYEE",
      workdayHours: 6,
      salaryFixed: 1800,
      bonusFixed: 100,
      vouchersFixed: 150,
      hourlyCost: computeHourlyCost(1800, 100, 150, 6),
      isActive: true,
      createdAt: now,
    },
  ];

  // ── Clients ──────────────────────────────────────────────────────────────────
  const clients: Client[] = [
    {
      id: "demo_cli_techcorp",
      name: "TechCorp Solutions",
      company: "TechCorp Ltd.",
      email: "contact@techcorp.bg",
      phone: "+359 2 123 4567",
      notes: "Key enterprise client — monthly retainer + performance commission.",
      createdAt: now,
    },
    {
      id: "demo_cli_pixel",
      name: "Pixel Agency",
      company: "Pixel Creative EOOD",
      email: "hello@pixelagency.com",
      phone: "+359 88 456 7890",
      notes: "Digital-first creative agency. Hourly SEO & content work.",
      createdAt: now,
    },
    {
      id: "demo_cli_mega",
      name: "MegaBrand",
      company: "MegaBrand International OOD",
      email: "marketing@megabrand.bg",
      phone: "+359 87 321 0987",
      notes: "Large retail client — social media, PPC, and SEO retainers.",
      createdAt: now,
    },
  ];

  // ── Services ─────────────────────────────────────────────────────────────────
  const services: Service[] = [
    {
      id: "demo_svc_social",
      name: "Social Media Management",
      description: "Full social media management across all major platforms.",
      pricingType: "FIXED_MONTHLY",
      createdAt: now,
    },
    {
      id: "demo_svc_ppc",
      name: "PPC Advertising",
      description: "Paid search and display advertising on Google & Meta.",
      pricingType: "HOURLY",
      createdAt: now,
    },
    {
      id: "demo_svc_seo",
      name: "SEO Optimization",
      description: "On-page, technical, and off-page SEO services.",
      pricingType: "FIXED_MONTHLY",
      createdAt: now,
    },
    {
      id: "demo_svc_commission",
      name: "Performance Commission",
      description: "Revenue-based commission model tied to e-commerce results.",
      pricingType: "COMMISSION",
      createdAt: now,
    },
    {
      id: "demo_svc_content",
      name: "Content Creation",
      description: "Blog posts, website copy, and video scripts.",
      pricingType: "HOURLY",
      createdAt: now,
    },
  ];

  // ── Tasks (12 spread across services) ────────────────────────────────────────
  const tasks: Task[] = [
    // Social Media (3)
    { id: "demo_task_sm1", serviceId: "demo_svc_social", name: "Post Scheduling & Publishing", isActive: true, createdAt: now },
    { id: "demo_task_sm2", serviceId: "demo_svc_social", name: "Community Management", isActive: true, createdAt: now },
    { id: "demo_task_sm3", serviceId: "demo_svc_social", name: "Social Analytics Reporting", isActive: true, createdAt: now },
    // PPC (3)
    { id: "demo_task_ppc1", serviceId: "demo_svc_ppc", name: "Campaign Setup & Structure", isActive: true, createdAt: now },
    { id: "demo_task_ppc2", serviceId: "demo_svc_ppc", name: "Bid Optimisation", isActive: true, createdAt: now },
    { id: "demo_task_ppc3", serviceId: "demo_svc_ppc", name: "Ad Copywriting & A/B Testing", isActive: true, createdAt: now },
    // SEO (2)
    { id: "demo_task_seo1", serviceId: "demo_svc_seo", name: "On-Page Optimisation", isActive: true, createdAt: now },
    { id: "demo_task_seo2", serviceId: "demo_svc_seo", name: "Keyword Research & Mapping", isActive: true, createdAt: now },
    // Performance Commission (2)
    { id: "demo_task_com1", serviceId: "demo_svc_commission", name: "Revenue Tracking & Attribution", isActive: true, createdAt: now },
    { id: "demo_task_com2", serviceId: "demo_svc_commission", name: "Conversion Rate Analysis", isActive: true, createdAt: now },
    // Content (2)
    { id: "demo_task_cnt1", serviceId: "demo_svc_content", name: "Blog Writing", isActive: true, createdAt: now },
    { id: "demo_task_cnt2", serviceId: "demo_svc_content", name: "Video Scripts & Storyboards", isActive: true, createdAt: now },
  ];

  // ── ClientServices ────────────────────────────────────────────────────────────
  // TechCorp  → Social Media (fixed 1500 €/mo), PPC (85 €/h), Commission (30 %)
  // Pixel     → SEO (fixed 900 €/mo), Content (70 €/h)
  // MegaBrand → Social Media (fixed 2200 €/mo), PPC (95 €/h), SEO (fixed 1200 €/mo)
  const clientServices: ClientService[] = [
    { id: "demo_cs_tech_social",   clientId: "demo_cli_techcorp", serviceId: "demo_svc_social",     pricingType: "FIXED_MONTHLY", monthlyFixedPrice: 1500,                        createdAt: now },
    { id: "demo_cs_tech_ppc",      clientId: "demo_cli_techcorp", serviceId: "demo_svc_ppc",        pricingType: "HOURLY",        hourlyRate: 85,                                 createdAt: now },
    { id: "demo_cs_tech_comm",     clientId: "demo_cli_techcorp", serviceId: "demo_svc_commission", pricingType: "COMMISSION",    commissionRatePct: 30,                          createdAt: now },
    { id: "demo_cs_pixel_seo",     clientId: "demo_cli_pixel",    serviceId: "demo_svc_seo",        pricingType: "FIXED_MONTHLY", monthlyFixedPrice: 900,                         createdAt: now },
    { id: "demo_cs_pixel_content", clientId: "demo_cli_pixel",    serviceId: "demo_svc_content",    pricingType: "HOURLY",        hourlyRate: 70,                                 createdAt: now },
    { id: "demo_cs_mega_social",   clientId: "demo_cli_mega",     serviceId: "demo_svc_social",     pricingType: "FIXED_MONTHLY", monthlyFixedPrice: 2200,                        createdAt: now },
    { id: "demo_cs_mega_ppc",      clientId: "demo_cli_mega",     serviceId: "demo_svc_ppc",        pricingType: "HOURLY",        hourlyRate: 95,                                 createdAt: now },
    { id: "demo_cs_mega_seo",      clientId: "demo_cli_mega",     serviceId: "demo_svc_seo",        pricingType: "FIXED_MONTHLY", monthlyFixedPrice: 1200,                        createdAt: now },
  ];

  // ── Monthly Reports (one per employee for current month) ─────────────────────
  const reports: MonthlyReport[] = [
    { id: "demo_rep_anna",   employeeId: "emp_anna_demo",   monthKey, status: "OPEN",      createdAt: now },
    { id: "demo_rep_martin", employeeId: "demo_emp_martin", monthKey, status: "SUBMITTED", submittedAt: now, createdAt: now },
    { id: "demo_rep_elena",  employeeId: "demo_emp_elena",  monthKey, status: "OPEN",      createdAt: now },
  ];

  // ── Time Entries (13 entries across 3 clients) ────────────────────────────────
  const entries: TimeEntry[] = [
    // Anna — TechCorp (social + ppc + commission)
    { id: "demo_te_001", reportId: "demo_rep_anna",   employeeId: "emp_anna_demo",   clientId: "demo_cli_techcorp", clientServiceId: "demo_cs_tech_social", serviceId: "demo_svc_social",     taskId: "demo_task_sm1",  hours: 3, notes: "Scheduled weekly content calendar",        createdAt: now },
    { id: "demo_te_002", reportId: "demo_rep_anna",   employeeId: "emp_anna_demo",   clientId: "demo_cli_techcorp", clientServiceId: "demo_cs_tech_social", serviceId: "demo_svc_social",     taskId: "demo_task_sm2",  hours: 2, notes: "Responded to comments and DMs",             createdAt: now },
    { id: "demo_te_003", reportId: "demo_rep_anna",   employeeId: "emp_anna_demo",   clientId: "demo_cli_techcorp", clientServiceId: "demo_cs_tech_ppc",    serviceId: "demo_svc_ppc",        taskId: "demo_task_ppc1", hours: 4, notes: "Set up Q1 Google Ads campaigns",            createdAt: now },
    { id: "demo_te_004", reportId: "demo_rep_anna",   employeeId: "emp_anna_demo",   clientId: "demo_cli_techcorp", clientServiceId: "demo_cs_tech_comm",   serviceId: "demo_svc_commission", taskId: "demo_task_com1", hours: 2, notes: "Monthly revenue attribution analysis",      createdAt: now },
    // Anna — Pixel Agency (seo)
    { id: "demo_te_005", reportId: "demo_rep_anna",   employeeId: "emp_anna_demo",   clientId: "demo_cli_pixel",    clientServiceId: "demo_cs_pixel_seo",   serviceId: "demo_svc_seo",        taskId: "demo_task_seo1", hours: 3, notes: "Updated meta tags and page structure",      createdAt: now },
    // Martin — TechCorp (ppc)
    { id: "demo_te_006", reportId: "demo_rep_martin", employeeId: "demo_emp_martin", clientId: "demo_cli_techcorp", clientServiceId: "demo_cs_tech_ppc",    serviceId: "demo_svc_ppc",        taskId: "demo_task_ppc2", hours: 5, notes: "Optimised bids for branded keywords",       createdAt: now },
    { id: "demo_te_007", reportId: "demo_rep_martin", employeeId: "demo_emp_martin", clientId: "demo_cli_techcorp", clientServiceId: "demo_cs_tech_ppc",    serviceId: "demo_svc_ppc",        taskId: "demo_task_ppc3", hours: 3, notes: "Wrote 8 ad variants for A/B test",           createdAt: now },
    // Martin — MegaBrand (social + ppc)
    { id: "demo_te_008", reportId: "demo_rep_martin", employeeId: "demo_emp_martin", clientId: "demo_cli_mega",     clientServiceId: "demo_cs_mega_social", serviceId: "demo_svc_social",     taskId: "demo_task_sm3",  hours: 4, notes: "Prepared monthly analytics report deck",    createdAt: now },
    { id: "demo_te_009", reportId: "demo_rep_martin", employeeId: "demo_emp_martin", clientId: "demo_cli_mega",     clientServiceId: "demo_cs_mega_ppc",    serviceId: "demo_svc_ppc",        taskId: "demo_task_ppc1", hours: 6, notes: "Launched new display campaign",             createdAt: now },
    // Elena — Pixel Agency (seo + content)
    { id: "demo_te_010", reportId: "demo_rep_elena",  employeeId: "demo_emp_elena",  clientId: "demo_cli_pixel",    clientServiceId: "demo_cs_pixel_seo",   serviceId: "demo_svc_seo",        taskId: "demo_task_seo2", hours: 4, notes: "Keyword gap analysis vs competitors",       createdAt: now },
    { id: "demo_te_011", reportId: "demo_rep_elena",  employeeId: "demo_emp_elena",  clientId: "demo_cli_pixel",    clientServiceId: "demo_cs_pixel_content", serviceId: "demo_svc_content",  taskId: "demo_task_cnt1", hours: 5, notes: "Wrote 3 SEO blog posts",                    createdAt: now },
    // Elena — MegaBrand (social + seo)
    { id: "demo_te_012", reportId: "demo_rep_elena",  employeeId: "demo_emp_elena",  clientId: "demo_cli_mega",     clientServiceId: "demo_cs_mega_social", serviceId: "demo_svc_social",     taskId: "demo_task_sm1",  hours: 3, notes: "Content calendar for Instagram & LinkedIn", createdAt: now },
    { id: "demo_te_013", reportId: "demo_rep_elena",  employeeId: "demo_emp_elena",  clientId: "demo_cli_mega",     clientServiceId: "demo_cs_mega_seo",    serviceId: "demo_svc_seo",        taskId: "demo_task_seo1", hours: 4, notes: "Technical SEO audit and recommendations",   createdAt: now },
  ];

  return { employees, clients, services, tasks, clientServices, reports, entries };
}

export function seedDemoData(): void {
  if (typeof window === "undefined") return;

  const { employees, clients, services, tasks, clientServices, reports, entries } =
    buildDemoData();

  localStorage.setItem("brainspot_employees_v1",       JSON.stringify(employees));
  localStorage.setItem("brainspot_clients_v1",         JSON.stringify(clients));
  localStorage.setItem("brainspot_services_v1",        JSON.stringify(services));
  localStorage.setItem("brainspot_tasks_v1",           JSON.stringify(tasks));
  localStorage.setItem("brainspot_client_services_v1", JSON.stringify(clientServices));
  localStorage.setItem("brainspot_monthly_reports_v1", JSON.stringify(reports));
  localStorage.setItem("brainspot_time_entries_v1",    JSON.stringify(entries));

  // Merge demo passwords without clobbering any real ones
  let passwords: Record<string, string> = {};
  try {
    const raw = localStorage.getItem("brainspot_passwords_v1");
    if (raw) passwords = JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }
  passwords["emp_anna_demo"]   = "admin123";
  passwords["demo_emp_martin"] = "demo123";
  passwords["demo_emp_elena"]  = "demo123";
  localStorage.setItem("brainspot_passwords_v1", JSON.stringify(passwords));
}

export function clearAllDemoData(): void {
  if (typeof window === "undefined") return;

  const allKeys = [
    "brainspot_employees_v1",
    "brainspot_passwords_v1",
    "brainspot_clients_v1",
    "brainspot_services_v1",
    "brainspot_tasks_v1",
    "brainspot_client_services_v1",
    "brainspot_monthly_reports_v1",
    "brainspot_time_entries_v1",
    "brainspot_edit_requests_v1",
  ];
  allKeys.forEach((k) => localStorage.removeItem(k));

  // Re-seed the base admin so the current session stays valid
  const hourlyCost = computeHourlyCost(3000, 0, 200, 8);
  const admin: Employee = {
    id: "emp_anna_demo",
    fullName: "Anna",
    email: "anna@digitalnosti.bg",
    role: "ADMIN",
    workdayHours: 8,
    salaryFixed: 3000,
    bonusFixed: 0,
    vouchersFixed: 200,
    hourlyCost,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem("brainspot_employees_v1", JSON.stringify([admin]));
  localStorage.setItem(
    "brainspot_passwords_v1",
    JSON.stringify({ emp_anna_demo: "admin123" })
  );
}
