# How the Internet Works (DNS, TCP/IP, Packets) - Ruby Edition

The Internet is a layered system of protocols and services that lets applications reach remote hosts, fetch resources, and communicate reliably. Understanding DNS, TCP/IP, and packets helps you reason about latency, reliability, security, and performance in real systems. In this Ruby-focused lesson, you’ll see concrete code examples that illuminate how these concepts come alive in real programs.

## 1. DNS: The Naming System and How to Query It with Ruby

Understanding DNS is foundational: humans use domain names, machines use IP addresses. DNS translates names to addresses, enabling you to connect to services without memorizing numeric IPs. In real systems, applications rely on DNS resolution behind the scenes, and operators tune DNS behavior for caching, latency, and failover.

Code: Build and send a DNS A-record query over UDP to 8.8.8.8 and print basic response metadata.

```ruby
require 'socket'

# Build a minimal DNS query for an A record (type 1) of the given domain.
def build_dns_query(domain)
  txid = rand(0..0xffff)      # Identifier for the query
  flags = 0x0100                # Standard query with recursion desired
  qdcount = 1                   # One question
  ancount = 0                   # No answers yet (query)
  nscount = 0
  arcount = 0

  header = [txid, flags, qdcount, ancount, nscount, arcount].pack('n6')

  # QNAME: domain broken into labels with length-prefix, ending with 0
  qname = domain.split('.').map { |label| [label.length].pack('C') + label }.join
  qtype = [1].pack('n')          # Type A
  qclass = [1].pack('n')         # Class IN

  header + qname + "\0" + qtype + qclass
end

# Send the DNS query over UDP to a DNS server (default: Google's 8.8.8.8)
def dns_query(domain, server = '8.8.8.8')
  socket = UDPSocket.new
  socket.connect(server, 53)
  query = build_dns_query(domain)
  socket.send(query, 0)

  # DNS responses are typically <= 512 bytes for UDP
  response = socket.recv(512)
  socket.close

  # Basic parsing: DNS header is 12 bytes
  id, flags, qdcount, ancount, nscount, arcount = response[0, 12].unpack('n6')
  puts "DNS response for #{domain}"
  puts "  Transaction ID: #{id}"
  puts "  Flags: 0x#{flags.to_s(16)}"
  puts "  Questions: #{qdcount}, Answers: #{ancount}, Authority: #{nscount}, Additional: #{arcount}"

  # Move the offset past the header (12 bytes) and through the question section
  offset = 12
  # Skip QNAME (domain label sequence ending with 0)
  loop do
    len = response.getbyte(offset)
    offset += 1
    break if len == 0
    offset += len
  end
  # Skip QTYPE(2) and QCLASS(2)
  offset += 4

  # If there are answers, you’d parse RR records here (omitted for brevity)
  if ancount > 0
    puts "  (First answer present; full RR parsing omitted in this example.)"
  end
  response
end

# Example usage
dns_query('example.com')
```

### Line-by-line explanation
- require 'socket': Load the networking library needed for UDP sockets.
- def build_dns_query(domain): Define a helper to construct a DNS query message.
- txid = rand(0..0xffff): Create a random 16-bit transaction ID for matching responses.
- flags = 0x0100: Standard query with recursion desired bit set.
- qdcount = 1, ancount = 0, nscount = 0, arcount = 0: Set header fields for one question and no answers yet.
- header = [txid, flags, qdcount, ancount, nscount, arcount].pack('n6'): Pack the header as six 16-bit big-endian numbers.
- qname = domain.split('.').map { |label| [label.length].pack('C') + label }.join: Build the domain in DNS label format (length-prefixed labels).
- qtype = [1].pack('n'), qclass = [1].pack('n'): Pack the QTYPE (A) and QCLASS (IN) as 16-bit numbers.
- header + qname + "\0" + qtype + qclass: Assemble the full DNS query payload.
- def dns_query(domain, server = '8.8.8.8'): Define a function to send the query to a DNS server.
- socket = UDPSocket.new; socket.connect(server, 53): Open a UDP socket and prepare to talk to port 53.
- socket.send(query, 0): Transmit the DNS query.
- response = socket.recv(512): Read the DNS response (up to 512 bytes for UDP).
- id, flags, qdcount, ancount, nscount, arcount = response[0, 12].unpack('n6'): Decode the 12-byte DNS header into fields.
- Print out helpful metadata about the response.
- offset = 12; skip the question section by advancing past QNAME and QTYPE/QCLASS.
- If ancount > 0, note that answers exist (full RR parsing is omitted here).

This example demonstrates the structure of a DNS query and a basic way to inspect a response without pulling in heavy DNS libraries.

---

## 2. TCP/IP: Establishing Connections and HTTP in Ruby

The TCP/IP stack underpins reliable, ordered, and connection-oriented communication. Practically, most apps talk HTTP over TCP. In Ruby, TCPSocket gives you a straightforward API to establish a connection, send a request, and read a response. This section shows a simple HTTP GET and highlights how the TCP layer handles the handshake implicitly in the OS.

