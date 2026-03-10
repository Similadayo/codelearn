# Chaos Engineering & Reliability in AWS — Phase 5: SRE & Reliability

Chaos Engineering is the disciplined practice of introducing controlled, measurable failures into a system to reveal weaknesses in architecture, automation, and operations. In the AWS ecosystem, this means using fault injection tools, copy-safe blast radii, and strong observability to learn how services behave under stress without compromising production customers. This lesson covers the concepts, practical AWS tooling (notably AWS Fault Injection Simulator and CloudWatch), and concrete patterns you can apply to build more reliable systems.

## 1. Chaos Engineering Fundamentals in AWS

This section introduces the core ideas you’ll apply in AWS: blast radius, safety rails, repeatable experiments, and measurable outcomes. We’ll start with a concrete Chaos Engineering template you can use to inject faults into tagged EC2 instances.

Code block: Example Chaos Template (AWS FIS)
```
{
  "description": "Chaos experiment: stop a subset of EC2 instances tagged for chaos",
  "targets": {
    "TargetInstances": {
      "resourceType": "aws:ec2:instance",
      "selectionMode": "ALL",
      "filters": [
        { "path": "tag:Chaos", "values": ["enabled"] },
        { "path": "instance-state-name", "values": ["running"] }
      ]
    }
  },
  "actions": {
    "StopInstances": {
      "actionId": "aws:ec2:stop-instances",
      "targets": { "Instances": "TargetInstances" },
      "parameters": {
        "stopMax": "2",
        "stopDelay": "PT5M"  // pause before stopping the next one
      }
    }
  },
  "stopConditions": [
    { "source": "action", "selector": "$.actions.StopInstances.response.stopCount", "value": "2" }
  ],
  "logConfiguration": {
    "cloudWatchLogsConfiguration": {
      "logGroupArn": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/fis/chaos-log-group",
      "logStreamName": "chaos-experiment"
    }
  },
  "roleArn": "arn:aws:iam::123456789012:role/AWSFISRole"
}
```

Explanation note: This template targets EC2 instances that are tagged Chaos=enabled and currently running. It stops up to 2 instances, with a 5-minute gap between stops, and records logs to CloudWatch. The role ARN must have permissions for FIS actions and CloudWatch logging.

### Line-by-line explanation
- { "description": ... }: Documents the purpose and scope of the experiment for operators and reviewers.
- "targets": { "TargetInstances": { ... } }: Defines the resource scope. The name TargetInstances is an alias used by actions to reference this target.
- "resourceType": "aws:ec2:instance": Specifies EC2 instance resources.
- "selectionMode": "ALL": Apply the action to all filtered instances. Alternative: SPECIFIC for a curated list.
- "filters": [ ... ]: Narrows the target to instances with Chaos=enabled and that are currently running.
- "actions": { "StopInstances": { ... } }: Declares a fault to inject. The actionId maps to a built-in AWS FIS action that stops instances.
- "targets": { "Instances": "TargetInstances" }: Connects the action to the defined target set.
- "parameters": { "stopMax": "2", "stopDelay": "PT5M" }: Controls the fault specifics (max 2 stops, 5-minute pacing). Parameter names depend on the action; consult AWS docs for exact keys.
- "stopConditions": [ ... ]: Optional guard that stops the experiment when the stop condition is met (e.g., the action reports 2 stops have occurred).
- "logConfiguration": { "cloudWatchLogsConfiguration": { ... } }: Enable logging of experiment events to a CloudWatch log group.
- "roleArn": "...AWSFISRole": The IAM role enabling FIS to perform actions; must have least-privilege permissions for the targeted resources and logging.

Note: The exact parameter keys and schema depend on AWS FIS version. Always validate against the latest AWS FIS docs or use the AWS CLI with --cli-input-json to derive the precise schema for your region.

## 2. The AWS Fault Injection Simulator (FIS) — core concepts

The AWS Fault Injection Simulator (FIS) provides an API and CLI to run controlled chaos experiments. Key concepts:

- Targets: The resources under test (e.g., EC2 instances, ECS tasks, RDS clusters) selected by type and optional filters.
- Actions: The fault you inject (e.g., stop instances, inject latency, terminate tasks).
- Stop conditions: Preconditions to halt the experiment early if results meet criteria.
- Safety rails: Tags, IAM roles, and blast radius controls to prevent widespread impact.
- Logging and observability: Tying experiments to CloudWatch Logs and metrics for post-analysis.

