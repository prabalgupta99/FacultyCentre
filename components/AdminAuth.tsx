import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

interface AdminAuthProps {
    children: (onLogout: () => void) => React.ReactNode;
}

const ADMIN_AUTH_KEY = 'faculty_centre_admin_auth';

const AdminAuth: React.FC<AdminAuthProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const expectedPin = import.meta.env.VITE_ADMIN_PIN;

    useEffect(() => {
        // Check if already authenticated
        const storedAuth = localStorage.getItem(ADMIN_AUTH_KEY);
        if (storedAuth === expectedPin) {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, [expectedPin]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!expectedPin) {
            setError('Admin PIN not configured. Please set VITE_ADMIN_PIN in .env.local');
            return;
        }

        if (pin === expectedPin) {
            localStorage.setItem(ADMIN_AUTH_KEY, pin);
            setIsAuthenticated(true);
            setPin('');
        } else {
            setError('Incorrect PIN. Please try again.');
            setPin('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(ADMIN_AUTH_KEY);
        setIsAuthenticated(false);
        setPin('');
        setError('');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-colors_background_bg_primary">
                <div className="text-colors_text_text_tertiary_600_">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-colors_background_bg_primary p-spacing_xl">
                <div className="w-full max-w-md">
                    <div className="bg-colors_background_bg_secondary rounded-radius_lg shadow-shadow_floating p-spacing_3xl border border-colors_border_border_secondary">
                        <div className="flex items-center justify-center mb-spacing_2xl">
                            <div className="w-16 h-16 rounded-full bg-colors_background_bg_brand_solid flex items-center justify-center">
                                <Lock size={32} className="text-white" />
                            </div>
                        </div>

                        <h1 className="text-text-2xl-bold text-colors_text_text_primary_900_ text-center mb-spacing_md">
                            Admin Access Required
                        </h1>
                        <p className="text-text-sm-regular text-colors_text_text_secondary_700_ text-center mb-spacing_3xl">
                            Enter your 6-digit PIN to access the management system
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-spacing_xl">
                            <div>
                                <label htmlFor="pin" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    PIN Code
                                </label>
                                <input
                                    id="pin"
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={pin}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setPin(value);
                                        setError('');
                                    }}
                                    className="w-full px-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-lg-regular text-colors_text_text_primary_900_ text-center tracking-widest focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20"
                                    placeholder="• • • • • •"
                                    autoComplete="off"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="p-spacing_md rounded-radius_md bg-red-50 border border-red-200">
                                    <p className="text-text-sm-regular text-red-600">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={pin.length !== 6}
                                className="w-full py-spacing_lg rounded-radius_md text-text-sm-semibold bg-component_colors_components_buttons_primary_button_primary_bg text-component_colors_components_buttons_primary_button_primary_fg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                            >
                                Access Admin Panel
                            </button>
                        </form>

                        <p className="text-text-xs-regular text-colors_text_text_tertiary_600_ text-center mt-spacing_2xl">
                            This area is restricted to authorized administrators only
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Render children with logout callback - AdminDashboard handles its own layout
    return <>{children(handleLogout)}</>;
};

export default AdminAuth;

