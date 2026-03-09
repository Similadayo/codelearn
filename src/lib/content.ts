import { backendLanguages, curriculumData, Module, Topic, Track } from '@/constants/curriculum';
import { phase1NodejsContent } from './content-phase1-nodejs';
import { phase2SharedContent } from './content-phase2-shared';
import { phase4NodejsContent } from './content-phase4-nodejs';
import { topicUsesStackVariant } from '@/constants/curriculum';

const contentRegistry: Record<string, string> = {
  ...phase1NodejsContent,
  ...phase2SharedContent,
  ...phase4NodejsContent,

  variables_types_python: `
# Variables, Data Types, and Strings in Python

This lesson should feel like the first serious programming class in a university course. The goal is not to rush. The goal is to understand what each value is, what each line stores, and why Python behaves the way it does.

---

## 1. What Is a Variable?

A **variable** is a name that refers to a value.

When you write:

\`\`\`python
name = "Aisha"
\`\`\`

you are telling Python:

- create or update the name \`name\`
- make it refer to the string value \`"Aisha"\`

So a variable is not the value itself. It is the **name** used to reach the value.

---

## 2. First Examples

\`\`\`python
name = "Aisha"
age = 19
height = 1.72
is_student = True
\`\`\`

### What each line means

1. \`name = "Aisha"\`
   The variable \`name\` stores text, so this is a **string**.

2. \`age = 19\`
   The variable \`age\` stores a whole number, so this is an **integer**.

3. \`height = 1.72\`
   The variable \`height\` stores a decimal number, so this is a **float**.

4. \`is_student = True\`
   The variable \`is_student\` stores either \`True\` or \`False\`, so this is a **boolean**.

Already, a student should be asking:

- which variable stores text?
- which variable stores a number?
- which variable stores a decimal value?
- which variable stores a logical answer?

That habit is important in backend engineering.

---

## 3. Main Python Data Types You Must Know First

### String

A **string** is text.

\`\`\`python
course = "Backend Engineering"
email = "student@example.com"
\`\`\`

### Integer

An **integer** is a whole number.

\`\`\`python
year = 2026
score = 85
\`\`\`

### Float

A **float** is a decimal number.

\`\`\`python
price = 19.99
temperature = 36.5
\`\`\`

### Boolean

A **boolean** is either \`True\` or \`False\`.

\`\`\`python
is_active = True
has_paid = False
\`\`\`

### None

\`None\` means “no value” or “empty value”.

\`\`\`python
middle_name = None
\`\`\`

This is very important in backend work because missing data appears often.

---

## 4. Strings Explained Properly

A string is made of characters.

\`\`\`python
first_name = "Grace"
last_name = "Hopper"
\`\`\`

Both values are strings because they are text inside quotation marks.

### Joining strings

\`\`\`python
first_name = "Grace"
last_name = "Hopper"
full_name = first_name + " " + last_name
print(full_name)
\`\`\`

### What the code does

1. \`first_name = "Grace"\`
   Stores the string \`"Grace"\`.

2. \`last_name = "Hopper"\`
   Stores the string \`"Hopper"\`.

3. \`full_name = first_name + " " + last_name\`
   Python joins the first string, a space, and the second string to form one larger string.

4. \`print(full_name)\`
   Displays the final text.

### Output

\`\`\`text
Grace Hopper
\`\`\`

### f-strings

Python has a cleaner way to build strings:

\`\`\`python
name = "David"
score = 82
message = f"{name} scored {score}"
print(message)
\`\`\`

### Why this is good

An f-string lets you place variables directly inside text. It is easier to read than manually joining many pieces.

---

## 5. Checking Data Types

Python provides the \`type()\` function.

\`\`\`python
print(type("hello"))
print(type(42))
print(type(3.14))
print(type(True))
print(type(None))
\`\`\`

### Meaning of the output

- \`type("hello")\` tells you the value is a string
- \`type(42)\` tells you the value is an integer
- \`type(3.14)\` tells you the value is a float
- \`type(True)\` tells you the value is a boolean
- \`type(None)\` tells you the value is a NoneType

This is useful when debugging code and when checking data from APIs or user input.

---

## 6. Worked Example

\`\`\`python
student_name = "Maya"
score = 82
passed = score >= 50
summary = f"{student_name} scored {score}"

print(summary)
print(passed)
\`\`\`

## 7. Explaining The Code Line By Line

1. \`student_name = "Maya"\`
   This creates a variable called \`student_name\` and stores a string.

2. \`score = 82\`
   This creates a variable called \`score\` and stores an integer.

3. \`passed = score >= 50\`
   Python compares \`score\` to \`50\`.
   Since \`82 >= 50\` is true, the variable \`passed\` stores \`True\`.

4. \`summary = f"{student_name} scored {score}"\`
   This creates a string using an f-string.
   Python inserts the value of \`student_name\` and the value of \`score\` into the sentence.

5. \`print(summary)\`
   This prints the sentence.

6. \`print(passed)\`
   This prints the boolean result.

### Output

\`\`\`text
Maya scored 82
True
\`\`\`

---

## 8. Numeric Strings vs Real Numbers

This is one of the most important beginner ideas.

\`\`\`python
value_a = "5"
value_b = 2
print(value_a + str(value_b))
\`\`\`

Here, \`value_a\` is a string, not a number.

If you want arithmetic, you must convert:

\`\`\`python
value_a = "5"
value_b = 2
total = int(value_a) + value_b
print(total)
\`\`\`

### Why this matters

In backend development, values from forms, environment variables, and query parameters often arrive as strings. Good engineers check and convert them carefully.

---

## 9. A Backend Example

\`\`\`python
port_text = "8000"
port_number = int(port_text)
print(port_number + 1)
\`\`\`

### Explanation

1. \`port_text = "8000"\`
   This stores text, not a number.

2. \`port_number = int(port_text)\`
   The \`int()\` function converts the string into an integer.

3. \`print(port_number + 1)\`
   Now Python performs arithmetic, so the result is \`8001\`.

This is exactly the kind of conversion backend developers do regularly.

---

## 10. Common Mistakes

- thinking \`"5"\` and \`5\` are the same thing
- forgetting that \`True\` and \`False\` begin with capital letters in Python
- treating \`None\` as ordinary text instead of a special empty value
- using a variable without first being clear about its type

---

## 11. What Students Should Be Able To Explain

By the end of this lesson, a student should be able to explain:

- what a variable is
- what a data type is
- the difference between strings, integers, floats, booleans, and \`None\`
- how an f-string works
- why text such as \`"8000"\` must be converted before arithmetic

---

## 12. Exercise

Write a Python file called \`variables.py\` that:

1. stores your name in a string
2. stores your age in an integer
3. stores your height in a float
4. stores whether you are learning backend in a boolean
5. creates an f-string sentence using those variables
6. prints the type of each variable
7. converts the string \`"2500"\` into an integer and adds \`500\`

Then explain each line in plain English.
`,
};

type TopicContext = {
  track: Track;
  module: Module;
  topic: Topic;
};

type FoundationLessonConfig = {
  definition: string;
  whyItMatters: string;
  keyIdeas: string[];
  lineWalkthrough: string[];
  syntaxNotes: (lang: string) => string[];
  mistakes: string[];
  backendUse: string[];
  practice: string[];
};

type TrackGuide = {
  identity: string;
  value: string;
  workflow: string[];
  mistakes: string[];
  miniProject: string;
  metrics: string[];
};

