'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Bell, FileText, Clock, CheckCircle, RefreshCw, X, User, Settings, LogOut, Search, ChevronDown, Loader2
} from 'lucide-react';

// --- Define Types for our Data ---
// This helps ensure our data from the backend is used correctly.
type Document = {
    id: number;
    title: string;
    type: string;
    date: string;
    status: 'read' | 'unread' | 'deadline' | 'approval_pending';
    department: string;
};

type UserProfile = {
    name: string;
    role: 'admin' | 'department';
    department?: string; // Department is optional for an admin
    deptSlug?: string;
};

// --- API Simulation ---
// This function mimics fetching data from your backend.
// Replace the content of this function with your actual API call.
const fetchDashboardData = async (): Promise<{ documents: Document[] }> => {
    console.log("Fetching data from backend...");
    await new Promise(resolve => setTimeout(resolve, 800));
    const documents: Document[] = [
        { id: 1, title: 'Q3 Vendor Invoice Batch', type: 'Invoice', date: '2025-09-22', status: 'approval_pending', department: 'Finance' },
        { id: 2, title: 'New Safety Circular (SC-113)', type: 'Safety Bulletin', date: '2025-09-21', status: 'unread', department: 'Operations' },
        { id: 3, title: 'Corridor Expansion Environmental Study', type: 'Report', date: '2025-09-20', status: 'read', department: 'Engineering' },
        { id: 4, title: 'Updated HR Policy on Remote Work', type: 'HR Policy', date: '2025-09-19', status: 'read', department: 'HR' },
        { id: 5, title: 'Depot HVAC Maintenance Plan', type: 'Maintenance', date: '2025-09-18', status: 'deadline', department: 'Maintenance' },
        { id: 6, title: 'Purchase Order PO-2025-582', type: 'Procurement', date: '2025-09-17', status: 'read', department: 'Finance' },
        { id: 7, title: 'Weekly Incident Report Summary', type: 'Report', date: '2025-09-22', status: 'unread', department: 'all' },
    ];
    return { documents };
};


// --- Reusable Components (No change needed here) ---

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: number; color: string }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-start gap-4">
        <div className={`p-3 rounded-md ${color}`}>{icon}</div>
        <div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-400">{title}</p>
        </div>
    </div>
);

