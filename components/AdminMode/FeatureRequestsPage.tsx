/**
 * FeatureRequestsPage
 * Admin page for managing feature requests in the roadmap
 */

import * as React from 'react';
import { 
  CircularProgress, 
  TextField, 
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { 
  RoadmapFeature, 
  fetchAllFeaturesAdmin, 
  updateFeature, 
  approveFeature, 
  deleteFeature,
  STATUS_CONFIG,
  CATEGORIES,
  CATEGORY_MAP,
} from '@/lib/roadmap';

// Helper to get display category (maps old categories to new ones)
function getDisplayCategory(category: string): string {
  if (CATEGORIES.includes(category)) {
    return category;
  }
  return CATEGORY_MAP[category] || 'Feature';
}
import styles from './FeatureRequestsPage.module.css';

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
  const [selectedFeature, setSelectedFeature] = React.useState<RoadmapFeature | null>(null);
  const [approveStatus, setApproveStatus] = React.useState<string>('idea');
  
  // Edit form state
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editCategory, setEditCategory] = React.useState('');
  const [editStatus, setEditStatus] = React.useState('');
  const [editPriority, setEditPriority] = React.useState('');
  
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
    // Map old categories to new ones so dropdown syncs correctly
    setEditCategory(getDisplayCategory(feature.category));
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
      }
      setEditModalOpen(false);
      setSelectedFeature(null);
    } catch (error) {
      console.error('Error updating feature:', error);
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
        <h1 className={styles.title}>Feature Requests</h1>
        <p className={styles.subtitle}>
          Manage and approve user-submitted feature requests
        </p>
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
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="submitted">Pending Review</MenuItem>
            <MenuItem value="idea">Idea</MenuItem>
            <MenuItem value="planned">Planned</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="completed">Complete</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={categoryFilter}
            label="Category"
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {CATEGORIES.map(cat => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </Select>
        </FormControl>
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
                    <span className={styles.categoryTag}>{getDisplayCategory(feature.category)}</span>
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
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={approveStatus}
              label="Status"
              onChange={(e) => setApproveStatus(e.target.value)}
            >
              <MenuItem value="idea">Idea</MenuItem>
              <MenuItem value="planned">Planned</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveModalOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleApproveConfirm} 
            variant="contained" 
            disabled={actionLoading}
            sx={{ backgroundColor: '#31664a', '&:hover': { backgroundColor: '#285840' } }}
          >
            {actionLoading ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Feature</DialogTitle>
        <DialogContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
            <TextField
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={editCategory}
                  label="Category"
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editStatus}
                  label="Status"
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <MenuItem value="submitted">Pending Review</MenuItem>
                  <MenuItem value="idea">Idea</MenuItem>
                  <MenuItem value="planned">Planned</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Complete</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </div>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={editPriority}
                label="Priority"
                onChange={(e) => setEditPriority(e.target.value)}
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditConfirm} 
            variant="contained" 
            disabled={actionLoading}
            sx={{ backgroundColor: '#31664a', '&:hover': { backgroundColor: '#285840' } }}
          >
            {actionLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
            disabled={actionLoading}
          >
            {actionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
