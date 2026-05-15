import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const AuthPage = () => {
   const navigate = useNavigate();
   const location = useLocation();
   const { login, register, loginWithGoogle } = useAuth();
   
   // Handle post-login redirection
   const from = location.state?.from?.pathname || '/dashboard';
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(loginData.email, loginData.password);
    
    if (result.success) {
      toast.success('Login successful!');
      navigate(from, { replace: true });
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await register(registerData);
    
    if (result.success) {
      toast.success('Registration successful!');
      navigate(from, { replace: true });
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    const result = await loginWithGoogle(credentialResponse.credential);
    
    if (result.success) {
      toast.success('Login successful!');
      navigate(from, { replace: true });
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-block mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">CN</span>
              </div>
              <span className="font-bold text-xl">Church Navigator</span>
            </div>
          </Link>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login" data-testid="auth-tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="auth-tab-register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    data-testid="login-email-input"
                  />
                </div>

                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      data-testid="login-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-hover text-white rounded-full"
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                <div className="text-center text-sm text-slate-500">
                  <Link to="/forgot-password" className="text-brand hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="register-first-name">First Name</Label>
                    <Input
                      id="register-first-name"
                      placeholder="John"
                      value={registerData.first_name}
                      onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                      data-testid="register-first-name-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-last-name">Last Name</Label>
                    <Input
                      id="register-last-name"
                      placeholder="Doe"
                      value={registerData.last_name}
                      onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                      data-testid="register-last-name-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your@email.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    required
                    data-testid="register-email-input"
                  />
                </div>

                <div>
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      data-testid="register-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-hover text-white rounded-full"
                  disabled={loading}
                  data-testid="register-submit-btn"
                >
                  {loading ? 'Creating account...' : 'Register'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or connect with</span>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  toast.error('Google login failed');
                }}
                useOneTap
                theme="outline"
                shape="pill"
                width="100%"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div 
        className="hidden lg:block lg:w-3/5 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1636051551573-15d6cb59db52?crop=entropy&cs=srgb&fm=jpg&q=85)'
        }}
      >
        <div className="h-full bg-gradient-to-br from-brand/80 to-brand-dark/80 flex items-center justify-center p-12">
          <div className="text-white text-center">
            <h2 className="text-4xl font-bold mb-4">Welcome to Church Navigator</h2>
            <p className="text-xl opacity-90">
              Discover and connect with faith communities around the world
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;