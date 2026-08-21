# CleanSlate Backend

CleanSlate is an AI-assisted Gmail cleanup extension that classifies inbox
cleanup candidates and lets the user decide what happens next. This repository
contains the Node and Express API responsible for authentication, Gmail access,
Gemini classification, protected senders, persistence, and Gmail actions.

The user interface lives in the
[CleanSlate frontend](https://github.com/Capstone-III-CleanSlate/CleanSlate_frontend).

## Technology

- Node.js and Express
- PostgreSQL with Sequelize
- Google OAuth 2.0 and Gmail API
- Google Gemini structured classification
- AES-256-GCM encryption for stored Google tokens
- Hashed application session tokens

## How a scan works

1. Gmail returns unread inbox threads older than 14 days.
2. Threads containing an exact protected-sender match are skipped.
3. Starred, important, and already custom-labeled threads are excluded.
4. Gmail metadata is fetched in paced chunks to reduce quota pressure.
5. Gemini receives sender, recipient, subject, date, and snippet metadata—not
   the full email body.
6. Gemini returns dynamic categories, suggested labels, thread IDs, and
   confidence scores.
7. The backend joins the classifications back to the complete thread metadata,
   stores the classification run, and returns it to the frontend.
8. The user can accept, decline, or trash a category or selected conversations.

## Action behavior

- **Accept** creates or reuses the suggested Gmail label, applies it, and
  archives the selected conversations.
- **Decline** keeps the selected conversations in the inbox without applying
  the suggested classification.
- **Trash** moves conversations to Gmail Trash. No route permanently deletes
  email.

## Requirements

- A current Node.js LTS release and npm
- PostgreSQL
- A Google Cloud project with OAuth credentials and the Gmail API enabled
- A Gemini API key
- The unpacked CleanSlate extension ID

## Local setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/Capstone-III-CleanSlate/CleanSlate_backend.git
   cd CleanSlate_backend
   npm install
   ```

2. Create a PostgreSQL database for CleanSlate.

3. Copy `.env.example` to `.env` and fill in the required values.

4. Generate a 32-byte encryption key as 64 hexadecimal characters:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Start the API:

   ```bash
   npm start
   ```

6. Confirm the server is available:

   ```text
   http://localhost:3000/api/health
   ```

On startup, Sequelize authenticates with PostgreSQL and synchronizes the
current models before Express begins listening.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth client identifier from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret from Google Cloud |
| `GOOGLE_REDIRECT_URI` | OAuth callback, normally `http://localhost:3000/api/auth/google/callback` |
| `EXTENSION_ORIGIN` | Local extension origin, such as `chrome-extension://extension-id` |
| `GEMINI_API_KEY` | API key used for Gemini classification |
| `ENCRYPTION_KEY` | 64-character hexadecimal key used to encrypt Google tokens |
| `NODE_ENV` | Use `development` for local work |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | PostgreSQL host, commonly `localhost` |
| `DB_PORT` | PostgreSQL port, commonly `5432` |
| `DB_DIALECT` | Sequelize dialect, currently `postgres` |
| `PORT` | Express port, normally `3000` |

Never commit `.env`, OAuth credentials, encryption keys, database passwords, or
session tokens.

## Google configuration

1. Enable the Gmail API in the Google Cloud project.
2. Configure the OAuth consent screen and add the required test users while the
   application remains in testing mode.
3. Create a Web application OAuth client.
4. Add the exact `GOOGLE_REDIRECT_URI` as an authorized redirect URI.
5. Build and load the frontend extension, then copy its ID from
   `chrome://extensions` into `EXTENSION_ORIGIN`.
6. Restart the backend whenever its environment variables change.

The application requests OpenID profile information and
`https://www.googleapis.com/auth/gmail.modify`.

## API routes

Authenticated routes accept the extension session token in
`Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Confirm the API is running |
| `GET` | `/api/auth/google` | Begin Google OAuth |
| `GET` | `/api/auth/google/callback` | Finish OAuth and notify the extension |
| `GET` | `/api/auth/me` | Return the signed-in user |
| `POST` | `/api/auth/logout` | End the CleanSlate session |
| `GET` | `/api/gmail` | Run the synchronous Gmail scan and classification flow |
| `GET` | `/api/protected` | List the user's protected senders |
| `POST` | `/api/protected` | Add a protected sender |
| `DELETE` | `/api/protected/:id` | Remove a protected sender |
| `POST` | `/api/gmail/categories/:runId/accept` | Accept an entire category |
| `DELETE` | `/api/gmail/categories/:runId/delete` | Trash an entire category |
| `POST` | `/api/gmail/categories/:runId/decline` | Decline an entire category |
| `POST` | `/api/gmail/categories/:runId/details/accept` | Accept selected conversations |
| `DELETE` | `/api/gmail/categories/:runId/details/delete` | Trash selected conversations |
| `POST` | `/api/gmail/categories/:runId/details/decline` | Decline selected conversations |

Category requests include `labelName` in the JSON body. Detail requests also
include a `threads` array containing the selected Gmail thread IDs.

## Project structure

```text
├── config/       # Database, Google OAuth, and Gemini clients
├── middlewares/  # Session authentication
├── models/       # Sequelize data models and relationships
├── routes/       # Authentication, scanning, decisions, and protected senders
├── schemas/      # Gemini prompt and structured output schema
├── services/     # Gmail fetching, Gemini calls, and token refresh
├── utils/        # Filtering, encryption, hashing, and error helpers
├── app.js        # Express middleware and route mounting
└── server.js     # Database connection and server startup
```

## Operational notes

- The scan endpoint is synchronous, so larger inboxes can keep the request open
  while Gmail metadata is fetched and Gemini batches are classified.
- Gmail request pacing is intentional and should not be removed without
  checking per-user quota behavior.
- Protected-sender matching uses normalized exact email addresses. If any
  non-user sender in a thread is protected, that thread is excluded before
  classification.
- Categories are generated dynamically and can reuse similar existing Gmail
  labels.

