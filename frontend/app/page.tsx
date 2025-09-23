import Link from 'next/link';
import { BarChart, AlertTriangle, FileText, Users, Clock, Lightbulb } from 'lucide-react';

// A simple component for feature cards
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
        <div className="flex items-center gap-4 mb-3">
            <div className="bg-blue-800 text-blue-300 p-3 rounded-full">
                {icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-100">{title}</h3>
        </div>
        <p className="text-gray-400">{children}</p>
    </div>
);

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-50">
            {/* Header */}
            <header className="bg-gray-950 shadow-md">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="text-3xl font-extrabold text-white">
                        Docu <span className="text-blue-500">Sphere</span>
                    </Link>
                    <nav className="space-x-4">
                        <Link href="/login?role=department" className="text-gray-300 hover:text-blue-400 transition-colors text-lg px-4 py-2 rounded-md">
                            Department Login
                        </Link>
                        <Link href="/login?role=admin" className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition-colors text-lg">
                            Admin Login
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/animated-bg.gif')" }}>
                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-black opacity-70"></div>
                <div className="relative z-10 container mx-auto px-6 text-center text-white">
                    <h2 className="text-5xl md:text-6xl font-extrabold leading-tight drop-shadow-lg animate-fade-in-up">
                        Seamless Information, Smarter Decisions
                    </h2>
                    <p className="mt-6 text-xl text-gray-300 max-w-4xl mx-auto drop-shadow-md animate-fade-in-up delay-200">
                        Docu Sphere transforms vast quantities of documents into precise, actionable intelligence,
                        empowering every stakeholder to drive efficiency and uphold operational excellence.
                    </p>
                    <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6 animate-fade-in-up delay-400">
                        <Link href="/login?role=department" className="bg-blue-600 text-white text-xl px-10 py-4 rounded-full font-bold hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-xl">
                            Login as Department
                        </Link>
                        <Link href="/login?role=admin" className="bg-gray-700 text-white text-xl px-10 py-4 rounded-full font-bold hover:bg-gray-600 transition-transform transform hover:scale-105 shadow-xl">
                            Login as Admin
                        </Link>
                    </div>
                </div>
            </main>

            {/* About the Challenge Section */}
            <section className="py-24 bg-gray-900">
                <div className="container mx-auto px-6 text-center">
                    <h3 className="text-4xl font-bold text-white mb-6 animate-fade-in-up">The Challenge: Navigating Information Chaos</h3>
                    <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-12 animate-fade-in-up delay-100">
                        In a complex operation, critical information is constantly generated across diverse formats and departments.
                        Without a unified system, this creates significant bottlenecks and risks.
                    </p>
                    <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
                        <div className="text-left bg-gray-800 p-8 rounded-lg shadow-xl animate-fade-in-left">
                            <h4 className="text-2xl font-semibold text-blue-400 mb-4">Information Overload</h4>
                            <p className="text-gray-300">
                                Thousands of documents—engineering drawings, incident reports, invoices, regulatory directives—arrive daily.
                                This sheer volume overwhelms front-line managers, delaying crucial decisions on train availability,
                                contractor payments, and staffing.
                            </p>
                        </div>
                        <div className="text-left bg-gray-800 p-8 rounded-lg shadow-xl animate-fade-in-right">
                            <h4 className="text-2xl font-semibold text-blue-400 mb-4">Siloed Knowledge & Risks</h4>
                            <p className="text-gray-300">
                                Critical updates get buried, leading to missed deadlines, audit non-conformities, and lost institutional
                                memory when personnel transfer. Duplicate efforts waste valuable time and resources.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Solution Features Section */}
            <section className="bg-gray-950 py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h3 className="text-4xl font-bold text-white mb-4 animate-fade-in-up">Our Solution: Intelligent Document Hub</h3>
                        <p className="text-lg text-gray-400 max-w-3xl mx-auto animate-fade-in-up delay-100">
                            We empower every stakeholder with rapid, trustworthy snapshots of the documents that matter to them,
                            preserving traceability to the original source.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        <FeatureCard icon={<Clock size={28} />} title="Real-time Insights">
                            Get instant, actionable summaries of lengthy documents, accelerating decision-making across all departments.
                        </FeatureCard>
                        <FeatureCard icon={<Users size={28} />} title="Seamless Collaboration">
                            Break down departmental silos with cross-functional information sharing and unified awareness.
                        </FeatureCard>
                        <FeatureCard icon={<AlertTriangle size={28} />} title="Enhanced Compliance">
                            Automate tracking of regulatory updates, ensuring timely responses and audit readiness.
                        </FeatureCard>
                        <FeatureCard icon={<FileText size={28} />} title="Knowledge Preservation">
                            Transform static files into a dynamic, searchable knowledge base, safeguarding institutional memory.
                        </FeatureCard>
                        <FeatureCard icon={<BarChart size={28} />} title="Boosted Productivity">
                            Eliminate manual summarization and reporting, allowing teams to focus on strategic initiatives.
                        </FeatureCard>
                        <FeatureCard icon={<Lightbulb size={28} />} title="Future-Proof Scalability">
                            Designed to integrate emerging technologies like IoT and UNS, ready for future expansion.
                        </FeatureCard>
                    </div>
                </div>
            </section>

            {/* Call to Action Section */}
            <section className="py-20 bg-blue-700 text-white text-center">
                <div className="container mx-auto px-6">
                    <h3 className="text-4xl font-bold mb-4">Ready to Transform Your Operations?</h3>
                    <p className="text-xl max-w-3xl mx-auto mb-8">
                        Experience the power of streamlined information management. Log in to your dedicated portal.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Link href="/login?role=department" className="bg-white text-blue-700 text-xl px-10 py-4 rounded-full font-bold hover:bg-gray-200 transition-transform transform hover:scale-105 shadow-lg">
                            Department Access
                        </Link>
                        <Link href="/login?role=admin" className="bg-gray-900 text-white text-xl px-10 py-4 rounded-full font-bold hover:bg-gray-700 transition-transform transform hover:scale-105 shadow-lg">
                            Admin Access
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-950 text-gray-400 py-8">
                <div className="container mx-auto px-6 text-center">
                    <p className="mb-2">&copy; {new Date().getFullYear()} Docu Sphere. All Rights Reserved.</p>
                    <p className="text-sm">Empowering Kochi Metro with Intelligent Document Solutions.</p>
                </div>
            </footer>
        </div>
    );
}

