'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    FileText, Settings, LogOut, Search, ChevronDown, Loader2, Upload, X, ArrowUp, ArrowDown, FileImage,
    LayoutDashboard, FolderKanban, BarChart2, CheckSquare, Globe
} from 'lucide-react';
import Link from 'next/link';

// Base URL for backend API with safe fallback for client-side usage
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/,'');

// --- Define Types for our Data ---
type Document = {
    id: number;
    title: string;
    title_ml: string; // Malayalam title
    type: string;
    date: string; // Using ISO format for easy sorting, e.g., '2025-09-23'
    status: 'read' | 'unread' | 'deadline' | 'approval_pending';
    department: string;
    summary: string; // English summary
    summary_ml: string; // Malayalam summary
    previewUrl?: string; // URL to a preview image/thumbnail (could be PDF)
};

// --- API Simulation ---
// const fetchDocumentsData = async (): Promise<Document[]> => {
//     console.log("Fetching documents from backend...");
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     // In a real app, this would be a filtered list based on the user's permissions.
//     return [
//         { id: 1, title: 'Q3 Vendor Invoice Batch', title_ml: 'Q3 വെണ്ടർ ഇൻവോയ്സ് ബാച്ച്', type: 'Invoice', date: '2025-09-22', status: 'approval_pending', department: 'Finance', summary: 'A batch of 48 invoices from Q3 totaling $152,840. Awaiting approval from the finance head. Three invoices are flagged for discrepancies.', summary_ml: 'Q3-ൽ നിന്നുള്ള 48 ഇൻവോയിസുകളുടെ ഒരു ബാച്ച്, ആകെ $152,840. ഫിനാൻസ് മേധാവിയുടെ അംഗീകാരത്തിനായി കാത്തിരിക്കുന്നു. മൂന്ന് ഇൻവോയിസുകളിൽ പൊരുത്തക്കേടുകൾ കണ്ടെത്തിയിട്ടുണ്ട്.', previewUrl: 'https://placehold.co/800x1131/1f2937/a0aec0?text=Invoice+PDF' },
//         { id: 2, title: 'New Safety Circular (SC-113)', title_ml: 'പുതിയ സുരക്ഷാ സർക്കുലർ (SC-113)', type: 'Safety Bulletin', date: '2025-09-21', status: 'unread', department: 'Operations', summary: 'Mandatory update to platform safety protocols regarding passenger boarding during peak hours. All station masters must acknowledge receipt by EOD.', summary_ml: 'തിരക്കേറിയ സമയങ്ങളിൽ യാത്രക്കാർ കയറുന്നത് സംബന്ധിച്ച പ്ലാറ്റ്ഫോം സുരക്ഷാ പ്രോട്ടോക്കോളുകളിൽ നിർബന്ധിത അപ്ഡേറ്റ്. എല്ലാ സ്റ്റേഷൻ മാസ്റ്റർമാരും രസീത് അംഗീകരിക്കണം.', previewUrl: 'https://placehold.co/800x1131/1f2937/a0aec0?text=Circular' },
//         { id: 3, title: 'Corridor Expansion Study', title_ml: 'ഇടനാഴി വിപുലീകരണ പഠനം', type: 'Report', date: '2025-09-20', status: 'read', department: 'Engineering', summary: 'Feasibility study for the Phase II corridor expansion. Highlights geological challenges and recommends a revised route. Estimated cost increase of 8%.', summary_ml: 'ഘട്ടം II ഇടനാഴി വിപുലീകരണത്തിനുള്ള സാധ്യതാ പഠനം. ഭൗമശാസ്ത്രപരമായ വെല്ലുവിളികൾ എടുത്തു കാണിക്കുകയും പരിഷ്കരിച്ച റൂട്ട് ശുപാർശ ചെയ്യുകയും ചെയ്യുന്നു. 8% ചെലവ് വർദ്ധനവ് കണക്കാക്കുന്നു.' },
//         { id: 4, title: 'Updated HR Policy on Remote Work', title_ml: 'റിമോട്ട് വർക്കിനെക്കുറിച്ചുള്ള പുതിയ എച്ച്ആർ നയം', type: 'HR Policy', date: '2025-09-19', status: 'read', department: 'HR', summary: 'Revised guidelines for remote and hybrid work arrangements, effective October 1st. Includes new eligibility criteria and application process.', summary_ml: 'ഒക്ടോബർ 1 മുതൽ പ്രാബല്യത്തിൽ വരുന്ന റിമോട്ട്, ഹൈബ്രിഡ് വർക്ക് ക്രമീകരണങ്ങൾക്കുള്ള പുതുക്കിയ മാർഗ്ഗനിർദ്ദേശങ്ങൾ. പുതിയ യോഗ്യതാ മാനദണ്ഡങ്ങളും അപേക്ഷാ പ്രക്രിയയും ഉൾപ്പെടുന്നു.' },
//         { id: 5, title: 'Job Card #MJC-7891', title_ml: 'ജോലി കാർഡ് #MJC-7891', type: 'Maintenance', date: '2025-09-18', status: 'deadline', department: 'Engineering', summary: 'Urgent maintenance required for the HVAC unit on Train Car 04. Deadline for completion is 2025-09-25. Parts have been dispatched.', summary_ml: 'ട്രെയിൻ കാർ 04-ലെ എച്ച്‌വിഎസി യൂണിറ്റിന് അടിയന്തര അറ്റകുറ്റപ്പണി ആവശ്യമാണ്. പൂർത്തിയാക്കാനുള്ള അവസാന തീയതി 2025-09-25. ഭാഗങ്ങൾ അയച്ചിട്ടുണ്ട്.' },
//     ];
// };


