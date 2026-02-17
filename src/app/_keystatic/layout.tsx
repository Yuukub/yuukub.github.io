import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Keystatic Admin',
    robots: {
        index: false,
        follow: false,
    },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="keystatic-admin">
            {children}
        </div>
    );
}
