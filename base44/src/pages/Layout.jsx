import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
    const location = useLocation();

    const getLinkClass = (path) => {
        return location.pathname === path
            ? 'text-primary font-semibold'
            : 'text-muted-foreground hover:text-primary';
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 hidden md:flex">
                        <Link to="/" className="mr-6 flex items-center space-x-2">
                            <span className="hidden font-bold sm:inline-block">TH Simulators</span>
                        </Link>
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            <Link to="/LiveopSimulator" className={getLinkClass('/LiveopSimulator')}>
                                Liveop Simulator
                            </Link>
                            <Link to="/LayoutGeneratorSimulator" className={getLinkClass('/LayoutGeneratorSimulator')}>
                                Layout Generator
                            </Link>
                        </nav>
                    </div>
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        {/* Future right-side content can go here */}
                    </div>
                </div>
            </header>
            <main className="flex-1">
            {children}
            </main>
        </div>
    );
}
