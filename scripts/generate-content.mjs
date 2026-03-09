// CodeLearn — Curriculum Content Generator
// Pure ES Module — runs directly: node scripts/generate-content.mjs
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error("\n OPENAI_API_KEY is missing.");
    console.error("   1. Copy .env.example to .env");
    console.error("   2. Add your key from https://platform.openai.com/api-keys\n");
    process.exit(1);
}

const openai = new OpenAI({ apiKey });
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';

// --- Curriculum data (inline, mirrors curriculum.ts) ---
const backendLanguages = [
    { id: 'nodejs', name: 'JavaScript / Node.js', framework: 'Express.js' },
    { id: 'python', name: 'Python', framework: 'FastAPI / Django' },
    { id: 'go', name: 'Go (Golang)', framework: 'Gin / Fiber' },
    { id: 'java', name: 'Java', framework: 'Spring Boot' },
    { id: 'php', name: 'PHP', framework: 'Laravel' },
    { id: 'ruby', name: 'Ruby', framework: 'Ruby on Rails' },
];

const frontendLanguages = [
    { id: 'react', name: 'React', framework: 'Vite / Next.js' },
    { id: 'typescript', name: 'TypeScript Frontend', framework: 'React / Next.js' },
    { id: 'vue', name: 'Vue', framework: 'Nuxt / Vue Router' },
    { id: 'angular', name: 'Angular', framework: 'Angular CLI / RxJS' },
];

const mobileLanguages = [
    { id: 'react-native', name: 'React Native', framework: 'Expo / Native APIs' },
    { id: 'flutter', name: 'Flutter', framework: 'Dart / Widget Tree' },
    { id: 'kotlin', name: 'Kotlin Android', framework: 'Jetpack Compose' },
    { id: 'swift', name: 'Swift iOS', framework: 'SwiftUI' },
];

const dataScienceLanguages = [
    { id: 'python-ds', name: 'Python Data Stack', framework: 'Pandas / Scikit-learn' },
    { id: 'r', name: 'R', framework: 'Tidyverse / caret' },
    { id: 'julia', name: 'Julia', framework: 'DataFrames.jl / Flux.jl' },
];

const devopsLanguages = [
    { id: 'aws', name: 'AWS', framework: 'EKS / ECS / CloudWatch' },
    { id: 'azure', name: 'Azure', framework: 'AKS / DevOps / Monitor' },
    { id: 'gcp', name: 'Google Cloud', framework: 'GKE / Cloud Run / Operations' },
    { id: 'kubernetes', name: 'Kubernetes Platform', framework: 'Helm / ArgoCD / Prometheus' },
];

const cybersecurityLanguages = [
    { id: 'web-appsec', name: 'Web App Security', framework: 'Burp Suite / OWASP Testing' },
    { id: 'network-security', name: 'Network Security', framework: 'Wireshark / Zeek / IDS' },
    { id: 'red-team', name: 'Red Teaming', framework: 'Kali / Metasploit / AD tooling' },
];

function topicUsesStackVariant(track, topic) {
    return topic.langSpecific ?? !!track.stackScopedContent;
}