Code block: Minimal CLI flow to create and run an FIS experiment template
```
# Create a template (assumes template.json exists with the structure shown above)
aws fis create-experiment-template --cli-input-json file://template.json --region us-east-1

# Start the experiment using the created template (replace <template-id> with the real ID)
aws fis start-experiment --experiment-template-id <template-id> --region us-east-1
```

### Line-by-line explanation
- aws fis create-experiment-template --cli-input-json file://template.json: Creates a reusable experiment template from a JSON file describing targets, actions, and stop conditions.
- --region us-east-1: Specifies the AWS region for the operation.
- aws fis start-experiment --experiment-template-id <template-id>: Launches an instance of the experiment defined by the template. The template ID is returned by the create step.
- --region us-east-1: Region for the start-experiment call. Regions must match where the resources reside and the template was created.

Notes:
- You can tag and select resources to constrain the blast radius, such as using Chaos=enabled on test environments only.
- You can control the pace and extent of faults via parameters in the actions (e.g., stopMax, latency, etc.) and stopConditions.

## 3. Designing Safe Chaos Experiments for AWS

Safety rails and disciplined scoping are essential to prevent outages. In practice:
- Scope to non-prod environments or limited production canaries.
- Use tags to automatically filter targets.
- Combine chaos with feature flags and graceful degradation (timeouts, circuit breakers).
- Instrument experiments with observability to decide when to abort or rollback.

Code block: Tag-based scoping and a lightweight guardrail
```
# Apply a chaos tag only in test environments
aws ec2 create-tags --resources i-0123456789abcdef0 --tags Key=Chaos,Value=enabled

# Create a CloudWatch alarm to detect cascading failures (example guardrail)
aws cloudwatch put-metric-alarm \
  --alarm-name Chaos-Guardrail-Errors \
  --metric-name Errors \
  --namespace MyApp/ChaosGuardrails \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ChaosAlerts
```

### Line-by-line explanation
- aws ec2 create-tags --resources i-0123456789abcdef0 --tags Key=Chaos,Value=enabled: Tags a resource so it becomes eligible for chaos experiments. Scope is controlled by using multiple resources or environment-specific tags.
- aws cloudwatch put-metric-alarm ...: Creates a CloudWatch alarm to catch abnormal error rates during chaos, enabling automatic notification or rollback triggers.
- --alarm-name/--metric-name/--namespace/--statistic/--period/--evaluation-periods/--threshold/--comparison-operator: Define the condition that constitutes an undesirable state.
- --alarm-actions arn:aws:sns:...: On alarm, send a notification to a specified SNS topic for alerting on-call engineers.

Notes:
- Pair chaos experiments with feature flags to gracefully degrade and isolate failures.
- Use an explicit rollback action or an automatic recovery path in your stopConditions or in the alarm’s action.

## 4. Observability and SRE Metrics for Chaos

Observability is how you learn from chaos. Key practices:
- Define Service Level Objectives (SLOs) and align Chaos experiments to test those SLOs.
- Instrument SLIs (e.g., latency, error rate, saturation) and collect data in CloudWatch or a centralized metrics store.
- Use logs and traces to understand root cause and impact.

Code block: Python snippet to publish custom Chaos metrics to CloudWatch using Boto3
```
import boto3
import time
import random

cloudwatch = boto3.client('cloudwatch', region_name='us-east-1')

def report_latency(lat_ms):
    cloudwatch.put_metric_data(
        Namespace='MyApp/Chaos',
        MetricData=[
            {
                'MetricName': 'ChaosLatencyMs',
                'Value': lat_ms,
                'Unit': 'Milliseconds'
            },
        ]
    )

# Simulated chaos-test pulse
for _ in range(10):
    latency = random.uniform(50, 600)
    report_latency(latency)
    time.sleep(2)
```

### Line-by-line explanation
- import boto3, time, random: Bring in AWS SDK for CloudWatch calls and timing randomness for a test loop.
- cloudwatch = boto3.client('cloudwatch', region_name='us-east-1'): Create a CloudWatch client in a specific region.
- def report_latency(lat_ms): Define a helper to publish a single data point.
- cloudwatch.put_metric_data(... Namespace='MyApp/Chaos', MetricName='ChaosLatencyMs', Value=lat_ms, Unit='Milliseconds'): Pushes the latency measurement to CloudWatch so you can plot it against SLO targets.
- for _ in range(10): Loop to generate a short stream of data points.
- latency = random.uniform(50, 600): Simulate latency values within a plausible range for demonstration.
- time.sleep(2): Pacing the data points to resemble real-time traffic.

