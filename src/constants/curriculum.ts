export interface Topic {
    id: string;
    title: string;
    contentRef: string;
    langSpecific?: boolean; // if true, content changes based on selected stack
}

export interface Module {
    id: string;
    title: string;
    description: string;
    topics: Topic[];
}

export interface CurriculumStack {
    id: string;
    name: string;
    framework: string;
    tagline: string;
    color: string;
    emoji: string;
}

export type BackendLanguage = CurriculumStack;

export interface Track {
    id: string;
    title: string;
    description: string;
    icon: string;
    supportedLanguages?: CurriculumStack[];
    stackScopedContent?: boolean;
    modules: Module[];
}

export interface CurriculumData {
    tracks: Track[];
}

export const backendLanguages: CurriculumStack[] = [
    {
        id: 'nodejs',
        name: 'JavaScript / Node.js',
        framework: 'Express.js',
        tagline: 'Most in-demand. Powers the entire JavaScript ecosystem end-to-end.',
        color: '#f7df1e',
        emoji: '⚡',
    },
    {
        id: 'python',
        name: 'Python',
        framework: 'FastAPI / Django',
        tagline: 'Beginner-friendly. Dominant in data science, AI, and startups.',
        color: '#3b82f6',
        emoji: '🐍',
    },
    {
        id: 'go',
        name: 'Go (Golang)',
        framework: 'Gin / Fiber',
        tagline: 'Blazing fast. Built for cloud-native, scalable systems.',
        color: '#00acd7',
        emoji: '🚀',
    },
    {
        id: 'java',
        name: 'Java',
        framework: 'Spring Boot',
        tagline: 'Enterprise standard. Used at banks, telecoms, and large corporations.',
        color: '#f89820',
        emoji: '☕',
    },
    {
        id: 'php',
        name: 'PHP',
        framework: 'Laravel',
        tagline: 'Powers 77% of the web. Fast to deploy, huge job market.',
        color: '#8892be',
        emoji: '🐘',
    },
    {
        id: 'ruby',
        name: 'Ruby',
        framework: 'Ruby on Rails',
        tagline: 'Convention over configuration. Beloved for rapid prototyping.',
        color: '#cc342d',
        emoji: '💎',
    },
];

export const frontendStacks: CurriculumStack[] = [
    {
        id: 'react',
        name: 'React',
        framework: 'Vite / Next.js',
        tagline: 'The dominant frontend ecosystem with strong hiring demand.',
        color: '#61dafb',
        emoji: '⚛',
    },
    {
        id: 'typescript',
        name: 'TypeScript Frontend',
        framework: 'React / Next.js',
        tagline: 'Typed UI development for larger, more maintainable codebases.',
        color: '#3178c6',
        emoji: '🔷',
    },
    {
        id: 'vue',
        name: 'Vue',
        framework: 'Nuxt / Vue Router',
        tagline: 'Progressive and approachable, with a strong component model.',
        color: '#42b883',
        emoji: '💚',
    },
    {
        id: 'angular',
        name: 'Angular',
        framework: 'Angular CLI / RxJS',
        tagline: 'Structured frontend architecture for large teams and enterprise apps.',
        color: '#dd0031',
        emoji: '🅰',
    },
];

export const mobileStacks: CurriculumStack[] = [
    {
        id: 'react-native',
        name: 'React Native',
        framework: 'Expo / Native APIs',
        tagline: 'JavaScript-driven mobile development with one shared codebase.',
        color: '#61dafb',
        emoji: '📱',
    },
    {
        id: 'flutter',
        name: 'Flutter',
        framework: 'Dart / Widget Tree',
        tagline: 'Fast, polished cross-platform apps with a strong UI toolkit.',
        color: '#42a5f5',
        emoji: '🦋',
    },
    {
        id: 'kotlin',
        name: 'Kotlin Android',
        framework: 'Jetpack Compose',
        tagline: 'Modern native Android development with first-party tooling.',
        color: '#7f52ff',
        emoji: '🤖',
    },
    {
        id: 'swift',
        name: 'Swift iOS',
        framework: 'SwiftUI',
        tagline: 'Native iOS development focused on performance and platform fidelity.',
        color: '#f05138',
        emoji: '🍎',
    },
];

