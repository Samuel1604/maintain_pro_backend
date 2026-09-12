import type { Types } from "mongoose";
export type PMStatus = "pending_approval" | "approved" | "rejected" | "cancelled";
export type PMOccurrenceStatus = "scheduled" | "generated" | "completed" | "cancelled";
export interface PMChecklistItem { label: string; required: boolean }
export type PMRecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly" | "interval";
export interface PMRecurrenceConfig {
  frequency: PMRecurrenceFrequency;
  interval: number;
  startDate: Date;
  endDate?: Date;
  weekdays?: number[];
  monthDay?: number;
}
export type PMOccurrenceApprovalState = "pending_approval" | "approved" | "rejected";
export type PMAssignmentTargetType = "user" | "vendor" | "team";
export interface PMAssignment { targetType: PMAssignmentTargetType; targetId: Types.ObjectId; assignedAt: Date; assignedBy: Types.ObjectId; }
export interface PMAssignmentChange { action: "assigned" | "reassigned" | "cleared"; previousTargetType?: PMAssignmentTargetType; previousTargetId?: Types.ObjectId; targetType?: PMAssignmentTargetType; targetId?: Types.ObjectId; actorId: Types.ObjectId; occurredAt: Date; }
