export type Tier = 'safe' | 'deep' | 'danger';

export interface RuleTarget {
    path: string;
    tier: Tier;
}

export interface Rule {
    name: string;
    triggers: string[];
    targets: RuleTarget[];
}

// Ported from Kessler default-rules.yaml
export const DEFAULT_RULES: Rule[] = [
    {
        name: "Node.js / JS Ecosystem",
        triggers: ["package.json", "deno.json", "bunfig.toml"],
        targets: [
            { path: "node_modules", tier: "safe" },
            { path: ".yarn/cache", tier: "safe" },
            { path: ".next", tier: "safe" },
            { path: ".nuxt", tier: "safe" },
            { path: ".svelte-kit", tier: "safe" },
            { path: "dist", tier: "deep" },
            { path: "build", tier: "deep" },
            { path: "out", tier: "deep" }
        ]
    },
    {
        name: "Python",
        triggers: ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile", "uv.lock"],
        targets: [
            { path: "__pycache__", tier: "safe" },
            { path: "venv", tier: "safe" },
            { path: ".venv", tier: "safe" },
            { path: "env", tier: "safe" },
            { path: ".pytest_cache", tier: "safe" },
            { path: "build", tier: "deep" },
            { path: "dist", tier: "deep" }
        ]
    },
    {
        name: "Rust",
        triggers: ["Cargo.toml"],
        targets: [
            { path: "target", tier: "safe" }
        ]
    },
    {
        name: "Go",
        triggers: ["go.mod"],
        targets: [
            { path: "vendor", tier: "safe" },
            { path: "bin", tier: "deep" },
            { path: "dist", tier: "deep" }
        ]
    },
    {
        name: "Java / JVM",
        triggers: ["pom.xml", "build.gradle", "build.gradle.kts"],
        targets: [
            { path: "target", tier: "safe" },
            { path: "build", tier: "safe" },
            { path: ".gradle", tier: "safe" }
        ]
    }
];

export const DANGER_ZONE = [
    ".env", ".env.local", ".env.development", ".env.production",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
    "Cargo.lock", "poetry.lock", "Pipfile.lock", "uv.lock", ".git"
];
