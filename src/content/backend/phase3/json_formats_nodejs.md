# Data Formats — JSON, XML, and Serialization

Data formats are the lingua franca of backend systems. JSON and XML are the most common text-based formats for API payloads, while binary serialization formats (e.g., BSON, MessagePack) offer compact representations ideal for high-throughput services. This lesson teaches how to encode, decode, and marshal data across these formats in a Node.js environment, including practical caveats, common pitfalls, and real-world usage patterns.

## 1. JSON in Node.js

JSON is the default data-interchange format for HTTP APIs in the JavaScript ecosystem. It is human-readable, language-agnostic, and natively supported by JavaScript. In Node.js, you typically use JSON.stringify to serialize objects to strings and JSON.parse to deserialize strings back to objects.

```js
// 1. Basic JSON serialization/deserialization with Date handling
const data = {
  id: 101,
  name: 'Alice',
  active: true,
  createdAt: new Date()
};

// Serialize to JSON string
const json = JSON.stringify(data);

// Deserialize with a reviver to restore Date objects
const parsed = JSON.parse(json, (key, value) => {
  if (key === 'createdAt') return new Date(value);
  return value;
});

// Show results
console.log('JSON:', json);
console.log('Parsed data:', parsed);
console.log('createdAt type:', typeof parsed.createdAt);
console.log('createdAt instanceof Date:', parsed.createdAt instanceof Date);
```

### Line-by-line explanation breaking down each line
1. Define a data object with a Date field to demonstrate timestamp handling.
2. Serialize the object to a JSON string; Date becomes an ISO-8601 string.
3. Parse back the JSON string with a reviver function to convert the createdAt string back to a Date object.
4. Output the raw JSON string.
5. Output the parsed JavaScript object (createdAt will be a Date).
6. Show the type of createdAt.
7. Confirm that createdAt is indeed a Date instance.

Notes and pitfalls:
- JSON.stringify will drop undefined fields and cannot represent functions or symbols.
- JSON.stringify serializes Date objects as ISO strings; use a reviver to restore Date objects on parse.
- JSON has no native support for binary data; binary payloads should be base64-encoded or transported via a different channel.

## 2. XML in Node.js

XML offers rich structure with attributes, namespaces, and schemas. In Node.js, libraries such as xml2js let you convert between JS objects and XML. This section demonstrates parsing XML into a JS object and building XML from an object, including attributes.

```js
// 2. XML parsing and building with xml2js
const xml2js = require('xml2js');
const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
const builder = new xml2js.Builder({ headless: true, renderOpts: { pretty: true } });

const xml = `<user id="123">
  <name>Alice</name>
  <active>true</active>
</user>`;

// Parse XML -> JS object
parser.parseString(xml, (err, result) => {
  if (err) throw err;
  console.log('Parsed XML to JS:', result);

  // Modify and rebuild XML
  const rebuiltXml = builder.buildObject({ user: result.user });
  console.log('Rebuilt XML:\n', rebuiltXml);
});
```

### Line-by-line explanation breaking down each line
1. Import xml2js and create a parser configured to treat elements as scalars where appropriate and merge attributes into the resulting object.
2. Create an XML builder configured to produce compact XML (no XML declaration) and readable formatting.
3. Define a sample XML string with an attribute on the user element.
4. Parse the XML string into a JavaScript object asynchronously.
5. If parsing fails, throw an error; otherwise, log the resulting JS object.
6. Use the builder to convert the JS object back into XML, showing round-trip consistency.
7. Output the rebuilt XML string.

Notes:
- explicitArray: false makes single-child elements map to a plain value instead of an array.
- mergeAttrs: true pushes element attributes into the parent object (e.g., id becomes a property on user).

Alternative approach:
- You can use other libraries (e.g., fast-xml-parser) for faster parsing; the API is similar but the configuration differs.

## 3. Binary and Other Serialization Formats

Beyond JSON and XML, binary and compact representations offer performance advantages for high-throughput services. Two popular choices in the Node.js ecosystem are BSON and MessagePack.

### 3a. BSON (Binary JSON)

BSON is used by MongoDB and provides a binary encoding of JSON-like documents, with support for binary data and more efficient encoding for certain types.