// --- Reusable Components ---

const NavLink = ({ href, icon, children, isActive }: { href: string; icon: React.ReactNode; children: React.ReactNode; isActive: boolean; }) => (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
        {icon}
        <span className="font-medium">{children}</span>
    </Link>
);

const DocumentViewerModal = ({ doc, onClose }: { doc: Document; onClose: () => void; }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'original'>('summary');
    const [language, setLanguage] = useState<'en' | 'ml'>('en');

    const displayTitle = language === 'en' ? doc.title : doc.title_ml;
    const displaySummary = language === 'en' ? doc.summary : doc.summary_ml;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-900 w-full h-full md:w-11/12 md:h-5/6 md:rounded-lg shadow-2xl flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-white">{displayTitle}</h3>
                        <p className="text-sm text-gray-400">{doc.type} &bull; {doc.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-gray-800 p-1 rounded-lg flex gap-1">
                            <button onClick={() => setActiveTab('summary')} className={`px-3 py-1 text-sm rounded-md ${activeTab === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Summary</button>
                            <button onClick={() => setActiveTab('original')} className={`px-3 py-1 text-sm rounded-md ${activeTab === 'original' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Original</button>
                        </div>
                        <div className="flex bg-gray-800 p-1 rounded-md">
                            <button onClick={() => setLanguage('en')} className={`w-full text-sm px-2 py-1 rounded ${language === 'en' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>EN</button>
                            <button onClick={() => setLanguage('ml')} className={`w-full text-sm px-2 py-1 rounded ${language === 'ml' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>ML</button>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full"><X size={20} /></button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'summary' && (
                        <div className="text-gray-300 prose prose-invert max-w-none">
                            <h4 className="text-lg font-semibold text-white mb-4">AI Generated Summary</h4>
                            <p>{displaySummary}</p>
                        </div>
                    )}
                    {activeTab === 'original' && (
                        doc.previewUrl ? (
                            <iframe src={doc.previewUrl} className="w-full h-full bg-white rounded-md" title={doc.title}></iframe>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <FileImage size={64} />
                                <p className="mt-4">No original document preview available.</p>
                            </div>
                        )
                    )}
                </main>
            </div>
        </div>
    )
};


// --- Main Documents Page Component ---
export default function DocumentsPage() {
    const searchParams = useSearchParams();

    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Document; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [hoveredDoc, setHoveredDoc] = useState<Document | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });
    const [previewSide, setPreviewSide] = useState<'left' | 'right'>('right');
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

    const [deptSlug, setDeptSlug] = useState<string>('operations');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const init = async () => {
            const urlDept = (searchParams.get('dept') || '').toLowerCase();
            let storedUser: any = null;
            try {
                storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('kmrl_user') || 'null') : null;
            } catch {}
            const admin = storedUser?.isAdmin || urlDept === 'admin';
            setIsAdmin(admin);
            setDeptSlug(admin ? 'admin' : (storedUser?.deptSlug || urlDept || 'operations'));
            try {
                let fetchUrl = '';

                // --- THIS IS THE KEY LOGIC CHANGE ---
                if (admin) {
                    // If the user is an admin, call the new "get all" endpoint.
                    fetchUrl = `${API_BASE}/documents/?skip=0&limit=100`;
                } else {
                    // Otherwise, get the department-specific documents.
                    const deptToFetch = storedUser?.department || 'Operations';
                    fetchUrl = `${API_BASE}/documents/${encodeURIComponent(deptToFetch)}`;
                }
                // --- END OF LOGIC CHANGE ---

                console.log("Fetching documents from:", fetchUrl); // Good for debugging
                const response = await fetch(fetchUrl);
                if (!response.ok) {
                    throw new Error('Failed to fetch documents');
                }
                const backendDocs = await response.json();

                // Map backend documents to the frontend Document shape
                const mappedDocs: Document[] = (backendDocs || []).map((d: any) => ({
                    id: typeof d.id === 'string' ? d.id : Number(d.id) || Date.now(),
                    title: d.title,
                    title_ml: d.title, // fallback
                    type: 'Upload', // backend does not provide type; defaulting
                    date: d.upload_date ? new Date(d.upload_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                    status: 'unread', // default
                    department: d.department || 'Operations',
                    summary: 'Uploaded document.',
                    summary_ml: 'അപ്‌ലോഡ് ചെയ്ത രേഖ.',
                    previewUrl: undefined,
                }));

                setDocuments(mappedDocs);

            } catch (err) {
                console.error(err);
                // Handle fetch error, e.g., show a message to the user
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [searchParams]);

    const filteredByDept = useMemo(() => {
        if (isAdmin) return documents;
        return documents.filter(d => d.department.toLowerCase() === deptSlug || d.department === 'all');
    }, [documents, isAdmin, deptSlug]);

    const sortedAndFilteredDocuments = useMemo(() => {
        const sortedDocs = [...filteredByDept];
        sortedDocs.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        if (searchTerm) {
            return sortedDocs.filter(doc => doc.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return sortedDocs;
    }, [filteredByDept, sortConfig, searchTerm]);

    const handleMouseEnter = (doc: Document, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        if (rect.left > screenWidth / 2) {
            setPreviewSide('left');
            setPreviewPosition({ top: rect.top + rect.height / 2, left: rect.left });
        } else {
            setPreviewSide('right');
            setPreviewPosition({ top: rect.top + rect.height / 2, left: rect.right });
        }
        setHoveredDoc(doc);
    };

    const requestSort = (key: keyof Document) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-gray-900 items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-900 text-gray-300">
            <aside className="w-64 bg-gray-950 p-6 flex-shrink-0 flex flex-col">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-8">Docu Sphere</h1>
                    <nav className="flex flex-col gap-4">
                        <NavLink href="/dashboard" icon={<LayoutDashboard size={20}/>} isActive={false}>Dashboard</NavLink>
                        <NavLink href="/documents" icon={<FolderKanban size={20}/>} isActive={true}>Documents</NavLink>
                        <NavLink href="#" icon={<BarChart2 size={20}/>} isActive={false}>Reports</NavLink>
                        <NavLink href="#" icon={<CheckSquare size={20}/>} isActive={false}>Approvals</NavLink>
                    </nav>
                </div>
                <div className="mt-auto">
                    <NavLink href="#" icon={<Settings size={20} />} isActive={false}>Settings</NavLink>
                    <NavLink href="/" icon={<LogOut size={20} />} isActive={false}>Logout</NavLink>
                </div>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                {selectedDoc && <DocumentViewerModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
                {showUploadModal && ( <UploadModal currentDept={isAdmin ? 'Admin' : (deptSlug.charAt(0).toUpperCase() + deptSlug.slice(1))} canChooseDept={isAdmin} onClose={() => setShowUploadModal(false)} onUpload={(data) => {
                    const newDoc: Document = {
                        id: Date.now(),
                        title: data.title,
                        title_ml: data.title, // Default to English if no ML title provided
                        type: data.file ? (data.file.type || 'Upload') : 'Upload',
                        date: new Date().toISOString().slice(0, 10),
                        status: 'unread',
                        summary: 'A newly uploaded document.',
                        summary_ml: 'പുതുതായി അപ്‌ലോഡ് ചെയ്ത ഒരു രേഖ.',
                        department: isAdmin ? data.department : (deptSlug.charAt(0).toUpperCase() + deptSlug.slice(1)),
                    };
                    try {
                        const key = 'kmrl_uploads';
                        const existing = JSON.parse(localStorage.getItem(key) || '{}');
                        const deptKey = newDoc.department;
                        existing[deptKey] = [...(existing[deptKey] || []), newDoc];
                        localStorage.setItem(key, JSON.stringify(existing));
                    } catch {}
                    setDocuments(prev => [newDoc, ...prev]);
                }} /> )}
                {hoveredDoc && <DocumentPreview doc={hoveredDoc} position={previewPosition} side={previewSide} />}

                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white">{isAdmin ? 'All Departments' : (deptSlug.charAt(0).toUpperCase() + deptSlug.slice(1))} Documents</h2>
                        <p className="text-gray-400">{isAdmin ? 'Browse, search, and manage files visible to your admin account.' : 'Browse, search, and manage files visible to your department.'}</p>
                    </div>
                    <button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2">
                        <Upload size={20} /> Upload Document
                    </button>
                </header>
                <div className="flex items-center gap-4 mb-6 bg-gray-950 p-4 rounded-lg">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-800 border-gray-700 w-full text-white rounded-md pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Sort by:</span>
                        <button onClick={() => requestSort('date')} className="flex items-center gap-1 text-white hover:text-blue-400">
                            Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp size={16}/> : <ArrowDown size={16}/>)}
                        </button>
                        <button onClick={() => requestSort('title')} className="flex items-center gap-1 text-white hover:text-blue-400">
                            Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? <ArrowUp size={16}/> : <ArrowDown size={16}/>)}
                        </button>
                    </div>
                </div>

                <section>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {sortedAndFilteredDocuments.map(doc => (
                            <DocumentCard
                                key={doc.id}
                                doc={doc}
                                onClick={() => setSelectedDoc(doc)}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={() => setHoveredDoc(null)}
                            />
                        ))}
                    </div>
                    {sortedAndFilteredDocuments.length === 0 && (
                        <div className="text-center py-16 bg-gray-800 rounded-md">
                            <p className="text-gray-400">No documents match your criteria.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

// Helper components need to be updated to accept new props
const DocumentCard = ({ doc, onMouseEnter, onMouseLeave, onClick }: { doc: Document; onMouseEnter: (doc: Document, e: React.MouseEvent) => void; onMouseLeave: () => void; onClick: () => void; }) => {
    return (
        <div
            onClick={onClick}
            className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col justify-between h-48 cursor-pointer relative group"
            onMouseEnter={(e) => onMouseEnter(doc, e)}
            onMouseLeave={onMouseLeave}
        >
            <div>
                <FileText className="text-blue-400" size={32} />
                <h4 className="font-bold text-white mt-3 truncate">{doc.title}</h4>
            </div>
            <div>
                <p className="text-sm text-gray-400">{doc.type}</p>
                <p className="text-xs text-gray-500">{doc.date}</p>
            </div>
        </div>
    );
};

const DocumentPreview = ({ doc, position, side }: { doc: Document; position: { top: number, left: number }, side: 'left' | 'right' }) => {
    if (!doc) return null;

    const style = {
        top: position.top,
        left: position.left,
        transform: side === 'right' ? 'translate(10px, -50%)' : 'translate(calc(-100% - 10px), -50%)'
    };

    return (
        <div className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 w-64 text-white animate-fade-in" style={style}>
            {doc.previewUrl ?
                <img src={doc.previewUrl} alt="Preview" className="w-full h-auto rounded-md mb-3 aspect-[4/5] object-cover bg-gray-700" /> :
                <div className="w-full h-40 bg-gray-700 flex items-center justify-center rounded-md mb-3">
                    <FileImage size={48} className="text-gray-500" />
                </div>
            }
            <h5 className="font-bold text-lg mb-1">{doc.title}</h5>
            <p className="text-sm text-gray-400 mb-2">{doc.type} &bull; {doc.department}</p>
            <p className="text-xs text-gray-500">Last updated: {doc.date}</p>
        </div>
    );
};

const UploadModal = ({ onClose, onUpload, currentDept, canChooseDept }: { onClose: () => void; onUpload: (data: any) => void; currentDept: string; canChooseDept: boolean; }) => {
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [dept, setDept] = useState(currentDept);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !file) {
            alert('Title and file are required.');
            return;
        }
        let user: any = null;
        try {
            user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('kmrl_user') || 'null') : null;
        } catch {}

        if (!user) {
            alert('Could not find user info. Please log in again.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('department', dept);
        formData.append('user_id', user.userId); // Get user ID from our mock session
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE}/documents/upload`, {
                method: 'POST',
                body: formData,
                // DO NOT set Content-Type header, the browser does it for you with FormData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Upload failed');
            }

            const result = await response.json();
            onUpload(result.document_info); // Pass the new document data back to the page
            onClose();

        } catch (err: any) {
            alert(`Error: ${err.message}`);
            console.error(err);
        }

    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
                <h3 className="text-2xl font-bold text-white mb-6">Upload New Document</h3>
                <form className="space-y-4" onSubmit={submit}>
                    <div>
                        <label className="text-sm font-bold text-gray-400 block mb-2">Document Title</label>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="e.g., Q4 Financial Projections" className="w-full bg-gray-700 text-white rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-400 block mb-2">Department</label>
                        {canChooseDept ? (
                            <select value={dept} onChange={(e) => setDept(e.target.value)} className="w-full bg-gray-700 text-white rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="Finance">Finance</option>
                                <option value="Operations">Operations</option>
                                <option value="Engineering">Engineering</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="HR">HR</option>
                            </select>
                        ) : (
                            <input readOnly value={dept} className="w-full bg-gray-700 text-white rounded-md p-3" />
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-400 block mb-2">Document File</label>
                        <div className="border-2 border-dashed border-gray-600 rounded-md p-6 text-center relative">
                            <Upload size={40} className="mx-auto text-gray-500 mb-2"/>
                            <p className="text-gray-400">{file ? file.name : 'Drag & drop files here or click to browse'}</p>
                            <input onChange={(e) => setFile(e.target.files?.[0] || null)} type="file" className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                        </div>
                    </div>
                    <div className="pt-4">
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors">
                            Upload Document
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