Notes:
- Use this alongside alarms and dashboards to observe how the service behaves during injected chaos.
- You can also push other metrics (error rate, request count, saturation) in a similar manner.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: No blast radius control
  Bad:
  ```
  # Chaos that touches everything
  aws fis start-experiment --template-id tpl-xyz
  ```
  Good:
  ```
  # Target only test environment resources using tags
  aws fis start-experiment --experiment-template-id tpl-xyz --tags Key=Environment,Value=chaos-test
  ```
- Pitfall 2: No observability or rollback plan
  Bad:
  ```
  # Inject fault without monitoring
  # No metrics or alarms
  ```
  Good:
  ```
  # Inject fault with CloudWatch metrics and an automatic rollback condition
  # CloudWatch alarm set, and stopCondition triggers rollback
  ```
- Pitfall 3: Skipping safety rails and approvals
  Bad:
  ```
  # Push chaos to prod without change control
  ```
  Good:
  ```
  # Require change-management approval and an explicit blast radius audit
  # Use canary deployments and a pre-approval gate
  ```
- Pitfall 4: Hard-coding resource identifiers
  Bad:
  ```
  # Directly reference i-0abc12345 in code
  aws ec2 stop-instances --instance-ids i-0abc12345
  ```
  Good:
  ```
  # Use tags and service discovery to select instances at runtime
  # Example: Stop instances with tag Chaos=enabled in a given Auto Scaling Group
  ```
- Pitfall 5: Ignoring post-incident learning
  Bad:
  ```
  # Chaos performed, but no analysis
  ```
  Good:
  ```
  # Run a post-mortem, capture metrics, and adjust SLOs/architecture
  # Document learnings and update chaos plans
  ```

## Y. Why This Matters In Real Systems — production context and real usage

Chaos Engineering in AWS helps you:
- Validate resilience budgets (error budgets) by proactively uncovering fragility before customers are affected.
- Build confidence in auto-scaling, self-healing, and disaster recovery procedures.
- Improve incident response through proactive drills that test runbooks, alerting, and automation.
- Keep blast radii low by tagging and scoping experiments, and by connecting chaos to canary deployments and gradual rollouts.

In real systems, you’ll typically:
- Align chaos tests with SRE initiatives and SLO dashboards.
- Use FIS for controlled fault injection, CloudWatch for monitoring, and SNS/Slack for alerting.
- Maintain a living set of chaos experiments with versioned templates and runbooks.

## Z. Study Questions — 5 recall questions

1) What is the primary purpose of blast radius in Chaos Engineering?
2) Name three core AWS components used to observe chaos experiments.
3) How do stop conditions help prevent runaway chaos experiments?
4) What is the role of tagging in safe chaos experiments?
5) Describe how you would roll back a chaos fault if it caused unexpected service degradation.

## Exercise

Part A — Setup and baseline
- Task 1: In a controlled AWS environment (e.g., a non-prod VPC), tag a small set of EC2 instances with Chaos=enabled.
- Task 2: Create a basic FIS experiment template (like the one in Section 1) that stops up to 1–2 instances with a 5-minute pacing.

Part B — Run and observe
- Task 3: Start the experiment using AWS FIS CLI and verify that logs appear in the CloudWatch Logs group you configured.
- Task 4: Create a CloudWatch alarm that triggers if ChaosLatencyMs or Errors exceed a threshold during the experiment.

Part C — Analyze and learn
- Task 5: Collect latency metrics during and after the experiment, and write a short post-mortem detailing:
  - What failed or degraded
  - How the system recovered
  - What improvements should be made (e.g., canaries, circuit breakers, autoscaling tuning)

Part D — Extend (bonus)
- Task 6: Extend the experiment to simulate a network partition or latency spike using an AWS FIS action (or a Chaos Toolkit plan if you prefer). Ensure you add a stricter safety stop condition and an automatic rollback path.

Deliverables:
- A JSON file named chaos-template.json describing the FIS experiment.
- A single-line summary of findings and suggested improvements.
- A CloudWatch alarm configuration snippet (CLI or CloudFormation) to guard the system during chaos runs.

Note: Always perform chaos experiments first in non-prod or canary-flagged resources, with explicit approvals and clear rollback steps. Use observability data to validate that your system remains within acceptable error budgets and latency targets.