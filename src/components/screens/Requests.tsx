import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../ui/AppCard';
import { Badge } from '../ui/AppBadge';
import { Button } from '../ui/AppButton';
import {
  Plus,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Calendar,
  Building,
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Inbox,
  Filter
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
import { DateRangeShortcuts } from '../ui/DateRangeShortcuts';
import { getStatusOptions, getStatusDisplayName } from '../../client/utils/statusFormatter'; // Story 10.3
import {
  listNDAs,
  updateNDAStatus,
  searchCompanies,
  searchFilterSuggestions,
  type NdaListItem,
  type NdaStatus,
  type NdaType,
  type ListNdasParams
} from '../../client/services/ndaService';
import {
  listAgencyGroups,
  listSubagencies,
  type AgencyGroup,
  type Subagency
} from '../../client/services/agencyService';
import { searchContacts, type Contact } from '../../client/services/userService';

const RECENT_FILTERS_KEY = 'ndaListRecentFilters';

// Story H-1: Sort preferences persistence
const SORT_PREFS_KEY = 'ndaListSortPreferences';

type PresetKey = ListNdasParams['preset'] | 'all';

type SortKey =
  | 'displayId'
  | 'companyName'
  | 'agency'
  | 'status'
  | 'effectiveDate'
  | 'requestedDate'
  | 'latestChange';

const SORT_KEY_TO_PARAM: Record<SortKey, string> = {
  displayId: 'displayId',
  companyName: 'companyName',
  agency: 'agencyGroupName',
  status: 'status',
  effectiveDate: 'effectiveDate',
  requestedDate: 'createdAt',
  latestChange: 'updatedAt',
};

const SORT_PARAM_TO_KEY: Record<string, SortKey> = {
  displayId: 'displayId',
  companyName: 'companyName',
  agencyGroupName: 'agency',
  status: 'status',
  effectiveDate: 'effectiveDate',
  createdAt: 'requestedDate',
  updatedAt: 'latestChange',
};

const NDA_TYPE_OPTIONS: Array<{ value: NdaType; label: string }> = [
  { value: 'MUTUAL', label: 'Mutual NDA' },
  { value: 'CONSULTANT', label: 'Consultant' },
];

interface RequestsProps {
  title?: string;
  description?: string;
  preset?: PresetKey;
  showCreateButton?: boolean;
  myDraftsOnly?: boolean;
}

interface RecentFilters {
  companyName: string[];
  companyCity: string[];
  companyState: string[];
  stateOfIncorporation: string[];
  agencyOfficeName: string[];
  opportunityPocName: string[];
  contractsPocName: string[];
  relationshipPocName: string[];
}

function loadRecentFilters(): RecentFilters {
  try {
    const raw = localStorage.getItem(RECENT_FILTERS_KEY);
    if (!raw) {
      return {
        companyName: [],
        companyCity: [],
        companyState: [],
        stateOfIncorporation: [],
        agencyOfficeName: [],
        opportunityPocName: [],
        contractsPocName: [],
        relationshipPocName: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<RecentFilters>;
    return {
      companyName: parsed.companyName ?? [],
      companyCity: parsed.companyCity ?? [],
      companyState: parsed.companyState ?? [],
      stateOfIncorporation: parsed.stateOfIncorporation ?? [],
      agencyOfficeName: parsed.agencyOfficeName ?? [],
      opportunityPocName: parsed.opportunityPocName ?? [],
      contractsPocName: parsed.contractsPocName ?? [],
      relationshipPocName: parsed.relationshipPocName ?? [],
    };
  } catch {
    return {
      companyName: [],
      companyCity: [],
      companyState: [],
      stateOfIncorporation: [],
      agencyOfficeName: [],
      opportunityPocName: [],
      contractsPocName: [],
      relationshipPocName: [],
    };
  }
}

function saveRecentFilters(filters: RecentFilters) {
  localStorage.setItem(RECENT_FILTERS_KEY, JSON.stringify(filters));
}

// Story H-1: Sort preferences persistence
interface SortPreferences {
  sortBy: SortKey;
  sortOrder: 'asc' | 'desc';
}

function loadSortPreferences(): SortPreferences {
  try {
    const raw = localStorage.getItem(SORT_PREFS_KEY);
    if (!raw) {
      return { sortBy: 'latestChange', sortOrder: 'desc' };
    }
    const parsed = JSON.parse(raw) as Partial<SortPreferences>;
    // Validate sortBy is a valid SortKey
    const validSortKeys: SortKey[] = ['displayId', 'companyName', 'agency', 'status', 'effectiveDate', 'requestedDate', 'latestChange'];
    const sortBy = validSortKeys.includes(parsed.sortBy as SortKey) ? (parsed.sortBy as SortKey) : 'latestChange';
    const sortOrder = parsed.sortOrder === 'asc' || parsed.sortOrder === 'desc' ? parsed.sortOrder : 'desc';
    return { sortBy, sortOrder };
  } catch {
    return { sortBy: 'latestChange', sortOrder: 'desc' };
  }
}

function saveSortPreferences(prefs: SortPreferences) {
  localStorage.setItem(SORT_PREFS_KEY, JSON.stringify(prefs));
}

function mergeRecentSuggestions(recent: string[], suggestions: string[]): string[] {
  const normalized = new Set<string>();
  const result: string[] = [];

  for (const value of recent) {
    const trimmed = value.trim();
    if (trimmed && !normalized.has(trimmed.toLowerCase())) {
      normalized.add(trimmed.toLowerCase());
      result.push(trimmed);
    }
  }

  for (const value of suggestions) {
    const trimmed = value.trim();
    if (trimmed && !normalized.has(trimmed.toLowerCase())) {
      normalized.add(trimmed.toLowerCase());
      result.push(trimmed);
    }
  }

  return result;
}

function highlightMatch(value: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return value;
  }
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'ig');
  const parts = value.split(regex);
  const matchLower = trimmed.toLowerCase();

  return parts.map((part, index) =>
    part.toLowerCase() === matchLower ? (
      <mark key={`${part}-${index}`} className="rounded bg-yellow-100 px-0.5 text-yellow-900">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function formatContactName(contact: Contact): string {
  const name = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim();
  return name || contact.email;
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatPersonName(firstName?: string, lastName?: string) {
  return `${firstName ?? ''} ${lastName ?? ''}`.trim();
}

export function Requests({
  title = 'Requests',
  description = 'Manage all NDA requests and agreements',
  preset = 'all',
  showCreateButton = true,
  myDraftsOnly = false,
}: RequestsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Filter state
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('search') ?? '';
  });
  // Migrate old status values from localStorage
  const [statusFilter, setStatusFilter] = useState<NdaStatus | 'all'>(() => {
    const stored = localStorage.getItem('ndaStatusFilter');
    if (stored && !['CREATED', 'PENDING_APPROVAL', 'SENT_PENDING_SIGNATURE', 'IN_REVISION', 'FULLY_EXECUTED', 'INACTIVE_CANCELED', 'EXPIRED', 'all'].includes(stored)) {
      localStorage.removeItem('ndaStatusFilter');
      return 'all';
    }
    return 'all';
  });
  const [presetFilter, setPresetFilter] = useState<PresetKey>(myDraftsOnly ? 'drafts' : preset);
  const [agencyGroupInput, setAgencyGroupInput] = useState('');
  const [agencyGroupId, setAgencyGroupId] = useState<string | undefined>(undefined);
  const [subagencyInput, setSubagencyInput] = useState('');
  const [subagencyId, setSubagencyId] = useState<string | undefined>(undefined);
  const [companyName, setCompanyName] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [stateOfIncorporation, setStateOfIncorporation] = useState('');
  const [agencyOfficeName, setAgencyOfficeName] = useState('');
  const [ndaType, setNdaType] = useState<NdaType | 'all'>('all');
  const [isNonUsMax, setIsNonUsMax] = useState<'all' | 'true' | 'false'>('all');
  const [usMaxPosition, setUsMaxPosition] = useState<'all' | 'PRIME' | 'SUB_CONTRACTOR' | 'OTHER'>('all');
  const [effectiveDateFrom, setEffectiveDateFrom] = useState('');
  const [effectiveDateTo, setEffectiveDateTo] = useState('');
  const [requestedDateFrom, setRequestedDateFrom] = useState('');
  const [requestedDateTo, setRequestedDateTo] = useState('');
  const [opportunityPocName, setOpportunityPocName] = useState('');
  const [contractsPocName, setContractsPocName] = useState('');
  const [relationshipPocName, setRelationshipPocName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const hasLoadedFiltersFromUrl = useRef(false);
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  // Data state
  const [ndas, setNdas] = useState<NdaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting state - Story H-1: Load from localStorage
  const [sortBy, setSortBy] = useState<SortKey>(() => loadSortPreferences().sortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => loadSortPreferences().sortOrder);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Reference data
  const [agencyGroups, setAgencyGroups] = useState<AgencyGroup[]>([]);
  const [subagencies, setSubagencies] = useState<Subagency[]>([]);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const [incorporationSuggestions, setIncorporationSuggestions] = useState<string[]>([]);
  const [agencyOfficeSuggestions, setAgencyOfficeSuggestions] = useState<string[]>([]);
  const [pocSuggestions, setPocSuggestions] = useState<string[]>([]);
  const [recentFilters, setRecentFilters] = useState<RecentFilters>(loadRecentFilters());

  // Confirmation dialog state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [ndaToCancel, setNdaToCancel] = useState<NdaListItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Debounce search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const highlightQuery = debouncedSearchTerm.trim();

  // Clean up deprecated status values from URL
  useEffect(() => {
    if (!hasLoadedFiltersFromUrl.current) return;
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const oldStatuses = ['EMAILED', 'INACTIVE', 'CANCELLED'];
    if (status && oldStatuses.includes(status)) {
      params.delete('status');
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('search') ?? '';
    if (query !== searchTerm) {
      setSearchTerm(query);
    }
  }, [location.search, searchTerm]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    } else {
      params.delete('search');
    }
    const nextSearch = params.toString();
    const currentSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    if (nextSearch !== currentSearch) {
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
    }
  }, [searchTerm, location.pathname, location.search, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sortByParam = params.get('sortBy');
    const sortOrderParam = params.get('sortOrder');
    const mappedKey = sortByParam ? SORT_PARAM_TO_KEY[sortByParam] : undefined;
    const mappedOrder = sortOrderParam === 'asc' || sortOrderParam === 'desc' ? sortOrderParam : undefined;

    if (mappedKey && mappedKey !== sortBy) {
      setSortBy(mappedKey);
    }
    if (mappedOrder && mappedOrder !== sortOrder) {
      setSortOrder(mappedOrder);
    }
  }, [location.search, sortBy, sortOrder]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('sortBy', SORT_KEY_TO_PARAM[sortBy]);
    params.set('sortOrder', sortOrder);
    const nextSearch = params.toString();
    const currentSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    if (nextSearch !== currentSearch) {
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
    }
  }, [sortBy, sortOrder, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (hasLoadedFiltersFromUrl.current) return;
    const params = new URLSearchParams(location.search);
    const getParam = (key: string) => params.get(key) ?? '';

    const statusParam = getParam('status');
    const statusValue = statusParam && getStatusOptions().some((option) => option.value === statusParam)
      ? (statusParam as NdaStatus)
      : 'all';

    const ndaTypeParam = getParam('ndaType');
    const ndaTypeValue =
      ndaTypeParam && NDA_TYPE_OPTIONS.some((option) => option.value === ndaTypeParam)
        ? (ndaTypeParam as NdaType)
        : 'all';

    const isNonUsMaxParam = getParam('isNonUsMax');
    const isNonUsMaxValue =
      isNonUsMaxParam === 'true' || isNonUsMaxParam === 'false' ? isNonUsMaxParam : 'all';

    const usMaxPositionParam = getParam('usMaxPosition');
    const usMaxPositionValue =
      usMaxPositionParam === 'PRIME' ||
      usMaxPositionParam === 'SUB_CONTRACTOR' ||
      usMaxPositionParam === 'OTHER'
        ? usMaxPositionParam
        : 'all';

    const presetParam = getParam('preset');
    const presetValue =
      presetParam === 'my-ndas' || presetParam === 'expiring-soon' || presetParam === 'drafts' || presetParam === 'inactive'
        ? (presetParam as PresetKey)
        : myDraftsOnly
          ? 'drafts'
          : 'all';

    setAgencyGroupInput(getParam('agencyGroup'));
    setSubagencyInput(getParam('subagency'));
    setCompanyName(getParam('companyName'));
    setCompanyCity(getParam('companyCity'));
    setCompanyState(getParam('companyState'));
    setStateOfIncorporation(getParam('stateOfIncorporation'));
    setAgencyOfficeName(getParam('agencyOfficeName'));
    setOpportunityPocName(getParam('opportunityPocName'));
    setContractsPocName(getParam('contractsPocName'));
    setRelationshipPocName(getParam('relationshipPocName'));
    setEffectiveDateFrom(getParam('effectiveDateFrom'));
    setEffectiveDateTo(getParam('effectiveDateTo'));
    setRequestedDateFrom(getParam('requestedDateFrom'));
    setRequestedDateTo(getParam('requestedDateTo'));
    setStatusFilter(statusValue);
    setNdaType(ndaTypeValue);
    setIsNonUsMax(isNonUsMaxValue as 'all' | 'true' | 'false');
    setUsMaxPosition(usMaxPositionValue as typeof usMaxPosition);
    setPresetFilter(presetValue);

    const searchParam = getParam('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }

    hasLoadedFiltersFromUrl.current = true;
    setFiltersHydrated(true);
  }, [location.search, myDraftsOnly]);

  useEffect(() => {
    if (!filtersHydrated) return;
    const params = new URLSearchParams(location.search);
    const setParam = (key: string, value?: string) => {
      if (value && value.trim()) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    };

    setParam('agencyGroup', agencyGroupInput.trim());
    setParam('subagency', subagencyInput.trim());
    setParam('companyName', companyName.trim());
    setParam('companyCity', companyCity.trim());
    setParam('companyState', companyState.trim());
    setParam('stateOfIncorporation', stateOfIncorporation.trim());
    setParam('agencyOfficeName', agencyOfficeName.trim());
    setParam('opportunityPocName', opportunityPocName.trim());
    setParam('contractsPocName', contractsPocName.trim());
    setParam('relationshipPocName', relationshipPocName.trim());
    setParam('effectiveDateFrom', effectiveDateFrom);
    setParam('effectiveDateTo', effectiveDateTo);
    setParam('requestedDateFrom', requestedDateFrom);
    setParam('requestedDateTo', requestedDateTo);

    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    } else {
      params.delete('status');
    }

    if (ndaType !== 'all') {
      params.set('ndaType', ndaType);
    } else {
      params.delete('ndaType');
    }

    if (isNonUsMax !== 'all') {
      params.set('isNonUsMax', isNonUsMax);
    } else {
      params.delete('isNonUsMax');
    }

    if (usMaxPosition !== 'all') {
      params.set('usMaxPosition', usMaxPosition);
    } else {
      params.delete('usMaxPosition');
    }

    if (presetFilter !== 'all') {
      params.set('preset', presetFilter);
    } else {
      params.delete('preset');
    }

    const nextSearch = params.toString();
    const currentSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    if (nextSearch !== currentSearch) {
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
    }
  }, [
    agencyGroupInput,
    subagencyInput,
    companyName,
    companyCity,
    companyState,
    stateOfIncorporation,
    agencyOfficeName,
    opportunityPocName,
    contractsPocName,
    relationshipPocName,
    effectiveDateFrom,
    effectiveDateTo,
    requestedDateFrom,
    requestedDateTo,
    statusFilter,
    ndaType,
    isNonUsMax,
    usMaxPosition,
    presetFilter,
    filtersHydrated,
    location.pathname,
    location.search,
    navigate,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Story H-1: Save sort preferences when they change
  useEffect(() => {
    saveSortPreferences({ sortBy, sortOrder });
  }, [sortBy, sortOrder]);

  // Load agency groups for filter typeahead
  useEffect(() => {
    listAgencyGroups()
      .then((data) => setAgencyGroups(data.agencyGroups))
      .catch(() => {
        setAgencyGroups([]);
      });
  }, []);

  // Company typeahead suggestions
  useEffect(() => {
    if (companyName.trim().length < 2) {
      setCompanySuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchCompanies(companyName.trim())
        .then((result) => {
          setCompanySuggestions(result.companies.map((c) => c.name));
        })
        .catch(() => setCompanySuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [companyName]);

  // Location/office typeahead suggestions
  useEffect(() => {
    if (companyCity.trim().length < 2) {
      setCitySuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchFilterSuggestions('companyCity', companyCity.trim())
        .then((result) => setCitySuggestions(result.values))
        .catch(() => setCitySuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [companyCity]);

  useEffect(() => {
    if (companyState.trim().length < 2) {
      setStateSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchFilterSuggestions('companyState', companyState.trim())
        .then((result) => setStateSuggestions(result.values))
        .catch(() => setStateSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [companyState]);

  useEffect(() => {
    if (stateOfIncorporation.trim().length < 2) {
      setIncorporationSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchFilterSuggestions('stateOfIncorporation', stateOfIncorporation.trim())
        .then((result) => setIncorporationSuggestions(result.values))
        .catch(() => setIncorporationSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [stateOfIncorporation]);

  useEffect(() => {
    if (agencyOfficeName.trim().length < 2) {
      setAgencyOfficeSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchFilterSuggestions('agencyOfficeName', agencyOfficeName.trim())
        .then((result) => setAgencyOfficeSuggestions(result.values))
        .catch(() => setAgencyOfficeSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [agencyOfficeName]);

  // POC typeahead suggestions
  useEffect(() => {
    const query = [opportunityPocName, contractsPocName, relationshipPocName]
      .find((value) => value.trim().length >= 2);

    if (!query) {
      setPocSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchContacts(query.trim(), 'all')
        .then((result) => {
          setPocSuggestions(result.contacts.map(formatContactName));
        })
        .catch(() => setPocSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [opportunityPocName, contractsPocName, relationshipPocName]);

  // Update agencyGroupId when typed input matches
  useEffect(() => {
    const match = agencyGroups.find(
      (group) => group.name.toLowerCase() === agencyGroupInput.trim().toLowerCase()
    );
    setAgencyGroupId(match ? match.id : undefined);
  }, [agencyGroupInput, agencyGroups]);

  useEffect(() => {
    if (!agencyGroupId) {
      setSubagencies([]);
      setSubagencyInput('');
      setSubagencyId(undefined);
      return;
    }

    listSubagencies(agencyGroupId)
      .then((data) => setSubagencies(data.subagencies))
      .catch(() => {
        setSubagencies([]);
      });
  }, [agencyGroupId]);

  useEffect(() => {
    const match = subagencies.find(
      (subagency) => subagency.name.toLowerCase() === subagencyInput.trim().toLowerCase()
    );
    setSubagencyId(match ? match.id : undefined);
  }, [subagencyInput, subagencies]);

  const companyNameOptions = useMemo(
    () => mergeRecentSuggestions(recentFilters.companyName, companySuggestions),
    [recentFilters.companyName, companySuggestions]
  );

  const companyCityOptions = useMemo(
    () => mergeRecentSuggestions(recentFilters.companyCity, citySuggestions),
    [recentFilters.companyCity, citySuggestions]
  );

  const companyStateOptions = useMemo(
    () => mergeRecentSuggestions(recentFilters.companyState, stateSuggestions),
    [recentFilters.companyState, stateSuggestions]
  );

  const incorporationOptions = useMemo(
    () => mergeRecentSuggestions(recentFilters.stateOfIncorporation, incorporationSuggestions),
    [recentFilters.stateOfIncorporation, incorporationSuggestions]
  );

  const agencyOfficeOptions = useMemo(
    () => mergeRecentSuggestions(recentFilters.agencyOfficeName, agencyOfficeSuggestions),
    [recentFilters.agencyOfficeName, agencyOfficeSuggestions]
  );

  const opportunityPocOptions = useMemo(
    () => mergeRecentSuggestions(recentFilters.opportunityPocName, pocSuggestions),
    [recentFilters.opportunityPocName, pocSuggestions]
  );

  const contractsPocOptions = useMemo(
    () => mergeRecentSuggestions(recentFilters.contractsPocName, pocSuggestions),
    [recentFilters.contractsPocName, pocSuggestions]
  );

  const relationshipPocOptions = useMemo(
    () => mergeRecentSuggestions(recentFilters.relationshipPocName, pocSuggestions),
    [recentFilters.relationshipPocName, pocSuggestions]
  );

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onClear: () => void }> = [];
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      filters.push({
        key: 'search',
        label: `Search: ${trimmedSearch}`,
        onClear: () => setSearchTerm(''),
      });
    }

    if (statusFilter !== 'all') {
      filters.push({
        key: 'status',
        label: `Status: ${getStatusDisplayName(statusFilter)}`,
        onClear: () => setStatusFilter('all'),
      });
    }

    if (!myDraftsOnly && presetFilter !== 'all') {
      const presetLabelMap: Record<string, string> = {
        'my-ndas': 'My NDAs',
        'expiring-soon': 'Expiring Soon',
        'waiting-on-third-party': 'Waiting on 3rd Party',
        'stale-no-activity': 'Stale - No Activity',
        drafts: 'Drafts',
        inactive: 'Inactive',
        'active-ndas': 'Active NDAs',
      };
      filters.push({
        key: 'preset',
        label: `Preset: ${presetLabelMap[presetFilter] ?? presetFilter}`,
        onClear: () => setPresetFilter('all'),
      });
    }

    if (agencyGroupInput.trim()) {
      filters.push({
        key: 'agencyGroup',
        label: `Agency: ${agencyGroupInput.trim()}`,
        onClear: () => setAgencyGroupInput(''),
      });
    }

    if (subagencyInput.trim()) {
      filters.push({
        key: 'subagency',
        label: `Subagency: ${subagencyInput.trim()}`,
        onClear: () => setSubagencyInput(''),
      });
    }

    if (companyName.trim()) {
      filters.push({
        key: 'companyName',
        label: `Company: ${companyName.trim()}`,
        onClear: () => setCompanyName(''),
      });
    }

    if (companyCity.trim()) {
      filters.push({
        key: 'companyCity',
        label: `City: ${companyCity.trim()}`,
        onClear: () => setCompanyCity(''),
      });
    }

    if (companyState.trim()) {
      filters.push({
        key: 'companyState',
        label: `State: ${companyState.trim()}`,
        onClear: () => setCompanyState(''),
      });
    }

    if (stateOfIncorporation.trim()) {
      filters.push({
        key: 'stateOfIncorporation',
        label: `Incorporation: ${stateOfIncorporation.trim()}`,
        onClear: () => setStateOfIncorporation(''),
      });
    }

    if (agencyOfficeName.trim()) {
      filters.push({
        key: 'agencyOfficeName',
        label: `Office: ${agencyOfficeName.trim()}`,
        onClear: () => setAgencyOfficeName(''),
      });
    }

    if (ndaType !== 'all') {
      const ndaTypeLabel = NDA_TYPE_OPTIONS.find((option) => option.value === ndaType)?.label ?? ndaType;
      filters.push({
        key: 'ndaType',
        label: `NDA Type: ${ndaTypeLabel}`,
        onClear: () => setNdaType('all'),
      });
    }

    if (isNonUsMax !== 'all') {
      filters.push({
        key: 'isNonUsMax',
        label: `Non-USmax: ${isNonUsMax === 'true' ? 'Yes' : 'No'}`,
        onClear: () => setIsNonUsMax('all'),
      });
    }

    if (usMaxPosition !== 'all') {
      const positionLabelMap: Record<string, string> = {
        PRIME: 'Prime',
        SUB_CONTRACTOR: 'Sub-contractor',
        OTHER: 'Other',
      };
      filters.push({
        key: 'usMaxPosition',
        label: `USmax Position: ${positionLabelMap[usMaxPosition] ?? usMaxPosition}`,
        onClear: () => setUsMaxPosition('all'),
      });
    }

    if (effectiveDateFrom || effectiveDateTo) {
      filters.push({
        key: 'effectiveDate',
        label: `Effective Date: ${effectiveDateFrom || 'Any'} → ${effectiveDateTo || 'Any'}`,
        onClear: () => {
          setEffectiveDateFrom('');
          setEffectiveDateTo('');
        },
      });
    }

    if (requestedDateFrom || requestedDateTo) {
      filters.push({
        key: 'requestedDate',
        label: `Requested Date: ${requestedDateFrom || 'Any'} → ${requestedDateTo || 'Any'}`,
        onClear: () => {
          setRequestedDateFrom('');
          setRequestedDateTo('');
        },
      });
    }

    if (opportunityPocName.trim()) {
      filters.push({
        key: 'opportunityPocName',
        label: `Opportunity POC: ${opportunityPocName.trim()}`,
        onClear: () => setOpportunityPocName(''),
      });
    }

    if (contractsPocName.trim()) {
      filters.push({
        key: 'contractsPocName',
        label: `Contracts POC: ${contractsPocName.trim()}`,
        onClear: () => setContractsPocName(''),
      });
    }

    if (relationshipPocName.trim()) {
      filters.push({
        key: 'relationshipPocName',
        label: `Relationship POC: ${relationshipPocName.trim()}`,
        onClear: () => setRelationshipPocName(''),
      });
    }

    return filters;
  }, [
    searchTerm,
    statusFilter,
    presetFilter,
    myDraftsOnly,
    agencyGroupInput,
    subagencyInput,
    companyName,
    companyCity,
    companyState,
    stateOfIncorporation,
    agencyOfficeName,
    ndaType,
    isNonUsMax,
    usMaxPosition,
    effectiveDateFrom,
    effectiveDateTo,
    requestedDateFrom,
    requestedDateTo,
    opportunityPocName,
    contractsPocName,
    relationshipPocName,
  ]);

  const getAriaSort = (key: SortKey) => {
    if (sortBy !== key) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortBy !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[var(--color-primary)]" />
    );
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPresetFilter(myDraftsOnly ? 'drafts' : 'all');
    setAgencyGroupInput('');
    setAgencyGroupId(undefined);
    setSubagencyInput('');
    setSubagencyId(undefined);
    setCompanyName('');
    setCompanyCity('');
    setCompanyState('');
    setStateOfIncorporation('');
    setAgencyOfficeName('');
    setNdaType('all');
    setIsNonUsMax('all');
    setUsMaxPosition('all');
    setEffectiveDateFrom('');
    setEffectiveDateTo('');
    setRequestedDateFrom('');
    setRequestedDateTo('');
    setOpportunityPocName('');
    setContractsPocName('');
    setRelationshipPocName('');
  };

  const recordRecentFilters = () => {
    const next = { ...recentFilters };

    const updateList = (field: keyof RecentFilters, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const existing = next[field].filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      next[field] = [trimmed, ...existing].slice(0, 6);
    };

    updateList('companyName', companyName);
    updateList('companyCity', companyCity);
    updateList('companyState', companyState);
    updateList('stateOfIncorporation', stateOfIncorporation);
    updateList('agencyOfficeName', agencyOfficeName);
    updateList('opportunityPocName', opportunityPocName);
    updateList('contractsPocName', contractsPocName);
    updateList('relationshipPocName', relationshipPocName);

    setRecentFilters(next);
    saveRecentFilters(next);
  };

  // Fetch NDAs whenever filters or pagination changes
  useEffect(() => {
    const fetchNDAs = async () => {
      setLoading(true);
      setError(null);
      recordRecentFilters();

      try {
        const normalizedSearch = debouncedSearchTerm.trim();
        const params: ListNdasParams = {
          page: currentPage,
          limit: pageSize,
          sortBy: SORT_KEY_TO_PARAM[sortBy],
          sortOrder,
          search: normalizedSearch.length >= 2 ? normalizedSearch : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          agencyGroupId: agencyGroupId || undefined,
          subagencyId: subagencyId || undefined,
          companyName: companyName.trim() || undefined,
          companyCity: companyCity.trim() || undefined,
          companyState: companyState.trim() || undefined,
          stateOfIncorporation: stateOfIncorporation.trim() || undefined,
          agencyOfficeName: agencyOfficeName.trim() || undefined,
          ndaType: ndaType === 'all' ? undefined : ndaType,
          isNonUsMax: isNonUsMax === 'all' ? undefined : isNonUsMax === 'true',
          usMaxPosition: usMaxPosition === 'all' ? undefined : usMaxPosition,
          effectiveDateFrom: effectiveDateFrom || undefined,
          effectiveDateTo: effectiveDateTo || undefined,
          createdDateFrom: requestedDateFrom || undefined,
          createdDateTo: requestedDateTo || undefined,
          opportunityPocName: opportunityPocName.trim() || undefined,
          contractsPocName: contractsPocName.trim() || undefined,
          relationshipPocName: relationshipPocName.trim() || undefined,
          preset: presetFilter !== 'all' ? presetFilter : undefined,
          myDrafts: myDraftsOnly ? true : undefined,
        };

        if (myDraftsOnly) {
          params.preset = 'drafts';
        }

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
  }, [
    debouncedSearchTerm,
    statusFilter,
    agencyGroupId,
    subagencyId,
    companyName,
    companyCity,
    companyState,
    stateOfIncorporation,
    agencyOfficeName,
    ndaType,
    isNonUsMax,
    effectiveDateFrom,
    effectiveDateTo,
    requestedDateFrom,
    requestedDateTo,
    opportunityPocName,
    contractsPocName,
    relationshipPocName,
    presetFilter,
    myDraftsOnly,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
  ]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    statusFilter,
    agencyGroupId,
    subagencyId,
    companyName,
    companyCity,
    companyState,
    stateOfIncorporation,
    agencyOfficeName,
    ndaType,
    isNonUsMax,
    effectiveDateFrom,
    effectiveDateTo,
    requestedDateFrom,
    requestedDateTo,
    opportunityPocName,
    contractsPocName,
    relationshipPocName,
    presetFilter,
    myDraftsOnly,
  ]);

  const handleViewNDA = (nda: NdaListItem) => {
    navigate(`/nda/${nda.id}`);
  };

  const handleEditNDA = (nda: NdaListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/request-wizard/${nda.id}`);
  };

  const handleDuplicateNDA = (nda: NdaListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/request-wizard?cloneFrom=${nda.id}`);
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
      await updateNDAStatus(ndaToCancel.id, 'INACTIVE_CANCELED', 'Cancelled by user');
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

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="mb-2">{title}</h1>
          <p className="text-[var(--color-text-secondary)]">{description}</p>
        </div>
        {showCreateButton && (
          <Button 
            variant="primary" 
            icon={<Plus className="w-5 h-5" />}
            onClick={() => navigate('/request-wizard')}
            className="w-full sm:w-auto"
          >
            Request new NDA
          </Button>
        )}
      </div>

      {/* Search Bar - Always Visible */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by company, agency, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-16 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
            {(searchTerm || loading) && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" />}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="subtle"
          icon={<Filter className="w-4 h-4" />}
          onClick={() => setShowFilters((prev) => !prev)}
          className="whitespace-nowrap"
        >
          {showFilters ? 'Hide Filters' : 'Filters'}
        </Button>
      </div>

      {debouncedSearchTerm.trim().length >= 2 && !loading && (
        <div className="mb-4 text-sm text-[var(--color-text-secondary)]">
          {totalCount} results for "{debouncedSearchTerm.trim()}"
        </div>
      )}

      {/* Collapsible Filters */}
      {showFilters && (
        <Card className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Preset</label>
              <Select
                value={presetFilter}
                onValueChange={(value) => setPresetFilter(value as PresetKey)}
                disabled={myDraftsOnly}
              >
                <SelectTrigger className="w-full" disabled={myDraftsOnly}>
                  <SelectValue placeholder="All NDAs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All NDAs</SelectItem>
                  <SelectItem value="my-ndas">My NDAs</SelectItem>
                  <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                  <SelectItem value="waiting-on-third-party">Waiting on 3rd Party</SelectItem>
                  <SelectItem value="stale-no-activity">Stale - No Activity</SelectItem>
                  <SelectItem value="drafts">Drafts</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="active-ndas">Active NDAs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Status</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as NdaStatus | 'all')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {getStatusOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Agency Group</label>
              <input
                list="agency-group-options"
                placeholder="All agencies"
                value={agencyGroupInput}
                onChange={(e) => setAgencyGroupInput(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              <datalist id="agency-group-options">
                {agencyGroups.map((group) => (
                  <option key={group.id} value={group.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Subagency</label>
              <input
                list="subagency-options"
                placeholder="All subagencies"
                value={subagencyInput}
                onChange={(e) => setSubagencyInput(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                disabled={!agencyGroupId}
              />
              <datalist id="subagency-options">
                {subagencies.map((subagency) => (
                  <option key={subagency.id} value={subagency.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center border-t border-[var(--color-border)] pt-4">
            <Button
              variant="subtle"
              icon={showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
            >
              {showAdvancedFilters ? 'Fewer Filters' : 'More Filters'}
            </Button>
          </div>

        {showAdvancedFilters && (
          <div className="border-t border-[var(--color-border)] pt-6">
            <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">Additional Filters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Company Name</label>
              <input
                list="company-name-options"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <datalist id="company-name-options">
                {companyNameOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">City</label>
              <input
                list="company-city-options"
                value={companyCity}
                onChange={(e) => setCompanyCity(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <datalist id="company-city-options">
                {companyCityOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">State</label>
              <input
                list="company-state-options"
                value={companyState}
                onChange={(e) => setCompanyState(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <datalist id="company-state-options">
                {companyStateOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">State of Incorporation</label>
              <input
                list="incorporation-options"
                value={stateOfIncorporation}
                onChange={(e) => setStateOfIncorporation(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <datalist id="incorporation-options">
                {incorporationOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Agency/Office Name</label>
              <input
                list="agency-office-options"
                value={agencyOfficeName}
                onChange={(e) => setAgencyOfficeName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <datalist id="agency-office-options">
                {agencyOfficeOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">NDA Type</label>
              <Select value={ndaType} onValueChange={(value) => setNdaType(value as NdaType | 'all')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {NDA_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Non-USmax NDA</label>
              <Select value={isNonUsMax} onValueChange={(value) => setIsNonUsMax(value as 'all' | 'true' | 'false')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">USmax Position</label>
              <Select value={usMaxPosition} onValueChange={(value) => setUsMaxPosition(value as typeof usMaxPosition)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="PRIME">Prime</SelectItem>
                  <SelectItem value="SUB_CONTRACTOR">Sub-contractor</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Effective Date From</label>
              <input
                type="date"
                value={effectiveDateFrom}
                onChange={(e) => setEffectiveDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Effective Date To</label>
              <input
                type="date"
                value={effectiveDateTo}
                onChange={(e) => setEffectiveDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
            </div>
            {/* Story H-1 Task 12: Date range shortcuts for Effective Date */}
            <div className="col-span-2">
              <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Effective Date Shortcuts</label>
              <DateRangeShortcuts
                onSelect={(from, to) => {
                  setEffectiveDateFrom(from);
                  setEffectiveDateTo(to);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Requested Date From</label>
              <input
                type="date"
                value={requestedDateFrom}
                onChange={(e) => setRequestedDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Requested Date To</label>
              <input
                type="date"
                value={requestedDateTo}
                onChange={(e) => setRequestedDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
            </div>
            {/* Story H-1 Task 12: Date range shortcuts for Requested Date */}
            <div className="col-span-2">
              <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Requested Date Shortcuts</label>
              <DateRangeShortcuts
                onSelect={(from, to) => {
                  setRequestedDateFrom(from);
                  setRequestedDateTo(to);
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Opportunity POC</label>
              <input
                list="opportunity-poc-options"
                value={opportunityPocName}
                onChange={(e) => setOpportunityPocName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <datalist id="opportunity-poc-options">
                {opportunityPocOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Contracts POC</label>
              <input
                list="contracts-poc-options"
                value={contractsPocName}
                onChange={(e) => setContractsPocName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <datalist id="contracts-poc-options">
                {contractsPocOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Relationship POC</label>
              <input
                list="relationship-poc-options"
                value={relationshipPocName}
                onChange={(e) => setRelationshipPocName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
              />
              <datalist id="relationship-poc-options">
                {relationshipPocOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex justify-end gap-2">
            <Button
              variant="subtle"
              size="sm"
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowFilters(false)}
            >
              Apply Filters
            </Button>
          </div>
          </div>
        )}
        </Card>
      )}

      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={filter.onClear}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-200"
            >
              {filter.label}
              <X className="w-3 h-3" />
            </button>
          ))}
          <Button variant="subtle" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      )}

      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {loading ? (
            'Loading...'
          ) : (
            `Showing ${ndas.length} of ${totalCount} NDAs`
          )}
        </p>
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] ml-auto">
          <span className="whitespace-nowrap">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      {/* Empty State - Story 9.12: Enhanced with context-aware messaging */}
      {!loading && !error && ndas.length === 0 && (() => {
        // Detect if any filters are active
        const hasActiveFilters = statusFilter !== 'all' || agencyGroupId || subagencyId ||
          companyName || companyCity || companyState || stateOfIncorporation ||
          agencyOfficeName || ndaType !== 'all' || isNonUsMax !== 'all' || usMaxPosition !== 'all' ||
          effectiveDateFrom || effectiveDateTo || requestedDateFrom || requestedDateTo ||
          opportunityPocName || contractsPocName || relationshipPocName || presetFilter !== 'all' ||
          searchTerm.trim().length > 0;

        return (
          <Card className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className="mb-4 flex justify-center">
                <Inbox className="w-16 h-16 text-gray-300" />
              </div>

              <h3 className="text-lg font-medium mb-2">
                {myDraftsOnly && !hasActiveFilters
                  ? 'You have no draft NDAs'
                  : hasActiveFilters
                    ? 'No NDAs match your filters'
                    : 'No NDAs yet'}
              </h3>

              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                {myDraftsOnly && !hasActiveFilters
                  ? 'Ready to create one?'
                  : hasActiveFilters
                    ? `Try adjusting your search${searchTerm.trim() ? ` for "${searchTerm.trim()}"` : ''} or clear all filters to see all NDAs`
                    : 'Create your first NDA to get started tracking agreements'
                }
              </p>

              <div className="flex gap-3 justify-center flex-wrap">
                {hasActiveFilters && (
                  <Button variant="secondary" onClick={clearAllFilters}>
                    Clear All Filters
                  </Button>
                )}
                {(showCreateButton || myDraftsOnly) && (
                  <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/request-wizard')}>
                    {myDraftsOnly
                      ? 'Request New NDA'
                      : hasActiveFilters
                        ? 'Create NDA'
                        : 'Create Your First NDA'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })()}
      
      {/* Desktop Table */}
      {!loading && !error && ndas.length > 0 && (
        <Card padding="none" className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
                    aria-sort={getAriaSort('displayId')}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('displayId')}
                      className={`inline-flex items-center gap-1 ${sortBy === 'displayId' ? 'text-[var(--color-primary)]' : ''}`}
                    >
                      Display ID
                      {renderSortIcon('displayId')}
                    </button>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
                    aria-sort={getAriaSort('companyName')}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('companyName')}
                      className={`inline-flex items-center gap-1 ${sortBy === 'companyName' ? 'text-[var(--color-primary)]' : ''}`}
                    >
                      Company
                      {renderSortIcon('companyName')}
                    </button>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
                    aria-sort={getAriaSort('agency')}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('agency')}
                      className={`inline-flex items-center gap-1 ${sortBy === 'agency' ? 'text-[var(--color-primary)]' : ''}`}
                    >
                      Agency
                      {renderSortIcon('agency')}
                    </button>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
                    aria-sort={getAriaSort('status')}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className={`inline-flex items-center gap-1 ${sortBy === 'status' ? 'text-[var(--color-primary)]' : ''}`}
                    >
                      Status
                      {renderSortIcon('status')}
                    </button>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
                    aria-sort={getAriaSort('effectiveDate')}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('effectiveDate')}
                      className={`inline-flex items-center gap-1 ${sortBy === 'effectiveDate' ? 'text-[var(--color-primary)]' : ''}`}
                    >
                      Effective Date
                      {renderSortIcon('effectiveDate')}
                    </button>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
                    aria-sort={getAriaSort('requestedDate')}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('requestedDate')}
                      className={`inline-flex items-center gap-1 ${sortBy === 'requestedDate' ? 'text-[var(--color-primary)]' : ''}`}
                    >
                      Requested Date
                      {renderSortIcon('requestedDate')}
                    </button>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
                    aria-sort={getAriaSort('latestChange')}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('latestChange')}
                      className={`inline-flex items-center gap-1 ${sortBy === 'latestChange' ? 'text-[var(--color-primary)]' : ''}`}
                    >
                      Latest Change
                      {renderSortIcon('latestChange')}
                    </button>
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
                      <p className="text-sm font-medium">{highlightMatch(String(nda.displayId), highlightQuery)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{highlightMatch(nda.companyName, highlightQuery)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm">{highlightMatch(nda.agencyGroup.name, highlightQuery)}</p>
                      {nda.subagency && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          {highlightMatch(nda.subagency.name, highlightQuery)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="status" status={nda.status}>{getStatusDisplayName(nda.status)}</Badge>
                        {nda.isDraft && (
                          <Badge variant="warning">Draft</Badge>
                        )}
                        {nda.isNonUsMax && (
                          <Badge variant="warning">Non-USmax</Badge>
                        )}
                      </div>
                      {nda.isDraft && nda.incompleteFields?.length ? (
                        <div className="text-xs text-[var(--color-text-muted)] mt-1">
                          Missing: {nda.incompleteFields.slice(0, 2).join(', ')}
                          {nda.incompleteFields.length > 2 ? ` +${nda.incompleteFields.length - 2} more` : ''}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                      {nda.effectiveDate ? new Date(nda.effectiveDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                      {new Date(nda.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {getStatusDisplayName(nda.statusHistory?.[0]?.status ?? nda.status)}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {nda.statusHistory?.[0]
                          ? (() => {
                              const latest = nda.statusHistory?.[0];
                              const name = formatPersonName(
                                latest?.changedBy?.firstName,
                                latest?.changedBy?.lastName
                              );
                              const date = formatDate(latest?.changedAt);
                              return name ? `${name} · ${date}` : date;
                            })()
                          : formatDate(nda.updatedAt)}
                      </div>
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
                          {nda.isDraft && (
                            <>
                              <DropdownMenuItem onClick={(e) => handleEditNDA(nda, e)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Continue Editing
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {!nda.isDraft && (
                            <DropdownMenuItem onClick={(e) => handleEditNDA(nda, e)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
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
                    {nda.isDraft && (
                      <>
                        <DropdownMenuItem onClick={(e) => handleEditNDA(nda, e)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Continue Editing
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {!nda.isDraft && (
                      <DropdownMenuItem onClick={(e) => handleEditNDA(nda, e)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
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
                  <span>Requested {new Date(nda.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="status" status={nda.status}>{getStatusDisplayName(nda.status)}</Badge>
                {nda.isDraft && <Badge variant="warning">Draft</Badge>}
                {nda.isNonUsMax && <Badge variant="warning">Non-USmax</Badge>}
                {nda.effectiveDate && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Effective: {new Date(nda.effectiveDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {nda.isDraft && nda.incompleteFields?.length ? (
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Missing: {nda.incompleteFields.slice(0, 2).join(', ')}
                  {nda.incompleteFields.length > 2 ? ` +${nda.incompleteFields.length - 2} more` : ''}
                </p>
              ) : null}
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

export function AllNdas() {
  return (
    <Requests
      title="All NDAs"
      description="View all NDAs you have access to"
      preset="all"
      showCreateButton
    />
  );
}

export function MyNdas() {
  return (
    <Requests
      title="My NDAs"
      description="NDAs created by you"
      preset="my-ndas"
      showCreateButton={false}
    />
  );
}

export function MyDrafts() {
  return (
    <Requests
      title="My Drafts"
      description="Draft NDAs you can continue editing"
      preset="drafts"
      showCreateButton={false}
      myDraftsOnly
    />
  );
}
