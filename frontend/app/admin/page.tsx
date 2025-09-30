'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {createContext, useContext, useState, useEffect, useMemo, useRef} from 'react';
import {
  FileText, Settings, LogOut, Search, Upload, X, Loader2,
  LayoutDashboard, FolderKanban, ArrowUp, ArrowDown, ListChecks, DollarSign, FileImage, BarChart2, CheckSquare
} from 'lucide-react';

import {
  DocumentsPageContext, DocumentViewerModal, QnaModal, UploadModal, DocumentCard,
  API_BASE, type Document, NavLink
} from '../documents/components';


// const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');

export default function AdminDashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Document; direction: 'asc' | 'desc' }>({ key: 'upload_date', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showQnaModalForDoc, setShowQnaModalForDoc] = useState<Document | null>(null);

  const fetchAllDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/documents/`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const backendDocs = await response.json();
      const mappedDocs: Document[] = (backendDocs || []).map((d: any) => ({
        id: d.id, title: d.title, department: d.department,
        upload_date: d.upload_date ? new Date(d.upload_date).toISOString().slice(0, 10) : 'N/A',
        file_path: d.file_path, status: d.status, summary: d.summary,
        deadlines: d.deadlines || [], financial_terms: d.financial_terms || [],
        highlighted_file_path: d.highlighted_file_path,
      }));
      setDocuments(mappedDocs);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAllDocuments(); }, []);

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

  if (isLoading) return <div className="..."><Loader2 className="animate-spin ..."/></div>;

  return (
      <DocumentsPageContext.Provider value={{ setShowQnaModalForDoc }}>
        <div className="flex min-h-screen bg-gray-900 text-gray-300">
          {selectedDoc && <DocumentViewerModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} onOpenQna={() => { setShowQnaModalForDoc(selectedDoc); setSelectedDoc(null); }} />}
          {showQnaModalForDoc && <QnaModal doc={showQnaModalForDoc} onClose={() => setShowQnaModalForDoc(null)} />}
          {showUploadModal && <UploadModal currentDept="Admin" canChooseDept={true} onClose={() => setShowUploadModal(false)} onUpload={fetchAllDocuments} />}

          <aside className="w-64 bg-gray-950 p-6 flex-shrink-0 flex flex-col">
            <div>
              <h1 className="text-2xl font-bold text-white mb-8">Docu Sphere</h1>
              <nav className="flex flex-col gap-4">
                {/* These were missing. Add them back. */}
                <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} isActive={false}>Dashboard</NavLink>
                <NavLink href="/admin" icon={<FolderKanban size={20} />} isActive={true}>Admin Documents</NavLink>
                <NavLink href="#" icon={<BarChart2 size={20} />} isActive={false}>Reports</NavLink>
                <NavLink href="#" icon={<CheckSquare size={20} />} isActive={false}>Approvals</NavLink>
              </nav>
            </div>
            <div className="mt-auto">
              <NavLink href="#" icon={<Settings size={20} />} isActive={false}>Settings</NavLink>
              <NavLink href="/" icon={<LogOut size={20} />} isActive={false}>Logout</NavLink>
            </div>
          </aside>

          {/* --- Main Content Area --- */}
          <main className="flex-1 p-8 overflow-y-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white">All Documents (Admin)</h2>
                <p className="text-gray-400">Manage, search, and upload files for all departments.</p>
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
              {sortedAndFilteredDocuments.length === 0 && !isLoading && (
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