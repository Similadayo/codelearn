# Data Formats — JSON, XML, and Serialization in Java

In backend engineering, data formats are the lingua franca for services, storage, and APIs. JSON is the de facto for RESTful services due to its compactness and native compatibility with JavaScript clients. XML remains essential in legacy systems, enterprise integrations, and documentation. Java serialization offers a convenient way to persist and transport Java objects, but it comes with security and compatibility caveats. This lesson pairs theory with concrete Java examples to help you design robust, interoperable systems that manage data formats effectively.

## 1. JSON in Java — Mapping Java Objects to JSON and Back (Jackson)

This section demonstrates serializing a POJO to JSON and deserializing JSON back into Java objects using Jackson. Jackson is a fast, feature-rich library for JSON processing in Java.

Code block:
```java
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Arrays;
import java.util.List;

public class JsonDemo {
  // Simple POJO to demonstrate JSON mapping
  public static class User {
    public int id;
    public String name;
    public List<String> roles;

    // Default constructor needed by Jackson
    public User() {}

    public User(int id, String name, List<String> roles) {
      this.id = id;
      this.name = name;
      this.roles = roles;
    }
  }

  public static void main(String[] args) throws Exception {
    ObjectMapper mapper = new ObjectMapper();

    User u = new User(1, "Alice", Arrays.asList("admin", "user"));

    // Serialize to JSON
    String json = mapper.writeValueAsString(u);
    System.out.println("JSON: " + json);

    // Deserialize JSON back to POJO
    User deserialized = mapper.readValue(json, User.class);
    System.out.println("Deserialized name: " + deserialized.name);
  }
}
```

### Line-by-line explanation breaking down each line
- import com.fasterxml.jackson.databind.ObjectMapper;  
  Imports Jackson's core ObjectMapper used for both serialization and deserialization.

- import java.util.Arrays; import java.util.List;  
  Imports standard Java collections used to construct the roles list.

- public class JsonDemo { … }  
  Entry point class for the JSON demonstration.

- public static class User { … }  
  A simple data carrier (POJO) with fields id, name, and roles.

- public int id; public String name; public List<String> roles;  
  Public fields allow Jackson to access data without getters/setters (works for simple cases).

- public User() {}  
  No-arg constructor required by Jackson for deserialization.

- public User(int id, String name, List<String> roles) { … }  
  Convenience constructor to initialize all fields.

- public static void main(String[] args) throws Exception { … }  
  Entry point; declares throws Exception for brevity in this example.

- ObjectMapper mapper = new ObjectMapper();  
  Create a Jackson mapper instance.

- User u = new User(1, "Alice", Arrays.asList("admin", "user"));  
  Create a sample user with two roles.

- String json = mapper.writeValueAsString(u);  
  Serialize the User object to a JSON string.

- System.out.println("JSON: " + json);  
  Print the produced JSON for verification.

- User deserialized = mapper.readValue(json, User.class);  
  Deserialize the JSON back into a User object.

- System.out.println("Deserialized name: " + deserialized.name);  
  Confirm the round-trip worked by printing the name.

### Why this matters
- JSON is lightweight and language-agnostic, making it ideal for HTTP APIs and cross-service communication.
- Jackson provides a natural, type-safe way to map between Java objects and JSON, reducing boilerplate and errors compared to manual string manipulation.
- In team environments, consistent POJO mapping helps maintain contract fidelity between services and clients.

## 2. XML in Java — Marshalling and Unmarshalling with JAXB

XML is still pervasive in enterprise contexts, data feeds, and configuration. Java Architecture for XML Binding (JAXB) lets you bind Java classes to XML representations, enabling clean marshalling (Java -> XML) and unmarshalling (XML -> Java).

