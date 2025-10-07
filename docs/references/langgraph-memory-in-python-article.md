https://medium.com/@anil.jain.baba/long-term-agentic-memory-with-langgraph-824050b09852

Comprehensive Guide: Long-Term Agentic Memory With LangGraph
Anil Jain | AI / ML Architect | Data Architect
Anil Jain | AI / ML Architect | Data Architect
50 min read
·
Apr 19, 2025

Press enter or click to view image in full size
Long Term Agentic Memory With LangGraph
Table of Contents

    Introduction

    The Challenge of Memory in AI Systems
    Understanding Agentic Memory
    The Promise of LangGraph

2. Foundations of Memory in AI Systems

    Types of Memory in Cognitive Science
    Memory Models in AI Agents
    The Memory Hierarchy: From Short-Term to Long-Term

3. LangGraph: An Overview

    The Evolution from LangChain to LangGraph
    Core Concepts and Architecture
    State Management in LangGrap

4. Memory Implementation in LangGraph

    Short-Term vs. Long-Term Memory
    Memory Stores and Persistence
    Cross-Thread Memory Capabilities

5. Building Blocks of Agentic Memory

    Semantic Memory: Storing and Retrieving Facts
    Episodic Memory: Learning from Experiences
    Procedural Memory: Remembering How to Act

6. Practical Implementation

    Creating a Memory-Enabled Agent
    Store Class Usage
    Memory Persistence Techniques
    Semantic Search Integration

7. Advanced Memory Techniques

    Vector Databases for Memory Enhancement
    Memory Summarization and Compression
    Deduplication and Memory Optimization

8. Real-World Applications

    Personalized Assistants
    Enterprise Knowledge Management
    Education and Training Systems

9. Future Directions

    Challenges and Limitations
    Research Frontiers
    Towards More Human-Like Memory Systems

10. Conclusion

    Key Takeaways
    Best Practices
    The Road Ahead

Chapter 1: Introduction
The Challenge of Memory in AI Systems

Large Language Models (LLMs) have revolutionized the capabilities of artificial intelligence systems, enabling sophisticated text understanding and generation. However, these models face a fundamental limitation: they operate primarily as stateless systems, processing each input independently without retaining information across interactions. This statelessness creates a significant gap between human-like intelligence and current AI capabilities.

While humans naturally build and maintain memories across interactions — remembering preferences, past conversations, and learned information — traditional LLMs must be explicitly engineered to maintain such context. As Richardson Gunde explains, “The future of AI depends on solving a key issue with large language models: their inability to retain long-term information during extended conversations,” Medium1.

This limitation manifests in practical ways: a chatbot might forget a user’s name moments after being told, fail to recall previous instructions, or provide inconsistent responses across interactions. In fields requiring continuous context like healthcare, finance, or customer support, these memory gaps can lead to frustrating user experiences and potentially harmful outcomes.
Understanding Agentic Memory

Agentic memory represents a paradigm shift in how AI systems maintain and utilize information over time. Rather than treating memory as a passive storage system, agentic memory takes an active approach where the AI itself determines what information is worth remembering, how to organize it, and when to retrieve it.

The concept draws inspiration from human cognitive systems. As noted by IBM researchers, “AI agent memory refers to an artificial intelligence system’s ability to store and recall past experiences to improve decision-making, perception and overall performance” IBM2. This ability to remember past experiences and apply them to new situations is fundamental to creating truly intelligent and helpful AI systems.

Agentic memory encompasses several key capabilities:

    Persistence — The ability to maintain information across multiple interaction sessions
    Selective attention — Determining what information is worth storing
    Contextual retrieval — Finding relevant memories based on current needs
    Memory integration — Combining new information with existing knowledge
    Self-updating — Revising stored information as new evidence emerges

These capabilities enable AI agents to provide personalized responses, maintain consistent knowledge, and learn from past interactions in ways that static, stateless models cannot.
Understanding Agentic Memory

Agentic memory represents a paradigm shift in how AI systems maintain and utilize information over time. Rather than treating memory as a passive storage system, agentic memory takes an active approach where the AI itself determines what information is worth remembering, how to organize it, and when to retrieve it.

The concept draws inspiration from human cognitive systems. As noted by IBM researchers, “AI agent memory refers to an artificial intelligence system’s ability to store and recall past experiences to improve decision-making, perception and overall performance” IBM2. This ability to remember past experiences and apply them to new situations is fundamental to creating truly intelligent and helpful AI systems.

Agentic memory encompasses several key capabilities:

    Persistence — The ability to maintain information across multiple interaction sessions
    Selective attention — Determining what information is worth storing
    Contextual retrieval — Finding relevant memories based on current needs
    Memory integration — Combining new information with existing knowledge
    Self-updating — Revising stored information as new evidence emerges

These capabilities enable AI agents to provide personalized responses, maintain consistent knowledge, and learn from past interactions in ways that static, stateless models cannot.
Chapter 2: Foundations of Memory in AI Systems
Types of Memory in Cognitive Science

The architecture of memory in AI systems draws significant inspiration from human cognitive science. Understanding the human memory system provides valuable insights for designing effective memory mechanisms for AI agents. Cognitive scientists have identified several distinct memory systems, each serving different functions in human cognition.

Working Memory

Working memory represents our ability to temporarily hold and manipulate information. It serves as the immediate workspace of consciousness, maintaining the context of current thoughts and activities. Working memory has limited capacity, typically holding only a few items simultaneously, and information tends to decay rapidly unless actively maintained.

In AI systems, working memory analogously refers to the immediate conversational context — the current interaction and its immediate predecessors that influence the model’s responses. As noted in research from Decoding ML, “Short-term memory, often called working memory, is the temporary storage space where an agent holds information it’s currently using” Decoding ML5.
Press enter or click to view image in full size

Episodic Memory

Episodic memory stores autobiographical events — personal experiences tied to specific times and places. It enables humans to mentally travel back in time to relive past experiences, forming the basis for personal identity and learning from experience.

For AI agents, episodic memory manifests as the storage of past interactions and experiences, including the context of conversations, user responses, and outcomes of actions. This type of memory allows agents to reference past interactions and learn from them. As one researcher explains, “Episodic memory stores experiences; semantic memory stores knowledge” Medium1.

Semantic Memory

Semantic memory encompasses general world knowledge — facts, concepts, and understandings not tied to specific experiences. It represents our accumulated knowledge about the world, language, and abstract concepts.

In AI systems, semantic memory refers to factual knowledge stored in a structured form, often independent of the specific interactions where this knowledge was acquired. This includes information about users’ preferences, facts about domains of expertise, and general knowledge that the agent can draw upon.

Procedural Memory

Procedural memory enables skilled actions and habitual behaviors. Unlike declarative memories (episodic and semantic), procedural memory is implicit, manifesting in how we perform tasks rather than in conscious recollection.

For AI agents, procedural memory relates to how the agent operates — the rules it follows, the strategies it employs, and the “skills” it has developed through experience. In LangGraph implementations, this often takes the form of system prompts or instructions that guide the agent’s behavior.
Memory Models in AI Agents

Translating these cognitive memory systems into functional AI components requires careful engineering. Several models have emerged for implementing memory in AI agents, each with distinct approaches to storage, retrieval, and utilization.

The Context Window Approach

The simplest memory model relies on the context window of language models. By including previous exchanges in the prompt, models gain access to conversation history. However, this approach is severely limited by the fixed context window size of LLMs, resulting in memory that is both short-term and constrained.

As noted by researchers at ADA Science, “Short-term and long-term memory systems serve distinct yet complementary roles in AI agents. STM allows for quick, real-time decision-making based on current data, while LTM provides the agent with the ability to retain, learn from, and apply knowledge over time” ADA Science6.

Vector Database Memory

More sophisticated approaches utilize vector databases to store embeddings of conversations and knowledge. These embeddings enable semantic search, allowing agents to retrieve relevant information based on meaning rather than exact matching.

As explained in the LangChain blog, “Semantic search addresses these challenges by matching on meaning rather than exact content, making agents more effective at using their stored knowledge” LangChain Blog7.

Structured Memory Systems

Advanced memory systems combine multiple storage mechanisms, organizing memories hierarchically. These systems often employ:

    Quick access buffers for immediate context
    Intermediate storage for recent conversations
    Long-term storage with efficient retrieval mechanisms
    Archival systems for rarely accessed but potentially valuable memories

Agentic Memory Management

The most sophisticated approach involves agentic memory management, where the AI itself decides what to remember, how to organize memories, and when to retrieve them. This approach empowers the agent to maintain an adaptive, personalized memory system that evolves with experience.
The Memory Hierarchy: From Short-Term to Long-Term

The distinction between short-term and long-term memory represents a fundamental organizational principle in both human cognition and AI systems. Understanding this hierarchy helps clarify how information flows through memory systems and influences agent behavior.

Short-Term Memory Characteristics

Short-term memory in AI agents typically exhibits several key characteristics:

    Limited duration: Information persists only for the current session or conversation
    Bounded capacity: Constrained by the context window or attention mechanism
    High accessibility: Immediately available for processing
    Low persistence: Vulnerable to being overwritten or forgotten

In LangGraph, short-term memory is implemented as thread-scoped state, persisted using checkpointers. As explained in the LangGraph documentation, “Short-term memory, or thread-scoped memory, can be recalled at any time from within a single conversational thread with a user. LangGraph manages short-term memory as a part of your agent’s state” LangGraph Documentation8.

Long-Term Memory Characteristics

In contrast, long-term memory systems offer:

    Extended persistence: Information remains available across multiple sessions
    Virtually unlimited capacity: Can store vast amounts of information
    Structured organization: Often categorized by type, relevance, or time
    Variable accessibility: Requires retrieval mechanisms of varying efficiency

LangGraph implements long-term memory through persistent stores that maintain information across conversational threads. The documentation notes, “Long-term memory is shared across conversational threads. It can be recalled at any time and in any thread. Memories are scoped to any custom namespace, not just within a single thread ID” LangGraph Documentation8.

The Relationship Between Memory Types

The relationship between short-term and long-term memory involves bidirectional information flow:

    Encoding: Important information from short-term memory gets selected for long-term storage
    Consolidation: This information is integrated with existing knowledge
    Retrieval: Relevant long-term memories are activated and brought into short-term memory as needed
    Working memory integration: Retrieved memories combine with current context to inform responses

This hierarchical system enables agents to maintain immediate conversational flow while accessing a rich repository of past experiences and knowledge, creating a more human-like interaction experience.

