import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Plus,
  Filter,
  Download,
  Search,
  Calendar,
  Building,
  User,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Trash2
} from 'lucide-react';
import { mockNDAs } from '../../data/mockData';
import { toast } from 'sonner@2.0.3';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export function Requests() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  
  // Confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ndaToDelete, setNdaToDelete] = useState<any>(null);
  
  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingNDA, setEditingNDA] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    counterparty: '',
    type: '',
    riskLevel: ''
  });
  
  const filteredNDAs = mockNDAs.filter(nda => {
    const matchesSearch = nda.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nda.counterparty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || nda.status === statusFilter;
    const matchesType = typeFilter === 'all' || nda.type === typeFilter;
    const matchesRisk = riskFilter === 'all' || nda.riskLevel === riskFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesRisk;
  });
  
  const handleViewNDA = (nda: any) => {
    navigate(`/nda/${nda.id}`);
  };
  
  const handleEditNDA = (nda: any, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/request-wizard', { 
      state: { 
        editMode: true, 
        nda: nda 
      } 
    });
  };
  
  const handleDuplicateNDA = (nda: any, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('NDA duplicated', {
      description: `${nda.title} (Copy) has been created.`
    });
  };
  
  const handleDeleteNDA = (nda: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setNdaToDelete(nda);
    setShowDeleteConfirm(true);
  };
  
  const handleMoreFilters = () => {
    toast.info('More filters', {
      description: 'Advanced filter options coming soon.'
    });
  };
  
  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="mb-2">Requests</h1>
          <p className="text-[var(--color-text-secondary)]">Manage all NDA requests and agreements</p>
        </div>
        <Button 
          variant="primary" 
          icon={<Plus className="w-5 h-5" />}
          onClick={() => navigate('/request-wizard')}
          className="w-full sm:w-auto"
        >
          Request new NDA
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-end gap-4">
          <div className="flex-1 md:min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search by title, counterparty, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>
          
          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'Draft', label: 'Draft' },
              { value: 'In legal review', label: 'In legal review' },
              { value: 'Pending approval', label: 'Pending approval' },
              { value: 'Waiting for signature', label: 'Waiting for signature' },
              { value: 'Executed', label: 'Executed' },
              { value: 'Expired', label: 'Expired' }
            ]}
            className="w-full md:w-48"
          />
          
          <Select
            label=""
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'Mutual', label: 'Mutual' },
              { value: 'One-way government disclosing', label: 'One-way (Gov)' },
              { value: 'One-way counterparty disclosing', label: 'One-way (Counter)' },
              { value: 'Visitor', label: 'Visitor' },
              { value: 'Research', label: 'Research' },
              { value: 'Vendor access', label: 'Vendor access' }
            ]}
            className="w-full md:w-48"
          />
          
          <Select
            label=""
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Risk Levels' },
              { value: 'Low', label: 'Low Risk' },
              { value: 'Medium', label: 'Medium Risk' },
              { value: 'High', label: 'High Risk' }
            ]}
            className="w-full md:w-48"
          />
          
          <Button variant="subtle" icon={<Filter className="w-4 h-4" />} onClick={handleMoreFilters} className="w-full md:w-auto">
            More filters
          </Button>
        </div>
      </Card>
      
      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Showing {filteredNDAs.length} of {mockNDAs.length} requests
        </p>
      </div>
      
      {/* Desktop Table */}
      <Card padding="none" className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Request Title
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Counterparty
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-center text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[var(--color-border)]">
              {filteredNDAs.map((nda) => (
                <tr 
                  key={nda.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleViewNDA(nda)}
                >
                  <td className="px-6 py-4">
                    <p className="text-sm">{nda.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{nda.department}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{nda.counterparty}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{nda.counterpartyContact}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="type">{nda.type}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="risk" risk={nda.riskLevel}>{nda.riskLevel}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="status" status={nda.status}>{nda.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                    {new Date(nda.createdDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                    {new Date(nda.lastUpdated).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={(e) => handleEditNDA(nda, e)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDuplicateNDA(nda, e)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDeleteNDA(nda, e)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewNDA(nda)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredNDAs.map((nda) => (
          <Card 
            key={nda.id} 
            className="p-4 active:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => handleViewNDA(nda)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-medium mb-1 truncate">{nda.title}</p>
                <p className="text-sm text-[var(--color-text-secondary)] truncate">{nda.department}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger 
                  className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => handleEditNDA(nda, e)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => handleDuplicateNDA(nda, e)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => handleDeleteNDA(nda, e)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleViewNDA(nda)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Building className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{nda.counterparty}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>Created {new Date(nda.createdDate).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="status" status={nda.status}>{nda.status}</Badge>
              <Badge variant="type">{nda.type}</Badge>
              <Badge variant="risk" risk={nda.riskLevel}>{nda.riskLevel}</Badge>
            </div>
          </Card>
        ))}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete NDA</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this NDA? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                toast.success('NDA deleted', {
                  description: `${ndaToDelete.title} has been deleted.`
                });
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}