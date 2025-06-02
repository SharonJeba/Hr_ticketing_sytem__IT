import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/generate/token', {
        email,
        password,
      });
      localStorage.setItem('token', res.data.Token);
      localStorage.setItem('role', res.data.role);
      if (res.data.role === 'Employee') {
        navigate('/employee');
      } else if (res.data.role === 'Admin') {
        navigate('/admin');
      } else if(res.data.role === 'Manager'){
        navigate('/manager');
      } else if(res.data.role ==='HR'){
        navigate('/hr')
      } else if(res.data.role == "Team Lead"){
        navigate('/teamlead')
      }
      else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div className="container">
      <style>
        {`
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background:  rgba(255, 255, 255, 0.95);
            padding: 2rem;
            box-sizing: border-box;
            width: 100vw;
            margin: 0;
            overflow-x: hidden;
          }

          .login-card {
            background: rgba(255, 255, 255, 0.95);
            padding: 2.5rem;
            border-radius: 15px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: min(90%, 450px);
            margin: 0 auto;
            backdrop-filter: blur(10px);
            animation: fadeIn 0.5s ease-in;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          h2 {
            font-size: clamp(1.8rem, 5vw, 2.5rem);
            font-weight: 700;
            color: #1e3a8a;
            text-align: center;
            margin-bottom: 1.5rem;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .alert-danger {
            font-size: clamp(0.85rem, 2vw, 0.95rem);
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #dc2626;
            text-align: center;
            transition: opacity 0.3s ease;
          }

          .form-control {
            border-radius: 8px;
            padding: 0.9rem;
            font-size: clamp(0.95rem, 2.5vw, 1.05rem);
            border: 1px solid #d1d5db;
            background: #f9fafb;
            transition: all 0.3s ease;
            width: 100%;
          }

          .form-control:hover {
            border-color: #3b82f6;
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
          }

          .form-control:focus {
            border-color: #2563eb;
            box-shadow: 0 0 10px rgba(37, 99, 235, 0.4);
            outline: none;
            background: #ffffff;
          }

          .form-control::placeholder {
            color: #9ca3af;
            font-style: italic;
          }

          .mb-2 {
            margin-bottom: 1.5rem !important;
          }

          .btn-primary {
            width: 100%;
            padding: 0.9rem;
            font-size: clamp(1rem, 2.5vw, 1.15rem);
            font-weight: 600;
            border-radius: 8px;
            background: linear-gradient(90deg, #3b82f6, #1e40af);
            border: none;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .btn-primary:hover {
            background: linear-gradient(90deg, #1e40af, #1e3a8a);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(59, 130, 246, 0.5);
          }

          .btn-primary::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: width 0.4s ease, height 0.4s ease;
          }

          .btn-primary:hover::after {
            width: 200px;
            height: 200px;
          }

          /* Small screens */
          @media (max-width: 576px) {
            .container {
              padding: 1rem;
            }

            .login-card {
              padding: 1.5rem;
              max-width: 95%;
            }

            h2 {
              font-size: 1.8rem;
            }

            .form-control {
              padding: 0.75rem;
              font-size: 0.9rem;
            }

            .btn-primary {
              padding: 0.75rem;
              font-size: 0.95rem;
            }
          }

          /* Medium screens (tablets) */
          @media (min-width: 768px) {
            .login-card {
              padding: 3rem;
              max-width: min(80%, 500px);
            }

            h2 {
              font-size: 2.7rem;
            }

            .form-control {
              padding: 1rem;
              font-size: 1.1rem;
            }

            .btn-primary {
              padding: 1rem;
              font-size: 1.2rem;
            }
          }

          /* Large screens (PCs) */
          @media (min-width: 1200px) {
            .container {
              padding: 3rem;
            }

            .login-card {
              padding: 3.5rem;
              max-width: min(50%, 600px); /* Increased for larger screens */
            }

            h2 {
              font-size: 3rem;
            }

            .form-control {
              padding: 1.1rem;
              font-size: 1.15rem;
            }

            .btn-primary {
              padding: 1.1rem;
              font-size: 1.25rem;
            }
          }
        `}
      </style>
      <div className="login-card">
        <h2 className="mb-4">Login</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <input
          className="form-control mb-2"
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="form-control mb-2"
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );
};

export default Login;