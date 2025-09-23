'use client'; // This must be a client component to handle user interaction

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';
import { ArrowLeft } from 'lucide-react';

// Base URL for backend API with safe fallback for client-side usage
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/,'');

// Utility: map ID prefix to department slug and label
const prefixToDept = (id: string) => {
    const u = id.toUpperCase();
    if (u.startsWith('ADMIN')) return { slug: 'admin', label: 'Admin' };
    if (u.startsWith('OPS')) return { slug: 'operations', label: 'Operations' };
    if (u.startsWith('ENG')) return { slug: 'engineering', label: 'Engineering' };
    if (u.startsWith('MNT')) return { slug: 'maintenance', label: 'Maintenance' };
    if (u.startsWith('FIN')) return { slug: 'finance', label: 'Finance' };
    if (u.startsWith('HR')) return { slug: 'hr', label: 'HR' };
    return { slug: 'operations', label: 'Operations' }; // default
};

// A separate component to handle Suspense for useSearchParams
const LoginContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = searchParams.get('role') || 'department'; // Default to department

    const [userId, setUserId] = useState('');
    const [name, setName] = useState('');
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

        const departmentInfo = prefixToDept(userId);
        const department = departmentInfo.label; // e.g., "Engineering"

        const skip = parseInt('0', 10);
        const limit = parseInt('100', 10);

        console.log("Clean Department:", department);
        console.log("Clean Skip:", skip);
        console.log("Clean Limit:", limit);

        try {
            // const urlToFetch = `${API_BASE}/users/${encodeURIComponent(userId)}`;
            const urlToFetch = `${API_BASE}/documents/${encodeURIComponent(department)}?skip=${skip}&limit=${limit}`;

            // ADD THIS LINE
            console.log("Attempting to fetch from URL:", urlToFetch);

            // let response = await fetch(urlToFetch, { method: 'GET' });

            const response = await fetch(urlToFetch);

            if (!response.ok) {
                setError(`Failed to fetch documents for department: ${department}`);
                return;
            }

            console.log("Connection successful! Simulating login.");

            const isAdmin = departmentInfo.slug === 'admin';

            // Mock auth: Save user context locally
            const user = {
                name: name || userId,
                userId: userId,
                department: department,
                deptSlug: departmentInfo.slug,
                isAdmin,
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem('kmrl_user', JSON.stringify(user));
            }

            // Redirect rules
            if (isAdmin) {
                router.push('/admin');
            } else {
                router.push(`/dashboard?dept=${departmentInfo.slug}`);
            }

        } catch (err) {
            setError('Failed to connect to the backend. Is the server running and CORS configured?');
            console.error(err);
        }
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
                        Docu <span className="text-blue-500">Sphere</span>
                    </Link>
                    <h2 className="mt-4 text-2xl font-bold text-gray-300 capitalize">
                        {role} Portal Access
                    </h2>
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="userId" className="text-sm font-bold text-gray-400">
                            User ID (e.g., FIN001, ENG002, ADMIN001)
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
                        <label htmlFor="name" className="text-sm font-bold text-gray-400">Name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 mt-2 text-gray-100 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                            placeholder="Your name (optional)"
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