Understanding these foundational concepts of memory in AI systems provides the necessary background for exploring LangGraph’s specific implementations of memory mechanisms, which we’ll examine in the following chapters.
Chapter 3: LangGraph: An Overview
The Evolution from LangChain to LangGraph

The development of LangGraph represents a significant evolutionary step in the tools available for building sophisticated language model applications. To understand LangGraph’s significance, we must first consider its predecessor, LangChain, and the limitations that led to LangGraph’s creation.

LangChain emerged as one of the first comprehensive frameworks for building applications powered by large language models. It provided standardized interfaces for chaining together different components such as prompts, models, and tools, enabling developers to create complex applications without reinventing core infrastructure. While powerful, LangChain’s linear chain structure presented limitations when building more complex agent systems that required cyclical workflows or sophisticated state management.

As applications became more ambitious, developers needed a framework that could support more complex patterns. LangGraph was developed to address these needs, building upon LangChain’s foundation while extending it with capabilities specifically designed for stateful, agentic applications.

As described by one comparative analysis: “LangChain excels at sequential tasks, like retrieving data, processing it, and outputting a result. LangGraph is better suited for complex, adaptive systems that require ongoing interaction, such as virtual assistants that need to maintain context over long conversations” Medium9.

The transition from LangChain to LangGraph parallels the evolution from simple, sequential processing to more sophisticated, graph-based orchestration of AI components. This evolution has been particularly important for implementing memory systems, which require careful state management and complex operational flows.
Core Concepts and Architecture

LangGraph is built around several key concepts that form its architectural foundation. Understanding these concepts is essential for effectively implementing memory systems within the framework.

Graphs as Workflows

The fundamental concept in LangGraph is representing agent workflows as directed graphs. In this model:

    Nodes represent computational steps or components (such as LLM calls, memory operations, or tool usage)
    Edges define the flow of information between nodes
    Conditional edges allow dynamic routing based on the current state

This graph-based approach provides flexibility and expressiveness beyond linear chains, enabling complex patterns such as loops, branching logic, and parallel processing.

State Management

At the heart of LangGraph’s memory capabilities is its sophisticated state management system. The framework maintains state as typed dictionaries (using Python’s TypedDict), ensuring type safety while allowing flexible representation of complex state.

The LangGraph documentation explains: “State in LangGraph is a way to maintain and track information as an AI system processes data. Think of it as the system’s memory” Medium10.

State in LangGraph can include various components:

    Message histories
    User or system metadata
    Tool states and configurations
    Memory objects and references

Message Passing

LangGraph operates on a message-passing paradigm where information flows between nodes through standardized message formats. This approach:

    Ensures clean separation between components
    Enables easy debugging and monitoring
    Facilitates composition of complex workflows

Checkpointing and Persistence

A critical feature for memory implementation is LangGraph’s checkpointing system. Checkpointers save the state at defined points, enabling:

    Resumption of conversations after interruptions
    Recovery from errors
    Maintenance of context across sessions

The checkpointing system forms the foundation for short-term memory in LangGraph, while more sophisticated store implementations enable long-term memory.

Compilation and Execution

LangGraph workflows are defined declaratively but compiled into executable graphs. This compilation step:

    Validates the graph structure
    Optimizes performance
    Associates the graph with persistence mechanisms (checkpointers and stores)

Once compiled, graphs can be executed with various modes, including synchronous, asynchronous, and streaming execution.
State Management in LangGraph

State management is particularly crucial for memory implementation in LangGraph. The framework provides several patterns and techniques for effective state handling.

State Schema Definition

LangGraph uses TypedDict classes to define state schemas, ensuring type safety and clear data structures. A typical state definition might include:

from typing import TypedDict, List
from langchain_core.messages import BaseMessage

class MessagesState(TypedDict):
    messages: List[BaseMessage]
    summary: str  # Optional summary of conversation

This typed approach helps prevent errors and provides clear documentation of the state structure.

State Initialization Patterns

State initialization can follow several patterns, depending on the application needs:

    Default initialization: Starting with empty or predefined values
    Dynamic initialization: Creating initial state based on input parameters
    Restored initialization: Loading state from persistent storage

State Updates via Reducers

LangGraph provides reducers as a pattern for updating state in a controlled manner. Reducers are functions that take the current state and return an updated state, following functional programming principles.

For example, adding messages to conversation history might use a reducer:

def add_message(state: MessagesState, message: BaseMessage) -> MessagesState:
    return {"messages": state["messages"] + [message], "summary": state["summary"]}

State Access Patterns

The framework supports various patterns for accessing state:

    Direct access: Reading state properties directly
    Filtered access: Accessing specific subsets of state
    Computed access: Deriving values from state

State Persistence Strategy

State persistence in LangGraph follows a clear strategy:

    Checkpointers save thread-scoped state (short-term memory)
    Stores maintain cross-thread persistent state (long-term memory)
    Compilation associates graphs with their persistence mechanisms

As noted in the documentation: “LangGraph has a built-in persistence layer, implemented through checkpointers. When you compile a graph with a checkpointer, the checkpointer saves a checkpoint of the graph’s state whenever the state changes” LangGraph Documentation11.

Understanding these core concepts and state management patterns provides the foundation for implementing effective memory systems in LangGraph, which we’ll explore in detail in the following chapters.
Chapter 4: Memory Implementation in LangGraph
Short-Term vs. Long-Term Memory

LangGraph provides a comprehensive framework for implementing both short-term and long-term memory in AI agents. Understanding the distinction between these memory types and their implementation is crucial for building effective agentic systems.

Short-Term Memory Implementation

Short-term memory in LangGraph is implemented as thread-scoped state — information maintained for the duration of a single conversation thread. This state is preserved through checkpointers, which save the entire state whenever it changes.

As described in the LangGraph documentation: “Short-term memory, or thread-scoped memory, can be recalled at any time from within a single conversational thread with a user. LangGraph manages short-term memory as a part of your agent’s state. State is persisted to a database using a checkpointer so the thread can be resumed at any time” LangGraph Documentation8.

The implementation typically includes:

    State definition: Defining a TypedDict that includes message history and other transient data
    Checkpointer configuration: Setting up a persistence mechanism such as MemorySaver (for in-memory storage) or SqliteSaver (for file-based persistence)
    State updates: Maintaining conversation history and context through node functions that update the state

For example, a basic implementation might look like:

from langgraph.checkpoint import SqliteSaver
from typing import TypedDict, List
from langchain_core.messages import BaseMessage

class MessagesState(TypedDict):
    messages: List[BaseMessage]

checkpointer = SqliteSaver("./conversations.sqlite")
graph = builder.compile(checkpointer=checkpointer)

Long-Term Memory Implementation

Long-term memory extends beyond individual conversation threads, allowing information to be shared across multiple interactions. LangGraph implements this through memory stores — persistent data repositories that organize memories by namespace and key.

The documentation explains: “Long-term memory is shared across conversational threads. It can be recalled at any time and in any thread. Memories are scoped to any custom namespace, not just within a single thread ID. LangGraph provides stores to let you save and recall long-term memories” LangGraph Documentation8.

The implementation typically involves:

    Store creation: Initializing a memory store such as InMemoryStore (for development) or PostgresStore (for production)
    Namespace definition: Organizing memories by user, organization, or other relevant dimensions
    Memory operations: Adding functions for storing, retrieving, and searching memories

A basic long-term memory implementation might look like:

from langgraph.store import InMemoryStore
from langchain_openai import OpenAIEmbeddings

# Initialize store with embeddings for semantic search
embeddings = OpenAIEmbeddings()
store = InMemoryStore(embedding_function=embeddings)

# Define namespace for a specific user
user_id = "user123"
namespace = ("memories", user_id)

# Store a memory
memory_id = str(uuid.uuid4())
memory = {"content": "User prefers vegetarian food", "context": "Food preferences"}
store.put(namespace, memory_id, memory)

# Retrieve memories semantically
memories = store.search(namespace, query="What does the user like to eat?")

Complementary Relationships

Short-term and long-term memory in LangGraph work together as complementary systems:

    Short-term memory provides immediate context for the current conversation
    Long-term memory supplies broader context from past interactions
    Important information from short-term memory can be selectively promoted to long-term memory
    Relevant long-term memories can be injected into short-term memory when needed

This dual-memory system mimics human memory processes, creating a more natural and effective interaction model.
Memory Stores and Persistence

LangGraph’s memory persistence functionality is built around a flexible Store interface that supports various backend implementations. Understanding these storage options is essential for implementing robust memory systems.

The BaseStore Interface

The foundation of LangGraph’s memory system is the BaseStore interface, which defines standard operations for memory storage and retrieval:

    put: Store a memory with a namespace and key
    get: Retrieve a specific memory by namespace and key
    delete: Remove a memory by namespace and key
    list_keys: List all keys in a namespace
    search: Find memories based on content or semantic similarity

This consistent interface allows developers to switch between storage backends without changing application logic.

InMemoryStore Implementation

For development and simple applications, LangGraph provides the InMemoryStore implementation, which keeps all data in memory during the application’s lifetime. This store can be configured with an embedding function to enable semantic search:

from langgraph.store import InMemoryStore
from langchain_openai import OpenAIEmbeddings

# Configure with embedding function for semantic search
embeddings = OpenAIEmbeddings()
store = InMemoryStore(embedding_function=embeddings)

While convenient for development, InMemoryStore lacks persistence between application restarts.

PostgresStore Implementation

For production applications requiring persistent storage, LangGraph offers PostgresStore, which leverages PostgreSQL for robust, scalable memory storage:

from langgraph.store import PostgresStore
from langchain_openai import OpenAIEmbeddings

# Configure with database connection and embeddings
embeddings = OpenAIEmbeddings()
store = PostgresStore(
    connection_string="postgresql://user:password@localhost/db",
    embedding_function=embeddings
)

PostgresStore supports both standard and semantic search capabilities, making it suitable for sophisticated memory implementations.

Checkpointers for State Persistence

While stores handle long-term memory, checkpointers manage the persistence of short-term memory (thread state). LangGraph provides several checkpointer implementations:

    MemorySaver: Keeps state in memory (non-persistent)
    AsyncSqliteSaver: Stores state in a SQLite database
    AsyncPostgresSaver: Persists state in a PostgreSQL database

These checkpointers are configured when compiling a graph:

from langgraph.checkpoint import AsyncSqliteSaver

