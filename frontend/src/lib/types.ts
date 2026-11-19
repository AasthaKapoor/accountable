import type { ContactStatus, Stage } from "./stages";
import type { FollowUpStatus, Totals } from "./rules";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Organization {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  contact_count: number;
  deal_count: number;
  open_value_pence: number;
}

export interface OrganizationDetail extends Organization {
  contacts: Contact[];
  deals: Deal[];
  totals: Totals;
}

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  organization_id: number;
  organization_name: string;
  status: ContactStatus;
}

export interface ContactDetail extends Contact {
  deals: Deal[];
  timeline: Activity[];
}

export interface Deal {
  id: number;
  name: string;
  organization_id: number;
  organization_name: string;
  contact_id: number;
  contact_name: string;
  stage: Stage;
  value_pence: number;
  probability: number;
  probability_is_manual: boolean;
  close_date: string;
  position: number;
  furthest_stage: Stage;
  is_late: boolean;
  expected_pence: number;
}

export interface DealDetail extends Deal {
  timeline: Activity[];
}

export type ActivityType = "note" | "call" | "email" | "stage_change";

export interface Activity {
  id: number;
  type: ActivityType;
  description: string;
  occurred_at: string;
  contact_id: number | null;
  contact_name: string | null;
  deal_id: number | null;
  deal_name: string | null;
  subject_label: string;
  follow_up_date: string | null;
  follow_up_done: boolean;
  follow_up_status: FollowUpStatus;
  new_stage: Stage | null;
}

export interface ColumnTotals {
  value_pence: number | null;
  expected_pence: number | null;
  count: number;
}

export interface PipelineColumn {
  stage: Stage;
  deals: Deal[];
  totals: ColumnTotals;
}

export interface Pipeline {
  columns: PipelineColumn[];
  totals: Totals;
}

export interface MoveResult {
  deal: Deal;
  totals: { board: Totals; columns: Record<Stage, ColumnTotals> };
}

export interface Dashboard {
  today: string;
  totals: Totals;
  late_count: number;
  won_this_month_pence: number;
  won_last_month_pence: number;
  win_rate: { days: number; won: number; lost: number; percent: number | null };
  months: { month: string; won_pence: number; won_count: number; lost_count: number }[];
  stages: (Totals & { stage: Stage })[];
  funnel: { stage: Stage; value_pence: number; count: number }[];
  follow_ups: { overdue: Activity[]; upcoming: Activity[] };
  recent_activity: Activity[];
}

export interface Blocking {
  type: "contact" | "deal";
  id: number;
  name: string;
}
