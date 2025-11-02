import { MessageBubble, Avatar, TypingIndicator, useTheme } from '@workspace/ui';
import { useState } from 'react';

export function DesignSystemTest() {
  const { theme, toggleTheme } = useTheme();
  const [showTyping, setShowTyping] = useState(false);

  return (
    <div className="min-h-screen p-8 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Design Library Test
          </h1>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Message Bubbles
          </h2>
          <div className="space-y-4">
            <MessageBubble
              content="Hello! This is a **user** message with markdown support."
              sender="user"
              timestamp={new Date()}
            />

            <MessageBubble
              content="Hi there! I'm the agent. I can help you with:\n\n- Markdown rendering\n- Code blocks\n- And much more!"
              sender="agent"
              timestamp={new Date()}
            />

            <MessageBubble
              content="# Heading 1\n\n## Heading 2\n\n### Heading 3\n\nThis is a paragraph with **bold** and *italic* text.\n\n```typescript\nfunction hello(name: string) {\n  console.log(`Hello, ${name}!`);\n}\n```"
              sender="agent"
              timestamp={new Date()}
            />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Avatars</h2>
          <div className="flex gap-4 items-end">
            <Avatar variant="user" size="sm" initials="U" />
            <Avatar variant="user" size="md" initials="JD" />
            <Avatar variant="user" size="lg" initials="AB" />
            <Avatar variant="agent" size="sm" />
            <Avatar variant="agent" size="md" />
            <Avatar variant="agent" size="lg" />
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Typing Indicator
            </h2>
            <button
              onClick={() => setShowTyping(!showTyping)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {showTyping ? 'Hide' : 'Show'} Typing
            </button>
          </div>
          <div className="space-y-4">
            {showTyping && (
              <>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Dots variant:</p>
                  <TypingIndicator variant="dots" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pulse variant:</p>
                  <TypingIndicator variant="pulse" />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
