// ponytail: in-memory, resets on container restart; the Coolify task log is the durable record.
export const cronState: {
  last: { at: string; success: boolean; error?: string } | null;
} = { last: null };
