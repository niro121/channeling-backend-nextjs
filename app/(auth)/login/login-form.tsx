'use client'

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Formik, Form, ErrorMessage, FormikHelpers } from 'formik';
import { signIn } from 'next-auth/react';
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardContent,
    CardTitle
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FormValues {
    email: string;
    password: string;
    invalidCredentials: string
}

const LoginForm = () => {

    const { toast } = useToast()
    const router = useRouter()

    const [showPassword, setShowPassword] = useState(false);

    const initialValues: FormValues = {
        email: '',
        password: '',
        invalidCredentials: ''
    };

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    const handleSubmit = async (values: FormValues, { resetForm, setErrors }: FormikHelpers<FormValues>) => {
        try {
            // Call NextAuth signIn method
            const result = await signIn('credentials', {
                redirect: false,  // Prevents redirection so you can handle errors manually
                username: values.email,
                password: values.password,
            });

            if (result?.error) {
                setErrors({
                    invalidCredentials: "Invalid credentials"
                })
                return
            }

            resetForm()
            router.replace('/welcome')

        } catch (error: any) {
            // Handle error
            console.log('auth-error', error);
            toast({
                variant: 'destructive',
                title: "Error",
                description: error.message ?? "Something went wrong..",
            })

        }

    }


    return (
        <>
            <div className="lg:hidden mb-6 text-center">
                <span className="text-xl font-semibold text-foreground">Ruhunu</span>
            </div>
            <Card className="w-full border-0 shadow-none bg-transparent p-0">
                <CardHeader className="space-y-1 px-0 pt-0">
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>
                        Enter your credentials to sign in to your account
                    </CardDescription>
                </CardHeader>

                <Formik
                    initialValues={initialValues}
                    onSubmit={handleSubmit}
                >
                    {(formik) => (
                        <Form className="w-full">
                            <CardContent className="space-y-4 px-0 pb-0">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="name@example.com"
                                        value={formik.values.email}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        className="h-10"
                                    />
                                    <ErrorMessage
                                        name="email"
                                        component="div"
                                        className="text-sm text-destructive"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            value={formik.values.password}
                                            onChange={formik.handleChange}
                                            onBlur={formik.handleBlur}
                                            className="h-10 pr-10"
                                        />
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={togglePasswordVisibility}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <ErrorMessage
                                        name="password"
                                        component="div"
                                        className="text-sm text-destructive"
                                    />
                                    <ErrorMessage
                                        name="invalidCredentials"
                                        component="div"
                                        className="text-sm text-destructive"
                                    />
                                </div>
                            </CardContent>

                            <CardFooter className="flex flex-col gap-4 px-0 pb-0 pt-6">
                                <Button
                                    className="w-full"
                                    type="submit"
                                    disabled={formik.isSubmitting}
                                >
                                    {formik.isSubmitting ? "Signing in…" : "Sign in"}
                                </Button>
                            </CardFooter>
                        </Form>
                    )}
                </Formik>
            </Card>
        </>
    );
};

export default LoginForm;