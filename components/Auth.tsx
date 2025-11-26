
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, Hexagon, Lock } from 'lucide-react';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Domain Restriction Rule
    if (mode === 'signup') {
        const allowedDomains = ['ignitera.com'];
        const domain = email.split('@')[1];
        
        if (!domain || !allowedDomains.includes(domain.toLowerCase())) {
            setMessage({ 
                text: 'Access Restricted: Only @ignitera.com emails can create accounts.', 
                type: 'error' 
            });
            setLoading(false);
            return;
        }
    }

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ text: 'Check your email for the confirmation link!', type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
                <Hexagon className="w-6 h-6 text-white fill-current" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ignitera Command</h1>
            <p className="text-slate-500 text-sm mt-2">Secure GTM Operating System</p>
        </div>

        {/* Form */}
        <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-4">
                {message && (
                    <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                        {message.text}
                    </div>
                )}
                
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                    <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="you@ignitera.com"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
                    <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {mode === 'signin' ? 'Access Command Center' : 'Create Account'}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    {mode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
            </div>
        </div>
      </div>
      <div className="mt-8 text-slate-500 text-xs flex items-center gap-2">
         <Lock className="w-3 h-3" /> Secured by Supabase Auth
      </div>
    </div>
  );
};