export const dataScienceStacks: CurriculumStack[] = [
    {
        id: 'python-ds',
        name: 'Python Data Stack',
        framework: 'Pandas / Scikit-learn',
        tagline: 'The default path for analytics, ML, and production AI workflows.',
        color: '#3776ab',
        emoji: '🐍',
    },
    {
        id: 'r',
        name: 'R',
        framework: 'Tidyverse / caret',
        tagline: 'Excellent for statistics, exploration, and research-heavy workflows.',
        color: '#276dc3',
        emoji: '📊',
    },
    {
        id: 'julia',
        name: 'Julia',
        framework: 'DataFrames.jl / Flux.jl',
        tagline: 'High-performance numerical computing with modern language ergonomics.',
        color: '#9558b2',
        emoji: '🧮',
    },
];

export const devopsStacks: CurriculumStack[] = [
    {
        id: 'aws',
        name: 'AWS',
        framework: 'EKS / ECS / CloudWatch',
        tagline: 'The broadest cloud platform with mature operational tooling.',
        color: '#ff9900',
        emoji: '☁',
    },
    {
        id: 'azure',
        name: 'Azure',
        framework: 'AKS / DevOps / Monitor',
        tagline: 'Strong enterprise cloud path with Microsoft ecosystem integration.',
        color: '#0078d4',
        emoji: '🔷',
    },
    {
        id: 'gcp',
        name: 'Google Cloud',
        framework: 'GKE / Cloud Run / Operations',
        tagline: 'Cloud-native infrastructure with strong data and Kubernetes support.',
        color: '#4285f4',
        emoji: '🌐',
    },
    {
        id: 'kubernetes',
        name: 'Kubernetes Platform',
        framework: 'Helm / ArgoCD / Prometheus',
        tagline: 'Vendor-neutral operations centered on container orchestration.',
        color: '#326ce5',
        emoji: '⎈',
    },
];

export const cybersecurityStacks: CurriculumStack[] = [
    {
        id: 'web-appsec',
        name: 'Web App Security',
        framework: 'Burp Suite / OWASP Testing',
        tagline: 'Hands-on vulnerability discovery and remediation for web systems.',
        color: '#f97316',
        emoji: '🛡',
    },
    {
        id: 'network-security',
        name: 'Network Security',
        framework: 'Wireshark / Zeek / IDS',
        tagline: 'Traffic analysis, detection engineering, and defensive visibility.',
        color: '#ef4444',
        emoji: '🕸',
    },
    {
        id: 'red-team',
        name: 'Red Teaming',
        framework: 'Kali / Metasploit / AD tooling',
        tagline: 'Adversarial tradecraft, privilege escalation, and offensive operations.',
        color: '#b91c1c',
        emoji: '🎯',
    },
];

export function getTrackSupportedLanguages(trackId: string): CurriculumStack[] {
    const track = curriculumData.tracks.find((entry) => entry.id === trackId);
    return track?.supportedLanguages ?? [];
}

export function topicUsesStackVariant(track: Track, topic: Topic): boolean {
    return topic.langSpecific ?? !!track.stackScopedContent;
}

