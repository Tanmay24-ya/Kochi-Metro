'use client';
import { useRef } from 'react';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    FileText, Settings, LogOut, Search, ChevronDown, Loader2, Upload, X, ArrowUp, ArrowDown, FileImage,
    LayoutDashboard, FolderKanban, BarChart2, CheckSquare, Globe, ListChecks, DollarSign
} from 'lucide-react';
import Link from 'next/link';

// Base URL for backend API with safe fallback for client-side usage
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');

// --- (1) UPDATE THE DOCUMENT TYPE to include the new ML-generated fields ---
type Document = {
    id: string; // The UUID from the backend is a string
    title: string;
    department: string;
    upload_date: string;
    file_path: string; // The public URL from Supabase
    status: string;
    summary?: string;
    deadlines?: string[];
    financial_terms?: string[];
};

// We need a type for the conversation history
type QnaPair = {
    id: string;
    question_text: string;
    answer_text: string | null;
    asked_at: string;
}

// --- Reusable Components ---

// This defines the "shape" of the context and creates a hook to use it.
const DocumentsPageContext = createContext<{ setShowQnaModalForDoc: (doc: Document | null) => void }>({
    setShowQnaModalForDoc: () => {}, // Default empty function
});
const useDocumentsPageContext = () => useContext(DocumentsPageContext);

const NavLink = ({ href, icon, children, isActive }: { href: string; icon: React.ReactNode; children: React.ReactNode; isActive: boolean; }) => (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
        {icon}
        <span className="font-medium">{children}</span>
    </Link>
);

