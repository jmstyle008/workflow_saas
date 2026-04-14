import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useAuth, API } from '../App';
import { 
  Package, 
  CheckCircle, 
  SignOut,
  Plus,
  MagnifyingGlass,
  CaretRight,
  Clock,
  Circle,
  Camera,
  FileText,
  Note,
  Eye
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
import LanguageToggle from '../components/LanguageToggle';
import { toast } from 'sonner';

const ClientPortal = () => {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', item_type: 'vehicle', metadata: {} });
  
  useEffect(() => {
    loadItems();
  }, []);
  
  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await API.get('/client/items');
      setItems(response.data || []);
    } catch (error) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };
  
  const loadItemDetails = async (itemId) => {
    try {
      const response = await API.get(`/client/items/${itemId}`);
      setItemDetails(response.data);
    } catch (error) {
      toast.error('Failed to load item details');
    }
  };
  
  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    await loadItemDetails(item.item_id);
  };
  
  const handleCreateItem = async () => {
    try {
      await API.post('/client/items', newItem);
      toast.success('Item registered');
      setShowCreateItem(false);
      setNewItem({ name: '', description: '', item_type: 'vehicle', metadata: {} });
      loadItems();
    } catch (error) {
      toast.error('Failed to register item');
    }
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={18} weight="fill" className="text-green-500" />;
      case 'in_progress':
        return <Clock size={18} className="text-amber-500" />;
      default:
        return <Circle size={18} className="text-zinc-500" />;
    }
  };
  
  const getOverallProgress = () => {
    if (!itemDetails?.checkpoints) return 0;
    
    let total = 0;
    let completed = 0;
    
    itemDetails.checkpoints.forEach(cp => {
      cp.subtasks?.forEach(st => {
        total++;
        if (st.progress?.status === 'completed') completed++;
      });
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };
  
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Header */}
      <header className="bg-[#121214] border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FF5C00] flex items-center justify-center">
                <CheckCircle size={20} weight="fill" className="text-white" />
              </div>
              <span className="font-['Barlow_Condensed'] text-lg font-bold text-white uppercase tracking-wider">
                Client Portal
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase() || 'C'}
              </div>
              <span className="text-white text-sm hidden sm:inline">{user?.name}</span>
            </div>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-zinc-400 hover:text-white" data-testid="logout-btn">
              <SignOut size={18} />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Items List */}
        <aside className="w-80 bg-[#121214] border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider">
                My {t('items')}
              </h2>
              <Button
                onClick={() => setShowCreateItem(true)}
                size="sm"
                className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none h-8 px-3"
                data-testid="register-item-btn"
              >
                <Plus size={16} className="mr-1" />
                Register
              </Button>
            </div>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <Input
                type="text"
                placeholder={t('search')}
                className="pl-9 bg-[#09090b] border-white/10 text-white rounded-none h-9 text-sm"
                data-testid="search-items"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-4 text-center text-zinc-500">{t('loading')}</div>
            ) : items.length > 0 ? (
              <div className="divide-y divide-white/5">
                {items.map(item => (
                  <button
                    key={item.item_id}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                      selectedItem?.item_id === item.item_id ? 'bg-white/5 border-l-2 border-l-[#FF5C00]' : ''
                    }`}
                    data-testid={`item-${item.item_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium text-sm">{item.name}</p>
                        <p className="text-zinc-500 text-xs mt-1">{item.item_type}</p>
                      </div>
                      <span className={`status-dot ${
                        item.status === 'completed' ? 'status-dot-success' :
                        item.status === 'in_progress' ? 'status-dot-warning' :
                        'status-dot-pending'
                      }`} />
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs uppercase tracking-wider px-2 py-0.5 ${
                        item.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                        item.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-zinc-500/10 text-zinc-400'
                      }`}>
                        {t(item.status) || item.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500">
                <Package size={48} className="mx-auto mb-4 text-zinc-700" />
                <p className="mb-4">No items registered yet</p>
                <Button
                  onClick={() => setShowCreateItem(true)}
                  className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none"
                >
                  <Plus size={16} className="mr-2" />
                  Register Item
                </Button>
              </div>
            )}
          </div>
        </aside>
        
        {/* Item Details */}
        <main className="flex-1 overflow-auto">
          {selectedItem && itemDetails ? (
            <div className="p-6">
              {/* Item Header */}
              <div className="mb-6">
                <h1 className="font-['Barlow_Condensed'] text-2xl font-bold text-white uppercase tracking-tight mb-2">
                  {itemDetails.item.name}
                </h1>
                <p className="text-zinc-400">{itemDetails.item.description || 'No description'}</p>
                <div className="flex items-center gap-4 mt-4">
                  <span className={`text-xs uppercase tracking-wider px-2 py-1 ${
                    itemDetails.item.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                    itemDetails.item.status === 'in_progress' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-zinc-500/10 text-zinc-400'
                  }`}>
                    {t(itemDetails.item.status) || itemDetails.item.status}
                  </span>
                  <span className="text-zinc-500 text-sm">Type: {itemDetails.item.item_type}</span>
                </div>
              </div>
              
              {/* Overall Progress */}
              <div className="bg-[#121214] border border-white/10 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider">
                    Overall Progress
                  </h2>
                  <span className="font-['Barlow_Condensed'] text-4xl font-black text-[#FF5C00]">
                    {getOverallProgress()}%
                  </span>
                </div>
                <div className="progress-bar h-2">
                  <div className="progress-bar-fill" style={{ width: `${getOverallProgress()}%` }} />
                </div>
              </div>
              
              {/* Checkpoints Timeline */}
              <div className="space-y-4">
                <h2 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider mb-4">
                  Progress Timeline
                </h2>
                
                {itemDetails.checkpoints?.map((checkpoint, cpIdx) => {
                  const isCurrentCheckpoint = itemDetails.item.current_checkpoint_id === checkpoint.checkpoint_id;
                  const completedSubtasks = checkpoint.subtasks?.filter(st => st.progress?.status === 'completed').length || 0;
                  const totalSubtasks = checkpoint.subtasks?.length || 0;
                  const checkpointComplete = completedSubtasks === totalSubtasks && totalSubtasks > 0;
                  const checkpointStarted = completedSubtasks > 0;
                  
                  return (
                    <div 
                      key={checkpoint.checkpoint_id}
                      className={`bg-[#121214] border ${
                        isCurrentCheckpoint ? 'border-[#FF5C00]' :
                        checkpointComplete ? 'border-green-500/50' :
                        'border-white/10'
                      }`}
                    >
                      <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 flex items-center justify-center ${
                            checkpointComplete ? 'bg-green-500' :
                            isCurrentCheckpoint ? 'bg-[#FF5C00]' :
                            checkpointStarted ? 'bg-amber-500' :
                            'bg-zinc-700'
                          }`}>
                            {checkpointComplete ? (
                              <CheckCircle size={20} weight="fill" className="text-white" />
                            ) : (
                              <span className="font-['Barlow_Condensed'] font-bold text-white">
                                {checkpoint.order}
                              </span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-['Barlow_Condensed'] text-base text-white uppercase tracking-wider">
                              {language === 'es' && checkpoint.name_es ? checkpoint.name_es : checkpoint.name}
                            </h3>
                            <p className="text-zinc-500 text-sm">
                              {completedSubtasks}/{totalSubtasks} tasks completed
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {isCurrentCheckpoint && (
                            <span className="px-3 py-1 bg-[#FF5C00]/10 text-[#FF5C00] text-xs uppercase tracking-wider animate-pulse-glow">
                              In Progress
                            </span>
                          )}
                          {checkpointComplete && (
                            <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs uppercase tracking-wider">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Subtasks summary */}
                      {checkpoint.subtasks?.length > 0 && (
                        <div className="px-6 py-3 border-t border-white/5 bg-[#09090b]/50">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {checkpoint.subtasks.map((subtask) => (
                              <div 
                                key={subtask.subtask_id}
                                className={`p-3 border ${
                                  subtask.progress?.status === 'completed' ? 'border-green-500/20 bg-green-500/5' :
                                  subtask.progress?.status === 'in_progress' ? 'border-amber-500/20 bg-amber-500/5' :
                                  'border-white/5 bg-[#121214]'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  {getStatusIcon(subtask.progress?.status)}
                                  <span className="text-xs text-zinc-400 truncate">
                                    {language === 'es' && subtask.name_es ? subtask.name_es : subtask.name}
                                  </span>
                                </div>
                                {subtask.evidence_count > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <Camera size={12} className="text-zinc-500" />
                                    <span className="text-xs text-zinc-500">{subtask.evidence_count} evidence</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {itemDetails.checkpoints?.length === 0 && (
                  <div className="bg-[#121214] border border-white/10 p-8 text-center">
                    <Clock size={48} className="mx-auto mb-4 text-zinc-700" />
                    <p className="text-zinc-500">No checkpoints configured yet. Your service team will set these up.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="text-center">
                <Eye size={64} className="mx-auto mb-4 text-zinc-700" />
                <p className="font-['Barlow_Condensed'] text-lg uppercase tracking-wider">
                  Select an item to track its progress
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Create Item Dialog */}
      <Dialog open={showCreateItem} onOpenChange={setShowCreateItem}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">
              Register Item
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Add a new item for service tracking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('name')}</Label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none"
                placeholder="e.g., 2024 BMW M4, Samsung TV, etc."
                data-testid="item-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Type</Label>
              <Select
                value={newItem.item_type}
                onValueChange={(value) => setNewItem({ ...newItem, item_type: value })}
              >
                <SelectTrigger className="bg-[#09090b] border-white/10 text-white rounded-none" data-testid="item-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10">
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="appliance">Appliance</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">{t('description')}</Label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="bg-[#09090b] border-white/10 text-white rounded-none resize-none"
                placeholder="Brief description of the item and service needed..."
                rows={3}
                data-testid="item-description-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateItem(false)} className="text-zinc-400">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleCreateItem}
              className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none"
              data-testid="submit-create-item"
            >
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPortal;