export const curriculumData: CurriculumData = {
    tracks: [
        {
            id: 'backend',
            title: 'Backend Engineering',
            description: 'Master server-side development — from your first line of code to designing distributed systems at scale.',
            icon: 'Server',
            supportedLanguages: backendLanguages,
            stackScopedContent: true,
            modules: [
                {
                    id: 'phase1',
                    title: 'Phase 1 — Language Foundations',
                    description: 'Master your chosen language from scratch. Variables, functions, data structures, OOP, and error handling.',
                    topics: [
                        { id: 'variables_types', title: 'Variables, Data Types & Operators', contentRef: 'backend/phase1/variables_types.md', langSpecific: true },
                        { id: 'control_flow', title: 'Control Flow — Conditions & Loops', contentRef: 'backend/phase1/control_flow.md', langSpecific: true },
                        { id: 'functions', title: 'Functions, Scope & Closures', contentRef: 'backend/phase1/functions.md', langSpecific: true },
                        { id: 'data_structures', title: 'Data Structures — Arrays, Objects & Maps', contentRef: 'backend/phase1/data_structures.md', langSpecific: true },
                        { id: 'oop', title: 'Object-Oriented Programming (Classes & Inheritance)', contentRef: 'backend/phase1/oop.md', langSpecific: true },
                        { id: 'error_handling', title: 'Error Handling & Debugging', contentRef: 'backend/phase1/error_handling.md', langSpecific: true },
                        { id: 'modules_packages', title: 'Modules, Packages & Dependency Management', contentRef: 'backend/phase1/modules_packages.md', langSpecific: true },
                    ]
                },
                {
                    id: 'phase2',
                    title: 'Phase 2 — Developer Tools & Workflow',
                    description: 'The tools every professional developer uses daily — terminal, Git, and code organisation.',
                    topics: [
                        { id: 'terminal', title: 'Terminal & Bash — Navigating the Command Line', contentRef: 'backend/phase2/terminal.md' },
                        { id: 'git_basics', title: 'Git Basics — Commits, Branches & Merging', contentRef: 'backend/phase2/git_basics.md' },
                        { id: 'github_collab', title: 'GitHub — Pull Requests, Forks & Team Collaboration', contentRef: 'backend/phase2/github_collab.md' },
                        { id: 'env_setup', title: 'Setting Up a Professional Dev Environment', contentRef: 'backend/phase2/env_setup.md', langSpecific: true },
                    ]
                },
                {
                    id: 'phase3',
                    title: 'Phase 3 — Networking & The Web',
                    description: 'Understand the plumbing your app runs on — DNS, HTTP, and how data travels across the internet.',
                    topics: [
                        { id: 'internet', title: 'How the Internet Works (DNS, TCP/IP, Packets)', contentRef: 'backend/phase3/internet.md' },
                        { id: 'http_deep', title: 'HTTP In Depth — Methods, Headers, Status Codes', contentRef: 'backend/phase3/http_deep.md' },
                        { id: 'rest_principles', title: 'REST Architecture — Designing Good APIs', contentRef: 'backend/phase3/rest_principles.md' },
                        { id: 'json_formats', title: 'Data Formats — JSON, XML, and Serialisation', contentRef: 'backend/phase3/json_formats.md' },
                    ]
                },
                {
                    id: 'phase4',
                    title: 'Phase 4 — Building Web Servers',
                    description: 'Build your first production-ready backend APIs using your chosen language and framework.',
                    topics: [
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
                    id: 'phase5',
                    title: 'Phase 5 — Databases',
                    description: 'Store, retrieve, and model data using both relational and non-relational databases.',
                    topics: [
                        { id: 'sql_deep', title: 'SQL — DDL, DML, and Querying Postgres', contentRef: 'backend/phase5/sql_deep.md' },
                        { id: 'db_design', title: 'Database Design & Normalisation (1NF–3NF)', contentRef: 'backend/phase5/db_design.md' },
                        { id: 'joins_advanced', title: 'Advanced SQL — JOINs, Subqueries & Aggregations', contentRef: 'backend/phase5/joins_advanced.md' },
                        { id: 'orm', title: 'Object-Relational Mapping (ORM) & Migrations', contentRef: 'backend/phase5/orm.md', langSpecific: true },
                        { id: 'indexing', title: 'Indexing, Query Planning & Performance', contentRef: 'backend/phase5/indexing.md' },
                        { id: 'nosql', title: 'NoSQL Databases — MongoDB & When to Use Them', contentRef: 'backend/phase5/nosql.md' },
                        { id: 'transactions', title: 'Transactions, ACID, and Concurrency', contentRef: 'backend/phase5/transactions.md' },
                    ]
                },
                {
                    id: 'phase6',
                    title: 'Phase 6 — Authentication & Security',
                    description: 'Protect your application — user login, sessions, JWT tokens, and defending against attacks.',
                    topics: [
                        { id: 'passwords', title: 'Password Hashing with bcrypt', contentRef: 'backend/phase6/passwords.md', langSpecific: true },
                        { id: 'sessions_cookies', title: 'Sessions & Cookies — Stateful Auth', contentRef: 'backend/phase6/sessions_cookies.md', langSpecific: true },
                        { id: 'jwt', title: 'JWT — Stateless Authentication', contentRef: 'backend/phase6/jwt.md', langSpecific: true },
                        { id: 'oauth', title: 'OAuth 2.0 — Login with Google / GitHub', contentRef: 'backend/phase6/oauth.md' },
                        { id: 'rbac', title: 'Role-Based Access Control (RBAC)', contentRef: 'backend/phase6/rbac.md', langSpecific: true },
                        { id: 'security_threats', title: 'Security — SQL Injection, XSS, CSRF & Rate Limiting', contentRef: 'backend/phase6/security_threats.md' },
                        { id: 'https_cors', title: 'HTTPS, TLS & CORS Configuration', contentRef: 'backend/phase6/https_cors.md' },
                    ]
                },
                {
                    id: 'phase7',
                    title: 'Phase 7 — Advanced API Features',
                    description: 'Add real-world capabilities — file uploads, emails, real-time, search, and API design patterns.',
                    topics: [
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
                    id: 'phase8',
                    title: 'Phase 8 — Infrastructure & Deployment',
                    description: 'Ship your application to the world — containers, CI/CD pipelines, and cloud deployment.',
                    topics: [
                        { id: 'docker', title: 'Docker — Containers & docker-compose', contentRef: 'backend/phase8/docker.md', langSpecific: true },
                        { id: 'cicd', title: 'CI/CD — GitHub Actions Pipelines', contentRef: 'backend/phase8/cicd.md' },
                        { id: 'cloud_deploy', title: 'Cloud Deployment — Railway, Render & AWS EC2', contentRef: 'backend/phase8/cloud_deploy.md', langSpecific: true },
                        { id: 'logging', title: 'Logging, Monitoring & Alerting', contentRef: 'backend/phase8/logging.md' },
                        { id: 'secrets', title: 'Secrets Management & Production Config', contentRef: 'backend/phase8/secrets.md' },
                    ]
                },
                {
                    id: 'phase9',
                    title: 'Phase 9 — System Design & Scalability',
                    description: 'Design systems that handle millions of users — the knowledge that separates seniors from juniors.',
                    topics: [
                        { id: 'cap_theorem', title: 'CAP Theorem & Distributed Systems Basics', contentRef: 'backend/phase9/cap_theorem.md' },
                        { id: 'message_queues', title: 'Message Queues — Kafka & RabbitMQ', contentRef: 'backend/phase9/message_queues.md' },
                        { id: 'microservices', title: 'Microservices vs Monolith — When & Why', contentRef: 'backend/phase9/microservices.md' },
                        { id: 'load_balancing', title: 'Load Balancing & Horizontal Scaling', contentRef: 'backend/phase9/load_balancing.md' },
                        { id: 'db_scaling', title: 'Database Scaling — Replication & Sharding', contentRef: 'backend/phase9/db_scaling.md' },
                        { id: 'system_design_interview', title: 'System Design Interview Walkthroughs', contentRef: 'backend/phase9/system_design_interview.md' },
                    ]
                },
            ]
        },
        {
            id: 'frontend',
            title: 'Frontend Engineering',
            description: 'Build stunning user interfaces and complex client-side applications.',
            icon: 'Monitor',
            supportedLanguages: frontendStacks,
            stackScopedContent: true,
            modules: [
                {
                    id: 'novice',
                    title: 'Novice (The Foundations)',
                    description: 'Understanding HTML, CSS, and basic JavaScript.',
                    topics: [
                        { id: 'html', title: 'Semantic HTML5 & Accessibility', contentRef: 'frontend/novice/html.md' },
                        { id: 'css', title: 'CSS3 Foundations (Flexbox, Grid, Variables)', contentRef: 'frontend/novice/css.md' },
                        { id: 'js_basics', title: 'JavaScript Fundamentals (DOM, Events)', contentRef: 'frontend/novice/js_basics.md' },
                    ]
                },
                {
                    id: 'beginner',
                    title: 'Beginner (Modern UI Frameworks)',
                    description: 'Mastering component-driven development with React.',
                    topics: [
                        { id: 'react_core', title: 'React Core (JSX, Props, State hook)', contentRef: 'frontend/beginner/react_core.md' },
                        { id: 'routing', title: 'Client-side Routing (React Router)', contentRef: 'frontend/beginner/routing.md' },
                        { id: 'styling', title: 'Modern Styling (Tailwind, CSS-in-JS)', contentRef: 'frontend/beginner/styling.md' }
                    ]
                },
                {
                    id: 'intermediate',
                    title: 'Intermediate (Advanced State & Frameworks)',
                    description: 'Handling complex app states and server-side rendering.',
                    topics: [
                        { id: 'advanced_hooks', title: 'Advanced React Hooks (useReducer, useMemo)', contentRef: 'frontend/intermediate/advanced_hooks.md' },
                        { id: 'state_management', title: 'Global State (Redux Toolkit, Zustand)', contentRef: 'frontend/intermediate/state_management.md' },
                        { id: 'nextjs', title: 'Full-stack React with Next.js (SSR, SSG)', contentRef: 'frontend/intermediate/nextjs.md' }
                    ]
                },
                {
                    id: 'advanced',
                    title: 'Advanced (Performance & Architecture)',
                    description: 'Optimizing rendering and building scalable frontends.',
                    topics: [
                        { id: 'performance', title: 'Web Vitals & Performance Optimization', contentRef: 'frontend/advanced/performance.md' },
                        { id: 'testing', title: 'Testing (Jest, React Testing Library, Cypress)', contentRef: 'frontend/advanced/testing.md' },
                        { id: 'microfrontends', title: 'Micro-frontend Architectures', contentRef: 'frontend/advanced/microfrontends.md' }
                    ]
                },
                {
                    id: 'expert',
                    title: 'Expert (Browser Internals & Graphics)',
                    description: 'Deep diving into rendering engines and WebGL.',
                    topics: [
                        { id: 'browser_engine', title: 'How Browsers Work (Event Loop, Render Pipeline)', contentRef: 'frontend/expert/browser_engine.md' },
                        { id: 'webgl', title: '3D Graphics (WebGL, Three.js)', contentRef: 'frontend/expert/webgl.md' },
                        { id: 'wasm', title: 'WebAssembly (Bringing Rust/C++ to the Web)', contentRef: 'frontend/expert/wasm.md' }
                    ]
                }
            ]
        },
        {
            id: 'mobile',
            title: 'Mobile App Development',
            description: 'Create native and cross-platform applications for iOS and Android.',
            icon: 'Smartphone',
            supportedLanguages: mobileStacks,
            stackScopedContent: true,
            modules: [
                {
                    id: 'novice',
                    title: 'Novice (Mobile Paradigms)',
                    description: 'Introduction to mobile ecosystems and UI guidelines.',
                    topics: [
                        { id: 'mobile_os', title: 'iOS vs Android Ecosystems', contentRef: 'mobile/novice/mobile_os.md' },
                        { id: 'mobile_ui', title: 'Mobile UI/UX Design Principles', contentRef: 'mobile/novice/mobile_ui.md' }
                    ]
                },
                {
                    id: 'beginner',
                    title: 'Beginner (Cross-Platform)',
                    description: 'Building apps for both platforms simultaneously.',
                    topics: [
                        { id: 'react_native', title: 'Introduction to React Native', contentRef: 'mobile/beginner/react_native.md' },
                        { id: 'flutter', title: 'Introduction to Flutter & Dart', contentRef: 'mobile/beginner/flutter.md' }
                    ]
                },
                {
                    id: 'intermediate',
                    title: 'Intermediate (Native Device Features)',
                    description: 'Accessing hardware APIs securely.',
                    topics: [
                        { id: 'camera_gps', title: 'Accessing Camera and Geolocation', contentRef: 'mobile/intermediate/camera_gps.md' },
                        { id: 'storage', title: 'Offline Storage (SQLite, AsyncStorage)', contentRef: 'mobile/intermediate/storage.md' },
                        { id: 'push', title: 'Push Notifications Integration', contentRef: 'mobile/intermediate/push.md' }
                    ]
                },
                {
                    id: 'advanced',
                    title: 'Advanced (Native Modules)',
                    description: 'Bridging JavaScript/Dart to native Swift/Kotlin code.',
                    topics: [
                        { id: 'bridging', title: 'Writing Native Bridge Modules', contentRef: 'mobile/advanced/bridging.md' },
                        { id: 'animations', title: 'Fluid 60FPS Mobile Animations', contentRef: 'mobile/advanced/animations.md' }
                    ]
                },
                {
                    id: 'expert',
                    title: 'Expert (Publishing & At-Scale)',
                    description: 'App store deployment and performance profiling.',
                    topics: [
                        { id: 'profiling', title: 'Memory Profiling and Leak Detection', contentRef: 'mobile/expert/profiling.md' },
                        { id: 'ci_cd', title: 'Mobile CI/CD (Fastlane, Bitrise)', contentRef: 'mobile/expert/ci_cd.md' },
                        { id: 'app_store', title: 'App Store & Play Store Publishing Strategies', contentRef: 'mobile/expert/app_store.md' }
                    ]
                }
            ]
        },
        {
            id: 'data-science',
            title: 'Data Science & AI',
            description: 'Extract insights from data and build intelligent machine learning models.',
            icon: 'Database',
            supportedLanguages: dataScienceStacks,
            stackScopedContent: true,
            modules: [
                {
                    id: 'novice',
                    title: 'Novice (Data Foundations)',
                    description: 'Python basics and mathematical foundations for data.',
                    topics: [
                        { id: 'python', title: 'Python Basics for Data Science', contentRef: 'data-science/novice/python.md' },
                        { id: 'math', title: 'Linear Algebra & Statistics', contentRef: 'data-science/novice/math.md' }
                    ]
                },
                {
                    id: 'beginner',
                    title: 'Beginner (Data Manipulation)',
                    description: 'Crucial tools for handling and visualizing data.',
                    topics: [
                        { id: 'pandas_numpy', title: 'Pandas & NumPy', contentRef: 'data-science/beginner/pandas_numpy.md' },
                        { id: 'dataviz', title: 'Data Visualization (Matplotlib, Seaborn)', contentRef: 'data-science/beginner/dataviz.md' }
                    ]
                },
                {
                    id: 'intermediate',
                    title: 'Intermediate (Machine Learning)',
                    description: 'Classic machine learning algorithms.',
                    topics: [
                        { id: 'sklearn', title: 'Supervised & Unsupervised Learning (Scikit-Learn)', contentRef: 'data-science/intermediate/sklearn.md' },
                        { id: 'sql_analytics', title: 'Advanced SQL for Analytics', contentRef: 'data-science/intermediate/sql_analytics.md' }
                    ]
                },
                {
                    id: 'advanced',
                    title: 'Advanced (Deep Learning)',
                    description: 'Neural networks, NLP, and Computer Vision.',
                    topics: [
                        { id: 'neural_networks', title: 'Deep Learning with PyTorch/TensorFlow', contentRef: 'data-science/advanced/neural_networks.md' },
                        { id: 'nlp', title: 'Natural Language Processing', contentRef: 'data-science/advanced/nlp.md' }
                    ]
                },
                {
                    id: 'expert',
                    title: 'Expert (Generative AI & MLOps)',
                    description: 'Deploying models and Large Language Models.',
                    topics: [
                        { id: 'llms', title: 'Transformers & Large Language Models', contentRef: 'data-science/expert/llms.md' },
                        { id: 'mlops', title: 'MLOps: Deploying Models at Scale', contentRef: 'data-science/expert/mlops.md' }
                    ]
                }
            ]
        },
        {
            id: 'devops',
            title: 'DevOps & Cloud Engineering',
            description: 'Automate deployments, manage cloud infrastructure, and ensure reliability.',
            icon: 'Cloud',
            supportedLanguages: devopsStacks,
            stackScopedContent: true,
            modules: [
                {
                    id: 'novice',
                    title: 'Novice (Linux & Scripting)',
                    description: 'Core OS concepts and automation.',
                    topics: [
                        { id: 'linux', title: 'Linux Fundamentals & Administration', contentRef: 'devops/novice/linux.md' },
                        { id: 'bash', title: 'Bash Scripting for Automation', contentRef: 'devops/novice/bash.md' }
                    ]
                },
                {
                    id: 'beginner',
                    title: 'Beginner (Containers & CI/CD)',
                    description: 'Containerization and basic pipelines.',
                    topics: [
                        { id: 'docker', title: 'Docker Deep Dive', contentRef: 'devops/beginner/docker.md' },
                        { id: 'pipelines', title: 'GitHub Actions & GitLab CI Pipelines', contentRef: 'devops/beginner/pipelines.md' }
                    ]
                },
                {
                    id: 'intermediate',
                    title: 'Intermediate (Infrastructure as Code)',
                    description: 'Managing cloud resources declaratively.',
                    topics: [
                        { id: 'terraform', title: 'Infrastructure as Code with Terraform', contentRef: 'devops/intermediate/terraform.md' },
                        { id: 'aws', title: 'AWS Cloud Provider Deep Dive', contentRef: 'devops/intermediate/aws.md' }
                    ]
                },
                {
                    id: 'advanced',
                    title: 'Advanced (Kubernetes)',
                    description: 'Container orchestration at scale.',
                    topics: [
                        { id: 'k8s_admin', title: 'Kubernetes Administration & Helm', contentRef: 'devops/advanced/k8s_admin.md' },
                        { id: 'observability', title: 'Observability (Prometheus, Grafana, ELK)', contentRef: 'devops/advanced/observability.md' }
                    ]
                },
                {
                    id: 'expert',
                    title: 'Expert (SRE & Reliability)',
                    description: 'Site Reliability Engineering and multi-cloud.',
                    topics: [
                        { id: 'chaos', title: 'Chaos Engineering & Reliability', contentRef: 'devops/expert/chaos.md' },
                        { id: 'sre', title: 'SRE Principles & Golden Signals', contentRef: 'devops/expert/sre.md' }
                    ]
                }
            ]
        },
        {
            id: 'cybersecurity',
            title: 'Cyber Security',
            description: 'Protect systems, discover vulnerabilities, and secure data.',
            icon: 'Shield',
            supportedLanguages: cybersecurityStacks,
            stackScopedContent: true,
            modules: [
                {
                    id: 'novice',
                    title: 'Novice (Security Basics)',
                    description: 'Fundamental concepts of security and networking.',
                    topics: [
                        { id: 'networking', title: 'Networking for Security (OSI, Ports)', contentRef: 'cybersecurity/novice/networking.md' },
                        { id: 'crypto', title: 'Cryptography Fundamentals', contentRef: 'cybersecurity/novice/crypto.md' }
                    ]
                },
                {
                    id: 'beginner',
                    title: 'Beginner (Web Vulnerabilities)',
                    description: 'Understanding how applications are compromised.',
                    topics: [
                        { id: 'owasp', title: 'OWASP Top 10 (SQLi, XSS, CSRF)', contentRef: 'cybersecurity/beginner/owasp.md' },
                        { id: 'burp', title: 'Introduction to Burp Suite', contentRef: 'cybersecurity/beginner/burp.md' }
                    ]
                },
                {
                    id: 'intermediate',
                    title: 'Intermediate (Penetration Testing)',
                    description: 'Hacking systems ethically.',
                    topics: [
                        { id: 'recon', title: 'Reconnaissance and Enumeration', contentRef: 'cybersecurity/intermediate/recon.md' },
                        { id: 'exploitation', title: 'Exploitation and Privilege Escalation', contentRef: 'cybersecurity/intermediate/exploitation.md' }
                    ]
                },
                {
                    id: 'advanced',
                    title: 'Advanced (Defense & Forensics)',
                    description: 'Protecting systems and incident response.',
                    topics: [
                        { id: 'incident_response', title: 'Incident Response Procedures', contentRef: 'cybersecurity/advanced/incident_response.md' },
                        { id: 'forensics', title: 'Digital Forensics Fundamentals', contentRef: 'cybersecurity/advanced/forensics.md' }
                    ]
                },
                {
                    id: 'expert',
                    title: 'Expert (Advanced Topics)',
                    description: 'Reverse engineering and threat hunting.',
                    topics: [
                        { id: 'reverse_engineering', title: 'Malware Analysis & Reverse Engineering', contentRef: 'cybersecurity/expert/reverse_engineering.md' },
                        { id: 'red_teaming', title: 'Red Teaming & Active Directory Abuse', contentRef: 'cybersecurity/expert/red_teaming.md' }
                    ]
                }
            ]
        }
    ]
};