# Initialize checkpointer
checkpointer = AsyncSqliteSaver("./state.sqlite")

# Compile graph with checkpointer
graph = builder.compile(checkpointer=checkpointer)

Integrating Stores with Graph Processing

LangGraph seamlessly integrates stores into the graph processing flow. When compiling a graph, you can provide a store that will be automatically passed to node functions:

# Define a node that accesses the store
def retrieve_memories(state, *, store: BaseStore):
    user_id = state.get("user_id")
    namespace = ("memories", user_id)
    query = state["messages"][-1].content
    memories = store.search(namespace, query=query)
    # Process memories...
    return state

# Compile graph with store
graph = builder.compile(checkpointer=checkpointer, store=my_store)

Cross-Thread Memory Capabilities

One of LangGraph’s most powerful features is its support for cross-thread memory — the ability to share information across different conversation threads. This capability is essential for building truly personalized and contextually aware agents.

Understanding Thread Organization

In LangGraph, conversations are organized into threads, each with its own state history. The framework identifies threads using unique identifiers (thread_ids) which are passed when invoking a graph:

# Invoke graph with a specific thread ID
thread_id = "conversation_123"
config = {"configurable": {"thread_id": thread_id}}
response = graph.invoke({"messages": [input_message]}, config)

By default, threads are isolated — state changes in one thread don’t affect others. Cross-thread memory breaks this isolation, allowing controlled sharing of information.

Implementing Cross-Thread Persistence

Implementing cross-thread persistence involves several key components:

    Store initialization: Creating a shared store that exists outside any particular thread
    Namespace design: Defining how memories are organized across users and contexts
    Memory operations: Implementing functions for storing and retrieving cross-thread memories

A typical implementation pattern follows this structure:

from langgraph.store import InMemoryStore
import uuid

# Initialize shared store
store = InMemoryStore()

# Define a function to store memories
def store_memory(state, config, *, store: BaseStore):
    user_id = config["configurable"]["user_id"]
    namespace = ("memories", user_id)
    content = state["messages"][-1].content
    memory_id = str(uuid.uuid4())
    store.put(namespace, memory_id, {"content": content})
    return state

# Define a function to retrieve memories
def retrieve_memories(state, config, *, store: BaseStore):
    user_id = config["configurable"]["user_id"]
    namespace = ("memories", user_id)
    query = state["messages"][-1].content
    memories = store.search(namespace, query=query)
    # Use memories to enhance response...
    return state

Namespace Organization Strategies

Effective cross-thread memory relies on well-designed namespace organization. Common strategies include:

    User-based namespaces: Organizing memories by user ID (e.g., (“memories”, user_id))
    Type-based sub-namespaces: Further dividing by memory type (e.g., (“preferences”, user_id))
    Domain-specific organization: Creating namespaces based on subject matter (e.g., (“food_preferences”, user_id))

The choice of namespace structure depends on the application’s specific requirements for memory isolation and sharing.

Memory Retrieval Patterns

Cross-thread memory retrieval can follow several patterns:

    Proactive retrieval: Automatically fetching relevant memories at the start of each interaction
    Reactive retrieval: Retrieving memories only when specifically needed
    Hybrid approaches: Combining baseline context with on-demand retrieval

For example, a proactive retrieval implementation might look like:

def prepare_context(state, config, *, store: BaseStore):
    user_id = config["configurable"]["user_id"]
    namespace = ("user_profile", user_id)
    try:
        profile = store.get(namespace, "profile")
        # Add profile information to the system message
        system_message = f"User information: {profile['content']}\n\n{DEFAULT_SYSTEM_MESSAGE}"
        state["system_message"] = system_message
    except KeyError:
        # No profile found, use default system message
        state["system_message"] = DEFAULT_SYSTEM_MESSAGE
    return state

Understanding and effectively implementing these memory capabilities — short-term, long-term, and cross-thread — provides the foundation for building sophisticated agentic systems with LangGraph. In the next chapter, we’ll explore the different types of memories that can be stored and their specific implementation patterns.
Chapter 5: Building Blocks of Agentic Memory
Semantic Memory: Storing and Retrieving Facts

Semantic memory forms the foundation of an agent’s knowledge base, storing factual information that can be recalled and utilized across conversations. In the context of LangGraph agents, semantic memory enables the preservation and retrieval of important facts, user preferences, and domain knowledge.

Core Concepts of Semantic Memory

Semantic memory in AI agents parallels the human capacity for storing general knowledge. It represents information in a structured form, divorced from the specific context in which it was learned. Key characteristics include:

    Factual nature: Contains declarative knowledge about the world and users
    Structured representation: Organized in ways that facilitate efficient retrieval
    Context-independence: Can be applied across different situations

As explained in cognitive science research, “Semantic memory stores knowledge; this is the AI’s factual database, a repository of information that can be accessed when needed” Medium1.

Implementation Approaches

In LangGraph, semantic memory can be implemented through several approaches:

    Simple key-value storage: Storing facts as JSON objects with descriptive keys

store.put(("facts", user_id), "food_preference", {"value": "vegetarian"})

2. Structured knowledge triples: Organizing information as (subject, predicate, object) triples

store.put(("knowledge", user_id), uuid.uuid4(), {
    "subject": "User",
    "predicate": "prefers",
    "object": "vegetarian food"
})

3. Embedded vector representations: Converting facts to vector embeddings for semantic retrieval

fact = "The user prefers vegetarian food"
store.put(("facts", user_id), uuid.uuid4(), {"content": fact})

Retrieval Mechanisms

The power of semantic memory lies in flexible retrieval mechanisms. LangGraph supports several retrieval approaches:

    Direct key lookup: Retrieving specific facts by known keys

preference = store.get(("facts", user_id), "food_preference")

2. Filtering: Finding facts that match specific criteria

dietary_facts = store.search(("facts", user_id), filter={"type": "dietary"})

Semantic search: Finding facts based on meaning rather than exact matching

food_facts = store.search(("facts", user_id), query="What does the user like to eat?")

LangGraph’s recent addition of semantic search capabilities significantly enhances this retrieval process. As the LangChain blog explains, “Semantic search addresses these challenges by matching on meaning rather than exact content, making agents more effective at using their stored knowledge” LangChain Blog7
Get Anil Jain | AI / ML Architect | Data Architect’s stories in your inbox

Join Medium for free to get updates from this writer.

Integration with Agent Workflows

Semantic memory becomes most powerful when integrated into the agent’s workflow. This typically involves:

    Fact extraction: Identifying and extracting important facts from conversations

def extract_facts(text):
    # Use LLM to identify and extract facts
    response = llm.invoke(f"Extract important facts from: {text}")
    return parse_facts(response)

2. Memory storage: Saving extracted facts to semantic memory

def store_facts(state, *, store: BaseStore):
    facts = extract_facts(state["messages"][-1].content)
    user_id = state["user_id"]
    for fact in facts:
        store.put(("facts", user_id), uuid.uuid4(), fact)
    return state

3. Context enhancement: Retrieving relevant facts to inform responses

def enhance_context(state, *, store: BaseStore):
    user_id = state["user_id"]
    query = state["messages"][-1].content
    relevant_facts = store.search(("facts", user_id), query=query)
    fact_context = "\n".join(f"- {fact['content']}" for fact in relevant_facts)
    state["context"] = f"Relevant facts:\n{fact_context}\n\n{state.get('context', '')}"
    return state

By implementing these patterns, LangGraph agents can build and maintain a comprehensive knowledge base that improves the quality and personalization of their responses across interactions.
Episodic Memory: Learning from Experiences

Episodic memory stores records of specific events and experiences, providing agents with a history they can learn from and reference. In LangGraph agents, episodic memory enables the preservation of conversation history, interaction patterns, and outcomes across sessions.

Core Concepts of Episodic Memory

Episodic memory differs from semantic memory in its event-based, contextual nature. Key characteristics include:

    Temporal organization: Memories are tied to specific points in time
    Experiential content: Contains full experiences rather than just extracted facts
    Contextual richness: Preserves the situation and circumstances of the experience

As noted by memory researchers, “Episodic memory stores and organizes memories of personal events. For AI agents, this means storing past user interactions” Decoding ML5.

Implementation Approaches

LangGraph supports several approaches to implementing episodic memory:

    Full conversation storage: Saving entire conversation transcripts

def store_conversation(state, *, store: BaseStore):
    user_id = state["user_id"]
    conversation = {
        "timestamp": datetime.now().isoformat(),
        "messages": [m.dict() for m in state["messages"]]
    }
    store.put(("conversations", user_id), str(uuid.uuid4()), conversation)
    return state

2. Summarized episodes: Storing concise summaries of conversations

def summarize_and_store(state, *, store: BaseStore):
    user_id = state["user_id"]
    messages = state["messages"]
    summary = llm.invoke(f"Summarize this conversation: {format_messages(messages)}")
    episode = {
        "timestamp": datetime.now().isoformat(),
        "summary": summary,
        "key_points": extract_key_points(summary)
    }
    store.put(("episodes", user_id), str(uuid.uuid4()), episode)
    return state

3. Interaction patterns: Recording specific types of interactions and outcomes

def record_interaction(state, *, store: BaseStore):
    user_id = state["user_id"]
    last_exchange = {
        "user_message": state["messages"][-2].content,
        "agent_response": state["messages"][-1].content,
        "timestamp": datetime.now().isoformat(),
        "satisfaction": detect_satisfaction(state["messages"][-1].content)
    }
    store.put(("interactions", user_id), str(uuid.uuid4()), last_exchange)
    return state

Retrieval and Learning Mechanisms

Episodic memory becomes valuable through effective retrieval and learning:

    Similar experience retrieval: Finding past episodes similar to current situations

def find_similar_episodes(state, *, store: BaseStore):
    user_id = state["user_id"]
    current_query = state["messages"][-1].content
    similar_episodes = store.search(("episodes", user_id), query=current_query)
    return similar_episodes

2. Pattern recognition: Identifying recurring patterns in user interactions

def identify_patterns(state, *, store: BaseStore):
    user_id = state["user_id"]
    all_interactions = store.list_values(("interactions", user_id))
    patterns = analyze_patterns(all_interactions)
    return patterns

3. Experience-based learning: Using past episodes to improve future responses

def learn_from_experience(state, *, store: BaseStore):
    user_id = state["user_id"]
    similar_episodes = find_similar_episodes(state, store=store)
    state["learning_context"] = format_learning_examples(similar_episodes)
    return state

Integration with Agent Workflows