```js
// 3a. BSON serialization/deserialization
const BSON = require('bson');
const doc = {
  id: 7,
  name: 'Dana',
  data: Buffer.from([1, 2, 3, 4]),
  createdAt: new Date()
};

const buf = BSON.serialize(doc);
const deserialized = BSON.deserialize(buf);

console.log('BSON size (bytes):', buf.length);
console.log('Deserialized object:', deserialized);
console.log('createdAt type after BSON deserialize:', typeof deserialized.createdAt);
```

### Line-by-line explanation breaking down each line
1. Import the BSON library.
2. Create a sample document containing a Buffer and a Date to show rich binary support.
3. Serialize the document to a BSON buffer.
4. Deserialize the BSON buffer back to a JavaScript object.
5. Print the size of the BSON binary payload.
6. Print the deserialized object to verify integrity.
7. Note how dates and buffers are reconstructed (BSON handles more types than JSON).

### 3b. MessagePack (binary, efficient and cross-language)

MessagePack is a compact binary representation that is efficient for network transport and can be decoded in many languages.

```js
// 3b. MessagePack encoding/decoding
const msgpack = require('@msgpack/msgpack');
const payload = { id: 7, name: 'Dana', data: Buffer.from('hello'), createdAt: new Date() };

const encoded = msgpack.encode(payload);
const decoded = msgpack.decode(encoded);

console.log('MessagePack size (bytes):', encoded.length);
console.log('Decoded payload:', decoded);
console.log('createdAt as string/date after decode:', decoded.createdAt);
```

### Line-by-line explanation breaking down each line
1. Import the MessagePack library.
2. Create an object containing a Buffer and a Date field for demonstration.
3. Encode the object into a binary MessagePack buffer.
4. Decode the buffer back into a JavaScript object.
5. Print the size of the MessagePack binary payload.
6. Print the decoded payload to verify round-trip integrity.
7. Note how the createdAt field is preserved as a string representation by default; depending on the library/config, you may convert it back to Date as needed.

Notes:
- Binary formats are more compact and faster to serialize/deserialize but require libraries on both sending and receiving sides.
- If you’re dealing with cross-language services, ensure both sides share the same binary format and endianness conventions.

## X. Common Beginner Mistakes

Mistakes are common when learning data formats. Here are real pitfalls with bad vs good code.

- Mistake 1 — Unsafe evaluation of JSON payloads
  - Bad:
  ```js
  // Never do this with user-controlled input
  const data = eval('(' + json + ')');
  ```
  - Good:
  ```js
  const data = JSON.parse(json);
  ```

- Mistake 2 — Circular references and JSON.stringify
  - Bad:
  ```js
  const a = {};
  a.self = a;
  JSON.stringify(a); // TypeError: Converting circular structure to JSON
  ```
  - Good:
  ```js
  const seen = new WeakSet();
  const safe = JSON.stringify(a, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
  ```

- Mistake 3 — Treating XML as JSON
  - Bad:
  ```js
  // This will fail or produce meaningless results
  const obj = JSON.parse(xml);
  ```
  - Good:
  ```js
  const xml2js = require('xml2js');
  const parser = new xml2js.Parser({ explicitArray: false });
  parser.parseString(xml, (err, result) => {
    // Now you have a JS object
  });
  ```

- Mistake 4 — Handling binary data in JSON without encoding
  - Bad:
  ```js
  const payload = { data: Buffer.from([1,2,3]).toString('utf8') }; // may produce garbled text
  const json = JSON.stringify(payload);
  ```
  - Good:
  ```js
  // Use a safe encoding (e.g., base64) for binary data
  const payload = { data: Buffer.from([1,2,3]).toString('base64') };
  const json = JSON.stringify(payload);
  ```

## Y. Why This Matters In Real Systems

