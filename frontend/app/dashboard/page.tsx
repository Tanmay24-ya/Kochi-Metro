'use client';
import { parse, isValid, format } from 'date-fns';import { useState, useEffect, useMemo } from 'react';
import {
    Bell,
    FileText,
    Loader2,
    Settings,
    LogOut,
    Clock,
    FolderKanban,
    LayoutDashboard,
    BarChart2,
    CheckSquare
} from 'lucide-react';
import Link from "next/link";
import Calendar from 'react-calendar';
import { Tooltip } from 'react-tooltip';
import {NavLink} from "@/app/documents/components";

// --- Define Types ---
type Notification = { id: string; document_id: string; message: string; created_at: string; };
type Document = {
    id: string;
    title: string;
    department: string; // Add department
    deadlines?: string[]; // Add deadlines
    // Add any other fields from the backend if needed for stats
};
type UserProfile = { name: string; department: string; isAdmin: boolean; };

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');

// --- Reusable Components ---
const StatCard = ({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) => (
    <div className="bg-gray-800 p-6 rounded-lg flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        <div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-400">{title}</p>
        </div>
    </div>
);

// const DeadlineCalendar = ({ documents }: { documents: Document[] }) => {
//     // This logic to find which dates have deadlines is already correct.
//     const deadlineDates = useMemo(() => {
//         const dates = new Set<string>();
//         documents.forEach(doc => {
//             doc.deadlines?.forEach(deadlineStr => {
//                 const match = deadlineStr.match(/(\d{4}-\d{2}-\d{2})/);
//                 if (match) {
//                     dates.add(match[1]); // Add just the 'YYYY-MM-DD' string
//                 }
//             });
//         });
//         return dates;
//     }, [documents]);
//
//     // --- THIS IS THE FIX ---
//     // We use tileClassName to add a CSS class to dates that have a deadline.
//     const tileClassName = ({ date, view }: { date: Date, view: string }) => {
//         if (view === 'month') {
//             const dateString = date.toISOString().slice(0, 10);
//             if (deadlineDates.has(dateString)) {
//                 // This CSS class will make the date stand out.
//                 return 'deadline-date';
//             }
//         }
//         return null;
//     };
//
//     return (
//         <div className="bg-gray-800 p-4 rounded-lg">
//             <h4 className="font-semibold text-white mb-2">Deadline Calendar</h4>
//             {/* We now use tileClassName instead of tileContent */}
//             <Calendar tileClassName={tileClassName} className="w-full border-none" />
//             <p className="text-xs text-center mt-2 text-gray-400">
//                 <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
//                 Indicates a document deadline.
//             </p>
//         </div>
//     );
// };
const DeadlineCalendar = ({ documents }: { documents: Document[] }) => {
    const deadlineDates = useMemo(() => {
        const dates = new Set<string>();
        documents.forEach(doc => {
            doc.deadlines?.forEach(deadlineStr => {
                // --- THIS IS THE NEW, SMARTER LOGIC ---
                // Try to find any common date-like pattern in the string
                const dateMatch = deadlineStr.match(/(\d{1,2}(st|nd|rd|th)?\s\w+\s\d{4})|(\d{4}-\d{2}-\d{2})/i);

                if (dateMatch) {
                    // Call the imported functions directly, without the prefix.
                    const parsedDate = parse(dateMatch[0], 'do MMMM yyyy', new Date());
                    const parsedDateISO = parse(dateMatch[0], 'yyyy-MM-dd', new Date());

                    let validDate: Date | null = null;
                    if(isValid(parsedDate)) {
                        validDate = parsedDate;
                    } else if (isValid(parsedDateISO)) {
                        validDate = parsedDateISO;
                    }

                    if (validDate) {
                        dates.add(format(validDate, 'yyyy-MM-dd'));
                    }
                }
                // --- END OF NEW LOGIC ---
            });
        });
        return dates;
    }, [documents]);

    const tileClassName = ({ date, view }: { date: Date, view: string }) => {
        if (view === 'month') {
            const dateString = format(date, 'yyyy-MM-dd'); // Use date-fns for consistency
            if (deadlineDates.has(dateString)) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                // Compare dates correctly
                return date < today ? 'deadline-date-past' : 'deadline-date-future';
            }
        }
        return null;
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Deadline Calendar</h4>
            <Calendar tileClassName={tileClassName} className="w-full border-none" />
            <div className="text-xs text-center mt-2 space-x-4 text-gray-400">
                <span><span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>Upcoming</span>
                {/*<span><span className="inline-block w-3 h-3 bg-gray-500 rounded-full mr-2"></span>Past</span>*/}
            </div>
        </div>
    );
};