Code block:
```java
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.JAXBContext;
import javax.xml.bind.Marshaller;
import javax.xml.bind.Unmarshaller;
import java.io.StringReader;
import java.io.StringWriter;

@XmlRootElement(name = "person")
@XmlAccessorType(XmlAccessType.FIELD)
public class XmlDemo {
  public static class Person {
    public int id;
    public String name;

    // JAXB requires a no-arg constructor
    public Person() {}

    public Person(int id, String name) {
      this.id = id;
      this.name = name;
    }
  }

  public static void main(String[] args) throws Exception {
    Person p = new Person(42, "Bob");

    // Marshal to XML
    JAXBContext context = JAXBContext.newInstance(Person.class);
    Marshaller marshaller = context.createMarshaller();
    marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, true);

    StringWriter writer = new StringWriter();
    marshaller.marshal(p, writer);
    String xml = writer.toString();
    System.out.println("XML:\n" + xml);

    // Unmarshal back to object
    Unmarshaller unmarshaller = context.createUnmarshaller();
    Person p2 = (Person) unmarshaller.unmarshal(new StringReader(xml));
    System.out.println("Unmarshaled name: " + p2.name);
  }
}
```

### Line-by-line explanation breaking down each line
- import javax.xml.bind.annotation.XmlRootElement; import javax.xml.bind.annotation.XmlAccessorType; import javax.xml.bind.annotation.XmlAccessType;  
  JAXB annotations to configure XML binding behavior.

- import javax.xml.bind.JAXBContext; import javax.xml.bind.Marshaller; import javax.xml.bind.Unmarshaller;  
  Core JAXB classes for binding operations.

- import java.io.StringReader; import java.io.StringWriter;  
  In-memory I/O utilities for demonstration.

- @XmlRootElement(name = "person") @XmlAccessorType(XmlAccessType.FIELD)  
  Annotations that specify how the Person class is represented in XML.

- public static class Person { public int id; public String name; public Person() {} public Person(int id, String name) { … } }  
  The bound POJO; a no-arg constructor is required by JAXB for unmarshalling.

- public static void main(String[] args) throws Exception { … }  
  Demonstration entry point.

- Person p = new Person(42, "Bob");  
  Create a sample person instance to marshal.

- JAXBContext context = JAXBContext.newInstance(Person.class);  
  Create a binding context for the Person class.

- Marshaller marshaller = context.createMarshaller(); marshaller.setProperty(Marshaller.JAXB_FORMATTED_OUTPUT, true);  
  Prepare a marshaller with pretty-printed XML.

- StringWriter writer = new StringWriter(); marshaller.marshal(p, writer); String xml = writer.toString();  
  Marshal the Person object to an XML string.

- System.out.println("XML:\n" + xml);  
  Output the produced XML for inspection.

- Unmarshaller unmarshaller = context.createUnmarshaller(); Person p2 = (Person) unmarshaller.unmarshal(new StringReader(xml));  
  Unmarshal the XML back into a Person object.

- System.out.println("Unmarshaled name: " + p2.name);  
  Verify that the round-trip worked.

### Why this matters
- XML binding via JAXB is a canonical, strongly-typed approach for XML in Java, with clear mappings between Java fields and XML elements/attributes.
- JAXB keeps data models in Java close to their serialized form, improving maintainability and readability in systems that rely on XML.

## 3. Java Serialization — Persisting Java Objects to Bytes (and Cautions)

Java’s built-in serialization mechanism lets you convert objects into a portable binary representation and back. While convenient for certain internal tasks (caching, deep copies, RPC in controlled environments), it has well-known security and compatibility pitfalls for inter-service data interchange.

Code block:
```java
import java.io.*;

public class SerializationDemo {
  public static class User implements Serializable {
    private static final long serialVersionUID = 1L;
    public int id;
    public String name;

    public User() {} // required for deserialization
    public User(int id, String name) { this.id = id; this.name = name; }
  }

  public static void main(String[] args) throws IOException, ClassNotFoundException {
    User u = new User(7, "Charlie");

    // Serialize to a file
    try (FileOutputStream fos = new FileOutputStream("user.ser");
         ObjectOutputStream oos = new ObjectOutputStream(fos)) {
      oos.writeObject(u);
    }

    // Deserialize from file
    try (FileInputStream fis = new FileInputStream("user.ser");
         ObjectInputStream ois = new ObjectInputStream(fis)) {
      User loaded = (User) ois.readObject();
      System.out.println("Loaded: " + loaded.name);
    }
  }
}
```