const trackGuides: Record<string, TrackGuide> = {
  backend: {
    identity: 'A backend engineer designs reliable systems that accept input, enforce rules, move data safely, and expose useful behavior through APIs.',
    value: 'In practice this means turning business requirements into endpoints, background jobs, validation rules, data models, and production operations.',
    workflow: [
      'Model the request and response shape before you write code.',
      'Validate every input as early as possible.',
      'Keep business logic separate from transport concerns like HTTP or queues.',
      'Persist only clean, well-structured data.',
      'Measure failures, latency, and throughput before calling the feature done.',
    ],
    mistakes: [
      'Treating framework syntax as understanding. The syntax is the easy part; the design tradeoffs matter more.',
      'Skipping validation because the frontend already checks the form.',
      'Designing for the happy path only and ignoring retries, timeouts, and bad data.',
      'Writing code before naming the resources, state transitions, and invariants.',
    ],
    miniProject: 'Build one small but production-minded service around this topic. Include validation, logging, tests, and one paragraph describing how you would deploy or monitor it.',
    metrics: ['latency', 'error rate', 'throughput', 'data correctness', 'operational simplicity'],
  },
  frontend: {
    identity: 'A frontend engineer translates product intent into clear interfaces, resilient client-side state, and smooth interactions that work on real devices.',
    value: 'The goal is not just to make pages look good. The goal is to make systems understandable, fast, accessible, and easy to change.',
    workflow: [
      'Start from user tasks, not components.',
      'Define data flow before styling details.',
      'Design states for loading, success, empty, and error.',
      'Favor accessibility and keyboard support by default.',
      'Measure rendering cost before optimizing blindly.',
    ],
    mistakes: [
      'Building UI without clear state ownership.',
      'Styling first and semantics later.',
      'Ignoring accessibility until late in the project.',
      'Overusing global state for local component concerns.',
    ],
    miniProject: 'Ship a polished interface for this topic with explicit loading, empty, and failure states, then explain the tradeoffs you made.',
    metrics: ['task completion time', 'web vitals', 'accessibility', 'bundle size', 'maintainability'],
  },
  mobile: {
    identity: 'A mobile engineer builds experiences for constrained devices, varying network quality, touch input, and platform-specific expectations.',
    value: 'Mobile success depends on responsiveness, battery awareness, offline behavior, and confidence when the user is away from perfect connectivity.',
    workflow: [
      'Design for intermittent networks and background interruptions.',
      'Minimize screen friction and unnecessary taps.',
      'Use platform patterns instead of fighting them.',
      'Handle permissions explicitly and respectfully.',
      'Profile startup time, memory use, and animation smoothness.',
    ],
    mistakes: [
      'Porting desktop assumptions directly to mobile flows.',
      'Treating device APIs as always available or always instant.',
      'Ignoring memory pressure and low-end hardware.',
      'Designing touch targets that are visually nice but physically hard to use.',
    ],
    miniProject: 'Prototype a mobile feature around this topic and define what happens on slow networks, denied permissions, and app restarts.',
    metrics: ['startup time', 'crash rate', 'memory use', 'frame stability', 'offline resilience'],
  },
  'data-science': {
    identity: 'A data scientist turns raw information into trustworthy insight, models, and decisions with clear assumptions and measurable error.',
    value: 'Good data work is not magic. It is disciplined problem framing, careful cleaning, sensible baselines, and honest evaluation.',
    workflow: [
      'Clarify the question before choosing a tool.',
      'Inspect and clean the data before modeling.',
      'Build a baseline before chasing sophistication.',
      'Evaluate with metrics tied to the real decision.',
      'Document assumptions, bias, and failure modes.',
    ],
    mistakes: [
      'Jumping to machine learning when SQL or visualization would answer the question.',
      'Training on dirty or leaked data.',
      'Optimizing a metric that does not match the business objective.',
      'Reporting results without confidence intervals or caveats.',
    ],
    miniProject: 'Create a small analysis or model for this topic and explain the data quality issues, assumptions, and limits of your result.',
    metrics: ['data quality', 'precision or recall', 'business impact', 'interpretability', 'reproducibility'],
  },
  devops: {
    identity: 'A DevOps engineer improves the speed and safety with which software moves from laptop to production and stays reliable there.',
    value: 'The discipline combines automation, observability, infrastructure, deployment strategy, and operational calm under failure.',
    workflow: [
      'Standardize the environment before scaling the workflow.',
      'Automate the repetitive path first.',
      'Prefer observable systems over clever but opaque ones.',
      'Design rollbacks before you need them.',
      'Treat incidents as learning loops, not blame sessions.',
    ],
    mistakes: [
      'Adding tools without simplifying the workflow.',
      'Automating an unreliable manual process instead of fixing it.',
      'Shipping infrastructure changes without observability.',
      'Treating production as the first time a system is exercised realistically.',
    ],
    miniProject: 'Automate one operational workflow for this topic and document deploy, rollback, alerting, and recovery steps.',
    metrics: ['deployment frequency', 'change failure rate', 'mean time to recovery', 'infrastructure clarity', 'cost awareness'],
  },
  cybersecurity: {
    identity: 'A security practitioner reduces risk by understanding how systems fail, how attackers think, and how controls should be layered.',
    value: 'Security is not one feature. It is an ongoing practice of hardening, detection, response, and informed tradeoffs.',
    workflow: [
      'Map assets, entry points, and trust boundaries.',
      'Assume misuse, not just intended use.',
      'Layer preventative and detective controls.',
      'Log enough context to investigate incidents later.',
      'Revisit risk as the system changes.',
    ],
    mistakes: [
      'Focusing on single tools instead of attack paths.',
      'Ignoring basic hygiene while chasing advanced threats.',
      'Adding controls that nobody can operate or monitor.',
      'Treating compliance language as equivalent to real security posture.',
    ],
    miniProject: 'Assess a small system through the lens of this topic, propose controls, and explain how you would validate them.',
    metrics: ['attack surface', 'time to detect', 'time to contain', 'control coverage', 'forensic usefulness'],
  },
};

const backendPhaseGoals: Record<string, string[]> = {
  phase1: [
    'Become fluent enough in your language that syntax stops slowing down your thinking.',
    'Understand primitive values, collections, functions, errors, and modular structure.',
    'Learn the runtime habits that make debugging and maintenance easier later.',
  ],
  phase2: [
    'Operate like a professional developer, not just someone who writes code in a file.',
    'Use the terminal, Git, and local tooling confidently.',
    'Build repeatable workflows you can use on any machine or team.',
  ],
  phase3: [
    'Understand the network and protocol layer underneath every API call.',
    'Reason about requests, responses, serialization, caching, and resource design.',
    'Build a strong mental model before adding frameworks and infrastructure.',
  ],
  phase4: [
    'Create HTTP services with clear routes, middleware, validation, and test strategy.',
    'Separate transport concerns from domain logic.',
    'Think in request lifecycle terms: receive, validate, process, persist, respond.',
  ],
  phase5: [
    'Model data deliberately instead of treating the database as a dumping ground.',
    'Use SQL and schema design to preserve correctness and performance.',
    'Know when to reach for relational patterns, indexing, transactions, and NoSQL.',
  ],
  phase6: [
    'Protect identity, sessions, secrets, and authorization decisions.',
    'Recognize common attack paths and design safe defaults.',
    'Connect security choices to concrete implementation details.',
  ],
  phase7: [
    'Add the practical features that make APIs useful in production products.',
    'Work with asynchronous jobs, external services, search, and realtime behavior.',
    'Design interfaces that evolve safely over time.',
  ],
  phase8: [
    'Package, ship, observe, and operate software beyond the laptop.',
    'Treat deployability and observability as part of feature completeness.',
    'Manage config, secrets, and infrastructure with discipline.',
  ],
  phase9: [
    'Reason about scale, failure domains, consistency, and architecture tradeoffs.',
    'Choose system boundaries and communication patterns intentionally.',
    'Move from code-level thinking to system-level design thinking.',
  ],
};