export default function DashboardPage() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            let storedUser: any = JSON.parse(localStorage.getItem('kmrl_user') || 'null');
            if (!storedUser) { setIsLoading(false); return; }

            // const currentUser: UserProfile = {
            //     name: storedUser.name || 'Admin',
            //     department: storedUser.department || 'All',
            //     isAdmin: storedUser.isAdmin || false,
            // };
            // setUser(currentUser);
            const currentUser: UserProfile = { name: storedUser.name, department: storedUser.department, isAdmin: storedUser.isAdmin };
            setUser(currentUser);

            if (currentUser.isAdmin) {
                // Fetch ALL documents from the /documents/ endpoint.
                const response = await fetch(`${API_BASE}/documents/`);
                if (response.ok) {
                    const allDocs = await response.json();
                    setDocuments(allDocs);
                }
            }

            try {
                // Fetch both notifications and documents
                const [notifRes, docsRes] = await Promise.all([
                    fetch(`${API_BASE}/notifications/${currentUser.department}`),
                    fetch(`${API_BASE}/documents/${currentUser.department}`)
                ]);

                if (notifRes.ok) setNotifications(await notifRes.json());
                if (docsRes.ok) setDocuments(await docsRes.json());

            } catch (error) { console.error("Failed to fetch dashboard data:", error); }
            finally { setIsLoading(false); }
        };
        loadData();
    }, []);

    const deadlinesCount = useMemo(() => {
        const uniqueUpcomingDeadlines = new Set<string>();
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to the beginning of today

        documents.forEach(doc => {
            doc.deadlines?.forEach(deadlineStr => {
                const match = deadlineStr.match(/(\d{4}-\d{2}-\d{2})/);
                if (match) {
                    const dateString = match[1];
                    const deadlineDate = new Date(dateString);
                    if (deadlineDate >= today) {
                        uniqueUpcomingDeadlines.add(dateString);
                    }
                }
            });
        });

        return uniqueUpcomingDeadlines.size;
    }, [documents]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-gray-900 text-gray-300 items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="ml-4 text-xl">Loading Dashboard...</p>
            </div>
        );
    }

    // --- THIS IS THE NEW, CORRECTED BLOCK ---
    if (user?.isAdmin) {
        // Perform all calculations here, inside the block.
        // This ensures they only run when the admin view is rendered.
        const totalDocs = documents.length;
        const financeDocs = documents.filter(d => d.department === 'Finance').length;
        const opsDocs = documents.filter(d => d.department === 'Operations').length;

        // IMPORTANT: Use the 'deadlinesCount' from the useMemo hook for an accurate count of unique, upcoming deadlines.
        const allDeadlines = deadlinesCount;

        return (
            <div className="flex h-screen bg-gray-900 text-gray-300">
                {/* --- Sidebar --- */}
                <aside className="w-64 bg-gray-950 p-6 flex-shrink-0 flex flex-col">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-8">Docu Sphere</h1>
                        <nav className="flex flex-col gap-4">
                            <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} isActive={true}>Dashboard</NavLink>
                            <NavLink href="/admin" icon={<FolderKanban size={20} />} isActive={false}>Admin Documents</NavLink>
                            <NavLink href="#" icon={<BarChart2 size={20} />} isActive={false}>Reports</NavLink>
                            <NavLink href="#" icon={<CheckSquare size={20} />} isActive={false}>Approvals</NavLink>
                        </nav>
                    </div>
                    <div className="mt-auto">
                        <NavLink href="#" icon={<Settings size={20} />} isActive={false}>Settings</NavLink>
                        <NavLink href="/" icon={<LogOut size={20} />} isActive={false}>Logout</NavLink>
                    </div>
                </aside>

                {/* --- Main Admin Content --- */}
                <main className="flex-1 p-8 overflow-y-auto">
                    <header className="mb-8">
                        <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
                        <p className="text-gray-400">Welcome, {user?.name}! Here is the sitewide overview.</p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Stats and Actions */}
                        <div className="lg:col-span-2 space-y-8">
                            <section>
                                <h3 className="text-xl font-semibold text-white mb-4">Sitewide Statistics</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <StatCard title="Total Documents" value={documents.length} icon={<FolderKanban size={24} />} color="bg-blue-600" />
                                    <StatCard title="Upcoming Deadlines" value={allDeadlines} icon={<Clock size={24} />} color="bg-yellow-600" />
                                    <StatCard title="Finance Docs" value={financeDocs} icon={<FileText size={24} />} color="bg-green-600" />
                                    <StatCard title="Operations Docs" value={opsDocs} icon={<FileText size={24} />} color="bg-blue-600" />
                                </div>
                            </section>

                            <section className="bg-gray-800 p-6 rounded-lg">
                                <h3 className="text-xl font-semibold text-white mb-4">Admin Actions</h3>
                                <p className="text-gray-400 mb-4">Your primary tool for managing and uploading all documents is the Admin Documents page.</p>
                                <Link href="/admin" className="inline-block bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700">
                                    Go to Admin Documents View
                                </Link>
                            </section>
                        </div>

                        {/* Right Column: Calendar */}
                        <div className="lg:col-span-1">
                            <DeadlineCalendar documents={documents} />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // const deadlinesCount = documents.reduce((acc, doc) => acc + (doc.deadlines?.length || 0), 0);


    return (
        <div className="flex h-screen bg-gray-900 text-gray-300">
            <aside className="w-64 bg-gray-950 p-6 flex-shrink-0 flex flex-col">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-8">Docu Sphere</h1>
                    <nav className="flex flex-col gap-4">
                        <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} isActive={true}>Dashboard</NavLink>
                        {/* Admin sees a link to the admin page, others see the documents page */}
                        {user?.isAdmin ? (
                            <NavLink href="/admin" icon={<FolderKanban size={20} />} isActive={false}>Admin Documents</NavLink>
                        ) : (
                            <NavLink href="/documents" icon={<FolderKanban size={20} />} isActive={false}>Documents</NavLink>
                        )}
                        <NavLink href="#" icon={<BarChart2 size={20} />} isActive={false}>Reports</NavLink>
                        <NavLink href="#" icon={<CheckSquare size={20} />} isActive={false}>Approvals</NavLink>
                    </nav>
                </div>
                <div className="mt-auto">
                    <NavLink href="#" icon={<Settings size={20} />} isActive={false}>Settings</NavLink>
                    <NavLink href="/" icon={<LogOut size={20} />} isActive={false}>Logout</NavLink>
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8">
                    <h2 className="text-3xl font-bold text-white">{user?.department} Dashboard</h2>
                    <p className="text-gray-400">Welcome, {user?.name}! Here is the sitewide overview.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content: Stats and Notifications */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <h3 className="text-xl font-semibold text-white mb-4">Department Stats</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard title="Total Documents" value={documents.length} icon={<FolderKanban size={24} />} color="bg-blue-600" />
                                <StatCard title="Upcoming Deadlines" value={deadlinesCount} icon={<Clock size={24} />} color="bg-yellow-600" />
                                <StatCard title="New Notifications" value={notifications.length} icon={<Bell size={24} />} color="bg-green-600" />
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold text-white mb-4">Notification & Activity Feed</h3>
                            <div className="space-y-4">
                                {notifications.length === 0 && documents.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-800 rounded-md"><p>No new activity.</p></div>
                                ) : (
                                    <>
                                        {notifications.map(notif => (
                                            <div key={notif.id} className="bg-gray-800 p-4 rounded-lg flex items-center gap-3 border-l-4 border-yellow-400">
                                                <Bell className="text-yellow-400 flex-shrink-0" />
                                                <div>
                                                    <p className="text-white font-semibold">{notif.message}</p>
                                                    <p className="text-xs text-gray-500">{new Date(notif.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Show the most recent document as an 'activity' if no notifications exist */}
                                        {notifications.length === 0 && documents.length > 0 && (
                                            <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-3 border-l-4 border-blue-500">
                                                <FileText className="text-blue-400 flex-shrink-0" />
                                                <div>
                                                    <p className="text-white">New document assigned: '{documents[0].title}'</p>
                                                    <p className="text-xs text-gray-500">This is the most recent document for your department.</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar: Calendar */}
                    <div className="lg:col-span-1">
                        <DeadlineCalendar documents={documents} />
                    </div>
                </div>


            </main>
        </div>
    );
}
