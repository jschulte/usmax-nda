import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/AppCard';
import { Badge } from '../ui/AppBadge';
import { Button } from '../ui/AppButton';
import { Input } from '../ui/AppInput';
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
  Trash2,
  AlertCircle,
  Loader2
} from 'lucide-react';
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
import {
  listNDAs,
  cloneNDA,
  updateNDAStatus,
  type NdaListItem,
  type NdaStatus,
  type ListNdasParams
} from '../../client/services/ndaService';

export function Requests() {
  const navigate = useNavigate();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<NdaStatus | 'all'>('all');
  const [agencyGroupFilter, setAgencyGroupFilter] = useState<string>('all');

  // Data state
  const [ndas, setNdas] = useState<NdaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  // Confirmation dialog state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [ndaToCancel, setNdaToCancel] = useState<NdaListItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Debounce search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch NDAs whenever filters or pagination changes
  useEffect(() => {
    const fetchNDAs = async () => {
      setLoading(true);
      setError(null);

      try {
        const params: ListNdasParams = {
          page: currentPage,
          limit: pageSize,
          search: debouncedSearchTerm || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          agencyGroupId: agencyGroupFilter !== 'all' ? agencyGroupFilter : undefined,
          showInactive: true, // Show all NDAs including inactive
          showCancelled: true, // Show cancelled NDAs
        };

        const response = await listNDAs(params);
        setNdas(response.ndas);
        setTotalCount(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      } catch (err) {
        console.error('Failed to fetch NDAs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load NDAs');
        toast.error('Failed to load NDAs', {
          description: 'Please try again later.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNDAs();
  }, [debouncedSearchTerm, statusFilter, agencyGroupFilter, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, agencyGroupFilter]);

  const handleViewNDA = (nda: NdaListItem) => {
    navigate(`/nda/${nda.id}`);
  };

  const handleEditNDA = (nda: NdaListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/nda/${nda.id}/edit`);
  };

  const handleDuplicateNDA = async (nda: NdaListItem, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const result = await cloneNDA(nda.id);
      toast.success('NDA duplicated', {
        description: `${nda.companyName} NDA has been cloned.`
      });

      // Refresh the list to show the new NDA
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to duplicate NDA:', err);
      toast.error('Failed to duplicate NDA', {
        description: err instanceof Error ? err.message : 'Please try again later.'
      });
    }
  };

  const handleCancelNDA = (nda: NdaListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setNdaToCancel(nda);
    setShowCancelConfirm(true);
  };

  const confirmCancelNDA = async () => {
    if (!ndaToCancel) return;

    setIsCancelling(true);
    try {
      await updateNDAStatus(ndaToCancel.id, 'CANCELLED', 'Cancelled by user');
      toast.success('NDA cancelled', {
        description: `${ndaToCancel.companyName} NDA has been cancelled.`
      });
      setShowCancelConfirm(false);
      setNdaToCancel(null);

      // Refresh the list
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to cancel NDA:', err);
      toast.error('Failed to cancel NDA', {
        description: err instanceof Error ? err.message : 'Please try again later.'
      });
    } finally {
      setIsCancelling(false);
    }
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
            onChange={(e) => setStatusFilter(e.target.value as NdaStatus | 'all')}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'CREATED', label: 'Created' },
              { value: 'EMAILED', label: 'Emailed' },
              { value: 'IN_REVISION', label: 'In Revision' },
              { value: 'FULLY_EXECUTED', label: 'Fully Executed' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]}
            className="w-full md:w-48"
          />

          <Select
            label=""
            value={agencyGroupFilter}
            onChange={(e) => setAgencyGroupFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Agencies' }
              // TODO: Populate from API or context
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
          {loading ? (
            'Loading...'
          ) : (
            `Showing ${ndas.length} of ${totalCount} requests`
          )}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--color-primary)]" />
            <p className="text-[var(--color-text-secondary)]">Loading NDAs...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
            <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
            <Button variant="outline" onClick={() => setCurrentPage(1)}>
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && ndas.length === 0 && (
        <Card className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-[var(--color-text-secondary)] mb-4">No NDAs found</p>
            <Button variant="primary" icon={<Plus className="w-5 h-5" />} onClick={() => navigate('/request-wizard')}>
              Create your first NDA
            </Button>
          </div>
        </Card>
      )}
      
      {/* Desktop Table */}
      {!loading && !error && ndas.length > 0 && (
        <Card padding="none" className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    NDA ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Agency
                  </th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Effective Date
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
                {ndas.map((nda) => (
                  <tr
                    key={nda.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewNDA(nda)}
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">{nda.displayId}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{nda.companyName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{nda.agencyGroup.name}</p>
                      {nda.subagency && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{nda.subagency.name}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="status" status={nda.status}>{nda.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                      {nda.effectiveDate ? new Date(nda.effectiveDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                      {new Date(nda.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                      {new Date(nda.updatedAt).toLocaleDateString()}
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
                          <DropdownMenuItem onClick={(e) => handleCancelNDA(nda, e)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cancel
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
      )}

      {/* Mobile Card View */}
      {!loading && !error && ndas.length > 0 && (
        <div className="md:hidden space-y-3">
          {ndas.map((nda) => (
            <Card
              key={nda.id}
              className="p-4 active:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => handleViewNDA(nda)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-medium mb-1 truncate">{nda.displayId}</p>
                  <p className="text-sm text-[var(--color-text-secondary)] truncate">{nda.companyName}</p>
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
                    <DropdownMenuItem onClick={(e) => handleCancelNDA(nda, e)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Cancel
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
                  <span className="truncate">{nda.agencyGroup.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Created {new Date(nda.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="status" status={nda.status}>{nda.status}</Badge>
                {nda.effectiveDate && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Effective: {new Date(nda.effectiveDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel NDA</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this NDA? The NDA will be marked as cancelled but can be viewed in the system.
            </DialogDescription>
          </DialogHeader>
          {ndaToCancel && (
            <div className="py-4">
              <p className="text-sm">
                <span className="font-medium">Company:</span> {ndaToCancel.companyName}
              </p>
              <p className="text-sm mt-1">
                <span className="font-medium">Agency:</span> {ndaToCancel.agencyGroup.name}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelConfirm(false);
                setNdaToCancel(null);
              }}
              disabled={isCancelling}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelNDA}
              disabled={isCancelling}
              icon={isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel NDA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}