const foundationLessonConfigs: Record<string, FoundationLessonConfig> = {
  variables_types: {
    definition: 'Variables are names that refer to values. Data types describe what kind of values those are, such as text, numbers, booleans, or empty values.',
    whyItMatters: 'Backend code constantly receives values from requests, databases, forms, and environment variables. If a student cannot tell text from numbers or booleans from strings, validation and business logic will fail.',
    keyIdeas: [
      'a variable name is not the same thing as the value it refers to',
      'text such as "5" is different from the number 5',
      'a good engineer asks what type each value has before using it',
    ],
    lineWalkthrough: [
      'The first lines create variables and store values inside them.',
      'One line stores text, another stores a number, and another stores a boolean. Students should identify the type of each value.',
      'The formatted string line combines existing values into readable output.',
      'The print line shows the final result so the student can connect the stored values to visible output.',
    ],
    syntaxNotes: (lang) => [
      `${getLanguageName(lang)} has its own syntax, but the core question is the same: what value is stored in each name?`,
      `Students should distinguish between plain text, numeric values, boolean values, and deliberate empty values in ${getLanguageName(lang)}.`,
    ],
    mistakes: [
      'treating numeric text as if it were already a number',
      'using a value before understanding its type',
      'memorizing syntax without understanding what is being stored',
    ],
    backendUse: [
      'query parameters often arrive as text and must be converted',
      'environment variables are usually strings even when they represent numbers',
      'API validation depends on knowing which types are expected',
    ],
    practice: [
      'create variables for a student name, score, and paid status',
      'print each value and explain its type in plain English',
      'convert a numeric string into a real number and explain why the conversion was necessary',
    ],
  },
  control_flow: {
    definition: 'Control flow is the set of rules that decides which lines run, how many times they run, and under what conditions they stop.',
    whyItMatters: 'Backend systems make decisions constantly: allow or reject a request, continue or stop a loop, retry or fail, authenticate or deny.',
    keyIdeas: [
      'conditions decide whether a block should run',
      'loops repeat work until a stopping rule is reached',
      'good control flow is clear enough that another student can follow the path of execution',
    ],
    lineWalkthrough: [
      'The first line sets up a value that the condition will inspect.',
      'The conditional block compares the value to one or more rules.',
      'Only the branch whose condition is satisfied will execute.',
      'The output lines make the path of execution visible to the student.',
    ],
    syntaxNotes: (lang) => [
      `${getLanguageName(lang)} expresses branching and looping in its own syntax, but the mental model is the same: evaluate a condition, choose a path, then continue execution.`,
      `Students should pay attention to block structure, indentation or braces, and the exact condition being tested.`,
    ],
    mistakes: [
      'writing conditions without understanding what values are being compared',
      'creating loops without a clear stopping condition',
      'reading the syntax but failing to trace which branch actually runs',
    ],
    backendUse: [
      'checking whether a user is authorized',
      'looping through records returned from a database',
      'handling success, validation failure, and server error as separate branches',
    ],
    practice: [
      'write one condition that checks if a score is a pass or fail',
      'write one loop that prints three items from a collection',
      'explain exactly which branch runs for two different inputs',
    ],
  },
  functions: {
    definition: 'A function is a named block of reusable logic. It can receive input, perform work, and return output.',
    whyItMatters: 'Backend systems are too large to write as one long script. Functions break logic into units that can be understood, tested, reused, and maintained.',
    keyIdeas: [
      'a function definition describes what the function can do',
      'parameters are inputs received by the function',
      'a return value is the result sent back by the function',
    ],
    lineWalkthrough: [
      'The function header gives the function a name and defines its inputs.',
      'The body performs a clear operation using those inputs.',
      'The return line sends a result back to the caller.',
      'The final line calls the function so the student can see the result.',
    ],
    syntaxNotes: (lang) => [
      `${getLanguageName(lang)} has its own way to define functions, but students should always identify the name, the parameters, and the returned result.`,
      `The meaning of the function matters more than the punctuation around it.`,
    ],
    mistakes: [
      'calling a function without understanding what arguments it expects',
      'writing a function that does many unrelated jobs',
      'forgetting the difference between printing a value and returning a value',
    ],
    backendUse: [
      'validation functions keep request checks reusable',
      'service functions separate business rules from route handlers',
      'small functions are easier to test and debug',
    ],
    practice: [
      'write a function that receives a name and returns a greeting',
      'write a function that receives two numbers and returns their sum',
      'explain what value the function returns and why',
    ],
  },
  data_structures: {
    definition: 'Data structures are the ways a program organizes and stores values so they can be accessed and manipulated efficiently.',
    whyItMatters: 'Backend applications constantly handle collections of records, configuration maps, JSON payloads, and nested data.',
    keyIdeas: [
      'lists or arrays store ordered collections',
      'objects, dictionaries, maps, or hashes store key-value pairs',
      'good engineers choose the structure that matches the problem',
    ],
    lineWalkthrough: [
      'The first line creates an ordered collection of values.',
      'Another line creates a key-value structure for named fields.',
      'The next lines read data from the collection and from the key-value structure.',
      'The output lines show the student what was retrieved and from where.',
    ],
    syntaxNotes: (lang) => [
      `${getLanguageName(lang)} has different names for these structures, but students should always ask: is this data being accessed by position or by key?`,
      `Students should observe how the language writes collections, keys, and lookups.`,
    ],
    mistakes: [
      'using an ordered collection when named fields would be clearer',
      'forgetting whether access is by index or by key',
      'storing mixed information without a clear structure',
    ],
    backendUse: [
      'JSON request bodies are usually key-value structures',
      'database results may be iterated as ordered collections of records',
      'API responses often combine nested structures',
    ],
    practice: [
      'create a collection of three course names',
      'create a user record with name, email, and active status',
      'read one value by position and one value by key and explain the difference',
    ],
  },
  oop: {
    definition: 'Object-oriented programming organizes code around objects that bundle data and behavior together.',
    whyItMatters: 'Students will encounter classes and objects in frameworks, libraries, and larger application design. Understanding them early prevents confusion later.',
    keyIdeas: [
      'a class is a blueprint',
      'an object is a concrete instance created from that blueprint',
      'methods are functions attached to the object or class',
    ],
    lineWalkthrough: [
      'The class definition introduces a reusable blueprint.',
      'The constructor or initializer sets up the data for each new object.',
      'The method shows behavior that belongs to that object.',
      'The final lines create an object and call the method so the student sees how the design works in practice.',
    ],
    syntaxNotes: (lang) => [
      `${getLanguageName(lang)} expresses classes differently, but students should always identify the blueprint, the created object, and the method call.`,
      `The educational goal is to see how state and behavior are kept together.`,
    ],
    mistakes: [
      'treating classes as magic instead of structured code',
      'confusing the class itself with an object created from it',
      'writing classes before understanding the simpler function-based version of the same idea',
    ],
    backendUse: [
      'framework objects often represent requests, responses, services, or models',
      'classes can bundle state with related behavior',
      'understanding objects helps students read larger codebases',
    ],
    practice: [
      'define a class for a Student or Book',
      'create one object from that class',
      'call one method and explain what data the object already had and what the method did with it',
    ],
  },
  error_handling: {
    definition: 'Error handling is the process of detecting problems, communicating them clearly, and preventing them from crashing the whole program unnecessarily.',
    whyItMatters: 'Backend systems fail in real life: invalid data arrives, files are missing, network calls break, and database operations fail. Students must learn to handle these cases deliberately.',
    keyIdeas: [
      'an error is a signal that something went wrong',
      'good programs separate normal flow from failure flow',
      'error messages should help a human understand what happened',
    ],
    lineWalkthrough: [
      'The code inside the protected block performs an operation that may fail.',
      'The error-handling block catches the failure and decides what to do next.',
      'The output line shows the user or developer what happened in understandable language.',
      'Students should ask which line might fail and how the program responds when it does.',
    ],
    syntaxNotes: (lang) => [
      `${getLanguageName(lang)} has its own syntax for exceptions or error values, but students should always identify the risky operation and the recovery path.`,
      `The important question is not only how to catch the error, but how to explain it clearly.`,
    ],
    mistakes: [
      'ignoring possible failure cases',
      'catching an error without understanding what caused it',
      'returning vague messages that do not help debugging',
    ],
    backendUse: [
      'validation failures should produce clean client-facing errors',
      'database and network failures should be logged with useful context',
      'error handling protects the system from crashing on ordinary bad input',
    ],
    practice: [
      'write one small example that handles a failed conversion or missing value',
      'print or return a clear message explaining the failure',
      'explain which line could fail and why',
    ],
  },
  modules_packages: {
    definition: 'Modules and packages let programs organize code into separate files or units so that logic can be imported and reused.',
    whyItMatters: 'No real backend system lives in one file. Students must learn how code is split, imported, and managed as a project grows.',
    keyIdeas: [
      'a module is a unit of code that can be imported',
      'packages group related modules together',
      'dependency management controls which external code a project uses',
    ],
    lineWalkthrough: [
      'The first line imports or requires code from another module.',
      'The next line uses the imported item inside the current file.',
      'The final line prints or returns the result so the student can see the imported code working.',
      'Students should identify what code came from another file and how it is being used.',
    ],
    syntaxNotes: (lang) => [
      `${getLanguageName(lang)} has its own import system, but students should always identify what is being brought into the file and why.`,
      `The goal is to understand code organization, not just remember the import keyword.`,
    ],
    mistakes: [
      'treating imports as ritual syntax instead of real dependencies',
      'placing unrelated logic in one file instead of organizing modules clearly',
      'using a package without understanding what responsibility it adds to the project',
    ],
    backendUse: [
      'projects are split into routes, services, utilities, and models',
      'external packages provide frameworks, database clients, and tooling',
      'clear module boundaries make testing and maintenance easier',
    ],
    practice: [
      'import one helper from another file or module',
      'call the imported logic and inspect the output',
      'explain what code belonged to the current file and what came from outside',
    ],
  },
};

function getTopicContext(trackId: string, moduleId: string, topicId: string): TopicContext | null {
  const track = curriculumData.tracks.find((entry) => entry.id === trackId);
  if (!track) return null;

  const module = track.modules.find((entry) => entry.id === moduleId);
  if (!module) return null;

  const topic = module.topics.find((entry) => entry.id === topicId);
  if (!topic) return null;

  return { track, module, topic };
}

