# SRE Principles & Golden Signals in AWS

SRE (Site Reliability Engineering) is about building and operating scalable, reliable systems. The Golden Signals—latency, traffic, errors, and saturation—are the four key metrics that help engineers understand system health in real time. In an AWS context, you rely on CloudWatch, Application Load Balancers, API Gateway, Lambda, EC2, and custom metrics to quantify these signals, set SLOs, and automate alerting and incident response. This lesson teaches how to implement, observe, and act on the Golden Signals in AWS, with concrete code examples and production-oriented guidance.

## 1. The Golden Signals and AWS Mapping

The Golden Signals are the core observables that tell you how well your system is performing. In AWS, you typically map them to native metrics from AWS services and to custom CloudWatch metrics where needed.

- Latency: time taken to service a request (e.g., ALB latency, API Gateway latency, Lambda duration)
- Traffic: amount of demand (e.g., requests per second, data transfer)
- Errors: failure rate (e.g., 4xx/5xx errors, exception counts)
- Saturation: how "full" resources are (e.g., CPUUtilization, memory pressure, queue depth)

Code block: Create a CloudWatch Dashboard showing the four signals (latency, traffic, errors, saturation) and push a custom metric for Errors. This example uses ALB latency and request count, plus a custom Errors metric and EC2 CPUUtilization as saturation.

```bash
cat > dashboard.json <<'JSON'
{
  "widgets": [
    {
      "type": "metric",
      "x": 0, "y": 0, "width": 6, "height": 3,
      "properties": {
        "title": "ALB Latency",
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/ApplicationELB", "Latency", "LoadBalancer", "app-lb", { "stat": "Average" } ]
        ]
      }
    },
    {
      "type": "metric",
      "x": 6, "y": 0, "width": 6, "height": 3,
      "properties": {
        "title": "Requests per Second",
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app-lb", { "stat": "Sum" } ]
        ]
      }
    },
    {
      "type": "metric",
      "x": 0, "y": 3, "width": 6, "height": 3,
      "properties": {
        "title": "Errors (Custom metric)",
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "Company/SRE", "Errors", "ServiceName", "web-service" ]
        ]
      }
    },
    {
      "type": "metric",
      "x": 6, "y": 3, "width": 6, "height": 3,
      "properties": {
        "title": "CPU Utilization",
        "view": "timeSeries",
        "stacked": false,
        "metrics": [
          [ "AWS/EC2", "CPUUtilization", "InstanceId", "i-0abcdef12345" ]
        ]
      }
    }
  ]
}
JSON
aws cloudwatch put-dashboard --dashboard-name GoldenSignalsDash --dashboard-body file://dashboard.json
```

### Line-by-line explanation
- cat > dashboard.json <<'JSON' starts creating a file with the dashboard payload.
- The JSON defines a dashboard with four widgets (latency, traffic, errors, saturation).
- Each widget is a time-series metric block pointing to a specific CloudWatch metric or custom metric.
- "Latency" uses AWS/ApplicationELB Latency with a per-load-balancer dimension.
- "RequestCount" tracks total requests for the load balancer.
- "Errors" is a custom metric in namespace "Company/SRE" with a dimension for the service.
- "CPUUtilization" captures EC2 saturation for a specific instance.
- aws cloudwatch put-dashboard uploads the dashboard under the name GoldenSignalsDash.
- The file://dashboard.json syntax reads the JSON payload from disk.

Code block: Publish a custom Errors metric using Python and boto3

```python
import boto3
import datetime

def publish_error_count(service_name: str, count: int, region_name: str = 'us-east-1',
                        namespace: str = 'Company/SRE'):
    client = boto3.client('cloudwatch', region_name=region_name)
    timestamp = datetime.datetime.utcnow()

    client.put_metric_data(
        Namespace=namespace,
        MetricData=[{
            'MetricName': 'Errors',
            'Timestamp': timestamp,
            'Value': int(count),
            'Unit': 'Count',
            'Dimensions': [
                {'Name': 'ServiceName', 'Value': service_name}
            ]
        }]
    )

if __name__ == '__main__':
    publish_error_count('web-service', 5)
```

### Line-by-line explanation
- import boto3 and datetime: bring in the AWS SDK and time utilities.
- def publish_error_count(...): define a function to publish a metric.
- client = boto3.client('cloudwatch', region_name=region_name): create a CloudWatch client for the specified region.
- timestamp = datetime.datetime.utcnow(): capture current time for the metric datapoint.
- client.put_metric_data(...): call CloudWatch to publish a single data point.
  - Namespace: 'Company/SRE' groups related metrics.
  - MetricData: a list with one metric:
    - MetricName: 'Errors'
    - Timestamp: time of datapoint
    - Value: error count
    - Unit: 'Count'
    - Dimensions: {'ServiceName': service_name} to filter/segregate by service
- if __name__ == '__main__': entry point to run the script.
- publish_error_count('web-service', 5): example invocation.

## 2. Instrumentation, Telemetry, and Alerting in AWS

Instrumenting with CloudWatch and AWS services lets you produce reliable signals, create alerts, and automate responses. The following examples show how to create alarms via CloudFormation and how to query logs for latency insights.

