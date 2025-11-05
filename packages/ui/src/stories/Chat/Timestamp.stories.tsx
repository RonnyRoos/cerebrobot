import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';
import { Timestamp } from '../../chat/timestamp';

/**
 * Timestamp Component
 *
 * Displays relative or absolute timestamps with automatic updates.
 * Shows "just now", "5 minutes ago", etc. for recent times.
 */
const meta: Meta<typeof Timestamp> = {
  title: 'Components/Chat/Timestamp',
  component: Timestamp,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    date: {
      control: { type: 'date' },
    },
  },
  render: (args) => {
    const dateObj = typeof args.date === 'number' ? new Date(args.date) : args.date;
    return <Timestamp {...args} date={dateObj} />;
  },
};

export default meta;

type Story = StoryObj<typeof Timestamp>;

export const JustNow: Story = {
  args: {
    date: new Date(),
  },
};

export const FiveMinutesAgo: Story = {
  args: {
    date: new Date(Date.now() - 5 * 60 * 1000),
  },
};

export const OneHourAgo: Story = {
  args: {
    date: new Date(Date.now() - 60 * 60 * 1000),
  },
};

export const Yesterday: Story = {
  args: {
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
};

export const TwoDaysAgo: Story = {
  args: {
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
};

export const OneWeekAgo: Story = {
  args: {
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
};
