'use client'; // This must be a client component to handle user interaction

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';

// A separate component to handle Suspense for useSearchParams
const LoginContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = searchParams.get('role') || 'department'; // Default to department

    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!userId || !password) {
            setError('User ID and Password are required.');
            return;
        }
        if (!recaptchaToken) {
            setError('Please complete the reCAPTCHA challenge.');
            return;
        }

        console.log('Logging in with:', {
            role,
            userId,
            password,
            recaptchaToken,
        });

        // --- Mock API Call ---
        // In a real app, you would make an API call here to your backend
        // for authentication. For now, we'll just log it and redirect.

        // Example: router.push('/dashboard');
        alert(`Login successful for ${role}: ${userId}`);
        router.push('/'); // Redirect to home page after "login"
    };

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
        return <p className="text-red-500 text-center mt-10">reCAPTCHA Site Key is not configured.</p>;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800">
                        KMRL <span className="text-sky-600">Intelligent Hub</span>
                    </h1>
                    <h2 className="mt-2 text-xl font-semibold text-gray-700 capitalize">
                        {role} Login
                    </h2>
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="userId" className="text-sm font-medium text-gray-700">
                            User ID
                        </label>
                        <input
                            id="userId"
                            name="userId"
                            type="text"
                            required
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                            placeholder="Enter your User ID"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="text-sm font-medium text-gray-700"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="flex justify-center">
                        <ReCAPTCHA
                            sitekey={siteKey}
                            onChange={(token) => setRecaptchaToken(token)}
                        />
                    </div>

                    {error && <p className="text-sm text-center text-red-600">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            className="w-full px-4 py-2 font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                        >
                            Login
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <Link href="/" className="text-sm text-sky-600 hover:underline">
                        &larr; Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

// We wrap the main component in Suspense because `useSearchParams` needs it.
export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}