function slugToWords(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLanguageName(lang?: string): string {
  if (!lang) return 'your chosen backend language';
  return backendLanguages.find((entry) => entry.id === lang)?.name ?? slugToWords(lang);
}

function getLanguageFramework(lang?: string): string {
  if (!lang) return 'your preferred web framework';
  return backendLanguages.find((entry) => entry.id === lang)?.framework ?? 'a production-grade framework';
}

function getTrackLanguageName(track: Track, lang?: string): string {
  if (!lang) return 'your chosen stack';
  return track.supportedLanguages?.find((entry) => entry.id === lang)?.name ?? getLanguageName(lang);
}

function getTrackLanguageFramework(track: Track, lang?: string): string {
  if (!lang) return 'the main tools for your stack';
  return track.supportedLanguages?.find((entry) => entry.id === lang)?.framework ?? getLanguageFramework(lang);
}

function inferTopicConcepts(topic: Topic): string[] {
  const title = topic.title.toLowerCase();
  const concepts = new Set<string>();

  if (title.includes('http')) concepts.add('request-response semantics');
  if (title.includes('rest')) concepts.add('resource-oriented design');
  if (title.includes('json') || title.includes('xml') || title.includes('format')) concepts.add('serialization and parsing');
  if (title.includes('database') || title.includes('sql') || title.includes('orm') || title.includes('query')) concepts.add('data modeling and access patterns');
  if (title.includes('auth') || title.includes('oauth') || title.includes('jwt') || title.includes('password')) concepts.add('identity, trust, and session boundaries');
  if (title.includes('security') || title.includes('https') || title.includes('cors') || title.includes('tls')) concepts.add('attack surface and defensive defaults');
  if (title.includes('docker') || title.includes('cloud') || title.includes('deploy') || title.includes('cicd')) concepts.add('operational packaging and delivery');
  if (title.includes('system design') || title.includes('scaling') || title.includes('replication') || title.includes('queue')) concepts.add('distributed tradeoffs and capacity planning');
  if (title.includes('routing') || title.includes('server') || title.includes('middleware')) concepts.add('request lifecycle composition');
  if (title.includes('test')) concepts.add('verification strategy and regression control');
  if (title.includes('function')) concepts.add('decomposition and reuse');
  if (title.includes('error')) concepts.add('failure handling and observability');
  if (title.includes('terminal') || title.includes('git')) concepts.add('developer workflow discipline');

  if (concepts.size === 0) {
    concepts.add('clear vocabulary');
    concepts.add('repeatable workflow');
    concepts.add('common tradeoffs');
  }

  return Array.from(concepts);
}

function buildCodeFence(langId: string, code: string): string {
  const map: Record<string, string> = {
    nodejs: 'javascript',
    python: 'python',
    go: 'go',
    java: 'java',
    php: 'php',
    ruby: 'ruby',
  };

  return `\n\n\`\`\`${map[langId] ?? 'text'}\n${code.trim()}\n\`\`\``;
}

function buildBackendSnippet(lang: string | undefined, moduleId: string, topic: Topic): string {
  const selectedLang = lang ?? 'nodejs';
  const topicLabel = topic.title;
  const framework = getLanguageFramework(selectedLang);

  const snippets: Record<string, Record<string, string>> = {
    nodejs: {
      phase1: `const lesson = {
  topic: '${topic.id}',
  title: '${topicLabel}',
  skillLevel: 'foundation',
};

function explainLesson(item) {
  return \`\${item.title} teaches backend thinking through repeatable practice.\`;
}

console.log(explainLesson(lesson));`,
      phase4: `import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', topic: '${topic.id}' });
});

app.listen(3000, () => {
  console.log('Server ready with ${framework} patterns in mind');
});`,
      phase5: `import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function listRecords() {
  const result = await pool.query('SELECT id, name FROM records ORDER BY id DESC LIMIT 20');
  return result.rows;
}`,
      phase6: `import jwt from 'jsonwebtoken';

export function issueToken(userId) {
  return jwt.sign({ sub: userId, role: 'student' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
}`,
      phase8: `const config = {
  port: Number(process.env.PORT || 3000),
  env: process.env.NODE_ENV || 'development',
};

console.log({ message: 'Boot configuration loaded', config });`,
    },
    python: {
      phase1: `lesson = {
    'topic': '${topic.id}',
    'title': '${topicLabel}',
    'skill_level': 'foundation',
}


def explain_lesson(item: dict) -> str:
    return f"{item['title']} builds dependable backend habits through repeated practice."


print(explain_lesson(lesson))`,
      phase4: `from fastapi import FastAPI

app = FastAPI()


@app.get('/health')
def health() -> dict:
    return {'status': 'ok', 'topic': '${topic.id}'}
`,
      phase5: `import sqlite3


def list_records() -> list[tuple]:
    connection = sqlite3.connect('app.db')
    cursor = connection.execute('SELECT id, name FROM records ORDER BY id DESC LIMIT 20')
    rows = cursor.fetchall()
    connection.close()
    return rows`,
      phase6: `from datetime import datetime, timedelta
import jwt


def issue_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, 'replace-me', algorithm='HS256')`,
      phase8: `import os

config = {
    'port': int(os.getenv('PORT', '8000')),
    'env': os.getenv('NODE_ENV', 'development'),
}

print({'message': 'Boot configuration loaded', 'config': config})`,
    },
    go: {
      phase1: `package main

import "fmt"

type Lesson struct {
	Topic string
	Title string
}

func main() {
	lesson := Lesson{Topic: "${topic.id}", Title: "${topicLabel}"}
	fmt.Printf("%s builds backend judgment through deliberate practice\\n", lesson.Title)
}`,
      phase4: `package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()
	router.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "ok", "topic": "${topic.id}"})
	})
	router.Run(":8080")
}`,
      phase5: `package repository

import "database/sql"

func ListRecords(db *sql.DB) (*sql.Rows, error) {
	return db.Query("SELECT id, name FROM records ORDER BY id DESC LIMIT 20")
}`,
      phase6: `package auth

import "time"

func TokenExpiry() time.Time {
	return time.Now().Add(time.Hour)
}`,
      phase8: `package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Printf("boot env=%s port=%s\\n", os.Getenv("NODE_ENV"), os.Getenv("PORT"))
}`,
    },
    java: {
      phase1: `public class LessonSummary {
    public static void main(String[] args) {
        String title = "${topicLabel}";
        System.out.println(title + " builds backend judgment through deliberate repetition.");
    }
}`,
      phase4: `@RestController
@RequestMapping("/api")
public class HealthController {
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "topic", "${topic.id}");
    }
}`,
      phase5: `String sql = "SELECT id, name FROM records ORDER BY id DESC LIMIT 20";
PreparedStatement statement = connection.prepareStatement(sql);
ResultSet result = statement.executeQuery();`,
      phase6: `Instant expiresAt = Instant.now().plus(Duration.ofHours(1));
System.out.println("JWT expires at " + expiresAt);`,
      phase8: `String env = System.getenv().getOrDefault("NODE_ENV", "development");
String port = System.getenv().getOrDefault("PORT", "8080");
System.out.printf("boot env=%s port=%s%n", env, port);`,
    },
    php: {
      phase1: `$lesson = [
    'topic' => '${topic.id}',
    'title' => '${topicLabel}',
];

echo $lesson['title'] . " builds dependable backend habits." . PHP_EOL;`,
      phase4: `<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'topic' => '${topic.id}',
    ]);
});`,
      phase5: `$statement = $pdo->prepare('SELECT id, name FROM records ORDER BY id DESC LIMIT 20');
$statement->execute();
$rows = $statement->fetchAll();`,
      phase6: `$expiresAt = (new DateTimeImmutable())->modify('+1 hour');
echo 'JWT expires at ' . $expiresAt->format(DateTimeInterface::ATOM);`,
      phase8: `$env = $_ENV['NODE_ENV'] ?? 'development';
$port = $_ENV['PORT'] ?? '8000';
printf("boot env=%s port=%s\n", $env, $port);`,
    },
    ruby: {
      phase1: `lesson = {
  topic: '${topic.id}',
  title: '${topicLabel}'
}

puts "#{lesson[:title]} builds dependable backend habits through repetition."`,
      phase4: `require 'sinatra'
require 'json'

get '/health' do
  content_type :json
  { status: 'ok', topic: '${topic.id}' }.to_json
end`,
      phase5: `rows = DB.execute('SELECT id, name FROM records ORDER BY id DESC LIMIT 20')
rows.each { |row| puts row.inspect }`,
      phase6: `expires_at = Time.now + 3600
puts "JWT expires at #{expires_at.utc.iso8601}"`,
      phase8: `env = ENV.fetch('NODE_ENV', 'development')
port = ENV.fetch('PORT', '4567')
puts "boot env=#{env} port=#{port}"`,
    },
  };

  const phaseKey = moduleId in (snippets[selectedLang] ?? {})
    ? moduleId
    : moduleId.startsWith('phase')
      ? moduleId
      : 'phase1';
  const code = snippets[selectedLang]?.[phaseKey] ?? snippets.nodejs.phase1;
  return buildCodeFence(selectedLang, code);
}

function buildFoundationExampleCode(topicId: string, lang: string): string {
  const selectedLang = lang || 'nodejs';
  const examples: Record<string, Record<string, string>> = {
    variables_types: {
      nodejs: `const studentName = 'Maya';\nconst score = 82;\nconst passed = score >= 50;\nconst summary = \`${'${studentName}'} scored ${'${score}'}\`;\n\nconsole.log(summary);\nconsole.log(passed);`,
      python: `student_name = "Maya"\nscore = 82\npassed = score >= 50\nsummary = f"{student_name} scored {score}"\n\nprint(summary)\nprint(passed)`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n\tstudentName := "Maya"\n\tscore := 82\n\tpassed := score >= 50\n\tsummary := fmt.Sprintf("%s scored %d", studentName, score)\n\n\tfmt.Println(summary)\n\tfmt.Println(passed)\n}`,
      java: `public class Main {\n    public static void main(String[] args) {\n        String studentName = "Maya";\n        int score = 82;\n        boolean passed = score >= 50;\n        String summary = studentName + " scored " + score;\n\n        System.out.println(summary);\n        System.out.println(passed);\n    }\n}`,
      php: `$studentName = "Maya";\n$score = 82;\n$passed = $score >= 50;\n$summary = \"$studentName scored $score\";\n\necho $summary . PHP_EOL;\necho ($passed ? 'true' : 'false') . PHP_EOL;`,
      ruby: `student_name = "Maya"\nscore = 82\npassed = score >= 50\nsummary = "#{student_name} scored #{score}"\n\nputs summary\nputs passed`,
    },
    control_flow: {
      nodejs: `const score = 72;\n\nif (score >= 70) {\n  console.log('Pass');\n} else {\n  console.log('Fail');\n}`,
      python: `score = 72\n\nif score >= 70:\n    print("Pass")\nelse:\n    print("Fail")`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n\tscore := 72\n\n\tif score >= 70 {\n\t\tfmt.Println("Pass")\n\t} else {\n\t\tfmt.Println("Fail")\n\t}\n}`,
      java: `public class Main {\n    public static void main(String[] args) {\n        int score = 72;\n\n        if (score >= 70) {\n            System.out.println("Pass");\n        } else {\n            System.out.println("Fail");\n        }\n    }\n}`,
      php: `$score = 72;\n\nif ($score >= 70) {\n    echo "Pass";\n} else {\n    echo "Fail";\n}`,
      ruby: `score = 72\n\nif score >= 70\n  puts "Pass"\nelse\n  puts "Fail"\nend`,
    },
    functions: {
      nodejs: `function greetStudent(name) {\n  return \`Hello, ${'${name}'}\`;\n}\n\nconsole.log(greetStudent('Ada'));`,
      python: `def greet_student(name: str) -> str:\n    return f"Hello, {name}"\n\nprint(greet_student("Ada"))`,
      go: `package main\n\nimport "fmt"\n\nfunc greetStudent(name string) string {\n\treturn "Hello, " + name\n}\n\nfunc main() {\n\tfmt.Println(greetStudent("Ada"))\n}`,
      java: `public class Main {\n    static String greetStudent(String name) {\n        return "Hello, " + name;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(greetStudent("Ada"));\n    }\n}`,
      php: `function greetStudent(string $name): string {\n    return "Hello, " . $name;\n}\n\necho greetStudent("Ada");`,
      ruby: `def greet_student(name)\n  "Hello, #{name}"\nend\n\nputs greet_student("Ada")`,
    },
    data_structures: {
      nodejs: `const tracks = ['Backend', 'Frontend', 'DevOps'];\nconst student = { name: 'Lina', level: 'Beginner' };\n\nconsole.log(tracks[0]);\nconsole.log(student.name);`,
      python: `tracks = ["Backend", "Frontend", "DevOps"]\nstudent = {"name": "Lina", "level": "Beginner"}\n\nprint(tracks[0])\nprint(student["name"])`,
      go: `package main\n\nimport "fmt"\n\nfunc main() {\n\ttracks := []string{"Backend", "Frontend", "DevOps"}\n\tstudent := map[string]string{"name": "Lina", "level": "Beginner"}\n\n\tfmt.Println(tracks[0])\n\tfmt.Println(student["name"])\n}`,
      java: `import java.util.List;\nimport java.util.Map;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> tracks = List.of("Backend", "Frontend", "DevOps");\n        Map<String, String> student = Map.of("name", "Lina", "level", "Beginner");\n\n        System.out.println(tracks.get(0));\n        System.out.println(student.get("name"));\n    }\n}`,
      php: `$tracks = ["Backend", "Frontend", "DevOps"];\n$student = ["name" => "Lina", "level" => "Beginner"];\n\necho $tracks[0] . PHP_EOL;\necho $student["name"];`,
      ruby: `tracks = ["Backend", "Frontend", "DevOps"]\nstudent = { name: "Lina", level: "Beginner" }\n\nputs tracks[0]\nputs student[:name]`,
    },
    oop: {
      nodejs: `class Student {\n  constructor(name) {\n    this.name = name;\n  }\n\n  introduce() {\n    return \`I am ${'${this.name}'}\`;\n  }\n}\n\nconst student = new Student('Amara');\nconsole.log(student.introduce());`,
      python: `class Student:\n    def __init__(self, name: str):\n        self.name = name\n\n    def introduce(self) -> str:\n        return f"I am {self.name}"\n\nstudent = Student("Amara")\nprint(student.introduce())`,
      go: `package main\n\nimport "fmt"\n\ntype Student struct {\n\tName string\n}\n\nfunc (s Student) Introduce() string {\n\treturn "I am " + s.Name\n}\n\nfunc main() {\n\tstudent := Student{Name: "Amara"}\n\tfmt.Println(student.Introduce())\n}`,
      java: `class Student {\n    String name;\n\n    Student(String name) {\n        this.name = name;\n    }\n\n    String introduce() {\n        return "I am " + this.name;\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Student student = new Student("Amara");\n        System.out.println(student.introduce());\n    }\n}`,
      php: `class Student {\n    public function __construct(private string $name) {}\n\n    public function introduce(): string {\n        return "I am " . $this->name;\n    }\n}\n\n$student = new Student("Amara");\necho $student->introduce();`,
      ruby: `class Student\n  def initialize(name)\n    @name = name\n  end\n\n  def introduce\n    "I am #{@name}"\n  end\nend\n\nstudent = Student.new("Amara")\nputs student.introduce`,
    },
    error_handling: {
      nodejs: `try {\n  const value = Number('abc');\n\n  if (Number.isNaN(value)) {\n    throw new Error('Conversion failed');\n  }\n\n  console.log(value);\n} catch (error) {\n  console.log(error.message);\n}`,
      python: `try:\n    value = int("abc")\n    print(value)\nexcept ValueError:\n    print("Conversion failed")`,
      go: `package main\n\nimport (\n\t"fmt"\n\t"strconv"\n)\n\nfunc main() {\n\tvalue, err := strconv.Atoi("abc")\n\tif err != nil {\n\t\tfmt.Println("Conversion failed")\n\t\treturn\n\t}\n\tfmt.Println(value)\n}`,
      java: `public class Main {\n    public static void main(String[] args) {\n        try {\n            int value = Integer.parseInt("abc");\n            System.out.println(value);\n        } catch (NumberFormatException error) {\n            System.out.println("Conversion failed");\n        }\n    }\n}`,
      php: `try {\n    if (!is_numeric("abc")) {\n        throw new Exception("Conversion failed");\n    }\n\n    echo (int) "abc";\n} catch (Exception $error) {\n    echo $error->getMessage();\n}`,
      ruby: `begin\n  value = Integer("abc")\n  puts value\nrescue ArgumentError\n  puts "Conversion failed"\nend`,
    },
    modules_packages: {
      nodejs: `import path from 'path';\n\nconst filePath = path.join('courses', 'backend', 'lesson.md');\nconsole.log(filePath);`,
      python: `from pathlib import Path\n\nfile_path = Path("courses") / "backend" / "lesson.md"\nprint(file_path)`,
      go: `package main\n\nimport (\n\t\"fmt\"\n\t\"path/filepath\"\n)\n\nfunc main() {\n\tfilePath := filepath.Join(\"courses\", \"backend\", \"lesson.md\")\n\tfmt.Println(filePath)\n}`,
      java: `import java.nio.file.Path;\n\npublic class Main {\n    public static void main(String[] args) {\n        Path filePath = Path.of("courses", "backend", "lesson.md");\n        System.out.println(filePath);\n    }\n}`,
      php: `$filePath = implode(DIRECTORY_SEPARATOR, ["courses", "backend", "lesson.md"]);\necho $filePath;`,
      ruby: `file_path = File.join("courses", "backend", "lesson.md")\nputs file_path`,
    },
  };

  return examples[topicId]?.[selectedLang] ?? examples.variables_types.nodejs;
}

