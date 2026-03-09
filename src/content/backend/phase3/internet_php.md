# How the Internet Works: DNS, TCP/IP, Packets in PHP

A practical tour through how the Internet delivers data, focused on DNS lookups, TCP/IP basics, and how data travels in packets. This lesson uses PHP to illustrate concepts with runnable code examples, so you can experiment in a PHP CLI or small web app. Understanding these fundamentals helps you diagnose latency, reliability, and security issues in real systems.

## 1. DNS Fundamentals and PHP DNS Functions

DNS translates human-friendly hostnames (e.g., example.com) into IP addresses that machines use to route traffic. This section shows how PHP can query DNS, resolve hostnames, and interpret typical DNS records.

Code: Resolve A records and a plain hostname
```php
<?php
$host = 'example.com';

// Get a simple hostname-to-IP mapping (A/AAAA) using PHP's built-in resolver
$ip = gethostbyname($host);
echo "Resolved with gethostbyname(): {$host} -> {$ip}\n";

// Retrieve DNS A/AAAA records explicitly
$records = dns_get_record($host, DNS_A | DNS_AAAA);

if ($records === false) {
    echo "DNS lookup failed.\n";
    exit(1);
}

foreach ($records as $record) {
    if (isset($record['ip'])) {
        echo "Record IP: {$record['ip']}\n";
    }
    if (isset($record['ipv6'])) {
        echo "Record IPv6: {$record['ipv6']}\n";
    }
}
```

### Line-by-line explanation
- Line 1: Starts a PHP script.
- Line 2: Sets the host we want to resolve.
- Line 5: Uses gethostbyname to resolve the host to an IPv4 address (or the unmodified host if resolution fails). This is a simple, blocking call.
- Line 6: Outputs the result of gethostbyname for quick sanity.
- Line 9: Calls dns_get_record to fetch DNS records for the host, requesting A (IPv4) and AAAA (IPv6) records.
- Line 11: Checks if the DNS query failed and exits with an error message if so.
- Line 14-18: Iterates over the returned DNS records and prints the IP addresses found, handling both IPv4 and IPv6 responses.

Notes:
- DNS resolution is often cached by clients and resolvers, so repeated lookups are fast.
- DNS results can be influenced by DNSSEC, TTL, and resolver policies; consider validating records if you require strict integrity.

## 2. TCP/IP Sockets in PHP: Establishing a Connection

TCP provides a reliable, ordered byte stream. This section shows how to open a TCP connection from PHP to a server, send a request, and read a response—illustrating the core client-side behavior of the Web.

Code: Simple HTTP GET over TCP (using stream_socket_client)
```php
<?php
$host = 'example.com';
$port = 80;
$timeout = 5.0;

// Open a TCP connection to the host:port
$socket = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, $timeout);

if (!$socket) {
    echo "Connection failed: $errstr ($errno)\n";
    exit(1);
}

// Send a minimal HTTP/1.1 request
$request = "GET / HTTP/1.1\r\nHost: {$host}\r\nConnection: close\r\n\r\n";
fwrite($socket, $request);

// Read the response until the socket closes
$response = '';
while (!feof($socket)) {
    $response .= fgets($socket, 4096);
}

fclose($socket);

echo "HTTP Response (first 1k):\n";
echo substr($response, 0, 1024) . "\n";
```

### Line-by-line explanation
- Line 1: PHP opening tag.
- Line 2-4: Define target host, port, and a timeout for the TCP connection.
- Line 7: Attempts to open a non-blocking-ish TCP connection to the host:port using stream_socket_client. The @ suppresses warnings so we can handle errors gracefully.
- Line 9-12: If the connection fails, print the error and exit. $errno and $errstr contain details.
- Line 15: Build a minimal HTTP/1.1 request with a Host header and a close directive to terminate the connection after the response.
- Line 16: Send the request to the server via the socket.
- Line 19-22: Read the server’s response in chunks until the server closes the connection.
- Line 24: Close the socket to release resources.
- Line 26-27: Print a small portion of the response for quick verification.

Notes:
- This demonstrates the TCP handshake indirectly: PHP initiates a connection, data is sent, and a stream is read back. In real systems, HTTP libraries or frameworks (e.g., cURL, Guzzle) abstract these details, but understanding the low-level mechanism helps with debugging latency and reliability issues.
- Always handle timeouts, non-blocking IO, and partial reads in production code.

## 3. Packets, Fragmentation, and Reassembly (Concepts with PHP Simulation)

In real networks, data travels as packets that may be fragmented and arrive out of order. TCP handles ordering and reliability, but understanding the concept helps you reason about performance, MTU, and error handling. This section provides a small PHP simulation of packet fragmentation and reassembly.