const curriculumData = {
    tracks: [
        {
            id: 'backend', title: 'Backend Engineering',
            supportedLanguages: backendLanguages,
            stackScopedContent: true,
            modules: [
                {
                    id: 'phase1', title: 'Phase 1 — Language Foundations', topics: [
                        { id: 'variables_types', title: 'Variables, Data Types & Operators', contentRef: 'backend/phase1/variables_types.md', langSpecific: true },
                        { id: 'control_flow', title: 'Control Flow — Conditions & Loops', contentRef: 'backend/phase1/control_flow.md', langSpecific: true },
                        { id: 'functions', title: 'Functions, Scope & Closures', contentRef: 'backend/phase1/functions.md', langSpecific: true },
                        { id: 'data_structures', title: 'Data Structures — Arrays, Objects & Maps', contentRef: 'backend/phase1/data_structures.md', langSpecific: true },
                        { id: 'oop', title: 'Object-Oriented Programming', contentRef: 'backend/phase1/oop.md', langSpecific: true },
                        { id: 'error_handling', title: 'Error Handling & Debugging', contentRef: 'backend/phase1/error_handling.md', langSpecific: true },
                        { id: 'modules_packages', title: 'Modules, Packages & Dependency Management', contentRef: 'backend/phase1/modules_packages.md', langSpecific: true },
                    ]
                },
                {
                    id: 'phase2', title: 'Phase 2 — Developer Tools & Workflow', topics: [
                        { id: 'terminal', title: 'Terminal & Bash — Navigating the Command Line', contentRef: 'backend/phase2/terminal.md' },
                        { id: 'git_basics', title: 'Git Basics — Commits, Branches & Merging', contentRef: 'backend/phase2/git_basics.md' },
                        { id: 'github_collab', title: 'GitHub — Pull Requests, Forks & Team Collaboration', contentRef: 'backend/phase2/github_collab.md' },
                        { id: 'env_setup', title: 'Setting Up a Professional Dev Environment', contentRef: 'backend/phase2/env_setup.md', langSpecific: true },
                    ]
                },
                {
                    id: 'phase3', title: 'Phase 3 — Networking & The Web', topics: [
                        { id: 'internet', title: 'How the Internet Works (DNS, TCP/IP, Packets)', contentRef: 'backend/phase3/internet.md' },
                        { id: 'http_deep', title: 'HTTP In Depth — Methods, Headers, Status Codes', contentRef: 'backend/phase3/http_deep.md' },
                        { id: 'rest_principles', title: 'REST Architecture — Designing Good APIs', contentRef: 'backend/phase3/rest_principles.md' },
                        { id: 'json_formats', title: 'Data Formats — JSON, XML, and Serialisation', contentRef: 'backend/phase3/json_formats.md' },
                    ]
                },
                {
                    id: 'phase4', title: 'Phase 4 — Building Web Servers', topics: [
                        { id: 'web_framework', title: 'Your First Web Server with a Framework', contentRef: 'backend/phase4/web_framework.md', langSpecific: true },
                        { id: 'routing', title: 'Routing — URL Design and Path Parameters', contentRef: 'backend/phase4/routing.md', langSpecific: true },
                        { id: 'middleware', title: 'Middleware — Logging, CORS, and Request Pipeline', contentRef: 'backend/phase4/middleware.md', langSpecific: true },
                        { id: 'validation', title: 'Input Validation — Never Trust User Input', contentRef: 'backend/phase4/validation.md', langSpecific: true },
                        { id: 'error_api', title: 'Error Handling in APIs — Consistent Responses', contentRef: 'backend/phase4/error_api.md', langSpecific: true },
                        { id: 'env_vars', title: 'Environment Variables & Config Management', contentRef: 'backend/phase4/env_vars.md' },
                        { id: 'testing_basics', title: 'Testing Basics — Unit & Integration Tests', contentRef: 'backend/phase4/testing_basics.md', langSpecific: true },
                    ]
                },
                {
                    id: 'phase5', title: 'Phase 5 — Databases', topics: [
                        { id: 'sql_deep', title: 'SQL — DDL, DML, and Querying Postgres', contentRef: 'backend/phase5/sql_deep.md' },
                        { id: 'db_design', title: 'Database Design & Normalisation (1NF-3NF)', contentRef: 'backend/phase5/db_design.md' },
                        { id: 'joins_advanced', title: 'Advanced SQL — JOINs, Subqueries & Aggregations', contentRef: 'backend/phase5/joins_advanced.md' },
                        { id: 'orm', title: 'ORM & Migrations', contentRef: 'backend/phase5/orm.md', langSpecific: true },
                        { id: 'indexing', title: 'Indexing, Query Planning & Performance', contentRef: 'backend/phase5/indexing.md' },
                        { id: 'nosql', title: 'NoSQL Databases — MongoDB & When to Use Them', contentRef: 'backend/phase5/nosql.md' },
                        { id: 'transactions', title: 'Transactions, ACID, and Concurrency', contentRef: 'backend/phase5/transactions.md' },
                    ]
                },
                {
                    id: 'phase6', title: 'Phase 6 — Authentication & Security', topics: [
                        { id: 'passwords', title: 'Password Hashing with bcrypt', contentRef: 'backend/phase6/passwords.md', langSpecific: true },
                        { id: 'sessions_cookies', title: 'Sessions & Cookies — Stateful Auth', contentRef: 'backend/phase6/sessions_cookies.md', langSpecific: true },
                        { id: 'jwt', title: 'JWT — Stateless Authentication', contentRef: 'backend/phase6/jwt.md', langSpecific: true },
                        { id: 'oauth', title: 'OAuth 2.0 — Login with Google / GitHub', contentRef: 'backend/phase6/oauth.md' },
                        { id: 'rbac', title: 'Role-Based Access Control (RBAC)', contentRef: 'backend/phase6/rbac.md', langSpecific: true },
                        { id: 'security_threats', title: 'Security — SQLi, XSS, CSRF & Rate Limiting', contentRef: 'backend/phase6/security_threats.md' },
                        { id: 'https_cors', title: 'HTTPS, TLS & CORS Configuration', contentRef: 'backend/phase6/https_cors.md' },
                    ]
                },
                {
                    id: 'phase7', title: 'Phase 7 — Advanced API Features', topics: [
                        { id: 'file_uploads', title: 'File Uploads — Images, PDFs & Cloud Storage', contentRef: 'backend/phase7/file_uploads.md', langSpecific: true },
                        { id: 'email', title: 'Sending Email — Transactional & Notifications', contentRef: 'backend/phase7/email.md', langSpecific: true },
                        { id: 'pagination', title: 'Pagination, Filtering & Sorting APIs', contentRef: 'backend/phase7/pagination.md' },
                        { id: 'websockets', title: 'Real-Time with WebSockets', contentRef: 'backend/phase7/websockets.md', langSpecific: true },
                        { id: 'graphql', title: 'GraphQL — Flexible API Queries', contentRef: 'backend/phase7/graphql.md', langSpecific: true },
                        { id: 'caching', title: 'Caching with Redis — Speed Up Your API', contentRef: 'backend/phase7/caching.md' },
                        { id: 'api_versioning', title: 'API Versioning & Deprecation Strategies', contentRef: 'backend/phase7/api_versioning.md' },
                    ]
                },
                {
                    id: 'phase8', title: 'Phase 8 — Infrastructure & Deployment', topics: [
                        { id: 'docker', title: 'Docker — Containers & docker-compose', contentRef: 'backend/phase8/docker.md', langSpecific: true },
                        { id: 'cicd', title: 'CI/CD — GitHub Actions Pipelines', contentRef: 'backend/phase8/cicd.md' },
                        { id: 'cloud_deploy', title: 'Cloud Deployment — Railway, Render & AWS EC2', contentRef: 'backend/phase8/cloud_deploy.md', langSpecific: true },
                        { id: 'logging', title: 'Logging, Monitoring & Alerting', contentRef: 'backend/phase8/logging.md' },
                        { id: 'secrets', title: 'Secrets Management & Production Config', contentRef: 'backend/phase8/secrets.md' },
                    ]
                },
                {
                    id: 'phase9', title: 'Phase 9 — System Design & Scalability', topics: [
                        { id: 'cap_theorem', title: 'CAP Theorem & Distributed Systems Basics', contentRef: 'backend/phase9/cap_theorem.md' },
                        { id: 'message_queues', title: 'Message Queues — Kafka & RabbitMQ', contentRef: 'backend/phase9/message_queues.md' },
                        { id: 'microservices', title: 'Microservices vs Monolith — When & Why', contentRef: 'backend/phase9/microservices.md' },
                        { id: 'load_balancing', title: 'Load Balancing & Horizontal Scaling', contentRef: 'backend/phase9/load_balancing.md' },
                        { id: 'db_scaling', title: 'Database Scaling — Replication & Sharding', contentRef: 'backend/phase9/db_scaling.md' },
                        { id: 'system_design_interview', title: 'System Design Interview Walkthroughs', contentRef: 'backend/phase9/system_design_interview.md' },
                    ]
                },
            ],
        },
        {
            id: 'frontend', title: 'Frontend Engineering',
            supportedLanguages: frontendLanguages,
            stackScopedContent: true,
            modules: [
                {
                    id: 'novice', title: 'Novice (The Foundations)', topics: [
                        { id: 'html', title: 'Semantic HTML5 & Accessibility', contentRef: 'frontend/novice/html.md' },
                        { id: 'css', title: 'CSS3 Foundations (Flexbox, Grid, Variables)', contentRef: 'frontend/novice/css.md' },
                        { id: 'js_basics', title: 'JavaScript Fundamentals (DOM, Events)', contentRef: 'frontend/novice/js_basics.md' },
                    ]
                },
                {
                    id: 'beginner', title: 'Beginner (Modern UI Frameworks)', topics: [
                        { id: 'react_core', title: 'React Core (JSX, Props, State hook)', contentRef: 'frontend/beginner/react_core.md' },
                        { id: 'routing', title: 'Client-side Routing (React Router)', contentRef: 'frontend/beginner/routing.md' },
                        { id: 'styling', title: 'Modern Styling (Tailwind, CSS-in-JS)', contentRef: 'frontend/beginner/styling.md' },
                    ]
                },
                {
                    id: 'intermediate', title: 'Intermediate (Advanced State & Frameworks)', topics: [
                        { id: 'advanced_hooks', title: 'Advanced React Hooks (useReducer, useMemo)', contentRef: 'frontend/intermediate/advanced_hooks.md' },
                        { id: 'state_management', title: 'Global State (Redux Toolkit, Zustand)', contentRef: 'frontend/intermediate/state_management.md' },
                        { id: 'nextjs', title: 'Full-stack React with Next.js (SSR, SSG)', contentRef: 'frontend/intermediate/nextjs.md' },
                    ]
                },
                {
                    id: 'advanced', title: 'Advanced (Performance & Architecture)', topics: [
                        { id: 'performance', title: 'Web Vitals & Performance Optimization', contentRef: 'frontend/advanced/performance.md' },
                        { id: 'testing', title: 'Testing (Jest, React Testing Library, Cypress)', contentRef: 'frontend/advanced/testing.md' },
                        { id: 'microfrontends', title: 'Micro-frontend Architectures', contentRef: 'frontend/advanced/microfrontends.md' },
                    ]
                },
                {
                    id: 'expert', title: 'Expert (Browser Internals & Graphics)', topics: [
                        { id: 'browser_engine', title: 'How Browsers Work (Event Loop, Render Pipeline)', contentRef: 'frontend/expert/browser_engine.md' },
                        { id: 'webgl', title: '3D Graphics (WebGL, Three.js)', contentRef: 'frontend/expert/webgl.md' },
                        { id: 'wasm', title: 'WebAssembly (Bringing Rust/C++ to the Web)', contentRef: 'frontend/expert/wasm.md' },
                    ]
                },
            ],
        },
        {
            id: 'mobile', title: 'Mobile App Development',
            supportedLanguages: mobileLanguages,
            stackScopedContent: true,
            modules: [
                { id: 'novice', title: 'Novice (Mobile Paradigms)', topics: [{ id: 'mobile_os', title: 'iOS vs Android Ecosystems', contentRef: 'mobile/novice/mobile_os.md' }, { id: 'mobile_ui', title: 'Mobile UI/UX Design Principles', contentRef: 'mobile/novice/mobile_ui.md' }] },
                { id: 'beginner', title: 'Beginner (Cross-Platform)', topics: [{ id: 'react_native', title: 'Introduction to React Native', contentRef: 'mobile/beginner/react_native.md' }, { id: 'flutter', title: 'Introduction to Flutter & Dart', contentRef: 'mobile/beginner/flutter.md' }] },
                { id: 'intermediate', title: 'Intermediate (Native Device Features)', topics: [{ id: 'camera_gps', title: 'Accessing Camera and Geolocation', contentRef: 'mobile/intermediate/camera_gps.md' }, { id: 'storage', title: 'Offline Storage (SQLite, AsyncStorage)', contentRef: 'mobile/intermediate/storage.md' }, { id: 'push', title: 'Push Notifications Integration', contentRef: 'mobile/intermediate/push.md' }] },
                { id: 'advanced', title: 'Advanced (Native Modules)', topics: [{ id: 'bridging', title: 'Writing Native Bridge Modules', contentRef: 'mobile/advanced/bridging.md' }, { id: 'animations', title: 'Fluid 60FPS Mobile Animations', contentRef: 'mobile/advanced/animations.md' }] },
                { id: 'expert', title: 'Expert (Publishing & At-Scale)', topics: [{ id: 'profiling', title: 'Memory Profiling and Leak Detection', contentRef: 'mobile/expert/profiling.md' }, { id: 'ci_cd', title: 'Mobile CI/CD (Fastlane, Bitrise)', contentRef: 'mobile/expert/ci_cd.md' }, { id: 'app_store', title: 'App Store & Play Store Publishing Strategies', contentRef: 'mobile/expert/app_store.md' }] },
            ],
        },
        {
            id: 'data-science', title: 'Data Science & AI',
            supportedLanguages: dataScienceLanguages,
            stackScopedContent: true,
            modules: [
                { id: 'novice', title: 'Novice (Data Foundations)', topics: [{ id: 'python', title: 'Python Basics for Data Science', contentRef: 'data-science/novice/python.md' }, { id: 'math', title: 'Linear Algebra & Statistics', contentRef: 'data-science/novice/math.md' }] },
                { id: 'beginner', title: 'Beginner (Data Manipulation)', topics: [{ id: 'pandas_numpy', title: 'Pandas & NumPy', contentRef: 'data-science/beginner/pandas_numpy.md' }, { id: 'dataviz', title: 'Data Visualization (Matplotlib, Seaborn)', contentRef: 'data-science/beginner/dataviz.md' }] },
                { id: 'intermediate', title: 'Intermediate (Machine Learning)', topics: [{ id: 'sklearn', title: 'Supervised & Unsupervised Learning (Scikit-Learn)', contentRef: 'data-science/intermediate/sklearn.md' }, { id: 'sql_analytics', title: 'Advanced SQL for Analytics', contentRef: 'data-science/intermediate/sql_analytics.md' }] },
                { id: 'advanced', title: 'Advanced (Deep Learning)', topics: [{ id: 'neural_networks', title: 'Deep Learning with PyTorch/TensorFlow', contentRef: 'data-science/advanced/neural_networks.md' }, { id: 'nlp', title: 'Natural Language Processing', contentRef: 'data-science/advanced/nlp.md' }] },
                { id: 'expert', title: 'Expert (Generative AI & MLOps)', topics: [{ id: 'llms', title: 'Transformers & Large Language Models', contentRef: 'data-science/expert/llms.md' }, { id: 'mlops', title: 'MLOps: Deploying Models at Scale', contentRef: 'data-science/expert/mlops.md' }] },
            ],
        },
        {
            id: 'devops', title: 'DevOps & Cloud Engineering',
            supportedLanguages: devopsLanguages,
            stackScopedContent: true,
            modules: [
                { id: 'novice', title: 'Novice (Linux & Scripting)', topics: [{ id: 'linux', title: 'Linux Fundamentals & Administration', contentRef: 'devops/novice/linux.md' }, { id: 'bash', title: 'Bash Scripting for Automation', contentRef: 'devops/novice/bash.md' }] },
                { id: 'beginner', title: 'Beginner (Containers & CI/CD)', topics: [{ id: 'docker', title: 'Docker Deep Dive', contentRef: 'devops/beginner/docker.md' }, { id: 'pipelines', title: 'GitHub Actions & GitLab CI Pipelines', contentRef: 'devops/beginner/pipelines.md' }] },
                { id: 'intermediate', title: 'Intermediate (Infrastructure as Code)', topics: [{ id: 'terraform', title: 'Infrastructure as Code with Terraform', contentRef: 'devops/intermediate/terraform.md' }, { id: 'aws', title: 'AWS Cloud Provider Deep Dive', contentRef: 'devops/intermediate/aws.md' }] },
                { id: 'advanced', title: 'Advanced (Kubernetes)', topics: [{ id: 'k8s_admin', title: 'Kubernetes Administration & Helm', contentRef: 'devops/advanced/k8s_admin.md' }, { id: 'observability', title: 'Observability (Prometheus, Grafana, ELK)', contentRef: 'devops/advanced/observability.md' }] },
                { id: 'expert', title: 'Expert (SRE & Reliability)', topics: [{ id: 'chaos', title: 'Chaos Engineering & Reliability', contentRef: 'devops/expert/chaos.md' }, { id: 'sre', title: 'SRE Principles & Golden Signals', contentRef: 'devops/expert/sre.md' }] },
            ],
        },
        {
            id: 'cybersecurity', title: 'Cyber Security',
            supportedLanguages: cybersecurityLanguages,
            stackScopedContent: true,
            modules: [
                { id: 'novice', title: 'Novice (Security Basics)', topics: [{ id: 'networking', title: 'Networking for Security (OSI, Ports)', contentRef: 'cybersecurity/novice/networking.md' }, { id: 'crypto', title: 'Cryptography Fundamentals', contentRef: 'cybersecurity/novice/crypto.md' }] },
                { id: 'beginner', title: 'Beginner (Web Vulnerabilities)', topics: [{ id: 'owasp', title: 'OWASP Top 10 (SQLi, XSS, CSRF)', contentRef: 'cybersecurity/beginner/owasp.md' }, { id: 'burp', title: 'Introduction to Burp Suite', contentRef: 'cybersecurity/beginner/burp.md' }] },
                { id: 'intermediate', title: 'Intermediate (Penetration Testing)', topics: [{ id: 'recon', title: 'Reconnaissance and Enumeration', contentRef: 'cybersecurity/intermediate/recon.md' }, { id: 'exploitation', title: 'Exploitation and Privilege Escalation', contentRef: 'cybersecurity/intermediate/exploitation.md' }] },
                { id: 'advanced', title: 'Advanced (Defense & Forensics)', topics: [{ id: 'incident_response', title: 'Incident Response Procedures', contentRef: 'cybersecurity/advanced/incident_response.md' }, { id: 'forensics', title: 'Digital Forensics Fundamentals', contentRef: 'cybersecurity/advanced/forensics.md' }] },
                { id: 'expert', title: 'Expert (Advanced Topics)', topics: [{ id: 'reverse_engineering', title: 'Malware Analysis & Reverse Engineering', contentRef: 'cybersecurity/expert/reverse_engineering.md' }, { id: 'red_teaming', title: 'Red Teaming & Active Directory Abuse', contentRef: 'cybersecurity/expert/red_teaming.md' }] },
            ],
        },
    ],
};

