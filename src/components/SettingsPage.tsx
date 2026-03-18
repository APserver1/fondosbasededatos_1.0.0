import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Assuming supabase client is set up
import { Moon, Sun } from 'lucide-react';

interface SettingsPageProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function SettingsPage({ darkMode, toggleDarkMode }: SettingsPageProps) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [newProfileImageUrl, setNewProfileImageUrl] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data, error } = await supabase
          .from('public_user')
          .select('profile_image_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
        } else if (data) {
          setProfileImageUrl(data.profile_image_url);
          setNewProfileImageUrl(data.profile_image_url || '');
        }
      }
    };
    fetchUserData();
  }, []);

  const handleProfileImageChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) return;

    const { error } = await supabase
      .from('public_user')
      .update({ profile_image_url: newProfileImageUrl })
      .eq('id', userId);

    if (error) {
      alert('Error al actualizar la imagen de perfil: ' + error.message);
    } else {
      setProfileImageUrl(newProfileImageUrl);
      alert('Imagen de perfil actualizada con éxito.');
    }
  };

  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300">Configuración de la Cuenta</h1>

      {/* Información de la cuenta */}
      <div className="glass-panel rounded-2xl p-8 mb-10">
        <h2 className="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-200">Información de la cuenta</h2>
        <form onSubmit={handleProfileImageChange} className="space-y-6">
          <div>
            <label htmlFor="profile_image_url" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
              URL de la Imagen de Perfil:
            </label>
            <input
              type="text"
              id="profile_image_url"
              value={newProfileImageUrl}
              onChange={(e) => setNewProfileImageUrl(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 sm:text-sm backdrop-blur-sm transition-all duration-200 text-gray-900 dark:text-white"
              placeholder="https://ejemplo.com/imagen.png"
            />
          </div>
          {profileImageUrl && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Imagen de perfil actual:</p>
              <img src={profileImageUrl} alt="Imagen de perfil" className="w-32 h-32 rounded-full object-cover border-4 border-sky-100 dark:border-sky-900/30 shadow-lg" />
            </div>
          )}
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 glass-button rounded-xl text-sm font-medium"
          >
            Guardar Cambios
          </button>
        </form>
      </div>

      {/* Apariencia */}
      <div className="glass-panel rounded-2xl p-8">
        <h2 className="text-2xl font-semibold mb-6 text-gray-700 dark:text-gray-200">Apariencia</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-sky-500/10 text-sky-400' : 'bg-orange-500/10 text-orange-500'}`}>
              {darkMode ? <Moon size={24} /> : <Sun size={24} />}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Modo Oscuro</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ajusta la apariencia de la aplicación para reducir la fatiga visual.</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
              darkMode ? 'bg-sky-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
      
    </div>
  );
}
