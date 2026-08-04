import Joi from 'joi';

const schemas = {
  signup: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().min(2).max(60).required()
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  sendOtp: Joi.object({
    email: Joi.string().email().required(),
    intent: Joi.string().valid('signup', 'login').required()
  }),
  verifyOtp: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().pattern(/^\d{6}$/).required(),
    intent: Joi.string().valid('signup', 'login').required(),
    name: Joi.string().min(2).max(60).when('intent', { is: 'signup', then: Joi.required() }),
    password: Joi.string().min(8).when('intent', { is: 'signup', then: Joi.required() })
  }),
  refresh: Joi.object({ refresh: Joi.string().required() }),
  createSession: Joi.object({
    projectName: Joi.string().max(120).required(),
    mode: Joi.string().valid('god', 'init', 'run', 'watch', 'manual').required(),
    plan: Joi.object({
      summary: Joi.string().allow(''),
      todos: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required(),
        domain: Joi.string().required(),
        dependsOn: Joi.array().items(Joi.string()),
        status: Joi.string(),
        assignedModel: Joi.string().allow(null, ''),
        startedAt: Joi.date().allow(null),
        finishedAt: Joi.date().allow(null)
      }))
    }).default({ summary: '', todos: [] })
  }),
  updateSession: Joi.object({
    status: Joi.string().valid('planning', 'running', 'completed', 'failed'),
    summary: Joi.string()
  }).min(1),
  publishPlugin: Joi.object({
    name: Joi.string().min(2).max(60).required(),
    description: Joi.string().max(300).required(),
    category: Joi.string().required(),
    version: Joi.string().required(),
    manifestUrl: Joi.string().uri().required()
  }),
  watchActivityQuery: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    outcome: Joi.string().valid('auto-fixed', 'no-issues', 'needs-review')
  })
};

export function validate(schemaName) {
  const schema = schemas[schemaName];
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body || req.query, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: error.details[0].message } });
    }
    if (req.body) req.body = value;
    if (req.query) req.query = value;
    next();
  };
}
