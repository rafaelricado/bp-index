import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Users, Upload, CheckSquare, LogOut, Home } from 'lucide-react';

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Inicio', icon: Home },
    { path: '/patients', label: 'Pacientes', icon: Users },
    { path: '/records', label: 'Prontuarios', icon: FileText },
    { path: '/upload', label: 'Upload', icon: Upload, roles: ['ADMIN', 'DIGITALIZADOR'] },
  ];

  return (
    <nav className="bg-primary-700 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <FileText size={28} />
            <span className="font-bold text-xl">GED Prontuarios</span>
          </Link>

          <div className="flex items-center space-x-4">
            {navItems.map((item) => {
              if (item.roles && !hasRole(...item.roles)) return null;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-800'
                      : 'hover:bg-primary-600'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {user?.name} ({user?.role})
            </span>
            <button
              onClick={logout}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
