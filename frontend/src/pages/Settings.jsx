import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function Settings() {
  const [activeScenarios, setActiveScenarios] = useState([]);
  const [editingScenario, setEditingScenario] = useState(null);

  const [newScenario, setNewScenario] = useState({
    title: '',
    impact: '',
    category: '',
    type: 'expense',
    isActive: true
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [imapConfig, setImapConfig] = useState({
    host: 'imap.gmail.com',
    port: '993',
    username: 'finpilot700@gmail.com',
    appPassword: 'rxqj itps qblg uluw'
  });

  const [apiKey, setApiKey] = useState('sk-gemini-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

  useEffect(() => {
    console.log('Fetching scenarios...');
    const unsubscribe = onSnapshot(collection(db, 'scenarios'), (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      console.log('Fetched scenarios:', items);
      setActiveScenarios(items);
    }, (error) => {
      console.error('Firestore onSnapshot error:', error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Load Gemini API Key
    const unsubscribe = onSnapshot(doc(db, 'settings', 'gemini'), (doc) => {
      if (doc.exists()) {
        setApiKey(doc.data().apiKey);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Load IMAP config
    const unsubscribe = onSnapshot(doc(db, 'settings', 'imap'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setImapConfig({
          host: data.host || 'imap.gmail.com',
          port: data.port?.toString() || '993',
          username: data.username || '',
          appPassword: data.password || '' // Note: saved as password in backend
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddScenario = async (e) => {
    if (e) e.preventDefault();
    console.log('handleAddScenario called', newScenario);
    if (!newScenario.title || newScenario.impact === '' || !newScenario.category) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      const rawImpact = Math.abs(parseFloat(newScenario.impact));
      const impactVal = newScenario.type === 'saving' ? -rawImpact : rawImpact;
      const type = newScenario.type;
      
      if (editingScenario) {
        await updateDoc(doc(db, 'scenarios', editingScenario.id), {
          title: newScenario.title,
          impact: impactVal,
          category: newScenario.category,
          type: type,
          isActive: newScenario.isActive
        });
        toast.success('Scenario updated successfully!');
        setEditingScenario(null);
      } else {
        await addDoc(collection(db, 'scenarios'), {
          title: newScenario.title,
          impact: impactVal,
          category: newScenario.category,
          type: type,
          isActive: newScenario.isActive,
          createdAt: new Date()
        });
        toast.success('Scenario added successfully!');
      }
      
      setNewScenario({ title: '', impact: '', category: '', type: 'expense', isActive: true });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save scenario');
    }
  };

  const handleEditClick = (scen) => {
    setEditingScenario(scen);
    setNewScenario({
      title: scen.title,
      impact: Math.abs(scen.impact).toString(),
      category: scen.category || '',
      type: scen.type || (scen.impact < 0 ? 'saving' : 'expense'),
      isActive: scen.isActive
    });
  };

  const handleDeleteScenario = async (id) => {
    try {
      await deleteDoc(doc(db, 'scenarios', id));
      toast.success('Scenario deleted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete scenario');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 12 || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      toast.error('Password must be at least 12 characters and include a symbol');
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      toast.error('No user logged in');
      return;
    }
    
    try {
      toast.loading('Updating password...', { id: 'pwd-update' });
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      toast.success('Password updated successfully!', { id: 'pwd-update' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update password', { id: 'pwd-update' });
    }
  };

  const handleUpdateImap = async (e) => {
    e.preventDefault();
    try {
      toast.loading('Saving configuration...', { id: 'save-imap' });
      const response = await fetch('http://localhost:5000/api/save-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: imapConfig.host,
          port: imapConfig.port,
          username: imapConfig.username,
          password: imapConfig.appPassword
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message, { id: 'save-imap' });
      } else {
        toast.error(data.message, { id: 'save-imap' });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save configuration', { id: 'save-imap' });
    }
  };

  const handleTestConnectivity = async () => {
    try {
      toast.loading('Testing connectivity...', { id: 'test-imap' });
      const response = await fetch('http://localhost:5000/api/test-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: imapConfig.host,
          port: imapConfig.port,
          username: imapConfig.username,
          password: imapConfig.appPassword
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message, { id: 'test-imap' });
      } else {
        toast.error(data.message, { id: 'test-imap' });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to connect to backend', { id: 'test-imap' });
    }
  };

  const handleUpdateApiKey = async (e) => {
    e.preventDefault();
    try {
      toast.loading('Saving API Key...', { id: 'save-api' });
      
      // Save to Firestore
      await setDoc(doc(db, 'settings', 'gemini'), { 
        apiKey: apiKey,
        updatedAt: new Date()
      }, { merge: true });
        
      toast.success('API Key updated successfully!', { id: 'save-api' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to update API Key', { id: 'save-api' });
    }
  };

  return (
    <main className="p-margin-desktop space-y-lg bg-[#f7f9fb] min-h-[calc(100vh-64px)]">
      <div className="mb-lg">
        <h1 className="text-headline-md font-bold text-on-surface">Settings</h1>
        <p className="text-on-surface-variant text-body-md">Manage your FinPilot workspace, security protocols, and ingestion pipelines.</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        
        {/* Scenario Planner Configuration */}
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-2xl p-lg shadow-sm">
          <div className="flex justify-between items-center mb-md">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-[24px]">analytics</span>
              <h2 className="text-title-lg font-bold text-on-surface">Scenario Planner Configuration</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* Active Scenarios List */}
            <div>
              <p className="text-body-sm font-bold text-on-surface-variant mb-sm uppercase tracking-wider">Active Scenarios</p>
              <div className="space-y-sm">
                {activeScenarios.map((scen) => (
                  <div key={scen.id} className="flex justify-between items-center p-md bg-[#f1f3f5] rounded-xl border border-[#e0e3e5]">
                    <div className="flex items-center gap-sm">
                      <span className="material-symbols-outlined text-[#5c647a]">
                        {scen.type === 'expense' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      <div>
                        <p className="font-bold text-on-surface text-sm">{scen.title}</p>
                        <p className="text-xs text-on-surface-variant">Impact: {scen.impact > 0 ? `+$${scen.impact.toLocaleString()}` : `-$${Math.abs(scen.impact).toLocaleString()}`}/mo</p>
                      </div>
                    </div>
                    <div className="flex gap-xs">
                      <button 
                        onClick={() => handleEditClick(scen)}
                        className="text-[#5c647a] hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteScenario(scen.id)}
                        className="text-[#5c647a] hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Scenario Form */}
            <div className="bg-[#f1f3f5] p-md rounded-xl border border-[#e0e3e5]">
              <p className="text-body-sm font-bold text-on-surface-variant mb-md uppercase tracking-wider">
                {editingScenario ? 'Edit Scenario Details' : 'Add New Scenario Details'}
              </p>
              <form onSubmit={handleAddScenario} className="space-y-md">
                <div>
                  <label className="text-xs font-bold text-[#5c647a] block mb-xs">SCENARIO TITLE *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Expand Warehouse" 
                    className="w-full border border-[#e0e3e5] rounded-lg p-2 text-sm focus:outline-none focus:border-primary"
                    value={newScenario.title}
                    onChange={(e) => setNewScenario({...newScenario, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c647a] block mb-xs">CATEGORY *</label>
                  <select 
                    className="w-full border border-[#e0e3e5] rounded-lg p-2 text-sm focus:outline-none focus:border-primary"
                    value={newScenario.category}
                    onChange={(e) => setNewScenario({...newScenario, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    <option value="Payroll & Benefits">Payroll & Benefits</option>
                    <option value="Software & SaaS">Software & SaaS</option>
                    <option value="Marketing & Sales">Marketing & Sales</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#5c647a] block mb-xs">TYPE *</label>
                  <select 
                    className="w-full border border-[#e0e3e5] rounded-lg p-2 text-sm focus:outline-none focus:border-primary"
                    value={newScenario.type}
                    onChange={(e) => setNewScenario({...newScenario, type: e.target.value})}
                  >
                    <option value="expense">Expense (Increases Burn)</option>
                    <option value="saving">Saving (Decreases Burn)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-sm">
                  <div>
                    <label className="text-xs font-bold text-[#5c647a] block mb-xs">MONTHLY IMPACT ($) *</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      className="w-full border border-[#e0e3e5] rounded-lg p-2 text-sm focus:outline-none focus:border-primary"
                      value={newScenario.impact}
                      onChange={(e) => setNewScenario({...newScenario, impact: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#5c647a] block mb-xs">DEFAULT ACTIVE</label>
                    <div className="flex items-center h-10">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={newScenario.isActive}
                          onChange={(e) => setNewScenario({...newScenario, isActive: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-[#e0e3e5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#e0e3e5] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-sm pt-sm">
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingScenario(null);
                      setNewScenario({ title: '', impact: '', category: '', type: 'expense', isActive: true });
                    }}
                    className="text-sm text-[#5c647a] hover:text-on-surface font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleAddScenario} 
                    className="text-sm bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark font-bold transition-colors"
                  >
                    {editingScenario ? 'Update Scenario' : 'Save Scenario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-lg shadow-sm">
          <div className="flex items-center gap-sm mb-lg">
            <span className="material-symbols-outlined text-primary text-[24px]">security</span>
            <h2 className="text-title-lg font-bold text-on-surface">Security</h2>
          </div>
          <form onSubmit={handleUpdatePassword} className="space-y-md">
            <div>
              <label className="text-xs font-bold text-[#5c647a] block mb-xs">CURRENT PASSWORD</label>
              <input 
                type="password" 
                className="w-full border border-[#e0e3e5] rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#5c647a] block mb-xs">NEW PASSWORD</label>
              <input 
                type="password" 
                className="w-full border border-[#e0e3e5] rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#5c647a] block mb-xs">CONFIRM NEW PASSWORD</label>
              <input 
                type="password" 
                className="w-full border border-[#e0e3e5] rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="p-md bg-[#f1f3f5] rounded-lg flex items-start gap-xs">
              <span className="material-symbols-outlined text-[#5c647a] text-[18px]">info</span>
              <p className="text-xs text-[#5c647a]">Passwords must be at least 12 characters and include a symbol.</p>
            </div>
            <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary-dark font-bold transition-colors">Save Password</button>
          </form>
        </div>

        {/* Email Ingestion */}
        <div className="bg-surface border border-outline-variant rounded-2xl p-lg shadow-sm">
          <div className="flex items-center gap-sm mb-lg">
            <span className="material-symbols-outlined text-primary text-[24px]">mail</span>
            <h2 className="text-title-lg font-bold text-on-surface">Email Ingestion</h2>
          </div>
          
          <div className="mb-lg p-md bg-[#e6f0fa] rounded-xl flex justify-between items-center">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 bg-[#0058be] rounded-full flex items-center justify-center text-white">
                <span className="material-symbols-outlined">mail</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Connected Email</p>
                <p className="text-xs text-[#0058be]">{imapConfig.username}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#00aa6c] bg-[#e6fbf3] px-2 py-1 rounded-full">SYNCED</span>
          </div>

          <p className="text-body-sm font-bold text-on-surface-variant mb-md uppercase tracking-wider">IMAP Configuration</p>
          <form onSubmit={handleUpdateImap} className="space-y-md">
            <div className="grid grid-cols-3 gap-sm">
              <div className="col-span-2">
                <label className="text-xs font-bold text-[#5c647a] block mb-xs">IMAP HOST</label>
                <input 
                  type="text" 
                  className="w-full border border-[#e0e3e5] rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                  value={imapConfig.host}
                  onChange={(e) => setImapConfig({...imapConfig, host: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#5c647a] block mb-xs">PORT</label>
                <input 
                  type="text" 
                  className="w-full border border-[#e0e3e5] rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                  value={imapConfig.port}
                  onChange={(e) => setImapConfig({...imapConfig, port: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-[#5c647a] block mb-xs">EMAIL ID (USERNAME)</label>
              <input 
                type="text" 
                className="w-full border border-[#e0e3e5] rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                value={imapConfig.username}
                onChange={(e) => setImapConfig({...imapConfig, username: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#5c647a] block mb-xs">GOOGLE APP PASSWORD</label>
              <input 
                type="password" 
                className="w-full border border-[#e0e3e5] rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                value={imapConfig.appPassword}
                onChange={(e) => setImapConfig({...imapConfig, appPassword: e.target.value})}
              />
            </div>
            
            <div className="flex gap-sm pt-sm">
              <button 
                type="button" 
                onClick={handleTestConnectivity}
                className="flex-1 border border-[#e0e3e5] text-on-surface py-3 rounded-lg hover:bg-[#f1f3f5] font-bold transition-colors"
              >
                Test Connectivity
              </button>
              <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-primary-dark font-bold transition-colors">
                Sync & Update
              </button>
            </div>
          </form>
        </div>

        {/* API Management */}
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-2xl p-lg shadow-sm">
          <div className="flex items-center gap-sm mb-lg">
            <span className="material-symbols-outlined text-primary text-[24px]">api</span>
            <h2 className="text-title-lg font-bold text-on-surface">API Management</h2>
          </div>
          <form onSubmit={handleUpdateApiKey} className="flex flex-col md:flex-row gap-md">
            <div className="flex-1">
              <label className="text-xs font-bold text-[#5c647a] block mb-xs">API KEY</label>
              <input 
                type="password" 
                className="w-full border border-[#e0e3e5] rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full md:w-auto bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary-dark font-bold transition-colors">
                Update API Key
              </button>
            </div>
          </form>
        </div>



      </div>
    </main>
  );
}
