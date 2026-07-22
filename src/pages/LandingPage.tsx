import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, Zap, BarChart3, RefreshCw, Check, ArrowRight, Menu, X, 
  HelpCircle, MessageSquare, TrendingUp, AlertCircle, ShoppingBag, 
  Users, Activity, Sparkles, Plus, Minus
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { formatCurrency } from '../utils/currency';

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left py-2 font-medium text-gray-900 dark:text-white hover:text-blue-500 transition-colors"
      >
        <span>{question}</span>
        {isOpen ? <Minus className="h-4 w-4 text-blue-500" /> : <Plus className="h-4 w-4 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed animate-fadeIn">
          {answer}
        </div>
      )}
    </div>
  );
};

export default function LandingPage() {
  const { isDark, setTheme, theme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleStartTrial = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const plans = [
    {
      name: 'Free Trial',
      price: '₹0',
      description: 'Perfect for new pharmacies getting started.',
      features: ['Up to 3 users', 'Core inventory tracking', 'Expiry and stock alerts'],
      featured: false,
    },
    {
      name: 'Starter',
      price: '₹49/mo',
      description: 'For growing pharmacies that need more control.',
      features: ['Unlimited users', 'Advanced batch insights', 'Supplier and recovery workflows'],
      featured: true,
    },
    {
      name: 'Professional',
      price: '₹149/mo',
      description: 'For multi-site teams that need deeper visibility.',
      features: ['Role-based access', 'Detailed analytics', 'Priority support'],
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-gray-950 text-gray-600 dark:text-gray-300">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100/80 dark:border-gray-900/80 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.png" alt="LIVAFIL" className="h-9 w-9 object-contain rounded-xl shadow-xs" />
            <span className="font-display font-extrabold text-2xl text-gray-900 dark:text-white tracking-tight">
              LIVA<span className="text-blue-600">FIL</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8 items-center font-medium text-sm">
            <a href="#features" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">Features</a>
            <a href="#how-it-works" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">How It Works</a>
            <a href="#benefits" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">Benefits</a>
            <a href="#pricing" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">Pricing</a>
            <a href="#faq" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">FAQ</a>
          </nav>

          {/* CTA & Theme Toggle */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              title="Toggle theme"
            >
              {isDark ? (
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">☀ Light</span>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">🌙 Dark</span>
              )}
            </button>
            <button
              onClick={handleLogin}
              className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Log In
            </button>
            <button
              onClick={handleStartTrial}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-transform transform active:scale-95 flex items-center space-x-2"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center space-x-3">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 text-xs text-gray-500"
            >
              {isDark ? '☀' : '🌙'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-blue-600">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-blue-600">How It Works</a>
            <a href="#benefits" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-blue-600">Benefits</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-blue-600">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300 font-medium hover:text-blue-600">FAQ</a>
            <hr className="border-gray-100 dark:border-gray-800 my-2" />
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogin(); }}
                className="flex-1 text-center py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 text-sm font-semibold"
              >
                Log In
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); handleStartTrial(); }}
                className="flex-1 text-center py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-xs"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-blue-500" />
                <span>Next-Gen Pharmacy Inventory Intelligence</span>
              </div>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-gray-900 dark:text-white leading-tight tracking-tight">
                Recover Losses. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
                  Automate Expiry Alerts.
                </span>
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                MedGuard is the premium AI-driven pharmacy stock recovery platform. Track multi-batch medicines, secure supplier credit, and liquidate aging stock before it expires. Reduce drug waste by up to 85%.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row justify-center lg:justify-start items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={handleStartTrial}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl shadow-lg hover:shadow-blue-500/10 transition-all flex items-center justify-center space-x-3 transform hover:-translate-y-0.5 active:scale-95"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-base font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <span>See How It Works</span>
                </a>
              </div>
              
              {/* Highlight Stats */}
              <div className="pt-10 grid grid-cols-3 gap-6 border-t border-gray-100 dark:border-gray-900/50 max-w-md mx-auto lg:mx-0">
                <div>
                  <div className="font-display font-bold text-2xl text-gray-900 dark:text-white">₹14k+</div>
                  <div className="text-xs text-gray-400">Avg. Annual Saved</div>
                </div>
                <div>
                  <div className="font-display font-bold text-2xl text-gray-900 dark:text-white">85%</div>
                  <div className="text-xs text-gray-400">Waste Reduction</div>
                </div>
                <div>
                  <div className="font-display font-bold text-2xl text-gray-900 dark:text-white">100%</div>
                  <div className="text-xs text-gray-400">Compliance Rate</div>
                </div>
              </div>
            </div>

            {/* Premium Mockup Graphics */}
            <div className="lg:col-span-5 mt-16 lg:mt-0 relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 rounded-3xl blur-2xl opacity-70"></div>
              <div className="relative border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 overflow-hidden">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  </div>
                  <span className="text-xs font-mono text-gray-400">medguard-dashboard-v1</span>
                </div>
                
                {/* Simulated UI Cards inside Hero */}
                <div className="mt-4 space-y-4">
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">Amoxil (AMX-441X)</div>
                        <div className="text-[10px] text-gray-400">Expires in 25 days • Supplier Apex Pharma</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">
                      Expiring Soon
                    </span>
                  </div>

                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">Liquidation Discount Opportunity</div>
                        <div className="text-[10px] text-gray-400">Auto-generated prompt for deadstock recovery</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                      80% Recoverable
                    </span>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Monthly Expiry Loss Trend</span>
                      <span className="text-emerald-500 font-semibold">-42% this month</span>
                    </div>
                    <div className="h-16 w-full flex items-end space-x-1.5 pt-2">
                      <div className="w-full bg-blue-100 dark:bg-gray-800 h-10 rounded-xs"></div>
                      <div className="w-full bg-blue-200 dark:bg-gray-700 h-12 rounded-xs"></div>
                      <div className="w-full bg-blue-300 dark:bg-gray-600 h-8 rounded-xs"></div>
                      <div className="w-full bg-blue-400 dark:bg-blue-900 h-14 rounded-xs"></div>
                      <div className="w-full bg-blue-600 dark:bg-blue-600 h-4 rounded-xs"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">Pricing</h2>
            <p className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white">
              Simple plans for every stage of growth.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              Choose the package that matches your pharmacy size and unlock the tools your team needs to stay ahead of stock loss.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-8 shadow-sm ${plan.featured ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30' : 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                  {plan.featured && <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">Most Popular</span>}
                </div>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-display font-bold text-gray-900 dark:text-white">{plan.price}</span>
                  {plan.price !== '₹0' && <span className="pb-1 text-sm text-gray-500 dark:text-gray-400">/month</span>}
                </div>
                <ul className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleStartTrial}
                  className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${plan.featured ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
                >
                  {plan.name === 'Free Trial' ? 'Start Free Trial' : 'Choose Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">Features</h2>
            <p className="font-display font-bold text-3xl sm:text-4xl text-gray-900 dark:text-white">
              Smarter pharmacy shelf intelligence.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              Say goodbye to tedious manual shelf audits. Our multi-batch inventory scanner automatically flag issues before they become losses.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50/50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col justify-between hover:border-blue-500/30 transition-all group">
              <div>
                <div className="h-10 w-10 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Automated Expiry Alerts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Real-time notification engine tracks batches and flags products approaching the critical 90, 60, and 30-day thresholds.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-all group">
              <div>
                <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Supplier Return Window Tracking</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Automatically flags when medicines can be returned to suppliers for full or partial credit based on purchase histories and local rules.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all group">
              <div>
                <div className="h-10 w-10 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Multi-Batch Tracking</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Seamlessly register multiple batches for a single medicine with independent purchase prices, selling prices, and expiry timelines.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col justify-between hover:border-amber-500/30 transition-all group">
              <div>
                <div className="h-10 w-10 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Inventory Movements Log</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Maintains a transparent audit log for every change. Log purchases, manual count adjustments, customer returns, or expired write-offs.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col justify-between hover:border-red-500/30 transition-all group">
              <div>
                <div className="h-10 w-10 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Multi-Role User Control</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Safeguard data access. Assign custom permissions to Owners, Managers, and Staff to track individual work accountability.
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col justify-between hover:border-teal-500/30 transition-all group">
              <div>
                <div className="h-10 w-10 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">PDF & Excel Reporting</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Generate instant executive audits for expiration schedules, stock levels, dead stock liability, and supplier purchase metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-gray-50/30 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">How It Works</h2>
            <p className="font-display font-bold text-3xl text-gray-900 dark:text-white">Three steps to near-zero expiry losses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="text-center relative">
              <div className="w-12 h-12 bg-blue-600 text-white font-display font-bold text-lg rounded-xl flex items-center justify-center mx-auto mb-6 shadow-md">1</div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Connect Your Inventory</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                Sign up as Owner, complete Onboarding in under 2 minutes, and register your medicines, categories, and suppliers.
              </p>
            </div>

            <div className="text-center relative">
              <div className="w-12 h-12 bg-blue-600 text-white font-display font-bold text-lg rounded-xl flex items-center justify-center mx-auto mb-6 shadow-md">2</div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Add Multiple Batches</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                Input unique batch details like quantity, supplier, manufacturer date, and expiry timelines to populate live monitoring.
              </p>
            </div>

            <div className="text-center relative">
              <div className="w-12 h-12 bg-emerald-500 text-white font-display font-bold text-lg rounded-xl flex items-center justify-center mx-auto mb-6 shadow-md">3</div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">Act on Recoveries</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                Get notified of stock about to expire. Dispatch credit returns, adjust selling prices, or export compliance sheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-16">
            <h2 className="text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">Testimonials</h2>
            <p className="font-display font-bold text-3xl text-gray-900 dark:text-white">Trusted by leading pharmacies</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50/50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-6 leading-relaxed">
                "MedGuard has completely revolutionized how we audit shelves. We used to lose thousands on expired batches every single quarter. This system paid for itself in just two weeks."
              </p>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center text-sm">
                  DR
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">Dr. David Rhee, PharmD</div>
                  <div className="text-xs text-gray-400">Owner, Oakridge Pharmacy</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-6 leading-relaxed">
                "Our staff easily invites suppliers and reviews batches during check-ins. The notification center works incredibly well. Highly recommend to any modern pharmacy."
              </p>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-emerald-500 text-white font-bold rounded-full flex items-center justify-center text-sm">
                  MS
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">Maria Sanchez</div>
                  <div className="text-xs text-gray-400">Inventory Manager, HealthFirst Rx</div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-6 leading-relaxed">
                "Being able to export low-stock, expiry, and supplier audit sheets makes regulatory audits a absolute breeze. Excel and PDF formatting is gorgeous."
              </p>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-purple-600 text-white font-bold rounded-full flex items-center justify-center text-sm">
                  AK
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">Arjun Kapoor</div>
                  <div className="text-xs text-gray-400">Chief Pharmacist, CareMax Chains</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gray-50/30 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">Pricing</h2>
            <p className="font-display font-bold text-3xl text-gray-900 dark:text-white">Simple, transparent, ROI-backed pricing.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose the perfect plan to safeguard your inventory and boost recovery rates.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Standard Tier */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Startup Rx</h3>
                <p className="text-xs text-gray-400 mt-1">Ideal for single independent pharmacies</p>
                <div className="mt-6 flex items-baseline">
                  <span className="font-display font-bold text-4xl text-gray-900 dark:text-white">{formatCurrency(49)}</span>
                  <span className="text-sm text-gray-400 ml-2">/ month</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-gray-500 dark:text-gray-400">
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Up to 500 Medicines</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>3 Staff Accounts</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Basic Expiry Alert Logs</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Excel Export Sheets</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStartTrial}
                className="mt-8 w-full py-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold rounded-xl text-gray-900 dark:text-white transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* Growth Tier (Featured) */}
            <div className="bg-white dark:bg-gray-900 border-2 border-blue-600 dark:border-blue-500 rounded-2xl p-8 flex flex-col justify-between relative shadow-xl transform scale-102">
              <div className="absolute top-0 right-1/2 transform translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-blue-600 text-white text-[10px] uppercase tracking-widest font-bold rounded-full">
                Most Popular
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Growth Core</h3>
                <p className="text-xs text-gray-400 mt-1">Perfect for growing high-volume pharmacies</p>
                <div className="mt-6 flex items-baseline">
                  <span className="font-display font-bold text-4xl text-gray-900 dark:text-white">{formatCurrency(99)}</span>
                  <span className="text-sm text-gray-400 ml-2">/ month</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-gray-500 dark:text-gray-400">
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Unlimited Medicines & Batches</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>10 Staff Accounts</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Advanced Expiry Alert Engine</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Excel & PDF Reports Export</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Supplier Return Auditing</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStartTrial}
                className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">MedGuard Chain</h3>
                <p className="text-xs text-gray-400 mt-1">For multiple stores or clinical chains</p>
                <div className="mt-6 flex items-baseline">
                  <span className="font-display font-bold text-4xl text-gray-900 dark:text-white">{formatCurrency(249)}</span>
                  <span className="text-sm text-gray-400 ml-2">/ month</span>
                </div>
                <ul className="mt-8 space-y-4 text-sm text-gray-500 dark:text-gray-400">
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Unlimited Stores Syncing</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Unlimited Staff & Accounts</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Custom Supplier Return Protocols</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>API Integrations & Webhooks</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500" />
                    <span>Dedicated Success Pharmacist</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={handleStartTrial}
                className="mt-8 w-full py-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-semibold rounded-xl text-gray-900 dark:text-white transition-colors"
              >
                Contact Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-24 bg-white dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-16">
            <h2 className="text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">FAQ</h2>
            <p className="font-display font-bold text-3xl text-gray-900 dark:text-white">Frequently Asked Questions</p>
          </div>

          <div className="space-y-2">
            <FAQItem
              question="Is this a billing or point-of-sale (POS) software?"
              answer="No, MedGuard is strictly an inventory intelligence and expiry loss recovery SaaS platform. It does not handle customer billing or prescriptions dispensing, but is designed to operate seamlessly alongside your existing POS and ERP databases."
            />
            <FAQItem
              question="How does MedGuard prevent drug expiration losses?"
              answer="MedGuard maintains independent, multi-batch records for every medicine. Instead of just showing total quantities, it flags exactly which batch is expiring, tracks when it was received, and maps the exact supplier return window. You will receive real-time, high-priority notifications before the item crosses 90, 60, or 30 days."
            />
            <FAQItem
              question="What is the Onboarding process like?"
              answer="After registering your account, Owner users complete a short onboarding form detailing your pharmacy license, GSTIN, and location. This links your workspace and configures the system with correct default parameters. The entire wizard takes less than two minutes."
            />
            <FAQItem
              question="Can I invite my staff to join MedGuard?"
              answer="Absolutely! MedGuard supports Owner, Manager, and Staff roles. Owners can invite coworkers via the User Management panel, assign roles, or deactivate employees if their status changes."
            />
            <FAQItem
              question="Does MedGuard export standard compliance sheets?"
              answer="Yes. Under the Reports module, you can instantly search, filter, and export customized PDF or Excel templates covering Expiry timelines, Low Stock alerts, and Supplier-specific performance data."
            />
          </div>
        </div>
      </section>

      {/* Call To Action */}
      <section className="py-20 bg-gradient-to-tr from-blue-700 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <h2 className="font-display font-bold text-3xl sm:text-4xl">Ready to secure your pharmacy inventory?</h2>
          <p className="text-blue-100 max-w-2xl mx-auto text-base">
            Join hundreds of modern pharmacies using MedGuard to turn expiry liabilities into secured credits. Setup takes under five minutes.
          </p>
          <div className="pt-4">
            <button
              onClick={handleStartTrial}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-base font-bold rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              Start Your 14-Day Free Trial
            </button>
          </div>
          <div className="text-xs text-blue-200">No credit card required. Cancel anytime.</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Shield className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-display font-bold text-lg text-white">MedGuard</span>
            </div>
            <p className="text-xs leading-relaxed">
              AI Inventory Recovery Platform for Pharmacies. Protecting shelves, reclaiming credits, and preventing medical waste since 2026.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><span className="text-gray-600">AI Predictions (Phase 2)</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="cursor-not-allowed">Terms of Service</span></li>
              <li><span className="cursor-not-allowed">Privacy Policy</span></li>
              <li><span className="cursor-not-allowed">HIPAA Compliance</span></li>
              <li><span className="cursor-not-allowed">FDA Guidelines</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="cursor-not-allowed">About Us</span></li>
              <li><span className="cursor-not-allowed">Press Kit</span></li>
              <li><span className="cursor-not-allowed">Careers</span></li>
              <li><span className="cursor-not-allowed">Contact Support</span></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} MedGuard Platform. All rights reserved. Developed with premium modular guidelines.
        </div>
      </footer>
    </div>
  );
}
