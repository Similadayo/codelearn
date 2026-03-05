export interface Topic {
    id: string;
    title: string;
    contentRef: string;
}

export interface Module {
    id: string;
    title: string;
    description: string;
    topics: Topic[];
}

export interface Track {
    id: string;
    title: string;
    description: string;
    icon: string;
    modules: Module[];
}

export interface CurriculumData {
    tracks: Track[];
}

export const curriculumData: CurriculumData = {
    tracks: [
        {
            id: 'backend',
            title: 'Backend Engineering',
            description: 'Master server-side development from initial request to highly available distributed systems.',
            icon: 'Server',
            modules: [
                {
                    id: 'novice',
                    title: 'Novice (The Foundations)',
                    description: 'Understanding the core concepts of the internet and basic programming.',
                    topics: [
                        { id: 'internet', title: 'How the Internet Works (HTTP, DNS, TCP/IP)', contentRef: 'backend/novice/internet.md' },
                        { id: 'cli', title: 'The Command Line Interface (CLI)', contentRef: 'backend/novice/cli.md' },
                        { id: 'programming', title: 'Introduction to Programming (Flow control, Variables)', contentRef: 'backend/novice/programming.md' },
                    ]
                },
                {
                    id: 'beginner',
                    title: 'Beginner (Building the First Application)',
                    description: 'Creating your first web servers and connecting to databases.',
                    topics: [
                        { id: 'servers', title: 'Introduction to Web Servers (Express, FastAPI)', contentRef: 'backend/beginner/servers.md' },
                        { id: 'rest_apis', title: 'APIs and RESTful Principles', contentRef: 'backend/beginner/rest_apis.md' },
                        { id: 'sql', title: 'Relational Databases (PostgreSQL) and Basic SQL', contentRef: 'backend/beginner/sql.md' },
                        { id: 'git', title: 'Version Control (Git & GitHub)', contentRef: 'backend/beginner/git.md' }
                    ]
                },
                {
                    id: 'intermediate',
                    title: 'Intermediate (Production Ready)',
                    description: 'Securing, testing, and deploying robust applications.',
                    topics: [
                        { id: 'auth', title: 'Authentication & Authorization (JWT, OAuth)', contentRef: 'backend/intermediate/auth.md' },
                        { id: 'orms', title: 'Object-Relational Mapping (ORMs)', contentRef: 'backend/intermediate/orms.md' },
                        { id: 'docker', title: 'Containerization (Docker)', contentRef: 'backend/intermediate/docker.md' },
                        { id: 'cicd', title: 'Continuous Integration & Deployment (CI/CD)', contentRef: 'backend/intermediate/cicd.md' }
                    ]
                },
                {
                    id: 'advanced',
                    title: 'Advanced (Scaling Up)',
                    description: 'Architecting for scale and performance.',
                    topics: [
                        { id: 'microservices', title: 'Microservices Architecture vs Monoliths', contentRef: 'backend/advanced/microservices.md' },
                        { id: 'message_queues', title: 'Message Queues (RabbitMQ/Kafka)', contentRef: 'backend/advanced/message_queues.md' },
                        { id: 'graphql', title: 'GraphQL & WebSockets for Real-time', contentRef: 'backend/advanced/graphql.md' }
                    ]
                },
                {
                    id: 'expert',
                    title: 'Expert (Architectural Mastery)',
                    description: 'Designing highly available systems and cloud-native patterns.',
                    topics: [
                        { id: 'system_design', title: 'System Design for High Availability and Scalability', contentRef: 'backend/expert/system_design.md' },
                        { id: 'k8s', title: 'Container Orchestration (Kubernetes)', contentRef: 'backend/expert/k8s.md' },
                        { id: 'distributed', title: 'Distributed Systems Protocols (Consensus, Vector Clocks)', contentRef: 'backend/expert/distributed.md' }
                    ]
                }
            ]
        },
        {
            id: 'frontend',
            title: 'Frontend Engineering',
            description: 'Build stunning user interfaces and complex client-side applications.',
            icon: 'Monitor',
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
