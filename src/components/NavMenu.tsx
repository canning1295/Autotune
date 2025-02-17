// File: src/components/NavMenu.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Simple bottom menu with 4 buttons: Basal, ISF, ICR, Settings.
 * It navigates to different routes in your React app.
 */
export const NavMenu: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.footer}>
      <button onClick={() => navigate('/basal')} style={styles.menuButton}>
        💉
      </button>
      <button onClick={() => navigate('/isf')} style={styles.menuButton}>
        💧
      </button>
      <button onClick={() => navigate('/icr')} style={styles.menuButton}>
        🍽️
      </button>
      <button onClick={() => navigate('/settings')} style={styles.menuButton}>
        ⚙️
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  footer: {
    display: 'flex',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: '#212121',
    boxShadow: '0 -4px 8px rgba(0, 0, 0, 0.1)',
  },
  menuButton: {
    height: '45px',
    width: '45px',
    borderRadius: '5px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.5rem',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },
};