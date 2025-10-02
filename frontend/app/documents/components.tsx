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
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');

// --- (1) UPDATE THE DOCUMENT TYPE to include the new ML-generated fields ---
export type Document = {
    id: string; // The UUID from the backend is a string
    title: string;
    department: string;
    upload_date: string;
    file_path: string; // The public URL from Supabase
    status: string;
    summary?: string;
    deadlines?: string[];
    financial_terms?: string[];
    highlighted_file_path?: string | null;
};

// We need a type for the conversation history
export type QnaPair = {
    id: string;
    question_text: string;
    answer_text: string | null;
    asked_at: string;
}

// --- Reusable Components ---

// This defines the "shape" of the context and creates a hook to use it.
export const DocumentsPageContext = createContext<{ setShowQnaModalForDoc: (doc: Document | null) => void }>({
    setShowQnaModalForDoc: () => {}, // Default empty function
});
export const useDocumentsPageContext = () => useContext(DocumentsPageContext);

export const NavLink = ({ href, icon, children, isActive }: { href: string; icon: React.ReactNode; children: React.ReactNode; isActive: boolean; }) => (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
        {icon}
        <span className="font-medium">{children}</span>
    </Link>
);

// --- (4) ENHANCE THE MODAL to display the new ML data ---
export const DocumentViewerModal = ({ doc, onClose, onOpenQna }: { doc: Document; onClose: () => void; onOpenQna: () => void; }) => {
    // 1. Add 'highlighted' as a possible state
    const [activeTab, setActiveTab] = useState<'summary' | 'original' | 'highlighted'>('summary');

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
                            {/* Tab 1: Summary (No change) */}
                            <button
                                onClick={() => setActiveTab('summary')}
                                className={`px-3 py-1 text-sm rounded-md ${activeTab === 'summary' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                                Summary & Details
                            </button>

                            {/* Tab 2: Original Document */}
                            <button
                                onClick={() => setActiveTab('original')}
                                className={`px-3 py-1 text-sm rounded-md ${activeTab === 'original' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                                Original Doc
                            </button>

                            {/* Tab 3: Highlighted Document */}
                            {/* This button is only shown if a highlighted path exists */}
                            {doc.highlighted_file_path && (
                                <button
                                    onClick={() => setActiveTab('highlighted')}
                                    className={`px-3 py-1 text-sm rounded-md ${activeTab === 'highlighted' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                >
                                    Highlighted Doc
                                </button>
                            )}
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
                                <p className="prose prose-invert max-w-none whitespace-pre-line">{doc.summary || 'No summary available.'}</p>
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
                    {/* View 2: Original Document View */}
                    {activeTab === 'original' && (
                        doc.file_path ? (
                            <iframe
                                src={doc.file_path}
                                className="w-full h-full bg-white rounded-md"
                                title={doc.title}
                            ></iframe>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <FileImage size={64} />
                                <p className="mt-4">No original document preview available.</p>
                            </div>
                        )
                    )}

                    {/* View 3: Highlighted Document View */}
                    {activeTab === 'highlighted' && (
                        doc.highlighted_file_path ? (
                            <iframe
                                src={doc.highlighted_file_path}
                                className="w-full h-full bg-white rounded-md"
                                title={`${doc.title} (Highlighted)`}
                            ></iframe>
                        ) : (
                            // This is a fallback in case the button was shown but the path is somehow invalid
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <FileImage size={64} />
                                <p className="mt-4">Highlighted document not available.</p>
                            </div>
                        )
                    )}
                </main>
            </div>
        </div>
    )
};

// --- ADD THIS NEW Q&A MODAL COMPONENT ---
export const QnaModal = ({ doc, onClose }: { doc: Document; onClose: () => void; }) => {
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


export const DocumentCard = ({ doc, onClick }: { doc: Document; onClick: () => void; }) => {
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
export const UploadModal = ({ onClose, onUpload, currentDept, canChooseDept }: { onClose: () => void; onUpload: (data: any) => void; currentDept: string; canChooseDept: boolean; }) => {
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