import YAML from 'yamljs';

const specYaml = `
openapi: 3.0.3
info:
  title: mcode backend API
  version: 2.4.6
  description: >
    REST API for the mcode backend — authentication, workspaces, API keys and
    usage reporting. All endpoints except /auth/* require a JWT Bearer token
    (or the mcode_access / mcode_refresh cookies).
servers:
  - url: /api/v1
tags:
  - name: auth
  - name: workspaces
  - name: keys
  - name: usage
paths:
  /auth/send-otp:
    post:
      tags: [auth]
      summary: Send a one-time verification code
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, intent]
              properties:
                email: { type: string, format: email }
                intent: { type: string, enum: [signup, login, reset] }
      responses:
        '200':
          description: Code accepted. Unknown emails for login/reset return success without sending anything.
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  expiresInSec: { type: integer }
                  delivered: { type: boolean }
  /auth/verify-otp:
    post:
      tags: [auth]
      summary: Verify a code and receive session tokens
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, otp, intent]
              properties:
                email: { type: string, format: email }
                otp: { type: string, pattern: '^\\d{8}$' }
                intent: { type: string, enum: [signup, login, reset] }
                name: { type: string, minLength: 2, maxLength: 60 }
                password: { type: string, minLength: 8 }
      responses:
        '200':
          description: Tokens issued (signup creates the account on first verify)
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: '#/components/schemas/User' }
                  accessToken: { type: string }
                  refreshToken: { type: string }
  /auth/signup:
    post:
      tags: [auth]
      summary: Register a new account
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password, name]
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 8 }
                name: { type: string, minLength: 2, maxLength: 60 }
      responses:
        '201':
          description: Account created
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: '#/components/schemas/User' }
                  accessToken: { type: string }
                  refreshToken: { type: string }
  /auth/login:
    post:
      tags: [auth]
      summary: Log in with email and password
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string }
      responses:
        '200':
          description: Tokens issued
          content:
            application/json:
              schema:
                type: object
                properties:
                  user: { $ref: '#/components/schemas/User' }
                  accessToken: { type: string }
                  refreshToken: { type: string }
  /auth/reset-password:
    post:
      tags: [auth]
      summary: Reset password with a reset-intent OTP
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, otp, password]
              properties:
                email: { type: string, format: email }
                otp: { type: string, pattern: '^\\d{8}$' }
                password: { type: string, minLength: 8 }
      responses:
        '200':
          description: Password updated
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
  /auth/refresh:
    post:
      tags: [auth]
      summary: Rotate a refresh token
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                refresh: { type: string }
      responses:
        '200':
          description: New token pair
          content:
            application/json:
              schema:
                type: object
                properties:
                  accessToken: { type: string }
                  refreshToken: { type: string }
  /auth/me:
    get:
      tags: [auth]
      summary: Get the current user
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Current user profile
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
    patch:
      tags: [auth]
      summary: Update name and/or settings
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string, maxLength: 100 }
                settings: { type: object }
      responses:
        '200':
          description: Updated user profile
          content:
            application/json:
              schema: { $ref: '#/components/schemas/User' }
    delete:
      tags: [auth]
      summary: Delete the current account (requires current password)
      security: [{ bearerAuth: [] }]
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                currentPassword: { type: string }
      responses:
        '200':
          description: Account deleted
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
  /auth/sessions:
    get:
      tags: [auth]
      summary: List active refresh sessions
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Active sessions
          content:
            application/json:
              schema:
                type: object
                properties:
                  sessions:
                    type: array
                    items: { $ref: '#/components/schemas/RefreshSession' }
    delete:
      tags: [auth]
      summary: Revoke all refresh sessions
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: All sessions revoked
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
  /auth/sessions/{jti}:
    delete:
      tags: [auth]
      summary: Revoke a single refresh session
      security: [{ bearerAuth: [] }]
      parameters:
        - name: jti
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Session revoked
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
  /auth/change-password:
    post:
      tags: [auth]
      summary: Change password (current password or login OTP)
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [newPassword]
              properties:
                currentPassword: { type: string }
                otp: { type: string }
                newPassword: { type: string, minLength: 8 }
      responses:
        '200':
          description: Password changed
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
  /workspaces:
    get:
      tags: [workspaces]
      summary: List the user's workspaces
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Workspaces sorted newest first
          content:
            application/json:
              schema:
                type: object
                properties:
                  workspaces:
                    type: array
                    items: { $ref: '#/components/schemas/Workspace' }
    post:
      tags: [workspaces]
      summary: Create a workspace from a ZIP upload or a git clone
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [name, source]
              properties:
                name: { type: string }
                source: { type: string, enum: [zip, git, duplicate] }
                zipfile: { type: string, format: binary }
                repoUrl: { type: string }
                branch: { type: string }
                files:
                  type: array
                  items:
                    type: object
                    properties:
                      path: { type: string }
                      content: { type: string }
          application/json:
            schema:
              type: object
              required: [name, source]
              properties:
                name: { type: string }
                source: { type: string, enum: [zip, git, duplicate] }
                repoUrl: { type: string }
                branch: { type: string }
                files:
                  type: array
                  items:
                    type: object
                    properties:
                      path: { type: string }
                      content: { type: string }
      responses:
        '201':
          description: Workspace created
          content:
            application/json:
              schema:
                type: object
                properties:
                  workspace: { $ref: '#/components/schemas/Workspace' }
  /workspaces/{id}/files:
    get:
      tags: [workspaces]
      summary: Recursive file listing
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: File tree (node_modules/.git excluded)
          content:
            application/json:
              schema:
                type: object
                properties:
                  files:
                    type: array
                    items:
                      type: object
                      properties:
                        path: { type: string }
                        name: { type: string }
  /workspaces/{id}/search:
    get:
      tags: [workspaces]
      summary: Search file contents across the workspace
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
        - name: q
          in: query
          required: true
          schema: { type: string }
        - name: matchCase
          in: query
          schema: { type: boolean }
        - name: wholeWord
          in: query
          schema: { type: boolean }
        - name: useRegex
          in: query
          schema: { type: boolean }
        - name: include
          in: query
          schema: { type: string }
        - name: exclude
          in: query
          schema: { type: string }
      responses:
        '200':
          description: Matching lines
          content:
            application/json:
              schema:
                type: object
                properties:
                  results:
                    type: array
                    items:
                      type: object
                      properties:
                        path: { type: string }
                        line: { type: integer }
                        lineText: { type: string }
  /workspaces/{id}/file:
    get:
      tags: [workspaces]
      summary: Read a file
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
        - name: path
          in: query
          required: true
          schema: { type: string }
      responses:
        '200':
          description: File content
          content:
            application/json:
              schema:
                type: object
                properties:
                  path: { type: string }
                  content: { type: string }
    post:
      tags: [workspaces]
      summary: Create a file (and parent directories)
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [path]
              properties:
                path: { type: string }
                content: { type: string }
      responses:
        '201':
          description: File created
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  path: { type: string }
    put:
      tags: [workspaces]
      summary: Overwrite a file
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
        - name: path
          in: query
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                content: { type: string }
      responses:
        '200':
          description: File written
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  path: { type: string }
    delete:
      tags: [workspaces]
      summary: Delete a file or directory
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
        - name: path
          in: query
          required: true
          schema: { type: string }
      responses:
        '200':
          description: File or directory deleted
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  deleted: { type: string }
  /workspaces/{id}/folder:
    post:
      tags: [workspaces]
      summary: Create a directory
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [path]
              properties:
                path: { type: string }
      responses:
        '201':
          description: Directory created
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  path: { type: string }
  /workspaces/{id}/rename-file:
    post:
      tags: [workspaces]
      summary: Rename a file or directory
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [oldPath, newPath]
              properties:
                oldPath: { type: string }
                newPath: { type: string }
      responses:
        '200':
          description: Renamed
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  oldPath: { type: string }
                  newPath: { type: string }
  /workspaces/{id}/export:
    get:
      tags: [workspaces]
      summary: Export the workspace as a ZIP archive (1GB limit)
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: ZIP archive
          content:
            application/zip:
              schema: { type: string, format: binary }
  /workspaces/{id}/branches:
    get:
      tags: [workspaces]
      summary: List local git branches
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Branch list
          content:
            application/json:
              schema:
                type: object
                properties:
                  branches:
                    type: array
                    items: { type: string }
                  current: { type: string }
  /workspaces/{id}/git-status:
    get:
      tags: [workspaces]
      summary: Git status for the workspace repo
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Status summary
          content:
            application/json:
              schema:
                type: object
                properties:
                  branch: { type: string }
                  modified:
                    type: array
                    items: { type: string }
                  untracked:
                    type: array
                    items: { type: string }
                  notRepo: { type: boolean }
  /workspaces/{id}/checkout:
    post:
      tags: [workspaces]
      summary: Checkout or create a branch
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [branch]
              properties:
                branch: { type: string }
                create: { type: boolean }
      responses:
        '200':
          description: Branch checked out
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  branch: { type: string }
  /workspaces/{id}/diff:
    get:
      tags: [workspaces]
      summary: Unified git diff for a file (or the whole repo)
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
        - name: path
          in: query
          schema: { type: string }
      responses:
        '200':
          description: Unified diff
          content:
            application/json:
              schema:
                type: object
                properties:
                  diff: { type: string }
  /workspaces/{id}/hunks:
    post:
      tags: [workspaces]
      summary: Apply selected unified-diff hunks to a file
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [path, hunks, selected]
              properties:
                path: { type: string }
                hunks:
                  type: array
                  items:
                    type: object
                    properties:
                      oldStart: { type: integer }
                      lines:
                        type: array
                        items: { type: string }
                selected:
                  type: array
                  items: { type: boolean }
      responses:
        '200':
          description: Hunks applied
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  applied: { type: integer }
                  of: { type: integer }
  /workspaces/{id}/push:
    post:
      tags: [workspaces]
      summary: Commit tracked changes and push (requires GitHub connection)
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [message, branch]
              properties:
                message: { type: string }
                branch: { type: string }
                githubRepo: { type: string }
      responses:
        '200':
          description: Pushed
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  untrackedLeftOut: { type: integer }
  /workspaces/{id}/upload:
    post:
      tags: [workspaces]
      summary: Upload files (or a folder tree) into the workspace
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                files:
                  type: array
                  items: { type: string, format: binary }
                relativePaths: { type: string }
      responses:
        '200':
          description: Files copied into the workspace
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  uploadedFiles:
                    type: array
                    items: { type: string }
  /keys:
    get:
      tags: [keys]
      summary: List the user's saved API keys (masked)
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Masked keys
          content:
            application/json:
              schema:
                type: object
                properties:
                  keys:
                    type: array
                    items: { $ref: '#/components/schemas/ApiKey' }
    post:
      tags: [keys]
      summary: Save or update a provider API key
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [providerId, apiKey]
              properties:
                providerId: { type: string }
                apiKey: { type: string }
                envVar: { type: string }
                displayName: { type: string }
                model: { type: string }
                baseUrl: { type: string }
                apiFormat: { type: string }
      responses:
        '201':
          description: Key stored
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
  /keys/{id}:
    delete:
      tags: [keys]
      summary: Delete a saved API key
      security: [{ bearerAuth: [] }]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Key deleted
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
  /keys/models:
    get:
      tags: [keys]
      summary: List available models from configured providers
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Model catalog (cached 60s)
          content:
            application/json:
              schema:
                type: object
                properties:
                  models:
                    type: array
                    items:
                      type: object
                      properties:
                        ref: { type: string }
                        provider: { type: string }
                        name: { type: string }
                        model: { type: string }
                        free: { type: boolean }
                  providers:
                    type: array
                    items:
                      type: object
                      properties:
                        id: { type: string }
                        displayName: { type: string }
                        keyConfigured: { type: boolean }
                  hasKeys: { type: boolean }
  /keys/test:
    post:
      tags: [keys]
      summary: Verify an API key against its provider (never persisted)
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [providerId, apiKey]
              properties:
                providerId: { type: string }
                apiKey: { type: string }
      responses:
        '200':
          description: Live check result
          content:
            application/json:
              schema:
                type: object
                properties:
                  valid: { type: boolean }
  /usage:
    get:
      tags: [usage]
      summary: Count sessions in a date range
      security: [{ bearerAuth: [] }]
      parameters:
        - name: from
          in: query
          schema: { type: string, format: date-time }
        - name: to
          in: query
          schema: { type: string, format: date-time }
      responses:
        '200':
          description: Session count
          content:
            application/json:
              schema:
                type: object
                properties:
                  totalSessions: { type: integer }
  /usage/quotas:
    get:
      tags: [usage]
      summary: Token and build quotas for the current plan
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Quota usage
          content:
            application/json:
              schema:
                type: object
                properties:
                  tokens: { $ref: '#/components/schemas/Quota' }
                  builds: { $ref: '#/components/schemas/Quota' }
                  resetAt: { type: string, format: date-time }
                  plan: { type: string }
  /usage/compliance:
    get:
      tags: [usage]
      summary: Compliance summary across sessions
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Compliance report
          content:
            application/json:
              schema:
                type: object
                properties:
                  totalSessions: { type: integer }
                  completedSessions: { type: integer }
                  failedSessions: { type: integer }
                  successRate: { type: integer }
                  securityViolations: { type: integer }
                  complianceStatus: { type: string, enum: [compliant, needs_review] }
  /usage/stats:
    get:
      tags: [usage]
      summary: Aggregated usage statistics
      security: [{ bearerAuth: [] }]
      parameters:
        - name: from
          in: query
          schema: { type: string, format: date-time }
        - name: to
          in: query
          schema: { type: string, format: date-time }
      responses:
        '200':
          description: Usage stats
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  truncated: { type: boolean }
                  stats: { type: object }
  /usage/report.pdf:
    get:
      tags: [usage]
      summary: Download a PDF usage report
      security: [{ bearerAuth: [] }]
      parameters:
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 200, default: 30 }
      responses:
        '200':
          description: PDF document
          content:
            application/pdf:
              schema: { type: string, format: binary }
  /usage/export.csv:
    get:
      tags: [usage]
      summary: Download session history as CSV
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: CSV document
          content:
            text/csv:
              schema: { type: string }
  /usage/coverage:
    get:
      tags: [usage]
      summary: Last test-coverage summary, if present
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Coverage summary
          content:
            application/json:
              schema:
                type: object
                properties:
                  ok: { type: boolean }
                  generatedAt: { type: string, format: date-time }
                  total: { type: object }
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    User:
      type: object
      properties:
        id: { type: string }
        email: { type: string, format: email }
        name: { type: string }
        plan: { type: string }
        settings: { type: object }
    RefreshSession:
      type: object
      properties:
        jti: { type: string }
        createdAt: { type: string, format: date-time }
        expiresAt: { type: string, format: date-time }
    Workspace:
      type: object
      properties:
        _id: { type: string }
        userId: { type: string }
        name: { type: string }
        diskPath: { type: string }
        gitUrl: { type: string }
        branch: { type: string }
        status: { type: string }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
    ApiKey:
      type: object
      properties:
        id: { type: string }
        providerId: { type: string }
        envVar: { type: string }
        displayName: { type: string }
        masked: { type: string }
        model: { type: string }
        baseUrl: { type: string }
        apiFormat: { type: string }
        createdAt: { type: string, format: date-time }
    Quota:
      type: object
      properties:
        limit: { type: integer }
        used: { type: integer }
        remaining: { type: integer }
    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code: { type: string }
            message: { type: string }
`;

export const openapiSpec = YAML.parse(specYaml);
