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

export function FeatureRequestsPage() {
  const [features, setFeatures] = React.useState<RoadmapFeature[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
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
  
  // Create form state
  const [createTitle, setCreateTitle] = React.useState('');
  const [createDescription, setCreateDescription] = React.useState('');
  const [createCategory, setCreateCategory] = React.useState('Feature');
  const [createStatus, setCreateStatus] = React.useState('idea');
  const [createPriority, setCreatePriority] = React.useState('medium');
  
  const [actionLoading, setActionLoading] = React.useState(false);

  // Fetch features
  React.useEffect(() => {
    async function loadFeatures() {
      setLoading(true);
      try {
        const data = await fetchAllFeaturesAdmin();
        setFeatures(data);
      } catch (error) {
        console.error('Error loading features:', error);
      } finally {
        setLoading(false);
      }
    }
    loadFeatures();
  }, []);

  // Filter features
  const filteredFeatures = React.useMemo(() => {
    return features.filter(feature => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!feature.title.toLowerCase().includes(query) && 
            !feature.description?.toLowerCase().includes(query)) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== 'all' && feature.status !== statusFilter) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && feature.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [features, searchQuery, statusFilter, categoryFilter]);

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
    setEditModalOpen(true);
  };

  const handleEditConfirm = async () => {
    if (!selectedFeature) return;
    setActionLoading(true);
    try {
      const updated = await updateFeature(selectedFeature.id, {
        title: editTitle,
        description: editDescription,
        category: editCategory,
        status: editStatus as RoadmapFeature['status'],
        priority: editPriority as RoadmapFeature['priority'],
        is_public: editStatus !== 'submitted',
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
    setCreateModalOpen(true);
  };

  const handleCreateConfirm = async () => {
    if (!createTitle.trim()) return;
    setActionLoading(true);
    try {
      const newFeature = await createFeatureAdmin(
        createTitle,
        createDescription,
        createCategory,
        createStatus as RoadmapFeature['status'],
        createPriority as RoadmapFeature['priority']
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
        <button className={styles.createButton} onClick={handleCreateClick}>
          <AddIcon fontSize="small" />
          Create Feature
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        
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
          <span className={styles.statNumber}>
            {features.filter(f => f.status === 'submitted').length}
          </span>
          <span className={styles.statLabel}>Pending Review</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{features.length}</span>
          <span className={styles.statLabel}>Total Features</span>
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