Code: Open a TCP connection to a web server, issue an HTTP GET, and print the response headers and a portion of the body.

```ruby
require 'socket'

def fetch_http(host, path = '/')
  socket = TCPSocket.new(host, 80)
  request = "GET #{path} HTTP/1.1\r\nHost: #{host}\r\nConnection: close\r\n\r\n"
  socket.write(request)

  # Print response as it comes in
  while line = socket.gets
    puts line
  end
ensure
  socket.close if socket && !socket.closed?
end

# Example usage
fetch_http('example.com', '/')
```

### Line-by-line explanation
- require 'socket': Load the networking library that provides TCP sockets.
- def fetch_http(host, path = '/'): Define a helper to fetch an HTTP path from a host.
- socket = TCPSocket.new(host, 80): Open a TCP connection to the host on port 80 (HTTP).
- request = "GET #{path} HTTP/1.1\r\nHost: #{host}\r\nConnection: close\r\n\r\n": Build a minimal HTTP/1.1 request, including the Host header and a directive to close the connection after the response.
- socket.write(request): Send the HTTP request through the TCP socket.
- while line = socket.gets: Read the response line by line.
- puts line: Print each line of the response (headers then body).
- ensure … end: Ensure the socket is closed even if an error occurs.
- fetch_http('example.com', '/'): Run a simple GET to example.com for the root path.

This snippet demonstrates the practical effect of the TCP handshake and subsequent data transfer: you get a stream of bytes representing the HTTP response.

---

## 3. Packets: Understanding and Crafting a Minimal IP Header in Ruby

A network packet consists of a header and payload. IP packets have a 20-byte IPv4 header (among other fields) that encodes version, header length, total length, source/destination addresses, and more. While crafting and sending raw IP packets typically requires elevated privileges and careful checksum handling, you can still study header layout by constructing a minimal, valid-looking header in Ruby and inspecting its binary form.

Code: Build a simple IPv4 header (without a real checksum calculation) and show its size and hex representation.

```ruby
require 'ipaddr'

# Build a minimal IPv4 header (no options) for educational purposes.
def build_ip_header(src_ip, dst_ip, payload_len)
  version_ihl = (4 << 4) | 5     # IPv4, header length = 5 (20 bytes)
  dscp_ecn = 0
  total_length = 20 + payload_len  # header(20) + payload
  identification = 0x1234
  flags_fragment = 0
  ttl = 64
  protocol = 6                  # TCP
  checksum = 0                  # Placeholder; real checksum requires calculation
  src_ip_int = IPAddr.new(src_ip).to_i
  dst_ip_int = IPAddr.new(dst_ip).to_i

  # Pack as: version_ihl(1), dscp_ecn(1), total_length(2),
  # identification(2), flags_fragment(2), ttl(1), protocol(1),
  # checksum(2), src_ip(4), dst_ip(4)
  header = [version_ihl, dscp_ecn, total_length, identification,
            flags_fragment, ttl, protocol, checksum, src_ip_int, dst_ip_int]
           .pack('CCnnnCCnNN')

  header
end

# Demonstration: build a header and show its size and hex
ip_header = build_ip_header('192.0.2.1', '198.51.100.1', 0)
puts "IP header size: #{ip_header.bytesize} bytes"
puts "IP header hex:  #{ip_header.unpack('H*').first}"
```

### Line-by-line explanation
- require 'ipaddr': Load helper to handle IP address conversion to binary forms.
- def build_ip_header(src_ip, dst_ip, payload_len): Define a function to assemble a 20-byte IPv4 header.
- version_ihl = (4 << 4) | 5: Version 4, IHL 5 (20-byte header).
- dscp_ecn = 0: Differentiated services field; top-level 6 bits are 0 for simplicity.
- total_length = 20 + payload_len: Header length plus payload length.
- identification = 0x1234: Arbitrary identification value.
- flags_fragment = 0: No fragmentation flags set.
- ttl = 64, protocol = 6 (TCP): Typical values for a routeable packet with TCP payload.
- checksum = 0: Placeholder; real implementations compute a checksum over header.
- src_ip_int = IPAddr.new(src_ip).to_i, dst_ip_int = IPAddr.new(dst_ip).to_i: Convert IPs to 32-bit integers.
- header = [ ... ].pack('CCnnnCCnNN'): Pack fields into a 20-byte binary IPv4 header in network byte order.
- ip_header = build_ip_header('192.0.2.1', '198.51.100.1', 0): Build a header with no payload.
- puts "IP header size: ..." and "puts ip_header.unpack('H*').first": Print the size and a hex representation of the header.

This example helps you visualize how fields are arranged in a binary header and why network byte order matters when interoperating with other systems.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Ignoring endianness (network vs host byte order)
  - Bad:
    ```ruby
    # Wrong: packs 16-bit fields using default/native endianness
    header = [txid, flags, qdcount, ancount, nscount, arcount].pack('l6')
    ```
  - Good:
    ```ruby
    # Correct: use network byte order (big-endian) 16-bit fields
    header = [txid, flags, qdcount, ancount, nscount, arcount].pack('n6')
    ```
  Why it’s bad: DNS and many protocols require specific byte order; using native endianness leads to cross-host incompatibilities.

