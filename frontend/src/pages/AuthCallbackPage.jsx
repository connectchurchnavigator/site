import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      localStorage.setItem('token', token);
      
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((user) => {
          localStorage.setItem('user', JSON.stringify(user));
          toast.success('Successfully logged in!');
          navigate('/dashboard');
        })
        .catch(() => {
          toast.error('Login failed');
          navigate('/login');
        });
    } else {
      toast.error('No token received');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing login...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;