// --- Prompt ---
const SYSTEM_PROMPT = [
    "You are an expert curriculum developer and senior software engineer.",
    "Generate highly-detailed, structured, markdown educational content for programming topics.",
    "",
    "REQUIRED STRUCTURE — include every section, no exceptions:",
    "1. Compelling introductory paragraph: what the concept is and why it matters professionally.",
    "2. Numbered H2 sections (## 1., ## 2., ...) covering key sub-topics with correct code examples.",
    "3. After non-trivial code blocks: add ### Line-by-line explanation breaking down each line.",
    "4. ## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.",
    "5. ## Y. Why This Matters In Real Systems — production context and real usage.",
    "6. ## Z. Study Questions — 5 recall questions.",
    "7. ## Exercise — a practical multi-part coding challenge.",
    "",
    "Output ONLY raw markdown. No preamble. Start with the H1 title.",
].join("\n");

async function generateContent(trackTitle, moduleTitle, topicTitle, languageContext) {
    const prompt = [
        "Generate a complete detailed lesson for this topic:",
        "",
        "Track: " + trackTitle,
        "Module: " + moduleTitle,
        "Topic: " + topicTitle,
        "Language/Stack: " + (languageContext || "Language-agnostic"),
        "",
        "Include: intro paragraph, numbered concept sections with code, line-by-line explanations,",
        "Common Beginner Mistakes, Why This Matters In Real Systems, Study Questions, Exercise.",
        "Output ONLY markdown. Begin with the H1 title.",
    ].join("\n");

    try {
        const request = {
            model: MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt },
            ],
        };

        if (!MODEL.startsWith('gpt-5')) {
            request.temperature = 0.2;
        }

        const response = await openai.chat.completions.create(request);

        let text = (response.choices[0]?.message?.content || "").trim();
        if (text.startsWith("```markdown")) text = text.slice("```markdown".length);
        if (text.startsWith("```")) text = text.slice(3);
        if (text.endsWith("```")) text = text.slice(0, -3);
        return text.trim();
    } catch (err) {
        console.error("    [API ERROR] " + (err.message || err));
        return null;
    }
}

