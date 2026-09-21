import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import { FormTextField } from '../../components/common/form/FormTextField';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';
import { useAuth } from '../../context/AuthContext';
import { registerSchema, type RegisterFormValues } from '../../schemas/authSchemas';
import { getAuthErrorMessage } from '../../utils/firebaseErrors';

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  const password = useWatch({ control, name: 'password' });

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      await registerUser(values.firstName, values.lastName, values.email, values.password);
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  };

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="body2" color="text.secondary" align="center">
        Create your account
      </Typography>
      {formError && <Alert severity="error">{formError}</Alert>}
      <Stack direction="row" spacing={2}>
        <FormTextField name="firstName" control={control} label="First name" autoComplete="given-name" />
        <FormTextField name="lastName" control={control} label="Last name" autoComplete="family-name" />
      </Stack>
      <FormTextField name="email" control={control} label="Email" type="email" autoComplete="email" />
      <FormTextField
        name="password"
        control={control}
        label="Password"
        type="password"
        autoComplete="new-password"
      />
      <PasswordStrengthMeter password={password} />
      <FormTextField
        name="confirmPassword"
        control={control}
        label="Confirm password"
        type="password"
        autoComplete="new-password"
      />
      <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
        Create Account
      </Button>
      <Typography variant="body2" align="center">
        Already have an account?{' '}
        <Link component={RouterLink} to="/login">
          Sign in
        </Link>
      </Typography>
    </Stack>
  );
}