function buildBackendFoundationLesson(context: TopicContext, lang: string): string | null {
  if (context.track.id !== 'backend' || context.module.id !== 'phase1' || !context.topic.langSpecific) {
    return null;
  }

  const config = foundationLessonConfigs[context.topic.id];
  if (!config) return null;

  const exampleCode = buildCodeFence(lang, buildFoundationExampleCode(context.topic.id, lang));
  const languageName = getLanguageName(lang);

  return [
    `# ${context.topic.title} in ${languageName}`,
    '',
    `> Track: ${context.track.title}`,
    `> Phase: ${context.module.title}`,
    `> Language path: ${languageName}`,
    '',
    '## Step 1: Core Idea',
    config.definition,
    '',
    '## Step 2: Why It Matters',
    config.whyItMatters,
    '',
    '## Step 3: Main Things To Notice',
    ...config.keyIdeas.map((item) => `- ${item}`),
    '',
    '## Step 4: Worked Example',
    'Read the example slowly before typing it. Your first job is to identify what each line stores, checks, or returns.',
    exampleCode,
    '',
    '## Step 5: Explain The Code Line By Line',
    ...config.lineWalkthrough.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Step 6: What To Notice In This Language',
    ...config.syntaxNotes(lang).map((item) => `- ${item}`),
    '',
    '## Step 7: Backend Connection',
    ...config.backendUse.map((item) => `- ${item}`),
    '',
    '## Step 8: Common Mistakes',
    ...config.mistakes.map((item) => `- ${item}`),
    '',
    '## Step 9: Practice',
    ...config.practice.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Step 10: Student Recap',
    `A student should now be able to explain ${context.topic.title.toLowerCase()} in ${languageName} without reading from the screen, describe what each major line in the example does, and connect the lesson to real backend work.`,
  ].join('\n');
}

