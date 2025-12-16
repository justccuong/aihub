export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
} as const;

export const CACHE = {
    /** Default stale time for queries (1 minute) */
    STALE_TIME: 60 * 1000,
} as const;

export const API = {
    /** Request timeout in milliseconds */
    TIMEOUT: 10000,
} as const;

export enum Path {
    ADMIN_DASHBOARD = "/",
    LOGIN = "/login",
    SIGNUP = "/signup",
}

// =============================================================================
// AI Providers Configuration
// =============================================================================

export const AI_PROVIDERS = [
    { slug: "openai", name: "OpenAI", defaultBaseUrl: "https://api.openai.com/v1" },
    { slug: "anthropic", name: "Anthropic", defaultBaseUrl: "https://api.anthropic.com/v1" },
    { slug: "google", name: "Google", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta" },
    { slug: "ollama", name: "Ollama", defaultBaseUrl: "http://localhost:11434/v1" },
] as const;

export type AIProvider = (typeof AI_PROVIDERS)[number];
export type AIProviderSlug = AIProvider["slug"];

export const AI_PROVIDER_SLUGS = AI_PROVIDERS.map((p) => p.slug) as unknown as [AIProviderSlug, ...AIProviderSlug[]];

// =============================================================================
// AI Models Configuration
// =============================================================================

export const AI_MODELS: readonly {
    id: string;
    name: string;
    chef: AIProvider["name"];
    chefSlug: AIProviderSlug;
    providers: readonly AIProviderSlug[];
}[] = [
        // OpenAI
        { id: "gpt-4o", name: "GPT-4o", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
        { id: "gpt-4o-mini", name: "GPT-4o Mini", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
        { id: "o1", name: "o1", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
        { id: "o1-mini", name: "o1 Mini", chef: "OpenAI", chefSlug: "openai", providers: ["openai"] },
        // Anthropic
        { id: "claude-opus-4-20250514", name: "Claude 4 Opus", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
        { id: "claude-sonnet-4-20250514", name: "Claude 4 Sonnet", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
        { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic"] },
        // Google
        { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", chef: "Google", chefSlug: "google", providers: ["google"] },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", chef: "Google", chefSlug: "google", providers: ["google"] },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", chef: "Google", chefSlug: "google", providers: ["google"] },
        // Ollama (local models)
        { id: "llama3.2", name: "Llama 3.2", chef: "Ollama", chefSlug: "ollama", providers: ["ollama"] },
        { id: "llama3.1", name: "Llama 3.1", chef: "Ollama", chefSlug: "ollama", providers: ["ollama"] },
        { id: "mistral", name: "Mistral", chef: "Ollama", chefSlug: "ollama", providers: ["ollama"] },
        { id: "codellama", name: "Code Llama", chef: "Ollama", chefSlug: "ollama", providers: ["ollama"] },
        { id: "deepseek-coder-v2", name: "DeepSeek Coder V2", chef: "Ollama", chefSlug: "ollama", providers: ["ollama"] },
        { id: "qwen2.5-coder", name: "Qwen 2.5 Coder", chef: "Ollama", chefSlug: "ollama", providers: ["ollama"] },
    ];

export type AIModel = (typeof AI_MODELS)[number];
export type AIModelId = AIModel["id"];

export const AI_MODEL_IDS = AI_MODELS.map((m) => m.id) as unknown as [AIModelId, ...AIModelId[]];

/** Get unique chefs (model creators) in order of appearance */
export const getAIModelChefs = () => Array.from(new Set(AI_MODELS.map((m) => m.chef)));

/** Get models by chef name */
export const getAIModelsByChef = (chef: string) => AI_MODELS.filter((m) => m.chef === chef);

/** Get provider by slug */
export const getAIProviderBySlug = (slug: string) => AI_PROVIDERS.find((p) => p.slug === slug);

/** Get model by ID */
export const getAIModelById = (id: string) => AI_MODELS.find((m) => m.id === id);