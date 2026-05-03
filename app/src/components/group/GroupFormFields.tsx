import React from 'react';
import { SectionLabel } from '../ui/SectionLabel';
import { FormCard } from '../ui/FormCard';
import { FormField } from '../ui/FormField';
import { Separator } from '../ui/Separator';
import { NAME_MAX, DESC_MAX, SCHEDULE_MAX } from './constants';

interface GroupFormFieldsProps {
  name: string;
  description: string;
  meetingSchedule: string;
  onChangeName: (text: string) => void;
  onChangeDescription: (text: string) => void;
  onChangeMeetingSchedule: (text: string) => void;
  testIDPrefix?: string;
}

export function GroupFormFields({
  name,
  description,
  meetingSchedule,
  onChangeName,
  onChangeDescription,
  onChangeMeetingSchedule,
  testIDPrefix,
}: GroupFormFieldsProps) {
  return (
    <>
      <SectionLabel>DETAILS</SectionLabel>
      <FormCard>
        <FormField
          label="GROUP NAME"
          icon="people-outline"
          value={name}
          onChangeText={onChangeName}
          maxLength={NAME_MAX}
          placeholder="e.g., Daily Rosary Circle"
          autoCapitalize="words"
          testID={testIDPrefix ? `${testIDPrefix}-name-input` : undefined}
        />

        <Separator />

        <FormField
          label="DESCRIPTION"
          icon="pencil-outline"
          value={description}
          onChangeText={onChangeDescription}
          maxLength={DESC_MAX}
          placeholder="Describe your prayer group's purpose..."
          multiline
          testID={testIDPrefix ? `${testIDPrefix}-description-input` : undefined}
        />

        <Separator />

        <FormField
          label="MEETING SCHEDULE"
          icon="time-outline"
          value={meetingSchedule}
          onChangeText={onChangeMeetingSchedule}
          maxLength={SCHEDULE_MAX}
          placeholder="e.g., Sundays at 8 PM"
        />
      </FormCard>
    </>
  );
}