- Inter-service communication: JSON via REST/HTTP is ubiquitous due to its human readability and native JS support. XML remains important when interfacing with legacy systems or where schemas and namespaces are essential.
- Schema validation: JSON Schema and XML Schema (XSD) provide contract guarantees between services, enabling early error detection and backward compatibility.
- Performance and payload size: Binary formats like BSON and MessagePack reduce bandwidth and CPU usage in high-throughput services, especially mobile clients or microservices that exchange large payloads.
- Security considerations: XML can expose XXE or other parsing vulnerabilities if not configured securely. JSON handling should be careful with large payloads and input validation to avoid denial-of-service or injection risks.
- Evolution and versioning: As data contracts evolve, schemas help enforce backward compatibility. Consider versioning payloads or embedding a version field to manage changes gracefully.
- Streaming and memory: For large data, streaming parsers (e.g., JSON streaming, XML streaming) help avoid loading entire documents into memory. This is crucial for services that ingest large datasets or log streams.

## Z. Study Questions

1) What is the purpose of a reviver function in JSON.parse, and how would you use it to restore Date objects?  
2) How do you preserve XML attributes when converting between XML and JavaScript objects with xml2js?  
3) Name two binary serialization formats shown in this lesson and one key performance benefit of using binary formats.  
4) What is a common pitfall when sending binary data in JSON, and what is a safe workaround?  
5) Why should JSON Schema or XML Schema be used in production systems?

## Exercise — practical multi-part coding challenge

Overview:
Build a small Node.js tool that ingests a JSON payload and emits multiple representations (JSON, XML, BSON, and MessagePack) along with basic validation, suitable for API data interchange workflows. You will practice encoding, decoding, and validating across formats, and you’ll gain hands-on familiarity with common libraries.

Part A — CLI tool to convert and inspect formats
- Task:
  - Create a single Node script (e.g., format-formatter.js) that:
    - Reads a JSON payload from stdin (or a file path provided as an argument).
    - Produces:
      - Minified JSON string
      - Pretty-printed XML (root tag “root”)
      - BSON binary length
      - MessagePack binary length
      - Validation result against a provided JSON Schema (inline in the script)
    - Outputs a single JSON summary object to stdout with fields: json, xml, bsonSize, mpSize, valid, errors (if any).
- Dependencies to install:
  - xml2js
  - bson
  - @msgpack/msgpack
  - ajv

- Starter code (save as format-formatter.js) (you will implement fully):
```js
#!/usr/bin/env node
// format-formatter.js - Ingest JSON, output multiple representations and validation

const fs = require('fs');
const xml2js = require('xml2js');
const BSON = require('bson');
const msgpack = require('@msgpack/msgpack');
const Ajv = require('ajv');

const av = new Ajv();

// Inline JSON Schema (adjust as needed)
const schema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'createdAt'],
  additionalProperties: true
};

function toXml(obj) {
  const builder = new xml2js.Builder({ headless: true, renderOpts: { pretty: true } });
  // Wrap in a root element for a consistent XML payload
  return builder.buildObject({ root: obj });
}

function main() {
  const input = process.stdin.isTTY ? '' : fs.readFileSync(0, 'utf8');
  const argPath = process.argv[2];

  let raw = input;
  if (argPath) {
    raw = fs.readFileSync(argPath, 'utf8');
  }
  if (!raw) {
    console.error('Usage: cat payload.json | node format-formatter.js [optional_path]');
    process.exit(1);
  }

  const obj = JSON.parse(raw);

  // Ensure we have a valid representation
  // You might normalize dates here if needed

  // JSON
  const json = JSON.stringify(obj);

  // XML
  const xml = toXml(obj);

  // BSON
  const bsonBuf = BSON.serialize(obj);

  // MessagePack
  const mp = msgpack.encode(obj);

  // Validation
  const validate = av.compile(schema);
  const valid = validate(obj);
  const result = {
    json,
    xml,
    bsonSize: bsonBuf.length,
    mpSize: mp.length,
    valid,
    errors: validate.errors || null
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
```

Usage example:
- Prepare payload.json with:
  {
    "id": 1,
    "name": "Ada",
    "createdAt": "2026-03-09T12:00:00Z"
  }
- Run:
  - cat payload.json | node format-formatter.js
  - or: node format-formatter.js payload.json

Hints:
- You can expand the schema and add more fields as needed.
- For Date handling, you can preprocess to ensure createdAt is ISO date-time and add a reviver if you want to normalize during parsing.
- If you want to handle larger payloads, consider streaming input and streaming JSON validation (additional libraries may be needed).

End of lesson.