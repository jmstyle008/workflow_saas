import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useAuth, API } from '../App';
import { 
  CheckSquare, 
  Users, 
  ChartBar, 
  SignOut,
  Plus,
  MagnifyingGlass,
  CheckCircle,
  Gear,
  CaretRight,
  CaretDown,
  X,
  Trash,
  PencilSimple,
  ListChecks,
  UserCircle,
  Package
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '../components/ui/collapsible';
import LanguageToggle from '../components/LanguageToggle';
import { toast } from 'sonner';

const TenantAdminDashboard = () => {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Expanded checkpoints for subtask view
  const [expandedCheckpoints, setExpandedCheckpoints] = useState({});
  
  // Modal states
  const [showCreateCheckpoint, setShowCreateCheckpoint] = useState(false);
  const [showCreateSubtask, setShowCreateSubtask] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showAssignItem, setShowAssignItem] = useState(false);
  const [tenantItems, setTenantItems] = useState([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [newCheckpoint, setNewCheckpoint] = useState({ name: '', name_es: '', description: '', description_es: '', order: 1, allowed_roles: [] });
  const [newSubtask, setNewSubtask] = useState({ name: '', name_es: '', description: '', description_es: '', requires_evidence: true, evidence_type: 'photo' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'technician' });
  const [newItem, setNewItem] = useState({ name: '', description: '', item_type: 'vehicle', metadata: {}, client_email: '' });
  const [assignData, setAssignData] = useState({ item_id: '', client_email: '' });
  
  useEffect(() => {
    if (user?.tenant_id || user?.role === 'super_admin') {
      loadData();
    }
  }, [user]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, checkpointsRes, usersRes, rolesRes] = await Promise.all([
        API.get('/tenant/stats'),
        API.get('/tenant/checkpoints'),
        API.get('/tenant/users'),
        API.get('/tenant/roles')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      
      // Load items
      try {
        const itemsRes = await API.get('/tenant/items');
        setTenantItems(itemsRes.data || []);
      } catch (e) { /* items endpoint may not exist for new tenants */ }
      
      // Load subtasks for each checkpoint
      const checkpointsWithSubtasks = await Promise.all(
        checkpointsRes.data.map(async (cp) => {
          const subtasksRes = await API.get(`/tenant/checkpoints/${cp.checkpoint_id}/subtasks`);
          return { ...cp, subtasks: subtasksRes.data };
        })
      );
      setCheckpoints(checkpointsWithSubtasks);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateCheckpoint = async () => {
    try {
      await API.post('/tenant/checkpoints', newCheckpoint);
      toast.success('Checkpoint created');
      setShowCreateCheckpoint(false);
      setNewCheckpoint({ name: '', name_es: '', description: '', description_es: '', order: checkpoints.length + 1, allowed_roles: [] });
      loadData();
    } catch (error) {
      toast.error('Failed to create checkpoint');
    }
  };
  
  const handleCreateSubtask = async () => {
    if (!selectedCheckpoint) return;
    try {
      await API.post(`/tenant/checkpoints/${selectedCheckpoint.checkpoint_id}/subtasks`, newSubtask);
      toast.success('Subtask created');
      setShowCreateSubtask(false);
      setNewSubtask({ name: '', name_es: '', description: '', description_es: '', requires_evidence: true, evidence_type: 'photo' });
      loadData();
    } catch (error) {
      toast.error('Failed to create subtask');
    }
  };
  
  const handleDeleteCheckpoint = async (checkpointId) => {
    if (!window.confirm('Delete this checkpoint and all its subtasks?')) return;
    try {
      await API.delete(`/tenant/checkpoints/${checkpointId}`);
      toast.success('Checkpoint deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete checkpoint');
    }
  };
  
  const handleDeleteSubtask = async (subtaskId) => {
    if (!window.confirm('Delete this subtask?')) return;
    try {
      await API.delete(`/tenant/subtasks/${subtaskId}`);
      toast.success('Subtask deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete subtask');
    }
  };
  
  const handleCreateUser = async () => {
    try {
      await API.post(`/tenant/users?role=${newUser.role}`, {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password
      });
      toast.success('User created');
      setShowCreateUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'technician' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };
  
  const handleCreateItem = async () => {
    try {
      const url = newItem.client_email 
        ? `/tenant/items?client_email=${encodeURIComponent(newItem.client_email)}` 
        : '/tenant/items';
      await API.post(url, {
        name: newItem.name,
        description: newItem.description,
        item_type: newItem.item_type,
        metadata: newItem.metadata
      });
      toast.success('Item created');
      setShowCreateItem(false);
      setNewItem({ name: '', description: '', item_type: 'vehicle', metadata: {}, client_email: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create item');
    }
  };
  
  const handleAssignItem = async () => {
    try {
      await API.post('/tenant/items/assign', assignData);
      toast.success('Item assigned to client');
      setShowAssignItem(false);
      setAssignData({ item_id: '', client_email: '' });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign item');
    }
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const toggleCheckpoint = (checkpointId) => {
    setExpandedCheckpoints(prev => ({
      ...prev,
      [checkpointId]: !prev[checkpointId]
    }));
  };
  
  const navItems = [
    { id: 'dashboard', icon: <ChartBar size={20} />, label: t('dashboard') },
    { id: 'checkpoints', icon: <CheckSquare size={20} />, label: t('checkpoints') },
    { id: 'items', icon: <Package size={20} />, label: t('items') },
    { id: 'users', icon: <Users size={20} />, label: t('users') },
    { id: 'roles', icon: <UserCircle size={20} />, label: t('roles') },
  ];
  
  // Check if user has tenant assigned
  if (!user?.tenant_id && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-['Barlow_Condensed'] text-2xl text-white uppercase tracking-wider mb-4">
            {t('noTenantAssigned')}
          </h2>
          <p className="text-zinc-400 mb-6">
            {t('contactAdmin')}
          </p>
          <Button onClick={handleLogout} variant="outline" className="border-white/10 text-white">
            <SignOut size={18} className="mr-2" />
            {t('logout')}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121214] border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF5C00] flex items-center justify-center">
              <CheckCircle size={20} weight="fill" className="text-white" />
            </div>
            <span className="font-['Barlow_Condensed'] text-lg font-bold text-white uppercase tracking-wider">
              CheckpointHub
            </span>
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-2">Tenant Admin</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider transition-colors ${
                    activeTab === item.id 
                      ? 'bg-[#FF5C00] text-white' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-zinc-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-zinc-400 hover:text-white" data-testid="logout-btn">
              <SignOut size={18} />
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur-sm border-b border-white/10 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-['Barlow_Condensed'] text-2xl font-bold text-white uppercase tracking-tight">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <Input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-[#121214] border-white/10 text-white rounded-none h-10"
                data-testid="search-input"
              />
            </div>
          </div>
        </header>
        
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-zinc-400">{t('loading')}</div>
            </div>
          ) : (
            <>
              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <div className="animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 mb-8">
                    {[
                      { label: t('totalUsers'), value: stats?.total_users || 0, color: 'text-[#FF5C00]' },
                      { label: t('checkpoints'), value: stats?.total_checkpoints || 0, color: 'text-blue-500' },
                      { label: t('itemsInProgress'), value: stats?.items_in_progress || 0, color: 'text-amber-500' },
                      { label: t('itemsCompleted'), value: stats?.items_completed || 0, color: 'text-green-500' },
                    ].map((stat, idx) => (
                      <div key={idx} className="p-6 bg-[#121214] grid-border-right grid-border-bottom">
                        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{stat.label}</p>
                        <p className={`font-['Barlow_Condensed'] text-5xl font-black tracking-tighter ${stat.color}`}>
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => { setActiveTab('checkpoints'); setShowCreateCheckpoint(true); }}
                      className="p-6 bg-[#121214] border border-white/10 hover:border-[#FF5C00]/50 transition-colors text-left"
                      data-testid="quick-create-checkpoint"
                    >
                      <CheckSquare size={24} className="text-[#FF5C00] mb-4" />
                      <h3 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider mb-1">
                        Create Checkpoint
                      </h3>
                      <p className="text-zinc-500 text-sm">{t('addNewWorkflowStage')}</p>
                    </button>
                    <button
                      onClick={() => { setActiveTab('users'); setShowCreateUser(true); }}
                      className="p-6 bg-[#121214] border border-white/10 hover:border-[#FF5C00]/50 transition-colors text-left"
                      data-testid="quick-create-user"
                    >
                      <Users size={24} className="text-[#FF5C00] mb-4" />
                      <h3 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider mb-1">
                        {t('addTeamMember')}
                      </h3>
                      <p className="text-zinc-500 text-sm">{t('inviteWorkers')}</p>
                    </button>
                    <button
                      onClick={() => navigate('/worker')}
                      className="p-6 bg-[#121214] border border-white/10 hover:border-[#FF5C00]/50 transition-colors text-left"
                      data-testid="quick-worker-portal"
                    >
                      <Package size={24} className="text-[#FF5C00] mb-4" />
                      <h3 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider mb-1">
                        {t('workerPortal')}
                      </h3>
                      <p className="text-zinc-500 text-sm">{t('viewManageTasks')}</p>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Checkpoints Tab */}
              {activeTab === 'checkpoints' && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-zinc-400">{checkpoints.length} {t('checkpointsCount')}</p>
                    <Button
                      onClick={() => setShowCreateCheckpoint(true)}
                      className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none"
                      data-testid="create-checkpoint-btn"
                    >
                      <Plus size={18} className="mr-2" />
                      Create Checkpoint
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {checkpoints.sort((a, b) => a.order - b.order).map((checkpoint) => (
                      <Collapsible
                        key={checkpoint.checkpoint_id}
                        open={expandedCheckpoints[checkpoint.checkpoint_id]}
                        onOpenChange={() => toggleCheckpoint(checkpoint.checkpoint_id)}
                      >
                        <div className="bg-[#121214] border border-white/10">
                          <CollapsibleTrigger asChild>
                            <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/5">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-[#FF5C00] flex items-center justify-center font-['Barlow_Condensed'] text-white font-bold">
                                  {checkpoint.order}
                                </div>
                                <div>
                                  <p className="text-white font-medium">
                                    {language === 'es' && checkpoint.name_es ? checkpoint.name_es : checkpoint.name}
                                  </p>
                                  <p className="text-zinc-500 text-sm">
                                    {checkpoint.subtasks?.length || 0} subtask(s)
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setSelectedCheckpoint(checkpoint); setShowCreateSubtask(true); }}
                                  className="text-zinc-400 hover:text-[#FF5C00]"
                                  data-testid={`add-subtask-${checkpoint.checkpoint_id}`}
                                >
                                  <Plus size={16} className="mr-1" />
                                  Subtask
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteCheckpoint(checkpoint.checkpoint_id); }}
                                  className="text-zinc-400 hover:text-red-500"
                                  data-testid={`delete-checkpoint-${checkpoint.checkpoint_id}`}
                                >
                                  <Trash size={16} />
                                </Button>
                                {expandedCheckpoints[checkpoint.checkpoint_id] ? (
                                  <CaretDown size={20} className="text-zinc-400" />
                                ) : (
                                  <CaretRight size={20} className="text-zinc-400" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="border-t border-white/10">
                              {checkpoint.subtasks?.length > 0 ? (
                                <div className="divide-y divide-white/5">
                                  {checkpoint.subtasks.map((subtask) => (
                                    <div key={subtask.subtask_id} className="px-6 py-3 flex items-center justify-between bg-[#09090b]/50">
                                      <div className="flex items-center gap-3">
                                        <ListChecks size={16} className="text-zinc-500" />
                                        <div>
                                          <p className="text-zinc-300 text-sm">
                                            {language === 'es' && subtask.name_es ? subtask.name_es : subtask.name}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1">
                                            {subtask.requires_evidence && (
                                              <span className="text-xs px-2 py-0.5 bg-[#FF5C00]/10 text-[#FF5C00]">
                                                Evidence: {subtask.evidence_type}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSubtask(subtask.subtask_id)}
                                        className="text-zinc-400 hover:text-red-500"
                                        data-testid={`delete-subtask-${subtask.subtask_id}`}
                                      >
                                        <Trash size={14} />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-6 py-8 text-center text-zinc-500 text-sm">
                                  {t('noSubtasksYet')}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                    
                    {checkpoints.length === 0 && (
                      <div className="bg-[#121214] border border-white/10 px-6 py-12 text-center">
                        <CheckSquare size={48} className="text-zinc-700 mx-auto mb-4" />
                        <h3 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider mb-2">
                          {t('noCheckpointsYet')}
                        </h3>
                        <p className="text-zinc-500 text-sm mb-4">
                          {t('createFirstCheckpoint')}
                        </p>
                        <Button
                          onClick={() => setShowCreateCheckpoint(true)}
                          className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none"
                        >
                          <Plus size={18} className="mr-2" />
                          Create Checkpoint
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              

              {/* Items Tab */}
              {activeTab === 'items' && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-zinc-400">{tenantItems.length} {t('itemsCount')}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowAssignItem(true)}
                        variant="outline"
                        className="border-white/10 text-white rounded-none"
                        data-testid="assign-item-btn"
                      >
                        Assign to Client
                      </Button>
                      <Button
                        onClick={() => setShowCreateItem(true)}
                        className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none"
                        data-testid="create-item-btn"
                      >
                        <Plus size={18} className="mr-2" />
                        Create Item
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-[#121214] border border-white/10">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('name')}</th>
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('status')}</th>
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">Client</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {tenantItems.map(item => (
                          <tr key={item.item_id} className="hover:bg-white/5">
                            <td className="px-6 py-4">
                              <p className="text-white font-medium">{item.name}</p>
                              <p className="text-zinc-500 text-xs">{item.description}</p>
                            </td>
                            <td className="px-6 py-4 text-zinc-400">{item.item_type}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs uppercase tracking-wider ${
                                item.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                item.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' :
                                'bg-zinc-500/10 text-zinc-400'
                              }`}>
                                {t(item.status) || item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-zinc-400 text-sm">{item.client_id || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {tenantItems.length === 0 && (
                      <div className="px-6 py-12 text-center text-zinc-500">
                        No items registered yet
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-zinc-400">{users.length} {t('usersFound')}</p>
                    <Button
                      onClick={() => setShowCreateUser(true)}
                      className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none"
                      data-testid="create-user-btn"
                    >
                      <Plus size={18} className="mr-2" />
                      Add User
                    </Button>
                  </div>
                  
                  <div className="bg-[#121214] border border-white/10">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('name')}</th>
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('email')}</th>
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('role')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {users.map(u => (
                          <tr key={u.user_id} className="hover:bg-white/5">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] text-sm font-semibold">
                                  {u.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="text-white">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs uppercase tracking-wider ${
                                u.role === 'tenant_admin' ? 'bg-blue-500/10 text-blue-500' :
                                u.role === 'supervisor' ? 'bg-amber-500/10 text-amber-500' :
                                'bg-zinc-500/10 text-zinc-400'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {users.length === 0 && (
                      <div className="px-6 py-12 text-center text-zinc-500">
                        {t('noTeamMembers')}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Roles Tab */}
              {activeTab === 'roles' && (
                <div className="animate-fade-in">
                  <div className="bg-[#121214] border border-white/10">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('role')}</th>
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">Permissions</th>
                          <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {roles.map(role => (
                          <tr key={role.role_id} className="hover:bg-white/5">
                            <td className="px-6 py-4">
                              <p className="text-white">{language === 'es' && role.name_es ? role.name_es : role.name}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {role.permissions.map((perm, idx) => (
                                  <span key={idx} className="px-2 py-0.5 text-xs bg-[#FF5C00]/10 text-[#FF5C00]">
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs uppercase tracking-wider ${
                                role.is_system ? 'bg-zinc-500/10 text-zinc-400' : 'bg-blue-500/10 text-blue-500'
                              }`}>
                                {role.is_system ? 'System' : 'Custom'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      {/* Create Checkpoint Dialog */}
      <Dialog open={showCreateCheckpoint} onOpenChange={setShowCreateCheckpoint}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">
              Create Checkpoint
            </DialogTitle>
            <DialogDescription className="text-zinc-500">{t('addNewWorkflowStage')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">Name (EN)</Label>
                <Input
                  value={newCheckpoint.name}
                  onChange={(e) => setNewCheckpoint({ ...newCheckpoint, name: e.target.value })}
                  className="bg-[#09090b] border-white/10 text-white rounded-none"
                  data-testid="checkpoint-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">Name (ES)</Label>
                <Input
                  value={newCheckpoint.name_es}
                  onChange={(e) => setNewCheckpoint({ ...newCheckpoint, name_es: e.target.value })}
                  className="bg-[#09090b] border-white/10 text-white rounded-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Order</Label>
              <Input
                type="number"
                min="1"
                value={newCheckpoint.order}
                onChange={(e) => setNewCheckpoint({ ...newCheckpoint, order: parseInt(e.target.value) || 1 })}
                className="bg-[#09090b] border-white/10 text-white rounded-none"
                data-testid="checkpoint-order-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('description')}</Label>
              <Textarea
                value={newCheckpoint.description}
                onChange={(e) => setNewCheckpoint({ ...newCheckpoint, description: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateCheckpoint(false)} className="text-zinc-400">
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateCheckpoint} className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none" data-testid="submit-create-checkpoint">
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Subtask Dialog */}
      <Dialog open={showCreateSubtask} onOpenChange={setShowCreateSubtask}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">
              Add Subtask
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Define work within this checkpoint</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">Name (EN)</Label>
                <Input
                  value={newSubtask.name}
                  onChange={(e) => setNewSubtask({ ...newSubtask, name: e.target.value })}
                  className="bg-[#09090b] border-white/10 text-white rounded-none"
                  data-testid="subtask-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">Name (ES)</Label>
                <Input
                  value={newSubtask.name_es}
                  onChange={(e) => setNewSubtask({ ...newSubtask, name_es: e.target.value })}
                  className="bg-[#09090b] border-white/10 text-white rounded-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Requires Evidence</Label>
              <Switch
                checked={newSubtask.requires_evidence}
                onCheckedChange={(checked) => setNewSubtask({ ...newSubtask, requires_evidence: checked })}
                data-testid="subtask-requires-evidence"
              />
            </div>
            {newSubtask.requires_evidence && (
              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase text-xs tracking-wider">Evidence Type</Label>
                <Select
                  value={newSubtask.evidence_type}
                  onValueChange={(value) => setNewSubtask({ ...newSubtask, evidence_type: value })}
                >
                  <SelectTrigger className="bg-[#09090b] border-white/10 text-white rounded-none" data-testid="subtask-evidence-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121214] border-white/10">
                    <SelectItem value="photo">Photo</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="any">Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateSubtask(false)} className="text-zinc-400">
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateSubtask} className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none" data-testid="submit-create-subtask">
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">
              Add Team Member
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Invite a new worker to your team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('name')}</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none"
                data-testid="user-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('email')}</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none"
                data-testid="user-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('password')}</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none"
                data-testid="user-password-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('role')}</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger className="bg-[#09090b] border-white/10 text-white rounded-none" data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10">
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="inspector">Inspector</SelectItem>
                  <SelectItem value="receptionist">{language === 'es' ? 'Recepcionista' : 'Receptionist'}</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateUser(false)} className="text-zinc-400">
              {t('cancel')}
            </Button>
            <Button onClick={handleCreateUser} className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none" data-testid="submit-create-user">
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Item Dialog */}
      <Dialog open={showCreateItem} onOpenChange={setShowCreateItem}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">
              Create Item
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Register a new item for service</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('name')}</Label>
              <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none" placeholder="BMW M4 2024" data-testid="item-name-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Type</Label>
              <Select value={newItem.item_type} onValueChange={(v) => setNewItem({ ...newItem, item_type: v })}>
                <SelectTrigger className="bg-[#09090b] border-white/10 text-white rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10">
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('description')}</Label>
              <Textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none resize-none" rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Client Email (optional)</Label>
              <Input value={newItem.client_email} onChange={(e) => setNewItem({ ...newItem, client_email: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none" placeholder="client@email.com" type="email" data-testid="item-client-email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateItem(false)} className="text-zinc-400">{t('cancel')}</Button>
            <Button onClick={handleCreateItem} className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none" data-testid="submit-create-item">{t('create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Item Dialog */}
      <Dialog open={showAssignItem} onOpenChange={setShowAssignItem}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">
              Assign Item to Client
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Link an existing item to a client by email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Item</Label>
              <Select value={assignData.item_id} onValueChange={(v) => setAssignData({ ...assignData, item_id: v })}>
                <SelectTrigger className="bg-[#09090b] border-white/10 text-white rounded-none" data-testid="assign-item-select"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10">
                  {tenantItems.map(item => (
                    <SelectItem key={item.item_id} value={item.item_id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Client Email</Label>
              <Input value={assignData.client_email} onChange={(e) => setAssignData({ ...assignData, client_email: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none" placeholder="client@email.com" type="email" data-testid="assign-client-email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAssignItem(false)} className="text-zinc-400">{t('cancel')}</Button>
            <Button onClick={handleAssignItem} className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none" data-testid="submit-assign-item">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TenantAdminDashboard;