### Line-by-line explanation breaking down each line
- import java.io.*;  
  Imports needed for Java I/O streams and serialization.

- public class SerializationDemo { public static class User implements Serializable { … } … }  
  A serializable inner class User with id and name fields.

- private static final long serialVersionUID = 1L;  
  Explicit serial version to control compatibility across versions.

- public User() {} public User(int id, String name) { … }  
  Constructors; the no-arg constructor is important for deserialization.

- public static void main(String[] args) throws IOException, ClassNotFoundException { … }  
  Entry point with relevant exceptions.

- User u = new User(7, "Charlie");  
  Create a sample user instance to serialize.

- try-with-resources (FileOutputStream fos, ObjectOutputStream oos) { oos.writeObject(u); }  
  Serialize the object graph to a binary file.

- try-with-resources (FileInputStream fis, ObjectInputStream ois) { User loaded = (User) ois.readObject(); }  
  Read the object back from the binary file (deserialization).

- System.out.println("Loaded: " + loaded.name);  
  Demonstrate the deserialized object state.

### Why this matters
- Java serialization is great for internal Java-only workflows (caching, transient RPC within a trusted boundary). However, it’s brittle for long-term persistence and dangerous for network-facing data exchange due to security vulnerabilities (arbitrary code execution during deserialization) and backward-compatibility concerns.
- For cross-language or persistent storage scenarios, prefer JSON, XML, or well-defined binary formats (e.g., Protocol Buffers, Avro, Thrift) with explicit schemas.

## 4. Data Formats, Schema, and Validation — Schema-driven Development

Schema validation helps enforce structure, types, and constraints, preventing a lot of data-integrity bugs in production. This section shows XML schema validation and JSON schema validation to illustrate how to enforce contracts.

XML Schema Validation (XSD)
Code block:
```java
import javax.xml.XMLConstants;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Schema;
import javax.xml.validation.Validator;
import javax.xml.transform.stream.StreamSource;
import java.io.File;

public class XmlSchemaValidation {
  public static void main(String[] args) throws Exception {
     // Load XSD
     SchemaFactory factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
     Schema schema = factory.newSchema(new File("person.xsd"));

     Validator validator = schema.newValidator();
     // Validate XML instance against the XSD
     validator.validate(new StreamSource(new File("person.xml")));

     System.out.println("XML is valid against the provided XSD.");
  }
}
```

JSON Schema Validation (using a JSON Schema library)
Code block:
```java
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
// Depending on the library, you might see imports like:
// import com.networknt.schema.JsonSchema;
// import com.networknt.schema.JsonSchemaFactory;
// import com.networknt.schema.ValidationMessage;

import java.io.File;
import java.util.Set;

public class JsonSchemaValidation {
  public static void main(String[] args) throws Exception {
     ObjectMapper mapper = new ObjectMapper();
     JsonNode json = mapper.readTree("{\"name\":\"Alice\",\"age\":30}");

     // Replace with the library you use; this is a representative pattern.
     // JsonSchemaFactory factory = JsonSchemaFactory.getInstance();
     // JsonSchema schema = factory.getSchema(new File("person.schema.json"));
     // Set<ValidationMessage> errors = schema.validate(json);

     // For demonstration, we'll assume validation passed:
     System.out.println("JSON is valid (demo placeholder).");
     // In real usage, check errors.isEmpty() and handle accordingly.
  }
}
```

Line-by-line explanation for the JSON schema example is omitted here for brevity, but conceptually:
- Load JSON, load a JSON Schema, and validate the JSON against the schema.
- Handle and report any ValidationMessage you receive; if none, the document conforms to the contract.