function buildObjectives(context: TopicContext): string[] {
  const { track, module, topic } = context;
  const guide = trackGuides[track.id];
  const objectiveSeed = inferTopicConcepts(topic);

  const objectives = [
    `Explain ${topic.title.toLowerCase()} in plain language without depending on framework jargon.`,
    `Connect ${topic.title.toLowerCase()} to the wider ${track.title.toLowerCase()} workflow described in ${module.title}.`,
    `Apply the topic in a small practical scenario and evaluate tradeoffs instead of copying syntax.`,
  ];

  if (track.id === 'backend' && module.id.startsWith('phase')) {
    objectives.push(...(backendPhaseGoals[module.id] ?? []).slice(0, 1));
  }

  for (const concept of objectiveSeed.slice(0, 2)) {
    objectives.push(`Recognize how ${concept} affects implementation choices for this lesson.`);
  }

  return objectives.slice(0, 5);
}

function buildDeepDiveParagraphs(context: TopicContext, lang?: string): string[] {
  const { track, module, topic } = context;
  const concepts = inferTopicConcepts(topic);
  const guide = trackGuides[track.id];
  const foundationConfig = track.id === 'backend' && module.id === 'phase1' && topic.langSpecific
    ? foundationLessonConfigs[topic.id]
    : null;

  const paragraphs = [
    foundationConfig
      ? `${topic.title} is a foundation lesson. Students should leave this page able to define the idea, read a simple example, and explain what each important line is doing.`
      : `${topic.title} belongs inside ${module.title}. Study it as a practical tool, not just as a definition. The real question is: what job does this topic perform inside a working system?`,
    `${guide.identity} In this lesson, focus on ${concepts.join(', ')}. Your aim is to understand the idea well enough to explain the code, not just run it.`,
  ];

  if (track.id === 'backend') {
    paragraphs.push(
      foundationConfig
        ? foundationConfig.whyItMatters
        : `For backend work specifically, tie every concept back to the request lifecycle: input arrives, the system validates it, business rules run, data is read or written, and a response is emitted. Even when the lesson is about databases, security, or deployment, that lifecycle remains the anchor.`
    );

    if (topicUsesStackVariant(track, topic)) {
      paragraphs.push(
        `This lesson is stack-specific, so you should compare the universal concept with the implementation style of ${getTrackLanguageName(track, lang)} and the ergonomics of ${getTrackLanguageFramework(track, lang)}. Do not confuse tool convenience with architectural necessity.`
      );
    }
  }

  return paragraphs;
}

function buildWorkflow(context: TopicContext): string[] {
  const { track, topic } = context;
  const guide = trackGuides[track.id];

  return guide.workflow.map((step, index) => `${index + 1}. ${step} Tie that habit directly to ${topic.title.toLowerCase()} while you practice.`);
}

function buildMistakes(context: TopicContext): string[] {
  const { track, topic } = context;
  return trackGuides[track.id].mistakes.map((entry) => `${entry} In this lesson, watch for that pattern while working on ${topic.title.toLowerCase()}.`);
}

function buildDefinitions(context: TopicContext): string[] {
  const { topic, track } = context;
  const concepts = inferTopicConcepts(topic);
  const foundationConfig = track.id === 'backend' && context.module.id === 'phase1' && topic.langSpecific
    ? foundationLessonConfigs[topic.id]
    : null;

  return [
    `**${topic.title}**: ${foundationConfig?.definition ?? 'the central idea studied in this lesson. You should be able to define it in one clear sentence.'}`,
    `**Mental model**: the simple picture you use to reason about the topic before writing code.`,
    `**Practical application**: the way ${topic.title.toLowerCase()} appears in real ${track.title.toLowerCase()} work.`,
    ...concepts.slice(0, 2).map((concept) => `**${slugToWords(concept)}**: one of the main concepts you must connect to this topic.`),
  ];
}

function buildCoreDefinition(context: TopicContext): string {
  const { topic, track, module } = context;
  const foundationConfig = track.id === 'backend' && module.id === 'phase1' && topic.langSpecific
    ? foundationLessonConfigs[topic.id]
    : null;

  if (foundationConfig) {
    return foundationConfig.definition;
  }

  return `${topic.title} is a core concept inside ${track.title.toLowerCase()}. Students should be able to define it simply, explain what job it performs, and recognize where it appears in real code or real systems.`;
}

function buildMentalModel(context: TopicContext): string {
  const { topic } = context;
  const concepts = inferTopicConcepts(topic);

  return `Think of ${topic.title.toLowerCase()} as a practical way to reason about ${concepts.join(', ')}. The goal is not to memorize words. The goal is to picture what changes, what stays the same, and what result the system produces.`;
}

function buildKeyRule(context: TopicContext): string {
  const { topic, track } = context;

  if (track.id === 'backend' && context.module.id === 'phase1' && topic.langSpecific) {
    const config = foundationLessonConfigs[topic.id];
    if (config) {
      return config.keyIdeas[0];
    }
  }

  return `A student must be able to explain ${topic.title.toLowerCase()} using clear cause-and-effect language: what enters, what happens, and what result comes out.`;
}

