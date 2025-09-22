import Link from 'next/link';
import { BarChart, AlertTriangle, FileText, Users, Clock } from 'lucide-react';

// A simple component for feature cards
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center gap-4 mb-3">
            <div className="bg-sky-100 text-sky-600 p-2 rounded-full">
                {icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600">{children}</p>
    </div>
);

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">
                        KMRL <span className="text-sky-600">Intelligent Hub</span>
                    </h1>
                    <nav className="space-x-4">
                        {/* Pass a query parameter to the login page to distinguish roles */}
                        <Link href="/login?role=department" className="text-gray-600 hover:text-sky-600 transition-colors">
                            Department Login
                        </Link>
                        <Link href="/login?role=admin" className="bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 transition-colors">
                            Admin Login
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="container mx-auto px-6 py-16 text-center">
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
                    Turn Information Overload into Actionable Intelligence
                </h2>
                <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                    Our platform condenses thousands of documents—reports, invoices, safety bulletins, and more—into trustworthy snapshots, empowering every KMRL stakeholder with the right information at the right time.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <Link href="/login?role=department" className="bg-sky-600 text-white text-lg px-8 py-3 rounded-full font-semibold hover:bg-sky-700 transition-transform hover:scale-105">
                        Login as Department
                    </Link>
                    <Link href="/login?role=admin" className="bg-gray-700 text-white text-lg px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-transform hover:scale-105">
                        Login as Admin
                    </Link>
                </div>
            </main>

            {/* Features Section */}
            <section className="bg-white py-20">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-12">
                        <h3 className="text-3xl font-bold text-gray-800">Addressing Critical Challenges</h3>
                        <p className="text-gray-500 mt-2">From latency to knowledge loss, we provide a unified solution.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard icon={<Clock size={24} />} title="Reduce Information Latency">
                            Stop wasting hours skimming. Get actionable summaries delivered instantly to front-line managers.
                        </FeatureCard>
                        <FeatureCard icon={<Users size={24} />} title="Break Down Silos">
                            Ensure Procurement, Engineering, and HR are all on the same page with cross-departmental awareness.
                        </FeatureCard>
                        <FeatureCard icon={<AlertTriangle size={24} />} title="Enhance Compliance">
                            Never miss a regulatory update again. Flag critical directives from CMRS and MoHUA automatically.
                        </FeatureCard>
                        <FeatureCard icon={<FileText size={24} />} title="Preserve Knowledge">
                            Safeguard institutional memory by transforming static files into a searchable, intelligent database.
                        </FeatureCard>
                        <FeatureCard icon={<BarChart size={24} />} title="Boost Productivity">
                            Eliminate duplicated effort in creating summaries and reports. Focus on what truly matters.
                        </FeatureCard>
                        <FeatureCard icon={<FileText size={24} />} title="Future-Ready">
                            Built to scale with KMRL's expansion, integrating new data streams from IoT and Unified Namespace.
                        </FeatureCard>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-6">
                <div className="container mx-auto px-6 text-center">
                    <p>&copy; {new Date().getFullYear()} Kochi Metro Rail Limited. All Rights Reserved.</p>
                </div>
            </footer>
        </div>
    );
}