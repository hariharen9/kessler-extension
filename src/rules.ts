export type Tier = 'safe' | 'deep' | 'danger' | 'ignored';

export interface RuleTarget {
    path: string;
    tier: Tier;
}

export interface Rule {
    name: string;
    triggers: string[];
    targets: RuleTarget[];
}

export const DEFAULT_RULES: Rule[] = [
    {
        name: "Node.js / JS Ecosystem",
        triggers: ["package.json", "deno.json", "bunfig.toml"],
        targets: [
            { path: "node_modules", tier: "safe" },
            { path: "bower_components", tier: "safe" },
            { path: ".yarn/cache", tier: "safe" },
            { path: ".pnp.cjs", tier: "safe" },
            { path: ".next", tier: "safe" },
            { path: ".nuxt", tier: "safe" },
            { path: ".svelte-kit", tier: "safe" },
            { path: ".turbo", tier: "safe" },
            { path: ".parcel-cache", tier: "safe" },
            { path: ".angular/cache", tier: "safe" },
            { path: ".eslintcache", tier: "safe" },
            { path: "tsconfig.tsbuildinfo", tier: "safe" },
            { path: "coverage", tier: "safe" },
            { path: ".nyc_output", tier: "safe" },
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
            { path: ".ruff_cache", tier: "safe" },
            { path: ".mypy_cache", tier: "safe" },
            { path: ".coverage", tier: "safe" },
            { path: "htmlcov", tier: "safe" },
            { path: "build", tier: "deep" },
            { path: "dist", tier: "deep" },
            { path: ".ipynb_checkpoints", tier: "deep" },
            { path: "wandb", tier: "deep" },
            { path: "mlruns", tier: "deep" },
            { path: "tensorboard", tier: "deep" }
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
            { path: "dist", tier: "deep" },
            { path: "build", tier: "deep" },
            { path: "*.test", tier: "deep" },
            { path: "coverage.out", tier: "safe" },
            { path: "coverage.txt", tier: "safe" },
            { path: "cover.out", tier: "safe" },
            { path: "c.out", tier: "safe" },
            { path: ".gocache", tier: "safe" }
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
    },
    {
        name: "PHP",
        triggers: ["composer.json"],
        targets: [
            { path: "vendor", tier: "safe" }
        ]
    },
    {
        name: "Ruby",
        triggers: ["Gemfile"],
        targets: [
            { path: "vendor/bundle", tier: "safe" },
            { path: ".bundle", tier: "safe" }
        ]
    },
    {
        name: ".NET / C#",
        triggers: ["*.csproj", "*.sln"],
        targets: [
            { path: "bin", tier: "deep" },
            { path: "obj", tier: "safe" },
            { path: "packages", tier: "safe" }
        ]
    },
    {
        name: "Elixir",
        triggers: ["mix.exs"],
        targets: [
            { path: "deps", tier: "safe" },
            { path: "_build", tier: "safe" },
            { path: ".elixir_ls", tier: "safe" }
        ]
    },
    {
        name: "Cloud / IaC",
        triggers: ["*.tf", "cdk.json", "serverless.yml", "amplify", "supabase", "wrangler.toml"],
        targets: [
            { path: ".terraform", tier: "safe" },
            { path: "cdk.out", tier: "safe" },
            { path: ".serverless", tier: "safe" },
            { path: ".aws-sam", tier: "safe" },
            { path: ".amplify", tier: "safe" },
            { path: ".wrangler", tier: "safe" },
            { path: "supabase/.temp", tier: "safe" },
            { path: ".sst", tier: "safe" },
            { path: ".open-next", tier: "safe" }
        ]
    },
    {
        name: "Swift / iOS",
        triggers: ["Package.swift", "*.xcodeproj", "*.xcworkspace"],
        targets: [
            { path: ".build", tier: "safe" },
            { path: "DerivedData", tier: "deep" },
            { path: "build", tier: "safe" },
            { path: "Pods", tier: "safe" }
        ]
    },
    {
        name: "Unreal Engine",
        triggers: ["*.uproject"],
        targets: [
            { path: "Binaries", tier: "deep" },
            { path: "Build", tier: "deep" },
            { path: "Intermediate", tier: "safe" },
            { path: "Saved", tier: "safe" },
            { path: "DerivedDataCache", tier: "safe" }
        ]
    },
    {
        name: "Godot",
        triggers: ["project.godot"],
        targets: [
            { path: ".godot", tier: "safe" }
        ]
    },
    {
        name: "Android",
        triggers: ["build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"],
        targets: [
            { path: ".gradle", tier: "safe" },
            { path: "build", tier: "safe" },
            { path: ".cxx", tier: "safe" }
        ]
    },
    {
        name: "R",
        triggers: ["*.Rproj", "DESCRIPTION"],
        targets: [
            { path: ".Rproj.user", tier: "safe" },
            { path: ".Rhistory", tier: "safe" },
            { path: ".RData", tier: "safe" }
        ]
    },
    {
        name: "LaTeX",
        triggers: ["*.tex"],
        targets: [
            { path: "*.aux", tier: "safe" },
            { path: "*.log", tier: "safe" },
            { path: "*.out", tier: "safe" },
            { path: "*.toc", tier: "safe" },
            { path: "*.fls", tier: "safe" },
            { path: "*.fdb_latexmk", tier: "safe" },
            { path: "*.synctex.gz", tier: "safe" },
            { path: "*.bbl", tier: "safe" },
            { path: "*.blg", tier: "safe" },
            { path: "*.xdv", tier: "safe" }
        ]
    },
    {
        name: "Scala",
        triggers: ["build.sbt"],
        targets: [
            { path: "target", tier: "safe" },
            { path: "project/target", tier: "safe" },
            { path: "project/project", tier: "safe" },
            { path: ".bsp", tier: "safe" },
            { path: ".metals", tier: "safe" }
        ]
    },
    {
        name: "Haskell",
        triggers: ["*.cabal", "package.yaml", "stack.yaml"],
        targets: [
            { path: "dist", tier: "deep" },
            { path: "dist-newstyle", tier: "safe" },
            { path: ".stack-work", tier: "safe" }
        ]
    },
    {
        name: "Zig",
        triggers: ["build.zig"],
        targets: [
            { path: "zig-cache", tier: "safe" },
            { path: "zig-out", tier: "safe" }
        ]
    },
    {
        name: "Flutter",
        triggers: ["pubspec.yaml"],
        targets: [
            { path: "build", tier: "safe" },
            { path: ".dart_tool", tier: "safe" },
            { path: ".pub-cache", tier: "safe" }
        ]
    },
    {
        name: "C / C++",
        triggers: ["CMakeLists.txt", "Makefile", "*.vcxproj"],
        targets: [
            { path: "build", tier: "safe" },
            { path: "out", tier: "safe" },
            { path: "bin", tier: "deep" },
            { path: "obj", tier: "safe" },
            { path: ".cache", tier: "safe" }
        ]
    },
    {
        name: "OCaml",
        triggers: ["dune-project"],
        targets: [
            { path: "_build", tier: "safe" }
        ]
    },
    {
        name: "Astro",
        triggers: ["astro.config.mjs", "astro.config.ts", "astro.config.js"],
        targets: [
            { path: ".astro", tier: "safe" }
        ]
    },
    {
        name: "Docusaurus",
        triggers: ["docusaurus.config.js", "docusaurus.config.ts"],
        targets: [
            { path: ".docusaurus", tier: "safe" }
        ]
    },
    {
        name: "Nx",
        triggers: ["nx.json"],
        targets: [
            { path: ".nx/cache", tier: "safe" },
            { path: ".nx/workspace-data", tier: "safe" }
        ]
    },
    {
        name: "OS & Editor Caches",
        triggers: [], // Empty means this applies everywhere
        targets: [
            { path: ".DS_Store", tier: "safe" },
            { path: "__MACOSX", tier: "safe" },
            { path: "Thumbs.db", tier: "safe" },
            { path: "desktop.ini", tier: "safe" },
            { path: "crashreports", tier: "safe" },
            { path: ".idea", tier: "deep" },
            { path: ".vscode", tier: "deep" }
        ]
    }
];

export const DANGER_ZONE = [
    ".env", ".env.local", ".env.development", ".env.production",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
    "Cargo.lock", "poetry.lock", "Pipfile.lock", "uv.lock",
    "Gemfile.lock", "composer.lock", "mix.lock", ".git"
];
