export function getMockContent(trackId: string, moduleId: string, topicId: string): string {
  // Deeply detailed mock content to fulfill the "very very detailed" requirement.
  const title = topicId.charAt(0).toUpperCase() + topicId.slice(1);
  return `
# ${title} In-Depth Guide

Welcome to the comprehensive guide on **${title}**. In this module, we will explore the intricate details that differentiate a novice from an expert.

## 1. Core Principles

Understanding the underlying mechanics is crucial. When dealing with \`${topicId}\`, the primary architecture relies on robust design patterns. 

> [!TIP]
> Always verify your inputs before processing them through the main pipeline. 

### Advanced Concept Breakdown

Here is a typical code structure you will encounter:

\`\`\`javascript
async function handle${title}(request) {
  try {
    const data = await parse(request);
    // Complex business logic goes here
    const result = await processData(data, {
      optimize: true,
      scale: 'horizontal' // Vital for high availability
    });
    return Object.freeze(result);
  } catch (error) {
    logger.error('Critical failure in pipeline', error);
    throw new ServiceException(error);
  }
}
\`\`\`

## 2. Real-World Application

In modern architectures, you must account for failure states. If a dependency goes down, how does your \`${topicId}\` service gracefully degrade rather than crashing the entire monolith? 

### The Exercise

To pass this topic, you must implement a robust fallback mechanism for the function described above.

**Task:** Write a node.js script that wraps the \`handle${title}\` function in a Circuit Breaker pattern. If the function fails 3 times consecutively, it should immediately return a cached response for the next 30 seconds before retrying the actual service.
`;
}
