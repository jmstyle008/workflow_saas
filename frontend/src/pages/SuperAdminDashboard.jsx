import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useAuth, API } from '../App';
import { 
  Buildings, Users, ChartBar, SignOut, Plus, MagnifyingGlass,
  CheckCircle, Gear, CaretRight, PencilSimple
} from '@phosphor-icons/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import LanguageToggle from '../components/LanguageToggle';
import { toast } from 'sonner';

const SuperAdminDashboard = () => {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', industry: 'general', description: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  
  useEffect(() => { loadData(); }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, tenantsRes, usersRes] = await Promise.all([
        API.get('/admin/stats'), API.get('/admin/tenants'), API.get('/admin/users')
      ]);
      setStats(statsRes.data); setTenants(tenantsRes.data); setAllUsers(usersRes.data);
    } catch (error) { toast.error('Error'); } finally { setLoading(false); }
  };
  
  const handleCreateTenant = async () => {
    try {
      await API.post('/admin/tenants', newTenant);
      toast.success('OK'); setShowCreateTenant(false);
      setNewTenant({ name: '', industry: 'general', description: '' }); loadData();
    } catch (error) { toast.error('Error'); }
  };
  
  const handleUpdateUserRole = async (userId, role, tenantId) => {
    try {
      await API.put(`/admin/users/${userId}/role`, { role, tenant_id: tenantId });
      toast.success('OK'); loadData();
    } catch (error) { toast.error('Error'); }
  };
  
  const handleSeedSampleData = async (tenantId) => {
    try {
      await API.post(`/admin/seed-sample-data?tenant_id=${tenantId}`);
      toast.success('OK');
    } catch (error) { toast.error('Error'); }
  };
  
  const handleLogout = async () => { await logout(); navigate('/login'); };
  
  const filteredTenants = tenants.filter(te => te.name.toLowerCase().includes(searchQuery.toLowerCase()) || te.industry.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const navItems = [
    { id: 'dashboard', icon: <ChartBar size={20} />, label: t('dashboard') },
    { id: 'tenants', icon: <Buildings size={20} />, label: t('tenants') },
    { id: 'users', icon: <Users size={20} />, label: t('users') },
    { id: 'settings', icon: <Gear size={20} />, label: t('settings') },
  ];
  
  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121214] border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF5C00] flex items-center justify-center">
              <CheckCircle size={20} weight="fill" className="text-white" />
            </div>
            <span className="font-['Barlow_Condensed'] text-lg font-bold text-white uppercase tracking-wider">CheckpointHub</span>
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mt-2">{t('superAdmin')}</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.id}>
                <button onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm uppercase tracking-wider transition-colors ${activeTab === item.id ? 'bg-[#FF5C00] text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                  data-testid={`nav-${item.id}`}>{item.icon}{item.label}</button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] font-semibold">{user?.name?.[0]?.toUpperCase() || 'A'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-zinc-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-zinc-400 hover:text-white" data-testid="logout-btn"><SignOut size={18} /></Button>
          </div>
        </div>
      </aside>
      
      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur-sm border-b border-white/10 px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-['Barlow_Condensed'] text-2xl font-bold text-white uppercase tracking-tight">{navItems.find(i => i.id === activeTab)?.label}</h1>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <Input type="text" placeholder={t('search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-[#121214] border-white/10 text-white rounded-none h-10" data-testid="search-input" />
            </div>
          </div>
        </header>
        
        <div className="p-8">
          {loading ? (<div className="flex items-center justify-center h-64"><div className="text-zinc-400">{t('loading')}</div></div>) : (<>
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 mb-8">
                  {[
                    { label: t('totalTenants'), value: stats?.total_tenants || 0, color: 'text-[#FF5C00]' },
                    { label: t('activeTenants'), value: stats?.active_tenants || 0, color: 'text-green-500' },
                    { label: t('totalUsers'), value: stats?.total_users || 0, color: 'text-blue-500' },
                    { label: t('totalItems'), value: stats?.total_items || 0, color: 'text-amber-500' },
                  ].map((stat, idx) => (
                    <div key={idx} className="p-6 bg-[#121214] grid-border-right grid-border-bottom">
                      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{stat.label}</p>
                      <p className={`font-['Barlow_Condensed'] text-5xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[#121214] border border-white/10">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="font-['Barlow_Condensed'] text-lg font-semibold text-white uppercase tracking-wider">{t('recentTenants')}</h2>
                    <Button onClick={() => setShowCreateTenant(true)} className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none h-9 px-4 text-xs uppercase tracking-wider" data-testid="create-tenant-btn">
                      <Plus size={16} className="mr-1" />{t('create')}</Button>
                  </div>
                  <div className="divide-y divide-white/10">
                    {tenants.slice(0, 5).map(te => (
                      <div key={te.tenant_id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5">
                        <div><p className="text-white font-medium">{te.name}</p><p className="text-zinc-500 text-sm">{te.industry}</p></div>
                        <div className="flex items-center gap-2">
                          <span className={`status-dot ${te.is_active ? 'status-dot-success' : 'status-dot-error'}`} />
                          <CaretRight size={16} className="text-zinc-500" />
                        </div>
                      </div>
                    ))}
                    {tenants.length === 0 && (<div className="px-6 py-8 text-center text-zinc-500">{t('noTenantsYet')}</div>)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tenants' && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-zinc-400">{filteredTenants.length} {t('tenantsFound')}</p>
                  <Button onClick={() => setShowCreateTenant(true)} className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none" data-testid="create-tenant-btn-2">
                    <Plus size={18} className="mr-2" />{t('createTenant')}</Button>
                </div>
                <div className="bg-[#121214] border border-white/10">
                  <table className="w-full">
                    <thead><tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('name')}</th>
                      <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('industry')}</th>
                      <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('status')}</th>
                      <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('created')}</th>
                      <th className="px-6 py-4 text-right text-xs text-zinc-500 uppercase tracking-wider">{t('actions')}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredTenants.map(te => (
                        <tr key={te.tenant_id} className="hover:bg-white/5">
                          <td className="px-6 py-4"><p className="text-white font-medium">{te.name}</p><p className="text-zinc-500 text-xs">{te.tenant_id}</p></td>
                          <td className="px-6 py-4 text-zinc-400">{te.industry}</td>
                          <td className="px-6 py-4"><span className={`inline-flex items-center gap-2 px-2 py-1 text-xs uppercase tracking-wider ${te.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}><span className={`status-dot ${te.is_active ? 'status-dot-success' : 'status-dot-error'}`} />{te.is_active ? 'Activo' : 'Inactivo'}</span></td>
                          <td className="px-6 py-4 text-zinc-400 text-sm">{new Date(te.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleSeedSampleData(te.tenant_id)} className="text-zinc-400 hover:text-[#FF5C00] text-xs" data-testid={`seed-data-${te.tenant_id}`}>{t('seedData')}</Button>
                              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white"><PencilSimple size={16} /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTenants.length === 0 && (<div className="px-6 py-12 text-center text-zinc-500">{t('noTenantsYet')}</div>)}
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="animate-fade-in">
                <p className="text-zinc-400 mb-6">{filteredUsers.length} {t('usersFound')}</p>
                <div className="bg-[#121214] border border-white/10">
                  <table className="w-full">
                    <thead><tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('name')}</th>
                      <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('email')}</th>
                      <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('role')}</th>
                      <th className="px-6 py-4 text-left text-xs text-zinc-500 uppercase tracking-wider">{t('tenant')}</th>
                      <th className="px-6 py-4 text-right text-xs text-zinc-500 uppercase tracking-wider">{t('actions')}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredUsers.map(u => (
                        <tr key={u.user_id} className="hover:bg-white/5">
                          <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] text-sm font-semibold">{u.name?.[0]?.toUpperCase() || '?'}</div><span className="text-white">{u.name}</span></div></td>
                          <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 text-xs uppercase tracking-wider ${u.role === 'super_admin' ? 'bg-[#FF5C00]/10 text-[#FF5C00]' : u.role === 'tenant_admin' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-500/10 text-zinc-400'}`}>{u.role}</span></td>
                          <td className="px-6 py-4 text-zinc-400 text-sm">{u.tenant_id ? tenants.find(te => te.tenant_id === u.tenant_id)?.name || u.tenant_id : '-'}</td>
                          <td className="px-6 py-4 text-right"><Button variant="ghost" size="sm" onClick={() => setSelectedUser(u)} className="text-zinc-400 hover:text-white" data-testid={`edit-user-${u.user_id}`}><PencilSimple size={16} /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="animate-fade-in"><div className="bg-[#121214] border border-white/10 p-6">
                <h2 className="font-['Barlow_Condensed'] text-lg font-semibold text-white uppercase tracking-wider mb-4">{t('systemSettings')}</h2>
                <p className="text-zinc-400 text-sm">{t('systemSettings')}</p>
              </div></div>
            )}
          </>)}
        </div>
      </main>
      
      {/* Create Tenant Dialog */}
      <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">{t('createTenant')}</DialogTitle>
            <DialogDescription className="text-zinc-500">{t('addNewWorkflowStage')}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('name')}</Label>
              <Input value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })} className="bg-[#09090b] border-white/10 text-white rounded-none" data-testid="tenant-name-input" /></div>
            <div className="space-y-2"><Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('industry')}</Label>
              <Select value={newTenant.industry} onValueChange={(v) => setNewTenant({ ...newTenant, industry: v })}>
                <SelectTrigger className="bg-[#09090b] border-white/10 text-white rounded-none" data-testid="tenant-industry-select"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10">
                  <SelectItem value="general">General</SelectItem><SelectItem value="auto_detailing">Auto Detailing</SelectItem>
                  <SelectItem value="auto_repair">Auto Repair</SelectItem><SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem><SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-2"><Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('description')}</Label>
              <Textarea value={newTenant.description} onChange={(e) => setNewTenant({ ...newTenant, description: e.target.value })} className="bg-[#09090b] border-white/10 text-white rounded-none resize-none" rows={3} data-testid="tenant-description-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateTenant(false)} className="text-zinc-400">{t('cancel')}</Button>
            <Button onClick={handleCreateTenant} className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none" data-testid="submit-create-tenant">{t('create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">{t('edit')} {t('users')}</DialogTitle>
            <DialogDescription className="text-zinc-500">{t('assignToTenant')}</DialogDescription></DialogHeader>
          {selectedUser && (<div className="space-y-4 py-4">
            <div><p className="text-white font-medium">{selectedUser.name}</p><p className="text-zinc-400 text-sm">{selectedUser.email}</p></div>
            <div className="space-y-2"><Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('role')}</Label>
              <Select value={selectedUser.role} onValueChange={(v) => setSelectedUser({ ...selectedUser, role: v })}>
                <SelectTrigger className="bg-[#09090b] border-white/10 text-white rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10">
                  <SelectItem value="super_admin">Super Admin</SelectItem><SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem><SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="inspector">Inspector</SelectItem><SelectItem value="client">Client</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="space-y-2"><Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('assignToTenant')}</Label>
              <Select value={selectedUser.tenant_id || 'none'} onValueChange={(v) => setSelectedUser({ ...selectedUser, tenant_id: v === 'none' ? null : v })}>
                <SelectTrigger className="bg-[#09090b] border-white/10 text-white rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10">
                  <SelectItem value="none">{t('noTenant')}</SelectItem>
                  {tenants.map(te => (<SelectItem key={te.tenant_id} value={te.tenant_id}>{te.name}</SelectItem>))}
                </SelectContent>
              </Select></div>
          </div>)}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedUser(null)} className="text-zinc-400">{t('cancel')}</Button>
            <Button onClick={() => { handleUpdateUserRole(selectedUser.user_id, selectedUser.role, selectedUser.tenant_id); setSelectedUser(null); }}
              className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none" data-testid="submit-edit-user">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