Code block: CloudFormation YAML snippet to create a latency alarm and an SNS topic for notifications

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  GoldenSignalsTopic:
    Type: AWS::SNS::Topic
    Properties:
      DisplayName: GoldenSignalsAlerts

  LatencyAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmDescription: "High latency on ALB app-lb"
      Namespace: AWS/ApplicationELB
      MetricName: Latency
      Dimensions:
        - Name: LoadBalancer
          Value: app-lb
      Statistic: Average
      Period: 60
      EvaluationPeriods: 3
      Threshold: 200
      ComparisonOperator: GreaterThanThreshold
      AlarmActions:
        - !Ref GoldenSignalsTopic
      TreatMissingData: notBreaching
```

### Line-by-line explanation
- Resources: define AWS resources for this template.
- GoldenSignalsTopic: create an SNS topic to receive alerts.
- LatencyAlarm: create a CloudWatch alarm for the ALB Latency metric.
- Namespace, MetricName, Dimensions: identify the exact metric to monitor (ALB Latency for LoadBalancer app-lb).
- Period: check every 60 seconds; EvaluationPeriods: require 3 consecutive checks to trigger.
- Threshold & ComparisonOperator: alarm when average latency exceeds 200 ms.
- AlarmActions: send notifications to the SNS topic.
- TreatMissingData: defines handling when data is missing (notBreaching in this case).

Code block: AWS CloudWatch Logs Insights query to derive p95 latency from logs

```bash
# Example: derive p95 latency from application logs stored in a Log Group
aws logs start-query \
  --log-group-name "/aws/lambda/my-service" \
  --start-time 1700000000 \
  --end-time 1700003600 \
  --query-string 'fields @timestamp, @message
  | filter @message like /latency/
  | parse @message "* latency=*ms" as latency
  | stats p95(latency) as p95_latency by bin(300s)
  | sort by bin(0)'
```

### Line-by-line explanation
- aws logs start-query: initiate a Logs Insights query.
- --log-group-name: the log group to search (e.g., your service logs).
- --start-time / --end-time: time window for the analysis (epoch seconds).
- --query-string: the Logs Insights query language:
  - parse and extract a latency field from log lines that contain a latency value.
  - stats p95(latency) by 5-minute bins to observe tail latency over time.
  - sort by the time bin to produce a chronological view.
- You would later poll GetQueryResults to retrieve the results and visualize them (not shown here).

Code block: AWS CDK TypeScript snippet to define a latency alarm and SNS action (production-oriented)

```ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Duration } from 'aws-cdk-lib';

export class GoldenSignalsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Notification topic
    const topic = new sns.Topic(this, 'GoldenSignalsTopic', {
      displayName: 'GoldenSignalsAlerts'
    });
    // Optional: add a subscriber
    // topic.addSubscription(new subs.EmailSubscription('oncall@example.com'));

    // Latency alarm for ALB
    const latencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'Latency',
      dimensionsMap: { LoadBalancer: 'app-lb' },
      period: Duration.minutes(1),
      statistic: 'Average'
    });

    const latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
      metric: latencyMetric,
      threshold: 200,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD
    });

    latencyAlarm.addAlarmAction(new actions.SnsAction(topic));

    // Optional: attach a contact method
    // topic.addSubscription(new subs.EmailSubscription('oncall@example.com'));
  }
}
```

### Line-by-line explanation
- Imports bring in CDK libraries for CloudWatch, SNS, and actions.
- The CosmicStack constructor creates CDK resources in a stack.
- The topic is created to receive alerts (GoldenSignalsTopic).
- latencyMetric defines the ALB latency metric, with LoadBalancer dimension app-lb and 1-minute period.
- latencyAlarm creates a CloudWatch alarm on the latency metric with a 200 ms threshold and 3 evaluation periods.
- latencyAlarm.addAlarmAction links the alarm to the SNS topic so on-call staff can be notified.
- Optional email subscription demonstrates how on-call can receive alerts directly.

## 3. SRE Practices: SLOs, Error Budgets, and On-Call

SRE uses SLOs (Service Level Objectives) and error budgets to balance innovation and reliability. The Golden Signals feed these calculations: if latency or error budgets are breached or a top-N incident occurs, you engage incident response and postmortems.

- Define SLOs with measurable targets (e.g., 99.9% latency <= 200 ms in a 30-day window)
- Compute error budgets as the allowed error percentage over the timeframe (e.g., 0.1% of requests may fail)
- Tie alerts to SLO health (e.g., alert when the error budget is 70% exhausted)
- Build runbooks and blameless postmortems for learning

Code block: Minimal JSON/YAML-inspired policy outline for SLO-based alerting (conceptual)

```yaml
SLOs:
  - name: "API latency"
    target: 0.999  # 99.9% of requests under 200 ms
    window: 30d
  - name: "Error rate"
    target: 0.001  # <= 0.1% errors
    window: 30d