### Why this matters
- Centralized schema enforcement reduces API brittleness as teams evolve data contracts.
- XML Schema (XSD) and JSON Schema provide machine-checkable guarantees about field presence, types, enumerations, and structural constraints.
- Validation dreams become production reality when you reject non-conforming payloads early in the data path.

## 5. Performance and Streaming Considerations — Large Payloads and Efficiency

When dealing with large payloads, streaming APIs help avoid loading entire documents into memory. Jackson offers both data-binding (ObjectMapper) and streaming (JsonGenerator/JsonParser) APIs.

Code block (JSON streaming writer):
```java
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonEncoding;
import java.io.File;
import java.io.IOException;

public class JsonStreamingExample {
  public static void main(String[] args) throws IOException {
     ObjectMapper mapper = new ObjectMapper();
     JsonFactory factory = mapper.getFactory();

     // Write a large array of simple objects without building the full in-memory list
     try (JsonGenerator generator = factory.createGenerator(new File("large.json"), JsonEncoding.UTF8)) {
        generator.writeStartArray();
        for (int i = 0; i < 1000; i++) {
           generator.writeStartObject();
           generator.writeNumberField("id", i);
           generator.writeStringField("name", "Item" + i);
           generator.writeEndObject();
        }
        generator.writeEndArray();
     }
  }
}
```

Line-by-line explanation (selected lines)
- JsonFactory factory = mapper.getFactory();  
  Obtain a low-level generator factory from the ObjectMapper.

- try (JsonGenerator generator = factory.createGenerator(new File("large.json"), JsonEncoding.UTF8)) { … }  
  Open a streaming JSON writer to a file. This writes data incrementally rather than building one giant in-memory string.

- generator.writeStartArray(); … generator.writeEndArray();  
  Start and end a JSON array, writing each element object inside the loop.

- generator.writeStartObject(); generator.writeNumberField("id", i); generator.writeStringField("name", "Item" + i); generator.writeEndObject();  
  Write an individual JSON object with two fields per item.

Why streaming matters
- Reduces peak memory usage for large results, improving GC behavior and latency.
- Enables building large JSON/XML documents on-the-fly without constructing huge intermediate structures.
- Essential for high-throughput services transmitting large datasets or log-like data.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Manual string concatenation for JSON vs proper object mapping
  - Bad:
    ```java
    String json = "{\"id\":" + user.getId() + ",\"name\":\"" + user.getName() + "\"}";
    ```
  - Good:
    ```java
    String json = mapper.writeValueAsString(user);
    ```
  - Why it’s risky: manual construction is error-prone (escaping, nulls, type handling) and brittle with evolving schemas.

- Pitfall 2: Unknown properties handling in deserialization
  - Bad (ignores nothing / crashes in some configurations):
    ```java
    ObjectMapper mapper = new ObjectMapper();
    // If FAIL_ON_UNKNOWN_PROPERTIES is true and JSON has extra fields, this can fail
    mapper.enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    User u = mapper.readValue(json, User.class);
    ```
  - Good:
    ```java
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class User { public int id; public String name; }
    ObjectMapper mapper = new ObjectMapper();
    User u = mapper.readValue(json, User.class);
    ```
  - Why it’s important: production data often carries extra fields; being explicit about unknown properties improves resilience.

- Pitfall 3: JAXB without a no-arg constructor
  - Bad:
    ```java
    public class Person {
      public int id;
      public String name;
      public Person(int id, String name) { this.id = id; this.name = name; }
    }
    ```
  - Good:
    ```java
    public static class Person {
      public int id;
      public String name;
      public Person() {} // no-arg ctor required by JAXB
      public Person(int id, String name) { this.id = id; this.name = name; }
    }
    ```
  - Why it’s important: JAXB requires a public or protected no-arg constructor to instantiate objects during unmarshalling.