function buildTrickyExample(context: TopicContext, lang?: string): string {
  const selectedLang = lang ?? 'nodejs';
  const examples: Record<string, Record<string, string>> = {
    nodejs: {
      generic: `const value = 10;\nconst copy = value;\nconst next = value + 5;\n\nconsole.log(copy);\nconsole.log(next);`,
      variables_types: `const x = '5';\nconst y = 2;\n\nconsole.log(x + y);\nconsole.log(Number(x) + y);`,
      control_flow: `const score = 70;\n\nif (score > 70) {\n  console.log('A');\n} else {\n  console.log('Not A');\n}`,
      functions: `function addOne(value) {\n  return value + 1;\n}\n\nconst result = addOne(5);\nconsole.log(result);`,
    },
    python: {
      generic: `value = 10\ncopy = value\nnext_value = value + 5\n\nprint(copy)\nprint(next_value)`,
      variables_types: `x = "5"\ny = 2\n\nprint(x + str(y))\nprint(int(x) + y)`,
      control_flow: `score = 70\n\nif score > 70:\n    print("A")\nelse:\n    print("Not A")`,
      functions: `def add_one(value):\n    return value + 1\n\nresult = add_one(5)\nprint(result)`,
    },
    go: {
      generic: `package main\n\nimport "fmt"\n\nfunc main() {\n\tvalue := 10\n\tcopy := value\n\tnextValue := value + 5\n\n\tfmt.Println(copy)\n\tfmt.Println(nextValue)\n}`,
      variables_types: `package main\n\nimport (\n\t\"fmt\"\n\t\"strconv\"\n)\n\nfunc main() {\n\tx := \"5\"\n\ty := 2\n\tconverted, _ := strconv.Atoi(x)\n\n\tfmt.Println(x + strconv.Itoa(y))\n\tfmt.Println(converted + y)\n}`,
      control_flow: `package main\n\nimport \"fmt\"\n\nfunc main() {\n\tscore := 70\n\n\tif score > 70 {\n\t\tfmt.Println(\"A\")\n\t} else {\n\t\tfmt.Println(\"Not A\")\n\t}\n}`,
      functions: `package main\n\nimport \"fmt\"\n\nfunc addOne(value int) int {\n\treturn value + 1\n}\n\nfunc main() {\n\tresult := addOne(5)\n\tfmt.Println(result)\n}`,
    },
    java: {
      generic: `public class Main {\n    public static void main(String[] args) {\n        int value = 10;\n        int copy = value;\n        int nextValue = value + 5;\n\n        System.out.println(copy);\n        System.out.println(nextValue);\n    }\n}`,
      variables_types: `public class Main {\n    public static void main(String[] args) {\n        String x = "5";\n        int y = 2;\n\n        System.out.println(x + y);\n        System.out.println(Integer.parseInt(x) + y);\n    }\n}`,
      control_flow: `public class Main {\n    public static void main(String[] args) {\n        int score = 70;\n\n        if (score > 70) {\n            System.out.println("A");\n        } else {\n            System.out.println("Not A");\n        }\n    }\n}`,
      functions: `public class Main {\n    static int addOne(int value) {\n        return value + 1;\n    }\n\n    public static void main(String[] args) {\n        int result = addOne(5);\n        System.out.println(result);\n    }\n}`,
    },
    php: {
      generic: `$value = 10;\n$copy = $value;\n$nextValue = $value + 5;\n\necho $copy . PHP_EOL;\necho $nextValue . PHP_EOL;`,
      variables_types: `$x = "5";\n$y = 2;\n\necho $x . $y . PHP_EOL;\necho ((int) $x + $y) . PHP_EOL;`,
      control_flow: `$score = 70;\n\nif ($score > 70) {\n    echo "A";\n} else {\n    echo "Not A";\n}`,
      functions: `function addOne(int $value): int {\n    return $value + 1;\n}\n\n$result = addOne(5);\necho $result;`,
    },
    ruby: {
      generic: `value = 10\ncopy = value\nnext_value = value + 5\n\nputs copy\nputs next_value`,
      variables_types: `x = "5"\ny = 2\n\nputs x + y.to_s\nputs x.to_i + y`,
      control_flow: `score = 70\n\nif score > 70\n  puts "A"\nelse\n  puts "Not A"\nend`,
      functions: `def add_one(value)\n  value + 1\nend\n\nresult = add_one(5)\nputs result`,
    },
  };

  const byLang = examples[selectedLang] ?? examples.nodejs;
  const key = context.topic.id in byLang ? context.topic.id : 'generic';
  return buildCodeFence(selectedLang, byLang[key]);
}

function buildCompareContrast(context: TopicContext): string[] {
  const { topic } = context;
  const id = topic.id;

  if (id === 'variables_types') {
    return [
      'A variable name is not the same thing as the value it refers to.',
      'A string that looks like a number is not the same as an actual number.',
      'A current value is not the same as the past history of that variable.',
    ];
  }

  if (id === 'control_flow') {
    return [
      'A condition decides which path runs.',
      'A loop decides whether the same block runs again.',
      'Branching and repetition are related, but they are not the same operation.',
    ];
  }

  if (id === 'functions') {
    return [
      'A parameter is the variable named in the function definition.',
      'An argument is the actual value passed into the function call.',
      'Printing a value is not the same as returning a value.',
    ];
  }

  if (id === 'data_structures') {
    return [
      'Ordered collections are accessed by position.',
      'Key-value structures are accessed by name or key.',
      'Choosing the wrong structure makes code harder to read and reason about.',
    ];
  }

  return [
    `${topic.title} should be compared with nearby concepts so students do not confuse similar ideas.`,
    'Ask what changes, what remains stable, and what exactly the code is operating on.',
    'Real understanding begins when a student can distinguish related ideas without guessing.',
  ];
}

function buildPracticeQuestions(context: TopicContext): string[] {
  const { topic } = context;

  return [
    `Question 1: What is the most important idea a student must understand about ${topic.title.toLowerCase()}?`,
    `Question 2: In the worked example, what happens first and what happens next?`,
    `Question 3: What output or result should appear, and why?`,
    `Question 4: What would change if one line in the example were modified?`,
  ];
}

function buildUnderstandingCheck(context: TopicContext): string[] {
  const { topic } = context;
  const checklist = buildChecklists(context);

  return [
    `define ${topic.title.toLowerCase()} in simple language`,
    `explain the worked example line by line`,
    `predict what the tricky example does before running it`,
    ...checklist,
  ];
}

function buildCodeWalkthrough(context: TopicContext, lang?: string): string[] {
  const { track, module, topic } = context;
  const foundationConfig = track.id === 'backend' && module.id === 'phase1' && topic.langSpecific
    ? foundationLessonConfigs[topic.id]
    : null;

  if (foundationConfig) {
    return [
      ...foundationConfig.lineWalkthrough.map((item, index) => `${index + 1}. ${item}`),
      ...foundationConfig.syntaxNotes(lang ?? 'nodejs').map((item, index) => `${foundationConfig.lineWalkthrough.length + index + 1}. ${item}`),
    ];
  }

  if (track.id === 'backend' && topic.langSpecific) {
    return [
      `1. Start by reading the example without typing. Identify the input, the processing step, and the output.`,
      `2. Locate the stack-specific syntax for ${getTrackLanguageFramework(track, lang)} and separate it from the universal idea being taught.`,
      `3. Ask what each variable stores, what each function receives, and what each returned value means.`,
      `4. Trace the code line by line: where does the data come from, where is it transformed, and where does the result go?`,
      `5. Rewrite the example in plain English. If you cannot explain it in words, you do not yet fully understand the code.`,
    ];
  }

  return [
    `1. Read the example slowly and identify every new term before trying to memorize the syntax.`,
    `2. For each line, ask what value is created, what rule is applied, and what result is produced.`,
    `3. Connect the code back to ${module.title.toLowerCase()} so the example feels like part of a larger workflow rather than an isolated fragment.`,
    `4. Change one small part of the example and predict the result before you run it.`,
    `5. Explain the example aloud in simple language. If you cannot explain it, you do not yet own it.`,
  ];
}

function buildWorkedExample(context: TopicContext, lang?: string): string {
  const { track, topic } = context;
  const foundationConfig = track.id === 'backend' && context.module.id === 'phase1' && topic.langSpecific
    ? foundationLessonConfigs[topic.id]
    : null;

  if (foundationConfig && lang) {
    return buildCodeFence(lang, buildFoundationExampleCode(topic.id, lang));
  }

  if (track.id === 'backend' && topic.langSpecific) {
    return buildBackendSnippet(lang, context.module.id, topic);
  }

  if (track.id === 'backend') {
    return buildCodeFence('nodejs', `const lesson = {
  topic: '${topic.id}',
  title: '${topic.title}',
};

function describeLesson(item) {
  return \`We are studying \${item.title} in backend engineering.\`;
}

console.log(describeLesson(lesson));`);
  }

  if (track.id === 'frontend') {
    return buildCodeFence('nodejs', `const state = {
  topic: '${topic.id}',
  loaded: true,
};

function renderStatus(currentState) {
  return currentState.loaded ? 'Ready to render' : 'Loading...';
}

console.log(renderStatus(state));`);
  }

  if (track.id === 'data-science') {
    return buildCodeFence('python', `records = [12, 15, 18, 20]
average = sum(records) / len(records)
print(average)`);
  }

  return buildCodeFence('nodejs', `const topic = '${topic.title}';
console.log(\`Studying: \${topic}\`);`);
}

function buildWorkedExampleExplanation(context: TopicContext, lang?: string): string[] {
  const { track, topic } = context;
  const foundationConfig = track.id === 'backend' && context.module.id === 'phase1' && topic.langSpecific
    ? foundationLessonConfigs[topic.id]
    : null;

  if (foundationConfig) {
    return foundationConfig.lineWalkthrough;
  }

  if (track.id === 'backend' && topic.langSpecific) {
    return [
      `The first lines set up the basic structure needed by ${getLanguageFramework(lang)}. Students should identify imports, setup, and the point where the framework starts listening for requests.`,
      `The route or handler section shows where input enters the program. This is where you should ask: what data comes in, what assumptions are being made, and what response is returned?`,
      `The final lines usually start the app or expose the function. That part matters because it tells you where execution begins and how the example becomes a running service.`,
    ];
  }

  return [
    `The first line creates data and gives it a name. Students should ask what value is stored and why that value matters.`,
    `The function line introduces behavior. It tells the program what to do with the value it receives.`,
    `The final line runs the code so you can observe the result. Always connect output back to the earlier lines and explain why that output appeared.`,
  ];
}

