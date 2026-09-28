import { z } from 'zod';

const schemas = {
  signup: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2).max(60)
  }),
  login: z.object({
    email: z.string().email(),
    password: z.string()
  }),
  sendOtp: z.object({
    email: z.string().email(),
    intent: z.enum(['signup', 'login', 'reset'])
  }),
  verifyOtp: z.object({
    email: z.string().email(),
    otp: z.string().regex(/^\d{8}$/),
    intent: z.enum(['signup', 'login', 'reset']),
    name: z.string().min(2).max(60).optional(),
    password: z.string().min(8).optional()
  }).superRefine((data, ctx) => {
    if (data.intent === 'signup') {
      if (data.name === undefined) {
        ctx.addIssue({ code: 'custom', path: ['name'], message: 'name is required when intent is signup' });
      }
      if (data.password === undefined) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: 'password is required when intent is signup' });
      }
    }
  }),
  refresh: z.object({ refresh: z.string().optional() }),
  resetPassword: z.object({
    email: z.string().email(),
    otp: z.string().regex(/^\d{8}$/),
    password: z.string().min(8)
  }),
  createSession: z.object({
    projectName: z.string().max(120),
    mode: z.enum(['god', 'init', 'run', 'watch', 'manual']),
    plan: z.object({
      summary: z.string().optional(),
      todos: z.array(z.object({
        id: z.string(),
        title: z.string(),
        domain: z.string(),
        dependsOn: z.array(z.string()).optional(),
        status: z.string().optional(),
        assignedModel: z.string().nullish(),
        startedAt: z.coerce.date().nullish(),
        finishedAt: z.coerce.date().nullish()
      })).optional()
    }).default({ summary: '', todos: [] })
  }),
  updateSession: z.object({
    status: z.enum(['planning', 'running', 'completed', 'failed']).optional(),
    summary: z.string().optional()
  }).refine((data) => data.status !== undefined || data.summary !== undefined, {
    message: 'at least one of status or summary is required'
  }),
  publishPlugin: z.object({
    name: z.string().min(2).max(60),
    description: z.string().max(300),
    category: z.string(),
    version: z.string(),
    manifestUrl: z.string().url()
  }),
  watchActivityQuery: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    outcome: z.enum(['auto-fixed', 'no-issues', 'needs-review']).optional()
  })
};

export function validate(schemaName) {
  const schema = schemas[schemaName];
  return (req, res, next) => {
    const result = schema.safeParse(req.body || req.query);
    if (!result.success) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: result.error.issues[0].message } });
    }
    const value = result.data;
    if (req.body) req.body = value;
    if (req.query) req.query = value;
    next();
  };
}
