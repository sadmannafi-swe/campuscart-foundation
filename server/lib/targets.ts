import type { Moderation, ReportTarget } from "../../shared/types";
import { col } from "./db";

/** What the reports, messaging and admin code need to know about a module record. */
export interface TargetInfo {
  owner_id: string;
  university_slug: string;
  moderation: Moderation;
  title: string;
  subtitle: string;
  image: string | null;
  /** Price or rent for listings; 0 for blood requests and donor profiles. */
  amount: number;
  /** Whether new conversations may start about it (e.g. not for sold or cancelled items). */
  open: boolean;
}

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

export async function getTarget(kind: ReportTarget, id: string): Promise<TargetInfo | null> {
  switch (kind) {
    case "preowned": {
      const d = await col.preowned().findOne({ _id: id });
      return d
        ? {
            owner_id: d.owner_id,
            university_slug: d.university_slug,
            moderation: d.moderation,
            title: d.title,
            subtitle: `Pre-Owned · ${d.location}`,
            image: d.images[0] ?? null,
            amount: d.price,
            open: d.status === "available",
          }
        : null;
    }
    case "blood_request": {
      const d = await col.bloodRequests().findOne({ _id: id });
      return d
        ? {
            owner_id: d.owner_id,
            university_slug: d.university_slug,
            moderation: d.moderation,
            title: `${d.blood_group} blood needed`,
            subtitle: `${d.hospital_name} · needed ${fmtDate(d.needed_on)}`,
            image: null,
            amount: 0,
            open: d.status === "active",
          }
        : null;
    }
    case "donor": {
      const d = await col.donors().findOne({ _id: id });
      return d
        ? {
            owner_id: d.owner_id,
            university_slug: d.university_slug,
            moderation: d.moderation,
            title: `${d.blood_group} donor`,
            subtitle: `Blood donor · ${d.location}`,
            image: null,
            amount: 0,
            open: d.availability === "available",
          }
        : null;
    }
    case "basha": {
      const d = await col.basha().findOne({ _id: id });
      return d
        ? {
            owner_id: d.owner_id,
            university_slug: d.university_slug,
            moderation: d.moderation,
            title: d.title,
            subtitle: `BashaLagbe · ${d.area}`,
            image: d.images[0] ?? null,
            amount: d.rent,
            open: d.status === "available",
          }
        : null;
    }
  }
}

/** The collection behind each module, for admin moderation. */
export function moduleCollection(kind: ReportTarget) {
  switch (kind) {
    case "preowned":
      return col.preowned();
    case "blood_request":
      return col.bloodRequests();
    case "donor":
      return col.donors();
    case "basha":
      return col.basha();
  }
}
