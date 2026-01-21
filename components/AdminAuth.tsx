import React, { useState, useEffect } from 'react';
import { Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminAuthProps {
    children: (onLogout: () => void) => React.ReactNode;
}

const AdminAuth: React.FC<AdminAuthProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsAuthenticated(true);
            }
            setIsLoading(false);
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoggingIn(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        }

        setIsLoggingIn(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-colors_background_bg_primary">
                <Loader2 className="w-8 h-8 text-colors_text_text_brand_primary_600_ animate-spin" />
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
                            Admin Login
                        </h1>
                        <p className="text-text-sm-regular text-colors_text_text_secondary_700_ text-center mb-spacing_3xl">
                            Sign in with your administrator credentials
                        </p>

                        <form onSubmit={handleLogin} className="space-y-spacing_xl">
                            <div>
                                <label htmlFor="email" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-colors_text_text_tertiary_600_" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full pl-10 pr-spacing_lg py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20 transition-all"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-text-sm-medium text-colors_text_text_primary_900_ mb-spacing_sm">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-colors_text_text_tertiary_600_" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full pl-10 pr-10 py-spacing_md rounded-radius_md border border-colors_border_border_secondary bg-colors_background_bg_primary text-text-sm-regular text-colors_text_text_primary_900_ focus:outline-none focus:border-colors_border_border_brand_solid focus:ring-2 focus:ring-colors_background_bg_brand_solid/20 transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-colors_text_text_tertiary_600_ hover:text-colors_text_text_secondary_700_"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-spacing_md rounded-radius_md bg-red-50 border border-red-200">
                                    <p className="text-text-sm-regular text-red-600">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoggingIn}
                                className="w-full py-spacing_lg rounded-radius_md text-text-sm-semibold bg-component_colors_components_buttons_primary_button_primary_bg text-component_colors_components_buttons_primary_button_primary_fg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                {isLoggingIn ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        <p className="text-text-xs-regular text-colors_text_text_tertiary_600_ text-center mt-spacing_2xl">
                            Contact the system administrator if you trouble logging in.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children(handleLogout)}</>;
};

export default AdminAuth;