// --- (4) ENHANCE THE MODAL to display the new ML data ---
const DocumentViewerModal = ({ doc, onClose, onOpenQna }: { doc: Document; onClose: () => void; onOpenQna: () => void; }) => {
    const [activeTab, setActiveTab] = useState<'summary' | 'original'>('summary');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-900 w-full h-full md:w-11/12 md:h-5/6 md:rounded-lg shadow-2xl flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-white">{doc.title}</h3>
                        <p className="text-sm text-gray-400">{doc.department} &bull; {doc.upload_date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-gray-800 p-1 rounded-lg flex gap-1">
                            <button
                                onClick={() => setActiveTab('summary')}
                                className={`px-3 py-1 text-sm rounded-md ${activeTab === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                                Summary & Details
                            </button>
                            <button
                                onClick={() => setActiveTab('original')}
                                className={`px-3 py-1 text-sm rounded-md ${activeTab === 'original' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                                Original Document
                            </button>
                        </div>

                        <button
                            onClick={onOpenQna}
                            className="bg-green-600 text-white px-4 py-1 text-sm rounded-md hover:bg-green-700 font-semibold"
                        >
                            Q&A on this Doc
                        </button>

                        <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full"><X size={20} /></button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6 text-gray-300">
                    {activeTab === 'summary' && (
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><FileText size={20} /> AI Generated Summary</h4>
                                <p className="prose prose-invert max-w-none">{doc.summary || 'No summary available.'}</p>
                            </div>

                            {(doc.deadlines && doc.deadlines.length > 0) && (
                                <div>
                                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><ListChecks size={20} /> Deadlines / Key Dates</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {doc.deadlines.map((deadline, index) => <li key={index}>{deadline}</li>)}
                                    </ul>
                                </div>
                            )}

                            {(doc.financial_terms && doc.financial_terms.length > 0) && (
                                <div>
                                    <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2"><DollarSign size={20} /> Financial Terms</h4>
                                     <ul className="list-disc pl-5 space-y-1">
                                        {doc.financial_terms.map((term, index) => <li key={index}>{term}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'original' && (
                        doc.file_path ? (
                            <iframe src={doc.file_path} className="w-full h-full bg-white rounded-md" title={doc.title}></iframe>
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

// --- ADD THIS NEW Q&A MODAL COMPONENT ---
const QnaModal = ({ doc, onClose }: { doc: Document; onClose: () => void; }) => {
    const [conversation, setConversation] = useState<QnaPair[]>([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(true); // Start loading true to fetch history

    const suggestedQuestions = [
        `What is the main summary of this document?`,
        `Are there any important deadlines mentioned?`,
        `What are the key financial terms in this document?`,
    ];

    // Function to fetch the conversation history
    const fetchConversation = async () => {
        try {
            const response = await fetch(`${API_BASE}/documents/${doc.id}/questions`);
            if (!response.ok) throw new Error("Failed to fetch history.");
            const data = await response.json();
            setConversation(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        // Check if there is a conversation and the last question has an answer
        if (conversation.length > 0 && conversation[conversation.length - 1].answer_text) {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current); // Stop the interval
                pollingIntervalRef.current = null;
            }
            setIsLoading(false); // Stop the loading indicator
        }
    }, [conversation]);
    // Fetch the history when the modal first opens
    useEffect(() => {
        fetchConversation().finally(() => setIsLoading(false));

        // Add this cleanup function to the end of the effect
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (scrollContainerRef.current) {
            const element = scrollContainerRef.current;
            // This smoothly scrolls the container to its maximum height
            element.scrollTo({
                top: element.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [conversation]);

    const handleAskQuestion = async (questionText: string) => {
        if (!questionText.trim()) return;

        const newQnaEntry: QnaPair = {
            id: `temp-${Date.now()}`, // A temporary ID for the React key
            question_text: questionText,
            answer_text: null, // It starts with "Awaiting answer..."
            asked_at: new Date().toISOString(),
        };
        setConversation(prev => [...prev, newQnaEntry]);
        setNewQuestion(''); // Clear the input box immediately
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE}/documents/${doc.id}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question_text: questionText }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit question.');
            }

// Start polling for the answer every 3 seconds
            pollingIntervalRef.current = setInterval(() => {
                fetchConversation();
            }, 3000);

// Add a safety timeout to stop polling after 30 seconds
            setTimeout(() => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    setIsLoading(false);
                }
            }, 30000);

        } catch (err: any) {
            alert(`Error: ${err.message}`);
            // Optionally, remove the optimistic update on error
            setConversation(prev => prev.filter(q => q.id !== newQnaEntry.id));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-800 w-full max-w-2xl h-5/6 rounded-lg shadow-2xl flex flex-col p-6">
                <header className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-white">Q&A on "{doc.title}"</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </header>

                <main ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {isLoading && <div className="text-center text-gray-400">Loading history...</div>}
                    {conversation.map(qna => (
                        <div key={qna.id}>
                            <p className="font-semibold text-blue-300">You asked:</p>
                            <p className="bg-gray-700 p-2 rounded-md mb-2">{qna.question_text}</p>
                            <p className="font-semibold text-green-300">Answer:</p>
                            <p className="bg-gray-900 p-2 rounded-md">
                                {qna.answer_text ? qna.answer_text : (
                                    <span className="text-gray-400 italic flex items-center">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Awaiting answer from AI...
    </span>
                                )}

                            </p>
                        </div>
                    ))}
                </main>

                <footer className="mt-4 flex-shrink-0">
                    <div className="flex gap-2 mb-3">
                        {suggestedQuestions.map((q, i) => (
                            <button key={i} onClick={() => handleAskQuestion(q)} className="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-left">
                                {q}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleAskQuestion(newQuestion); }} className="flex gap-2">
                        <input
                            type="text"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="Type your question here..."
                            className="flex-grow bg-gray-700 text-white rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md disabled:bg-gray-500">
                            Ask
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};


// --- Main Documents Page Component ---
export default function DocumentsPage() {
    const searchParams = useSearchParams();

    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Sort key is now a string to match the updated Document type
    const [sortConfig, setSortConfig] = useState<{ key: keyof Document; direction: 'asc' | 'desc' }>({ key: 'upload_date', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

    const [deptSlug, setDeptSlug] = useState<string>('operations');
    const [isAdmin, setIsAdmin] = useState(false);

    // const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [showQnaModalForDoc, setShowQnaModalForDoc] = useState<Document | null>(null);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            const urlDept = (searchParams.get('dept') || '').toLowerCase();
            let storedUser: any = null;
            try {
                storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('kmrl_user') || 'null') : null;
            } catch { }
            const admin = storedUser?.isAdmin || urlDept === 'admin';
            setIsAdmin(admin);
            setDeptSlug(admin ? 'admin' : (storedUser?.deptSlug || urlDept || 'operations'));

            try {
                let fetchUrl = '';
                if (admin) {
                    // fetchUrl = `${API_BASE}/documents/?skip=0&limit=100`;
                    fetchUrl = `${API_BASE}/documents/`;
                } else {
                    const deptToFetch = storedUser?.department || 'Operations';
                    fetchUrl = `${API_BASE}/documents/${encodeURIComponent(deptToFetch)}`;
                }

                const response = await fetch(fetchUrl);
                if (!response.ok) {
                    throw new Error('Failed to fetch documents');
                }
                const backendDocs = await response.json();

                // --- (2) FIX THE DATA MAPPING: Use the real data from the backend ---
                const mappedDocs: Document[] = (backendDocs || []).map((d: any) => ({
                    id: d.id,
                    title: d.title,
                    department: d.department,
                    upload_date: d.upload_date ? new Date(d.upload_date).toISOString().slice(0, 10) : 'N/A',
                    file_path: d.file_path,
                    status: d.status,
                    summary: d.summary,
                    deadlines: d.deadlines || [],
                    financial_terms: d.financial_terms || [],
                }));
                // --- END OF FIX ---

                setDocuments(mappedDocs);

            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [searchParams]);

    // This logic can be simplified as filtering is done on the frontend for now
    const sortedAndFilteredDocuments = useMemo(() => {
        let sortedDocs = [...documents];
        if (sortConfig.key) {
            sortedDocs.sort((a, b) => {
                if (a[sortConfig.key]! < b[sortConfig.key]!) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key]! > b[sortConfig.key]!) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        if (searchTerm) {
            return sortedDocs.filter(doc => doc.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return sortedDocs;
    }, [documents, sortConfig, searchTerm]);

    const requestSort = (key: keyof Document) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    if (isLoading) {
        return <div className="flex min-h-screen bg-gray-900 items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
    }

    return (
        <DocumentsPageContext.Provider value={{ setShowQnaModalForDoc }}>

        <div className="flex min-h-screen bg-gray-900 text-gray-300">
            {/*{selectedDoc && <DocumentViewerModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}*/}
            {selectedDoc && (
                <DocumentViewerModal
                    doc={selectedDoc}
                    onClose={() => setSelectedDoc(null)}
                    // This new prop defines what happens when the Q&A button is clicked
                    onOpenQna={() => {
                        setShowQnaModalForDoc(selectedDoc); // Open the QnA modal with the current doc
                        setSelectedDoc(null);             // Close this viewer modal
                    }}
                />
            )}
            {showQnaModalForDoc && <QnaModal doc={showQnaModalForDoc} onClose={() => setShowQnaModalForDoc(null)} />}

            <aside className="w-64 bg-gray-950 p-6 flex-shrink-0 flex flex-col">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-8">Docu Sphere</h1>
                    <nav className="flex flex-col gap-4">
                        <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} isActive={false}>Dashboard</NavLink>
                        <NavLink href="/documents" icon={<FolderKanban size={20} />} isActive={true}>Documents</NavLink>
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
                {/*<>{selectedDoc && <DocumentViewerModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}*/}

                {/*/!* --- ADD THE NEW QNA MODAL RIGHT HERE --- *!/*/}
                {/*{sho</>wQnaModalForDoc && <QnaModal doc={showQnaModalForDoc} onClose={() => setShowQnaModalForDoc(null)} />}*/}

                {showUploadModal && (
                    <UploadModal
                        currentDept={isAdmin ? 'Admin' : deptSlug.charAt(0).toUpperCase() + deptSlug.slice(1)}
                        canChooseDept={isAdmin}
                        onClose={() => setShowUploadModal(false)}
                        // --- (3) IMPROVE THE onUpload HANDLER ---
                        onUpload={(newlyUploadedDocFromServer) => {
                            // Map the single new document from the backend to our frontend type
                            const mappedDoc: Document = {
                                id: newlyUploadedDocFromServer.id,
                                title: newlyUploadedDocFromServer.title,
                                department: newlyUploadedDocFromServer.department,
                                upload_date: newlyUploadedDocFromServer.upload_date ? new Date(newlyUploadedDocFromServer.upload_date).toISOString().slice(0, 10) : 'N/A',
                                file_path: newlyUploadedDocFromServer.file_path,
                                status: newlyUploadedDocFromServer.status,
                                summary: newlyUploadedDocFromServer.summary,
                                deadlines: newlyUploadedDocFromServer.deadlines || [],
                                financial_terms: newlyUploadedDocFromServer.financial_terms || [],
                            };
                            // Add the new, confirmed document to the top of the list
                            setDocuments(prev => [mappedDoc, ...prev]);
                        }}
                    />
                )}

                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white">{isAdmin ? 'All Documents' : `${deptSlug.charAt(0).toUpperCase() + deptSlug.slice(1)} Documents`}</h2>
                        <p className="text-gray-400">Browse, search, and manage files.</p>
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
                        <button onClick={() => requestSort('upload_date')} className="flex items-center gap-1 text-white hover:text-blue-400">
                            Date {sortConfig.key === 'upload_date' && (sortConfig.direction === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
                        </button>
                        <button onClick={() => requestSort('title')} className="flex items-center gap-1 text-white hover:text-blue-400">
                            Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
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
                            />
                        ))}
                    </div>
                    {sortedAndFilteredDocuments.length === 0 && (
                        <div className="text-center py-16 bg-gray-800 rounded-md">
                            <p className="text-gray-400">No documents found.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
        </DocumentsPageContext.Provider>

    );
}


const DocumentCard = ({ doc, onClick }: { doc: Document; onClick: () => void; }) => {
    // This hook correctly gets the function to open the Q&A modal from the parent page
    const { setShowQnaModalForDoc } = useDocumentsPageContext();

    return (
        // This is the main container for styling
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col justify-between h-48 group hover:bg-gray-700 transition-colors">

            {/* Part 1: Main Clickable Area for Document Viewer */}
            {/* This div takes up most of the space and handles the original 'onClick' to view the PDF */}
            <div onClick={onClick} className="flex-grow cursor-pointer">
                <FileText className="text-blue-400" size={32} />
                <h4 className="font-bold text-white mt-3 truncate group-hover:text-blue-300">{doc.title}</h4>
                <p className="text-sm text-gray-400">{doc.department}</p>
            </div>

            {/* Part 2: Footer with Status and the new Q&A Button */}
            <div className="flex-shrink-0 pt-2">
                <p className="text-xs text-gray-500">Status: {doc.status}</p>

                {/* This is the new button for the Q&A feature */}
                <button
                    onClick={(e) => {
                        // This stops the click from also triggering the main card's onClick
                        e.stopPropagation();
                        // This calls the function from our context to open the Q&A modal
                        setShowQnaModalForDoc(doc);
                    }}
                    className="mt-2 w-full text-center bg-green-600 text-white text-xs py-1 rounded hover:bg-green-700 transition-colors font-semibold"
                >
                    Q&A
                </button>
            </div>
        </div>
    );
};


// UploadModal remains mostly the same, no major changes needed here
const UploadModal = ({ onClose, onUpload, currentDept, canChooseDept }: { onClose: () => void; onUpload: (data: any) => void; currentDept: string; canChooseDept: boolean; }) => {
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [dept, setDept] = useState(currentDept);
    const [isUploading, setIsUploading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !file) {
            alert('Title and file are required.');
            return;
        }
        setIsUploading(true);
        let user: any = null;
        try {
            user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('kmrl_user') || 'null') : null;
        } catch { }

        if (!user) {
            alert('Could not find user info. Please log in again.');
            setIsUploading(false);
            return;
        }

        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('department', dept);
        formData.append('user_id', user.userId);
        formData.append('file', file);

        try {
            const response = await fetch(`${API_BASE}/documents/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Upload failed');
            }

            const result = await response.json();
            onUpload(result.document_info);
            onClose();

        } catch (err: any) {
            alert(`Error: ${err.message}`);
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
                <h3 className="text-2xl font-bold text-white mb-6">Upload New Document</h3>
                <form className="space-y-4" onSubmit={submit}>
                    {/* Form fields remain the same */}
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
                            <Upload size={40} className="mx-auto text-gray-500 mb-2" />
                            <p className="text-gray-400">{file ? file.name : 'Drag & drop files here or click to browse'}</p>
                            <input onChange={(e) => setFile(e.target.files?.[0] || null)} type="file" className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                        </div>
                    </div>
                    <div className="pt-4">
                        <button type="submit" disabled={isUploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {isUploading && <Loader2 className="animate-spin" size={20} />}
                            {isUploading ? 'Analyzing...' : 'Upload Document'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};