Episodic memory is particularly valuable when integrated into the agent’s decision-making:

    Few-shot learning: Using past episodes as examples for the LLM

def prepare_few_shot_examples(state, *, store: BaseStore):
    similar_episodes = find_similar_episodes(state, store=store)
    examples = format_few_shot_examples(similar_episodes)
    state["examples"] = examples
    return state

2. Reflection and improvement: Learning from past successes and failures

def reflect_on_past(state, *, store: BaseStore):
    user_id = state["user_id"]
    past_failures = store.search(("episodes", user_id), filter={"outcome": "negative"})
    reflection = llm.invoke(f"Reflect on these past failures and how to avoid them: {format_episodes(past_failures)}")
    state["reflection"] = reflection
    return state

3. User preference adaptation: Adjusting responses based on observed patterns

def adapt_to_preferences(state, *, store: BaseStore):
    patterns = identify_patterns(state, store=store)
    adaptation_prompt = f"Based on these interaction patterns, adjust your response style: {patterns}"
    state["adaptation"] = adaptation_prompt
    return state

By effectively implementing episodic memory, LangGraph agents can learn from experience, recognize patterns, and continuously improve their interactions with users.
Procedural Memory: Remembering How to Act

Procedural memory encompasses the agent’s knowledge of procedures, routines, and operational guidelines. In LangGraph, procedural memory enables agents to adapt their behavior based on learned preferences and evolving requirements.

Core Concepts of Procedural Memory

Procedural memory differs from declarative memories (semantic and episodic) in its focus on processes and actions. Key characteristics include:

    Action-oriented: Focuses on how to perform tasks rather than facts or events
    Skill-based: Represents learned capabilities and techniques
    Often implicit: May be expressed through behavior rather than explicit recall

As noted in memory research: “Procedural Memory. This term refers to long-term memory for how to perform tasks, similar to a brain’s core instruction set” LangChain Blog12.

Implementation Approaches

In LangGraph, procedural memory can be implemented through several approaches:

    System prompt evolution: Updating the agent’s base instructions over time

def update_system_prompt(state, feedback, *, store: BaseStore):
    user_id = state["user_id"]
    namespace = ("system", user_id)
    try:
        current_prompt = store.get(namespace, "system_prompt")["content"]
    except KeyError:
        current_prompt = DEFAULT_SYSTEM_PROMPT
        
    improved_prompt = llm.invoke(f"""
    Current system prompt: {current_prompt}
    
    User feedback: {feedback}
    
    Improve the system prompt based on this feedback while maintaining its core functionality.
    """)
    
    store.put(namespace, "system_prompt", {"content": improved_prompt})
    return state

2. Tool usage patterns: Storing effective patterns for using tools

def store_tool_pattern(state, tool_name, success, *, store: BaseStore):
    user_id = state["user_id"]
    namespace = ("tool_patterns", user_id)
    
    pattern = {
        "tool": tool_name,
        "input_pattern": extract_pattern(state["messages"][-2].content),
        "success": success,
        "timestamp": datetime.now().isoformat()
    }
    
    store.put(namespace, str(uuid.uuid4()), pattern)
    return state

3. Response strategies: Maintaining effective communication approaches

def update_response_strategy(state, feedback, *, store: BaseStore):
    user_id = state["user_id"]
    namespace = ("strategies", user_id)
    
    context = state["messages"][-3].content  # User query
    response = state["messages"][-2].content  # Agent response
    
    if feedback.lower().startswith("good"):
        success = True
        label = "effective"
    else:
        success = False
        label = "ineffective"
        
    strategy = {
        "context": context,
        "response": response,
        "success": success,
        "feedback": feedback,
        "label": label
    }
    
    store.put(namespace, str(uuid.uuid4()), strategy)
    return state

Retrieval and Application Mechanisms

The value of procedural memory lies in its application to guide agent behavior:

    System prompt retrieval: Fetching and applying the evolved system prompt

def apply_system_prompt(state, *, store: BaseStore):
    user_id = state["user_id"]
    namespace = ("system", user_id)
    
    try:
        system_prompt = store.get(namespace, "system_prompt")["content"]
    except KeyError:
        system_prompt = DEFAULT_SYSTEM_PROMPT
        
    state["system_prompt"] = system_prompt
    return state

2. Tool strategy selection: Choosing effective tool usage patterns

def select_tool_strategy(state, tool_name, *, store: BaseStore):
    user_id = state["user_id"]
    namespace = ("tool_patterns", user_id)
    
    patterns = store.search(namespace, filter={"tool": tool_name, "success": True})
    if patterns:
        # Sort by recency
        sorted_patterns = sorted(patterns, key=lambda p: p["timestamp"], reverse=True)
        state["tool_strategy"] = sorted_patterns[0]
    
    return state

3. Response style adaptation: Applying learned communication strategies

def adapt_response_style(state, *, store: BaseStore):
    user_id = state["user_id"]
    namespace = ("strategies", user_id)
    
    query = state["messages"][-1].content
    effective_strategies = store.search(namespace, query=query, filter={"label": "effective"})
    
    if effective_strategies:
        strategy_examples = format_strategy_examples(effective_strategies)
        state["strategy_guidance"] = f"Consider these effective response strategies: {strategy_examples}"
    
    return state

Integration with Agent Workflows

Procedural memory becomes particularly powerful when integrated into the agent’s decision-making process:

    Dynamic system prompting: Applying evolved system prompts at conversation start

def initialize_conversation(state, *, store: BaseStore):
    apply_system_prompt(state, store=store)
    # Additional initialization...
    return state

2. Tool usage optimization: Guiding tool selection and application

def optimize_tool_usage(state, *, store: BaseStore):
    tool_name = determine_needed_tool(state)
    if tool_name:
        select_tool_strategy(state, tool_name, store=store)
    # Process tool selection...
    return state

3. Adaptive communication: Tailoring communication style based on learned patterns

def generate_response(state, *, store: BaseStore):
    adapt_response_style(state, store=store)
    
    # Combine various context elements
    prompt = f"""
    System: {state['system_prompt']}
    
    {state.get('strategy_guidance', '')}
    
    User query: {state['messages'][-1].content}
    """
    
    response = llm.invoke(prompt)
    # Process response...
    return state

By effectively implementing procedural memory, LangGraph agents can continuously refine their operation, adapt to user preferences, and improve their effectiveness over time. The combination of semantic, episodic, and procedural memory creates a comprehensive memory system that enables truly agentic behavior.
Chapter 6: Practical Implementation
Creating a Memory-Enabled Agent

Implementing a memory-enabled agent in LangGraph involves combining the theoretical concepts we’ve explored into a practical, functional system. This section provides a step-by-step approach to creating such an agent, drawing from established patterns and best practices.

Project Structure and Dependencies

A typical memory-enabled agent project includes several core components:

memory_agent/
├── requirements.txt
├── config.py           # Configuration settings
├── models/
│   ├── state.py        # State definitions
│   └── memory.py       # Memory models
├── nodes/
│   ├── memory.py       # Memory operations
│   ├── llm.py          # LLM interactions
│   └── tools.py        # Tool implementations
├── graph.py            # Graph definition
└── main.py             # Application entry point

The key dependencies include:

langchain>=0.0.267
langgraph>=0.0.15
langchain-openai>=0.0.2
pydantic>=2.0

State Definition

The first step is defining the agent’s state structure to support memory operations:

# models/state.py
from typing import Dict, List, Optional, TypedDict
from langchain_core.messages import BaseMessage

class MessagesState(TypedDict):
    """State for the conversation agent."""
    messages: List[BaseMessage]
    memory_context: Optional[str]

Memory Functions Implementation

Next, we implement core memory operations as node functions:

# nodes/memory.py
from typing import Annotated
from langgraph.store import BaseStore
from langchain_core.tools import ToolMessage
from langchain_core.tools import tool
import uuid
from models.state import MessagesState

@tool
def upsert_memory(content: str, context: str, memory_id: Optional[str] = None, 
                  *, config: Annotated[dict, "InjectedToolArg"], 
                  store: Annotated[BaseStore, "InjectedToolArg"]):
    """Store or update a memory."""
    mem_id = memory_id or str(uuid.uuid4())
    user_id = config["configurable"]["user_id"]
    store.put(("memories", user_id), key=mem_id, 
              value={"content": content, "context": context})
    return f"Stored memory: {content}"

def store_memory(state: MessagesState, config: dict, *, store: BaseStore):
    """Process and store memories from tool calls."""
    tool_calls = state["messages"][-1].tool_calls
    results = []
    
    for tc in tool_calls:
        if tc["name"] == "upsert_memory":
            content = tc["args"]["content"]
            context = tc["args"]["context"]
            result = upsert_memory.invoke({
                "content": content, 
                "context": context, 
                "config": config, 
                "store": store
            })
            results.append(result)
    
    state["messages"].append(ToolMessage(content="\n".join(results), 
                                        tool_call_id=tool_calls[0]["id"]))
    return state

def retrieve_memories(state: MessagesState, config: dict, *, store: BaseStore):
    """Retrieve relevant memories for the current conversation."""
    user_id = config["configurable"]["user_id"]
    namespace = ("memories", user_id)
    query = state["messages"][-1].content
    
    memories = store.search(namespace, query=query)
    memory_text = "\n".join([f"- {mem.value['content']}" for mem in memories])
    
    if memory_text:
        state["memory_context"] = f"Relevant memories:\n{memory_text}"
    
    return state

LLM Integration

We then implement the LLM interaction layer:

# nodes/llm.py
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import SystemMessage, AIMessage
from models.state import MessagesState
from nodes.memory import upsert_memory

SYSTEM_PROMPT = """You are a helpful assistant with memory capabilities. 
When you learn important information about the user or the conversation, 
use the upsert_memory tool to store it for future reference."""

def create_llm_chain():
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="memory_context", optional=True)
    ])
    
    return prompt | llm.bind_tools([upsert_memory])

def call_model(state: MessagesState, config: dict):
    """Call the LLM to generate a response."""
    llm_chain = create_llm_chain()
    response = llm_chain.invoke(state)
    state["messages"].append(AIMessage(content=response.content, 
                                      tool_calls=response.tool_calls))
    return state

Graph Assembly

Finally, we construct the agent graph:

# graph.py
from langgraph.graph import StateGraph
from langgraph.store import InMemoryStore
from langgraph.checkpoint import SqliteSaver
from langchain_openai import OpenAIEmbeddings
from models.state import MessagesState
from nodes.memory import store_memory, retrieve_memories
from nodes.llm import call_model

