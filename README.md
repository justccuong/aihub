# 🤖 AI Hub - Nền Tảng Quản Lý AI Agent JS Club

> **Dự án học tập** - Xây dựng AI Agent Platform đầy đủ tính năng trên Cloudflare Workers với Next.js

AI Hub là một nền tảng quản lý và triển khai AI Agent, cho phép tạo, cấu hình và sử dụng các chatbot AI với khả năng RAG (Retrieval-Augmented Generation) và Web Search. Dự án này sử dụng hoàn toàn các dịch vụ của Cloudflare để có chi phí thấp và hiệu suất cao.

---

## 📚 Mục Lục

- [Kiến Trúc Tổng Quan](#-kiến-trúc-tổng-quan)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [Cloudflare Services Chi Tiết](#-cloudflare-services-chi-tiết)
- [Cấu Trúc Thư Mục](#-cấu-trúc-thư-mục)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Cài Đặt và Chạy](#-cài-đặt-và-chạy)
- [Hướng Dẫn Scale Tính Năng Mới](#-hướng-dẫn-scale-tính-năng-mới)
- [Best Practices](#-best-practices)

---

## 🏗 Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Cloudflare Workers (Edge Runtime)                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Next.js (OpenNext)                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │  React UI    │  │  API Routes  │  │  Hono Backend    │   │   │
│  │  │  (App Router)│  │  (/api/*)    │  │  (REST API)      │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  D1 Database │ │   Vectorize  │ │  Workers AI  │ │  KV Storage  │
│   (SQLite)   │ │ (Vector DB)  │ │ (Embeddings) │ │   (Cache)    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Flow Chính của Ứng Dụng

1. **User gửi message** → Chat API nhận request
2. **Load Agent Config** → Lấy từ KV cache hoặc D1 database
3. **RAG Pipeline**: 
   - Generate embedding từ query (Workers AI)
   - Search trong Vectorize với metadata filter
   - Inject context vào prompt
4. **LLM Response** → OpenAI/Google API trả về kết quả
5. **Stream Response** → Trả về client real-time

---

## 🛠 Công Nghệ Sử Dụng

### Frontend
| Công nghệ | Mục đích |
|-----------|----------|
| **Next.js 15** | React framework với App Router |
| **React 19** | UI library |
| **TailwindCSS 4** | Styling |
| **Radix UI** | Headless UI components |
| **React Query** | Server state management |
| **nuqs** | URL state management |
| **AI SDK (Vercel)** | Chat UI và AI integration |

### Backend
| Công nghệ | Mục đích |
|-----------|----------|
| **Hono** | Lightweight web framework cho API |
| **Drizzle ORM** | Type-safe database ORM |
| **Zod** | Schema validation |
| **Better Auth** | Authentication library |

### Cloudflare Services
| Service | Mục đích |
|---------|----------|
| **Workers** | Serverless compute runtime |
| **D1** | SQLite database |
| **Vectorize** | Vector database cho RAG |
| **Workers AI** | Embedding generation |
| **KV** | Key-value cache storage |
| **Rate Limiting** | API rate limiting |
| **Images** | Image optimization |

---

## ☁️ Cloudflare Services Chi Tiết

### 1. D1 Database (SQLite)

D1 là database SQL serverless của Cloudflare, sử dụng SQLite engine. Phù hợp cho ứng dụng với read-heavy workload.

**Cấu hình trong `wrangler.jsonc`:**
```jsonc
"d1_databases": [{
    "binding": "AIHUB_DB",           // Tên binding trong code
    "database_name": "aihub-db",      // Tên database
    "database_id": "xxx-xxx-xxx",     // ID từ Cloudflare Dashboard
    "migrations_dir": "drizzle/migrations"
}]
```

**Sử dụng trong code (`src/lib/db.ts`):**
```typescript
import { drizzle } from 'drizzle-orm/d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getDb() {
    const { env } = await getCloudflareContext({ async: true });
    return drizzle(env.AIHUB_DB, { schema });
}
```

**Commands quản lý:**
```bash
# Generate migration từ schema changes
npm run db:generate

# Apply migrations lên remote D1
npm run db:push

# Mở Drizzle Studio để xem data
npm run db:studio
```

---

### 2. Vectorize (Vector Database)

Vectorize lưu trữ vector embeddings để thực hiện semantic search (RAG).

**Cấu hình trong `wrangler.jsonc`:**
```jsonc
"vectorize": [{
    "binding": "VECTORIZE",
    "index_name": "aihub-vectorize"
}]
```

**Tạo index (chạy 1 lần):**
```bash
wrangler vectorize create aihub-vectorize \
  --dimensions=768 \
  --metric=cosine
```

**Sử dụng trong code (`src/lib/vectorize.ts`):**
```typescript
// Upsert vector với metadata
export async function upsertVector(
    datasourceId: number,
    datasourceGroupId: number,
    content: string
) {
    const { vectorize } = await getBindings();
    const embedding = await generateEmbedding(content);  // Workers AI
    
    await vectorize.upsert([{
        id: `datasource:${datasourceId}`,
        values: embedding,
        metadata: { datasourceId, datasourceGroupId, content }
    }]);
}

// Search với metadata filter
export async function searchVectors(
    query: string,
    datasourceGroupIds: number[],
    topK: number = 5
) {
    const queryEmbedding = await generateEmbedding(query);
    
    return vectorize.query(queryEmbedding, {
        topK,
        returnMetadata: 'all',
        filter: {
            datasourceGroupId: { $in: datasourceGroupIds }  // Filter by groups
        }
    });
}
```

**Lưu ý quan trọng:**
- Dimensions phải khớp với model embedding (768 cho `bge-base-en-v1.5`)
- Metadata filtering cho phép multi-tenant search
- Hỗ trợ operators: `$eq`, `$ne`, `$in`, `$nin`, `$lt`, `$lte`, `$gt`, `$gte`

---

### 3. Workers AI

Workers AI cung cấp inference cho các AI models, trong project này dùng để generate embeddings.

**Cấu hình trong `wrangler.jsonc`:**
```jsonc
"ai": {
    "binding": "AI"
}
```

**Sử dụng:**
```typescript
export async function generateEmbedding(text: string): Promise<number[]> {
    const { env } = await getCloudflareContext({ async: true });
    
    const response = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: [text]
    });
    
    return response.data[0];  // 768-dimensional vector
}
```

**Models có sẵn:**
- `@cf/baai/bge-base-en-v1.5` - Text embeddings (768 dims)
- `@cf/meta/llama-3.1-8b-instruct` - LLM inference
- `@cf/stabilityai/stable-diffusion-xl` - Image generation

---

### 4. KV Storage (Cache)

KV (Key-Value) storage dùng để cache data, giảm load cho database.

**Cấu hình trong `wrangler.jsonc`:**
```jsonc
"kv_namespaces": [{
    "binding": "AIHUB_KV",
    "id": "xxx-xxx-xxx"
}]
```

**Tạo KV namespace:**
```bash
wrangler kv namespace create AIHUB_KV
# Copy ID vào wrangler.jsonc
```

**Sử dụng (`src/lib/kv.ts`):**
```typescript
// Cache với TTL
export async function putKV(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
) {
    const { env } = await getCloudflareContext({ async: true });
    await env.AIHUB_KV.put(key, value, options);
}

// Get cached value
export async function getKV<T>(key: string, type: "json" | "text" = "text") {
    const { env } = await getCloudflareContext({ async: true });
    return env.AIHUB_KV.get(key, type);
}
```

**Pattern Cache trong project:**
```typescript
// Agent caching với 15 phút TTL
const CACHE_PREFIX = 'agent:';
const CACHE_TTL_SECONDS = 15 * 60;

export async function getAgentById(id: number) {
    const cacheKey = `${CACHE_PREFIX}${id}`;
    
    // Try cache first
    const cached = await getKV(cacheKey, 'json');
    if (cached) return cached;
    
    // Fetch from DB
    const agent = await fetchAgentFromDb(id);
    
    // Cache result
    await putKV(cacheKey, JSON.stringify(agent), { 
        expirationTtl: CACHE_TTL_SECONDS 
    });
    
    return agent;
}
```

---

### 5. Rate Limiting

Rate Limiting bảo vệ API khỏi abuse và DDoS.

**Cấu hình trong `wrangler.jsonc`:**
```jsonc
"ratelimits": [{
    "name": "AIHUB_RATE_LIMITER",
    "namespace_id": "1001",
    "simple": {
        "limit": 50,      // 50 requests
        "period": 60      // per 60 seconds
    }
}]
```

**Sử dụng trong router:**
```typescript
.post("/completions/:agentId", async (c) => {
    const { env } = await getCloudflareContext({ async: true });
    
    // Get client IP
    const ipAddress = c.req.header("cf-connecting-ip") || "";
    
    // Check rate limit
    const { success } = await env.AIHUB_RATE_LIMITER.limit({ 
        key: ipAddress 
    });
    
    if (!success) {
        return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    
    // Continue processing...
})
```

---

### 6. OpenNext Integration

OpenNext cho phép deploy Next.js application lên Cloudflare Workers.

**Cấu hình `open-next.config.ts`:**
```typescript
import type { OpenNextConfig } from '@opennextjs/cloudflare';

export default {
    // Config options
} satisfies OpenNextConfig;
```

**Self-reference binding cho caching:**
```jsonc
"services": [{
    "binding": "WORKER_SELF_REFERENCE",
    "service": "aihub"  // Phải match worker name
}]
```

---

## 📁 Cấu Trúc Thư Mục

```
aihub/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth pages (login, signup)
│   │   ├── (dashboard)/          # Protected dashboard pages
│   │   │   ├── (admin)/          # Admin CRUD pages
│   │   │   └── playground/       # Chat playground
│   │   ├── api/                  # API routes
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   │
│   ├── backend/                  # Hono API server
│   │   ├── index.ts              # Router aggregation
│   │   └── middleware/           # Auth middleware
│   │
│   ├── features/                 # Feature-based architecture
│   │   ├── agents/               # Agent management
│   │   │   ├── components/       # UI components
│   │   │   ├── hooks/            # React hooks
│   │   │   ├── server/           # API routes & services
│   │   │   ├── params.ts         # URL params schema
│   │   │   └── query-options.ts  # React Query options
│   │   ├── llms/                 # LLM configuration
│   │   ├── datasources/          # Knowledge base content
│   │   ├── datasource-groups/    # Knowledge base groups
│   │   ├── chat/                 # Chat functionality
│   │   │   └── server/
│   │   │       ├── routers.ts    # Chat endpoints
│   │   │       ├── service.ts    # AI response logic
│   │   │       └── tools.ts      # AI SDK tools
│   │   ├── playground/           # Playground UI
│   │   └── auth/                 # Auth components
│   │
│   ├── components/               # Shared UI components
│   │   └── ui/                   # shadcn/ui components
│   │
│   ├── config/                   # App configuration
│   │   └── constants.ts          # AI providers & models
│   │
│   ├── hooks/                    # Shared hooks
│   │
│   └── lib/                      # Core utilities
│       ├── db.ts                 # Drizzle D1 setup
│       ├── kv.ts                 # KV helpers
│       ├── vectorize.ts          # Vector operations
│       ├── schema.ts             # Database schema
│       ├── logger.ts             # Logging utility
│       ├── auth/                 # Better Auth setup
│       └── api/                  # API client (ky)
│
├── drizzle/                      # Database migrations
│   └── migrations/
│
├── public/                       # Static assets
├── wrangler.jsonc                # Cloudflare config
├── drizzle.config.ts             # Drizzle config
├── open-next.config.ts           # OpenNext config
└── package.json
```

---

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│    user     │      │   session   │      │    account       │
├─────────────┤      ├─────────────┤      ├──────────────────┤
│ id (PK)     │←─────│ userId (FK) │      │ id (PK)          │
│ name        │      │ token       │      │ userId (FK)      │
│ email       │      │ expiresAt   │      │ providerId       │
│ image       │      │ ipAddress   │      │ accessToken      │
│ createdAt   │      │ userAgent   │      │ refreshToken     │
└─────────────┘      └─────────────┘      └──────────────────┘

┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│    llms     │      │   agents    │      │ datasource_groups│
├─────────────┤      ├─────────────┤      ├──────────────────┤
│ id (PK)     │←─────│ llmId (FK)  │      │ id (PK)          │
│ name        │      │ id (PK)     │      │ name             │
│ provider    │      │ name        │      │ description      │
│ model       │      │ description │      └────────┬─────────┘
│ baseUrl     │      │ systemPrompt│               │
│ apiKey      │      │ temperature │               │
└─────────────┘      │ topK        │               │
                     │ maxTokens   │               │
                     └──────┬──────┘               │
                            │                      │
                            │  ┌───────────────────┴────────┐
                            │  │  agent_datasource_groups   │
                            │  ├────────────────────────────┤
                            └──│ agentId (FK)               │
                               │ datasourceGroupId (FK)     │
                               └────────────────────────────┘

┌──────────────────┐
│   datasources    │
├──────────────────┤
│ id (PK)          │
│ content          │
│ datasourceGroupId│──→ datasource_groups.id
└──────────────────┘
```

### Mô tả các bảng:

| Bảng | Mô tả |
|------|-------|
| `user` | Người dùng hệ thống |
| `session` | Phiên đăng nhập |
| `account` | OAuth accounts (Google, etc.) |
| `verification` | Email verification tokens |
| `llms` | Cấu hình LLM providers (OpenAI, Google, etc.) |
| `agents` | AI Agents với system prompt và settings |
| `datasource_groups` | Nhóm knowledge base |
| `datasources` | Nội dung knowledge base (embedded vào Vectorize) |
| `agent_datasource_groups` | Many-to-many: Agent ↔ Datasource Groups |
| `ollama_keys` | API keys cho Ollama web search |

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/sign-up        # Đăng ký
POST /api/auth/sign-in        # Đăng nhập
POST /api/auth/sign-out       # Đăng xuất
GET  /api/auth/session        # Lấy session hiện tại
```

### LLMs (Protected)
```
GET    /api/llms              # List LLMs với pagination
POST   /api/llms              # Tạo LLM mới
GET    /api/llms/:id          # Chi tiết LLM
PUT    /api/llms/:id          # Cập nhật LLM
DELETE /api/llms/:id          # Xóa LLM
```

### Agents (Protected)
```
GET    /api/agents            # List agents với search
POST   /api/agents            # Tạo agent mới
GET    /api/agents/:id        # Chi tiết agent
PUT    /api/agents/:id        # Cập nhật agent
DELETE /api/agents/:id        # Xóa agent
```

### Datasource Groups (Protected)
```
GET    /api/datasource-groups        # List groups
POST   /api/datasource-groups        # Tạo group mới
DELETE /api/datasource-groups/:id    # Xóa group
```

### Datasources (Protected)
```
GET    /api/datasources              # List datasources
POST   /api/datasources              # Tạo datasource (auto-embed)
DELETE /api/datasources/:id          # Xóa datasource
```

### Chat
```
# Protected - dùng trong Playground
POST /api/chat/playground/:agentId   

# Public với Rate Limiting - dùng cho integration
POST /api/chat/completions/:agentId  
```

**Request body:**
```json
{
    "stream": true,
    "messages": [
        { "role": "user", "content": "Xin chào!" }
    ]
}
```

---

## 🚀 Cài Đặt và Chạy

### Prerequisites
- Node.js 18+
- npm hoặc pnpm
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Bước 1: Clone và cài đặt dependencies
```bash
git clone <repository-url>
cd aihub
npm install
```

### Bước 2: Login Cloudflare
```bash
wrangler login
```

### Bước 3: Tạo Cloudflare Resources

```bash
# Tạo D1 Database
wrangler d1 create aihub-db

# Tạo KV Namespace
wrangler kv namespace create AIHUB_KV

# Tạo Vectorize Index
wrangler vectorize create aihub-vectorize \
  --dimensions=768 \
  --metric=cosine
```

### Bước 4: Cập nhật wrangler.jsonc

Copy các ID từ output của bước 3 vào `wrangler.jsonc`:
```jsonc
{
    "d1_databases": [{
        "database_id": "<your-d1-id>"
    }],
    "kv_namespaces": [{
        "id": "<your-kv-id>"
    }]
}
```

### Bước 5: Tạo file môi trường
```bash
# .dev.vars (local development)
NEXTJS_ENV=development
```

### Bước 6: Chạy migrations
```bash
# Generate migrations từ schema
npm run db:generate

# Apply migrations
npm run db:push
```

### Bước 7: Chạy development server
```bash
# Chạy Next.js dev server
npm run dev
```

### Bước 8: Preview trên Cloudflare runtime
```bash
npm run preview
```

### Bước 9: Deploy
```bash
npm run deploy
```

---

## 📈 Hướng Dẫn Scale Tính Năng Mới

### Thêm Feature Module Mới

Giả sử bạn muốn thêm feature **"Conversations"** để lưu lịch sử chat:

#### 1. Tạo cấu trúc thư mục
```
src/features/conversations/
├── components/
│   ├── conversation-list.tsx
│   └── conversation-dialog.tsx
├── hooks/
│   └── use-conversations.ts
├── server/
│   ├── routers.ts
│   └── service.ts
├── params.ts
├── query-options.ts
└── index.ts
```

#### 2. Thêm database schema (`src/lib/schema.ts`)
```typescript
export const conversations = sqliteTable("conversations", {
    id: int("id").primaryKey({ autoIncrement: true }),
    agentId: int("agent_id").references(() => agents.id),
    userId: text("user_id").references(() => user.id),
    title: text("title"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .$defaultFn(() => new Date()),
});

export const messages = sqliteTable("messages", {
    id: int("id").primaryKey({ autoIncrement: true }),
    conversationId: int("conversation_id").references(() => conversations.id),
    role: text("role").notNull(), // "user" | "assistant"
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .$defaultFn(() => new Date()),
});
```

#### 3. Generate và apply migration
```bash
npm run db:migrate
```

#### 4. Tạo service (`src/features/conversations/server/service.ts`)
```typescript
import { getDb } from '@/lib/db';
import { conversations, messages } from '@/lib/schema';

export async function createConversation(agentId: number, userId: string) {
    const db = await getDb();
    const result = await db.insert(conversations)
        .values({ agentId, userId, title: "New Conversation" })
        .returning();
    return result[0];
}

export async function addMessage(
    conversationId: number, 
    role: string, 
    content: string
) {
    const db = await getDb();
    return db.insert(messages)
        .values({ conversationId, role, content });
}
```

#### 5. Tạo router (`src/features/conversations/server/routers.ts`)
```typescript
import { Hono } from 'hono';
import { protectedRoute } from '@/backend/middleware/auth';
import { createConversation, addMessage } from './service';

export const conversationsRouter = new Hono()
    .post('/', protectedRoute, async (c) => {
        // Implementation
    });
```

#### 6. Đăng ký router (`src/backend/index.ts`)
```typescript
import { conversationsRouter } from '@/features/conversations/server/routers';

const app = new Hono()
    .basePath('/api')
    .route('/conversations', conversationsRouter)
    // ... other routes
```

---

### Thêm Tool Mới cho AI Agent

Giả sử bạn muốn thêm **"Calculator Tool"**:

#### 1. Định nghĩa tool (`src/features/chat/server/tools.ts`)
```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const calculatorInputSchema = z.object({
    expression: z.string().describe("Biểu thức toán học cần tính"),
    reasoning: z.string().describe("Lý do cần tính toán"),
});

export const createCalculatorTool = () => tool({
    description: "Thực hiện phép tính toán học",
    inputSchema: calculatorInputSchema,
    execute: async ({ expression, reasoning }) => {
        try {
            // Sử dụng safe eval hoặc math library
            const result = eval(expression); // ⚠️ Cần sanitize!
            return {
                success: true,
                result,
                expression,
                reasoning,
            };
        } catch (error) {
            return {
                success: false,
                error: `Calculation failed: ${error}`,
            };
        }
    },
});
```

#### 2. Thêm vào createAgentTools
```typescript
export function createAgentTools(agent: AgentDetailResolved) {
    return {
        semanticSearchTool: createSemanticSearchTool(agent),
        webSearchTool: createWebSearchTool(),
        calculatorTool: createCalculatorTool(),  // Thêm mới
    };
}
```

---

### Thêm AI Provider Mới

Giả sử bạn muốn thêm **Anthropic Claude**:

#### 1. Cài đặt SDK
```bash
npm install @ai-sdk/anthropic
```

#### 2. Thêm vào constants (`src/config/constants.ts`)
```typescript
export const AI_PROVIDERS = [
    { slug: "openai", name: "OpenAI", defaultBaseUrl: "..." },
    { slug: "google", name: "Google", defaultBaseUrl: "..." },
    { slug: "anthropic", name: "Anthropic", defaultBaseUrl: "https://api.anthropic.com/v1" },  // Thêm
] as const;

export const AI_MODELS = [
    // ... existing models
    { 
        id: "claude-3-5-sonnet-20241022", 
        name: "Claude 3.5 Sonnet", 
        chef: "Anthropic", 
        chefSlug: "anthropic",
        providers: ["anthropic"] 
    },
];
```

#### 3. Cập nhật createAIProvider (`src/features/chat/server/service.ts`)
```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

export const createAIProvider = ({ llm }: AgentDetailResolved) => {
    switch (llm.provider) {
        case "openai":
            return createOpenAI({ baseURL: llm.baseUrl, apiKey: llm.apiKey });
        case "google":
            return createGoogleGenerativeAI({ baseURL: llm.baseUrl, apiKey: llm.apiKey });
        case "anthropic":
            return createAnthropic({ baseURL: llm.baseUrl, apiKey: llm.apiKey });
        default:
            return createOpenAI({ baseURL: llm.baseUrl, apiKey: llm.apiKey });
    }
};
```

---

## ✅ Best Practices

### 1. Caching Strategy
```typescript
// Luôn cache với TTL để tránh stale data
await putKV(key, value, { expirationTtl: 15 * 60 });

// Invalidate cache khi data thay đổi
await invalidateAgentCache(id);
await invalidateAgentCachesByLlmId(llmId);  // Cascade invalidation
```

### 2. Error Handling
```typescript
// Wrap database operations trong try-catch
try {
    const result = await db.insert(table).values(data).returning();
    return result[0];
} catch (error) {
    logger.error('Database error', { error: String(error) });
    throw new Error('Failed to create record');
}
```

### 3. Logging
```typescript
// Sử dụng structured logging
import { agentsLogger as logger } from '@/lib/logger';

logger.info('Action started', { agentId, userId });
logger.error('Action failed', { error: String(error) });
```

### 4. Type Safety
```typescript
// Infer types từ Zod schemas
const createSchema = z.object({ name: z.string() });
type CreateInput = z.infer<typeof createSchema>;

// Sử dụng database types
type AgentDetail = Awaited<ReturnType<typeof fetchAgentFromDb>>;
```

### 5. Rate Limiting cho Public APIs
```typescript
// Luôn rate limit các endpoint public
const { success } = await env.RATE_LIMITER.limit({ key: ipAddress });
if (!success) return c.json({ error: 'Rate limit exceeded' }, 429);
```

---

## 📖 Tài Liệu Tham Khảo

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
- [AI SDK (Vercel)](https://sdk.vercel.ai/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Hono](https://hono.dev/)
- [Better Auth](https://better-auth.com/)

---

## 📝 License

MIT License - Feel free to use this project for learning and development.
