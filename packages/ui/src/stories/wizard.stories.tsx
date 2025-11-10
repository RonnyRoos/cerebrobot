import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Wizard } from '../components/wizard/Wizard';
import { WizardStep } from '../components/wizard/WizardStep';
import { Input } from '../components/input';
import { Textarea } from '../components/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../components/select';

const meta = {
  title: 'Navigation/Wizard',
  component: Wizard,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Wizard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Step 1 of 4 - Basic Information
 */
export const Step1of4: Story = {
  render: () => {
    const [step, setStep] = useState(0);

    return (
      <div className="min-h-screen bg-background p-8">
        <Wizard
          currentStep={step}
          onStepChange={setStep}
          onComplete={() => alert('Wizard completed!')}
          onCancel={() => alert('Wizard cancelled')}
          steps={['Basic Info', 'LLM Config', 'Memory', 'Autonomy']}
        >
          <WizardStep
            title="Basic Information"
            description="Configure your agent's name and description"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Agent Name</label>
                <Input placeholder="helpful-assistant" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <Textarea placeholder="A helpful AI assistant..." rows={4} />
              </div>
            </div>
          </WizardStep>

          <WizardStep title="LLM Configuration" description="Configure the language model">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Model</label>
                <Input placeholder="gpt-4" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Temperature
                </label>
                <Input type="number" placeholder="0.7" />
              </div>
            </div>
          </WizardStep>

          <WizardStep title="Memory Settings" description="Configure memory behavior">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Similarity Threshold
                </label>
                <Input type="number" placeholder="0.7" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Tokens</label>
                <Input type="number" placeholder="2048" />
              </div>
            </div>
          </WizardStep>

          <WizardStep title="Autonomy Mode" description="Configure autonomy settings">
            <div className="space-y-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </WizardStep>
        </Wizard>
      </div>
    );
  },
};

/**
 * Step 2 of 4 - LLM Configuration
 */
export const Step2of4: Story = {
  render: () => {
    const [step, setStep] = useState(1);

    return (
      <div className="min-h-screen bg-background p-8">
        <Wizard
          currentStep={step}
          onStepChange={setStep}
          onComplete={() => alert('Wizard completed!')}
          onCancel={() => alert('Wizard cancelled')}
          steps={['Basic Info', 'LLM Config', 'Memory', 'Autonomy']}
        >
          <WizardStep title="Basic Information">
            <p className="text-foreground">Step 1 content</p>
          </WizardStep>

          <WizardStep title="LLM Configuration" description="Configure the language model settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Model</label>
                <Input placeholder="gpt-4" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Temperature
                </label>
                <Input type="number" placeholder="0.7" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Tokens</label>
                <Input type="number" placeholder="4096" />
              </div>
            </div>
          </WizardStep>

          <WizardStep title="Memory Settings">
            <p className="text-foreground">Step 3 content</p>
          </WizardStep>

          <WizardStep title="Autonomy Mode">
            <p className="text-foreground">Step 4 content</p>
          </WizardStep>
        </Wizard>
      </div>
    );
  },
};

/**
 * Step 4 Complete - Last step with Complete button
 */
export const Step4Complete: Story = {
  render: () => {
    const [step, setStep] = useState(3);

    return (
      <div className="min-h-screen bg-background p-8">
        <Wizard
          currentStep={step}
          onStepChange={setStep}
          onComplete={() => alert('Agent created successfully!')}
          onCancel={() => alert('Wizard cancelled')}
          steps={['Basic Info', 'LLM Config', 'Memory', 'Autonomy']}
          completeButtonText="Create Agent"
        >
          <WizardStep title="Basic Information">
            <p className="text-foreground">Step 1 content</p>
          </WizardStep>

          <WizardStep title="LLM Configuration">
            <p className="text-foreground">Step 2 content</p>
          </WizardStep>

          <WizardStep title="Memory Settings">
            <p className="text-foreground">Step 3 content</p>
          </WizardStep>

          <WizardStep
            title="Autonomy Mode"
            description="Configure how the agent operates autonomously"
          >
            <div className="space-y-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select autonomy mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="auto">Automatic</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-foreground/60">
                Notice the "Create Agent" button on the last step.
              </p>
            </div>
          </WizardStep>
        </Wizard>
      </div>
    );
  },
};

/**
 * With Validation Errors - Next button disabled
 */
export const WithValidationErrors: Story = {
  render: () => {
    const [step, setStep] = useState(0);

    return (
      <div className="min-h-screen bg-background p-8">
        <Wizard
          currentStep={step}
          onStepChange={setStep}
          onComplete={() => alert('Wizard completed!')}
          onCancel={() => alert('Wizard cancelled')}
          steps={['Basic Info', 'LLM Config', 'Memory', 'Autonomy']}
          disableNext={true}
        >
          <WizardStep title="Basic Information" description="Fill in required fields to continue">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Agent Name</label>
                <Input placeholder="helpful-assistant" variant="error" />
                <p className="text-sm text-error mt-1">Agent name is required</p>
              </div>
              <p className="text-sm text-foreground/60">
                Next button is disabled due to validation errors.
              </p>
            </div>
          </WizardStep>

          <WizardStep title="LLM Configuration">
            <p className="text-foreground">Step 2 content</p>
          </WizardStep>

          <WizardStep title="Memory Settings">
            <p className="text-foreground">Step 3 content</p>
          </WizardStep>

          <WizardStep title="Autonomy Mode">
            <p className="text-foreground">Step 4 content</p>
          </WizardStep>
        </Wizard>
      </div>
    );
  },
};
