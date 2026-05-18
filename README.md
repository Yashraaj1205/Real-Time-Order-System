# Real-Time Order Updates

A robust backend system and frontend dashboard that handles and pushes database changes to connected clients **instantly**.

When any row in the `orders` table is inserted, updated, or deleted, every connected browser client receives the change and reflects it immediately in the UI.

---

## Architecture Overview

The system utilizes native PostgreSQL pub/sub features combined with a Node.js WebSocket server to efficiently broadcast changes to clients.

1. **Database Trigger:** PostgreSQL `AFTER` trigger fires on `INSERT`, `UPDATE`, or `DELETE`.
2. **Notification Layer:** Trigger calls `pg_notify` to send a JSON payload.
3. **Backend Listener:** Node.js listens using `LISTEN orders_channel` and emits an event.
4. **WebSocket Broadcast:** The Node.js WebSocket server broadcasts the JSON payload to all connected clients.
5. **Client Rendering:** The frontend dashboard maintains a stateful list of active orders and dynamically mutates the DOM in response to WebSocket events.

---

## Design Decisions & Technical Choices

This system is engineered for maximum performance, minimal database load, and instant notification propagation. Below are the key design choices made:

1. **Event-Driven Architecture with Native PostgreSQL Triggers**
   * **The Choice:** We used native PostgreSQL triggers (`AFTER INSERT OR UPDATE OR DELETE`) combined with `LISTEN/NOTIFY`.
   * **The Rationale:** This makes the database the *single source of truth*. No matter *how* data changes—whether through our REST API, directly in a psql console, or via a third-party administrative tool—triggers guarantee that the event is immediately captured and sent. This ensures 100% data consistency.
   * **Efficiency:** Resources are consumed only when an actual change occurs, achieving near-zero idle overhead and eliminating the need for constant background querying.

2. **Lightweight WebSocket Server (`ws`)**
   * **The Choice:** A raw, low-overhead Node.js `ws` server attached directly to the existing Express HTTP port.
   * **The Rationale:** By using raw WebSockets, we keep the message frame sizes incredibly small, minimizing latency and maximizing memory efficiency on the server.
   * **Robust Heartbeats:** We implemented a custom ping/pong connection validation scheme in `server.ts` to ensure dead connections are aggressively pruned, preventing memory leaks and resource exhaustion.

3. **Stateful Single-Page Frontend**
   * **The Choice:** Plain vanilla HTML5, CSS3, and JavaScript utilizing clean DOM manipulation.
   * **The Rationale:** Using vanilla JS allowed us to build an incredibly snappy, high-performance dashboard that mounts instantly and runs smoothly.
   * **Dynamic DOM Sync:** The UI acts as a stateful client—it retrieves existing orders via a GET request on load, and then mutates individual cards directly in-place when WebSocket events occur.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js + TypeScript | High performance, type safety |
| Framework | Express | Minimal HTTP server for the REST API |
| Database | PostgreSQL 16 | Native LISTEN/NOTIFY |
| Real-time | `ws` (WebSocket) | Lightweight, minimal overhead |
| Containerisation | Docker Compose | One-command Postgres setup |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- npm (comes with Node.js)

---

## Setup and Run

### 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on port 5432. The database, user, and password are preconfigured in `docker-compose.yml`.

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Setup Environment Variables

Copy the provided example file which contains the local Docker credentials:
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

### 4. Start the backend server

```bash
npm run dev
```

The server automatically sets up the database schemas, triggers, and WebSocket server on `http://localhost:3000`.

### 4. Open the browser client

Open `http://localhost:3000` in **two separate browser tabs**.

Both tabs connect via WebSockets. The dashboard retrieves existing orders via the REST API and then switches to listening to live updates.

---

## Testing Real-Time Updates

### Option A — Dashboard

The page at `http://localhost:3000` has a **Manage** panel. Create, update, or delete orders using this panel. The dashboard will instantly update.

### Option B — cURL

**Create an order (triggers INSERT):**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name": "Arjun Mehta", "product_name": "Nifty50 Strategy"}'
```

**Update status (triggers UPDATE):**
```bash
curl -X PATCH http://localhost:3000/api/orders/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "shipped"}'
```

**Delete an order (triggers DELETE):**
```bash
curl -X DELETE http://localhost:3000/api/orders/1
```

Every command above will instantly sync with any open dashboard.

---

## Project Structure

```
apt-realtime-orders/
├── docker-compose.yml         
├── README.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           
│       ├── types.ts           
│       │
│       ├── db/
│       │   ├── pool.ts        
│       │   ├── migrate.ts     
│       │   └── listener.ts    
│       │
│       ├── ws/
│       │   └── server.ts      
│       │
│       └── api/
│           └── routes.ts      
│
└── client/
    └── index.html             
```

---

## Stopping the Server

```bash
# Stop the backend: Ctrl+C in the terminal
# Stop and remove the PostgreSQL container
docker compose down
# To also delete all stored data
docker compose down -v
```
