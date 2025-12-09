import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Search, Plus, MoreVertical, Edit, Copy, Power, Trash2 } from 'lucide-react';
import { mockTemplates, mockClauses } from '../../data/mockData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner@2.0.3';

export function Templates() {
  const [activeView, setActiveView] = useState<'templates' | 'clauses'>('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showClauseDialog, setShowClauseDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('');
  const [clauseName, setClauseName] = useState('');
  const [clauseTopic, setClauseTopic] = useState('');
  
  const filteredTemplates = mockTemplates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredClauses = mockClauses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleCreateTemplate = () => {
    setTemplateName('');
    setTemplateType('');
    setShowCreateDialog(true);
  };
  
  const handleCreateClause = () => {
    setClauseName('');
    setClauseTopic('');
    setShowCreateDialog(true);
  };
  
  const confirmCreate = () => {
    if (activeView === 'templates') {
      if (templateName.trim() && templateType.trim()) {
        toast.success('Template created', {
          description: `${templateName} has been created successfully.`
        });
        setShowCreateDialog(false);
      }
    } else {
      if (clauseName.trim() && clauseTopic.trim()) {
        toast.success('Clause added', {
          description: `${clauseName} has been added to the library.`
        });
        setShowCreateDialog(false);
      }
    }
  };
  
  const handleEditTemplate = (template: any) => {
    setSelectedItem(template);
    setTemplateName(template.name);
    setTemplateType(template.type);
    setShowEditDialog(true);
  };
  
  const confirmEdit = () => {
    toast.success('Template updated', {
      description: `${templateName} has been updated successfully.`
    });
    setShowEditDialog(false);
  };
  
  const handleDuplicateTemplate = (template: any) => {
    toast.success('Template duplicated', {
      description: `${template.name} (Copy) has been created.`
    });
  };
  
  const handleToggleTemplate = (template: any) => {
    const newStatus = !template.active;
    toast.success(newStatus ? 'Template activated' : 'Template deactivated', {
      description: `${template.name} is now ${newStatus ? 'active' : 'inactive'}.`
    });
  };
  
  const handleDeleteTemplate = (template: any) => {
    toast.success('Template deleted', {
      description: `${template.name} has been deleted.`
    });
  };
  
  const handleViewClauseDetails = (clause: any) => {
    setSelectedItem(clause);
    setShowClauseDialog(true);
  };
  
  const handleEditClause = (clause: any) => {
    toast.info('Edit clause', {
      description: `Opening editor for ${clause.name}...`
    });
  };
  
  const handleDeleteClause = (clause: any) => {
    toast.success('Clause deleted', {
      description: `${clause.name} has been deleted.`
    });
  };
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-2">Templates and Clauses</h1>
          <p className="text-[var(--color-text-secondary)]">Manage NDA templates and reusable clause library</p>
        </div>
        <Button 
          variant="primary" 
          icon={<Plus className="w-5 h-5" />}
          onClick={activeView === 'templates' ? handleCreateTemplate : handleCreateClause}
        >
          {activeView === 'templates' ? 'Create template' : 'Add clause'}
        </Button>
      </div>
      
      {/* View Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView('templates')}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeView === 'templates'
                ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveView('clauses')}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeView === 'clauses'
                ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            Clauses
          </button>
        </div>
        
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder={`Search ${activeView}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        </div>
      </div>
      
      {/* Templates View */}
      {activeView === 'templates' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Template Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-center text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[var(--color-border)]">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm">{template.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{template.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="type">{template.type}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                      {template.department}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                      {new Date(template.lastUpdated).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {template.active ? (
                        <Badge variant="status" status="Executed">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Edit template"
                        >
                          <Edit className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleDuplicateTemplate(template)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Duplicate template"
                        >
                          <Copy className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleToggleTemplate(template)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title={template.active ? 'Deactivate' : 'Activate'}
                        >
                          <Power className={`w-4 h-4 ${template.active ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`} />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
                              <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteTemplate(template)} variant="destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {/* Clauses View */}
      {activeView === 'clauses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClauses.map((clause) => (
            <Card key={clause.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base">{clause.name}</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <MoreVertical className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewClauseDetails(clause)}>
                      <Edit className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditClause(clause)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDeleteClause(clause)} variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="info">{clause.topic}</Badge>
                <Badge variant="risk" risk={clause.riskLevel}>{clause.riskLevel}</Badge>
                {clause.required && (
                  <Badge variant="default">Required</Badge>
                )}
              </div>
              
              <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-3">
                {clause.text}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Used in {clause.usageCount} templates
                </p>
                <Button variant="subtle" size="sm" onClick={() => handleViewClauseDetails(clause)}>View details</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Template/Clause Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeView === 'templates' ? 'Create Template' : 'Add Clause'}</DialogTitle>
            <DialogDescription>
              {activeView === 'templates' 
                ? 'Create a new NDA template.' 
                : 'Add a new clause to the library.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {activeView === 'templates' ? (
              <>
                <input
                  type="text"
                  placeholder="Template name..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
                <select
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                >
                  <option value="">Select type...</option>
                  <option value="Mutual">Mutual</option>
                  <option value="One-way">One-way</option>
                  <option value="Visitor">Visitor</option>
                </select>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Clause name..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={clauseName}
                  onChange={(e) => setClauseName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Topic..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={clauseTopic}
                  onChange={(e) => setClauseTopic(e.target.value)}
                />
                <textarea
                  placeholder="Clause text..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmCreate}>
              {activeView === 'templates' ? 'Create' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the template details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Template name..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <select
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
            >
              <option value="">Select type...</option>
              <option value="Mutual">Mutual</option>
              <option value="One-way">One-way</option>
              <option value="Visitor">Visitor</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmEdit}>
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Clause Details Dialog */}
      <Dialog open={showClauseDialog} onOpenChange={setShowClauseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
            <DialogDescription>
              {selectedItem?.topic}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="info">{selectedItem?.topic}</Badge>
              <Badge variant="risk" risk={selectedItem?.riskLevel}>{selectedItem?.riskLevel}</Badge>
              {selectedItem?.required && (
                <Badge variant="default">Required</Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Clause Text</p>
              <p className="text-sm">{selectedItem?.text}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Used in {selectedItem?.usageCount} templates
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowClauseDialog(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={() => {
              handleEditClause(selectedItem);
              setShowClauseDialog(false);
            }}>
              Edit Clause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
