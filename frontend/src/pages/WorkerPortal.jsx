import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, useAuth, API } from '../App';
import { 
  Package, 
  CheckCircle, 
  SignOut,
  MagnifyingGlass,
  Camera,
  FileText,
  Note,
  CaretRight,
  Upload,
  X,
  Clock,
  CheckSquare,
  Circle
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
import { Progress } from '../components/ui/progress';
import LanguageToggle from '../components/LanguageToggle';
import { toast } from 'sonner';

const WorkerPortal = () => {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [items, setItems] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  
  // Upload states
  const [showUpload, setShowUpload] = useState(false);
  const [uploadSubtask, setUploadSubtask] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadTag, setUploadTag] = useState('during');
  const [uploading, setUploading] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await API.get('/worker/tasks');
      setItems(response.data.items || []);
      setCheckpoints(response.data.checkpoints || []);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };
  
  const loadItemDetails = async (itemId) => {
    try {
      const response = await API.get(`/worker/items/${itemId}`);
      setItemDetails(response.data);
    } catch (error) {
      toast.error('Failed to load item details');
    }
  };
  
  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    await loadItemDetails(item.item_id);
  };
  
  const handleUpdateProgress = async (subtaskId, status) => {
    if (!selectedItem) return;
    
    try {
      await API.post(`/worker/items/${selectedItem.item_id}/progress`, {
        subtask_id: subtaskId,
        status: status
      });
      toast.success('Progress updated');
      await loadItemDetails(selectedItem.item_id);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update progress');
    }
  };
  
  const handleUploadEvidence = async () => {
    if (!selectedItem || !uploadSubtask) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('subtask_id', uploadSubtask.subtask_id);
      formData.append('evidence_type', uploadFile ? 'photo' : 'note');
      formData.append('tag', uploadTag);
      if (uploadNote) formData.append('note', uploadNote);
      if (uploadFile) formData.append('file', uploadFile);
      
      await API.post(`/worker/items/${selectedItem.item_id}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Evidence uploaded');
      setShowUpload(false);
      setUploadFile(null);
      setUploadNote('');
      setUploadSubtask(null);
      await loadItemDetails(selectedItem.item_id);
    } catch (error) {
      toast.error('Failed to upload evidence');
    } finally {
      setUploading(false);
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
  
  const getItemProgress = (item) => {
    if (!itemDetails || itemDetails.item.item_id !== item.item_id) return 0;
    
    let total = 0;
    let completed = 0;
    
    itemDetails.checkpoints?.forEach(cp => {
      cp.subtasks?.forEach(st => {
        total++;
        if (st.progress?.status === 'completed') completed++;
      });
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };
  
  if (!user?.tenant_id && user?.role !== 'super_admin' && user?.role !== 'tenant_admin') {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-['Barlow_Condensed'] text-2xl text-white uppercase tracking-wider mb-4">
            No Tenant Assigned
          </h2>
          <p className="text-zinc-400 mb-6">
            Please contact your administrator to be assigned to a tenant.
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
                Worker Portal
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase() || 'W'}
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
            <h2 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider mb-3">
              {t('items')}
            </h2>
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
                <p>No items assigned</p>
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
                  <span className="text-zinc-500 text-sm">
                    Type: {itemDetails.item.item_type}
                  </span>
                </div>
              </div>
              
              {/* Checkpoints */}
              <div className="space-y-6">
                {itemDetails.checkpoints?.map((checkpoint, cpIdx) => {
                  const isCurrentCheckpoint = itemDetails.item.current_checkpoint_id === checkpoint.checkpoint_id;
                  const completedSubtasks = checkpoint.subtasks?.filter(st => st.progress?.status === 'completed').length || 0;
                  const totalSubtasks = checkpoint.subtasks?.length || 0;
                  const checkpointProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
                  
                  return (
                    <div 
                      key={checkpoint.checkpoint_id}
                      className={`bg-[#121214] border ${isCurrentCheckpoint ? 'border-[#FF5C00]' : 'border-white/10'}`}
                    >
                      {/* Checkpoint Header */}
                      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 flex items-center justify-center font-['Barlow_Condensed'] font-bold ${
                            checkpointProgress === 100 ? 'bg-green-500 text-white' :
                            isCurrentCheckpoint ? 'bg-[#FF5C00] text-white' :
                            'bg-zinc-700 text-zinc-400'
                          }`}>
                            {checkpoint.order}
                          </div>
                          <div>
                            <h3 className="font-['Barlow_Condensed'] text-lg text-white uppercase tracking-wider">
                              {language === 'es' && checkpoint.name_es ? checkpoint.name_es : checkpoint.name}
                            </h3>
                            <p className="text-zinc-500 text-sm">
                              {completedSubtasks}/{totalSubtasks} {t('subtasks')}
                            </p>
                          </div>
                        </div>
                        {isCurrentCheckpoint && (
                          <span className="px-3 py-1 bg-[#FF5C00]/10 text-[#FF5C00] text-xs uppercase tracking-wider">
                            Current
                          </span>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="px-6 py-2 border-b border-white/10">
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${checkpointProgress}%` }} />
                        </div>
                      </div>
                      
                      {/* Subtasks */}
                      <div className="divide-y divide-white/5">
                        {checkpoint.subtasks?.map((subtask) => (
                          <div key={subtask.subtask_id} className="px-6 py-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {getStatusIcon(subtask.progress?.status)}
                                <div>
                                  <p className="text-white text-sm">
                                    {language === 'es' && subtask.name_es ? subtask.name_es : subtask.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {subtask.requires_evidence && (
                                      <span className="text-xs text-zinc-500">
                                        Evidence: {subtask.evidence_type}
                                      </span>
                                    )}
                                    {subtask.evidence?.length > 0 && (
                                      <span className="text-xs text-green-500">
                                        {subtask.evidence.length} uploaded
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* Upload Evidence Button */}
                                {subtask.progress?.status !== 'completed' && subtask.requires_evidence && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setUploadSubtask(subtask); setShowUpload(true); }}
                                    className="text-zinc-400 hover:text-[#FF5C00]"
                                    data-testid={`upload-evidence-${subtask.subtask_id}`}
                                  >
                                    <Camera size={16} className="mr-1" />
                                    Upload
                                  </Button>
                                )}
                                
                                {/* Status Actions */}
                                {subtask.progress?.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateProgress(subtask.subtask_id, 'in_progress')}
                                    className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-none text-xs"
                                    data-testid={`start-${subtask.subtask_id}`}
                                  >
                                    Start
                                  </Button>
                                )}
                                
                                {subtask.progress?.status === 'in_progress' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateProgress(subtask.subtask_id, 'completed')}
                                    className="bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-none text-xs"
                                    data-testid={`complete-${subtask.subtask_id}`}
                                  >
                                    Complete
                                  </Button>
                                )}
                                
                                {subtask.progress?.status === 'completed' && (
                                  <span className="text-xs text-green-500 uppercase tracking-wider">
                                    {t('completed')}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Evidence Thumbnails */}
                            {subtask.evidence?.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {subtask.evidence.map((ev) => (
                                  <div
                                    key={ev.evidence_id}
                                    className="w-16 h-16 bg-zinc-800 border border-white/10 flex items-center justify-center"
                                    title={ev.note || ev.tag}
                                  >
                                    {ev.evidence_type === 'photo' ? (
                                      <Camera size={20} className="text-zinc-500" />
                                    ) : ev.evidence_type === 'document' ? (
                                      <FileText size={20} className="text-zinc-500" />
                                    ) : (
                                      <Note size={20} className="text-zinc-500" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {itemDetails.checkpoints?.length === 0 && (
                  <div className="bg-[#121214] border border-white/10 p-8 text-center">
                    <CheckSquare size={48} className="mx-auto mb-4 text-zinc-700" />
                    <p className="text-zinc-500">No checkpoints configured for this tenant</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="text-center">
                <Package size={64} className="mx-auto mb-4 text-zinc-700" />
                <p className="font-['Barlow_Condensed'] text-lg uppercase tracking-wider">
                  Select an item to view details
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Upload Evidence Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-[#121214] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] text-xl uppercase tracking-wider">
              Upload Evidence
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Attach photos, documents, or notes</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {uploadSubtask && (
              <div className="p-3 bg-[#09090b] border border-white/10">
                <p className="text-zinc-400 text-sm">Task:</p>
                <p className="text-white">{language === 'es' && uploadSubtask.name_es ? uploadSubtask.name_es : uploadSubtask.name}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Tag</Label>
              <Select value={uploadTag} onValueChange={setUploadTag}>
                <SelectTrigger className="bg-[#09090b] border-white/10 text-white rounded-none" data-testid="upload-tag-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#121214] border-white/10">
                  <SelectItem value="before">Before</SelectItem>
                  <SelectItem value="during">During</SelectItem>
                  <SelectItem value="after">After</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Photo/Document</Label>
              <div 
                className="border-2 border-dashed border-white/10 p-6 text-center cursor-pointer hover:border-[#FF5C00]/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText size={24} className="text-[#FF5C00]" />
                    <span className="text-white text-sm">{uploadFile.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); }} className="text-zinc-500 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto mb-2 text-zinc-500" />
                    <p className="text-zinc-400 text-sm">Click to upload or drag and drop</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                data-testid="file-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-zinc-400 uppercase text-xs tracking-wider">Note (Optional)</Label>
              <Textarea
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                className="bg-[#09090b] border-white/10 text-white rounded-none resize-none"
                placeholder="Add any notes about this evidence..."
                rows={3}
                data-testid="upload-note-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowUpload(false); setUploadFile(null); setUploadNote(''); }} className="text-zinc-400">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleUploadEvidence}
              disabled={uploading || (!uploadFile && !uploadNote)}
              className="bg-[#FF5C00] hover:bg-[#E05000] text-white rounded-none"
              data-testid="submit-upload"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerPortal;
