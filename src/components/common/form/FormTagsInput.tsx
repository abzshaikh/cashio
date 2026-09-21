import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import type { TagColor } from '../../../types/tag';

export interface FormTagOption {
  value: string;
  label: string;
  color: TagColor;
}

interface Props<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: FormTagOption[];
}

/**
 * A multi-select over the user's real tags (Phase 21) — backed by
 * `string[]` of tag *slugs*, the same field shape every transaction schema
 * already had since Phase 8; only what the strings mean changed, from
 * arbitrary freeSolo text to a real tag's stable slug (see `types/tag.ts`).
 * No longer `freeSolo`: tags are created and colored once, in Settings →
 * Tags, then picked from here — the same "manage the picklist elsewhere,
 * just pick from it here" shape `ExpenseFormDialog`'s category select
 * already uses, chosen for consistency over reintroducing an inline
 * create-on-the-fly flow into a transaction dialog.
 *
 * A slug already on the transaction that no longer matches any current tag
 * (deleted after the fact) still renders — as an uncolored chip labeled
 * with the raw slug — rather than silently vanishing from the field, the
 * same "shows as plain text" fallback `getCategoryLabel`/`getTagLabel`
 * already accept for a deleted category/tag.
 */
export function FormTagsInput<T extends FieldValues>({ name, control, label, options }: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selectedSlugs = (field.value as string[] | undefined) ?? [];
        const selectedOptions: FormTagOption[] = selectedSlugs.map(
          (slug) => options.find((option) => option.value === slug) ?? { value: slug, label: slug, color: 'default' },
        );

        return (
          <Autocomplete
            multiple
            options={options}
            value={selectedOptions}
            isOptionEqualToValue={(option, value) => option.value === value.value}
            getOptionLabel={(option) => option.label}
            onChange={(_event, value) => field.onChange(value.map((option) => option.value))}
            renderValue={(value, getItemProps) =>
              value.map((option, index) => {
                const { key, ...itemProps } = getItemProps({ index });
                return <Chip key={key} label={option.label} size="small" color={option.color} {...itemProps} />;
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                placeholder={selectedOptions.length === 0 ? 'Select tags' : undefined}
                onBlur={field.onBlur}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
              />
            )}
          />
        );
      }}
    />
  );
}