def create_memory_agent():
    # Initialize store with embeddings
    embeddings = OpenAIEmbeddings()
    memory_store = InMemoryStore(embedding_function=embeddings)
    
    # Initialize checkpointer
    checkpointer = SqliteSaver("./memory_agent.sqlite")
    
    # Build graph
    builder = StateGraph(MessagesState)
    
    # Add nodes
    builder.add_node("retrieve_memories", retrieve_memories)
    builder.add_node("call_model", call_model)
    builder.add_node("store_memory", store_memory)
    
    # Define edges
    builder.add_edge("retrieve_memories", "call_model")
    
    # Define conditional edges
    def has_tool_calls(state: MessagesState):
        if not state["messages"]:
            return "retrieve_memories"
            
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "store_memory"
        return "retrieve_memories"
    
    builder.add_conditional_edges("call_model", has_tool_calls, 
                                 ["store_memory", "retrieve_memories"])
    builder.add_edge("store_memory", "call_model")
    
    # Set entry point
    builder.set_entry_point("retrieve_memories")
    
    # Compile graph
    return builder.compile(checkpointer=checkpointer, store=memory_store)

memory_agent = create_memory_agent()

Running the Agent

With all components in place, we can now run the agent:

# main.py
from graph import memory_agent
from langchain_core.messages import HumanMessage

def run_conversation(user_input, user_id="default_user", thread_id=None):
    """Run a conversation turn with the memory agent."""
    thread_id = thread_id or f"thread_{user_id}"
    config = {
        "configurable": {
            "thread_id": thread_id,
            "user_id": user_id
        }
    }
    
    messages = [HumanMessage(content=user_input)]
    response = memory_agent.invoke({"messages": messages}, config)
    
    return response["messages"][-1].content

# Example usage
if __name__ == "__main__":
    print(run_conversation("Hi, my name is Alice and I love Italian food."))
    print(run_conversation("What kind of food do I like?", user_id="alice"))

This implementation demonstrates the core patterns for a memory-enabled agent in LangGraph. The agent can store memories about users, retrieve relevant memories for context, and maintain conversation state across interactions.
Store Class Usage

LangGraph’s store class is the foundation for implementing long-term memory. Understanding how to effectively use this class is crucial for building sophisticated memory systems.

Store Class Hierarchy

LangGraph implements memory storage through a hierarchy of classes:

    BaseStore: The abstract base class defining the store interface
    InMemoryStore: A non-persistent implementation for development
    PostgresStore: A production-ready implementation using PostgreSQL

The following example demonstrates the initialization of these stores:

from langgraph.store import InMemoryStore, PostgresStore
from langchain_openai import OpenAIEmbeddings

# Initialize embedding function
embeddings = OpenAIEmbeddings()

# In-memory store for development
in_memory_store = InMemoryStore(embedding_function=embeddings)

# PostgreSQL store for production
postgres_store = PostgresStore(
    connection_string="postgresql://user:password@localhost/db",
    embedding_function=embeddings
)

Core Operations

All store implementations provide a consistent set of operations:

    Putting values:

# Store a value under a namespace and key
store.put(
    namespace=("users", "user123"),  # Namespace tuple
    key="preferences",               # Unique key
    value={"likes": "Italian food", "dislikes": "Spicy food"}  # JSON-serializable value
)

2. Getting values:

# Retrieve a specific value
try:
    preferences = store.get(("users", "user123"), "preferences")
    print(f"User preferences: {preferences}")
except KeyError:
    print("No preferences found")

3. Listing keys:

# List all keys in a namespace
keys = store.list_keys(("users", "user123"))
print(f"Available data for user: {keys}")

4. Searching by content:

# Search using string-based filtering
italian_lovers = store.search(
    namespace=("users",),
    filter={"likes": "Italian"}
)
print(f"Found {len(italian_lovers)} users who like Italian food")

5. Semantic search:

# Search by meaning rather than exact match
pasta_fans = store.search(
    namespace=("users",),
    query="Who enjoys pasta dishes?"
)
print(f"Found {len(pasta_fans)} potential pasta enthusiasts")

Namespace Organization

Effective use of the store class relies on well-designed namespace organization:

# User-specific data
store.put(("users", user_id), "profile", user_profile)
store.put(("users", user_id, "preferences"), "food", food_preferences)
store.put(("users", user_id, "preferences"), "travel", travel_preferences)

# Organization-wide data
store.put(("organizations", org_id), "settings", org_settings)
store.put(("organizations", org_id, "members"), user_id, user_role)

# Shared knowledge base
store.put(("knowledge", "food"), "italian", italian_food_facts)
store.put(("knowledge", "travel"), "italy", italy_travel_info)

This hierarchical organization facilitates:

    Precise retrieval of specific information
    Bulk operations on related data
    Controlled sharing across users and contexts

Integration with Graph Nodes

Store objects are seamlessly integrated with graph nodes through dependency injection:

def retrieve_user_context(state, config, *, store: BaseStore):
    """Node function that uses the store to retrieve user context."""
    user_id = config["configurable"]["user_id"]
    
    # Retrieve user profile
    try:
        profile = store.get(("users", user_id), "profile")
        state["user_profile"] = profile
    except KeyError:
        state["user_profile"] = {"new_user": True}
    
    # Retrieve relevant preferences using semantic search
    query = state["messages"][-1].content
    preferences = store.search(("users", user_id, "preferences"), query=query)
    
    if preferences:
        state["user_preferences"] = [p.value for p in preferences]
    
    return state

Asynchronous Operations

For high-performance applications, stores also provide asynchronous versions of all operations:

async def async_context_retrieval(state, config, *, store: BaseStore):
    """Asynchronous node function for context retrieval."""
    user_id = config["configurable"]["user_id"]
    query = state["messages"][-1].content
    
    # Parallel retrieval of profile and preferences
    profile_task = asyncio.create_task(
        store.aget(("users", user_id), "profile")
    )
    
    preferences_task = asyncio.create_task(
        store.asearch(("users", user_id, "preferences"), query=query)
    )
    
    # Await results
    try:
        profile = await profile_task
        state["user_profile"] = profile
    except KeyError:
        state["user_profile"] = {"new_user": True}
    
    preferences = await preferences_task
    if preferences:
        state["user_preferences"] = [p.value for p in preferences]
    
    return state

Customizing Embedding Logic

For advanced use cases, you can customize the embedding function used for semantic search:

from langchain_community.embeddings import HuggingFaceEmbeddings

# Custom embedding function
async def custom_embedding_function(texts):
    model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return await model.aembed_documents(texts)

# Store with custom embeddings
store = InMemoryStore(
    embedding_function=custom_embedding_function
)

Understanding these store class patterns enables the implementation of sophisticated memory systems tailored to specific application requirements.
Memory Persistence Techniques

Effective memory persistence is essential for building agents that maintain context and learn over time. LangGraph provides several techniques for implementing robust memory persistence.

Checkpointer-Based Persistence

The simplest form of persistence in LangGraph uses checkpointers to save thread state:

from langgraph.checkpoint import SqliteSaver, AsyncPostgresSaver

# SQLite-based persistence (file-based)
sqlite_checkpointer = SqliteSaver("./agent_memory.sqlite")

# PostgreSQL-based persistence (server-based)
postgres_checkpointer = AsyncPostgresSaver(
    connection_string="postgresql://user:password@localhost/db",
    table_name="agent_checkpoints"
)

# Compile graph with checkpointer
graph = builder.compile(checkpointer=sqlite_checkpointer)

Checkpointer-based persistence:

    Saves the entire state on each update
    Maintains thread-specific history
    Enables conversation resumption after interruptions

Store-Based Persistence

For more sophisticated memory needs, LangGraph’s store-based persistence offers greater flexibility:

from langgraph.store import PostgresStore
from langchain_openai import OpenAIEmbeddings

# Initialize embeddings
embeddings = OpenAIEmbeddings()

# Create persistent store
store = PostgresStore(
    connection_string="postgresql://user:password@localhost/db",
    embedding_function=embeddings
)

# Compile graph with store
graph = builder.compile(checkpointer=checkpointer, store=store)

Store-based persistence:

    Enables cross-thread memory sharing
    Supports semantic search and filtering
    Provides fine-grained control over data organization

Combined Approach

Most production applications combine both approaches:

# Initialize persistence components
checkpointer = AsyncPostgresSaver(
    connection_string=DB_CONNECTION,
    table_name="thread_state"
)

store = PostgresStore(
    connection_string=DB_CONNECTION,
    embedding_function=embeddings,
    table_name="long_term_memory"
)

# Compile graph with both
graph = builder.compile(checkpointer=checkpointer, store=store)

This combination enables:

    Thread-specific conversation state (via checkpointer)
    Cross-thread shared knowledge (via store)
    Complete memory persistence architecture

Manual Memory Management

For cases requiring custom memory management, LangGraph allows direct manipulation:

def manual_memory_manager(state, config, *, store: BaseStore, checkpointer):
    """Custom memory management node."""
    user_id = config["configurable"]["user_id"]
    thread_id = config["configurable"]["thread_id"]
    
    # Extract important information
    last_message = state["messages"][-1].content
    memory_worthy = is_memory_worthy(last_message)
    
    if memory_worthy:
        # Store in long-term memory
        memory_id = str(uuid.uuid4())
        store.put(
            namespace=("memories", user_id),
            key=memory_id,
            value={"content": extract_memory(last_message), "source": "conversation"}
        )
        
        # Update thread metadata
        thread_metadata = {
            "last_active": datetime.now().isoformat(),
            "memory_ids": retrieve_thread_memory_ids(thread_id) + [memory_id]
        }
        store.put(("threads", "metadata"), thread_id, thread_metadata)
    
    return state

Memory Expiration and Cleanup

For production systems, implementing memory expiration and cleanup is important:

async def cleanup_old_memories(store: BaseStore):
    """Periodically clean up old, unused memories."""
    # Get all user namespaces
    user_namespaces = set()
    all_namespaces = await store.alist_namespaces()
    
    for ns in all_namespaces:
        if len(ns) >= 2 and ns[0] == "memories":
            user_namespaces.add(ns)
    
    # Process each user namespace
    for namespace in user_namespaces:
        # Get all memories with timestamps
        memories = await store.alist_values(namespace)
        
        # Filter for old memories (older than 90 days)
        ninety_days_ago = datetime.now() - timedelta(days=90)
        old_memories = [
            mem for mem in memories 
            if "timestamp" in mem.value 
            and datetime.fromisoformat(mem.value["timestamp"]) < ninety_days_ago
        ]
        
        # Delete old memories
        for mem in old_memories:
            await store.adelete(namespace, mem.key)