const DocumentItem = ({ doc }: { doc: Document }) => {
    const statusStyles: { [key: string]: { text: string, bg: string, label: string } } = {
        read: { text: 'text-gray-300', bg: 'bg-gray-600', label: 'Read' },
        unread: { text: 'text-blue-300', bg: 'bg-blue-800', label: 'Unread' },
        deadline: { text: 'text-yellow-300', bg: 'bg-yellow-800', label: 'Deadline' },
        approval_pending: { text: 'text-orange-300', bg: 'bg-orange-800', label: 'Pending Approval' },
    };
    const currentStatus = statusStyles[doc.status] || statusStyles.read;

    return (
        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-md hover:bg-gray-700 transition-colors duration-200">
            <div className="flex items-center gap-4">
                <FileText className="text-gray-500" size={24} />
                <div>
                    <p className="font-semibold text-white">{doc.title}</p>
                    <p className="text-sm text-gray-400">{doc.type} &bull; {doc.date}</p>
                </div>
            </div>
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${currentStatus.bg} ${currentStatus.text}`}>
                {currentStatus.label}
            </span>
        </div>
    );
};


// --- Main Dashboard Page Component ---

export default function DashboardPage() {
    const searchParams = useSearchParams();

    // State for storing user data, documents, and loading status
    const [user, setUser] = useState<UserProfile | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNotification, setShowNotification] = useState(true);

    // useEffect hook to fetch data when the component loads
    useEffect(() => {
        const loadData = async () => {
            try {
                const { documents } = await fetchDashboardData();

                // Determine department from URL or localStorage
                const urlDept = (searchParams.get('dept') || '').toLowerCase();
                let storedUser: any = null;
                try {
                    storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('kmrl_user') || 'null') : null;
                } catch {}

                const isAdmin = storedUser?.isAdmin || urlDept === 'admin';
                const departmentLabel = isAdmin ? undefined : (storedUser?.department || (urlDept ? urlDept.charAt(0).toUpperCase() + urlDept.slice(1) : 'Operations'));
                const currentUser: UserProfile = {
                    name: storedUser?.name || 'Employee',
                    role: isAdmin ? 'admin' : 'department',
                    department: departmentLabel,
                    deptSlug: isAdmin ? 'admin' : (storedUser?.deptSlug || urlDept || 'operations'),
                };

                const filtered = documents.filter(doc =>
                    isAdmin || doc.department.toLowerCase() === currentUser.deptSlug || doc.department === 'all'
                );

                setUser(currentUser);
                setDocuments(filtered);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                // Handle error state here, e.g., show an error message
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
        // Re-run when dept query changes
    }, [searchParams]);

    // If data is loading, show a loading spinner
    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-gray-900 text-gray-300 items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="ml-4 text-xl">Loading Dashboard...</p>
            </div>
        );
    }

    // If no user data, something went wrong
    if (!user) {
        return (
            <div className="flex min-h-screen bg-gray-900 text-gray-300 items-center justify-center">
                <p className="text-xl text-red-400">Could not load user data. Please try logging in again.</p>
            </div>
        );
    }

    // --- Calculations are now based on state, not mock data ---
    const readCount = documents.filter(d => d.status === 'read').length;
    const deadlineCount = documents.filter(d => d.status === 'deadline').length;
    const pendingCount = documents.filter(d => d.status === 'approval_pending').length;
    const updatesCount = documents.filter(d => d.status === 'unread').length;

    return (
        <div className="flex min-h-screen bg-gray-900 text-gray-300">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-gray-950 p-6 flex-shrink-0 flex flex-col">
                <h1 className="text-2xl font-bold text-white mb-8">Docu <span className="text-blue-500">Sphere</span></h1>
                <nav className="flex flex-col gap-4">
                    <a href="/dashboard" className="bg-gray-800 text-white p-3 rounded-md">Dashboard</a>
                    <a href="/documents" className="text-gray-400 hover:bg-gray-800 hover:text-white p-3 rounded-md">Documents</a>
                    <a href="#" className="text-gray-400 hover:bg-gray-800 hover:text-white p-3 rounded-md">Reports</a>
                    <a href="#" className="text-gray-400 hover:bg-gray-800 hover:text-white p-3 rounded-md">Approvals</a>
                </nav>
                <div className="mt-auto">
                    <a href="#" className="text-gray-400 hover:bg-gray-800 hover:text-white p-3 rounded-md flex items-center gap-2"><Settings size={20} /> Settings</a>
                    <a href="/" className="text-gray-400 hover:bg-gray-800 hover:text-white p-3 rounded-md flex items-center gap-2"><LogOut size={20} /> Logout</a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white">{user.role === 'admin' ? 'Admin Dashboard' : `${user.department} Dashboard`}</h2>
                        <p className="text-gray-400">Welcome back, {user.name}! Department: {user.role === 'admin' ? 'Admin' : user.department}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input type="text" placeholder="Search documents..." className="bg-gray-800 border border-gray-700 text-white rounded-md pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-md">
                            <User size={20} className="text-gray-400" />
                            <span className="text-white font-semibold">{user.name}</span>
                            <ChevronDown size={16} className="text-gray-500" />
                        </div>
                    </div>
                </header>

                {/* 1. Popping Notification */}
                {showNotification && updatesCount > 0 && (
                    <div className="bg-blue-600 text-white p-4 rounded-lg mb-8 flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <Bell size={24} />
                            <p>
                                <span className="font-bold">New For You:</span> There are {updatesCount} new updates in your feed.
                                {pendingCount > 0 && ` You also have ${pendingCount} pending approval(s).`}
                            </p>
                        </div>
                        <button onClick={() => setShowNotification(false)} className="hover:bg-blue-500 p-1 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* 3. Quick Cards Section */}
                <section className="mb-8">
                    <h3 className="text-xl font-semibold text-white mb-4">Your Quick Stats</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard icon={<FileText size={24} />} title="Documents Read" value={readCount} color="bg-gray-600" />
                        <StatCard icon={<Clock size={24} />} title="On Deadlines" value={deadlineCount} color="bg-yellow-600" />
                        <StatCard icon={<CheckCircle size={24} />} title="Pending Approvals" value={pendingCount} color="bg-orange-600" />
                        <StatCard icon={<RefreshCw size={24} />} title="New Updates" value={updatesCount} color="bg-blue-600" />
                    </div>
                </section>

                {/* 2. Personalized Feed */}
                <section>
                    <h3 className="text-xl font-semibold text-white mb-4">Personalized Document Feed</h3>
                    <div className="space-y-4">
                        {documents.length > 0 ? (
                            documents.map(doc => <DocumentItem key={doc.id} doc={doc} />)
                        ) : (
                            <div className="text-center py-12 bg-gray-800 rounded-md">
                                <p className="text-gray-400">No documents found for your department.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
