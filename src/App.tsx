import React from 'react';
import { Building2, BarChart3, Plus, X, Loader2, MoreVertical, Trash2, Edit, Save, AlertTriangle } from 'lucide-react';
import appLogo from '../Fondos_Base_de_Datos.png';
import { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import { AuthForm } from './components/AuthForm';
import { TermsPage } from './components/TermsPage';
import { StatisticsPage } from './components/StatisticsPage';
// Settings import removed as unused
import { SettingsPage } from './components/SettingsPage';
import { supabase } from './lib/supabase';
// Cut type import removed as unused
import { AlertCircle } from 'lucide-react';
import { CombinedTransaction } from './types';
import { fetchCombinedTransactionsByCutNumbers } from './services/cutsService';
import { incomeCodes, establishments } from './data/constants';

const ENTRY_ROW_COUNT = 200;
const DEFAULT_ENTRY_CUT_NUMBER = 200;
const ROW_ID_PREFIX = crypto.randomUUID();

const toFiniteNumberOrUndefined = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

type ActiveTab =
  | 'cuts'
  | 'establishments'
  | 'reports'
  | 'cutSummary'
  | 'unitReport'
  | 'rangeReport'
  | 'consolidated'
  | 'settings'
  | 'statistics'
  | 'terms';




interface CutRow {
  id: string;
  cutNumber: number;
  date: string;
  establishment: string;
  isIncome: boolean;
  code: string;
  incomeType?: string;
  amount: number;
  month: number;
  week: number;
  year: number;
  codeDescription?: string;
}

const emptyRow = (id: string, previousYear?: number, cutNumber = 0): CutRow => ({
  id,
  cutNumber,
  date: new Date().toISOString().split('T')[0],
  establishment: '',
  isIncome: false,
  code: '',
  amount: 0,
  month: new Date().getMonth() + 1,
  week: Math.ceil((new Date().getDate() + new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDay()) / 7),
  year: previousYear || new Date().getFullYear()
});

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cuts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CutRow[]>(
    () =>
      Array.from({ length: ENTRY_ROW_COUNT }, (_, index) =>
        emptyRow(`${ROW_ID_PREFIX}-${index}`, undefined, DEFAULT_ENTRY_CUT_NUMBER)
      )
  );
  const [, startTransition] = useTransition();

  
  const [savedCuts, setSavedCuts] = useState<CombinedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [codeTotals, setCodeTotals] = useState<Array<{code: string; description: string; total: number}>>([]);
  const [filteredCuts, setFilteredCuts] = useState<CombinedTransaction[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>('');
  const [establishmentSearch, setEstablishmentSearch] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  // New state for selected year in 'Establecimientos' tab
  const [selectedEstablishmentYear, setSelectedEstablishmentYear] = useState<number>(new Date().getFullYear());
  const [selectedEstablishmentType, setSelectedEstablishmentType] = useState<string>('');


  const filteredEstablishments = useMemo(() => {
    return establishments.filter(est =>
      est.toLowerCase().includes(establishmentSearch.toLowerCase())
    );
  }, [establishmentSearch]);

  const filteredCodes = useMemo(() => {
    return incomeCodes.filter(code =>
      code.code.toLowerCase().includes(codeSearch.toLowerCase()) ||
      code.description.toLowerCase().includes(codeSearch.toLowerCase())
    );
  }, [codeSearch]);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCutNumber, setSelectedCutNumber] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedReportYear, setSelectedReportYear] = useState<number>(0);
  const [startCutNumber, setStartCutNumber] = useState<number>(0);
  const [endCutNumber, setEndCutNumber] = useState<number>(0);
  const [showCutRange, setShowCutRange] = useState<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<CombinedTransaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isYearEditModalOpen, setIsYearEditModalOpen] = useState(false); // Nuevo estado para el modal de edición de año
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<number>(0);
  const [rangeEnd, setRangeEnd] = useState<number>(0);
  const [rangeResults, setRangeResults] = useState<CombinedTransaction[]>([]);
  const [selectedRangeType, setSelectedRangeType] = useState<'all' | 'incomes' | 'expenses'>('all');
  const [selectedRangeYear, setSelectedRangeYear] = useState<number>(new Date().getFullYear());
  const [selectedUnitReportYear, setSelectedUnitReportYear] = useState<number>(new Date().getFullYear());
  const [unitReportResults, setUnitReportResults] = useState<CombinedTransaction[]>([]);
  const [showUnitBreakdown, setShowUnitBreakdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchOptions, setShowSearchOptions] = useState<boolean>(false);
  const [searchOptions, setSearchOptions] = useState<{
    date: boolean;
    user: boolean;
    cutNumber: boolean;
    establishment: boolean;
    code: boolean;
    description: boolean;
    amount: boolean;
    month: boolean;
    year: boolean;
  }>({
    date: true,
    user: true,
    cutNumber: true,
    establishment: true,
    code: true,
    description: true,
    amount: true,
    month: true,
    year: true,
  });
  const [showDuplicates, setShowDuplicates] = useState<boolean>(false); // Nuevo estado para el interruptor de duplicados
  const [orderSubtotalByMonth, setOrderSubtotalByMonth] = useState<boolean>(false);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState<boolean>(false);
  const [bulkEditingRecords, setBulkEditingRecords] = useState<CombinedTransaction[]>([]);
  const incomeCodeMap = useMemo(() => {
    const m = new Map<string, string>();
    incomeCodes.forEach(ic => m.set(ic.code, ic.description));
    return m;
  }, []);
  const [showSummarizedReport, setShowSummarizedReport] = useState<boolean>(false); // Nuevo estado para la opción de resumir
  const [showSpecificCutsFilter, setShowSpecificCutsFilter] = useState<boolean>(false);
  const [specificCutNumbers, setSpecificCutNumbers] = useState<number[]>([]);
  const [specificCutInput, setSpecificCutInput] = useState<string>('');

  // Paleta de colores para duplicados
  const duplicateColorPalette = [
    'bg-blue-200', 'bg-orange-200', 'bg-amber-200', 'bg-yellow-200', 'bg-lime-200', 'bg-green-200',
    'bg-emerald-200', 'bg-teal-200', 'bg-cyan-200', 'bg-sky-200', 'bg-blue-600', 'bg-sky-300',
    'bg-violet-200', 'bg-purple-200', 'bg-fuchsia-200', 'bg-pink-200', 'bg-rose-200',
    'bg-gray-200', 'bg-slate-200', 'bg-zinc-200', 'bg-neutral-200', 'bg-stone-200',
    'bg-red-300', 'bg-orange-300', 'bg-yellow-300', 'bg-green-300', 'bg-blue-300', 'bg-purple-300', 'bg-pink-300', 'bg-cyan-300'
  ];

  // Variable para guardar los establecimientos únicos de los datos filtrados antes de resumir
  const [preSummaryEstablishments, setPreSummaryEstablishments] = useState<string[]>([]);
  // Guardar los cortes filtrados antes de resumir para el detalle mensual
  const [preSummaryCuts, setPreSummaryCuts] = useState<CombinedTransaction[]>([]);
  // Estado para saber qué códigos/tipos están expandidos
  const [expandedSummaryCodes, setExpandedSummaryCodes] = useState<string[]>([]);
  const yearEstablishmentTotals = useMemo(() => {
    const result = new Map<string, { monthly: number[]; total: number }>();
    const y = selectedYear || new Date().getFullYear();
    const cutsForYear = savedCuts.filter(c => (toFiniteNumberOrUndefined(c.year) ?? -1) === y);
    cutsForYear.forEach(c => {
      const est = c.establishment?.name || '';
      if (!est) return;
      if (!result.has(est)) {
        result.set(est, { monthly: Array(12).fill(0), total: 0 });
      }
      const entry = result.get(est)!;
      const idx = (c.month || 0) - 1;
      if (idx >= 0 && idx < 12) {
        const signed = c.is_income ? c.amount : -c.amount;
        entry.monthly[idx] += signed;
        entry.total += signed;
      }
    });
    return result;
  }, [savedCuts, selectedYear]);

  const consolidatedYears = useMemo(() => {
    const years = savedCuts
      .map(c => toFiniteNumberOrUndefined(c.year))
      .filter((y): y is number => typeof y === 'number' && y > 0);
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [savedCuts]);

  const consolidatedEstablishments = useMemo(() => {
    const y = selectedYear || new Date().getFullYear();
    const fromData = savedCuts
      .filter(c => (toFiniteNumberOrUndefined(c.year) ?? -1) === y)
      .map(c => c.establishment?.name)
      .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

    const merged = new Set<string>([...fromData, ...establishments]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b, 'es'));
  }, [savedCuts, selectedYear]);
  const cutsRowHeight = 40;
  const cutsViewportHeight = 600;
  const cutsOverscan = 10;
  const [cutsStart, setCutsStart] = useState(0);
  const cutsVisible = Math.ceil(cutsViewportHeight / cutsRowHeight) + cutsOverscan;
  const cutsContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setCutsStart(0);
  }, [filteredCuts, showSummarizedReport, activeTab]);
  const onCutsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = (e.target as HTMLDivElement).scrollTop;
    setCutsStart(Math.max(0, Math.floor(top / cutsRowHeight)));
  };
  const entryModalRowHeight = 44;
  const entryModalViewportHeight = 520;
  const entryModalOverscan = 12;
  const [entryModalStart, setEntryModalStart] = useState(0);
  const entryModalVisible = Math.ceil(entryModalViewportHeight / entryModalRowHeight) + entryModalOverscan;
  const entryModalScrollRef = useRef<HTMLDivElement | null>(null);
  const onEntryModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = (e.target as HTMLDivElement).scrollTop;
    const nextStart = Math.max(0, Math.floor(top / entryModalRowHeight));
    if (nextStart !== entryModalStart) setEntryModalStart(nextStart);
  };
  useEffect(() => {
    if (!isModalOpen && !isIncomeModalOpen) return;
    setEntryModalStart(0);
    requestAnimationFrame(() => {
      if (entryModalScrollRef.current) entryModalScrollRef.current.scrollTop = 0;
    });
  }, [isModalOpen, isIncomeModalOpen]);
  const [isPrinting, setIsPrinting] = useState(false);
  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        setShowAuthForm(false);
        fetchCuts();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'consolidated') {
      fetchCuts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'consolidated') return;
    if (consolidatedYears.length === 0) return;
    if (!consolidatedYears.includes(selectedYear)) {
      setSelectedYear(consolidatedYears[0]);
    }
  }, [activeTab, consolidatedYears, selectedYear]);

  useEffect(() => {
    const fetchRangeReportData = async () => {
      if (rangeStart > 0 && rangeEnd > 0 && rangeStart <= rangeEnd) {
        setIsLoading(true);
        const cutNumbersToFetch: number[] = [];
        for (let i = rangeStart; i <= rangeEnd; i++) {
          cutNumbersToFetch.push(i);
        }
        const fetchedData = await fetchCombinedTransactionsByCutNumbers(cutNumbersToFetch);

        let filtered = fetchedData;
        if (selectedRangeYear > 0) {
          filtered = filtered.filter(cut => {
            const cutYear = cut.year || new Date(cut.date).getFullYear();
            return cutYear === selectedRangeYear;
          });
        }
        if (selectedRangeType === 'incomes') {
          filtered = filtered.filter(cut => cut.is_income);
        } else if (selectedRangeType === 'expenses') {
          filtered = filtered.filter(cut => !cut.is_income);
        }
        setRangeResults(filtered);
        setIsLoading(false);
      } else {
        setRangeResults([]);
      }
    };
    fetchRangeReportData();
  }, [rangeStart, rangeEnd, selectedRangeType, selectedRangeYear]);

  useEffect(() => {
    const fetchUnitReportData = async () => {
      if (activeTab === 'unitReport' && selectedCutNumber > 0) {
        setIsLoading(true);
        const fetchedData = await fetchCombinedTransactionsByCutNumbers([selectedCutNumber]);
        let filtered = fetchedData;

        if (selectedUnitReportYear > 0) {
          filtered = filtered.filter(cut => {
             const cutYear = cut.year || new Date(cut.date).getFullYear();
             return cutYear === selectedUnitReportYear;
          });
        }

        if (selectedType === 'Ingresos') {
          filtered = filtered.filter(cut => cut.is_income);
        } else if (selectedType === 'Egresos') {
          filtered = filtered.filter(cut => !cut.is_income);
        }
        setUnitReportResults(filtered);
        setIsLoading(false);
      } else if (activeTab === 'unitReport' && selectedCutNumber === 0) {
          setUnitReportResults([]); // Clear results if no cut number is selected
      }
    };
    fetchUnitReportData();
  }, [activeTab, selectedCutNumber, selectedType, selectedUnitReportYear]);


  useEffect(() => {
    if (!isModalOpen && !isIncomeModalOpen) return;
    startTransition(() => {
      setRows(
        Array.from({ length: ENTRY_ROW_COUNT }, (_, index) =>
          emptyRow(`${ROW_ID_PREFIX}-${index}`, undefined, DEFAULT_ENTRY_CUT_NUMBER)
        )
      );
    });
  }, [isModalOpen, isIncomeModalOpen, startTransition]);

  const fetchCuts = async () => {
    try {
      setIsLoading(true);

      // Fetch regular cuts
      const { data: cutsData, error: cutsError } = await supabase
        .from('cuts')
        .select(`
          *,
          establishment:establishments(name),
          income_code:income_codes(description)
        `)
        .order('date', { ascending: false });

      if (cutsError) throw cutsError;

      // Fetch income entries
      const { data: incomesData, error: incomesError } = await supabase
        .from('incomes')
        .select(`
          *,
          establishment:establishments(name),
          income_type:income_types(name)
        `)
        .order('date', { ascending: false });

      if (incomesError) throw incomesError;

      // Collect all unique usuario_ids
      const allEntries = [...(cutsData || []), ...(incomesData || [])];
      const userIds = [...new Set(allEntries.map(entry => entry.usuario_id).filter(id => id))];

      // Fetch public_usernames for these userIds
      const userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('public_user')
          .select('user_id, public_username')
          .in('user_id', userIds);

        if (usersError) {
          console.error('Error fetching user data:', usersError);
          // Proceed without usernames if there's an error, or handle as needed
        } else if (usersData) {
          usersData.forEach(user => {
            userMap.set(user.user_id, user.public_username);
          });
        }
      }

      // Transform cuts data to include display_name and ensure is_income is set
      const transformedCuts: CombinedTransaction[] = (cutsData || []).map(cut => ({
        ...cut,
        display_name: cut.usuario_id ? (userMap.get(cut.usuario_id) || `${cut.usuario_id.substring(0,8)}...`) : 'Sistema',
        is_income: false, // Explicitly set for clarity, though cuts are expenses
        year: toFiniteNumberOrUndefined(cut.year) ?? new Date(cut.date).getFullYear(),
        month: toFiniteNumberOrUndefined(cut.month) ?? (new Date(cut.date).getMonth() + 1),
        week: toFiniteNumberOrUndefined(cut.week) ?? 0,
        cut_number: toFiniteNumberOrUndefined(cut.cut_number) ?? 0
      }));

      // Transform income entries to match cut format and include display_name
      const transformedIncomes: CombinedTransaction[] = (incomesData || []).map(income => ({
        ...income,
        code: 'Ingreso', // Consistent with how incomes are handled elsewhere
        income_code: { description: income.income_type?.name || 'Ingreso General' }, // Handle possible null income_type
        is_income: true,
        display_name: income.usuario_id ? (userMap.get(income.usuario_id) || `${income.usuario_id.substring(0,8)}...`) : 'Sistema',
        year: toFiniteNumberOrUndefined(income.year) ?? new Date(income.date).getFullYear(),
        month: toFiniteNumberOrUndefined(income.month) ?? (new Date(income.date).getMonth() + 1),
        week: toFiniteNumberOrUndefined(income.week) ?? 0,
        cut_number: toFiniteNumberOrUndefined(income.cut_number) ?? 0
      }));

      // Combine both datasets and sort by date, then by created_at for tie-breaking
      const allData = [...transformedCuts, ...transformedIncomes].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) {
          return dateB - dateA; // Sort by date descending
        }
        // If dates are the same, sort by created_at descending as a secondary criterion
        const createdAtA = new Date(a.created_at).getTime();
        const createdAtB = new Date(b.created_at).getTime();
        return createdAtB - createdAtA;
      });
      setSavedCuts(allData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRecord = async (record: CombinedTransaction) => {
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const handleUpdateRecord = async (updatedRecord: CombinedTransaction) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from(updatedRecord.is_income ? 'incomes' : 'cuts')
        .update({
          cut_number: updatedRecord.cut_number,
          date: updatedRecord.date,
          establishment_id: updatedRecord.establishment_id,
          amount: updatedRecord.amount,
          month: updatedRecord.month,
          week: updatedRecord.week,
          ...(updatedRecord.is_income
            ? { income_type_id: updatedRecord.income_type_id } // Ensure income_type_id is used for incomes
            : { code: updatedRecord.code }) // Ensure code is used for cuts
        })
        .eq('id', updatedRecord.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      setEditingRecord(null);
      fetchCuts();
    } catch (error) {
      console.error('Error updating record:', error);
      setError(`Error al actualizar el ${updatedRecord.is_income ? 'ingreso' : 'corte'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCut = async (cutId: string, isIncome: boolean) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from(isIncome ? 'incomes' : 'cuts')
        .delete()
        .eq('id', cutId);

      if (error) throw error;
      fetchCuts();
    } catch (error) {
      console.error('Error deleting record:', error);
      setError(`Error al eliminar el ${isIncome ? 'ingreso' : 'corte'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setIsLoading(true);
      const incomeIds = selectedRecords.filter(id => {
        const record = savedCuts.find(r => r.id === id);
        return record?.is_income;
      });
      const cutIds = selectedRecords.filter(id => {
        const record = savedCuts.find(r => r.id === id);
        return !record?.is_income;
      });

      if (incomeIds.length > 0) {
        const { error: incomeError } = await supabase
          .from('incomes')
          .delete()
          .in('id', incomeIds);
        if (incomeError) throw incomeError;
      }

      if (cutIds.length > 0) {
        const { error: cutError } = await supabase
          .from('cuts')
          .delete()
          .in('id', cutIds);
        if (cutError) throw cutError;
      }

      setIsBulkDeleteModalOpen(false);
      setSelectedRecords([]);
      setIsSelectionMode(false);
      fetchCuts();
    } catch (error) {
      console.error('Error bulk deleting records:', error);
      setError('Error al eliminar los registros seleccionados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdate = async (updatedRecords: CombinedTransaction[]) => {
    try {
      setIsLoading(true);
      for (const record of updatedRecords) {
        const { error } = await supabase
          .from(record.is_income ? 'incomes' : 'cuts')
          .update({
            cut_number: record.cut_number,
            date: record.date,
            establishment_id: record.establishment_id,
            amount: record.amount,
            month: record.month,
            week: record.week,
            year: record.year,
            ...(record.is_income
              ? { income_type_id: record.income_type_id }
              : { code: record.code })
          })
          .eq('id', record.id);
        if (error) throw error;
      }
      setIsBulkEditModalOpen(false);
      setBulkEditingRecords([]);
      setSelectedRecords([]);
      setIsSelectionMode(false);
      fetchCuts();
    } catch (error) {
      console.error('Error bulk updating records:', error);
      setError('Error al actualizar los registros seleccionados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelection = (id: string) => {
    setSelectedRecords(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const toggleRow = (establishment: string) => {
    setExpandedRows(prev =>
      prev.includes(establishment)
        ? prev.filter(e => e !== establishment)
        : [...prev, establishment]
    );
  };

  useEffect(() => {
    const applyFiltersAndFetch = async () => {
        setIsLoading(true);
        let dataToFilter: CombinedTransaction[] = [];

        // Handle "Cortes Especificos" filter first if active
        if (activeTab === 'reports' && showSpecificCutsFilter && specificCutNumbers.length > 0) {
            dataToFilter = await fetchCombinedTransactionsByCutNumbers(specificCutNumbers);
        } else if (activeTab === 'reports' && (selectedCutNumber > 0 || (showCutRange && startCutNumber > 0 && endCutNumber > 0))) {
            const cutNumbersToFetch: number[] = [];
            if (selectedCutNumber > 0) {
                cutNumbersToFetch.push(selectedCutNumber);
            } else if (showCutRange && startCutNumber > 0 && endCutNumber > 0) {
                for (let i = startCutNumber; i <= endCutNumber; i++) {
                    cutNumbersToFetch.push(i);
                }
            }
            if (cutNumbersToFetch.length > 0) {
                dataToFilter = await fetchCombinedTransactionsByCutNumbers(cutNumbersToFetch);
            } else {
                dataToFilter = [...savedCuts]; // If no specific cut/range, use all savedCuts
            }
        } else {
            dataToFilter = [...savedCuts]; // For other tabs or no specific cut/range in reports, use all savedCuts
        }

        let filtered = [...dataToFilter];

        // Aplicar filtro de establecimiento si está seleccionado, antes de cualquier otra lógica de filtrado/resumen
        if (selectedEstablishment) {
            filtered = filtered.filter(cut => cut.establishment?.name === selectedEstablishment);
        }

        // Guardar los cortes filtrados antes de resumir (¡antes de cualquier resumen o modificación!)
        setPreSummaryCuts([...filtered]);

        // Guardar los establecimientos únicos antes de resumir
        setPreSummaryEstablishments(
          Array.from(new Set(filtered.map(cut => cut.establishment?.name).filter((name): name is string => typeof name === 'string' && !!name)))
        );

        // Apply search query filter
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(cut => {
                const dateMatch = searchOptions.date && new Date(cut.date).toLocaleDateString().toLowerCase().includes(lowerCaseQuery);
                const userMatch = searchOptions.user && cut.display_name?.toLowerCase().includes(lowerCaseQuery);
                const cutNumberMatch = searchOptions.cutNumber && cut.cut_number?.toString().includes(lowerCaseQuery);
                const establishmentMatch = searchOptions.establishment && cut.establishment?.name?.toLowerCase().includes(lowerCaseQuery);
                const codeMatch = searchOptions.code && (cut.is_income ? 'ingreso'.includes(lowerCaseQuery) : cut.code?.toLowerCase().includes(lowerCaseQuery));
                const descriptionMatch = searchOptions.description && (cut.is_income ? cut.income_code?.description?.toLowerCase().includes(lowerCaseQuery) : (incomeCodeMap.get(cut.code)?.toLowerCase()?.includes(lowerCaseQuery)));
                const amountMatch = searchOptions.amount && cut.amount.toLocaleString('es-HN').toLowerCase().includes(lowerCaseQuery);
                const monthMatch = searchOptions.month && cut.month?.toString().includes(lowerCaseQuery);
                const yearMatch = searchOptions.year && cut.year?.toString().includes(lowerCaseQuery);

                return dateMatch || userMatch || cutNumberMatch || establishmentMatch || codeMatch || descriptionMatch || amountMatch || monthMatch || yearMatch;
            });
        }

        // Apply type filter first
        if (selectedType) {
            filtered = selectedType === 'Ingresos' ?
                filtered.filter(cut => cut.is_income) :
                filtered.filter(cut => !cut.is_income);
        }

        // Apply other filters only if not fetching by specific cut number/range (already handled by fetchCombinedTransactionsByCutNumbers)
        // These filters should apply to the data fetched from savedCuts or the specific cut numbers.
        if (selectedMonth > 0) {
            filtered = filtered.filter(cut => cut.month === selectedMonth);
        }

        if (selectedCode) {
            filtered = filtered.filter(cut => cut.code === selectedCode);
        }

        // Apply year filter for reports tab
        if (activeTab === 'reports' && selectedReportYear > 0) {
            filtered = filtered.filter(cut => cut.year === selectedReportYear);
        }

        // Duplicate detection and marking (applies to individual transactions before summarization)
        if (showDuplicates) {
            const assignedColors = new Map<string, string>(); // key: cut ID, value: color class
            let colorIndex = 0;

            // Step 1: Identify duplicates by code/description and assign colors
            const cutsByCode: { [key: string]: CombinedTransaction[] } = {};
            filtered.forEach(cut => { // Use 'filtered' here, not 'dataToFilter'
                const codeKey = cut.is_income ? (cut.income_code?.description || 'Ingreso') : cut.code;
                if (codeKey) {
                    if (!cutsByCode[codeKey]) {
                        cutsByCode[codeKey] = [];
                    }
                    cutsByCode[codeKey].push(cut);
                }
            });

            Object.values(cutsByCode).forEach(cuts => {
                if (cuts.length > 1) {
                    const colorClass = duplicateColorPalette[colorIndex % duplicateColorPalette.length];
                    cuts.forEach(cut => {
                        assignedColors.set(cut.id, colorClass);
                    });
                    colorIndex++;
                }
            });

            // Step 2: Identify duplicates by amount and assign colors (if not already colored by code)
            const cutsByAmount: { [key: string]: CombinedTransaction[] } = {};
            filtered.forEach(cut => { // Use 'filtered' here
                if (cut.amount !== undefined && cut.amount !== null) {
                    if (!cutsByAmount[cut.amount]) {
                        cutsByAmount[cut.amount] = [];
                    }
                    cutsByAmount[cut.amount].push(cut);
                }
            });

            Object.values(cutsByAmount).forEach(cuts => {
                if (cuts.length > 1) {
                    const colorClass = duplicateColorPalette[colorIndex % duplicateColorPalette.length];
                    cuts.forEach(cut => {
                        // Assign color only if not already assigned by code
                        if (!assignedColors.has(cut.id)) {
                            assignedColors.set(cut.id, colorClass);
                        }
                    });
                    // Only increment colorIndex if a new group of duplicates by amount is found and colored
                    const newColorAssigned = cuts.some(cut => assignedColors.get(cut.id) === colorClass);
                    if (newColorAssigned) {
                        colorIndex++;
                    }
                }
            });

            // Step 3: Apply the assigned colors to the filtered cuts
            filtered = filtered.map(cut => ({
                ...cut,
                duplicateHighlightClass: assignedColors.get(cut.id) || ''
            }));

        } else {
            // If showDuplicates is false, ensure duplicateHighlightClass is not set
            filtered = filtered.map(cut => ({
                ...cut,
                duplicateHighlightClass: ''
            }));
        }

        // Summarization logic
        if (showSummarizedReport && activeTab === 'reports') {
            const summarizedMap = new Map<string, CombinedTransaction>();

            filtered.forEach(cut => {
                let key: string;
                let description: string;
                let code: string;

                if (cut.is_income) {
                    key = `income-${cut.income_code?.description || 'Ingreso General'}`;
                    description = cut.income_code?.description || 'Ingreso General';
                    code = 'Ingreso';
                } else {
                    key = `expense-${cut.code || 'Desconocido'}`;
                    description = incomeCodes.find(ic => ic.code === cut.code)?.description || 'Desconocido';
                    code = cut.code || 'Desconocido';
                }

                if (!summarizedMap.has(key)) {
                    summarizedMap.set(key, {
                        ...cut, // Keep original cut as a base for other fields not being summarized (like establishment, date if needed)
                        id: key, // Unique ID for summarized row
                        cut_number: 0, // Not applicable for summarized row
                        date: '', // Not applicable for summarized row
                        establishment: { name: selectedEstablishment || 'Varios' }, // Use selectedEstablishment or 'Varios'
                        establishment_id: '', // Not applicable
                        income_type: undefined, // Not applicable
                        income_type_id: '', // Not applicable
                        usuario_id: undefined, // Not applicable
                        display_name: selectedEstablishment ? selectedEstablishment : 'Resumen', // Use selectedEstablishment or 'Resumen'
                        code: code,
                        income_code: cut.is_income ? { description: description } : undefined,
                        amount: 0, // Will be accumulated
                        month: 0, // Not applicable
                        week: 0, // Not applicable
                        year: 0, // Not applicable
                        duplicateHighlightClass: '' // No highlighting for summarized rows
                    });
                }
                const currentSummary = summarizedMap.get(key)!;
                currentSummary.amount += cut.amount;
            });
            filtered = Array.from(summarizedMap.values());
            // Sort summarized data by description or code for better readability
            filtered.sort((a: CombinedTransaction, b: CombinedTransaction) => {
                // Sort by code in ascending order
                return (a.code || '').localeCompare(b.code || '');
            });
        }

        // Sort by cut_number if range filter is active AND not summarized
        if (showCutRange && startCutNumber > 0 && endCutNumber > 0 && !showSummarizedReport) {
            filtered.sort((a: CombinedTransaction, b: CombinedTransaction) => (a.cut_number || 0) - (b.cut_number || 0));
        }

        // Optional ordering by month for reports (non-summarized)
        if (activeTab === 'reports' && !showSummarizedReport && orderSubtotalByMonth) {
            filtered.sort((a: CombinedTransaction, b: CombinedTransaction) => {
                const am = a.month || 0;
                const bm = b.month || 0;
                if (am !== bm) return am - bm;
                const ad = new Date(a.date).getTime();
                const bd = new Date(b.date).getTime();
                return ad - bd;
            });
        }

        setFilteredCuts(filtered);
        setIsLoading(false);
    };

    applyFiltersAndFetch();
  }, [savedCuts, activeTab, selectedEstablishment, selectedMonth, selectedCode, selectedCutNumber, selectedType, startCutNumber, endCutNumber, showCutRange, searchQuery, showDuplicates, selectedReportYear, showSummarizedReport, specificCutNumbers, showSpecificCutsFilter]);

  const handleRemoveRow = (id: string) => {
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const handleRowChange = (id: string, field: keyof CutRow, value: string | number | boolean) => {
    const updater = (prev: CutRow[]) => {
      // Find the index of the changed row
      const changedRowIndex = prev.findIndex(row => row.id === id);

      if (changedRowIndex === -1) return prev;

      // If the changed field is cutNumber
      if (field === 'cutNumber') {
        return prev.map((row, index) => {
          // Update the current row and all rows below it
          if (index >= changedRowIndex) {
            return { ...row, cutNumber: value as number };
          }
          return row;
        });
      }

      // If the changed field is establishment
      if (field === 'establishment') {
        return prev.map((row, index) => {
          // Update the current row and all rows below it
          if (index >= changedRowIndex) {
            return { ...row, establishment: value as string };
          }
          return row;
        });
      }

      // If the changed field is month
      if (field === 'month') {
        return prev.map((row, index) => {
          // Update the current row and all rows below it
          if (index >= changedRowIndex) {
            return { ...row, month: value as number };
          }
          return row;
        });
      }

      // If the changed field is year
      if (field === 'year') {
        return prev.map((row, index) => {
          // Update the current row and all rows below it
          if (index >= changedRowIndex) {
            return { ...row, year: value as number };
          }
          return row;
        });
      }

      // For other fields, just update the specific row
      return prev.map(row => {
        if (row.id === id) {
          return { ...row, [field]: value };
        }
        return row;
      });
    };
    if (field === 'cutNumber' || field === 'establishment' || field === 'month' || field === 'year') {
      startTransition(() => setRows(updater));
    } else {
      setRows(updater);
    }
  };

  const rowsTotal = useMemo(() => rows.reduce((sum, row) => sum + (row.amount || 0), 0), [rows]);

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, fieldIndex: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();

    const formId = isModalOpen ? 'nuevo-corte-form' : isIncomeModalOpen ? 'nuevo-ingreso-form' : '';
    if (!formId) return;

    const fieldNames = isModalOpen
      ? (['date', 'cutNumber', 'establishment', 'code', 'amount', 'year', 'month', 'week'] as const)
      : (['date', 'cutNumber', 'establishment', 'incomeType', 'amount', 'year', 'month', 'week'] as const);

    const focusCell = (targetRow: number, targetFieldIndex: number) => {
      const field = fieldNames[targetFieldIndex] || fieldNames[0];
      const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(
        `#${formId} [data-row="${targetRow}"][data-field="${field}"]`
      );
      el?.focus();
    };

    const ensureRowVisible = (targetRow: number, targetFieldIndex: number) => {
      if (targetRow < entryModalStart || targetRow >= entryModalStart + entryModalVisible) {
        if (entryModalScrollRef.current) {
          entryModalScrollRef.current.scrollTop = targetRow * entryModalRowHeight;
        } else {
          const maxStart = Math.max(0, rows.length - entryModalVisible);
          setEntryModalStart(Math.min(maxStart, Math.max(0, targetRow)));
        }
        requestAnimationFrame(() => focusCell(targetRow, targetFieldIndex));
        return;
      }
      focusCell(targetRow, targetFieldIndex);
    };

    const maxRow = rows.length - 1;
    if (maxRow < 0) return;

    switch (e.key) {
      case 'ArrowDown': {
        const targetRow = rowIndex >= maxRow ? 0 : rowIndex + 1;
        ensureRowVisible(targetRow, fieldIndex);
        break;
      }
      case 'ArrowUp': {
        const targetRow = rowIndex <= 0 ? maxRow : rowIndex - 1;
        ensureRowVisible(targetRow, fieldIndex);
        break;
      }
      case 'ArrowRight': {
        if (fieldIndex < fieldNames.length - 1) {
          focusCell(rowIndex, fieldIndex + 1);
        } else {
          const targetRow = rowIndex >= maxRow ? 0 : rowIndex + 1;
          const targetField = 0;
          ensureRowVisible(targetRow, targetField);
        }
        break;
      }
      case 'ArrowLeft': {
        if (fieldIndex > 0) {
          focusCell(rowIndex, fieldIndex - 1);
        } else {
          const targetRow = rowIndex <= 0 ? maxRow : rowIndex - 1;
          const targetField = fieldNames.length - 1;
          ensureRowVisible(targetRow, targetField);
        }
        break;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Debe iniciar sesión para guardar cortes.');
      return;
    }

    // Filter out rows with empty required fields
    const validRows = rows.filter(row =>
      row.cutNumber !== 0 &&
      row.establishment !== '' &&
      ((row.isIncome && row.incomeType) || (!row.isIncome && row.code)) &&
      row.amount !== 0
    );

    try {
      // First, get the establishment IDs
      const { data: establishments } = await supabase
        .from('establishments')
        .select('id, name')
        .in('name', validRows.map(row => row.establishment));

      if (!establishments) {
        throw new Error('No se pudieron obtener los establecimientos');
      }

      // Create a map of establishment names to IDs
      const establishmentMap = new Map(
        establishments.map(e => [e.name, e.id])
      );

      // Separate income and expense rows
      const incomeRows = validRows.filter(row => row.isIncome);
      const expenseRows = validRows.filter(row => !row.isIncome);

      // Get income types for income rows
      if (incomeRows.length > 0) {
        const { data: incomeTypes } = await supabase
          .from('income_types')
          .select('id, name')
          .in('name', incomeRows.map(row => row.incomeType));

        if (!incomeTypes) {
          throw new Error('No se pudieron obtener los tipos de ingreso');
        }

        const incomeTypeMap = new Map(
          incomeTypes.map(type => [type.name, type.id])
        );

        // Prepare and insert income records
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        const incomesToInsert = incomeRows.map(row => ({
          cut_number: row.cutNumber,
          date: row.date,
          establishment_id: establishmentMap.get(row.establishment),
          income_type_id: incomeTypeMap.get(row.incomeType),
          amount: row.amount,
          month: row.month,
          week: row.week,
          year: row.year,
          usuario_id: userId
        }));

        const { error: incomeError } = await supabase
          .from('incomes')
          .insert(incomesToInsert);

        if (incomeError) throw incomeError;
      }

      // Prepare and insert expense records (cuts)
      if (expenseRows.length > 0) {
        const { data: { user } = {} } = await supabase.auth.getUser(); // Ensure user is fetched if not already
        const userId = user?.id;

        const cutsToInsert = expenseRows.map(row => ({
          cut_number: row.cutNumber,
          date: row.date,
          establishment_id: establishmentMap.get(row.establishment),
          code: row.code,
          amount: row.amount,
          month: row.month,
          week: row.week,
          year: row.year,
          usuario_id: userId
        }));

        const { error: cutError } = await supabase
          .from('cuts')
          .insert(cutsToInsert);

        if (cutError) throw cutError;
      }

      setIsModalOpen(false);
      setIsIncomeModalOpen(false);
      startTransition(() => {
        fetchCuts();
      });
    } catch (error) {
      console.error('Error al guardar los registros:', error);
      alert('Error al guardar los registros. Por favor, intente nuevamente.');
    }
  };


  if (showAuthForm || !isAuthenticated) {
    return <AuthForm onSuccess={() => setShowAuthForm(false)} />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-header">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer group" onClick={() => { setIsSideMenuOpen(true); }}>
              <img src={appLogo} alt="Fondos Base de Datos" className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110" />
              <h1 className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-600">Fondos Base de Datos</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('settings')}
                className="glass-button-secondary px-4 py-2 text-sm font-medium rounded-xl"
              >
                Configuración
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-500/90 hover:bg-red-600 text-white px-4 py-2 text-sm font-medium rounded-xl shadow-lg shadow-red-500/30 backdrop-blur-sm transition-all duration-200 hover:shadow-red-500/50 hover:-translate-y-0.5"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Side Menu */}
      <div className={`fixed inset-0 z-50 ${isSideMenuOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isSideMenuOpen}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity duration-300 ${isSideMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsSideMenuOpen(false)}
        />
        {/* Panel */}
        <div
          className={`absolute top-0 left-0 h-screen w-72 bg-white/90 backdrop-blur-xl shadow-2xl border-r border-white/20 transform transition-transform duration-300 ${isSideMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center">
              <img src={appLogo} alt="Fondos Base de Datos" className="h-8 w-8 object-contain" />
              <span className="ml-3 font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-600">Menú</span>
            </div>
            <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setIsSideMenuOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            {[
              { id: 'cuts', label: 'Home' },
              { id: 'cuts', label: 'Cortes' },
              { id: 'statistics', label: 'Estadísticas' },
              { id: 'unitReport', label: 'Recibos' },
              { id: 'settings', label: 'Configuración' },
              { id: 'terms', label: 'Términos y Condiciones' }
            ].map((item, index) => (
              <button
                key={index}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-sky-50 hover:text-sky-600 transition-all duration-200 font-medium text-gray-700"
                onClick={() => { setActiveTab(item.id as ActiveTab); setIsSideMenuOpen(false); }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`bg-white/60 backdrop-blur-md border-b border-white/20 sticky top-16 z-30 transition-all duration-300`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'cuts', label: 'Cortes' },
              { id: 'establishments', label: 'Establecimientos' },
              { id: 'reports', label: 'Reportes' },
              { id: 'consolidated', label: 'Consolidado' },
              { id: 'cutSummary', label: 'Resumen de Cortes' },
              { id: 'unitReport', label: 'Reporte Unitario' },
              { id: 'rangeReport', label: 'Reporte de Rango Conjunto' },
              { id: 'statistics', label: 'Estadísticas' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`relative px-3 py-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-sky-600'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-sky-500 to-blue-500 rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-6 sm:px-6 lg:px-8">
        {activeTab === 'statistics' && <StatisticsPage data={savedCuts} />}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'terms' && <TermsPage />}
        {activeTab === 'unitReport' && (
          <div className="space-y-6">
            <div className="flex gap-4 mb-6">
              <div>
                <label htmlFor="cut-number-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Corte
                </label>
                <input
                  type="number"
                  id="cut-number-filter"
                  value={selectedCutNumber || ''}
                  onChange={(e) => setSelectedCutNumber(parseInt(e.target.value) || 0)}
                  className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                  min="0"
                />
              </div>

              <div>
                <label htmlFor="unit-year-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Año
                </label>
                <select
                  id="unit-year-filter"
                  value={selectedUnitReportYear}
                  onChange={(e) => setSelectedUnitReportYear(Number(e.target.value))}
                  className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                >
                  {consolidatedYears.length > 0 ? (
                    consolidatedYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))
                  ) : (
                    <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  id="type-filter"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                >
                  <option value="">Todos</option>
                  <option value="Ingresos">Ingresos</option>
                  <option value="Egresos">Egresos</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showUnitBreakdown}
                    onChange={() => setShowUnitBreakdown(v => !v)}
                    className="mr-2"
                  />
                  Deslozar total
                </label>
              </div>

              {selectedCutNumber > 0 && (
                <div className="ml-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Establecimiento
                  </label>
                  <div className="text-sm text-gray-900 py-2">
                    {(() => {
                      const establishmentCounts: Record<string, number> = unitReportResults
                        .filter(cut => cut.cut_number === selectedCutNumber)
                        .reduce((acc: Record<string, number>, cut) => {
                          if (cut.establishment?.name) {
                            acc[cut.establishment.name] = (acc[cut.establishment.name] || 0) + 1;
                          }
                          return acc;
                        }, {});

                      const mostUsed: [string, number] | undefined = Object.entries(establishmentCounts)
                        .sort((a, b) => b[1] - a[1])[0];
                      return mostUsed ? mostUsed[0] : 'No hay datos';
                    })()}
                  </div>
                </div>
              )}
            </div>

            {selectedCutNumber > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.values(
                      unitReportResults
                        .filter(cut => cut.cut_number === selectedCutNumber)
                        .reduce((acc: { [key: string]: { code: string; description: string; total: number } }, cut) => {
                          if (cut.is_income) {
                            const key = cut.income_code?.description;
                            if (!key) return acc;
                            if (!acc[key]) {
                              acc[key] = {
                                code: 'Ingreso',
                                description: key,
                                total: 0
                              };
                            }
                            acc[key].total += cut.amount;
                          } else {
                            const key = cut.code;
                            const description = incomeCodes.find(ic => ic.code === cut.code)?.description;
                            if (!key) return acc;
                            if (!acc[key]) {
                              acc[key] = {
                                code: key || '', // Handle undefined code
                                description: description || '',
                                total: 0
                              };
                            }
                            acc[key].total += cut.amount;
                          }
                          return acc;
                        }, {})
                    ).map(total => (
                      <tr key={`${total.code}-${total.description}`}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{total.code}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{total.description}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {total.total.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900" colSpan={2}>Total General</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                        {unitReportResults
                          .filter(cut => cut.cut_number === selectedCutNumber)
                          .reduce((sum, cut) => sum + (cut.is_income ? cut.amount : -cut.amount), 0)
                          .toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                      </td>
                    </tr>
                    {showUnitBreakdown && (
                      <>
                        <tr>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-600" colSpan={2}>Total Ingresos</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                            {unitReportResults
                              .filter(cut => cut.cut_number === selectedCutNumber && cut.is_income)
                              .reduce((sum, cut) => sum + cut.amount, 0)
                              .toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-600" colSpan={2}>Total Egresos</td>
                          <td className="px-3 py-1 whitespace-nowrap text-xs text-gray-900 text-right">
                            {unitReportResults
                              .filter(cut => cut.cut_number === selectedCutNumber && !cut.is_income)
                              .reduce((sum, cut) => sum + cut.amount, 0)
                              .toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!selectedCutNumber && (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Seleccione un número de corte</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Ingrese un número de corte para ver el reporte detallado.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cutSummary' && (
          <div className="glass-panel overflow-hidden sm:rounded-xl">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Resumen de Cortes</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Lista consolidada de números de corte</p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {Array.from(new Set(savedCuts.map(cut => cut.cut_number))).sort((a, b) => (a || 0) - (b || 0)).map(cutNumber => {
                  const cutsWithNumber = savedCuts.filter(cut => cut.cut_number === cutNumber);
                  const totalAmount = cutsWithNumber.reduce((sum, cut) => sum + (cut.is_income ? cut.amount : -cut.amount), 0);
                  const isExpanded = expandedRows.includes(String(cutNumber));

                  return (
                    <li key={cutNumber} className="p-4">
                      <div className="flex justify-between items-center">
                        <div
                          onClick={() => toggleRow(String(cutNumber))}
                          className="cursor-pointer flex-grow"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-semibold">Corte #{cutNumber}</h4>
                              <p className="text-sm text-gray-500">
                                {cutsWithNumber.length} registros | Total: 
                                <span className={totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  L. {totalAmount.toLocaleString()}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`¿Está seguro que desea eliminar todos los registros del corte #${cutNumber}?`)) {
                                    cutsWithNumber.forEach(cut => handleDeleteCut(cut.id, !!cut.is_income));
                                  }
                                }}
                                className="px-3 py-1 text-sm text-red-600 hover:text-red-900 border border-red-600 rounded hover:bg-red-50"
                              >
                                Eliminar Corte
                              </button>
                              <button className="text-sky-600 hover:text-sky-900">
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Establecimiento</th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {cutsWithNumber.map(cut => (
                                <tr key={`${cut.establishment?.name}-${cut.id}`}>
                                  <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">{new Date(cut.date).toLocaleDateString()}</td>
                                  <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">{cut.establishment?.name}</td>
                                  <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">{cut.code}</td>
                                  <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">L. {cut.amount.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                              <tr>
                                <td colSpan={3} className="px-3 py-2 text-right text-sm font-bold text-gray-800 uppercase tracking-wider">Total del Corte:</td>
                                <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                                  L {cutsWithNumber.reduce((acc, cut) => acc + (cut.is_income ? cut.amount : -cut.amount), 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Placeholder content - we'll implement these components next */}
        {activeTab === 'cuts' && (
          <div className="flex gap-2 mb-4 relative items-center">
            <button
              onClick={() => {
                setIsIncomeModalOpen(true);
                setIsModalOpen(false); // Asegura que el modal de egreso se cierre
              }}
              className="flex items-center gap-2 border-2 border-emerald-500 text-emerald-600 bg-transparent px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              <Plus size={20} />
              Ingreso
            </button>
            <button
              onClick={() => {
                setIsModalOpen(true);
                setIsIncomeModalOpen(false); // Asegura que el modal de ingreso se cierre
              }}
              className="flex items-center gap-2 border-2 border-rose-500 text-rose-600 bg-transparent px-4 py-2 rounded-xl hover:bg-rose-50 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              <Plus size={20} />
              Egreso
            </button>
            <input
              type="text"
              placeholder="Buscar cortes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ml-4 flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
            <div className="relative">
              <button
                onClick={() => setShowSearchOptions(!showSearchOptions)}
                className="ml-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              >
                Opciones
              </button>
              {showSearchOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                  <div className="py-1">
                    {Object.entries(searchOptions).map(([key, value]) => (
                      <label key={key} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => setSearchOptions(prev => ({ ...prev, [key as keyof typeof prev]: !prev[key as keyof typeof prev] }))}
                          className="form-checkbox h-4 w-4 text-sky-600 transition duration-150 ease-in-out"
                        />
                        <span className="ml-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal */}
        {isModalOpen &&
          (() => {
            const totalRows = rows.length;
            const start = entryModalStart;
            const end = Math.min(totalRows, start + entryModalVisible);
            const topPad = start * entryModalRowHeight;
            const bottomPad = (totalRows - end) * entryModalRowHeight;
            const windowRows = rows.slice(start, end);
            return (
              <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white/95 rounded-2xl shadow-2xl border border-white/20 w-full max-w-6xl max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Nuevo Corte</h2>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        form="nuevo-corte-form" // Add form attribute to link button to form
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                        title="Se guardarán solo las filas con Corte, Establecimiento, Código y Monto completos"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="sticky top-0 z-10 bg-white px-6 py-2 border border-black text-sm font-bold text-gray-700">
                    Total: {rowsTotal.toLocaleString('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  
                  <form id="nuevo-corte-form" onSubmit={handleSubmit} className="p-6 flex-1 min-h-0 flex flex-col">
                    <div
                      ref={entryModalScrollRef}
                      onScroll={onEntryModalScroll}
                      className="flex-1 min-h-0 overflow-auto overscroll-contain"
                    >
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fecha
                            </th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Corte
                            </th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Establecimiento
                            </th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Código
                            </th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Monto
                            </th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Año
                            </th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mes
                            </th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Semana
                            </th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {topPad > 0 && (
                            <tr key="top-pad" style={{ height: topPad }}>
                              <td colSpan={9}></td>
                            </tr>
                          )}
                          {windowRows.map((row, index) => {
                            const absIndex = start + index;
                            return (
                            <tr key={row.id}>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <input
                                  type="date"
                                  value={row.date}
                                  onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, absIndex, 0)}
                                  data-row={absIndex}
                                  data-field="date"
                                  className="block w-full px-2 py-1 text-sm border rounded-md focus:ring-sky-500 focus:border-sky-500"
                                />
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <input
                                  type="number"
                                  value={row.cutNumber}
                                  onChange={(e) => handleRowChange(row.id, 'cutNumber', parseInt(e.target.value) || 0)}
                                  onKeyDown={(e) => handleKeyDown(e, absIndex, 1)}
                                  data-row={absIndex}
                                  data-field="cutNumber"
                                  className="block w-20 px-2 py-1 text-sm border rounded-md focus:ring-sky-500 focus:border-sky-500"
                                />
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <select
                                  value={row.establishment}
                                  onChange={(e) => handleRowChange(row.id, 'establishment', e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, absIndex, 2)}
                                  data-row={absIndex}
                                  data-field="establishment"
                                  className="block w-full px-2 py-1 text-sm border rounded-md focus:ring-sky-500 focus:border-sky-500"
                                >
                                  <option value="">Seleccionar</option>
                                  {establishments.map((establishment) => (
                                    <option key={establishment} value={establishment}>
                                      {establishment}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <input
                                  type="text"
                                  list="income-codes"
                                  value={row.code}
                                  onChange={(e) => handleRowChange(row.id, 'code', e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, absIndex, 3)}
                                  data-row={absIndex}
                                  data-field="code"
                                  className="block w-full px-2 py-1 text-sm border rounded-md focus:ring-sky-500 focus:border-sky-500"
                                  placeholder="Escriba o seleccione un código"
                                />
                                {row.code && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    {incomeCodeMap.get(row.code)}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <input
                                  type="number"
                                  value={row.amount}
                                  onChange={(e) => handleRowChange(row.id, 'amount', parseFloat(e.target.value) || 0)}
                                  onKeyDown={(e) => handleKeyDown(e, absIndex, 4)}
                                  data-row={absIndex}
                                  data-field="amount"
                                  className="block w-32 px-2 py-1 text-sm border rounded-md focus:ring-sky-500 focus:border-sky-500"
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <input
                                  type="number"
                                  value={row.year}
                                  onChange={(e) => handleRowChange(row.id, 'year', parseInt(e.target.value) || new Date().getFullYear())}
                                  onKeyDown={(e) => handleKeyDown(e, absIndex, 5)}
                                  data-row={absIndex}
                                  data-field="year"
                                  className="block w-24 px-2 py-1 text-sm border rounded-md focus:ring-sky-500 focus:border-sky-500"
                                  min="2020"
                                  max="2100"
                                />
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                              <input
                                type="number"
                                value={row.month}
                                onChange={(e) => handleRowChange(row.id, 'month', parseInt(e.target.value) || 0)}
                                onKeyDown={(e) => handleKeyDown(e, absIndex, 6)}
                                data-row={absIndex}
                                data-field="month"
                                className="block w-20 px-2 py-1 text-sm border rounded-md focus:ring-sky-500 focus:border-sky-500"
                                min="0"
                                max="12"
                              />
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <input
                                  type="number"
                                  value={row.week}
                                  onChange={(e) => handleRowChange(row.id, 'week', parseInt(e.target.value) || 1)}
                                  onKeyDown={(e) => handleKeyDown(e, absIndex, 7)}
                                  data-row={absIndex}
                                  data-field="week"
                                  className="block w-20 px-2 py-1 text-sm border rounded-md focus:ring-sky-500 focus:border-sky-500"
                                  min="1"
                                  max="53"
                                />
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(row.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                            );
                          })}
                          {bottomPad > 0 && (
                            <tr key="bottom-pad" style={{ height: bottomPad }}>
                              <td colSpan={9}></td>
                            </tr>
                          )}
                        </tbody>
                        {/* Totalizer Row */}
                        {filteredCuts.length > 0 && (
                          <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                            <tr>
                              <td colSpan={5} className="px-3 py-2 text-right text-sm font-bold text-gray-800 uppercase tracking-wider">Total Filtrado:</td>
                              <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                                L {filteredCuts.reduce((acc, cut) => acc + (cut.is_income ? cut.amount : -cut.amount), 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td colSpan={3}></td> {/* Empty cells to align */}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                      </div>
                    </div>

                    <datalist id="income-codes">
                      {incomeCodes.map(code => (
                        <option key={code.code} value={code.code} />
                      ))}
                    </datalist>

                    <div className="mt-6 flex justify-end items-center">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            );
          })()
        }

        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 shadow p-6">
          {activeTab === 'cuts' && (
            <div>
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                  <p className="mt-2 text-sm text-gray-500">Cargando cortes...</p>
                </div>
              ) : savedCuts.length > 0 ? (
                <div className={`overflow-x-auto ${isPrinting ? '' : 'max-h-[600px] overflow-y-auto'} print-container`} onScroll={onCutsScroll} ref={cutsContainerRef}>
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {isSelectionMode && (
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                              checked={selectedRecords.length === filteredCuts.length && filteredCuts.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRecords(filteredCuts.map(c => c.id));
                                } else {
                                  setSelectedRecords([]);
                                }
                              }}
                            />
                          </th>
                        )}
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Corte</th>
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Establecimiento</th>
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Año</th>
                        <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isPrinting ? (
                        filteredCuts.map((cut) => (
                          <tr key={cut.id} className={`${cut.is_income ? 'bg-green-50' : ''} ${cut.duplicateHighlightClass}`}>
                            {isSelectionMode && (
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                                  checked={selectedRecords.includes(cut.id)}
                                  onChange={() => handleToggleSelection(cut.id)}
                                />
                              </td>
                            )}
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{new Date(cut.date).toLocaleDateString()}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.display_name || 'N/A'}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.cut_number}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.establishment?.name}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? 'Ingreso' : cut.code}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? cut.income_code?.description : incomeCodeMap.get(cut.code)}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.month}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.year}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900"></td>
                          </tr>
                        ))
                      ) : (() => {
                        const total = filteredCuts.length;
                        const start = cutsStart;
                        const end = Math.min(total, start + cutsVisible);
                        const topPad = start * cutsRowHeight;
                        const bottomPad = (total - end) * cutsRowHeight;
                        const rows = [] as React.ReactNode[];
                        rows.push(
                          <tr key="top-pad" style={{ height: topPad }}>
                            <td colSpan={10}></td>
                          </tr>
                        );
                        for (let i = start; i < end; i++) {
                          const cut = filteredCuts[i];
                          rows.push(
                            <tr key={cut.id} className={`${cut.is_income ? 'bg-green-50' : ''} ${cut.duplicateHighlightClass}`}>
                              {isSelectionMode && (
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                                    checked={selectedRecords.includes(cut.id)}
                                    onChange={() => handleToggleSelection(cut.id)}
                                  />
                                </td>
                              )}
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{new Date(cut.date).toLocaleDateString()}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.display_name || 'N/A'}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.cut_number}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.establishment?.name}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? 'Ingreso' : cut.code}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? cut.income_code?.description : incomeCodeMap.get(cut.code)}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.month}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.year}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 relative">
                                <div className="flex items-center">
                                  <button
                                    onClick={() => handleDeleteCut(cut.id, cut.is_income)}
                                    className="text-red-600 hover:text-red-900 mr-2"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                  <div className="relative">
                                    <button
                                      onClick={() => setDropdownOpen(dropdownOpen === cut.id ? null : cut.id)}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                    {dropdownOpen === cut.id && (
                                      <div className="absolute right-0 mt-2 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                        <div className="py-1">
                                          <button
                                            onClick={() => {
                                              handleEditRecord(cut);
                                              setDropdownOpen(null);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          >
                                            Modificar
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingRecord(cut);
                                              setIsYearEditModalOpen(true);
                                              setDropdownOpen(null);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          >
                                            Modificar Año
                                          </button>
                                          <button
                                            onClick={() => {
                                              setIsSelectionMode(true);
                                              setSelectedRecords([cut.id]);
                                              setDropdownOpen(null);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t"
                                          >
                                            Seleccionar
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        rows.push(
                          <tr key="bottom-pad" style={{ height: bottomPad }}>
                            <td colSpan={10}></td>
                          </tr>
                        );
                        return rows;
                      })()}
                    </tbody>
                    {/* Totalizer Row */}
                    {filteredCuts.length > 0 && (
                      <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={isSelectionMode ? 7 : 6} className="px-3 py-2 text-right text-sm font-bold text-gray-800 uppercase tracking-wider">Total Filtrado:</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                            L {filteredCuts.reduce((acc, cut) => acc + (cut.is_income ? cut.amount : -cut.amount), 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td colSpan={3}></td> {/* Empty cells to align */}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">Sin cortes registrados</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comienza agregando un nuevo corte.
                  </p>
                </div>
              )}

              {isSelectionMode && selectedRecords.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50 flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-700">
                    {selectedRecords.length} registro(s) seleccionado(s)
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        const records = savedCuts.filter(r => selectedRecords.includes(r.id));
                        setBulkEditingRecords(records);
                        setIsBulkEditModalOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modificar
                    </button>
                    <button
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </button>
                    <button
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedRecords([]);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'establishments' && (
            <div className="space-y-6">
              <div className="flex justify-end gap-4">
                {/* Selector de año para la pestaña de Establecimientos */}
                <div>
                  <label htmlFor="establishment-year-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Año
                  </label>
                  <select
                    id="establishment-year-filter"
                    value={selectedEstablishmentYear}
                    onChange={(e) => setSelectedEstablishmentYear(parseInt(e.target.value))}
                    className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                  >
                    {/* Obtener años únicos de los datos guardados */}
                    {Array.from(new Set(savedCuts.map(cut => cut.year))).sort((a, b) => (b || 0) - (a || 0)).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                {/* Selector de Establecimiento */}
                <select
                  className="block w-64 px-3 py-2 text-sm border rounded-md focus:ring-sky-500 focus:border-sky-500"
                  onChange={(e) => {
                    const selectedEst = e.target.value;
                    setSelectedEstablishment(selectedEst); // Update selected establishment state

                    if (selectedEst) {
                      // Filter cuts by selected establishment AND selected year
                      let establishmentCuts = savedCuts.filter(
                        (cut) => cut.establishment?.name === selectedEst && cut.year === selectedEstablishmentYear
                      );
                      if (selectedEstablishmentType === 'Ingresos') {
                        establishmentCuts = establishmentCuts.filter(c => c.is_income);
                      } else if (selectedEstablishmentType === 'Egresos') {
                        establishmentCuts = establishmentCuts.filter(c => !c.is_income);
                      }

                      const codeTotals = [];

                      // Process expense codes
                      incomeCodes.forEach((code) => {
                        const monthlyTotals = Array(12).fill(0);
                        let total = 0;

                        establishmentCuts
                          .filter((cut) => !cut.is_income && cut.code === code.code)
                          .forEach((cut) => {
                            const amount = cut.amount;
                            const mi = (cut.month || 0) - 1;
                            if (mi >= 0) monthlyTotals[mi] += amount;
                            total += amount;
                          });

                        if (total !== 0) { // Only add if there's actual data
                          codeTotals.push({
                            code: code.code,
                            description: code.description,
                            monthlyTotals: monthlyTotals,
                            total: total,
                          });
                        }
                      });

                      // Process income types
                      const incomeTypesMap = new Map();
                      establishmentCuts
                        .filter((cut) => cut.is_income)
                        .forEach((cut) => {
                          const incomeTypeDescription = cut.income_code?.description || 'Desconocido';
                          if (!incomeTypesMap.has(incomeTypeDescription)) {
                            incomeTypesMap.set(incomeTypeDescription, {
                              code: 'Ingreso',
                              description: incomeTypeDescription,
                              monthlyTotals: Array(12).fill(0),
                              total: 0,
                            });
                          }
                          const incomeEntry = incomeTypesMap.get(incomeTypeDescription);
                          const mi = (cut.month || 0) - 1;
                          if (mi >= 0) incomeEntry.monthlyTotals[mi] += cut.amount;
                          incomeEntry.total += cut.amount;
                        });

                      incomeTypesMap.forEach((value) => codeTotals.push(value));

                      // Sort codeTotals alphabetically, with incomes appearing after expenses
                      codeTotals.sort((a, b) => {
                        const isAIncome = a.code === 'Ingreso';
                        const isBIncome = b.code === 'Ingreso';

                        if (isAIncome && !isBIncome) return 1;
                        if (!isAIncome && isBIncome) return -1;

                        return a.description.localeCompare(b.description);
                      });

                      setCodeTotals(codeTotals);
                    } else {
                      setCodeTotals([]);
                    }
                  }}
                >
                  <option value="">Seleccionar Establecimiento</option>
                  {establishments.map((establishment) => (
                    <option key={establishment} value={establishment}>
                      {establishment}
                    </option>
                  ))}
                </select>
                {/* Selector de Tipo */}
                <div>
                  <label htmlFor="establishment-type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    id="establishment-type-filter"
                    value={selectedEstablishmentType}
                    onChange={(e) => {
                      const type = e.target.value;
                      setSelectedEstablishmentType(type);
                      const selectedEst = selectedEstablishment;
                      if (!selectedEst) return;
                      let establishmentCuts = savedCuts.filter(
                        (cut) => cut.establishment?.name === selectedEst && cut.year === selectedEstablishmentYear
                      );
                      if (type === 'Ingresos') establishmentCuts = establishmentCuts.filter(c => c.is_income);
                      if (type === 'Egresos') establishmentCuts = establishmentCuts.filter(c => !c.is_income);
                      const nextTotals = [] as Array<{code: string; description: string; monthlyTotals: number[]; total: number}>;
                      if (type !== 'Ingresos') {
                        incomeCodes.forEach((code) => {
                          const monthlyTotals = Array(12).fill(0);
                          let total = 0;
                          establishmentCuts
                            .filter((cut) => !cut.is_income && cut.code === code.code)
                            .forEach((cut) => {
                              const amount = cut.amount;
                              const mi = (cut.month || 0) - 1;
                              if (mi >= 0) monthlyTotals[mi] += amount;
                              total += amount;
                            });
                          if (total !== 0) nextTotals.push({ code: code.code, description: code.description, monthlyTotals, total });
                        });
                      }
                      if (type !== 'Egresos') {
                        const incomeTypesMap = new Map<string, { code: string; description: string; monthlyTotals: number[]; total: number }>();
                        establishmentCuts
                          .filter((cut) => cut.is_income)
                          .forEach((cut) => {
                            const incomeTypeDescription = cut.income_code?.description || 'Desconocido';
                            if (!incomeTypesMap.has(incomeTypeDescription)) {
                              incomeTypesMap.set(incomeTypeDescription, { code: 'Ingreso', description: incomeTypeDescription, monthlyTotals: Array(12).fill(0), total: 0 });
                            }
                            const entry = incomeTypesMap.get(incomeTypeDescription)!;
                            const mi = (cut.month || 0) - 1;
                            if (mi >= 0) entry.monthlyTotals[mi] += cut.amount;
                            entry.total += cut.amount;
                          });
                        incomeTypesMap.forEach(v => nextTotals.push(v));
                      }
                      nextTotals.sort((a, b) => {
                        const ia = a.code === 'Ingreso';
                        const ib = b.code === 'Ingreso';
                        if (ia && !ib) return 1;
                        if (!ia && ib) return -1;
                        return a.description.localeCompare(b.description);
                      });
                      setCodeTotals(nextTotals);
                    }}
                    className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="Ingresos">Ingresos</option>
                    <option value="Egresos">Egresos</option>
                  </select>
                </div>
              </div>

              {codeTotals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((month) => (
                          <th key={month} scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{month}</th>
                        ))}
                        <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {codeTotals.map((codeTotal) => (
                        <tr key={`${codeTotal.code}-${codeTotal.description}`}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{codeTotal.code}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{codeTotal.description}</td>
                          {codeTotal.monthlyTotals.map((monthlyTotal, index) => (
                            <td key={index} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                              {monthlyTotal.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                            </td>
                          ))}
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {codeTotal.total.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-semibold">
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900" colSpan={2}>Total General</td>
                        {Array(12).fill(0).map((_, monthIndex) => {
                          const monthlyTotal = codeTotals.reduce((sum, codeTotal) => {
                            if (codeTotal.code === 'Ingreso') {
                              return sum + codeTotal.monthlyTotals[monthIndex];
                            } else {
                              return sum - codeTotal.monthlyTotals[monthIndex];
                            }
                          }, 0);
                          return (
                            <td key={monthIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                              {monthlyTotal.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {codeTotals.reduce((sum, codeTotal) => {
                            if (codeTotal.code === 'Ingreso') {
                              return sum + codeTotal.total;
                            } else {
                              return sum - codeTotal.total;
                            }
                          }, 0).toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">Seleccione un establecimiento y un año</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Seleccione un establecimiento y un año para ver los totales por código.
                  </p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'reports' && (
            <div>
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

                <div>
                  <label htmlFor="establishment-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Establecimiento
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={establishmentSearch}
                      onChange={(e) => setEstablishmentSearch(e.target.value)}
                      placeholder="Buscar establecimiento..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    />
                    <select
                      id="establishment-filter"
                      value={selectedEstablishment}
                      onChange={(e) => setSelectedEstablishment(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    >
                      <option value="">Todos los establecimientos</option>
                      {filteredEstablishments.map((establishment) => (
                        <option key={establishment} value={establishment}>
                          {establishment}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="month-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Mes
                  </label>
                  <select
                    id="month-filter"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                  >
                    <option value="0">Todos los meses</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {new Date(2024, month - 1).toLocaleString('es-HN', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="code-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={codeSearch}
                      onChange={(e) => setCodeSearch(e.target.value)}
                      placeholder="Buscar código..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    />
                    <select
                      id="code-filter"
                      value={selectedCode}
                      onChange={(e) => setSelectedCode(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    >
                      <option value="">Todos los códigos</option>
                      {filteredCodes.map((code) => (
                        <option key={code.code} value={code.code}>
                          {code.code} - {code.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="cut-number-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Corte
                  </label>
                  <select
                    id="cut-number-filter"
                    value={selectedCutNumber}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setSelectedCutNumber(value);
                      setShowCutRange(false); // Disable range when single cut is selected
                      setStartCutNumber(0);
                      setEndCutNumber(0);
                      setShowSpecificCutsFilter(false); // Disable specific cuts filter
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                  >
                    <option value="0">Todos los cortes</option>
                    {Array.from(new Set(savedCuts.map(cut => cut.cut_number))).sort((a, b) => (a || 0) - (b || 0)).map(number => (
                      <option key={number} value={number}>{number}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    id="type-filter"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                  >
                    <option value="">Todos los tipos</option>
                    <option value="Ingresos">Ingresos</option>
                    <option value="Egresos">Egresos</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="report-year-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Año
                  </label>
                  <select
                    id="report-year-filter"
                    value={selectedReportYear}
                    onChange={(e) => setSelectedReportYear(parseInt(e.target.value))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                  >
                    <option value="0">Todos los años</option>
                    {Array.from(new Set(savedCuts.map(cut => cut.year))).sort((a, b) => (b || 0) - (a || 0)).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rango de Cortes
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Desde"
                      value={startCutNumber || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setStartCutNumber(value || 0);
                        setShowCutRange(true);
                        setSelectedCutNumber(0); // Disable single cut when range is selected
                        setShowSpecificCutsFilter(false); // Disable specific cuts filter
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Hasta"
                      value={endCutNumber || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setEndCutNumber(value || 0);
                        setShowCutRange(true);
                        setSelectedCutNumber(0); // Disable single cut when range is selected
                        setShowSpecificCutsFilter(false); // Disable specific cuts filter
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center mt-6">
                  <input
                    id="duplicates-toggle"
                    type="checkbox"
                    checked={showDuplicates}
                    onChange={(e) => setShowDuplicates(e.target.checked)}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                  />
                  <label htmlFor="duplicates-toggle" className="ml-2 block text-sm text-gray-900">
                    Mostrar Duplicados (Código o Monto)
                  </label>
                </div>

                <div className="flex items-center mt-6">
                  <input
                    id="specific-cuts-toggle"
                    type="checkbox"
                    checked={showSpecificCutsFilter}
                    onChange={(e) => {
                      setShowSpecificCutsFilter(e.target.checked);
                      if (e.target.checked) {
                        setSelectedCutNumber(0); // Disable single cut when specific cuts is selected
                        setShowCutRange(false); // Disable range when specific cuts is selected
                        setStartCutNumber(0);
                        setEndCutNumber(0);
                      } else {
                        setSpecificCutNumbers([]);
                        setSpecificCutInput('');
                      }
                    }}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                  />
                  <label htmlFor="specific-cuts-toggle" className="ml-2 block text-sm text-gray-900">
                    Cortes Específicos
                  </label>
                </div>

                {showSpecificCutsFilter && (
                  <div className="col-span-full mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Añadir Cortes Específicos</h4>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="number"
                        value={specificCutInput}
                        onChange={(e) => setSpecificCutInput(e.target.value)}
                        placeholder="Número de corte"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                      />
                      <button
                        onClick={() => {
                          const cutNum = parseInt(specificCutInput);
                          if (cutNum > 0 && !specificCutNumbers.includes(cutNum)) {
                            setSpecificCutNumbers([...specificCutNumbers, cutNum]);
                            setSpecificCutInput('');
                          }
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    {specificCutNumbers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {specificCutNumbers.map((num) => (
                          <span
                            key={num}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800"
                          >
                            {num}
                            <button
                              type="button"
                              onClick={() => setSpecificCutNumbers(specificCutNumbers.filter(n => n !== num))}
                              className="flex-shrink-0 ml-1.5 inline-flex text-sky-400 hover:text-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center mt-6">
                  <input
                    id="summarize-toggle"
                    type="checkbox"
                    checked={showSummarizedReport}
                    onChange={(e) => setShowSummarizedReport(e.target.checked)}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                  />
                  <label htmlFor="summarize-toggle" className="ml-2 block text-sm text-gray-900">
                    Resumir Reporte
                  </label>
                </div>

                <div className="flex items-center mt-6">
                  <input
                    id="order-month-subtotal-toggle"
                    type="checkbox"
                    checked={orderSubtotalByMonth}
                    onChange={(e) => setOrderSubtotalByMonth(e.target.checked)}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                  />
                  <label htmlFor="order-month-subtotal-toggle" className="ml-2 block text-sm text-gray-900">
                    Ordenar y Subtotalizar por Mes
                  </label>
                </div>

                {/* Caja de establecimientos únicos (reales) como subtítulo informativo */}
                {showSummarizedReport && !selectedEstablishment && preSummaryEstablishments.length > 0 && (
                  <div className="my-4 p-4 bg-gray-100 border border-gray-300 rounded text-base text-gray-800 font-medium shadow-sm w-full">
                    <span className="font-semibold">Establecimientos:</span> {preSummaryEstablishments.join(', ')}
                  </div>
                )}
              </div>

              {filteredCuts.length > 0 ? (
                <div className={`overflow-x-auto ${isPrinting ? '' : 'max-h-[600px] overflow-y-auto'} print-container`} onScroll={onCutsScroll} ref={cutsContainerRef}>
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      {showSummarizedReport ? (
                        <tr>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código/Tipo</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                          <th scope="col" className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Establecimiento</th>
                          <th scope="col" className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                      ) : (
                        <tr>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Corte</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Establecimiento</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Año</th>
                          <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {showSummarizedReport ? (
                        isPrinting ? (
                          filteredCuts.map((cut) => {
                            const summaryKey = cut.is_income ? `income-${cut.income_code?.description || ''}` : `expense-${cut.code || ''}`;
                            const cutsOfThisCode = preSummaryCuts.filter(origCut =>
                              cut.is_income
                                ? origCut.is_income && origCut.income_code?.description === cut.income_code?.description
                                : !origCut.is_income && origCut.code === cut.code
                            );
                            const monthlyTotals: { [month: number]: number } = {};
                            cutsOfThisCode.forEach(c => {
                              if (!monthlyTotals[c.month]) monthlyTotals[c.month] = 0;
                              monthlyTotals[c.month] += c.is_income ? c.amount : -c.amount;
                            });
                            const monthsPresent = Object.keys(monthlyTotals).map(Number).sort((a, b) => a - b);
                            return (
                              <React.Fragment key={cut.id}>
                                <tr className={`${cut.duplicateHighlightClass}`}>
                                  <td className="px-1 py-2 text-center align-middle">{expandedSummaryCodes.includes(summaryKey) ? '▼' : '▶'}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? 'Ingreso' : cut.code}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? cut.income_code?.description : incomeCodeMap.get(cut.code)}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.establishment?.name || 'Varios'}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">{cut.amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</td>
                                </tr>
                                <tr>
                                  <td></td>
                                  <td colSpan={4} className="bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                    {monthsPresent.length > 0 ? (
                                      <>
                                        <span className="font-semibold mr-2">Totales por mes:</span>
                                        {monthsPresent.map(month => (
                                          <span key={month} className="mr-4">
                                            {new Date(2024, month - 1).toLocaleString('es-HN', { month: 'long' })}: <span className="font-bold">{monthlyTotals[month].toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</span>
                                          </span>
                                        ))}
                                      </>
                                    ) : (
                                      <span className="italic text-gray-400">Sin datos por mes</span>
                                    )}
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })
                        ) : (() => {
                          const total = filteredCuts.length;
                          const start = cutsStart;
                          const end = Math.min(total, start + cutsVisible);
                          const topPad = start * cutsRowHeight;
                          const bottomPad = (total - end) * cutsRowHeight;
                          const rows = [] as React.ReactNode[];
                          rows.push(
                            <tr key="top-pad" style={{ height: topPad }}>
                              <td colSpan={5}></td>
                            </tr>
                          );
                          for (let i = start; i < end; i++) {
                            const cut = filteredCuts[i];
                            const summaryKey = cut.is_income ? `income-${cut.income_code?.description || ''}` : `expense-${cut.code || ''}`;
                            const cutsOfThisCode = preSummaryCuts.filter(origCut =>
                              cut.is_income
                                ? origCut.is_income && origCut.income_code?.description === cut.income_code?.description
                                : !origCut.is_income && origCut.code === cut.code
                            );
                            const monthlyTotals: { [month: number]: number } = {};
                            cutsOfThisCode.forEach(c => {
                              if (!monthlyTotals[c.month]) monthlyTotals[c.month] = 0;
                              monthlyTotals[c.month] += c.is_income ? c.amount : -c.amount;
                            });
                            const monthsPresent = Object.keys(monthlyTotals).map(Number).sort((a, b) => a - b);
                            rows.push(
                              <React.Fragment key={cut.id}>
                                <tr className={`${cut.duplicateHighlightClass}`}>
                                  <td className="px-1 py-2 text-center align-middle">
                                    <button
                                      type="button"
                                      className="focus:outline-none text-sky-600 hover:text-sky-900"
                                      onClick={() => setExpandedSummaryCodes(expandedSummaryCodes.includes(summaryKey)
                                        ? expandedSummaryCodes.filter(k => k !== summaryKey)
                                        : [...expandedSummaryCodes, summaryKey])}
                                      title={expandedSummaryCodes.includes(summaryKey) ? 'Ocultar detalle mensual' : 'Ver detalle mensual'}
                                    >
                                      {expandedSummaryCodes.includes(summaryKey) ? '▼' : '▶'}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {cut.is_income ? 'Ingreso' : cut.code}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {cut.is_income ? cut.income_code?.description : incomeCodeMap.get(cut.code)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {cut.establishment?.name || 'Varios'}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                    {cut.amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                                  </td>
                                </tr>
                                {expandedSummaryCodes.includes(summaryKey) && (
                                  <tr>
                                    <td></td>
                                    <td colSpan={4} className="bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                      {monthsPresent.length > 0 ? (
                                        <>
                                          <span className="font-semibold mr-2">Totales por mes:</span>
                                          {monthsPresent.map(month => (
                                            <span key={month} className="mr-4">
                                              {new Date(2024, month - 1).toLocaleString('es-HN', { month: 'long' })}: <span className="font-bold">{monthlyTotals[month].toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</span>
                                            </span>
                                          ))}
                                        </>
                                      ) : (
                                        <span className="italic text-gray-400">Sin datos por mes</span>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          }
                          rows.push(
                            <tr key="bottom-pad" style={{ height: bottomPad }}>
                              <td colSpan={5}></td>
                            </tr>
                          );
                          return rows;
                        })()
                      ) : (
                        isPrinting ? (
                          (() => {
                            const rows: React.ReactNode[] = [];
                            const monthTotals = new Map<number, number>();
                            filteredCuts.forEach(c => {
                              const m = c.month || 0;
                              const v = monthTotals.get(m) || 0;
                              monthTotals.set(m, v + (c.is_income ? c.amount : -c.amount));
                            });
                            for (let i = 0; i < filteredCuts.length; i++) {
                              const cut = filteredCuts[i];
                              rows.push(
                                <tr key={cut.id} className={`${cut.is_income ? 'bg-green-50' : ''} ${cut.duplicateHighlightClass}`}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{new Date(cut.date).toLocaleDateString()}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.display_name || 'N/A'}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.cut_number}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.establishment?.name}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? 'Ingreso' : cut.code}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? cut.income_code?.description : incomeCodeMap.get(cut.code)}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.month}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.year}</td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900"></td>
                                </tr>
                              );
                              if (orderSubtotalByMonth) {
                                const currMonth = cut.month || 0;
                                const nextMonth = filteredCuts[i + 1]?.month || 0;
                                const isBoundary = i === filteredCuts.length - 1 || currMonth !== nextMonth;
                                if (isBoundary) {
                                  const label = currMonth === 0 ? 'Subtotal sin mes' : `Subtotal ${new Date(2024, currMonth - 1).toLocaleString('es-HN', { month: 'long' })}`;
                                  const totalVal = monthTotals.get(currMonth) || 0;
                                  rows.push(
                                    <tr key={`subtotal-${currMonth}-${i}`} className="bg-gray-50">
                                      <td colSpan={7} className="px-3 py-2 text-right text-xs font-bold text-gray-800">{label}</td>
                                      <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">{totalVal.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</td>
                                      <td colSpan={2}></td>
                                    </tr>
                                  );
                                }
                              }
                            }
                            return rows;
                          })()
                        ) : (() => {
                          const total = filteredCuts.length;
                          const start = cutsStart;
                          const end = Math.min(total, start + cutsVisible);
                          const topPad = start * cutsRowHeight;
                          const bottomPad = (total - end) * cutsRowHeight;
                          const rows = [] as React.ReactNode[];
                          const monthTotals = new Map<number, number>();
                          filteredCuts.forEach(c => {
                            const m = c.month || 0;
                            const v = monthTotals.get(m) || 0;
                            monthTotals.set(m, v + (c.is_income ? c.amount : -c.amount));
                          });
                          rows.push(
                            <tr key="top-pad" style={{ height: topPad }}>
                              <td colSpan={10}></td>
                            </tr>
                          );
                          for (let i = start; i < end; i++) {
                            const cut = filteredCuts[i];
                            rows.push(
                              <tr key={cut.id} className={`${cut.is_income ? 'bg-green-50' : ''} ${cut.duplicateHighlightClass}`}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{new Date(cut.date).toLocaleDateString()}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.display_name || 'N/A'}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.cut_number}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.establishment?.name}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? 'Ingreso' : cut.code}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.is_income ? cut.income_code?.description : incomeCodeMap.get(cut.code)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.amount.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.month}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cut.year}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 relative">
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => handleDeleteCut(cut.id, cut.is_income)}
                                      className="text-red-600 hover:text-red-900 mr-2"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                    <div className="relative">
                                      <button
                                        onClick={() => setDropdownOpen(dropdownOpen === cut.id ? null : cut.id)}
                                        className="text-gray-400 hover:text-gray-600"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                      {dropdownOpen === cut.id && (
                                        <div className="absolute right-0 mt-2 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                          <div className="py-1">
                                            <button
                                              onClick={() => {
                                                handleEditRecord(cut);
                                                setDropdownOpen(null);
                                              }}
                                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                              Modificar
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingRecord(cut);
                                                setIsYearEditModalOpen(true);
                                                setDropdownOpen(null);
                                              }}
                                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                              Modificar Año
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                            if (orderSubtotalByMonth) {
                              const currMonth = cut.month || 0;
                              const nextMonth = filteredCuts[i + 1]?.month || 0;
                              const isBoundary = i === filteredCuts.length - 1 || currMonth !== nextMonth;
                              if (isBoundary) {
                                const label = currMonth === 0 ? 'Subtotal sin mes' : `Subtotal ${new Date(2024, currMonth - 1).toLocaleString('es-HN', { month: 'long' })}`;
                                const totalVal = monthTotals.get(currMonth) || 0;
                                rows.push(
                                  <tr key={`subtotal-${currMonth}-${i}`} className="bg-gray-50">
                                    <td colSpan={7} className="px-3 py-2 text-right text-xs font-bold text-gray-800">{label}</td>
                                    <td className="px-3 py-2 text-right text-xs font-bold text-gray-800">{totalVal.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</td>
                                    <td colSpan={2}></td>
                                  </tr>
                                );
                              }
                            }
                          }
                          rows.push(
                            <tr key="bottom-pad" style={{ height: bottomPad }}>
                              <td colSpan={10}></td>
                            </tr>
                          );
                          return rows;
                        })()
                      )}
                    </tbody>
                    {/* Totalizer Row */}
                    {showSummarizedReport ? (
                      <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right text-sm font-bold text-gray-800 uppercase tracking-wider">Total General:</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                            {filteredCuts.reduce((acc, cut) => acc + (cut.is_income ? cut.amount : -cut.amount), 0).toLocaleString('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    ) : (
                      filteredCuts.length > 0 && (
                        <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                          <tr>
                            <td colSpan={6} className="px-3 py-2 text-right text-sm font-bold text-gray-800 uppercase tracking-wider">Total Filtrado:</td>
                            <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                              L {filteredCuts.reduce((acc, cut) => acc + (cut.is_income ? cut.amount : -cut.amount), 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td colSpan={3}></td> {/* Empty cells to align */}
                          </tr>
                        </tfoot>
                      )
                    )}
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cortes</h3>
                  <p className="mt-1 text-sm text-gray-500">No se encontraron cortes con los filtros seleccionados.</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'consolidated' && (
            <div className={`bg-white shadow-sm rounded-lg overflow-x-auto ${isPrinting ? '' : 'max-h-[600px] overflow-y-auto'} print-container`}>
              <div className="p-4">
                <label htmlFor="year-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Año
                </label>
                <select
                  id="year-filter"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                >
                  {(consolidatedYears.length > 0 ? consolidatedYears : [new Date().getFullYear()]).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">
                      Establecimiento
                    </th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {new Date(0, i).toLocaleString('es', { month: 'long' })}
                      </th>
                    ))}
                    <th scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consolidatedEstablishments.map((establishment, index) => {
                    const isExpanded = expandedRows.includes(establishment);
                    const pre = yearEstablishmentTotals.get(establishment);
                    const monthlyTotals = pre ? pre.monthly : Array(12).fill(0);
                    const establishmentTotal = pre ? pre.total : 0;

                    return (
                      <React.Fragment key={establishment}>
                        <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 flex items-center">
                            <button
                              onClick={() => toggleRow(establishment)}
                              className="mr-2 focus:outline-none"
                            >
                              <svg
                                className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M7.293 4.707a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L10.586 10 7.293 6.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            {establishment}
                          </td>
                          {monthlyTotals.map((total, i) => (
                            <td key={i} className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                              L. {total.toLocaleString()}
                            </td>
                          ))}
                          <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                            L. {establishmentTotal.toLocaleString()}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={14} className="px-2 py-1 whitespace-nowrap text-xs text-gray-500 bg-gray-50">
                              <div className="pl-6">
                                <table className="min-w-full divide-y divide-gray-200 text-xs">
                                  <tbody>
                                    {[...incomeCodes, { code: 'Ingreso', description: 'Ingresos' }].map(({ code, description }) => {
                                      const y = selectedYear || new Date().getFullYear();
                                      const cutsForCode = savedCuts.filter(c => c.establishment?.name === establishment && (toFiniteNumberOrUndefined(c.year) ?? -1) === y && (code === 'Ingreso' ? c.is_income : c.code === code));
                                      const codeMonthlyTotals = Array(12).fill(0);
                                      cutsForCode.forEach(c => {
                                        const idx = (c.month || 0) - 1;
                                        if (idx >= 0 && idx < 12) {
                                          codeMonthlyTotals[idx] += c.is_income ? c.amount : -c.amount;
                                        }
                                      });
                                      const codeTotalAmount = codeMonthlyTotals.reduce((sum, amount) => sum + amount, 0);
                                      if (codeTotalAmount !== 0) {
                                        return (
                                          <tr key={code} className="hover:bg-gray-100">
                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 w-64">
                                              {code === 'Ingreso' ? 'Ingreso' : `${code} - ${description}`}
                                            </td>
                                            {codeMonthlyTotals.map((total, i) => (
                                              <td key={i} className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                                L. {total.toLocaleString()}
                                              </td>
                                            ))}
                                            <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                              L. {codeTotalAmount.toLocaleString()}
                                            </td>
                                          </tr>
                                        );
                                      }
                                      return null;
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-2 py-1 whitespace-nowrap text-xs font-bold text-gray-900">Total General</td>
                    {Array.from({ length: 12 }, (_, month) => {
                      let monthTotal = 0;
                      consolidatedEstablishments.forEach(est => {
                        const entry = yearEstablishmentTotals.get(est);
                        if (entry) monthTotal += entry.monthly[month];
                      });
                      return (
                        <td key={month} className="px-2 py-1 whitespace-nowrap text-xs font-bold text-gray-900">
                          L. {monthTotal.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 whitespace-nowrap text-xs font-bold text-gray-900">
                      L. {Array.from(yearEstablishmentTotals.values()).reduce((sum, e) => sum + e.total, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          {activeTab === 'rangeReport' && (
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 shadow p-6">
              <h2 className="text-xl font-bold mb-4">Reporte de Rango Conjunto</h2>
              <div className="flex gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde Corte</label>
                  <input
                    type="number"
                    value={rangeStart || ''}
                    onChange={e => setRangeStart(parseInt(e.target.value) || 0)}
                    className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta Corte</label>
                  <input
                    type="number"
                    value={rangeEnd || ''}
                    onChange={e => setRangeEnd(parseInt(e.target.value) || 0)}
                    className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    min="0"
                  />
                </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <select
                value={selectedRangeYear}
                onChange={e => setSelectedRangeYear(parseInt(e.target.value))}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
              >
                {(consolidatedYears.length > 0 ? consolidatedYears : [new Date().getFullYear()]).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={selectedRangeType}
                    onChange={e => setSelectedRangeType(e.target.value as 'all' | 'incomes' | 'expenses')}
                    className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="incomes">Solo ingresos</option>
                    <option value="expenses">Solo egresos</option>
                  </select>
                </div>
              </div>
              {rangeResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código/Tipo</th>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.values(
                        rangeResults.reduce((acc: { [key: string]: { code: string; description: string; total: number } }, cut) => {
                          const key = cut.is_income ? cut.income_code?.description : cut.code;
                          const description = cut.is_income ? cut.income_code?.description : incomeCodeMap.get(cut.code || '');

                          if (!key) return acc; // Skip if no key

                          if (!acc[key]) {
                            acc[key] = {
                              code: cut.is_income ? 'Ingreso' : (cut.code || ''), // Ensure code is string
                              description: description || '',
                              total: 0
                            };
                          }
                          acc[key].total += cut.is_income ? cut.amount : -cut.amount;
                          return acc;
                        }, {})
                      ).map(item => (
                        <tr key={`${item.code}-${item.description}`}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.code}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.description}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                            {item.total.toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-right text-sm font-bold text-gray-800 uppercase tracking-wider">Total General:</td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                          {rangeResults.reduce((sum, cut) => sum + (cut.is_income ? cut.amount : -cut.amount), 0).toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No hay resultados para el rango seleccionado.</div>
              )}
            </div>
          )}
        </div>
        {/* Income Modal */}
        {isIncomeModalOpen &&
          (() => {
            const totalRows = rows.length;
            const start = entryModalStart;
            const end = Math.min(totalRows, start + entryModalVisible);
            const topPad = start * entryModalRowHeight;
            const bottomPad = (totalRows - end) * entryModalRowHeight;
            const windowRows = rows.slice(start, end);
            return (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 rounded-2xl shadow-2xl border border-white/20 p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Nuevo Ingreso</h2>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    form="nuevo-ingreso-form" // Add form attribute
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setIsIncomeModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="sticky top-0 z-10 bg-white px-2 py-2 border border-black text-sm font-bold text-gray-700">
                TOTAL: {rowsTotal.toLocaleString('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <form id="nuevo-ingreso-form" onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                <div
                  ref={entryModalScrollRef}
                  onScroll={onEntryModalScroll}
                  className="flex-1 min-h-0 overflow-auto overscroll-contain"
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="sticky top-0 z-10 bg-white">
                      <tr className="text-left">
                        <th className="p-2">FECHA</th>
                        <th className="p-2"># CORTE</th>
                        <th className="p-2">ESTABLECIMIENTO</th>
                        <th className="p-2">TIPO DE INGRESO</th>
                        <th className="p-2">MONTO</th>
                        <th className="p-2">AÑO</th>
                        <th className="p-2">MES</th>
                        <th className="p-2">SEMANA</th>
                        <th className="p-2">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPad > 0 && (
                        <tr key="top-pad" style={{ height: topPad }}>
                          <td colSpan={9}></td>
                        </tr>
                      )}
                      {windowRows.map((row, rowIndex) => {
                        const absIndex = start + rowIndex;
                        return (
                        <tr key={row.id} className="border-t">
                          <td className="p-2">
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, absIndex, 0)}
                              data-row={absIndex}
                              data-field="date"
                              className="border rounded p-1 w-full"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={row.cutNumber || ''}
                              onChange={(e) => handleRowChange(row.id, 'cutNumber', parseInt(e.target.value) || 0)}
                              onKeyDown={(e) => handleKeyDown(e, absIndex, 1)}
                              data-row={absIndex}
                              data-field="cutNumber"
                              className="border rounded p-1 w-full"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={row.establishment}
                              onChange={(e) => handleRowChange(row.id, 'establishment', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, absIndex, 2)}
                              data-row={absIndex}
                              data-field="establishment"
                              className="border rounded p-1 w-full"
                            >
                              <option value="">Seleccionar</option>
                              {establishments.map((est) => (
                                <option key={est} value={est}>
                                  {est}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select
                              value={row.incomeType || ''}
                              onChange={(e) => {
                                handleRowChange(row.id, 'isIncome', true);
                                handleRowChange(row.id, 'incomeType', e.target.value);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, absIndex, 3)}
                              data-row={absIndex}
                              data-field="incomeType"
                              className="border rounded p-1 w-full"
                            >
                              <option value="">Seleccionar</option>
                              <option value="Consultas">Consultas</option>
                              <option value="Odontologia">Odontologia</option>
                              <option value="Laboratorio">Laboratorio</option>
                              <option value="Barcos">Barcos</option>
                              <option value="Tarjetas de Salud">Tarjetas de Salud</option>
                              <option value="Otros">Otros</option>
                              <option value="Partos">Partos</option>
                              <option value="USG">USG</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={row.amount || ''}
                              onChange={(e) => handleRowChange(row.id, 'amount', parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => handleKeyDown(e, absIndex, 4)}
                              data-row={absIndex}
                              data-field="amount"
                              className="border rounded p-1 w-full"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={row.year || ''}
                              onChange={(e) => handleRowChange(row.id, 'year', parseInt(e.target.value) || 0)}
                              onKeyDown={(e) => handleKeyDown(e, absIndex, 5)}
                              data-row={absIndex}
                              data-field="year"
                              className="border rounded p-1 w-full"
                              min="2000"
                              max="2100"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={row.month || ''}
                              onChange={(e) => handleRowChange(row.id, 'month', parseInt(e.target.value) || 0)}
                              onKeyDown={(e) => handleKeyDown(e, absIndex, 6)}
                              data-row={absIndex}
                              data-field="month"
                              className="border rounded p-1 w-full"
                              min="0"
                              max="12"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={row.week || ''}
                              onChange={(e) => handleRowChange(row.id, 'week', parseInt(e.target.value) || 0)}
                              onKeyDown={(e) => handleKeyDown(e, absIndex, 7)}
                              data-row={absIndex}
                              data-field="week"
                              className="border rounded p-1 w-full"
                              min="1"
                              max="53"
                            />
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={20} />
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                      {bottomPad > 0 && (
                        <tr key="bottom-pad" style={{ height: bottomPad }}>
                          <td colSpan={9}></td>
                        </tr>
                      )}
                    </tbody>
                    {/* Totalizer Row */}
                    {filteredCuts.length > 0 && (
                      <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-right text-sm font-bold text-gray-800 uppercase tracking-wider">Total Filtrado:</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-gray-800">
                            L {filteredCuts.reduce((acc, cut) => acc + (cut.is_income ? cut.amount : -cut.amount), 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td colSpan={3}></td> {/* Empty cells to align */}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

                {/* Cancel button can be added here if needed, or removed if only Save/Close in header */}
                {/* <div className="flex justify-end items-center">
                  <button
                    type="button"
                    onClick={() => setIsIncomeModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                  >
                    Cancelar
                  </button>
                </div> */}
              </form>
            </div>
          </div>
            );
          })()
        }
      </main>

      {/* Edit Modal */}
      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingRecord.is_income ? 'Editar Ingreso' : 'Editar Corte'}
              </h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingRecord(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingRecord) handleUpdateRecord(editingRecord);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número de Corte</label>
                  <input
                    type="number"
                    value={editingRecord.cut_number || ''}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      cut_number: parseInt(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha</label>
                  <input
                    type="date"
                    value={editingRecord.date}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      date: e.target.value
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Establecimiento</label>
                  <select
                    value={editingRecord.establishment?.name}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      establishment: { name: e.target.value }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                  >
                    {establishments.map((est) => (
                      <option key={est} value={est}>{est}</option>
                    ))}
                  </select>
                </div>

                {editingRecord.is_income ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Ingreso</label>
                    <select
                      value={editingRecord.income_code?.description}
                      onChange={(e) => setEditingRecord({
                        ...editingRecord,
                        income_code: { description: e.target.value }
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                    >
                      <option value="Consultas">Consultas</option>
                      <option value="Odontologia">Odontología</option>
                      <option value="Laboratorio">Laboratorio</option>
                      <option value="Barcos">Barcos</option>
                      <option value="Tarjetas de Salud">Tarjetas de Salud</option>
                      <option value="Otros">Otros</option>
                      <option value="Partos">Partos</option>
                      <option value="USG">USG</option>
                      <option value="Planificación F">Planificación F</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Código</label>
                    <select
                      value={editingRecord.code}
                      onChange={(e) => setEditingRecord({
                        ...editingRecord,
                        code: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                    >
                      {incomeCodes.map((code) => (
                        <option key={code.code} value={code.code}>
                          {code.code} - {code.description}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Monto</label>
                  <input
                    type="number"
                    value={editingRecord.amount}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      amount: parseFloat(e.target.value)
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Mes</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={editingRecord.month}
                      onChange={(e) => setEditingRecord({
                        ...editingRecord,
                        month: e.target.value === '' ? 0 : parseInt(e.target.value)
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">Semana</label>
                    <input
                      type="number"
                      min="1"
                      max="53"
                      value={editingRecord.week}
                      onChange={(e) => setEditingRecord({
                        ...editingRecord,
                        week: parseInt(e.target.value)
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Year Edit Modal */}
      {isYearEditModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Modificar Año</h2>
              <button
                onClick={() => {
                  setIsYearEditModalOpen(false);
                  setEditingRecord(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (editingRecord) {
                try {
                  setIsLoading(true);
                  const table = editingRecord.is_income ? 'incomes' : 'cuts';

                  const { error } = await supabase
                    .from(table)
                    .update({
                      year: editingRecord.year
                    })
                    .eq('id', editingRecord.id);

                  if (error) throw error;

                  setIsYearEditModalOpen(false);
                  setEditingRecord(null);
                  fetchCuts();
                } catch (error) {
                  console.error('Error al actualizar el año:', error);
                  alert('Error al actualizar el año. Por favor, intente nuevamente.');
                } finally {
                  setIsLoading(false);
                }
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-year" className="block text-sm font-medium text-gray-700">Año</label>
                  <input
                    type="number"
                    id="edit-year"
                    value={editingRecord.year || ''}
                    onChange={(e) => setEditingRecord({
                      ...editingRecord,
                      year: parseInt(e.target.value) || 0
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500"
                    min="2000"
                    max="2100"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsYearEditModalOpen(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">Confirmar Eliminación</h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Está seguro que desea eliminar los {selectedRecords.length} registros seleccionados? Esta acción es irreversible y no se podrá deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 shadow-sm"
              >
                Sí, Eliminar Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3 text-sky-600">
                <Edit className="h-6 w-6" />
                <h3 className="text-xl font-bold">Modificar Registros en Conjunto</h3>
              </div>
              <button
                onClick={() => {
                  setIsBulkEditModalOpen(false);
                  setBulkEditingRecords([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">No. Corte</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">Establecimiento</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">Código/Tipo</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">Monto</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">Mes</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">Semana</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-500 uppercase">Año</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bulkEditingRecords.map((record, idx) => (
                    <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={record.cut_number}
                          onChange={(e) => {
                            const newRecords = [...bulkEditingRecords];
                            newRecords[idx] = { ...record, cut_number: parseInt(e.target.value) || 0 };
                            setBulkEditingRecords(newRecords);
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={new Date(record.date).toISOString().split('T')[0]}
                          onChange={(e) => {
                            const newRecords = [...bulkEditingRecords];
                            newRecords[idx] = { ...record, date: e.target.value };
                            setBulkEditingRecords(newRecords);
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <select
                          value={record.establishment_id}
                          onChange={(e) => {
                            const newRecords = [...bulkEditingRecords];
                            newRecords[idx] = { ...record, establishment_id: e.target.value };
                            setBulkEditingRecords(newRecords);
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-xs"
                        >
                          {establishments.map(est => {
                            // Note: This requires establishment_id to match establishment names or we need a map
                            // Since we don't have a map easily accessible, we'll assume the user wants to select by name for now
                            // but in a real app we'd need the ID. Let's find the ID if possible or just use what we have.
                            return <option key={est} value={est}>{est}</option>
                          })}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        {record.is_income ? (
                          <select
                            value={record.income_type_id || ''}
                            onChange={(e) => {
                              const newRecords = [...bulkEditingRecords];
                              newRecords[idx] = { ...record, income_type_id: e.target.value };
                              setBulkEditingRecords(newRecords);
                            }}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-xs"
                          >
                            <option value="Consultas">Consultas</option>
                            <option value="Odontologia">Odontología</option>
                            <option value="Laboratorio">Laboratorio</option>
                            <option value="Barcos">Barcos</option>
                            <option value="Tarjetas de Salud">Tarjetas de Salud</option>
                            <option value="Otros">Otros</option>
                            <option value="Partos">Partos</option>
                            <option value="USG">USG</option>
                            <option value="Planificación F">Planificación F</option>
                          </select>
                        ) : (
                          <select
                            value={record.code}
                            onChange={(e) => {
                              const newRecords = [...bulkEditingRecords];
                              newRecords[idx] = { ...record, code: e.target.value };
                              setBulkEditingRecords(newRecords);
                            }}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-xs"
                          >
                            {incomeCodes.map(c => (
                              <option key={c.code} value={c.code}>{c.code} - {c.description}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.01"
                          value={record.amount}
                          onChange={(e) => {
                            const newRecords = [...bulkEditingRecords];
                            newRecords[idx] = { ...record, amount: parseFloat(e.target.value) || 0 };
                            setBulkEditingRecords(newRecords);
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={record.month}
                          onChange={(e) => {
                            const newRecords = [...bulkEditingRecords];
                            newRecords[idx] = { ...record, month: parseInt(e.target.value) || 0 };
                            setBulkEditingRecords(newRecords);
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min="1"
                          max="53"
                          value={record.week}
                          onChange={(e) => {
                            const newRecords = [...bulkEditingRecords];
                            newRecords[idx] = { ...record, week: parseInt(e.target.value) || 0 };
                            setBulkEditingRecords(newRecords);
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-xs"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min="2000"
                          max="2100"
                          value={record.year}
                          onChange={(e) => {
                            const newRecords = [...bulkEditingRecords];
                            newRecords[idx] = { ...record, year: parseInt(e.target.value) || 0 };
                            setBulkEditingRecords(newRecords);
                          }}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500 text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  setIsBulkEditModalOpen(false);
                  setBulkEditingRecords([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleBulkUpdate(bulkEditingRecords)}
                className="px-4 py-2 bg-sky-600 text-white rounded-md text-sm font-medium hover:bg-sky-700 shadow-sm flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Todos los Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App