Cross-Thread Memory Implementation

Implementing cross-thread memory requires careful namespace design:

def store_cross_thread_memory(state, config, *, store: BaseStore):
    """Store memory accessible across conversation threads."""
    user_id = config["configurable"]["user_id"]
    thread_id = config["configurable"]["thread_id"]
    
    # Extract memory-worthy information
    memory_content = extract_memory_content(state["messages"][-1].content)
    memory_context = extract_memory_context(state["messages"])
    
    if memory_content:
        # Store in user's memory namespace
        memory_id = str(uuid.uuid4())
        memory = {
            "content": memory_content,
            "context": memory_context,
            "source_thread": thread_id,
            "timestamp": datetime.now().isoformat(),
            "accessed_count": 0
        }
        
        store.put(("memories", user_id), memory_id, memory)
        
        # Log memory creation in thread metadata
        thread_data = {"last_memory_creation": datetime.now().isoformat()}
        store.put(("threads", "metadata"), thread_id, thread_data)
    
    return state

def retrieve_cross_thread_memory(state, config, *, store: BaseStore):
    """Retrieve memories from across conversation threads."""
    user_id = config["configurable"]["user_id"]
    query = state["messages"][-1].content
    
    # Search user's memories
    memories = store.search(("memories", user_id), query=query)
    
    if memories:
        # Update access counts
        for mem in memories:
            memory = mem.value
            memory["accessed_count"] += 1
            store.put(("memories", user_id), mem.key, memory)
        
        # Format memories for context
        memory_context = format_memories_for_context(memories)
        state["memory_context"] = memory_context
    
    return state

These persistence techniques enable the implementation of sophisticated memory systems that maintain context, learn from interactions, and provide personalized experiences across conversations.
Semantic Search Integration

Semantic search represents a powerful capability for memory-enabled agents, allowing them to retrieve information based on meaning rather than exact matching. LangGraph’s integration of semantic search enhances memory retrieval capabilities significantly.

Configuring Embedding Models

The first step in implementing semantic search is configuring appropriate embedding models:

from langchain_openai import OpenAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings

# Option 1: OpenAI embeddings
openai_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# Option 2: Open-source embeddings
hf_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Initialize store with embeddings
store = InMemoryStore(embedding_function=openai_embeddings)

Storing Content for Semantic Retrieval

When storing memories, ensure they contain rich text fields for embedding:

def store_semantic_memory(state, config, *, store: BaseStore):
    """Store memory with content suitable for semantic retrieval."""
    user_id = config["configurable"]["user_id"]
    
    # Extract memory content
    last_message = state["messages"][-1].content
    memory_content = extract_memory_content(last_message)
    
    if memory_content:
        # Create memory with rich text fields
        memory = {
            "content": memory_content,
            "summary": summarize_content(memory_content),
            "keywords": extract_keywords(memory_content),
            "timestamp": datetime.now().isoformat()
        }
        
        # Store with unique ID
        memory_id = str(uuid.uuid4())
        store.put(("memories", user_id), memory_id, memory)
    
    return state

Semantic Search Implementation

With memories properly stored, semantic search enables powerful retrieval:

def retrieve_with_semantic_search(state, config, *, store: BaseStore):
    """Retrieve memories using semantic search."""
    user_id = config["configurable"]["user_id"]
    query = state["messages"][-1].content
    
    # Perform semantic search
    memories = store.search(
        namespace=("memories", user_id),
        query=query,
        limit=5  # Return top 5 matches
    )
    
    if memories:
        # Format memories for context
        memory_text = "\n".join([
            f"- {mem.value['content']} (Relevance: {mem.score:.2f})"
            for mem in memories
        ])
        state["memory_context"] = f"Relevant memories:\n{memory_text}"
    
    return state

Hybrid Search Implementation

For more sophisticated retrieval, combine semantic search with keyword filtering:

def hybrid_memory_search(state, config, *, store: BaseStore):
    """Combine semantic search with keyword filtering."""
    user_id = config["configurable"]["user_id"]
    query = state["messages"][-1].content
    
    # Extract keywords for filtering
    keywords = extract_keywords(query)
    
    # Construct filter based on keywords
    filter_condition = None
    if keywords:
        # Simple OR condition for demonstration
        filter_condition = {"keywords": {"$in": keywords}}
    
    # Perform semantic search with filter
    memories = store.search(
        namespace=("memories", user_id),
        query=query,
        filter=filter_condition,
        limit=5
    )
    
    if memories:
        # Format memories for context
        memory_text = format_memories_for_context(memories)
        state["memory_context"] = memory_text
    
    return state

Configuring Field-Specific Search

LangGraph allows configuration of which fields to include in semantic search:

# Example using langgraph.json configuration
{
  "store": {
    "index": {
      "embed": "openai:text-embedding-3-small",
      "dims": 1536,
      "fields": ["content", "summary"]  # Fields to include in embedding
    }
  }
}

In code, this can be configured during store initialization:

store = InMemoryStore(
    embedding_function=embeddings,
    embedding_fields=["content", "summary"]  # Fields to include in embedding
)

Implementing Memory Relevance Scoring

For advanced applications, implement custom relevance scoring:

def score_memory_relevance(state, config, *, store: BaseStore):
    """Score and filter memories based on relevance to current context."""
    user_id = config["configurable"]["user_id"]
    query = state["messages"][-1].content
    
    # Retrieve memories with scores
    raw_memories = store.search(
        namespace=("memories", user_id),
        query=query,
        limit=10  # Get more than needed for filtering
    )
    
    # Apply custom relevance criteria
    relevant_memories = []
    for mem in raw_memories:
        # Base score from vector similarity
        base_score = mem.score
        
        # Adjust based on recency
        timestamp = datetime.fromisoformat(mem.value["timestamp"])
        days_old = (datetime.now() - timestamp).days
        recency_factor = max(0.5, 1.0 - (days_old / 100))
        
        # Adjust based on access frequency
        access_count = mem.value.get("accessed_count", 0)
        frequency_factor = min(1.5, 1.0 + (access_count / 20))
        
        # Calculate final score
        final_score = base_score * recency_factor * frequency_factor
        
        # Store adjusted score
        mem.adjusted_score = final_score
        relevant_memories.append(mem)
    
    # Sort by adjusted score and take top results
    relevant_memories.sort(key=lambda m: m.adjusted_score, reverse=True)
    top_memories = relevant_memories[:5]
    
    if top_memories:
        # Format memories for context
        memory_text = "\n".join([
            f"- {mem.value['content']} (Relevance: {mem.adjusted_score:.2f})"
            for mem in top_memories
        ])
        state["memory_context"] = f"Relevant memories:\n{memory_text}"
    
    return state

Semantic Search for Memory Maintenance

Semantic search can also help maintain memory quality:

def detect_redundant_memories(store: BaseStore, user_id: str):
    """Identify redundant memories that could be merged or pruned."""
    # Get all memories for user
    namespace = ("memories", user_id)
    all_memories = store.list_values(namespace)
    
    redundant_groups = []
    processed_keys = set()
    
    # Check each memory against others
    for mem in all_memories:
        if mem.key in processed_keys:
            continue
            
        # Use the memory's content as search query
        similar_memories = store.search(
            namespace=namespace,
            query=mem.value["content"],
            limit=5
        )
        
        # Filter out self and low similarity
        similar_group = [
            m for m in similar_memories
            if m.key != mem.key and m.score > 0.85  # High similarity threshold
        ]
        
        if similar_group:
            # Add original memory to group
            group = [mem] + similar_group
            redundant_groups.append(group)
            
            # Mark all as processed
            processed_keys.update(m.key for m in group)
    
    return redundant_groups

These semantic search integration techniques significantly enhance the ability of LangGraph agents to maintain and utilize memory effectively. By retrieving information based on meaning rather than exact matching, agents can provide more relevant and contextually appropriate responses across a wide range of interactions.
Chapter 7: Advanced Memory Techniques
Vector Databases for Memory Enhancement

While LangGraph’s built-in storage capabilities are sufficient for many applications, integrating specialized vector databases can enhance memory capabilities for large-scale or performance-critical implementations.

Vector Database Options

Several vector databases can be integrated with LangGraph:

    Pinecone: Specialized for vector similarity search at scale
    Weaviate: Knowledge graph and vector search combined
    Chroma: Open-source embedding database
    Qdrant: High-performance vector search engine
    MongoDB Atlas: Document database with vector search capabilities

Custom Store Implementation

LangGraph allows custom store implementations for integrating vector databases:

from typing import Any, Dict, List, Optional, Tuple
from langgraph.store import BaseStore, BaseValue

