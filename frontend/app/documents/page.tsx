'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    FileText, Settings, LogOut, Search, ChevronDown, Loader2, Upload, X, ArrowUp, ArrowDown, FileImage
} from 'lucide-react';

// --- Define Types for our Data ---
type Document = {
    id: number;
    title: string;
    type: string;
    date: string; // Using ISO format for easy sorting, e.g., '2025-09-23'
    status: 'read' | 'unread' | 'deadline' | 'approval_pending';
    department: string;
    previewUrl?: string; // URL to a preview image/thumbnail
};

// --- API Simulation ---
const fetchDocumentsData = async (): Promise<Document[]> => {
    console.log("Fetching documents from backend...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    // In a real app, this would be a filtered list based on the user's permissions.
    return [
        { id: 1, title: 'Q3 Vendor Invoice Batch', type: 'Invoice', date: '2025-09-22', status: 'approval_pending', department: 'Finance', previewUrl: 'https://placehold.co/400x565/1f2937/a0aec0?text=Invoice+Batch' },
        { id: 2, title: 'New Safety Circular (SC-113)', type: 'Safety Bulletin', date: '2025-09-21', status: 'unread', department: 'Operations' },
        { id: 3, title: 'Corridor Expansion Study', type: 'Report', date: '2025-09-20', status: 'read', department: 'Engineering' },
        { id: 4, title: 'Updated HR Policy on Remote Work', type: 'HR Policy', date: '2025-09-19', status: 'read', department: 'HR' },
        { id: 5, title: 'Job Card #MJC-7891', type: 'Maintenance', date: '2025-09-18', status: 'deadline', department: 'Engineering' },
        { id: 6, title: 'Purchase Order PO-2025-582', type: 'Procurement', date: '2025-09-17', status: 'read', department: 'Finance' },
        { id: 7, title: 'Weekly Incident Report', type: 'Report', date: '2025-09-22', status: 'unread', department: 'all' },
        { id: 8, title: 'Architectural Drawings - New Depot', type: 'Engineering', date: '2025-08-30', status: 'read', department: 'Engineering', previewUrl: 'https://placehold.co/400x565/1f2937/a0aec0?text=Blueprint' },
    ];
};


// --- Reusable Components ---

type UploadForm = { title: string; file?: File | null; department: string };

const UploadModal = ({ onClose, onUpload, currentDept, canChooseDept }: { onClose: () => void; onUpload: (data: UploadForm) => void; currentDept: string; canChooseDept: boolean; }) => {
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [dept, setDept] = useState(currentDept);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        onUpload({ title: title.trim(), file, department: dept });
        onClose();
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
                            <p className="text-gray-400">Drag & drop files here or click to browse</p>
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

const DocumentCard = ({ doc, onMouseEnter, onMouseLeave }: { doc: Document; onMouseEnter: (doc: Document, e: React.MouseEvent) => void; onMouseLeave: () => void; }) => {
    return (
        <div
            className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col justify-between h-48 cursor-pointer relative"
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

const DocumentPreview = ({ doc, position }: { doc: Document; position: { top: number, left: number } }) => {
    if (!doc) return null;
    return (
        <div className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 w-64 text-white animate-fade-in"
             style={{ top: position.top, left: position.left, transform: 'translate(10px, -50%)' }}>
            {doc.previewUrl ?
                <img src={doc.previewUrl} alt="Preview" className="w-full h-auto rounded-md mb-3" /> :
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

            const base = await fetchDocumentsData();

            // Load uploaded docs per department from localStorage mock store
            let uploads: Record<string, Document[]> = {};
            try {
                uploads = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('kmrl_uploads') || '{}') : {};
            } catch {}

            const merged = [...base, ...(admin ? Object.values(uploads).flat() : (uploads[(storedUser?.department || '').toString()] || uploads[(storedUser?.deptSlug || urlDept || '')] || []))];

            setDocuments(merged);
            setIsLoading(false);
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

    const requestSort = (key: keyof Document) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleMouseEnter = (doc: Document, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPreviewPosition({ top: rect.top + rect.height / 2, left: rect.right });
        setHoveredDoc(doc);
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
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-gray-950 p-6 flex-shrink-0">
                <h1 className="text-2xl font-bold text-white mb-8">KMRL <span className="text-blue-500">Hub</span></h1>
                <nav className="flex flex-col gap-4">
                    <a href="/dashboard" className="text-gray-400 hover:bg-gray-800 hover:text-white p-3 rounded-md">Dashboard</a>
                    <a href="/documents" className="bg-gray-800 text-white p-3 rounded-md">Documents</a>
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
                {showUploadModal && (
                    <UploadModal
                        onClose={() => setShowUploadModal(false)}
                        onUpload={(data) => {
                            const newDoc: Document = {
                                id: Date.now(),
                                title: data.title,
                                type: data.file ? (data.file.type || 'Upload') : 'Upload',
                                date: new Date().toISOString().slice(0, 10),
                                status: 'unread',
                                department: isAdmin ? data.department : (deptSlug.charAt(0).toUpperCase() + deptSlug.slice(1)),
                            };
                            // persist in localStorage grouped by department label
                            try {
                                const key = 'kmrl_uploads';
                                const existing = JSON.parse(localStorage.getItem(key) || '{}');
                                const deptKey = newDoc.department;
                                existing[deptKey] = [...(existing[deptKey] || []), newDoc];
                                localStorage.setItem(key, JSON.stringify(existing));
                            } catch {}
                            setDocuments(prev => [newDoc, ...prev]);
                        }}
                        currentDept={isAdmin ? 'Admin' : (deptSlug.charAt(0).toUpperCase() + deptSlug.slice(1))}
                        canChooseDept={isAdmin}
                    />
                )}
                {hoveredDoc && <DocumentPreview doc={hoveredDoc} position={previewPosition} />}

                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white">{isAdmin ? 'All Departments' : (deptSlug.charAt(0).toUpperCase() + deptSlug.slice(1))} Documents</h2>
                        <p className="text-gray-400">Browse, search, and manage files visible to your {isAdmin ? 'admin account' : 'department'}.</p>
                    </div>
                    <button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2">
                        <Upload size={20} /> Upload Document
                    </button>
                </header>

                {/* Search and Sort Controls */}
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

                {/* Documents Grid */}
                <section>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {sortedAndFilteredDocuments.map(doc => (
                            <DocumentCard key={doc.id} doc={doc} onMouseEnter={handleMouseEnter} onMouseLeave={() => setHoveredDoc(null)} />
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
