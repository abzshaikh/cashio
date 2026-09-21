import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link as RouterLink } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import { FormTextField } from '../../components/common/form/FormTextField';
import { useAuth } from '../../context/AuthContext';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../../schemas/authSchemas';
import { getAuthErrorMessage } from '../../utils/firebaseErrors';

// Codes that would reveal whether an email is registered — treated as
// success so the response can't be used to enumerate accounts.
const ACCOUNT_ENUMERATION_CODES = new Set(['auth/user-not-found', 'auth/invalid-email']);

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setFormError(null);
    try {
      await resetPassword(values.email);
      setSent(true);
    } catch (error) {
      if (error instanceof FirebaseError && ACCOUNT_ENUMERATION_CODES.has(error.code)) {
        setSent(true);
        return;
      }
      setFormError(getAuthErrorMessage(error));
    }
  };

  if (sent) {
    return (
      <Stack spacing={2.5}>
        <Alert severity="success">
          If an account exists for that email, a password reset link is on its way.
        </Alert>
        <Typography variant="body2" align="center">
          <Link component={RouterLink} to="/login">
            Back to sign in
          </Link>
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="body2" color="text.secondary" align="center">
        Enter your email and we’ll send you a link to reset your password.
      </Typography>
      {formError && <Alert severity="error">{formError}</Alert>}
      <FormTextField name="email" control={control} label="Email" type="email" autoComplete="email" />
      <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
        Send Reset Link
      </Button>
      <Typography variant="body2" align="center">
        <Link component={RouterLink} to="/login">
          Back to sign in
        </Link>
      </Typography>
    </Stack>
  );
}
