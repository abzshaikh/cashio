import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import { FormTextField } from '../../components/common/form/FormTextField';
import { useAuth } from '../../context/AuthContext';
import { loginSchema, type LoginFormValues } from '../../schemas/authSchemas';
import { getAuthErrorMessage } from '../../utils/firebaseErrors';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password, values.rememberMe);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    }
  };

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="body2" color="text.secondary" align="center">
        Sign in to your account
      </Typography>
      {formError && <Alert severity="error">{formError}</Alert>}
      <FormTextField name="email" control={control} label="Email" type="email" autoComplete="email" />
      <FormTextField
        name="password"
        control={control}
        label="Password"
        type="password"
        autoComplete="current-password"
      />
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Controller
          name="rememberMe"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Checkbox checked={field.value} onChange={field.onChange} />}
              label={<Typography variant="body2">Remember me</Typography>}
            />
          )}
        />
        <Link component={RouterLink} to="/forgot-password" variant="body2">
          Forgot password?
        </Link>
      </Stack>
      <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
        Sign In
      </Button>
      <Typography variant="body2" align="center">
        Don’t have an account?{' '}
        <Link component={RouterLink} to="/register">
          Create one
        </Link>
      </Typography>
    </Stack>
  );
}
