import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon, ShareIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'react-router-dom';

const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const { user } = useAuth();
    const location = useLocation();

    const isLoginPage = location.pathname === '/login' || location.pathname === '/';

    useEffect(() => {
        // iOS detection
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(ios);

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            console.log("PWA Install Prompt: beforeinstallprompt event fired!", e);

            if (isLoginPage) {
                setIsVisible(true);
            } else {
                // Internal pages: only show if roll allowed
                const allowedRoles = ['teacher', 'student', 'parent'];
                if (user && allowedRoles.includes(user.role)) {
                    setIsVisible(true);
                }
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Debug helper
        window.debugTriggerPrompt = () => {
            console.log("Debug: Forcing prompt visibility");
            setIsVisible(true);
        };

        // iOS doesn't fire beforeinstallprompt, so check manually on login page
        // We only show it if the user IS NOT in standalone mode (i.e. running in browser)
        const isStandalone = ('standalone' in window.navigator) && (window.navigator.standalone);
        if (isLoginPage && ios && !isStandalone) {
            setIsVisible(true);
        }

        // If we're on login page and already have a deferred prompt from previous navigation
        // (Android/Desktop)
        if (isLoginPage && deferredPrompt) {
            setIsVisible(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [user, isLoginPage, deferredPrompt]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    // -------------------------------------------------------------
    // 1. STRICT MODAL FOR LOGIN PAGE
    // -------------------------------------------------------------
    if (isLoginPage) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-up relative">

                    {/* Header / Brand */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-center relative">
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full p-1"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                        <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3">
                            <DevicePhoneMobileIcon className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Install App</h3>
                        <p className="text-indigo-100 text-sm mt-1">For the best experience</p>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {isIOS ? (
                            // iOS Instructions
                            <div className="space-y-4">
                                <p className="text-gray-600 text-center text-sm">
                                    Install this app on your iPhone/iPad to access it anytime, offline.
                                </p>
                                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-700">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 font-bold rounded-full text-xs">1</span>
                                        <span>Tap the <ShareIcon className="w-4 h-4 inline mx-1" /> <strong>Share</strong> button</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-6 h-6 bg-indigo-100 text-indigo-600 font-bold rounded-full text-xs">2</span>
                                        <span>Scroll down and tap <br /><strong>Add to Home Screen</strong> <PlusCircleIcon className="w-4 h-4 inline mx-1" /></span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="w-full py-3 text-indigo-600 font-semibold text-sm hover:bg-gray-50 rounded-xl transition-colors"
                                >
                                    I'll do it later
                                </button>
                            </div>
                        ) : (
                            // Android / Desktop Instructions
                            <div className="space-y-6">
                                <p className="text-gray-600 text-center text-sm leading-relaxed">
                                    Get quick access to your dashboard, offline mode, and push notifications by installing the app.
                                </p>
                                <button
                                    onClick={handleInstallClick}
                                    className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    Install Application
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="w-full py-2 text-gray-400 font-medium text-sm hover:text-gray-600 transition-colors"
                                >
                                    Not now
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // 2. INTERNAL TOAST (Logged In)
    // -------------------------------------------------------------
    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white p-4 rounded-xl shadow-2xl border border-indigo-100 z-50 animate-fade-in-up">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Install App</h3>
                    <p className="text-sm text-gray-600 mb-3">
                        Install our app for a better experience with quick access and offline support.
                    </p>
                    <button
                        onClick={handleInstallClick}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Install Now
                    </button>
                </div>
                <button
                    onClick={handleClose}
                    className="p-1 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
