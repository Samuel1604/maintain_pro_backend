# MaintainPro Backend

Backend API for MaintainPro — a comprehensive maintenance management platform.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **File Uploads**: Cloudinary + Multer

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)

### Installation

```bash
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled production server |

## Project Structure

```
src/
├── config/          # App configuration (DB, env, CORS, etc.)
├── modules/         # Feature modules (auth, users, assets, etc.)
├── shared/          # Shared utilities, middleware, constants, types
├── jobs/            # Background/scheduled jobs
├── events/          # Event emitters and handlers
├── sockets/         # WebSocket handlers
├── tests/           # Test suites
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## API Base URL

```
http://localhost:8080/api/v1
```

## License

ISC