- Pitfall 2: Not handling timeouts or exceptions in network I/O
  - Bad:
    ```ruby
    socket = TCPSocket.new('example.com', 80)
    socket.write("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n")
    puts socket.read
    socket.close
    ```
  - Good:
    ```ruby
    begin
      socket = TCPSocket.new('example.com', 80)
      socket.write("GET / HTTP/1.1\r\nHost: example.com\r\nConnection: close\r\n\r\n")
      puts socket.read
    rescue IOError, SystemCallError => e
      warn "Network error: #{e.message}"
    ensure
      socket.close if socket && !socket.closed?
    end
    ```
  Why it’s bad: Network operations can fail due to timeouts, DNS failures, or remote resets. Proper error handling improves reliability.

- Pitfall 3: Forgetting to close sockets (resource leaks)
  - Bad:
    ```ruby
    sock = UDPSocket.new
    sock.send("hello", 0, 127, 53)
    # no close
    ```
  - Good:
    ```ruby
    begin
      sock = UDPSocket.new
      sock.send("hello", 0, 127, 53)
    ensure
      sock.close if sock
    end
    ```
  Why it’s bad: Open sockets exhaust file descriptors and can lead to stalled services.

- Pitfall 4: Incomplete DNS response parsing (assumes a fixed layout)
  - Bad:
    ```ruby
    answer_type = response[12, 2].unpack('n').first
    ```
  - Good:
    ```ruby
    # Robust parsing would walk the answer section, handle pointers, variable-length RRs
    offset = 12
    # Skip questions as a first pass
    while response.getbyte(offset) != 0
      offset += 1 + response.getbyte(offset)
    end
    offset += 5 # skip null byte, qtype, qclass
    # Now offset points to the answer section (if present)
    ```
  Why it’s bad: DNS responses vary in size; naive indexing often fails on real responses.

---

## Y. Why This Matters In Real Systems — production context and real usage

- DNS latency and caching: Applications perform many DNS lookups. Efficient caching, TTL handling, and resolver selection affect startup time and request latency. Failover to alternate resolvers can improve reliability.
- TCP performance: The TCP handshake, congestion control, and windowing affect latency and throughput. Browser and server implementations rely on OS-tuned defaults and sometimes TLS across long-lived connections.
- Packet-level awareness: For high-performance systems (e.g., proxies, load balancers), understanding IP headers helps with routing decisions, IP-based access control, and accurate logging. Tools like tcpdump/pcap or libraries that parse packets are common in operations.
- Security considerations: DNSSEC, TLS, and authenticated encryption frameworks depend on correct protocol usage. Mismanaging endianness, timeouts, or packet structure can lead to subtle security issues.
- Observability: Production systems measure DNS resolution time, TCP connect time, total time for HTTP responses, and error rates. Clear error handling and proper resource management are essential for reliability.

---

## Z. Study Questions — recall and quick reasoning

1) What is the primary purpose of DNS in the Internet architecture?  
2) Which transport protocol is most commonly used for DNS queries and why?  
3) Describe in brief how a TCP three-way handshake works.  
4) What are the main components of an IPv4 header, and why is endianness important?  
5) In Ruby, how would you perform a basic HTTP GET over TCP, and what are the key steps?

---

## Exercise — practical multi-part coding challenge

Part A: DNS query implementation
- Write a Ruby script that takes a domain as input (e.g., from ARGV) and prints the A record IPs returned by a DNS server using a UDP socket (similar to the example in Section 1).
- Expand the parser to extract and print at least the answer section’s domain name, type, and data (IP) if present.

Part B: TCP-based HTTP fetch
- Build a Ruby script that connects to a host (e.g., a small endpoint you control or a public one), fetches a specific path, and prints:
  - The HTTP status line
  - The response headers
  - The first 1 KB of the body
- Add basic error handling and timeouts (you can set a timeout on the socket).

Part C: IP header construction (educational)
- Implement the build_ip_header(src_ip, dst_ip, payload_len) function shown in Section 3.
- Extend it to compute a simple, fake checksum (or implement a basic IP header checksum if you want to challenge yourself).
- Print the header in hex and confirm the total length equals 20 + payload_len.

Part D (optional, advanced): Raw sockets (if your environment allows)
- If you have the necessary privileges and libraries, attempt to craft and send a raw IP packet using a library like PacketGen or a raw socket, and observe how OS/network devices respond. Document any permission or platform limitations you encounter.

Notes for the trainee:
- Start with Part A to get comfortable with DNS queries in Ruby.
- Move to Part B to connect the mindset of TCP-based communication.
- Tackle Part C to connect protocol knowledge to binary representation.
- Proceed with Part D only if you have a safe and permitted environment; many systems require elevated privileges.

If you’d like, I can tailor the exercises to a specific production stack (e.g., Rails services, microservices in a Ruby-based backend) or provide a ready-to-run repository with tests and CI hooks.