class PineconeStore(BaseStore):
    """Custom store implementation using Pinecone."""
    
    def __init__(self, index_name: str, embedding_function: callable):
        """Initialize Pinecone store."""
        import pinecone
        
        self.index = pinecone.Index(index_name)
        self.embedding_function = embedding_function
    
    def put(self, namespace: Tuple[str, ...], key: str, value: Dict[str, Any]) -> None:
        """Store value in Pinecone."""
        # Create vector from value content
        text = self._get_text_for_embedding(value)
        vector = self.embedding_function([text])[0]
        
        # Create metadata from value
        metadata = {**value, "namespace": "::".join(namespace)}
        
        # Upsert to Pinecone
        self.index.upsert(
            vectors=[(key, vector, metadata)],
            namespace="::".join(namespace)
        )
    
    def get(self, namespace: Tuple[str, ...], key: str) -> Dict[str, Any]:
        """Retrieve value from Pinecone."""
        result = self.index.fetch(
            ids=[key],
            namespace="::".join(namespace)
        )
        
        if not result.vectors:
            raise KeyError(f"No value found for {namespace}:{key}")
        
        # Extract value from metadata
        vector_data = list(result.vectors.values())[0]
        return {k: v for k, v in vector_data.metadata.items() if k != "namespace"}
    
    def delete(self, namespace: Tuple[str, ...], key: str) -> None:
        """Delete value from Pinecone."""
        self.index.delete(
            ids=[key],
            namespace="::".join(namespace)
        )
    
    def search(self, namespace: Tuple[str, ...], query: Optional[str] = None, 
               filter: Optional[Dict[str, Any]] = None, limit: int = 10) -> List[BaseValue]:
        """Search values in Pinecone."""
        if query:
            # Create query vector
            query_vector = self.embedding_function([query])[0]
            
            # Translate filter to Pinecone format
            pinecone_filter = self._translate_filter(filter) if filter else None
            
            # Perform vector search
            results = self.index.query(
                vector=query_vector,
                namespace="::".join(namespace),
                filter=pinecone_filter,
                top_k=limit,
                include_metadata=True
            )
            
            # Convert to BaseValue format
            return [
                BaseValue(
                    key=match.id,
                    value={k: v for k, v in match.metadata.items() if k != "namespace"},
                    score=match.score
                )
                for match in results.matches
            ]
        elif filter:
            # Non-vector filtering requires separate implementation
            # This is a simplified example - production code would need more
            pinecone_filter = self._translate_filter(filter)
            results = self.index.query(
                vector=[0] * 1536,  # Dummy vector
                namespace="::".join(namespace),
                filter=pinecone_filter,
                top_k=limit,
                include_metadata=True
            )
            
            return [
                BaseValue(
                    key=match.id,
                    value={k: v for k, v in match.metadata.items() if k != "namespace"},
                    score=0.0  # No relevance score for non-vector queries
                )
                for match in results.matches
            ]
        else:
            # Neither query nor filter provided
            return []
    
    def _get_text_for_embedding(self, value: Dict[str, Any]) -> str:
        """Extract text for embedding from value."""
        # Prioritize specific fields for embedding
        for field in ["content", "text", "summary", "description"]:
            if field in value and isinstance(value[field], str):
                return value[field]
        
        # Fallback to concatenating all string values
        text_parts = []
        for k, v in value.items():
            if isinstance(v, str):
                text_parts.append(f"{k}: {v}")
        
        return " ".join(text_parts)
    
    def _translate_filter(self, filter: Dict[str, Any]) -> Dict[str, Any]:
        """Translate generic filter to Pinecone format."""
        # Simplified translation - production code would need more
        pinecone_filter = {}
        
        for k, v in filter.items():
            if isinstance(v, dict) and "$in" in v:
                pinecone_filter[k] = {"$in": v["$in"]}
            else:
                pinecone_filter[k] = {"$eq": v}
        
        return pinecone_filter

Integration with LangGraph

Once implemented, the custom store can be used with LangGraph:

from langchain_openai import OpenAIEmbeddings

# Initialize embedding function
embeddings = OpenAIEmbeddings()

# Initialize custom store
pinecone_store = PineconeStore(
    index_name="agent-memories",
    embedding_function=lambda texts: [e for e in embeddings.embed_documents(texts)]
)

# Compile graph with custom store
graph = builder.compile(checkpointer=checkpointer, store=pinecone_store)

Hybrid Storage Architecture

For advanced applications, implement a hybrid storage architecture:

class HybridMemoryStore(BaseStore):
    """Hybrid memory store using different backends for different memory types."""
    
    def __init__(self, vector_store, metadata_store, embedding_function):
        """Initialize hybrid store."""
        self.vector_store = vector_store  # For semantic search
        self.metadata_store = metadata_store  # For metadata and relationships
        self.embedding_function = embedding_function
    
    def put(self, namespace, key, value):
        """Store in both backends."""
        # Store content for vector search
        self.vector_store.put(namespace, key, value)
        
        # Store metadata and relationships
        self.metadata_store.put(namespace, key, value)
    
    def get(self, namespace, key):
        """Get from metadata store (more complete)."""
        return self.metadata_store.get(namespace, key)
    
    def delete(self, namespace, key):
        """Delete from both backends."""
        self.vector_store.delete(namespace, key)
        self.metadata_store.delete(namespace, key)
    
    def search(self, namespace, query=None, filter=None, limit=10):
        """Perform hybrid search across backends."""
        if query and filter:
            # Vector search with post-filtering
            results = self.vector_store.search(namespace, query, limit=limit*2)
            
            # Manual filtering
            filtered_results = []
            for result in results:
                metadata = self.metadata_store.get(namespace, result.key)
                if self._matches_filter(metadata, filter):
                    filtered_results.append(result)
                
                if len(filtered_results) >= limit:
                    break
            
            return filtered_results[:limit]
        elif query:
            # Pure vector search
            return self.vector_store.search(namespace, query, limit=limit)
        elif filter:
            # Metadata filtering without vector search
            # Get all keys that match filter
            matched_keys = []
            all_keys = self.metadata_store.list_keys(namespace)
            
            for key in all_keys:
                value = self.metadata_store.get(namespace, key)
                if self._matches_filter(value, filter):
                    matched_keys.append(key)
                    
                    if len(matched_keys) >= limit:
                        break
            
            # Construct result objects
            return [
                BaseValue(
                    key=key,
                    value=self.metadata_store.get(namespace, key),
                    score=0.0
                )
                for key in matched_keys[:limit]
            ]
        else:
            return []
    
    def _matches_filter(self, value, filter):
        """Check if value matches filter criteria."""
        for k, v in filter.items():
            if k not in value:
                return False
            
            if isinstance(v, dict):
                # Handle operators like $in
                if "$in" in v and value[k] not in v["$in"]:
                    return False
            elif value[k] != v:
                return False
        
        return True

Memory Cache Strategies

For performance-critical applications, implement memory caching:

class CachedMemoryStore(BaseStore):
    """Memory store with caching layer."""
    
    def __init__(self, underlying_store, cache_size=1000):
        """Initialize cached store."""
        self.store = underlying_store
        self.cache = {}
        self.cache_size = cache_size
        self.cache_hits = 0
        self.cache_misses = 0
    
    def put(self, namespace, key, value):
        """Store and update cache."""
        self.store.put(namespace, key, value)
        
        # Update cache
        cache_key = self._make_cache_key(namespace, key)
        self.cache[cache_key] = value
        
        # Prune cache if needed
        if len(self.cache) > self.cache_size:
            # Simple LRU implementation - remove random entry
            # A production system would use a proper LRU cache
            self.cache.pop(next(iter(self.cache)))
    
    def get(self, namespace, key):
        """Get with cache."""
        cache_key = self._make_cache_key(namespace, key)
        
        # Check cache
        if cache_key in self.cache:
            self.cache_hits += 1
            return self.cache[cache_key]
        
        # Cache miss
        self.cache_misses += 1
        value = self.store.get(namespace, key)
        
        # Update cache
        self.cache[cache_key] = value
        return value
    
    def delete(self, namespace, key):
        """Delete and update cache."""
        self.store.delete(namespace, key)
        
        # Update cache
        cache_key = self._make_cache_key(namespace, key)
        if cache_key in self.cache:
            del self.cache[cache_key]
    
    def search(self, namespace, query=None, filter=None, limit=10):
        """Search (bypass cache)."""
        # Search operations bypass cache
        return self.store.search(namespace, query, filter, limit)
    
    def _make_cache_key(self, namespace, key):
        """Create cache key from namespace and key."""
        return f"{':'.join(namespace)}:{key}"
    
    def get_cache_stats(self):
        """Return cache statistics."""
        total = self.cache_hits + self.cache_misses
        hit_rate = self.cache_hits / total if total > 0 else 0
        return {
            "hits": self.cache_hits,
            "misses": self.cache_misses,
            "hit_rate": hit_rate,
            "size": len(self.cache),
            "capacity": self.cache_size
        }

These advanced memory store implementations enable sophisticated memory capabilities for LangGraph agents, supporting large-scale, high-performance applications with diverse memory requirements.
Memory Summarization and Compression

As conversations grow and memories accumulate, managing their size becomes critical for both efficiency and context window utilization. Memory summarization and compression techniques help maintain a useful record while minimizing storage and processing overhead.

Conversation Summarization

Implement conversation summarization to maintain context with reduced token usage:

from langchain_openai import ChatOpenAI

def summarize_conversation(messages, max_tokens=500):
    """Summarize a conversation to a compact form."""
    # Format messages for summarization
    formatted_messages = []
    for msg in messages:
        role = "User" if msg.type == "human" else "Assistant"
        formatted_messages.append(f"{role}: {msg.content}\n")
    
    conversation_text = "".join(formatted_messages)
    
    # Create summarizer
    summarizer = ChatOpenAI(temperature=0)
    
    # Generate summary
    summary_prompt = f"""
    Summarize the following conversation in {max_tokens} tokens or fewer.
    Focus on key points, user preferences, and important information.
    
    {conversation_text}
    
    Concise summary:
    """
    
    summary = summarizer.invoke(summary_prompt)
    return summary

def manage_conversation_history(state, config, max_messages=10):
    """Manage conversation history with summarization."""
    messages = state["messages"]
    
    # If within limits, no action needed
    if len(messages) <= max_messages:
        return state
    
    # Generate summary of older messages
    older_messages = messages[:-max_messages+1]
    summary = summarize_conversation(older_messages)
    
    # Replace older messages with summary
    new_messages = [
        SystemMessage(content=f"Previous conversation summary: {summary}")
    ] + messages[-max_messages+1:]
    
    state["messages"] = new_messages
    return state

Structured Memory Compression

For semantic memories, implement structured compression:

def compress_semantic_memory(memories):
    """Compress multiple related memories into a consolidated form."""
    # Extract memory contents
    memory_texts = [mem["content"] for mem in memories]
    memory_context = [mem.get("context", "") for mem in memories]
    
    combined_text = "\n".join(memory_texts)
    combined_context = "\n".join(filter(None, memory_context))
    
    # Create compressor
    compressor = ChatOpenAI(temperature=0)
    
    # Generate compressed representation
    compression_prompt = f"""
    Consolidate the following related pieces of information into a single, comprehensive memory.
    Remove redundancy while preserving all unique information.
    
    Information pieces:
    {combined_text}
    
    Context:
    {combined_context}
    
    Consolidated memory:
    """
    
    compressed_memory = compressor.invoke(compression_prompt)
    
    # Create new memory object
    return {
        "content": compressed_memory,
        "context": "Consolidated from multiple memories",
        "source_count": len(memories),
        "timestamp": datetime.now().isoformat()
    }

