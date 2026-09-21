import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { CategoriesSection } from '../../components/settings/CategoriesSection';
import { TagsSection } from '../../components/settings/TagsSection';
import { PreferencesSection } from '../../components/settings/PreferencesSection';
import { FormTextField } from '../../components/common/form/FormTextField';
import { FormSelect } from '../../components/common/form/FormSelect';
import { FormAutocomplete } from '../../components/common/form/FormAutocomplete';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { profileSchema, type ProfileFormValues } from '../../schemas/authSchemas';
import { currencyOptions } from '../../config/currencies';
import { countryOptions } from '../../config/countries';
import { getTimezoneOptions } from '../../config/timezones';
import { getAuthErrorMessage } from '../../utils/firebaseErrors';

const timezoneOptions = getTimezoneOptions();
const currencySelectOptions = currencyOptions.map((c) => ({
  value: c.code,
  label: `${c.symbol} ${c.code} — ${c.label}`,
}));
const countrySelectOptions = countryOptions.map((c) => ({ value: c, label: c }));

function ProfileSection() {
  const { user, profile, profileLoading, updateProfile } = useAuth();
  const { success, error: notifyError } = useNotification();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      photoURL: '',
      currency: 'INR',
      country: '',
      timezone: '',
    },
  });

  // Populate the form once the profile has loaded (or changes externally).
  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        photoURL: profile.photoURL ?? '',
        currency: profile.currency,
        country: profile.country,
        timezone: profile.timezone,
      });
    }
  }, [profile, reset]);

  const photoURL = useWatch({ control, name: 'photoURL' });
  const firstName = useWatch({ control, name: 'firstName' });
  const lastName = useWatch({ control, name: 'lastName' });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        photoURL: values.photoURL || null,
        currency: values.currency,
        country: values.country,
        timezone: values.timezone,
      });
      success('Profile updated');
    } catch (error) {
      notifyError(getAuthErrorMessage(error));
    }
  };

  if (profileLoading && !profile) {
    return (
      <Card variant="outlined">
        <CardContent>
          <EmptyState title="Loading your profile…" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Profile" subheader="Your personal details and preferences" />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar
                src={photoURL || undefined}
                sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 22 }}
              >
                {(firstName || lastName ? `${firstName} ${lastName}` : user?.email || 'U')
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </Avatar>
              <FormTextField
                name="photoURL"
                control={control}
                label="Profile image URL"
                placeholder="https://example.com/avatar.jpg"
                sx={{ flex: 1 }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormTextField name="firstName" control={control} label="First name" />
              <FormTextField name="lastName" control={control} label="Last name" />
            </Stack>

            <TextField label="Email" value={user?.email ?? ''} fullWidth disabled />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormSelect
                name="currency"
                control={control}
                label="Currency"
                options={currencySelectOptions}
              />
              <FormSelect
                name="country"
                control={control}
                label="Country"
                options={countrySelectOptions}
              />
            </Stack>

            <FormAutocomplete
              name="timezone"
              control={control}
              label="Timezone"
              options={timezoneOptions}
            />

            <Box>
              <Button type="submit" variant="contained" loading={isSubmitting} disabled={!isDirty}>
                Save changes
              </Button>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <Box>
      <PageHeader title="Settings" subtitle="Manage your profile and app preferences." />
      <Stack spacing={3}>
        <ProfileSection />
        <PreferencesSection />
        <CategoriesSection />
        <TagsSection />
      </Stack>
    </Box>
  );
}
