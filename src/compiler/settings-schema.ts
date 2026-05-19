// Zod schema for the slice of .claude/settings.json that wisp-rulecast touches.
// Deliberately permissive: we MUST preserve every key we don't own, so hook
// entries are typed as opaque records and the top-level allows passthrough.

import { z } from "zod";

const HookEntrySchema = z.record(z.unknown());

const HookGroupSchema = z
  .object({
    matcher: z.string().optional(),
    hooks: z.array(HookEntrySchema),
  })
  .passthrough();

export const HooksSectionSchema = z
  .object({
    PreToolUse: z.array(HookGroupSchema).optional(),
    PostToolUse: z.array(HookGroupSchema).optional(),
  })
  .passthrough();

export const SettingsSchema = z
  .object({
    hooks: HooksSectionSchema.optional(),
  })
  .passthrough();

export type Settings = z.infer<typeof SettingsSchema>;
export type HooksSection = z.infer<typeof HooksSectionSchema>;
export type HookGroupRaw = z.infer<typeof HookGroupSchema>;

export function emptySettings(): Settings {
  return { hooks: { PreToolUse: [], PostToolUse: [] } };
}