async function fileExists(p) {
    try { await fs.access(p); return true; } catch { return false; }
}

async function processTopic(targetPath, trackTitle, modTitle, topicTitle, langName) {
    if (await fileExists(targetPath)) {
        console.log("    [SKIP]     " + targetPath);
        return false;
    }
    await fs.mkdir(dirname(targetPath), { recursive: true });
    console.log("    [GENERATE] " + topicTitle + (langName ? " (" + langName + ")" : ""));
    console.log("               -> " + targetPath);
    const content = await generateContent(trackTitle, modTitle, topicTitle, langName);
    if (content) {
        await fs.writeFile(targetPath, content, "utf8");
        console.log("    [OK]       " + content.length + " chars written");
        await new Promise(r => setTimeout(r, 1000)); // OpenAI has higher rate limits
        return true;
    }
    console.error("    [FAILED]   " + topicTitle);
    return false;
}

async function main() {
    console.log("\n CodeLearn — Curriculum Content Generator");
    console.log("==========================================");
    console.log(`Model : ${MODEL}`);
    console.log("Delay : 1 s between API calls");
    console.log("Output: src/content/**/*.md\n");

    const contentDir = join(process.cwd(), "src", "content");
    await fs.mkdir(contentDir, { recursive: true });

    let generated = 0, skipped = 0;

    for (const track of curriculumData.tracks) {
        console.log("\nTrack: " + track.title);
        for (const mod of track.modules) {
            console.log("  Module: " + mod.title);
            for (const topic of mod.topics) {
                if (topicUsesStackVariant(track, topic) && track.supportedLanguages) {
                    for (const lang of track.supportedLanguages) {
                        const ext = topic.contentRef.lastIndexOf(".");
                        const base = ext > -1 ? topic.contentRef.substring(0, ext) : topic.contentRef;
                        const tgt = join(contentDir, base + "_" + lang.id + ".md");
                        const ok = await processTopic(tgt, track.title, mod.title, topic.title, lang.name);
                        ok ? generated++ : skipped++;
                    }
                } else {
                    const tgt = join(contentDir, topic.contentRef);
                    const ok = await processTopic(tgt, track.title, mod.title, topic.title, null);
                    ok ? generated++ : skipped++;
                }
            }
        }
    }

    console.log("\n==========================================");
    console.log("Done! Generated: " + generated + " | Skipped: " + skipped);
    console.log("Files are in src/content/");
}

main().catch(err => { console.error("Fatal: " + (err.message || err)); process.exit(1); });