Code: Simulated packetization and reassembly
```php
<?php
$payload = "The quick brown fox jumps over the lazy dog. This sentence is used to simulate a payload that would be broken into multiple packets.";

// Simulate fragmentation: split payload into fixed-size chunks (packets)
$chunkSize = 20;
$packets = [];
$packetId = 1;
for ($offset = 0; $offset < strlen($payload); $offset += $chunkSize) {
    $packets[] = [
        'id' => $packetId++,
        'seq' => (int)(($offset) / $chunkSize), // sequence number
        'total' => (int)ceil(strlen($payload) / $chunkSize),
        'data' => substr($payload, $offset, $chunkSize),
    ];
}

// Simulate reordering by shuffling packet order
shuffle($packets);

// Receiver: reorder by sequence and reassemble
usort($packets, function($a, $b) { return $a['seq'] <=> $b['seq']; });

$assembled = '';
foreach ($packets as $pkt) {
    $assembled .= $pkt['data'];
}

echo "Original payload:  {$payload}\n";
echo "Reassembled payload: {$assembled}\n";
```

### Line-by-line explanation
- Line 1: PHP opening tag.
- Line 2: Defines the payload string that we will pretend to send as a stream broken into packets.
- Line 5: Sets a fixed chunk size to simulate packet size.
- Line 6-14: Splits the payload into packet-sized chunks, recording per-packet metadata:
  - id: a unique packet identifier
  - seq: the intended order index (sequence)
  - total: total number of packets
  - data: the actual payload contained in this packet
- Line 17: Shuffles the packets to simulate reordering that can occur in a network.
- Line 20: Reorders the packets by their sequence number to simulate TCP's reassembly. In real TCP, the protocol ensures correct ordering automatically.
- Line 22: Concatenates the data from packets in order to reassemble the original payload.
- Line 24-25: Outputs both the original payload and the reassembled payload to verify correctness.

Notes:
- This is a simplified demonstration of fragmentation and reassembly. Real networks handle many more complexities (loss, retransmission, head-of-line blocking, etc.) via the TCP stack and IP routing.
- For a more realistic look, you could simulate loss, delays, and retransmission, then show correct reassembly with timeout logic.

## 4. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

### Pitfall 1: Not handling DNS resolution errors or using untrusted input
Bad
```php
<?php
$host = $_GET['host'];
$ip = gethostbyname($host);
echo "IP: $ip\n";
```

Good
```php
<?php
$host = $_GET['host'] ?? 'example.com';
$host = filter_var($host, FILTER_SANITIZE_STRING);

$ip = gethostbyname($host);
if ($ip === $host) {
    // gethostbyname returns the input on failure in some environments
    // Prefer dns_get_record to verify actual resolution
    $records = dns_get_record($host, DNS_A | DNS_AAAA);
    if (empty($records)) {
        die("DNS resolution failed for host: {$host}\n");
    }
} else {
    echo "IP: $ip\n";
}
```

### Line-by-line explanation (bad)
- Line 1-3: Reads user input directly and resolves without validation.
- Line 4: Assumes resolution always succeeds; prints the result without checks.

Line-by-line explanation (good)
- Line 1-2: Reads input with a safe fallback and sanitizes it.
- Line 5: Uses gethostbyname; if it returns the input, resolution may have failed in some environments.
- Line 6-12: Performs a more thorough DNS query with dns_get_record; validates results before using them.
- Line 13: Graceful exit if DNS resolution fails.

### Pitfall 2: Blocking IO without timeouts or error handling in sockets
Bad
```php
<?php
$s = fsockopen('example.com', 80);
fwrite($s, "GET / HTTP/1.0\r\nHost: example.com\r\n\r\n");
echo fread($s, 1024);
fclose($s);
```

Good
```php
<?php
$host = 'example.com';
$port = 80;
$timeout = 5.0;

$s = @stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, $timeout);
if (!$s) {
    die("Socket connect failed: $errstr ($errno)\n");
}
$request = "GET / HTTP/1.0\r\nHost: {$host}\r\nConnection: close\r\n\r\n";
fwrite($s, $request);

$response = '';
while (!feof($s)) {
    $response .= fgets($s, 4096);
}
fclose($s);

echo "Response length: " . strlen($response) . "\n";
```

### Line-by-line explanation (bad)
- Line 1-3: Uses blocking IO without timeout or error handling; may hang indefinitely.
- Line 4-5: Writes a request and reads a fixed amount, potentially incomplete.

### Line-by-line explanation (good)
- Line 1-3: Adds explicit timeout and error handling around connection creation.
- Line 6-11: Uses a proper HTTP request with connection close semantics.
- Line 13-20: Reads until end-of-stream, ensuring complete response is captured.
- Line 22: Outputs a simple metric (response length) for visibility.

