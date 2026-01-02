/**
 * FeatureRequestsPage
 * Admin page for managing feature requests in the roadmap
 */

import * as React from 'react';
import { 
  CircularProgress, 
  TextField, 
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { 
  RoadmapFeature, 
  fetchAllFeaturesAdmin, 
  updateFeature, 
  approveFeature, 
  deleteFeature,
  createFeatureAdmin,
  fetchAllUsers,
  AppUser,
  STATUS_CONFIG,
  CATEGORIES,
} from '@/lib/roadmap';
import styles from './FeatureRequestsPage.module.css';

const STATUSES = [
  { value: 'submitted', label: 'Pending Review' },
  { value: 'idea', label: 'Idea' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Complete' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// Special value for Levelset as creator
const LEVELSET_CREATOR = { id: 'levelset', label: 'Levelset' };

export function FeatureRequestsPage() {
  const [features, setFeatures] = React.useState<RoadmapFeature[]>([]);
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'outstanding' | 'completed'>('outstanding');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  
  // Modal states
  const [approveModalOpen, setApproveModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedFeature, setSelectedFeature] = React.useState<RoadmapFeature | null>(null);
  const [approveStatus, setApproveStatus] = React.useState<string>('idea');
  
  // Edit form state
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editCategory, setEditCategory] = React.useState('');
  const [editStatus, setEditStatus] = React.useState('');
  const [editPriority, setEditPriority] = React.useState('');
  const [editCreator, setEditCreator] = React.useState<string>('levelset');
  const [editCreatorSearch, setEditCreatorSearch] = React.useState('');
  const [showEditCreatorDropdown, setShowEditCreatorDropdown] = React.useState(false);
  
  // Create form state
  const [createTitle, setCreateTitle] = React.useState('');
  const [createDescription, setCreateDescription] = React.useState('');
  const [createCategory, setCreateCategory] = React.useState('Feature');
  const [createStatus, setCreateStatus] = React.useState('idea');
  const [createPriority, setCreatePriority] = React.useState('medium');
  const [createCreator, setCreateCreator] = React.useState<string>('levelset');
  const [creatorSearch, setCreatorSearch] = React.useState('');
  const [showCreatorDropdown, setShowCreatorDropdown] = React.useState(false);
  
  const [actionLoading, setActionLoading] = React.useState(false);
  const creatorDropdownRef = React.useRef<HTMLDivElement>(null);
  const editCreatorDropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch features and users
  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [featuresData, usersData] = await Promise.all([
          fetchAllFeaturesAdmin(),
          fetchAllUsers(),
        ]);
        setFeatures(featuresData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Close creator dropdowns when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (creatorDropdownRef.current && !creatorDropdownRef.current.contains(event.target as Node)) {
        setShowCreatorDropdown(false);
      }
      if (editCreatorDropdownRef.current && !editCreatorDropdownRef.current.contains(event.target as Node)) {
        setShowEditCreatorDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user display name
  const getUserDisplayName = React.useCallback((userId: string | null): string => {
    if (!userId || userId === 'levelset') return 'Levelset';
    const user = users.find(u => u.auth_user_id === userId);
    if (!user) return 'Unknown User';
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return name || user.email || 'Unknown User';
  }, [users]);

  // Filter users for create dropdown
  const filteredUsers = React.useMemo(() => {
    if (!creatorSearch.trim()) return users;
    const search = creatorSearch.toLowerCase();
    return users.filter(user => {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [users, creatorSearch]);

  // Filter users for edit dropdown
  const filteredEditUsers = React.useMemo(() => {
    if (!editCreatorSearch.trim()) return users;
    const search = editCreatorSearch.toLowerCase();
    return users.filter(user => {
      const name = [user.first_name, user.last_name].filter(Boolean).join(' ').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [users, editCreatorSearch]);

  // Filter and sort features based on active tab
  const filteredFeatures = React.useMemo(() => {
    const filtered = features.filter(feature => {
      // Tab filter - Outstanding shows non-completed, Completed shows completed
      if (activeTab === 'outstanding' && feature.status === 'completed') {
        return false;
      }
      if (activeTab === 'completed' && feature.status !== 'completed') {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!feature.title.toLowerCase().includes(query) && 
            !feature.description?.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Category filter
      if (categoryFilter !== 'all' && feature.category !== categoryFilter) {
        return false;
      }
      return true;
    });
    
    // Sort: pending review (submitted) at top, then by created_at desc
    return filtered.sort((a, b) => {
      // Pending review (submitted) first (only relevant for outstanding tab)
      if (a.status === 'submitted' && b.status !== 'submitted') return -1;
      if (a.status !== 'submitted' && b.status === 'submitted') return 1;
      // Then by created_at (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [features, searchQuery, activeTab, categoryFilter]);
  
  // Count completed features
  const completedCount = React.useMemo(() => {
    return features.filter(f => f.status === 'completed').length;
  }, [features]);

  // Handle approve
  const handleApproveClick = (feature: RoadmapFeature) => {
    setSelectedFeature(feature);
    setApproveStatus('idea');
    setApproveModalOpen(true);
  };

  const handleApproveConfirm = async () => {
    if (!selectedFeature) return;
    setActionLoading(true);
    try {
      const updated = await approveFeature(selectedFeature.id, approveStatus);
      if (updated) {
        setFeatures(prev => prev.map(f => f.id === updated.id ? updated : f));
      }
      setApproveModalOpen(false);
      setSelectedFeature(null);
    } catch (error) {
      console.error('Error approving feature:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit
  const handleEditClick = (feature: RoadmapFeature) => {
    setSelectedFeature(feature);
    setEditTitle(feature.title);
    setEditDescription(feature.description || '');
    // Use raw category from DB
    setEditCategory(feature.category);
    setEditStatus(feature.status);
    setEditPriority(feature.priority);
    // Set creator - null means Levelset
    setEditCreator(feature.created_by || 'levelset');
    setEditCreatorSearch('');
    setShowEditCreatorDropdown(false);
    setEditModalOpen(true);
  };

  const handleSelectEditCreator = (userId: string) => {
    setEditCreator(userId);
    setEditCreatorSearch('');
    setShowEditCreatorDropdown(false);
  };

  const handleEditConfirm = async () => {
    if (!selectedFeature) return;
    setActionLoading(true);
    try {
      // Pass null for Levelset, otherwise pass the user's auth_user_id
      const createdBy = editCreator === 'levelset' ? null : editCreator;
      const updated = await updateFeature(selectedFeature.id, {
        title: editTitle,
        description: editDescription,
        category: editCategory,
        status: editStatus as RoadmapFeature['status'],
        priority: editPriority as RoadmapFeature['priority'],
        is_public: editStatus !== 'submitted',
        created_by: createdBy,
      });
      if (updated) {
        setFeatures(prev => prev.map(f => f.id === updated.id ? updated : f));
        setEditModalOpen(false);
        setSelectedFeature(null);
      }
    } catch (error) {
      console.error('Error updating feature:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle create
  const handleCreateClick = () => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateCategory('Feature');
    setCreateStatus('idea');
    setCreatePriority('medium');
    setCreateCreator('levelset');
    setCreatorSearch('');
    setShowCreatorDropdown(false);
    setCreateModalOpen(true);
  };

  const handleSelectCreator = (userId: string) => {
    setCreateCreator(userId);
    setCreatorSearch('');
    setShowCreatorDropdown(false);
  };

  const handleCreateConfirm = async () => {
    if (!createTitle.trim()) return;
    setActionLoading(true);
    try {
      // Pass null for Levelset, otherwise pass the user's auth_user_id
      const createdBy = createCreator === 'levelset' ? null : createCreator;
      const newFeature = await createFeatureAdmin(
        createTitle,
        createDescription,
        createCategory,
        createStatus as RoadmapFeature['status'],
        createPriority as RoadmapFeature['priority'],
        createdBy
      );
      if (newFeature) {
        setFeatures(prev => [newFeature, ...prev]);
        setCreateModalOpen(false);
      }
    } catch (error) {
      console.error('Error creating feature:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (feature: RoadmapFeature) => {
    setSelectedFeature(feature);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedFeature) return;
    setActionLoading(true);
    try {
      const success = await deleteFeature(selectedFeature.id);
      if (success) {
        setFeatures(prev => prev.filter(f => f.id !== selectedFeature.id));
      }
      setDeleteModalOpen(false);
      setSelectedFeature(null);
    } catch (error) {
      console.error('Error deleting feature:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.idea;
    return (
      <span 
        className={styles.statusBadge}
        style={{ 
          backgroundColor: config.bgColor, 
          color: config.textColor,
          borderColor: config.borderColor,
        }}
      >
        {config.label}
      </span>
    );
  };

  // Get unique categories from features (including non-standard ones)
  const uniqueCategories = React.useMemo(() => {
    const cats = new Set<string>();
    features.forEach(f => cats.add(f.category));
    CATEGORIES.forEach(c => cats.add(c));
    return Array.from(cats).sort();
  }, [features]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
        <span>Loading feature requests...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Feature Requests</h1>
          <p className={styles.subtitle}>
            Manage and approve user-submitted feature requests
          </p>
        </div>
        {activeTab === 'outstanding' && (
          <button className={styles.createButton} onClick={handleCreateClick}>
            <AddIcon fontSize="small" />
            Create Feature
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'outstanding' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('outstanding')}
        >
          Outstanding
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'completed' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <TextField
          placeholder="Search features..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9ca3af' }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        
        <select
          className={styles.filterSelect}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{completedCount}</span>
          <span className={styles.statLabel}>Completed Features</span>
        </div>
      </div>

      {/* Features Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Votes</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeatures.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  No feature requests found
                </td>
              </tr>
            ) : (
              filteredFeatures.map(feature => (
                <tr key={feature.id} className={feature.status === 'submitted' ? styles.pendingRow : ''}>
                  <td>
                    <div className={styles.featureTitle}>{feature.title}</div>
                    {feature.description && (
                      <div className={styles.featureDescription}>
                        {feature.description.slice(0, 100)}
                        {feature.description.length > 100 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={styles.categoryTag}>{feature.category}</span>
                  </td>
                  <td>{getStatusBadge(feature.status)}</td>
                  <td className={styles.voteCount}>{feature.vote_count}</td>
                  <td className={styles.dateCell}>{formatDate(feature.created_at)}</td>
                  <td>
                    <div className={styles.actions}>
                      {feature.status === 'submitted' && (
                        <Tooltip title="Approve">
                          <IconButton 
                            size="small" 
                            onClick={() => handleApproveClick(feature)}
                            sx={{ color: '#31664a' }}
                          >
                            <CheckCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditClick(feature)}
                          sx={{ color: '#6b7280' }}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteClick(feature)}
                          sx={{ color: '#dc2626' }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Approve Modal */}
      <Dialog open={approveModalOpen} onClose={() => setApproveModalOpen(false)}>
        <DialogTitle>Approve Feature Request</DialogTitle>
        <DialogContent>
          <p style={{ marginBottom: 16 }}>
            Select the status for this feature after approval:
          </p>
          <select
            className={styles.modalSelect}
            value={approveStatus}
            onChange={(e) => setApproveStatus(e.target.value)}
          >
            <option value="idea">Idea</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
          </select>
          <div className={styles.modalActions}>
            <button 
              className={styles.cancelButton} 
              onClick={() => setApproveModalOpen(false)} 
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button 
              className={styles.primaryButton}
              onClick={handleApproveConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Feature</DialogTitle>
        <DialogContent>
          <div className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Title</label>
              <input
                type="text"
                className={styles.modalInput}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                className={styles.modalTextarea}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select
                  className={styles.modalSelect}
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Status</label>
                <select
                  className={styles.modalSelect}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Priority</label>
                <select
                  className={styles.modalSelect}
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup} ref={editCreatorDropdownRef}>
                <label className={styles.formLabel}>Creator</label>
                <div className={styles.creatorDropdownContainer}>
                  <input
                    type="text"
                    className={styles.modalInput}
                    value={showEditCreatorDropdown ? editCreatorSearch : getUserDisplayName(editCreator)}
                    onChange={(e) => {
                      setEditCreatorSearch(e.target.value);
                      setShowEditCreatorDropdown(true);
                    }}
                    onFocus={() => setShowEditCreatorDropdown(true)}
                    placeholder="Search users..."
                  />
                  {showEditCreatorDropdown && (
                    <div className={styles.creatorDropdown}>
                      <div 
                        className={`${styles.creatorOption} ${editCreator === 'levelset' ? styles.creatorOptionSelected : ''}`}
                        onClick={() => handleSelectEditCreator('levelset')}
                      >
                        <img 
                          src="/logos/Levelset no margin.png" 
                          alt="Levelset" 
                          className={styles.creatorAvatar}
                        />
                        <span>Levelset</span>
                      </div>
                      {filteredEditUsers.slice(0, 10).map(user => (
                        <div 
                          key={user.auth_user_id}
                          className={`${styles.creatorOption} ${editCreator === user.auth_user_id ? styles.creatorOptionSelected : ''}`}
                          onClick={() => handleSelectEditCreator(user.auth_user_id)}
                        >
                          <div className={styles.creatorAvatarPlaceholder}>
                            {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div className={styles.creatorInfo}>
                            <span className={styles.creatorName}>
                              {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown'}
                            </span>
                            {user.email && (
                              <span className={styles.creatorEmail}>{user.email}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {filteredEditUsers.length === 0 && editCreatorSearch && (
                        <div className={styles.creatorNoResults}>No users found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button 
              className={styles.cancelButton} 
              onClick={() => setEditModalOpen(false)} 
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button 
              className={styles.primaryButton}
              onClick={handleEditConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Feature</DialogTitle>
        <DialogContent>
          <div className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Title</label>
              <input
                type="text"
                className={styles.modalInput}
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Enter feature title"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                className={styles.modalTextarea}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={3}
                placeholder="Describe the feature..."
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select
                  className={styles.modalSelect}
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Status</label>
                <select
                  className={styles.modalSelect}
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value)}
                >
                  {STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Priority</label>
                <select
                  className={styles.modalSelect}
                  value={createPriority}
                  onChange={(e) => setCreatePriority(e.target.value)}
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup} ref={creatorDropdownRef}>
                <label className={styles.formLabel}>Creator</label>
                <div className={styles.creatorDropdownContainer}>
                  <input
                    type="text"
                    className={styles.modalInput}
                    value={showCreatorDropdown ? creatorSearch : getUserDisplayName(createCreator)}
                    onChange={(e) => {
                      setCreatorSearch(e.target.value);
                      setShowCreatorDropdown(true);
                    }}
                    onFocus={() => setShowCreatorDropdown(true)}
                    placeholder="Search users..."
                  />
                  {showCreatorDropdown && (
                    <div className={styles.creatorDropdown}>
                      <div 
                        className={`${styles.creatorOption} ${createCreator === 'levelset' ? styles.creatorOptionSelected : ''}`}
                        onClick={() => handleSelectCreator('levelset')}
                      >
                        <img 
                          src="/logos/Levelset no margin.png" 
                          alt="Levelset" 
                          className={styles.creatorAvatar}
                        />
                        <span>Levelset</span>
                      </div>
                      {filteredUsers.slice(0, 10).map(user => (
                        <div 
                          key={user.auth_user_id}
                          className={`${styles.creatorOption} ${createCreator === user.auth_user_id ? styles.creatorOptionSelected : ''}`}
                          onClick={() => handleSelectCreator(user.auth_user_id)}
                        >
                          <div className={styles.creatorAvatarPlaceholder}>
                            {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div className={styles.creatorInfo}>
                            <span className={styles.creatorName}>
                              {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown'}
                            </span>
                            {user.email && (
                              <span className={styles.creatorEmail}>{user.email}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {filteredUsers.length === 0 && creatorSearch && (
                        <div className={styles.creatorNoResults}>No users found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button 
              className={styles.cancelButton} 
              onClick={() => setCreateModalOpen(false)} 
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button 
              className={styles.primaryButton}
              onClick={handleCreateConfirm}
              disabled={actionLoading || !createTitle.trim()}
            >
              {actionLoading ? 'Creating...' : 'Create Feature'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <DialogTitle>Delete Feature</DialogTitle>
        <DialogContent>
          <p>Are you sure you want to delete this feature request?</p>
          <p style={{ fontWeight: 600, marginTop: 8 }}>{selectedFeature?.title}</p>
          <p style={{ color: '#dc2626', marginTop: 16, fontSize: 14 }}>
            This action cannot be undone.
          </p>
          <div className={styles.modalActions}>
            <button 
              className={styles.cancelButton} 
              onClick={() => setDeleteModalOpen(false)} 
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button 
              className={styles.deleteButton}
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
