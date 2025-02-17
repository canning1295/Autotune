import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BasalPage } from './pages/BasalPage';
import { IcrPage } from './pages/IcrPage';
import { IsfPage } from './pages/IsfPage';
import { NavMenu } from './components/NavMenu';
import { SettingsPage } from './pages/Settings'; // Import SettingsPage

import { Profile, UserOptions } from './types/AutotuneTypes';

const defaultUserOptions: UserOptions = {
  url: 'https://yoursite.com',
  user: 'myUser',
  weight: 70,
  targetBG: 100,
  lowTargetBG: 85,
  poolingTime: 120,
  bolusTimeWindow: 1,
  adjustmentFactor: 0.6,
  diaAdjustment: 0.8,
  profiles: [], // Add default empty array for profiles
};

function App() {
  const [userOptions, setUserOptions] = useState<UserOptions>(defaultUserOptions);

  useEffect(() => {
    // Retrieve user options from localStorage
    const storedUserOptions = localStorage.getItem('userOptions');
    if (storedUserOptions) {
      try {
        const parsedUserOptions = JSON.parse(storedUserOptions) as UserOptions;
        // Ensure profiles is always an array
        setUserOptions({ ...parsedUserOptions, profiles: parsedUserOptions.profiles || [] });
      } catch (error) {
        console.error('Failed to parse user options from localStorage', error);
        // If parsing fails, use the default options
        setUserOptions(defaultUserOptions);
      }
    } else {
      // If no user options are found, use the default options
      setUserOptions(defaultUserOptions);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/basal" 
          element={<BasalPage userOptions={userOptions} />}
        />
        <Route
          path="/icr"
          element={<IcrPage userOptions={userOptions} />}
        />
        <Route
          path="/isf"
          element={<IsfPage userOptions={userOptions} />}
        />
        <Route 
          path="/settings" 
          element={<SettingsPage />} 
        /> {/* Add route for SettingsPage */}
        {/* Default/fallback route */}
        <Route path="*" element={<Navigate to="/settings" replace />} />
      </Routes>
      <NavMenu />
    </BrowserRouter>
  );
}

export default App;