### Pitfall 3: Trusting DNS results or not validating IPs, TLS
Bad
```php
<?php
$host = $_GET['host'];
$ip = gethostbyname($host);
$s = stream_socket_client("tcp://{$ip}:80", $errno, $errstr, 3);
fwrite($s, "GET / HTTP/1.1\r\nHost: {$host}\r\n\r\n");
```

Good
```php
<?php
$host = $_GET['host'] ?? 'example.com';
$ip = gethostbyname($host);

$hostHeader = htmlspecialchars($host, ENT_QUOTES, 'UTF-8');
$s = @stream_socket_client("tcp://{$ip}:80", $errno, $errstr, 3);
if (!$s) {
    die("Connection failed: $errstr ($errno)\n");
}
$request = "GET / HTTP/1.1\r\nHost: {$hostHeader}\r\nConnection: close\r\n\r\n";
fwrite($s, $request);

$response = '';
while (!feof($s)) {
    $response .= fgets($s, 4096);
}
fclose($s);

echo $response;
```

### Line-by-line explanation (bad)
- Line 1-3: Reads input and connects directly by IP derived from DNS, with no validation or TLS consideration.
- Line 4-5: Sends a raw HTTP request without proper header handling or TLS.

### Line-by-line explanation (good)
- Line 1-3: Reads input safely and sanitizes Host header.
- Line 6-12: Uses a validated IP for the connection; handles connection failure.
- Line 13-17: Constructs an HTTP request with sanitized Host header.
- Lines 19-25: Reads and outputs the full response with proper cleanup.

Why these pitfalls matter:
- Real systems are exposed to malicious inputs and unpredictable networks. Proper validation, timeouts, and error handling protect servers from slowloris-like attacks, crashes, and misrouted traffic. TLS validation and SNI are critical for privacy and integrity in production.

## 5. Why This Matters In Real Systems

- DNS performance and cache behavior directly affect latency. Understanding TTLs helps you design client-side caches and avoid stale data.
- TCP/IP basics underpin almost all networked backends (HTTP, gRPC, message queues). Proper use of sockets and higher-level HTTP clients reduces latency and increases reliability.
- Packet fragmentation awareness helps you reason about MTU, network MTU discovery, and how to size payloads to minimize fragmentation, which can reduce throughput and increase retransmissions.
- In real systems, you typically combine DNS with TLS (HTTPS) to ensure confidentiality and integrity; you also rely on robust error handling, timeouts, retries, backoff strategies, and observability.

Practical PHP considerations:
- Prefer higher-level HTTP clients (e.g., cURL, Guzzle) for production code to automatically handle timeouts, redirects, TLS, and pooling.
- Use dns_get_record with explicit record types if you need specific data beyond a basic A lookup.
- For custom network protocols, build a clear framing protocol and a reassembly strategy (as shown in the fragmentation example) to reason about reliability.

## 6. Study Questions

1) What is the difference between DNS A and AAAA records, and how would you query both in PHP?  
2) How does TCP ensure reliable payload delivery, and how can you reflect that understanding in a simple PHP socket example?  
3) Why is it dangerous to rely on gethostbyname alone for DNS resolution in production, and how can dns_get_record mitigate some risks?  
4) What is fragmentation, and how does MTU influence the number of packets required for a given payload?  
5) What are three common errors when writing socket-based network code in PHP, and how would you mitigate them?

## Exercise

Build a small PHP CLI tool that demonstrates end-to-end a basic “web fetch” using DNS resolution, a TCP connection, and a simple line-based protocol framing for an HTTP-like request. The exercise has three parts:

Part A: Resolve a user-provided domain to an IP (preferably both IPv4 and IPv6 where available) and print the addresses.

Part B: Establish a TCP connection to port 80 of the resolved IPv4 address and issue a simple HTTP/1.0 GET request. Print the response status line if possible and the first 1 KB of the response.

Part C: Implement a tiny packetization demonstration: take the first 512 bytes of the HTTP response, fragment it into 128-byte packets, simulate reordering, and reassemble in the correct order. Print the original 512-byte slice, the fragmented packets, and the reassembled output.

Tips:
- You can implement parts A and B using PHP's stream_socket_client or cURL in a minimal form, but use raw sockets to illustrate TCP mechanics.
- For reliability, include basic error handling and timeouts.
- Comment your code well to explain each step and the reasoning behind it.

Submission notes:
- Provide a single PHP file that completes all three parts when run from the command line with an argument specifying the domain (e.g., php net_lesson.php example.com).
- Include helpful output that shows the DNS results, the TCP connection status, and the packetization result, with clear markers separating parts.

End of lesson.