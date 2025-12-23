'use client'

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Eye, EyeOff } from '@/components/icons';

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
        <div className="min-h-screen flex justify-center items-start md:items-center p-8">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>
                        Sign into your account
                    </CardDescription>
                </CardHeader>

                <Formik
                    initialValues={initialValues}
                    onSubmit={handleSubmit}
                >
                    {formik => (

                        <Form
                            className="w-full"
                        >

                            <CardContent>

                                <Input className="mb-4 p-2 border rounded"
                                    type="text"
                                    id='email'
                                    value={formik.values.email}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    placeholder="Email" />
                                <ErrorMessage name="email" component="div" className="invalid-feedback text-red-600" />

                                <div className='relative'>
                                    <Input className="mb-4 p-2 border rounded"
                                        type={showPassword ? "text" : "password"}
                                        id='password'
                                        value={formik.values.password}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        placeholder="Password"
                                    />
                                    <div className='absolute right-5 inset-y-0 flex items-center justify-center cursor-pointer' onClick={togglePasswordVisibility}>
                                        {showPassword ? (
                                            <EyeOff className="text-black" />
                                        ) : (
                                            <Eye className=" n text-black" />
                                        )}
                                    </div>
                                </div>

                                <ErrorMessage name="password" component="div" className="invalid-feedback text-red-600" />

                                <ErrorMessage name="invalidCredentials" component="div" className="invalid-feedback text-red-600" />

                            </CardContent>

                            <CardFooter>
                                <div className="w-full">
                                    <Button className="mb-4 w-full" type='submit' disabled={formik.isSubmitting}>Login</Button>

                                    {/* <Link className="mb-4 small text-gray-600 underline underline-offset-1" href="forgot-password">Forgot password?</Link> */}
                                </div>
                            </CardFooter>

                        </Form>
                    )}
                </Formik>

            </Card>
        </div>
    );
};

export default LoginForm;