function buildRealWorldScenario(context: TopicContext): string {
  const { track, module, topic } = context;

  if (track.id === 'backend') {
    return `Imagine a small product team building a production feature around ${topic.title.toLowerCase()}. The backend engineer must fit this lesson into the wider request lifecycle described in ${module.title}: receive data, validate it, process it safely, persist what matters, and return a predictable result.`;
  }

  if (track.id === 'frontend') {
    return `Imagine shipping a user-facing interface where ${topic.title.toLowerCase()} directly affects what the user sees, how quickly the page reacts, and whether the UI remains understandable under loading, error, and success states.`;
  }

  if (track.id === 'mobile') {
    return `Imagine implementing ${topic.title.toLowerCase()} in a mobile product where screens are small, networks are unreliable, and every interaction must feel clear with touch input and intermittent connectivity.`;
  }

  if (track.id === 'data-science') {
    return `Imagine answering a real business question using ${topic.title.toLowerCase()}. The student must understand not only the tool, but also what assumptions the data or model is making and what counts as trustworthy evidence.`;
  }

  if (track.id === 'devops') {
    return `Imagine an engineering team trying to deploy, observe, or recover a system. ${topic.title} matters because the workflow must be repeatable, visible, and safe under pressure.`;
  }

  return `Imagine assessing a real system where ${topic.title.toLowerCase()} changes the risk profile. The student must understand what can go wrong, how to detect it, and how to reduce exposure responsibly.`;
}

function buildStudentDifficultyNotes(context: TopicContext): string[] {
  const { track, topic } = context;
  const foundationConfig = track.id === 'backend' && context.module.id === 'phase1' && topic.langSpecific
    ? foundationLessonConfigs[topic.id]
    : null;

  if (foundationConfig) {
    return foundationConfig.mistakes;
  }

  return [
    `Students often memorize words from ${topic.title.toLowerCase()} before they understand how those words affect real decisions.`,
    `Another common difficulty is seeing a working example without being able to explain why it works.`,
    `A good checkpoint is this: can you teach the example to another student in plain language without reading the page?`,
  ];
}

function buildChecklists(context: TopicContext): string[] {
  const { track, module, topic } = context;
  const guide = trackGuides[track.id];

  return [
    `I can summarize ${topic.title.toLowerCase()} in two or three sentences without reading notes.`,
    `I know where ${topic.title.toLowerCase()} fits inside ${module.title.toLowerCase()}.`,
    `I can describe at least one tradeoff, one failure mode, and one practical use case.`,
    `I can sketch how success would be measured using ${guide.metrics.slice(0, 3).join(', ')}.`,
  ];
}

function buildPractice(context: TopicContext, lang?: string): string[] {
  const { track, module, topic } = context;
  const guide = trackGuides[track.id];

  const tasks = [
    `Write a short explanation of ${topic.title.toLowerCase()} for a junior teammate who has only completed the previous lesson in ${module.title}.`,
    `Create a small artifact that proves understanding: code, schema, diagram, deployment plan, experiment notebook, or design memo depending on the track.`,
    `List three edge cases or failure modes and explain how you would detect or handle them.`,
    guide.miniProject,
  ];

  if (topicUsesStackVariant(track, topic)) {
    tasks.splice(1, 0, `Implement a small example in ${getTrackLanguageName(track, lang)} and then rewrite the explanation in stack-agnostic terms.`);
  }

  return tasks;
}

function buildSubmissionBrief(context: TopicContext, lang?: string): string {
  const { track, module, topic } = context;

  return [
    `Submit work for ${topic.title} as if you were handing it to a reviewer. Include a short summary, the main artifact, and a reflection on one tradeoff.`,
    `If the topic is code-heavy, include runnable code, setup notes, and at least one test or verification step. If the topic is conceptual, include a structured explanation, diagram, or comparison table.`,
    `Reference ${module.title} and explain how this lesson prepares you for the next step in ${track.title}.`,
    topicUsesStackVariant(track, topic) ? `Because this lesson is stack-specific, name the chosen stack clearly: ${getTrackLanguageName(track, lang)} with ${getTrackLanguageFramework(track, lang)}.` : `Keep the explanation technology-aware but centered on principles, not only syntax.`,
  ].join(' ');
}

function buildGeneratedLesson(context: TopicContext, lang?: string): string {
  const { track, module, topic } = context;
  const paragraphs = buildDeepDiveParagraphs(context, lang);
  const practice = buildPractice(context, lang);
  const coreDefinition = buildCoreDefinition(context);
  const mentalModel = buildMentalModel(context);
  const keyRule = buildKeyRule(context);
  const codeWalkthrough = buildCodeWalkthrough(context, lang);
  const workedExampleExplanation = buildWorkedExampleExplanation(context, lang);
  const studentDifficultyNotes = buildStudentDifficultyNotes(context);
  const workedExample = buildWorkedExample(context, lang);
  const trickyExample = buildTrickyExample(context, lang);
  const compareContrast = buildCompareContrast(context);
  const practiceQuestions = buildPracticeQuestions(context);
  const understandingCheck = buildUnderstandingCheck(context);
  const mistake = studentDifficultyNotes[0] ?? `Students often struggle with ${topic.title.toLowerCase()} when they try to memorize terms without tracing the code.`;
  const extraNotes = [
    ...studentDifficultyNotes.slice(1),
    ...buildMistakes(context).slice(0, 2),
  ];
  const recap = [
    `In simple terms, ${topic.title.toLowerCase()} is something a student should be able to explain without reading the screen.`,
    `The student should be able to read the small example, explain what each line does, and predict what changes in the tricky example.`,
    `This topic prepares the student for later work in ${module.title} and in the wider ${track.title} track.`,
  ];

  return [
    `# ${topic.title}`,
    '',
    `> Track: ${track.title}`,
    `> Module: ${module.title}`,
    topicUsesStackVariant(track, topic) ? `> Stack path: ${getTrackLanguageName(track, lang)} using ${getTrackLanguageFramework(track, lang)}` : null,
    '',
    '## Why This Topic Matters',
    paragraphs[0],
    '',
    paragraphs[1],
    '',
    '## Core Definition',
    coreDefinition,
    '',
    '## Mental Model',
    mentalModel,
    '',
    '## Basic Example',
    `Start with this small example. Read it before trying to change it.`,
    '',
    workedExample,
    '',
    '## Step-by-Step Execution',
    ...workedExampleExplanation.map((entry, index) => `${index + 1}. ${entry}`),
    '',
    '## Key Rule',
    `Rule: ${keyRule}`,
    '',
    '## Common Mistake',
    mistake,
    '',
    '## Confusing Example or Edge Case',
    `Now look at a slightly trickier example. This is where shallow understanding usually breaks.`,
    '',
    trickyExample,
    '',
    '## Compare and Contrast',
    ...compareContrast.map((entry) => `- ${entry}`),
    '',
    '## Why This Matters in Real Programming',
    buildRealWorldScenario(context),
    '',
    '## Practice Questions',
    ...practiceQuestions.map((entry) => `${entry}\n`),
    '',
    '## Coding Exercise',
    `Try a small exercise that focuses on this concept only.`,
    '',
    ...practice.slice(0, 3).map((entry, index) => `${index + 1}. ${entry}`),
    '',
    '## Understanding Check',
    `By the end of this topic, the student should be able to:`,
    ...understandingCheck.map((entry) => `- ${entry}`),
    '',
    '## Quick Recap',
    ...recap.map((entry) => `- ${entry}`),
    '',
    '## Extra Notes',
    ...codeWalkthrough.slice(0, 3).map((entry) => `- ${entry}`),
    ...extraNotes.map((entry) => `- ${entry}`),
    '',
    buildSubmissionBrief(context, lang),
  ]
    .filter(Boolean)
    .join('\n');
}

export function getMockContent(trackId: string, moduleId: string, topicId: string, lang?: string): string {
  const context = getTopicContext(trackId, moduleId, topicId);

  if (lang) {
    const langKey = `${topicId}_${lang}`;
    if (contentRegistry[langKey]) return contentRegistry[langKey];
  }

  if (contentRegistry[topicId]) {
    return contentRegistry[topicId];
  }

  const trackTopicKey = `${trackId}_${topicId}`;
  if (contentRegistry[trackTopicKey]) {
    return contentRegistry[trackTopicKey];
  }

  if (!context) {
    const title = slugToWords(topicId);
    return `# ${title}\n\nThis lesson could not be resolved from the curriculum map. Check the route parameters or curriculum definitions.`;
  }

  return buildGeneratedLesson(context, lang);
}

