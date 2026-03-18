import { supabase } from '../lib/supabase';
import { CombinedTransaction } from '../types';

export async function fetchCombinedTransactionsByCutNumbers(cutNumbers: number[]): Promise<CombinedTransaction[]> {
  try {
    // Fetch regular cuts
    const { data: cutsData, error: cutsError } = await supabase
      .from('cuts')
      .select(`
        *,
        establishment:establishments(name)
      `)
      .in('cut_number', cutNumbers);

    if (cutsError) throw cutsError;

    // Fetch income entries
    const { data: incomesData, error: incomesError } = await supabase
      .from('incomes')
      .select(`
        *,
        establishment:establishments(name),
        income_type:income_types(name),
        cut_number
      `)
      .in('cut_number', cutNumbers);

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
      is_income: false,
      year: Number.isFinite(Number(cut.year)) ? Number(cut.year) : new Date(cut.date).getFullYear(),
      month: Number.isFinite(Number(cut.month)) ? Number(cut.month) : (new Date(cut.date).getMonth() + 1)
    }));

    // Transform income entries to match cut format and include display_name
    const transformedIncomes: CombinedTransaction[] = (incomesData || []).map(income => ({
      ...income,
      cut_number: income.cut_number, // Ensure cut_number is passed for incomes too
      code: 'Ingreso',
      income_code: { description: income.income_type?.name || 'Ingreso General' },
      is_income: true,
      display_name: income.usuario_id ? (userMap.get(income.usuario_id) || `${income.usuario_id.substring(0,8)}...`) : 'Sistema',
      year: Number.isFinite(Number(income.year)) ? Number(income.year) : new Date(income.date).getFullYear(),
      month: Number.isFinite(Number(income.month)) ? Number(income.month) : (new Date(income.date).getMonth() + 1)
    }));

    // Combine both datasets and sort by date, then by created_at for tie-breaking
    const allData = [...transformedCuts, ...transformedIncomes].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      const createdAtA = new Date(a.created_at).getTime();
      const createdAtB = new Date(b.created_at).getTime();
      return createdAtB - createdAtA;
    });

    return allData;
  } catch (error) {
    console.error('Error fetching data by cut numbers:', error);
    throw new Error('Error al cargar los datos por número de corte');
  }
} 
