// File: src/pages/SettingsPage.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap'; 
// or your chosen UI library. If you prefer raw HTML modals, we can do that too.

type AutotuneUser = {
  username: string;
  url: string;
  targetBG: number;
  lowTargetBG: number;
  weight: number;
  adjustmentFactor: number;
  diaAdjustment: number;
};

export const SettingsPage: React.FC = () => {
  const [users, setUsers] = useState<AutotuneUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AutotuneUser | null>(null);

  // Load from localStorage on component mount
  useEffect(() => {
    const stored = localStorage.getItem('autotune_users');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AutotuneUser[];
        setUsers(parsed);
      } catch (err) {
        console.error('Failed to parse users from localStorage', err);
      }
    }
  }, []);

  function handleAddClick() {
    setEditingUser(null); // create new
    setShowModal(true);
  }

  function handleEditClick(user: AutotuneUser) {
    setEditingUser(user);
    setShowModal(true);
  }

  function handleDeleteClick(user: AutotuneUser) {
    if (!window.confirm(`Delete user ${user.username}?`)) return;
    const updated = users.filter((u) => u.username !== user.username);
    setUsers(updated);
    localStorage.setItem('autotune_users', JSON.stringify(updated));
  }

  function handleModalSave(newUser: AutotuneUser) {
    // If editing an existing user, remove old, push updated
    let updated = [...users.filter((u) => u.username !== newUser.username)];
    updated.push(newUser);
    setUsers(updated);
    localStorage.setItem('autotune_users', JSON.stringify(updated));

    // Optionally set the "current user" in localStorage:
    localStorage.setItem('autotune_currentUser', JSON.stringify(newUser));

    // Store user options in localStorage
    localStorage.setItem('userOptions', JSON.stringify({
      url: newUser.url,
      user: newUser.username,
      weight: newUser.weight,
      targetBG: newUser.targetBG,
      lowTargetBG: newUser.lowTargetBG,
      poolingTime: 120, // You might want to add these to the settings page as well
      bolusTimeWindow: 1,
      adjustmentFactor: newUser.adjustmentFactor,
      diaAdjustment: newUser.diaAdjustment,
    }));

    setShowModal(false);
  }

  return (
    <div className="container mt-4">
      <h1>Settings</h1>
      <div className="mb-3">
        <Button variant="primary" onClick={handleAddClick}>
          Add User
        </Button>
      </div>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Username</th>
            <th>URL</th>
            <th>Target BG</th>
            <th>Low Target BG</th>
            <th>Weight (kg)</th>
            <th>Adj. Factor</th>
            <th>DIA Adj.</th>
            <th style={{ width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.username}>
              <td>{u.username}</td>
              <td>{u.url}</td>
              <td>{u.targetBG}</td>
              <td>{u.lowTargetBG}</td>
              <td>{u.weight}</td>
              <td>{u.adjustmentFactor}</td>
              <td>{u.diaAdjustment}</td>
              <td>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEditClick(u)}
                >
                  Edit
                </Button>{' '}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteClick(u)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal for Add/Edit */}
      {showModal && (
        <UserModal
          user={editingUser}
          onSave={handleModalSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

// A sub-component for the add/edit user form in a modal
interface UserModalProps {
  user: AutotuneUser | null;
  onSave: (val: AutotuneUser) => void;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState<AutotuneUser>(
    user || {
      username: '',
      url: '',
      targetBG: 100,
      lowTargetBG: 90,
      weight: 70,
      adjustmentFactor: 0.6,
      diaAdjustment: 0.8,
    },
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'username' || name === 'url'
        ? value
        : parseFloat(value), // parse numbers
    }));
  }

  function handleSubmit() {
    // Minimal validation example:
    if (!formData.username.trim()) {
      alert('Username is required');
      return;
    }
    if (formData.url.endsWith('/')) {
      formData.url = formData.url.slice(0, -1);
    }
    onSave(formData);
  }

  return (
    <Modal show onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {user ? 'Edit User' : 'Add New User'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Username</Form.Label>
          <Form.Control
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Nightscout URL</Form.Label>
          <Form.Control
            type="text"
            name="url"
            value={formData.url}
            onChange={handleChange}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Target BG</Form.Label>
          <Form.Control
            type="number"
            name="targetBG"
            value={formData.targetBG}
            onChange={handleChange}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Low Target BG</Form.Label>
          <Form.Control
            type="number"
            name="lowTargetBG"
            value={formData.lowTargetBG}
            onChange={handleChange}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Weight (kg)</Form.Label>
          <Form.Control
            type="number"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Recommendation Adjustment Factor</Form.Label>
          <Form.Select
            name="adjustmentFactor"
            value={String(formData.adjustmentFactor)}
            onChange={handleChange}
          >
            <option value="0.4">Least (0.4)</option>
            <option value="0.5">Less (0.5)</option>
            <option value="0.6">Average (0.6)</option>
            <option value="0.75">More (0.75)</option>
            <option value="1.0">Most (1.0)</option>
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Duration of Insulin Activity (DIA) Adjustment</Form.Label>
          <Form.Select
            name="diaAdjustment"
            value={String(formData.diaAdjustment)}
            onChange={handleChange}
          >
            <option value="0.6">Longest (0.6)</option>
            <option value="0.7">Longer (0.7)</option>
            <option value="0.8">Average (0.8)</option>
            <option value="0.9">Shorter (0.9)</option>
            <option value="1.0">Shortest (1.0)</option>
          </Form.Select>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};