def consolidate_redundant_memories(state, config, *, store: BaseStore):
    """Identify and consolidate redundant memories."""
    user_id = config["configurable"]["user_id"]
    namespace = ("memories", user_id)
    
    # Get all memories
    all_memories = store.list_values(namespace)
    all_memory_values = [mem.value for mem in all_memories]
    
    # Group similar memories
    groups = []
    remaining = all_memory_values.copy()
    
    while remaining:
        # Take first memory as seed
        seed = remaining.pop(0)
        group = [seed]
        
        # Find similar memories using vector search
        similar = store.search(
            namespace=namespace,
            query=seed["content"],
            limit=10
        )
        
        # Add similar memories to group and remove from remaining
        for mem in similar:
            if mem.value in remaining and mem.score > 0.8:  # Similarity threshold
                group.append(mem.value)
                remaining.remove(mem.value)
        
        if len(group) > 1:
            groups.append(group)
    
    # Consolidate each group
    for group in groups:
        # Compress the group
        consolidated = compress_semantic_memory(group)
        
        # Store consolidated memory
        memory_id = str(uuid.uuid4())
        store.put(namespace, memory_id, consolidated)
        
        # Delete original memories
        for mem in group:
            # Find key for this memory
            for original in all_memories:
                if original.value == mem:
                    store.delete(namespace, original.key)
                    break
    
    return state

Progressive Memory Abstraction

Implement progressive abstraction to maintain memories at different levels of detail:

def create_memory_abstractions(memory, store, user_id):
    """Create progressive abstractions of a memory at different detail levels."""
    # Create abstractor
    abstractor = ChatOpenAI(temperature=0)
    
    # Generate abstractions
    detail_levels = {
        "detailed": memory["content"],  # Original content
        "summary": abstractor.invoke(f"Summarize this information concisely: {memory['content']}"),
        "concept": abstractor.invoke(f"Extract the key concept or takeaway from: {memory['content']}")
    }
    
    # Store each abstraction with level indicator
    namespace = ("memories", user_id)
    base_id = str(uuid.uuid4())
    
    for level, content in detail_levels.items():
        memory_id = f"{base_id}_{level}"
        abstraction = {
            "content": content,
            "context": memory.get("context", ""),
            "abstraction_level": level,
            "base_id": base_id,
            "timestamp": datetime.now().isoformat()
        }
        store.put(namespace, memory_id, abstraction)
    
    return base_id

def retrieve_with_adaptive_detail(state, config, *, store: BaseStore):
    """Retrieve memories with adaptive detail level based on relevance."""
    user_id = config["configurable"]["user_id"]
    namespace = ("memories", user_id)
    query = state["messages"][-1].content
    
    # First retrieve concept-level memories for broad coverage
    concept_memories = store.search(
        namespace=namespace,
        query=query,
        filter={"abstraction_level": "concept"},
        limit=10
    )
    
    # For highly relevant concepts, include more detailed versions
    detailed_memories = []
    for mem in concept_memories:
        if mem.score > 0.85:  # High relevance threshold
            # Find more detailed version
            base_id = mem.value["base_id"]
            try:
                detailed = store.get(namespace, f"{base_id}_detailed")
                detailed_memories.append(BaseValue(
                    key=f"{base_id}_detailed",
                    value=detailed,
                    score=mem.score
                ))
            except KeyError:
                # Detailed version not found, use this one
                detailed_memories.append(mem)
        else:
            # For less relevant, use summary version
            base_id = mem.value["base_id"]
            try:
                summary = store.get(namespace, f"{base_id}_summary")
                detailed_memories.append(BaseValue(
                    key=f"{base_id}_summary",
                    value=summary,
                    score=mem.score
                ))
            except KeyError:
                # Summary not found, use concept version
                detailed_memories.append(mem)
    
    # Format memories for context, sorted by relevance
    memories_text = format_memories_for_context(
        sorted(detailed_memories, key=lambda m: m.score, reverse=True)
    )
    
    if memories_text:
        state["memory_context"] = memories_text
    
    return state

Temporal Memory Fading

Implement temporal fading to gradually compress older memories:

def apply_temporal_memory_fading(store, user_id):
    """Apply temporal fading to gradually compress older memories."""
    namespace = ("memories", user_id)
    all_memories = store.list_values(namespace)
    
    # Group memories by age
    now = datetime.now()
    age_groups = {
        "recent": [],    # Less than 1 week old
        "medium": [],    # 1 week to 1 month old
        "old": []        # More than 1 month old
    }
    
    for mem in all_memories:
        # Skip already abstracted memories
        if "abstraction_level" in mem.value:
            continue
            
        timestamp = datetime.fromisoformat(mem.value["timestamp"])
        age = now - timestamp
        
        if age < timedelta(days=7):
            age_groups["recent"].append(mem)
        elif age < timedelta(days=30):
            age_groups["medium"].append(mem)
        else:
            age_groups["old"].append(mem)
    
    # Process medium-age memories - create summaries if not exist
    for mem in age_groups["medium"]:
        if not mem.value.get("summarized", False):
            # Check if this memory has abstractions
            content = mem.value["content"]
            
            # Create abstractor
            abstractor = ChatOpenAI(temperature=0)
            summary = abstractor.invoke(f"Summarize this information concisely: {content}")
            
            # Update with summarized flag and summary
            updated_mem = {**mem.value, "summarized": True, "summary": summary}
            store.put(namespace, mem.key, updated_mem)
    
    # Process old memories - consolidate by topic
    # Group old memories by topic
    topics = {}
    for mem in age_groups["old"]:
        content = mem.value["content"]
        
        # Extract topic (simplified - production would use better classification)
        classifier = ChatOpenAI(temperature=0)
        topic = classifier.invoke(f"Provide a single-word topic or category for this information: {content}")
        topic = topic.strip().lower()
        
        if topic not in topics:
            topics[topic] = []
        topics[topic].append(mem)
    
    # Consolidate each topic group
    for topic, memories in topics.items():
        if len(memories) > 1:
            # Only consolidate if multiple memories exist
            consolidated = compress_semantic_memory([m.value for m in memories])
            consolidated["topic"] = topic
            
            # Store consolidated memory
            memory_id = f"consolidated_{topic}_{uuid.uuid4()}"
            store.put(namespace, memory_id, consolidated)
            
            # Delete original memories or mark them as archived
            for mem in memories:
                # Option 1: Delete
                # store.delete(namespace, mem.key)
                
                # Option 2: Mark as archived
                archived = {**mem.value, "archived": True, "consolidated_to": memory_id}
                store.put(namespace, mem.key, archived)

These memory summarization and compression techniques ensure that LangGraph agents can maintain effective memory without excessive resource consumption, enabling scalable and efficient operation over extended periods.
Deduplication and Memory Optimization

As agents accumulate memories over time, ensuring the quality and efficiency of the memory store becomes increasingly important. Deduplication and optimization techniques help maintain a clean, efficient memory system.

Semantic Deduplication

Implement semantic deduplication to identify and merge similar memories:

def semantic_deduplication(store, user_id, similarity_threshold=0.92):
    """Identify and deduplicate semantically similar memories."""
    namespace = ("memories", user_id)
    all_memories = store.list_values(namespace)
    
    # Process each memory
    processed = set()
    for mem in all_memories:
        if mem.key in processed:
            continue
            
        # Search for similar memories
        similar = store.search(
            namespace=namespace,
            query=mem.value["content"],
            limit=10
        )
        
        # Filter for high similarity and exclude self
        duplicates = [
            s for s in similar
            if s.key != mem.key 
            and s.key not in processed
            and s.score > similarity_threshold
        ]
        
        if duplicates:
            # Create merged memory from duplicates
            all_duplicates = [mem.value] + [d.value for d in duplicates]
            
            # Merge creation dates - keep earliest
            timestamps = [
                datetime.fromisoformat(m.get("timestamp", datetime.now().isoformat()))
                for m in all_duplicates
            ]
            earliest = min(timestamps).isoformat()
            
            # Merge contents with most detailed version
            contents = [m.get("content", "") for m in all_duplicates]
            contents_by_length = sorted(contents, key=len, reverse=True)
            primary_content = contents_by_length[0]
            
            # Create merged memory
            merged = {
                "content": primary_content,
                "context": "Merged from duplicate memories",
                "timestamp": earliest,
                "merge_count": len(all_duplicates),
                "merged_at": datetime.now().isoformat()
            }
            
            # Store merged memory with new ID
            merge_id = f"merged_{uuid.uuid4()}"
            store.put(namespace, merge_id, merged)
            
            # Delete duplicates
            for dup in duplicates:
                store.delete(namespace, dup.key)
                processed.add(dup.key)
            
            # Delete or mark original
            # store.delete(namespace, mem.key)
            # Or mark as merged
            original_updated = {
                **mem.value,
                "merged_to": merge_id,
                "merged_at": datetime.now().isoformat()
            }
            store.put(namespace, mem.key, original_updated)
            
            processed.add(mem.key)

Contextual Clustering

Implement contextual clustering to organize related memories:

def cluster_memories_by_context(store, user_id, clustering_threshold=0.85):
    """Cluster memories into contextual groups for better organization."""
    namespace = ("memories", user_id)
    all_memories = store.list_values(namespace)
    
    # Skip already clustered memories
    unclustered = [
        mem for mem in all_memories
        if not mem.value.get("cluster_id")
    ]
    
    # Initialize clusters
    clusters = []
    
    # Process each unclustered memory
    for mem in unclustered:
        # Check if it belongs to existing cluster
        assigned = False
        
        for cluster_idx, cluster in enumerate(clusters):
            # Use first memory in cluster as centroid
            centroid = cluster[0]
            
            # Calculate similarity
            similarity = calculate_similarity(
                mem.value["content"],
                centroid.value["content"],
                store.embedding_function
            )
            
            if similarity > clustering_threshold:
                # Add to existing cluster
                clusters[cluster_idx].append(mem)
                assigned = True
                break
        
        if not assigned:
            # Create new cluster
            clusters.append([mem])
    
    # Assign cluster IDs and update memories
    for cluster_idx, cluster in enumerate(clusters):
        if len(cluster) > 1:  # Only process actual clusters
            cluster_id = f"cluster_{uuid.uuid4()}"
            
            # Extract common topics from cluster
            all_content = [m.value["content"] for m in cluster]
            combined = "\n".join(all_content)
            
            # Generate cluster label
            labeler = ChatOpenAI(temperature=0)
            cluster_label = labeler.invoke(
                f"Provide a short, descriptive label (3-5 words) for this group of related information:\n{combined}"
            )
            
            # Update each memory with cluster info
            for mem in cluster:
                updated = {
                    **mem.value,
                    "cluster_id": cluster_id,
                    "cluster_label": cluster_label
                }
                store.put(namespace, mem.key, updated)