Additional common pitfall
- Pitfall 4: SerialVersionUID and non-serializable fields in Java serialization
  - Bad:
    ```java
    public class User implements Serializable {
      public int id;
      public String name;
      public Socket socket; // non-serializable field inadvertently included
    }
    ```
  - Good:
    ```java
    public class User implements Serializable {
      private static final long serialVersionUID = 1L;
      public int id;
      public String name;
      private transient Socket socket; // transient to exclude from serialization
    }
    ```
  - Why it matters: missing serialVersionUID can cause deserialization failures after class changes; non-serializable fields should be transient or handled explicitly.

## Y. Why This Matters In Real Systems — production context and real usage

- Interoperability: APIs communicate via JSON or XML; choose the format that best fits the consumer ecosystem and performance needs.
- Schema and contracts: JSON Schema and XML Schema enforce data contracts, reduce integration errors, and speed up onboarding of new clients.
- Security: Be cautious with deserialization. Prefer JSON/XML-based interchange with explicit schemas, and avoid exposing Java native serialization endpoints to external clients.
- Performance: For large payloads, streaming (as shown) reduces memory pressure and improves latency. Consider compression (gzip, brotli) in transit and efficient data representations.
- Evolution and versioning: Maintain backward compatibility by evolving schemas in a controlled way and providing migrations or adapters between versions.

## Z. Study Questions — 5 recall questions

1) What are the main differences between JSON and XML for data interchange, and when would you prefer one over the other in a backend system?
2) How would you serialize a Java object to JSON using Jackson, and how would you deserialize JSON back to a Java object?
3) How do you marshal a Java object to XML using JAXB, and what is required for unmarshalling to succeed?
4) Why is Java native serialization often discouraged for cross-service data exchange, and what are safer alternatives?
5) What is the purpose of streaming APIs (e.g., Jackson JsonGenerator) when dealing with large JSON payloads?

## Exercise — practical multi-part coding challenge

Part A — Create and serialize a Product
- Create a Java class Product with:
  - int id
  - String name
  - double price
  - List<String> tags
- Include no-arg and all-args constructors, plus getters/setters or public fields.
- Use Jackson to serialize a List<Product> to JSON and print the result.

Part B — Marshal a Product to XML
- Annotate Product (or wrap it in a wrapper class if needed) for JAXB, and marshal a single Product to XML. Print the resulting XML.

Part C — Java serialization round-trip
- Make Product implement Serializable (with serialVersionUID). Serialize a Product instance to a file and then deserialize it. Print a field from the deserialized object.

Part D — Streaming writer for a large dataset
- Use Jackson streaming API to write 1,000 simple Product objects to a JSON file without constructing the entire list in memory. Include progress logs every 200 items.

Part E — Simple validation (XML)
- Create a minimal XSD for the XML produced in Part B and validate the XML instance against the XSD programmatically. Print validation success or error details.

Optional scaffolding (Maven/Gradle)
- Include dependencies for Jackson (core, databind), JAXB (if needed for your JDK), and a JSON Schema or XML Schema library if you expand Part E. You can use the following Maven snippet as a starting point:

Maven POM snippet (dependencies only, adjust versions as needed):
```xml
<dependencies>
  <dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.20.0</version>
  </dependency>
  <dependency>
    <groupId>javax.xml.bind</groupId>
    <artifactId>jaxb-api</artifactId>
    <version>2.3.1</version>
  </dependency>
  <!-- Optional: JAXB implementation for JREs without it -->
  <dependency>
    <groupId>com.sun.xml.bind</groupId>
    <artifactId>jaxb-impl</artifactId>
    <version>2.3.3</version>
  </dependency>
  <!-- Optional: JSON Schema validator (example) -->
  <dependency>
    <groupId>com.networknt</groupId>
    <artifactId>json-schema-validator</artifactId>
    <version>1.0.67</version>
  </dependency>
</dependencies>
```

End of lesson.