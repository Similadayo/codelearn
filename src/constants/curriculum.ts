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
            modules: [] // Placholder for expansion
        },
        {
            id: 'mobile',
            title: 'Mobile App Development',
            description: 'Create native and cross-platform applications for iOS and Android.',
            icon: 'Smartphone',
            modules: [] // Placholder for expansion
        }
    ]
};
