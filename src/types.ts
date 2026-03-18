export interface Cut {
  id: string;
  cut_number: number;
  date: string;
  establishment_id: string;
  establishment?: {
    name: string;
  };
  code: string;
  income_code?: {
    description: string;
  };
  amount: number;
  month: number;
  week: number;
  created_at: string;
  usuario_id?: string; // Añadido para rastrear el usuario
}

export interface Income {
  id: string;
  date: string;
  establishment_id: string;
  establishment?: {
    name: string;
  };
  income_type_id: string; // Asumiendo que tienes una tabla income_types
  income_type?: {
    name: string; // Cambiado de description a name para coincidir con la DB
  };
  amount: number;
  month: number;
  week: number;
  year: number;
  created_at: string;
  usuario_id?: string; // Añadido para rastrear el usuario
}

export interface CombinedTransaction extends Cut, Income {
  establishment?: { name: string };
  income_code?: { description: string }; // For cuts (expenses)
  income_type?: { name: string }; // For incomes
  is_income: boolean;
  display_name?: string;
  duplicateHighlightClass?: string; // Cambiado para almacenar la clase CSS del color de resaltado
}

export interface IncomeCode {
  code: string;
  description: string;
}

export interface Establishment {
  id: string;
  name: string;
  active: boolean;
}

export interface CodeMonthlyTotal {
  code: string;
  description: string;
  monthlyTotals: number[]; // Array of 12 numbers for Jan-Dec
  total: number; // Grand total for the year
}