Alerts:
  - metric: "Latency p95"
    when: "p95 > 200ms"
    severity: "high"
    action: "on-call"
  - metric: "ErrorRate"
    when: "error_rate > 0.001"
    severity: "critical"
    action: "on-call"
```

### Line-by-line explanation
- SLOs: define high-level reliability targets with a time window.
- Each SLO links to a measurable metric (latency, error rate).
- Alerts: specify what triggers a notification and what action to take.
- This policy structure helps scale reliability decisions with clear thresholds.

## 4. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

1) Mistake: Using average latency to set SLOs/alarms
- Bad:
```python
latencies = [120, 180, 220, 260, 190]
avg = sum(latencies) / len(latencies)
if avg > 200:
    alert()
```
- Good:
```python
import numpy as np
p95_latency = np.percentile(latencies, 95)
if p95_latency > 200:
    alert()
```

2) Mistake: Alarm on raw error counts instead of error rate
- Bad:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name HighErrors \
  --metric-name Errors \
  --namespace Company/SRE \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3
```
- Good:
```bash
# First, publish a derived error-rate metric:
# Errors and Requests should be emitted as CloudWatch metrics (Errors, Requests)
# Alarm on ratio
aws cloudwatch put-metric-alarm \
  --alarm-name HighErrorRate \
  --metric-name ErrorRate \
  --namespace Company/SRE \
  --threshold 0.01 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3
```

3) Mistake: Not scoping alarms with dimensions
- Bad:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name LatencyBasic \
  --metric-name Latency \
  --namespace AWS/ApplicationELB
```
- Good:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name LatencyAppLB \
  --metric-name Latency \
  --namespace AWS/ApplicationELB \
  --dimensions Name=LoadBalancer,Value=app-lb \
  --statistic Average \
  --period 60 \
  --threshold 200 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3
```

4) Mistake: Ignoring regional/account boundaries
- Bad: Deploying a single alarm to multiple regions without clarity
- Good: Create region-scoped alarms and dashboards, or use a centralized cross-region aggregation pattern (e.g., CloudWatch cross-region dashboards and a single SNS for on-call)

5) Mistake: No runbooks or postmortems
- Bad: Alarms fire, on-call responds ad-hoc; no structured incident response
- Good: Wire alarms to runbooks, create blameless postmortems, and track action items in a project or issue tracker

## 5. Why This Matters In Real Systems

- Reliability at scale: Golden Signals give teams a focused, objective view of health that scales with the system as it grows.
- Proactive operations: SLOs and error budgets guide product teams to balance feature velocity with reliability—avoiding "reliability debt" from rushed deployments.
- Incident readiness: Alerts tied to clear runbooks and on-call handoffs reduce MTTR (mean time to repair) and improve customer trust.
- Observability as code: Treat dashboards, alarms, and runbooks as infrastructure code so changes are auditable, repeatable, and reviewable.
- Real-world impact: In production, you will use CloudWatch, ALB, API Gateway, Lambda, EC2, and custom metrics to validate that latency, traffic, errors, and saturation stay within your SLOs, and you’ll automate responses to reduce toil.

## 6. Study Questions

1) What are the four Golden Signals and how do you map each to an AWS service metric?
2) Why is p95 latency generally preferred over average latency for SRE alarms?
3) How do you publish a custom CloudWatch metric using boto3? Provide a short example.
4) How do you define a CloudWatch alarm that only triggers when a specific Load Balancer’s Latency exceeds a threshold?
5) Why are SLOs and error budgets important for balancing feature velocity and reliability?

## 7. Exercise

Part A: Implement a basic observability pipeline
- Goal: Publish a custom Errors metric and visualize it alongside ALB Latency and RequestCount.

Part A steps:
1) Implement a Python script (as shown) to publish Errors with a ServiceName dimension (use a mock service name if needed).
2) Create a CloudWatch dashboard (as shown) that includes:
   - ALB Latency (Average)
   - ALB RequestCount (Sum)
   - Custom Errors metric (Errors)
   - EC2 CPUUtilization (for a given InstanceId)

Part B: Alerting and runbooks
1) Create a CloudFormation snippet (or CDK) that defines:
   - An ALB Latency alarm for LoadBalancer app-lb with threshold 200 ms and 3 evaluation periods
   - An SNS topic for alerts
   - Optional: Email subscription to the on-call contact
2) Write a short incident runbook (YAML-friendly) covering:
   - When an alarm triggers
   - Steps to diagnose (check CloudWatch logs, verify downstream dependencies)
   - Immediate remediation actions (scale up, reroute traffic, contact dependent teams)
   - Post-incident steps (document root cause, update runbook, schedule postmortem)

Part C: Logs Insights query
- Create a Logs Insights query to extract p95 latency by 5-minute bins and explain how to run it against your log group.

Part D: Short reflection
- Write a one-page blameless postmortem template for an incident caused by elevated latency and/or errors, including sections for symptoms, timeline, root cause, corrective actions, and preventive measures.

Note: For the exercises, adapt resource names to your AWS account and environment. The code blocks provided above are minimal, executable scaffolding that you can run in a safe test or staging account. Always adhere to your organization's security policies when deploying alarms, dashboards, or runbooks.