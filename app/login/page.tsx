'use client'; // This must be a client component to handle user interaction

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';
import { ArrowLeft } from 'lucide-react';

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
        alert(`Login successful for ${role}: ${userId}`);
        router.push('/'); // Redirect to home page after "login"
    };

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <p className="text-red-400 text-center">reCAPTCHA Site Key is not configured.</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-950 rounded-2xl shadow-2xl">
                <div className="text-center">
                    <Link href="/" className="text-3xl font-extrabold text-white">
                        KMRL <span className="text-blue-500">Intelligent Hub</span>
                    </Link>
                    <h2 className="mt-4 text-2xl font-bold text-gray-300 capitalize">
                        {role} Portal Access
                    </h2>
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="userId" className="text-sm font-bold text-gray-400">
                            User ID
                        </label>
                        <input
                            id="userId"
                            name="userId"
                            type="text"
                            required
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full px-4 py-3 mt-2 text-gray-100 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                            placeholder="Enter your User ID"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="text-sm font-bold text-gray-400"
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
                            className="w-full px-4 py-3 mt-2 text-gray-100 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="flex justify-center pt-2">
                        <ReCAPTCHA
                            sitekey={siteKey}
                            onChange={(token) => setRecaptchaToken(token)}
                            theme="dark" // Set the reCAPTCHA theme to dark
                        />
                    </div>

                    {error && <p className="text-sm text-center text-red-400">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-blue-500 transition-colors duration-300"
                        >
                            Login
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:underline">
                        <ArrowLeft size={16} /> Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
};

// We wrap the main component in Suspense because `useSearchParams` needs it.
export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}