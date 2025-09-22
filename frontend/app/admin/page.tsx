'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Settings, LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const [name, setName] = useState<string>('Admin');

  useEffect(() => {
    try {
      const u = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('kmrl_user') || 'null') : null;
      if (u?.name) setName(u.name);
    } catch {}
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-300">
      <aside className="w-64 bg-gray-950 p-6 flex-shrink-0 flex flex-col">
        <h1 className="text-2xl font-bold text-white mb-8">KMRL <span className="text-blue-500">Hub</span></h1>
        <nav className="flex flex-col gap-4">
          <Link href="/admin" className="bg-gray-800 text-white p-3 rounded-md">Admin Dashboard</Link>
          <Link href={{ pathname: '/documents' }} className="text-gray-400 hover:bg-gray-800 hover:text-white p-3 rounded-md">Documents</Link>
        </nav>
        <div className="mt-auto">
          <a href="#" className="text-gray-400 hover:bg-gray-800 hover:text-white p-3 rounded-md flex items-center gap-2"><Settings size={20} /> Settings</a>
          <Link href="/" className="text-gray-400 hover:bg-gray-800 hover:text-white p-3 rounded-md flex items-center gap-2"><LogOut size={20} /> Logout</Link>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome, {name}</h2>
        <p className="text-gray-400 mb-8">You have admin privileges. You can view and upload documents for any department.</p>
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl text-white font-semibold mb-2">Quick Links</h3>
          <ul className="list-disc pl-6 text-gray-300">
            <li>
              <Link href="/documents" className="text-blue-400 hover:underline">Manage Documents</Link>
            </li>
            <li>
              <Link href="/dashboard?dept=operations" className="text-blue-400 hover:underline">View Operations Dashboard</Link>
            </li>
            <li>
              <Link href="/dashboard?dept=finance" className="text-blue-400 hover:underline">View Finance Dashboard</Link>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
